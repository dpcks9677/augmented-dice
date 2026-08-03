import assert from 'node:assert/strict';
import {
  isAchievementEligibleMode,
  isNormalAchievementCompletion,
  recordGameEndAchievementEvent,
  recordScoreAchievementEvent,
  specialAchievementDefinitions
} from '../src/augmentAchievements.js';
import { createAugmentProgressSession } from '../src/augmentProgress.js';

const definitions = Object.values(specialAchievementDefinitions).flat();
assert.equal(definitions.length, 53);
assert.equal(new Set(definitions.map(({ id }) => id)).size, 53);
assert.equal(definitions.every(({ description }) => /세요\.$/.test(description)), true);
assert.equal(isNormalAchievementCompletion({ 1: false, 2: false }), true);
assert.equal(isNormalAchievementCompletion({ 1: false, 2: true }), false);
assert.equal(isAchievementEligibleMode('augmented', true), true);
assert.equal(isAchievementEligibleMode('augmented', false), false);
assert.equal(isAchievementEligibleMode('hotseat', false), false);
assert.equal(isAchievementEligibleMode('augmented-hotseat', false), false);

const session = createAugmentProgressSession('achievement-test');
recordScoreAchievementEvent(session, {
  augmentIds: ['lucky-sevens'], categoryAugmentId: 'lucky-sevens', categoryId: 'aces',
  diceValues: [1, 1, 1, 2, 2], round: 1, rollsLeft: 2, score: 15
});
assert.equal(session.achievements['lucky-sevens-lucky-seven'], 1);

recordScoreAchievementEvent(session, {
  augmentIds: ['reverse-choice'], categoryAugmentId: 'reverse-choice', categoryId: 'yacht',
  diceValues: [1, 1, 1, 1, 1], round: 4, rollsLeft: 0, score: 25
});
assert.equal(session.achievements['reverse-choice-low'], 1);
assert.equal(session.achievements['reverse-choice-unlucky-man'], 1);

recordScoreAchievementEvent(session, {
  augmentIds: ['prime-numbers'], categoryAugmentId: 'prime-numbers', categoryId: 'threes',
  diceValues: [2, 2, 3, 3, 5], round: 6, rollsLeft: 1, score: 12
});
recordGameEndAchievementEvent(session, { normalCompletion: false, won: true });
assert.equal(session.achievements['prime-numbers-master'], undefined);
recordGameEndAchievementEvent(session, { normalCompletion: true, won: true });
assert.equal(session.achievements['prime-numbers-master'], 1);

const tableSession = createAugmentProgressSession('table-test');
tableSession.achievementState.flags.tableFlipLateBehind = true;
recordGameEndAchievementEvent(tableSession, { normalCompletion: true, won: true });
assert.equal(tableSession.achievements['table-flip-skilled-player'], 1);

console.log('augment achievement checks passed');
