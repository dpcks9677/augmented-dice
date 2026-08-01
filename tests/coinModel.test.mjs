import assert from 'assert';
import { 
  createCoinGeometry, 
  createCoinMesh, 
  getCoinSideFromQuaternion 
} from '../src/CoinModel.js';
import * as THREE from 'three';

// 1. 동전 지오메트리 생성 테스트
const geo = createCoinGeometry();
assert.ok(geo, 'Coin geometry should be created');
assert.ok(geo.attributes.position.count > 0, 'Position attribute count should be greater than 0');

// 2. 동전 메쉬 생성 테스트
const coinMesh = createCoinMesh();
assert.ok(coinMesh, 'Coin mesh should be created');
assert.strictEqual(coinMesh.name, 'CoinMesh', 'Mesh name should be CoinMesh');

// 3. 쿼터니언 기반 면 판정 테스트
const identityQuat = new THREE.Quaternion();
assert.strictEqual(getCoinSideFromQuaternion(identityQuat), 'heads', 'Identity quaternion should be heads');

const flippedQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
assert.strictEqual(getCoinSideFromQuaternion(flippedQuat), 'tails', 'Flipped quaternion should be tails');

console.log('✅ CoinModel unit tests passed successfully!');
