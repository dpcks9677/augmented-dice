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
  setDieKept
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
