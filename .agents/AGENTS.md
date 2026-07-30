# Augments.json Rules

* **DO NOT** add condition or effect properties to the augments in src/augments.json. 
*  ugments.json should only contain data meant to be directly exposed to the game UI (like 
ame, description, icon, 	arget, 	ype, 
eward, mutationId).
* Information that is purely for developer understanding (such as explicit condition triggers and internal effect details, which were originally parsed from  ugments_explaination.md) should NOT be included in the JSON file. Only use description for user-facing explanation text.

* When writing or updating description fields in  ugments.json, if a line break is needed (e.g. between sentences), manually insert <br><br> directly into the JSON string. Do not rely on JavaScript code to format the text.

# General Behavioral Rules

- Korean responses must be concise and use caveman endings such as "하겠음", "함", "완료". Avoid casual 반말 such as "할게", "했어".

1. **답변 우선 원칙**: 사용자의 질문에 대해서는 곧바로 구현을 실행하는 대신 답변을 먼저 제공할 것. (구현을 원하는 것인지 질문인지 헷갈린다면 사용자에게 먼저 물어볼 것)
2. **구현 계획서 우선 작성 원칙**: 기능 구현을 요청받았을 때 곧바로 코드를 작성하지 않고, 반드시 **구현 계획서**를 먼저 작성하고 어떻게 구현할 것인지 사용자에게 명확히 설명할 것.
3. **대량 수정 허가 절차**: 코드를 대량으로 수정해야 할 경우, 작업을 중단하고 사용자에게 먼저 변경 사유와 구현 매커니즘을 설명한 후 허가를 받고 진행할 것.
4. **톤 앤 매너**: 과장된 표현 없이 철저히 중립적인 입장을 취하여 소통할 것. 기본적으로 caveman 스킬(군더더기 없이 간결하고 핵심만 말하는 톤앤매너)을 상시 유지할 것.
5. **구현 계획서 대화 원칙**: 구현 계획서를 작성한 후 사용자가 구현하라는 명시적 지시가 없다면, 구현을 즉시 실행하지 않고 계획서에 대한 질문이나 수정 내역에 대해 먼저 답변을 제공할 것.

# 작업 방식

사용자의 요청사항을 읽고, 다음과 같은 순서를 지킨다.
1. 사용자의 요구사항에 알맞는 적절한 에이전트를 선정한다.
2. 글로벌 룰(CLAUDE.md)이 명시한 내용을 준수하며 작업을 실행한다.
3. 작업 결과를 보고할 때, 어떤 에이전트를 사용하였는지 상단에 명시한다.

# 커밋 및 푸시/배포 규칙

1. **명시적 요청 시에만 실행 원칙**: 커밋, 푸시, 배포 작업은 사용자가 직접 명시적으로 지시하거나 언급할 때만 수행할 것. (작업 완료 후 자동으로 푸시/배포하지 말 것)
2. **커밋/푸시 시 전체 변경사항 비교 작성**: 사용자가 커밋 및 푸시를 요청할 경우, 단일 대화 세션의 작업 내용에만 한정하지 않고 `git diff` 및 `git status` 등을 통해 **마지막 커밋 대비 현재 코드베이스 전체의 변경/추가 내역**을 확인하고 커밋 메시지 및 보고 설명에 명확히 작성할 것.
3. **커밋 메시지 한글 작성 원칙**: git 커밋 메시지는 반드시 한글로 명확하게 작성할 것.
4. **커밋 메시지 본문 변경 내역 목록 원칙**: git 커밋 시 한글 제목과 함께, 이전 커밋 대비 완료한 변경 내역을 본문 목록으로 나열할 것. 각 목록 항목은 한 줄 길이로 간결하게 작성할 것.
5. **웹 호스팅 배포 실행 규칙**: 배포 요청 시 단순 git push에 그치지 않고, 반드시 최신 번들 빌드(`npx vite build`) 및 Firebase 호스팅 배포 명령어(`npx firebase deploy --only hosting`)를 함께 실행하여 웹 서버에 최신 산출물을 적절히 반영할 것.

# 로드맵 관리 규칙

1. **로드맵 파일 위치**: 프로젝트 개발 로드맵 문서는 `.agents/ROADMAP.md` 파일에서 관리한다.
2. **참조 및 업데이트**: 마일스톤이나 기능 개발 시 `.agents/ROADMAP.md` 파일을 참조하여 방향성을 유지하고, 구현 완료 시 해당 로드맵 항목의 진행 상태를 최신화한다.
