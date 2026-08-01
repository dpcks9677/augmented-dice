import assert from 'node:assert/strict';
import { createLocalRollOutcome } from '../src/localDiceResultProvider.js';

const zero = () => 0;
const normalSix = createLocalRollOutcome({
  configs: Array.from({ length: 6 }, () => ({ type: 'normal' })),
  randomInt: zero
});
assert.equal(normalSix.dice.length, 6);
assert.equal(normalSix.presetKey, 'normal_6');
assert.deepEqual(normalSix.rolledDice.map((die) => die.value), [1, 1, 1, 1, 1, 1]);

const mixed = createLocalRollOutcome({
  configs: [{ type: 'normal' }, { type: 'octahedron' }],
  keptDice: [{ id: 7, type: 'golden', value: 3 }],
  nextDieId: 8,
  randomInt: zero
});
assert.equal(mixed.presetKey, 'mixed_1normal_1octa');
assert.equal(mixed.dice[0].kept, true);
assert.deepEqual(mixed.rolledDice.map((die) => die.id), [8, 9]);

const special = createLocalRollOutcome({
  configs: [{ type: 'heavy' }, { type: 'promotion', promotionLevel: 4 }, { type: 'sevens' }],
  randomInt: zero
});
assert.deepEqual(special.rolledDice.map((die) => die.value), [4, 5, 2]);

console.log('local dice result provider tests passed');
