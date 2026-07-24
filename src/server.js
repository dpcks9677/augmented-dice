export class DiceServer {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.connections = new Map();
    // players map: connectionId -> { uid, nickname, avatarUrl, isHost, isReady, disconnected }
    this.players = {}; 
    this.gameState = 'lobby'; // 'lobby', 'playing'
    this.gameSessionData = {
      scores: { 1: {}, 2: {}, 3: {}, 4: {} },
      activeMutations: { 1: {}, 2: {}, 3: {}, 4: {} },
      currentRound: 1,
      currentPlayer: 1,
      rollsLeft: 3,
      turnTimeRemaining: 45,
      disconnectGrace: { 1: 60, 2: 60, 3: 60, 4: 60 },
      activeDice: [],
      keptDice: [],
      matchLogHistory: []
    };

    // room 객체: broadcast 기능을 제공하는 어댑터
    this.room = {
      id: null,
      broadcast: (msg, excludeIds = []) => {
        this.connections.forEach((ws, id) => {
          if (!excludeIds.includes(id)) {
            try {
              ws.send(msg);
            } catch (e) {
              // 전송 실패한 소켓은 무시
            }
          }
        });
      }
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

  async fetch(request) {
    // Origin 검증 (보안 대책)
    const origin = request.headers.get("Origin");
    if (origin) {
      const isAllowedOrigin = origin.includes("localhost") || 
                              origin.includes("127.0.0.1") || 
                              origin.includes("augmented-dice.web.app") || 
                              origin.includes("firebaseapp.com");
      if (!isAllowedOrigin) {
        return new Response("Unauthorized Origin", { status: 403 });
      }
    }

    // 첫 요청에서 룸 ID 추출
    if (!this.room.id) {
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);
      const isPartyPath = parts[0] === 'party' || parts[0] === 'parties';
      let rawRoomId = 'DEFAULT';
      if (parts.length >= 3 && isPartyPath) {
        rawRoomId = parts[2];
      } else if (parts.length >= 2 && isPartyPath) {
        rawRoomId = parts[1];
      } else if (parts.length >= 1) {
        rawRoomId = parts[parts.length - 1];
      }
      this.room.id = String(rawRoomId).trim().toUpperCase();
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const connId = "conn_" + Math.random().toString(36).substring(2, 9);
      server.accept();

      this.connections.set(connId, server);

      const connObj = {
        id: connId,
        send: (msg) => { try { server.send(msg); } catch(e) {} },
        lastRateCheck: Date.now(),
        messageCount: 0
      };

      if (typeof this.onConnect === 'function') {
        this.onConnect(connObj);
      }

      server.addEventListener("message", (event) => {
        if (typeof this.onMessage === 'function') {
          this.onMessage(event.data, connObj);
        }
      });

      server.addEventListener("close", () => {
        this.connections.delete(connId);
        if (typeof this.onClose === 'function') {
          this.onClose(connObj);
        }
      });

      server.addEventListener("error", () => {
        this.connections.delete(connId);
        if (typeof this.onClose === 'function') {
          this.onClose(connObj);
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("WebSocket server is running.", { status: 200 });
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
    // Rate Limiting (도배/DoS 방지: 1초당 최대 15개 메시지)
    const now = Date.now();
    if (!conn.lastRateCheck || now - conn.lastRateCheck > 1000) {
      conn.lastRateCheck = now;
      conn.messageCount = 0;
    }
    conn.messageCount = (conn.messageCount || 0) + 1;
    if (conn.messageCount > 15) {
      console.warn(`Rate limit exceeded for connection ${conn.id}`);
      return;
    }

    let data;
    try {
      data = typeof message === 'string' ? JSON.parse(message) : message;
    } catch (e) {
      console.error("Invalid JSON received:", e);
      return;
    }

    if (!data || !data.type) return;
    
    switch (data.type) {
      case 'join':
        // 기존 uid 접속자인지 확인 (동일 유저의 재연결/재접속 시 기존 소켓 대체 및 호스트 권한/상태 승계)
        let existingConnId = Object.keys(this.players).find(id => this.players[id].uid === data.uid);
        if (existingConnId && existingConnId !== conn.id) {
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
          if (data.nickname) pData.nickname = data.nickname;
          if (data.avatarUrl) pData.avatarUrl = data.avatarUrl;
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

        if (data.mode) {
          this.gameMode = data.mode;
        }
        const maxAllowed = (this.gameMode === 'augmented') ? 2 : 4;

        // 중복 가입 방지 및 최대 인원 제한 (증강: 2인, 일반: 4인)
        if (Object.keys(this.players).length >= maxAllowed && !this.players[conn.id]) {
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
            scores: { 1: {}, 2: {}, 3: {}, 4: {} },
            activeMutations: { 1: {}, 2: {}, 3: {}, 4: {} },
            currentRound: 1,
            currentPlayer: 1,
            rollsLeft: 3,
            turnTimeRemaining: 45,
            disconnectGrace: { 1: 60, 2: 60, 3: 60, 4: 60 },
            matchLogHistory: []
          };
          this.room.broadcast(JSON.stringify({ type: 'game_started' }));
        }
        break;

      case 'game_ended':
        this.gameState = 'ended';
        this.room.broadcast(message, [conn.id]);
        break;

      case 'player_forfeited':
        this.gameState = 'ended';
        let forfeitPlayer = this.players[conn.id];
        let forfeitPIndex = forfeitPlayer?.playerIndex || 1;
        if (forfeitPlayer && !forfeitPlayer.playerIndex) {
          const playersArr = Object.values(this.players);
          const idx = playersArr.indexOf(forfeitPlayer);
          forfeitPIndex = idx >= 0 ? idx + 1 : (forfeitPlayer.isHost ? 1 : 2);
        }
        const forfeitPayload = JSON.stringify({
          type: 'player_forfeited',
          connId: conn.id,
          uid: data.uid || forfeitPlayer?.uid,
          pIndex: forfeitPIndex
        });
        this.room.broadcast(forfeitPayload, [conn.id]);
        break;
        
      default:
        // 세션 데이터 상태 추적
        if (data.type === 'sync_score') {
          const p = data.player || this.gameSessionData.currentPlayer;
          if (!this.gameSessionData.scores[p]) this.gameSessionData.scores[p] = {};
          this.gameSessionData.scores[p][data.catId] = data.scoreInfo;
          
          const totalPlayers = Object.keys(this.players).length || 2;
          if (p < totalPlayers) {
            this.gameSessionData.currentPlayer = p + 1;
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    
    // PartySocket path: /party/:partyName/:roomId or /parties/:partyName/:roomId
    const isPartyPath = parts[0] === 'party' || parts[0] === 'parties';
    let roomId = 'DEFAULT';
    if (parts.length >= 3 && isPartyPath) {
      roomId = parts[2];
    } else if (parts.length >= 2 && isPartyPath) {
      roomId = parts[1];
    } else if (parts.length >= 1) {
      roomId = parts[parts.length - 1];
    }
    roomId = String(roomId).trim().toUpperCase();

    const namespace = env.DiceServer || env.main;
    if (namespace) {
      const id = namespace.idFromName(roomId);
      const stub = namespace.get(id);
      return stub.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  }
};
