import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { simulateServerRoll } from '../src/serverDicePhysics.js';
import { getPhysicalFace } from '../src/diceFace.js';

assert.equal(getPhysicalFace({ x: 0, y: 0, z: 0, w: 1 }), 1);
assert.equal(getPhysicalFace({ x: -Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2 }), 2);
assert.equal(getPhysicalFace({ x: 0, y: 0, z: Math.SQRT1_2, w: Math.SQRT1_2 }), 3);

const configs = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, type: index === 4 ? 'heavy' : index === 5 ? 'octahedron' : 'normal' }));
const first = simulateServerRoll({ seed: 'deterministic-test', dice: configs });
const second = simulateServerRoll({ seed: 'deterministic-test', dice: configs });
assert.deepEqual(second, first);
assert.equal(first.dice.length, 6);
assert.ok(first.dice.every((die) => Number.isFinite(die.value) && die.frames.length > 1));
assert.ok(first.dice.every((die) => die.frames.at(-1).slice(1).every(Number.isFinite)));
assert.ok(JSON.stringify(first).length < 65536, 'server roll payload exceeds 64KB');

for (let index = 0; index < 10; index++) simulateServerRoll({ seed: `warmup-${index}`, dice: configs });
const samples = [];
for (let index = 0; index < 1000; index++) {
  const started = performance.now();
  simulateServerRoll({ seed: `benchmark-${index}`, dice: configs });
  samples.push(performance.now() - started);
}
samples.sort((a, b) => a - b);
const p95 = samples[Math.floor(samples.length * 0.95)];
console.log(`server dice physics p95=${p95.toFixed(3)}ms max=${samples.at(-1).toFixed(3)}ms`);
assert.ok(p95 <= 8, `server dice physics p95 ${p95.toFixed(3)}ms exceeds 8ms gate`);

const flipConfigs = first.dice.map((die, index) => ({
  ...configs[index],
  finalPosition: { x: die.finalTransform[0], y: die.finalTransform[1], z: die.finalTransform[2] },
  finalQuaternion: { x: die.finalTransform[3], y: die.finalTransform[4], z: die.finalTransform[5], w: die.finalTransform[6] }
}));
const flipSamples = [];
for (let index = 0; index < 200; index++) {
  const started = performance.now();
  simulateServerRoll({ seed: `flip-benchmark-${index}`, dice: flipConfigs, mode: 'flip' });
  flipSamples.push(performance.now() - started);
}
flipSamples.sort((a, b) => a - b);
const flipP95 = flipSamples[Math.floor(flipSamples.length * 0.95)];
console.log(`server table flip physics p95=${flipP95.toFixed(3)}ms max=${flipSamples.at(-1).toFixed(3)}ms`);
assert.ok(flipP95 <= 8, `server table flip physics p95 ${flipP95.toFixed(3)}ms exceeds 8ms gate`);
console.log('server dice physics tests passed');
