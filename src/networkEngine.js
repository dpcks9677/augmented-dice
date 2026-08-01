import PartySocket from "partysocket";
import { getCurrentUser, getUserFromDB } from "./authEngine.js";

class NetworkEngine {
  constructor() {
    this.socket = null;
    this.matchmakingSocket = null;
    this.roomCode = null;
    this.sessionType = null;
    this.currentMatch = null;
    this.callbacks = {};
  }

  on(event, callback) {
    if (!this.callbacks[event]) this.callbacks[event] = [];
    this.callbacks[event].push(callback);
  }

  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter((item) => item !== callback);
    }
  }

  once(event, callback) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      callback(data);
    };
    this.on(event, wrapper);
  }

  removeAllListeners(event) {
    if (event) this.callbacks[event] = [];
    else this.callbacks = {};
  }

  emit(event, data) {
    this.callbacks[event]?.slice().forEach((callback) => callback(data));
  }

  async getIdentity(requireAuth = false) {
    const user = getCurrentUser();
    if (requireAuth && !user) throw new Error("로그인이 필요함.");

    let tabId = sessionStorage.getItem("ad_tab_id");
    if (!tabId) {
      tabId = Math.random().toString(36).substring(2, 7);
      sessionStorage.setItem("ad_tab_id", tabId);
    }

    let uid = sessionStorage.getItem("ad_guest_uid");
    if (!uid) {
      uid = `guest-${Math.random().toString(36).substring(2, 9)}_${tabId}`;
      sessionStorage.setItem("ad_guest_uid", uid);
    }
    let nickname = "Guest";
    let avatarUrl = null;
    let idToken = null;

    if (user) {
      uid = user.uid;
      const dbUser = await getUserFromDB(user.uid);
      nickname = dbUser?.nickname || user.displayName || "Player";
      avatarUrl = dbUser?.avatarUrl || user.photoURL || null;
      idToken = await user.getIdToken();
    } else {
      const profileNick = document.getElementById("profile-nickname");
      if (profileNick?.textContent && profileNick.textContent !== "Player") {
        nickname = profileNick.textContent;
      }
      const background = document.getElementById("profile-avatar-container")?.style?.backgroundImage;
      if (background?.includes("url(")) {
        avatarUrl = background.replace(/^url\(['"]?/, "").replace(/['"]?\)$/, "");
      }
    }

    return { user, uid, tabUid: user ? `${user.uid}_${tabId}` : uid, nickname, avatarUrl, idToken };
  }

  async connectToLobby(roomCode, isForfeitOnly = false, options = {}) {
    const normalizedCode = String(roomCode || "").trim().toUpperCase();
    this.roomCode = normalizedCode;
    this.sessionType = options.sessionType === "matchmaking" ? "matchmaking" : "lobby";
    if (this.socket) this.socket.close();

    const partyHost = import.meta.env?.VITE_PARTYKIT_HOST || "augmented-dice-server.augmented-dice.workers.dev";
    this.socket = new PartySocket({ host: partyHost, room: normalizedCode });

    this.socket.addEventListener("open", async () => {
      try {
        const identity = await this.getIdentity(this.sessionType === "matchmaking");
        const uid = this.sessionType === "matchmaking" ? identity.uid : identity.tabUid;
        window.myUid = uid;

        if (!isForfeitOnly) {
          this.sendMessage({
            type: "join",
            uid,
            authUid: identity.user?.uid || null,
            idToken: identity.idToken,
            nickname: identity.nickname,
            avatarUrl: identity.avatarUrl,
            mode: options.mode || window.pendingLobbyMode || "normal",
            sessionType: this.sessionType,
            matchId: options.matchId || null,
            matchToken: options.matchToken || null
          });
        }
        this.emit("connected", { roomCode: normalizedCode, isForfeitOnly, sessionType: this.sessionType });
      } catch (error) {
        this.emit("error", { code: "AUTH_REQUIRED", message: error.message });
        this.socket?.close();
      }
    });

    this.socket.addEventListener("error", (error) => {
      console.error('[online] socket_error', error);
      this.emit("socket_error", error);
    });
    this.socket.addEventListener("close", (event) => {
      console.info('[online] socket_close', { code: event.code, reason: event.reason || '' });
      this.emit("socket_closed", event);
    });
    this.socket.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn('[online] invalid_message');
        return;
      }
      if (data.type !== 'authoritative_timer') {
        console.info('[online] event', { type: data.type, code: data.code || null });
      }
      if (data.type === 'authoritative_state' && (data.action?.kind === 'game_roll' || data.action?.kind === 'game_table_flip')) {
        console.info('[online] preset_animation_received', {
          action: data.action.kind,
          file: data.action.animation?.file ?? null,
          presetIndex: data.action.animation?.presetIndex ?? null,
          mirrored: data.action.animation?.mirrored ?? null,
          durationMs: data.action.animation?.durationMs ?? null,
          animationStartAt: data.action.animationStartAt ?? null,
          finalValues: data.action.finalValues ?? null
        });
      }
      const directEvents = new Set([
        "error",
        "lobby_state",
        "game_started",
        "full_game_sync",
        "player_disconnected",
        "player_reconnected",
        "player_forfeited",
        "game_already_ended",
        "rating_settled",
        "rating_settlement_failed",
        "authoritative_state",
        "authoritative_timer"
      ]);
      this.emit(directEvents.has(data.type) ? data.type : "ingame_message", data);
    });
  }

  async connectToMatchmaking(options) {
    this.closeMatchmakingSocket();
    const identity = await this.getIdentity(true);
    const partyHost = import.meta.env?.VITE_PARTYKIT_HOST || "augmented-dice-server.augmented-dice.workers.dev";
    this.matchmakingSocket = new PartySocket({
      host: partyHost,
      party: "matchmaking",
      room: `queue-${options.mode}`
    });

    this.matchmakingSocket.addEventListener("open", () => {
      console.info('[matchmaking] socket_open', { host: partyHost, mode: options.mode });
      this.matchmakingSocket.send(JSON.stringify({
        type: "enqueue",
        uid: identity.uid,
        idToken: identity.idToken,
        nickname: identity.nickname,
        avatarUrl: identity.avatarUrl,
        mode: options.mode,
        lower: options.lower,
        upper: options.upper
      }));
    });
    this.matchmakingSocket.addEventListener("message", (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        console.warn('[matchmaking] invalid_message');
        return;
      }
      console.info('[matchmaking] event', { type: data.type, ticketId: data.ticketId || null, matchId: data.matchId || null });
      if (data.type === "match_found") this.currentMatch = data;
      this.emit(data.type === "error" ? "matchmaking_error" : data.type, data);
    });
    this.matchmakingSocket.addEventListener("error", (error) => {
      console.error('[matchmaking] socket_error', error);
      this.emit("matchmaking_error", error);
    });
    this.matchmakingSocket.addEventListener("close", (event) => {
      console.info('[matchmaking] socket_close', { code: event.code, reason: event.reason || '' });
      this.emit("matchmaking_closed", event);
    });
  }

  connectToOnlineMatch(match = this.currentMatch) {
    if (!match) throw new Error("확정된 매치가 없음.");
    return this.connectToLobby(match.roomId, false, {
      sessionType: "matchmaking",
      mode: match.mode,
      matchId: match.matchId,
      matchToken: match.matchToken
    });
  }

  cancelMatchmaking() {
    if (!this.matchmakingSocket) return;
    const type = this.currentMatch ? "cancel_match" : "cancel_queue";
    if (this.matchmakingSocket.readyState === WebSocket.OPEN) {
      this.matchmakingSocket.send(JSON.stringify({ type }));
    }
    this.currentMatch = null;
  }

  notifyMatchStarted() {
    if (this.matchmakingSocket?.readyState === WebSocket.OPEN) {
      this.matchmakingSocket.send(JSON.stringify({ type: "match_started" }));
    }
    this.closeMatchmakingSocket();
  }

  closeMatchmakingSocket() {
    if (this.matchmakingSocket) {
      this.matchmakingSocket.close();
      this.matchmakingSocket = null;
    }
  }

  sendMessage(data) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  sendInGameAction(data) {
    this.sendMessage(data);
  }

  setReady(isReady) {
    this.sendMessage({ type: "ready", isReady });
  }

  startGame() {
    this.sendMessage({ type: "start_game" });
  }

  disconnect() {
    if (this.socket) this.socket.close();
    this.socket = null;
    this.closeMatchmakingSocket();
    this.roomCode = null;
    this.sessionType = null;
    this.currentMatch = null;
  }
}

export const networkEngine = new NetworkEngine();
