import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getGroundShadowRotation, isInsidePlayBounds } from '../src/DiceEngine.js';

const quarterTurn = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI / 4
);
assert.ok(Math.abs(getGroundShadowRotation(quarterTurn) - Math.PI / 4) < 1e-10);

const playBounds = { minX: -10, maxX: 10, minZ: -8, maxZ: 8 };
assert.equal(isInsidePlayBounds({ x: 0, z: 0 }, playBounds), true);
assert.equal(isInsidePlayBounds({ x: 0, z: 9 }, playBounds), false);

console.log('dice shadow checks passed');
