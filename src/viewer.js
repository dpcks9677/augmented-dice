import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getOctGeo, getSmoothBeveledOctGeo } from './geometryUtils.js';
import { getMaterialForDie } from './diceMaterials.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const viewerContainer = document.getElementById('viewer-container');
const btnGroup = document.getElementById('btn-group');

// Viewer Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111'); // Dark background

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 3, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
viewerContainer.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lighting matching DiceEngine for consistent look
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

const spotLight = new THREE.SpotLight(0xffffff, 3.0);
spotLight.position.set(0, 10, 5);
spotLight.angle = Math.PI / 4;
spotLight.penumbra = 0.5;
scene.add(spotLight);

// Dice Models Setup
const models = [
  { id: 'normal', name: '일반 6면체', type: 'normal', isOct: false },
  { id: 'golden', name: '황금 주사위', type: 'golden', isOct: false },
  { id: 'sevens', name: '세븐스 다이스', type: 'sevens', isOct: false },
  { id: 'couple', name: '커플 주사위', type: 'couple', isOct: false },
  { id: 'promotion', name: '프로모션 주사위', type: 'promotion', isOct: false },
  { id: 'strange', name: '이상한 주사위', type: 'weird', isOct: false },
  { id: 'heavy', name: '묵직한 주사위', type: 'heavy', isOct: false },
  { id: 'rounded-octahedron', name: '8면 주사위', type: 'octahedron', isOct: true, isRounded: true }
];

let currentMesh = null;

// geometry imported from geometryUtils

const octGeo = getOctGeo();
const roundedOctGeo = getSmoothBeveledOctGeo();
const boxGeo = new RoundedBoxGeometry(1.26, 1.26, 1.26, 4, 0.2);

function loadModel(modelInfo) {
  if (currentMesh) {
    scene.remove(currentMesh);
    // Dispose materials to prevent memory leaks if recreated dynamically
    // In this case, we just remove the mesh.
  }

  let geometry = boxGeo;
  if (modelInfo.isRounded) {
    geometry = roundedOctGeo;
  } else if (modelInfo.isOct) {
    geometry = octGeo;
  }
  
  const materials = getMaterialForDie({ type: modelInfo.type });
  
  currentMesh = new THREE.Mesh(geometry, materials);
  scene.add(currentMesh);

  // Update active button
  document.querySelectorAll('#btn-group button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.id === modelInfo.id);
  });
}

// Generate UI
models.forEach(model => {
  const btn = document.createElement('button');
  btn.dataset.id = model.id;
  btn.textContent = model.name;
  btn.onclick = () => loadModel(model);
  btnGroup.appendChild(btn);
});

// Load initial model
loadModel(models[0]);

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  
  // No auto-rotation
  
  renderer.render(scene, camera);
}
animate();

// Handle Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
