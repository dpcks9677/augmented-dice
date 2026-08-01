import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { prepareCorduroyGeometry, YachtTrayModel } from '../src/YachtTrayModel.js';

const bytes = fs.readFileSync(new URL('../public/models/yacht-tray.stl', import.meta.url));
const geometry = new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
geometry.translate(-125, -110, -14);
geometry.rotateX(-Math.PI / 2);
geometry.computeVertexNormals();

const groups = prepareCorduroyGeometry(geometry);

assert.deepEqual(groups.map(group => group.count), [101022, 177, 0, 213]);
assert.equal(groups.reduce((total, group) => total + group.count, 0), geometry.getAttribute('position').count);
assert.equal(geometry.getAttribute('uv').count, geometry.getAttribute('position').count);
assert.ok([...geometry.getAttribute('uv').array].every(Number.isFinite));
assert.ok([...geometry.getAttribute('uv').array.slice(0, groups[0].count * 2)].some(value => value !== 0));

const materialModel = new YachtTrayModel();
materialModel.mesh = new THREE.Mesh(geometry, [
  new THREE.MeshStandardMaterial(),
  new THREE.MeshStandardMaterial(),
  new THREE.MeshStandardMaterial(),
  new THREE.MeshStandardMaterial()
]);
materialModel.corduroyMaterials = materialModel.mesh.material;
materialModel.applyMaterialGroups();
assert.deepEqual(materialModel.mesh.geometry.groups.map(group => group.materialIndex), [2, 1, 2, 3]);
materialModel.setCorduroyEnabled(false);
assert.deepEqual(materialModel.mesh.geometry.groups.map(group => group.materialIndex), [2, 0, 2, 3]);
materialModel.setPlasticEnabled(false);
assert.deepEqual(materialModel.mesh.geometry.groups.map(group => group.materialIndex), [0]);
materialModel.setCorduroyEnabled(true);
assert.deepEqual(materialModel.mesh.geometry.groups.map(group => group.materialIndex), [0, 1, 0, 0]);
materialModel.setPlasticEnabled(true);
assert.deepEqual(materialModel.mesh.geometry.groups.map(group => group.materialIndex), [2, 1, 2, 3]);

console.log('Yacht tray corduroy geometry test passed.');
