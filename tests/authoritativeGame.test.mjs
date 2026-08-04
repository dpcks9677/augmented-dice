import assert from "node:assert/strict";
import {
  GameRuleError,
  beginTurn,
  createAuthoritativeGame,
  expirePhase,
  getPlayerTotal,
  isCompleteGame,
  previewScores,
  rollDice,
  scoreCategory,
  selectAugment,
  setDieKept,
  useAugmentAction
} from "../src/authoritativeGame.js";

const sequence = (...values) => {
  let index = 0;
  return (max) => values[index++ % values.length] % max;
};

const normal = createAuthoritativeGame({ mode: "normal", seed: "test" });
rollDice(normal, 1, { randomInt: sequence(0, 1, 2, 3, 4) });
assert.deepEqual(normal.dice.map((die) => die.value), [1, 2, 3, 4, 5]);
assert.equal(previewScores(normal, 1)["l-straight"].score, 30);
scoreCategory(normal, 1, "l-straight");
assert.equal(normal.scores[1]["l-straight"].score, 30);
assert.equal(normal.currentPlayer, 2);

assert.throws(
  () => rollDice(normal, 1, { randomInt: sequence(0) }),
  (error) => error instanceof GameRuleError && error.code === "NOT_YOUR_TURN"
);

const augmented = createAuthoritativeGame({ mode: "augmented", seed: "aug-test" });
assert.equal(augmented.phase, "draft");
const p1Option = augmented.draftOptions[0];
selectAugment(augmented, 1, p1Option);
assert.equal(augmented.draftPlayer, 2);
selectAugment(augmented, 2, augmented.draftOptions[0]);
assert.equal(augmented.phase, "action");

const conflict = createAuthoritativeGame({ mode: "augmented", seed: "conflict" });
conflict.activeAugments[1].enhancement = "8-sided";
conflict.draftPlayer = 1;
conflict.draftOptions = ["strange-die"];
assert.throws(
  () => selectAugment(conflict, 1, "strange-die"),
  (error) => error instanceof GameRuleError && error.code === "AUGMENT_CONFLICT"
);

const golden = createAuthoritativeGame({ mode: "normal", seed: "golden" });
golden.activeAugments[1].eh4 = "golden-die";
rollDice(golden, 1, { randomInt: sequence(0, 0, 0, 0, 0) });
const goldenDie = golden.dice.find((die) => die.type === "golden");
assert.equal(goldenDie.value, 1);
assert.equal(previewScores(golden, 1).aces.bonus, 2);

const couple = createAuthoritativeGame({ mode: "normal", seed: "couple" });
couple.activeAugments[1].eh9 = "couple-dice";
rollDice(couple, 1, { randomInt: sequence(2, 2, 0, 0, 0) });
assert.equal(previewScores(couple, 1).choice.bonus, 3);

const sevens = createAuthoritativeGame({ mode: "normal", seed: "sevens" });
sevens.activeAugments[1].threes = "prime-numbers";
sevens.activeAugments[1]["l-straight"] = "high-dice";
sevens.dice = [2, 3, 5, 7, 7].map((value, index) => ({ id: index + 1, type: "sevens", value, kept: false }));
sevens.turnRollCount = 1;
assert.equal(previewScores(sevens, 1).threes.score, 12);
sevens.dice = [4, 5, 6, 7, 7].map((value, index) => ({ id: index + 1, type: "sevens", value, kept: false }));
assert.equal(previewScores(sevens, 1)["l-straight"].score, 35);

const everyLittle = createAuthoritativeGame({ mode: "normal", seed: "ones" });
everyLittle.activeAugments[1].q7 = "every-little";
everyLittle.dice = [1, 1, 1, 1, 1].map((value, index) => ({ id: index + 1, type: "normal", value, kept: false }));
everyLittle.turnRollCount = 1;
scoreCategory(everyLittle, 1, "aces");
assert.equal(everyLittle.questProgress[1].everyLittleCount, 5);

const noTime = createAuthoritativeGame({ mode: "normal", seed: "no-time" });
noTime.activeAugments[1].q2 = "no-time-to-waste";
noTime.questProgress[1].noTimeRemaining = 3;
rollDice(noTime, 1, { randomInt: sequence(0) });
rollDice(noTime, 1, { randomInt: sequence(0) });
scoreCategory(noTime, 1, "aces");
assert.equal(noTime.questProgress[1].noTimeFailed, true);

const noTimeSuccess = createAuthoritativeGame({ mode: "normal", seed: "no-time-success" });
noTimeSuccess.activeAugments[1].q2 = "no-time-to-waste";
noTimeSuccess.questProgress[1].noTimeRemaining = 3;
for (const category of ["aces", "deuces", "threes"]) {
  rollDice(noTimeSuccess, 1, { randomInt: sequence(0) });
  scoreCategory(noTimeSuccess, 1, category);
  rollDice(noTimeSuccess, 2, { randomInt: sequence(0) });
  scoreCategory(noTimeSuccess, 2, category);
}
assert.equal(noTimeSuccess.questProgress[1].noTimeRewarded, true);
assert.equal(noTimeSuccess.questProgress[1].questBonus, 15);

const momentum = createAuthoritativeGame({ mode: "normal", seed: "momentum" });
momentum.activeAugments[1].eh3 = "momentum";
rollDice(momentum, 1, { randomInt: sequence(1) });
scoreCategory(momentum, 1, "aces");
assert.equal(momentum.momentumState[1], "active");
rollDice(momentum, 2, { randomInt: sequence(0) });
scoreCategory(momentum, 2, "aces");
rollDice(momentum, 1, { randomInt: sequence(5) });
scoreCategory(momentum, 1, "choice");
assert.equal(momentum.scores[1].choice.score, 30);
assert.equal(momentum.scores[1].choice.bonus, 15);
assert.equal(momentum.momentumState[1], "used");

const nozdormu = createAuthoritativeGame({ mode: "normal", seed: "nozdormu" });
nozdormu.activeAugments[1].q10 = "nozdormu";
nozdormu.questProgress[1].nozdormuTargetRound = 5;
beginTurn(nozdormu);
assert.equal(nozdormu.turnTimeRemaining, 15);

const keep = createAuthoritativeGame({ mode: "normal", seed: "keep" });
rollDice(keep, 1, { randomInt: sequence(0, 1, 2, 3, 4) });
setDieKept(keep, 1, keep.dice[0].id, true);
rollDice(keep, 1, { randomInt: sequence(5, 5, 5, 5) });
assert.equal(keep.dice.some((die) => die.value === 1), true);

const penalty = createAuthoritativeGame({ mode: "normal", seed: "penalty" });
penalty.equivalentExchangeUses[1] = 3;
penalty.activeAugments[1].eh12 = "equivalent-exchange";
rollDice(penalty, 1, { randomInt: sequence(0) });
rollDice(penalty, 1, { randomInt: sequence(0) });
rollDice(penalty, 1, { randomInt: sequence(0) });
rollDice(penalty, 1, { randomInt: sequence(0) });
assert.equal(penalty.equivalentExchangePenalty[1], 5);
assert.equal(getPlayerTotal(penalty, 1), -5);

const coin = createAuthoritativeGame({ mode: "normal", seed: "coin" });
coin.activeAugments[1].eh14 = "coin-toss";
rollDice(coin, 1, { randomInt: sequence(0) });
useAugmentAction(coin, 1, "coin-toss", { randomInt: sequence(1, 1, 1) });
assert.equal(coin.coinTossState[1].heads, 3);
assert.equal(coin.upperBonusThreshold[1], 57);
assert.throws(() => useAugmentAction(coin, 1, "coin-toss"), (error) => error.code === "AUGMENT_USED");

const randomBox = createAuthoritativeGame({ mode: "augmented", seed: "random-box" });
randomBox.phase = "draft";
randomBox.draftPlayer = 1;
randomBox.draftOptions = ["random-box"];
selectAugment(randomBox, 1, "random-box");
assert.equal(randomBox.upperBonusThreshold[1], 58);
assert.equal(randomBox.activeAugments[1].eh15, "random-box");
assert.equal(randomBox.randomBoxAward[1], null);
selectAugment(randomBox, 2, randomBox.draftOptions[0]);
assert.ok(randomBox.randomBoxAward[1]);
assert.notEqual(randomBox.randomBoxAward[1], "random-box");
assert.equal(Object.values(randomBox.activeAugments[1]).includes("random-box"), false);
assert.equal(Object.values(randomBox.activeAugments[1]).includes(randomBox.randomBoxAward[1]), true);
assert.equal(randomBox.draftSelections[1], 1);

for (let seedIndex = 0; seedIndex < 64; seedIndex += 1) {
  const holdoutBlocked = createAuthoritativeGame({ mode: "augmented", seed: `holdout-blocked-${seedIndex}` });
  holdoutBlocked.currentRound = 9;
  holdoutBlocked.scores[1].fullhouse = { score: 25, bonus: 0, bonusDetails: [] };
  beginTurn(holdoutBlocked);
  assert.equal(holdoutBlocked.draftOptions.includes("holdout"), false);
}

const alchemy = createAuthoritativeGame({ mode: "normal", seed: "alchemy" });
alchemy.activeAugments[1].eh19 = "dice-alchemy";
rollDice(alchemy, 1, { randomInt: sequence(0, 1, 2, 3, 4) });
alchemy.dice[0].kept = true;
useAugmentAction(alchemy, 1, "dice-alchemy");
assert.deepEqual(alchemy.dice.map((die) => die.value), [1, 1, 2, 3, 4]);

const gambit = createAuthoritativeGame({ mode: "normal", seed: "gambit" });
gambit.activeAugments[1].eh16 = "gambit";
useAugmentAction(gambit, 1, "gambit");
rollDice(gambit, 1, { randomInt: sequence(0) });
assert.equal(gambit.dice.length, 4);
assert.equal(gambit.dice.every((die) => die.type === "normal"), true);
scoreCategory(gambit, 1, "aces");
rollDice(gambit, 2, { randomInt: sequence(0) });
scoreCategory(gambit, 2, "aces");
rollDice(gambit, 1, { randomInt: sequence(0) });
assert.equal(gambit.dice.length, 6);

const multiplier = createAuthoritativeGame({ mode: "normal", seed: "multiplier" });
multiplier.currentRound = 9;
multiplier.activeAugments[1].eh3 = "momentum";
multiplier.activeAugments[1].eh17 = "double-down";
multiplier.momentumState[1] = "active";
useAugmentAction(multiplier, 1, "double-down");
rollDice(multiplier, 1, { randomInt: sequence(5) });
scoreCategory(multiplier, 1, "choice");
assert.equal(multiplier.scores[1].choice.score + multiplier.scores[1].choice.bonus, 60);

const piggy = createAuthoritativeGame({ mode: "normal", seed: "piggy" });
piggy.activeAugments[1].eh18 = "piggy-bank";
rollDice(piggy, 1, { randomInt: sequence(0) });
scoreCategory(piggy, 1, "aces");
assert.equal(piggy.piggyBankState[1].balance, 6);
piggy.currentPlayer = 1;
beginTurn(piggy);
rollDice(piggy, 1, { randomInt: sequence(0) });
scoreCategory(piggy, 1, "deuces");
assert.equal(piggy.piggyBankState[1].balance, 0);
assert.equal(piggy.globalBonus[1], 12);

const duel = createAuthoritativeGame({ mode: "normal", seed: "duel" });
duel.activeAugments[1].eh13 = "duel";
duel.duelState[1] = { round: 1, ownerScore: null, opponentScore: null, resolved: false };
rollDice(duel, 1, { randomInt: sequence(5) });
scoreCategory(duel, 1, "choice");
rollDice(duel, 2, { randomInt: sequence(0) });
scoreCategory(duel, 2, "choice");
assert.equal(duel.globalBonus[1], 10);

const prophet = createAuthoritativeGame({ mode: "normal", seed: "prophet" });
prophet.activeAugments[1].q12 = "prophet";
prophet.prophetState[1] = { remaining: 3, numbers: [5, 10, 15], successes: 0, turnKey: "manual" };
rollDice(prophet, 1, { randomInt: sequence(0) });
scoreCategory(prophet, 1, "aces");
assert.equal(prophet.questProgress[1].questBonus, 7);
assert.equal(prophet.prophetState[1].remaining, 2);

for (const mode of ["normal", "augmented"]) {
  const fullGame = createAuthoritativeGame({ mode, seed: `full-${mode}` });
  let transitions = 0;
  while (!fullGame.ended && transitions < 200) {
    expirePhase(fullGame);
    transitions += 1;
  }
  assert.equal(fullGame.ended, true, `${mode} game did not end`);
  assert.equal(isCompleteGame(fullGame), true, `${mode} scorecards are incomplete`);
  assert.equal(Object.keys(fullGame.scores[1]).length, 12);
  assert.equal(Object.keys(fullGame.scores[2]).length, 12);
}

console.log("authoritativeGame tests passed");
