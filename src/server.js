export default class DiceServer {
  constructor(room) {
    this.room = room;
    // players map: connectionId -> { uid, nickname, avatarUrl, isHost, isReady }
    this.players = {}; 
    this.gameState = 'lobby'; // 'lobby', 'playing'
  }

  onConnect(conn, ctx) {
    console.log("Player connected:", conn.id, "to room", this.room.id);
  }

  onClose(conn) {
    console.log("Player disconnected:", conn.id);
    if (this.players[conn.id]) {
      const wasHost = this.players[conn.id].isHost;
      delete this.players[conn.id];
      
      // 방장이 나갔다면 남은 사람 중 한 명을 방장으로 위임하거나 방을 폭파할 수 있습니다.
      // 여기서는 첫 번째 사람을 호스트로 만듭니다.
      const remainingIds = Object.keys(this.players);
      if (wasHost && remainingIds.length > 0) {
        this.players[remainingIds[0]].isHost = true;
      }
      
      this.broadcastState();
    }
  }

  onMessage(message, conn) {
    const data = JSON.parse(message);
    
    switch (data.type) {
      case 'join':
        // 중복 가입 방지 및 최대 4인 제한
        if (Object.keys(this.players).length >= 4 && !this.players[conn.id]) {
          conn.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
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
          isReady: isFirst // 호스트는 기본 레디 상태
        };
        this.broadcastState();
        break;
        
      case 'ready':
        if (this.players[conn.id]) {
          this.players[conn.id].isReady = data.isReady;
          this.broadcastState();
        }
        break;
        
      case 'start_game':
        if (this.players[conn.id] && this.players[conn.id].isHost) {
          // 호스트만 시작 가능
          this.gameState = 'playing';
          this.room.broadcast(JSON.stringify({ type: 'game_started' }));
        }
        break;
        
      default:
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
