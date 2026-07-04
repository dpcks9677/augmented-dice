import PartySocket from "partysocket";
import { calculateScores, mutationDefinitions } from "./scoreEngine.js";
import { DiceEngine } from "./DiceEngine.js";
import { getDiceSvg, getSpecialSvg, getVariantSvg } from "./svgIcons.js";
import { setupDebugTools } from "./debugTools.js";

let augmentData = [];
fetch('/src/augments.json').then(r => r.json()).then(d => { augmentData = d; }).catch(e => console.error(e));

// DOM 요소 캐싱
const els = {
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
els.myNickname.textContent = myNickname;

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

// 2. 메인 로비 흐름 제어
els.btnMultiplayer.addEventListener('click', () => {
  els.btnHotseat.classList.add('hidden');
  els.btnSingleplayer.classList.add('hidden');
  els.btnMultiplayer.classList.add('hidden');
  els.multiplayerActions.classList.remove('hidden');
});

els.btnBackToLobby.addEventListener('click', () => {
  els.multiplayerActions.classList.add('hidden');
  els.btnHotseat.classList.remove('hidden');
  els.btnSingleplayer.classList.remove('hidden');
  els.btnMultiplayer.classList.remove('hidden');
});

// 방 생성/입장 로직 (멀티플레이)
els.btnCreateRoom.addEventListener('click', () => {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  joinRoom(code, true);
});
els.btnJoinRoom.addEventListener('click', () => {
  const code = els.inputRoomCode.value.toUpperCase();
  if (code.length === 4) joinRoom(code, false);
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

els.btnHotseat.addEventListener('click', () => {
  try {
    gameMode = 'hotseat';
    els.lobbyOverlay.classList.add('hidden');
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

function startTurn() {
  rollsLeft = 3;
  keptDice = [];
  activeDice = [];
  updateRollsUI();
  clearScorePreviews();
  
  els.gameStatus.textContent = `P${currentPlayer}의 턴 (라운드 ${currentRound}/12)`;
  els.p1Name.classList.toggle('active-turn', currentPlayer === 1);
  els.p2Name.classList.toggle('active-turn', currentPlayer === 2);
  els.p1Profile.classList.toggle('active-turn', currentPlayer === 1);
  els.p2Profile.classList.toggle('active-turn', currentPlayer === 2);
  
  if (diceBoxReady) els.btnRoll.disabled = false;
}

function updateRollsUI() {
  els.rollsLeft.textContent = `남은 굴리기: ${rollsLeft}`;
  els.btnRoll.disabled = rollsLeft <= 0 || !diceBoxReady;
  if (typeof diceEngine !== 'undefined' && diceEngine) {
    const activeMuts = Object.values(activeMutations[currentPlayer] || {});
    let baseDiceCount = 5;
    const totalDiceAllowed = baseDiceCount + (activeMuts.includes('strange-die') && !destroyedStrangeDice[currentPlayer] ? 1 : 0) + (activeMuts.includes('promotion-die') && !promotionConsumed[currentPlayer] ? 1 : 0);
    
    // 주사위 굴리기 기회가 남았거나, 고를 수 있는 주사위가 5개를 초과할 때(5개를 선택해야 하므로) 킵을 허용
    diceEngine.allowKeep = (rollsLeft > 0) || (totalDiceAllowed > 5);
  }
}

// 주사위 굴림
els.btnRoll.addEventListener('click', async () => {
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
  const results = await diceEngine.roll(specialConfigs);
  
  // Arrange them after a short delay
  setTimeout(() => {
    // 리롤 시 모든 주사위를 버건디 매트(중앙)에 함께 정렬하기 위해 킵 상태 초기화
    diceEngine.diceArray.forEach(die => die.isKept = false);
    
    // 로컬 상태 동기화
    keptDice = [];
    activeDice = diceEngine.diceArray.filter(d => d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    
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
    cell.onclick = () => lockScore(cat.id, potentialScores[cat.id]);
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

function lockScore(catId, scoreInfo) {
  if (rollsLeft === 3 && activeDice.length === 0 && keptDice.length === 0) return;
  
  // scoreInfo might be an object { score, bonus } or a number
  let scoreObj = typeof scoreInfo === 'object' ? scoreInfo : { score: scoreInfo, bonus: 0 };
  scores[currentPlayer][catId] = scoreObj;

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
  // 상태 초기화
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
  
  els.endgameModal.classList.add('hidden');
  els.lobbyOverlay.classList.remove('hidden');
  
  // 로비 초기 상태 복구
  els.multiplayerActions.classList.add('hidden');
  els.waitingRoom.classList.add('hidden');
  els.btnHotseat.classList.remove('hidden');
  els.btnSingleplayer.classList.remove('hidden');
  els.btnMultiplayer.classList.remove('hidden');
  
  updateScoreboard();
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
  
  diceEngine.onDieClick = (val, isKept) => {
    // 상태 배열을 엔진과 동기화 (이상한 주사위는 족보 계산 배열에서 제외)
    activeDice = diceEngine.diceArray.filter(d => !d.isKept && d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    keptDice = diceEngine.diceArray.filter(d => d.isKept && d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    
    const allDice = [...keptDice, ...activeDice];
    updateScorePreviews();
  };
  
  diceBoxReady = true;
  
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
// 증강 적용 함수
let debugAugmentCount = 0;

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
    const svgIcon = getVariantSvg(mutationId);
    targetTh.innerHTML = `${svgIcon} ${mut.enName}`;

    targetTh.style.backgroundColor = '#87CEEB'; // Sky Blue
    targetTh.style.color = '#222';
  }
  
  // 좌측 증강 섹션(UI) 업데이트
  const augInfo = augmentData.find(a => a.name.includes(mut.name) || (a.mark && mut.enName && a.mark === mut.enName)) || {};
  let description = augInfo.description || mut.name + ' 증강이 적용되었습니다.';
  description = description.replace(/변경합니다\.\s*/g, '변경합니다.<br><br>');
  
  let slotIndex = debugAugmentCount;
  if (slotIndex >= 3) {
    slotIndex = 2; // 다 찼다면 세 번째 칸 덮어씌우기
  } else {
    debugAugmentCount++;
  }
  
  const slot = document.getElementById(`aug-slot-${slotIndex}`);
  if (slot) {
    const svgIcon = getVariantSvg(mutationId);
    slot.classList.add('filled');
    slot.innerHTML = `
      <div class="aug-header">${svgIcon} <span>${mut.name}</span></div>
      <div class="aug-desc">${description}</div>
    `;
  }
  
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
    // 디버그 조작 시 진행 중인 애니메이션이나 이전 상태를 무시하고 덮어씌움
    diceEngine.forceValues(values);
    
    // 로컬 상태 동기화
    keptDice = [];
    activeDice = diceEngine.diceArray.filter(d => d.config.type !== 'weird').map(d => d.value).sort((a, b) => a - b);
    
    // 남은 굴림 횟수가 남아있어야 기입 가능하므로, 굴림 횟수가 3번일 때만 1회 차감 처리하여 족보 클릭이 가능하도록 함
    if (rollsLeft === 3) {
      rollsLeft--;
      updateRollsUI();
    }
    
    updateScorePreviews();
  }
});
