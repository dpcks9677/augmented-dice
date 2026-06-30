import PartySocket from "partysocket";
import { calculateScores } from "./scoreEngine.js";
import { DiceEngine } from "./DiceEngine.js";

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
    els.p1Name.textContent = "Player 1";
    els.p2Name.textContent = "Player 2";
    
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
  renderScoreboard();
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
  
  if (diceBoxReady) els.btnRoll.disabled = false;
}

function updateRollsUI() {
  els.rollsLeft.textContent = `남은 굴림: ${rollsLeft}`;
  els.btnRoll.disabled = rollsLeft <= 0 || !diceBoxReady;
}

// 주사위 굴림
els.btnRoll.addEventListener('click', async () => {
  if (rollsLeft <= 0) return;
  
  rollsLeft--;
  updateRollsUI();
  els.btnRoll.disabled = true; // 굴리는 중 비활성화
  clearScorePreviews();
  
  const diceToRoll = 5 - keptDice.length;
  
  // Custom Dice Engine Roll
  const results = await diceEngine.roll(diceToRoll);
  
  // Arrange them after a short delay
  setTimeout(() => {
    diceEngine.arrangeDice();
    els.btnRoll.disabled = rollsLeft <= 0;
    
    // update activeDice array
    activeDice = diceEngine.diceArray.filter(d => !d.isKept).map(d => d.value);
    
    const allDice = [...keptDice, ...activeDice];
    previewScores(allDice);
  }, 500);
});

// 점수 미리보기
function previewScores(diceArray) {
  if (diceArray.length !== 5) return;
  const potentialScores = calculateScores(diceArray);
  
  categories.forEach(cat => {
    if (cat.isDivider) return;
    const cellId = `p${currentPlayer}-${cat.id}`;
    const cell = document.getElementById(cellId);
    
    // 이미 확정된 점수면 건너뜀
    if (scores[currentPlayer][cat.id] !== undefined) return;
    
    cell.textContent = potentialScores[cat.id];
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
        cell.textContent = '';
        cell.classList.remove('suggested');
        cell.onclick = null; // 이벤트 제거
      }
    });
  });
}

function getUpperSum(player) {
  const upperCats = ['aces', 'deuces', 'threes', 'fours', 'fives', 'sixes'];
  return upperCats.reduce((sum, catId) => sum + (scores[player][catId] || 0), 0);
}

function lockScore(catId, score) {
  if (rollsLeft === 3 && activeDice.length === 0 && keptDice.length === 0) return;
  
  scores[currentPlayer][catId] = score;
  
  // 보너스(63점 이상 달성 시 35점 추가) 체크
  const upperSum = getUpperSum(currentPlayer);
  if (upperSum >= 63) {
    scores[currentPlayer]['bonus'] = 35;
  }
  
  const cell = document.getElementById(`p${currentPlayer}-${catId}`);
  cell.textContent = score;
  cell.classList.remove('suggested');
  cell.classList.add('filled');
  cell.onclick = null; // 클릭 해제
  
  diceEngine.clearAll(); // 남은 주사위 및 킵된 주사위 모두 3D 씬에서 제거
  
  clearScorePreviews();
  renderScoreboard();
  
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
  const p1Total = Object.values(scores[1]).reduce((sum, val) => sum + val, 0);
  const p2Total = Object.values(scores[2]).reduce((sum, val) => sum + val, 0);
  
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
  
  renderScoreboard();
});


// -----------------------------------------------------
// 4. 점수판 렌더링 & 주사위 초기화
// -----------------------------------------------------
const categories = [
  { id: 'aces', name: 'Aces' },
  { id: 'deuces', name: 'Deuces' },
  { id: 'threes', name: 'Threes' },
  { id: 'fours', name: 'Fours' },
  { id: 'fives', name: 'Fives' },
  { id: 'sixes', name: 'Sixes' },
  { id: 'bonus', name: 'Bonus (+35)', isDivider: true },
  { id: 'choice', name: 'Choice' },
  { id: '4oak', name: '4 of a Kind' },
  { id: 'fullhouse', name: 'Full House' },
  { id: 's-straight', name: 'S. Straight' },
  { id: 'l-straight', name: 'L. Straight' },
  { id: 'yacht', name: 'Yacht' }
];

function renderScoreboard() {
  els.scoreTbody.innerHTML = '';
  categories.forEach(cat => {
    const tr = document.createElement('tr');
    if (cat.isDivider && cat.id === 'bonus') {
      const p1Upper = getUpperSum(1);
      const p2Upper = getUpperSum(2);
      
      const p1BonusText = p1Upper >= 63 ? `35 (${p1Upper}/63)` : `(${p1Upper}/63)`;
      const p2BonusText = p2Upper >= 63 ? `35 (${p2Upper}/63)` : `(${p2Upper}/63)`;
      
      tr.innerHTML = `
        <th class="col-cat">${cat.name}</th>
        <td id="p1-${cat.id}" style="font-weight: bold; color: ${p1Upper >= 63 ? '#27ae60' : '#888'};">${p1BonusText}</td>
        <td id="p2-${cat.id}" style="font-weight: bold; color: ${p2Upper >= 63 ? '#27ae60' : '#888'};">${p2BonusText}</td>
        <th class="col-cat">${cat.name}</th>
      `;
      tr.style.backgroundColor = '#ddd';
    } else {
      const p1Score = scores[1][cat.id] !== undefined ? scores[1][cat.id] : '';
      const p2Score = scores[2][cat.id] !== undefined ? scores[2][cat.id] : '';
      const p1Class = scores[1][cat.id] !== undefined ? 'score-cell filled' : 'score-cell';
      const p2Class = scores[2][cat.id] !== undefined ? 'score-cell filled' : 'score-cell';
      tr.innerHTML = `
        <th class="col-cat">${cat.name}</th>
        <td class="${p1Class}" id="p1-${cat.id}">${p1Score}</td>
        <td class="${p2Class}" id="p2-${cat.id}">${p2Score}</td>
        <th class="col-cat">${cat.name}</th>
      `;
    }
    els.scoreTbody.appendChild(tr);
  });
  
  // -----------------------------------------------------
  // 총합(Total) 렌더링
  // -----------------------------------------------------
  const p1Total = Object.values(scores[1]).reduce((sum, val) => sum + val, 0);
  const p2Total = Object.values(scores[2]).reduce((sum, val) => sum + val, 0);
  
  const totalTr = document.createElement('tr');
  totalTr.style.borderTop = '2px solid #222';
  totalTr.style.backgroundColor = '#f1c40f'; // 하이라이트 색상 (노란색 톤)
  totalTr.innerHTML = `
    <th class="col-cat" style="font-weight: bold; font-size: 1.1em; padding: 12px 0;">TOTAL</th>
    <td class="score-cell filled" style="font-weight: bold; font-size: 1.1em; color: #222;">${p1Total}</td>
    <td class="score-cell filled" style="font-weight: bold; font-size: 1.1em; color: #222;">${p2Total}</td>
    <th class="col-cat" style="font-weight: bold; font-size: 1.1em; padding: 12px 0;">TOTAL</th>
  `;
  els.scoreTbody.appendChild(totalTr);
}
renderScoreboard();

// 3D 주사위 엔진 초기화
let diceEngine;

setTimeout(() => {
  diceEngine = new DiceEngine("#dice-board-area");
  
  diceEngine.onDieClick = (val, isKept) => {
    // 엔진 배열에 기반하여 동기화
    activeDice = diceEngine.diceArray.filter(d => !d.isKept).map(d => d.value).sort((a, b) => a - b);
    keptDice = diceEngine.diceArray.filter(d => d.isKept).map(d => d.value).sort((a, b) => a - b);
    
    const allDice = [...keptDice, ...activeDice];
    previewScores(allDice);
  };
  
  diceBoxReady = true;
  
  if (gameMode !== 'none') {
    updateRollsUI();
  } else {
    els.btnRoll.disabled = false;
  }
}, 100);
