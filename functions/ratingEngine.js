export const DEFAULT_RATING = 500;
export const MIN_RATING = 0;
export const PLACEMENT_GAMES = 10;
export const PLACEMENT_K = 40;
export const STANDARD_K = 24;
export const HIGH_RATING_K = 16;
export const HIGH_RATING_THRESHOLD = 1500;
const ALLOWED_MODES = new Set(["normal", "augmented"]);
const ALLOWED_OUTCOMES = new Set(["completed", "forfeit", "disconnect_timeout", "double_forfeit"]);

function readRating(value) {
  const rating = Number(value);
  return value !== null && value !== "" && Number.isFinite(rating)
    ? Math.max(MIN_RATING, rating)
    : DEFAULT_RATING;
}

export function getKFactor(rating = DEFAULT_RATING, games = 0) {
  if (Number(games) < PLACEMENT_GAMES) return PLACEMENT_K;
  return Number(rating) >= HIGH_RATING_THRESHOLD ? HIGH_RATING_K : STANDARD_K;
}

export function getExpectedScore(rating, opponentRating) {
  return 1 / (1 + 10 ** ((Number(opponentRating) - Number(rating)) / 400));
}

function nextRating(player, opponent, score) {
  const rating = readRating(player.rating);
  const opponentRating = readRating(opponent.rating);
  const delta = Math.round(getKFactor(rating, player.games) * (score - getExpectedScore(rating, opponentRating)));
  const after = Math.max(MIN_RATING, rating + delta);
  return { before: rating, delta: after - rating, after };
}

export function calculateRatingSettlement(playerA, playerB, outcome = "draw") {
  const scores = {
    a_win: [1, 0],
    b_win: [0, 1],
    draw: [0.5, 0.5],
    double_forfeit: [0, 0]
  }[outcome];
  if (!scores) throw new Error(`Unsupported rating outcome: ${outcome}`);

  return {
    a: nextRating(playerA, playerB, scores[0]),
    b: nextRating(playerB, playerA, scores[1])
  };
}

export function readModeStats(userData, mode) {
  const value = userData?.stats?.modes?.[mode] || {};
  return {
    rating: readRating(value.rating),
    games: Math.max(0, Number(value.ratingGames) || 0),
    ratingHistory: Array.isArray(value.ratingHistory) ? value.ratingHistory : []
  };
}

export function resolveRatingOutcome(players, outcome, forfeitedUid) {
  if (outcome === "double_forfeit") return "double_forfeit";
  if (forfeitedUid) return players[0].uid === forfeitedUid ? "b_win" : "a_win";
  const scoreA = Number(players[0].score);
  const scoreB = Number(players[1].score);
  if (scoreA === scoreB) return "draw";
  return scoreA > scoreB ? "a_win" : "b_win";
}

export function updateRatingStats(userData, mode, result, now, matchId) {
  const stats = userData.stats || {};
  const modes = { ...(stats.modes || {}) };
  const oldMode = modes[mode] || {};
  const history = Array.isArray(oldMode.ratingHistory) ? oldMode.ratingHistory : [];
  modes[mode] = {
    ...oldMode,
    rating: result.after,
    ratingGames: (Number(oldMode.ratingGames) || 0) + 1,
    ratingHistory: [...history, { rating: result.after, delta: result.delta, at: now, matchId }].slice(-200)
  };
  return { ...stats, ratingVersion: 1, modes };
}

export function isValidSettlement(matchId, mode, outcome, forfeitedUid, players) {
  if (
    !/^[a-zA-Z0-9-]{8,100}$/.test(String(matchId || ""))
    || !ALLOWED_MODES.has(mode)
    || !ALLOWED_OUTCOMES.has(outcome)
    || players.length !== 2
    || players.some((player) => (
      !player
      || typeof player.uid !== "string"
      || !player.uid
      || typeof player.idToken !== "string"
      || !player.idToken
      || typeof player.score !== "number"
      || !Number.isFinite(player.score)
    ))
    || players[0].uid === players[1].uid
  ) {
    return false;
  }
  if (outcome === "completed" || outcome === "double_forfeit") return forfeitedUid === null;
  return players.some((player) => player.uid === forfeitedUid);
}
