import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { IFCLoader } from 'web-ifc-three';

const container = document.getElementById("viewer");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const progressBar = document.getElementById("progressBar");
const info = document.getElementById("info");
const stats = document.getElementById("stats");

console.log('🚀 Three.js carregado, versão:', THREE.REVISION);

// Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1f2e);

// Câmera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(20, 20, 20);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1;
controls.maxDistance = 500;

// Grid e Eixos
const gridHelper = new THREE.GridHelper(100, 100, 0x4488ff, 0x223344);
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

// Iluminação
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
light1.position.set(50, 50, 50);
light1.castShadow = true;
scene.add(light1);
const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
light2.position.set(-50, 50, -50);
scene.add(light2);
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.4));

// IFC Loader - Configuração corrigida
const ifcLoader = new IFCLoader();
try {
    if (ifcLoader.ifcManager && ifcLoader.ifcManager.setWasmPath) {
        ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.53/');
        console.log('✅ WASM path configurado');
    } else {
        console.log('⚠️ ifcManager não disponível, usando fallback');
    }
} catch (e) {
    console.log('⚠️ Erro ao configurar WASM:', e.message);
}

let loadedModel = null;

// Cubo demo
let demoCube = new THREE.Mesh(
    new THREE.BoxGeometry(5, 5, 5),
    new THREE.MeshStandardMaterial({ color: 0x0066ff, metalness: 0.3, roughness: 0.6 })
);
demoCube.position.y = 2.5;
demoCube.castShadow = true;
demoCube.receiveShadow = true;
scene.add(demoCube);

const edges = new THREE.EdgesGeometry(demoCube.geometry);
demoCube.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff })));

console.log('🚀 BIM Viewer PRO pronto!');
info.classList.add('show');

// Animação
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Função centralizar
function fitCameraToModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    gridHelper.position.y = box.min.y - 0.1;
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 2.5;
    
    camera.position.set(
        center.x + cameraZ * 0.5,
        center.y + cameraZ * 0.5,
        center.z + cameraZ * 0.5
    );
    
    controls.target.copy(center);
    controls.update();
    
    console.log('📦 Dimensões:', size, '📍 Centro:', center);
}

// Carregar IFC
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (loadedModel) {
        scene.remove(loadedModel);
        loadedModel = null;
    }

    // Remove o cubo demo quando carregar IFC
    if (demoCube) {
        scene.remove(demoCube);
        demoCube = null;
    }

    loading.classList.add('show');
    info.classList.remove('show');
    stats.classList.remove('show');
    progressBar.style.width = '0%';

    try {
        const url = URL.createObjectURL(file);
        console.log('🔄 Carregando:', file.name, '| Tamanho:', (file.size / 1024).toFixed(2), 'KB');
        
        ifcLoader.load(
            url,
            (ifcModel) => {
                loadedModel = ifcModel;
                scene.add(ifcModel);
                
                let meshCount = 0;
                ifcModel.traverse((child) => {
                    if (child.isMesh) {
                        meshCount++;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        // Preserva materiais originais do IFC
                        if (child.material) {
                            // Se for array de materiais (multi-material)
                            if (Array.isArray(child.material)) {
                                child.material = child.material.map(mat => {
                                    return new THREE.MeshStandardMaterial({
                                        color: mat.color || 0xffffff,
                                        metalness: 0.1,
                                        roughness: 0.7,
                                        side: THREE.DoubleSide,
                                        transparent: mat.transparent || false,
                                        opacity: mat.opacity || 1.0
                                    });
                                });
                            } else {
                                // Material único
                                const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0xcccccc);
                                child.material = new THREE.MeshStandardMaterial({
                                    color: originalColor,
                                    metalness: 0.1,
                                    roughness: 0.7,
                                    side: THREE.DoubleSide,
                                    transparent: child.material.transparent || false,
                                    opacity: child.material.opacity || 1.0
                                });
                            }
                        }
                    }
                });
                
                fitCameraToModel(ifcModel);
                
                document.getElementById('modelName').textContent = file.name;
                document.getElementById('meshCount').textContent = meshCount;
                
                loading.classList.remove('show');
                info.classList.add('show');
                stats.classList.add('show');
                
                console.log('🎉 Completo! Meshes:', meshCount);
                URL.revokeObjectURL(url);
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = (progress.loaded / progress.total) * 100;
                    progressBar.style.width = percent + '%';
                    loadingText.textContent = `Carregando: ${percent.toFixed(0)}%`;
                }
            },
            (error) => {
                console.error('❌ Erro:', error);
                loading.classList.remove('show');
                alert('Erro ao carregar IFC: ' + error.message);
                URL.revokeObjectURL(url);
            }
        );
    } catch (error) {
        console.error('❌ Erro crítico:', error);
        loading.classList.remove('show');
        alert('Erro: ' + error.message);
    }
});