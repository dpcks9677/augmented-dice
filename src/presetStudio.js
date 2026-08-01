import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { YachtTrayModel } from './YachtTrayModel.js';
import { getOctGeo, getSmoothBeveledOctGeo } from './geometryUtils.js';
import { getMaterialForDie } from './diceMaterials.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PresetBaker } from './presetBaker.js';

const viewerContainer = document.getElementById('viewer-container');

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111');

// 본게임과 완벽히 동일한 렌더러 설정
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
viewerContainer.appendChild(renderer.domElement);

// 본게임과 완벽히 동일한 카메라 (fov 10, y=120)
const camera = new THREE.PerspectiveCamera(10, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 200);
camera.position.set(0, 120, 0);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// 본게임과 완벽히 동일한 조명 설정 (DiceEngine.js L211-236)
const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x2a1018, 0.72);
scene.add(hemisphereLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.78);
dirLight.position.set(-7, 28, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -30;
dirLight.shadow.camera.right = 30;
dirLight.shadow.camera.top = 30;
dirLight.shadow.camera.bottom = -30;
dirLight.shadow.normalBias = 0.008;
dirLight.shadow.bias = -0.00015;
dirLight.shadow.radius = 3;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.28);
fillLight.position.set(8, 18, 12);
fillLight.castShadow = false;
scene.add(fillLight);

function getViewHeight() {
  const vFov = camera.fov * Math.PI / 180;
  return 2 * Math.tan(vFov / 2) * camera.position.y;
}

// Tray Model
const tray = new YachtTrayModel(scene, {
  onLoad: () => {
    tray.resize(getViewHeight());
    setupDice(false);
    console.log('Tray loaded');
  }
});
tray.load();

// Dice Setup
const octGeo = getSmoothBeveledOctGeo();
const boxGeo = new RoundedBoxGeometry(1.62, 1.62, 1.62, 4, 0.22);

let diceMeshes = [];

function setupDice(isOctMode, diceCount = 5, octaCount = 2) {
  diceMeshes.forEach(m => scene.remove(m));
  diceMeshes = [];
  
  const layout = tray.getLayout(getViewHeight());
  
  for (let i = 0; i < diceCount; i++) {
    const dieIsOct = isOctMode ? (i >= Math.max(0, diceCount - octaCount)) : false;
    const geometry = dieIsOct ? octGeo : boxGeo;
    const config = { type: dieIsOct ? 'octahedron' : 'normal' };
    
    const mesh = new THREE.Mesh(geometry, getMaterialForDie(config));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(i * 2 - 4, layout.playSurfaceY + (dieIsOct ? 1.125 : 0.81), 0);
    scene.add(mesh);
    diceMeshes.push(mesh);
  }
}

window.addEventListener('resize', () => {
  if (!viewerContainer) return;
  camera.aspect = viewerContainer.clientWidth / viewerContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
  tray.resize(getViewHeight());
});

// UI Logic
const baker = new PresetBaker();
let generatedPresets = [];
let keptPresets = [];
let currentPlaybackData = null;
let currentPlaybackTime = 0;
let isPlaying = false;
let selectedPresetIndex = -1;

const btnBakeNormal = document.getElementById('btn-bake-normal');
const btnBakeOcta = document.getElementById('btn-bake-octa');
const btnBakeFlip = document.getElementById('btn-bake-flip');
const bakeStatus = document.getElementById('bake-status');
const presetList = document.getElementById('preset-list');
const btnPlay = document.getElementById('btn-play');
const btnKeep = document.getElementById('btn-keep');
const keptCountEl = document.getElementById('kept-count');
const btnExport = document.getElementById('btn-export');
const savedPresetFile = document.getElementById('saved-preset-file');
const btnLoadSavedPreset = document.getElementById('btn-load-saved-preset');

function normalizePreset(preset, metadata = {}) {
  const diceCount = Number(preset.diceCount || metadata.diceCount || preset.frames?.[0]?.length || 0);
  return {
    ...preset,
    diceCount,
    octaCount: Number(preset.octaCount ?? metadata.octaCount ?? 0),
    mode: preset.mode || metadata.mode || 'normal'
  };
}

async function loadSavedPresetCatalog() {
  try {
    const response = await fetch('/presets/index.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = await response.json();
    savedPresetFile.innerHTML = '<option value="">저장 프리셋 선택</option>';
    catalog.forEach((metadata) => {
      const option = document.createElement('option');
      option.value = metadata.file;
      option.textContent = metadata.label;
      option.dataset.metadata = JSON.stringify(metadata);
      savedPresetFile.appendChild(option);
    });
    btnLoadSavedPreset.disabled = false;
  } catch (error) {
    savedPresetFile.innerHTML = '<option value="">저장 프리셋 목록을 불러오지 못함</option>';
    console.error('[Preset Studio] Failed to load preset catalog', error);
  }
}

btnLoadSavedPreset.onclick = async () => {
  const option = savedPresetFile.selectedOptions[0];
  if (!option?.value) return;
  btnLoadSavedPreset.disabled = true;
  bakeStatus.textContent = `${option.textContent} 불러오는 중...`;
  try {
    const response = await fetch(`/presets/${option.value}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const metadata = JSON.parse(option.dataset.metadata || '{}');
    generatedPresets = (await response.json()).map((preset) => normalizePreset(preset, metadata));
    selectedPresetIndex = -1;
    renderPresetList();
    bakeStatus.textContent = `${option.textContent}: ${generatedPresets.length}개 프리셋 불러옴`;
  } catch (error) {
    bakeStatus.textContent = '저장 프리셋을 불러오지 못함';
    console.error('[Preset Studio] Failed to load saved preset', error);
  } finally {
    btnLoadSavedPreset.disabled = false;
  }
};

loadSavedPresetCatalog();

async function handleBake(mode) {
  btnBakeNormal.disabled = true;
  btnBakeOcta.disabled = true;
  btnBakeFlip.disabled = true;
  
  const diceCount = parseInt(document.getElementById('dice-count').value, 10);
  const octaCount = parseInt(document.getElementById('octa-count').value, 10);
  bakeStatus.textContent = `${mode} 모드 (${diceCount}개) 100회 시뮬레이션 중...`;
  
  const results = await baker.bakeBatch(mode, diceCount, octaCount, 100, 10, (current, total) => {
    bakeStatus.textContent = `${mode} 모드 (${diceCount}개) 시뮬레이션 중... (${current}/${total})`;
  });

  generatedPresets = results.map((preset) => normalizePreset(preset, {
    diceCount,
    octaCount: mode === 'octahedron' ? octaCount : 0
  }));
  bakeStatus.textContent = `완료! 상위 ${results.length}개 추출됨.`;
  
  renderPresetList();
  
  btnBakeNormal.disabled = false;
  btnBakeOcta.disabled = false;
  btnBakeFlip.disabled = false;
}

btnBakeNormal.onclick = () => handleBake('normal');
btnBakeOcta.onclick = () => handleBake('octahedron');
btnBakeFlip.onclick = () => handleBake('flip');

function renderPresetList() {
  presetList.innerHTML = '';
  if (generatedPresets.length === 0) {
    presetList.innerHTML = '<div class="status-text">추출된 프리셋이 없습니다.</div>';
    return;
  }

  generatedPresets.forEach((preset, index) => {
    const el = document.createElement('div');
    el.className = 'preset-item' + (index === selectedPresetIndex ? ' selected' : '');
    
    const label = document.createElement('div');
    label.className = 'preset-label';
    const dCount = preset.diceCount || 5;
    const oCountText = preset.mode === 'octahedron' ? `, 8면체 ${preset.octaCount || 2}개` : '';
    label.textContent = `#${index + 1} - ${preset.mode} (${dCount}개${oCountText})`;
    
    const score = document.createElement('div');
    score.className = 'score';
    score.textContent = `Score: ${preset.score.toFixed(1)}`;
    
    el.appendChild(label);
    el.appendChild(score);
    
    el.onclick = () => {
      selectedPresetIndex = index;
      renderPresetList();
      btnPlay.disabled = false;
      btnKeep.disabled = false;
      
      // Auto-play on select
      playPreset(preset);
    };
    
    presetList.appendChild(el);
  });
}

function playPreset(preset) {
  setupDice((preset.octaCount || 0) > 0, preset.diceCount || 5, preset.octaCount || 0);
  currentPlaybackData = preset;
  currentPlaybackTime = 0;
  isPlaying = true;
}

btnPlay.onclick = () => {
  if (selectedPresetIndex >= 0) {
    playPreset(generatedPresets[selectedPresetIndex]);
  }
};

btnKeep.onclick = () => {
  if (selectedPresetIndex >= 0) {
    const preset = generatedPresets[selectedPresetIndex];
    keptPresets.push(preset);
    keptCountEl.textContent = keptPresets.length;
    btnExport.disabled = false;
    
    // Remove from generated list and select next
    generatedPresets.splice(selectedPresetIndex, 1);
    selectedPresetIndex = -1;
    btnPlay.disabled = true;
    btnKeep.disabled = true;
    renderPresetList();
  }
};

btnExport.onclick = () => {
  if (keptPresets.length === 0) return;
  const jsonStr = JSON.stringify(keptPresets);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dice_presets_pack_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Animation Loop
const clock = new THREE.Clock();

function updatePlayback(delta) {
  if (!isPlaying || !currentPlaybackData) return;

  currentPlaybackTime += delta;
  
  const baseFps = currentPlaybackData.fps || 20;
  const fps = currentPlaybackData.mode === 'flip' ? baseFps * 2 : baseFps;
  const duration = currentPlaybackData.length / fps;
  
  if (currentPlaybackTime >= duration) {
    isPlaying = false;
    return;
  }

  const exactFrame = currentPlaybackTime * fps;
  const frameIndex = Math.floor(exactFrame);
  const nextFrameIndex = Math.min(frameIndex + 1, currentPlaybackData.length - 1);
  const t = exactFrame - frameIndex;

  const frameData = currentPlaybackData.frames[frameIndex];
  const nextFrameData = currentPlaybackData.frames[nextFrameIndex];

  for (let i = 0; i < diceMeshes.length; i++) {
    const d1 = frameData[i];
    const d2 = nextFrameData[i];
    const mesh = diceMeshes[i];
    
    if (d1 && d2 && mesh) {
      // Lerp Position
      mesh.position.set(d1[0], d1[1], d1[2]).lerp(new THREE.Vector3(d2[0], d2[1], d2[2]), t);
      
      // Slerp Quaternion
      const q1 = new THREE.Quaternion(d1[3], d1[4], d1[5], d1[6]);
      const q2 = new THREE.Quaternion(d2[3], d2[4], d2[5], d2[6]);
      mesh.quaternion.copy(q1).slerp(q2, t);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  controls.update();
  updatePlayback(delta);
  renderer.render(scene, camera);
}
animate();
