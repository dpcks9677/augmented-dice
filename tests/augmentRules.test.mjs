import assert from 'node:assert/strict';
import { AUGMENT_CONFLICTS, canAcquireAugment, hasAugmentConflict } from '../src/augmentRules.js';

assert.deepEqual(new Set(AUGMENT_CONFLICTS['8-sided']), new Set(['table-flip', 'strange-die']));
assert.equal(hasAugmentConflict(['strange-die'], '8-sided'), true);
assert.equal(hasAugmentConflict(['8-sided'], 'strange-die'), true);
assert.equal(hasAugmentConflict(['table-flip'], '8-sided'), true);
assert.equal(hasAugmentConflict(['8-sided'], 'table-flip'), true);
assert.equal(canAcquireAugment(['golden-die'], '8-sided'), true);
assert.equal(canAcquireAugment(['8-sided'], '8-sided'), false);

console.log('augment rules tests passed');
