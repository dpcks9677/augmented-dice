# 프로필 검색·Firefox 수정 작업 기록

- 작성일: 2026-08-03
- 범위: 프로필 검색 UI/결과 탐색, 프로필 표시 규격, Firefox 주사위 애니메이션 초기 프레임

## 작업사항

- 프로필 편집 버튼 옆에 Lucide 검색 아이콘과 닉네임 검색창을 추가함.
- 입력 중 최대 4개의 미리보기 결과를 검색창 아래 absolute 영역에 표시하고, 검색 제출 시 전체 화면 결과 목록으로 전환함.
- 전체 화면 검색 결과는 제한 없이 스크롤할 수 있으며, 결과 컨테이너 간 4px 간격을 적용함.
- 결과에서 플레이어 프로필로 진입하면 버튼을 `뒤로가기`로 변경하고, 선택 전 검색 결과를 복원함.
- 검색 입력 텍스트를 `0.8rem`으로 조정하고 검색 액션 영역을 통계 카드 폭에 맞춤.
- 전체 화면 검색 결과 프로필 사진을 36.4px 정사각형으로 통일함.
- Firefox에서 생략되던 주사위 애니메이션 초기 프레임을 첫 렌더링으로 보정함.

## 변경 파일

- `src/views/game.html`
- `src/profileController.js`
- `src/authEngine.js`
- `src/style.css`
- `src/DiceEngine.js`
- `tests/profileLayout.test.mjs`
- `bug_logs.md`

## 검증

- `npm run build`
- `npm run test:profile-layout`
- `npm run test:main-structure`
- `npm run test:authoritative-game`
- `graphify update .`
