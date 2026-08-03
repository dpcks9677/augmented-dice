import assert from 'node:assert/strict';
import {
  calculateAdoptionRate,
  createAugmentProgressSession,
  getAugmentAchievementDefinitions,
  getAugmentTelemetryDefinitions,
  createMasteryDefinition,
  recordAugmentMetric,
  recordAugmentOffer,
  recordAugmentSelection
} from '../src/augmentProgress.js';
import { formatAchievementCompletedAt } from '../src/achievementUI.js';

const session = createAugmentProgressSession('test-session');
recordAugmentOffer(session, ['lucky-sevens', 'lucky-sevens', 'perfect-squares'], '1:1');
recordAugmentOffer(session, ['lucky-sevens'], '1:1');
recordAugmentSelection(session, 'lucky-sevens');
recordAugmentSelection(session, 'lucky-sevens');
recordAugmentMetric(session, 'table-flip', 'uses');
recordAugmentMetric(session, 'table-flip', 'unknown');

assert.deepEqual(session.appearances, { 'lucky-sevens': 1, 'perfect-squares': 1 });
assert.deepEqual(session.selections, { 'lucky-sevens': 1 });
assert.deepEqual(session.metrics, { 'table-flip': { uses: 1 } });
assert.equal(calculateAdoptionRate({ appearances: 4, selections: 1 }), 25);
assert.equal(createMasteryDefinition({ augmentId: 'lucky-sevens', name: '럭키 세븐' }).target, 10);
assert.equal(createMasteryDefinition({ augmentId: 'lucky-sevens', name: '럭키 세븐' }).description, '럭키 세븐을(를) 선택하고 게임을 10번 완료하세요.');
assert.deepEqual(getAugmentTelemetryDefinitions('reverse-choice').map((metric) => metric.key), ['scoreRecords', 'scratches']);
assert.deepEqual(getAugmentTelemetryDefinitions('sevens-dice').map((metric) => metric.key), ['diceRolls', 'diceScoreRecords']);
assert.deepEqual(
  getAugmentTelemetryDefinitions('yacht-bank').map((metric) => metric.key),
  ['scoreRecords', 'scratches', 'questSuccesses', 'questFailures', 'bankedScore']
);
assert.equal(getAugmentAchievementDefinitions({ augmentId: 'couple-dice', name: '커플 주사위' }).length, 2);
assert.equal(
  formatAchievementCompletedAt(new Date(2026, 6, 30, 13, 5)),
  '2026.07.30 pm 01:05에 달성'
);

console.log('augment progress checks passed');
