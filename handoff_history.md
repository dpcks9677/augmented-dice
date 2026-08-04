# Handoff History

## 2026-07-30 Profile card rework

- Removed only the three profile detail rows from the main card and retained the original history card.
- Added the profile detail modal, responsive keypad grid, placeholder ratings, augment Top 3, normal-mode counters, and self-only editing.
- Generalized history loading/rendering to explicit UID and container arguments so the sidebar and modal can coexist without duplicate IDs.
- Added accessible history-avatar profile buttons, fixed-position previews, touch detail opening, user-data caching, and stale-request guards.
- Added exact-once-per-session other-profile view increments and a narrowly scoped Firestore rule.
- Added `profileStats.js` so match transactions preserve prior stats and update normal-mode records deterministically.
- Added profile stat and layout tests; build, syntax, existing augment tests, Firestore rules dry-run, responsive layout checks, and console checks passed.

## 2026-07-30 Unified turn-timer BGM timing

- Replaced split 45/45.99 BGM offset calculations with `TURN_DURATION_SECONDS`.
- Added a position-preserving BGM pause used by timer-paused roll, augment-selection, and table-flip flows.

## 2026-07-30 Remote-roll timer pause

- Added the missing `pauseTurnTimer()` call in the remote `sync_roll` path and resumed after `sync_roll_end` arrangement.

## 2026-07-30 Debug augment-progress reset

- Added a localhost debug action that removes `achievements`, `stats.augmentStats`, and its version marker for the current authenticated account after browser confirmation.
- The reset deliberately preserves match history and idempotency receipts.

## 2026-07-30 Augment progress save-status visibility

- Added an end-game status message for personal augment-progress persistence.
- The message distinguishes normal completion, excluded sessions, duplicate/missing-user save rejection, and Firestore errors.

## 2026-07-30 Augment compendium detail implementation

- Preserved index scroll position after detail navigation; added common mutation/quest/dice telemetry and ten requested augment achievements.
- Added a detail-only divider between the augment title and effect description.
- Enlarged only the detail-card effect description to 1.28rem.
- Added clickable and keyboard-accessible compendium cards, focused detail/back navigation, responsive 2:3 layout, and reduced-motion handling.
- Added shared achievement rows for both the compendium and global achievement modal.
- Added completed-at display replacement, personal session collection, Firestore transaction persistence, and idempotency receipt rules.
- `npm run test:augment-progress`, `npm run build`, DOM structure checks, and console error checks passed.

## 2026-07-30 Augment compendium detail plan

- Documented the 1:1.5 focused card layout, transition behavior, extensible augment metrics, personal Firestore persistence, and shared achievement rows.
- Added the generated per-augment mastery rule requiring 10 completed games after selection; runtime code remains unchanged.

## 2026-07-30 Settled-dice separation

- Added a low-speed pairwise separation impulse before sleep confirmation, capped at two attempts per roll or table flip.
- Exact center overlaps use deterministic pair indices for direction; observer clients continue to use final transforms.

## 2026-07-30 STL collision-proxy implementation

- Replaced the extended flat physics floor with a measured central floor, left/right/front slope proxies, and rim-height walls.
- Verified collision coordinates, dynamic-body contact, and the production build.

## 2026-07-29 Recess-aligned side walls

- Moved physics floor and side walls from felt X limits to the central recessed tray X bounds (`-58..58`), not the full STL exterior.
- Retained front/back felt limits so 6 o'clock ingress behavior stays unchanged.

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

## 2026-07-30 Profile rework feedback

- Fixed history avatar sizing after the profile-button wrapper changed the avatar root to an inline element.
- Reworked mode statistics into equal-height augmented/normal rows with boxed rating graphs.
- Changed Top 3 augments to three horizontal icon-first entries with `name / count` metadata.
- Reduced and left-aligned the profile edit button, matched edit-input typography, and removed mode-icon backgrounds.
- Passed augment progress, profile stats, profile layout tests, production build, and browser-computed layout checks.

## 2026-07-30 Profile modal overflow stabilization

- Removed internal scrolling from non-history profile cards.
- Reserved a permanent vertical scrollbar gutter on profile history to prevent width shifts.
- Moved rating graphs beside the mode icon, name, and rating.
- Limited the three normal-mode detail cards to compact 80×76px sizing.
- Passed profile layout, profile stats, augment progress tests, and production build.

## 2026-07-30 Profile statistics visual alignment

- Moved the shortened `전적 없음` state directly below the 500 rating.
- Limited the rating background to the graph itself.
- Matched normal-stat card height to Top 3 augment items and added a divider between rating and detail statistics.
- Browser metrics confirmed graph/background alignment, roughly equal item heights, and no horizontal overflow.

## 2026-07-30 Profile statistics layout readjustment

- Restored the rating graph to 64px height.
- Disabled SVG aspect-ratio letterboxing and extended the placeholder line to the graph background edges.
- Removed the newly added rating/statistics divider.
- Reused the Top 3 three-column grid sizing for normal-mode statistics.
- Passed profile layout, profile stats, augment progress tests, and production build.

## 2026-07-30 90-day rating graph

- Added a 90-day daily rating-series normalizer with Firestore timestamp support and a flat 500 fallback.
- Added a dedicated graph renderer with 1.5px line, 30% blue area fill, 70% width, and 83px height.
- Added pointer hover and keyboard navigation that reveal a point and date/rating tooltip.
- Browser verification displayed `2026.06.20 · 515`; all related tests and production build passed.

## 2026-07-30 Rating graph hover corrections

- Changed the line to sky blue, clamped start/end tooltips inside the chart, and moved the hover point out of stretched SVG coordinates.
- Pointer leave schedules dismissal after 1 second; re-entry cancels the timer.
- Browser verification confirmed 8×8 circular point geometry, unclipped edge tooltips, and the expected delay.

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

## 2026-07-30 — 레이팅 그래프 선 두께 복원

- 프로필 레이팅 그래프 선을 `3px`로 복원했다.
- 프로필 레이아웃 회귀 테스트와 프로덕션 빌드를 통과했다.

## 2026-07-31 — 타인 프로필 전환·그래프 이탈 애니메이션

- 타인 프로필 제목을 `유저 프로필`로 고정했다.
- 본인 프로필에는 `프로필 편집`, 타인 프로필에는 로그인 사용자의 상세 프로필로 돌아가는 `내 프로필` 버튼만 표시한다.
- 그래프 포인트를 9.6px로 확대하고 포인트의 1.3배인 12.48px 반투명 후광을 추가했다.
- 포인터 이탈 시 후광이 1초 동안 포인트 크기로 줄고, 이후 점·후광·툴팁이 300ms 동안 함께 페이드·축소된다.
- 관련 테스트 3종과 프로덕션 빌드를 통과했다.

## 2026-07-31 — Top 3 증강 카운트 중복 진단

- 클릭 후 500ms 확정 대기와 선택 제한시간 만료가 겹치면 `cleanupAndSelect()`가 클릭·자동 선택 경로에서 각각 실행될 수 있음을 확인했다.
- 공통 확정 함수에 1회 가드가 없고 같은 세션의 동일 증강 기록도 누적되므로 `selections[id] === 2`를 재현했다.
- 저장된 `augmentStats.selections`를 Top 3가 직접 표시해 사용자 제보와 일치한다.
- `cleanupAndSelect()`에 확정 1회 가드를 추가하고 동일 세션·동일 증강 선택 기록을 멱등화했다.
- 중복 호출 회귀 테스트와 관련 테스트 3종, 프로덕션 빌드를 통과했다.
- 이미 저장된 과거 중복 카운트는 유효 기록과 구분할 근거가 없어 변경하지 않았다.

## 2026-07-31 — 프로덕션 기록 초기화·레거시 통계 제거

- Firebase 프로젝트 `augmented-dice`임을 확인하고 사용자 11명의 `stats`, `achievements`, 루트 `gamesPlayed`를 백업 없이 삭제했다.
- `matches` 9건과 사용자 하위 `augmentStatReceipts` 2건을 삭제했다.
- 사후 조회에서 경기·영수증 0건, 초기화 필드 잔존 사용자 0명을 확인했다.
- 닉네임·아바타·소개말·`createdAt`·`profileViews`는 보존했다.
- 초기화로 호환 필요가 사라진 `favoriteAugments` fallback/누적, 루트 `gamesPlayed` 생성, 범용 `gamesPlayed/wins/losses/highestScore/averageScore` 누적을 제거했다.
- 모드별 통계와 `augmentStats`는 유지했으며 관련 테스트 3종과 프로덕션 빌드를 통과했다.

## 2026-07-31 — 레이팅 그래프 양 끝 채움 보정

- 채움 경로가 실선과 동일한 `x=1.5~238.5`에서 닫혀 양 끝 1.5 단위가 비는 원인을 확인했다.
- 실선·호버 좌표는 유지하고 채움만 첫·마지막 높이에서 SVG 전체 `x=0~240`까지 확장했다.
- 초기 빈 그래프 채움 경로도 전체 너비로 변경하고 회귀 검사를 추가했다.
- 프로필 레이아웃·통계 테스트와 프로덕션 빌드를 통과했다.

## 2026-07-31 — 메인 history 높이 확장

- 공용 history의 480px 최대 높이 때문에 메인 사이드바 하단이 비는 원인을 확인했다.
- `#profile-content`가 헤더 아래 남은 높이를 사용하게 하고 직계 history의 최대 높이만 해제했다.
- 프로필 모달 history의 항상 표시되는 스크롤과 크기는 유지했다.
- 프로필 레이아웃 테스트와 프로덕션 빌드를 통과했다.

## 2026-08-03 — 증강 도전과제 배포

- 증강 도전과제를 정상 종료된 증강 모드 경기에서만 집계하고 핫시트 경기는 제외하도록 구현했다.
- 도전과제 문구 종결을 `~하세요`로 통일했다.
- 요트뱅크 통계에서 저금 완료 횟수 수집과 표시 항목을 제거했다.
- 도전과제 기능만 별도 커밋·푸시·Firebase Hosting 배포했으며 신규 증강 기능은 배포하지 않았다.

## 2026-08-03 — 신규 증강 8종 구현 및 후속 수정

- 결투, 코인 토스, 랜덤 박스, 예지자, 갬빗, 더블 다운, 저금통, 주사위 연금술을 서버 권위·핫시트 양쪽 흐름에 추가했다.
- 랜덤 박스는 선택 중 카드를 유지하고 양쪽 선택 완료 후 당첨 증강으로 교체하도록 변경했다.
- 결투 카드는 판정 전 `결투 중!`, 판정 후 보유자 기준 `결투 승리!`, `결투 패배`, `결투 무승부`를 표시한다.
- 버튼형 신규 증강인 코인 토스, 갬빗, 더블 다운, 주사위 연금술은 판 뒤집기 버튼 디자인을 재사용한다.
- 버튼은 문구를 줄바꿈하지 않고 컨테이너 전체 폭이 아닌 내용 길이에 맞춰 표시한다.
- 신규 증강 패치는 커밋·푸시까지만 완료했으며 이후 후속 수정은 아직 커밋·푸시·배포하지 않았다.

## 2026-08-03 — 게임 런타임 모듈 참조 오류 수정

- `showAugment`와 `getCategoryDisplayName`을 `gameLog.js`의 명시적 export/import로 연결했다.
- 핫시트 진입과 점수 기입 중 발생하던 `ReferenceError`를 제거하고 구조 회귀 검사를 추가했다.
- 관련 게임 로직 테스트와 프로덕션 빌드를 통과했다.
