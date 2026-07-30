# Bug Logs

## 2026-07-30 Turn timer and BGM used mismatched elapsed-time bases

- Symptom: The visual turn seconds and BGM cue drifted after a paused action such as rolling dice.
- Cause: Timer code used a 45.99-second basis while BGM restore used 45 seconds; ducked BGM also kept advancing during timer pauses.
- Fix: A shared 45.99-second turn-duration constant now supplies every BGM offset, and timer pauses preserve the BGM position until the same timer resumes.

## 2026-07-30 Remote roll did not pause the spectator timer

- Symptom: The observer's turn timer continued decreasing while the opponent's dice were rolling.
- Cause: The synchronized roll-start handler did not call the shared timer pause function.
- Fix: Remote roll start now pauses the timer; remote result arrangement resumes it.

## 2026-07-30 Augment progress save failures had no player-visible cause

- Symptom: A completed augmented match could leave no account progress, while the result screen gave no indication whether saving ran or failed.
- Fix: The end-game modal now reports pending, completed, skipped, and failed personal augment-progress saves. Failed Firestore error codes/messages are shown in the modal and remain logged to the console.

## 2026-07-30 Augment progress was limited to the match saver

- Symptom: Only the representative match-saving client had a path that could update account statistics.
- Cause: Match history persistence and personal account progression shared the host/saver guard.
- Fix: Every authenticated, non-forfeiting augmented-mode participant now writes only their own progress through an idempotent per-session receipt.

## 2026-07-30 Settled dice could remain clumped

- Symptom: Slow dice that contacted each other could sleep as a cluster.
- Fix: Before sleep confirmation, at most twice per roll, low-speed nearby pairs receive a small deterministic horizontal separation velocity.

## 2026-07-29 Side collision walls were inside the recessed STL tray

- Symptom: Dice contacted invisible left/right walls before reaching the visible recessed-tray wall.
- Cause: Physics used the felt bounds for the side walls; the previous correction incorrectly used the full STL exterior.
- Fix: Replaced the extended flat floor with a measured central floor, left/right/front slope proxies, and rim-height walls. The rear boundary remains at the keep-pocket transition (`Z=-35`).

## 2026-07-29 Dice could settle on an edge or vertex

- Symptom: A slow die could remain standing on an edge or vertex until roll finalization.
- Cause: The sleep check used only linear and angular speed, so an unstable orientation could be forced to sleep.
- Fix: Sleep now requires a face-alignment threshold for three consecutive checks. Slow unstable dice receive a small deterministic angular nudge toward the face that already owns the result. The timeout fallback aligns that same face without changing the roll value.

## 2026-07-29 Mixed normal and augmented clients could join the same room code

- Symptom: A player who selected a different game mode could join an existing room using the same code.
- Cause: Each incoming `join` message overwrote the room's stored game mode.
- Fix: The first player fixes the room mode. Later joins with a different mode receive `ROOM_MODE_MISMATCH`, are disconnected, and return to mode selection.

## 2026-07-29 Arrangement shadow disappeared immediately

- Symptom: The arrangement shadow appeared during movement but vanished as soon as dice settled.
- Cause: Completion was treated as a shadow-removal event.
- Fix: Settled active dice retain their shadow. Shadows are removed only when rerolling or when score registration starts dice clearing.

## 2026-07-29 Landing dice sound played after entering the game menu

- Symptom: A landing-page dice collision sound could be heard after leaving the landing view.
- Cause: The landing `DiceEngine` continued simulating while hidden and its cloned collision audio was not tracked for cleanup.
- Fix: Landing sound is disabled on every exit path, and active cloned hit sounds are paused and cleared immediately.

## 2026-07-29 Arrangement shadow, opponent BGM, and clearing interaction

- Shadow: Arrangement shadows remained visible after movement completed. They now get removed at completion and during dice cleanup.
- Multiplayer audio: The remote `sync_roll` path did not duck BGM. It now fades BGM out for the opponent's roll and restores it after synchronized result arrangement.
- Interaction: Clearing states were omitted from click and hover guards. Dice cannot now be selected while clearing animations run.

## 2026-07-29 Dice rotation occurred before result confirmation

- Symptom: Dice rotated on the board after physics stopped but before the game had confirmed the roll result.
- Cause: an end-of-roll settle-stabilizer animation ran inside `DiceEngine.finalizeRoll()` before `main.js`'s result-confirmation callback.
- Fix: removed that early animation. Rotation and arranging now occur only through `arrangeAll(true)` after the result is confirmed.

## 2026-07-29 High-speed ingress reached the 12 o'clock wall

- Symptom: Dice entered quickly from 6 o'clock, contacted the 12 o'clock wall, then fell back toward the center.
- Cause: The large negative Z velocity used to clear the rim remained active after reaching the desired landing area.
- Fix: Target the central board range and brake X/Z velocity upon crossing the target. The target is synchronized in spawn transforms.

## 2026-07-28 — STL 보드와 주사위 겹침

- 증상: 킵 포켓에 배치된 주사위의 밑면이 STL 모델 안으로 들어가 보임.
- 원인:
  - 중앙 플레이면은 레이캐스트 실측값을 사용했지만 킵 포켓은 수동 상수 `Y=10`을 사용했다.
  - STL 실측 결과 5개 킵 포켓 표면은 모두 원본 좌표 `Y≈13`이었다.
- 수정:
  - `YachtTrayModel`이 중앙 플레이면과 5개 킵 포켓 표면을 각각 측정한다.
  - 각 킵 슬롯의 실측 Y와 주사위 형상별 지지 높이로 배치 높이를 계산한다.
- 검증:
  - 월드 배율 적용 후 킵 표면 `Y≈1.6906`, D6 중심 `Y≈2.5256`으로 계산됨.
  - 기존 상수 기반 배치보다 약 `0.3901` 월드 단위 높아져 모델 침투가 제거됨.

## 2026-07-28 — 6시 방향 외부 투척이 기존 경계에 차단됨

- 증상: 시작 위치를 보드 외부로 옮기면 6시 방향 벽과 천장이 주사위를 막음.
- 원인: 기존 물리 경계가 굴림 상태와 무관한 고정된 네 벽과 천장으로 구성됨.
- 수정:
  - 경계를 `NORMAL`, `INGRESS`, `FLIP` 모드로 분리함.
  - `INGRESS`에서 6시 벽을 외부 안전벽으로 이동하고 진입판과 연장 가이드 벽을 생성함.
  - 모든 주사위가 진입하면 `NORMAL` 경계로 복구함.
- 검증:
  - 브라우저에서 외부 시작 위치 `Z≈14.24/16.24`와 보드 진입 후 정상 안착 확인.
  - 종료 후 경계 모드 `normal`, 정적 충돌체 6개 복구 확인.

## 2026-07-28 — 백그라운드 탭에서 주사위가 공중에 멈춤

- 증상: 렌더 프레임이 제한된 브라우저 탭에서 2.5초 타이머가 먼저 끝나 주사위 Body가 공중에서 제거됨.
- 원인: 강제 종료 기준은 벽시계 기반 `setInterval` 횟수였지만 물리는 `requestAnimationFrame`에서만 진행됨.
- 수정:
  - 굴림과 판 뒤집기의 제한 시간을 누적 물리 시뮬레이션 시간 기준으로 변경함.
  - 진입 타임아웃도 같은 시뮬레이션 시간 기준으로 변경함.
- 검증:
  - 제한된 프레임 환경에서도 주사위가 바닥에 안착한 뒤 종료됨.
  - 최종 D6 중심 Y가 플레이면 위 `-0.53` 부근으로 안정됨.
## 2026-07-29 Shadow map deprecation and WebGL filter warning

- Symptom: Each dice renderer logged the deprecated `PCFSoftShadowMap` warning and a depth-comparison linear-filter compatibility warning.
- Cause: Current Three.js maps the deprecated soft-PCF option to PCF, which uses linear filtering for comparison depth textures.
- Fix: Switched to `BasicShadowMap`, avoiding the deprecated option and implementation-dependent comparison filtering.

## 2026-07-29 Cached login caused landing dice initialization error

- Symptom: Reloading with a cached login state threw a temporal-dead-zone error for `landingDiceEngine`.
- Cause: Cached-login handling called `silenceLandingDice()` before the `let landingDiceEngine` declaration was initialized.
- Fix: Moved the declaration and mute helper before cached-login handling.

## 2026-07-29 Dice result confirmation was too early

- Symptom: The roll result could be confirmed before the dice motion had enough time to finish naturally.
- Fix: Extended the maximum physics simulation and result-confirmation wait from 2.5 seconds to 3.5 seconds.
## 2026-07-29 Strange Die removed pending rework

- Change: Marked the Strange Die augment as unavailable so it is excluded from all generated augment choices.
- Compendium: The entry remains visible with a muted "리워크 예정" label.

## 2026-07-30 경기 통계 저장이 증강 통계를 덮어씀

- 증상: 온라인 경기 종료 후 사용자 `stats` 안의 증강 통계가 사라질 수 있음.
- 원인: 경기 통계 트랜잭션이 기존 `stats`를 펼치지 않고 게임 수·승패·점수·선호 증강만으로 전체 객체를 교체함.
- 수정:
  - `updateProfileStats()`가 기존 `stats` 필드를 보존한 채 공용·모드별 통계를 누적하도록 변경함.
  - 모드별 일반 최고 득점 최초 달성일, 상단 보너스, 실제 요트 달성 횟수를 같은 경로에서 기록함.
- 검증:
  - 기존 `augmentStats` 보존, 최고 득점 동률 시 최초 날짜 유지, 무승부 패배 제외를 단위 테스트로 확인함.

## 2026-07-30 history 프로필 아바타 미표시

- 증상: history 경기 행의 사용자 프로필 아바타가 정상 출력되지 않음.
- 원인: 프로필 진입 버튼을 추가하며 아바타 루트를 `span`으로 변경했지만 블록 표시를 지정하지 않아 24×24 크기와 크롭 렌더 기준이 무너짐.
- 수정:
  - `.history-avatar-profile-btn .history-avatar-mini`에 `display: block`을 적용함.
  - 해당 CSS 계약을 DOM 회귀 테스트에 추가함.
- 검증:
  - 프로필 레이아웃 테스트 통과.
  - production build 통과.

## 2026-07-30 프로필 모달 스크롤바·통계 영역 밀림

- 증상: 데이터 양에 따라 내부 스크롤바가 생기거나 사라지며 카드 폭이 밀리고, 레이팅 그래프와 일반 통계 카드가 배정 범위를 넘을 수 있음.
- 원인:
  - 모드 통계 카드가 `overflow-y: auto`를 사용함.
  - history 스크롤바 공간이 데이터가 넘칠 때만 생성됨.
  - 일반 통계 카드 3개가 가용 우측 열보다 넓게 늘어남.
- 수정:
  - history 외 프로필 카드는 overflow를 숨김.
  - history에 `overflow-y: scroll`, `scrollbar-gutter: stable` 적용.
  - 그래프를 레이팅 요약 행 안으로 이동하고 일반 통계 카드를 80×76px 기준으로 제한.
- 검증:
  - 1280px 화면에서 아이콘·모드명·레이팅·그래프의 중심축 정렬과 그래프 행 내부 수용 확인.
  - 프로필 레이아웃·통계·증강 테스트와 production build 통과.
- 후속 시각 조정:
  - 그래프 상태 문구를 레이팅 수치 아래로 분리해 그래프 배경과 SVG 영역을 일치시킴.
  - 일반 통계 카드 높이를 Top 3 증강 항목과 맞추고 좌우 섹션 구분선을 추가함.
  - SVG 기본 비율 보존이 그래프 실선을 배경보다 약 87px 좁게 만들던 것을 확인해 `preserveAspectRatio="none"`과 양끝 좌표 보정으로 제거함.
  - 사용자 피드백에 따라 구분선을 다시 제거하고 일반 통계 열 너비를 Top 3 열과 동일하게 변경함.

## 2026-07-30 레이팅 그래프 시계열·호버 정보 부재

- 증상: 프로필 레이팅 그래프가 고정 수평선으로만 표시되고 날짜별 레이팅 확인이 불가능함.
- 수정:
  - 최근 90일 일별 시계열 정규화 함수 추가.
  - 선·하단 영역 SVG 경로와 포인터/키보드 점·툴팁 렌더러 추가.
  - 그래프 UI를 `profileRatingGraph.js`로 분리해 프로필 모달과 브라우저 QA가 같은 코드를 사용하도록 함.
- 검증:
  - 기본 500점 90일, 날짜별 레이팅 carry-forward 단위 테스트 통과.
  - 브라우저 호버에서 점과 `2026.06.20 · 515` 툴팁 표시 확인.

## 2026-07-30 레이팅 그래프 끝단 툴팁 잘림·포인트 왜곡

- 증상:
  - 그래프 양끝 호버 시 중앙 정렬 툴팁이 카드 밖으로 잘림.
  - 비율을 늘린 SVG 내부 원이 타원으로 표시됨.
  - 포인터 이탈 즉시 정보가 사라져 읽기 어려움.
- 수정:
  - 시작·중앙·끝 구간별 툴팁 정렬 적용.
  - 점을 SVG에서 8×8px CSS 원형 오버레이로 이동.
  - 포인터 이탈 숨김을 1초 지연.
- 검증:
  - 양끝 툴팁이 그래프 내부에 유지됨.
  - 점 8×8px·50% radius 확인.
  - 이탈 500ms 후 표시, 1150ms 후 숨김 확인.

## 2026-07-31 프로필 대상 구분·그래프 이탈 피드백 보완

- 증상:
  - 타인 프로필 제목이 닉네임 길이에 따라 달라지고 본인 프로필 복귀 동선이 없음.
  - 그래프 이탈 시 점과 텍스트가 즉시 제거되어 상태 전환이 딱딱함.
- 수정:
  - 타인 제목을 `유저 프로필`로 고정하고 `내 프로필` 복귀 버튼을 추가함.
  - 9.6px 포인트와 12px 후광에 1초 축소 후 300ms 동시 페이드·축소 상태를 적용함.
- 검증:
  - 프로필 레이아웃·통계·증강 회귀 테스트와 프로덕션 빌드 통과.
  - 후속 피드백으로 후광을 포인트의 1.3배인 12.48px로 확대하고 축소 배율을 0.7692로 보정함.

## 2026-07-31 Top 3 증강 선택 횟수 중복 증가

- 상태: 수정 완료.
- 증상:
  - 한 경기에서 특정 증강의 프로필 Top 3 카운트가 2 증가할 수 있음.
- 원인:
  - 증강을 클릭한 뒤 500ms 확정 대기 중 선택 타이머가 0초가 되면 클릭 확정과 자동 선택이 모두 `cleanupAndSelect()`를 호출할 수 있음.
  - `cleanupAndSelect()`에 1회 실행 가드가 없고 `recordAugmentSelection()`도 같은 세션·증강의 중복 호출을 누적함.
- 재현:
  - 동일 세션에서 같은 증강을 `recordAugmentSelection()`으로 두 번 기록하면 `selections[id] === 2`가 됨을 확인.
- 영향:
  - `saveAugmentProgress()`가 해당 값을 `stats.augmentStats[id].selections`에 그대로 더하고, Top 3가 이 필드를 표시하므로 중복값이 노출됨.
- 권장 수정:
  - `cleanupAndSelect()`를 단 한 번만 완료하도록 가드하고, 세션 선택 기록도 같은 증강에 대해 멱등 처리하는 방어 테스트를 추가할 것.
- 수정:
  - `cleanupAndSelect()`에 `selectionCommitted` 1회 실행 가드를 추가함.
  - `recordAugmentSelection()`은 동일 세션·동일 증강을 다시 받아도 1을 유지하도록 멱등 처리함.
  - 중복 호출 회귀 테스트를 추가함.
- 검증:
  - 증강 진행도·프로필 통계·프로필 레이아웃 테스트 및 프로덕션 빌드 통과.
- 주의:
  - 이미 저장된 과거 중복 카운트는 유효 기록과 구분할 근거가 없어 자동 보정하지 않음.

## 2026-07-31 레이팅 그래프 양 끝 채움 누락

- 증상:
  - 그래프 파란 채움이 좌우 끝단까지 닿지 않고 좁은 빈 영역이 남음.
- 원인:
  - 채움 경로가 선 경로와 같은 `x=1.5~238.5` 범위에서 닫혀 SVG 전체 `0~240` 범위를 덮지 못함.
- 수정:
  - 선 좌표는 유지하고 채움 경로만 첫·마지막 레이팅 높이에서 `x=0`, `x=240`까지 확장함.
  - 초기 빈 그래프 채움 경로도 `M0 32H240V64H0Z`로 변경함.
- 검증:
  - 프로필 레이아웃·통계 테스트와 프로덕션 빌드 통과.

## 2026-07-31 메인 history 하단 여백

- 증상:
  - 메인 프로필 영역에서 history 카드 아래에 빈 공간이 남음.
- 원인:
  - 공용 `.history-card`의 `max-height: 480px` 제한으로 남은 세로 공간을 사용하지 못함.
- 수정:
  - `#profile-content`를 남은 높이를 사용하는 flex 영역으로 변경함.
  - 메인 직계 history에만 `max-height: none`과 `min-height: 0`을 적용함.
  - 프로필 모달 history 규칙은 변경하지 않음.
- 검증:
  - 프로필 레이아웃 테스트와 프로덕션 빌드 통과.
