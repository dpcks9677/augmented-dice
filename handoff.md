# Handoff

## 2026-07-30 Profile card rework

- Main profile keeps the existing layout and history card; only joined-date, games-played, and profile-view rows were removed, giving history the freed height.
- Added a keypad-layout profile modal: profile at 4, empty stats at 5, mode stats across 1–2, and recent matches across 6–3.
- Both mode ratings show the approved placeholder 500 and an empty SVG graph until the separate rating-system task.
- History avatars show cached hover/focus previews and open target-UID profile details on click/tap.
- Other-profile modal opens increment `profileViews` once per browser session; self views are excluded. Firestore rules allow only an authenticated exact +1 update to that field.
- Profile editing moved to the modal and is visible only for the signed-in user's profile.
- Normal online match stats now persist highest score with first-achieved date, upper-bonus completions, and actual Yacht-condition entries while preserving all existing stats.
- Profile tests, augment regression tests, production build, Firestore rules dry-run, responsive DOM/CSS checks, and browser console checks passed. Signed-in two-account interaction remains manual QA.

## 2026-07-30 Unified turn-timer BGM timing

- Turn time remains 45.99 seconds as the 46-second grace value.
- BGM offsets derive from the shared turn-duration constant and pause/resume with the timer instead of advancing silently during dice animations.

## 2026-07-30 Remote-roll timer pause

- Observer clients pause their timer on synchronized opponent-roll start and resume it after final dice arrangement.

## 2026-07-30 Debug augment-progress reset

- Localhost-only debug tools include a confirmed reset for the signed-in account's augment statistics and achievement progress.
- Match history and receipt records remain intact.

## 2026-07-30 Augment progress save-status visibility

- The end-game modal now shows personal augment-progress save pending, success, skip, or failure status.
- Firestore failures display the returned error code/message, enabling live-match diagnosis without opening developer tools.

## 2026-07-30 Augment compendium detail implementation

- Preserves the compendium index scroll position after returning from a detail card.
- Added common mutation/quest/dice-enhancement telemetry and ten requested augment-specific achievements.
- Added a divider between the augment title and effect description in the expanded detail card.
- Enlarged the expanded detail-card effect description to 1.28rem (1.6× the compendium card text).
- Augment cards now open a 2:3 detail layout with an equal-size stats card and a shared achievement list.
- Completed mastery rows replace progress with `yyyy.mm.dd am/pm nn:mm에 달성`.
- Each authenticated, non-forfeiting augmented multiplayer participant persists personal appearance, selection, mastery, table-flip, and yacht-bank metrics once per session.
- Unit checks, production build, DOM grid inspection, and browser console inspection passed. Live two-account Firestore completion remains manual QA.

## 2026-07-30 Augment compendium detail plan

- Planned the selected-augment detail layout, account statistics, shared achievement component, and per-augment telemetry contract.
- Defined `[Augment Name] Mastery` as selecting the augment and completing 10 games. Plan: `.documents/augment_compendium_detail_implementation_plan.md`.
- No runtime implementation was applied.

## 2026-07-30 Settled-dice separation

- Low-speed overlapping dice pairs receive at most two deterministic, small horizontal separation impulses before sleep confirmation.
- The logic runs only on locally simulated rolls and leaves result calculation and final-transform synchronization unchanged.

## 2026-07-30 STL collision-proxy implementation

- Replaced the extended flat collision floor with a measured central floor, left/right/front slope proxies, and rim-height walls.
- Build, collision-coordinate assertions, and dynamic-body contact checks passed. Plan: `.documents/dice_stl_collision_proxy_plan.md`.

## 2026-07-29 Recess-aligned side walls

- Physics floor and left/right walls now use the central recessed tray X bounds (`-58..58`), not the full STL exterior.
- Front/back limits remain on the felt play bounds to preserve roll ingress behavior.

## 2026-07-29 Face-aware dice settling

- Replaced speed-only forced sleep with face-alignment checks in normal rolls and table flips.
- Slow edge/vertex states receive a deterministic angular nudge; timeout fallback aligns the already-selected result face.
- D6 and D8 correction tests confirm the value is preserved.
- Removed the obsolete `.documents/dice_settle_stability_plan.md`.

## 2026-07-29 Strange Die rework hold

- Strange Die is excluded from the augment selection pool and retained as a disabled, rework-pending compendium entry.

## 2026-07-29 Shadow map compatibility

- Replaced deprecated soft PCF shadows with `BasicShadowMap` to remove WebGL depth-comparison filter warnings.

## 2026-07-29 Landing dice initialization order

- Moved the landing dice engine declaration before cached-login handling to prevent a temporal-dead-zone error during startup.

## 2026-07-29 Dice result confirmation delay

- Extended the maximum roll physics duration and result-confirmation wait from 2.5 seconds to 3.5 seconds.

## 2026-07-29 Lobby mode mismatch protection

- Room mode is fixed by the first player on the server.
- Normal and augmented clients cannot join each other's room codes; the client returns to mode selection on rejection.

## 2026-07-29 Persistent settled-dice shadow

- Shadows now remain visible for settled active dice and are removed only for rerolls or score-registration clearing.

## 2026-07-29 Landing dice audio cleanup

- Landing dice now silence their collision audio when the user leaves the landing view; any active cloned hit sound is stopped.
- Sound is re-enabled when returning to the landing view after logout.

## 2026-07-29 Shadow, multiplayer audio, and clearing interaction fixes

- Arrangement shadows are removed after their entry animation and during dice cleanup.
- Remote rolls now duck BGM and restore it after synchronized result arrangement.
- Clearing and special-clearing dice are excluded from click and hover interaction.

## 2026-07-29 Result-timed dice rotation

- Removed the early settle-stabilizer animation because it rotated dice before the game confirmed results.
- Only the existing result-confirmation path (`arrangeAll(true)`) now rotates and arranges dice.

## 2026-07-29 Central landing adjustment

- The first throw now targets the board's central range and brakes horizontal velocity at that target, preventing a collision with the 12 o'clock wall before it falls.
- The target is included in spawn transforms so observers reproduce the same landing path.

## 현재 상태

- 요청: 6시 방향 외부에서 보드 중심으로 주사위를 던지는 연출과 STL 보드용 평평한 물리판 구현
- 단계: 구현 및 검증 완료
- 계획서: `.documents/dice_throw_ingress_implementation_plan.md`
- 버그 기록: `bug_logs.md`

## 구현 내용

- `src/DiceBoardPhysics.js`
  - 평평한 보드 물리판과 임시 진입판 관리
  - `NORMAL`, `INGRESS`, `FLIP` 경계 모드 제공
- `src/YachtTrayModel.js`
  - 플레이면, 킵 포켓, 외곽, 림 최고점 실측
  - 렌더링/물리 공용 레이아웃 제공
- `src/DiceEngine.js`
  - 6시 방향 외부 투척 궤적과 두 줄 엇갈림 시작 배치
  - 수평 진입 시간을 `0.31~0.38초`로 조정하고, 림 통과용 최소 상승 속도와 축별 초기 스핀 최대 `±18`을 적용
  - 진입 완료 감지와 안전 복구
  - 형상별 배치 높이와 물리 시간 기반 종료
- `src/main.js`
  - 엔진 준비 후 굴림 활성화
  - 멀티플레이 수신도 엔진 준비 후 처리

## 검증 결과

- `npm run build` 성공
- 일반 5개, 혼합 6개, D8 1개를 각각 100회 시뮬레이션: 실패 0회
- 브라우저에서 외부 진입, 안착, 경계/충돌체 정리 확인
- 콘솔 오류 없음

## 주의 사항

- `public/models/yacht-tray.stl`은 기본적으로 수정하지 않는다.
- 기존 `.mcp.json` 미추적 파일은 사용자 작업으로 간주하고 건드리지 않는다.
- 개발 모드에서는 `data-dice-debug` 속성으로 물리 상태를 확인할 수 있다.
- 실제 멀티플레이 양쪽 브라우저 동시 체감 검증은 후속 수동 QA 항목이다.

## 2026-07-30 프로필 리워크 피드백 반영

- `src/style.css`
  - history 아바타 내부 요소를 블록으로 고정해 24×24 렌더링 복구
  - 프로필 편집 버튼 좌측·콘텐츠 너비 적용
  - 편집 입력 글자 크기 조정
  - 양 모드 영역 동일 높이, 레이팅 그래프 박스, 모드 아이콘 투명 배경 적용
  - Top 3 증강 3열 및 아이콘 상단 구조 적용
- `src/views/game.html`
  - 각 모드 행을 레이팅 패널과 상세 통계의 2열 구조로 재배치
- `src/main.js`
  - Top 3 증강에 SVG 아이콘과 `이름 / 횟수` 마크업 렌더
- `tests/profileLayout.test.mjs`
  - history 아바타·편집 버튼·통계 레이아웃 회귀 검사 추가

검증:

- `npm run test:augment-progress` 성공
- `npm run test:profile-stats` 성공
- `npm run test:profile-layout` 성공
- `npm run build` 성공
- 브라우저 계산값 기준 상·하단 모드 높이 동일, 편집 버튼 콘텐츠 폭, 그래프 배경·테두리, 아이콘 투명 배경 확인

## 2026-07-30 프로필 모달 overflow 안정화

- history 외 프로필 카드는 내부 스크롤을 만들지 않는다.
- history는 `overflow-y: scroll`과 stable gutter로 항상 스크롤바 폭을 예약한다.
- 레이팅 그래프는 게임 모드 아이콘·이름·500점 옆의 같은 행에 배치한다.
- 일반 최고 득점·보너스·요트 카드는 80×76px 기준으로 고정해 남은 영역을 늘려 채우지 않는다.
- 관련 테스트 3종과 production build 통과.

## 2026-07-30 프로필 통계 시각 통일

- `전적 없음`을 500점 바로 아래로 이동하고 그래프 박스에는 SVG만 남겼다.
- 일반 통계 카드 높이를 64px로 조정해 Top 3 항목과 맞췄다.
- 레이팅과 우측 통계 사이에 1px 구분선을 추가했다.
- 브라우저에서 두 항목 높이 차이 약 1px, 그래프/배경 정렬, 가로 overflow 없음 확인.
- 관련 테스트 3종과 production build 통과.

## 2026-07-30 프로필 통계 레이아웃 재조정

- 그래프 높이를 64px로 복원했다.
- SVG에 `preserveAspectRatio="none"`을 적용하고 실선을 `1.5→238.5` 범위로 확장해 배경 좌우 폭과 맞췄다.
- 레이팅/통계 구분선을 제거했다.
- 일반 통계와 Top 3 모두 `repeat(3, minmax(0, 1fr))` 열을 사용해 위치·너비를 일치시켰다.
- 관련 테스트 3종과 production build 통과.

## 2026-07-30 90-day rating graph

- Added `getRatingSeries()` for 90 daily values from `stats.modes.{mode}.ratingHistory`.
- Missing history renders a flat 500 line; actual rating calculation/storage remains deferred.
- Added `profileRatingGraph.js` for line/area paths, hover point, date/rating tooltip, focus, and arrow-key navigation.
- Graph is 70% of its prior column width, 83px high, 1.5px line, with 30% blue area fill.
- Unit tests, layout checks, augment regression, production build, and browser hover verification passed.

## 2026-07-30 Rating graph hover corrections

- Changed the graph line to sky blue `#60a5fa`.
- Anchored edge tooltips 4px inside the chart to prevent clipping.
- Replaced the SVG point with an 8×8px CSS circle so non-uniform SVG scaling cannot distort it.
- Pointer leave now hides the point and tooltip after 1 second.
- Browser checks confirmed both edge tooltips, circular point sizing, and delayed dismissal.
- Follow-up: restored the rating graph line width from `1.5px` to `3px`; profile layout test and production build passed.

## 2026-07-31 Profile target switch and graph exit animation

- Other-user modal titles now read `유저 프로필`; self shows only `프로필 편집`, while other profiles show only `내 프로필`.
- Rating points are 9.6px with a 12.48px translucent halo (1.3×); pointer exit shrinks the halo to point size for 1 second, then fades/scales the halo, point, and tooltip out together over 300ms.
- Profile layout/stats, augment regression, and production build passed.

## 2026-07-31 Duplicate augment selection count diagnosis

- Fixed the click-confirm/timer-expiry race with a once-only `selectionCommitted` guard in `cleanupAndSelect()`.
- Made `recordAugmentSelection()` idempotent per session and augment; duplicate calls remain at one.
- Augment progress, profile stats/layout tests, and production build passed. Existing persisted duplicate counts were not altered.

## 2026-07-31 Production record reset and legacy cleanup

- On Firebase project `augmented-dice`, reset 11 users by deleting `stats`, `achievements`, and root `gamesPlayed`; deleted 9 matches and 2 augment receipts without backup.
- Post-check found zero matches, receipts, or users retaining those reset fields. Identity/profile fields including `createdAt` and `profileViews` remain.
- Removed obsolete `favoriteAugments` compatibility, root `gamesPlayed` creation, and unused generic stats accumulation. `stats.modes` and `stats.augmentStats` are now the active sources.
- Augment progress, profile stats/layout tests, and production build passed.

## 2026-07-31 Rating graph edge-fill correction

- Extended only the rating area path from the line inset to the full SVG width `x=0..240`, preserving line and hover coordinates.
- Updated both initial empty-state area paths to cover the same full width.
- Profile layout/stats tests and production build passed.

## 2026-07-31 Main history height expansion

- Made `#profile-content` consume the remaining sidebar height and removed the 480px cap only from its direct history card.
- Profile-modal history sizing and scrolling remain unchanged.
- Profile layout test and production build passed.
