import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { YachtTrayModel } from './YachtTrayModel.js';
import { getOctGeo, getSmoothBeveledOctGeo } from './geometryUtils.js';
import { getMaterialForDie } from './diceMaterials.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { PresetBaker } from './presetBaker.js';
import { createCoinMesh } from './CoinModel.js';

const viewerContainer = document.getElementById('viewer-container');

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#111');

// 본게임과 완벽히 동일한 렌더러 설정
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
RectAreaLightUniformsLib.init();
renderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
viewerContainer.appendChild(renderer.domElement);

// 본게임과 완벽히 동일한 카메라 (fov 10, y=120)
const camera = new THREE.PerspectiveCamera(10, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 200);
camera.layers.enable(1);
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

// Board surface grazing light reveals plastic normal/specular detail.
const boardTextureLight = new THREE.DirectionalLight(0xffffff, 0.42);
boardTextureLight.position.set(-24, 9, 20);
boardTextureLight.target.position.set(0, 0, 0);
boardTextureLight.castShadow = false;
scene.add(boardTextureLight);
scene.add(boardTextureLight.target);

// Low-intensity cardinal area lights add grazing highlights without flattening the board.
const boardAreaLights = [
  [0, 14, 42],
  [0, 14, -42],
  [42, 14, 0],
  [-42, 14, 0]
].map(([x, y, z]) => {
  const light = new THREE.RectAreaLight(0xffffff, 0.72, 58, 16);
  light.layers.set(1);
  light.position.set(x, y, z);
  light.lookAt(0, 0, 0);
  scene.add(light);
  return light;
});

// Dedicated shadow key light for the stepped structure at the screen's 6 o'clock edge.
const stairShadowLight = new THREE.DirectionalLight(0xffffff, 0.34);
stairShadowLight.layers.set(1);
stairShadowLight.position.set(8, 22, -34);
stairShadowLight.target.position.set(0, 0, 8);
stairShadowLight.castShadow = true;
stairShadowLight.shadow.mapSize.width = 1024;
stairShadowLight.shadow.mapSize.height = 1024;
stairShadowLight.shadow.camera.left = -70;
stairShadowLight.shadow.camera.right = 70;
stairShadowLight.shadow.camera.top = 70;
stairShadowLight.shadow.camera.bottom = -70;
stairShadowLight.shadow.normalBias = 0.03;
stairShadowLight.shadow.bias = -0.0002;
scene.add(stairShadowLight);
scene.add(stairShadowLight.target);

// Localized grazing spotlight for the stepped keep structure.
const stairSpotLight = new THREE.SpotLight(0xffffff, 0.5, 120, Math.PI / 5, 0.72, 1.2);
stairSpotLight.layers.set(1);
stairSpotLight.position.set(12, 18, -30);
stairSpotLight.target.position.set(0, 0, 8);
stairSpotLight.castShadow = true;
stairSpotLight.shadow.mapSize.width = 512;
stairSpotLight.shadow.mapSize.height = 512;
stairSpotLight.shadow.camera.near = 1;
stairSpotLight.shadow.camera.far = 120;
stairSpotLight.shadow.bias = -0.0003;
scene.add(stairSpotLight);
scene.add(stairSpotLight.target);

function getViewHeight() {
  const vFov = camera.fov * Math.PI / 180;
  return 2 * Math.tan(vFov / 2) * camera.position.y;
}

function setCameraAngle(angle) {
  const clamped = THREE.MathUtils.clamp(Number(angle) || 0, 0, 75);
  const target = boardMode ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(0, 0.8, 0);
  const distance = boardMode ? 120 : 14;
  const radians = THREE.MathUtils.degToRad(clamped);
  camera.position.set(0, distance * Math.cos(radians), distance * Math.sin(radians));
  controls.target.copy(target);
  camera.lookAt(target);
  controls.update();
  if (cameraAngleValue) cameraAngleValue.textContent = `${Math.round(clamped)}°`;
}

function resetCamera() {
  const defaultAngle = boardMode ? 15 : 35;
  camera.fov = boardMode ? 10 : 35;
  setCameraAngle(defaultAngle);
  camera.updateProjectionMatrix();
  if (cameraAngle) cameraAngle.value = String(defaultAngle);
  tray.resize(getViewHeight());
}

// Tray Model
const tray = new YachtTrayModel(scene, {
  onLoad: () => {
    tray.resize(getViewHeight());
    tray.mesh?.layers.set(1);
    setBoardMode(true);
    console.log('Tray loaded');
  }
});
tray.load();

// Dice Setup
const octGeo = getSmoothBeveledOctGeo();
const boxGeo = new RoundedBoxGeometry(1.62, 1.62, 1.62, 4, 0.22);

let diceMeshes = [];

function setupDice(isOctMode, diceCount = 5, octaCount = 2, dieType = 'normal', dieTypes = []) {
  diceMeshes.forEach(m => scene.remove(m));
  diceMeshes = [];
  
  const layout = tray.getLayout(getViewHeight());
  
  for (let i = 0; i < diceCount; i++) {
    const dieIsOct = isOctMode ? (i >= Math.max(0, diceCount - octaCount)) : false;
    const geometry = dieIsOct ? octGeo : boxGeo;
    const config = { type: dieIsOct ? 'octahedron' : (dieTypes[i] || dieType) };
    
    const mesh = new THREE.Mesh(geometry, getMaterialForDie(config));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const spacing = 2;
    const centeredX = (i - (diceCount - 1) / 2) * spacing;
    mesh.position.set(centeredX, layout.playSurfaceY + (dieIsOct ? 1.125 : 0.81), 0);
    scene.add(mesh);
    diceMeshes.push(mesh);
  }
}

function clearModelPreview() {
  if (!modelPreviewGroup) return;
  scene.remove(modelPreviewGroup);
  modelPreviewGroup.traverse(object => {
    if (!object.isMesh) return;
    if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
    else object.material?.dispose();
  });
  modelPreviewGroup = null;
  modelPreview = null;
}

function createPreviewMesh(model) {
  if (model.type === 'coin') return createCoinMesh({ radius: 1.2, thickness: 0.22 });
  const geometry = model.isOct ? octGeo : boxGeo;
  const mesh = new THREE.Mesh(geometry, getMaterialForDie({ type: model.type }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function getSelectedModelDefinitions() {
  return modelDefinitions.filter(model => selectedModels.has(model.id));
}

function updateSimulationControls() {
  const coinSelected = selectedModel?.type === 'coin';
  btnSimulateDice.textContent = coinSelected ? '선택 동전 던지기' : '선택 모델 던지기';
  btnSimulateDice.hidden = coinSelected;
  btnSimulateDice.disabled = !boardMode || coinSelected;
  coinSimulationActions.hidden = !coinSelected;
  btnFlipCoin.disabled = !boardMode;
  btnFlipCoinTails.disabled = !boardMode;
}

function setBoardMode(enabled) {
  boardMode = enabled;
  if (tray.mesh) tray.mesh.visible = enabled;
  resetCamera();
  boardToggle?.setAttribute('aria-pressed', String(enabled));
  if (boardToggle) boardToggle.textContent = `보드 위에서 보기: ${enabled ? '켜짐' : '꺼짐'}`;
  renderModelList();
  renderSelectedModels();
}

function renderSelectedModels() {
  coinAnimation = null;
  isPlaying = false;
  currentPlaybackData = null;
  diceMeshes.forEach(mesh => scene.remove(mesh));
  diceMeshes = [];
  clearModelPreview();
  modelPreviewGroup = new THREE.Group();
  const models = getSelectedModelDefinitions();
  const layout = tray.getLayout(getViewHeight());
  const total = models.reduce((sum, model) => sum + modelCounts[model.id], 0);
  let slot = 0;
  models.forEach(model => {
    for (let index = 0; index < modelCounts[model.id]; index++) {
      const mesh = createPreviewMesh(model);
      const supportHeight = model.type === 'coin' ? 0.12 : (model.isOct ? 1.125 : 0.81);
      const spacing = models.some(item => item.type === 'coin')
        ? (boardMode ? 3.4 : 3.0)
        : (boardMode ? 2.2 : 2.4);
      const x = (slot - (total - 1) / 2) * spacing;
      const y = boardMode ? layout.playSurfaceY + supportHeight : supportHeight;
      const z = boardMode ? 0 : 0;
      mesh.position.set(x, y, z);
      modelPreviewGroup.add(mesh);
      if (!modelPreview) modelPreview = mesh;
      slot++;
    }
  });
  scene.add(modelPreviewGroup);
  const names = models.map(model => `${model.name} ${modelCounts[model.id]}개`).join(', ');
  modelStatus.textContent = `${names} · ${boardMode ? '보드 위 배치' : '모델만 보기'}`;
  updateSimulationControls();
}

function renderModelList() {
  if (!modelList) return;
  modelList.innerHTML = '';
  modelDefinitions.forEach(model => {
    const row = document.createElement('div');
    row.className = 'model-choice';
    const button = document.createElement('button');
    button.dataset.modelId = model.id;
    button.textContent = model.name;
    button.classList.toggle('active', selectedModels.has(model.id));
    button.onclick = () => {
      if (!boardMode) {
        selectedModels = new Set([model.id]);
      } else if (model.type === 'coin') {
        selectedModels = new Set([model.id]);
      } else {
        selectedModels.delete('coin');
        if (selectedModels.has(model.id) && selectedModels.size === 1) return;
        selectedModels.has(model.id) ? selectedModels.delete(model.id) : selectedModels.add(model.id);
        if (!selectedModels.size) selectedModels.add(model.id);
      }
      selectedModel = modelDefinitions.find(item => selectedModels.has(item.id)) || model;
      renderModelList();
      renderSelectedModels();
    };
    row.appendChild(button);
    const count = document.createElement('select');
    count.className = 'model-count';
    count.hidden = false;
    for (let amount = 1; amount <= 6; amount++) {
      const option = document.createElement('option');
      option.value = amount;
      option.textContent = `${amount}개`;
      option.selected = modelCounts[model.id] === amount;
      count.appendChild(option);
    }
    count.onchange = () => {
      modelCounts[model.id] = Number(count.value);
      if (!selectedModels.has(model.id)) selectedModels.add(model.id);
      selectedModel = model;
      renderSelectedModels();
    };
    row.appendChild(count);
    modelList.appendChild(row);
  });
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
const modelList = document.getElementById('model-list');
const modelStatus = document.getElementById('model-status');
const simulationStatus = document.getElementById('simulation-status');
const boardToggle = document.getElementById('btn-board-toggle');
const btnCameraReset = document.getElementById('btn-camera-reset');
const cameraAngle = document.getElementById('camera-angle');
const cameraAngleValue = document.getElementById('camera-angle-value');
const btnSimulateDice = document.getElementById('btn-simulate-dice');
const btnFlipCoin = document.getElementById('btn-flip-coin');
const btnFlipCoinTails = document.getElementById('btn-flip-coin-tails');
const coinSimulationActions = document.getElementById('coin-simulation-actions');
const modelDefinitions = [
  { id: 'normal', name: '일반 6면체', type: 'normal' },
  { id: 'golden', name: '황금 주사위', type: 'golden' },
  { id: 'sevens', name: '세븐스 다이스', type: 'sevens' },
  { id: 'couple', name: '커플 주사위', type: 'couple' },
  { id: 'promotion', name: '프로모션 주사위', type: 'promotion' },
  { id: 'strange', name: '이상한 주사위', type: 'weird' },
  { id: 'heavy', name: '묵직한 주사위', type: 'heavy' },
  { id: 'octahedron', name: '8면 주사위', type: 'octahedron', isOct: true },
  { id: 'coin', name: '황금 동전', type: 'coin' }
];
let selectedModel = modelDefinitions[0];
let selectedModels = new Set([selectedModel.id]);
const modelCounts = Object.fromEntries(modelDefinitions.map(model => [model.id, 1]));
let boardMode = false;
let modelPreview = null;
let modelPreviewGroup = null;
let coinAnimation = null;
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
const materialState = { corduroy: true, plastic: true };
const corduroyTabs = [
  { element: document.getElementById('tab-corduroy-before'), enabled: false },
  { element: document.getElementById('tab-corduroy-after'), enabled: true }
];
const plasticTabs = [
  { element: document.getElementById('tab-plastic-before'), enabled: false },
  { element: document.getElementById('tab-plastic-after'), enabled: true }
];
const materialCompareStatus = document.getElementById('material-compare-status');

function updateMaterialCompareStatus() {
  if (!materialCompareStatus) return;
  materialCompareStatus.textContent = `코듀로이 ${materialState.corduroy ? '적용 후' : '적용 전'} · Soft Plastic ${materialState.plastic ? '적용 후' : '적용 전'}`;
}

function setCorduroyComparison(enabled) {
  materialState.corduroy = Boolean(enabled);
  tray.setCorduroyEnabled(materialState.corduroy);
  if (!boardMode) setBoardMode(true);
  corduroyTabs.forEach(tab => tab.element?.setAttribute('aria-selected', String(tab.enabled === materialState.corduroy)));
  updateMaterialCompareStatus();
}

function setPlasticComparison(enabled) {
  materialState.plastic = Boolean(enabled);
  tray.setPlasticEnabled(materialState.plastic);
  if (!boardMode) setBoardMode(true);
  plasticTabs.forEach(tab => tab.element?.setAttribute('aria-selected', String(tab.enabled === materialState.plastic)));
  updateMaterialCompareStatus();
}

corduroyTabs.forEach(tab => tab.element?.addEventListener('click', () => setCorduroyComparison(tab.enabled)));
plasticTabs.forEach(tab => tab.element?.addEventListener('click', () => setPlasticComparison(tab.enabled)));

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
  if (!boardMode) setBoardMode(true);
  clearModelPreview();
  coinAnimation = null;
  const selectedDieTypes = getSelectedModelDefinitions()
    .flatMap(model => Array.from({ length: modelCounts[model.id] }, () => model));
  const dieTypes = selectedDieTypes.filter(model => !model.isOct).map(model => model.type);
  const dieType = dieTypes[0] || 'normal';
  setupDice((preset.octaCount || 0) > 0, preset.diceCount || 5, preset.octaCount || 0, dieType, dieTypes);
  currentPlaybackData = preset;
  currentPlaybackTime = 0;
  isPlaying = true;
}

async function simulateSelectedDice() {
  if (selectedModel.type === 'coin') {
    simulationStatus.textContent = '주사위 모델을 먼저 선택해 주세요.';
    return;
  }
  btnSimulateDice.disabled = true;
  btnFlipCoin.disabled = true;
  btnFlipCoinTails.disabled = true;
  simulationStatus.textContent = `${selectedModel.name} 투척 중...`;
  try {
    const selectedDice = getSelectedModelDefinitions()
      .flatMap(model => Array.from({ length: modelCounts[model.id] }, () => model))
      .filter(model => model.type !== 'coin');
    const octaCount = selectedDice.filter(model => model.isOct).length;
    const diceCount = selectedDice.length;
    const mode = octaCount > 0 ? 'octahedron' : 'normal';
    const preset = normalizePreset(baker.bakeSingle(mode, diceCount, octaCount), {
      diceCount,
      octaCount,
      mode
    });
    playPreset(preset);
    simulationStatus.textContent = `${selectedModel.name} 투척 재생 중`;
  } catch (error) {
    simulationStatus.textContent = '주사위 투척에 실패함';
    console.error('[Preset Studio] Dice simulation failed', error);
  } finally {
    updateSimulationControls();
  }
}

function flipCoin(side) {
  if (!boardMode) setBoardMode(true);
  clearModelPreview();
  diceMeshes.forEach(mesh => scene.remove(mesh));
  diceMeshes = [];
  currentPlaybackData = null;
  isPlaying = false;
  const layout = tray.getLayout(getViewHeight());
  const coinModel = modelDefinitions.find(model => model.id === 'coin');
  modelPreviewGroup = new THREE.Group();
  const coinMeshes = [];
  const coinCount = modelCounts.coin;
  for (let index = 0; index < coinCount; index++) {
    const coin = createPreviewMesh(coinModel);
    coin.position.set((index - (coinCount - 1) / 2) * 3.4, layout.playSurfaceY + 0.14, 0);
    coin.quaternion.identity();
    modelPreviewGroup.add(coin);
    coinMeshes.push(coin);
  }
  modelPreview = coinMeshes[0];
  scene.add(modelPreviewGroup);
  coinAnimation = {
    side,
    meshes: coinMeshes,
    elapsed: 0,
    duration: 1.35,
    startY: layout.playSurfaceY + 0.14,
    apexY: layout.playSurfaceY + 4.2,
    targetQuaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), side === 'heads' ? 0 : Math.PI)
  };
  modelStatus.textContent = `동전 ${side === 'heads' ? '앞면' : '뒷면'} 착지 예정`;
  simulationStatus.textContent = '동전이 수직으로 회전 중...';
}

function updateCoinAnimation(delta) {
  if (!coinAnimation?.meshes?.length) return;
  coinAnimation.elapsed += delta;
  const launchInterval = 0.3;
  const turns = 5;
  coinAnimation.meshes.forEach((mesh, index) => {
    const progress = THREE.MathUtils.clamp(
      (coinAnimation.elapsed - index * launchInterval) / coinAnimation.duration,
      0,
      1
    );
    if (coinAnimation.elapsed < index * launchInterval) return;
    const arc = Math.sin(progress * Math.PI);
    mesh.position.y = coinAnimation.startY + (coinAnimation.apexY - coinAnimation.startY) * arc;
    const spin = progress * turns * Math.PI * 2 + (coinAnimation.side === 'tails' ? Math.PI : 0);
    mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), spin);
    if (progress >= 1) {
      mesh.position.y = coinAnimation.startY;
      mesh.quaternion.copy(coinAnimation.targetQuaternion);
    }
  });
  if (coinAnimation.elapsed >= coinAnimation.duration + (coinAnimation.meshes.length - 1) * launchInterval) {
    simulationStatus.textContent = `동전 ${coinAnimation.side === 'heads' ? '앞면' : '뒷면'} 착지 완료`;
    coinAnimation = null;
  }
}

btnSimulateDice?.addEventListener('click', simulateSelectedDice);
btnFlipCoin?.addEventListener('click', () => flipCoin('heads'));
btnFlipCoinTails?.addEventListener('click', () => flipCoin('tails'));
boardToggle?.addEventListener('click', () => setBoardMode(!boardMode));
btnCameraReset?.addEventListener('click', resetCamera);
cameraAngle?.addEventListener('input', event => setCameraAngle(event.target.value));

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
const timer = new THREE.Timer();
timer.connect(document);

function updatePlayback(delta) {
  updateCoinAnimation(delta);
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

function animate(timestamp) {
  requestAnimationFrame(animate);
  timer.update(timestamp);
  const delta = timer.getDelta();
  controls.update();
  updatePlayback(delta);
  renderer.render(scene, camera);
}
animate();
