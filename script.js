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
const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
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

// Iluminação mais forte
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));

const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
light1.position.set(50, 80, 50);
light1.castShadow = true;
light1.shadow.mapSize.width = 2048;
light1.shadow.mapSize.height = 2048;
light1.shadow.camera.near = 0.5;
light1.shadow.camera.far = 500;
light1.shadow.camera.left = -100;
light1.shadow.camera.right = 100;
light1.shadow.camera.top = 100;
light1.shadow.camera.bottom = -100;
light1.shadow.bias = -0.0001;
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 0.3);
light2.position.set(-50, 40, -50);
scene.add(light2);

const light3 = new THREE.DirectionalLight(0xffeedd, 0.2);
light3.position.set(0, 50, -100);
scene.add(light3);

// IFC Loader
const ifcLoader = new IFCLoader();
try {
    if (ifcLoader.ifcManager && ifcLoader.ifcManager.setWasmPath) {
        ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.53/');
        
        if (ifcLoader.ifcManager.setupThreeMeshBVH) {
            ifcLoader.ifcManager.setupThreeMeshBVH();
        }
        
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

// Função para converter materiais com força bruta
function convertMaterialsRecursive(object) {
    if (object.isMesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        const newMaterials = materials.map(mat => {
            // Se já for Standard, apenas ajusta
            if (mat.type === 'MeshStandardMaterial') {
                mat.needsUpdate = true;
                return mat;
            }
            
            // Extrai cor ANTES de qualquer coisa
            const originalColor = new THREE.Color();
            if (mat.color) {
                originalColor.copy(mat.color);
            }
            
            console.log(`🔄 Convertendo material | Cor original: #${originalColor.getHexString()} | Tipo: ${mat.type}`);
            
            // Cria novo material forçando a cor
            const newMat = new THREE.MeshStandardMaterial({
                color: originalColor,
                metalness: 0.0,
                roughness: 0.8,
                transparent: mat.transparent || false,
                opacity: mat.opacity !== undefined ? mat.opacity : 1.0,
                side: THREE.DoubleSide,
                flatShading: false,
                vertexColors: false // Desabilita cores por vértice
            });
            
            // Força a cor novamente (garantia dupla)
            newMat.color.copy(originalColor);
            
            // Preserva emissive
            if (mat.emissive) {
                newMat.emissive.copy(mat.emissive);
                newMat.emissiveIntensity = mat.emissiveIntensity || 0;
            }
            
            // Preserva texturas
            if (mat.map) {
                newMat.map = mat.map;
                newMat.map.colorSpace = THREE.SRGBColorSpace;
            }
            if (mat.normalMap) newMat.normalMap = mat.normalMap;
            if (mat.roughnessMap) newMat.roughnessMap = mat.roughnessMap;
            if (mat.metalnessMap) newMat.metalnessMap = mat.metalnessMap;
            if (mat.aoMap) {
                newMat.aoMap = mat.aoMap;
                newMat.aoMapIntensity = 1.0;
            }
            
            newMat.needsUpdate = true;
            
            console.log(`✅ Material convertido | Nova cor: #${newMat.color.getHexString()}`);
            
            return newMat;
        });
        
        // Aplica novos materiais
        object.material = Array.isArray(object.material) ? newMaterials : newMaterials[0];
        
        // Força atualização da geometria
        if (object.geometry) {
            object.geometry.computeBoundingSphere();
        }
    }
    
    // Recursivo nos filhos
    if (object.children) {
        object.children.forEach(child => convertMaterialsRecursive(child));
    }
}

// Carregar IFC
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (loadedModel) {
        scene.remove(loadedModel);
        loadedModel = null;
    }

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
                
                console.log('🎨 ===== INICIANDO CONVERSÃO FORÇADA =====');
                
                // Converte TODOS os materiais recursivamente
                convertMaterialsRecursive(ifcModel);
                
                // Adiciona à cena DEPOIS da conversão
                scene.add(ifcModel);
                
                // Conta meshes e cores finais
                let meshCount = 0;
                const finalColors = new Map();
                
                ifcModel.traverse((child) => {
                    if (child.isMesh) {
                        meshCount++;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        
                        if (child.material) {
                            const mats = Array.isArray(child.material) ? child.material : [child.material];
                            mats.forEach(mat => {
                                if (mat.color) {
                                    const hex = '#' + mat.color.getHexString();
                                    finalColors.set(hex, (finalColors.get(hex) || 0) + 1);
                                }
                            });
                        }
                    }
                });
                
                console.log('🎨 ===== RESULTADO FINAL =====');
                console.log(`📦 Meshes: ${meshCount}`);
                console.log(`🎨 Cores finais: ${finalColors.size}`);
                finalColors.forEach((count, color) => {
                    console.log(`  ${color}: ${count}x`);
                });
                console.log('==============================');
                
                fitCameraToModel(ifcModel);
                
                document.getElementById('modelName').textContent = file.name;
                document.getElementById('meshCount').textContent = `${meshCount} (${finalColors.size} cores)`;
                
                loading.classList.remove('show');
                info.classList.add('show');
                stats.classList.add('show');
                
                console.log('🎉 Carregamento completo!');
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