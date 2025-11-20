// script.js - Versão Atualizada com Controles WASD e Zoom Melhorado
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

// Câmera - posição inicial mais próxima
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 5000);
camera.position.set(5, 5, 5);

// Renderer com máxima qualidade
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

// Controles - configuração para zoom mais próximo e pan com botão direito
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.01;      // Permite zoom muito mais próximo
controls.maxDistance = 2000;      // Permite afastar mais também
controls.enablePan = true;        // Habilita pan
controls.panSpeed = 1.0;
controls.screenSpacePanning = true;
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,     // Botão esquerdo: rotacionar
    MIDDLE: THREE.MOUSE.DOLLY,    // Botão do meio: zoom
    RIGHT: THREE.MOUSE.PAN        // Botão direito: pan/mover
};
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,      // Um dedo: rotacionar
    TWO: THREE.TOUCH.DOLLY_PAN    // Dois dedos: zoom e pan
};

// ===== CONTROLES WASD =====
const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false
};
const moveSpeed = 0.001;  // Velocidade base de movimento
let currentMoveSpeed = moveSpeed;

// Detecta teclas pressionadas
document.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = true; break;
        case 'KeyS': moveState.backward = true; break;
        case 'KeyA': moveState.left = true; break;
        case 'KeyD': moveState.right = true; break;
        case 'Space': 
            e.preventDefault();
            moveState.up = true; 
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            moveState.down = true;
            break;
    }
});

document.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': moveState.forward = false; break;
        case 'KeyS': moveState.backward = false; break;
        case 'KeyA': moveState.left = false; break;
        case 'KeyD': moveState.right = false; break;
        case 'Space': moveState.up = false; break;
        case 'ShiftLeft':
        case 'ShiftRight':
            moveState.down = false;
            break;
    }
});

// Função para processar movimento WASD
function processWASDMovement() {
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    
    // Pega a direção que a câmera está olhando
    camera.getWorldDirection(direction);
    direction.y = 0; // Mantém movimento no plano horizontal
    direction.normalize();
    
    // Calcula o vetor para a direita
    right.crossVectors(direction, up).normalize();
    
    // Aplica movimento baseado nas teclas
    if (moveState.forward) {
        camera.position.addScaledVector(direction, currentMoveSpeed);
        controls.target.addScaledVector(direction, currentMoveSpeed);
    }
    if (moveState.backward) {
        camera.position.addScaledVector(direction, -currentMoveSpeed);
        controls.target.addScaledVector(direction, -currentMoveSpeed);
    }
    if (moveState.left) {
        camera.position.addScaledVector(right, -currentMoveSpeed);
        controls.target.addScaledVector(right, -currentMoveSpeed);
    }
    if (moveState.right) {
        camera.position.addScaledVector(right, currentMoveSpeed);
        controls.target.addScaledVector(right, currentMoveSpeed);
    }
    if (moveState.up) {
        camera.position.y += currentMoveSpeed;
        controls.target.y += currentMoveSpeed;
    }
    if (moveState.down) {
        camera.position.y -= currentMoveSpeed;
        controls.target.y -= currentMoveSpeed;
    }
}

// Grid e Eixos
const gridHelper = new THREE.GridHelper(100, 100, 0x4488ff, 0x223344);
scene.add(gridHelper);
const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

// Iluminação melhorada
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.7));

const light1 = new THREE.DirectionalLight(0xffffff, 1.0);
light1.position.set(50, 80, 50);
light1.castShadow = true;
light1.shadow.mapSize.width = 4096;
light1.shadow.mapSize.height = 4096;
light1.shadow.camera.near = 0.5;
light1.shadow.camera.far = 500;
light1.shadow.camera.left = -100;
light1.shadow.camera.right = 100;
light1.shadow.camera.top = 100;
light1.shadow.camera.bottom = -100;
light1.shadow.bias = -0.00001;
light1.shadow.radius = 2;
scene.add(light1);

const light2 = new THREE.DirectionalLight(0xffffff, 0.4);
light2.position.set(-50, 40, -50);
scene.add(light2);

const light3 = new THREE.DirectionalLight(0xffeedd, 0.3);
light3.position.set(0, 50, -100);
scene.add(light3);

const light4 = new THREE.DirectionalLight(0x8899ff, 0.2);
light4.position.set(0, -20, 0);
scene.add(light4);

// IFC Loader - Configuração aprimorada
const ifcLoader = new IFCLoader();
let ifcAPI = null;

try {
    if (ifcLoader.ifcManager && ifcLoader.ifcManager.setWasmPath) {
        ifcLoader.ifcManager.setWasmPath('https://unpkg.com/web-ifc@0.0.53/');
        
        if (ifcLoader.ifcManager.setupThreeMeshBVH) {
            ifcLoader.ifcManager.setupThreeMeshBVH();
        }
        
        ifcLoader.ifcManager.applyWebIfcConfig({
            USE_FAST_BOOLS: true,
            DISCARD_DOWN_PARALLEL_LINES: true,
            CIRCLE_SEGMENTS_LOW: 8,
            CIRCLE_SEGMENTS_MEDIUM: 16,
            CIRCLE_SEGMENTS_HIGH: 32,
        });
        
        ifcAPI = ifcLoader.ifcManager;
        console.log('✅ WASM path configurado e configurações aplicadas');
    }
} catch (e) {
    console.log('⚠️ Erro ao configurar WASM:', e.message);
}

let loadedModel = null;
let edgesGroup = new THREE.Group();
let currentModelID = null;

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
console.log('📋 Controles: WASD = mover, Espaço = subir, Shift = descer');
info.classList.add('show');

// Animação - agora inclui processamento WASD
function animate() {
    requestAnimationFrame(animate);
    processWASDMovement();
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

// Função centralizar - ATUALIZADA para distância menor
function fitCameraToModel(model) {
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    gridHelper.position.y = box.min.y - 0.1;
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    
    // Multiplicador reduzido de 2.5 para 1.2 (câmera mais próxima)
    let cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.2;
    
    // Se o modelo for muito pequeno, ajusta a distância mínima
    if (cameraZ < 1) cameraZ = Math.max(maxDim * 2, 0.5);
    
    camera.position.set(
        center.x + cameraZ * 0.4,
        center.y + cameraZ * 0.4,
        center.z + cameraZ * 0.4
    );
    
    controls.target.copy(center);
    controls.update();
    
    // Ajusta velocidade de movimento baseado no tamanho do modelo
    currentMoveSpeed = Math.max(maxDim * 0.02, 0.01);
    
    console.log('📦 Dimensões:', size, '📍 Centro:', center);
    console.log('🎯 Velocidade de movimento ajustada:', currentMoveSpeed);
}

// Função para adicionar bordas
function addEdgesToMesh(mesh) {
    if (!mesh.geometry) return;
    
    try {
        const edges = new THREE.EdgesGeometry(mesh.geometry, 15);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000, 
            opacity: 0.3, 
            transparent: true,
            linewidth: 1 
        });
        const lineSegments = new THREE.LineSegments(edges, lineMaterial);
        
        lineSegments.position.copy(mesh.position);
        lineSegments.rotation.copy(mesh.rotation);
        lineSegments.scale.copy(mesh.scale);
        
        edgesGroup.add(lineSegments);
    } catch (e) {
        console.warn('⚠️ Erro ao adicionar bordas');
    }
}

// Funções IFC (mantidas do original)
async function getIFCProperties(modelID, expressID) {
    if (!ifcAPI || !modelID) return null;
    try {
        return await ifcAPI.getItemProperties(modelID, expressID, true);
    } catch (e) { return null; }
}

async function getIFCType(modelID, expressID) {
    if (!ifcAPI || !modelID) return null;
    try {
        return await ifcAPI.getTypeProperties(modelID, expressID, true);
    } catch (e) { return null; }
}

async function getVisualStyleFromIFC(modelID, expressID) {
    if (!ifcAPI) return null;
    try {
        const styledItems = await ifcAPI.getAllItemsOfType(modelID, ifcAPI.IFCSTYLEDITEM, false);
        for (const item of styledItems) {
            const styledItem = await ifcAPI.getItemProperties(modelID, item.expressID, false);
            if (styledItem.Item && styledItem.Item.value === expressID) {
                if (styledItem.Styles && styledItem.Styles.length > 0) {
                    return await getStyleProperties(modelID, styledItem.Styles[0].value);
                }
            }
        }
        const product = await ifcAPI.getItemProperties(modelID, expressID, false);
        if (product.Representation) {
            const rep = await ifcAPI.getItemProperties(modelID, product.Representation.value, false);
            if (rep.Representations) {
                for (const repItem of rep.Representations) {
                    const repDetails = await ifcAPI.getItemProperties(modelID, repItem.value, false);
                    if (repDetails.Items) {
                        for (const itemRef of repDetails.Items) {
                            const itemDetails = await ifcAPI.getItemProperties(modelID, itemRef.value, false);
                            if (itemDetails.StyledByItem) {
                                return await getStyleProperties(modelID, itemDetails.StyledByItem.value);
                            }
                        }
                    }
                }
            }
        }
    } catch (e) { console.warn('⚠️ Erro estilos:', e.message); }
    return null;
}

async function getStyleProperties(modelID, styleID) {
    if (!ifcAPI) return null;
    try {
        const style = await ifcAPI.getItemProperties(modelID, styleID, false);
        if (style?.Styles) {
            for (const subRef of style.Styles) {
                const sub = await ifcAPI.getItemProperties(modelID, subRef.value, false);
                if (sub.type === 'IfcSurfaceStyle' && sub.Styles) {
                    for (const elRef of sub.Styles) {
                        const el = await ifcAPI.getItemProperties(modelID, elRef.value, false);
                        if (el.type === 'IfcSurfaceStyleRendering') {
                            return {
                                color: el.SurfaceColour,
                                transparency: el.Transparency ? parseFloat(el.Transparency.value) : 0,
                                diffuse: el.DiffuseColour,
                                specular: el.SpecularColour
                            };
                        }
                    }
                }
            }
        }
    } catch (e) { console.warn('⚠️ Erro style props:', e.message); }
    return null;
}

function ifcColorToThreeColor(ifcColor) {
    if (!ifcColor || ifcColor.Red === undefined) return null;
    return new THREE.Color(
        parseFloat(ifcColor.Red.value) || 0,
        parseFloat(ifcColor.Green.value) || 0,
        parseFloat(ifcColor.Blue.value) || 0
    );
}

const ifcTypeMaterialDefaults = {
    'IFCWALL': { color: 0xe0e0e0, metalness: 0.0, roughness: 0.8 },
    'IFCWALLSTANDARDCASE': { color: 0xd4d4d4, metalness: 0.0, roughness: 0.8 },
    'IFCSLAB': { color: 0xcccccc, metalness: 0.1, roughness: 0.6 },
    'IFCSLABSTANDARDCASE': { color: 0xc0c0c0, metalness: 0.1, roughness: 0.6 },
    'IFCDOOR': { color: 0x8b4513, metalness: 0.2, roughness: 0.7 },
    'IFCWINDOW': { color: 0x87ceeb, metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.5 },
    'IFCFURNISHINGELEMENT': { color: 0xa0522d, metalness: 0.2, roughness: 0.6 },
    'IFCFURNITURE': { color: 0xa0522d, metalness: 0.2, roughness: 0.6 },
    'IFCBEAM': { color: 0x808080, metalness: 0.3, roughness: 0.5 },
    'IFCCOLUMN': { color: 0x696969, metalness: 0.3, roughness: 0.5 },
    'IFCROOF': { color: 0x8b0000, metalness: 0.1, roughness: 0.8 },
    'IFCSTAIR': { color: 0xb8b8b8, metalness: 0.2, roughness: 0.7 },
    'IFCRAILING': { color: 0x4682b4, metalness: 0.6, roughness: 0.3 },
    'IFCBUILDINGELEMENTPROXY': { color: 0xdcdcdc, metalness: 0.1, roughness: 0.7 },
    'DEFAULT': { color: 0xcccccc, metalness: 0.1, roughness: 0.7 }
};

async function processAllMeshesWithIFC(object, modelID, depth = 0) {
    const indent = '  '.repeat(depth);
    
    if (object.isMesh) {
        const expressID = object.userData?.expressID || object.expressID;
        console.log(`${indent}🔍 Mesh: ${object.name || 'sem nome'} | ExpressID: ${expressID}`);
        
        let ifcProps = null, ifcType = null, ifcTypeName = 'UNKNOWN', visualStyle = null;
        
        if (expressID && modelID) {
            ifcProps = await getIFCProperties(modelID, expressID);
            ifcType = await getIFCType(modelID, expressID);
            visualStyle = await getVisualStyleFromIFC(modelID, expressID);
            if (ifcType?.type) ifcTypeName = ifcType.type;
        }
        
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            
            const newMaterials = materials.map((mat) => {
                let newMat = mat;
                if (!(mat instanceof THREE.MeshStandardMaterial)) {
                    newMat = new THREE.MeshStandardMaterial();
                    if (mat.color) newMat.color.copy(mat.color);
                    if (mat.map) newMat.map = mat.map;
                    if (mat.transparent !== undefined) newMat.transparent = mat.transparent;
                    if (mat.opacity !== undefined) newMat.opacity = mat.opacity;
                    newMat.side = THREE.DoubleSide;
                    newMat.flatShading = false;
                    newMat.envMapIntensity = 0.5;
                }
                
                if (visualStyle?.color) {
                    const styleColor = ifcColorToThreeColor(visualStyle.color);
                    if (styleColor) newMat.color.copy(styleColor);
                }
                
                if (visualStyle?.transparency > 0) {
                    newMat.transparent = true;
                    newMat.opacity = 1.0 - visualStyle.transparency;
                }
                
                const defaultMat = ifcTypeMaterialDefaults[ifcTypeName] || ifcTypeMaterialDefaults['DEFAULT'];
                if (newMat.metalness === undefined || newMat.metalness === 0.5) newMat.metalness = defaultMat.metalness;
                if (newMat.roughness === undefined || newMat.roughness === 0.5) newMat.roughness = defaultMat.roughness;
                
                newMat.needsUpdate = true;
                return newMat;
            });
            
            object.material = Array.isArray(object.material) ? newMaterials : newMaterials[0];
            addEdgesToMesh(object);
            if (object.geometry) object.geometry.computeVertexNormals();
        }
        
        object.castShadow = true;
        object.receiveShadow = true;
    }
    
    if (object.children?.length > 0) {
        for (const child of object.children) {
            await processAllMeshesWithIFC(child, modelID, depth + 1);
        }
    }
}

// Carregar IFC
document.getElementById("fileInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (loadedModel) {
        scene.remove(loadedModel);
        scene.remove(edgesGroup);
        loadedModel = null;
        edgesGroup = new THREE.Group();
        currentModelID = null;
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
        console.log('🔄 Carregando:', file.name);
        
        ifcLoader.load(
            url,
            async (ifcModel) => {
                loadedModel = ifcModel;
                currentModelID = ifcModel.modelID || 0;
                
                await processAllMeshesWithIFC(ifcModel, currentModelID, 0);
                
                scene.add(ifcModel);
                scene.add(edgesGroup);
                
                let meshCount = 0;
                ifcModel.traverse((child) => { if (child.isMesh) meshCount++; });
                
                fitCameraToModel(ifcModel);
                
                document.getElementById('modelName').textContent = file.name;
                document.getElementById('meshCount').textContent = `${meshCount} objetos`;
                
                loading.classList.remove('show');
                info.classList.add('show');
                stats.classList.add('show');
                
                console.log('🎉 Modelo carregado!');
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