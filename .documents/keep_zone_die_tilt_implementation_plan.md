# 킵 존 주사위 10도 회전 보정 구현계획서

## 목표

킵 존에 들어간 주사위의 옆면 노출을 줄이고, 12도 보드 카메라와 유사한 10도 시각 회전을 적용함.

## 구현 방식

1. `KEEP_DIE_LAYOUT`과 별도로 킵 존 회전 설정을 정의함.
2. 주사위 값에 맞춘 기존 `targetQuaternion`을 먼저 계산함.
3. 킵 상태일 때만 X축 10도 보정 quaternion을 `arrangementTargetQuaternion`에 합성함.
4. 킵 진입·해제 정렬 애니메이션에서 기존 회전과 보정 회전을 함께 보간함.
5. 킵 해제 시 기본 주사위 회전으로 자연스럽게 복귀함.

## 설정 예시

```js
const KEEP_DIE_TILT = {
  angle: THREE.MathUtils.degToRad(10),
  axis: new THREE.Vector3(1, 0, 0),
  byType: {
    octahedron: 1
  }
};
```

- `angle`: 킵 존 공통 회전 각도
- `axis`: 카메라와 맞출 회전축
- `byType.octahedron`: 팔면체 전용 보정값이 필요할 때만 사용함

## 영향 범위

- 회전 보정은 클라이언트 mesh 표시값에만 적용함.
- 주사위 값 계산, 점수, 유지 상태, Cannon 물리, 온라인 서버 payload는 변경하지 않음.
- 일반·핫시트·로컬·온라인 권위 정렬 경로 모두 동일한 클라이언트 시각 보정을 사용함.
- 확대 스케일 보정과 독립적으로 동작하되, 위치·회전·스케일 보간은 동일한 킵 정렬 애니메이션에서 처리함.

## 검증 계획

- 킵 진입 시 윗면 유지와 옆면 노출 감소 확인함.
- 킵 해제·재롤에서 회전이 원래 방향으로 복귀하는지 확인함.
- 일반 주사위와 팔면체에서 면 결과가 변하지 않는지 확인함.
- 연습·핫시트·로컬·온라인 권위 모드에서 결과값·점수·서버 상태 변화가 없는지 확인함.
- `npm run build`, `npm run test:main-structure`, `node tests/coinModel.test.mjs`, `git diff --check` 실행함.

## 변경 예정 파일

- `src/DiceEngine.js`: 킵 전용 회전 설정과 quaternion 합성·보간
- 본 계획서: 구현 결과와 실제 튜닝값 기록

## 구현 결과

- `src/DiceEngine.js`에 `KEEP_DIE_TILT` 설정을 추가함.
- 킵 상태 주사위의 정렬 목표 quaternion에 X축 10도 보정을 합성함.
- 기존 주사위 결과 quaternion과 서버 상태는 유지함.
