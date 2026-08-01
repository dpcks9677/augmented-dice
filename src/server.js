import {
  GameRuleError,
  createAuthoritativeGame,
  expirePhase,
  getPlayerTotal as getAuthoritativePlayerTotal,
  getPublicGameState,
  isCompleteGame,
  rollDice,
  scoreCategory,
  selectAugment,
  setDieKept
} from "./authoritativeGame.js";
import MatchmakingServer from "./matchmakingServer.js";
import { verifyFirebaseIdToken } from "./firebaseToken.js";

const SCORE_CATEGORIES = new Set([
  'aces', 'deuces', 'threes', 'fours', 'fives', 'sixes',
  'choice', '4oak', 'fullhouse', 's-straight', 'l-straight', 'yacht'
]);
const PRESET_START_DELAY_MS = 500;

function getPresetFileName(dice, isFlip) {
  if (isFlip) return `dice_presets_flip_${dice.length}.json`;
  const normalCount = dice.filter((die) => die.type !== 'octahedron').length;
  const octaCount = dice.length - normalCount;
  const key = octaCount === 0 ? `normal_${normalCount}` : `mixed_${normalCount}normal_${octaCount}octa`;
  return `dice_presets_${key}.json`;
}

function getSortedFinalValues(dice) {
  return dice
    .map(({ id, type, value }) => ({ id, type, value }))
    .sort((a, b) => Number(a.value) - Number(b.value) || Number(a.id) - Number(b.id));
}

export class DiceServer {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.matchmakingServer = null;
    this.connections = new Map();
    // players map: connectionId -> { uid, nickname, avatarUrl, isHost, isReady, disconnected }
    this.players = {};
    this.gameState = 'lobby'; // 'lobby', 'playing'
    this.gameMode = null;
    this.sessionType = null;
    this.matchId = null;
    this.matchToken = null;
    this.finalized = false;
    this.forfeitedUids = new Set();
    this.authoritativeState = null;
    this.processingTimeout = false;
    this.authoritativePauseUntil = 0;
    this.gameSessionData = {
      scores: { 1: {}, 2: {}, 3: {}, 4: {} },
      activeAugments: { 1: {}, 2: {}, 3: {}, 4: {} },
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
        if (this.authoritativeState && !this.authoritativeState.ended) {
          if (this.authoritativePauseUntil > Date.now()) return;
          if (this.authoritativeState.turnTimeRemaining > 0) {
            this.authoritativeState.turnTimeRemaining--;
            this.room.broadcast(JSON.stringify({
              type: "authoritative_timer",
              revision: this.authoritativeState.revision,
              turnTimeRemaining: this.authoritativeState.turnTimeRemaining
            }));
          }
          if (this.authoritativeState.turnTimeRemaining <= 0 && !this.processingTimeout) {
            this.processingTimeout = true;
            try {
              const timeoutPlayer = this.authoritativeState.currentPlayer;
              const beforeScores = { ...(this.authoritativeState.scores[timeoutPlayer] || {}) };
              expirePhase(this.authoritativeState);
              const afterScores = this.authoritativeState.scores[timeoutPlayer] || {};
              const timeoutCatId = Object.keys(afterScores).find((catId) => beforeScores[catId] === undefined && afterScores[catId] !== undefined);
              const timeoutScore = timeoutCatId ? afterScores[timeoutCatId] : null;
              this.broadcastAuthoritativeState({
                kind: "timeout",
                player: timeoutPlayer,
                catId: timeoutCatId,
                score: typeof timeoutScore === 'object' ? timeoutScore.score : timeoutScore
              });
              if (isCompleteGame(this.authoritativeState)) this.finalizeMatch("completed");
            } catch (error) {
              console.error("Authoritative timeout failed:", error);
            } finally {
              this.processingTimeout = false;
            }
          }
        } else if (this.gameSessionData.turnTimeRemaining > 0) {
          this.gameSessionData.turnTimeRemaining--;
        }

        const pList = Object.values(this.players);
        pList.forEach((p, idx) => {
          if (p.disconnected) {
            const pIdx = p.playerIndex || (idx + 1);
            if (this.gameSessionData.disconnectGrace[pIdx] > 0) {
              this.gameSessionData.disconnectGrace[pIdx]--;
              if (this.gameSessionData.disconnectGrace[pIdx] === 0) {
                this.registerForfeit(p.uid, pIdx, "disconnect_timeout");
              }
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

    const pathParts = new URL(request.url).pathname.split('/').filter(Boolean);
    const isMatchmakingParty = (pathParts[0] === 'party' || pathParts[0] === 'parties')
      && pathParts[1] === 'matchmaking';
    if (isMatchmakingParty) {
      if (!this.matchmakingServer) {
        this.matchmakingServer = new MatchmakingServer({ env: this.env });
      }
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("WebSocket required", { status: 426 });
      }
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const connection = {
        id: "mm_" + Math.random().toString(36).slice(2, 10),
        send: (message) => { try { server.send(message); } catch { } }
      };
      this.matchmakingServer.onConnect(connection);
      server.addEventListener("message", (event) => {
        Promise.resolve(this.matchmakingServer.onMessage(event.data, connection)).catch((error) => {
          console.error("Matchmaking message failed:", error);
          connection.send(JSON.stringify({ type: "error", message: "매치메이킹 요청 처리 실패함." }));
        });
      });
      server.addEventListener("close", () => this.matchmakingServer.onClose(connection));
      server.addEventListener("error", () => this.matchmakingServer.onClose(connection));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);

      const connId = "conn_" + Math.random().toString(36).substring(2, 9);
      server.accept();

      this.connections.set(connId, server);

      const connObj = {
        id: connId,
        send: (msg) => { try { server.send(msg); } catch (e) { } },
        lastRateCheck: Date.now(),
        messageCount: 0
      };

      if (typeof this.onConnect === 'function') {
        this.onConnect(connObj);
      }

      server.addEventListener("message", (event) => {
        if (typeof this.onMessage === 'function') {
          Promise.resolve(this.onMessage(event.data, connObj)).catch((error) => {
            console.error("Message handling failed:", error);
            connObj.send(JSON.stringify({ type: "error", code: "SERVER_ERROR", message: "게임 명령 처리에 실패함." }));
          });
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
        if (remainingIds.length === 0) {
          this.gameMode = null;
        }

        this.broadcastState();
      }
    }
  }

  async onMessage(message, conn) {
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

    if (!['check_room_mode', 'join'].includes(data.type) && !this.players[conn.id]) {
      conn.send(JSON.stringify({
        type: 'error',
        code: 'AUTH_REQUIRED',
        message: '방 작업 전에 인증된 사용자로 입장해야 함.'
      }));
      return;
    }

    if (this.sessionType === "matchmaking" && data.type.startsWith("game_")) {
      if (data.type === "game_ended") {
        conn.send(JSON.stringify({ type: "error", code: "SERVER_AUTHORITATIVE", message: "온라인 매치 종료는 서버가 확정함." }));
        return;
      }
      this.handleAuthoritativeCommand(data, conn);
      return;
    }

    switch (data.type) {
      case 'check_room_mode': {
        const requestedMode = data.mode === 'augmented' ? 'augmented' : 'normal';
        const requestedSessionType = data.sessionType === 'matchmaking' ? 'matchmaking' : 'lobby';
        if (requestedSessionType === 'matchmaking') {
          if (!data.matchId || !data.matchToken) {
            conn.send(JSON.stringify({ type: 'error', code: 'INVALID_MATCH_SESSION', message: '온라인 매치 정보가 없음.' }));
            return;
          }
          if (
            (this.matchToken && this.matchToken !== data.matchToken)
            || (this.matchId && this.matchId !== data.matchId)
          ) {
            conn.send(JSON.stringify({ type: 'error', code: 'INVALID_MATCH_TOKEN', message: '온라인 매치 인증에 실패함.' }));
            return;
          }
        } else if (this.sessionType === 'matchmaking') {
          conn.send(JSON.stringify({ type: 'error', code: 'MATCHMAKING_ONLY', message: '온라인 전용 세션임.' }));
          return;
        } else {
          this.sessionType = 'lobby';
        }
        if (this.gameMode && this.gameMode !== requestedMode) {
          conn.send(JSON.stringify({
            type: 'error',
            code: 'ROOM_MODE_MISMATCH',
            message: '게임모드가 다른 방에 입장할 수 없습니다.'
          }));
        } else if (Object.keys(this.players).length >= (requestedSessionType === 'matchmaking' || requestedMode === 'augmented' ? 2 : 4)) {
          conn.send(JSON.stringify({ type: 'error', code: 'ROOM_FULL', message: '방이 가득 찼습니다.' }));
        } else {
          conn.send(JSON.stringify({ type: 'room_mode_ok' }));
        }
        break;
      }

      case 'join':
        const requestedSessionType = data.sessionType === 'matchmaking' ? 'matchmaking' : 'lobby';
        if (requestedSessionType === 'matchmaking') {
          if (
            !data.matchId
            || !data.matchToken
            || !data.idToken
            || !data.authUid
            || data.uid !== data.authUid
          ) {
            conn.send(JSON.stringify({ type: 'error', code: 'INVALID_MATCH_SESSION', message: '온라인 매치 인증 정보가 없음.' }));
            return;
          }
          const verifiedUid = await this.verifyMatchmakingIdentity(data.idToken, data.mode);
          if (!verifiedUid || verifiedUid !== data.uid || verifiedUid !== data.authUid) {
            conn.send(JSON.stringify({ type: 'error', code: 'INVALID_IDENTITY', message: '온라인 매치 사용자 인증에 실패함.' }));
            return;
          }
          if (
            (this.matchToken && this.matchToken !== data.matchToken)
            || (this.matchId && this.matchId !== data.matchId)
          ) {
            conn.send(JSON.stringify({ type: 'error', code: 'INVALID_MATCH_TOKEN', message: '온라인 매치 인증에 실패함.' }));
            return;
          }
          this.sessionType = 'matchmaking';
          this.matchId = data.matchId;
          this.matchToken = data.matchToken;
        } else if (this.sessionType === 'matchmaking') {
          conn.send(JSON.stringify({ type: 'error', code: 'MATCHMAKING_ONLY', message: '온라인 전용 세션임.' }));
          return;
        } else {
          this.sessionType = 'lobby';
        }
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
              authoritativeState: this.authoritativeState ? getPublicGameState(this.authoritativeState) : null,
              players: this.getPublicPlayers()
            }));
          }
          return;
        }

        const requestedMode = data.mode === 'augmented' ? 'augmented' : 'normal';
        if (this.gameMode && this.gameMode !== requestedMode) {
          conn.send(JSON.stringify({
            type: 'error',
            code: 'ROOM_MODE_MISMATCH',
            message: '이 방은 선택한 게임 모드와 다릅니다. 같은 모드에서만 입장할 수 있습니다.'
          }));
          return;
        }
        if (!this.gameMode) {
          this.gameMode = requestedMode;
        }
        const maxAllowed = requestedSessionType === 'matchmaking' || this.gameMode === 'augmented' ? 2 : 4;

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
          authUid: data.authUid || null,
          nickname: data.nickname,
          avatarUrl: data.avatarUrl,
          idToken: data.idToken || null,
          isHost: isFirst,
          isReady: requestedSessionType === 'matchmaking' ? true : isFirst,
          disconnected: false
        };
        this.broadcastState();

        if (requestedSessionType === 'matchmaking' && Object.keys(this.players).length === 2) {
          this.startGame();
        }

        if (this.gameState === 'playing') {
          conn.send(JSON.stringify({
            type: 'full_game_sync',
            sessionData: this.gameSessionData,
            authoritativeState: this.authoritativeState ? getPublicGameState(this.authoritativeState) : null,
            players: this.getPublicPlayers()
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
          this.startGame();
        }
        break;

      case 'game_ended':
        if (
          this.sessionType === 'matchmaking'
          && (
            this.gameState !== 'playing'
            || !this.players[conn.id]
            || !this.hasCompleteScorecards()
          )
        ) {
          conn.send(JSON.stringify({ type: 'error', code: 'MATCH_NOT_COMPLETE', message: '완료되지 않은 매치는 정산할 수 없음.' }));
          return;
        }
        this.finalizeMatch("completed");
        this.room.broadcast(message, [conn.id]);
        break;

      case 'player_forfeited':
        let forfeitPlayer = this.players[conn.id];
        if (!forfeitPlayer || this.gameState !== 'playing') return;
        const forfeitPIndex = forfeitPlayer.playerIndex;
        const forfeitPayload = JSON.stringify({
          type: 'player_forfeited',
          connId: conn.id,
          uid: forfeitPlayer.uid,
          pIndex: forfeitPIndex
        });
        this.room.broadcast(forfeitPayload, [conn.id]);
        this.registerForfeit(forfeitPlayer.uid, forfeitPIndex, "forfeit");
        break;

      default:
        if (this.sessionType === "matchmaking") {
          conn.send(JSON.stringify({
            type: "error",
            code: "LEGACY_COMMAND_REJECTED",
            message: "온라인 매치는 서버 권위 명령만 허용함."
          }));
          return;
        }
        // 세션 데이터 상태 추적
        if (data.type === 'sync_score') {
          const sender = this.players[conn.id];
          const p = this.sessionType === 'matchmaking'
            ? sender?.playerIndex
            : data.player || this.gameSessionData.currentPlayer;
          if (
            !p
            || (
              this.sessionType === 'matchmaking'
              && (
                p !== this.gameSessionData.currentPlayer
                || !SCORE_CATEGORIES.has(data.catId)
                || this.gameSessionData.scores[p]?.[data.catId] !== undefined
              )
            )
          ) {
            return;
          }
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
      players: this.getPublicPlayers(),
      gameState: this.gameState,
      gameMode: this.gameMode,
      sessionType: this.sessionType,
      matchId: this.matchId
    };
    this.room.broadcast(JSON.stringify(stateMsg));
  }

  async verifyMatchmakingIdentity(idToken, mode) {
    if (this.env?.DB) {
      try {
        const decoded = await verifyFirebaseIdToken(idToken);
        const result = await this.env.DB.prepare('SELECT uid FROM users WHERE uid = ?').bind(decoded.sub).first();
        return result?.uid ? String(result.uid) : null;
      } catch (error) {
        console.error("Matchmaking D1 identity verification failed:", error);
        return null;
      }
    }
    const url = this.env?.MATCHMAKING_PROFILE_URL;
    if (!url || !idToken) return null;
    try {
      const response = await fetch(String(url), {
        method: "POST",
        headers: {
          authorization: `Bearer ${idToken}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ mode: mode === "augmented" ? "augmented" : "normal" })
      });
      if (!response.ok) return null;
      const profile = await response.json();
      return profile?.uid ? String(profile.uid) : null;
    } catch (error) {
      console.error("Matchmaking identity verification failed:", error);
      return null;
    }
  }

  handleAuthoritativeCommand(data, conn) {
    if (!this.authoritativeState || this.gameState !== "playing") {
      conn.send(JSON.stringify({ type: "error", code: "GAME_NOT_READY", message: "게임이 시작되지 않음." }));
      return;
    }
    const player = this.players[conn.id];
    if (!player?.playerIndex) {
      conn.send(JSON.stringify({ type: "error", code: "NOT_A_PLAYER", message: "참가자 정보를 확인할 수 없음." }));
      return;
    }

    try {
      const playerIndex = player.playerIndex;
      let animationPayload = null;
      switch (data.type) {
        case "game_roll": {
          if (
            this.authoritativeState.turnRollCount > 0 &&
            this.authoritativeState.dice.length > 0 &&
            this.authoritativeState.dice.every((die) => die.kept)
          ) {
            throw new GameRuleError("NO_UNKEPT_DICE", "모든 주사위가 킵된 상태에서는 굴릴 수 없음.");
          }
          const isFirstRoll = this.authoritativeState.turnRollCount === 0;
          const previousKeptIds = isFirstRoll
            ? new Set()
            : new Set(this.authoritativeState.dice.filter((die) => die.kept).map((die) => die.id));
          const candidate = structuredClone(this.authoritativeState);
          // 실제 서버 측 물리 엔진을 사용하지 않고, 족보용 난수만 수학적으로 결정합니다.
          rollDice(candidate, playerIndex);

          if (candidate.dice.length) {
            const animatedDice = candidate.dice.filter((die) => !previousKeptIds.has(die.id));
            const presetIndex = Math.floor(Math.random() * 20); // 일반/혼합 프리셋은 총 20종 (0~19)
            const isMirrored = Math.random() < 0.5;
            const presetFile = getPresetFileName(animatedDice, false);
            animationPayload = {
              presetIndex,
              isMirrored,
              presetFile,
              durationMs: 2500, // 프리셋 재생 최대 길이 (2.5초)
              dice: candidate.dice
            };
          }
          this.authoritativeState = candidate;
          break;
        }
        case "game_table_flip": {
          const candidate = structuredClone(this.authoritativeState);
          rollDice(candidate, playerIndex, { tableFlip: true });

          const presetIndex = Math.floor(Math.random() * 10); // 판 뒤집기 프리셋은 총 10종 (0~9)
          const isMirrored = Math.random() < 0.5;
          const presetFile = getPresetFileName(candidate.dice, true);
          animationPayload = {
            presetIndex,
            isMirrored,
            presetFile,
            durationMs: 1500, // 2배속(40fps) 프리셋 재생 최대 길이 (1.5초)
            dice: candidate.dice
          };

          this.authoritativeState = candidate;
          break;
        }
        case "game_keep":
          setDieKept(this.authoritativeState, playerIndex, data.dieId, data.isKept);
          break;
        case "game_score":
          scoreCategory(this.authoritativeState, playerIndex, data.catId);
          break;
        case "game_select_augment":
          selectAugment(this.authoritativeState, playerIndex, data.augmentId);
          break;
        default:
          conn.send(JSON.stringify({ type: "error", code: "UNKNOWN_GAME_COMMAND", message: "알 수 없는 게임 명령임." }));
          return;
      }
      if (animationPayload) {
        animationPayload.animationStartAt = Date.now() + PRESET_START_DELAY_MS;
        console.info('[online] preset_animation', {
          action: data.type,
          file: animationPayload.presetFile,
          presetIndex: animationPayload.presetIndex,
          mirrored: animationPayload.isMirrored,
          durationMs: animationPayload.durationMs,
          animationStartAt: animationPayload.animationStartAt,
          finalValues: getSortedFinalValues(animationPayload.dice)
        });
      }
      this.broadcastAuthoritativeState({
        kind: data.type,
        player: playerIndex,
        animationId: (data.type === 'game_roll' || data.type === 'game_table_flip') ? `${this.matchId}:${this.authoritativeState.revision}` : null,
        animation: animationPayload ? {
          file: animationPayload.presetFile,
          presetIndex: animationPayload.presetIndex,
          mirrored: animationPayload.isMirrored,
          durationMs: animationPayload.durationMs
        } : null,
        animationStartAt: animationPayload?.animationStartAt ?? null,
        dieId: data.dieId,
        isKept: data.isKept,
        catId: data.catId,
        augmentId: data.augmentId,
        animationDuration: animationPayload?.durationMs ?? 0,
        finalValues: animationPayload ? getSortedFinalValues(animationPayload.dice) : null
      });
      if (data.type === 'game_score') this.authoritativePauseUntil = Date.now() + 3000;
      if (isCompleteGame(this.authoritativeState)) this.finalizeMatch("completed");
    } catch (error) {
      const code = error instanceof GameRuleError
        ? error.code
        : "GAME_COMMAND_FAILED";
      if (!(error instanceof GameRuleError)) console.error("Authoritative command failed:", error);
      conn.send(JSON.stringify({ type: "error", code, message: error.message || "게임 명령 처리에 실패함." }));
      this.sendAuthoritativeState(conn);
    }
  }

  sendAuthoritativeState(conn, action = null) {
    if (!this.authoritativeState) return;
    conn.send(JSON.stringify({
      type: "authoritative_state",
      state: getPublicGameState(this.authoritativeState),
      action
    }));
  }

  broadcastAuthoritativeState(action = null) {
    if (!this.authoritativeState) return;
    this.room.broadcast(JSON.stringify({
      type: "authoritative_state",
      state: getPublicGameState(this.authoritativeState),
      action
    }));
  }

  getPublicPlayers() {
    return Object.values(this.players).map(({ idToken, authUid, ...player }) => player);
  }

  startGame() {
    if (this.gameState === 'playing') return;
    this.gameState = 'playing';
    const pList = Object.values(this.players);
    pList.forEach((p, idx) => {
      if (this.players[p.connId]) this.players[p.connId].playerIndex = idx + 1;
    });
    this.gameSessionData = {
      scores: { 1: {}, 2: {}, 3: {}, 4: {} },
      activeAugments: { 1: {}, 2: {}, 3: {}, 4: {} },
      currentRound: 1,
      currentPlayer: 1,
      rollsLeft: 3,
      turnTimeRemaining: 45,
      disconnectGrace: { 1: 60, 2: 60, 3: 60, 4: 60 },
      matchLogHistory: []
    };
    this.authoritativeState = this.sessionType === "matchmaking"
      ? createAuthoritativeGame({
        mode: this.gameMode,
        playerCount: pList.length,
        seed: this.matchId || this.room.id
      })
      : null;
    this.broadcastState();
    this.room.broadcast(JSON.stringify({
      type: 'game_started',
      matchId: this.matchId,
      sessionType: this.sessionType,
      players: this.getPublicPlayers()
    }));
    this.broadcastAuthoritativeState({ kind: "game_started" });
  }

  registerForfeit(uid, playerIndex, reason) {
    if (!uid || this.finalized) return;
    this.forfeitedUids.add(uid);
    const players = Object.values(this.players);
    const activeOpponent = players.find((player) => player.uid !== uid && !player.disconnected);
    if (this.forfeitedUids.size >= players.length) {
      this.finalizeMatch("double_forfeit");
    } else if (activeOpponent) {
      this.finalizeMatch(reason, uid);
    }
  }

  getPlayerTotal(playerIndex) {
    if (this.authoritativeState) {
      return getAuthoritativePlayerTotal(this.authoritativeState, playerIndex);
    }
    return Object.values(this.gameSessionData.scores[playerIndex] || {}).reduce((total, value) => {
      if (typeof value === 'object') return total + (Number(value.score) || 0) + (Number(value.bonus) || 0);
      return total + (Number(value) || 0);
    }, 0);
  }

  hasCompleteScorecards() {
    if (this.authoritativeState) return isCompleteGame(this.authoritativeState);
    const players = Object.values(this.players);
    return players.length === 2 && players.every((player) => {
      const scorecard = this.gameSessionData.scores[player.playerIndex] || {};
      return [...SCORE_CATEGORIES].every((category) => scorecard[category] !== undefined);
    });
  }

  finalizeMatch(outcome, forfeitedUid = null) {
    if (this.finalized || this.sessionType !== 'matchmaking') {
      if (!this.finalized) this.gameState = 'ended';
      return;
    }
    this.finalized = true;
    this.gameState = 'ended';
    const players = Object.values(this.players).map((player, index) => ({
      uid: player.authUid || player.uid,
      idToken: player.idToken,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      playerIndex: player.playerIndex || index + 1,
      score: this.getPlayerTotal(player.playerIndex || index + 1),
      forfeited: this.forfeitedUids.has(player.uid)
    }));
    void this.submitSettlement({ matchId: this.matchId, mode: this.gameMode, outcome, forfeitedUid, players });
  }

  async submitSettlement(payload) {
    if (this.env?.DB) {
      console.error("D1 settlement is not implemented; refusing Firebase fallback.");
      this.room.broadcast(JSON.stringify({ type: "rating_settlement_failed", code: "D1_SETTLEMENT_NOT_READY" }));
      return;
    }
    const url = this.env?.RATING_SETTLEMENT_URL;
    const callerToken = payload.players?.find((player) => player.idToken)?.idToken;
    if (!url || !callerToken) {
      console.warn("Rating settlement endpoint is not configured.");
      this.room.broadcast(JSON.stringify({ type: "rating_settlement_failed" }));
      return;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (attempt) await new Promise((resolve) => setTimeout(resolve, 250 * (2 ** attempt)));
        const response = await fetch(url, {
          method: "POST",
          headers: {
            authorization: `Bearer ${callerToken}`,
            "content-type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        this.room.broadcast(JSON.stringify({ type: "rating_settled", ...result }));
        return;
      } catch (error) {
        if (attempt < 2) continue;
        console.error("Rating settlement failed:", error);
        this.room.broadcast(JSON.stringify({ type: "rating_settlement_failed" }));
      }
    }
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
