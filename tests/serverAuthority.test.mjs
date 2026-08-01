import assert from "node:assert/strict";
import { DiceServer } from "../src/server.js";

function connection(id) {
  return {
    id,
    sent: [],
    send(message) {
      this.sent.push(JSON.parse(message));
    }
  };
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => {
  const token = options.headers.authorization?.replace("Bearer ", "");
  const profiles = {
    tokenA: { uid: "player-a", nickname: "A", rating: 500, ratingGames: 0 },
    tokenB: { uid: "player-b", nickname: "B", rating: 500, ratingGames: 0 }
  };
  return new Response(JSON.stringify(profiles[token] || { error: "UNAUTHORIZED" }), {
    status: profiles[token] ? 200 : 401,
    headers: { "content-type": "application/json" }
  });
};

const server = new DiceServer(null, {
  MATCHMAKING_PROFILE_URL: "https://example.test/profile",
  RATING_SETTLEMENT_SECRET: "test-secret"
});
server.room.id = "ONLINE-TEST";
const a = connection("a");
const b = connection("b");
server.connections.set(a.id, a);
server.connections.set(b.id, b);

await server.onMessage(JSON.stringify({ type: "game_ended" }), a);
assert.equal(a.sent.at(-1).code, "AUTH_REQUIRED");
assert.equal(server.gameState, "lobby");

await server.onMessage(JSON.stringify({
  type: "check_room_mode",
  mode: "normal",
  sessionType: "matchmaking",
  matchId: "untrusted-match-id",
  matchToken: "untrusted-match-token"
}), a);
assert.equal(server.sessionType, null);
assert.equal(server.matchId, null);
assert.equal(server.matchToken, null);

const join = (uid, idToken) => JSON.stringify({
  type: "join",
  uid,
  authUid: uid,
  idToken,
  nickname: uid,
  mode: "normal",
  sessionType: "matchmaking",
  matchId: "match-authority-test",
  matchToken: "shared-match-token"
});

await server.onMessage(join("player-a", "tokenA"), a);
await server.onMessage(join("player-b", "tokenB"), b);
assert.equal(server.gameState, "playing");
assert.equal(server.authoritativeState.currentPlayer, 1);

await server.onMessage(JSON.stringify({ type: "game_roll" }), b);
assert.equal(b.sent.at(-2)?.code === "NOT_YOUR_TURN" || b.sent.at(-1)?.code === "NOT_YOUR_TURN", true);
assert.equal(server.authoritativeState.rollsLeft, 3);

await server.onMessage(JSON.stringify({
  type: "sync_score",
  catId: "choice",
  scoreInfo: { score: 9999 }
}), a);
assert.equal(a.sent.at(-1).code, "LEGACY_COMMAND_REJECTED");
assert.equal(server.authoritativeState.scores[1].choice, undefined);

await server.onMessage(JSON.stringify({ type: "game_roll" }), a);
assert.equal(server.authoritativeState.rollsLeft, 2);
assert.equal(server.authoritativeState.dice.length, 5);
const rollMessage = a.sent.findLast((message) => message.type === "authoritative_state" && message.action?.kind === "game_roll");
assert.equal(rollMessage.action.animationSeed, undefined);
assert.ok(Number.isInteger(rollMessage.action.animation?.presetIndex));
assert.equal(rollMessage.action.animation?.file, 'dice_presets_normal_5.json');
assert.equal(typeof rollMessage.action.animation?.mirrored, 'boolean');
assert.ok(Number.isFinite(rollMessage.action.animationStartAt));
assert.equal(rollMessage.action.finalValues?.length, 5);
assert.deepEqual(
  rollMessage.action.finalValues.map((die) => die.value),
  [...rollMessage.action.finalValues].map((die) => die.value).sort((a, b) => a - b)
);
assert.ok(JSON.stringify(rollMessage).length < 65536);
rollMessage.action.finalValues.forEach((result) => {
  const stateDie = server.authoritativeState.dice.find((die) => die.id === result.id);
  assert.equal(stateDie.value, result.value);
});

await server.onMessage(JSON.stringify({
  type: "game_score",
  catId: "choice",
  scoreInfo: { score: 9999 }
}), a);
assert.notEqual(server.authoritativeState.scores[1].choice.score, 9999);
assert.equal(server.authoritativeState.currentPlayer, 2);

// Player 2 턴: 첫 굴림 시 프리셋과 finalValues가 정상 전달되는지 검증
await server.onMessage(JSON.stringify({ type: "game_roll" }), b);
assert.equal(server.authoritativeState.rollsLeft, 2);
const rollMessageP2 = b.sent.findLast((message) => message.type === "authoritative_state" && message.action?.kind === "game_roll");
assert.equal(rollMessageP2.action.animationSeed, undefined);
assert.ok(Number.isInteger(rollMessageP2.action.animation?.presetIndex), "P2 첫 굴림 시 presetIndex가 존재해야 함");
assert.equal(rollMessageP2.action.finalValues?.length, 5, "P2 첫 굴림 시 5개 주사위 finalValues가 존재해야 함");

clearInterval(server.timerLoop);
globalThis.fetch = originalFetch;
console.log("server authority tests passed");
