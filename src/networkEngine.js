import PartySocket from 'partysocket';
import { getCurrentUser, getUserFromDB } from './authEngine.js';

class NetworkEngine {
  constructor() {
    this.socket = null;
    this.roomCode = null;
    this.callbacks = {};
  }

  // 이벤트 리스너 등록
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  // 내부 이벤트 발생
  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(cb => cb(data));
    }
  }

  async connectToLobby(roomCode) {
    const normalizedCode = String(roomCode || '').trim().toUpperCase();
    this.roomCode = normalizedCode;

    // 현재 접속 중인 소켓이 있으면 닫기
    if (this.socket) {
      this.socket.close();
    }

    // PartySocket 초기화
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.') || window.location.hostname.startsWith('10.');
    const partyHost = import.meta.env?.VITE_PARTYKIT_HOST || (isLocal ? `${window.location.hostname}:1999` : 'server.augmented-dice.workers.dev');

    this.socket = new PartySocket({
      host: partyHost,
      room: normalizedCode
    });

    this.socket.addEventListener('open', async () => {
      console.log(`Connected to room: ${normalizedCode} (${partyHost})`);
      
      // 내 정보 가져오기
      const user = getCurrentUser();
      let uid = "guest-" + Math.random().toString(36).substring(2, 9);
      let nickname = "Guest";
      let avatarUrl = null;

      if (user) {
        uid = user.uid;
        const dbUser = await getUserFromDB(uid);
        if (dbUser) {
          nickname = dbUser.nickname || nickname;
          avatarUrl = dbUser.avatarUrl || null;
        }
      } else {
        // 프로필 캔버스는 더 이상 사용 안 함
        const profileNick = document.getElementById('profile-nickname');
        if (profileNick && profileNick.textContent !== "Player") {
          nickname = profileNick.textContent;
        }
      }

      // 서버에 join 메시지 전송
      this.sendMessage({
        type: 'join',
        uid: uid,
        nickname: nickname,
        avatarUrl: avatarUrl
      });
      
      this.emit('connected', { roomCode });
    });

    this.socket.addEventListener('error', (err) => {
      console.error("PartySocket connection error:", err);
      this.emit('socket_error', err);
    });

    this.socket.addEventListener('close', (event) => {
      console.warn("PartySocket closed:", event);
      this.emit('socket_closed', event);
    });

    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'error') {
        alert(data.message);
        this.emit('error', data);
        return;
      }
      
      if (data.type === 'lobby_state') {
        this.emit('lobby_state', data);
      } else if (data.type === 'game_started') {
        this.emit('game_started', data);
      } else if (data.type === 'full_game_sync') {
        this.emit('full_game_sync', data);
      } else if (data.type === 'player_disconnected') {
        this.emit('player_disconnected', data);
      } else if (data.type === 'player_reconnected') {
        this.emit('player_reconnected', data);
      } else if (data.type === 'player_forfeited') {
        this.emit('player_forfeited', data);
      } else if (data.type === 'game_already_ended') {
        this.emit('game_already_ended', data);
      } else {
        // 기타 인게임 동기화용 메시지 (주사위 등)
        this.emit('ingame_message', data);
      }
    });
  }

  sendMessage(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  setReady(isReady) {
    this.sendMessage({ type: 'ready', isReady });
  }

  startGame() {
    this.sendMessage({ type: 'start_game' });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.roomCode = null;
  }
}

export const networkEngine = new NetworkEngine();
