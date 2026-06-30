export default {
  async onConnect(conn, room) {
    // When a player connects
    console.log("Player connected:", conn.id, "to room", room.id);
  },

  async onMessage(message, conn, room) {
    // Simply broadcast any message received to all other connections in the room
    // The frontend will handle the specific message types ('join', 'roll', 'score')
    room.broadcast(message, [conn.id]);
  }
};
