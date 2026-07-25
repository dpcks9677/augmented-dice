Augmented Dice (증강 요트 다이스)
================================

Augmented Dice는 클래식 요트 다이스(Yacht Dice)의 명확한 족보 룰에 전략적인 45종의 **증강(Augment)** 시스템을 추가한 웹 기반 실시간 멀티플레이 요트 다이스 게임입니다.

- **브라우저에서 바로 플레이하기**: https://augmented-dice.web.app
- **라이선스**: MIT License

## Project layout

```
augmented-dice/
├── src/                        게임 코어 로직 및 UI 컴포넌트
│   ├── views/                  뷰 HTML 템플릿 (game.html, landing.html)
│   ├── main.js                 애플리케이션 메인 컨트롤러 & 이벤트 바인딩
│   ├── scoreEngine.js          점수 계산 엔진 & 45종 증강 메커니즘
│   ├── networkEngine.js        실시간 멀티플레이어 웹소켓 통신 엔진
│   ├── DiceEngine.js           주사위 물리 굴림 애니메이션 엔진
│   ├── UIManager.js            UI 레이아웃 및 팝업 상태 관리자
│   ├── svgIcons.js             게임 모드, 주사위 및 족보 SVG 아이콘
│   ├── authEngine.js           사용자 프로필 & Firestore 연동 엔진
│   └── augments.json           증강 카드 메타데이터
├── public/                     음향 및 정적 에셋 자원
├── index.html                  메인 진입점 HTML
├── vite.config.js              Vite 웹 빌드 설정
├── partykit.json               PartyKit 서버 설정
├── wrangler.jsonc              Cloudflare Workers 배포 설정
└── firebase.json               Firebase Hosting 설정
```

## Features & Gameplay

- **다양한 게임 모드**:
  - **클래식 요트 다이스**: 증강 요소 없이 깔끔하게 즐기는 전통 요트 다이스. (최대 4인 플레이 지원)
  - **증강 요트 다이스**: 1, 6, 9턴에 지급되는 카드를 선택하여 다양한 족보나 변형 룰을 가지고 고득점을 노리는 요트 다이스. (2인 플레이 전용)
- **실시간 웹 멀티플레이어**: 6자리 PIN 코드 방 생성/참여 및 대기실 동기화.
- **게임 대전 기록 열람 가능**: 서버에 플레이 기록이 저장되어, 실시간 기록 열람 가능.

## Development & Setup

로컬 개발 환경 구축 방법입니다.

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 클라이언트 개발 서버 실행 (Vite)
npm run dev

# 3. 파티키트 멀티플레이 서버 실행 (PartyKit)
npm run party
```

## Build & Deployment

프로덕션 환경 빌드 및 배포 방법입니다.

```bash
# 클라이언트 웹 빌드
npm run build

# 1. 웹 클라이언트 호스팅 배포 (Firebase Hosting)
npx firebase deploy --only hosting

# 2. 실시간 백엔드 서버 배포 (Cloudflare Workers)
npx wrangler deploy
```
