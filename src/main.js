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
import { subscribeAuthState, signInWithGoogle, setNickname, getCurrentUser, saveUserToDB, getUserFromDB, incrementProfileViews, signOutUser, updateUserStatusMsg, updateUserAvatar, updateUserActiveGame, clearUserActiveGame, getUserMatchesFromDB, saveAugmentProgress, resetAugmentProgress } from "./authEngine.js";
import Cropper from "cropperjs";
import defaultAugmentsData from "./augments.json";
import { calculateAdoptionRate, createAugmentProgressSession, getAugmentAchievementDefinitions, getAugmentTelemetryDefinitions, getAchievementProgress, getAugmentStats, recordAchievementProgress, recordAugmentMetric, recordAugmentOffer, recordAugmentSelection } from "./augmentProgress.js";
import { renderAchievementList } from "./achievementUI.js";
import { getProfileModeStats, getTopAugments, updateProfileStats } from "./profileStats.js";
import { renderProfileRatingGraph } from "./profileRatingGraph.js";

import { soundEngine } from "./SoundEngine.js";

let augmentData = defaultAugmentsData || [];
let augmentProgressSession = null;
let compendiumIndexScrollTop = 0;
const diceAugmentTypes = {
  'weighted-dice': 'heavy',
  'golden-die': 'golden',
  '8-sided': 'octahedron',
  'strange-die': 'weird',
  'promotion-die': 'promotion',
  'couple-dice': 'couple',
  'sevens-dice': 'sevens'
};

// 첫 사용자 인터랙션 시 Web Audio Context 초기화
const initSoundEngineOnUserGesture = () => {
  soundEngine.init();
  soundEngine.ensureContext();
  window.removeEventListener('pointerdown', initSoundEngineOnUserGesture);
  window.removeEventListener('keydown', initSoundEngineOnUserGesture);
};
window.addEventListener('pointerdown', initSoundEngineOnUserGesture);
window.addEventListener('keydown', initSoundEngineOnUserGesture);

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
  profileStatusMsg: document.getElementById('profile-status-msg'),
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
  btnNormOnline: document.getElementById('btn-norm-online'),
  btnAugOnline: document.getElementById('btn-aug-online'),
  btnAugLobby: document.getElementById('btn-aug-lobby'),
  btnAugHotseat: document.getElementById('btn-aug-hotseat'),

  lobbySelectSection: document.getElementById('lobby-select-section'),
  lobbySelectModeTitle: document.getElementById('lobby-select-mode-title'),
  btnLobbySelectBack: document.getElementById('btn-lobby-select-back'),
  btnLobbyCreate: document.getElementById('btn-lobby-create'),
  btnLobbyJoin: document.getElementById('btn-lobby-join'),
  inputLobbyJoinCode: document.getElementById('input-lobby-join-code'),
  lobbyJoinError: document.getElementById('lobby-join-error'),
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
  btnReturnLobby: document.getElementById('btn-return-lobby'),

  btnMenuSettings: document.getElementById('btn-menu-settings'),
  btnMenuAchievements: document.getElementById('btn-menu-achievements'),
  btnMenuCompendium: document.getElementById('btn-menu-compendium'),
  btnMenuHelp: document.getElementById('btn-menu-help'),
  modalSettings: document.getElementById('modal-settings'),
  modalAchievements: document.getElementById('modal-achievements'),
  modalCompendium: document.getElementById('modal-compendium'),
  modalProfile: document.getElementById('modal-profile'),
  modalHelp: document.getElementById('modal-help')
};

// 환경 제어 (온라인 플레이는 상시 비활성화, 로비 및 핫시트 플레이는 상시 활성화)
const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'
);

// 온라인 플레이 2종 (증강 온라인, 요트 온라인)은 개발 우선도에 따라 상시 비활성화
if (els.btnAugOnline) els.btnAugOnline.disabled = true;
if (els.btnNormOnline) els.btnNormOnline.disabled = true;

// 로비 플레이 및 핫시트 플레이만 항상 활성화
if (els.btnAugLobby) els.btnAugLobby.disabled = false;
if (els.btnAugHotseat) els.btnAugHotseat.disabled = false;
if (els.btnPlayNormal) els.btnPlayNormal.disabled = false;
if (els.btnPlayNormalLobby) els.btnPlayNormalLobby.disabled = false;

const debugContainer = document.getElementById('debug-container');
if (debugContainer) {
  debugContainer.style.display = isLocalhost ? 'block' : 'none';
}


// 화면 스케일링 로직 (1920x960 16:9 비율 정밀 스케일 조화)
function handleAppScaling() {
  if (!els.appContainer) return;
  const targetW = 1920;
  const targetH = 960;
  const scaleX = window.innerWidth / targetW;
  const scaleY = window.innerHeight / targetH;
  const scale = Math.min(scaleX, scaleY) * 0.96;
  els.appContainer.style.transform = `scale(${scale})`;
  els.appContainer.style.transformOrigin = 'center center';
}
window.addEventListener('resize', handleAppScaling);
handleAppScaling(); // 즉시 동기 실행하여 새로고침 시 50ms 지연/끊김(FOUC) 원천 방지

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
let myStatusMsg = localStorage.getItem('ad_status_msg');
let myAvatarUrl = localStorage.getItem('ad_avatar_url');
let myCropData = null;
try {
  const cropStr = localStorage.getItem('ad_crop_data');
  if (cropStr) myCropData = JSON.parse(cropStr);
} catch (e) {}

// -----------------------------------------------------
// 스켈레톤 스크린 제어 시스템
// -----------------------------------------------------
let mainSkeletonsActive = false;

function initMainSkeletons() {
  if (mainSkeletonsActive) return;
  mainSkeletonsActive = true;

  // 1. 프로필 섹션 전 요소 스켈레톤 부여
  const profileTitle = document.querySelector('.profile-header h2');
  if (profileTitle) profileTitle.classList.add('skeleton-box', 'skeleton-profile-title');

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.classList.add('skeleton-box', 'skeleton-icon-btn');

  const btnOpenProfile = document.getElementById('btn-open-profile');
  if (btnOpenProfile) btnOpenProfile.classList.add('skeleton-box', 'skeleton-icon-btn');

  const avatarContainer = document.getElementById('profile-avatar-container');
  if (avatarContainer) avatarContainer.classList.add('skeleton-box');

  const nickElem = document.getElementById('profile-nickname');
  if (nickElem) nickElem.classList.add('skeleton-box', 'skeleton-text-name');

  const statusElem = document.getElementById('profile-status-msg');
  if (statusElem) statusElem.classList.add('skeleton-box', 'skeleton-text-status');

  // 2. 경기 기록 (5개 게임 기록 세부 요소 스켈레톤 리스트)
  const historyCard = document.querySelector('.history-card');
  if (historyCard) {
    let historySkeletonsHtml = `
      <div class="history-header">
        <span class="skeleton-box" style="width: 90px; height: 18px; border-radius: 4px;"></span>
        <div class="skeleton-box" style="width: 24px; height: 24px; border-radius: 50%;"></div>
      </div>
      <div class="history-table-header">
        <div class="col-mode"><div class="skeleton-box" style="width: 28px; height: 14px; border-radius: 4px;"></div></div>
        <div class="col-players"><div class="skeleton-box" style="width: 48px; height: 14px; border-radius: 4px;"></div></div>
        <div class="col-score"><div class="skeleton-box" style="width: 28px; height: 14px; border-radius: 4px;"></div></div>
        <div class="col-result"><div class="skeleton-box" style="width: 28px; height: 14px; border-radius: 4px; margin: 0 auto;"></div></div>
        <div class="col-date"><div class="skeleton-box" style="width: 28px; height: 14px; border-radius: 4px; margin: 0 auto;"></div></div>
      </div>
      <div class="history-match-list">
    `;
    for (let i = 0; i < 5; i++) {
      historySkeletonsHtml += `
        <div class="history-match-item skel-match-item">
          <div class="history-match-main">
            <div class="history-mode-col">
              <div class="skeleton-box skel-mode-icon"></div>
              <div class="skeleton-box skel-mode-text"></div>
            </div>
            <div class="history-players-col">
              <div class="history-player-row me">
                <div class="skeleton-box skel-avatar"></div>
                <div class="skeleton-box skel-name"></div>
              </div>
              <div class="history-player-row">
                <div class="skeleton-box skel-avatar"></div>
                <div class="skeleton-box skel-name"></div>
              </div>
            </div>
            <div class="history-score-col">
              <div class="skeleton-box skel-score"></div>
              <div class="skeleton-box skel-score"></div>
            </div>
            <div class="history-result-col">
              <div class="skeleton-box skel-badge"></div>
            </div>
            <div class="history-date-col">
              <div class="skeleton-box skel-date"></div>
            </div>
          </div>
        </div>
      `;
    }
    historySkeletonsHtml += '</div>';
    historyCard.innerHTML = historySkeletonsHtml;
  }

  const rollsLeftElem = document.getElementById('rolls-left');
  if (rollsLeftElem) rollsLeftElem.classList.add('skeleton-box');

  const gameStatusElem = document.getElementById('game-status');
  if (gameStatusElem) gameStatusElem.classList.add('skeleton-box');

  const turnTimerElem = document.getElementById('turn-timer');
  if (turnTimerElem) turnTimerElem.classList.add('skeleton-box');

  const btnRoll = document.getElementById('btn-roll');
  if (btnRoll) btnRoll.classList.add('skeleton-box', 'skeleton-btn-roll');

  // 4. play-menu-section
  const playMenuCard = document.querySelector('.play-menu-card');
  if (playMenuCard) {
    playMenuCard.classList.add('skeleton-fade-in');
    const menuTitle = playMenuCard.querySelector('h2');
    if (menuTitle) menuTitle.classList.add('skeleton-box', 'skeleton-menu-title');
    playMenuCard.querySelectorAll('.btn-play-menu').forEach(btn => {
      btn.classList.add('skeleton-box', 'skeleton-menu-btn');
    });
  }
}

function removeMainSkeletons() {
  if (!mainSkeletonsActive) return;

  // 1. 프로필 스켈레톤 해제
  const profileTitle = document.querySelector('.profile-header h2');
  if (profileTitle) profileTitle.classList.remove('skeleton-box', 'skeleton-profile-title');

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) btnLogout.classList.remove('skeleton-box', 'skeleton-icon-btn');

  const btnOpenProfile = document.getElementById('btn-open-profile');
  if (btnOpenProfile) btnOpenProfile.classList.remove('skeleton-box', 'skeleton-icon-btn');

  const avatarContainer = document.getElementById('profile-avatar-container');
  if (avatarContainer) avatarContainer.classList.remove('skeleton-box');

  const nickElem = document.getElementById('profile-nickname');
  if (nickElem) nickElem.classList.remove('skeleton-box', 'skeleton-text-name');

  const statusElem = document.getElementById('profile-status-msg');
  if (statusElem) statusElem.classList.remove('skeleton-box', 'skeleton-text-status');


  const rollsLeftElem = document.getElementById('rolls-left');
  if (rollsLeftElem) rollsLeftElem.classList.remove('skeleton-box');

  const gameStatusElem = document.getElementById('game-status');
  if (gameStatusElem) gameStatusElem.classList.remove('skeleton-box');

  const turnTimerElem = document.getElementById('turn-timer');
  if (turnTimerElem) turnTimerElem.classList.remove('skeleton-box');

  const btnRoll = document.getElementById('btn-roll');
  if (btnRoll) btnRoll.classList.remove('skeleton-box', 'skeleton-btn-roll');

  // 3. play-menu-section 스켈레톤 해제
  const playMenuCard = document.querySelector('.play-menu-card');
  if (playMenuCard) {
    const menuTitle = playMenuCard.querySelector('h2');
    if (menuTitle) menuTitle.classList.remove('skeleton-box', 'skeleton-menu-title');
    playMenuCard.querySelectorAll('.btn-play-menu').forEach(btn => {
      btn.classList.remove('skeleton-box', 'skeleton-menu-btn');
    });
  }

  mainSkeletonsActive = false;
}

let landingDiceEngine = null;

function silenceLandingDice() {
  landingDiceEngine?.setSoundEnabled(false);
}

// 캐시된 로그인 상태 확인 (낙관적 뷰 전환: 새로고침 시 랜딩 뷰 건너뛰고 메인 화면 즉시 노출 + 스켈레톤 활성화)
const isLoggedInCache = localStorage.getItem('ad_logged_in') === 'true';
if (isLoggedInCache) {
  silenceLandingDice();
  els.landingView?.classList.add('hidden');
  els.loginView?.classList.add('hidden');
  els.nicknameSetupView?.classList.add('hidden');
  els.appContainer?.classList.remove('hidden');
  handleAppScaling(); // 스컨테이너 노출 즉시 스케일링 동기화
  initMainSkeletons();
  if (myNickname) {
    if (els.myNickname) els.myNickname.textContent = myNickname;
    if (els.profileNickname) els.profileNickname.textContent = myNickname;
  }
  const statusToSet = myStatusMsg || '안녕하세요! 주사위 굴리러 왔습니다.';
  if (els.profileStatusMsg) {
    els.profileStatusMsg.textContent = statusToSet;
  }
  if (myAvatarUrl && myCropData) {
    if (typeof renderAvatar === 'function') {
      renderAvatar(myAvatarUrl, myCropData);
    }
  }
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
let extraTurns = { 1: 0, 2: 0, 3: 0, 4: 0 };
let isExtraTurnPhase = false;
let upperBonusThreshold = { 1: 63, 2: 63, 3: 63, 4: 63 };
let yachtBankState = {
  1: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false },
  2: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false },
  3: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false },
  4: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false }
};
let destroyedStrangeDice = { 1: false, 2: false, 3: false, 4: false };
let promotionConsumed = { 1: false, 2: false, 3: false, 4: false };
let promotionAcquiredRound = { 1: null, 2: null, 3: null, 4: null };
let playerTableFlipUsed = { 1: false, 2: false, 3: false, 4: false };
let equivalentExchangeUses = { 1: 0, 2: 0, 3: 0, 4: 0 };
let equivalentExchangePenalty = { 1: 0, 2: 0, 3: 0, 4: 0 };
let equivalentExchangeTurnUses = { 1: 0, 2: 0, 3: 0, 4: 0 };
let questProgress = { 1: {}, 2: {}, 3: {}, 4: {} };
let momentumState = { 1: 'ready', 2: 'ready', 3: 'ready', 4: 'ready' };
let momentumGainedScore = { 1: 0, 2: 0, 3: 0, 4: 0 };
let bountyHunterTarget = { 1: null, 2: null, 3: null, 4: null };
let bountyHunterAcquiredRound = { 1: null, 2: null, 3: null, 4: null };
let bountyHunterProgress = {
  1: { count: 0, penaltyCount: 0 },
  2: { count: 0, penaltyCount: 0 },
  3: { count: 0, penaltyCount: 0 },
  4: { count: 0, penaltyCount: 0 }
};

function getPlayerLabel(playerIndex) {
  let name = `Player ${playerIndex}`;
  const searchPlayers = (window.initialMatchPlayers && window.initialMatchPlayers.length > 0)
    ? window.initialMatchPlayers
    : window.lobbyPlayers;

  if (searchPlayers && Array.isArray(searchPlayers)) {
    const found = searchPlayers.find((pl, idx) => (pl.playerIndex ? pl.playerIndex === playerIndex : idx + 1 === playerIndex));
    if (found?.nickname) {
      name = found.nickname;
    }
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
      const { rolledCount, keptValues, isEquivalentRoll } = log.meta;
      const eePrefix = isEquivalentRoll ? '[등가교환] -5점의 페널티를 받고 주사위를 추가로 굴렸습니다. ' : '';
      if (!keptValues || keptValues.length === 0) {
        return `${eePrefix}주사위 ${rolledCount}개를 굴렸습니다.`;
      }
      return `${eePrefix}주사위 [${keptValues.join(', ')}]를 킵하고 ${rolledCount}개를 다시 굴렸습니다.`;
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

function renderGameLogHistory(history) {
  if (!els.gameLogContainer || !Array.isArray(history)) return;
  const emptyText = els.gameLogContainer.querySelector('.log-empty-text');
  if (emptyText) emptyText.remove();
  els.gameLogContainer.innerHTML = '';
  window.matchLogHistory = [...history];

  history.forEach(log => {
    const isTurnStart = log.type === 'turn-start' || log.message === '게임 시작!';
    const entryType = isTurnStart ? 'turn-start' : (log.type || 'normal');
    const formattedMessage = formatLogEntry(log);

    const entry = document.createElement('div');
    entry.className = `game-log-entry ${entryType}`;
    if (log.player === 1) entry.classList.add('log-p1');
    else if (log.player === 2) entry.classList.add('log-p2');

    const textSpan = document.createElement('span');
    textSpan.textContent = formattedMessage;
    if (log.type === 'timeout') {
      textSpan.style.textDecoration = 'underline';
    }
    entry.appendChild(textSpan);
    els.gameLogContainer.appendChild(entry);
  });

  if (els.gameLogContainer.parentElement) {
    els.gameLogContainer.parentElement.scrollTop = els.gameLogContainer.parentElement.scrollHeight;
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
setTimeout(async () => {
  const landingWrapper = document.getElementById('landing-dice-wrapper');
  if (landingWrapper) {
    landingDiceEngine = new DiceEngine("#landing-dice-wrapper");
    landingDiceEngine.soundEnabled = false; // 랜딩 페이지 자동 굴림 시 주사위 굴러가는 충돌음 제거
    await landingDiceEngine.ready;

    // 엔진 초기화 후 애니메이션 클래스 추가 (페이드 인 & 슬라이드 업)
    requestAnimationFrame(() => {
      landingWrapper.classList.add('loaded');
    });

    // 자동 굴림 애니메이션 (렌더링 후 약간의 딜레이 뒤에 실행)
    setTimeout(() => {
      if (landingDiceEngine?.isReady && !landingDiceEngine.physicsActive) {
        landingDiceEngine.roll(5);
      }
    }, 800);

    landingWrapper.addEventListener('click', () => {
      if (landingDiceEngine?.isReady && !landingDiceEngine.physicsActive) {
        landingDiceEngine.roll(5);
      }
    });
  }
}, 500); // 렌더링 대기

const profileDataCache = new Map();

async function getCachedProfileData(uid, force = false) {
  if (!uid || uid.startsWith('guest')) return null;
  const cleanProfileUid = uid.split('_')[0];
  if (!force && profileDataCache.has(cleanProfileUid)) return profileDataCache.get(cleanProfileUid);
  const data = await getUserFromDB(cleanProfileUid);
  if (data) profileDataCache.set(cleanProfileUid, data);
  return data;
}

async function refreshUserHistory(uid, historyCard = document.querySelector('#profile-content > .history-card'), isCurrent = () => true) {
  if (!historyCard || !uid) return;

  const matches = await getUserMatchesFromDB(uid);
  const profileIds = [...new Set(matches.flatMap(match => Object.values(match.players || {}))
    .map(player => player?.uid)
    .filter(playerUid => playerUid && !playerUid.startsWith('guest'))
    .map(playerUid => playerUid.split('_')[0]))];
  const profiles = new Map(await Promise.all(profileIds.map(async profileUid => [profileUid, await getCachedProfileData(profileUid)])));
  if (!isCurrent()) return;

  matches.forEach(match => {
    Object.values(match.players || {}).forEach(player => {
      const profile = profiles.get(player?.uid?.split('_')[0]);
      if (profile) {
        player.avatarUrl = profile.avatarUrl || null;
        player.cropData = profile.cropData || null;
      }
    });
  });
  renderHistoryCard(historyCard, matches, uid);
}

function renderHistoryAvatar(element, avatarUrl, cropData) {
  if (!element || !avatarUrl) return;

  element.style.backgroundImage = `url('${avatarUrl}')`;
  element.style.backgroundRepeat = 'no-repeat';
  if (!cropData?.width || !Number.isFinite(cropData.x) || !Number.isFinite(cropData.y)) {
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    return;
  }

  const image = new Image();
  image.onload = () => {
    const scale = (element.clientWidth || 24) / cropData.width;
    element.style.backgroundSize = `${image.width * scale}px ${image.height * scale}px`;
    element.style.backgroundPosition = `${-cropData.x * scale}px ${-cropData.y * scale}px`;
  };
  image.src = avatarUrl;
}

function getCleanProfileUid(value) {
  if (!value || typeof value !== 'string' || value.startsWith('guest')) return null;
  return value.split('_')[0];
}

function getHistoryAvatarHtml(player, style = '') {
  const uid = getCleanProfileUid(player?.uid);
  if (!uid) return `<div class="history-avatar-mini" style="${style}"></div>`;
  return `
    <button class="history-avatar-profile-btn" type="button" data-profile-uid="${escapeHtml(uid)}" aria-label="${escapeHtml(player?.nickname || '플레이어')} 프로필 보기">
      <span class="history-avatar-mini" style="${style}"></span>
    </button>
  `;
}

function renderHistoryCard(container, matches, myUid) {
  container.innerHTML = '';

  const matchCount = matches ? matches.length : 0;

  // Header: 경기 기록 (n) & 새로고침 버튼
  const header = document.createElement('div');
  header.className = 'history-header';
  header.innerHTML = `
    <span>경기 기록 (${matchCount})</span>
    <button class="btn-history-refresh" type="button" title="경기 기록 새로고침" aria-label="경기 기록 새로고침">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.5 2v6h-6M2.5 22v-6h6"/>
        <path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M2.5 16l1.2 1.2A10 10 0 0 0 22.5 12.5"/>
      </svg>
    </button>
  `;
  container.appendChild(header);

  const btnRefresh = header.querySelector('.btn-history-refresh');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      btnRefresh.style.transform = 'rotate(360deg)';
      void refreshUserHistory(myUid, container);
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

    const getCleanUidVal = (val) => getCleanProfileUid(val) || val;
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

    const myAvatarStyle = '';
    const oppAvatarStyle = '';

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
    const restOpponents = otherPlayers.slice(1);
    let extraPlayersHtml = '';
    let extraScoresHtml = '';
    if (extraCount > 0) {
      restOpponents.forEach(op => {
        const opAvStyle = '';
        const opScore = op?.totalScore ?? (op?.score ?? 0);
        const isOpForfeited = Boolean(op?.isForfeited);
        const opScoreStyle = isOpForfeited ? 'text-decoration: line-through; color: #888;' : '';
        const opForfeitLabel = '';

        extraPlayersHtml += `
          <div class="history-player-row history-extra-row">
            ${getHistoryAvatarHtml(op, opAvStyle)}
            <span class="history-player-name">${escapeHtml(op.nickname || 'Guest')}${opForfeitLabel}</span>
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
            ${getHistoryAvatarHtml(myPlayer, myAvatarStyle)}
            <span class="history-player-name">${escapeHtml(myNameHtml)}</span>
          </div>
          <div class="history-player-row">
            ${getHistoryAvatarHtml(primaryOpponent, oppAvatarStyle)}
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

    [myPlayer, primaryOpponent, ...restOpponents].forEach((player, index) => {
      renderHistoryAvatar(item.querySelectorAll('.history-avatar-mini')[index], player?.avatarUrl, player?.cropData);
    });
    bindHistoryProfileButtons(item);

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

const profilePreviewCard = document.getElementById('profile-preview-card');
let profilePreviewTimer = null;
let profilePreviewUid = null;
let profileModalTargetUid = null;
let profileEditing = false;

function hideProfilePreview(delay = 0) {
  clearTimeout(profilePreviewTimer);
  profilePreviewTimer = setTimeout(() => {
    profilePreviewUid = null;
    profilePreviewCard?.classList.add('hidden');
  }, delay);
}

async function showProfilePreview(button) {
  const uid = button?.dataset.profileUid;
  if (!uid || !profilePreviewCard) return;
  profilePreviewUid = uid;
  clearTimeout(profilePreviewTimer);
  profilePreviewTimer = setTimeout(async () => {
    const data = await getCachedProfileData(uid);
    if (!data || !button.isConnected || profilePreviewUid !== uid) return;
    document.getElementById('profile-preview-name').textContent = data.nickname || 'Player';
    document.getElementById('profile-preview-status').textContent = data.statusMsg || '';
    const previewAvatar = document.getElementById('profile-preview-avatar');
    if (previewAvatar) {
      previewAvatar.style.backgroundImage = '';
      previewAvatar.style.backgroundSize = '';
      previewAvatar.style.backgroundPosition = '';
      renderHistoryAvatar(previewAvatar, data.avatarUrl, data.cropData);
    }
    profilePreviewCard.classList.remove('hidden');
    const rect = button.getBoundingClientRect();
    const cardWidth = 260;
    const cardHeight = profilePreviewCard.offsetHeight || 84;
    const left = Math.min(window.innerWidth - cardWidth - 12, Math.max(12, rect.left + rect.width / 2 - cardWidth / 2));
    const below = rect.bottom + 10;
    const top = below + cardHeight <= window.innerHeight - 12 ? below : Math.max(12, rect.top - cardHeight - 10);
    profilePreviewCard.style.left = `${left}px`;
    profilePreviewCard.style.top = `${top}px`;
  }, 180);
}

function bindHistoryProfileButtons(root) {
  root.querySelectorAll('.history-avatar-profile-btn').forEach((button) => {
    button.addEventListener('pointerenter', () => void showProfilePreview(button));
    button.addEventListener('pointerleave', () => hideProfilePreview(140));
    button.addEventListener('focus', () => void showProfilePreview(button));
    button.addEventListener('blur', () => hideProfilePreview(140));
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      hideProfilePreview();
      void openProfileModal(button.dataset.profileUid);
    });
  });
}

profilePreviewCard?.addEventListener('pointerenter', () => clearTimeout(profilePreviewTimer));
profilePreviewCard?.addEventListener('pointerleave', () => hideProfilePreview(100));

function formatProfileDate(value) {
  if (!value) return '-';
  const date = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function setProfileEditing(editing) {
  profileEditing = editing;
  const status = document.getElementById('profile-modal-status');
  const input = document.getElementById('profile-modal-status-input');
  const button = document.getElementById('btn-profile-edit');
  const avatar = document.getElementById('profile-modal-avatar');
  status?.classList.toggle('hidden', editing);
  input?.classList.toggle('hidden', !editing);
  avatar?.classList.toggle('editing', editing);
  avatar?.querySelector('.avatar-edit-overlay')?.classList.toggle('hidden', !editing);
  if (button) button.textContent = editing ? '저장' : '프로필 편집';
  if (editing && input) {
    input.value = status?.textContent || '';
    input.focus();
  }
}

function setProfileModalLoading(loading, failed = false) {
  document.querySelectorAll('#modal-profile .profile-modal-card, #profile-modal-history')
    .forEach((card) => card.classList.toggle('is-loading', loading));
  if (!loading && !failed) return;
  document.getElementById('profile-modal-title').textContent = '프로필';
  document.getElementById('profile-modal-name').textContent = failed ? '프로필을 불러올 수 없습니다.' : '불러오는 중...';
  document.getElementById('profile-modal-status').textContent = '';
  const avatar = document.getElementById('profile-modal-avatar');
  if (avatar) {
    avatar.style.backgroundImage = '';
    avatar.style.backgroundSize = '';
    avatar.style.backgroundPosition = '';
  }
  document.getElementById('btn-profile-edit')?.classList.add('hidden');
  document.getElementById('btn-my-profile')?.classList.add('hidden');
}

function renderProfileModal(userData, targetUid) {
  const currentUser = getCurrentUser();
  const isMine = Boolean(currentUser?.uid && currentUser.uid === targetUid);
  const nickname = userData.nickname || 'Player';
  const status = userData.statusMsg || '';
  setProfileModalLoading(false);
  const title = document.getElementById('profile-modal-title');
  if (title) title.textContent = isMine ? '내 프로필' : '유저 프로필';
  document.getElementById('profile-modal-name').textContent = nickname;
  document.getElementById('profile-modal-status').textContent = status;

  const editButton = document.getElementById('btn-profile-edit');
  editButton?.classList.toggle('hidden', !isMine);
  document.getElementById('btn-my-profile')?.classList.toggle('hidden', isMine);
  setProfileEditing(false);

  const avatar = document.getElementById('profile-modal-avatar');
  if (avatar) {
    avatar.style.backgroundImage = '';
    avatar.style.backgroundSize = '';
    avatar.style.backgroundPosition = '';
    renderHistoryAvatar(avatar, userData.avatarUrl, userData.cropData);
  }

  const modeStats = getProfileModeStats(userData);
  document.getElementById('profile-rating-augmented').textContent = String(modeStats.augmented.rating);
  document.getElementById('profile-rating-normal').textContent = String(modeStats.normal.rating);
  document.querySelectorAll('.profile-rating-chart').forEach((chart) => {
    renderProfileRatingGraph(chart, userData, chart.dataset.ratingMode);
  });
  document.getElementById('profile-highest-score').textContent = String(modeStats.normal.highestScore);
  document.getElementById('profile-highest-score-date').textContent = formatProfileDate(modeStats.normal.highestScoreAt);
  document.getElementById('profile-upper-bonus-count').textContent = `${modeStats.normal.upperBonusCount}회`;
  document.getElementById('profile-yacht-count').textContent = `${modeStats.normal.yachtCount}회`;
  document.getElementById('profile-mode-icon-augmented').innerHTML = getAugmentedDicesIconSvg();
  document.getElementById('profile-mode-icon-normal').innerHTML = getDicesIconSvg();

  const topAugments = getTopAugments(userData, augmentData);
  const topList = document.getElementById('profile-top-augments');
  if (topList) {
    topList.innerHTML = topAugments.length
      ? topAugments.map((item) => `
        <li>
          <span class="profile-top-augment-icon">${getVariantSvg(item.id) || ''}</span>
          <span class="profile-top-augment-meta">
            <strong>${escapeHtml(item.name)}</strong>
            <span aria-hidden="true">/</span>
            <span>${item.count}회</span>
          </span>
        </li>
      `).join('')
      : '<li class="is-empty">기록 없음</li>';
  }
}

async function openProfileModal(targetUid) {
  const uid = getCleanProfileUid(targetUid);
  if (!uid || !els.modalProfile) return;
  profileModalTargetUid = uid;
  openGameModal(els.modalProfile);
  setProfileModalLoading(true);
  const history = document.getElementById('profile-modal-history');
  if (history) history.innerHTML = '<div class="history-empty-text">프로필을 불러오는 중...</div>';

  const userData = await getCachedProfileData(uid);
  if (profileModalTargetUid !== uid) return;
  if (!userData) {
    setProfileModalLoading(false, true);
    if (history) history.innerHTML = '<div class="history-empty-text">프로필을 불러올 수 없습니다.</div>';
    return;
  }
  renderProfileModal(userData, uid);
  const currentUser = getCurrentUser();
  const viewKey = `ad_profile_viewed:${uid}`;
  if (currentUser?.uid !== uid && sessionStorage.getItem(viewKey) !== '1') {
    sessionStorage.setItem(viewKey, '1');
    void incrementProfileViews(uid);
  }
  await refreshUserHistory(uid, history, () => profileModalTargetUid === uid);
}

document.getElementById('btn-open-profile')?.addEventListener('click', () => {
  const user = getCurrentUser();
  if (user?.uid) void openProfileModal(user.uid);
});

document.getElementById('btn-my-profile')?.addEventListener('click', () => {
  const user = getCurrentUser();
  if (user?.uid) void openProfileModal(user.uid);
});

document.getElementById('btn-profile-edit')?.addEventListener('click', async () => {
  const user = getCurrentUser();
  if (!user?.uid || user.uid !== profileModalTargetUid) return;
  if (!profileEditing) {
    setProfileEditing(true);
    return;
  }
  const input = document.getElementById('profile-modal-status-input');
  const newMessage = input?.value.trim().substring(0, 30) || '';
  if (!newMessage) {
    alert('소개말을 입력해주세요.');
    return;
  }
  if (!await updateUserStatusMsg(user.uid, newMessage)) {
    alert('소개말 업데이트에 실패했습니다.');
    return;
  }
  const sidebarStatus = document.getElementById('profile-status-msg');
  if (sidebarStatus) sidebarStatus.textContent = newMessage;
  document.getElementById('profile-modal-status').textContent = newMessage;
  localStorage.setItem('ad_status_msg', newMessage);
  const cached = profileDataCache.get(user.uid) || {};
  profileDataCache.set(user.uid, { ...cached, statusMsg: newMessage });
  setProfileEditing(false);
});

document.getElementById('profile-modal-status-input')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') document.getElementById('btn-profile-edit')?.click();
});

// 2. Firebase Auth 흐름 제어
subscribeAuthState(async (user) => {
  if (user) {
    // Firestore에서 유저 데이터 조회
    const userData = await getUserFromDB(user.uid);
    if (userData) profileDataCache.set(user.uid, userData);
    refreshUserHistory(user.uid);

    if (userData && userData.nickname) {
      // 닉네임이 설정된 로그인 유저: 메인 게임 화면으로 바로 이동
      localStorage.setItem('ad_logged_in', 'true');
      localStorage.setItem('ad_nickname', userData.nickname);
      silenceLandingDice();
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
        localStorage.setItem('ad_status_msg', userData.statusMsg);
      }

      if (userData.avatarUrl && userData.cropData) {
        localStorage.setItem('ad_avatar_url', userData.avatarUrl);
        localStorage.setItem('ad_crop_data', JSON.stringify(userData.cropData));
        if (typeof renderAvatar === 'function') {
          renderAvatar(userData.avatarUrl, userData.cropData, () => {
            removeMainSkeletons();
          });
        } else {
          removeMainSkeletons();
        }
      } else {
        localStorage.removeItem('ad_avatar_url');
        localStorage.removeItem('ad_crop_data');
        resetAvatarUI();
        removeMainSkeletons();
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

            await resetUserSessionState();

            if (roomToCancel) {
              try {
                const sendForfeitAndDisconnect = () => {
                  const targetUid = window.myUid || user?.uid;
                  networkEngine.sendMessage({ type: 'player_forfeited', uid: targetUid });
                  setTimeout(() => {
                    networkEngine.disconnect();
                  }, 150);

                  if (targetUid) {
                    setTimeout(() => {
                      refreshUserHistory(targetUid);
                    }, 1200);
                  }
                };

                const onConnected = () => {
                  sendForfeitAndDisconnect();
                };
                networkEngine.once('connected', onConnected);
                networkEngine.connectToLobby(roomToCancel, true);
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
      silenceLandingDice();
      els.landingView?.classList.add('hidden');
      els.loginView?.classList.add('hidden');
      els.appContainer?.classList.add('hidden');
      els.nicknameSetupView?.classList.remove('hidden');
    }
  } else {
    // 비로그인 유저: 랜딩 페이지
    localStorage.removeItem('ad_logged_in');
    els.appContainer?.classList.add('hidden');
    els.loginView?.classList.add('hidden');
    els.nicknameSetupView?.classList.add('hidden');
    els.landingView?.classList.remove('hidden');
  }
});

els.btnGetStarted?.addEventListener('click', () => {
  silenceLandingDice();
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

      resetAvatarUI();

      await signOutUser();

      const landingView = document.getElementById('landing-view');
      if (landingView) {
        landingView.classList.remove('fade-in');
        void landingView.offsetWidth; // Reflow
        landingView.classList.add('fade-in');
      }

      if (typeof landingDiceEngine !== 'undefined' && landingDiceEngine) {
        landingDiceEngine.setSoundEnabled(true);
        setTimeout(() => {
          landingDiceEngine.roll(5);
        }, 100);
      }
    } catch (e) {
      console.error("Logout failed", e);
    }
  });
}

function validateNickname(nickname) {
  if (!nickname) {
    return { valid: false, message: "닉네임을 입력해주세요!" };
  }

  // 1. 기본 문자 검사 (공백 포함: 한글, 영문, 숫자, ., _, 공백만 허용)
  const allowedChars = /^[가-힣a-zA-Z0-9._ ]+$/;
  if (!allowedChars.test(nickname)) {
    return { valid: false, message: "한글, 영문, 숫자, 마침표(.), 언더바(_), 공백만 사용 가능합니다." };
  }

  // 2. 시작과 끝 문자 제한 검사 (공백, ., _ 로 시작하거나 끝날 수 없음)
  const invalidEnds = /^[._ ]|[._ ]$/;
  if (invalidEnds.test(nickname)) {
    return { valid: false, message: "닉네임의 처음과 끝에는 공백, 마침표(.), 언더바(_)를 사용할 수 없습니다." };
  }

  // 3. 연속 중복 사용 검사
  // 연속 공백("  "), 연속 마침표(".."), 연속 언더바("__") 방지
  if (nickname.includes('  ') || nickname.includes('..') || nickname.includes('__')) {
    return { valid: false, message: "공백, 마침표(.), 언더바(_)를 연속해서 사용할 수 없습니다." };
  }

  // 4. 특수문자 및 공백 간의 부자연스러운 인접 방지 (예: ". ", "_ ", " .", " _")
  if (nickname.includes('. ') || nickname.includes(' .') || nickname.includes('_ ') || nickname.includes(' _')) {
    return { valid: false, message: "특수문자(., _)와 공백은 붙여서 사용할 수 없습니다." };
  }

  // 5. 가중치 길이 계산 (한글 2점, 나머지 1점)
  let score = 0;
  for (let i = 0; i < nickname.length; i++) {
    const char = nickname.charCodeAt(i);
    if (char >= 0xAC00 && char <= 0xD7A3) {
      score += 2;
    } else {
      score += 1;
    }
  }

  if (score < 4 || score > 16) {
    return { valid: false, message: "닉네임 길이는 한글 기준 최대 8자, 영문 기준 최대 16자 내외여야 합니다." };
  }

  return { valid: true };
}

els.btnSubmitNickname?.addEventListener('click', async () => {
  const nickname = els.nicknameInput?.value || "";
  const validation = validateNickname(nickname);
  if (!validation.valid) {
    alert(validation.message);
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
      profileDataCache.delete(user.uid);
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

export async function resetUserSessionState() {
  networkEngine.disconnect();
  networkEngine.removeAllListeners('connected');
  window.currentRoomCode = null;
  window.lobbyPlayers = [];
  window.myPlayerIndex = null;
  window.gameSessionStarted = false;
  window.isMultiplayer = false;
  window.isReady = false;
  
  currentPlayer = 1;
  currentRound = 1;
  rollsLeft = 3;
  activeDice = [];
  keptDice = [];
  scores = { 1: {}, 2: {} };
  activeMutations = { 1: {}, 2: {} };
  forfeitedPlayers = { 1: false, 2: false, 3: false, 4: false };

  const user = getCurrentUser();
  if (user?.uid) {
    await clearUserActiveGame(user.uid);
  }
}

function showLobbySelect(mode) {
  resetUserSessionState();
  window.pendingLobbyMode = mode;
  if (els.lobbySelectModeTitle) {
    els.lobbySelectModeTitle.textContent = mode === 'normal' ? '요트 다이스 로비 플레이' : '증강 요트 다이스 로비 플레이';
  }
  els.appContainer.classList.remove('mode-select-state', 'playing-state', 'normal-mode', 'lobby-state');
  els.appContainer.classList.add('lobby-select-state');
  if (els.inputLobbyJoinCode) {
    els.inputLobbyJoinCode.value = '';
  }
  document.querySelectorAll('.pin-digit-input').forEach(input => {
    input.value = '';
    input.classList.remove('filled');
  });
  hideLobbyJoinError();
}

function hideLobbyJoinError() {
  const error = document.getElementById('lobby-join-error');
  if (!error) return;
  error.textContent = '';
  error.classList.remove('is-visible', 'shake');
}

function showLobbyJoinError(message) {
  const error = document.getElementById('lobby-join-error');
  if (!error) return;
  error.textContent = message;
  error.classList.remove('shake');
  error.classList.add('is-visible');
  void error.offsetWidth;
  error.classList.add('shake');
}

function showLobby(isHost, joinCode = null, alreadyConnected = false) {
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
    if (!alreadyConnected) networkEngine.connectToLobby(uppercaseCode);
  }

  // 로비 상태 초기화
  window.isReady = false;
  els.btnLobbyStart.classList.remove('ready');
}

// 네트워크 이벤트 리스너 등록
networkEngine.on('lobby_state', (data) => {
  if (window.pendingLobbyJoinCode) {
    const code = window.pendingLobbyJoinCode;
    window.pendingLobbyJoinCode = null;
    showLobby(false, code, true);
  }

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

networkEngine.on('error', (data) => {
  if (!window.pendingLobbyJoinCode) return;
  const isModeMismatch = data?.code === 'ROOM_MODE_MISMATCH';
  const message = isModeMismatch
    ? '게임모드가 다른 방에 입장할 수 없습니다.'
    : (data?.message || '방에 입장할 수 없습니다.');
  window.pendingLobbyJoinCode = null;
  networkEngine.disconnect();
  stopLobbyWaitingAnimation();
  els.appContainer?.classList.remove('lobby-state');
  els.appContainer?.classList.add('lobby-select-state');
  showLobbyJoinError(message);
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
  if (window.lobbyPlayers && Array.isArray(window.lobbyPlayers)) {
    window.initialMatchPlayers = JSON.parse(JSON.stringify(window.lobbyPlayers));
    window.matchTotalPlayers = window.lobbyPlayers.length;
  }
  startMultiplayerGame();
});

networkEngine.on('ingame_message', (data) => {
  if (data.subType === 'debug_next_turn' || data.type === 'debug_next_turn') {
    window.debugNextTurnHandler?.();
    return;
  }
  if (data.subType === 'debug_prev_turn' || data.type === 'debug_prev_turn') {
    window.debugPrevTurnHandler?.();
    return;
  }

  if (data.type === 'augment_selecting' || data.subType === 'augment_selecting') {
    const optionsContainer = document.getElementById('augment-options');
    if (optionsContainer && optionsContainer.children[data.optionIndex]) {
      optionsContainer.children[data.optionIndex].classList.add('selected');
    }
    return;
  }

  if (data.type === 'apply_mutation' || data.subType === 'apply_mutation') {
    if (window.applyMutation) {
      window.applyMutation(data.player, data.augmentId, true);
    }
    let expectedCount = 0;
    if (currentRound >= 1) expectedCount = 1;
    if (currentRound >= 6) expectedCount = 2;
    if (currentRound >= 9) expectedCount = 3;

    const p1Count = Object.keys(activeMutations[1] || {}).length;
    const p2Count = Object.keys(activeMutations[2] || {}).length;

    if (p1Count < expectedCount) {
      if (!window.isMultiplayer && typeof updateAugmentSidebar === 'function') updateAugmentSidebar(1);
      showAugmentSelectionModal(1);
    } else if (p2Count < expectedCount) {
      if (!window.isMultiplayer && typeof updateAugmentSidebar === 'function') updateAugmentSidebar(2);
      showAugmentSelectionModal(2, () => {
        const modal = document.getElementById('augment-selection-modal');
        if (modal) modal.classList.add('hidden');
        if (typeof window.proceedTurnStart === 'function') window.proceedTurnStart();
      });
    } else {
      const modal = document.getElementById('augment-selection-modal');
      if (modal) {
        if (augmentTimerInterval) {
          clearInterval(augmentTimerInterval);
          augmentTimerInterval = null;
        }
        modal.classList.add('hidden');
      }
      if (!window.isMultiplayer && typeof updateAugmentSidebar === 'function') updateAugmentSidebar(currentPlayer);
      if (typeof window.proceedTurnStart === 'function') window.proceedTurnStart();
      if (typeof updateRollsUI === 'function') updateRollsUI();
    }
    return;
  }

  if (!window.isMultiplayer || Number(currentPlayer) === Number(window.myPlayerIndex)) return;

  if (data.type === 'sync_roll') {
    pauseTurnTimer();
    rollsLeft = data.rollsLeft;
    if (data.equivalentExchangeUses !== undefined) {
      equivalentExchangeUses[currentPlayer] = data.equivalentExchangeUses;
    }
    if (data.equivalentExchangePenalty !== undefined) {
      equivalentExchangePenalty[currentPlayer] = data.equivalentExchangePenalty;
    }
    updateRollsUI();
    clearScorePreviews();
    window.lastRollStartTime = Date.now();
    if (diceEngine) {
      diceEngine.ready.then(() => diceEngine.roll(data.specialConfigs, true, data.spawnTransforms));
    }
  } else if (data.type === 'sync_roll_end') {
    const elapsed = Date.now() - (window.lastRollStartTime || 0);
    const minAnimTime = 1100;
    const remainingDelay = Math.max(0, minAnimTime - elapsed);

    setTimeout(async () => {
      if (diceEngine) {
        await diceEngine.ready;
        diceEngine.forceRollEnd(data.finalValues, data.finalTransforms);
        diceEngine.diceArray.forEach(die => die.isKept = false);
        keptDice = [];
        activeDice = diceEngine.diceArray.filter(d => d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
        diceEngine.arrangeAll(true);
        updateScorePreviews();
        resumeTurnTimer();
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
    // 턴 시작 및 게임 시작 로그는 각 클라이언트의 startTurn()에서 이미 로컬 출력하므로 중복 렌더링 차단
    if (data.logData?.type === 'turn-start' || data.logData?.message === '게임 시작!') {
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
    renderGameLogHistory(sData.matchLogHistory);
  }

  if (sData.disconnectGrace) {
    for (let p = 1; p <= 4; p++) {
      if (sData.disconnectGrace[p] !== undefined) disconnectGrace[p] = sData.disconnectGrace[p];
    }
  }

  if (data.players) {
    data.players.forEach((p, idx) => {
      if (p.disconnected) {
        const pIdx = p.playerIndex || (idx + 1);
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
  const searchPlayers = window.initialMatchPlayers || window.lobbyPlayers;
  if (searchPlayers) {
    const foundIdx = searchPlayers.findIndex(pl => pl.uid === data.uid || pl.connId === data.connId);
    if (foundIdx !== -1) {
      pIndex = foundIdx + 1;
    }
  }
  if (!pIndex && data.pIndex) {
    pIndex = Number(data.pIndex);
  }
  if (!pIndex) {
    pIndex = 1;
  }
  handlePlayerDisconnect(pIndex);
});

networkEngine.on('player_reconnected', (data) => {
  let pIndex = null;
  const searchPlayers = window.initialMatchPlayers || window.lobbyPlayers;
  if (searchPlayers) {
    const foundIdx = searchPlayers.findIndex(pl => pl.uid === data.uid || pl.connId === data.connId);
    if (foundIdx !== -1) {
      pIndex = foundIdx + 1;
    }
  }
  if (!pIndex && data.pIndex) {
    pIndex = Number(data.pIndex);
  }
  if (!pIndex) {
    pIndex = 1;
  }
  handlePlayerReconnect(pIndex);
});

function cleanUid(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  if (raw.startsWith('guest')) return raw;
  return raw.split('_')[0];
}


networkEngine.on('player_forfeited', (data) => {
  if (!els.appContainer?.classList.contains('playing-state')) {
    return;
  }

  let forfeitPIndex = null;
  const cleanSenderUid = cleanUid(data?.uid);

  const searchPlayers = (window.initialMatchPlayers && window.initialMatchPlayers.length > 0)
    ? window.initialMatchPlayers
    : (window.lobbyPlayers || []);

  if (Array.isArray(searchPlayers)) {
    const foundIdx = searchPlayers.findIndex(pl => {
      const plUid = cleanUid(pl?.uid);
      return (plUid && cleanSenderUid && plUid === cleanSenderUid) || (pl?.connId && data?.connId && pl.connId === data.connId);
    });
    if (foundIdx !== -1) {
      forfeitPIndex = foundIdx + 1;
    }
  }

  if (!forfeitPIndex && data?.pIndex) {
    forfeitPIndex = Number(data.pIndex);
  }

  if (!forfeitPIndex) {
    forfeitPIndex = 1;
  }

  handleGameForfeit(forfeitPIndex, data.uid);
  const user = getCurrentUser();
  if (user?.uid) {
    setTimeout(() => {
      refreshUserHistory(user.uid);
    }, 1500);
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

// 로비 참여 코드 클립보드 복사 버튼 이벤트
const btnCopyCode = document.getElementById('btn-copy-lobby-code');
btnCopyCode?.addEventListener('click', async () => {
  const codeDisplay = document.getElementById('lobby-code-display');
  const code = codeDisplay?.textContent?.trim();
  if (!code) return;

  try {
    await navigator.clipboard.writeText(code);
    btnCopyCode.classList.add('copied');
    btnCopyCode.innerHTML = `
      <svg class="copy-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    `;
    setTimeout(() => {
      btnCopyCode.classList.remove('copied');
      btnCopyCode.innerHTML = `
        <svg class="copy-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
    }, 1500);
  } catch (err) {
    console.error("Copy failed:", err);
  }
});

// 6자리 PIN 코드 입력 스마트 키보드 이벤터
const pinInputs = document.querySelectorAll('.pin-digit-input');
pinInputs.forEach((input, index) => {
  input.addEventListener('input', (e) => {
    const val = input.value.toUpperCase();
    input.value = val;
    input.classList.toggle('filled', val.length > 0);

    if (val.length > 0 && index < pinInputs.length - 1) {
      pinInputs[index + 1].focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      pinInputs[index - 1].focus();
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').trim().toUpperCase();
    if (!pasted) return;

    const chars = pasted.replace(/[^A-Z0-9]/g, '').slice(0, 6).split('');
    chars.forEach((ch, idx) => {
      if (pinInputs[idx]) {
        pinInputs[idx].value = ch;
        pinInputs[idx].classList.add('filled');
      }
    });

    const nextIndex = Math.min(chars.length - 1, pinInputs.length - 1);
    if (pinInputs[nextIndex]) pinInputs[nextIndex].focus();
  });
});

els.btnLobbyJoin?.addEventListener('click', () => {
  let code = '';
  const pinInputsArr = document.querySelectorAll('.pin-digit-input');
  if (pinInputsArr && pinInputsArr.length === 6) {
    pinInputsArr.forEach(inp => code += inp.value.trim().toUpperCase());
  } else if (els.inputLobbyJoinCode) {
    code = els.inputLobbyJoinCode.value.trim().toUpperCase();
  }

  if (code.length !== 6) {
    showLobbyJoinError('6자리의 참여 코드를 정확히 입력해주세요.');
    return;
  }
  hideLobbyJoinError();
  window.pendingLobbyJoinCode = code;
  networkEngine.connectToLobby(code);
});

function resetPinInputs() {
  if (els.inputLobbyJoinCode) {
    els.inputLobbyJoinCode.value = '';
  }
  document.querySelectorAll('.pin-digit-input').forEach(input => {
    input.value = '';
    input.classList.remove('filled');
  });
}

els.btnLobbyBack?.addEventListener('click', () => {
  networkEngine.disconnect();
  stopLobbyWaitingAnimation();
  resetPinInputs();
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
  forfeitedPlayerUids = {};
  scores[1] = {}; scores[2] = {}; scores[3] = {}; scores[4] = {};
  activeMutations[1] = {}; activeMutations[2] = {}; activeMutations[3] = {}; activeMutations[4] = {};
  extraTurns = { 1: 0, 2: 0, 3: 0, 4: 0 };
  isExtraTurnPhase = false;
  isGameEnded = false;
  augmentProgressSession = null;
  isViewingOpponentAugments = false;
  upperBonusThreshold[1] = 63; upperBonusThreshold[2] = 63; upperBonusThreshold[3] = 63; upperBonusThreshold[4] = 63;
  destroyedStrangeDice[1] = false; destroyedStrangeDice[2] = false; destroyedStrangeDice[3] = false; destroyedStrangeDice[4] = false;
  promotionConsumed[1] = false; promotionConsumed[2] = false; promotionConsumed[3] = false; promotionConsumed[4] = false;
  promotionAcquiredRound[1] = null; promotionAcquiredRound[2] = null; promotionAcquiredRound[3] = null; promotionAcquiredRound[4] = null;
  yachtBankState = {
    1: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false },
    2: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false },
    3: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false },
    4: { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false }
  };
  momentumState[1] = 'ready'; momentumState[2] = 'ready'; momentumState[3] = 'ready'; momentumState[4] = 'ready';
  momentumGainedScore[1] = 0; momentumGainedScore[2] = 0; momentumGainedScore[3] = 0; momentumGainedScore[4] = 0;
  if (typeof playerTableFlipUsed !== 'undefined') {
    playerTableFlipUsed[1] = false; playerTableFlipUsed[2] = false; playerTableFlipUsed[3] = false; playerTableFlipUsed[4] = false;
  }
  if (typeof questProgress !== 'undefined') {
    questProgress = {
      1: { questBonus: 0 },
      2: { questBonus: 0 },
      3: { questBonus: 0 },
      4: { questBonus: 0 },
      p1: { questBonus: 0 },
      p2: { questBonus: 0 },
      p3: { questBonus: 0 },
      p4: { questBonus: 0 }
    };
  }
  if (typeof disconnectGrace !== 'undefined') {
    disconnectGrace[1] = 60; disconnectGrace[2] = 60; disconnectGrace[3] = 60; disconnectGrace[4] = 60;
  }
  window.matchLogHistory = [];

  rollsLeft = 3;
  currentRound = 1;
  currentPlayer = 1;
  keptDice = [];
  activeDice = [];
  equivalentExchangeUses = { 1: 0, 2: 0, 3: 0, 4: 0 };
  equivalentExchangePenalty = { 1: 0, 2: 0, 3: 0, 4: 0 };
  equivalentExchangeTurnUses = { 1: 0, 2: 0, 3: 0, 4: 0 };
  bountyHunterTarget = { 1: null, 2: null, 3: null, 4: null };
  bountyHunterAcquiredRound = { 1: null, 2: null, 3: null, 4: null };
  bountyHunterProgress = {
    1: { count: 0, penaltyCount: 0 },
    2: { count: 0, penaltyCount: 0 },
    3: { count: 0, penaltyCount: 0 },
    4: { count: 0, penaltyCount: 0 }
  };

  if (els.gameLogContainer) {
    els.gameLogContainer.innerHTML = '<div class="log-empty-text">게임 로그가 없습니다.</div>';
  }

  if (typeof updateScoreboard === 'function') {
    updateScoreboard();
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
  window.gameSessionStarted = true;
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
  const isMyTurn = (currentPlayer === myP);

  const myBox = document.getElementById('match-my-box');
  const myName = document.getElementById('match-my-name');

  if (myBox) myBox.classList.toggle('active-turn', isMyTurn);
  if (myName) myName.classList.toggle('active-turn', isMyTurn);

  for (let p = 1; p <= count; p++) {
    const isCurrent = (p === currentPlayer);
    const oppBox = document.getElementById(`match-p${p}-box`);
    const oppName = document.getElementById(`match-p${p}-name`);

    if (oppBox) oppBox.classList.toggle('active-turn', isCurrent);
    if (oppName) oppName.classList.toggle('active-turn', isCurrent);
  }

  // 프로필 아바타 초록 글로우: data-player-index 매칭으로 100% 정확하게 단 1개만 활성화!
  const allAvatarElems = document.querySelectorAll('.match-avatar-container, .match-avatar');
  allAvatarElems.forEach(elem => {
    const pIdxStr = elem.getAttribute('data-player-index');
    if (pIdxStr) {
      const pIdx = Number(pIdxStr);
      elem.classList.toggle('turn-active-glow', pIdx === currentPlayer);
    }
  });

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
  const players = (window.initialMatchPlayers && window.initialMatchPlayers.length > 0)
    ? window.initialMatchPlayers
    : (window.lobbyPlayers || []);

  const getPIndex = (pObj, fallbackIdx) => {
    if (!pObj) return fallbackIdx;
    if (pObj.playerIndex) return Number(pObj.playerIndex);
    const idx = players.indexOf(pObj);
    return idx >= 0 ? idx + 1 : fallbackIdx;
  };

  let me = players.find(p => p.connId === myConnId || (myUid && p.uid === myUid)) || players[0];
  let opponents = players.filter(p => p !== me);

  if (!me) {
    me = { nickname: "Player (Me)", avatarUrl: null };
  }
  if (opponents.length === 0) {
    opponents = [{ nickname: "Player 2", avatarUrl: null }];
  }

  const myP = me ? getPIndex(me, window.myPlayerIndex || 1) : (window.myPlayerIndex || 1);

  if (myBoxName) myBoxName.textContent = me.nickname || "Player (Me)";
  if (myBoxAvatar) {
    if (me.avatarUrl) {
      myBoxAvatar.style.backgroundImage = `url('${me.avatarUrl}')`;
      myBoxAvatar.style.backgroundSize = 'cover';
    } else {
      myBoxAvatar.style.backgroundImage = '';
      myBoxAvatar.style.backgroundSize = '';
    }
    myBoxAvatar.setAttribute('data-player-index', myP);
    if (myBoxAvatar.parentElement) {
      myBoxAvatar.parentElement.setAttribute('data-player-index', myP);
    }
  }

  if (oppContainer) {
    oppContainer.innerHTML = '';
    // 상대방을 playerIndex 순서대로 정렬
    opponents.sort((a, b) => getPIndex(a, 99) - getPIndex(b, 99));

    opponents.forEach((opp, idx) => {
      const oppIdx = getPIndex(opp, idx + 2);
      const isCurrentTurn = (oppIdx === currentPlayer);
      const oppBox = document.createElement('div');
      oppBox.className = `match-player-box ${isCurrentTurn ? 'active-turn' : ''}`;
      oppBox.id = `match-p${oppIdx}-box`;

      const avStyle = opp.avatarUrl ? `background-image: url('${opp.avatarUrl}'); background-size: cover;` : '';
      oppBox.innerHTML = `
        <div class="match-avatar-container" data-player-index="${oppIdx}" style="position: relative; display: inline-block;">
          <div class="match-avatar" id="match-p${oppIdx}-avatar" data-player-index="${oppIdx}" style="${avStyle}"></div>
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

  if (window.lobbyPlayers && Array.isArray(window.lobbyPlayers)) {
    window.initialMatchPlayers = JSON.parse(JSON.stringify(window.lobbyPlayers));
    window.initialMatchPlayers.forEach((p, idx) => {
      if (!p.playerIndex) p.playerIndex = idx + 1;
    });
  }

  if (window.lobbyPlayers && window.myPlayerInfo) {
    const myConnId = networkEngine.socket?.id;
    const myUid = getCurrentUser()?.uid;
    const found = window.lobbyPlayers.find(p => p.connId === myConnId || (myUid && p.uid === myUid));
    if (found && found.playerIndex) {
      window.myPlayerIndex = Number(found.playerIndex);
    } else {
      const idx = window.lobbyPlayers.indexOf(window.myPlayerInfo);
      window.myPlayerIndex = idx >= 0 ? idx + 1 : (window.myPlayerInfo.playerIndex || (window.myPlayerInfo.isHost ? 1 : 2));
    }
  } else {
    window.myPlayerIndex = window.myPlayerInfo?.playerIndex || (window.myPlayerInfo?.isHost ? 1 : 2);
  }

  currentPlayer = 1;
  currentRound = 1;
  scores = { 1: {}, 2: {} };
  activeMutations = { 1: {}, 2: {} };
  upperBonusThreshold = { 1: 63, 2: 63 };
  destroyedStrangeDice = { 1: false, 2: false };
  promotionConsumed = { 1: false, 2: false };
  playerTableFlipUsed = { 1: false, 2: false };

  const isNormalMode = window.pendingLobbyMode === 'normal';
  gameMode = isNormalMode ? 'normal' : 'augmented';
  if (gameMode === 'augmented') {
    augmentProgressSession = createAugmentProgressSession();
  }

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

function getSeededAugments(round, player) {
  const isHotseat = gameMode === 'hotseat' || gameMode === 'augmented-hotseat';
  let pool = augmentData.filter(aug => aug.isAvailable !== false);

  // 2페이즈(6라운드 이상) 및 3페이즈(9라운드 이상) 드래프트 시 1페이즈 전용 증강 제외
  if (round >= 6) {
    const phase1Only = ['step-by-step', 'fast-straight'];
    pool = pool.filter(aug => !phase1Only.includes(aug.augmentId));
  }

  // 해당 플레이어가 이미 획득하여 가지고 있는 증강은 다음 드래프트 생성 후보 풀에서 제거
  const ownedAugmentIds = Object.values(activeMutations[player] || {});
  if (ownedAugmentIds.length > 0) {
    pool = pool.filter(aug => !ownedAugmentIds.includes(aug.augmentId));
  }

  if (isHotseat) {
    // 핫시트 플레이 시 강력한 무작위(Crypto API 및 Math.random) 기반 Fisher-Yates 셔플 사용
    const list = [...pool];
    for (let i = list.length - 1; i > 0; i--) {
      let rVal = Math.random();
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const randArr = new Uint32Array(1);
        window.crypto.getRandomValues(randArr);
        rVal = randArr[0] / (0xffffffff + 1);
      }
      const j = Math.floor(rVal * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }

    return list.slice(0, 3);
  }

  // 멀티플레이 모드 시 방 코드(PIN) 기반 시드 셔플 사용
  const roomCode = els.lobbyCodeDisplay?.textContent?.trim() || networkEngine.roomCode || window.currentRoomCode || 'DEFAULT';
  const seedStr = `${roomCode}_R${round}_P${player}`;
  
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) & 0x7fffffff;
  }

  const pseudoRandom = () => {
    hash = (hash * 1664525 + 1013904223) & 0x7fffffff;
    return hash / 0x7fffffff;
  };

  const list = [...pool];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  return list.slice(0, 3);
}

function showAugmentSelectionModal(player, onSelect) {
  pauseTurnTimer();
  const modal = document.getElementById('augment-selection-modal');
  const title = document.getElementById('augment-modal-title');
  const optionsContainer = document.getElementById('augment-options');
  const timerElem = document.getElementById('augment-timer');
  const timerText = document.getElementById('augment-timer-text');

  if (!modal || !title || !optionsContainer) return;

  // 증강 선택 중에는 메인 턴 타이머를 정지하고 -- (모래시계 멈춤) 상태로 변경
  stopTurnTimer();
  const mainTimerElem = document.getElementById('turn-timer') || els.turnTimer;
  const mainTimerText = document.getElementById('turn-timer-text');
  if (mainTimerText) mainTimerText.textContent = '--';
  if (mainTimerElem) {
    mainTimerElem.classList.add('paused');
    mainTimerElem.classList.remove('warning');
  }

  if (augmentTimerInterval) {
    clearInterval(augmentTimerInterval);
    augmentTimerInterval = null;
  }

  const isMyTurn = !window.isMultiplayer || player === window.myPlayerIndex;
  title.textContent = isMyTurn ? `Player ${player} 증강 선택` : `Player ${player} 증강 선택 중...`;
  optionsContainer.innerHTML = '';
  optionsContainer.style.pointerEvents = 'auto';

  let timeLeft = 30;
  if (timerText) timerText.textContent = `${timeLeft}s`;
  if (timerElem) {
    timerElem.classList.remove('warning', 'paused');
  }

  const selectedAugments = getSeededAugments(typeof currentRound !== 'undefined' ? currentRound : 1, player);
  if (isMyTurn && window.isMultiplayer && gameMode === 'augmented') {
    recordAugmentOffer(
      augmentProgressSession,
      selectedAugments.map(aug => aug.augmentId),
      `${currentRound}:${player}`
    );
  }

  let isSelecting = false;
  let selectionCommitted = false;
  const cleanupAndSelect = (aug) => {
    if (selectionCommitted) return;
    selectionCommitted = true;
    if (augmentTimerInterval) {
      clearInterval(augmentTimerInterval);
      augmentTimerInterval = null;
    }
    modal.classList.add('hidden');
    if (isMyTurn && window.isMultiplayer && gameMode === 'augmented') {
      recordAugmentSelection(augmentProgressSession, aug.augmentId);
    }
    if (window.applyMutation) window.applyMutation(player, aug.augmentId);
    if (onSelect) {
      onSelect();
    }
  };

  selectedAugments.forEach((aug, idx) => {
    const btn = document.createElement('div');
    btn.className = 'augment-option' + (!isMyTurn ? ' disabled-option' : '');
    let desc = aug.description || aug.name + ' 증강이 적용됩니다.';

    const catEnName = getAugmentCategoryEnName(aug);
    const icon = getVariantSvg(aug.augmentId) || '';
    btn.innerHTML = `
      <div class="modal-compendium-type-text">${catEnName}</div>
      <div class="aug-slot-header">${icon} <span class="aug-slot-name">${aug.name}</span></div>
      <div class="aug-slot-desc">${desc}</div>
    `;

    if (isMyTurn) {
      btn.addEventListener('click', () => {
        if (isSelecting) return;
        isSelecting = true;
        optionsContainer.style.pointerEvents = 'none';
        btn.classList.add('selected');

        if (window.isMultiplayer && networkEngine) {
          networkEngine.sendMessage({
            type: 'augment_selecting',
            player,
            optionIndex: idx,
            augmentId: aug.augmentId
          });
        }

        setTimeout(() => {
          cleanupAndSelect(aug);
        }, 500);
      });
    }
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
      if (isMyTurn) {
        const autoPick = selectedAugments[Math.floor(Math.random() * selectedAugments.length)];
        cleanupAndSelect(autoPick);
      }
    }
  }, 1000);

  modal.classList.remove('hidden');
}

// === 턴 타임아웃 46초(45.99초 유예값) 제어 시스템 ===
const TURN_DURATION_SECONDS = 45.99;
let turnTimerInterval = null;
let turnTimeRemaining = TURN_DURATION_SECONDS;

function startTurnTimer(overrideTime = null) {
  stopTurnTimer();
  const curP = typeof currentPlayer !== 'undefined' ? currentPlayer : 1;
  const activeMutsObj = activeMutations[curP] || activeMutations[`p${curP}`] || {};
  const activeMuts = Object.values(activeMutsObj);
  const activeProg = questProgress[curP] || questProgress[`p${curP}`] || {};
  if (activeMuts.includes('nozdormu') && !activeProg.nozdormuRewarded) {
    if (overrideTime === null || overrideTime > 15) {
      overrideTime = 15;
    }
  }

  const isUnlimitedTimer = !window.gameSessionStarted || gameMode === 'none';
  if (isUnlimitedTimer) {
    updateTurnTimerUI();
    soundEngine.stopBGM();
    return;
  }

  turnTimeRemaining = overrideTime !== null ? overrideTime : TURN_DURATION_SECONDS;
  const timerElem = document.getElementById('turn-timer') || els.turnTimer;
  if (timerElem) timerElem.classList.remove('paused');
  updateTurnTimerUI();

  const elapsedTime = Math.max(0, TURN_DURATION_SECONDS - turnTimeRemaining);
  soundEngine.startBGM(elapsedTime);

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
  soundEngine.pauseBGM();
  const timerElem = document.getElementById('turn-timer') || els.turnTimer;
  if (timerElem) timerElem.classList.add('paused');
}

function resumeTurnTimer() {
  const isUnlimitedTimer = !window.gameSessionStarted || gameMode === 'none';
  if (isUnlimitedTimer) {
    updateTurnTimerUI();
    soundEngine.stopBGM();
    return;
  }

  if (!turnTimerInterval && turnTimeRemaining > 0) {
    const timerElem = document.getElementById('turn-timer') || els.turnTimer;
    if (timerElem) timerElem.classList.remove('paused');
    updateTurnTimerUI();

    const elapsedTime = Math.max(0, TURN_DURATION_SECONDS - turnTimeRemaining);
    soundEngine.startBGM(elapsedTime);

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
  const isUnlimitedTimer = !window.gameSessionStarted || gameMode === 'none';

  if (isUnlimitedTimer) {
    if (textEl) textEl.textContent = "--";
    if (timerElem) {
      timerElem.classList.add('paused');
      timerElem.classList.remove('warning');
    }
    return;
  }

  const displayTime = Math.max(0, Math.floor(turnTimeRemaining));
  if (textEl) textEl.textContent = `${displayTime}s`;
  if (timerElem) {
    timerElem.classList.remove('paused');
    if (displayTime <= 10) timerElem.classList.add('warning');
    else timerElem.classList.remove('warning');

    const hourglassSvg = timerElem.querySelector('.hourglass-svg');
    if (hourglassSvg) {
      const isOdd = (displayTime % 2 !== 0);
      hourglassSvg.classList.toggle('flip', isOdd);
    }
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
  const potentialScores = typeof calculateScores === 'function' ? calculateScores(dice5, activeMutations[currentPlayer] || {}, { bank: (yachtBankState[currentPlayer]?.accumulatedScore || 0), fullDice: fullDiceObjects }) : {};

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
  pauseTurnTimer();

  equivalentExchangeTurnUses[currentPlayer] = 0;
  rollsLeft = 3;
  keptDice = [];
  activeDice = [];
  if (diceEngine) {
    diceEngine.clearAll();
  }
  if (currentRound > 12) {
    els.gameStatus.textContent = `P${currentPlayer}의 추가 턴 (라운드 ${currentRound})`;
  } else {
    els.gameStatus.textContent = `P${currentPlayer}의 턴 (라운드 ${currentRound}/12)`;
  }

  updateMatchProfiles();
  updateTurnHighlights();

  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  if (isMyTurn) {
    soundEngine.playSFX('turn_change');
  }

  if (!window.isMultiplayer) {
    isViewingOpponentAugments = false;
  }
  updateQuestProgress(currentPlayer, null, null);

  // 게임 최선두 1라운드 P1 시작 시 '게임 시작!' 로그 기록
  if (currentRound === 1 && currentPlayer === 1 && (!window.matchLogHistory || window.matchLogHistory.length === 0)) {
    addGameLog('게임 시작!', 'turn-start', true, 0);
  }

  // 요트 뱅크: 3턴 진행 완료(turnsLeft === 0) 후 4번째 턴 진입 시 자동 기입 및 턴 자동 넘김
  if (activeMutations[currentPlayer] && activeMutations[currentPlayer]['yacht'] === 'yacht-bank') {
    if (!yachtBankState[currentPlayer]) {
      yachtBankState[currentPlayer] = { turnsLeft: 3, accumulatedScore: 0, initialized: true, completed: false };
    }
    const bankState = yachtBankState[currentPlayer];
    if (bankState.turnsLeft === 0 && scores[currentPlayer] && scores[currentPlayer]['yacht'] === undefined) {
      bankState.completed = true;
      const finalScore = Math.min(bankState.accumulatedScore, 15);
      scores[currentPlayer]['yacht'] = { score: finalScore, bonus: 0, bonusDetails: [] };
      addGameLog({ type: 'system', message: `[Bank] 요트 뱅크 증강의 효과로 ${finalScore}점이 Bank 족보에 자동으로 기록되었습니다.` }, 'system', window.isMultiplayer, currentPlayer);
      updateScoreboard();

      // 족보 자동 기록 완료 후 약 0.8초 연출/로그 안내 후 다음 턴으로 자동으로 넘어가도록 스케줄링
      setTimeout(() => {
        advanceTurnAfterScore();
      }, 800);
      return;
    }
  }

  window.proceedTurnStart = function () {
    startTurnTimer();
    
    // 이전 턴의 fade-out 효과 클래스 잔재 정리
    document.querySelectorAll('.fade-out-target').forEach(el => {
      el.classList.remove('fade-out-target', 'bounty-target-highlight');
    });
    
    // 현상금 사냥꾼 타겟 지정 시스템
    const activeMuts = Object.values(activeMutations[currentPlayer] || {});
    const bhProg = bountyHunterProgress[currentPlayer] || { count: 0, penaltyCount: 0 };
    if (activeMuts.includes('bounty-hunter') && bhProg.count < 3) {
      // 아직 비어있는(unfilled) 카테고리 후보 추출
      const unfilledCats = [];
      const allCats = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes', 'choice', '4oak', 'fullhouse', 's-straight', 'l-straight', 'yacht'];
      allCats.forEach(catId => {
        if (scores[currentPlayer] && scores[currentPlayer][catId] === undefined) {
          unfilledCats.push(catId);
        }
      });

      if (unfilledCats.length > 0) {
        // 방 코드 기반 시드 셔플/난수 생성 (결정론적 동기화 구현)
        const roomCode = els.lobbyCodeDisplay?.textContent?.trim() || networkEngine.roomCode || window.currentRoomCode || 'HOTSEAT';
        const seedStr = `${roomCode}_BHTARGET_R${currentRound}_P${currentPlayer}`;
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          hash = (hash * 31 + seedStr.charCodeAt(i)) & 0x7fffffff;
        }
        const pseudoRandom = () => {
          hash = (hash * 1664525 + 1013904223) & 0x7fffffff;
          return hash / 0x7fffffff;
        };
        const randomIndex = Math.floor(pseudoRandom() * unfilledCats.length);
        bountyHunterTarget[currentPlayer] = unfilledCats[randomIndex];
      } else {
        bountyHunterTarget[currentPlayer] = null;
      }
    } else {
      bountyHunterTarget[currentPlayer] = null;
    }

    addGameLog({ type: 'turn-start', player: currentPlayer, round: currentRound }, 'turn-start', true, currentPlayer);
    clearScorePreviews();
    updateRollsUI();

    // [이벤트 트리거 1: 내 턴이 시작되었을 때 불이 들어옴]
    const bankSt = yachtBankState[currentPlayer];
    const hasYachtBank = Boolean(activeMutations[currentPlayer] && activeMutations[currentPlayer]['yacht'] === 'yacht-bank');
    const shouldLightUp = hasYachtBank && !bankSt?.completed && (bankSt?.turnsLeft === undefined || bankSt?.turnsLeft > 0);

    if (typeof diceEngine !== 'undefined' && diceEngine && typeof diceEngine.setYachtBankActive === 'function') {
      diceEngine.setYachtBankActive(shouldLightUp);
    }

    // 현상금 사냥꾼 타겟 지정 완료 후 UI 갱신 (지연 방지)
    if (typeof updateAugmentSidebar === 'function') {
      updateAugmentSidebar(currentPlayer);
    }
    updateScoreboard();
  };
  const proceedTurnStart = window.proceedTurnStart;

  if (gameMode === 'augmented' || gameMode === 'augmented-hotseat') {
    const isDraftRound = (currentRound === 1 || currentRound === 6 || currentRound === 9);
    const currentAugCount = Object.keys(activeMutations[currentPlayer] || {}).length;
    let expectedCount = 0;
    if (currentRound >= 1) expectedCount = 1;
    if (currentRound >= 6) expectedCount = 2;
    if (currentRound >= 9) expectedCount = 3;

    if (isDraftRound && currentAugCount < expectedCount) {
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

function updateRollsUI(isRolling = false) {
  els.rollsLeft.textContent = `남은 굴리기: ${rollsLeft}`;
  const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
  
  const hasEquivalentExchange = Object.values(activeMutations[currentPlayer] || {}).includes('equivalent-exchange');
  const canEquivalentExchange = hasEquivalentExchange && (equivalentExchangeUses[currentPlayer] || 0) > 0;

  if (isRolling) {
    els.btnRoll.disabled = true;
    els.btnRoll.classList.remove('equivalent-exchange-active');
    els.btnRoll.textContent = '주사위 굴리기';
    if (typeof diceEngine !== 'undefined' && diceEngine) {
      diceEngine.allowKeep = false;
    }
    return;
  }

  if (rollsLeft > 0) {
    els.btnRoll.disabled = !isMyTurn || !diceBoxReady;
    els.btnRoll.classList.remove('equivalent-exchange-active');
    els.btnRoll.textContent = '주사위 굴리기';
  } else if (canEquivalentExchange) {
    els.btnRoll.disabled = !isMyTurn || !diceBoxReady;
    els.btnRoll.classList.add('equivalent-exchange-active');
    els.btnRoll.textContent = '거래를 원하는가?';
  } else {
    els.btnRoll.disabled = true;
    els.btnRoll.classList.remove('equivalent-exchange-active');
    els.btnRoll.textContent = '주사위 굴리기';
  }

  if (typeof diceEngine !== 'undefined' && diceEngine) {
    const activeMuts = Object.values(activeMutations[currentPlayer] || {});
    let baseDiceCount = 5;
    const totalDiceAllowed = baseDiceCount + (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer] ? 1 : 0);

    // 요트 뱅크 활성화 기간 조건: 증강 보유 중이고 퀘스트 미완료이며 turnsLeft가 남아있거나 방금 선택된 턴인 경우
    const bankSt = yachtBankState[currentPlayer];
    const hasYachtBank = Boolean(activeMutations[currentPlayer] && activeMutations[currentPlayer]['yacht'] === 'yacht-bank');
    const isYachtBankActive = hasYachtBank && !bankSt?.completed && (bankSt?.turnsLeft === undefined || bankSt?.turnsLeft > 0);

    diceEngine.allowKeep = isMyTurn && (rollsLeft < 3 || canEquivalentExchange || isYachtBankActive);

    // 요트 뱅크 활성화 시 킵 존 테두리 금빛 강조 연출 (CSS)
    const diceBoardElem = document.getElementById('dice-board-area');
    if (diceBoardElem) {
      if (isYachtBankActive) {
        diceBoardElem.classList.add('yacht-bank-active');
      } else {
        diceBoardElem.classList.remove('yacht-bank-active');
      }
    }
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
  const hasEE = Object.values(activeMutations[currentPlayer] || {}).includes('equivalent-exchange');
  const canEE = rollsLeft <= 0 && hasEE && (equivalentExchangeUses[currentPlayer] || 0) > 0;

  if (!isMyTurn) return;
  if (rollsLeft <= 0 && !canEE) return;

  pauseTurnTimer(); // 주사위 굴리는 동안 타이머 정지
  soundEngine.playSFX('dice_roll');
  let isEquivalentRoll = false;
  if (rollsLeft > 0) {
    rollsLeft--;
  } else if (canEE) {
    isEquivalentRoll = true;
    equivalentExchangeUses[currentPlayer]--;
    equivalentExchangePenalty[currentPlayer] = (equivalentExchangePenalty[currentPlayer] || 0) + 5;
    equivalentExchangeTurnUses[currentPlayer] = (equivalentExchangeTurnUses[currentPlayer] || 0) + 1;
  }

  updateRollsUI(true);
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
    const acqRound = promotionAcquiredRound[currentPlayer] || currentRound;
    const pLevel = Math.max(0, currentRound - acqRound);
    specialConfigs.push({ type: 'promotion', promotionLevel: pLevel });
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

  if (isLocalAugmentProgressPlayer()) {
    Object.entries(diceAugmentTypes).forEach(([augmentId, diceType]) => {
      if (specialConfigs.some((config) => config.type === diceType)) {
        recordAugmentMetric(augmentProgressSession, augmentId, 'diceRolls');
      }
    });
  }

  // Custom Dice Engine Roll
  diceEngine.cleanUpDeadDice();

  const rolledCount = specialConfigs.length;
  if (keptConfigs.length === 0) {
    addGameLog({ type: 'roll-action', player: currentPlayer, meta: { rolledCount, keptValues: [], isEquivalentRoll } }, 'roll-action', window.isMultiplayer, currentPlayer);
  } else {
    const keptValues = diceEngine.diceArray.filter(d => d.isKept).map(d => d.value).sort((a, b) => a - b);
    addGameLog({ type: 'roll-action', player: currentPlayer, meta: { rolledCount, keptValues, isEquivalentRoll } }, 'roll-action', window.isMultiplayer, currentPlayer);
  }

  const rollPromise = diceEngine.roll(specialConfigs);

  if (window.isMultiplayer) {
    const spawnTransforms = diceEngine.getSpawnTransforms();
    networkEngine.sendMessage({
      type: 'sync_roll',
      specialConfigs,
      rollsLeft,
      spawnTransforms,
      equivalentExchangeUses: equivalentExchangeUses[currentPlayer],
      equivalentExchangePenalty: equivalentExchangePenalty[currentPlayer],
      isEquivalentRoll
    });
  }

  await rollPromise;

  if (window.isMultiplayer) {
    const finalValues = diceEngine.diceArray.map(d => d.value);
    const finalTransforms = diceEngine.getFinalTransforms();
    networkEngine.sendMessage({ type: 'sync_roll_end', finalValues, finalTransforms });
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

    updateRollsUI();
    resumeTurnTimer(); // 롤링 완료 후 타이머 재개
    updateScorePreviews(); // 롤링 완료 후 족보 미리보기 및 기입 버튼 활성화
  }, 100); // 틱틱거림 방지를 위해 딜레이 대폭 축소
});

// 점수 미리보기
function updateScorePreviews() {
  clearScorePreviews();

  // 아직 주사위를 굴리지 않은 턴 시작 직후인 경우 미리보기 생략
  if (rollsLeft === 3 && activeDice.length === 0 && keptDice.length === 0) {
    return;
  }

  // 요트 뱅크: 킵 존 주사위는 족보 점수 계산에서 제외
  const isYachtBankActive = (activeMutations[currentPlayer] && activeMutations[currentPlayer]['yacht'] === 'yacht-bank' && yachtBankState[currentPlayer]?.turnsLeft > 0);
  const evalDice = isYachtBankActive ? [...activeDice] : [...keptDice, ...activeDice];

  if (evalDice.length > 5) {
    if (keptDice.length === 5) {
      previewScores(keptDice);
    } else {
      showNotSelectedState(5 - keptDice.length);
    }
  } else {
    previewScores(evalDice);
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
  if (!yachtBankState[currentPlayer]) yachtBankState[currentPlayer] = { turnsLeft: 0, accumulatedScore: 0, initialized: false, completed: false };

  // Get full dice array from engine to pass configs to scoreEngine if needed
  const fullDiceObjects = diceEngine.diceArray.map(d => ({ value: d.value, type: d.config.type }));
  const potentialScores = calculateScores(diceArray, activeMutations[currentPlayer] || {}, { bank: (yachtBankState[currentPlayer]?.accumulatedScore || 0), fullDice: fullDiceObjects });

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

    // 요트 뱅크 미리보기 및 잠금 처리
    const isYachtBankCell = (cat.id === 'yacht' && activeMutations[currentPlayer]['yacht'] === 'yacht-bank');
    if (isYachtBankCell) {
      const bankVal = Math.min(yachtBankState[currentPlayer]?.accumulatedScore || 0, 15);
      scoreText = `${bankVal}`;
    }

    cell.innerHTML = scoreText;
    cell.style.color = ''; // 인라인 색상 초기화 (suggested/suggested-readonly 클래스 적용을 위해)

    // 턴 주체 여부에 따라 클래스 구분 (본인 턴: suggested, 상대방 턴: suggested-readonly 호버 무반응)
    const isMyTurn = !window.isMultiplayer || currentPlayer === window.myPlayerIndex;
    if (isMyTurn && !isYachtBankCell) {
      cell.classList.remove('suggested-readonly');
      cell.classList.add('suggested');
      cell.onclick = () => lockScore(cat.id, potentialScores[cat.id]);
    } else {
      cell.classList.remove('suggested');
      cell.classList.add('suggested-readonly');
      cell.onclick = null;
    }
  });

  if (typeof updateAugmentSidebar === 'function') {
    updateAugmentSidebar();
  }
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
          cell.classList.remove('suggested-readonly');
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
    let score = scoreVal ? (typeof scoreVal === 'object' ? scoreVal.score + (scoreVal.bonus || 0) : scoreVal) : 0;

    const mutId = activeMutations[player] ? activeMutations[player][catId] : null;
    if (mutId && mutationDefinitions[mutId] && mutationDefinitions[mutId].excludeFromUpper) {
      score = 0; // 상단 보너스 합산 제외
    }
    return sum + score;
  }, 0);
}

function recordDiceScoreUsage(catId, scoreObj) {
  if (!isLocalAugmentProgressPlayer() || !scoreObj || scoreObj.score <= 0 || !diceEngine) return;
  const dice = diceEngine.diceArray.filter((die) => die.config?.type !== 'weird');
  const mutations = activeMutations[currentPlayer] || {};
  Object.entries(diceAugmentTypes).forEach(([augmentId, diceType]) => {
    if (!Object.values(mutations).includes(augmentId) || !dice.some((die) => die.config?.type === diceType)) return;
    const withoutAugmentDice = dice.filter((die) => die.config?.type !== diceType).map((die) => die.value);
    const withoutScore = calculateScores(withoutAugmentDice, mutations, { bank: yachtBankState[currentPlayer]?.accumulatedScore || 0 })[catId]?.score || 0;
    if (withoutScore !== scoreObj.score) {
      recordAugmentMetric(augmentProgressSession, augmentId, 'diceScoreRecords');
    }
  });

  const sevensDice = dice.filter((die) => die.config?.type === 'sevens');
  if (sevensDice.some((die) => die.value === 7) && ['s-straight', 'l-straight'].includes(catId)) {
    recordAchievementProgress(augmentProgressSession, 'sevens-dice-skill-showcase');
  }
  if (Object.values(mutations).includes('couple-dice') && scoreObj.bonusDetails?.some((detail) => detail.value === 3)) {
    recordAchievementProgress(augmentProgressSession, 'couple-dice-perfect-match');
  }
}

function lockScore(catId, scoreInfo, isSync = false, force = false) {
  stopTurnTimer();
  soundEngine.playSFX('scoreboard');
  if (!force) {
    soundEngine.stopBGM();
  }
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
      if (isLocalAugmentProgressPlayer()) {
        recordAchievementProgress(augmentProgressSession, 'momentum-kneel', momentumBonus, 'max');
      }

      addGameLog({ type: 'system', message: `${getPlayerLabel(currentPlayer)}의 [추진력] 증강이 발동하여 획득 점수가 1.5배로 증가했습니다! (${newTotal}점 획득)` }, 'system', window.isMultiplayer, currentPlayer);
    }
  }

  // 현상금 사냥꾼 타겟 기입 검증 및 진행도 누적
  const activeMuts = Object.values(activeMutations[currentPlayer] || {});
  if (activeMuts.includes('bounty-hunter') && bountyHunterTarget[currentPlayer] === catId) {
    const bhProg = bountyHunterProgress[currentPlayer] || { count: 0, penaltyCount: 0 };
    bhProg.count = (bhProg.count || 0) + 1;
    
    // 스크래치(0점) 기입 여부 판정
    const actualScore = scoreObj.score !== undefined ? scoreObj.score : 0;
    if (actualScore === 0) {
      bhProg.penaltyCount = (bhProg.penaltyCount || 0) + 1;
    }
    if (isLocalAugmentProgressPlayer() && actualScore >= 20 && currentRound - (bountyHunterAcquiredRound[currentPlayer] || currentRound) < 3) {
      recordAchievementProgress(augmentProgressSession, 'bounty-hunter-legendary-killer');
    }

    const remainingHits = 3 - bhProg.count;
    if (remainingHits > 0) {
      addGameLog({ type: 'system', message: `[현상금 사냥꾼] 타겟 적중! 앞으로 ${remainingHits}회 남았습니다.` }, 'system', window.isMultiplayer, currentPlayer);
    } else if (remainingHits === 0) {
      // 3회 달성: 퀘스트 완료 보상 가산 (스크래치 감점 계산)
      const finalReward = Math.max(0, 15 - (bhProg.penaltyCount * 3));
      if (!questProgress[currentPlayer]) questProgress[currentPlayer] = {};
      questProgress[currentPlayer].questBonus = (questProgress[currentPlayer].questBonus || 0) + finalReward;
      addGameLog({ type: 'system', message: `[현상금 사냥꾼] 현상금 획득 성공! 보너스 +${finalReward}점을 얻었습니다.` }, 'system', window.isMultiplayer, currentPlayer);
    }
  }

  if (isLocalAugmentProgressPlayer()) {
    recordDiceScoreUsage(catId, scoreObj);
    if (activeMuts.includes('reverse-choice') && catId === 'yacht' && scoreObj.score === 25) {
      recordAchievementProgress(augmentProgressSession, 'reverse-choice-unlucky-man');
    }
    if (equivalentExchangeTurnUses[currentPlayer] >= 3 && scoreObj.score > 0) {
      recordAchievementProgress(augmentProgressSession, 'equivalent-exchange-soul-trade');
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

  // 요트 뱅크 로직 처리: 요트 달성 시 요트 뱅크 퀘스트 마감
  if (catId === 'yacht' && isYacht) {
    [1, 2, 3, 4].forEach(p => {
      if (yachtBankState[p]) yachtBankState[p].completed = true;
    });
  }

  // 보너스(63점 이상 달성 시 35점 추가) 체크
  const upperSum = getUpperSum(currentPlayer);
  if (upperSum >= upperBonusThreshold[currentPlayer]) {
    scores[currentPlayer]['bonus'] = 35;
  }

  stopTurnTimer(); // 족보 선택 즉시 장고 타이머 일시 정지
  els.btnRoll.disabled = true; // 주사위 정리 중 굴리기 버튼 비활성화

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

  // 타겟 족보 제목 Fade Out 효과
  if (bountyHunterTarget[currentPlayer] === catId) {
    const title = document.getElementById(`${currentPlayer === 1 ? 'cat-title-left' : 'cat-title-right'}-${catId}`);
    if (title?.classList.contains('bounty-target-highlight')) {
      title.classList.add('fade-out-target');
    }
  }

  // 특수 족보 완성 확인 (Choice 포함)
  const specialCats = ['choice', '4oak', 'fullhouse', 's-straight', 'l-straight', 'yacht'];
  const isSpecial = specialCats.includes(catId) && scoreObj.score > 0;

  if (diceEngine) {
    diceEngine.playClearAnimation(isSpecial); // 애니메이션 실행
  }

  const totalCount = getActivePlayerCount();

  updateQuestProgress(currentPlayer, catId, scoreObj);

  // 요트 뱅크: 턴 종료 시 킵 존 주사위 눈금 누적 (최대 15점) 및 남은 턴 차감
  if (activeMutations[currentPlayer] && activeMutations[currentPlayer]['yacht'] === 'yacht-bank') {
    if (!yachtBankState[currentPlayer]) {
      yachtBankState[currentPlayer] = { turnsLeft: 3, accumulatedScore: 0, initialized: true, completed: false };
    }
    const bankState = yachtBankState[currentPlayer];
    if (bankState && bankState.turnsLeft > 0 && !bankState.completed) {
      const keptSum = keptDice.reduce((a, b) => a + b, 0);
      if (keptSum > 0) {
        bankState.accumulatedScore = Math.min(bankState.accumulatedScore + keptSum, 15);
        addGameLog({ type: 'system', message: `[Bank] 요트 뱅크 족보에 주사위 [${keptDice.join(', ')}]를 적립해 ${keptSum}점이 누적되었습니다. (${bankState.accumulatedScore}/15점)` }, 'system', window.isMultiplayer, currentPlayer);
        if (isLocalAugmentProgressPlayer()) {
          const enhancedKeptCount = diceEngine.diceArray.filter((die) =>
            die.isKept && Object.values(diceAugmentTypes).includes(die.config?.type)
          ).length;
          if (enhancedKeptCount) {
            recordAchievementProgress(augmentProgressSession, 'yacht-bank-fence', enhancedKeptCount);
          }
        }
      }
      bankState.turnsLeft--;
      if (bankState.turnsLeft === 0) {
        bankState.completed = true; // 3턴 진행 완료
      }
    }
  }

  clearScorePreviews();
  updateScoreboard();

  // [이벤트 트리거 2: 내 턴이 끝났을 때 불이 꺼짐]
  if (typeof diceEngine !== 'undefined' && diceEngine && typeof diceEngine.setYachtBankActive === 'function') {
    diceEngine.setYachtBankActive(false);
  }

  // 족보 점수 기입 및 결과/로그 확인 유예시간 3초(3000ms) 적용
  const animDelay = 3000;
  setTimeout(() => {
    if (diceEngine) {
      diceEngine.clearAll();
    }

    advanceTurnAfterScore();
  }, animDelay);
}

function hasUnfilledCategory(p) {
  if (!scores[p]) return true;
  const allCats = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes', 'choice', '4oak', 'fullhouse', 's-straight', 'l-straight', 'yacht'];
  return allCats.some(catId => scores[p][catId] === undefined);
}

function advanceTurnAfterScore() {
  const totalCount = getActivePlayerCount();

  if (isExtraTurnPhase && (extraTurns[currentPlayer] || 0) > 0) {
    extraTurns[currentPlayer]--;
  }

  if (currentRound <= 12) {
    if (currentPlayer < totalCount) {
      currentPlayer++;
    } else {
      currentPlayer = 1;
      currentRound++;
    }

    if (currentRound > 12) {
      checkExtraTurnsOrEndGame();
    } else {
      isExtraTurnPhase = false;
      startTurn();
    }
  } else {
    checkExtraTurnsOrEndGame();
  }
}

function checkExtraTurnsOrEndGame() {
  const totalCount = getActivePlayerCount();
  const candidatePlayers = [];

  for (let p = 1; p <= totalCount; p++) {
    if ((extraTurns[p] || 0) > 0 && hasUnfilledCategory(p) && !forfeitedPlayers[p]) {
      candidatePlayers.push(p);
    }
  }

  if (candidatePlayers.length === 0) {
    endGame();
    return;
  }

  let nextPlayer = null;
  for (let step = 1; step <= totalCount; step++) {
    const testP = ((currentPlayer - 1 + step) % totalCount) + 1;
    if (candidatePlayers.includes(testP)) {
      nextPlayer = testP;
      break;
    }
  }

  if (!nextPlayer) {
    nextPlayer = candidatePlayers[0];
  }

  currentPlayer = nextPlayer;
  isExtraTurnPhase = true;

  addGameLog({
    type: 'system',
    message: `${getPlayerLabel(currentPlayer)}의 추가 턴(+1턴)이 시작됩니다!`
  }, 'system', window.isMultiplayer, currentPlayer);

  startTurn();
}

let isGameEnded = false;

function isLocalAugmentProgressPlayer(player = currentPlayer) {
  return gameMode === 'augmented' && window.isMultiplayer && player === (window.myPlayerIndex || 1) && Boolean(augmentProgressSession);
}

function getQuestCompleted(augmentId, progress = {}) {
  const completedFlags = {
    'yacht-bank': Boolean(yachtBankState[window.myPlayerIndex || 1]?.completed),
    'fast-straight': progress.fastStraightRewarded,
    'no-time-to-waste': progress.noTimeRewarded,
    'step-by-step': progress.stepRewarded,
    'two-households': progress.twoHouseholdsRewarded,
    'holdout': progress.holdoutRewarded,
    'cautious-straight': progress.cautiousRewarded,
    'every-little': progress.everyLittleRewarded,
    'copycat': progress.copycatRewarded,
    'doubling': progress.doublingRewarded,
    'nozdormu': progress.nozdormuRewarded,
    'bounty-hunter': (bountyHunterProgress[window.myPlayerIndex || 1]?.count || 0) >= 3
  };
  return Boolean(completedFlags[augmentId]);
}

function didLocalPlayerWin(player) {
  const scoreOf = (target) => Object.entries(scores[target] || {}).reduce((total, [key, value]) => {
    if (key === 'bonus') return total + (typeof value === 'object' ? value.score + (value.bonus || 0) : value);
    return total + (typeof value === 'object' ? value.score + (value.bonus || 0) : value);
  }, 0) + (questProgress[target]?.questBonus || 0) +
    ((activeMutations[target]?.yacht === 'yacht-bank' && scores[target]?.yacht === undefined)
      ? Math.min(yachtBankState[target]?.accumulatedScore || 0, 15) : 0);
  const myScore = scoreOf(player);
  const opponents = Array.from({ length: getActivePlayerCount() }, (_, index) => index + 1)
    .filter((target) => target !== player && !forfeitedPlayers[target]);
  return opponents.every((target) => myScore > scoreOf(target));
}

function setAugmentProgressSaveStatus(message = '', state = '') {
  const status = document.getElementById('endgame-augment-progress-status');
  if (!status) return;
  status.hidden = !message;
  status.textContent = message;
  status.dataset.state = state;
}

async function savePersonalAugmentProgress() {
  const user = getCurrentUser();
  const myPlayer = window.myPlayerIndex || 1;
  if (gameMode !== 'augmented') return false;
  if (!window.isMultiplayer) {
    setAugmentProgressSaveStatus('도전과제 저장 제외: 멀티플레이 게임이 아님.', 'skipped');
    return false;
  }
  if (!user?.uid) {
    setAugmentProgressSaveStatus('도전과제 저장 실패: 로그인 정보가 없음.', 'error');
    return false;
  }
  if (forfeitedPlayers[myPlayer]) {
    setAugmentProgressSaveStatus('도전과제 저장 제외: 기권한 게임임.', 'skipped');
    return false;
  }
  if (!augmentProgressSession) {
    setAugmentProgressSaveStatus('도전과제 저장 실패: 게임 진행 세션을 찾을 수 없음.', 'error');
    return false;
  }

  setAugmentProgressSaveStatus('도전과제 진행도 저장 중...', 'pending');

  Object.values(activeMutations[myPlayer] || {}).forEach((augmentId) => {
    if (!augmentProgressSession.selections[augmentId]) {
      recordAugmentSelection(augmentProgressSession, augmentId);
    }
  });
  const selectedAugments = Object.values(activeMutations[myPlayer] || {});
  const scoreRecords = Object.entries(scores[myPlayer] || {}).filter(([category]) => category !== 'bonus');
  selectedAugments.forEach((augmentId) => {
    const metricKeys = new Set(getAugmentTelemetryDefinitions(augmentId).map((metric) => metric.key));
    if (metricKeys.has('scoreRecords')) {
      recordAugmentMetric(augmentProgressSession, augmentId, 'scoreRecords', scoreRecords.length);
      recordAugmentMetric(augmentProgressSession, augmentId, 'scratches', scoreRecords.filter(([, value]) => {
        const score = typeof value === 'object' ? value.score : value;
        return score <= 0;
      }).length);
    }
    if (metricKeys.has('questSuccesses')) {
      recordAugmentMetric(
        augmentProgressSession,
        augmentId,
        getQuestCompleted(augmentId, questProgress[myPlayer] || {}) ? 'questSuccesses' : 'questFailures'
      );
    }
  });
  if (playerTableFlipUsed[myPlayer]) {
    recordAugmentMetric(augmentProgressSession, 'table-flip', 'uses');
  }
  if (Object.values(activeMutations[myPlayer] || {}).includes('yacht-bank')) {
    if (yachtBankState[myPlayer]?.completed) {
      recordAugmentMetric(augmentProgressSession, 'yacht-bank', 'completed');
    }
    recordAugmentMetric(
      augmentProgressSession,
      'yacht-bank',
      'bankedScore',
      Math.min(yachtBankState[myPlayer]?.accumulatedScore || 0, 15)
    );
  }
  if (didLocalPlayerWin(myPlayer)) {
    if (augmentProgressSession.flags.tableFlipWhileBehind) {
      recordAchievementProgress(augmentProgressSession, 'table-flip-skilled-player');
    }
    if (augmentProgressSession.flags.holdoutTurn12) {
      recordAchievementProgress(augmentProgressSession, 'holdout-patience-wins');
    }
  }

  try {
    const saved = await saveAugmentProgress(user.uid, augmentProgressSession);
    if (!saved) {
      setAugmentProgressSaveStatus('도전과제 저장 실패: 이미 처리된 게임이거나 사용자 데이터를 찾을 수 없음.', 'error');
      return false;
    }
    setAugmentProgressSaveStatus('도전과제 진행도 저장 완료함.', 'success');
    return true;
  } catch (error) {
    console.error('Augment progress save failed:', error);
    const reason = error?.code || error?.message || '알 수 없는 오류';
    setAugmentProgressSaveStatus(`도전과제 저장 실패: ${reason}`, 'error');
    return false;
  }
}

function endGame() {
  if (isGameEnded) return;
  isGameEnded = true;

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
    let tot = Object.values(scores[p] || {}).reduce(sumObj, 0);
    if (activeMutations[p] && activeMutations[p]['yacht'] === 'yacht-bank' && (scores[p] && scores[p]['yacht'] === undefined)) {
      tot += Math.min(yachtBankState[p]?.accumulatedScore || 0, 15);
    }
    tot += (questProgress[p]?.questBonus || 0);

    const pData = (window.initialMatchPlayers && window.initialMatchPlayers[p - 1])
      ? window.initialMatchPlayers[p - 1]
      : (window.lobbyPlayers ? window.lobbyPlayers[p - 1] : null);
    const nickname = pData ? pData.nickname : `Player ${p}`;
    let avatarUrl = pData ? pData.avatarUrl : null;

    if (!avatarUrl && (window.myPlayerIndex === p || p === 1)) {
      avatarUrl = window.myPlayerInfo?.avatarUrl || getCurrentUser()?.photoURL || null;
    }

    playerStats.push({ playerIndex: p, nickname, totalScore: tot, avatarUrl, isForfeited: Boolean(forfeitedPlayers[p]) });
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
        const higherCount = activePlayers.filter(s => s.totalScore > stat.totalScore).length;
        const displayRank = higherCount + 1;
        isWinner = (displayRank === 1);
        rankBadge = isWinner ? '<span class="endgame-rank-badge rank-1">🏆 1위</span>' : `<span class="endgame-rank-badge">${displayRank}위</span>`;
      }

      const card = document.createElement('div');
      card.className = `endgame-score-card ${isWinner ? 'winner-card' : ''} ${stat.isForfeited ? 'forfeit-card' : ''}`;

      const avatarStyle = stat.avatarUrl 
        ? `background-image: url('${stat.avatarUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;` 
        : 'background-color: #ccc;';
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
  setAugmentProgressSaveStatus();
  void savePersonalAugmentProgress();

  const myIdx = window.myPlayerIndex || 1;
  const activePlayerIndices = [];
  for (let p = 1; p <= count; p++) {
    if (!forfeitedPlayers[p]) {
      activePlayerIndices.push(p);
    }
  }
  const saverIndex = activePlayerIndices.includes(1) ? 1 : (activePlayerIndices[0] || 1);
  const isHostOrSaver = (myIdx === saverIndex);

  if (gameMode && gameMode !== 'hotseat' && gameMode !== 'none') {
    if (isHostOrSaver) {
      saveMatchData();
    }
  }
}

function sanitizeForFirestore(obj) {
  return JSON.parse(JSON.stringify(obj, (key, value) => (value === undefined ? null : value)));
}

async function saveMatchData() {
  if (gameMode === 'hotseat' || gameMode === 'augmented-hotseat' || !window.isMultiplayer) {
    return;
  }

  const count = getActivePlayerCount();
  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);

  let playersData = {};
  let playerUids = [];
  let maxScore = -1;
  let topUids = [];
  const matchCompletedAt = new Date().toISOString();

  const addUidToPlayerUids = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const cUid = cleanUid(raw);
    if (cUid) {
      if (!playerUids.includes(cUid)) playerUids.push(cUid);
    }
  };

  const playersSource = (window.initialMatchPlayers && window.initialMatchPlayers.length > 0)
    ? window.initialMatchPlayers
    : (window.lobbyPlayers || []);

  if (Array.isArray(playersSource)) {
    playersSource.forEach(pl => {
      addUidToPlayerUids(pl?.uid);
    });
  }
  const curUser = getCurrentUser();
  if (curUser?.uid) {
    addUidToPlayerUids(curUser.uid);
  }
  if (window.myUid) {
    addUidToPlayerUids(window.myUid);
  }

  for (let p = 1; p <= count; p++) {
    const pInfo = playersSource ? playersSource[p - 1] : null;
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
    const qBonus = (questProgress[p]?.questBonus || 0);
    let totScore = Object.values(scores[p] || {}).reduce(sumObj, 0);
    if (activeMutations[p] && activeMutations[p]['yacht'] === 'yacht-bank' && (scores[p] && scores[p]['yacht'] === undefined)) {
      totScore += Math.min(yachtBankState[p]?.accumulatedScore || 0, 15);
    }
    totScore += qBonus;
    const isForfeited = Boolean(forfeitedPlayers[p]);

    addUidToPlayerUids(rawUid);
    addUidToPlayerUids(pInfo?.uid);

    if (!isForfeited) {
      if (totScore > maxScore) {
        maxScore = totScore;
        topUids = [uid];
      } else if (totScore === maxScore) {
        topUids.push(uid);
      }
    }

    const playerScores = Object.fromEntries(
      Object.entries(scores[p] || {}).map(([k, v]) => [k, typeof v === 'object' ? v.score : v])
    );
    if (qBonus > 0) {
      playerScores['questBonus'] = qBonus;
    }
    const upperScore = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes']
      .reduce((total, category) => total + (Number(playerScores[category]) || 0), 0);
    const upperBonusAchieved = gameMode === 'normal' && upperScore >= 63;
    const yachtAchieved = gameMode === 'normal' && Number(playerScores.yacht) === 50;

    playersData[`p${p}`] = {
      uid: uid,
      nickname: nickname,
      avatarUrl: avatarUrl,
      totalScore: totScore,
      isForfeited: isForfeited,
      isHost: pInfo ? pInfo.isHost : (p === 1),
      scores: playerScores,
      augments: Object.values(activeMutations[p] || {}),
      upperBonusAchieved,
      yachtAchieved
    };
  }

  const winnerUid = topUids.length === 1 ? topUids[0] : (topUids.length > 1 ? 'draw' : 'none');

  const rawMatchDoc = {
    mode: gameMode || 'normal',
    timestamp: serverTimestamp(),
    winnerUid: winnerUid,
    playerUids: playerUids,
    players: playersData,
    playLogs: window.matchLogHistory || []
  };

  const matchDoc = sanitizeForFirestore(rawMatchDoc);
  matchDoc.timestamp = serverTimestamp(); // Sentinel 타입 유지

  try {
    // 1. matches 컬렉션에 매치 결과 저장
    const docRef = await addDoc(collection(db, "matches"), matchDoc);

    // 2. 각 유저별 stats 데이터 누적 업데이트
    const updateStats = async (uid, playerData) => {
      if (!uid || uid.startsWith('guest') || uid === 'undefined') return;
      const userRef = doc(db, "users", uid);

      try {
        await runTransaction(db, async (transaction) => {
          const sfDoc = await transaction.get(userRef);
          if (!sfDoc.exists()) return;

          const oldData = sfDoc.data();
          const stats = oldData.stats || {};
          transaction.update(userRef, {
            stats: updateProfileStats(stats, {
              mode: gameMode,
              score: playerData.totalScore,
              completedAt: matchCompletedAt,
              upperBonusAchieved: playerData.upperBonusAchieved,
              yachtAchieved: playerData.yachtAchieved
            })
          });
        });
      } catch (txErr) {
        console.error("Stats Transaction failed: ", txErr);
      }
    };

    const curAuthUser = getCurrentUser();
    for (let p = 1; p <= count; p++) {
      const pData = playersData[`p${p}`];
      // 본인 계정 통계만 업데이트 (타 유저 문서 수정 시도로 인한 Firestore 403 Forbidden 권한 에러 방지)
      if (pData && pData.uid && curAuthUser?.uid && cleanUid(pData.uid) === cleanUid(curAuthUser.uid)) {
        await updateStats(pData.uid, pData);
      }
    }

    const currentUser = getCurrentUser();
    if (currentUser?.uid) {
      profileDataCache.delete(currentUser.uid);
      refreshUserHistory(currentUser.uid);
    }
  } catch (err) {
    console.error("Failed to save match data:", err);
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
  if (window.matchTotalPlayers && window.matchTotalPlayers >= 2) {
    return window.matchTotalPlayers;
  }
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
      const searchPlayers = (window.initialMatchPlayers && window.initialMatchPlayers.length > 0)
        ? window.initialMatchPlayers
        : (window.lobbyPlayers || []);
      const pData = searchPlayers.find((pl, idx) => (pl.playerIndex ? Number(pl.playerIndex) === i : idx + 1 === i)) || searchPlayers[i - 1];
      const pName = pData ? pData.nickname : `P${i}`;
      headerHtml += `<th id="p${i}-name" class="col-player" title="${pName}"><div class="name-text" title="${pName}">${pName}</div></th>`;
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
      const bonusTitle = count >= 3 ? 'Bonus (+35)' : 'Bonus (0/63)';
      cellsHtml += `<th class="col-cat" id="cat-title-left-${cat.id}">${bonusTitle}</th>`;
      for (let i = 1; i <= count; i++) {
        const initText = count >= 3 ? '0/63' : '+35';
        cellsHtml += `<td id="p${i}-${cat.id}" style="font-weight: bold; color: #888;">${initText}</td>`;
      }
      if (showRight) {
        cellsHtml += `<th class="col-cat" id="cat-title-right-${cat.id}">${bonusTitle}</th>`;
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

      if (count >= 3) {
        if (titleLeft) titleLeft.textContent = `Bonus (+35)`;
        if (titleRight) titleRight.textContent = `Bonus (+35)`;
      } else {
        if (titleLeft) titleLeft.textContent = `Bonus (${p1Upper}/${upperBonusThreshold[1] || 63})`;
        if (titleRight) titleRight.textContent = `Bonus (${p2Upper}/${upperBonusThreshold[2] || 63})`;
      }

      for (let p = 1; p <= count; p++) {
        const cell = document.getElementById(`p${p}-${cat.id}`);
        if (cell) {
          const pUpper = getUpperSum(p);
          const isUpperComplete = upperCats.every(c => scores[p] && scores[p][c] !== undefined);
          const threshold = upperBonusThreshold[p] || 63;
          const bonusVal = (questProgress[p]?.stepRewarded) ? 55 : 35;

          if (count >= 3) {
            if (pUpper >= threshold) {
              cell.innerHTML = `<span style="color: #D4AF37; font-weight: bold;">+${bonusVal}</span>`;
            } else if (isUpperComplete) {
              cell.innerHTML = `<span style="text-decoration: line-through; color: #888; font-weight: bold;">+${bonusVal}</span>`;
            } else {
              cell.innerHTML = `<span style="color: #888; font-weight: bold;">${pUpper}/${threshold}</span>`;
            }
          } else {
            if (pUpper >= threshold) {
              cell.innerHTML = `<span style="color: #D4AF37; font-weight: bold;">+${bonusVal}</span>`;
            } else if (isUpperComplete) {
              cell.innerHTML = `<span style="text-decoration: line-through; color: #888; font-weight: bold;">+${bonusVal}</span>`;
            } else {
              cell.innerHTML = `<span style="color: #888; font-weight: bold;">+${bonusVal}</span>`;
            }
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
              cell.textContent = Math.min(yachtBankState[p]?.accumulatedScore || 0, 15);
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

      // 현상금 사냥꾼 타겟은 점수 기입 칸 대신 족보 제목 칸에 표시한다.
      ['left', 'right'].forEach(side => {
        const isTargetColumn = side === 'left' ? currentPlayer === 1 : currentPlayer > 1;
        const isBountyTarget = isTargetColumn &&
          bountyHunterTarget[currentPlayer] === cat.id &&
          scores[currentPlayer]?.[cat.id] === undefined;
        const title = document.getElementById(`cat-title-${side}-${cat.id}`);
        if (!title) return;
        if (!title.classList.contains('fade-out-target')) {
          title.classList.toggle('bounty-target-highlight', isBountyTarget);
        }
      });
    }
  });

  const sumObj = (sum, val) => sum + (typeof val === 'object' ? val.score + (val.bonus || 0) : val);

  for (let p = 1; p <= count; p++) {
    let baseTotal = Object.values(scores[p] || {}).reduce(sumObj, 0);

    if (activeMutations[p] && activeMutations[p]['yacht'] === 'yacht-bank' && (scores[p] && scores[p]['yacht'] === undefined)) {
      baseTotal += Math.min(yachtBankState[p]?.accumulatedScore || 0, 15);
    }

    const qBonus = questProgress[p]?.questBonus || 0;
    const eePenalty = equivalentExchangePenalty[p] || 0;

    const pTotalEl = document.getElementById(`p${p}-total`);
    if (pTotalEl) {
      let html = `${baseTotal}`;
      if (qBonus > 0) {
        html += ` <span style="color: #D4AF37; font-weight: bold;">+${qBonus}</span>`;
      }
      if (eePenalty > 0) {
        html += ` <span style="color: #ef4444; font-weight: bold;">-${eePenalty}</span>`;
      }
      pTotalEl.innerHTML = html;
    }
  }
}

initScoreboard();
updateScoreboard();
updateTurnTimerUI();

// 3D 주사위 엔진 초기화
let diceEngine;

setTimeout(async () => {
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

  diceEngine.onPhysicsUpdate = null; // 매 프레임 스트리밍 패킷 전송 비활성화

  await diceEngine.ready;
  diceBoxReady = true;
  removeMainSkeletons();
  if (els.appContainer?.classList.contains('mode-select-state')) {
    els.btnRoll.disabled = false;
    if (els.gameStatus) els.gameStatus.textContent = '로비 (자유 연습)';
    if (els.rollsLeft) els.rollsLeft.textContent = '무한 굴리기';
    diceEngine.allowKeep = true;
  }


  if (gameMode !== 'none') {
    updateRollsUI();
  } else {
    els.btnRoll.disabled = false;
  }
}, 100);

function updateQuestProgress(player, catId, scoreObj) {
  const p = (typeof player === 'string' && player.startsWith('p')) ? parseInt(player.slice(1), 10) : Number(player || 1);
  if (!questProgress[p]) questProgress[p] = {};
  const prog = questProgress[p];
  const s = scores[p] || {};
  const myMutations = Object.values(activeMutations[p] || {});

  const addReward = (questName, bonusAmount) => {
    prog.questBonus = (prog.questBonus || 0) + bonusAmount;
    addGameLog({ type: 'system', message: `${getPlayerLabel(p)}이 [${questName}] 퀘스트를 달성하여 보너스 +${bonusAmount}점을 획득했습니다!` }, 'system', window.isMultiplayer, p);
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
        if (isLocalAugmentProgressPlayer(p) && currentRound <= 5) {
          recordAchievementProgress(augmentProgressSession, 'fast-straight-speed');
        }
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
        if (isLocalAugmentProgressPlayer(p) && currentRound === 12) {
          augmentProgressSession.flags.holdoutTurn12 = true;
        }
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

  // 8. 카피캣 (copycat): 상대가 입력한 족보를 따라서 3회 기입 (+10점) / 하단 족보 동점 기입 시 즉시 달성
  if (myMutations.includes('copycat') && !prog.copycatRewarded) {
    const pNum = (typeof player === 'string' && player.startsWith('p')) ? parseInt(player.slice(1), 10) : Number(player || 1);
    const otherPlayer = pNum === 1 ? 2 : 1;
    const otherScores = scores[otherPlayer] || {};
    if (otherScores[catId] !== undefined) {
      prog.copycatCount = (prog.copycatCount || 0) + 1;
      const lowerCats = ['choice', '4oak', 'fullhouse', 's-straight', 'l-straight', 'yacht'];
      const myScore = scoreObj ? (typeof scoreObj === 'object' ? scoreObj.score : scoreObj) : (s[catId]?.score !== undefined ? s[catId].score : s[catId]);
      const oppScore = typeof otherScores[catId] === 'object' ? otherScores[catId].score : otherScores[catId];
      
      if (lowerCats.includes(catId) && myScore === oppScore && myScore > 0) {
        prog.copycatSpecialCleared = true;
        prog.copycatRewarded = true;
        addReward('카피캣', 10);
      } else if (prog.copycatCount >= 3) {
        prog.copycatRewarded = true;
        addReward('카피캣', 10);
      }
    }
  }

  // 9. 더블링 (doubling): 동일한 점수로 족보를 두 번 등록 (스크래치 제외, +10점)
  if (myMutations.includes('doubling') && !prog.doublingRewarded) {
    const validScores = [];
    Object.values(s).forEach(val => {
      const sc = typeof val === 'object' ? val.score : val;
      if (sc !== undefined && sc > 0) {
        validScores.push(sc);
      }
    });
    const hasSameScore = validScores.some((sc, idx) => validScores.indexOf(sc) !== idx);
    if (hasSameScore) {
      prog.doublingRewarded = true;
      addReward('더블링', 10);
    }
  }

  // 10. 노즈도르무 (nozdormu): 페이즈 종료 시점 달성 (+9점)
  if (myMutations.includes('nozdormu') && !prog.nozdormuRewarded) {
    if (!prog.nozdormuTargetRound) {
      prog.nozdormuTargetRound = currentRound <= 5 ? 5 : (currentRound <= 8 ? 8 : 12);
    }
    if (currentRound >= prog.nozdormuTargetRound) {
      prog.nozdormuRewarded = true;
      addReward('노즈도르무', 9);
    }
  }
}

// -----------------------------------------------------
// 5. 디버그 도구
// -----------------------------------------------------
// 좌측 증강 섹션(UI) 업데이트 함수
function getQuestProgressText(player, mutId) {
  const p = (typeof player === 'string' && player.startsWith('p')) ? parseInt(player.slice(1), 10) : Number(player || 1);
  const prog = questProgress[p] || {};
  const s = scores[p] || {};
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

    case 'copycat':
      if (prog.copycatRewarded) status = 'completed';
      const cCount = prog.copycatCount || 0;
      if (prog.copycatSpecialCleared) {
        questLines.push(line('이전 턴에 상대방이 기입한 족보와 동일한 족보 기입 (조건 달성!)', true));
      } else {
        questLines.push(line(`이전 턴에 상대방이 기입한 족보와 동일한 족보 기입 (${cCount}/3)`, prog.copycatRewarded));
      }
      break;

    case 'doubling':
      if (prog.doublingRewarded) status = 'completed';
      questLines.push(line(`동일한 점수로 족보를 두 번 등록 (${prog.doublingRewarded ? '1/1' : '0/1'})`, prog.doublingRewarded));
      break;

    case 'nozdormu':
      if (prog.nozdormuRewarded) status = 'completed';
      const targetR = prog.nozdormuTargetRound || (currentRound <= 5 ? 5 : (currentRound <= 8 ? 8 : 12));
      const rem = Math.max(0, targetR - currentRound + 1);
      questLines.push(line(`턴 타이머가 15초인 상태로 플레이하기 (${rem}턴 남음!)`, prog.nozdormuRewarded));
      break;

    case 'yacht-bank':
      const bankSt = yachtBankState[player] || { turnsLeft: 3, accumulatedScore: 0, completed: false };
      const isDone = bankSt.completed || (bankSt.initialized && bankSt.turnsLeft === 0);
      if (isDone) status = 'completed';
      questLines.push(line(`족보를 등록하기 전 킵 존에 주사위를 넣어 보너스 점수를 적립하세요. (${bankSt.turnsLeft}턴 남음!)`, isDone));
      break;

    case 'bounty-hunter':
      const bhProg = bountyHunterProgress[p] || { count: 0, penaltyCount: 0 };
      const isCompleted = bhProg.count >= 3;
      if (isCompleted) {
        status = 'completed';
        questLines.push(line(`타겟으로 지정된 족보를 3회 기입하기 (${bhProg.count}/3)`, true));
      } else {
        const targetName = bountyHunterTarget[p] ? getCategoryDisplayName(bountyHunterTarget[p], p) : '미지정';
        questLines.push(line(`타겟으로 지정된 족보를 3회 기입하기 (${bhProg.count}/3)<br>└ 현재 타겟: <strong style="color: #d4af37;">${targetName}</strong>`, false));
      }
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
let isViewingOpponentAugments = false;

function getAugmentSidebarTargetPlayer(explicitPlayer = null) {
  let basePlayer;
  if (window.isMultiplayer) {
    // 온라인 멀티플레이 모드: 턴 전환/인자 전달과 상관없이 항상 내 클라이언트(window.myPlayerIndex) 기준 고정
    basePlayer = window.myPlayerIndex || 1;
  } else {
    // 핫시트 모드: 명시적 인자 또는 현재 턴 플레이어(currentPlayer) 기준 턴 스위칭
    basePlayer = explicitPlayer || (typeof currentPlayer !== 'undefined' ? currentPlayer : 1);
  }

  if (isViewingOpponentAugments) {
    return basePlayer === 1 ? 2 : 1;
  }
  return basePlayer;
}

window.updateAugmentSidebar = function (player) {
  const targetPlayer = getAugmentSidebarTargetPlayer(player);
  const isOpponent = isViewingOpponentAugments;

  const btnToggle = document.getElementById('btn-toggle-opponent-augments');
  const labelTarget = document.getElementById('aug-view-target-label');
  const titleElem = document.querySelector('.aug-title-text');

  if (btnToggle) {
    if (isOpponent) {
      btnToggle.classList.add('active');
      btnToggle.setAttribute('title', '이전 증강 보기');
    } else {
      btnToggle.classList.remove('active');
      btnToggle.setAttribute('title', '상대방 증강 보기');
    }
  }

  if (!window.isMultiplayer) {
    if (titleElem) {
      titleElem.textContent = `Augments (P${targetPlayer})`;
    }
    if (labelTarget) {
      labelTarget.textContent = '';
    }
  } else {
    if (titleElem) {
      titleElem.textContent = 'Augments';
    }
    if (labelTarget) {
      labelTarget.textContent = isOpponent ? '(상대)' : '';
    }
  }

  const muts = Object.values(activeMutations[targetPlayer] || {});
  for (let i = 0; i < 3; i++) {
    const slot = document.getElementById(`aug-slot-${i}`);
    if (!slot) continue;

    if (i < muts.length) {
      const augmentId = muts[i];
      const mut = mutationDefinitions[augmentId];
      if (!mut) continue;
      const augInfo = augmentData.find(a => a.augmentId === augmentId) ||
        augmentData.find(a => a.name.includes(mut.name) || (a.mark && mut.enName && a.mark === mut.enName)) || {};
      const svgIcon = getVariantSvg(augmentId);
      let description = augInfo.description || mut.name + ' 증강이 적용되었습니다.';

      let extraHTML = '';
      if (mut.isQuest && typeof getQuestProgressText === 'function') {
        extraHTML = `<div class="aug-quest-container" style="margin-top: auto; width: 100%; padding-top: 6px;">${getQuestProgressText(targetPlayer, augmentId)}</div>`;
      } else if (augmentId === 'momentum') {
        const mState = momentumState[targetPlayer] || 'ready';
        if (mState === 'active') {
          extraHTML = `<div style="margin-top: auto; width: 100%; padding-top: 6px; color: #27ae60; font-weight: bold; text-align: left;">이번 턴에 발동합니다!</div>`;
        } else if (mState === 'used') {
          const gained = momentumGainedScore[targetPlayer] || 0;
          extraHTML = `<div style="margin-top: auto; width: 100%; padding-top: 6px; color: #888; font-size: 0.85em; font-style: italic; text-align: left;">이 증강은 소모되었습니다 (${gained}점 획득함)</div>`;
        }
      } else if (['lucky-sevens', 'perfect-squares', 'gambler', 'blackjack-21', 'high-dice'].includes(augmentId)) {
        const allDice = [...keptDice, ...activeDice];
        const currentDiceSum = allDice.length > 0 ? allDice.reduce((a, b) => a + b, 0) : 0;
        extraHTML = `<div class="aug-sum-container" style="margin-top: auto; width: 100%; padding-top: 6px; font-size: 0.9em; text-align: left;"><strong><u>현재 눈</u></strong>: ${currentDiceSum}</div>`;
      } else if (augmentId === 'table-flip') {
        const isUsed = playerTableFlipUsed[targetPlayer];
        extraHTML = `
          <div class="table-flip-container" style="margin-top: auto; width: 100%; padding-top: 6px; display: flex; align-items: center; gap: 8px;">
            <button class="btn-table-flip ${isUsed ? 'used' : ''}">
              ${isUsed ? '판 뒤집음' : '판 뒤집기!'}
            </button>
            <span class="table-flip-warning" style="display: none;">이미 판을 한 번 뒤집었습니다!</span>
          </div>
        `;
      } else if (augmentId === 'equivalent-exchange') {
        const usesLeft = equivalentExchangeUses[targetPlayer] !== undefined ? equivalentExchangeUses[targetPlayer] : 3;
        extraHTML = `<div class="ee-uses-container" style="margin-top: auto; width: 100%; padding-top: 6px; font-size: 0.9em; text-align: left; font-weight: bold; color: #c084fc;">${usesLeft}번 남음!</div>`;
      }

      slot.classList.add('filled');
      if (augmentId === 'momentum' && momentumState[targetPlayer] === 'used') {
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

      if (augmentId === 'table-flip') {
        const btnFlip = slot.querySelector('.btn-table-flip');
        const warnText = slot.querySelector('.table-flip-warning');

        if (btnFlip) {
          btnFlip.addEventListener('click', async (e) => {
            e.stopPropagation();
            const isMyTurn = !window.isMultiplayer || targetPlayer === window.myPlayerIndex;
            if (!isMyTurn || targetPlayer !== currentPlayer) return;

            if (playerTableFlipUsed[targetPlayer]) {
              if (warnText) {
                const shakeAnims = ['shake3d-1', 'shake3d-2', 'shake3d-3', 'shake3d-4'];
                const randomShake = shakeAnims[Math.floor(Math.random() * shakeAnims.length)];
                warnText.style.display = 'inline-block';
                warnText.style.animation = 'none';
                void warnText.offsetWidth; // reflow
                warnText.style.animation = `${randomShake} 0.5s ease-in-out`;
                if (window.tableFlipWarnTimeout) clearTimeout(window.tableFlipWarnTimeout);
                window.tableFlipWarnTimeout = setTimeout(() => {
                  warnText.style.display = 'none';
                }, 2000);
              }
              return;
            }

            if (rollsLeft >= 3 || !diceEngine || diceEngine.physicsActive) return;

            if (isLocalAugmentProgressPlayer(targetPlayer)) {
              const totalOf = (player) => Object.values(scores[player] || {}).reduce((total, value) =>
                total + (typeof value === 'object' ? value.score + (value.bonus || 0) : value), 0
              ) + (questProgress[player]?.questBonus || 0);
              const myTotal = totalOf(targetPlayer);
              augmentProgressSession.flags.tableFlipWhileBehind = Array.from({ length: getActivePlayerCount() }, (_, index) => index + 1)
                .some((player) => player !== targetPlayer && !forfeitedPlayers[player] && totalOf(player) > myTotal);
            }
            playerTableFlipUsed[targetPlayer] = true;
            btnFlip.classList.add('used');
            btnFlip.textContent = '판 뒤집음';

            // 5시 방향 주먹 내리침 덜컹 연출 및 판 뒤집기 타격음 재생 (약 0.07초 타격점 offset 스킵 재생)
            if (diceEngine) {
              diceEngine.playCardboardHitSound(0.07, 0.8);
            }
            const diceBoardElem = document.getElementById('dice-board-area');
            if (diceBoardElem) {
              diceBoardElem.classList.remove('fist-impact-anim');
              void diceBoardElem.offsetWidth;
              diceBoardElem.classList.add('fist-impact-anim');
              setTimeout(() => {
                diceBoardElem.classList.remove('fist-impact-anim');
              }, 750);
            }

            pauseTurnTimer();
            els.btnRoll.disabled = true;

            if (window.isMultiplayer && networkEngine) {
              networkEngine.sendMessage({ type: 'table_flip', player: targetPlayer });
            }

            addGameLog({ type: 'system', message: `[Table Flip] Player ${targetPlayer}가 판 뒤집기를 사용하여 주사위를 솟구쳐 올렸습니다!` }, 'system', window.isMultiplayer, targetPlayer);

            await diceEngine.flipTable();

            diceEngine.diceArray.forEach(die => die.isKept = false);
            keptDice = [];
            activeDice = diceEngine.diceArray.filter(d => d.config?.type !== 'weird').map(d => d.value).sort((a, b) => a - b);

            addGameLog({ type: 'roll-result', player: targetPlayer, meta: { values: activeDice } }, 'roll-result', window.isMultiplayer, targetPlayer);
            diceEngine.arrangeAll(true);

            updateScorePreviews();

            resumeTurnTimer();
            if (diceEngine) diceEngine.isRollSettling = false;
            updateRollsUI();
          });
        }
      }
    } else {
      slot.classList.remove('filled');
      let roundText = i === 0 ? "1턴" : (i === 1 ? "6턴" : "9턴");
      const emptyText = isOpponent ? `${roundText}에 선택된 증강입니다.` : `${roundText}에 증강을 선택할 수 있습니다.`;
      slot.innerHTML = `
        <div class="aug-empty-icon">
          <svg viewBox="0 0 24 24" width="1em" height="1em">
            <path d="M8 9 V7 a4 4 0 0 1 8 0 V9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="5" y="9" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2.5"/>
            <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div class="aug-empty-text">${emptyText}</div>
      `;
    }
  }
};

document.getElementById('btn-toggle-opponent-augments')?.addEventListener('click', () => {
  isViewingOpponentAugments = !isViewingOpponentAugments;
  if (typeof updateAugmentSidebar === 'function') {
    updateAugmentSidebar();
  }
});

window.applyMutation = function (player, augmentId, isRemote = false) {
  const mut = mutationDefinitions[augmentId];
  if (!mut) return;

  const targetCat = mut.target;

  // 이미 해당 족보 슬롯에 동일한 증강이 적용된 경우 중복 실행 및 중복 로그 생성 방지
  if (activeMutations[player] && activeMutations[player][targetCat] === augmentId) {
    return;
  }

  if (!isRemote && window.isMultiplayer && networkEngine) {
    networkEngine.sendMessage({
      type: 'apply_mutation',
      player,
      augmentId
    });
  }

  // 이미 기입된 족보 칸을 덮어씌워 선택한 경우 점수 삭제 및 추가 턴 부여
  if (scores[player] && scores[player][targetCat] !== undefined) {
    delete scores[player][targetCat];
    extraTurns[player] = (extraTurns[player] || 0) + 1;

    const catName = getCategoryDisplayName(targetCat, player);
    addGameLog({
      type: 'system',
      message: `${getPlayerLabel(player)}의 이미 기입된 [${catName}] 족보가 공백으로 초기화되었으며, 추가 턴(+1턴)을 획득했습니다!`
    }, 'system', window.isMultiplayer, player);
  }

  activeMutations[player][targetCat] = augmentId;

  if (augmentId === 'equivalent-exchange') {
    equivalentExchangeUses[player] = 3;
    equivalentExchangePenalty[player] = 0;
  }

  const augInfo = augmentData.find(a => a.name.includes(mut.name) || (a.mark && mut.enName && a.mark === mut.enName)) || {};
  addGameLog({ type: 'augment-action', player, meta: { augmentId, name: augInfo.name || mut.name } }, 'augment-action', window.isMultiplayer, player);

  // 더블 라지 스트레이트 등 특수 효과 즉시 적용
  if (augmentId === 'double-large-straight') {
    upperBonusThreshold[player] = 60;
  }

  if (augmentId === 'nozdormu') {
    if (!questProgress[player]) questProgress[player] = {};
    if (!questProgress[player].nozdormuTargetRound) {
      questProgress[player].nozdormuTargetRound = currentRound <= 5 ? 5 : (currentRound <= 8 ? 8 : 12);
    }
  }

  if (augmentId === 'bounty-hunter') {
    bountyHunterProgress[player] = { count: 0, penaltyCount: 0 };
    bountyHunterTarget[player] = null;
    bountyHunterAcquiredRound[player] = currentRound;
  }

  if (augmentId === 'doubling') {
    updateQuestProgress(player, null, null);
  }

  if (augmentId === 'promotion-die') {
    promotionAcquiredRound[player] = currentRound;
  }

  if (augmentId === 'yacht-bank') {
    yachtBankState[player] = { turnsLeft: 3, accumulatedScore: 0, initialized: false, completed: false };
  }

  // 족보 제목 UI 변경 (선택된 플레이어 방향만)
  const targetTh = document.getElementById(player === 1 ? `cat-title-left-${mut.target}` : `cat-title-right-${mut.target}`);

  if (targetTh) {
    const svgIcon = getVariantSvg(augmentId);
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

const executePrevTurn = () => {
  const totalCount = getActivePlayerCount();
  if (currentPlayer > 1) {
    currentPlayer--;
  } else {
    if (currentRound > 1) {
      currentPlayer = totalCount;
      currentRound--;
    } else return;
  }
  startTurn();
};

const executeNextTurn = () => {
  const totalCount = getActivePlayerCount();
  if (currentPlayer < totalCount) {
    currentPlayer++;
  } else {
    currentPlayer = 1;
    currentRound++;
  }

  if (currentRound > 12) {
    checkExtraTurnsOrEndGame();
  } else {
    isExtraTurnPhase = false;
    startTurn();
  }
};

window.debugNextTurnHandler = executeNextTurn;
window.debugPrevTurnHandler = executePrevTurn;

setupDebugTools({
  applyMutation: window.applyMutation,
  prevTurn: () => {
    if (window.isMultiplayer) {
      networkEngine.sendMessage({ type: 'ingame_message', subType: 'debug_prev_turn' });
    }
    executePrevTurn();
  },
  nextTurn: () => {
    if (window.isMultiplayer) {
      networkEngine.sendMessage({ type: 'ingame_message', subType: 'debug_next_turn' });
    }
    executeNextTurn();
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
  },
  resetAugmentProgress: async () => {
    const user = getCurrentUser();
    if (!user?.uid) throw new Error('로그인 정보가 없음.');
    await resetAugmentProgress(user.uid);
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

function renderAvatar(url, cropData, onComplete) {
  const container = document.getElementById('profile-avatar-container');
  if (!container || !url || !cropData) {
    if (typeof onComplete === 'function') onComplete();
    return;
  }
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

    if (typeof onComplete === 'function') onComplete();
  };
  img.onerror = () => {
    if (typeof onComplete === 'function') onComplete();
  };
  img.src = url;
}

// Avatar modal logic
const avatarContainer = document.getElementById('profile-avatar-container');
const profileModalAvatar = document.getElementById('profile-modal-avatar');
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

if (profileModalAvatar && cropModal) {
  profileModalAvatar.addEventListener('click', () => {
    if (!profileEditing) return;
    const user = getCurrentUser();
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    cropModal.classList.remove('hidden');
    if (cropInputSection) cropInputSection.classList.remove('hidden');
    if (cropEditSection) cropEditSection.classList.add('hidden');
    if (cropUrlInput) cropUrlInput.value = "";
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
    const url = cropUrlInput?.value?.trim() || "";
    if (!url) return alert("이미지 링크를 입력하세요.");

    if (!cropImagePreview) return;
    cropImagePreview.onload = () => {
      if (cropInputSection) cropInputSection.classList.add('hidden');
      if (cropEditSection) cropEditSection.classList.remove('hidden');
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
    const url = cropUrlInput?.value?.trim() || "";

    const success = await updateUserAvatar(user.uid, url, cropData);
    if (success) {
      renderAvatar(url, cropData);
      renderHistoryAvatar(profileModalAvatar, url, cropData);
      const cached = profileDataCache.get(user.uid) || {};
      profileDataCache.set(user.uid, { ...cached, avatarUrl: url, cropData });
      closeModal();
    } else {
      alert("아바타 저장에 실패했습니다.");
    }
  });
}

// -----------------------------------------------------
// 메인 메뉴 서브 버튼 & 모달 제어 시스템 (도전과제 / 증강 도감 / 도움말)
// -----------------------------------------------------
function openGameModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.remove('hidden');
}

function closeGameModal(modalEl) {
  if (!modalEl) return;
  modalEl.classList.add('hidden');
  if (modalEl === els.modalProfile) {
    profileModalTargetUid = null;
    setProfileEditing(false);
  }
}

function closeAllGameModals() {
  if (els.modalSettings) els.modalSettings.classList.add('hidden');
  if (els.modalAchievements) els.modalAchievements.classList.add('hidden');
  if (els.modalCompendium) els.modalCompendium.classList.add('hidden');
  if (els.modalProfile) els.modalProfile.classList.add('hidden');
  if (els.modalHelp) els.modalHelp.classList.add('hidden');
  profileModalTargetUid = null;
  setProfileEditing(false);
}

if (els.btnMenuSettings) {
  els.btnMenuSettings.addEventListener('click', () => {
    openGameModal(els.modalSettings);
  });
}

if (els.btnMenuAchievements) {
  els.btnMenuAchievements.addEventListener('click', async () => {
    openGameModal(els.modalAchievements);
    await renderAllAchievements();
  });
}

if (els.btnMenuCompendium) {
  els.btnMenuCompendium.addEventListener('click', () => {
    openGameModal(els.modalCompendium);
    showCompendiumIndex();
    renderCompendiumAugments(currentCompendiumCategory);
  });
}

if (els.btnMenuHelp) {
  els.btnMenuHelp.addEventListener('click', () => {
    openGameModal(els.modalHelp);
  });
}

// -----------------------------------------------------
// 증강 도감 (modal-compendium) 카테고리 탭 & 렌더링 시스템
// -----------------------------------------------------
let currentCompendiumCategory = 'all';
let selectedCompendiumAugment = null;

async function getCurrentProgressData() {
  const user = getCurrentUser();
  return user?.uid ? (await getUserFromDB(user.uid) || {}) : {};
}

function getAugmentIcon(augmentId) {
  return getVariantSvg(augmentId) || '';
}

function getAugmentCardHtml(aug, singleLineTag = false) {
  const isUnavailable = aug.isAvailable === false;
  const desc = aug.description || `${aug.name} 증강이 적용됩니다.`;
  return `
    <div class="modal-compendium-type-text${singleLineTag ? ' is-single-line' : ''}">${getAugmentCategoryEnName(aug, singleLineTag)}</div>
    ${isUnavailable ? '<div class="modal-compendium-unavailable">리워크 예정</div>' : ''}
    <div class="aug-slot-header">
      ${getAugmentIcon(aug.augmentId)}
      <span class="aug-slot-name">${escapeHtml(aug.name)}</span>
    </div>
    <div class="aug-slot-desc">${desc}</div>
  `;
}

function showCompendiumIndex(restoreScroll = true) {
  selectedCompendiumAugment = null;
  document.getElementById('modal-compendium-index')?.classList.remove('hidden');
  document.getElementById('modal-compendium-detail')?.classList.add('hidden');
  const title = document.getElementById('modal-compendium-title');
  if (title) title.textContent = '증강 도감';
  requestAnimationFrame(() => {
    const body = document.getElementById('modal-compendium-body');
    if (body) body.scrollTop = restoreScroll ? compendiumIndexScrollTop : 0;
  });
}

async function showCompendiumDetail(aug) {
  selectedCompendiumAugment = aug;
  compendiumIndexScrollTop = document.getElementById('modal-compendium-body')?.scrollTop || 0;
  const index = document.getElementById('modal-compendium-index');
  const detail = document.getElementById('modal-compendium-detail');
  const augmentCard = document.getElementById('compendium-detail-augment');
  const statList = document.getElementById('compendium-stat-list');
  const achievementList = document.getElementById('compendium-achievement-list');
  if (!detail || !augmentCard || !statList || !achievementList) return;

  index?.classList.add('hidden');
  detail.classList.remove('hidden');
  augmentCard.className = `modal-compendium-item compendium-detail-augment${aug.isAvailable === false ? ' is-unavailable' : ''}`;
  augmentCard.innerHTML = getAugmentCardHtml(aug, true);
  const title = document.getElementById('modal-compendium-title');
  if (title) title.textContent = aug.name;

  const userData = await getCurrentProgressData();
  if (selectedCompendiumAugment !== aug) return;
  const stats = getAugmentStats(userData, aug.augmentId);
  const adoptionRate = calculateAdoptionRate(stats);
  statList.innerHTML = `
    <dt>등장 횟수</dt><dd>${stats.appearances || 0}회</dd>
    <dt>채택 횟수</dt><dd>${stats.selections || 0}회</dd>
    <dt>채용률</dt><dd>${adoptionRate.toFixed(1)}%</dd>
    ${getAugmentTelemetryDefinitions(aug.augmentId).map((metric) =>
      `<dt>${escapeHtml(metric.label)}</dt><dd>${stats.metrics?.[metric.key] || 0}${metric.unit}</dd>`
    ).join('')}
  `;

  renderAchievementList(achievementList, getAugmentAchievementDefinitions(aug).map((definition) => ({
    definition,
    progress: getAchievementProgress(userData, definition.id),
    iconHtml: getAugmentIcon(aug.augmentId)
  })));
  document.getElementById('btn-compendium-back')?.focus();
}

async function renderAllAchievements() {
  const container = document.getElementById('modal-achievements-list');
  if (!container) return;
  const userData = await getCurrentProgressData();
  const entries = augmentData.flatMap((aug) =>
    getAugmentAchievementDefinitions(aug).map((definition) => ({
      definition,
      progress: getAchievementProgress(userData, definition.id),
      iconHtml: getAugmentIcon(aug.augmentId)
    }))
  );
  renderAchievementList(container, entries);
  const completed = entries.filter(({ definition, progress }) =>
    Boolean(progress.completedAt) || Number(progress.current) >= definition.target
  ).length;
  const summaryText = document.getElementById('modal-achievements-summary-text');
  const summaryFill = document.getElementById('modal-achievements-summary-fill');
  if (summaryText) summaryText.textContent = `${completed}/${entries.length} 완료함`;
  if (summaryFill?.parentElement) {
    summaryFill.style.width = `${entries.length ? (completed / entries.length) * 100 : 0}%`;
    summaryFill.parentElement.setAttribute('aria-valuenow', String(completed));
    summaryFill.parentElement.setAttribute('aria-valuemax', String(entries.length));
  }
}

function getAugmentCategoryName(aug) {
  if (aug.type === 'Quest') return '퀘스트';
  if (aug.type === 'Enhancement') return '강화';
  if (aug.type === 'Mutation') return '변형';

  if (aug.id >= 1 && aug.id <= 26) return '변형';
  if (aug.id >= 27 && aug.id <= 36) return '퀘스트';
  if (aug.id >= 37 && aug.id <= 46) return '강화';
  return '기타';
}

function getAugmentCategoryEnName(aug, singleLine = false) {
  if (aug.type && aug.type.includes('Phase 1')) {
    return singleLine ? 'Quest / Phase 1' : 'Quest<br>Phase 1';
  }
  if (aug.augmentId === 'yacht-bank' || (Array.isArray(aug.types) && aug.types.includes('Modification') && aug.types.includes('Quest'))) {
    return singleLine ? 'Modification / Quest' : 'Modification<br>Quest';
  }
  const catName = getAugmentCategoryName(aug);
  if (catName === '변형') return 'Modification';
  if (catName === '퀘스트') return 'Quest';
  if (catName === '강화') return 'Enhancement';
  return catName;
}

function getAugmentBadgeClass(catName) {
  if (catName === '변형') return 'cat-mutation';
  if (catName === '퀘스트') return 'cat-quest';
  if (catName === '강화') return 'cat-enhancement';
  return '';
}

function renderCompendiumAugments(category = 'all') {
  const listContainer = document.getElementById('modal-compendium-list');
  if (!listContainer) return;

  listContainer.innerHTML = '';
  if (!augmentData || augmentData.length === 0) {
    listContainer.innerHTML = '<p class="modal-placeholder-text">증강 데이터를 불러오는 중입니다...</p>';
    return;
  }

  const filtered = augmentData.filter(aug => {
    if (category === 'all') return true;
    if (aug.augmentId === 'yacht-bank' || (Array.isArray(aug.types) && aug.types.includes('Modification') && aug.types.includes('Quest'))) {
      return category === '변형' || category === '퀘스트';
    }
    const catName = getAugmentCategoryName(aug);
    return catName === category;
  });

  if (filtered.length === 0) {
    listContainer.innerHTML = '<p class="modal-placeholder-text">해당 카테고리의 증강이 없습니다.</p>';
    return;
  }

  filtered.forEach(aug => {
    const item = document.createElement('button');
    const isUnavailable = aug.isAvailable === false;
    item.className = `augment-option modal-compendium-item${isUnavailable ? ' is-unavailable' : ''}`;
    item.type = 'button';
    item.setAttribute('aria-label', `${aug.name} 상세 정보 보기`);
    item.innerHTML = getAugmentCardHtml(aug);
    item.addEventListener('click', () => {
      void showCompendiumDetail(aug);
    });
    listContainer.appendChild(item);
  });
}

document.getElementById('btn-compendium-back')?.addEventListener('click', () => {
    showCompendiumIndex(false);
  document.querySelector('.modal-compendium-item')?.focus();
});

// 탭 버튼 클릭 핸들러 바인딩
document.querySelectorAll('.modal-compendium-tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.modal-compendium-tab-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = e.currentTarget;
    targetBtn.classList.add('active');
    
    const cat = targetBtn.getAttribute('data-category');
    currentCompendiumCategory = cat;
    renderCompendiumAugments(cat);
  });
});

// 닫기 버튼 이벤트 바인딩
document.querySelectorAll('.game-modal-close').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-target');
    if (targetId) {
      const targetModal = document.getElementById(targetId);
      closeGameModal(targetModal);
    }
  });
});

// 배경 영역 클릭 시 닫기
document.querySelectorAll('.game-modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeGameModal(overlay);
    }
  });
});

// ESC 키 입력 시 활성화된 모달 닫기
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!els.modalCompendium?.classList.contains('hidden') && selectedCompendiumAugment) {
      showCompendiumIndex();
      return;
    }
    closeAllGameModals();
  }
});

// --- 도움말 모달 개편 (게임 모드 전용 SVG 아이콘 렌더링 및 90% 규격 상세 모달 연동) ---
const helpIconNorm = document.getElementById('help-icon-norm');
const helpIconAug = document.getElementById('help-icon-aug');

if (helpIconNorm) {
  helpIconNorm.innerHTML = getDicesIconSvg();
}
if (helpIconAug) {
  helpIconAug.innerHTML = getAugmentedDicesIconSvg();
}

const btnHelpNormGuide = document.getElementById('btn-help-norm-guide');
const btnHelpAugGuide = document.getElementById('btn-help-aug-guide');
const modalHelpDetail = document.getElementById('modal-help-detail');
const helpDetailTitle = document.getElementById('help-detail-title');
const helpDetailText = document.getElementById('help-detail-text');
const btnHelpDetailBack = document.getElementById('btn-help-detail-back');
const btnHelpDetailClose = document.getElementById('btn-help-detail-close');

function openHelpDetail(titleText, bodyText) {
  const modalHelp = document.getElementById('modal-help');
  if (modalHelp) closeGameModal(modalHelp);

  if (helpDetailTitle) helpDetailTitle.textContent = titleText;
  if (helpDetailText) helpDetailText.textContent = bodyText;

  if (modalHelpDetail) openGameModal(modalHelpDetail);
}

btnHelpNormGuide?.addEventListener('click', () => {
  openHelpDetail('요트 다이스 가이드', '요트 다이스 가이드 내용이 여기에 추가될 예정입니다.');
});

btnHelpAugGuide?.addEventListener('click', () => {
  openHelpDetail('증강 요트 다이스 가이드', '증강 요트 다이스 가이드 내용이 여기에 추가될 예정입니다.');
});

btnHelpDetailBack?.addEventListener('click', () => {
  if (modalHelpDetail) closeGameModal(modalHelpDetail);
  const modalHelp = document.getElementById('modal-help');
  if (modalHelp) openGameModal(modalHelp);
});

btnHelpDetailClose?.addEventListener('click', () => {
  if (modalHelpDetail) closeGameModal(modalHelpDetail);
});

