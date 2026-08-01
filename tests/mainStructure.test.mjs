import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../src/gameRuntime.js', import.meta.url), 'utf8');

assert.ok(main.trim().split(/\r?\n/).length <= 3);
assert.ok(main.includes("from './gameRuntime.js'"));
for (const moduleName of ['appShell', 'profileController', 'gameLog', 'gameMenu', 'landingDice']) {
  assert.ok(runtime.includes(`./${moduleName}.js`), `${moduleName} must be composed by gameRuntime`);
}
assert.ok(!runtime.includes('function renderProfileModal'));
assert.ok(!runtime.includes('function renderGameLogHistory'));
assert.ok(!runtime.includes('function renderCompendiumAugments'));

console.log('main structure checks passed');
