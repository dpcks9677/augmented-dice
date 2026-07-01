// ==========================================
// 1. initThree() 내부 추가 부분
// ==========================================
this.createCatPaw(); // 고양이 발 프로시저럴 모델링 초기화

// ==========================================
// 2. createCatPaw() 메서드 (클래스 내부에 추가)
// ==========================================
createCatPaw() {
  this.catPawGroup = new THREE.Group();
  
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.5 });
  
  // Arm
  const armGeo = new THREE.CylinderGeometry(4.5, 4.5, 100, 32);
  const arm = new THREE.Mesh(armGeo, whiteMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.x = 50; 
  arm.castShadow = true;
  
  // Paw Base
  const pawGeo = new THREE.SphereGeometry(6, 32, 32);
  const pawBase = new THREE.Mesh(pawGeo, whiteMat);
  pawBase.scale.set(1, 0.6, 1.2);
  pawBase.castShadow = true;
  
  this.catPawGroup.add(arm);
  this.catPawGroup.add(pawBase);
  
  // Main Bean (큰 젤리)
  const mainBean = new THREE.Mesh(new THREE.SphereGeometry(2.5, 32, 16), pinkMat);
  mainBean.scale.set(1, 0.3, 0.8);
  mainBean.position.set(-1.0, -3.0, 0);
  this.catPawGroup.add(mainBean);
  
  // Toe Beans (작은 젤리들)
  const toeOffsets = [
    {x: -3.5, z: -3.5},
    {x: -4.5, z: -1.0},
    {x: -4.5, z:  1.0},
    {x: -3.5, z:  3.5},
  ];
  toeOffsets.forEach(pos => {
    const toe = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 16), pinkMat);
    toe.scale.set(1, 0.5, 1);
    toe.position.set(pos.x, -2.5, pos.z);
    this.catPawGroup.add(toe);
  });
  
  // 젤리가 카메라 쪽을 살짝 향하도록 비틂
  this.catPawGroup.rotation.z = Math.PI / 5; 
  
  // 초기에는 화면 밖(우측)에 배치
  this.catPawGroup.position.set(30, 4, 0);
  this.scene.add(this.catPawGroup);
  
  this.isSweeping = false;
  this.sweepProgress = 0;
}

// ==========================================
// 3. playClearAnimation(isSpecial) 내부 일반 점수 분기
// ==========================================
// 일반 점수 회수 시: 고양이 발이 우측에서 좌측으로 훑고 감
this.isSweeping = true;
this.sweepProgress = 0;

this.diceArray.forEach(die => {
  if (die.body) {
    this.world.removeBody(die.body);
    die.body = null;
  }
  die.isCatSwept = false;
});

// ==========================================
// 4. animate(dt) 내부 애니메이션 업데이트 부분
// ==========================================
// 일반 주사위 회수: 고양이 발 쓸어담기(Sweep) 애니메이션
let stillSweeping = false;
if (this.isSweeping) {
  stillSweeping = true;
  this.sweepProgress += dt * 1.5; // 약 0.66초 만에 가로지름
  
  const startX = 20;
  const endX = -20;
  const currentX = THREE.MathUtils.lerp(startX, endX, this.sweepProgress);
  
  this.catPawGroup.position.x = currentX;
  
  this.diceArray.forEach(die => {
    if (!die.isCatSwept && !die.isDead && !die.isSpecialClearing) {
      // 고양이 발이 주사위 X 좌표를 넘어가면(더 작아지면) 주사위가 쓸려서 사라진 것으로 간주
      if (currentX < die.mesh.position.x) {
        this.scene.remove(die.mesh);
        die.isDead = true;
        die.isCatSwept = true;
      }
    }
  });
  
  if (this.sweepProgress >= 1.0) {
    this.isSweeping = false;
    stillSweeping = false;
    this.catPawGroup.position.set(30, 4, 0); // 화면 밖으로 복구
  }
}

if (stillSweeping || stillSpecialClearing) {
  this.diceArray = this.diceArray.filter(d => !d.isDead);
}
