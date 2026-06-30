import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export class DiceEngine {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    this.diceArray = []; // { mesh, body, value, isKept }
    this.physicsActive = false;
    this.isAnimating = false;
    this.onDieClick = null; // callback

    this.initThree();
    this.initCannon();
    this.createDiceMaterials();
    
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.container.addEventListener('click', this.onClick.bind(this));
    
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
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

    const { clientWidth, clientHeight } = this.container;
    const w = clientWidth;
    const h = clientHeight;
    
    // Shift the vanishing point to the center of the burgundy mat (left 75%)
    // Use a very narrow FOV (10) and high Y position (120) to eliminate perspective distortion
    this.camera = new THREE.PerspectiveCamera(10, (w * 1.25) / h, 0.1, 200);
    this.camera.setViewOffset(w * 1.25, h, w * 0.25, 0, w, h);
    
    this.camera.position.set(0, 120, 0); // look straight down from very high
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(clientWidth, clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.innerHTML = '<div class="keep-zone-mat"></div>';
    this.container.appendChild(this.renderer.domElement);
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.createKeepSlots();
  }

  createKeepSlots() {
    const spacing = 2.5;
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const virtualViewWidth = viewHeight * this.camera.aspect;
    const physicalViewWidth = virtualViewWidth / 1.25;
    const keepZoneCenterX = physicalViewWidth * 0.5;

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
    
    // 주사위 크기(1.8)보다 살짝 작게 설정하여 주사위가 올라가면 완전히 가려지도록 함
    const size = 1.7;
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshBasicMaterial({ 
      map: tex, 
      transparent: true, 
      depthWrite: false 
    });

    // Z축 위에서 아래로(-5.0 부터 +5.0 까지) 5개의 고정 슬롯 배치
    const keptStartZ = -2 * spacing;
    
    for (let i = 0; i < 5; i++) {
      const slotMesh = new THREE.Mesh(geo, mat);
      slotMesh.rotation.x = -Math.PI / 2; // 바닥에 눕히기
      
      // 주사위가 놓일 실제 목표 좌표 (Y=1)
      const targetX = keepZoneCenterX;
      const targetY = 1;
      const targetZ = keptStartZ + i * spacing;

      // 카메라에서 주사위를 바라보는 시선(Ray)이 바닥(Y=0.05)에 닿는 위치를 계산하여 원근 왜곡(패럴랙스) 교정
      const camY = this.camera.position.y;
      const t = (0.05 - camY) / (targetY - camY);
      const apparentX = this.camera.position.x + (targetX - this.camera.position.x) * t;
      const apparentZ = this.camera.position.z + (targetZ - this.camera.position.z) * t;

      slotMesh.position.set(apparentX, 0.05, apparentZ);
      this.scene.add(slotMesh);
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
    const virtualViewWidth = viewHeight * this.camera.aspect;
    const physicalViewWidth = virtualViewWidth / 1.25;
    
    const wallThickness = 10;
    const padding = 1.0; // Inset walls slightly so dice don't clip outside the burgundy area
    const redZoneWidth = physicalViewWidth * 0.75;
    const redZoneCenterX = 0; // Because of setViewOffset, X=0 is exactly the center of the red zone!
    
    // Create Top, Bottom, Left, Right invisible physics boxes
    const createWall = (w, d, x, z) => {
      const shape = new CANNON.Box(new CANNON.Vec3(w/2, 20, d/2));
      const body = new CANNON.Body({ mass: 0, shape });
      body.position.set(x, 10, z);
      this.world.addBody(body);
      this.wallBodies.push(body);
    };

    // Top
    createWall(redZoneWidth + wallThickness, wallThickness, redZoneCenterX, -viewHeight/2 - wallThickness/2 + padding);
    // Bottom
    createWall(redZoneWidth + wallThickness, wallThickness, redZoneCenterX, viewHeight/2 + wallThickness/2 - padding);
    // Left
    createWall(wallThickness, viewHeight + wallThickness, -physicalViewWidth * 0.375 - wallThickness/2 + padding, 0);
    // Right (Boundary separating red and black)
    createWall(wallThickness, viewHeight + wallThickness, physicalViewWidth * 0.375 + wallThickness/2 - padding, 0);
  }

  createDiceMaterials() {
    this.diceMaterials = [];
    for (let i = 1; i <= 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      
      // bg
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 10;
      ctx.strokeRect(0,0,256,256);
      
      // dots
      ctx.fillStyle = '#1a1a1a';
      const drawDot = (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
      };
      
      const cx = 128, cy = 128, offset = 60;
      
      if ([1,3,5].includes(i)) drawDot(cx, cy);
      if ([2,3,4,5,6].includes(i)) {
        drawDot(cx - offset, cy - offset);
        drawDot(cx + offset, cy + offset);
      }
      if ([4,5,6].includes(i)) {
        drawDot(cx + offset, cy - offset);
        drawDot(cx - offset, cy + offset);
      }
      if (i === 6) {
        drawDot(cx - offset, cy);
        drawDot(cx + offset, cy);
      }
      
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace; // 정확한 색상 표현을 위해 SRGB 설정
      // 매끄러운 플라스틱 재질감을 위해 StandardMaterial로 복구하고, 조명에 예쁘게 반사되도록 설정
      this.diceMaterials.push(new THREE.MeshStandardMaterial({ 
        map: tex, 
        roughness: 0.15, 
        metalness: 0.1 
      }));
    }
    // Mapping faces in order so 1 is y+, 6 is y-, etc. 
    const matArray = [
      this.diceMaterials[2], // 3
      this.diceMaterials[3], // 4
      this.diceMaterials[0], // 1
      this.diceMaterials[5], // 6
      this.diceMaterials[1], // 2
      this.diceMaterials[4], // 5
    ];
    this.diceMaterials = matArray;
  }

  onWindowResize() {
    const { clientWidth, clientHeight } = this.container;
    const w = clientWidth;
    const h = clientHeight;
    this.camera.aspect = (w * 1.25) / h;
    this.camera.setViewOffset(w * 1.25, h, w * 0.25, 0, w, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
    this.updateWalls();
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

  async roll(count) {
    return new Promise((resolve) => {
      this.clearUnkept();
      this.physicsActive = true;
      this.isAnimating = false;
      
      const size = 1.8;
      const geometry = new RoundedBoxGeometry(size, size, size, 4, 0.2);

      const vFov = this.camera.fov * Math.PI / 180;
      const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
      const virtualViewWidth = viewHeight * this.camera.aspect;
      const physicalViewWidth = virtualViewWidth / 1.25;
      
      // Right physics wall is at physicalViewWidth * 0.375
      const padding = 1.0;
      const rightWallX = physicalViewWidth * 0.375 - padding;
      const startX = rightWallX - 1.5; // Spawn safely away from the invisible physical wall

      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geometry, this.diceMaterials);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(size/2, size/2, size/2));
        const body = new CANNON.Body({ mass: 1, shape });
        
        body.linearDamping = 0.1; // lower damping so they don't lose speed in mid-air
        body.angularDamping = 0.2;
        body.sleepSpeedLimit = 0.8;
        body.sleepTimeLimit = 0.2;
        
        // Stagger spawn vertically (higher up for a strong drop) and spread Z
        body.position.set(
          startX - Math.random() * 2,
          10 + i * 1.5, // 흩뿌려지기 좋게 약간 높게 스폰
          (Math.random() - 0.5) * 6
        );
        
        body.quaternion.setFromEuler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        
        // Throw leftwards, scatter, and bounce
        body.velocity.set(
          -20 - Math.random() * 10, // 좌측 힘
          -10 - Math.random() * 15, // 강하게 내리꽂음
          (Math.random() - 0.5) * 30 // Z축 넓게 흩뿌리기
        );
        body.angularVelocity.set(
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 40
        );

        this.world.addBody(body);
        this.diceArray.push({ mesh, body, value: 1, isKept: false });
      }

      // Check sleep
      const checkSleep = setInterval(() => {
        let allSleeping = true;
        this.diceArray.forEach(die => {
          if (!die.isKept && die.body && die.body.sleepState !== CANNON.Body.SLEEPING) {
            allSleeping = false;
          }
        });

        if (allSleeping) {
          clearInterval(checkSleep);
          this.physicsActive = false;
          
          this.diceArray.forEach(die => {
            if (!die.isKept) {
              this.world.removeBody(die.body);
              die.body = null;
              die.value = this.calculateDieValue(die.mesh.quaternion);
            }
          });
          
          this.arrangeDice();
          resolve();
        }
      }, 100);
    });
  }

  calculateDieValue(quaternion) {
    // Transform the World UP vector into the die's Local coordinate space
    const worldUp = new THREE.Vector3(0, 1, 0);
    const localUp = worldUp.applyQuaternion(quaternion.clone().invert());
    
    // The faces are mapped to: 1=+Y, 6=-Y, 2=+Z, 5=-Z, 3=+X, 4=-X
    if (localUp.y > 0.5) return 1;
    if (localUp.z > 0.5) return 2;
    if (localUp.x > 0.5) return 3;
    if (localUp.x < -0.5) return 4;
    if (localUp.z < -0.5) return 5;
    if (localUp.y < -0.5) return 6;
    return 1; 
  }

  getTargetRotationForValue(value, targetPos) {
    const euler = new THREE.Euler();
    switch (value) {
      case 1: euler.set(0, 0, 0); break; // +Y UP
      case 2: euler.set(-Math.PI / 2, 0, 0); break; // +Z UP
      case 3: euler.set(0, 0, Math.PI / 2); break; // +X UP
      case 4: euler.set(0, 0, -Math.PI / 2); break; // -X UP
      case 5: euler.set(Math.PI / 2, 0, 0); break; // -Z UP
      case 6: euler.set(Math.PI, 0, 0); break; // -Y UP
    }
    
    const baseQuat = new THREE.Quaternion().setFromEuler(euler);
    
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

  arrangeDice() {
    this.isAnimating = true;
    
    // Active zone center is now exactly 0 due to setViewOffset
    const activeZoneCenter = 0;
    
    // Sort active dice visually by value
    const active = this.diceArray.filter(d => !d.isKept).sort((a,b) => a.value - b.value);
    const spacing = 2.5;
    const startX = activeZoneCenter - (active.length - 1) * spacing / 2;
    
    active.forEach((die, index) => {
      die.targetPosition = new THREE.Vector3(startX + index * spacing, 1, 0);
      die.targetQuaternion = this.getTargetRotationForValue(die.value, die.targetPosition);
    });
  }

  arrangeKeptDice() {
    this.isAnimating = true;
    const kept = this.diceArray.filter(d => d.isKept);
    const active = this.diceArray.filter(d => !d.isKept).sort((a,b) => a.value - b.value);
    
    const vFov = this.camera.fov * Math.PI / 180;
    const viewHeight = 2 * Math.tan(vFov / 2) * this.camera.position.y;
    const virtualViewWidth = viewHeight * this.camera.aspect;
    const physicalViewWidth = virtualViewWidth / 1.25;
    
    const spacing = 2.5;
    
    // Kept zone center is at physicalViewWidth * 0.5
    const keepZoneCenterX = physicalViewWidth * 0.5;
    
    // 5개의 고정 슬롯 위치 (Z축 상단부터 하단으로 순차 배치)
    const keptStartZ = -2 * spacing;
    kept.forEach(die => {
      // die.keepSlot (0~4)에 맞춰 고정된 위치에 배치
      die.targetPosition = new THREE.Vector3(keepZoneCenterX, 1, keptStartZ + die.keepSlot * spacing);
      die.targetQuaternion = this.getTargetRotationForValue(die.value, die.targetPosition);
    });
    
    // Active zone center is 0
    const activeZoneCenter = 0;
    const activeStartX = activeZoneCenter - (active.length - 1) * spacing / 2;
    active.forEach((die, index) => {
      die.targetPosition = new THREE.Vector3(activeStartX + index * spacing, 1, 0);
      die.targetQuaternion = this.getTargetRotationForValue(die.value, die.targetPosition);
    });
  }

  onClick(event) {
    if (this.physicsActive) return; // ignore clicks while rolling
    
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
        
        // Removed the emissive color change so the dice look exactly the same when kept
        
        this.arrangeKeptDice();
        
        if (this.onDieClick) {
          this.onDieClick(die.value, die.isKept);
        }
      }
    }
  }

  animate() {
    requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();

    if (this.physicsActive) {
      this.world.step(1/60, Math.min(dt, 0.1), 10);
      
      this.diceArray.forEach(die => {
        if (!die.isKept && die.body) {
          die.mesh.position.copy(die.body.position);
          die.mesh.quaternion.copy(die.body.quaternion);
        }
      });
    } else if (this.isAnimating) {
      let allSettled = true;
      this.diceArray.forEach(die => {
        if (die.targetPosition && die.targetQuaternion) {
          die.mesh.position.lerp(die.targetPosition, 0.1);
          die.mesh.quaternion.slerp(die.targetQuaternion, 0.1);
          
          if (die.mesh.position.distanceTo(die.targetPosition) > 0.01) {
            allSettled = false;
          }
        }
      });
      if (allSettled) {
        this.isAnimating = false;
        // Snap perfectly to target to prevent any micro-misalignment
        this.diceArray.forEach(die => {
          if (die.targetPosition && die.targetQuaternion) {
            die.mesh.position.copy(die.targetPosition);
            die.mesh.quaternion.copy(die.targetQuaternion);
          }
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
