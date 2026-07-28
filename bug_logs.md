# Bug Logs

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
