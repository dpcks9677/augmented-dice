import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { OctahedronGeometry } from 'three';
import { getOctGeo, getSmoothBeveledOctGeo } from './geometryUtils.js';
import { getMaterialForDie } from './diceMaterials.js';

export class DiceEngine {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.diceArray = [];
    this.confettiArray = []; // { mesh, body, value, isKept }
    this.physicsActive = false;
    this.isAnimating = false;
    this.onDieClick = null; // callback

    this.initThree();
    this.initCannon();
    this.initAudio();
        
    this.clock = new THREE.Clock();
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
    this.diceGeometry = new RoundedBoxGeometry(1.26, 1.26, 1.26, 4, 0.2);
    
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




  startRenderLoop() {
    if (!this.isRendering) {
      this.isRendering = true;
      this.clock.getDelta(); // reset delta
      this.animate();
    }
  }

  initThree() {
    this.scene = new THREE.Scene();
    
    // Add subtle ambient light and a directional light for shadows
    // 앰비언트 라이트는 조금 낮추고, 방향광과 스포트라이트로 입체감과 하이라이트를 극대화
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);
    
    // 메인 그림자를 형성하는 방향광 (밝기 증가)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; // 그림자 해상도 증가
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.001; // 그림자 픽셀 깨짐(Acne) 방지
    this.scene.add(dirLight);

    // 주사위 윗면에 예쁜 하이라이트(광택)를 맺히게 하는 스포트라이트
    const spotLight = new THREE.SpotLight(0xffffff, 3.0);
    spotLight.position.set(0, 40, 5); // 정중앙 살짝 아래쪽에서 비춤
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1;
    spotLight.distance = 100;
    this.scene.add(spotLight);
    
    // Initialize camera with dummy aspect, will be updated in onWindowResize
    this.camera = new THREE.PerspectiveCamera(10, 1, 0.1, 200);
    this.camera.position.set(0, 120, 0);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    
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
  }

  updateKeepSlots() {
    if (!this.slotMeshes) {
      this.slotMeshes = [];
    }
    const spacing = 2.5;
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const viewWidth = viewHeight * this.camera.aspect;
    
    // 킵 존은 화면 상단 120px 영역.
    // 3D 뷰에서 해당 영역의 Z 좌표를 계산.
    const h = this.container.clientHeight;
    const matSize = h / 1.25;
    const frameThickness = matSize * 0.125;
    
    // 플레이매트가 5% 아래로 이동했으므로 Top 프레임이 살짝 더 넓어짐
    const yShift = matSize * 0.05;
    const paddingTop = frameThickness + yShift;
    
    // 킵존 슬롯을 Top 프레임의 정중앙에 배치
    const keepZoneCenterZ = -viewHeight / 2 + viewHeight * ((paddingTop / 2 - yShift) / h);

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

    const tex = new THREE.CanvasTexture(canvas);
    
    // 주사위 크기(1.26)보다 살짝 작게 설정
    const size = 1.19; // 기존 1.7에서 70% 축소
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({ 
      map: tex, 
      transparent: true, 
      depthWrite: false 
    });

    // X축 가로로 5개의 고정 슬롯 배치
    const keptStartX = -2 * spacing;
    
    for (let i = 0; i < 5; i++) {
      const slotMesh = new THREE.Mesh(geo, mat);
      slotMesh.rotation.x = -Math.PI / 2; // 바닥에 눕히기
      
      // 주사위가 놓일 실제 목표 좌표 (Y=0)
      const targetX = keptStartX + i * spacing;
      const targetZ = keepZoneCenterZ;

      // 카메라에서 주사위를 바라보는 시선(Ray)이 바닥에 위치한 목표 지점을 지나도록 패럴랙스 교정
      const camY = this.camera.position.y;
      const slotY = 0.05;
      
      // 닮음비를 이용해 시각적 위치가 일치하도록 물리적 X, Z 좌표를 안쪽으로 당김
      const slotX = targetX * (camY - slotY) / camY;
      const slotZ = targetZ * (camY - slotY) / camY;

      if (this.slotMeshes.length <= i) {
        slotMesh.position.set(slotX, slotY, slotZ);
        this.scene.add(slotMesh);
        this.slotMeshes.push(slotMesh);
      } else {
        this.slotMeshes[i].position.set(slotX, slotY, slotZ);
      }
    }
  }

  initCannon() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -90, 0) // Heavy gravity for a fast, forceful drop
    });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.allowSleep = true;

    // Contact material
    const defaultMaterial = new CANNON.Material('default');
    const contactMaterial = new CANNON.ContactMaterial(
      defaultMaterial, defaultMaterial, {
        friction: 0.3,
        restitution: 0.5 // slightly more bouncy for impact
      }
    );
    this.world.addContactMaterial(contactMaterial);
    this.world.defaultMaterial = defaultMaterial;

    // Floor (use a massive Box instead of Plane to avoid tunneling issues)
    const floorShape = new CANNON.Box(new CANNON.Vec3(100, 1, 100));
    const floorBody = new CANNON.Body({ mass: 0, shape: floorShape });
    floorBody.position.set(0, -1, 0); // top surface is at y=0
    this.world.addBody(floorBody);
    
    this.wallBodies = [];
    this.updateWalls();
  }

  updateWalls() {
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
    
    const h = this.container.clientHeight; // w == h in symmetric layout
    const matSize = h / 1.25;
    const frameThickness = matSize * 0.125;
    const matSize3D = viewHeight * (matSize / h);
    
    const wallThickness = 10;
    // 패딩을 0으로 설정하여 물리 벽이 플레이매트 외곽선과 정확히 일치하도록 함
    const padding = 0;
    
    // The center of the container is perfectly at (0, 0, 0)
    // The playable area bounds are from -matSize3D/2 to matSize3D/2
    
    // Create Top, Bottom, Left, Right invisible physics boxes
    const createWall = (w, d, x, z, rotX = 0, rotZ = 0) => {
      const shape = new CANNON.Box(new CANNON.Vec3(w/2, 20, d/2));
      const body = new CANNON.Body({ mass: 0, shape });
      body.position.set(x, 10, z);
      
      const qX = new CANNON.Quaternion();
      qX.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), rotX);
      const qZ = new CANNON.Quaternion();
      qZ.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), rotZ);
      body.quaternion = qX.mult(qZ);
      
      this.world.addBody(body);
      this.wallBodies.push(body);
    };

    // 주사위가 벽에 기대어 비스듬히 서지 못하도록 안쪽으로 15도(오버행) 기울임
    const tilt = 15 * Math.PI / 180;
    const shift = 10 * Math.tan(tilt); // 바닥(Y=0) 기준 경계선이 유지되도록 중심 보정

    // Top (-z)
    createWall(matSize3D + wallThickness * 2, wallThickness, 0, -matSize3D/2 - wallThickness/2 + padding + shift, tilt, 0);
    // Bottom (+z)
    createWall(matSize3D + wallThickness * 2, wallThickness, 0, matSize3D/2 + wallThickness/2 - padding - shift, -tilt, 0);
    // Left (-x)
    createWall(wallThickness, matSize3D + wallThickness * 2, -matSize3D/2 - wallThickness/2 + padding + shift, 0, 0, -tilt);
    // Right (+x)
    createWall(wallThickness, matSize3D + wallThickness * 2, matSize3D/2 + wallThickness/2 - padding - shift, 0, 0, tilt);
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
                       
      let baseWidth = appContainer.clientWidth;
      if (appContainer.classList.contains('mode-select-state')) {
        // In mode-select, app-container shrinks to max-content, so use window width to avoid infinite shrink loop
        baseWidth = window.innerWidth;
      }
                       
      maxW = baseWidth * 0.78 - paddingX;
      maxH = availableTotalHeight - usedHeight;
    }
    
    // 정사각형 유지: 가로 세로 중 가용한 공간이 더 작은 쪽에 맞춤
    const containerSize = Math.min(maxW, maxH);
    
    let matSize = containerSize / 1.25;
    matSize = Math.max(100, matSize); // 최소 크기 보장
    
    const frameThickness = matSize * 0.125;

    const w = matSize + frameThickness * 2;
    const h = matSize + frameThickness * 2;
    
    const yShift = matSize * 0.05; // 플레이매트를 5% 아래로 이동
    const paddingTop = frameThickness + yShift;
    const paddingBottom = frameThickness - yShift;
    const paddingLeft = frameThickness;
    const paddingRight = frameThickness;
    
    const tableFrame = this.container.querySelector('.table-frame');
    if (tableFrame) {
      tableFrame.style.padding = `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`;
    }
    
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
    const burgundy = this.container.querySelector('.burgundy-mat');
    if (burgundy) {
      burgundy.style.width = '100%';
      burgundy.style.height = matSize + 'px';
      burgundy.style.flexGrow = '0';
    }
    
    const keepZone = this.container.querySelector('.keep-zone-mat');
    if (keepZone) {
      keepZone.style.width = '100%';
    }
    
    this.camera.aspect = 1; // w == h
    // 플레이매트가 yShift 만큼 아래로 이동했으므로, 3D 카메라 렌더링 영역도 동일하게 이동시켜 Z=0을 플레이매트 정중앙에 맞춤
    this.camera.setViewOffset(w, h, 0, -yShift, w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.updateWalls();
    this.updateKeepSlots();
    
    this.startRenderLoop();
  }

  clearUnkept() {
    const unkept = this.diceArray.filter(d => !d.isKept);
    unkept.forEach(die => {
      this.scene.remove(die.mesh);
      if (die.body) this.world.removeBody(die.body);
    });
    this.diceArray = this.diceArray.filter(d => d.isKept);
  }

  clearAll() {
    this.diceArray.forEach(die => {
      this.scene.remove(die.mesh);
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

  async roll(configsOrCount) {
    let configs = [];
    if (typeof configsOrCount === 'number') {
      for(let i=0; i<configsOrCount; i++) configs.push({type: 'normal'});
    } else {
      configs = configsOrCount;
    }
    
    
    return new Promise((resolve) => {
      this.clearUnkept();
      this.physicsActive = true;
      this.isAnimating = false;
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
      
      const size = 1.26;
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
        
        body.linearDamping = 0.1;
        body.angularDamping = 0.2;
        
        // 화면 하단 중앙에서 스폰 (6시 방향)
        const padding = 1.0; // 스폰 시에는 벽에 끼지 않도록 안쪽으로 1.0 여유를 줌
        const startX = 0; 
        const startZ = matSize3D / 2 - padding; 
        
        body.position.set(
          startX + (Math.random() - 0.5) * 4.0, // X: 중앙 주변
          2 + (i * 0.5) + Math.random(),        // Y: 보드에 가깝게
          startZ - (i * 1.5) - Math.random()    // Z: 하단 벽 안쪽
        );
        
        body.quaternion.setFromEuler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        // 중앙으로 포물선을 그리며 던져지도록 속도 설정
        const spread = (i / Math.max(1, count - 1)) - 0.5; // -0.5 ~ 0.5
        body.velocity.set(
          (Math.random() - 0.5) * 8 + (spread * 12), // X축 퍼짐
          10 + Math.random() * 10,                   // Y축 위로 살짝 포물선
          -10 - Math.random() * 8                    // Z축 앞(중앙)으로 적절히 던지기
        );
        
        body.angularVelocity.set(
          (Math.random() - 0.5) * 56,
          (Math.random() - 0.5) * 56,
          (Math.random() - 0.5) * 56
        );

        // 물리 충돌 이벤트 기반 사운드 재생
        body.addEventListener("collide", (e) => {
          const relativeVelocity = Math.abs(e.contact.getImpactVelocityAlongNormal());
          // 충돌 속도가 2 이상일 때만 재생 (미세한 바닥 긁힘 소리 방지)
          if (relativeVelocity > 2) {
            this.playHitSound(relativeVelocity);
          }
        });

        this.world.addBody(body);
        this.diceArray.push({ mesh, body, value: 1, isKept: false, config: configs[i] });
      }

      // Check sleep
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

  // 디버그용: 애니메이션 없이 즉각적으로 주사위 값을 강제 설정
  forceValues(valuesArray) {
    this.clearAll();
    this.physicsActive = false;
    this.isAnimating = false;
    
    const size = 1.26;
    const geometry = this.diceGeometry;
    
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(geometry, getMaterialForDie({ type: 'normal' }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      
      this.diceArray.push({ mesh, body: null, value: valuesArray[i], isKept: false, config: {type:'normal'} });
    }
    
    this.arrangeAll(true);
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
       return bestFace;
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
       const targetNormal = normals[value - 1] || normals[0];
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
       let targetVal = value;
       if (config && config.type === 'heavy') {
         // Map the requested visual/logical value (4,5,6) back to a physical face (1,3,5) that has that value drawn on it
         const revMapping = {4: 1, 5: 3, 6: 5};
         targetVal = revMapping[value] || 1;
       }
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
    
    const spacing = 2.5;

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
    // 굴린 직후에는 모든 주사위 애니메이션, 클릭 시에는 클릭된 주사위만 애니메이션
    this.diceArray.forEach(die => {
      if (isFreshRoll || die === clickedDie) {
        die.startPosition = die.mesh.position.clone();
        die.startQuaternion = die.mesh.quaternion.clone();
        die.animationProgress = 0.0;
      }
    });

    this.startRenderLoop();

    // --- 3. 목표 위치 계산 ---
    
    // (A) 플레이매트(Active Zone) 기준 좌표
    const activeZoneCenter = 0;
    const activeStartX = activeZoneCenter - (this.diceArray.length - 1) * spacing / 2;

    // (B) 킵존(Keep Zone) 기준 좌표
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const h = this.container.clientHeight;
    const matSize = h / 1.25;
    const frameThickness = matSize * 0.125;
    
    const yShift = matSize * 0.05;
    const paddingTop = frameThickness + yShift;
    const keepZoneCenterZ = -viewHeight / 2 + viewHeight * ((paddingTop / 2 - yShift) / h);
    const keptStartX = -2 * spacing;

    this.diceArray.forEach(die => {
      if (die.isKept) {
        // 킵 된 주사위: 킵존의 keepSlot 위치로 이동
        const targetX = keptStartX + die.keepSlot * spacing;
        const targetZ = keepZoneCenterZ;
        const camY = this.camera.position.y;
        
        const dieY = 1;
        const dieX = targetX * (camY - dieY) / camY;
        const dieZ = targetZ * (camY - dieY) / camY;

        die.targetPosition = new THREE.Vector3(dieX, dieY, dieZ);
        
        // 킵된 주사위는 물리엔진 제거
        if (die.body) {
          this.world.removeBody(die.body);
          die.body = null;
        }
      } else {
        // 플레이매트 주사위: 자신의 고유 activeSlot 위치로 이동 (또는 복귀)
        die.targetPosition = new THREE.Vector3(activeStartX + die.activeSlot * spacing, 1, 0);
      }
      
      die.targetQuaternion = this.getTargetRotationForValue(die.value, die.targetPosition, die.config);
      
      // 애니메이션 대상이 아닌 주사위(상태 변화 없는 주사위)는 즉시 목표 위치에 고정
      if (die.animationProgress === undefined || die.animationProgress >= 1.0) {
        die.mesh.position.copy(die.targetPosition);
        die.mesh.quaternion.copy(die.targetQuaternion);
      }
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
          this.onDieClick(die.value, die.isKept);
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
           localUp = normals[die.value - 1] || normals[0];
        } else {
           localUp = {
             1: new THREE.Vector3(0, 1, 0),
             2: new THREE.Vector3(0, 0, 1),
             3: new THREE.Vector3(1, 0, 0),
             4: new THREE.Vector3(-1, 0, 0),
             5: new THREE.Vector3(0, 0, -1),
             6: new THREE.Vector3(0, -1, 0)
           }[die.value] || new THREE.Vector3(0, 1, 0);
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
    const needsRender = this.physicsActive || hasAnimating || hasClearing || this.confettiArray.length > 0;
    
    if (!needsRender) {
      this.renderer.render(this.scene, this.camera);
      this.isRendering = false;
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    if (this.physicsActive) {
      this.world.step(1/60, Math.min(dt, 0.1), 10);
      
      this.diceArray.forEach(die => {
        if (!die.isKept && die.body) {
          die.mesh.position.copy(die.body.position);
          die.mesh.quaternion.copy(die.body.quaternion);
        }
      });
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

    this.renderer.render(this.scene, this.camera);
  }
}