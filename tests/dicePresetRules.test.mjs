import assert from 'node:assert/strict';
import { getDicePresetFileName, getDicePresetKey, isPresetCompatible } from '../src/dicePresetRules.js';

const normal = (count) => Array.from({ length: count }, () => ({ type: 'normal' }));
assert.equal(getDicePresetKey(normal(6)), 'normal_6');
assert.equal(getDicePresetKey([...normal(3), { type: 'octahedron' }, { type: 'octahedron' }]), 'mixed_3normal_2octa');
assert.equal(getDicePresetKey(normal(5), { isFlip: true }), 'flip_5');
assert.equal(getDicePresetFileName(normal(6)), 'dice_presets_normal_6.json');
assert.equal(isPresetCompatible({ frames: [[[], []], [[], []]] }, 2), true);
assert.equal(isPresetCompatible({ frames: [[[]]] }, 2), false);
assert.equal(isPresetCompatible({ frames: [] }, 0), false);

console.log('dice preset rules tests passed');
