# Graphify Code Only 모드 구현 계획

## 목적

Graphify `Communities` 패널에서 구현 문서·작업 기록 노드를 숨기고 코드 그래프만 볼 수 있게 함.

## 메커니즘

- 기존 커뮤니티 체크박스는 그대로 유지함.
- `Code only` 체크박스가 켜지면 `RAW_NODES` 중 `file_type === "document"`인 노드만 숨김.
- 실제 표시 여부는 `hiddenCommunities`와 Code only 조건을 함께 계산해 커뮤니티 토글과 충돌하지 않게 함.
- Graphify가 `graph.html`을 재생성해도 `scripts/patch_graphify_html.py`를 실행하면 동일 UI를 복구함.

## 검증

- 패치 스크립트가 생성 HTML의 필수 마커를 확인함.
- Code only 토글 전후 문서 노드 표시 상태와 커뮤니티 토글 동작을 브라우저에서 확인함.
