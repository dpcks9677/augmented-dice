import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OctahedronGeometry } from 'three';
import { getOctGeo, getSmoothBeveledOctGeo } from './geometryUtils.js';
import { getMaterialForDie } from './diceMaterials.js';
import { YachtTrayModel } from './YachtTrayModel.js';

const DIE_SIZE = 1.62;
const DIE_HALF_SIZE = DIE_SIZE / 2;
const ARRANGED_DICE_CAMERA_LIFT = 30;
const ARRANGED_DICE_SPACING = 2.65;

export class DiceEngine {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.container.classList.add('tray-model-loading');
    this.diceArray = [];
    this.confettiArray = []; // { mesh, body, value, isKept }
    this.physicsActive = false;
    this.isAnimating = false;
    this.onDieClick = null; // callback

    this.initThree();
    this.trayModel = new YachtTrayModel(this.scene, {
      onLoad: () => {
        this.container.classList.add('tray-model-loaded');
        this.container.classList.remove('tray-model-loading', 'tray-model-error');
        this.onWindowResize();
      },
      onError: error => {
        console.warn('Yacht tray model failed to load; keeping tray skeleton visible.', error);
        this.container.classList.remove('tray-model-loading');
        this.container.classList.add('tray-model-error');
      }
    });
    this.initCannon();
    this.trayModel.load();
    this.initAudio();
        
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    
    // Set initial size and walls after Cannon is initialized
    this.onWindowResize();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // 컨테이너 크기가 변경될 때(CSS 트랜지션 등) 캔버스 크기를 자동 조절
    const resizeObserver = new ResizeObserver(() => {
      if (this.container.clientWidth > 0 && this.container.clientHeight > 0) {
        this.onWindowResize();
        this.startRenderLoop();
      }
    });
    if (this.container) {
      resizeObserver.observe(this.container);
    }
    
    this.container.addEventListener('click', this.onClick.bind(this));
    
    // 지오메트리 캐싱
    this.diceGeometry = new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 4, 0.22);
    
    this.isRendering = false;
    this.startRenderLoop();
  }

  initAudio() {
    this.hitSounds = [];
    
    // 추가해주신 7개의 소리 파일 목록
    const soundFiles = [
      'dice-throw-1.ogg', 'dice-throw-2.ogg', 'dice-throw-3.ogg',
      'die-throw-1.ogg', 'die-throw-2.ogg', 'die-throw-3.ogg', 'die-throw-4.ogg'
    ];
    
    soundFiles.forEach(fileName => {
      const audio = new Audio(`/sounds/${fileName}`);
      this.hitSounds.push(audio);
    });

    this.cardboardHitSound = new Audio('/sounds/cardboard_hit.wav');
  }

  playHitSound(velocity) {
    if (this.hitSounds.length === 0) return;
    
    // 충돌 속도에 비례하여 볼륨 설정 (15 이상이면 최대 볼륨 1.0)
    let volume = Math.min(1.0, Math.max(0, velocity / 15.0));
    // 속도가 너무 낮으면 소리 무시
    if (volume < 0.1) return;
    
    // 전체 음량을 기존 대비 추가로 50% 줄임 (결과적으로 원본의 25%)
    volume = volume * 0.25;
    
    // 랜덤으로 사운드 중 하나 선택
    const sound = this.hitSounds[Math.floor(Math.random() * this.hitSounds.length)];
    const clone = sound.cloneNode();
    clone.volume = volume;
    clone.play().catch(e => { /* 브라우저 자동 재생 정책에 막힌 경우 무시 */ });
  }

  playCardboardHitSound(startTime = 0.07, volume = 0.8) {
    if (!this.cardboardHitSound) return;
    const clone = this.cardboardHitSound.cloneNode();
    clone.volume = volume;
    try {
      clone.currentTime = startTime;
    } catch (e) {
      /* ignore if currentTime cannot be set prior to play */
    }
    clone.play().catch(e => { /* 브라우저 자동 재생 정책에 막힌 경우 무시 */ });
  }




  startRenderLoop() {
    if (!this.isRendering) {
      this.isRendering = true;
      this.lastTime = performance.now(); // reset delta
      this.animate();
    }
  }

  initThree() {
    this.scene = new THREE.Scene();
    
    // 모든 영역의 기본 가시성. 킵 존처럼 림에 가려지는 곳도 균일하게 읽힌다.
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x2a1018, 0.72);
    this.scene.add(hemisphereLight);

    // 접지 그림자만 담당하는 메인광. 짧은 사선으로 입체감은 남긴다.
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.78);
    // 화면 기준 2시 방향으로 짧은 그림자 방향을 만든다.
    dirLight.position.set(-7, 28, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; // 그림자 해상도 증가
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.normalBias = 0.008;
    dirLight.shadow.bias = -0.00015; // 접지감은 유지하고 그림자 들뜸은 줄임
    dirLight.shadow.radius = 3;
    this.scene.add(dirLight);

    // 카메라 쪽에서 아주 약하게 채우는 보조광. 눈의 대비는 살리고 그림자는 추가하지 않는다.
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.28);
    fillLight.position.set(8, 18, 12);
    fillLight.castShadow = false;
    this.scene.add(fillLight);

    
    // Initialize camera with dummy aspect, will be updated in onWindowResize
    this.camera = new THREE.PerspectiveCamera(10, 1, 0.1, 200);
    this.camera.position.set(0, 120, 0);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.container.appendChild(this.renderer.domElement);

    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shadowContext = shadowCanvas.getContext('2d');
    // 바닥에 닿아 있는 주사위 형태를 연상시키는 둥근 정사각형 그림자.
    shadowContext.fillStyle = 'rgba(0, 0, 0, 0.9)';
    shadowContext.shadowColor = 'rgba(0, 0, 0, 0.55)';
    shadowContext.shadowBlur = 18;
    shadowContext.beginPath();
    shadowContext.roundRect(38, 38, 180, 180, 30);
    shadowContext.fill();
    this.arrangementShadowTexture = new THREE.CanvasTexture(shadowCanvas);
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // 주사위 윗면 호버 테두리 생성 (캔버스 텍스처를 사용하여 두께 자유 조절)
    const hoverCanvas = document.createElement('canvas');
    hoverCanvas.width = 256;
    hoverCanvas.height = 256;
    const hCtx = hoverCanvas.getContext('2d');
    
    hCtx.strokeStyle = '#ffff00'; // 색상 롤백 (원래의 밝은 노란색)
    hCtx.lineWidth = 25; // 기존보다 약 2.5배 이상 눈에 띄게 두꺼운 선
    const hPad = hCtx.lineWidth / 2 + 2; 
    const hRad = 40; // 둥근 모서리 반경
    
    hCtx.beginPath();
    hCtx.moveTo(hPad + hRad, hPad);
    hCtx.lineTo(256 - hPad - hRad, hPad);
    hCtx.quadraticCurveTo(256 - hPad, hPad, 256 - hPad, hPad + hRad);
    hCtx.lineTo(256 - hPad, 256 - hPad - hRad);
    hCtx.quadraticCurveTo(256 - hPad, 256 - hPad, 256 - hPad - hRad, 256 - hPad);
    hCtx.lineTo(hPad + hRad, 256 - hPad);
    hCtx.quadraticCurveTo(hPad, 256 - hPad, hPad, 256 - hPad - hRad);
    hCtx.lineTo(hPad, hPad + hRad);
    hCtx.quadraticCurveTo(hPad, hPad, hPad + hRad, hPad);
    hCtx.stroke();
    
    const hoverTex = new THREE.CanvasTexture(hoverCanvas);
    const hoverGeom = new THREE.PlaneGeometry(1.65, 1.65);
    const hoverMat = new THREE.MeshBasicMaterial({
      map: hoverTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });

    this.hoverHighlight = new THREE.Mesh(hoverGeom, hoverMat);
    this.hoverHighlight.renderOrder = 999;
    this.hoverHighlight.visible = false;
    this.scene.add(this.hoverHighlight);

    // 8면체 전용 호버 테두리 (육각형 캔버스 방식 - 일반 주사위와 완벽히 동일한 두께 및 간격)
    const octHoverCanvas = document.createElement('canvas');
    octHoverCanvas.width = 256;
    octHoverCanvas.height = 256;
    const ohCtx = octHoverCanvas.getContext('2d');
    
    ohCtx.strokeStyle = '#ffff00';
    ohCtx.lineWidth = 25 / 1.65; // 크기 1.65배(1.5 * 1.1) 확장에 맞춰 선 두께는 시각적으로 동일하게 유지
    ohCtx.lineJoin = 'round';
    
    const hexR = 105; // 육각형 크기 (주사위를 충분히 감싸도록 설정)
    
    // 꼭짓점 좌표 계산
    const vertices = [];
    for (let i = 0; i < 6; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI / 3);
      const px = 128 + hexR * Math.cos(angle);
      const py = 128 + hexR * Math.sin(angle);
      vertices.push({x: px, y: py});
    }
    
    const cornerRadius = 15; // 모서리 둥글기 반경
    ohCtx.beginPath();
    
    // 첫 번째 선분의 중간점에서 시작
    const startX = vertices[0].x + (vertices[1].x - vertices[0].x) * 0.5;
    const startY = vertices[0].y + (vertices[1].y - vertices[0].y) * 0.5;
    ohCtx.moveTo(startX, startY);
    
    // 모든 꼭짓점을 돌면서 둥근 모서리 그리기
    for (let i = 1; i <= 6; i++) {
      const p1 = vertices[i % 6];
      const p2 = vertices[(i + 1) % 6];
      ohCtx.arcTo(p1.x, p1.y, p2.x, p2.y, cornerRadius);
    }
    
    ohCtx.closePath();
    ohCtx.stroke();
    
    const octHoverTex = new THREE.CanvasTexture(octHoverCanvas);
    const octHoverPlane = new THREE.PlaneGeometry(1.65 * 1.65, 1.65 * 1.65); // 지름 1.65배(1.5 * 1.1) 증가
    const octHoverMat = new THREE.MeshBasicMaterial({
      map: octHoverTex,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    this.octHoverHighlight = new THREE.Mesh(octHoverPlane, octHoverMat);
    this.octHoverHighlight.renderOrder = 999;
    this.octHoverHighlight.visible = false;
    this.scene.add(this.octHoverHighlight);

    this.container.addEventListener('click', this.onClick.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    this.isRollSettling = false; // 굴림 후 정렬 대기 중 상태 플래그
    this.currentSlotOpacity = 1.0;
    this.targetSlotOpacity = 1.0;
  }

  updateKeepSlots() {
    // STL 트레이에서는 파여 있는 포켓 자체가 킵 존이다. 선형 오버레이는 CSS 폴백 전용이다.
    if (this.trayModel?.isReady) {
      this.slotMeshes?.forEach(mesh => { mesh.visible = false; });
      return;
    }
    if (!this.slotMeshes) {
      this.slotMeshes = [];
    }
    const fallbackSpacing = 2.5;
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const trayLayout = this.trayModel?.getLayout(viewHeight);
    
    // 킵 존은 화면 상단 120px 영역.
    // 3D 뷰에서 해당 영역의 Z 좌표를 계산.
    const h = this.container.clientHeight;
    const matSize = h / 1.25;
    const frameThickness = matSize * 0.125;
    
    // 플레이매트가 5% 아래로 이동했으므로 Top 프레임이 살짝 더 넓어짐
    const yShift = matSize * 0.05;
    const paddingTop = frameThickness + yShift;
    
    // 킵존 슬롯을 Top 프레임의 정중앙에 배치
    const fallbackKeepZoneCenterZ = -viewHeight / 2 + viewHeight * ((paddingTop / 2 - yShift) / h);
    const spacing = trayLayout?.keepSpacing ?? fallbackSpacing;
    const keepZoneCenterZ = trayLayout?.keepCenterZ ?? fallbackKeepZoneCenterZ;

    // 슬롯 외곽선 텍스처(둥근 사각형) 생성
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.roundRect(16, 16, 224, 224, 32);
    ctx.stroke();

    // 요트 뱅크 전용 금빛 슬롯 텍스처 생성 (기존 슬롯과 선 두께 동일, 금빛 이펙트 반영)
    const goldCanvas = document.createElement('canvas');
    goldCanvas.width = 256;
    goldCanvas.height = 256;
    const gCtx = goldCanvas.getContext('2d');
    gCtx.strokeStyle = '#ffd700';
    gCtx.lineWidth = 12;
    gCtx.shadowColor = '#f39c12';
    gCtx.shadowBlur = 16;
    gCtx.lineJoin = 'round';
    gCtx.beginPath();
    gCtx.roundRect(16, 16, 224, 224, 32);
    gCtx.stroke();

    this.defaultSlotTex = new THREE.CanvasTexture(canvas);
    this.goldSlotTex = new THREE.CanvasTexture(goldCanvas);

    const tex = this.isYachtBankActive ? this.goldSlotTex : this.defaultSlotTex;
    
    // 주사위 크기(1.26)보다 살짝 작게 설정
    const size = trayLayout?.slotOverlaySize ?? 1.19;
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ 
      map: tex, 
      transparent: true, 
      depthWrite: false 
    });

    // X축 가로로 5개의 고정 슬롯 배치
    const keptStartX = trayLayout?.keepStartX ?? -2 * spacing;
    
    for (let i = 0; i < 5; i++) {
      // 주사위가 놓일 실제 목표 좌표 (Y=0)
      const targetX = keptStartX + i * spacing;
      const targetZ = keepZoneCenterZ;

      // 카메라에서 주사위를 바라보는 시선(Ray)이 바닥에 위치한 목표 지점을 지나도록 패럴랙스 교정
      const camY = this.camera.position.y;
      const slotY = trayLayout?.slotOverlayY ?? 0.15;
      
      // 닮음비를 이용해 시각적 위치가 일치하도록 물리적 X, Z 좌표를 안쪽으로 당김
      const slotX = targetX * (camY - slotY) / camY;
      const slotZ = targetZ * (camY - slotY) / camY;

      if (this.slotMeshes.length <= i) {
        const slotMat = new THREE.MeshBasicMaterial({ 
          map: tex, 
          transparent: true, 
          depthWrite: false 
        });
        const slotMesh = new THREE.Mesh(geo, slotMat);
        slotMesh.rotation.x = -Math.PI / 2; // 바닥에 눕히기
        slotMesh.position.set(slotX, slotY, slotZ);
        slotMesh.scale.set(size, size, 1);
        slotMesh.renderOrder = 10; // 바닥 매트보다 위에 렌더링되도록 최상단 보장
        this.scene.add(slotMesh);
        this.slotMeshes.push(slotMesh);
      } else {
        this.slotMeshes[i].position.set(slotX, slotY, slotZ);
        this.slotMeshes[i].scale.set(size, size, 1);
        this.slotMeshes[i].renderOrder = 10;
        if (this.slotMeshes[i].material) {
          this.slotMeshes[i].material.map = tex;
          this.slotMeshes[i].material.needsUpdate = true;
        }
      }
      this.slotMeshes[i].visible = !trayLayout || this.isYachtBankActive;
    }
  }

  setYachtBankActive(active) {
    const wasActive = this.isYachtBankActive;
    this.isYachtBankActive = !!active;

    if (this.trayModel?.isReady) {
      this.trayModel.setKeepZoneGlow(this.isYachtBankActive);
      this.startRenderLoop();
      return;
    }

    // slotMeshes가 아직 생성되지 않았다면 3D 킵 존 슬롯 5개를 즉시 생성
    if (!this.slotMeshes || this.slotMeshes.length === 0) {
      this.updateKeepSlots();
    }

    if (active) {
      if (!wasActive) {
        this.currentSlotOpacity = 0.2; // 0.2에서 켜짐(fade-in) 시작
      }
      this.targetSlotOpacity = 1.0;
      if (this.slotMeshes && this.slotMeshes.length > 0) {
        this.slotMeshes.forEach(mesh => {
          if (mesh && mesh.material) {
            mesh.visible = true;
            mesh.material.map = this.goldSlotTex;
            mesh.material.color.setHex(0xffffff);
            mesh.material.opacity = this.currentSlotOpacity;
            mesh.material.transparent = true;
            mesh.material.needsUpdate = true;
          }
        });
      }
    } else {
      if (wasActive) {
        // 활성화 상태에서 비활성화로 전환 시: 황금 텍스처 상태에서 opacity 0.2로 fade-out 진행
        this.targetSlotOpacity = 0.2;
      } else {
        this.currentSlotOpacity = 1.0;
        this.targetSlotOpacity = 1.0;
        if (this.slotMeshes && this.slotMeshes.length > 0) {
          this.slotMeshes.forEach(mesh => {
            if (mesh && mesh.material) {
              mesh.visible = !this.trayModel?.isReady;
              mesh.material.map = this.defaultSlotTex;
              mesh.material.color.setHex(0xffffff);
              mesh.material.opacity = 1.0;
              mesh.material.transparent = true;
              mesh.material.needsUpdate = true;
            }
          });
        }
      }
    }

    this.startRenderLoop();
  }

  initCannon() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -72, 0)
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    // Contact material
    const defaultMaterial = new CANNON.Material('default');
    const contactMaterial = new CANNON.ContactMaterial(
      defaultMaterial, defaultMaterial, {
        friction: 0.62,
        restitution: 0.16
      }
    );
    this.world.addContactMaterial(contactMaterial);
    this.world.defaultMaterial = defaultMaterial;

    // Floor (use a massive thick Box to prevent tunneling issues on high velocity drop)
    const floorShape = new CANNON.Box(new CANNON.Vec3(200, 20, 200));
    const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
    floorBody.position.set(0, -20, 0); // top surface is at y=0
    this.world.addBody(floorBody);
    this.floorBody = floorBody;
    
    this.wallBodies = [];
    this.updateWalls();
  }

  updateWalls(isTableFlipping = false) {
    // Remove old physics walls
    this.wallBodies.forEach(b => this.world.removeBody(b));
    this.wallBodies = [];
    if (this.wallMeshes) {
      this.wallMeshes.forEach(m => this.scene.remove(m));
    }
    this.wallMeshes = [];
    
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const viewWidth = viewHeight * this.camera.aspect;
    
    const h = this.container.clientHeight;
    const matSize = h / 1.25;
    const matSize3D = viewHeight * (matSize / h);
    const trayLayout = this.trayModel?.getLayout(viewHeight);
    const playBounds = trayLayout?.playBounds ?? {
      minX: -matSize3D / 2,
      maxX: matSize3D / 2,
      minZ: -matSize3D / 2,
      maxZ: matSize3D / 2
    };
    const playWidth = playBounds.maxX - playBounds.minX;
    const playDepth = playBounds.maxZ - playBounds.minZ;
    const playCenterX = (playBounds.minX + playBounds.maxX) / 2;
    const playCenterZ = (playBounds.minZ + playBounds.maxZ) / 2;
    
    const wallThickness = 10;
    const padding = 0;
    
    // 일반 굴림(isTableFlipping === false) 시 Y=20 천장으로 버건디 매트 이탈 차단
    // 판 뒤집기(isTableFlipping === true) 시 Y=250 수직 벽 및 Y=110 상공 천장으로 높이 솟구침 허용
    const wallHeight = isTableFlipping ? 250 : 20;
    const wallYPos = isTableFlipping ? 125 : 10;
    const ceilingYPos = isTableFlipping ? 110 : 20;

    const createWall = (w, d, x, z, rotX = 0, rotZ = 0) => {
      const shape = new CANNON.Box(new CANNON.Vec3(w/2, wallHeight, d/2));
      const body = new CANNON.Body({ mass: 0, shape });
      body.position.set(x, wallYPos, z);
      
      const qX = new CANNON.Quaternion();
      qX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), rotX);
      const qZ = new CANNON.Quaternion();
      qZ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotZ);
      body.quaternion = qX.mult(qZ);
      
      this.world.addBody(body);
      this.wallBodies.push(body);
    };

    // 버건디 매트 사각형 영역 바깥으로 1mm도 벗어나지 못하도록 직각 수직 기둥 벽 구축 (tilt = 0)
    const tilt = 0;
    const shift = 0;

    // Top (-z)
    createWall(playWidth + wallThickness * 2, wallThickness, playCenterX, playBounds.minZ - wallThickness / 2 + padding, 0, 0);
    // Bottom (+z)
    createWall(playWidth + wallThickness * 2, wallThickness, playCenterX, playBounds.maxZ + wallThickness / 2 - padding, 0, 0);
    // Left (-x)
    createWall(wallThickness, playDepth + wallThickness * 2, playBounds.minX - wallThickness / 2 + padding, playCenterZ, 0, 0);
    // Right (+x)
    createWall(wallThickness, playDepth + wallThickness * 2, playBounds.maxX + wallThickness / 2 - padding, playCenterZ, 0, 0);

    // 버건디 규격 수평 천장 물리 벽 (일반 굴림 Y=20, 판 뒤집기 Y=110)
    const ceilingShape = new CANNON.Box(new CANNON.Vec3(playWidth / 2, 5, playDepth / 2));
    const ceilingBody = new CANNON.Body({ mass: 0, shape: ceilingShape });
    ceilingBody.position.set(playCenterX, ceilingYPos, playCenterZ);
    this.world.addBody(ceilingBody);
    this.wallBodies.push(ceilingBody);
  }



  onWindowResize() {
    let maxW, maxH;

    if (this.container.id === 'landing-dice-wrapper') {
      // Landing page: container is sized by flexbox/CSS, so we can just use its current offset parent or window size
      // Reset explicit styles first so we can measure the natural CSS size
      this.container.style.width = '';
      this.container.style.height = '';
      const rect = this.container.getBoundingClientRect();
      maxW = rect.width;
      maxH = rect.height;
    } else {
      // Game page
      const appContainer = document.getElementById('app-container');
      if (!appContainer) return;

      const availableTotalHeight = appContainer.clientHeight;
      const controls = document.querySelector('.controls-area');
      const btn = document.getElementById('btn-roll');
      const margins = 40; // controls-area 하단 20px + dice-container 하단 20px
      const paddingY = 48; // playable-section 상/하단 패딩 합
      const paddingX = 48; // playable-section left+right padding
      
      // 이전 프레임에서 고정된 width를 초기화하여 글자 래핑(wrapping) 현상으로 인한 비정상적인 offsetHeight 증가 방지
      if (controls) controls.style.width = '';
      if (btn) btn.style.width = '';
      
      const usedHeight = (controls ? controls.offsetHeight : 0) 
                       + (btn ? btn.offsetHeight : 0) 
                       + paddingY + margins;
                       
      const playableSection = document.getElementById('playable-section');
      const playableSectionWidth = playableSection ? playableSection.clientWidth : 830;
                       
      maxW = playableSectionWidth - paddingX;
      maxH = availableTotalHeight - usedHeight;
    }
    
    // 정사각형 유지: 가로 세로 중 가용한 공간이 더 작은 쪽에 맞춤
    const containerSize = Math.min(maxW, maxH);
    
    let matSize = containerSize / 1.25;
    matSize = Math.max(100, matSize); // 최소 크기 보장
    
    const frameThickness = matSize * 0.125;

    const w = matSize + frameThickness * 2;
    const h = matSize + frameThickness * 2;
    
    // 컨테이너 크기 강제 고정
    this.container.style.flexGrow = '0';
    // For landing, we shouldn't force the container size because CSS aspect-ratio handles it, 
    // but the canvas will be w x h. Actually, fixing the container size is fine as long as we use the correct w and h.
    if (this.container.id !== 'landing-dice-wrapper') {
      this.container.style.width = w + 'px';
      this.container.style.height = h + 'px';
      
      const controls = document.querySelector('.controls-area');
      const btn = document.getElementById('btn-roll');
      if (controls) controls.style.width = w + 'px';
      if (btn) btn.style.width = w + 'px';
    }
    
    // 자식 요소들 크기 강제 동기화 (CSS flex 버그 방지)
    const keepZone = this.container.querySelector('.keep-zone-mat');
    if (keepZone) {
      keepZone.style.width = '100%';
    }
    
    const yShift = 0;
    this.camera.aspect = 1; // w == h
    // 플레이매트가 yShift 만큼 아래로 이동했으므로, 3D 카메라 렌더링 영역도 동일하게 이동시켜 Z=0을 플레이매트 정중앙에 맞춤
    this.camera.setViewOffset(w, h, 0, -yShift, w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    const viewHeight = 2 * Math.tan((this.camera.fov * Math.PI / 180) / 2) * this.camera.position.y;
    this.trayModel?.resize(viewHeight);
    const trayFloorY = this.trayModel?.getLayout(viewHeight)?.floorY ?? 0;
    this.currentFloorY = trayFloorY;
    if (this.floorBody) this.floorBody.position.y = trayFloorY - 20;
    this.updateWalls();
    this.updateKeepSlots();
    
    this.startRenderLoop();
  }

  clearUnkept() {
    const unkept = this.diceArray.filter(d => !d.isKept);
    unkept.forEach(die => {
      this.scene.remove(die.mesh);
      this.removeArrangementShadow(die);
      if (die.body) this.world.removeBody(die.body);
    });
    this.diceArray = this.diceArray.filter(d => d.isKept);
  }

  clearAll() {
    this.diceArray.forEach(die => {
      this.scene.remove(die.mesh);
      this.removeArrangementShadow(die);
      if (die.body) this.world.removeBody(die.body);
    });
    this.diceArray = [];
  }

  // 폭발한(dead) 주사위를 배열에서 정리하는 메서드
  cleanUpDeadDice() {
    this.diceArray = this.diceArray.filter(d => !d.isDead);
  }

  playClearAnimation(isSpecial = false) {
    if (this.diceArray.length === 0) return;

    this.isAnimating = false; 
    
    if (isSpecial) {
      // 폭죽(Confetti) 효과 - 0.2초 간격으로 순차 폭발
      this.diceArray.forEach((die, index) => {
        die.isSpecialClearing = true;
        die.clearDelay = index * 0.2;
        die.anticipationProgress = 0;
        die.startPosition = die.mesh.position.clone();
      });
      this.startRenderLoop();
      return;
    }

    // 버건디 플레이매트 중심(0,0)에서 5시 방향으로 흡수되도록 설정
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const h = this.container.clientHeight;
    const matSize = h / 1.25;
    const frameThickness = matSize * 0.125;
    const matSize3D = viewHeight * (matSize / h);
    
    // 우측 하단 (5시 방향) 테두리 모서리 끝부분으로 위치 수정
    const targetPos = new THREE.Vector3(matSize3D/2 - 1, 0.5, matSize3D/2 - 1);

    this.diceArray.forEach(die => {
      if (die.body) {
        this.world.removeBody(die.body);
        die.body = null;
      }
      die.isClearing = true;
      die.clearProgress = 0;
      die.startPosition = die.mesh.position.clone();
      die.targetPosition = targetPos.clone();
    });
    this.startRenderLoop();
  }

  createConfetti(position) {
    const colors = [0xff4757, 0x2ed573, 0x1e90ff, 0xffa502, 0xff7f50, 0x3742fa, 0xff1493];
    const confettiCount = 15; // 주사위 1개당 15개의 종이 조각

    for (let i = 0; i < confettiCount; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      // 작은 사각형 종이 모양
      const geo = new THREE.PlaneGeometry(0.4, 0.4);
      const mat = new THREE.MeshStandardMaterial({
        color: color,
        side: THREE.DoubleSide,
        roughness: 0.8,
        metalness: 0.1,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geo, mat);
      
      mesh.position.copy(position);
      
      // 위로 솟구치며 사방으로 퍼지는 무작위 속도
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 18, // x 속도
        Math.random() * 15 + 8,     // y 속도 (위로)
        (Math.random() - 0.5) * 18  // z 속도
      );

      // 나풀거림을 위한 회전 속도
      const rotationSpeed = new THREE.Vector3(
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      );

      this.scene.add(mesh);
      this.confettiArray.push({
        mesh,
        velocity,
        rotationSpeed,
        isLanded: false,
        landedTime: 0,
        isDead: false
      });
    }
  }

  async roll(configsOrCount, isObserving = false, remoteSpawnTransforms = null) {
    return new Promise((resolve) => {
      this.clearUnkept();
      this.isObserving = isObserving;
      this.physicsActive = true; 
      this.isAnimating = false;
      this.currentSpawnTransforms = [];
      this.startRenderLoop();
      
      let configs = [];
      let count = 0;
      if (typeof configsOrCount === 'number') {
        count = configsOrCount;
        for(let i=0; i<configsOrCount; i++) configs.push({type: 'normal'});
      } else {
        configs = configsOrCount;
        count = configs.length;
      }
      
      const size = DIE_SIZE;
      const boxGeo = this.diceGeometry;
      if (!this.octGeoCache) {
        this.octGeoCache = getSmoothBeveledOctGeo();
      }
      const octGeo = this.octGeoCache;

      const vFov = this.camera.fov * Math.PI / 180;
      const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
      
      const h = this.container.clientHeight;
      const matSize = h / 1.25;
      const frameThickness = matSize * 0.125;
      const matSize3D = viewHeight * (matSize / h);
      const trayLayout = this.trayModel?.getLayout(viewHeight);
      const playBounds = trayLayout?.playBounds;

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        const isOct = config.type === 'octahedron';
        const isHeavy = config.type === 'heavy';
        
        const geometry = isOct ? octGeo : boxGeo;
        const materials = getMaterialForDie(config);
        
        const mesh = new THREE.Mesh(geometry, materials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        let shape;
        if (isOct) {
           // 물리 엔진용으로는 충돌 계산이 빠르도록 꼭지점이 6개인 심플한 날카로운 8면체를 사용합니다.
           const r = 1.125; // 0.65 * sqrt(3)
           const vertices = [
             new CANNON.Vec3(r, 0, 0), new CANNON.Vec3(-r, 0, 0),
             new CANNON.Vec3(0, r, 0), new CANNON.Vec3(0, -r, 0),
             new CANNON.Vec3(0, 0, r), new CANNON.Vec3(0, 0, -r)
           ];
           const faces = [
             [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
             [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]
           ];
           shape = new CANNON.ConvexPolyhedron({ vertices, faces });
        } else {
           shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
        }
        
        const mass = isHeavy ? 3 : 1;
        const body = new CANNON.Body({ mass: mass, shape });
        
        body.linearDamping = 0.14;
        body.angularDamping = 0.28;
        
        const padding = 1.0;
        const startX = playBounds
          ? (playBounds.minX + playBounds.maxX) / 2
          : 0;
        const startZ = playBounds
          ? playBounds.maxZ - padding
          : matSize3D / 2 - padding;

        if (remoteSpawnTransforms && remoteSpawnTransforms[i]) {
          const st = remoteSpawnTransforms[i];
          body.position.set(st.pos.x, st.pos.y, st.pos.z);
          body.quaternion.set(st.quat.x, st.quat.y, st.quat.z, st.quat.w);
          body.velocity.set(st.vel.x, st.vel.y, st.vel.z);
          body.angularVelocity.set(st.angVel.x, st.angVel.y, st.angVel.z);
        } else {
          const spread = (i / Math.max(1, count - 1)) - 0.5;
          body.position.set(
            startX + spread * 4.5 + (Math.random() - 0.5) * 3.0,
            DIE_HALF_SIZE + 0.8 + (i * 0.42) + Math.random(),
            startZ - (i * 2.1) - Math.random() * 1.5
          );
          
          body.quaternion.setFromEuler(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
          );
          
          body.velocity.set(
            (Math.random() - 0.5) * 14 + (spread * 18),
            12 + Math.random() * 9,
            -15 - Math.random() * 10
          );
          
          body.angularVelocity.set(
            (Math.random() - 0.5) * 72,
            (Math.random() - 0.5) * 72,
            (Math.random() - 0.5) * 72
          );

          this.currentSpawnTransforms.push({
            pos: { x: body.position.x, y: body.position.y, z: body.position.z },
            quat: { x: body.quaternion.x, y: body.quaternion.y, z: body.quaternion.z, w: body.quaternion.w },
            vel: { x: body.velocity.x, y: body.velocity.y, z: body.velocity.z },
            angVel: { x: body.angularVelocity.x, y: body.angularVelocity.y, z: body.angularVelocity.z }
          });
        }

        // 물리 충돌 이벤트 기반 사운드 재생
        body.addEventListener("collide", (e) => {
          const relativeVelocity = Math.abs(e.contact.getImpactVelocityAlongNormal());
          if (relativeVelocity > 2) {
            this.playHitSound(relativeVelocity);
          }
        });

        this.world.addBody(body);
        this.diceArray.push({ mesh, body, value: 1, isKept: false, config: configs[i] });
      }

      // Check sleep (only if running physics locally)
      if (isObserving) {
        this.observingResolve = resolve;
        return; // Will be resolved by forceRollEnd
      }

      let attempts = 0;
      const checkSleep = setInterval(() => {
        attempts++;
        let allSleeping = true;
        this.diceArray.forEach(die => {
          if (!die.isKept && die.body) {
            // 속도가 매우 낮으면 강제로 sleep시켜 틱틱거림 방지 및 빠른 애니메이션 전환
            if (die.body.velocity.lengthSquared() < 0.1 && die.body.angularVelocity.lengthSquared() < 0.1) {
              die.body.sleep();
            }
            if (die.body.sleepState !== CANNON.Body.SLEEPING) {
              allSleeping = false;
            }
          }
        });

        // 2.5초(25회 * 100ms) 지나면 강제로 멈춤
        if (allSleeping || attempts >= 25) {
          clearInterval(checkSleep);
          this.physicsActive = false;
          
          this.diceArray.forEach(die => {
            if (!die.isKept) {
              if (die.body) {
                this.world.removeBody(die.body);
                die.body = null;
              }
              die.value = this.calculateDieValue(die.mesh.quaternion, die.config);
            }
          });
          
          // arrangeAll is handled by main.js after unkeeping the dice
          this.isRollSettling = true; // 정렬(arrangeAll) 호출 전까지 호버 방지
          resolve();
        }
      }, 100);
    });
  }

  async flipTable() {
    return new Promise((resolve) => {
      const unkeptDice = this.diceArray.filter(d => !d.isKept);
      if (unkeptDice.length === 0) {
        resolve();
        return;
      }

      this.physicsActive = true;
      this.isAnimating = false;
      this.updateWalls(true); // 판 뒤집기 전용 상공 천장(Y=110) 개방
      this.startRenderLoop();

      // 킵되지 않은 주사위들을 하늘 위로 수직으로 강하게 솟구쳐 올리기
      unkeptDice.forEach(die => {
        // 이미 물리 바디가 벗겨졌다면 재초기화
        if (!die.body) {
          const shape = new CANNON.Box(new CANNON.Vec3(DIE_HALF_SIZE, DIE_HALF_SIZE, DIE_HALF_SIZE));
          const body = new CANNON.Body({ mass: 1, shape: shape });
          body.position.copy(die.mesh.position);
          body.quaternion.copy(die.mesh.quaternion);
          this.world.addBody(body);
          die.body = body;
        }

        die.body.wakeUp();
        // 상향 수직 속도 & X/Z 대각선 힘 및 자연스러운 3D 스핀 회전 부과
        die.body.velocity.set(
          (Math.random() - 0.5) * 8.0,
          130 + Math.random() * 25,
          (Math.random() - 0.5) * 8.0
        );
        die.body.angularVelocity.set(
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 90
        );
      });

      let attempts = 0;
      const checkFlip = setInterval(() => {
        attempts++;
        let allSleeping = true;
        unkeptDice.forEach(die => {
          if (die.body) {
            // Y축 하한선 강제 클램프 구출 안전망 (확대된 주사위가 바닥을 뚫지 않도록 보정)
            const floorY = this.currentFloorY ?? 0;
            if (die.body.position.y < floorY + DIE_HALF_SIZE) {
              die.body.position.y = floorY + DIE_HALF_SIZE;
              if (die.body.velocity.y < 0) die.body.velocity.y = 0;
            }

            // 주사위가 다시 바닥에 안착했고 속도가 줄었을 때 강제 sleep
            if (die.body.position.y < 3 && die.body.velocity.lengthSquared() < 0.1 && die.body.angularVelocity.lengthSquared() < 0.1) {
              die.body.sleep();
            }
            if (die.body.sleepState !== CANNON.Body.SLEEPING) {
              allSleeping = false;
            }
          }
        });

        // 높은 솟구침에 맞춰 4.5초(45회 * 100ms) 지나면 굴림 종료
        if (allSleeping || attempts >= 45) {
          clearInterval(checkFlip);
          this.physicsActive = false;

          unkeptDice.forEach(die => {
            if (die.body) {
              this.world.removeBody(die.body);
              die.body = null;
            }
            die.value = this.calculateDieValue(die.mesh.quaternion, die.config);
          });

          this.updateWalls(false); // 일반 굴림 전용 버건디 천장(Y=20)으로 원복
          this.isRollSettling = false;
          resolve();
        }
      }, 100);
    });
  }
  getSpawnTransforms() {
    return this.currentSpawnTransforms || [];
  }

  getFinalTransforms() {
    return this.diceArray.map(d => ({
      pos: { x: d.mesh.position.x, y: d.mesh.position.y, z: d.mesh.position.z },
      quat: { x: d.mesh.quaternion.x, y: d.mesh.quaternion.y, z: d.mesh.quaternion.z, w: d.mesh.quaternion.w }
    }));
  }

  // 관전자(Guest)용 롤 종료 트리거
  forceRollEnd(finalValues, finalTransforms = null) {
    if (this.observingTimeout) {
      clearTimeout(this.observingTimeout);
      this.observingTimeout = null;
    }
    this.physicsActive = false;
    this.isObserving = false;
    this.diceArray.forEach((die, index) => {
      if (!die.isKept) {
        if (die.body) {
          this.world.removeBody(die.body);
          die.body = null;
        }
        if (finalTransforms && finalTransforms[index]) {
          const ft = finalTransforms[index];
          die.mesh.position.set(ft.pos.x, ft.pos.y, ft.pos.z);
          die.mesh.quaternion.set(ft.quat.x, ft.quat.y, ft.quat.z, ft.quat.w);
        }
        // 전달받은 진짜 최종값 적용
        if (finalValues && finalValues[index] !== undefined) {
          die.value = finalValues[index];
        } else {
          die.value = this.calculateDieValue(die.mesh.quaternion, die.config);
        }
      }
    });
    this.isRollSettling = true;
    if (this.observingResolve) {
      this.observingResolve();
      this.observingResolve = null;
    }
  }

  // 외부(네트워크)에서 수신한 위치 데이터로 렌더링 강제 업데이트
  applyPhysicsUpdate(transforms) {
    if (this.physicsActive && !this.isObserving) return; // 내가 직접 굴리는 턴일 때만 무시
    if (!transforms || !this.diceArray) return;
    
    transforms.forEach((t, i) => {
      const die = this.diceArray[i];
      if (die && !die.isKept && t) {
        die.mesh.position.set(t.px, t.py, t.pz);
        die.mesh.quaternion.set(t.qx, t.qy, t.qz, t.qw);
      }
    });
    this.startRenderLoop();
  }

  // 디버그 및 재접속용: 애니메이션 없이 즉각적으로 주사위 3D 렌더링 및 킵 상태 강제 복원
  forceValues(valuesArray, keptIndexes = []) {
    this.clearAll();
    this.physicsActive = false;
    this.isAnimating = false;
    
    const geometry = this.diceGeometry;
    
    for (let i = 0; i < valuesArray.length; i++) {
      const val = valuesArray[i];
      const config = { type: 'normal' };
      const mesh = new THREE.Mesh(geometry, getMaterialForDie(config));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      const rot = this.getTargetRotationForValue(val, new THREE.Vector3(0, 0, 0), config);
      if (rot) mesh.quaternion.copy(rot);

      this.scene.add(mesh);
      
      const isKept = keptIndexes.includes(i);
      this.diceArray.push({ mesh, body: null, value: val, isKept: isKept, config: config });
    }
    
    this.arrangeAll(true);
    this.startRenderLoop();
    return this.diceArray.map(d => d.value);
  }

  calculateDieValue(quaternion, config) {
    const isOct = config && config.type === 'octahedron';
    const worldUp = new THREE.Vector3(0, 1, 0);
    const localUp = worldUp.applyQuaternion(quaternion.clone().invert());
    
    if (isOct) {
       // Octahedron faces in OctahedronGeometry default:
       // The normals of the 8 faces of an octahedron are:
       // (+1, +1, +1), (-1, +1, +1), (-1, -1, +1), (+1, -1, +1)
       // (+1, +1, -1), (-1, +1, -1), (-1, -1, -1), (+1, -1, -1) normalized
       // Let's identify the face whose normal is closest to localUp
       // OctahedronGeometry의 면 생성 순서에 맞춘 노멀 벡터 (매핑 순서)
       const normals = [
         new THREE.Vector3(1, 1, 1).normalize(),   // 1
         new THREE.Vector3(1, -1, 1).normalize(),  // 2
         new THREE.Vector3(1, -1, -1).normalize(), // 3
         new THREE.Vector3(1, 1, -1).normalize(),  // 4
         new THREE.Vector3(-1, 1, -1).normalize(), // 5
         new THREE.Vector3(-1, -1, -1).normalize(),// 6
         new THREE.Vector3(-1, -1, 1).normalize(), // 7
         new THREE.Vector3(-1, 1, 1).normalize()   // 8
       ];
       let bestFace = 0;
       let maxDot = -Infinity;
       for (let i = 0; i < 8; i++) {
         const dot = localUp.dot(normals[i]);
         if (dot > maxDot) {
           maxDot = dot;
           bestFace = i + 1; // 1-indexed
         }
       }
       const octMapping = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 4, 6: 5, 7: 5, 8: 6 };
       return octMapping[bestFace] || bestFace;
    } else {
       let rawValue = 1;
       if (localUp.y > 0.5) rawValue = 1;
       else if (localUp.z > 0.5) rawValue = 2;
       else if (localUp.x > 0.5) rawValue = 3;
       else if (localUp.x < -0.5) rawValue = 4;
       else if (localUp.z < -0.5) rawValue = 5;
       else if (localUp.y < -0.5) rawValue = 6;
       
       if (config && config.type === 'heavy') {
         const mapping = {1: 4, 2: 4, 3: 5, 4: 5, 5: 6, 6: 6};
         return mapping[rawValue] || rawValue;
       }
       if (config && config.type === 'sevens') {
         return rawValue + 1;
       }
       if (config && config.type === 'promotion') {
         let pLevel = config.promotionLevel || 0;
         let actualValue = 1 + pLevel;
         if (actualValue > 6) actualValue = 6;
         return actualValue;
       }
       return rawValue; 
    }
  }

  getPhysicalFaceIndex(value, config) {
    if (!config) return value;
    if (config.type === 'heavy') {
      const revMapping = { 4: 1, 5: 3, 6: 5 };
      return revMapping[value] || 1;
    }
    if (config.type === 'sevens') {
      return value - 1;
    }
    if (config.type === 'octahedron') {
      const revMapping = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8 };
      return revMapping[value] || 1;
    }
    return value;
  }

  getTargetRotationForValue(value, targetPos, config) {
    const isOct = config && config.type === 'octahedron';
    let baseQuat = new THREE.Quaternion();
    
    if (isOct) {
       const normals = [
         new THREE.Vector3(1, 1, 1).normalize(),
         new THREE.Vector3(1, -1, 1).normalize(),
         new THREE.Vector3(1, -1, -1).normalize(),
         new THREE.Vector3(1, 1, -1).normalize(),
         new THREE.Vector3(-1, 1, -1).normalize(),
         new THREE.Vector3(-1, -1, -1).normalize(),
         new THREE.Vector3(-1, -1, 1).normalize(),
         new THREE.Vector3(-1, 1, 1).normalize()
       ];
       const targetFace = this.getPhysicalFaceIndex(value, config);
       const targetNormal = normals[targetFace - 1] || normals[0];
       const localUp = new THREE.Vector3(-targetNormal.x, -targetNormal.y, 2 * targetNormal.z).normalize();
       const localRight = new THREE.Vector3().crossVectors(localUp, targetNormal).normalize();
       
       const mLocal = new THREE.Matrix4().makeBasis(localRight, localUp, targetNormal);
       const mWorld = new THREE.Matrix4().makeBasis(
           new THREE.Vector3(1, 0, 0),
           new THREE.Vector3(0, 0, -1),
           new THREE.Vector3(0, 1, 0)
       );
       const rMat = mWorld.multiply(mLocal.invert());
       baseQuat.setFromRotationMatrix(rMat);
    } else {
       const euler = new THREE.Euler();
       let targetVal = this.getPhysicalFaceIndex(value, config);
       switch (targetVal) {
         case 1: euler.set(0, 0, 0); break; // +Y UP
         case 2: euler.set(-Math.PI / 2, 0, 0); break; // +Z UP
         case 3: euler.set(0, 0, Math.PI / 2); break; // +X UP
         case 4: euler.set(0, 0, -Math.PI / 2); break; // -X UP
         case 5: euler.set(Math.PI / 2, 0, 0); break; // -Z UP
         case 6: euler.set(Math.PI, 0, 0); break; // -Y UP
       }
       baseQuat.setFromEuler(euler);
        if (config && config.type === 'weird') {
          let yRot = 0;
          if (targetVal === 3) yRot = Math.PI / 2;
          else if (targetVal === 4) yRot = -Math.PI / 2;
          else if (targetVal === 5 || targetVal === 6) yRot = Math.PI;
          if (yRot !== 0) {
            baseQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yRot));
          }
        }
    }
    
    // If target position is provided, tilt the die so its top face points exactly at the camera lens.
    // This completely hides the side faces (perspective distortion) for dice placed off-center.
    if (targetPos) {
      const up = new THREE.Vector3(0, 1, 0);
      const dir = new THREE.Vector3().subVectors(this.camera.position, targetPos).normalize();
      const alignQuat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      return alignQuat.multiply(baseQuat);
    }
    
    return baseQuat;
  }

  arrangeAll(isFreshRoll = false, clickedDie = null) {
    if (isFreshRoll) {
      this.isRollSettling = false; // 정렬이 시작되었으므로 플래그 해제
    }
    if (clickedDie?.arrangementShadow && !clickedDie.isKept) {
      // 킵 해제 후 플레이 영역으로 돌아오는 주사위는 그림자도 다시 페이드인한다.
      clickedDie.arrangementShadow.userData.hasSettled = false;
    }
    
    const activeSpacing = ARRANGED_DICE_SPACING;
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const trayLayout = this.trayModel?.getLayout(viewHeight);
    const keepSpacing = trayLayout?.keepSpacing ?? activeSpacing;

    // --- 1. 슬롯 초기화 (새로 굴렸을 때만) ---
    if (isFreshRoll) {
      // 값 순으로 정렬하여 액티브 슬롯(activeSlot) 부여
      const sortedDice = [...this.diceArray].sort((a, b) => {
        if (a.config.type === 'weird' && b.config.type !== 'weird') return -1;
        if (a.config.type !== 'weird' && b.config.type === 'weird') return 1;
        return a.value - b.value;
      });
      sortedDice.forEach((die, index) => {
        die.activeSlot = index;
      });
    }

    // --- 2. 애니메이션 시작 위치 갱신 ---
    // 굴린 직후에는 모든 주사위, 클릭/상태 변경 시에는 클릭된 주사위 및 플레이매트에 있는 주사위 전체 애니메이션 시작
    this.diceArray.forEach(die => {
      if (isFreshRoll || die === clickedDie || !die.isKept) {
        die.startPosition = die.mesh.position.clone();
        die.startQuaternion = die.mesh.quaternion.clone();
        die.animationProgress = 0.0;
      }
    });

    this.startRenderLoop();

    // --- 3. 목표 위치 계산 ---
    
    // (A) 플레이매트(Active Zone) 기준 동적 중앙 정렬 좌표 계산
    const activeZoneCenter = 0;
    const activeZoneCenterZ = trayLayout?.activeCenterZ ?? 0;
    const activeDice = this.diceArray.filter(d => !d.isKept).sort((a, b) => a.activeSlot - b.activeSlot);
    const activeCount = activeDice.length;
    const activeStartX = activeCount > 0 ? activeZoneCenter - (activeCount - 1) * activeSpacing / 2 : 0;

    // 플레이매트에 남아 있는 주사위들의 동적 중앙 정렬 위치 부여
    activeDice.forEach((die, index) => {
      const activeFloorY = trayLayout?.floorY ?? 0;
      die.targetPosition = new THREE.Vector3(
        activeStartX + index * activeSpacing,
        activeFloorY + DIE_HALF_SIZE + ARRANGED_DICE_CAMERA_LIFT,
        activeZoneCenterZ
      );
    });

    // (B) 킵존(Keep Zone) 기준 좌표
    const h = this.container.clientHeight;
    const matSize = h / 1.25;
    const frameThickness = matSize * 0.125;
    
    const yShift = matSize * 0.05;
    const paddingTop = frameThickness + yShift;
    const fallbackKeepZoneCenterZ = -viewHeight / 2 + viewHeight * ((paddingTop / 2 - yShift) / h);
    const keepZoneCenterZ = trayLayout?.keepCenterZ ?? fallbackKeepZoneCenterZ;
    const keptStartX = trayLayout?.keepStartX ?? -2 * keepSpacing;

    this.diceArray.forEach(die => {
      // 정렬 상태에서는 광원 그림자를 제거하고, 바닥의 보조 그림자만 사용한다.
      die.mesh.castShadow = false;
      if (die.isKept) {
        // 킵 된 주사위: 킵존의 keepSlot 위치로 이동
        const measuredPoint = trayLayout?.keepPoints?.[die.keepSlot];
        const targetX = measuredPoint?.x ?? keptStartX + die.keepSlot * keepSpacing;
        const targetZ = measuredPoint?.z ?? keepZoneCenterZ;
        const dieY = trayLayout?.getKeepDieY(DIE_SIZE, die.keepSlot) ?? DIE_HALF_SIZE + 0.025;
        const keepFloorY = measuredPoint?.y ?? trayLayout?.floorY ?? 0;
        const screenAlignedPoint = this.getScreenAlignedPoint(
          new THREE.Vector3(targetX, keepFloorY, targetZ),
          dieY
        );

        die.targetPosition = screenAlignedPoint ?? new THREE.Vector3(targetX, dieY, targetZ);
        
        // 킵된 주사위는 물리엔진 제거
        if (die.body) {
          this.world.removeBody(die.body);
          die.body = null;
        }
      }
      
      die.targetQuaternion = this.getTargetRotationForValue(die.value, die.targetPosition, die.config);
      
      // 애니메이션 대상이 아닌 주사위(상태 변화 없는 주사위)는 즉시 목표 위치에 고정
      if (die.animationProgress === undefined || die.animationProgress >= 1.0) {
        die.mesh.position.copy(die.targetPosition);
        die.mesh.quaternion.copy(die.targetQuaternion);
      }
    });
  }

  getScreenAlignedPoint(surfacePoint, targetY) {
    const screenPoint = surfacePoint.clone().project(this.camera);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(screenPoint.x, screenPoint.y), this.camera);
    const targetPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -targetY);
    const result = new THREE.Vector3();
    return raycaster.ray.intersectPlane(targetPlane, result) ?? null;
  }

  createArrangementShadow(die) {
    if (die.arrangementShadow) return die.arrangementShadow;

    const material = new THREE.MeshBasicMaterial({
      map: this.arrangementShadowTexture,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      toneMapped: false
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.renderOrder = 2;
    shadow.visible = false;
    shadow.userData.baseOpacity = 0.62;
    shadow.userData.hasSettled = false;
    this.scene.add(shadow);
    die.arrangementShadow = shadow;
    return shadow;
  }

  removeArrangementShadow(die) {
    if (!die.arrangementShadow) return;
    this.scene.remove(die.arrangementShadow);
    die.arrangementShadow.geometry.dispose();
    die.arrangementShadow.material.dispose();
    die.arrangementShadow = null;
  }

  updateArrangementShadows(dt) {
    const viewHeight = 2 * Math.tan((this.camera.fov * Math.PI / 180) / 2) * this.camera.position.y;
    const floorY = this.trayModel?.getLayout(viewHeight)?.floorY ?? this.currentFloorY ?? 0;

    this.diceArray.forEach(die => {
      const shadow = die.arrangementShadow;

      // 킵되는 주사위는 기존 그림자를 짧게 지워 자연스럽게 정리한다.
      if (die.isKept) {
        if (shadow?.visible) {
          shadow.position.set(die.mesh.position.x + 0.34, floorY + 0.035, die.mesh.position.z - 0.28);
          shadow.material.opacity = Math.max(0, shadow.material.opacity - dt * 4);
          shadow.visible = shadow.material.opacity > 0.01;
        }
        return;
      }

      const isArrangedActiveDie = !this.physicsActive
        && !this.isRollSettling
        && !die.isDead
        && !die.isClearing
        && !!die.targetPosition;

      if (!isArrangedActiveDie) {
        if (shadow) shadow.visible = false;
        return;
      }

      const arrangementShadow = this.createArrangementShadow(die);
      const progress = THREE.MathUtils.clamp(die.animationProgress ?? 1, 0, 1);
      const fadeProgress = arrangementShadow.userData.hasSettled
        ? 1
        : THREE.MathUtils.smoothstep(progress, 0.02, 0.82);
      arrangementShadow.position.set(
        die.mesh.position.x + 0.34,
        floorY + 0.035,
        die.mesh.position.z - 0.28
      );
      arrangementShadow.scale.set(DIE_SIZE * 1.82, DIE_SIZE * 1.82, 1);
      arrangementShadow.material.opacity = arrangementShadow.userData.baseOpacity * fadeProgress;
      arrangementShadow.visible = fadeProgress > 0.01;
      if (progress >= 1) arrangementShadow.userData.hasSettled = true;
    });
  }

  onClick(event) {
    if (this.allowKeep === false) return;
    if (this.physicsActive || this.diceArray.some(d => d.animationProgress !== undefined && d.animationProgress < 1.0)) return; // 애니메이션 도중 클릭 무시
    
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const meshes = this.diceArray.map(d => d.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const die = this.diceArray.find(d => d.mesh === clickedMesh);
      if (die) {
        if (!die.isKept) {
          // 킵할 때 비어있는 첫 번째 슬롯 찾기
          const usedSlots = this.diceArray.filter(d => d.isKept).map(d => d.keepSlot);
          let firstEmpty = 0;
          for (let i = 0; i < 5; i++) {
            if (!usedSlots.includes(i)) {
              firstEmpty = i;
              break;
            }
          }
          die.isKept = true;
          die.keepSlot = firstEmpty;
        } else {
          // 킵을 풀 때
          die.isKept = false;
          die.keepSlot = null;
        }
        
        // 클릭과 동시에 테두리(호버) 즉시 숨김
        if (this.hoverHighlight.visible || this.octHoverHighlight.visible) {
          this.hoverHighlight.visible = false;
          this.octHoverHighlight.visible = false;
          this.container.style.cursor = 'default';
        }
        
        // 클릭된 주사위만 애니메이션 갱신을 위해 넘김
        this.arrangeAll(false, die);
        
        if (this.onDieClick) {
          const dieIndex = this.diceArray.indexOf(die);
          this.onDieClick(die.value, die.isKept, dieIndex);
        }
      }
    }
  }

  onMouseMove(event) {
    // 굴러가는 중이거나, 정렬 대기 중(100ms 딜레이)이거나, 애니메이션 중이면 호버 숨김
    if (this.allowKeep === false || this.physicsActive || this.isRollSettling || this.diceArray.some(d => d.animationProgress !== undefined && d.animationProgress < 1.0)) {
      if (this.hoverHighlight.visible || this.octHoverHighlight.visible) {
        this.hoverHighlight.visible = false;
        this.octHoverHighlight.visible = false;
        this.container.style.cursor = 'default';
        this.startRenderLoop();
      }
      return;
    }

    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.mouse.x = (x / rect.width) * 2 - 1;
    this.mouse.y = -(y / rect.height) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.diceArray.map(d => d.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const die = this.diceArray.find(d => d.mesh === clickedMesh);
      if (die) {
        this.container.style.cursor = 'pointer';
        
        // 윗면(Top face)의 로컬 Normal 찾기
        let localUp;
        if (die.config && die.config.type === 'octahedron') {
           const normals = [
             new THREE.Vector3(1, 1, 1).normalize(),
             new THREE.Vector3(1, -1, 1).normalize(),
             new THREE.Vector3(1, -1, -1).normalize(),
             new THREE.Vector3(1, 1, -1).normalize(),
             new THREE.Vector3(-1, 1, -1).normalize(),
             new THREE.Vector3(-1, -1, -1).normalize(),
             new THREE.Vector3(-1, -1, 1).normalize(),
             new THREE.Vector3(-1, 1, 1).normalize()
           ];
           const faceIndex = this.getPhysicalFaceIndex(die.value, die.config);
           localUp = normals[faceIndex - 1] || normals[0];
        } else {
           let faceIndex = this.getPhysicalFaceIndex(die.value, die.config);
           
           localUp = {
             1: new THREE.Vector3(0, 1, 0),
             2: new THREE.Vector3(0, 0, 1),
             3: new THREE.Vector3(1, 0, 0),
             4: new THREE.Vector3(-1, 0, 0),
             5: new THREE.Vector3(0, 0, -1),
             6: new THREE.Vector3(0, -1, 0)
           }[faceIndex] || new THREE.Vector3(0, 1, 0);
        }

        // XY평면(Normal=+Z)으로 생성된 테두리 선을 주사위의 윗면에 일치시키기 위한 회전 계산
        const isOct = die.config && die.config.type === 'octahedron';
        let alignQuat = new THREE.Quaternion();
        if (isOct) {
           const up = new THREE.Vector3(0, 1, 0);
           if (Math.abs(localUp.y) > 0.9) up.set(1, 0, 0);
           const right = new THREE.Vector3().crossVectors(up, localUp).normalize();
           const lUp = new THREE.Vector3().crossVectors(localUp, right).normalize();
           const mat = new THREE.Matrix4().makeBasis(right, lUp, localUp);
           alignQuat.setFromRotationMatrix(mat);
        } else {
           alignQuat.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localUp);
        }
        const finalQuat = die.mesh.quaternion.clone().multiply(alignQuat);
        
        const worldUpOffset = localUp.clone().applyQuaternion(die.mesh.quaternion).multiplyScalar(1.01);
        
        const activeHighlight = isOct ? this.octHoverHighlight : this.hoverHighlight;
        const inactiveHighlight = isOct ? this.hoverHighlight : this.octHoverHighlight;
        
        inactiveHighlight.visible = false;
        
        // 일반 주사위와 동일한 위치/회전 로직 적용 (2D 평면 방식)
        activeHighlight.quaternion.copy(finalQuat);
        activeHighlight.position.copy(die.mesh.position).add(worldUpOffset);
        
        if (!activeHighlight.visible) {
          activeHighlight.visible = true;
          this.startRenderLoop();
        }
      }
    } else {
      if (this.hoverHighlight.visible || this.octHoverHighlight.visible) {
        this.hoverHighlight.visible = false;
        this.octHoverHighlight.visible = false;
        this.container.style.cursor = 'default';
        this.startRenderLoop();
      }
    }
  }

  animate() {
    const hasClearing = this.diceArray.some(d => d.isClearing || d.isSpecialClearing);
    const hasAnimating = this.diceArray.some(d => d.animationProgress !== undefined && d.animationProgress < 1.0);
    const hasSlotOpacityAnim = Math.abs(this.currentSlotOpacity - this.targetSlotOpacity) > 0.001;
    const hasTrayGlow = this.trayModel?.isKeepGlowActive || this.trayModel?.keepGlow > 0.001;
    const needsRender = this.physicsActive || hasAnimating || hasClearing || this.confettiArray.length > 0 || hasSlotOpacityAnim || hasTrayGlow;
    
    if (!needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.isRendering = false;
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.trayModel?.update(dt);

    if (this.physicsActive) {
      this.world.step(1/60, Math.min(dt, 0.1), 10);
      
      const transforms = [];
      this.diceArray.forEach(die => {
        if (!die.isKept && die.body) {
          die.mesh.position.copy(die.body.position);
          die.mesh.quaternion.copy(die.body.quaternion);
          transforms.push({
            px: die.body.position.x, py: die.body.position.y, pz: die.body.position.z,
            qx: die.body.quaternion.x, qy: die.body.quaternion.y, qz: die.body.quaternion.z, qw: die.body.quaternion.w
          });
        } else {
          transforms.push(null);
        }
      });
    if (this.onPhysicsUpdate) {
      this.onPhysicsUpdate(transforms);
    }
    } else {
      // 개별 주사위 애니메이션 처리
      this.diceArray.forEach(die => {
        if (die.animationProgress !== undefined && die.animationProgress < 1.0) {
          die.animationProgress += dt * 3.0; // 0.33초 동안 완료
          if (die.animationProgress > 1.0) die.animationProgress = 1.0;
          
          const ease = 1 - Math.pow(1 - die.animationProgress, 3); // Cubic ease-out
          
          if (die.targetPosition && die.targetQuaternion && die.startPosition && die.startQuaternion) {
            die.mesh.position.lerpVectors(die.startPosition, die.targetPosition, ease);
            die.mesh.quaternion.slerpQuaternions(die.startQuaternion, die.targetQuaternion, ease);
            
            // 애니메이션 종료 시 정확한 목표 위치로 스냅
            if (die.animationProgress >= 1.0) {
              die.mesh.position.copy(die.targetPosition);
              die.mesh.quaternion.copy(die.targetQuaternion);
            }
          }
        }
      });
    }

    this.updateArrangementShadows(dt);

    // 5시 방향 흡수(Vacuum) 애니메이션 처리
    let stillClearing = false;
    let stillSpecialClearing = false;

    this.diceArray.forEach(die => {
      // 순차 폭발(Confetti) 처리
      if (die.isSpecialClearing) {
        stillSpecialClearing = true;
        if (die.clearDelay > 0) {
          die.clearDelay -= dt;
        } else if (die.anticipationProgress < 1.0) {
          die.anticipationProgress += dt * 3.0; // 0.33초 동안 준비 동작 진행
          
          if (die.anticipationProgress >= 1.0) {
            // 터짐(폭발)
            if (die.body) {
              this.world.removeBody(die.body);
              die.body = null;
            }
            this.createConfetti(die.mesh.position);
            this.scene.remove(die.mesh);
            die.isDead = true;
            die.isSpecialClearing = false;
          } else {
            const t = die.anticipationProgress;
            if (t < 0.5) {
              // 0 ~ 0.5: 기를 모으듯 살짝 작아짐 (scale: 1.0 -> 0.6)
              const scale = 1.0 - (t * 2) * 0.4;
              die.mesh.scale.set(scale, scale, scale);
            } else {
              // 0.5 ~ 1.0: 살짝 커지면서 위로 튀어오름 (점프)
              const jumpT = (t - 0.5) * 2;
              const scale = 0.6 + jumpT * 0.6; // scale: 0.6 -> 1.2
              die.mesh.scale.set(scale, scale, scale);
              
              // 부드러운 포물선 도약
              die.mesh.position.y = die.startPosition.y + Math.sin(jumpT * Math.PI / 2) * 4.0;
            }
          }
        }
      }

      // 5시 방향 흡수 처리
      if (die.isClearing) {
        stillClearing = true;
        die.clearProgress += dt * 2.0; // 0.5초 동안 진행
        
        if (die.clearProgress >= 1.0) {
          this.scene.remove(die.mesh);
          die.isDead = true;
        } else {
          const t = die.clearProgress;
          const easeIn = t * t * t; // 가속도 (점점 빠르게 빨려감)
          
          // 타겟(5시 방향)으로 부드럽게 이동
          die.mesh.position.lerpVectors(die.startPosition, die.targetPosition, easeIn);
          
          // 천천히 자연스럽게 회전하며 날아감
          die.mesh.rotation.x += dt * 2;
          die.mesh.rotation.y += dt * 3;
          die.mesh.rotation.z += dt * 1.5;
        }
      }
    });
    
    if (stillClearing || stillSpecialClearing) {
      this.diceArray = this.diceArray.filter(d => !d.isDead);
    }

    // 종이 폭죽(Confetti) 애니메이션 처리
    if (this.confettiArray.length > 0) {
      const gravity = 35; // 중력
      const airResistance = 1.5; // 공기 저항
      
      this.confettiArray.forEach(conf => {
        if (conf.isDead) return;

        if (!conf.isLanded) {
          // 중력 및 공기 저항 적용
          conf.velocity.y -= gravity * dt;
          conf.velocity.x -= conf.velocity.x * airResistance * dt;
          conf.velocity.z -= conf.velocity.z * airResistance * dt;

          // 위치 업데이트
          conf.mesh.position.addScaledVector(conf.velocity, dt);

          // 회전 적용 (나풀거림)
          conf.mesh.rotation.x += conf.rotationSpeed.x * dt;
          conf.mesh.rotation.y += conf.rotationSpeed.y * dt;
          conf.mesh.rotation.z += conf.rotationSpeed.z * dt;

          // 바닥(Y=0) 안착 검사 (살짝 위쪽인 Y=0.03에서 멈추도록 하여 바닥 파묻힘 방지)
          if (conf.mesh.position.y <= 0.03) {
            conf.mesh.position.y = 0.03;
            // 바닥에 누운 형태로 무작위 회전 고정
            conf.mesh.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
            conf.isLanded = true;
            conf.landedTime = 0;
          }
        } else {
          // 바닥에 안착한 상태
          conf.landedTime += dt;
          
          if (conf.landedTime > 0.5) {
            // 0.5초 후 페이드 아웃 (0.5초 동안 서서히 투명해짐)
            const fadeTime = conf.landedTime - 0.5;
            if (fadeTime >= 0.5) { 
              this.scene.remove(conf.mesh);
              conf.mesh.material.dispose();
              conf.mesh.geometry.dispose();
              conf.isDead = true;
            } else {
              conf.mesh.material.opacity = 1.0 - (fadeTime / 0.5);
            }
          }
        }
      });

      // 죽은 파티클 정리
      this.confettiArray = this.confettiArray.filter(c => !c.isDead);
    }

    // 요트 뱅크 킵 슬롯 0.5초(500ms) 페이드인 & 페이드아웃 애니메이션 처리
    if (this.slotMeshes && this.slotMeshes.length > 0 && Math.abs(this.currentSlotOpacity - this.targetSlotOpacity) > 0.001) {
      const speed = 1.6; // 0.5초 완충
      if (this.currentSlotOpacity < this.targetSlotOpacity) {
        this.currentSlotOpacity = Math.min(this.targetSlotOpacity, this.currentSlotOpacity + dt * speed);
      } else {
        this.currentSlotOpacity = Math.max(this.targetSlotOpacity, this.currentSlotOpacity - dt * speed);
        // 페이드아웃이 완료되어 0.2에 도달하고 비활성화 상태인 경우 기본 슬롯 텍스처(opacity 1.0)로 복원
        if (!this.isYachtBankActive && Math.abs(this.currentSlotOpacity - this.targetSlotOpacity) <= 0.001) {
          this.currentSlotOpacity = 1.0;
          this.targetSlotOpacity = 1.0;
          this.slotMeshes.forEach(mesh => {
            if (mesh && mesh.material) {
              mesh.visible = !this.trayModel?.isReady;
              mesh.material.map = this.defaultSlotTex;
              mesh.material.opacity = 1.0;
              mesh.material.needsUpdate = true;
            }
          });
        }
      }
      this.slotMeshes.forEach(mesh => {
        if (mesh && mesh.material && this.isYachtBankActive) {
          mesh.material.opacity = this.currentSlotOpacity;
          mesh.material.needsUpdate = true;
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  }
}
