# 🐞 버그 트래킹 로그 (Bug Logs)

이 문서는 개발 도중 발생한 버그와 문제 해결 과정을 기록하는 문서입니다. 코드 빌더 에이전트는 버그 해결 시 반드시 여기에 원인과 해결 방안을 남기세요.

## [2026-07-26] ReferenceError: playerYachtBank is not defined
- **발생 위치**: `src/main.js` (resetGameSession)
- **증상**: 게임 시작 시 `ReferenceError: playerYachtBank is not defined` 발생 및 게임 화면 미출력
- **원인 분석**: 요트 뱅크 상태 변수를 `yachtBankState` 객체 구조로 리워크하는 과정에서, `resetGameSession` 내에 남아 있던 구형 `playerYachtBank` 및 `yachtBankLocked` 리셋 구문이 누락 제거됨.
- **해결 방안 및 조치 내역**: `resetGameSession` 함수 내의 구형 변수 리셋 코드를 제거하고 신규 `yachtBankState` 구조로 완전 대체함.

## [2026-07-26] 요트 뱅크 [Object object] 표시 및 수동 기입 클릭 가능 버그
- **발생 위치**: `src/main.js` (`previewScores`)
- **증상**: 족보 점수 미리보기 시 요트 뱅크 칸에 `[Object object]` 텍스트가 표시되고, 해당 칸을 클릭하면 수동으로 족보가 기입되던 현상.
- **원인 분석**: `calculateScores`의 반환값인 객체 형태(`{ score, bonus }`)를 수치값으로 오인하여 `${potentialScores[cat.id]}점`으로 출력하면서 `[Object object]` 문자열이 형성됨. 또한 뱅크 칸 수동 클릭을 막는 클릭 핸들러 잠금 조건이 누락됨.
## [2026-07-26] 디버그 툴 증강 강제 삽입 시 타이머 미작동 및 5개 킵 슬롯 테두리 보정
- **발생 위치**: `src/main.js` (`applyMutation`), `src/DiceEngine.js` (`setYachtBankActive`), `src/style.css`
- **증상**: 
  1. 디버그 툴로 중간에 요트 뱅크 증강을 강제 삽입 시, `yachtBankState`가 초기화되지 않아 3턴 타이머 카운트다운이 동작하지 않고 차감 타이머가 유실되던 현상.
  2. 점수 미리보기 시 숫자 뒤에 '점' 텍스트가 노출되던 현상.
  3. 전체 게임판 외곽 테두리가 아닌, 주사위가 킵되는 5개 슬롯 칸에 금빛 강조 테두리가 연출되어야 하는 디자인 요구사항.
- **원인 분석**: `applyMutation` 함수에서 `yacht-bank` 적용 시 `yachtBankState` 초기화 구문 누락, `previewScores`의 `점` 문자열 결합, 전체 보드 영역 CSS 적용이 원인.
- **해결 방안 및 조치 내역**: 
  1. `applyMutation`에 `yachtBankState[player] = { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false }` 초기화 코드 추가.
  2. `previewScores`에서 `${bankVal}` 수치만 출력하도록 텍스트 보정.
## [2026-07-26] 핫시트 플레이 증강 선택 풀 고정 및 턴 타이머 미작동 버그
- **발생 위치**: `src/main.js` (`getSeededAugments`, `startTurnTimer`, `resumeTurnTimer`, `updateTurnTimerUI`)
- **증상**: 
  1. 핫시트 플레이 진행 시 매판 동일한 고정 증강 조합만 출력되던 문제.
  2. 핫시트 게임 진행 시 턴 타이머(45초)가 가동하지 않고 `--`로 멈춰 있던 문제.
- **원인 분석**: 
  1. `getSeededAugments`에서 방 번호가 없는 핫시트 플레이 시 `DEFAULT` 시드를 고정 사용하면서 난수 해시 결과가 똑같이 반복됨.
  2. 타이머 모듈(`startTurnTimer`, `resumeTurnTimer`, `updateTurnTimerUI`)의 무제한 타이머 검사 조건에 `gameMode === 'hotseat' || gameMode === 'augmented-hotseat'`가 포함되어 타이머 가동이 완전히 차단되어 있었음.
- **해결 방안 및 조치 내역**: 
  1. 핫시트 모드 플레이 시 타임스탬프와 `Math.random()` 기반의 무작위 시드를 생성하도록 수정하여 판마다 새로운 무작위 증강 3개가 출현하도록 변경.
## [2026-07-26] 요트 뱅크 n턴 남음 타이머 미차감 버그
- **발생 위치**: `src/main.js` (`lockScore`, `startTurn`)
- **증상**: 1턴에 요트 뱅크 증강을 획득하고 턴이 지나도 `n턴 남음` 카운터가 차감되지 않던 현상.
- **원인 분석**: `startTurn()` 내 `bankState.initialized` 검사 분기 로직으로 인해 증강 획득 첫 턴 직후 턴 차감이 중복 스킵되는 구조적 결함이 존재함.
## [2026-07-26] 요트 뱅크 4라운드 자동 기입 타이밍, 턴 넘김 및 킵 존 0.5초 페이드인/아웃 연출
- **발생 위치**: `src/main.js` (`startTurn`), `src/DiceEngine.js` (`setYachtBankActive`, `animate`)
- **증상**: 
  1. 3턴 이자 적립 진행 완료 후 4번째 턴 시작 시 자동 기입 로그 출력 후 턴이 넘어가거나 주사위를 굴릴 수 없던 흐름 문제.
  2. 킵 존 3D 금빛 슬롯 라인이 활성화/비활성화될 때 뚝 튀어나오거나 갑자기 사라지던 현상.
- **원인 분석**: 
  1. 4번째 턴 진입 시 `startTurn()`에서 자동 기입 처리 후 다음 턴으로 전환하는 `advanceTurnAfterScore()` 연동 구문 누락.
  2. 3D 슬롯 텍스처 opacity에 대한 부드러운 시간 기반 LERP 트랜지션 미적용.
- **해결 방안 및 조치 내역**: 
  1. 4번째 턴 진입 시 `[Bank]` 자동 기입 로그 및 점수판 반영 후, 약 0.8초 안내 연출 시간을 거쳐 `advanceTurnAfterScore()`로 턴이 자동으로 넘어가도록 수정함.
## [2026-07-26] 요트 뱅크 선택 즉시 금빛 라인 발동 및 2P Opacity 독립 유지
- **발생 위치**: `src/main.js` (`applyMutation`), `src/DiceEngine.js` (`setYachtBankActive`)
- **증상**: 
  1. 요트 뱅크 증강 선택 직후 금빛 3D 라인이 즉시 켜지지 않던 문제.
  2. 1P가 요트 뱅크 선택 후 2P 턴으로 전환되었을 때 2P의 기본 킵 존 슬롯 라인까지 흐릿해지던 현상.
- **원인 분석**: 
  1. `applyMutation`에서 증강 선택 즉시 `updateRollsUI()`를 실행하는 연동이 누락됨.
  2. `setYachtBankActive(false)` 시 `targetSlotOpacity = 0.2`로 설정되어 일반 슬롯 텍스처까지 20%로 어두워짐.
- **해결 방안 및 조치 내역**: 
  1. `applyMutation` 시점에 `updateRollsUI()`를 즉시 호출하여 증강을 집는 순간 금빛 라인이 발동되도록 수정.
## [2026-07-26] 요트 뱅크 턴 진입 시 금빛 라인 발동 및 턴 완료 시 꺼짐 보정
- **발생 위치**: `src/main.js` (`proceedTurnStart`, `lockScore`)
- **증상**: 주사위를 굴릴 때 금빛 라인이 발동하거나 턴을 완료해도 불이 꺼지지 않던 현상.
- **원인 분석**: 턴을 넘겨받는 시점(`proceedTurnStart`)의 연동 명확화 및 족보 선택 후 턴 종료 시점(`lockScore`)의 `setYachtBankActive(false)` 호출 누락이 원인.
## [2026-07-26] 요트 뱅크 금빛 이펙트 턴 시작/종료 명시적 온/오프 알고리즘 정립
- **발생 위치**: `src/main.js` (`proceedTurnStart`, `lockScore`)
- **증상**: 턴이 넘어오는 시점 및 완료 시점에 3D 금빛 라인이 의도대로 들어오거나 꺼지지 않던 현상.
- **원인 분석**: `updateRollsUI()` 함수에서 굴리기 버튼 상태 갱신 시마다 불 상태를 자동 판별해 변경하면서 턴 라이프사이클 이벤트와 충돌이 발생함.
- **해결 방안 및 조치 내역**: 
  1. 불이 들어오는 케이스: **내 턴이 시작되었을 때 (`proceedTurnStart`)** 명시적으로 `diceEngine.setYachtBankActive(true)` 호출.
  2. 불이 꺼지는 케이스: **내 턴이 끝났을 때 (`lockScore`)** 명시적으로 `diceEngine.setYachtBankActive(false)` 호출.
  3. `updateRollsUI()` 내의 수동 제어 트리거를 제거하여 턴 이벤트 단에서 완벽 분리함.
