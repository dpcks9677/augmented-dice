import PartySocket from "partysocket";
import { networkEngine } from "./networkEngine.js";
import { calculateScores, mutationDefinitions } from "./scoreEngine.js";
import { DiceEngine } from "./DiceEngine.js";
import { getDiceSvg, getSpecialSvg, getVariantSvg } from "./svgIcons.js";
import { setupDebugTools } from "./debugTools.js";
import { uiManager } from "./UIManager.js";
import "cropperjs/dist/cropper.css";
import { subscribeAuthState, signInWithGoogle, setNickname, getCurrentUser, saveUserToDB, getUserFromDB, signOutUser, updateUserStatusMsg, updateUserAvatar } from "./authEngine.js";
import Cropper from "cropperjs";
let augmentData = [];
fetch('/src/augments.json').then(r => r.json()).then(d => { augmentData = d; }).catch(e => console.error(e));

uiManager.mountAllViews();

// DOM 요소 캐싱
const els = {
  landingView: document.getElementById('landing-view'),
  btnGetStarted: document.getElementById('btn-get-started'),
  loginView: document.getElementById('login-view'),
  btnDummyLogin: document.getElementById('btn-dummy-login'),
  btnGoogleLogin: document.getElementById('btn-google-login'),
  nicknameSetupView: document.getElementById('nickname-setup-view'),
  nicknameInput: document.getElementById('nickname-input'),
  btnSubmitNickname: document.getElementById('btn-submit-nickname'),
  appContainer: document.getElementById('app-container'),
  
  profileSection: document.getElementById('profile-section'),
  profileNickname: document.getElementById('profile-nickname'),
  augmentSection: document.getElementById('augment-section'),
  
  matchInfoSection: document.getElementById('match-info-section'),
  tabAugmentView: document.getElementById('tab-augment-view'),
  tabMatchInfoViewFromAug: document.getElementById('tab-match-info-view-from-aug'),
  tabAugmentViewFromMatch: document.getElementById('tab-augment-view-from-match'),
  tabMatchInfoView: document.getElementById('tab-match-info-view'),
  
  matchP1Avatar: document.getElementById('match-p1-avatar'),
  matchP2Avatar: document.getElementById('match-p2-avatar'),
  matchP1Name: document.getElementById('match-p1-name'),
  matchP2Name: document.getElementById('match-p2-name'),
  gameLogContainer: document.getElementById('game-log-container'),
  
  playMenuSection: document.getElementById('play-menu-section'),
  btnPlayNormal: document.getElementById('btn-norm-hotseat'),
  btnPlayAugmented: document.getElementById('btn-aug-hotseat'),
  btnPlayNormalLobby: document.getElementById('btn-norm-lobby'),
  btnPlayAugmentedLobby: document.getElementById('btn-aug-lobby'),
  lobbySelectSection: document.getElementById('lobby-select-section'),
  btnLobbySelectBack: document.getElementById('btn-lobby-select-back'),
  btnLobbyCreate: document.getElementById('btn-lobby-create'),
  btnLobbyJoin: document.getElementById('btn-lobby-join'),
  inputLobbyJoinCode: document.getElementById('input-lobby-join-code'),
  lobbySection: document.getElementById('lobby-section'),
  lobbyModeText: document.getElementById('lobby-mode-text'),
  lobbyCodeDisplay: document.getElementById('lobby-code-display'),
  btnLobbyBack: document.getElementById('btn-lobby-back'),
  btnLobbyStart: document.getElementById('btn-lobby-start'),
  lobbyOverlay: document.getElementById('lobby-overlay'),
  myNickname: document.getElementById('my-nickname'),
  btnSingleplayer: document.getElementById('btn-singleplayer'),
  btnMultiplayer: document.getElementById('btn-multiplayer'),
  btnHotseat: document.getElementById('btn-hotseat'),
  
  multiplayerActions: document.getElementById('multiplayer-actions'),
  btnCreateRoom: document.getElementById('btn-create-room'),
  btnJoinRoom: document.getElementById('btn-join-room'),
  inputRoomCode: document.getElementById('input-room-code'),
  btnBackToLobby: document.getElementById('btn-back-to-lobby'),
  
  waitingRoom: document.getElementById('waiting-room'),
  currentRoomCode: document.getElementById('current-room-code'),
  slotP1: document.getElementById('slot-p1'),
  slotP2: document.getElementById('slot-p2'),
  btnReady: document.getElementById('btn-ready'),
  btnStart: document.getElementById('btn-start'),
  countdown: document.getElementById('countdown'),
  
  scoreTbody: document.getElementById('score-tbody'),
  diceBoardArea: document.getElementById('dice-board-area'),
  btnRoll: document.getElementById('btn-roll'),
  rollsLeft: document.getElementById('rolls-left'),
  gameStatus: document.getElementById('game-status'),
  p1Name: document.getElementById('p1-name'),
  p2Name: document.getElementById('p2-name'),
  p1Profile: document.getElementById('p1-profile'),
  p2Profile: document.getElementById('p2-profile'),
  
  endgameModal: document.getElementById('endgame-modal'),
  endgameP1Score: document.getElementById('endgame-p1-score'),
  endgameP2Score: document.getElementById('endgame-p2-score'),
  endgameWinner: document.getElementById('endgame-winner'),
  btnReturnLobby: document.getElementById('btn-return-lobby')
};

// 화면 스케일링 로직
function handleAppScaling() {
  if (!els.appContainer) return;
  const targetW = 1920;
  const targetH = 960;
  const scaleX = window.innerWidth / targetW;
  const scaleY = window.innerHeight / targetH;
  const scale = Math.min(scaleX, scaleY) * 0.96;
  els.appContainer.style.transform = `scale(${scale})`;
  els.appContainer.style.transformOrigin = 'center';
}
window.addEventListener('resize', handleAppScaling);
setTimeout(handleAppScaling, 50);

// 1. 유저 식별 (랜덤 닉네임 생성 및 캐시)
let myNickname = localStorage.getItem('ad_nickname');
if (!myNickname) {
  const adjectives = ['재빠른', '신중한', '묵직한', '황금', '이상한', '럭키'];
  const nouns = ['주사위', '스트레이트', '요트', '풀하우스', '초이스'];
  const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  myNickname = `${randAdj} ${randNoun}`;
  localStorage.setItem('ad_nickname', myNickname);
}

// 전역 상태
let socket = null;
let currentRoom = null;
let isHost = false;
let gameMode = 'none'; // 'hotseat' | 'multi'
let diceBoxReady = false;

// 게임 턴 상태
let currentPlayer = 1; // 1 or 2
let currentRound = 1; // 1 to 12
let rollsLeft = 3;
let keptDice = []; // 킵된 주사위 배열 (값만 저장)
let activeDice = []; // 방금 굴린 주사위 배열 (값만 저장)
let scores = {
  1: {}, // p1 scores
  2: {}  // p2 scores
};
let activeMutations = { 1: {}, 2: {} };
let upperBonusThreshold = { 1: 63, 2: 63 };
let playerYachtBank = { 1: 0, 2: 0 };
let yachtBankLocked = { 1: false, 2: false };
let destroyedStrangeDice = { 1: false, 2: false };
let promotionConsumed = { 1: false, 2: false };
let questProgress = { 1: {}, 2: {} };

let landingDiceEngine = null;

function getPlayerLabel(playerIndex) {
  let name = `Player ${playerIndex}`;
  const pName = playerIndex === 1 ? els.matchP1Name : els.matchP2Name;
  if (pName && pName.textContent !== `Player ${playerIndex}`) {
    name = pName.textContent;
  } else {
    const fallback = playerIndex === 1 ? els.p1Name : els.p2Name;
    if (fallback) {
      const textEl = fallback.querySelector('.name-text');
      if (textEl) name = textEl.textContent;
    }
  }
  return `P${playerIndex} (${name})`;
}
function addGameLog(message, type = 'normal', sync = false, player = 0) {
  if (!els.gameLogContainer) return;
  const emptyText = els.gameLogContainer.querySelector('.log-empty-text');
  if (emptyText) emptyText.remove();
  
  const entry = document.createElement('div');
  entry.className = `game-log-entry ${type} fade-in`;
  if (player === 1) entry.classList.add('log-p1');
  else if (player === 2) entry.classList.add('log-p2');
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  entry.appendChild(textSpan);
  
  els.gameLogContainer.appendChild(entry);
  // 부모 스크롤을 끝으로
  els.gameLogContainer.parentElement.scrollTop = els.gameLogContainer.parentElement.scrollHeight;

  // 소켓으로 메시지 쏠 경우 (sync가 true일 때)
  if (sync && window.isMultiplayer) {
    networkEngine.sendMessage({
      type: 'sync_log',
      message: message,
      logType: type,
      player: player
    });
  }
}

function setupSidebarTabs() {
  const showAugment = () => {
    if (els.augmentSection) {
      els.augmentSection.classList.remove('hidden');
      els.augmentSection.style.display = 'flex';
    }
    if (els.matchInfoSection) {
      els.matchInfoSection.classList.add('hidden');
      els.matchInfoSection.style.display = 'none';
    }
    if (els.tabAugmentView) els.tabAugmentView.classList.add('active');
    if (els.tabAugmentViewFromMatch) els.tabAugmentViewFromMatch.classList.add('active');
    if (els.tabMatchInfoView) els.tabMatchInfoView.classList.remove('active');
    if (els.tabMatchInfoViewFromAug) els.tabMatchInfoViewFromAug.classList.remove('active');
  };
  const showMatchInfo = () => {
    if (els.augmentSection) {
      els.augmentSection.classList.add('hidden');
      els.augmentSection.style.display = 'none';
    }
    if (els.matchInfoSection) {
      els.matchInfoSection.classList.remove('hidden');
      els.matchInfoSection.style.display = 'flex';
    }
    if (els.tabAugmentView) els.tabAugmentView.classList.remove('active');
    if (els.tabAugmentViewFromMatch) els.tabAugmentViewFromMatch.classList.remove('active');
    if (els.tabMatchInfoView) els.tabMatchInfoView.classList.add('active');
    if (els.tabMatchInfoViewFromAug) els.tabMatchInfoViewFromAug.classList.add('active');
  };
  
  if (els.tabAugmentView) els.tabAugmentView.addEventListener('click', showAugment);
  if (els.tabAugmentViewFromMatch) els.tabAugmentViewFromMatch.addEventListener('click', showAugment);
  if (els.tabMatchInfoView) els.tabMatchInfoView.addEventListener('click', showMatchInfo);
  if (els.tabMatchInfoViewFromAug) els.tabMatchInfoViewFromAug.addEventListener('click', showMatchInfo);
}
setupSidebarTabs();

// 로비용 주사위 엔진 초기화
setTimeout(() => {
  const landingWrapper = document.getElementById('landing-dice-wrapper');
  if (landingWrapper) {
    landingDiceEngine = new DiceEngine("#landing-dice-wrapper");
    
    // 엔진 초기화 후 애니메이션 클래스 추가 (페이드 인 & 슬라이드 업)
    requestAnimationFrame(() => {
      landingWrapper.classList.add('loaded');
    });
    
    // 자동 굴림 애니메이션 (렌더링 후 약간의 딜레이 뒤에 실행)
    setTimeout(() => {
      if (landingDiceEngine) {
        landingDiceEngine.roll(5);
      }
    }, 800);
    
    landingWrapper.addEventListener('click', () => {
      if (landingDiceEngine) {
         landingDiceEngine.roll(5);
      }
    });
  }
}, 500); // 렌더링 대기

// reCAPTCHA v3는 DOM 렌더링 함수가 필요 없으므로 기존 v2 로직은 제거합니다.

// 2. Firebase Auth 흐름 제어
subscribeAuthState(async (user) => {
  if (user) {
    // Firestore에서 유저 데이터 조회
    const userData = await getUserFromDB(user.uid);
    
    if (userData && userData.nickname) {
      // 닉네임이 설정된 로그인 유저: 메인 게임 화면으로 바로 이동
      els.landingView?.classList.add('hidden');
      els.loginView?.classList.add('hidden');
      els.nicknameSetupView?.classList.add('hidden');
      els.appContainer?.classList.remove('hidden');
      
      const nick = userData.nickname;
      if(els.myNickname) els.myNickname.textContent = nick;
      if(els.profileNickname) els.profileNickname.textContent = nick;
      
      const profileStatus = document.getElementById('profile-status-msg');
      if (profileStatus && userData.statusMsg) {
        profileStatus.textContent = userData.statusMsg;
      }
      
      // 추가 프로필 통계 바인딩
      const profilePlays = document.getElementById('profile-plays');
      if (profilePlays) profilePlays.textContent = userData.gamesPlayed || 0;
      
      const profileViews = document.getElementById('profile-views');
      if (profileViews) profileViews.textContent = userData.profileViews || 0;
      
      const profileDate = document.getElementById('profile-date');
      if (profileDate && userData.createdAt) {
        // serverTimestamp()를 Date 객체로 변환
        const dateObj = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
        profileDate.textContent = dateObj.toLocaleDateString();
      }
      
      if (userData.avatarUrl && userData.cropData) {
        // 호이스팅된 함수라 호출 가능. 혹은 렌더 함수가 하단에 정의되어 있어도 호이스팅됨.
        // renderAvatar는 main.js 하단에 정의되어 있으므로 setTimeout으로 지연 호출
        setTimeout(() => {
          if (typeof renderAvatar === 'function') {
            renderAvatar(userData.avatarUrl, userData.cropData);
          }
        }, 100);
      }
    } else {
      // DB에 회원정보(닉네임)가 없는 경우: 닉네임 설정 화면
      els.landingView?.classList.add('hidden');
      els.loginView?.classList.add('hidden');
      els.appContainer?.classList.add('hidden');
      els.nicknameSetupView?.classList.remove('hidden');
    }
  } else {
    // 비로그인 유저: 랜딩 페이지
    els.appContainer?.classList.add('hidden');
    els.loginView?.classList.add('hidden');
    els.nicknameSetupView?.classList.add('hidden');
    els.landingView?.classList.remove('hidden');
  }
});

els.btnGetStarted?.addEventListener('click', () => {
  els.landingView?.classList.add('hidden');
  els.loginView?.classList.remove('hidden');
});

els.btnGoogleLogin?.addEventListener('click', async () => {
  try {
    await signInWithGoogle();
    // 성공하면 subscribeAuthState가 알아서 뷰를 전환함
  } catch (error) {
    console.error("Login failed", error);
  }
});

const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await signOutUser();
      
      const landingView = document.getElementById('landing-view');
      if (landingView) {
        landingView.classList.remove('fade-in');
        void landingView.offsetWidth; // Reflow
        landingView.classList.add('fade-in');
      }
      
      if (typeof landingDiceEngine !== 'undefined' && landingDiceEngine) {
        setTimeout(() => {
          landingDiceEngine.roll(5);
        }, 100);
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  });
}

const profileStatus = document.getElementById('profile-status-msg');
const btnEditStatus = document.getElementById('btn-edit-status');
const profileStatusInput = document.getElementById('profile-status-input');

if (btnEditStatus && profileStatus && profileStatusInput) {
  let isEditing = false;
  const iconEdit = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
  const iconSave = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;

  const saveStatus = async () => {
    const user = getCurrentUser();
    if (!user) return;
    
    const newMsg = profileStatusInput.value.trim().substring(0, 30);
    if(newMsg === "") {
      alert("소개말을 입력해주세요.");
      return;
    }
    
    const success = await updateUserStatusMsg(user.uid, newMsg);
    if (success) {
      profileStatus.textContent = newMsg;
    } else {
      alert("소개말 업데이트에 실패했습니다.");
    }
    
    isEditing = false;
    profileStatusInput.classList.add('hidden');
    profileStatus.classList.remove('hidden');
    btnEditStatus.innerHTML = iconEdit;
    btnEditStatus.title = "프로필 편집";
    const avatarCtr = document.getElementById('profile-avatar-container');
    if (avatarCtr) avatarCtr.classList.remove('editing');
  };

  btnEditStatus.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) return;
    
    if (!isEditing) {
      isEditing = true;
      profileStatus.classList.add('hidden');
      profileStatusInput.classList.remove('hidden');
      profileStatusInput.value = profileStatus.textContent;
      profileStatusInput.focus();
      btnEditStatus.innerHTML = iconSave;
      btnEditStatus.title = "저장";
      const avatarCtr = document.getElementById('profile-avatar-container');
      if (avatarCtr) avatarCtr.classList.add('editing');
    } else {
      saveStatus();
    }
  });

  profileStatusInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      saveStatus();
    }
  });
}

els.btnSubmitNickname?.addEventListener('click', async () => {
  const nickname = els.nicknameInput?.value.trim();
  if (!nickname) {
    alert("닉네임을 입력해주세요!");
    return;
  }
  
  // reCAPTCHA v3 검증 (백그라운드 토큰 발급)
  if (typeof grecaptcha !== 'undefined') {
    try {
      await new Promise((resolve, reject) => {
        grecaptcha.ready(async () => {
          try {
            const token = await grecaptcha.execute('6LdKulgtAAAAAJgJb6_hEQJNE7hKre6Ab8EURscy', {action: 'submit'});
            if (!token) reject("토큰 발급 실패");
            else resolve();
          } catch(e) {
            reject(e);
          }
        });
      });
    } catch (e) {
      alert("자동가입 방지(reCAPTCHA) 검증에 실패했습니다. 다시 시도해주세요.");
      return;
    }
  }

  try {
    const user = getCurrentUser();
    if (user) {
      await setNickname(user, nickname);
      // Firestore DB에 데이터 병합
      await saveUserToDB(user.uid, nickname);
      
      // 설정 완료 플래그 저장 (현재 기기 fallback)
      localStorage.setItem('isNicknameSet_' + user.uid, 'true');
      
      // 화면 전환
      els.nicknameSetupView?.classList.add('hidden');
      els.appContainer?.classList.remove('hidden');
      if(els.myNickname) els.myNickname.textContent = nickname;
      if(els.profileNickname) els.profileNickname.textContent = nickname;
      
      // 신규가입 UI 업데이트
      const profilePlays = document.getElementById('profile-plays');
      if (profilePlays) profilePlays.textContent = 0;
      
      const profileViews = document.getElementById('profile-views');
      if (profileViews) profileViews.textContent = 0;
      
      const profileDate = document.getElementById('profile-date');
      if (profileDate) profileDate.textContent = new Date().toLocaleDateString();
    }
  } catch(e) {
    alert("닉네임 설정 중 오류가 발생했습니다.");
    console.error(e);
  }
});

// (임시) 이메일 로그인 버튼 동작 유지


// 기존 멀티플레이어 흐름 제어 (요소 없을 시 대비)
els.btnMultiplayer?.addEventListener('click', () => {
  els.btnHotseat?.classList.add('hidden');
  els.btnSingleplayer?.classList.add('hidden');
  els.btnMultiplayer?.classList.add('hidden');
  els.multiplayerActions?.classList.remove('hidden');
});

els.btnBackToLobby?.addEventListener('click', () => {
  els.multiplayerActions?.classList.add('hidden');
  els.btnHotseat?.classList.remove('hidden');
  els.btnSingleplayer?.classList.remove('hidden');
  els.btnMultiplayer?.classList.remove('hidden');
});

// 방 생성/입장 로직 (멀티플레이)
els.btnCreateRoom?.addEventListener('click', () => {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  joinRoom(code, true);
});
els.btnJoinRoom?.addEventListener('click', () => {
  const code = els.inputRoomCode?.value.toUpperCase();
  if (code && code.length === 4) joinRoom(code, false);
});

function joinRoom(roomId, asHost) {
  currentRoom = roomId;
  isHost = asHost;
  gameMode = 'multi';
  els.multiplayerActions.classList.add('hidden');
  els.waitingRoom.classList.remove('hidden');
  els.currentRoomCode.textContent = roomId;
  
  if (isHost) {
    els.btnStart.classList.remove('hidden');
    els.btnReady.classList.add('hidden');
    els.slotP1.querySelector('.name').textContent = myNickname;
  } else {
    els.btnStart.classList.add('hidden');
    els.btnReady.classList.remove('hidden');
    els.slotP2.querySelector('.name').textContent = myNickname;
  }

  socket = new PartySocket({ host: window.location.host, room: roomId });
  socket.addEventListener("message", (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'join') {
      if (!isHost && data.isHost) els.slotP1.querySelector('.name').textContent = data.nickname;
      else if (isHost && !data.isHost) {
        els.slotP2.querySelector('.name').textContent = data.nickname;
        els.btnStart.disabled = false;
      }
    }
  });
  socket.send(JSON.stringify({ type: 'join', nickname: myNickname, isHost }));
}

// -----------------------------------------------------
// 3. 로컬 핫시트 모드 로직 (코어 게임 루프)
// -----------------------------------------------------

function transitionToPlaying(mode) {
  if (!els.appContainer) return;
  
  // 1. 페이드 아웃 시작
  els.appContainer.style.opacity = '0';
  
  setTimeout(() => {
    // 2. 완전히 투명해진 상태에서 레이아웃 전환 및 게임 초기화
    els.appContainer.classList.remove('mode-select-state');
    els.appContainer.classList.add('playing-state');
    
    if (mode === 'hotseat') {
      els.appContainer.classList.add('normal-mode');
    } else {
      els.appContainer.classList.remove('normal-mode');
    }
    
    gameMode = mode;
    if (els.p1Name) els.p1Name.querySelector('.name-text').textContent = "Player 1";
    if (els.p2Name) els.p2Name.querySelector('.name-text').textContent = "Player 2";
    
    if (mode === 'hotseat') {
      showMatchInfo();
    } else {
      showAugment();
    }
    
    startHotseatGame();
    
    // 3. 다시 페이드 인
    requestAnimationFrame(() => {
      els.appContainer.style.opacity = '1';
    });
  }, 600); // style.css의 opacity 0.6s 전환 시간과 동일하게 대기
}

els.btnPlayNormal?.addEventListener('click', () => {
  try {
    transitionToPlaying('hotseat');
  } catch (err) {
    alert("오류 발생: " + err.message + "\n" + err.stack);
    console.error(err);
  }
});

els.btnPlayAugmented?.addEventListener('click', () => {
  try {
    transitionToPlaying('augmented-hotseat');
  } catch (err) {
    alert("오류 발생: " + err.message + "\n" + err.stack);
    console.error(err);
  }
});

// --- Lobby Flow ---
let lobbyWaitingInterval = null;
let waitingDotsCount = 3;

function startLobbyWaitingAnimation() {
  if (lobbyWaitingInterval) clearInterval(lobbyWaitingInterval);
  lobbyWaitingInterval = setInterval(() => {
    waitingDotsCount = (waitingDotsCount % 3) + 1;
    const dots = '.'.repeat(waitingDotsCount);
    const slots = els.lobbySection.querySelectorAll('.lobby-player-slot.empty');
    slots.forEach(slot => {
      const nameElem = slot.querySelector('.player-name');
      if (nameElem) {
        nameElem.textContent = `Waiting${dots}`;
      }
    });
  }, 750);
}

function stopLobbyWaitingAnimation() {
  if (lobbyWaitingInterval) {
    clearInterval(lobbyWaitingInterval);
    lobbyWaitingInterval = null;
  }
}

function showLobbySelect(mode) {
  window.pendingLobbyMode = mode;
  els.appContainer.classList.remove('mode-select-state', 'playing-state', 'normal-mode', 'lobby-state');
  els.appContainer.classList.add('lobby-select-state');
  els.inputLobbyJoinCode.value = '';
}

function showLobby(isHost, joinCode = null) {
  els.appContainer.classList.remove('lobby-select-state');
  els.appContainer.classList.add('lobby-state');
  startLobbyWaitingAnimation();
  
  if (window.pendingLobbyMode === 'normal') {
    els.lobbyModeText.textContent = '요트 다이스';
  } else {
    els.lobbyModeText.textContent = '증강 요트 다이스';
  }

  const myName = els.profileNickname?.textContent || "Player 1";
  const slots = els.lobbySection.querySelectorAll('.lobby-player-slot');
  if (slots.length > 0) {
    const p1NameElem = slots[0].querySelector('.player-name');
    if (p1NameElem) p1NameElem.textContent = myName;

    const p1AvatarElem = slots[0].querySelector('.player-avatar');
    if (p1AvatarElem && window.myPlayerInfo && window.myPlayerInfo.avatarUrl) {
      p1AvatarElem.style.backgroundImage = `url(${window.myPlayerInfo.avatarUrl})`;
      p1AvatarElem.style.backgroundSize = 'cover';
      p1AvatarElem.style.backgroundPosition = 'center';
    } else if (p1AvatarElem) {
      p1AvatarElem.style.backgroundImage = 'none';
      p1AvatarElem.style.backgroundColor = '#ccc';
    }
  }
  
  if (isHost) {
    // 랜덤 로비 코드 생성 (6자리 대문자)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    els.lobbyCodeDisplay.textContent = code;
    els.btnLobbyStart.textContent = '게임 시작';
    networkEngine.connectToLobby(code);
  } else {
    els.lobbyCodeDisplay.textContent = joinCode.toUpperCase();
    els.btnLobbyStart.textContent = '준비 (Ready)';
    networkEngine.connectToLobby(joinCode);
  }

  // 로비 상태 초기화
  window.isReady = false;
  els.btnLobbyStart.classList.remove('ready');
}

// 네트워크 이벤트 리스너 등록
networkEngine.on('lobby_state', (data) => {
  const players = data.players || [];
  window.lobbyPlayers = players;
  const slots = els.lobbySection.querySelectorAll('.lobby-player-slot');
  
  // 모든 슬롯 초기화
  slots.forEach(slot => {
    slot.className = 'lobby-player-slot empty';
    const nameElem = slot.querySelector('.player-name');
    if (nameElem) nameElem.textContent = `Waiting${'.'.repeat(waitingDotsCount)}`;
    const avatarElem = slot.querySelector('.player-avatar');
    if (avatarElem) {
      avatarElem.style.backgroundImage = 'none';
      avatarElem.style.backgroundColor = '#ccc';
    }
    const statusElem = slot.querySelector('.player-status');
    if (statusElem) {
      statusElem.textContent = '';
      statusElem.className = 'player-status';
    }
  });

  // 서버에서 받은 유저 정보로 채우기
  players.forEach((p, index) => {
    if (index >= slots.length) return;
    const slot = slots[index];
    slot.className = 'lobby-player-slot' + (p.isHost ? ' host' : '') + (p.isReady ? ' ready-state' : '');
    
    const nameElem = slot.querySelector('.player-name');
    if (nameElem) {
      nameElem.textContent = p.nickname;
    }
    
    const avatarElem = slot.querySelector('.player-avatar');
    if (avatarElem) {
      if (p.avatarUrl) {
        avatarElem.style.backgroundImage = `url(${p.avatarUrl})`;
        avatarElem.style.backgroundSize = 'cover';
        avatarElem.style.backgroundPosition = 'center';
      } else {
        avatarElem.style.backgroundImage = 'none';
        avatarElem.style.backgroundColor = '#ccc';
      }
    }

    const statusElem = slot.querySelector('.player-status');
    if (statusElem) {
      if (p.isHost || p.isReady) {
        statusElem.textContent = '✓';
        statusElem.className = 'player-status ready';
      } else {
        statusElem.innerHTML = '<span>•</span><span>•</span><span>•</span>';
        statusElem.className = 'player-status not-ready';
      }
    }
  });

  // 내가 호스트인지 확인하고 버튼 제어
  const myConnId = networkEngine.socket?.id; // PartySocket id
  const me = players.find(p => p.connId === myConnId);
  if (me) {
    window.myPlayerInfo = me;
    if (me.isHost) {
      els.btnLobbyStart.textContent = '게임 시작';
      const allReady = players.every(p => p.isReady);
      els.btnLobbyStart.disabled = players.length <= 1 || !allReady; 
    } else {
      els.btnLobbyStart.textContent = me.isReady ? '준비 완료 (Cancel)' : '준비 (Ready)';
      els.btnLobbyStart.disabled = false;
    }
  }
});

networkEngine.on('game_started', () => {
  stopLobbyWaitingAnimation();
  // 로비 숨기고 실제 게임 화면으로 이동
  els.appContainer.classList.remove('lobby-state');
  
  if (window.pendingLobbyMode === 'normal') {
    els.appContainer.classList.add('playing-state', 'normal-mode');
  } else {
    els.appContainer.classList.add('playing-state');
  }
  
  window.isMultiplayer = true;
  startMultiplayerGame();
});

networkEngine.on('ingame_message', (data) => {
  if (!window.isMultiplayer || currentPlayer === window.myPlayerIndex) return;

  if (data.type === 'physics_sync') {
    if (diceEngine) diceEngine.applyPhysicsUpdate(data.transforms);
  } else if (data.type === 'sync_roll') {
    rollsLeft = data.rollsLeft;
    updateRollsUI();
    clearScorePreviews();
    if (diceEngine) diceEngine.roll(data.specialConfigs, true);
  } else if (data.type === 'sync_roll_end') {
    if (diceEngine) {
      diceEngine.forceRollEnd(data.finalValues);
      diceEngine.diceArray.forEach(die => die.isKept = false);
      keptDice = [];
      activeDice = diceEngine.diceArray.filter(d => d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
      diceEngine.arrangeAll(true);
      updateScorePreviews();
    }
  } else if (data.type === 'sync_keep') {
    if (diceEngine) {
      const die = diceEngine.diceArray[data.dieIndex];
      if (die) {
        die.isKept = data.isKept;
        if (die.isKept) {
          const usedSlots = diceEngine.diceArray.filter(d => d.isKept && d !== die).map(d => d.keepSlot);
          let firstEmpty = 0;
          for (let i = 0; i < 5; i++) {
            if (!usedSlots.includes(i)) {
              firstEmpty = i;
              break;
            }
          }
          die.keepSlot = firstEmpty;
        } else {
          die.keepSlot = null;
        }
        diceEngine.arrangeAll(false, die);
        activeDice = diceEngine.diceArray.filter(d => !d.isKept && d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
        keptDice = diceEngine.diceArray.filter(d => d.isKept && d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
        updateScorePreviews();
      }
    }
  } else if (data.type === 'sync_score') {
    lockScore(data.catId, data.scoreInfo, true);
  } else if (data.type === 'sync_log') {
    addGameLog(data.message, data.logType, false, data.player);
  }
});

els.btnPlayNormalLobby?.addEventListener('click', () => {
  showLobbySelect('normal');
});

els.btnPlayAugmentedLobby?.addEventListener('click', () => {
  showLobbySelect('augmented');
});

els.btnLobbySelectBack?.addEventListener('click', () => {
  els.appContainer.classList.remove('lobby-select-state');
  els.appContainer.classList.add('mode-select-state');
});

els.btnLobbyCreate?.addEventListener('click', () => {
  showLobby(true);
});

els.btnLobbyJoin?.addEventListener('click', () => {
  const code = els.inputLobbyJoinCode.value.trim();
  if (code.length !== 6) {
    alert('6자리의 참여 코드를 입력해주세요.');
    return;
  }
  showLobby(false, code);
});

els.btnLobbyBack?.addEventListener('click', () => {
  networkEngine.disconnect();
  stopLobbyWaitingAnimation();
  els.appContainer.classList.remove('lobby-state');
  els.appContainer.classList.add('lobby-select-state');
});

els.btnLobbyStart?.addEventListener('click', () => {
  const myConnId = networkEngine.socket?.id;
  // players를 직접 알 수는 없지만, UI 상태로 판단
  if (els.btnLobbyStart.textContent.includes('게임 시작')) {
    networkEngine.startGame();
  } else {
    window.isReady = !window.isReady;
    networkEngine.setReady(window.isReady);
  }
});

els.btnHotseat?.addEventListener('click', () => {
  try {
    gameMode = 'hotseat';
    els.lobbyOverlay?.classList.add('hidden');
    els.p1Name.querySelector('.name-text').textContent = "Player 1";
    els.p2Name.querySelector('.name-text').textContent = "Player 2";
    
    startHotseatGame();
  } catch (err) {
    alert("오류 발생: " + err.message + "\n" + err.stack);
    console.error(err);
  }
});

function startHotseatGame() {
  currentPlayer = 1;
  currentRound = 1;
  scores = { 1: {}, 2: {} };
  activeMutations = { 1: {}, 2: {} };
  upperBonusThreshold = { 1: 63, 2: 63 };
  playerYachtBank = { 1: 0, 2: 0 };
  yachtBankLocked = { 1: false, 2: false };
  destroyedStrangeDice = { 1: false, 2: false };
  promotionConsumed = { 1: false, 2: false };
  updateScoreboard();
  startTurn();
}

function startMultiplayerGame() {
  // 방장은 1P, 게스트는 2P (현재 2인 대전 기준)
  window.myPlayerIndex = window.myPlayerInfo?.isHost ? 1 : 2;
  
  currentPlayer = 1;
  currentRound = 1;
  scores = { 1: {}, 2: {} };
  activeMutations = { 1: {}, 2: {} };
  upperBonusThreshold = { 1: 63, 2: 63 };
  playerYachtBank = { 1: 0, 2: 0 };
  yachtBankLocked = { 1: false, 2: false };
  destroyedStrangeDice = { 1: false, 2: false };
  promotionConsumed = { 1: false, 2: false };
  
  const isNormalMode = window.pendingLobbyMode === 'normal';
  gameMode = isNormalMode ? 'normal' : 'augmented';
  
  if (gameMode === 'normal') {
    showMatchInfo();
  } else {
    showAugment();
  }

  // VS 프로필 초기화
  if (window.lobbyPlayers && window.lobbyPlayers.length >= 2) {
    const p1 = window.lobbyPlayers.find(p => p.isHost);
    const p2 = window.lobbyPlayers.find(p => !p.isHost);
    if (p1 && els.matchP1Name) els.matchP1Name.textContent = p1.nickname;
    if (p1 && els.matchP1Avatar) {
      els.matchP1Avatar.style.backgroundImage = p1.avatarUrl ? `url(${p1.avatarUrl})` : 'none';
    }
    if (p2 && els.matchP2Name) els.matchP2Name.textContent = p2.nickname;
    if (p2 && els.matchP2Avatar) {
      els.matchP2Avatar.style.backgroundImage = p2.avatarUrl ? `url(${p2.avatarUrl})` : 'none';
    }
  }

  // 게임 로그 초기화
  if (els.gameLogContainer) {
    els.gameLogContainer.innerHTML = '';
  }

  updateScoreboard();
  startTurn();
}

function showAugmentSelectionModal(player, onSelect) {
  const modal = document.getElementById('augment-selection-modal');
  const title = document.getElementById('augment-modal-title');
  const optionsContainer = document.getElementById('augment-options');
  
  if (!modal || !title || !optionsContainer) return;
  
  title.textContent = `Player ${player} 증강 선택`;
  optionsContainer.innerHTML = '';
  
  const shuffled = [...augmentData].sort(() => 0.5 - Math.random());
  const selectedAugments = shuffled.slice(0, 3);
  
  selectedAugments.forEach(aug => {
    const btn = document.createElement('div');
    btn.className = 'augment-option';
    let desc = aug.description || aug.name + ' 증강이 적용됩니다.';
    // removed <br> replacement
    
    const icon = aug.icon || getVariantSvg(aug.mutationId) || '';
    btn.innerHTML = `
      <div class="aug-slot-header">${icon} <span class="aug-slot-name">${aug.name}</span></div>
      <div class="aug-slot-desc">${desc}</div>
    `;
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
      if (window.applyMutation) window.applyMutation(player, aug.mutationId);
      if (onSelect) onSelect();
    });
    optionsContainer.appendChild(btn);
  });
  
  modal.classList.remove('hidden');
}

function startTurn() {
  rollsLeft = 3;
  keptDice = [];
  activeDice = [];
  updateRollsUI();
  clearScorePreviews();
  
  els.gameStatus.textContent = `P${currentPlayer}의 턴 (라운드 ${currentRound}/12)`;
  els.p1Name.classList.toggle('active-turn', currentPlayer === 1);
  els.p2Name.classList.toggle('active-turn', currentPlayer === 2);
  
  const isMyTurnForLog = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  if (isMyTurnForLog) {
    if (currentRound === 1 && currentPlayer === 1) {
      addGameLog('게임 시작!', 'turn-start', true);
    }
    addGameLog(`${getPlayerLabel(currentPlayer)}의 턴 (${currentRound} 라운드)`, 'turn-start', true, currentPlayer);
  }
  els.p1Profile.classList.toggle('active-turn', currentPlayer === 1);
  els.p2Profile.classList.toggle('active-turn', currentPlayer === 2);
  
  // 멀티플레이어 권한 잠금
  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  
  if (typeof updateAugmentSidebar === 'function') updateAugmentSidebar(currentPlayer);
  
  if (gameMode === 'augmented-hotseat') {
    const currentAugCount = Object.keys(activeMutations[currentPlayer] || {}).length;
    let expectedCount = 0;
    if (currentRound >= 1) expectedCount = 1;
    if (currentRound >= 6) expectedCount = 2;
    if (currentRound >= 9) expectedCount = 3;
    
    if (currentAugCount < expectedCount) {
      els.btnRoll.disabled = true;
      showAugmentSelectionModal(currentPlayer, () => {
        if (currentPlayer === 1) {
          const p2Count = Object.keys(activeMutations[2] || {}).length;
          if (p2Count < expectedCount) {
            if (typeof updateAugmentSidebar === 'function') updateAugmentSidebar(2);
            showAugmentSelectionModal(2, () => {
              if (typeof updateAugmentSidebar === 'function') updateAugmentSidebar(1);
              if (diceBoxReady) els.btnRoll.disabled = !isMyTurn;
            });
            return;
          }
        }
        if (diceBoxReady) els.btnRoll.disabled = !isMyTurn;
      });
      return;
    }
  }
  
  if (diceBoxReady) {
    els.btnRoll.disabled = !isMyTurn;
  }
}

function updateRollsUI() {
  els.rollsLeft.textContent = `남은 굴리기: ${rollsLeft}`;
  els.btnRoll.disabled = rollsLeft <= 0 || !diceBoxReady;
  if (typeof diceEngine !== 'undefined' && diceEngine) {
    const activeMuts = Object.values(activeMutations[currentPlayer] || {});
    let baseDiceCount = 5;
    const totalDiceAllowed = baseDiceCount + (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer] ? 1 : 0) + (activeMuts.includes('promotion-die') && !promotionConsumed[currentPlayer] ? 1 : 0);
    
    // 주사위 굴리기 기회가 남았거나, 고를 수 있는 주사위가 5개를 초과할 때(5개를 선택해야 하므로) 킵을 허용
    const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
    diceEngine.allowKeep = isMyTurn && ((rollsLeft > 0) || (totalDiceAllowed > 5));
  }
}

// 주사위 굴림
els.btnRoll.addEventListener('click', async () => {
  // 로비(자유 연습) 모드일 경우 코어 게임 로직을 무시하고 무한 굴리기
  if (els.appContainer?.classList.contains('mode-select-state')) {
    els.btnRoll.disabled = true;
    
    // 킵된 주사위 외의 나머지만 굴림
    const keptCount = diceEngine.diceArray.filter(d => d.isKept).length;
    const specialConfigs = [];
    for(let i=0; i < 5 - keptCount; i++) specialConfigs.push({ type: 'normal' });
    
    diceEngine.cleanUpDeadDice();
    await diceEngine.roll(specialConfigs);
    
    setTimeout(() => {
      // 본 게임과 동일하게 굴린 후에는 모든 주사위 킵을 풀고 중앙(버건디 매트)에 정렬
      diceEngine.diceArray.forEach(die => die.isKept = false);
      diceEngine.arrangeAll(true);
      if (diceBoxReady) els.btnRoll.disabled = false;
    }, 100);
    return;
  }

  // 실제 게임 모드 로직
  if (rollsLeft <= 0) return;
  
  rollsLeft--;
  updateRollsUI();
  els.btnRoll.disabled = true; // 굴리는 중 비활성화
  clearScorePreviews();
  
  // 구성(config) 생성
  const activeMuts = Object.values(activeMutations[currentPlayer] || {});
  let baseDiceCount = 5;
  const specialConfigs = [];
  
  if (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer]) {
     specialConfigs.push({ type: 'weird' });
  }
  if (activeMuts.includes('promotion-die') && !promotionConsumed[currentPlayer]) {
     specialConfigs.push({ type: 'promotion', promotionLevel: currentRound - 1 });
  }
  
  let heavyCount = activeMuts.includes('weighted-dice') ? 1 : 0;
  let goldenCount = activeMuts.includes('golden-die') ? 1 : 0;
  let octCount = activeMuts.includes('8-sided') ? 2 : 0;
  let coupleCount = activeMuts.includes('couple-dice') ? 2 : 0;
  let sevensCount = activeMuts.includes('sevens-dice') ? 2 : 0;
  
  // 킵된 주사위에서 소모된 수량 차감
  const keptConfigs = diceEngine.diceArray.filter(d => d.isKept).map(d => d.config.type);
  keptConfigs.forEach(t => {
     if (t === 'heavy') heavyCount--;
     else if (t === 'golden') goldenCount--;
     else if (t === 'octahedron') octCount--;
     else if (t === 'couple') coupleCount--;
     else if (t === 'sevens') sevensCount--;
     else if (t === 'weird') {
       const idx = specialConfigs.findIndex(c => c.type === 'weird');
       if (idx !== -1) specialConfigs.splice(idx, 1);
     }
     else if (t === 'promotion') {
       const idx = specialConfigs.findIndex(c => c.type === 'promotion');
       if (idx !== -1) specialConfigs.splice(idx, 1);
     }
  });
  
  for(let i=0; i<heavyCount; i++) specialConfigs.push({ type: 'heavy' });
  for(let i=0; i<goldenCount; i++) specialConfigs.push({ type: 'golden' });
  for(let i=0; i<octCount; i++) specialConfigs.push({ type: 'octahedron' });
  for(let i=0; i<coupleCount; i++) specialConfigs.push({ type: 'couple' });
  for(let i=0; i<sevensCount; i++) specialConfigs.push({ type: 'sevens' });
  
  const totalDiceAllowed = baseDiceCount + (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer] ? 1 : 0) + (activeMuts.includes('promotion-die') && !promotionConsumed[currentPlayer] ? 1 : 0);
  const normalCountToRoll = totalDiceAllowed - keptConfigs.length - specialConfigs.length;
  
  for(let i=0; i<normalCountToRoll; i++) specialConfigs.push({ type: 'normal' });

  // Custom Dice Engine Roll
  diceEngine.cleanUpDeadDice();
  
  const rolledCount = specialConfigs.length;
  if (keptConfigs.length === 0) {
    addGameLog(`주사위 ${rolledCount}개를 굴렸습니다.`, 'roll-action', window.isMultiplayer, currentPlayer);
  } else {
    const keptValues = diceEngine.diceArray.filter(d => d.isKept).map(d => d.value).sort((a,b)=>a-b);
    addGameLog(`주사위 [${keptValues.join(', ')}]를 킵하고 ${rolledCount}개를 다시 굴렸습니다.`, 'roll-action', window.isMultiplayer, currentPlayer);
  }
  
  if (window.isMultiplayer) {
    networkEngine.sendMessage({ type: 'sync_roll', specialConfigs, rollsLeft });
  }
  
  const results = await diceEngine.roll(specialConfigs);
  
  if (window.isMultiplayer) {
    const finalValues = diceEngine.diceArray.map(d => d.value);
    networkEngine.sendMessage({ type: 'sync_roll_end', finalValues });
  }
  
  // Arrange them after a short delay
  setTimeout(() => {
    // 리롤 시 모든 주사위를 버건디 매트(중앙)에 함께 정렬하기 위해 킵 상태 초기화
    diceEngine.diceArray.forEach(die => die.isKept = false);
    
    
    // 로컬 상태 동기화
    keptDice = [];
    activeDice = diceEngine.diceArray.filter(d => d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    
    addGameLog(`주사위의 값이 나왔습니다. [${activeDice.join(', ')}]`, 'roll-result', window.isMultiplayer, currentPlayer);
    
    diceEngine.arrangeAll(true);
    
    updateScorePreviews();
    
    els.btnRoll.disabled = rollsLeft <= 0;
  }, 100); // 틱틱거림 방지를 위해 딜레이 대폭 축소
});

// 점수 미리보기
function updateScorePreviews() {
  clearScorePreviews();
  const allDice = [...keptDice, ...activeDice];
  
  if (allDice.length > 5) {
    if (keptDice.length === 5) {
      previewScores(keptDice);
    } else {
      showNotSelectedState(5 - keptDice.length);
    }
  } else {
    if (allDice.length === 5) {
      previewScores(allDice);
    }
  }
}

function showNotSelectedState(neededCount) {
  categories.forEach(cat => {
    if (cat.isDivider) return;
    const cellId = `p${currentPlayer}-${cat.id}`;
    const cell = document.getElementById(cellId);
    
    // 이미 확정된 점수면 스킵
    if (scores[currentPlayer][cat.id] !== undefined) return;
    
    // "선택되지 않음" 상태 적용
    cell.textContent = '-';
    cell.style.color = '#888';
    cell.classList.remove('suggested');
    cell.onclick = null;
    cell.title = `족보에 기입할 주사위를 ${neededCount}개 선택해주세요.`;
  });
}

function previewScores(diceArray) {
  // Get full dice array from engine to pass configs to scoreEngine if needed
  const fullDiceObjects = diceEngine.diceArray.map(d => ({ value: d.value, type: d.config.type }));
  if (diceArray.length !== 5) return;
  const potentialScores = calculateScores(diceArray, activeMutations[currentPlayer], { bank: playerYachtBank[currentPlayer], fullDice: fullDiceObjects });
  
  categories.forEach(cat => {
    if (cat.isDivider) return;
    const cellId = `p${currentPlayer}-${cat.id}`;
    const cell = document.getElementById(cellId);
    
    // 이미 확정된 점수면 건너뜀
    if (scores[currentPlayer][cat.id] !== undefined) return;
    
    const scoreObj = typeof potentialScores[cat.id] === 'object' ? potentialScores[cat.id] : { score: potentialScores[cat.id], bonus: 0 };
    let scoreText = scoreObj.score.toString();
    if (scoreObj.bonus > 0) {
      scoreText += ` <span style="color: #D4AF37;">+${scoreObj.bonus}</span>`;
    }

    // 요트 뱅크: 미리보기 시에도 뱅크 이자 값을 함께 표시 (예: 0 (+4))
    if (cat.id === 'yacht' && activeMutations[currentPlayer]['yacht'] === 'yacht-bank') {
      scoreText = `${scoreObj.score} (+${playerYachtBank[currentPlayer]})`;
    }
    
    cell.innerHTML = scoreText;
    cell.style.color = ''; // 인라인 색상 초기화 (suggested 클래스 적용을 위해)
    cell.classList.add('suggested');
    
    // 클릭 시 확정
    const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
    if (isMyTurn) {
      cell.onclick = () => lockScore(cat.id, potentialScores[cat.id]);
    }
  });
}

function clearScorePreviews() {
  categories.forEach(cat => {
    if (cat.isDivider) return;
    [1, 2].forEach(p => {
      const cell = document.getElementById(`p${p}-${cat.id}`);
      if (scores[p][cat.id] === undefined) {
        cell.style.color = ''; // 인라인 색상 초기화
        cell.classList.remove('suggested');
        cell.onclick = null; // 이벤트 제거
        cell.title = '';
      }
    });
  });
  updateScoreboard(); // 여기서 빈 족보와 요트 뱅크 표시를 올바르게 다시 렌더링
}

function getUpperSum(player) {
  const upperCats = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes'];
  return upperCats.reduce((sum, catId) => {
    let scoreVal = scores[player][catId];
    let score = scoreVal ? (typeof scoreVal === 'object' ? scoreVal.score : scoreVal) : 0; // upper 보너스 계산 시 순수 점수만 반영인지 전체합인지? (룰에 따르면 상단 계산 제외 항목이 있음)
    // Actually, usually bonus is included if not specifically excluded, let's include score.score. Wait, bonus is handled separately.
    
    const mutId = activeMutations[player][catId];
    if (mutId && mutationDefinitions[mutId].excludeFromUpper) {
      score = 0; // 상단 보너스 합산 제외
    }
    return sum + score;
  }, 0);
}

function lockScore(catId, scoreInfo, isSync = false) {
  if (rollsLeft === 3 && activeDice.length === 0 && keptDice.length === 0) return;
  
  if (window.isMultiplayer && !isSync) {
    networkEngine.sendMessage({ type: 'sync_score', catId, scoreInfo });
  }
  
  // scoreInfo might be an object { score, bonus } or a number
  let scoreObj = typeof scoreInfo === 'object' ? scoreInfo : { score: scoreInfo, bonus: 0 };
  scores[currentPlayer][catId] = scoreObj;
  
  const catNames = {
    aces: 'Aces', twos: 'Deuces', threes: 'Threes', fours: 'Fours', fives: 'Fives', sixes: 'Sixes',
    choice: 'Choice', '4oak': '4 of a Kind', fullhouse: 'Full House', 's-straight': 'S. Straight', 'l-straight': 'L. Straight', yacht: 'Yacht'
  };
  const cName = catNames[catId] || catId;
  addGameLog(`[${cName}] 족보에 ${scoreObj.score}점을 기록했습니다.`, 'score-record', false, currentPlayer);


  // 이상한 주사위 파괴 체크 (굴려서 6이 나오면 무조건 파괴)
  diceEngine.diceArray.forEach(d => {
    if (d.config.type === 'weird' && d.value === 6) {
       destroyedStrangeDice[currentPlayer] = true;
    }
  });
  
  // 프로모션 주사위 소모 체크 (족보에 최종 기입된 5개의 주사위에 포함되었을 때만 소모)
  const usedDice = diceEngine.diceArray.length > 5 ? diceEngine.diceArray.filter(d => d.isKept) : diceEngine.diceArray;
  usedDice.forEach(d => {
    if (d.config.type === 'promotion') {
       promotionConsumed[currentPlayer] = true;
    }
  });
  
  let isYacht = false;
  if (catId === 'yacht') {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const allDice = [...keptDice, ...activeDice];
    allDice.forEach(d => counts[d]++);
    isYacht = counts.some(c => c >= 5);
  }

  // 요트 뱅크 로직 처리: 상대방이 요트 달성 시 모두의 뱅크 잠김
  if (catId === 'yacht' && isYacht) {
    yachtBankLocked[1] = true;
    yachtBankLocked[2] = true;
  }
  
  // 보너스(63점 이상 달성 시 35점 추가) 체크
  const upperSum = getUpperSum(currentPlayer);
  if (upperSum >= upperBonusThreshold[currentPlayer]) {
    scores[currentPlayer]['bonus'] = 35;
  }
  
  const cell = document.getElementById(`p${currentPlayer}-${catId}`);
  
  let scoreText = '';
  if (typeof scoreInfo === 'object') {
    scoreText = `${scoreInfo.score}`;
    if (scoreInfo.bonusDetails && scoreInfo.bonusDetails.length > 0) {
      scoreInfo.bonusDetails.forEach(b => {
        const sign = b.value > 0 ? '+' : '';
        scoreText += ` <span style="color: ${b.color};">${sign}${b.value}</span>`;
      });
    } else if (scoreInfo.bonus > 0) {
      scoreText += ` <span style="color: #D4AF37;">+${scoreInfo.bonus}</span>`;
    }
  } else {
    scoreText = scoreInfo;
  }
  
  cell.innerHTML = scoreText;
  cell.classList.remove('suggested');
  cell.classList.add('filled');
  cell.onclick = null; // 클릭 해제
  
  // 특수 족보 완성 확인 (Choice 포함)
  const specialCats = ['choice', '4oak', 'fullhouse', 's-straight', 'l-straight', 'yacht'];
  const isSpecial = specialCats.includes(catId) && scoreObj.score > 0;
  
  diceEngine.playClearAnimation(isSpecial); // 애니메이션 실행
  
  // 라운드 종료(2P 턴 종료) 시 요트 뱅크 이자 적립
  if (currentPlayer === 2) {
    [1, 2].forEach(p => {
      if (activeMutations[p]['yacht'] === 'yacht-bank' && !yachtBankLocked[p] && scores[p]['yacht'] === undefined) {
        playerYachtBank[p] += 2;
      }
    });
  }
  
  clearScorePreviews();
  updateScoreboard();
  
  // 턴 전환 로직
  if (currentPlayer === 1) {
    currentPlayer = 2;
  } else {
    currentPlayer = 1;
    currentRound++;
  }
  
  if (currentRound > 12) {
    endGame();
  } else {
    startTurn();
  }
}

function endGame() {
  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);
  const p1Total = Object.values(scores[1]).reduce(sumObj, 0);
  const p2Total = Object.values(scores[2]).reduce(sumObj, 0);
  
  els.endgameP1Score.textContent = p1Total;
  els.endgameP2Score.textContent = p2Total;
  
  if (p1Total > p2Total) {
    els.endgameWinner.textContent = "P1 승리!";
  } else if (p2Total > p1Total) {
    els.endgameWinner.textContent = "P2 승리!";
  } else {
    els.endgameWinner.textContent = "무승부!";
  }
  
  els.endgameModal.classList.remove('hidden');
}

els.btnReturnLobby.addEventListener('click', () => {
  // 1. 모달 닫기 및 페이드 아웃
  els.endgameModal.classList.add('hidden');
  if (els.appContainer) els.appContainer.style.opacity = '0';
  
  setTimeout(() => {
    // 2. 상태 및 레이아웃 초기화
    scores = { 1: {}, 2: {} };
    activeMutations = { 1: {}, 2: {} };
    upperBonusThreshold = { 1: 63, 2: 63 };
    playerYachtBank = { 1: 0, 2: 0 };
    yachtBankLocked = { 1: false, 2: false };
    destroyedStrangeDice = { 1: false, 2: false };
    promotionConsumed = { 1: false, 2: false };
    currentRound = 1;
    currentPlayer = 1;
    gameMode = 'none';
    socket = null;
    currentRoom = null;
    isHost = false;
    
    // UI 전환 (playing -> mode-select)
    if (els.appContainer) {
      els.appContainer.classList.remove('playing-state', 'normal-mode');
      els.appContainer.classList.add('mode-select-state');
    }
    if (els.matchInfoSection) {
      els.matchInfoSection.classList.add('hidden');
    }
    
    // 멀티플레이 관련 로비 UI 원복
    if (els.lobbyOverlay) els.lobbyOverlay.classList.remove('hidden');
    if (els.multiplayerActions) els.multiplayerActions.classList.add('hidden');
    if (els.waitingRoom) els.waitingRoom.classList.add('hidden');
    if (els.btnHotseat) els.btnHotseat.classList.remove('hidden');
    if (els.btnSingleplayer) els.btnSingleplayer.classList.remove('hidden');
    if (els.btnMultiplayer) els.btnMultiplayer.classList.remove('hidden');
    
    updateScoreboard();
    
    // 주사위 및 킵 상태 정리
    if (diceEngine) {
      diceEngine.diceArray.forEach(die => die.isKept = false);
      diceEngine.arrangeAll(true);
      diceEngine.allowKeep = true;
    }
    if (els.gameStatus) els.gameStatus.textContent = '로비 (자유 연습)';
    if (els.rollsLeft) els.rollsLeft.textContent = '무한 굴리기';
    if (els.btnRoll) els.btnRoll.disabled = false;
    
    // 3. 페이드 인
    requestAnimationFrame(() => {
      if (els.appContainer) els.appContainer.style.opacity = '1';
    });
  }, 600);
});


// -----------------------------------------------------
// 4. 점수판 렌더링 & 주사위 초기화
// -----------------------------------------------------


const categories = [
  { id: 'aces', krName: '에이스', enName: `${getDiceSvg(1)} Aces` },
  { id: 'deuces', krName: '듀스', enName: `${getDiceSvg(2)} Deuces` },
  { id: 'threes', krName: '쓰리스', enName: `${getDiceSvg(3)} Threes` },
  { id: 'fours', krName: '포스', enName: `${getDiceSvg(4)} Fours` },
  { id: 'fives', krName: '파이브스', enName: `${getDiceSvg(5)} Fives` },
  { id: 'sixes', krName: '식스', enName: `${getDiceSvg(6)} Sixes` },
  { id: 'bonus', krName: '보너스 (+35)', enName: 'Bonus (+35)', isDivider: true },
  { id: 'choice', krName: '초이스', enName: `${getSpecialSvg('choice')} Choice` },
  { id: '4oak', krName: '포카인드', enName: `${getSpecialSvg('4oak')} 4 of a Kind` },
  { id: 'fullhouse', krName: '풀하우스', enName: `${getSpecialSvg('fullhouse')} Full House` },
  { id: 's-straight', krName: '스몰 스트레이트', enName: `${getSpecialSvg('s-straight')} S. Straight` },
  { id: 'l-straight', krName: '라지 스트레이트', enName: `${getSpecialSvg('l-straight')} L. Straight` },
  { id: 'yacht', krName: '요트', enName: `${getSpecialSvg('yacht')} Yacht` }
];

function initScoreboard() {
  els.scoreTbody.innerHTML = '';
  categories.forEach(cat => {
    const tr = document.createElement('tr');
    if (cat.isDivider && cat.id === 'bonus') {
      tr.innerHTML = `
        <th class="col-cat" id="cat-title-left-${cat.id}">${cat.enName}</th>
        <td id="p1-${cat.id}" style="font-weight: bold; color: #888;">(0/63)</td>
        <td id="p2-${cat.id}" style="font-weight: bold; color: #888;">(0/63)</td>
        <th class="col-cat" id="cat-title-right-${cat.id}">${cat.enName}</th>
      `;
      tr.style.backgroundColor = '#ddd';
    } else {
      tr.innerHTML = `
        <th class="col-cat" id="cat-title-left-${cat.id}">${cat.enName}</th>
        <td class="score-cell" id="p1-${cat.id}"></td>
        <td class="score-cell" id="p2-${cat.id}"></td>
        <th class="col-cat" id="cat-title-right-${cat.id}">${cat.enName}</th>
      `;
    }
    els.scoreTbody.appendChild(tr);
  });
  
  // -----------------------------------------------------
  // 총합(Total) 렌더링
  // -----------------------------------------------------
  const totalTr = document.createElement('tr');
  totalTr.style.borderTop = '1px solid var(--border-color)';
  totalTr.innerHTML = `
    <th class="col-cat highlight-dark" style="font-weight: bold;">TOTAL</th>
    <td id="p1-total" class="score-cell filled" style="font-weight: bold; color: #222; background-color: #ffffff; border-radius: 0;">0</td>
    <td id="p2-total" class="score-cell filled" style="font-weight: bold; color: #222; background-color: #ffffff; border-radius: 0;">0</td>
    <th class="col-cat highlight-dark" style="font-weight: bold;">TOTAL</th>
  `;
  els.scoreTbody.appendChild(totalTr);
}

function updateScoreboard() {
  categories.forEach(cat => {
    if (cat.isDivider && cat.id === 'bonus') {
      const p1Upper = getUpperSum(1);
      const p2Upper = getUpperSum(2);
      
      const p1BonusText = p1Upper >= upperBonusThreshold[1] ? `35 (${p1Upper}/${upperBonusThreshold[1]})` : `(${p1Upper}/${upperBonusThreshold[1]})`;
      const p2BonusText = p2Upper >= upperBonusThreshold[2] ? `35 (${p2Upper}/${upperBonusThreshold[2]})` : `(${p2Upper}/${upperBonusThreshold[2]})`;
      
      const cell1 = document.getElementById(`p1-${cat.id}`);
      const cell2 = document.getElementById(`p2-${cat.id}`);
      
      if (cell1) {
        cell1.textContent = p1BonusText;
        cell1.style.color = p1Upper >= upperBonusThreshold[1] ? '#27ae60' : '#888';
      }
      if (cell2) {
        cell2.textContent = p2BonusText;
        cell2.style.color = p2Upper >= upperBonusThreshold[2] ? '#27ae60' : '#888';
      }
    } else {
      [1, 2].forEach(p => {
        const cell = document.getElementById(`p${p}-${cat.id}`);
        if (cell) {
          if (scores[p][cat.id] !== undefined) {
            const sObj = scores[p][cat.id];
            if (typeof sObj === 'object') {
              let html = `${sObj.score}`;
              if (sObj.bonusDetails && sObj.bonusDetails.length > 0) {
                sObj.bonusDetails.forEach(b => {
                  const sign = b.value > 0 ? '+' : '';
                  html += ` <span style="color: ${b.color};">${sign}${b.value}</span>`;
                });
              } else if (sObj.bonus > 0) {
                html += ` <span style="color: #D4AF37;">+${sObj.bonus}</span>`;
              }
              cell.innerHTML = html;
            } else {
              cell.innerHTML = sObj;
            }
            cell.className = 'score-cell filled';
            cell.style.color = ''; // 확정 시 CSS의 검은색 적용
            cell.title = '';
          } else if (!cell.classList.contains('suggested')) {
            if (cat.id === 'yacht' && activeMutations[p]['yacht'] === 'yacht-bank') {
              cell.textContent = playerYachtBank[p];
              cell.style.color = '#888';
              cell.className = 'score-cell';
              cell.title = '';
            } else {
              cell.textContent = '';
              cell.style.color = '';
              cell.className = 'score-cell';
              cell.title = '';
            }
          }
        }
      });
    }
  });
  
  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);
  let p1Total = Object.values(scores[1]).reduce(sumObj, 0);
  let p2Total = Object.values(scores[2]).reduce(sumObj, 0);
  
  // 요트 뱅크 패시브 수입 계산
  if (activeMutations[1]['yacht'] === 'yacht-bank' && scores[1]['yacht'] === undefined) {
    p1Total += playerYachtBank[1];
  }
  if (activeMutations[2]['yacht'] === 'yacht-bank' && scores[2]['yacht'] === undefined) {
    p2Total += playerYachtBank[2];
  }

  const p1TotalEl = document.getElementById('p1-total');
  const p2TotalEl = document.getElementById('p2-total');
  if (p1TotalEl) p1TotalEl.textContent = p1Total;
  if (p2TotalEl) p2TotalEl.textContent = p2Total;
}

initScoreboard();
updateScoreboard();

// 3D 주사위 엔진 초기화
let diceEngine;

setTimeout(() => {
  diceEngine = new DiceEngine("#dice-board-area");
  
  diceEngine.onDieClick = (val, isKept, dieIndex) => {
    // 로비 화면일 경우 점수 연산 생략 (클릭/킵만 작동)
    if (els.appContainer?.classList.contains('mode-select-state')) return;

    // 상태 배열을 엔진과 동기화 (이상한 주사위는 족보 계산 배열에서 제외)
    activeDice = diceEngine.diceArray.filter(d => !d.isKept && d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    keptDice = diceEngine.diceArray.filter(d => d.isKept && d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    
    if (window.isMultiplayer) {
      networkEngine.sendMessage({ type: 'sync_keep', dieIndex, isKept });
    }
    
    const allDice = [...keptDice, ...activeDice];
    updateScorePreviews();
  };

  diceEngine.onPhysicsUpdate = (transforms) => {
    if (window.isMultiplayer && currentPlayer === window.myPlayerIndex) {
      networkEngine.sendMessage({ type: 'physics_sync', transforms });
    }
  };
  
  diceBoxReady = true;
  if (els.appContainer?.classList.contains('mode-select-state')) {
    els.btnRoll.disabled = false;
    if(els.gameStatus) els.gameStatus.textContent = '로비 (자유 연습)';
    if(els.rollsLeft) els.rollsLeft.textContent = '무한 굴리기';
    diceEngine.allowKeep = true;
  }
  
  // --- 디버그 모드 자동 시작 ---
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log("Debug mode: Auto-starting hotseat game");
    gameMode = 'hotseat';
    els.lobbyOverlay.classList.add('hidden');
    els.p1Name.querySelector('.name-text').textContent = "Player 1";
    els.p2Name.querySelector('.name-text').textContent = "Player 2";
    startHotseatGame();
  }
  
  if (gameMode !== 'none') {
    updateRollsUI();
  } else {
    els.btnRoll.disabled = false;
  }
}, 100);

// -----------------------------------------------------
// 5. 디버그 도구
// -----------------------------------------------------
// 좌측 증강 섹션(UI) 업데이트 함수
function getQuestProgressText(player, mutId) {
  const prog = questProgress[player] || {};
  const s = scores[player] || {};
  let questLines = [];
  let status = 'in-progress';
  
  const line = (text, isDone) => {
    if (isDone) return `<div style="margin-top: 8px;"><span style="text-decoration: line-through; opacity: 0.7;"><strong><u>퀘스트</u></strong>: ${text}</span></div>`;
    return `<div style="margin-top: 8px;"><strong><u>퀘스트</u></strong>: ${text}</div>`;
  };
  
  switch(mutId) {
    case 'fast-straight':
      questLines.push(line('8턴 안에 S. Straight 기입', s['s-straight']?.score > 0));
      questLines.push(line('8턴 안에 L. Straight 기입', s['l-straight']?.score > 0));
      if (prog.fastStraightRewarded) status = 'completed';
      else if (currentRound > 8 && !(s['s-straight']?.score > 0 && s['l-straight']?.score > 0)) status = 'failed';
      break;
      
    case 'no-time-to-waste':
      const count = prog.noTimeCount || 0;
      questLines.push(line(`리롤 없이 족보 기입 (${count}/3)`, count >= 3));
      if (prog.noTimeRewarded) status = 'completed';
      break;
      
    case 'step-by-step':
      questLines.push(line('상단 족보 모두 채우기', prog.stepRewarded));
      if (prog.stepRewarded) status = 'completed';
      break;
      
    case 'two-households':
      questLines.push(line('Choice 족보를 Full House 형태로 기입', prog.twoHouseholdsRewarded));
      questLines.push(line('Full House 족보 기입', s['fullhouse']?.score > 0));
      if (prog.twoHouseholdsRewarded && s['fullhouse']?.score > 0) status = 'completed';
      break;
      
    case 'holdout':
      questLines.push(line('9턴 이후에 Full House 기입', prog.holdoutRewarded));
      if (prog.holdoutRewarded) status = 'completed';
      else if (s['fullhouse'] !== undefined && !prog.holdoutRewarded) status = 'failed';
      break;
      
    case 'cautious-straight':
      questLines.push(line('S. Straight를 L. Straight 보다 먼저 기입', s['s-straight'] !== undefined && !prog.cautiousFailed));
      questLines.push(line('L. Straight 기입', prog.cautiousRewarded));
      if (prog.cautiousRewarded) status = 'completed';
      else if (prog.cautiousFailed) status = 'failed';
      break;
      
    case 'every-little':
      const elCount = prog.everyLittleCount || 0;
      questLines.push(line(`1의 눈을 포함하여 족보 기입 (${elCount}/7)`, elCount >= 7));
      if (prog.everyLittleRewarded) status = 'completed';
      break;
  }
  
  let resultHTML = '';
  if (status === 'completed') {
    resultHTML += '<div style="color: #D4AF37; font-weight: bold; margin-top: 5px;">퀘스트 성공</div>';
  } else if (status === 'failed') {
    resultHTML += '<div style="color: #e74c3c; font-weight: bold; margin-top: 5px;">퀘스트 실패</div>';
  } else {
    resultHTML += '<div style="color: #3498db; font-weight: bold; margin-top: 5px;">퀘스트 진행 중</div>';
  }
  
  resultHTML += '<hr style="margin: 4px 0 8px 0; border: none; border-top: 1px dashed #ccc;">';
  resultHTML += questLines.join('');
  
  return resultHTML;
}


// -----------------------------------------------------
// 5. 디버그 및 핫시트 UI 도구
// -----------------------------------------------------
window.updateAugmentSidebar = function(player) {
  const muts = Object.values(activeMutations[player] || {});
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`aug-slot-${i}`);
    if (!slot) continue;
    
    if (i < muts.length) {
      const mutationId = muts[i];
      const mut = mutationDefinitions[mutationId];
      if (!mut) continue;
      const augInfo = augmentData.find(a => a.name.includes(mut.name) || (a.mark && mut.enName && a.mark === mut.enName)) || {};
      const svgIcon = augInfo.icon || getVariantSvg(mutationId);
      let description = augInfo.description || mut.name + ' 증강이 적용되었습니다.';
      
      let questHTML = '';
      if (mut.isQuest && typeof getQuestProgressText === 'function') {
        questHTML = `<div class="aug-slot-desc" style="margin-top: auto; width: 100%; padding-bottom: 0;">${getQuestProgressText(player, mutationId)}</div>`;
      }
      
      slot.classList.add('filled');
      slot.innerHTML = `
        <div class="aug-slot-filled" style="display: flex; flex-direction: column; height: 100%;">
          <div class="aug-slot-header">${svgIcon} <span class="aug-slot-name">${augInfo.name || mut.name}</span></div>
          <div class="aug-slot-desc">${description}</div>
          ${questHTML}
        </div>
      `;
    } else {
      slot.classList.remove('filled');
      let roundText = i === 0 ? "1턴" : (i === 1 ? "6턴" : "9턴");
      slot.innerHTML = `
        <div class="aug-empty-icon">
          <svg viewBox="0 0 24 24" width="1em" height="1em">
            <path d="M8 9 V7 a4 4 0 0 1 8 0 V9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="5" y="9" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>
            <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div class="aug-empty-text">${roundText}에 증강을 선택할 수 있습니다.</div>
      `;
    }
  }
};

window.applyMutation = function(player, mutationId) {
  const mut = mutationDefinitions[mutationId];
  if (!mut) return;
  
  activeMutations[player][mut.target] = mutationId;
  
  // 더블 라지 스트레이트 등 특수 효과 즉시 적용
  if (mutationId === 'double-large-straight') {
    upperBonusThreshold[player] = 60;
  }
  
  // 족보 제목 UI 변경 (선택된 플레이어 방향만)
  const targetTh = document.getElementById(player === 1 ? `cat-title-left-${mut.target}` : `cat-title-right-${mut.target}`);
  
  if (targetTh) {
    const augInfo = augmentData.find(a => a.name.includes(mut.name) || (a.mark && mut.enName && a.mark === mut.enName)) || {};
    const svgIcon = augInfo.icon || getVariantSvg(mutationId);
    targetTh.innerHTML = `${svgIcon} ${mut.enName}`;
    
    addGameLog(`[${augInfo.name || mut.name}] 증강을 획득했습니다.`, 'augment-action', window.isMultiplayer, player);

    targetTh.style.backgroundColor = '#87CEEB'; // Sky Blue
    targetTh.style.color = '#222';
  }
  
  // 좌측 증강 섹션(UI) 업데이트
  updateAugmentSidebar(player);
  
  // 점수판 리렌더링 (보너스 등 업데이트)
  updateScoreboard();
  if (rollsLeft < 3) {
    // 굴려진 주사위가 있으면 미리보기 갱신
    updateScorePreviews();
  }
};

setupDebugTools({
  applyMutation: window.applyMutation,
  prevTurn: () => {
    if (currentPlayer === 2) {
      currentPlayer = 1;
    } else {
      if (currentRound > 1) {
        currentPlayer = 2;
        currentRound--;
      } else return; // 더 이상 돌아갈 수 없음
    }
    startTurn();
  },
  nextTurn: () => {
    if (currentPlayer === 1) {
      currentPlayer = 2;
    } else {
      currentPlayer = 1;
      currentRound++;
    }
    
    if (currentRound > 12) {
      endGame();
    } else {
      startTurn();
    }
  },
  applyDice: (values) => {
    diceEngine.forceValues(values);
    
    // 디버그로 강제 주입된 주사위 값을 로컬 상태에 동기화
    keptDice = [];
    activeDice = [...values].sort((a, b) => a - b);
    
    rollsLeft--;
    updateRollsUI();
    if (gameMode !== 'hotseat' && gameMode !== 'augmented-hotseat') {
      triggerOpponentTurn(); 
    } else {
      // 핫시트일 때는 다음 사람으로 넘기지 않고 점수 선택 대기
      els.gameStatus.textContent = `P${currentPlayer} 족보 선택 대기 중...`;
      if (rollsLeft <= 0) {
        els.btnRoll.disabled = true;
        diceEngine.allowKeep = false;
      }
    }
    
    updateScorePreviews();
  }
});

function renderAvatar(url, cropData) {
  const container = document.getElementById('profile-avatar-container');
  if (!container || !url || !cropData) return;
  const canvas = document.getElementById('profile-avatar-canvas');
  if (canvas) canvas.style.display = 'none'; // 캔버스는 이제 사용 안 함 (정지된 이미지 방지)

  const containerWidth = 120; // CSS 사이즈 기준
  
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.onload = () => {
    const scale = containerWidth / cropData.width;
    const bgWidth = img.width * scale;
    const bgHeight = img.height * scale;
    const bgPosX = -cropData.x * scale;
    const bgPosY = -cropData.y * scale;
    
    container.style.backgroundImage = `url(${url})`;
    container.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
    container.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
    container.style.backgroundRepeat = 'no-repeat';
  };
  img.src = url;
}

// Avatar modal logic
const avatarContainer = document.getElementById('profile-avatar-container');
const cropModal = document.getElementById('crop-modal');
const cropUrlInput = document.getElementById('crop-image-url');
const btnCropLoad = document.getElementById('btn-crop-load');
const btnCropCancel1 = document.getElementById('btn-crop-cancel1');
const btnCropCancel2 = document.getElementById('btn-crop-cancel2');
const btnCropSave = document.getElementById('btn-crop-save');
const cropInputSection = document.getElementById('crop-input-section');
const cropEditSection = document.getElementById('crop-edit-section');
const cropImagePreview = document.getElementById('crop-image-preview');

let cropperInstance = null;

if (avatarContainer && cropModal) {
  avatarContainer.addEventListener('click', () => {
    const user = getCurrentUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    cropModal.classList.remove('hidden');
    cropInputSection.classList.remove('hidden');
    cropEditSection.classList.add('hidden');
    cropUrlInput.value = "";
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
  });

  const closeModal = () => {
    cropModal.classList.add('hidden');
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
  };

  btnCropCancel1?.addEventListener('click', closeModal);
  btnCropCancel2?.addEventListener('click', closeModal);

  btnCropLoad?.addEventListener('click', () => {
    const url = cropUrlInput.value.trim();
    if (!url) return alert("이미지 링크를 입력하세요.");
    
    cropImagePreview.onload = () => {
      cropInputSection.classList.add('hidden');
      cropEditSection.classList.remove('hidden');
      if (cropperInstance) cropperInstance.destroy();
      cropperInstance = new Cropper(cropImagePreview, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 1,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
      });
    };
    cropImagePreview.onerror = () => {
      alert("이미지를 불러올 수 없습니다. 올바른 URL인지, 혹은 CORS 제한이 없는지 확인해주세요.");
    };
    cropImagePreview.crossOrigin = "Anonymous";
    cropImagePreview.src = url;
  });

  btnCropSave?.addEventListener('click', async () => {
    if (!cropperInstance) return;
    const user = getCurrentUser();
    if (!user) return;
    
    const cropData = cropperInstance.getData(true); // rounded values
    const url = cropUrlInput.value.trim();
    
    const success = await updateUserAvatar(user.uid, url, cropData);
    if (success) {
      renderAvatar(url, cropData);
      closeModal();
    } else {
      alert("아바타 저장에 실패했습니다.");
    }
  });
}
