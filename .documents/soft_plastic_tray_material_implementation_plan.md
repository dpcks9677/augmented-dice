# 게임보드 림·벽 Soft Plastic 재질 적용 계획서

## 목표

버건디 플레이 바닥과 킵존 바닥은 기존 정책을 유지하고, 그 외 림·벽 영역에 Soft Plastic 질감을 적용함.

## 구현 방식

- 기존 STL geometry 분류와 단일 mesh를 재사용함.
- 림·벽 삼각형에는 기존 vertex color 폴백을 유지함.
- 림·벽용 평면 투영 UV를 XZ·XY·ZY 방향으로 생성함.
- Soft Plastic Albedo·Normal·Roughness 맵을 로드해 림·벽 material에 적용함.
- Albedo는 검정 tint와 곱해 어두운 플라스틱으로 표시함.
- 프리셋 스튜디오 4번 보드 재질 비교 탭에서 코듀로이와 Soft Plastic 적용 전후를 독립적으로 전환함.
- AO·Glossiness·Specular는 1차 적용에서 제외함.
- 텍스처 로딩 실패 시 기존 검정 vertex color 재질로 폴백함.

## 검증

- 플레이 바닥 코듀로이 유지 여부 확인함.
- 림·벽 Soft Plastic 반복·하이라이트 확인함.
- 킵존 바닥 검정 유지 여부 확인함.
- `npm run build`, 기존 STL 영역 테스트, `git diff --check`, `graphify update .` 실행함.
