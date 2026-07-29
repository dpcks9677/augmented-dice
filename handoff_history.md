# Handoff History

## 2026-07-29 Face-aware dice settling

- Removed the deferred settle-stabilizer design document.
- Added face-normal alignment to the real sleep path instead of a separate pre-result animation.
- Requires three stable checks, nudges slow edge/vertex states, and uses a value-preserving timeout correction for D6 and D8.

## 2026-07-29 Strange Die rework hold

- Added availability metadata to remove Strange Die from choices while retaining a disabled compendium card marked for rework.

## 2026-07-29 Shadow map compatibility

- Replaced the deprecated soft PCF configuration with `BasicShadowMap`, avoiding implementation-dependent depth comparison filtering.

## 2026-07-29 Landing dice initialization order

- Fixed cached-login startup by declaring the landing dice engine before its mute helper can be called.

## 2026-07-29 Dice result confirmation delay

- Extended the maximum roll physics duration and result-confirmation wait from 2.5 seconds to 3.5 seconds.

## 2026-07-29 Lobby mode mismatch protection

- Added authoritative room-mode validation in the PartyKit server and client-side cleanup for rejected joins.

## 2026-07-29 Persistent settled-dice shadow

- Reworked shadow lifecycle so completed arrangement retains the shadow; reroll and clearing paths remain responsible for removal.

## 2026-07-29 Landing dice audio cleanup

- Added per-engine sound enablement and active collision-audio cleanup.
- Wired landing-view exit and logout-return transitions to silence/re-enable the landing dice engine.

## 2026-07-29 Shadow, multiplayer audio, and clearing interaction fixes

- Fixed persistent arrangement-shadow lifecycle, remote-roll BGM duck/restore, and interaction guards for both clearing animation modes.

## 2026-07-29 Result-timed dice rotation

- Removed the early settle-stability animation after it caused dice to rotate before result confirmation.
- Rotation and arrangement are again limited to the existing result-confirmation `arrangeAll(true)` flow.

## 2026-07-29 Settle stability plan

- Documented the cause, a separate settle-stabilizer module, low-speed-only correction criteria, multiplayer authority, and the validation matrix.
- No runtime code changed in this planning task.

## 2026-07-29 Central landing adjustment

- The high-speed ingress retained its Z-axis momentum after clearing the rim, causing dice to hit the 12 o'clock wall before dropping.
- First-throw targets now use a narrow range around the board center; crossing that target brakes horizontal motion while preserving the upward/downward flight.
- The target coordinate is synchronized in spawn transforms for observer consistency.

## 2026-07-28 — 6시 방향 외부 투척 및 물리판 계획

- 현재 `DiceEngine`, `YachtTrayModel`, STL 형상과 멀티플레이 굴림 동기화 경로를 조사했다.
- 코드나 STL을 수정하지 않고 구현 계획서를 작성했다.
- 플레이면/킵 포켓 높이 기준 불일치, 외부 진입을 막는 6시 벽·천장, STL 준비 전 굴림 활성화 가능성을 주요 선행 문제로 기록했다.
- 다음 단계는 사용자 승인 후 좌표 계약과 보드 물리판부터 구현하는 것이다.

## 2026-07-28 — 6시 방향 외부 투척 및 물리판 구현

- STL을 수정하지 않고 실측 레이아웃과 단순 Cannon 충돌 프록시를 결합했다.
- 물리판과 경계 관리를 `DiceBoardPhysics`로 분리했다.
- 6시 방향 외부 시작, 두 줄 엇갈림 배치, 중심 방향 탄도 궤적을 구현했다.
- 진입판과 열린 경계를 투척 중에만 사용하고 완료/타임아웃 시 정상 경계로 복구하도록 했다.
- 킵 포켓의 실측 표면 높이를 사용해 모델 겹침을 수정했다.
- STL과 충돌판 준비 완료 후 굴림을 활성화하도록 로딩 계약을 보완했다.
- 백그라운드 탭의 공중 정지 문제를 발견해 강제 종료 기준을 물리 시뮬레이션 시간으로 변경했다.
- 300회 자동 물리 시뮬레이션, 프로덕션 빌드, 브라우저 시각 검증을 통과했다.

## 2026-07-29 — 투척 속도 및 스핀 조정

- 초기 투척의 비행 시간을 기존 `0.72~0.89초`에서 `0.62~0.76초`로 줄여 전진·상승 초기 속도를 높였다.
- 축별 초기 각속도 범위를 최대 `±30`에서 `±18`로 낮춰 스핀을 약 40% 완화했다.
- 프로덕션 빌드를 다시 통과했다.

## 2026-07-29 — 수평 비행 시간 절반 조정

- 수평 진입 시간을 `0.62~0.76초`에서 정확히 절반인 `0.31~0.38초`로 줄였다.
- 고속 진입으로 STL 림을 관통하지 않도록 림 외곽 도달 시점의 최소 높이를 계산해 상승 초기 속도에 반영했다.
- 일반 5개, 혼합 6개, D8 단일 구성을 각각 100회 시험해 이탈과 안전 복구 0회를 확인했다.
- 프로덕션 빌드를 다시 통과했다.
