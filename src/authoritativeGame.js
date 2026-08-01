import { calculateScores, mutationDefinitions } from "./scoreEngine.js";

export const SCORE_CATEGORIES = [
  "aces", "deuces", "threes", "fours", "fives", "sixes",
  "choice", "4oak", "fullhouse", "s-straight", "l-straight", "yacht"
];

export const DIE_FACES = {
  normal: [1, 2, 3, 4, 5, 6],
  heavy: [4, 4, 5, 5, 6, 6],
  golden: [1, 2, 3, 4, 5, 6],
  octahedron: [1, 2, 3, 4, 4, 5, 5, 6],
  weird: [1, 2, 3, 4, 5, 6],
  couple: [1, 2, 3, 4, 5, 6],
  sevens: [2, 3, 4, 5, 6, 7]
};

const PHASE_ROUNDS = new Set([1, 6, 9]);
const PHASE_ONE_ONLY = new Set(["step-by-step", "fast-straight"]);
const UNAVAILABLE_AUGMENTS = new Set(["strange-die"]);
const LOWER_CATEGORIES = new Set(["choice", "4oak", "fullhouse", "s-straight", "l-straight", "yacht"]);

export class GameRuleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new GameRuleError(code, message);
}

function playerMap(playerCount, makeValue) {
  return Object.fromEntries(Array.from({ length: playerCount }, (_, index) => [index + 1, makeValue(index + 1)]));
}

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) & 0x7fffffff;
  return hash;
}

function seededShuffle(items, seed) {
  const result = [...items];
  let hash = hashString(seed);
  const random = () => {
    hash = (Math.imul(hash, 1664525) + 1013904223) & 0x7fffffff;
    return hash / 0x80000000;
  };
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function expectedAugmentCount(round) {
  if (round >= 9) return 3;
  if (round >= 6) return 2;
  return 1;
}

function getOwnedAugments(state, player) {
  return Object.values(state.activeMutations[player] || {});
}

function getDraftOptions(state, player) {
  const owned = new Set(getOwnedAugments(state, player));
  const candidates = Object.keys(mutationDefinitions).filter((augmentId) => (
    !UNAVAILABLE_AUGMENTS.has(augmentId)
    && !owned.has(augmentId)
    && (state.currentRound < 6 || !PHASE_ONE_ONLY.has(augmentId))
    && !(owned.has('table-flip') && augmentId === '8-sided')
    && !(owned.has('8-sided') && augmentId === 'table-flip')
  ));
  return seededShuffle(candidates, `${state.seed}_R${state.currentRound}_P${player}`).slice(0, 3);
}

function getTurnDuration(state, player = state.currentPlayer) {
  const progress = state.questProgress[player] || {};
  const hasNozdormu = getOwnedAugments(state, player).includes("nozdormu");
  return hasNozdormu && !progress.nozdormuRewarded ? 15 : 45;
}

function secureRandomInt(max) {
  if (!Number.isInteger(max) || max <= 0) fail("INVALID_RANDOM_RANGE", "주사위 난수 범위가 잘못됨.");
  const ceiling = 0x100000000;
  const limit = ceiling - (ceiling % max);
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % max;
}

function assertPlayerTurn(state, player) {
  if (state.ended) fail("GAME_ENDED", "이미 종료된 게임임.");
  if (Number(player) !== state.currentPlayer) fail("NOT_YOUR_TURN", "현재 플레이어의 명령이 아님.");
}

function assertParticipant(state, player) {
  const index = Number(player);
  if (!Number.isInteger(index) || index < 1 || index > state.playerCount) {
    fail("INVALID_PLAYER", "참가하지 않은 플레이어임.");
  }
}

function addQuestReward(state, player, key, points) {
  const progress = state.questProgress[player];
  if (progress[key]) return;
  progress[key] = true;
  progress.questBonus = (progress.questBonus || 0) + points;
}

function getScoreValue(value) {
  return typeof value === "object"
    ? (Number(value?.score) || 0) + (Number(value?.bonus) || 0)
    : Number(value) || 0;
}

function isFullHouse(dice) {
  const counts = Object.values(dice.reduce((result, value) => {
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {})).sort((a, b) => b - a);
  return (counts[0] >= 3 && counts[1] >= 2) || counts[0] >= 5;
}

function getUpperSum(state, player) {
  return ["aces", "deuces", "threes", "fours", "fives", "sixes"].reduce(
    (sum, category) => sum + getScoreValue(state.scores[player][category]),
    0
  );
}

function applyUpperBonus(state, player) {
  const progress = state.questProgress[player];
  if (getUpperSum(state, player) >= state.upperBonusThreshold[player]) {
    state.scores[player].bonus = progress.stepRewarded ? 55 : 35;
  }
}

function getScoringDice(state, player) {
  const dice = state.dice.filter((die) => die.type !== "weird");
  const bank = state.yachtBankState[player];
  const bankActive = state.activeMutations[player]?.yacht === "yacht-bank"
    && bank?.turnsLeft > 0
    && !bank.completed;

  if (bankActive) {
    const unkept = dice.filter((die) => !die.kept);
    if (unkept.length > 5) fail("SELECT_FIVE_DICE", "족보에 사용할 주사위 5개를 남겨야 함.");
    return unkept;
  }
  if (dice.length > 5) {
    const selected = dice.filter((die) => die.kept);
    if (selected.length !== 5) fail("SELECT_FIVE_DICE", "족보에 사용할 주사위 5개를 선택해야 함.");
    return selected;
  }
  return dice;
}

function getScoreContext(state, player, scoringDice) {
  return {
    bank: state.yachtBankState[player]?.accumulatedScore || 0,
    fullDice: [
      ...scoringDice.map(({ value, type }) => ({ value, type })),
      ...state.dice.filter((die) => die.type === "weird").map(({ value, type }) => ({ value, type }))
    ]
  };
}

export function previewScores(state, player = state.currentPlayer) {
  assertPlayerTurn(state, player);
  if (state.phase !== "action" || state.turnRollCount < 1) {
    fail("ROLL_REQUIRED", "점수 계산 전에 주사위를 굴려야 함.");
  }
  const scoringDice = getScoringDice(state, player);
  return calculateScores(
    scoringDice.map((die) => die.value),
    state.activeMutations[player],
    getScoreContext(state, player, scoringDice)
  );
}

function applyQuestProgress(state, player, category, score, scoringDice) {
  const progress = state.questProgress[player];
  const mutations = getOwnedAugments(state, player);
  const playerScores = state.scores[player];
  const diceValues = scoringDice.map((die) => die.value);

  if (mutations.includes("every-little") && !progress.everyLittleRewarded) {
    progress.everyLittleCount = (progress.everyLittleCount || 0) + diceValues.filter((value) => value === 1).length;
    if (progress.everyLittleCount >= 7) addQuestReward(state, player, "everyLittleRewarded", 15);
  }

  if (mutations.includes("fast-straight") && !progress.fastStraightRewarded && state.currentRound <= 8) {
    if (getScoreValue(playerScores["s-straight"]) > 0 && getScoreValue(playerScores["l-straight"]) > 0) {
      addQuestReward(state, player, "fastStraightRewarded", 15);
    }
  }

  if (mutations.includes("no-time-to-waste") && !progress.noTimeRewarded && !progress.noTimeFailed) {
    if (state.turnRollCount !== 1) {
      progress.noTimeFailed = true;
    } else {
      progress.noTimeRemaining = Math.max(0, (progress.noTimeRemaining ?? 3) - 1);
      if (progress.noTimeRemaining === 0) addQuestReward(state, player, "noTimeRewarded", 15);
    }
  }

  if (mutations.includes("step-by-step") && !progress.stepRewarded && !progress.stepFailed) {
    const order = ["aces", "deuces", "threes", "fours", "fives", "sixes"];
    if (order.includes(category)) {
      if (category === order[progress.stepCount || 0]) {
        progress.stepCount = (progress.stepCount || 0) + 1;
        if (progress.stepCount === order.length) progress.stepRewarded = true;
      } else {
        progress.stepFailed = true;
      }
    }
  }

  if (mutations.includes("two-households") && !progress.twoHouseholdsRewarded) {
    if (category === "choice" && isFullHouse(diceValues)) progress.twoHouseholdsChoiceDone = true;
    if (progress.twoHouseholdsChoiceDone && getScoreValue(playerScores.fullhouse) > 0) {
      addQuestReward(state, player, "twoHouseholdsRewarded", 10);
    }
  }

  if (mutations.includes("holdout") && !progress.holdoutRewarded) {
    if (category === "fullhouse" && state.currentRound >= 9 && getScoreValue(score) > 0) {
      addQuestReward(state, player, "holdoutRewarded", 7);
    }
  }

  if (mutations.includes("cautious-straight") && !progress.cautiousRewarded && !progress.cautiousFailed) {
    if (category === "l-straight" && playerScores["s-straight"] === undefined) {
      progress.cautiousFailed = true;
    } else if (category === "l-straight") {
      addQuestReward(state, player, "cautiousRewarded", 7);
    }
  }

  if (mutations.includes("copycat") && !progress.copycatRewarded) {
    const opponent = player === 1 ? 2 : 1;
    const opponentScore = state.scores[opponent]?.[category];
    if (opponentScore !== undefined) {
      progress.copycatCount = (progress.copycatCount || 0) + 1;
      if (LOWER_CATEGORIES.has(category) && getScoreValue(score) === getScoreValue(opponentScore) && getScoreValue(score) > 0) {
        progress.copycatSpecialCleared = true;
        addQuestReward(state, player, "copycatRewarded", 10);
      } else if (progress.copycatCount >= 3) {
        addQuestReward(state, player, "copycatRewarded", 10);
      }
    }
  }

  if (mutations.includes("doubling") && !progress.doublingRewarded) {
    const values = SCORE_CATEGORIES
      .map((scoreCategory) => state.scores[player][scoreCategory]?.score)
      .filter((value) => Number(value) > 0);
    if (values.some((value, index) => values.indexOf(value) !== index)) {
      addQuestReward(state, player, "doublingRewarded", 10);
    }
  }

  if (mutations.includes("bounty-hunter") && state.bountyHunterTarget[player] === category) {
    const bounty = state.bountyHunterProgress[player];
    bounty.count += 1;
    if ((score?.score || 0) === 0) bounty.penaltyCount += 1;
    if (bounty.count === 3) {
      progress.questBonus = (progress.questBonus || 0) + Math.max(0, 15 - bounty.penaltyCount * 3);
    }
  }
}

function applyMutation(state, player, augmentId) {
  const mutation = mutationDefinitions[augmentId];
  if (!mutation) fail("INVALID_AUGMENT", "알 수 없는 증강임.");
  const target = mutation.target;
  if (state.activeMutations[player][target] === augmentId) fail("DUPLICATE_AUGMENT", "이미 보유한 증강임.");

  if (state.scores[player][target] !== undefined) {
    delete state.scores[player][target];
    state.extraTurns[player] += 1;
  }
  state.activeMutations[player][target] = augmentId;

  if (augmentId === "double-large-straight") state.upperBonusThreshold[player] = 60;
  if (augmentId === "equivalent-exchange") {
    state.equivalentExchangeUses[player] = 3;
    state.equivalentExchangePenalty[player] = 0;
  }
  if (augmentId === "promotion-die") state.promotionAcquiredRound[player] = state.currentRound;
  if (augmentId === "yacht-bank") {
    state.yachtBankState[player] = { turnsLeft: 3, accumulatedScore: 0, completed: false };
  }
  if (augmentId === "no-time-to-waste") {
    Object.assign(state.questProgress[player], { noTimeRemaining: 3, noTimeFailed: false, noTimeRewarded: false });
  }
  if (augmentId === "nozdormu") {
    state.questProgress[player].nozdormuTargetRound = state.currentRound <= 5 ? 5 : state.currentRound <= 8 ? 8 : 12;
  }
  if (augmentId === "bounty-hunter") {
    state.bountyHunterProgress[player] = { count: 0, penaltyCount: 0 };
    state.bountyHunterAcquiredRound[player] = state.currentRound;
  }
}

function setDraftOrActionPhase(state) {
  if (state.mode === "augmented" && state.currentPlayer === 1 && PHASE_ROUNDS.has(state.currentRound)) {
    const expected = expectedAugmentCount(state.currentRound);
    const draftPlayer = Array.from({ length: state.playerCount }, (_, index) => index + 1)
      .find((player) => getOwnedAugments(state, player).length < expected);
    if (draftPlayer) {
      state.phase = "draft";
      state.draftPlayer = draftPlayer;
      state.draftOptions = getDraftOptions(state, draftPlayer);
      state.turnTimeRemaining = 30;
      return;
    }
  }

  state.phase = "action";
  state.draftPlayer = null;
  state.draftOptions = [];
  state.rollsLeft = 3;
  state.turnRollCount = 0;
  state.dice = [];
  state.equivalentExchangeTurnUses[state.currentPlayer] = 0;
  state.turnTimeRemaining = getTurnDuration(state);
  assignBountyTarget(state);
}

function rewardNozdormuIfDue(state, player) {
  const progress = state.questProgress[player];
  if (
    getOwnedAugments(state, player).includes("nozdormu")
    && !progress.nozdormuRewarded
    && state.currentRound >= progress.nozdormuTargetRound
  ) {
    addQuestReward(state, player, "nozdormuRewarded", 9);
  }
}

function assignBountyTarget(state) {
  const player = state.currentPlayer;
  const bounty = state.bountyHunterProgress[player];
  if (!getOwnedAugments(state, player).includes("bounty-hunter") || bounty.count >= 3) {
    state.bountyHunterTarget[player] = null;
    return;
  }
  const unfilled = SCORE_CATEGORIES.filter((category) => state.scores[player][category] === undefined);
  const shuffled = seededShuffle(unfilled, `${state.seed}_BHTARGET_R${state.currentRound}_P${player}`);
  state.bountyHunterTarget[player] = shuffled[0] || null;
}

function hasCompleteScorecard(state, player) {
  return SCORE_CATEGORIES.every((category) => state.scores[player][category] !== undefined);
}

function advanceTurn(state) {
  if (state.isExtraTurnPhase && state.extraTurns[state.currentPlayer] > 0) {
    state.extraTurns[state.currentPlayer] -= 1;
  }

  if (state.currentRound <= 12) {
    if (state.currentPlayer < state.playerCount) {
      state.currentPlayer += 1;
    } else {
      state.currentPlayer = 1;
      state.currentRound += 1;
    }
    if (state.currentRound <= 12) {
      state.isExtraTurnPhase = false;
      beginTurn(state);
      return;
    }
  }

  const candidates = Array.from({ length: state.playerCount }, (_, index) => index + 1)
    .filter((player) => state.extraTurns[player] > 0 && !hasCompleteScorecard(state, player));
  if (!candidates.length) {
    state.ended = true;
    state.phase = "ended";
    state.turnTimeRemaining = 0;
    return;
  }
  state.currentPlayer = candidates.find((player) => player > state.currentPlayer) || candidates[0];
  state.isExtraTurnPhase = true;
  beginTurn(state);
}

export function beginTurn(state) {
  if (state.ended) return state;
  const player = state.currentPlayer;
  rewardNozdormuIfDue(state, player);

  const bank = state.yachtBankState[player];
  if (
    state.activeMutations[player]?.yacht === "yacht-bank"
    && bank?.turnsLeft === 0
    && state.scores[player].yacht === undefined
  ) {
    bank.completed = true;
    state.scores[player].yacht = { score: Math.min(bank.accumulatedScore, 15), bonus: 0, bonusDetails: [] };
    advanceTurn(state);
    return state;
  }

  setDraftOrActionPhase(state);
  state.revision += 1;
  return state;
}

export function createAuthoritativeGame({ mode = "normal", playerCount = 2, seed = "DEFAULT" } = {}) {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 4) {
    fail("INVALID_PLAYER_COUNT", "플레이어 수가 잘못됨.");
  }
  const state = {
    version: 1,
    revision: 0,
    mode: mode === "augmented" ? "augmented" : "normal",
    seed: String(seed),
    playerCount,
    currentRound: 1,
    currentPlayer: 1,
    phase: "action",
    draftPlayer: null,
    draftOptions: [],
    rollsLeft: 3,
    turnRollCount: 0,
    turnTimeRemaining: 45,
    dice: [],
    nextDieId: 1,
    scores: playerMap(playerCount, () => ({})),
    activeMutations: playerMap(playerCount, () => ({})),
    extraTurns: playerMap(playerCount, () => 0),
    isExtraTurnPhase: false,
    questProgress: playerMap(playerCount, () => ({ questBonus: 0 })),
    momentumState: playerMap(playerCount, () => "ready"),
    upperBonusThreshold: playerMap(playerCount, () => 63),
    yachtBankState: playerMap(playerCount, () => ({ turnsLeft: 0, accumulatedScore: 0, completed: false })),
    destroyedStrangeDice: playerMap(playerCount, () => false),
    promotionConsumed: playerMap(playerCount, () => false),
    promotionAcquiredRound: playerMap(playerCount, () => null),
    equivalentExchangeUses: playerMap(playerCount, () => 0),
    equivalentExchangePenalty: playerMap(playerCount, () => 0),
    equivalentExchangeTurnUses: playerMap(playerCount, () => 0),
    playerTableFlipUsed: playerMap(playerCount, () => false),
    bountyHunterTarget: playerMap(playerCount, () => null),
    bountyHunterAcquiredRound: playerMap(playerCount, () => null),
    bountyHunterProgress: playerMap(playerCount, () => ({ count: 0, penaltyCount: 0 })),
    ended: false
  };
  return beginTurn(state);
}

export function selectAugment(state, player, augmentId) {
  assertParticipant(state, player);
  if (state.ended) fail("GAME_ENDED", "이미 종료된 게임임.");
  if (state.phase !== "draft" || Number(player) !== state.draftPlayer) {
    fail("NOT_DRAFTING", "현재 증강을 선택할 수 없음.");
  }
  if (!state.draftOptions.includes(augmentId)) fail("AUGMENT_NOT_OFFERED", "제시되지 않은 증강임.");
  applyMutation(state, player, augmentId);

  const expected = expectedAugmentCount(state.currentRound);
  const nextDraftPlayer = Array.from({ length: state.playerCount }, (_, index) => index + 1)
    .find((candidate) => getOwnedAugments(state, candidate).length < expected);
  if (nextDraftPlayer) {
    state.draftPlayer = nextDraftPlayer;
    state.draftOptions = getDraftOptions(state, nextDraftPlayer);
    state.turnTimeRemaining = 30;
  } else {
    setDraftOrActionPhase(state);
  }
  state.revision += 1;
  return state;
}

function getDesiredDiceTypes(state, player) {
  const mutations = getOwnedAugments(state, player);
  const types = [];
  if (mutations.includes("strange-die") && !state.destroyedStrangeDice[player]) types.push("weird");
  if (mutations.includes("promotion-die") && !state.promotionConsumed[player]) types.push("promotion");
  if (mutations.includes("weighted-dice")) types.push("heavy");
  if (mutations.includes("golden-die")) types.push("golden");
  if (mutations.includes("8-sided")) types.push("octahedron", "octahedron");
  if (mutations.includes("couple-dice")) types.push("couple", "couple");
  if (mutations.includes("sevens-dice")) types.push("sevens", "sevens");
  return types;
}

function rollValue(type, promotionLevel, randomInt) {
  if (type === "promotion") return Math.min(6, 1 + promotionLevel);
  const faces = DIE_FACES[type] || DIE_FACES.normal;
  return faces[randomInt(faces.length)];
}

function rollUnkeptDice(state, player, randomInt) {
  const kept = state.turnRollCount === 1 ? [] : state.dice.filter((die) => die.kept);
  const desired = getDesiredDiceTypes(state, player);
  for (const die of kept) {
    const index = desired.indexOf(die.type);
    if (index >= 0) desired.splice(index, 1);
  }
  const totalAllowed = 5 + (getOwnedAugments(state, player).includes("strange-die") && !state.destroyedStrangeDice[player] ? 1 : 0);
  while (kept.length + desired.length < totalAllowed) desired.push("normal");

  const promotionLevel = Math.max(0, state.currentRound - (state.promotionAcquiredRound[player] || state.currentRound));
  const rolled = desired.map((type) => ({
    id: state.nextDieId++,
    type,
    value: rollValue(type, promotionLevel, randomInt),
    promotionLevel: type === "promotion" ? promotionLevel : 0,
    kept: false
  }));
  state.dice = [...kept, ...rolled].map((die) => ({ ...die, kept: false }));
}

export function rollDice(state, player, { tableFlip = false, randomInt = secureRandomInt } = {}) {
  assertPlayerTurn(state, player);
  if (state.phase !== "action") fail("INVALID_PHASE", "현재 주사위를 굴릴 수 없음.");
  if (typeof randomInt !== "function") fail("INVALID_RANDOM_SOURCE", "난수 생성기가 잘못됨.");

  if (tableFlip) {
    if (!getOwnedAugments(state, player).includes("table-flip")) fail("AUGMENT_REQUIRED", "판 뒤집기 증강이 없음.");
    if (state.playerTableFlipUsed[player]) fail("TABLE_FLIP_USED", "이미 판 뒤집기를 사용함.");
    if (state.turnRollCount < 1) fail("ROLL_REQUIRED", "첫 굴림 후 판 뒤집기를 사용할 수 있음.");
    state.playerTableFlipUsed[player] = true;
  } else if (state.rollsLeft > 0) {
    state.rollsLeft -= 1;
    state.turnRollCount += 1;
  } else if (state.equivalentExchangeUses[player] > 0 && getOwnedAugments(state, player).includes("equivalent-exchange")) {
    state.equivalentExchangeUses[player] -= 1;
    state.equivalentExchangePenalty[player] += 5;
    state.equivalentExchangeTurnUses[player] += 1;
    state.turnRollCount += 1;
  } else {
    fail("NO_ROLLS_LEFT", "남은 굴리기가 없음.");
  }

  rollUnkeptDice(state, player, randomInt);
  state.revision += 1;
  return state;
}

export function setDieKept(state, player, dieId, isKept) {
  assertPlayerTurn(state, player);
  if (state.phase !== "action" || state.turnRollCount < 1) fail("ROLL_REQUIRED", "굴린 주사위만 킵할 수 있음.");
  const die = state.dice.find((item) => item.id === Number(dieId));
  if (!die) fail("DIE_NOT_FOUND", "주사위를 찾을 수 없음.");
  if (isKept && !die.kept && state.dice.filter((item) => item.kept).length >= 5) {
    fail("KEEP_LIMIT", "최대 5개의 주사위만 킵할 수 있음.");
  }
  die.kept = Boolean(isKept);
  state.revision += 1;
  return state;
}

function applyMomentum(state, player, score) {
  const hasMomentum = getOwnedAugments(state, player).includes("momentum");
  if (!hasMomentum) return score;
  const result = { ...score, bonusDetails: [...(score.bonusDetails || [])] };
  if (state.momentumState[player] === "ready" && result.score === 0) {
    state.momentumState[player] = "active";
  } else if (state.momentumState[player] === "active" && result.score > 0) {
    const original = result.score + (result.bonus || 0);
    const increased = Math.floor(original * 1.5);
    const bonus = increased - original;
    result.bonus = (result.bonus || 0) + bonus;
    result.bonusDetails.push({ value: bonus, color: "#D4AF37" });
    state.momentumState[player] = "used";
  }
  return result;
}

function storeScore(state, player, category, score, scoringDice) {
  const finalScore = applyMomentum(state, player, score);
  state.scores[player][category] = finalScore;
  applyQuestProgress(state, player, category, finalScore, scoringDice);

  if (state.dice.some((die) => die.type === "weird" && die.value === 6)) {
    state.destroyedStrangeDice[player] = true;
  }
  if (scoringDice.some((die) => die.type === "promotion" && die.value === 6)) {
    state.promotionConsumed[player] = true;
  }

  const isYacht = category === "yacht" && Object.values(scoringDice.reduce((counts, die) => {
    counts[die.value] = (counts[die.value] || 0) + 1;
    return counts;
  }, {})).some((count) => count >= 5);
  if (isYacht) {
    for (let index = 1; index <= state.playerCount; index += 1) {
      state.yachtBankState[index].completed = true;
    }
  }

  const bank = state.yachtBankState[player];
  if (state.activeMutations[player]?.yacht === "yacht-bank" && bank.turnsLeft > 0 && !bank.completed) {
    const keptSum = state.dice
      .filter((die) => die.kept && die.type !== "weird")
      .reduce((sum, die) => sum + die.value, 0);
    bank.accumulatedScore = Math.min(15, bank.accumulatedScore + keptSum);
    bank.turnsLeft -= 1;
  }
  applyUpperBonus(state, player);
}

export function scoreCategory(state, player, category) {
  assertPlayerTurn(state, player);
  if (state.phase !== "action") fail("INVALID_PHASE", "현재 점수를 기입할 수 없음.");
  if (!SCORE_CATEGORIES.includes(category)) fail("INVALID_CATEGORY", "알 수 없는 족보임.");
  if (state.scores[player][category] !== undefined) fail("CATEGORY_FILLED", "이미 기입된 족보임.");
  if (state.turnRollCount < 1) fail("ROLL_REQUIRED", "점수 기입 전에 주사위를 굴려야 함.");

  const scoringDice = getScoringDice(state, player);
  const scores = calculateScores(
    scoringDice.map((die) => die.value),
    state.activeMutations[player],
    getScoreContext(state, player, scoringDice)
  );
  storeScore(state, player, category, scores[category], scoringDice);
  state.revision += 1;
  advanceTurn(state);
  return state;
}

function forceBestScore(state) {
  const player = state.currentPlayer;
  const unfilled = SCORE_CATEGORIES.filter((category) => state.scores[player][category] === undefined);
  if (!unfilled.length) {
    advanceTurn(state);
    return;
  }

  let scoringDice = [];
  let scores;
  if (state.turnRollCount < 1) {
    scores = calculateScores([0, 0, 0, 0, 0], state.activeMutations[player], { bank: state.yachtBankState[player].accumulatedScore, fullDice: [] });
  } else {
    try {
      scoringDice = getScoringDice(state, player);
      scores = calculateScores(
        scoringDice.map((die) => die.value),
        state.activeMutations[player],
        getScoreContext(state, player, scoringDice)
      );
    } catch {
      scores = Object.fromEntries(SCORE_CATEGORIES.map((category) => [category, { score: 0, bonus: 0, bonusDetails: [] }]));
    }
  }
  const category = unfilled.reduce((best, candidate) => (
    getScoreValue(scores[candidate]) > getScoreValue(scores[best]) ? candidate : best
  ), unfilled[0]);
  storeScore(state, player, category, scores[category], scoringDice);
  state.revision += 1;
  advanceTurn(state);
}

export function expirePhase(state, { randomInt = secureRandomInt } = {}) {
  if (state.ended) return state;
  if (state.phase === "draft") {
    selectAugment(state, state.draftPlayer, state.draftOptions[0]);
  } else {
    forceBestScore(state);
  }
  return state;
}

export function getPlayerTotal(state, player) {
  let total = Object.values(state.scores[player] || {}).reduce((sum, score) => sum + getScoreValue(score), 0);
  const bank = state.yachtBankState[player];
  if (state.activeMutations[player]?.yacht === "yacht-bank" && state.scores[player]?.yacht === undefined) {
    total += Math.min(bank?.accumulatedScore || 0, 15);
  }
  total += state.questProgress[player]?.questBonus || 0;
  total -= state.equivalentExchangePenalty[player] || 0;
  return total;
}

export function isCompleteGame(state) {
  return state.ended && Array.from({ length: state.playerCount }, (_, index) => index + 1)
    .every((player) => hasCompleteScorecard(state, player));
}

export function getPublicGameState(state) {
  const snapshot = JSON.parse(JSON.stringify(state));
  delete snapshot.seed;
  delete snapshot.nextDieId;
  return snapshot;
}
