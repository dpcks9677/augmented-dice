import assert from 'node:assert/strict';
import { DEFAULT_RATING, getProfileModeStats, getRatingSeries, getTopAugments, updateProfileStats } from '../src/profileStats.js';

assert.deepEqual(getProfileModeStats(), {
  augmented: { rating: DEFAULT_RATING },
  normal: { rating: DEFAULT_RATING, highestScore: 0, highestScoreAt: null, upperBonusCount: 0, yachtCount: 0 }
});

const flatRatings = getRatingSeries({}, 'normal', 90, new Date('2026-07-30T12:00:00.000Z'));
assert.equal(flatRatings.length, 90);
assert.deepEqual(flatRatings[0], { date: '2026-05-02', rating: DEFAULT_RATING });
assert.deepEqual(flatRatings.at(-1), { date: '2026-07-30', rating: DEFAULT_RATING });

const changedRatings = getRatingSeries({
  stats: {
    modes: {
      normal: {
        rating: 530,
        ratingHistory: [
          { rating: 510, at: '2026-07-28T09:00:00.000Z' },
          { rating: 530, at: '2026-07-30T09:00:00.000Z' }
        ]
      }
    }
  }
}, 'normal', 4, new Date('2026-07-30T12:00:00.000Z'));
assert.deepEqual(changedRatings.map((point) => point.rating), [510, 510, 510, 530]);

assert.equal(getProfileModeStats({
  stats: { modes: { normal: { rating: 0 }, augmented: { rating: 0 } } }
}).normal.rating, 0);

const first = updateProfileStats({ augmentStats: { kept: { selections: 4 } } }, {
  mode: 'normal',
  score: 250,
  completedAt: '2026-07-30T00:00:00.000Z',
  upperBonusAchieved: true,
  yachtAchieved: true
});
const tied = updateProfileStats(first, {
  mode: 'normal',
  score: 250,
  completedAt: '2026-07-31T00:00:00.000Z',
  upperBonusAchieved: false,
  yachtAchieved: false
});
assert.equal(tied.modes.normal.highestScoreAt, '2026-07-30T00:00:00.000Z');
assert.equal(tied.modes.normal.upperBonusCount, 1);
assert.equal(tied.modes.normal.yachtCount, 1);
assert.equal(tied.augmentStats.kept.selections, 4);

assert.deepEqual(
  getTopAugments({
    stats: {
      augmentStats: { beta: { selections: 2 }, alpha: { selections: 2 } }
    }
  }, [
    { augmentId: 'alpha', name: '알파' },
    { augmentId: 'beta', name: '베타' }
  ]),
  [
    { id: 'alpha', name: '알파', count: 2 },
    { id: 'beta', name: '베타', count: 2 }
  ]
);

console.log('profileStats tests passed');
