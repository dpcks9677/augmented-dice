import assert from "node:assert/strict";
import {
  calculateRatingSettlement,
  getExpectedScore,
  getKFactor,
  isValidSettlement,
  updateRatingStats
} from "../src/ratingEngine.js";
import MatchmakingServer from "../src/matchmakingServer.js";
import {
  areTicketsCompatible,
  isRatingAllowed,
  isValidRatingBound
} from "../src/matchmakingRules.js";

assert.equal(getExpectedScore(500, 500), 0.5);
assert.equal(getKFactor(500, 0), 40);
assert.equal(getKFactor(500, 10), 24);
assert.equal(getKFactor(1500, 10), 16);

const equalMatch = calculateRatingSettlement(
  { rating: 500, games: 10 },
  { rating: 500, games: 10 },
  "a_win"
);
assert.deepEqual(equalMatch, {
  a: { before: 500, delta: 12, after: 512 },
  b: { before: 500, delta: -12, after: 488 }
});

const doubleForfeit = calculateRatingSettlement(
  { rating: 500, games: 10 },
  { rating: 500, games: 10 },
  "double_forfeit"
);
assert.equal(doubleForfeit.a.delta, -12);
assert.equal(doubleForfeit.b.delta, -12);

const zeroRating = calculateRatingSettlement(
  { rating: 0, games: 10 },
  { rating: 500, games: 10 },
  "b_win"
);
assert.equal(zeroRating.a.before, 0);
assert.equal(zeroRating.a.after, 0);

const players = [
  { uid: "a", idToken: "tokenA", score: 200 },
  { uid: "b", idToken: "tokenB", score: 100 }
];
assert.equal(isValidSettlement("match-12345678", "normal", "completed", null, players), true);
assert.equal(isValidSettlement("match-12345678", "normal", "forfeit", "unknown", players), false);
assert.equal(isValidSettlement("match-12345678", "normal", "completed", "a", players), false);
const updatedStats = updateRatingStats(
  { stats: { modes: { normal: { rating: 500, ratingGames: 9, ratingHistory: [] } } } },
  "normal",
  { after: 512, delta: 12 },
  "2026-07-31T00:00:00.000Z",
  "match-12345678"
);
assert.equal(updatedStats.modes.normal.ratingGames, 10);
assert.equal(updatedStats.modes.normal.ratingHistory[0].matchId, "match-12345678");

assert.equal(isRatingAllowed(1500, 1000, "unlimited"), true);
assert.equal(isRatingAllowed(500, "unlimited", 400), false);
assert.equal(isValidRatingBound(500), true);
assert.equal(isValidRatingBound(550), false);
assert.equal(areTicketsCompatible(
  { uid: "a", mode: "normal", rating: 500, lower: 400, upper: 600 },
  { uid: "b", mode: "normal", rating: 550, lower: 500, upper: 700 }
), true);
assert.equal(areTicketsCompatible(
  { uid: "a", mode: "normal", rating: 500, lower: 600, upper: 600 },
  { uid: "b", mode: "normal", rating: 700, lower: 400, upper: 800 }
), false);

const sent = { a: [], b: [] };
const connections = {
  a: { id: "a", send: (message) => sent.a.push(JSON.parse(message)) },
  b: { id: "b", send: (message) => sent.b.push(JSON.parse(message)) }
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, options) => {
  const token = options.headers.authorization.replace("Bearer ", "");
  const profiles = {
    tokenA: { uid: "a", nickname: "A", rating: 500, ratingGames: 3 },
    tokenB: { uid: "b", nickname: "B", rating: 550, ratingGames: 4 }
  };
  return new Response(JSON.stringify(profiles[token]), {
    status: profiles[token] ? 200 : 401,
    headers: { "content-type": "application/json" }
  });
};

const matchmaking = new MatchmakingServer({
  env: {
    MATCHMAKING_PROFILE_URL: "https://example.test/profile",
    RATING_SETTLEMENT_SECRET: "test-secret"
  }
});
await matchmaking.onMessage(JSON.stringify({
  type: "enqueue",
  idToken: "tokenA",
  mode: "normal",
  rating: 9999,
  lower: 400,
  upper: 600
}), connections.a);
assert.equal(matchmaking.tickets.get("a").rating, 500);
await matchmaking.onMessage(JSON.stringify({
  type: "enqueue",
  idToken: "tokenB",
  mode: "normal",
  rating: 1,
  lower: 500,
  upper: 600
}), connections.b);

assert.equal(sent.a.at(-1).type, "match_found");
assert.equal(sent.b.at(-1).type, "match_found");
assert.equal(matchmaking.tickets.size, 0);
assert.equal(matchmaking.matches.size, 1);
await matchmaking.onMessage(JSON.stringify({ type: "match_started" }), connections.a);
matchmaking.onClose(connections.a);
assert.equal(matchmaking.matches.size, 1);
assert.equal(sent.b.some((message) => message.type === "match_cancelled"), false);
await matchmaking.onMessage(JSON.stringify({ type: "match_started" }), connections.b);
assert.equal(matchmaking.matches.size, 0);
globalThis.fetch = originalFetch;

console.log("ratingEngine tests passed");
