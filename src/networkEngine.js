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
    this.roomCode = roomCode;

    // 현재 접속 중인 소켓이 있으면 닫기
    if (this.socket) {
      this.socket.close();
    }

    // PartySocket 초기화
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    this.socket = new PartySocket({
      host: isLocal ? '127.0.0.1:1999' : window.location.host,
      room: roomCode
    });

    this.socket.addEventListener('open', async () => {
      console.log(`Connected to room: ${roomCode}`);
      
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
