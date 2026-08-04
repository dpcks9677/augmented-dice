import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const runtime = readFileSync(new URL('../src/gameRuntime.js', import.meta.url), 'utf8');
const style = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

assert.ok(main.trim().split(/\r?\n/).length <= 3);
assert.ok(main.includes("from './gameRuntime.js'"));
for (const moduleName of ['appShell', 'profileController', 'gameLog', 'gameMenu', 'landingDice']) {
  assert.ok(runtime.includes(`./${moduleName}.js`), `${moduleName} must be composed by gameRuntime`);
}
assert.ok(!runtime.includes('function renderProfileModal'));
assert.ok(!runtime.includes('function renderGameLogHistory'));
assert.ok(!runtime.includes('function renderCompendiumAugments'));
assert.match(runtime, /import \{[^}]*showAugment[^}]*\} from ["']\.\/gameLog\.js["']/);
assert.match(runtime, /import \{[^}]*getCategoryDisplayName[^}]*\} from ["']\.\/gameLog\.js["']/);
assert.ok(runtime.includes('btn-table-flip btn-new-augment-action'));
for (const duelStatus of ['결투 중!', '결투 승리!', '결투 패배', '결투 무승부']) {
  assert.ok(runtime.includes(duelStatus));
}
assert.ok(style.includes('width: max-content;'));
assert.ok(style.includes('white-space: nowrap;'));

console.log('main structure checks passed');
