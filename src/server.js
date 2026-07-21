export default class DiceServer {
  constructor(room) {
    this.room = room;
    // players map: connectionId -> { uid, nickname, avatarUrl, isHost, isReady, disconnected }
    this.players = {}; 
    this.gameState = 'lobby'; // 'lobby', 'playing'
    this.gameSessionData = {
      scores: { 1: {}, 2: {} },
      activeMutations: { 1: {}, 2: {} },
      currentRound: 1,
      currentPlayer: 1,
      rollsLeft: 3,
      turnTimeRemaining: 45,
      disconnectGrace: { 1: 60, 2: 60 },
      activeDice: [],
      keptDice: [],
      matchLogHistory: []
    };

    // 1초 주기 서버 타이머 (턴 시간 및 재접속 유예시간 추적)
    this.timerLoop = setInterval(() => {
      if (this.gameState === 'playing') {
        if (this.gameSessionData.turnTimeRemaining > 0) {
          this.gameSessionData.turnTimeRemaining--;
        }
        
        Object.values(this.players).forEach(p => {
          if (p.disconnected) {
            const pIdx = p.isHost ? 1 : 2;
            if (this.gameSessionData.disconnectGrace[pIdx] > 0) {
              this.gameSessionData.disconnectGrace[pIdx]--;
            }
          }
        });
      }
    }, 1000);
  }

  onConnect(conn, ctx) {
    console.log("Player connected:", conn.id, "to room", this.room.id);
  }

  onClose(conn) {
    console.log("Player disconnected:", conn.id);
    const player = this.players[conn.id];
    if (player) {
      if (this.gameState === 'playing') {
        player.disconnected = true;
        this.room.broadcast(JSON.stringify({
          type: 'player_disconnected',
          connId: conn.id,
          uid: player.uid
        }));
      } else {
        const wasHost = player.isHost;
        delete this.players[conn.id];
        
        const remainingIds = Object.keys(this.players);
        if (wasHost && remainingIds.length > 0) {
          this.players[remainingIds[0]].isHost = true;
        }
        
        this.broadcastState();
      }
    }
  }

  onMessage(message, conn) {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'join':
        // 기존 uid 접속자인지 확인 (재접속)
        let existingConnId = Object.keys(this.players).find(id => this.players[id].uid === data.uid);
        if (existingConnId) {
          if (this.gameState === 'ended') {
            conn.send(JSON.stringify({
              type: 'game_already_ended',
              message: '이미 종료되거나 몰수 처리된 게임입니다.'
            }));
            return;
          }
          const pData = this.players[existingConnId];
          delete this.players[existingConnId];
          pData.connId = conn.id;
          pData.disconnected = false;
          this.players[conn.id] = pData;

          this.broadcastState();
          if (this.gameState === 'playing') {
            this.room.broadcast(JSON.stringify({
              type: 'player_reconnected',
              connId: conn.id,
              uid: data.uid
            }));
            
            // 재접속 유저에게 전체 인게임 세션 스냅샷 전송
            conn.send(JSON.stringify({
              type: 'full_game_sync',
              sessionData: this.gameSessionData,
              players: Object.values(this.players)
            }));
          }
          return;
        }

        // 중복 가입 방지 및 최대 4인 제한
        if (Object.keys(this.players).length >= 4 && !this.players[conn.id]) {
          conn.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
          return;
        }

        // 이미 종료된 게임 세션 접속 차단
        if (this.gameState === 'ended') {
          conn.send(JSON.stringify({
            type: 'game_already_ended',
            message: '이미 종료되거나 몰수 처리된 게임입니다.'
          }));
          return;
        }
        
        // 첫 번째 접속자면 호스트 부여
        const isFirst = Object.keys(this.players).length === 0;
        this.players[conn.id] = {
          connId: conn.id,
          uid: data.uid,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
          isHost: isFirst,
          isReady: isFirst,
          disconnected: false
        };
        this.broadcastState();
        
        if (this.gameState === 'playing') {
          conn.send(JSON.stringify({
            type: 'full_game_sync',
            sessionData: this.gameSessionData,
            players: Object.values(this.players)
          }));
        }
        break;
        
      case 'ready':
        if (this.players[conn.id]) {
          this.players[conn.id].isReady = data.isReady;
          this.broadcastState();
        }
        break;
        
      case 'start_game':
        if (this.players[conn.id] && this.players[conn.id].isHost) {
          this.gameState = 'playing';
          this.gameSessionData = {
            scores: { 1: {}, 2: {} },
            activeMutations: { 1: {}, 2: {} },
            currentRound: 1,
            currentPlayer: 1,
            rollsLeft: 3,
            turnTimeRemaining: 45,
            disconnectGrace: { 1: 60, 2: 60 },
            matchLogHistory: []
          };
          this.room.broadcast(JSON.stringify({ type: 'game_started' }));
        }
        break;

      case 'game_ended':
      case 'player_forfeited':
        this.gameState = 'ended';
        this.room.broadcast(message, [conn.id]);
        break;
        
      default:
        // 세션 데이터 상태 추적
        if (data.type === 'sync_score') {
          const p = data.player || this.gameSessionData.currentPlayer;
          if (!this.gameSessionData.scores[p]) this.gameSessionData.scores[p] = {};
          this.gameSessionData.scores[p][data.catId] = data.scoreInfo;
          
          if (p === 1) {
            this.gameSessionData.currentPlayer = 2;
          } else {
            this.gameSessionData.currentPlayer = 1;
            this.gameSessionData.currentRound++;
          }
          this.gameSessionData.rollsLeft = 3;
          this.gameSessionData.turnTimeRemaining = 45;
          this.gameSessionData.activeDice = [];
          this.gameSessionData.keptDice = [];
        } else if (data.type === 'sync_roll') {
          this.gameSessionData.rollsLeft = data.rollsLeft;
        } else if (data.type === 'sync_roll_end') {
          this.gameSessionData.activeDice = data.finalValues || [];
          this.gameSessionData.keptDice = [];
        } else if (data.type === 'sync_keep') {
          if (this.gameSessionData.activeDice.length > 0) {
            const val = this.gameSessionData.activeDice[data.dieIndex];
            if (val !== undefined) {
              if (data.isKept) {
                this.gameSessionData.keptDice.push(val);
              } else {
                const kIdx = this.gameSessionData.keptDice.indexOf(val);
                if (kIdx !== -1) this.gameSessionData.keptDice.splice(kIdx, 1);
              }
            }
          }
        } else if (data.type === 'sync_log') {
          const lastLog = this.gameSessionData.matchLogHistory[this.gameSessionData.matchLogHistory.length - 1];
          const isTurnStart = data.logData?.type === 'turn-start' || data.logData?.message === '게임 시작!';
          let isDuplicate = false;
          if (isTurnStart && lastLog) {
            const isSameMsg = data.logData?.message && data.logData.message === lastLog.message;
            const isSameRoundPlayer = data.logData?.round === lastLog.round && data.logData?.player === lastLog.player;
            if (isSameMsg || isSameRoundPlayer) {
              isDuplicate = true;
            }
          }
          if (!isDuplicate) {
            this.gameSessionData.matchLogHistory.push(data.logData);
          }
        }

        // 게임 내 이벤트(주사위 좌표 등)는 단순히 릴레이
        this.room.broadcast(message, [conn.id]);
        break;
    }
  }
  
  broadcastState() {
    const stateMsg = {
      type: 'lobby_state',
      players: Object.values(this.players),
      gameState: this.gameState
    };
    this.room.broadcast(JSON.stringify(stateMsg));
  }
}
