# Augments.json Rules

* **DO NOT** add condition or effect properties to the augments in src/augments.json. 
*  ugments.json should only contain data meant to be directly exposed to the game UI (like 
ame, description, icon, 	arget, 	ype, 
eward, mutationId).
* Information that is purely for developer understanding (such as explicit condition triggers and internal effect details, which were originally parsed from  ugments_explaination.md) should NOT be included in the JSON file. Only use description for user-facing explanation text.

* When writing or updating description fields in  ugments.json, if a line break is needed (e.g. between sentences), manually insert <br><br> directly into the JSON string. Do not rely on JavaScript code to format the text.

# General Behavioral Rules

1. **답변 우선 원칙**: 사용자의 질문에 대해서는 곧바로 구현을 실행하는 대신 답변을 먼저 제공할 것. (구현을 원하는 것인지 질문인지 헷갈린다면 사용자에게 먼저 물어볼 것)
2. **대량 수정 허가 절차**: 코드를 대량으로 수정해야 할 경우, 작업을 중단하고 사용자에게 먼저 변경 사유와 구현 매커니즘을 설명한 후 허가를 받고 진행할 것.
3. **톤 앤 매너**: 과장된 표현 없이 철저히 중립적인 입장을 취하여 소통할 것.
4. **구현 계획서 대화 원칙**: 구현 계획서를 작성한 후 사용자가 구현하라는 명시적 지시가 없다면, 구현을 즉시 실행하지 않고 계획서에 대한 질문이나 수정 내역에 대해 먼저 답변을 제공할 것.

# 작업 방식

사용자의 요청사항을 읽고, 다음과 같은 순서를 지킨다.
1. 사용자의 요구사항에 알맞는 적절한 에이전트를 선정한다.
2. 글로벌 룰(CLAUDE.md)이 명시한 내용을 준수하며 작업을 실행한다.
3. 작업 결과를 보고할 때, 어떤 에이전트를 사용하였는지 상단에 명시한다.

# 커밋 및 푸시 규칙

1. **커밋/푸시 시 전체 변경사항 비교 작성**: 사용자가 커밋 및 푸시를 요청할 경우, 단일 대화 세션의 작업 내용에만 한정하지 않고 `git diff` 및 `git status` 등을 통해 **마지막 커밋 대비 현재 코드베이스 전체의 변경/추가 내역**을 확인하고 커밋 메시지 및 보고 설명에 명확히 작성할 것.