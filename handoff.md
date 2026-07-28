# Handoff

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
