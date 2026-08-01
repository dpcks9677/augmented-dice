import assert from 'node:assert/strict';
import { alignKeyframesToFinalQuaternion, interpolateKeyframes } from '../src/onlineDiceAnimator.js';

const frames = [
  { t: 0, position: { x: 0, y: 0, z: 0 }, quaternion: { x: 0, y: 0, z: 0, w: 1 } },
  { t: 1000, position: { x: 10, y: 4, z: -2 }, quaternion: { x: 0, y: 0, z: 1, w: 0 } }
];
assert.deepEqual(interpolateKeyframes(frames, -1).position, frames[0].position);
assert.deepEqual(interpolateKeyframes(frames, 1001).position, frames[1].position);
const middle = interpolateKeyframes(frames, 500);
assert.equal(middle.position.x, 5);
assert.equal(Math.round(Math.hypot(middle.quaternion.x, middle.quaternion.y, middle.quaternion.z, middle.quaternion.w) * 1000), 1000);

const authoritativeFrames = [
  { t: 0, position: { x: 3, y: 2, z: 1 }, quaternion: { x: 0, y: 0, z: 1, w: 0 } },
  { t: 500, position: { x: -2, y: 5, z: 0 }, quaternion: { x: 0, y: 0, z: 1, w: 0 } }
];
assert.equal(interpolateKeyframes(authoritativeFrames, 250).position.x, 0.5);
assert.deepEqual(interpolateKeyframes(authoritativeFrames, 250).quaternion, authoritativeFrames[0].quaternion);
assert.deepEqual(interpolateKeyframes(authoritativeFrames, 500).position, authoritativeFrames[1].position);
const alignedFrames = alignKeyframesToFinalQuaternion(authoritativeFrames, { x: 0, y: 1, z: 0, w: 0 });
assert.deepEqual(alignedFrames.map((frame) => frame.position), authoritativeFrames.map((frame) => frame.position));
assert.ok(Math.abs(alignedFrames.at(-1).quaternion.y) > 0.9999);

console.log('online dice animator tests passed');
