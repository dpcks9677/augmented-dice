import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { DiceBoardPhysics, BOUNDARY_MODES } from './DiceBoardPhysics.js';
import { YachtTrayModel } from './YachtTrayModel.js';

const DIE_SIZE = 1.62;
const DIE_HALF_SIZE = DIE_SIZE / 2;
const INGRESS_TIMEOUT_SECONDS = 1.6;
const DIE_SURFACE_CLEARANCE = 0.035;

export class PresetBaker {
  constructor() {
    this.trayModel = new YachtTrayModel();
    // fov=10, y=120일 때의 viewHeight와 동일하게 설정
    // 2 * tan(10도 / 2) * 120 = 20.99
    const vFov = 10 * Math.PI / 180;
    this.viewHeight = 2 * Math.tan(vFov / 2) * 120;
    this.layout = this.trayModel.getLayout(this.viewHeight);
    this.visualRandomState = null;
  }

  setVisualSeed(seed) {
    let state = 2166136261;
    for (const char of String(seed || 'local')) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
    this.visualRandomState = state || 1;
  }

  nextVisualRandom() {
    if (!this.visualRandomState) return Math.random();
    this.visualRandomState = (Math.imul(this.visualRandomState, 1664525) + 1013904223) >>> 0;
    return this.visualRandomState / 4294967296;
  }

  createWorld(isFlip = false) {
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -72, 0) });
    world.broadphase = new CANNON.NaiveBroadphase();
    world.allowSleep = true;

    const defaultMaterial = new CANNON.Material('default');
    const contactMaterial = new CANNON.ContactMaterial(
      defaultMaterial, defaultMaterial, {
        friction: 0.62,
        restitution: 0.16
      }
    );
    world.addContactMaterial(contactMaterial);
    world.defaultMaterial = defaultMaterial;

    const boardPhysics = new DiceBoardPhysics(world);
    boardPhysics.configure(this.layout, isFlip ? BOUNDARY_MODES.FLIP : BOUNDARY_MODES.INGRESS);

    return { world, boardPhysics };
  }

  createDieBody(isOct, isHeavy) {
    let shape;
    if (isOct) {
      const r = 1.125;
      shape = new CANNON.ConvexPolyhedron({
        vertices: [
          new CANNON.Vec3(r, 0, 0), new CANNON.Vec3(-r, 0, 0),
          new CANNON.Vec3(0, r, 0), new CANNON.Vec3(0, -r, 0),
          new CANNON.Vec3(0, 0, r), new CANNON.Vec3(0, 0, -r)
        ],
        faces: [
          [0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2],
          [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]
        ]
      });
    } else {
      shape = new CANNON.Box(new CANNON.Vec3(DIE_HALF_SIZE, DIE_HALF_SIZE, DIE_HALF_SIZE));
    }

    const body = new CANNON.Body({ mass: isHeavy ? 3 : 1, shape });
    body.linearDamping = 0.14;
    body.angularDamping = 0.28;
    return body;
  }

  getDieSupportHeight(isOct) {
    return isOct ? 1.125 : DIE_HALF_SIZE;
  }

  createLaunchTransform(isOct, spawnIndex, count) {
    const random = () => this.nextVisualRandom();
    const supportHeight = this.getDieSupportHeight(isOct);
    
    // 본게임 스폰 자리(centerIndex) 로직 롤백 (약간의 무작위성만 추가)
    const centerIndex = spawnIndex - (count - 1) / 2;
    const rowOffset = spawnIndex % 2;
    const startX = centerIndex * 2 + (random() - 0.5) * 0.4;
    const startZ = this.layout.launchOriginZ + rowOffset * 2;
    const startY = this.layout.playSurfaceY + supportHeight + 1.4 + rowOffset * 0.25;
    
    const targetX = THREE.MathUtils.clamp(
      centerIndex * 1.15 + (random() - 0.5) * 0.65,
      this.layout.playBounds.minX + supportHeight,
      this.layout.playBounds.maxX - supportHeight
    );
    const boardCenterZ = (this.layout.playBounds.minZ + this.layout.playBounds.maxZ) / 2;
    const targetZ = boardCenterZ + (random() - 0.5) * 1.1;
    const landingY = this.layout.playSurfaceY + supportHeight + 0.12;
    

    const horizontalTravelTime = 0.31 + random() * 0.05 + rowOffset * 0.02;
    const gravity = 72; // Math.abs(world.gravity.y)
    const horizontalVelocityZ = (targetZ - startZ) / horizontalTravelTime;
    const rimCrossingTime = Math.max(
      0.01,
      (this.layout.outerBounds.maxZ - startZ) / horizontalVelocityZ
    );
    const landingVelocityY = (landingY - startY + 0.5 * gravity * horizontalTravelTime ** 2) / horizontalTravelTime;
    const rimClearanceY = this.layout.rimTopY + supportHeight + 0.3;
    const rimClearVelocityY = (rimClearanceY - startY + 0.5 * gravity * rimCrossingTime ** 2) / rimCrossingTime;
    const launchVelocityY = Math.max(landingVelocityY, rimClearVelocityY);

    return {
      position: new CANNON.Vec3(startX, startY, startZ),
      velocity: new CANNON.Vec3(
        (targetX - startX) / horizontalTravelTime,
        launchVelocityY,
        horizontalVelocityZ
      ),
      angularVelocity: new CANNON.Vec3(
        (random() - 0.5) * 36,
        (random() - 0.5) * 36,
        (random() - 0.5) * 36
      ),
      target: { x: targetX, z: targetZ }
    };
  }

  launchDie(body, index, total, isFlip, isOct) {
    if (isFlip) {
      const centerIndex = index - (total - 1) / 2;
      body.position.set(centerIndex * 2, this.layout.playSurfaceY + DIE_HALF_SIZE + 1, 0);
      body.quaternion.setFromEuler(this.nextVisualRandom() * Math.PI, this.nextVisualRandom() * Math.PI, this.nextVisualRandom() * Math.PI);
      body.velocity.set(
        (this.nextVisualRandom() - 0.5) * 8.0,
        130 + this.nextVisualRandom() * 25,
        (this.nextVisualRandom() - 0.5) * 8.0
      );
      body.angularVelocity.set(
        (this.nextVisualRandom() - 0.5) * 90,
        (this.nextVisualRandom() - 0.5) * 90,
        (this.nextVisualRandom() - 0.5) * 90
      );
      return null;
    } else {
      const launch = this.createLaunchTransform(isOct, index, total);
      body.position.copy(launch.position);
      body.quaternion.setFromEuler(this.nextVisualRandom() * Math.PI, this.nextVisualRandom() * Math.PI, this.nextVisualRandom() * Math.PI);
      body.velocity.copy(launch.velocity);
      body.angularVelocity.copy(launch.angularVelocity);
      return launch.target;
    }
  }

  bakeSingle(mode, count = 5, octaCount = 2) {
    const isFlip = mode === 'flip';
    const isOct = mode === 'octahedron';
    const { world, boardPhysics } = this.createWorld(isFlip);
    this.setVisualSeed(`bake_${Math.random()}`);

    // 요청된 주사위 수만큼 스폰 슬롯을 만들고 순서를 섞음.
    // 6개 프리셋은 기존 5개 슬롯을 재사용하면 여섯 번째 주사위가
    // 중복 위치에 겹치므로 count를 슬롯 수와 배치 기준에 함께 사용함.
    const allSlots = Array.from({ length: count }, (_, index) => index);
    for (let i = allSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]];
    }
    const spawnSlots = allSlots.slice(0, count);

    const dice = [];
    for (let i = 0; i < count; i++) {
      // 8면체 모드 시 뒤쪽 인덱스를 8면체로 할당
      const dieIsOct = isOct ? (i >= Math.max(0, count - octaCount)) : false;
      const body = this.createDieBody(dieIsOct, false);
      
      const slotIndex = spawnSlots[i];
      const target = this.launchDie(body, slotIndex, count, isFlip, dieIsOct);
      
      world.addBody(body);
      dice.push({ body, target, hasReachedLaunchTarget: false, isOct: dieIsOct });
    }

    const timeStep = 1 / 60;
    // 판 뒤집기는 높이 솟구치므로 체공 및 안정화 시간이 더 필요함
    const maxTime = isFlip ? 6.5 : 3.5; 
    const totalFrames = Math.ceil(maxTime / timeStep);
    
    // Save every 3 frames for 20 FPS output to save space
    const saveInterval = 3; 
    const framesData = []; 
    let totalAngularMovement = 0;
    let ingressElapsed = 0;

    for (let frame = 0; frame < totalFrames; frame++) {
      world.step(timeStep);
      ingressElapsed += timeStep;
      
      if (!isFlip) {
        // Braking logic
        dice.forEach(die => {
          if (die.hasReachedLaunchTarget || !die.target) return;
          if (die.body.velocity.z < 0 && die.body.position.z <= die.target.z) {
            die.body.velocity.set(
              die.body.velocity.x * 0.18,
              die.body.velocity.y,
              die.body.velocity.z * 0.1
            );
            die.hasReachedLaunchTarget = true;
          }
        });

        // Ingress boundaries
        if (boardPhysics.mode === BOUNDARY_MODES.INGRESS) {
          const movingDice = dice.filter(d => d.body);
          const isInside = die => die.body.position.z <= this.layout.entryEdgeZ - this.getDieSupportHeight(die.isOct) - 0.1;
          const timedOut = ingressElapsed >= INGRESS_TIMEOUT_SECONDS;

          if (timedOut) {
            movingDice.forEach(die => {
              if (isInside(die)) return;
              const supportHeight = this.getDieSupportHeight(die.isOct);
              die.body.position.z = this.layout.entryEdgeZ - supportHeight - 0.15;
              die.body.position.y = Math.max(die.body.position.y, this.layout.playSurfaceY + supportHeight + DIE_SURFACE_CLEARANCE);
              die.body.velocity.z = -Math.max(8, Math.abs(die.body.velocity.z));
            });
          }
          if (timedOut || movingDice.every(isInside)) {
            boardPhysics.configure(this.layout, BOUNDARY_MODES.NORMAL);
          }
        }
      }

      if (frame % saveInterval === 0) {
        const frameState = dice.map(die => {
          totalAngularMovement += die.body.angularVelocity.lengthSquared();
          return [
            Number(die.body.position.x.toFixed(3)),
            Number(die.body.position.y.toFixed(3)),
            Number(die.body.position.z.toFixed(3)),
            Number(die.body.quaternion.x.toFixed(4)),
            Number(die.body.quaternion.y.toFixed(4)),
            Number(die.body.quaternion.z.toFixed(4)),
            Number(die.body.quaternion.w.toFixed(4))
          ];
        });
        framesData.push(frameState);
      }
    }

    // Scoring
    let score = 0;
    let outOfBounds = false;
    let finalSpread = 0;

    let centerDistanceSum = 0;

    for (let i = 0; i < dice.length; i++) {
      const posA = dice[i].body.position;
      centerDistanceSum += Math.sqrt(posA.x * posA.x + posA.z * posA.z);
      
      for (let j = i + 1; j < dice.length; j++) {
        finalSpread += posA.distanceTo(dice[j].body.position);
      }
      
      const y = posA.y;
      if (y < this.layout.playSurfaceY - 1 || y > this.layout.playSurfaceY + 20) {
         outOfBounds = true;
      }
      if (posA.x < this.layout.playBounds.minX || posA.x > this.layout.playBounds.maxX) {
         outOfBounds = true;
      }
      if (posA.z < this.layout.playBounds.minZ || posA.z > this.layout.playBounds.maxZ) {
         outOfBounds = true;
      }
    }

    if (outOfBounds) score = -9999;
    else {
      score += finalSpread;
      score += (totalAngularMovement / 1000);
      
      if (mode === 'flip') {
        // 중앙에 고루 분포되어 있을수록(거리 합이 작을수록) 점수 부여
        // 기준값(예: 250)에서 뺀 값을 더하여 중앙 편향
        score += Math.max(0, 250 - centerDistanceSum) * 2;
      }
    }

    return {
      mode,
      diceCount: count,
      octaCount: octaCount,
      score,
      frames: framesData,
      length: framesData.length,
      fps: 20
    };
  }

  async bakeBatch(mode, diceCount = 5, octaCount = 2, iterations = 100, keepTop = 10, onProgress = null) {
    const results = [];
    for (let i = 0; i < iterations; i++) {
      const result = this.bakeSingle(mode, diceCount, octaCount);
      if (result.score > 0) {
        results.push(result);
      }
      if (onProgress && i % 5 === 0) {
        onProgress(i, iterations);
        await new Promise(r => setTimeout(r, 0));
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, keepTop);
  }
}
