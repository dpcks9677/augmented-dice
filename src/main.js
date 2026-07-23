import PartySocket from "partysocket";
import { db } from "./firebaseConfig.js";
import { collection, addDoc, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { networkEngine } from "./networkEngine.js";
import { calculateScores, mutationDefinitions } from "./scoreEngine.js";
import { DiceEngine } from "./DiceEngine.js";
import { getDiceSvg, getSpecialSvg, getVariantSvg, getDicesIconSvg, getAugmentedDicesIconSvg, getCirclePlusIconSvg, getCircleMinusIconSvg, getFlagIconSvg } from "./svgIcons.js";
import { setupDebugTools } from "./debugTools.js";
import { uiManager } from "./UIManager.js";
import "cropperjs/dist/cropper.css";
import { subscribeAuthState, signInWithGoogle, setNickname, getCurrentUser, saveUserToDB, getUserFromDB, signOutUser, updateUserStatusMsg, updateUserAvatar, updateUserActiveGame, clearUserActiveGame, getUserMatchesFromDB } from "./authEngine.js";
import Cropper from "cropperjs";
let augmentData = [];
fetch('/src/augments.json').then(r => r.json()).then(d => { augmentData = d; }).catch(e => console.error(e));

export function escapeHtml(str) {
  if (!str || typeof str !== 'string') return str || '';
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

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
  matchP1Box: document.getElementById('match-p1-box'),
  matchP2Box: document.getElementById('match-p2-box'),
  matchP1Disconnect: document.getElementById('match-p1-disconnect'),
  matchP1DisconnectTimer: document.getElementById('match-p1-disconnect-timer'),
  matchP2Disconnect: document.getElementById('match-p2-disconnect'),
  matchP2DisconnectTimer: document.getElementById('match-p2-disconnect-timer'),
  turnTimer: document.getElementById('turn-timer'),
  turnTimerText: document.getElementById('turn-timer-text'),
  reconnectModal: document.getElementById('reconnect-modal'),
  btnReconnectJoin: document.getElementById('btn-reconnect-join'),
  btnReconnectCancel: document.getElementById('btn-reconnect-cancel'),
  gameLogContainer: document.getElementById('game-log-container'),

  playMenuSection: document.getElementById('play-menu-section'),
  btnPlayNormal: document.getElementById('btn-norm-hotseat'),
  btnPlayNormalLobby: document.getElementById('btn-norm-lobby'),
  btnAugOnline: document.getElementById('btn-aug-online'),
  btnAugLobby: document.getElementById('btn-aug-lobby'),
  btnAugHotseat: document.getElementById('btn-aug-hotseat'),

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

// 환경 제어 (로컬호스트인 경우만 증강 모드 및 디버그 툴 사용 허용)
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

if (isLocalhost) {
  if (els.btnAugOnline) els.btnAugOnline.disabled = false;
  if (els.btnAugLobby) els.btnAugLobby.disabled = false;
  if (els.btnAugHotseat) els.btnAugHotseat.disabled = false;
  const debugContainer = document.getElementById('debug-container');
  if (debugContainer) debugContainer.style.display = 'block';
} else {
  if (els.btnAugOnline) els.btnAugOnline.disabled = true;
  if (els.btnAugLobby) els.btnAugLobby.disabled = true;
  if (els.btnAugHotseat) els.btnAugHotseat.disabled = true;
  const debugContainer = document.getElementById('debug-container');
  if (debugContainer) debugContainer.style.display = 'none';
}


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
let scores = { 1: {}, 2: {}, 3: {}, 4: {} };
let activeMutations = { 1: {}, 2: {}, 3: {}, 4: {} };
let upperBonusThreshold = { 1: 63, 2: 63, 3: 63, 4: 63 };
let playerYachtBank = { 1: 0, 2: 0, 3: 0, 4: 0 };
let yachtBankLocked = { 1: false, 2: false, 3: false, 4: false };
let destroyedStrangeDice = { 1: false, 2: false, 3: false, 4: false };
let promotionConsumed = { 1: false, 2: false, 3: false, 4: false };
let questProgress = { 1: {}, 2: {}, 3: {}, 4: {} };
let momentumState = { 1: 'ready', 2: 'ready', 3: 'ready', 4: 'ready' };
let momentumGainedScore = { 1: 0, 2: 0, 3: 0, 4: 0 };

let landingDiceEngine = null;

function getPlayerLabel(playerIndex) {
  let name = `Player ${playerIndex}`;
  if (window.lobbyPlayers && window.lobbyPlayers[playerIndex - 1]) {
    name = window.lobbyPlayers[playerIndex - 1].nickname || `Player ${playerIndex}`;
  } else {
    const oppNameElem = document.getElementById(`match-p${playerIndex}-name`);
    if (oppNameElem && oppNameElem.textContent) {
      name = oppNameElem.textContent;
    } else if (playerIndex === 1 && els.matchMyName && els.matchMyName.textContent) {
      name = els.matchMyName.textContent;
    }
  }
  return `P${playerIndex} (${name})`;
}
window.matchLogHistory = [];

const DEFAULT_CATEGORY_NAMES = {
  aces: 'Aces', deuces: 'Deuces', threes: 'Threes', fours: 'Fours', fives: 'Fives', sixes: 'Sixes',
  choice: 'Choice', '4oak': '4 of a Kind', fullhouse: 'Full House', 's-straight': 'S. Straight', 'l-straight': 'L. Straight', yacht: 'Yacht'
};

function getCategoryDisplayName(catId, player = 1) {
  const pMuts = activeMutations[player] || {};
  const mutId = pMuts[catId];
  if (mutId && mutationDefinitions[mutId]) {
    const mut = mutationDefinitions[mutId];
    if (!mut.isEnhancement && !mut.isQuest) {
      return mut.enName || mut.name;
    }
  }

  return DEFAULT_CATEGORY_NAMES[catId] || catId;
}

function formatLogEntry(log, playerNames = null) {
  if (log.type === 'system') {
    if (log.message === 'game-start') return '게임 시작!';
    return log.message;
  }

  let pLabel;
  if (playerNames && (playerNames[log.player] || playerNames[String(log.player)])) {
    const name = playerNames[log.player] || playerNames[String(log.player)];
    pLabel = `P${log.player} (${name})`;
  } else {
    pLabel = getPlayerLabel(log.player);
  }

  switch (log.type) {
    case 'turn-start':
      return `${pLabel}의 턴 (${log.round} 라운드)`;
    case 'roll-action':
      const { rolledCount, keptValues } = log.meta;
      if (!keptValues || keptValues.length === 0) {
        return `주사위 ${rolledCount}개를 굴렸습니다.`;
      }
      return `주사위 [${keptValues.join(', ')}]를 킵하고 ${rolledCount}개를 다시 굴렸습니다.`;
    case 'roll-result':
      return `주사위의 값이 나왔습니다. [${log.meta.values.join(', ')}]`;
    case 'score-record':
      const cName = log.meta.catName || getCategoryDisplayName(log.meta.catId, log.player);
      return `[${cName}] 족보에 ${log.meta.score}점을 기록했습니다.`;
    case 'timeout':
      return `시간 초과로 인해 [${log.meta.catName}] 족보에 ${log.meta.score}점을 자동으로 기입했습니다.`;
    case 'augment-action':
      return `${pLabel}이 [${log.meta.name}] 증강을 획득했습니다.`;
    default:
      return '';
  }
}

function addGameLog(logData, type = 'normal', sync = false, player = 0) {
  if (!els.gameLogContainer) return;
  const emptyText = els.gameLogContainer.querySelector('.log-empty-text');
  if (emptyText) emptyText.remove();

  // JSON 객체 정규화 및 저장
  let normalizedLog;
  if (typeof logData === 'object' && logData !== null) {
    normalizedLog = logData;
  } else {
    normalizedLog = {
      type: 'system',
      message: String(logData),
      player: player
    };
  }

  window.matchLogHistory.push(normalizedLog);

  const formattedMessage = formatLogEntry(normalizedLog);

  const entryType = (normalizedLog.type === 'turn-start' || type === 'turn-start' || normalizedLog.message === '게임 시작!') ? 'turn-start' : type;

  const entry = document.createElement('div');
  entry.className = `game-log-entry ${entryType} fade-in`;
  if (player === 1) entry.classList.add('log-p1');
  else if (player === 2) entry.classList.add('log-p2');

  const textSpan = document.createElement('span');
  textSpan.textContent = formattedMessage;

  if (normalizedLog.type === 'timeout') {
    textSpan.style.textDecoration = 'underline';
  }

  entry.appendChild(textSpan);

  els.gameLogContainer.appendChild(entry);
  // 부모 스크롤을 끝으로
  if (els.gameLogContainer.parentElement) {
    els.gameLogContainer.parentElement.scrollTop = els.gameLogContainer.parentElement.scrollHeight;
  }

  // 소켓으로 메시지 쏠 경우 (sync가 true일 때)
  if (sync && window.isMultiplayer) {
    networkEngine.sendMessage({
      type: 'sync_log',
      logData: normalizedLog,
      logType: type,
      player: player
    });
  }
}

function showAugment() {
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
}

function showMatchInfo() {
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

  const curUser = getCurrentUser();
  if (curUser?.uid) {
    refreshUserHistory(curUser.uid);
  }
}

function setupSidebarTabs() {
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

async function refreshUserHistory(uid) {
  const historyCard = document.querySelector('.history-card');
  if (!historyCard || !uid) return;

  const matches = await getUserMatchesFromDB(uid);
  renderHistoryCard(historyCard, matches, uid);
}

function renderHistoryCard(container, matches, myUid) {
  container.innerHTML = '';

  const matchCount = matches ? matches.length : 0;

  // Header: 경기 기록 (n) & 새로고침 버튼
  const header = document.createElement('div');
  header.className = 'history-header';
  header.innerHTML = `
    <span>경기 기록 (${matchCount})</span>
    <button class="btn-history-refresh" id="btn-history-refresh" title="경기 기록 새로고침">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
        <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l1.2 1.2A10 10 0 0 0 22.5 12.5"/>
      </svg>
    </button>
  `;
  container.appendChild(header);

  const btnRefresh = header.querySelector('#btn-history-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      btnRefresh.style.transform = 'rotate(360deg)';
      refreshUserHistory(myUid);
    });
  }

  if (!matches || matches.length === 0) {
    const emptyElem = document.createElement('div');
    emptyElem.className = 'history-empty-text';
    emptyElem.textContent = '게임 기록이 없습니다.';
    container.appendChild(emptyElem);
    return;
  }

  // Table Header
  const tableHeader = document.createElement('div');
  tableHeader.className = 'history-table-header';
  tableHeader.innerHTML = `
    <div class="col-mode">모드</div>
    <div class="col-players">플레이어</div>
    <div class="col-score">점수</div>
    <div class="col-result">결과</div>
    <div class="col-date">날짜</div>
  `;
  container.appendChild(tableHeader);

  // List Container
  const listContainer = document.createElement('div');
  listContainer.className = 'history-match-list';

  matches.forEach(match => {
    const item = document.createElement('div');
    item.className = 'history-match-item';


    // 1. 모드 아이콘
    const isAugmented = match.mode === 'augmented' || match.mode === 'augmented-hotseat';
    const modeIconHtml = isAugmented ? getAugmentedDicesIconSvg() : getDicesIconSvg();
    const modeName = isAugmented ? '증강' : '일반';

    // 2. 플레이어 수집
    let playerList = [];
    if (match.players) {
      if (Array.isArray(match.players)) {
        playerList = match.players;
      } else {
        playerList = Object.values(match.players);
      }
    }

    // 과거 데이터 호환용 isForfeited 추정 및 playLogs 분석
    const hasLogForfeit = (match.playLogs || []).some(log => {
      const msg = typeof log === 'string' ? log : (log?.message || log?.text || '');
      return msg.includes('기권') || msg.includes('포기') || msg.includes('몰수') || msg.includes('퇴장');
    });

    // 각 플레이어별 isForfeited 판단 (직접 기록된 isForfeited -> playLogs 기록 -> 완료 족보 수 부족 여부)
    playerList.forEach(p => {
      if (p.isForfeited === undefined) {
        if (hasLogForfeit) {
          // playLogs에 기권 문구가 있는 경우, 점수가 현저히 적거나 족보 완료 개수가 적은 쪽을 기권자로 추정
          const filledCatsCount = p.scores ? Object.keys(p.scores).length : 0;
          if (filledCatsCount < 12) {
            p.isForfeited = true;
          }
        }
      }
    });

    const getCleanUidVal = (val) => (!val || typeof val !== 'string') ? val : (val.startsWith('guest') ? val : val.split('_')[0]);
    const cleanMyUid = getCleanUidVal(myUid);

    let myPlayer = playerList.find(p => p && p.uid && getCleanUidVal(p.uid) === cleanMyUid);
    if (!myPlayer) {
      const curUserObj = getCurrentUser();
      const myNick = curUserObj?.displayName || els.myNickname?.textContent;
      if (myNick) {
        myPlayer = playerList.find(p => p.nickname === myNick);
      }
    }
    if (!myPlayer) {
      myPlayer = playerList[0];
    }
    const otherPlayers = playerList.filter(p => p !== myPlayer);
    const primaryOpponent = otherPlayers[0] || { nickname: '상대방', avatarUrl: null };
    const extraCount = otherPlayers.length > 1 ? otherPlayers.length - 1 : 0;

    const myAvatarStyle = myPlayer?.avatarUrl ? `background-image: url('${myPlayer.avatarUrl}');` : '';
    const oppAvatarStyle = primaryOpponent?.avatarUrl ? `background-image: url('${primaryOpponent.avatarUrl}');` : '';

    let oppHtml = `<span class="history-player-name">${escapeHtml(primaryOpponent.nickname || 'Guest')}</span>`;

    if (extraCount > 0) {
      oppHtml += ` <span class="history-player-extra" title="플레이어 목록 펼치기">+${extraCount}</span>`;
    }

    // 3. 점수 정보
    const myScore = myPlayer?.totalScore ?? (myPlayer?.score ?? 0);
    const oppScore = primaryOpponent?.totalScore ?? (primaryOpponent?.score ?? 0);

    const myForfeited = Boolean(myPlayer?.isForfeited);
    const oppForfeited = Boolean(primaryOpponent?.isForfeited);

    let myNameHtml = myPlayer?.nickname || '나';
    const myScoreStyle = myForfeited ? 'text-decoration: line-through; color: #888;' : '';
    const oppScoreStyle = oppForfeited ? 'text-decoration: line-through; color: #888;' : '';

    // 4. 결과 뱃지 (승리/패배)
    let computedWinnerUid = match.winnerUid;

    // 기권자가 있는 경우: 과거 데이터에서 winnerUid가 잘못 기록되었을 수 있으므로 항상 재판정
    if (myForfeited || oppForfeited) {
      if (myForfeited && !oppForfeited) {
        computedWinnerUid = primaryOpponent.uid;
      } else if (!myForfeited && oppForfeited) {
        computedWinnerUid = myUid;
      }
      // 둘 다 기권한 경우는 DB의 winnerUid 유지
    } else if (!computedWinnerUid || computedWinnerUid === 'none') {
      // 기권 없이 winnerUid도 없는 과거 데이터 → 무승부 처리
      computedWinnerUid = 'draw';
    }

    let resultBadgeHtml = '<span class="badge-draw">무승부</span>';
    if (computedWinnerUid && computedWinnerUid !== 'draw' && computedWinnerUid !== 'none') {
      const cleanWinnerUid = getCleanUidVal(computedWinnerUid);
      if (cleanWinnerUid === cleanMyUid) {
        resultBadgeHtml = '<span class="badge-win">승리</span>';
      } else {
        resultBadgeHtml = '<span class="badge-loss">패배</span>';
      }
    }


    // 5. 날짜 포맷 (YY.MM.DD)
    let dateStr = '-';
    if (match.timestamp) {
      const d = match.timestamp.toDate ? match.timestamp.toDate() : new Date(match.timestamp);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yy}.${mm}.${dd}`;
    }

    // 추가 플레이어 (3번째 이상) HTML 구성
    let extraPlayersHtml = '';
    let extraScoresHtml = '';
    if (extraCount > 0) {
      const restOpponents = otherPlayers.slice(1);
      restOpponents.forEach(op => {
        const opAvStyle = op.avatarUrl ? `background-image: url('${op.avatarUrl}');` : '';
        const opScore = op?.totalScore ?? (op?.score ?? 0);
        const isOpForfeited = Boolean(op?.isForfeited);
        const opScoreStyle = isOpForfeited ? 'text-decoration: line-through; color: #888;' : '';
        const opForfeitLabel = '';

        extraPlayersHtml += `
          <div class="history-player-row history-extra-row">
            <div class="history-avatar-mini" style="${opAvStyle}"></div>
            <span class="history-player-name">${op.nickname || 'Guest'}${opForfeitLabel}</span>
          </div>
        `;
        extraScoresHtml += `
          <div class="history-score-row history-extra-row" style="${opScoreStyle}">${opScore}</div>
        `;
      });
    }

    item.innerHTML = `
      <div class="history-match-main">
        <div class="history-mode-col">
          ${modeIconHtml}
          <span>${modeName}</span>
        </div>
        <div class="history-players-col">
          <div class="history-player-row me">
            <div class="history-avatar-mini" style="${myAvatarStyle}"></div>
            <span class="history-player-name">${myNameHtml}</span>
          </div>
          <div class="history-player-row">
            <div class="history-avatar-mini" style="${oppAvatarStyle}"></div>
            ${oppHtml}
          </div>
          ${extraPlayersHtml}
        </div>
        <div class="history-score-col">
          <div class="history-score-row me" style="${myScoreStyle}">${myScore}</div>
          <div class="history-score-row" style="${oppScoreStyle}">${oppScore}</div>
          ${extraScoresHtml}
        </div>
        <div class="history-result-col">
          ${resultBadgeHtml}
        </div>
        <div class="history-date-col">
          ${dateStr}
        </div>
      </div>
    `;

    if (extraCount > 0) {
      const extraBtn = item.querySelector('.history-player-extra');
      if (extraBtn) {
        extraBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const extraRows = item.querySelectorAll('.history-extra-row');
          const isOpen = extraBtn.classList.toggle('open');
          extraRows.forEach(row => {
            row.classList.toggle('open', isOpen);
          });
          extraBtn.title = isOpen ? '플레이어 목록 접기' : '플레이어 목록 펼치기';
        });
      }
    }

    listContainer.appendChild(item);
  });

  container.appendChild(listContainer);
}

// 2. Firebase Auth 흐름 제어
subscribeAuthState(async (user) => {
  if (user) {
    // Firestore에서 유저 데이터 조회
    const userData = await getUserFromDB(user.uid);
    refreshUserHistory(user.uid);

    if (userData && userData.nickname) {
      // 닉네임이 설정된 로그인 유저: 메인 게임 화면으로 바로 이동
      els.landingView?.classList.add('hidden');
      els.loginView?.classList.add('hidden');
      els.nicknameSetupView?.classList.add('hidden');
      els.appContainer?.classList.remove('hidden');

      const nick = userData.nickname;
      if (els.myNickname) els.myNickname.textContent = nick;
      if (els.profileNickname) els.profileNickname.textContent = nick;

      const profileStatus = document.getElementById('profile-status-msg');
      if (profileStatus && userData.statusMsg) {
        profileStatus.textContent = userData.statusMsg;
      }

      // 추가 프로필 통계 바인딩
      const profilePlays = document.getElementById('profile-plays');
      if (profilePlays) profilePlays.textContent = (userData.stats?.gamesPlayed) || userData.gamesPlayed || 0;

      const profileViews = document.getElementById('profile-views');
      if (profileViews) profileViews.textContent = userData.profileViews || 0;

      const profileDate = document.getElementById('profile-date');
      if (profileDate) {
        if (userData.createdAt) {
          const dateObj = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          profileDate.textContent = `${yyyy}.${mm}.${dd}`;
        } else {
          profileDate.textContent = '-';
        }
      }

      if (userData.avatarUrl && userData.cropData) {
        setTimeout(() => {
          if (typeof renderAvatar === 'function') {
            renderAvatar(userData.avatarUrl, userData.cropData);
          }
        }, 100);
      } else {
        resetAvatarUI();
      }

      // 진행 중인 게임 재접속 체크
      if (userData.activeRoomId) {
        const modal = document.getElementById('reconnect-modal');
        if (modal) modal.classList.remove('hidden');

        const btnJoin = document.getElementById('btn-reconnect-join');
        const btnCancel = document.getElementById('btn-reconnect-cancel');

        if (btnJoin) {
          btnJoin.onclick = () => {
            modal.classList.add('hidden');
            window.pendingLobbyMode = userData.activeGameMode || 'normal';
            window.isMultiplayer = true;

            // 로비를 거치지 않고 바로 대전 화면으로 이동
            els.appContainer.className = '';
            if (window.pendingLobbyMode === 'normal') {
              els.appContainer.classList.add('playing-state', 'normal-mode');
            } else {
              els.appContainer.classList.add('playing-state');
            }

            window.currentRoomCode = userData.activeRoomId;
            if (els.lobbyCodeDisplay) els.lobbyCodeDisplay.textContent = userData.activeRoomId;
            networkEngine.connectToLobby(userData.activeRoomId);
            startMultiplayerGame();
          };
        }

        if (btnCancel) {
          btnCancel.onclick = async () => {
            modal.classList.add('hidden');
            const roomToCancel = userData.activeRoomId;
            const user = getCurrentUser();

            if (user?.uid) {
              await clearUserActiveGame(user.uid);
            }

            if (roomToCancel) {
              try {
                const sendForfeitAndDisconnect = () => {
                  const targetUid = window.myUid || user?.uid;
                  networkEngine.sendMessage({ type: 'player_forfeited', uid: targetUid });
                  setTimeout(() => {
                    networkEngine.disconnect();
                  }, 150);

                  // 승자 측에서 saveMatchData를 완료한 후 기권자의 History 카드도 정상 갱신되도록 재호출
                  if (targetUid) {
                    setTimeout(() => {
                      refreshUserHistory(targetUid);
                    }, 1200);
                  }
                };

                if (networkEngine.socket && networkEngine.socket.readyState === WebSocket.OPEN && networkEngine.roomCode === roomToCancel) {
                  sendForfeitAndDisconnect();
                } else {
                  const onConnected = () => {
                    sendForfeitAndDisconnect();
                  };
                  networkEngine.on('connected', onConnected);
                  networkEngine.connectToLobby(roomToCancel, true);
                }
              } catch (e) {
                console.error("Forfeit notify error:", e);
                networkEngine.disconnect();
              }
            } else {
              networkEngine.disconnect();
            }
          };
        }
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
      // 로그아웃 시 로비 초기화 및 퇴장
      networkEngine.disconnect();
      currentRoom = null;
      isHost = false;

      // 상태 클래스 초기화 (mode-select-state)
      if (els.appContainer) {
        els.appContainer.className = 'mode-select-state';
      }

      // 이전 픽스에서 잘못 들어갔던 hidden 제거
      if (els.waitingRoom) els.waitingRoom.classList.remove('hidden');
      if (els.lobbySection) els.lobbySection.classList.remove('hidden');
      if (els.lobbySelectSection) els.lobbySelectSection.classList.remove('hidden');

      // 프로필 DOM 캐시 초기화
      if (els.myNickname) els.myNickname.textContent = "Player";
      if (els.profileNickname) els.profileNickname.textContent = "Player";
      const statusMsg = document.getElementById('profile-status-msg');
      if (statusMsg) statusMsg.textContent = "";

      const profilePlays = document.getElementById('profile-plays');
      if (profilePlays) profilePlays.textContent = 0;
      const profileViews = document.getElementById('profile-views');
      if (profileViews) profileViews.textContent = 0;

      const profileDate = document.getElementById('profile-date');
      if (profileDate) profileDate.textContent = "-";

      resetAvatarUI();

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
    if (newMsg === "") {
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
            const token = await grecaptcha.execute('6LdKulgtAAAAAJgJb6_hEQJNE7hKre6Ab8EURscy', { action: 'submit' });
            if (!token) reject("토큰 발급 실패");
            else resolve();
          } catch (e) {
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
      if (els.myNickname) els.myNickname.textContent = nickname;
      if (els.profileNickname) els.profileNickname.textContent = nickname;

      // 신규가입 UI 업데이트
      const profilePlays = document.getElementById('profile-plays');
      if (profilePlays) profilePlays.textContent = 0;

      const profileViews = document.getElementById('profile-views');
      if (profileViews) profileViews.textContent = 0;

      const profileDate = document.getElementById('profile-date');
      if (profileDate) profileDate.textContent = new Date().toLocaleDateString();
    }
  } catch (e) {
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

    startHotseatGame(mode);

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

els.btnAugHotseat?.addEventListener('click', () => {
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

  // 모드별 슬롯 개수 동적 구성 (일반 요트: 4인, 증강 요트: 2인)
  const maxSlots = (window.pendingLobbyMode === 'normal') ? 4 : 2;
  const lobbyPlayersContainer = els.lobbySection.querySelector('.lobby-players');
  if (lobbyPlayersContainer) {
    let slotsHtml = '';
    for (let i = 0; i < maxSlots; i++) {
      if (i === 0) {
        slotsHtml += `
          <div class="lobby-player-slot host">
            <div class="player-avatar"></div>
            <div class="player-name">Player 1</div>
            <div class="player-status">✓</div>
          </div>`;
      } else {
        slotsHtml += `
          <div class="lobby-player-slot empty">
            <div class="player-avatar"></div>
            <div class="player-name">Waiting...</div>
            <div class="player-status"></div>
          </div>`;
      }
    }
    lobbyPlayersContainer.innerHTML = slotsHtml;
  }

  const user = getCurrentUser();
  const myName = els.profileNickname?.textContent || "Player 1";
  const slots = els.lobbySection.querySelectorAll('.lobby-player-slot');
  if (slots.length > 0) {
    const p1NameElem = slots[0].querySelector('.player-name');
    if (p1NameElem) p1NameElem.textContent = myName;

    const p1AvatarElem = slots[0].querySelector('.player-avatar');
    const profileAvatarContainer = document.getElementById('profile-avatar-container');
    const currentBg = profileAvatarContainer?.style?.backgroundImage;

    if (p1AvatarElem && currentBg && currentBg !== 'none') {
      p1AvatarElem.style.backgroundImage = currentBg;
      p1AvatarElem.style.backgroundSize = 'cover';
      p1AvatarElem.style.backgroundPosition = 'center';
    } else if (p1AvatarElem && window.myPlayerInfo && window.myPlayerInfo.avatarUrl) {
      p1AvatarElem.style.backgroundImage = `url('${window.myPlayerInfo.avatarUrl}')`;
      p1AvatarElem.style.backgroundSize = 'cover';
      p1AvatarElem.style.backgroundPosition = 'center';
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
    const uppercaseCode = String(joinCode || '').trim().toUpperCase();
    els.lobbyCodeDisplay.textContent = uppercaseCode;
    els.btnLobbyStart.textContent = '준비 (Ready)';
    networkEngine.connectToLobby(uppercaseCode);
  }

  // 로비 상태 초기화
  window.isReady = false;
  els.btnLobbyStart.classList.remove('ready');
}

// 네트워크 이벤트 리스너 등록
networkEngine.on('lobby_state', (data) => {
  const players = data.players || [];
  const oldPlayers = window.lobbyPlayers || [];

  // 퇴장/입장 감지 알림
  if (oldPlayers.length > 0) {
    oldPlayers.forEach(op => {
      if (!players.some(np => np.uid === op.uid || np.connId === op.connId)) {
        addGameLog(`${op.nickname} 님이 로비에서 퇴장하셨습니다.`, 'system', false);
      }
    });
    players.forEach(np => {
      if (!oldPlayers.some(op => op.uid === np.uid || op.connId === np.connId)) {
        addGameLog(`${np.nickname} 님이 로비에 입장하셨습니다.`, 'system', false);
      }
    });
  }

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
  const myUid = window.myUid || getCurrentUser()?.uid;
  const me = players.find(p => (myConnId && p.connId === myConnId) || (myUid && p.uid === myUid));
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
  // 모든 기존 상태 클래스를 제거하고 게임 화면으로 이동
  els.appContainer.className = '';

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
    window.lastRollStartTime = Date.now();
    if (diceEngine) diceEngine.roll(data.specialConfigs, true);
  } else if (data.type === 'sync_roll_end') {
    const elapsed = Date.now() - (window.lastRollStartTime || 0);
    const minAnimTime = 1100;
    const remainingDelay = Math.max(0, minAnimTime - elapsed);

    setTimeout(() => {
      if (diceEngine) {
        diceEngine.forceRollEnd(data.finalValues);
        diceEngine.diceArray.forEach(die => die.isKept = false);
        keptDice = [];
        activeDice = diceEngine.diceArray.filter(d => d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
        diceEngine.arrangeAll(true);
        updateScorePreviews();
      }
    }, remainingDelay);
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
    lockScore(data.catId, data.scoreInfo, true, data.force);
  } else if (data.type === 'sync_log') {
    // 턴 시작 로그 중복 출력 방지 (이미 로컬에서 출력함)
    if (data.logData?.type === 'turn-start' || data.logData?.message === '게임 시작!') {
      // 서버 메모리 저장용 수신이므로 중복 DOM 생성 안 함
      return;
    }
    addGameLog(data.logData, data.logType, false, data.player);
  }
});

networkEngine.on('full_game_sync', (data) => {
  if (!data || !data.sessionData) return;
  const sData = data.sessionData;

  if (data.players) window.lobbyPlayers = data.players;

  const myConnId = networkEngine.socket?.id;
  const myUid = getCurrentUser()?.uid;
  const me = window.lobbyPlayers?.find(p => p.connId === myConnId || (myUid && p.uid === myUid));
  if (me && window.lobbyPlayers) {
    window.myPlayerInfo = me;
    const idx = window.lobbyPlayers.indexOf(me);
    window.myPlayerIndex = idx >= 0 ? idx + 1 : (me.isHost ? 1 : 2);
  }

  scores = sData.scores || { 1: {}, 2: {} };
  activeMutations = sData.activeMutations || { 1: {}, 2: {} };
  currentRound = sData.currentRound || 1;
  currentPlayer = sData.currentPlayer || 1;
  rollsLeft = sData.rollsLeft !== undefined ? sData.rollsLeft : 3;

  if (sData.matchLogHistory) {
    window.matchLogHistory = [...sData.matchLogHistory];
    if (els.gameLogContainer) {
      els.gameLogContainer.innerHTML = '';
      sData.matchLogHistory.forEach(log => {
        const logType = (log.type === 'turn-start' || log.message === '게임 시작!') ? 'turn-start' : (log.type || 'normal');
        addGameLog(log, logType, false, log.player || 0);
      });
    }
  }

  if (sData.disconnectGrace) {
    if (sData.disconnectGrace[1] !== undefined) disconnectGrace[1] = sData.disconnectGrace[1];
    if (sData.disconnectGrace[2] !== undefined) disconnectGrace[2] = sData.disconnectGrace[2];
  }

  if (data.players) {
    data.players.forEach(p => {
      if (p.disconnected) {
        const pIdx = p.isHost ? 1 : 2;
        handlePlayerDisconnect(pIdx);
      }
    });
  }

  activeDice = sData.activeDice || [];
  keptDice = sData.keptDice || [];

  const allDiceValues = [...keptDice, ...activeDice];
  if (allDiceValues.length > 0 && diceEngine) {
    try {
      const keptIndexes = [];
      for (let k = 0; k < keptDice.length; k++) {
        keptIndexes.push(k);
      }
      diceEngine.forceValues(allDiceValues, keptIndexes);
    } catch (e) {
      console.error("Dice restore error on sync:", e);
    }
  }

  initScoreboard();
  updateScoreboard();
  updateScorePreviews();
  updateRollsUI();
  updateMatchProfiles();

  els.gameStatus.textContent = `P${currentPlayer}의 턴 (라운드 ${currentRound}/12)`;
  updateTurnHighlights();

  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  if (diceBoxReady) {
    els.btnRoll.disabled = !isMyTurn || rollsLeft <= 0;
  }

  startTurnTimer(sData.turnTimeRemaining !== undefined ? sData.turnTimeRemaining : 45);
});

networkEngine.on('player_disconnected', (data) => {
  let pIndex = null;
  if (window.lobbyPlayers) {
    const p = window.lobbyPlayers.find(pl => pl.uid === data.uid || pl.connId === data.connId);
    if (p) {
      pIndex = p.isHost ? 1 : 2;
    }
  }
  if (!pIndex) {
    pIndex = window.myPlayerIndex === 1 ? 2 : 1;
  }
  handlePlayerDisconnect(pIndex);
});

networkEngine.on('player_reconnected', (data) => {
  let pIndex = null;
  if (window.lobbyPlayers) {
    const p = window.lobbyPlayers.find(pl => pl.uid === data.uid || pl.connId === data.connId);
    if (p) {
      pIndex = p.isHost ? 1 : 2;
    }
  }
  if (!pIndex) {
    pIndex = window.myPlayerIndex === 1 ? 2 : 1;
  }
  handlePlayerReconnect(pIndex);
});

networkEngine.on('player_forfeited', (data) => {
  let forfeitPIndex = null;
  if (window.lobbyPlayers) {
    const p = window.lobbyPlayers.find(pl => pl.uid === data.uid || pl.connId === data.connId);
    if (p) {
      forfeitPIndex = window.lobbyPlayers.indexOf(p) + 1;
    }
  }
  if (!forfeitPIndex && data.pIndex) {
    forfeitPIndex = data.pIndex;
  }
  if (!forfeitPIndex) {
    forfeitPIndex = window.myPlayerIndex === 1 ? 2 : 1;
  }

  if (els.appContainer?.classList.contains('playing-state')) {
    handleGameForfeit(forfeitPIndex, data.uid);
    const user = getCurrentUser();
    if (user?.uid) {
      setTimeout(() => {
        refreshUserHistory(user.uid);
      }, 1500);
    }
  } else {
    addGameLog({ type: 'system', message: '상대방이 게임을 포기하여 로비가 해제되었습니다.' }, 'system', false);
    stopTurnTimer();
    stopLobbyWaitingAnimation();
    networkEngine.disconnect();
    els.appContainer.className = 'mode-select-state';
  }
});

networkEngine.on('game_already_ended', async (data) => {
  alert(data.message || '이미 완료되거나 종료된 게임 세션입니다.');
  const user = getCurrentUser();
  if (user?.uid) {
    await clearUserActiveGame(user.uid);
  }
  stopTurnTimer();
  networkEngine.disconnect();
  els.appContainer.className = 'mode-select-state';
});

els.btnPlayNormalLobby?.addEventListener('click', () => {
  showLobbySelect('normal');
});

els.btnAugLobby?.addEventListener('click', () => {
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
  const code = els.inputLobbyJoinCode.value.trim().toUpperCase();
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

window.gameSessionStarted = false;

function isWaitingLobbyState() {
  return !window.gameSessionStarted || gameMode === 'none';
}

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

let forfeitedPlayers = { 1: false, 2: false, 3: false, 4: false };
let forfeitedPlayerUids = {};

function handleGameForfeit(forfeitedPlayerIndex, forfeitUid = null) {
  forfeitedPlayers[forfeitedPlayerIndex] = true;
  if (forfeitUid) {
    forfeitedPlayerUids[forfeitedPlayerIndex] = forfeitUid;
  }

  const boxElem = document.getElementById(`match-p${forfeitedPlayerIndex}-box`) || (forfeitedPlayerIndex === 1 ? document.getElementById('match-my-box') : null);
  if (boxElem) {
    const avatarContainer = boxElem.querySelector('.match-avatar-container');
    if (avatarContainer && !avatarContainer.querySelector('.forfeit-overlay')) {
      const flagOverlay = document.createElement('div');
      flagOverlay.className = 'disconnect-overlay forfeit-overlay';
      flagOverlay.innerHTML = getFlagIconSvg('forfeit-flag-svg', 26);
      avatarContainer.appendChild(flagOverlay);
    }
  }

  const totalCount = getActivePlayerCount();
  const activePlayers = [];
  for (let p = 1; p <= totalCount; p++) {
    if (!forfeitedPlayers[p]) {
      activePlayers.push(p);
    }
  }

  if (activePlayers.length >= 2) {
    if (currentPlayer === forfeitedPlayerIndex) {
      const nextP = activePlayers.find(p => p > currentPlayer) || activePlayers[0];
      currentPlayer = nextP;
      startTurn();
    }
  } else {
    const lastSurv = activePlayers[0] || 1;
    const winnerData = window.lobbyPlayers ? window.lobbyPlayers[lastSurv - 1] : null;
    const winnerName = winnerData ? winnerData.nickname : `Player ${lastSurv}`;
    
    stopTurnTimer();
    const winnerTitle = document.getElementById('endgame-winner');
    if (winnerTitle) {
      winnerTitle.textContent = `${winnerName} 몰수승!`;
    }
    endGame();
  }
}

function resetGameSession() {
  stopTurnTimer();
  [1, 2, 3, 4].forEach(pIdx => {
    if (typeof disconnectTimers !== 'undefined' && disconnectTimers[pIdx]) {
      clearInterval(disconnectTimers[pIdx]);
      disconnectTimers[pIdx] = null;
    }
  });

  forfeitedPlayers = { 1: false, 2: false, 3: false, 4: false };
  scores[1] = {}; scores[2] = {}; scores[3] = {}; scores[4] = {};
  activeMutations[1] = {}; activeMutations[2] = {}; activeMutations[3] = {}; activeMutations[4] = {};
  upperBonusThreshold[1] = 63; upperBonusThreshold[2] = 63; upperBonusThreshold[3] = 63; upperBonusThreshold[4] = 63;
  playerYachtBank[1] = 0; playerYachtBank[2] = 0; playerYachtBank[3] = 0; playerYachtBank[4] = 0;
  yachtBankLocked[1] = false; yachtBankLocked[2] = false; yachtBankLocked[3] = false; yachtBankLocked[4] = false;
  destroyedStrangeDice[1] = false; destroyedStrangeDice[2] = false; destroyedStrangeDice[3] = false; destroyedStrangeDice[4] = false;
  promotionConsumed[1] = false; promotionConsumed[2] = false; promotionConsumed[3] = false; promotionConsumed[4] = false;
  momentumState[1] = 'ready'; momentumState[2] = 'ready'; momentumState[3] = 'ready'; momentumState[4] = 'ready';
  momentumGainedScore[1] = 0; momentumGainedScore[2] = 0; momentumGainedScore[3] = 0; momentumGainedScore[4] = 0;
  if (typeof disconnectGrace !== 'undefined') {
    disconnectGrace[1] = 60; disconnectGrace[2] = 60; disconnectGrace[3] = 60; disconnectGrace[4] = 60;
  }
  window.matchLogHistory = [];

  rollsLeft = 3;
  currentRound = 1;
  currentPlayer = 1;
  keptDice = [];
  activeDice = [];

  if (els.gameLogContainer) {
    els.gameLogContainer.innerHTML = '<div class="log-empty-text">게임 로그가 없습니다.</div>';
  }

  [els.matchP1Box, els.matchP2Box].forEach(box => {
    if (box) {
      const avatarContainer = box.querySelector('.match-avatar-container');
      if (avatarContainer) {
        avatarContainer.classList.remove('disconnected');
        const flagOverlay = avatarContainer.querySelector('.forfeit-overlay');
        if (flagOverlay) flagOverlay.remove();
      }
    }
  });

  if (els.matchP1Disconnect) els.matchP1Disconnect.classList.add('hidden');
  if (els.matchP2Disconnect) els.matchP2Disconnect.classList.add('hidden');

  if (els.matchP1Name) els.matchP1Name.textContent = "Player 1";
  if (els.matchP2Name) els.matchP2Name.textContent = "Player 2";
  if (els.matchP1Avatar) els.matchP1Avatar.style.backgroundImage = 'none';
  if (els.matchP2Avatar) els.matchP2Avatar.style.backgroundImage = 'none';

  if (els.p1Name) {
    const textEl = els.p1Name.querySelector('.name-text');
    if (textEl) textEl.textContent = "Player 1";
    else els.p1Name.textContent = "Player 1";
  }
  if (els.p2Name) {
    const textEl = els.p2Name.querySelector('.name-text');
    if (textEl) textEl.textContent = "Player 2";
    else els.p2Name.textContent = "Player 2";
  }

  initScoreboard();
  updateScoreboard();
  updateTurnTimerUI();

  if (typeof diceEngine !== 'undefined' && diceEngine) {
    diceEngine.diceArray.forEach(die => die.isKept = false);
    diceEngine.arrangeAll(true);
    diceEngine.allowKeep = true;
  }
}

function startHotseatGame(mode = 'hotseat') {
  resetGameSession();
  window.isMultiplayer = false;
  gameMode = mode;
  window.lobbyPlayers = null;
  window.myPlayerInfo = null;

  updateMatchProfiles();
  startTurn();
}

function updateTurnHighlights() {
  const count = getActivePlayerCount();
  const myP = window.myPlayerIndex || 1;

  const myBox = document.getElementById('match-my-box');
  const myName = document.getElementById('match-my-name');
  const isMyTurn = (currentPlayer === myP);

  if (myBox) myBox.classList.toggle('active-turn', isMyTurn);
  if (myName) myName.classList.toggle('active-turn', isMyTurn);

  for (let p = 1; p <= count; p++) {
    const isCurrent = (p === currentPlayer);
    const oppBox = document.getElementById(`match-p${p}-box`);
    const oppName = document.getElementById(`match-p${p}-name`);

    if (oppBox) oppBox.classList.toggle('active-turn', isCurrent);
    if (oppName) oppName.classList.toggle('active-turn', isCurrent);
  }

  if (els.p1Name) els.p1Name.classList.toggle('active-turn', currentPlayer === 1);
  if (els.p2Name) els.p2Name.classList.toggle('active-turn', currentPlayer === 2);
  if (els.p1Profile) els.p1Profile.classList.toggle('active-turn', currentPlayer === 1);
  if (els.p2Profile) els.p2Profile.classList.toggle('active-turn', currentPlayer === 2);
}

function updateMatchProfiles() {
  const myBoxName = document.getElementById('match-my-name');
  const myBoxAvatar = document.getElementById('match-my-avatar');
  const oppContainer = document.getElementById('match-opponents-container');

  const myConnId = networkEngine.socket?.id;
  const myUid = getCurrentUser()?.uid;
  const players = window.lobbyPlayers || [];

  let me = players.find(p => p.connId === myConnId || (myUid && p.uid === myUid)) || players[0];
  let opponents = players.filter(p => p !== me);

  if (!me) {
    me = { nickname: "Player (Me)", avatarUrl: null };
  }
  if (opponents.length === 0) {
    opponents = [{ nickname: "Player 2", avatarUrl: null }];
  }

  if (myBoxName) myBoxName.textContent = me.nickname || "Player (Me)";
  if (myBoxAvatar) myBoxAvatar.style.backgroundImage = me.avatarUrl ? `url('${me.avatarUrl}')` : 'none';

  if (oppContainer) {
    oppContainer.innerHTML = '';
    opponents.forEach((opp, idx) => {
      const oppIdx = players.indexOf(opp) >= 0 ? players.indexOf(opp) + 1 : idx + 2;
      const isCurrentTurn = (oppIdx === currentPlayer);
      const oppBox = document.createElement('div');
      oppBox.className = `match-player-box ${isCurrentTurn ? 'active-turn' : ''}`;
      oppBox.id = `match-p${oppIdx}-box`;

      const avUrl = opp.avatarUrl ? `url('${opp.avatarUrl}')` : 'none';
      oppBox.innerHTML = `
        <div class="match-avatar-container" style="position: relative; display: inline-block;">
          <div class="match-avatar" id="match-p${oppIdx}-avatar" style="background-image: ${avUrl}; background-color: #ccc;"></div>
          <div class="disconnect-overlay hidden" id="match-p${oppIdx}-disconnect">
            <svg class="unplug-svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="overflow: visible;">
              <path d="m19 5 3-3"></path>
              <path d="m2 22 3-3"></path>
              <path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"></path>
              <path d="M7.5 13.5 10 11"></path>
              <path d="M10.5 16.5 13 14"></path>
              <path d="m17.7 3.7-2.3 2.3 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"></path>
            </svg>
            <span class="disconnect-timer-text" id="match-p${oppIdx}-disconnect-timer">60s</span>
          </div>
        </div>
        <div class="match-nickname ${isCurrentTurn ? 'active-turn' : ''}" id="match-p${oppIdx}-name">${opp.nickname || `Player ${oppIdx}`}</div>
      `;
      oppContainer.appendChild(oppBox);
    });
  }

  updateTurnHighlights();
}

function startMultiplayerGame() {
  resetGameSession();
  window.gameSessionStarted = true;
  window.isMultiplayer = true;
  // 방장은 1P, 게스트는 2P (현재 2인 대전 기준)
  if (window.lobbyPlayers && window.myPlayerInfo) {
    const idx = window.lobbyPlayers.indexOf(window.myPlayerInfo);
    window.myPlayerIndex = idx >= 0 ? idx + 1 : (window.myPlayerInfo.isHost ? 1 : 2);
  } else {
    window.myPlayerIndex = window.myPlayerInfo?.isHost ? 1 : 2;
  }

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

  initScoreboard();
  updateScoreboard();

  const user = getCurrentUser();
  const roomCode = els.lobbyCodeDisplay?.textContent?.trim() || networkEngine.roomCode || window.currentRoomCode;
  if (user?.uid && roomCode) {
    updateUserActiveGame(user.uid, roomCode, gameMode);
  }

  if (gameMode === 'normal') {
    showMatchInfo();
  } else {
    showAugment();
  }

  updateMatchProfiles();

  // 게임 로그 초기화
  if (els.gameLogContainer) {
    els.gameLogContainer.innerHTML = '';
  }

  updateScoreboard();
  startTurn();
}

let augmentTimerInterval = null;

function showAugmentSelectionModal(player, onSelect) {
  const modal = document.getElementById('augment-selection-modal');
  const title = document.getElementById('augment-modal-title');
  const optionsContainer = document.getElementById('augment-options');
  const timerElem = document.getElementById('augment-timer');
  const timerText = document.getElementById('augment-timer-text');

  if (!modal || !title || !optionsContainer) return;

  if (augmentTimerInterval) {
    clearInterval(augmentTimerInterval);
    augmentTimerInterval = null;
  }

  title.textContent = `Player ${player} 증강 선택`;
  optionsContainer.innerHTML = '';

  let timeLeft = 30;
  if (timerText) timerText.textContent = `${timeLeft}s`;
  if (timerElem) {
    timerElem.classList.remove('warning', 'paused');
  }

  const shuffled = [...augmentData].sort(() => 0.5 - Math.random());
  const selectedAugments = shuffled.slice(0, 3);

  const cleanupAndSelect = (aug) => {
    if (augmentTimerInterval) {
      clearInterval(augmentTimerInterval);
      augmentTimerInterval = null;
    }
    modal.classList.add('hidden');
    if (window.applyMutation) window.applyMutation(player, aug.mutationId);
    if (onSelect) onSelect();
  };

  selectedAugments.forEach(aug => {
    const btn = document.createElement('div');
    btn.className = 'augment-option';
    let desc = aug.description || aug.name + ' 증강이 적용됩니다.';

    const icon = aug.icon || getVariantSvg(aug.mutationId) || '';
    btn.innerHTML = `
      <div class="aug-slot-header">${icon} <span class="aug-slot-name">${aug.name}</span></div>
      <div class="aug-slot-desc">${desc}</div>
    `;
    btn.addEventListener('click', () => {
      cleanupAndSelect(aug);
    });
    optionsContainer.appendChild(btn);
  });

  augmentTimerInterval = setInterval(() => {
    timeLeft--;
    if (timerText) timerText.textContent = `${timeLeft}s`;
    if (timerElem) {
      if (timeLeft <= 10) timerElem.classList.add('warning');
      else timerElem.classList.remove('warning');
    }

    if (timeLeft <= 0) {
      clearInterval(augmentTimerInterval);
      augmentTimerInterval = null;
      // 3개 옵션 중 첫 번째 무작위 자동 선택
      const autoPick = selectedAugments[Math.floor(Math.random() * selectedAugments.length)];
      cleanupAndSelect(autoPick);
    }
  }, 1000);

  modal.classList.remove('hidden');
}

// === 턴 타임아웃 45초 제어 시스템 ===
let turnTimerInterval = null;
let turnTimeRemaining = 45;

function startTurnTimer(overrideTime = null) {
  stopTurnTimer();
  const isHotseat = !window.isMultiplayer || gameMode === 'hotseat' || gameMode === 'augmented-hotseat';
  if (isHotseat) {
    updateTurnTimerUI();
    return;
  }

  turnTimeRemaining = overrideTime !== null ? overrideTime : 45;
  const timerElem = document.getElementById('turn-timer') || els.turnTimer;
  if (timerElem) timerElem.classList.remove('paused');
  updateTurnTimerUI();

  turnTimerInterval = setInterval(() => {
    turnTimeRemaining--;
    updateTurnTimerUI();
    if (turnTimeRemaining <= 0) {
      stopTurnTimer();
      handleTurnTimeout();
    }
  }, 1000);
}

function stopTurnTimer() {
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
  }
}

function pauseTurnTimer() {
  if (turnTimerInterval) {
    clearInterval(turnTimerInterval);
    turnTimerInterval = null;
  }
  const timerElem = document.getElementById('turn-timer') || els.turnTimer;
  if (timerElem) timerElem.classList.add('paused');
}

function resumeTurnTimer() {
  const isHotseat = !window.isMultiplayer || gameMode === 'hotseat' || gameMode === 'augmented-hotseat';
  if (isHotseat) return;

  if (!turnTimerInterval && turnTimeRemaining > 0) {
    const timerElem = document.getElementById('turn-timer') || els.turnTimer;
    if (timerElem) timerElem.classList.remove('paused');
    updateTurnTimerUI();

    turnTimerInterval = setInterval(() => {
      turnTimeRemaining--;
      updateTurnTimerUI();
      if (turnTimeRemaining <= 0) {
        stopTurnTimer();
        handleTurnTimeout();
      }
    }, 1000);
  }
}

function updateTurnTimerUI() {
  const timerElem = document.getElementById('turn-timer') || els.turnTimer;
  const textEl = document.getElementById('turn-timer-text');
  const isHotseat = !window.isMultiplayer || gameMode === 'hotseat' || gameMode === 'augmented-hotseat';

  if (isHotseat) {
    if (textEl) textEl.textContent = "--";
    if (timerElem) {
      timerElem.classList.add('paused');
      timerElem.classList.remove('warning');
    }
    return;
  }

  if (textEl) textEl.textContent = `${turnTimeRemaining}s`;
  if (timerElem) {
    timerElem.classList.remove('paused');
    if (turnTimeRemaining <= 10) timerElem.classList.add('warning');
    else timerElem.classList.remove('warning');
  }
}

async function handleTurnTimeout() {
  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  const isCurrentPlayerDisconnected = Boolean(disconnectTimers[currentPlayer]);

  // 내 턴도 아니고, 턴 주인이 끊긴 상태도 아니라면 자동 타임아웃 족보 기입 무시
  if (!isMyTurn && !isCurrentPlayerDisconnected) return;

  let dice5 = [];
  if (rollsLeft === 3) {
    // 한 번도 주사위를 굴리지 않은 상태에서 타임아웃된 경우
    // 주사위 눈의 합계를 0으로 취급
    dice5 = [0, 0, 0, 0, 0];

    keptDice = [];
    activeDice = [];
    if (diceEngine) {
      diceEngine.diceArray.forEach(die => die.isKept = false);
      diceEngine.arrangeAll(true);
    }
  } else {
    // 최고 점수 족보 선택 및 자동 기입을 위해 굴러진 주사위 정보 획득
    let availableDice = [...keptDice, ...activeDice];
    if (availableDice.length === 0 && diceEngine?.diceArray) {
      availableDice = diceEngine.diceArray.map(d => d.value);
    }
    dice5 = availableDice.slice(0, 5);
    while (dice5.length < 5) dice5.push(1);
  }

  const fullDiceObjects = diceEngine?.diceArray ? diceEngine.diceArray.map(d => ({ value: d.value, type: d.config.type })) : [];
  const potentialScores = typeof calculateScores === 'function' ? calculateScores(dice5, activeMutations[currentPlayer] || {}, { bank: playerYachtBank[currentPlayer], fullDice: fullDiceObjects }) : {};

  let bestCatId = null;
  let maxScoreVal = -1;
  let bestScoreInfo = 0;

  categories.forEach(cat => {
    if (cat.isDivider) return;
    if (scores[currentPlayer][cat.id] !== undefined) return;

    const scoreInfo = potentialScores[cat.id] !== undefined ? potentialScores[cat.id] : 0;
    let netScore = 0;
    if (typeof scoreInfo === 'object' && scoreInfo !== null) {
      netScore = (scoreInfo.score || 0) + (scoreInfo.bonus || 0);
    } else {
      netScore = Number(scoreInfo) || 0;
    }

    if (netScore > maxScoreVal || bestCatId === null) {
      maxScoreVal = netScore;
      bestCatId = cat.id;
      bestScoreInfo = scoreInfo;
    }
  });

  if (bestCatId) {
    const catName = getCategoryDisplayName(bestCatId, currentPlayer);
    const scoreVal = typeof bestScoreInfo === 'object' ? (bestScoreInfo.score || 0) : (Number(bestScoreInfo) || 0);

    addGameLog({
      type: 'timeout',
      player: currentPlayer,
      round: currentRound,
      meta: {
        catId: bestCatId,
        catName: catName,
        score: scoreVal
      }
    }, 'timeout', window.isMultiplayer, currentPlayer);

    lockScore(bestCatId, bestScoreInfo, false, true);
  }
}

// === 네트워크 재접속 유예시간 (60초 누적 타이머) 시스템 ===
let disconnectGrace = { 1: 60, 2: 60, 3: 60, 4: 60 };
const disconnectTimers = { 1: null, 2: null, 3: null, 4: null };

function handlePlayerDisconnect(playerIndex) {
  const box = document.getElementById(`match-p${playerIndex}-box`) || (playerIndex === 1 ? document.getElementById('match-my-box') : null);
  const avatarContainer = box?.querySelector('.match-avatar-container');
  let overlay = document.getElementById(`match-p${playerIndex}-disconnect`) || (playerIndex === 1 ? els.matchP1Disconnect : els.matchP2Disconnect);
  let timerText = document.getElementById(`match-p${playerIndex}-disconnect-timer`) || (playerIndex === 1 ? els.matchP1DisconnectTimer : els.matchP2DisconnectTimer);

  if (avatarContainer) avatarContainer.classList.add('disconnected');
  if (overlay) overlay.classList.remove('hidden');
  if (timerText) timerText.textContent = `${disconnectGrace[playerIndex] !== undefined ? disconnectGrace[playerIndex] : 60}s`;

  if (disconnectTimers[playerIndex]) return;

  disconnectTimers[playerIndex] = setInterval(() => {
    if (disconnectGrace[playerIndex] === undefined) disconnectGrace[playerIndex] = 60;
    disconnectGrace[playerIndex]--;
    if (timerText) timerText.textContent = `${disconnectGrace[playerIndex]}s`;

    if (disconnectGrace[playerIndex] <= 0) {
      clearInterval(disconnectTimers[playerIndex]);
      disconnectTimers[playerIndex] = null;
      handleGameForfeit(playerIndex);
    }
  }, 1000);
}

function handlePlayerReconnect(playerIndex) {
  if (disconnectTimers[playerIndex]) {
    clearInterval(disconnectTimers[playerIndex]);
    disconnectTimers[playerIndex] = null;
  }

  const box = document.getElementById(`match-p${playerIndex}-box`) || (playerIndex === 1 ? document.getElementById('match-my-box') : null);
  const avatarContainer = box?.querySelector('.match-avatar-container');
  let overlay = document.getElementById(`match-p${playerIndex}-disconnect`) || (playerIndex === 1 ? els.matchP1Disconnect : els.matchP2Disconnect);

  if (avatarContainer) avatarContainer.classList.remove('disconnected');
  if (overlay) overlay.classList.add('hidden');
}


function startTurn() {
  stopTurnTimer();

  rollsLeft = 3;
  keptDice = [];
  activeDice = [];
  updateRollsUI();
  clearScorePreviews();

  els.gameStatus.textContent = `P${currentPlayer}의 턴 (라운드 ${currentRound}/12)`;

  updateMatchProfiles();
  updateTurnHighlights();

  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;

  if (typeof updateAugmentSidebar === 'function') updateAugmentSidebar(currentPlayer);

  // 게임 최선두 1라운드 P1 시작 시 '게임 시작!' 로그 기록
  if (currentRound === 1 && currentPlayer === 1 && (!window.matchLogHistory || window.matchLogHistory.length === 0)) {
    addGameLog('게임 시작!', 'turn-start', false, 0);
  }

  const proceedTurnStart = () => {
    startTurnTimer();
    addGameLog({ type: 'turn-start', player: currentPlayer, round: currentRound }, 'turn-start', false, currentPlayer);

    if (diceBoxReady) {
      els.btnRoll.disabled = !isMyTurn;
    }
  };

  if (gameMode === 'augmented-hotseat') {
    const currentAugCount = Object.keys(activeMutations[currentPlayer] || {}).length;
    let expectedCount = 0;
    if (currentRound >= 1) expectedCount = 1;
    if (currentRound >= 6) expectedCount = 2;
    if (currentRound >= 9) expectedCount = 3;

    if (currentAugCount < expectedCount) {
      // P1이 증강 선택을 처음 시작할 때 페이즈 안내 로그 출력
      if (currentPlayer === 1) {
        addGameLog(`${expectedCount}페이즈 증강 선택`, 'turn-start', false, 0);
      }

      els.btnRoll.disabled = true;
      showAugmentSelectionModal(currentPlayer, () => {
        if (currentPlayer === 1) {
          const p2Count = Object.keys(activeMutations[2] || {}).length;
          if (p2Count < expectedCount) {
            if (typeof updateAugmentSidebar === 'function') updateAugmentSidebar(2);
            showAugmentSelectionModal(2, () => {
              if (typeof updateAugmentSidebar === 'function') updateAugmentSidebar(1);
              proceedTurnStart();
            });
            return;
          }
        }
        proceedTurnStart();
      });
      return;
    }
  }

  proceedTurnStart();
}

function updateRollsUI() {
  els.rollsLeft.textContent = `남은 굴리기: ${rollsLeft}`;
  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  els.btnRoll.disabled = !isMyTurn || rollsLeft <= 0 || !diceBoxReady;
  if (typeof diceEngine !== 'undefined' && diceEngine) {
    const activeMuts = Object.values(activeMutations[currentPlayer] || {});
    let baseDiceCount = 5;
    const totalDiceAllowed = baseDiceCount + (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer] ? 1 : 0);

    // 주사위를 1회 이상 굴렸을 때(rollsLeft < 3) 킵/언킵 조작을 허용
    diceEngine.allowKeep = isMyTurn && (rollsLeft < 3);
  }
}

// 주사위 굴림
els.btnRoll.addEventListener('click', async () => {
  // 권한 검증: 본인 턴이 아니면 굴리기 불가
  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;

  // 로비(자유 연습) 모드일 경우 코어 게임 로직 무시
  if (els.appContainer?.classList.contains('mode-select-state') && !els.appContainer?.classList.contains('playing-state')) {
    els.btnRoll.disabled = true;

    // 킵된 주사위 외의 나머지만 굴림
    const keptCount = diceEngine.diceArray.filter(d => d.isKept).length;
    const specialConfigs = [];
    for (let i = 0; i < 5 - keptCount; i++) specialConfigs.push({ type: 'normal' });

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
  if (!isMyTurn || rollsLeft <= 0) return;

  pauseTurnTimer(); // 주사위 굴리는 동안 타이머 정지
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

  for (let i = 0; i < heavyCount; i++) specialConfigs.push({ type: 'heavy' });
  for (let i = 0; i < goldenCount; i++) specialConfigs.push({ type: 'golden' });
  for (let i = 0; i < octCount; i++) specialConfigs.push({ type: 'octahedron' });
  for (let i = 0; i < coupleCount; i++) specialConfigs.push({ type: 'couple' });
  for (let i = 0; i < sevensCount; i++) specialConfigs.push({ type: 'sevens' });

  const totalDiceAllowed = baseDiceCount + (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer] ? 1 : 0);
  const normalCountToRoll = totalDiceAllowed - keptConfigs.length - specialConfigs.length;

  for (let i = 0; i < normalCountToRoll; i++) specialConfigs.push({ type: 'normal' });

  // Custom Dice Engine Roll
  diceEngine.cleanUpDeadDice();

  const rolledCount = specialConfigs.length;
  if (keptConfigs.length === 0) {
    addGameLog({ type: 'roll-action', player: currentPlayer, meta: { rolledCount, keptValues: [] } }, 'roll-action', window.isMultiplayer, currentPlayer);
  } else {
    const keptValues = diceEngine.diceArray.filter(d => d.isKept).map(d => d.value).sort((a, b) => a - b);
    addGameLog({ type: 'roll-action', player: currentPlayer, meta: { rolledCount, keptValues } }, 'roll-action', window.isMultiplayer, currentPlayer);
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

    addGameLog({ type: 'roll-result', player: currentPlayer, meta: { values: activeDice } }, 'roll-result', window.isMultiplayer, currentPlayer);

    diceEngine.arrangeAll(true);

    const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
    els.btnRoll.disabled = !isMyTurn || rollsLeft <= 0;
    resumeTurnTimer(); // 롤링 완료 후 타이머 재개
    updateScorePreviews(); // 롤링 완료 후 족보 미리보기 및 기입 버튼 활성화
  }, 100); // 틱틱거림 방지를 위해 딜레이 대폭 축소
});

// 점수 미리보기
function updateScorePreviews() {
  clearScorePreviews();

  // 본인 턴이 아니거나 멀티플레이어 상대 턴인 경우 점수 미리보기 연산 생략
  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  if (!isMyTurn) {
    return;
  }

  // 아직 주사위를 굴리지 않은 턴 시작 직후인 경우 미리보기 생략
  if (rollsLeft === 3 && activeDice.length === 0 && keptDice.length === 0) {
    return;
  }

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
  if (!scores[currentPlayer]) scores[currentPlayer] = {};
  if (!activeMutations[currentPlayer]) activeMutations[currentPlayer] = {};

  categories.forEach(cat => {
    if (cat.isDivider) return;
    const cellId = `p${currentPlayer}-${cat.id}`;
    const cell = document.getElementById(cellId);

    // 이미 확정된 점수면 스킵
    if (scores[currentPlayer] && scores[currentPlayer][cat.id] !== undefined) return;

    // "선택되지 않음" 상태 적용
    if (cell) {
      cell.textContent = '-';
      cell.style.color = '#888';
      cell.classList.remove('suggested');
      cell.onclick = null;
      cell.title = `족보에 기입할 주사위를 ${neededCount}개 선택해주세요.`;
    }
  });
}

function previewScores(diceArray) {
  if (!scores[currentPlayer]) scores[currentPlayer] = {};
  if (!activeMutations[currentPlayer]) activeMutations[currentPlayer] = {};
  if (playerYachtBank[currentPlayer] === undefined) playerYachtBank[currentPlayer] = 0;

  // Get full dice array from engine to pass configs to scoreEngine if needed
  const fullDiceObjects = diceEngine.diceArray.map(d => ({ value: d.value, type: d.config.type }));
  if (diceArray.length !== 5) return;
  const potentialScores = calculateScores(diceArray, activeMutations[currentPlayer], { bank: playerYachtBank[currentPlayer], fullDice: fullDiceObjects });

  categories.forEach(cat => {
    if (cat.isDivider) return;
    if (scores[currentPlayer] && scores[currentPlayer][cat.id] !== undefined) return;

    const cellId = `p${currentPlayer}-${cat.id}`;
    const cell = document.getElementById(cellId);
    if (!cell) return;

    const scoreObj = typeof potentialScores[cat.id] === 'object' ? { ...potentialScores[cat.id] } : { score: potentialScores[cat.id], bonus: 0 };
    
    // 추진력 발동 준비(active) 상태 시 예상 점수에 1.5배 가산분 미리보기 추가
    const playerMuts = Object.values(activeMutations[currentPlayer] || {});
    if (playerMuts.includes('momentum') && momentumState[currentPlayer] === 'active' && scoreObj.score > 0) {
      const origTotal = scoreObj.score + (scoreObj.bonus || 0);
      const newTotal = Math.floor(origTotal * 1.5);
      const mBonus = newTotal - origTotal;
      scoreObj.bonus = (scoreObj.bonus || 0) + mBonus;
    }

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
  const count = getActivePlayerCount();
  categories.forEach(cat => {
    if (cat.isDivider) return;
    for (let p = 1; p <= count; p++) {
      const cell = document.getElementById(`p${p}-${cat.id}`);
      if (cell) {
        if (!scores[p] || scores[p][cat.id] === undefined) {
          cell.style.color = ''; // 인라인 색상 초기화
          cell.classList.remove('suggested');
          cell.onclick = null; // 이벤트 제거
          cell.title = '';
        }
      }
    }
  });
  updateScoreboard();
}

function getUpperSum(player) {
  if (!scores[player]) scores[player] = {};
  if (!activeMutations[player]) activeMutations[player] = {};
  const upperCats = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes'];
  return upperCats.reduce((sum, catId) => {
    let scoreVal = scores[player][catId];
    let score = scoreVal ? (typeof scoreVal === 'object' ? scoreVal.score : scoreVal) : 0;

    const mutId = activeMutations[player] ? activeMutations[player][catId] : null;
    if (mutId && mutationDefinitions[mutId] && mutationDefinitions[mutId].excludeFromUpper) {
      score = 0; // 상단 보너스 합산 제외
    }
    return sum + score;
  }, 0);
}

function lockScore(catId, scoreInfo, isSync = false, force = false) {
  stopTurnTimer();
  if (!force && rollsLeft === 3 && activeDice.length === 0 && keptDice.length === 0) return;
  if (!scores[currentPlayer]) scores[currentPlayer] = {};

  if (window.isMultiplayer && !isSync) {
    networkEngine.sendMessage({ type: 'sync_score', catId, scoreInfo, force });
  }

  // scoreInfo might be an object { score, bonus } or a number
  let scoreObj = typeof scoreInfo === 'object' ? scoreInfo : { score: scoreInfo, bonus: 0, bonusDetails: [] };

  // 추진력 (momentum) 증강 처리 로직
  const playerMutations = Object.values(activeMutations[currentPlayer] || {});
  if (playerMutations.includes('momentum')) {
    if (!momentumState[currentPlayer]) momentumState[currentPlayer] = 'ready';

    if (momentumState[currentPlayer] === 'ready' && scoreObj.score === 0) {
      momentumState[currentPlayer] = 'active';
      addGameLog({ type: 'system', message: `${getPlayerLabel(currentPlayer)}의 [추진력] 증강이 발동 준비되었습니다! (다음 턴 점수 획득 시 1.5배)` }, 'system', window.isMultiplayer, currentPlayer);
    } else if (momentumState[currentPlayer] === 'active' && scoreObj.score > 0) {
      const originalScore = scoreObj.score;
      const totalOriginal = originalScore + (scoreObj.bonus || 0);
      const newTotal = Math.floor(totalOriginal * 1.5);
      const momentumBonus = newTotal - totalOriginal;

      scoreObj.bonus = (scoreObj.bonus || 0) + momentumBonus;
      if (!scoreObj.bonusDetails) scoreObj.bonusDetails = [];
      scoreObj.bonusDetails.push({ value: momentumBonus, color: '#D4AF37' }); // 노란색 표기

      momentumState[currentPlayer] = 'used';
      momentumGainedScore[currentPlayer] = newTotal;

      addGameLog({ type: 'system', message: `${getPlayerLabel(currentPlayer)}의 [추진력] 증강이 발동하여 획득 점수가 1.5배로 증가했습니다! (${newTotal}점 획득)` }, 'system', window.isMultiplayer, currentPlayer);
    }
  }

  scores[currentPlayer][catId] = scoreObj;

  // 타임아웃에 의한 자동 기입인 경우 일반 족보 기입 로그 작성을 생략 (중복 방지)
  if (!force) {
    const catName = getCategoryDisplayName(catId, currentPlayer);
    addGameLog({ type: 'score-record', player: currentPlayer, meta: { catId, catName, score: scoreObj.score } }, 'score-record', false, currentPlayer);
  }


  // 이상한 주사위 파괴 체크 (굴려서 6이 나오면 무조건 파괴)
  diceEngine.diceArray.forEach(d => {
    if (d.config.type === 'weird' && d.value === 6) {
      destroyedStrangeDice[currentPlayer] = true;
    }
  });

  // 프로모션 주사위 소모 체크 (프로모션 주사위 눈금이 6인 상태에서 족보 기입 완료 시 소모)
  const usedDice = diceEngine.diceArray.length > 5 ? diceEngine.diceArray.filter(d => d.isKept) : diceEngine.diceArray;
  usedDice.forEach(d => {
    if (d.config.type === 'promotion' && d.value === 6) {
      promotionConsumed[currentPlayer] = true;
      addGameLog({ type: 'system', message: `${getPlayerLabel(currentPlayer)}의 프로모션 주사위가 소모되어 일반 주사위로 복구되었습니다.` }, 'system', window.isMultiplayer, currentPlayer);
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

  const totalCount = getActivePlayerCount();

  // 라운드 마지막 플레이어 턴 종료 시 요트 뱅크 이자 적립
  if (currentPlayer === totalCount) {
    for (let p = 1; p <= totalCount; p++) {
      if (activeMutations[p] && activeMutations[p]['yacht'] === 'yacht-bank' && !yachtBankLocked[p] && scores[p]['yacht'] === undefined) {
        playerYachtBank[p] += 2;
      }
    }
  }

  updateQuestProgress(currentPlayer, catId, scoreObj);

  clearScorePreviews();
  updateScoreboard();

  // 턴 전환 로직 (1 -> 2 -> ... -> N -> 1)
  if (currentPlayer < totalCount) {
    currentPlayer++;
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
  if (window.isMultiplayer) {
    networkEngine.sendMessage({ type: 'game_ended' });
  }
  const user = getCurrentUser();
  if (user?.uid) {
    clearUserActiveGame(user.uid);
  }
  const count = getActivePlayerCount();
  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);

  let playerStats = [];
  for (let p = 1; p <= count; p++) {
    const tot = Object.values(scores[p] || {}).reduce(sumObj, 0);
    const pData = window.lobbyPlayers ? window.lobbyPlayers[p - 1] : null;
    const nickname = pData ? pData.nickname : `Player ${p}`;
    const avatarUrl = pData ? pData.avatarUrl : null;
    playerStats.push({ playerIndex: p, nickname, totalScore: tot, avatarUrl, isForfeited: forfeitedPlayers[p] });
  }

  // 정렬: 기권하지 않은 플레이어(점수 내림차순) -> 기권 플레이어(점수 내림차순)
  playerStats.sort((a, b) => {
    if (a.isForfeited !== b.isForfeited) {
      return a.isForfeited ? 1 : -1; // 기권한 경우 하단 배치
    }
    return b.totalScore - a.totalScore;
  });

  const activePlayers = playerStats.filter(s => !s.isForfeited);

  const container = document.getElementById('endgame-scores-container');
  if (container) {
    container.innerHTML = '';
    playerStats.forEach((stat, idx) => {
      // 순위 계산: 기권 시 "-", 정상 완주 시 기권 미포함 그룹 내 순위
      let isWinner = false;
      let rankBadge = '';

      if (stat.isForfeited) {
        rankBadge = `<span class="endgame-rank-badge rank-forfeit" style="background: #e0e0e0; color: #888; font-weight: bold;">-</span>`;
      } else {
        const activeRank = activePlayers.findIndex(s => s.playerIndex === stat.playerIndex);
        isWinner = activeRank === 0 && (activePlayers.length === 1 || stat.totalScore > (activePlayers[1]?.totalScore || -1));
        rankBadge = isWinner ? '<span class="endgame-rank-badge rank-1">🏆 1위</span>' : `<span class="endgame-rank-badge">${activeRank + 1}위</span>`;
      }

      const card = document.createElement('div');
      card.className = `endgame-score-card ${isWinner ? 'winner-card' : ''} ${stat.isForfeited ? 'forfeit-card' : ''}`;

      const avatarStyle = stat.avatarUrl ? `background-image: url('${stat.avatarUrl}');` : 'background-color: #ccc;';
      const forfeitText = '';
      const scoreDisplayStyle = stat.isForfeited ? 'text-decoration: line-through !important; color: #888 !important;' : '';

      card.innerHTML = `
        <div class="endgame-player-info">
          ${rankBadge}
          <div class="match-avatar" style="${avatarStyle} width: 32px; height: 32px; flex-shrink: 0;"></div>
          <span>${stat.nickname}${forfeitText}</span>
        </div>
        <div class="endgame-score-val" style="${scoreDisplayStyle}">${stat.totalScore}점</div>
      `;
      container.appendChild(card);
    });
  }

  const winnerTitle = document.getElementById('endgame-winner');
  if (winnerTitle && !winnerTitle.textContent.includes('몰수승')) {
    if (activePlayers.length === 0) {
      winnerTitle.textContent = "게임 종료";
    } else {
      const topPlayer = activePlayers[0];
      const isDraw = activePlayers.length > 1 && activePlayers[0].totalScore === activePlayers[1].totalScore;
      if (isDraw) {
        winnerTitle.textContent = "무승부!";
      } else {
        winnerTitle.textContent = `${topPlayer.nickname} 승리!`;
      }
    }
  }

  els.endgameModal?.classList.remove('hidden');

  if (window.isMultiplayer) {
    const saverPlayer = activePlayers[0] ? activePlayers[0].playerIndex : 1;
    if (window.myPlayerIndex === saverPlayer) {
      saveMatchData();
    }
  }
}

async function saveMatchData() {
  const count = getActivePlayerCount();
  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);

  let playersData = {};
  let playerUids = [];
  let maxScore = -1;
  let topUids = [];

  const cleanUid = (raw) => {
    if (!raw || typeof raw !== 'string') return raw;
    if (raw.startsWith('guest')) return raw;
    return raw.split('_')[0];
  };

  const addUidToPlayerUids = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const cUid = cleanUid(raw);
    if (cUid && !cUid.startsWith('guest')) {
      if (!playerUids.includes(cUid)) playerUids.push(cUid);
    }
  };

  if (window.lobbyPlayers && Array.isArray(window.lobbyPlayers)) {
    window.lobbyPlayers.forEach(pl => {
      addUidToPlayerUids(pl?.uid);
    });
  }
  const curUser = getCurrentUser();
  if (curUser?.uid) {
    addUidToPlayerUids(curUser.uid);
  }

  for (let p = 1; p <= count; p++) {
    const pInfo = window.lobbyPlayers ? window.lobbyPlayers[p - 1] : null;
    let rawUid = pInfo?.uid || forfeitedPlayerUids[p];
    if (!rawUid && p === window.myPlayerIndex && curUser?.uid) {
      rawUid = curUser.uid;
    }
    let uid = cleanUid(rawUid);
    if (!uid) {
      uid = `guest_p${p}`;
    }
    const nickname = pInfo?.nickname || `Player ${p}`;
    const avatarUrl = pInfo?.avatarUrl || null;
    const totScore = Object.values(scores[p] || {}).reduce(sumObj, 0);
    const isForfeited = Boolean(forfeitedPlayers[p]);

    addUidToPlayerUids(rawUid);

    if (!isForfeited) {
      if (totScore > maxScore) {
        maxScore = totScore;
        topUids = [uid];
      } else if (totScore === maxScore) {
        topUids.push(uid);
      }
    }

    playersData[`p${p}`] = {
      uid: uid,
      nickname: nickname,
      avatarUrl: avatarUrl,
      totalScore: totScore,
      isForfeited: isForfeited,
      isHost: pInfo ? pInfo.isHost : (p === 1),
      scores: Object.fromEntries(
        Object.entries(scores[p] || {}).map(([k, v]) => [k, typeof v === 'object' ? v.score : v])
      ),
      augments: Object.values(activeMutations[p] || {})
    };
  }

  const winnerUid = topUids.length === 1 ? topUids[0] : (topUids.length > 1 ? 'draw' : 'none');

  const matchDoc = {
    mode: gameMode,
    timestamp: serverTimestamp(),
    winnerUid: winnerUid,
    playerUids: playerUids,
    players: playersData,
    playLogs: window.matchLogHistory || []
  };

  try {
    // 1. matches 컬렉션에 매치 결과 저장
    await addDoc(collection(db, "matches"), matchDoc);

    // 2. 각 유저별 stats 데이터 누적 업데이트
    const updateStats = async (uid, isWin, score, augmentsList) => {
      if (!uid || uid.startsWith('guest') || uid === 'undefined') return;
      const userRef = doc(db, "users", uid);

      try {
        await runTransaction(db, async (transaction) => {
          const sfDoc = await transaction.get(userRef);
          if (!sfDoc.exists()) return;

          const oldData = sfDoc.data();
          const stats = oldData.stats || {};
          const gp = (stats.gamesPlayed || 0) + 1;
          const wins = (stats.wins || 0) + (isWin ? 1 : 0);
          const losses = (stats.losses || 0) + (!isWin && winnerUid !== 'draw' ? 1 : 0);
          const highest = Math.max(stats.highestScore || 0, score);
          const avg = (((stats.averageScore || 0) * (stats.gamesPlayed || 0)) + score) / gp;

          const fav = stats.favoriteAugments || {};
          augmentsList.forEach(aug => {
            fav[aug] = (fav[aug] || 0) + 1;
          });

          transaction.update(userRef, {
            stats: {
              gamesPlayed: gp,
              wins: wins,
              losses: losses,
              highestScore: highest,
              averageScore: parseFloat(avg.toFixed(1)),
              favoriteAugments: fav
            }
          });
        });
      } catch (txErr) {
        console.error("Stats Transaction failed: ", txErr);
      }
    };

    for (let p = 1; p <= count; p++) {
      const pData = playersData[`p${p}`];
      if (pData && pData.uid) {
        const isWin = (winnerUid !== 'draw' && winnerUid === pData.uid);
        await updateStats(pData.uid, isWin, pData.totalScore, pData.augments);
      }
    }

    console.log("Match and stats successfully recorded in Firestore!");
    const currentUser = getCurrentUser();
    if (currentUser?.uid) {
      refreshUserHistory(currentUser.uid);
    }
  } catch (err) {
    console.error("Failed to save match data: ", err);
  }
}

els.btnReturnLobby.addEventListener('click', async () => {
  // 1. 모달 닫기 및 페이드 아웃
  els.endgameModal.classList.add('hidden');
  if (els.appContainer) els.appContainer.style.opacity = '0';

  const user = getCurrentUser();
  if (user?.uid) {
    await clearUserActiveGame(user.uid);
  }

  setTimeout(() => {
    // 2. 세션 및 UI 완전 리셋
    resetGameSession();
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
  { id: 'bonus', krName: '보너스', enName: 'Bonus (0/63)', isDivider: true },
  { id: 'choice', krName: '초이스', enName: `${getSpecialSvg('choice')} Choice` },
  { id: '4oak', krName: '포카인드', enName: `${getSpecialSvg('4oak')} 4 of a Kind` },
  { id: 'fullhouse', krName: '풀하우스', enName: `${getSpecialSvg('fullhouse')} Full House` },
  { id: 's-straight', krName: '스몰 스트레이트', enName: `${getSpecialSvg('s-straight')} S. Straight` },
  { id: 'l-straight', krName: '라지 스트레이트', enName: `${getSpecialSvg('l-straight')} L. Straight` },
  { id: 'yacht', krName: '요트', enName: `${getSpecialSvg('yacht')} Yacht` }
];

function getActivePlayerCount() {
  if (window.isMultiplayer && window.lobbyPlayers && window.lobbyPlayers.length >= 2) {
    return window.lobbyPlayers.length;
  }
  return 2;
}

function shouldShowRightCategory() {
  const count = getActivePlayerCount();
  const mode = gameMode || window.pendingLobbyMode || 'normal';
  const isAugmented = (mode === 'augmented' || mode === 'augmented-hotseat');
  if (!isAugmented && count >= 3) {
    return false;
  }
  return true;
}

function initScoreboard() {
  const count = getActivePlayerCount();
  const showRight = shouldShowRightCategory();
  const players = window.lobbyPlayers || [];

  // 1. 헤더 (thead) 동적 생성
  const thead = document.querySelector('#score-table thead');
  if (thead) {
    let headerHtml = '<tr><th class="col-cat highlight-dark">Categories</th>';
    for (let i = 1; i <= count; i++) {
      const pData = players[i - 1];
      const pName = pData ? pData.nickname : `P${i}`;
      headerHtml += `<th id="p${i}-name" class="col-player"><div class="name-text">${pName}</div></th>`;
    }
    if (showRight) {
      headerHtml += '<th class="col-cat highlight-dark">Categories</th>';
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;
  }

  // 2. 바디 (tbody) 동적 생성
  els.scoreTbody.innerHTML = '';
  categories.forEach(cat => {
    const tr = document.createElement('tr');
    let cellsHtml = '';

    if (cat.isDivider && cat.id === 'bonus') {
      cellsHtml += `<th class="col-cat" id="cat-title-left-${cat.id}">Bonus (0/63)</th>`;
      for (let i = 1; i <= count; i++) {
        cellsHtml += `<td id="p${i}-${cat.id}" style="font-weight: bold; color: #888;">+35</td>`;
      }
      if (showRight) {
        cellsHtml += `<th class="col-cat" id="cat-title-right-${cat.id}">Bonus (0/63)</th>`;
      }
      tr.style.backgroundColor = '#ddd';
    } else {
      cellsHtml += `<th class="col-cat" id="cat-title-left-${cat.id}">${cat.enName}</th>`;
      for (let i = 1; i <= count; i++) {
        cellsHtml += `<td class="score-cell" id="p${i}-${cat.id}"></td>`;
      }
      if (showRight) {
        cellsHtml += `<th class="col-cat" id="cat-title-right-${cat.id}">${cat.enName}</th>`;
      }
    }
    tr.innerHTML = cellsHtml;
    els.scoreTbody.appendChild(tr);
  });

  // 3. 총합(TOTAL) 렌더링
  const totalTr = document.createElement('tr');
  totalTr.style.borderTop = '1px solid var(--border-color)';
  let totalHtml = '<th class="col-cat highlight-dark" style="font-weight: bold;">TOTAL</th>';
  for (let i = 1; i <= count; i++) {
    totalHtml += `<td id="p${i}-total" class="score-cell filled" style="font-weight: bold; color: #222; background-color: #ffffff; border-radius: 0;">0</td>`;
  }
  if (showRight) {
    totalHtml += '<th class="col-cat highlight-dark" style="font-weight: bold;">TOTAL</th>';
  }
  totalTr.innerHTML = totalHtml;
  els.scoreTbody.appendChild(totalTr);
}

function updateScoreboard() {
  const count = getActivePlayerCount();
  const upperCats = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes'];

  categories.forEach(cat => {
    if (cat.isDivider && cat.id === 'bonus') {
      const titleLeft = document.getElementById(`cat-title-left-${cat.id}`);
      const titleRight = document.getElementById(`cat-title-right-${cat.id}`);
      const p1Upper = getUpperSum(1);
      const p2Upper = getUpperSum(2);

      if (titleLeft) titleLeft.textContent = `Bonus (${p1Upper}/${upperBonusThreshold[1] || 63})`;
      if (titleRight) titleRight.textContent = `Bonus (${p2Upper}/${upperBonusThreshold[2] || 63})`;

      for (let p = 1; p <= count; p++) {
        const cell = document.getElementById(`p${p}-${cat.id}`);
        if (cell) {
          const pUpper = getUpperSum(p);
          const isUpperComplete = upperCats.every(c => scores[p] && scores[p][c] !== undefined);
          const threshold = upperBonusThreshold[p] || 63;

          const bonusVal = (questProgress[p]?.stepRewarded) ? 55 : 35;
          if (pUpper >= threshold) {
            cell.innerHTML = `<span style="color: #D4AF37; font-weight: bold;">+${bonusVal}</span>`;
          } else if (isUpperComplete) {
            cell.innerHTML = `<span style="text-decoration: line-through; color: #888; font-weight: bold;">+${bonusVal}</span>`;
          } else {
            cell.innerHTML = `<span style="color: #888; font-weight: bold;">+${bonusVal}</span>`;
          }
        }
      }
    } else {
      for (let p = 1; p <= count; p++) {
        const cell = document.getElementById(`p${p}-${cat.id}`);
        if (cell) {
          if (scores[p] && scores[p][cat.id] !== undefined) {
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
            cell.style.color = '';
            cell.title = '';
          } else if (!cell.classList.contains('suggested')) {
            if (cat.id === 'yacht' && activeMutations[p] && activeMutations[p]['yacht'] === 'yacht-bank') {
              cell.textContent = playerYachtBank[p] || 0;
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
      }
    }
  });

  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);

  for (let p = 1; p <= count; p++) {
    let pTotal = Object.values(scores[p] || {}).reduce(sumObj, 0);

    if (activeMutations[p] && activeMutations[p]['yacht'] === 'yacht-bank' && (scores[p] && scores[p]['yacht'] === undefined)) {
      pTotal += (playerYachtBank[p] || 0);
    }

    // 퀘스트 완수 보너스 점수 합산
    const qBonus = questProgress[p]?.questBonus || 0;
    pTotal += qBonus;

    const pTotalEl = document.getElementById(`p${p}-total`);
    if (pTotalEl) {
      if (qBonus > 0) {
        pTotalEl.innerHTML = `${pTotal} <span style="color: #D4AF37;">+${qBonus}</span>`;
      } else {
        pTotalEl.textContent = pTotal;
      }
    }
  }
}

initScoreboard();
updateScoreboard();
updateTurnTimerUI();

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
    if (els.gameStatus) els.gameStatus.textContent = '로비 (자유 연습)';
    if (els.rollsLeft) els.rollsLeft.textContent = '무한 굴리기';
    diceEngine.allowKeep = true;
  }

  // --- 디버그 모드 자동 시작 ---
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log("Debug mode: Auto-starting hotseat game");
    gameMode = 'hotseat';
    els.lobbyOverlay?.classList.add('hidden');
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

function updateQuestProgress(player, catId, scoreObj) {
  if (!questProgress[player]) questProgress[player] = {};
  const prog = questProgress[player];
  const s = scores[player] || {};
  const myMutations = Object.values(activeMutations[player] || {});

  const addReward = (questName, bonusAmount) => {
    prog.questBonus = (prog.questBonus || 0) + bonusAmount;
    addGameLog({ type: 'system', message: `${getPlayerLabel(player)}이 [${questName}] 퀘스트를 달성하여 보너스 +${bonusAmount}점을 획득했습니다!` }, 'system', window.isMultiplayer, player);
  };

  // 1. 티끌 모아 태산 (every-little): 1의 눈이 1개 이상 포함된 족보 기입 (+15점)
  if (myMutations.includes('every-little') && !prog.everyLittleRewarded) {
    const allDice = [...keptDice, ...activeDice];
    const finalDice = allDice.length >= 5 ? allDice.slice(0, 5) : (diceEngine?.diceArray ? diceEngine.diceArray.map(d => d.value) : []);
    if (finalDice.includes(1) || catId === 'aces') {
      prog.everyLittleCount = (prog.everyLittleCount || 0) + 1;
      if (prog.everyLittleCount >= 7) {
        prog.everyLittleRewarded = true;
        addReward('티끌 모아 태산', 15);
      }
    }
  }

  // 2. 재빠른 스트레이트 (fast-straight): 8턴 안에 S.Straight 및 L.Straight 모두 점수 기입 (+15점)
  if (myMutations.includes('fast-straight') && !prog.fastStraightRewarded) {
    if (currentRound <= 8) {
      if (s['s-straight']?.score > 0 && s['l-straight']?.score > 0) {
        prog.fastStraightRewarded = true;
        addReward('재빠른 스트레이트', 15);
      }
    }
  }

  // 3. 낭비할 시간 없다 (no-time-to-waste): 리롤 없이(첫 굴림 후 바로 기입, rollsLeft === 2) 족보 기입 (+15점)
  if (myMutations.includes('no-time-to-waste') && !prog.noTimeRewarded) {
    if (rollsLeft === 2) {
      prog.noTimeCount = (prog.noTimeCount || 0) + 1;
      if (prog.noTimeCount >= 3) {
        prog.noTimeRewarded = true;
        addReward('낭비할 시간 없다', 15);
      }
    }
  }

  // 4. 차근차근 (step-by-step): Aces부터 Sixes까지 순서대로 기입 (상단 보너스 +55점 강화)
  if (myMutations.includes('step-by-step') && !prog.stepRewarded && !prog.stepFailed) {
    const upperOrder = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes'];
    if (upperOrder.includes(catId)) {
      const stepCount = prog.stepCount || 0;
      const expectedCat = upperOrder[stepCount];
      if (catId === expectedCat) {
        prog.stepCount = stepCount + 1;
        if (prog.stepCount >= 6) {
          prog.stepRewarded = true;
          addGameLog({ type: 'system', message: `${getPlayerLabel(player)}이 [차근차근] 퀘스트를 달성하여 상단 보너스가 +55점으로 강화되었습니다!` }, 'system', window.isMultiplayer, player);
        }
      } else {
        prog.stepFailed = true;
      }
    }
  }

  // 5. 두 집 살림 (two-households): Choice를 Full House 모양으로, Full House 족보 기입 (+10점)
  if (myMutations.includes('two-households') && !prog.twoHouseholdsRewarded) {
    if (catId === 'choice') {
      const allDice = [...keptDice, ...activeDice];
      const finalDice = allDice.length >= 5 ? allDice.slice(0, 5) : (diceEngine?.diceArray ? diceEngine.diceArray.map(d => d.value) : []);
      const counts = {};
      finalDice.forEach(v => counts[v] = (counts[v] || 0) + 1);
      const cVals = Object.values(counts).sort((a, b) => b - a);
      if ((cVals[0] >= 3 && cVals[1] >= 2) || cVals[0] >= 5) {
        prog.twoHouseholdsChoiceDone = true;
      }
    }
    if (prog.twoHouseholdsChoiceDone && s['fullhouse']?.score > 0) {
      prog.twoHouseholdsRewarded = true;
      addReward('두 집 살림', 10);
    }
  }

  // 6. 알박기 (holdout): 9턴 이후에 Full House 기입 (+7점)
  if (myMutations.includes('holdout') && !prog.holdoutRewarded) {
    if (catId === 'fullhouse') {
      if (currentRound >= 9) {
        prog.holdoutRewarded = true;
        addReward('알박기', 7);
      }
    }
  }

  // 7. 신중한 스트레이트 (cautious-straight): S.Straight를 L.Straight보다 먼저 기입 (+7점)
  if (myMutations.includes('cautious-straight') && !prog.cautiousRewarded && !prog.cautiousFailed) {
    if (catId === 'l-straight' && s['s-straight'] === undefined) {
      prog.cautiousFailed = true;
    } else if (catId === 'l-straight' && s['s-straight'] !== undefined && !prog.cautiousFailed) {
      prog.cautiousRewarded = true;
      addReward('신중한 스트레이트', 7);
    }
  }
}

// -----------------------------------------------------
// 5. 디버그 도구
// -----------------------------------------------------
// 좌측 증강 섹션(UI) 업데이트 함수
function getQuestProgressText(player, mutId) {
  const prog = questProgress[player] || {};
  const s = scores[player] || {};
  let questLines = [];
  let status = 'in-progress';

  const line = (text, isDone, isFailed = false) => {
    const isInactive = isFailed || status === 'failed' || isDone;
    const opacity = isDone ? '0.7' : '0.6';
    const content = isInactive 
      ? `<span style="text-decoration: line-through; opacity: ${opacity};"><strong><u>퀘스트</u></strong>: ${text}</span>` 
      : `<strong><u>퀘스트</u></strong>: ${text}`;
    return `<div style="margin-top: 4px;">${content}</div>`;
  };

  switch (mutId) {
    case 'fast-straight':
      if (prog.fastStraightRewarded) status = 'completed';
      else if (currentRound > 8 && !(s['s-straight']?.score > 0 && s['l-straight']?.score > 0)) status = 'failed';
      questLines.push(line('8턴 안에 S. Straight 기입', s['s-straight']?.score > 0));
      questLines.push(line('8턴 안에 L. Straight 기입', s['l-straight']?.score > 0));
      break;

    case 'no-time-to-waste':
      const count = prog.noTimeCount || 0;
      if (prog.noTimeRewarded) status = 'completed';
      questLines.push(line(`리롤 없이 족보 기입 (${count}/3)`, count >= 3));
      break;

    case 'step-by-step':
      const stepCount = prog.stepCount || 0;
      if (prog.stepRewarded) status = 'completed';
      else if (prog.stepFailed) status = 'failed';
      questLines.push(line(`Aces부터 Sixes까지 순서대로 기입 (${stepCount}/6)`, stepCount >= 6));
      break;

    case 'two-households':
      if (prog.twoHouseholdsRewarded && s['fullhouse']?.score > 0) status = 'completed';
      questLines.push(line('Choice 족보를 Full House 형태로 기입', prog.twoHouseholdsRewarded));
      questLines.push(line('Full House 족보 기입', s['fullhouse']?.score > 0));
      break;

    case 'holdout':
      if (prog.holdoutRewarded) status = 'completed';
      else if (s['fullhouse'] !== undefined && !prog.holdoutRewarded) status = 'failed';
      questLines.push(line('9턴 이후에 Full House 기입', prog.holdoutRewarded));
      break;

    case 'cautious-straight':
      if (prog.cautiousRewarded) status = 'completed';
      else if (prog.cautiousFailed) status = 'failed';
      questLines.push(line('S. Straight를 L. Straight 보다 먼저 기입', s['s-straight'] !== undefined && !prog.cautiousFailed));
      questLines.push(line('L. Straight 기입', prog.cautiousRewarded));
      break;

    case 'every-little':
      const elCount = prog.everyLittleCount || 0;
      if (prog.everyLittleRewarded) status = 'completed';
      questLines.push(line(`1의 눈을 포함하여 족보 기입 (${elCount}/7)`, elCount >= 7));
      break;
  }

  let resultHTML = '';
  if (status === 'completed') {
    resultHTML += '<div style="color: #D4AF37; font-weight: bold; margin-top: 2px;">퀘스트 성공</div>';
  } else if (status === 'failed') {
    resultHTML += '<div style="color: #e74c3c; font-weight: bold; margin-top: 2px;">퀘스트 실패</div>';
  } else {
    resultHTML += '<div style="color: #3498db; font-weight: bold; margin-top: 2px;">퀘스트 진행 중</div>';
  }

  resultHTML += '<hr style="margin: 4px 0 8px 0; border: none; border-top: 1px dashed #ccc;">';
  resultHTML += questLines.join('');

  return resultHTML;
}


// -----------------------------------------------------
// 5. 디버그 및 핫시트 UI 도구
// -----------------------------------------------------
window.updateAugmentSidebar = function (player) {
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

      let extraHTML = '';
      if (mut.isQuest && typeof getQuestProgressText === 'function') {
        extraHTML = `<div class="aug-quest-container" style="margin-top: auto; width: 100%; padding-top: 6px;">${getQuestProgressText(player, mutationId)}</div>`;
      } else if (mutationId === 'momentum') {
        const mState = momentumState[player] || 'ready';
        if (mState === 'active') {
          extraHTML = `<div style="margin-top: auto; width: 100%; padding-top: 6px; color: #27ae60; font-weight: bold; text-align: left;">이번 턴에 발동합니다!</div>`;
        } else if (mState === 'used') {
          const gained = momentumGainedScore[player] || 0;
          extraHTML = `<div style="margin-top: auto; width: 100%; padding-top: 6px; color: #888; font-size: 0.85em; font-style: italic; text-align: left;">이 증강은 소모되었습니다 (${gained}점 획득함)</div>`;
        }
      }

      slot.classList.add('filled');
      if (mutationId === 'momentum' && momentumState[player] === 'used') {
        slot.style.opacity = '0.65';
      } else {
        slot.style.opacity = '1';
      }

      slot.innerHTML = `
        <div class="aug-slot-filled" style="display: flex; flex-direction: column; height: 100%; box-sizing: border-box;">
          <div class="aug-slot-header">${svgIcon} <span class="aug-slot-name">${augInfo.name || mut.name}</span></div>
          <div class="aug-slot-desc" style="flex: 1; overflow-y: auto; min-height: 0;">${description}</div>
          ${extraHTML}
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

window.applyMutation = function (player, mutationId) {
  const mut = mutationDefinitions[mutationId];
  if (!mut) return;

  activeMutations[player][mut.target] = mutationId;

  const augInfo = augmentData.find(a => a.name.includes(mut.name) || (a.mark && mut.enName && a.mark === mut.enName)) || {};
  addGameLog({ type: 'augment-action', player, meta: { mutationId, name: augInfo.name || mut.name } }, 'augment-action', window.isMultiplayer, player);

  // 더블 라지 스트레이트 등 특수 효과 즉시 적용
  if (mutationId === 'double-large-straight') {
    upperBonusThreshold[player] = 60;
  }

  // 족보 제목 UI 변경 (선택된 플레이어 방향만)
  const targetTh = document.getElementById(player === 1 ? `cat-title-left-${mut.target}` : `cat-title-right-${mut.target}`);

  if (targetTh) {
    const svgIcon = augInfo.icon || getVariantSvg(mutationId);
    targetTh.innerHTML = `${svgIcon} ${mut.enName}`;
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
      } else return;
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

    keptDice = [];
    activeDice = [...values].sort((a, b) => a - b);

    rollsLeft--;
    updateRollsUI();
    if (gameMode !== 'hotseat' && gameMode !== 'augmented-hotseat') {
      triggerOpponentTurn();
    } else {
      els.gameStatus.textContent = `P${currentPlayer} 족보 선택 대기 중...`;
      if (rollsLeft <= 0) {
        els.btnRoll.disabled = true;
        diceEngine.allowKeep = false;
      }
    }

    updateScorePreviews();
  }
});

function resetAvatarUI() {
  const container = document.getElementById('profile-avatar-container');
  if (container) {
    container.style.backgroundImage = 'none';
    container.style.backgroundSize = '';
    container.style.backgroundPosition = '';
  }
  const canvas = document.getElementById('profile-avatar-canvas');
  if (canvas) canvas.style.display = 'none';
}

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
