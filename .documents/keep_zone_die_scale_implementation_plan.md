# 킵 존 주사위 스케일 보정 구현계획서

## 목표

킵 존 슬롯의 모델링 여백을 줄이기 위해 킵 진입 시 주사위의 시각 스케일을 자연스럽게 확대함. STL 원본 크기를 다시 측정하지 않고, 코드의 설정값으로 확대 배율을 조절할 수 있게 설계함.

## 현재 흐름 확인

- 킵 상태는 `DiceEngine.arrangeAll()`에서 `die.isKept`와 `keepSlot`으로 처리함.
- 킵 목표 좌표는 `trayLayout.keepPoints`와 `getKeepDieY()`로 계산함.
- 일반/핫시트/로컬 정렬은 `arrangeAll()`의 공통 애니메이션을 사용함.
- 온라인 권위 정렬은 `completeAuthoritativeRoll()`에서 `arrangeAll(false)`로 목표를 계산한 뒤 별도 보간함.
- 현재 `mesh.scale`은 기본값에 의존하며 킵 존 전용 확대 설정은 없음.

## 설정 구조

`DiceEngine.js`에 시각 레이아웃 설정을 추가함.

```js
const KEEP_DIE_LAYOUT = {
  scale: 1.2,
  scaleByType: {
    octahedron: 1
  },
  duration: 0.33,
  easing: 'cubic-out'
};
```

- `scale`: 전체 킵 주사위 기본 확대 배율
- `scaleByType.octahedron`: 기본 주사위와 형상 크기가 다른 팔면체 전용 보정 배율
- `duration`: 킵 진입·해제 시 스케일 보간 시간
- 설정값만 수정해 슬롯별 시각 크기를 수동 조절할 수 있게 함.

## 구현 방식

1. 주사위 생성 시 `baseScale`을 저장하고 기본 `mesh.scale`을 명시적으로 설정함.
2. `arrangeAll()`에서 킵 여부에 따라 `targetScale`을 계산함.
   - 킵: `baseScale * KEEP_DIE_LAYOUT.scale * scaleByType[type]`
   - 플레이 영역: `baseScale`
3. 킵 주사위의 목표 Y를 확대된 지지 높이 기준으로 계산함.
   - `getKeepDieY(supportHeight * targetScale, keepSlot)` 사용
   - 확대 후 바닥에 묻히거나 떠 보이지 않도록 표면 여유값을 재계산함.
4. 일반 정렬 애니메이션에서 위치·회전과 함께 `mesh.scale`을 `startScale → targetScale`로 보간함.
5. 킵 해제 시에도 동일한 보간으로 원래 크기로 돌아오게 함.
6. 온라인 권위 정렬의 별도 보간 프레임에도 scale 시작/종료값을 포함하거나, 클라이언트가 동일한 `targetScale`을 계산해 적용함. 서버 상태와 payload에는 scale을 추가하지 않음.
7. 물리 바디가 제거된 킵 상태에서만 시각 스케일을 적용해 Cannon 충돌 크기와 게임 판정을 변경하지 않음.

## 모드별 확인

- 연습 모드: 롤 후 킵 클릭, 킵 해제, 재롤에서 확대·복귀 확인함.
- 핫시트/로컬: 플레이어 전환과 유지 주사위 정렬에서 슬롯별 크기와 겹침 확인함.
- 온라인 권위: 서버의 값·결과·revision은 동일하게 유지하고 클라이언트 정렬 연출만 확대함.
- 팔면체: `scaleByType.octahedron`으로 기본 주사위와 다른 형상 크기만 보정함.
- 황금·세븐·커플·프로모션·이상·중량 주사위: 기본 주사위 파생 형상이므로 공통 `scale`을 사용함.

## 검증 계획

- `scale = 1`, `1.2`, `1.5`에서 킵 슬롯 충진도와 주사위 겹침을 비교함.
- 킵 진입·해제 중 바닥 관통, 공중 부양, 회전 튐이 없는지 확인함.
- `npm run build`, `npm run test:main-structure`, `node tests/coinModel.test.mjs`, `git diff --check` 실행함.
- 브라우저에서 일반·팔면체·특수 주사위와 세 게임 모드를 수동 확인함.

## 변경 예정 파일

- `src/DiceEngine.js`: 설정, 목표 스케일, 정렬 보간, 타입별 보정
- `src/YachtTrayModel.js`: 필요 시 확대 지지 높이 계산 인자 보완
- 본 계획서: 구현 결과와 실제 튜닝값 기록

## 구현 결과

- `src/DiceEngine.js`에 `KEEP_DIE_LAYOUT` 설정을 추가함.
- 기본 킵 확대 배율은 1.2이며 팔면체만 `scaleByType.octahedron`으로 별도 보정 가능함.
- 일반·권위 정렬 애니메이션에서 위치·회전과 함께 스케일을 보간함.
- 확대된 지지 높이를 킵 목표 Y 계산에 반영함.
- 스케일은 클라이언트 mesh 시각값에만 적용하고 물리·서버 상태는 변경하지 않음.

## 킵 존 10도 회전 보정 계획

### 목표

킵 존에 들어간 주사위의 옆면 노출을 줄이고, 12도 보드 카메라와 유사한 10도 시각 회전을 적용함.

### 구현 방식

1. `KEEP_DIE_LAYOUT`에 `cameraTilt` 또는 `keepTilt` 설정값을 추가함.
2. 주사위 값에 맞춘 기존 `targetQuaternion`을 먼저 계산함.
3. 킵 상태일 때만 X축 10도 보정 quaternion을 `arrangementTargetQuaternion`에 합성함.
4. 킵 진입·해제 정렬 애니메이션에서 기존 회전과 10도 보정을 함께 보간함.
5. 킵 해제 시 기본 주사위 회전으로 자연스럽게 복귀함.

### 영향 범위

- 회전 보정은 클라이언트 mesh 표시값에만 적용함.
- 주사위 값 계산, 점수, 유지 상태, Cannon 물리, 온라인 서버 payload는 변경하지 않음.
- 일반·핫시트·로컬·온라인 권위 정렬 경로 모두 동일한 클라이언트 시각 보정을 사용함.
- 팔면체는 별도 면 노출 검토가 필요하며, 필요 시 `keepTiltByType.octahedron`으로 독립 조절함.

### 검증

- 킵 진입 시 윗면 유지와 옆면 노출 감소 확인함.
- 킵 해제·재롤에서 회전이 원래 방향으로 복귀하는지 확인함.
- 일반 주사위와 팔면체, 온라인 권위 정렬에서 결과값·점수 변화를 확인하지 않음.
