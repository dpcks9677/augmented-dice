export const MASTERY_TARGET = 10;
export const augmentTelemetryDefinitions = {
  'table-flip': [
    { key: 'uses', label: '판 뒤집기 사용 횟수', unit: '회' }
  ],
  'yacht-bank': [
    { key: 'completed', label: '저금 완료 횟수', unit: '회' },
    { key: 'bankedScore', label: '누적 저금 점수', unit: '점' }
  ]
};

const mutationAugmentIds = new Set([
  'lucky-sevens', 'perfect-squares', 'anti-ace-deuces', 'anti-four-threes', 'prime-numbers',
  'anti-six-fours', 'anti-six-fives', 'anti-five-sixes', 'gambler', 'three-of-a-kind',
  'four-by-four', 'tiny-house', 'two-pair', 'head-and-tail', 'evens', 'odds',
  'double-large-straight', 'prime-collection', 'duplex-house', 'mountain', 'high-dice',
  '2nd-choice', 'fibonacci-numbers', 'reverse-choice', 'yacht-bank', 'blackjack-21'
]);
const questAugmentIds = new Set([
  'yacht-bank', 'fast-straight', 'no-time-to-waste', 'step-by-step', 'two-households',
  'holdout', 'cautious-straight', 'every-little', 'copycat', 'doubling', 'nozdormu', 'bounty-hunter'
]);
const diceAugmentIds = new Set([
  'weighted-dice', 'golden-die', '8-sided', 'strange-die', 'promotion-die', 'couple-dice', 'sevens-dice'
]);

const specialAchievementDefinitions = {
  'equivalent-exchange': [{ id: 'equivalent-exchange-soul-trade', name: '영혼까지 교환할 셈이냐!', description: '한 턴에 등가교환을 세 번 사용하고 족보를 기입하세요.', target: 1 }],
  'sevens-dice': [{ id: 'sevens-dice-skill-showcase', name: '실력 행사', description: '7의 눈을 사용해서 스몰 스트레이트나 라지 스트레이트를 10번 기입하세요.', target: 10 }],
  'bounty-hunter': [{ id: 'bounty-hunter-legendary-killer', name: '전설의 킬러', description: '증강을 얻은 후 세 라운드 안에 타겟 족보를 20점 이상으로 기입하세요.', target: 1 }],
  'yacht-bank': [{ id: 'yacht-bank-fence', name: '장물아비', description: '강화 주사위를 요트 뱅크에 5번 저장하세요.', target: 5 }],
  'reverse-choice': [{ id: 'reverse-choice-unlucky-man', name: '비운의 사나이', description: '리버스 초이스 족보에 25점을 기입하세요.', target: 1 }],
  'table-flip': [{ id: 'table-flip-skilled-player', name: '실력가', description: '지고 있을 때 판 뒤집기를 사용한 후 게임을 승리하세요.', target: 1 }],
  'fast-straight': [{ id: 'fast-straight-speed', name: '초스피드', description: '5라운드 안에 재빠른 스트레이트 퀘스트를 완료하세요.', target: 1 }],
  'holdout': [{ id: 'holdout-patience-wins', name: '존버는 승리한다', description: '12턴에 알박기 퀘스트를 완료하고 게임에서 승리하세요.', target: 1 }],
  'momentum': [{ id: 'momentum-kneel', name: '내가 무릎을 꿇은 건', description: '추진력 효과로 보너스 점수를 13점 이상 획득하세요.', target: 13 }],
  'couple-dice': [{ id: 'couple-dice-perfect-match', name: '천생연분', description: '한 게임에서 커플 주사위 효과로 보너스 점수를 4번 이상 획득하세요.', target: 4 }]
};

export function getAugmentTelemetryDefinitions(augmentId) {
  return [
    ...(mutationAugmentIds.has(augmentId) ? [
      { key: 'scoreRecords', label: '족보 등록 횟수', unit: '회' },
      { key: 'scratches', label: '스크래치 횟수', unit: '회' }
    ] : []),
    ...(questAugmentIds.has(augmentId) ? [
      { key: 'questSuccesses', label: '퀘스트 성공 횟수', unit: '회' },
      { key: 'questFailures', label: '퀘스트 실패 횟수', unit: '회' }
    ] : []),
    ...(diceAugmentIds.has(augmentId) ? [
      { key: 'diceRolls', label: '주사위 굴림 횟수', unit: '회' },
      { key: 'diceScoreRecords', label: '주사위 사용 족보 등록 횟수', unit: '회' }
    ] : []),
    ...(augmentTelemetryDefinitions[augmentId] || [])
  ];
}

export function createAugmentProgressSession(sessionId = crypto.randomUUID()) {
  return {
    sessionId,
    draftReceipts: new Set(),
    appearances: {},
    selections: {},
    metrics: {},
    achievements: {},
    flags: {},
    saved: false
  };
}

export function recordAugmentOffer(session, augmentIds, receiptKey = '') {
  if (!session || session.saved) return;
  if (receiptKey && session.draftReceipts.has(receiptKey)) return;
  if (receiptKey) session.draftReceipts.add(receiptKey);
  new Set(augmentIds.filter(Boolean)).forEach((augmentId) => {
    session.appearances[augmentId] = (session.appearances[augmentId] || 0) + 1;
  });
}

export function recordAugmentSelection(session, augmentId) {
  if (!session || session.saved || !augmentId) return;
  session.selections[augmentId] = (session.selections[augmentId] || 0) + 1;
}

export function recordAugmentMetric(session, augmentId, metricKey, amount = 1) {
  const allowed = getAugmentTelemetryDefinitions(augmentId).some((metric) => metric.key === metricKey);
  if (!session || session.saved || !allowed || !Number.isFinite(amount)) return;
  session.metrics[augmentId] ||= {};
  session.metrics[augmentId][metricKey] = (session.metrics[augmentId][metricKey] || 0) + amount;
}

export function recordAchievementProgress(session, achievementId, amount = 1, mode = 'add') {
  if (!session || session.saved || !achievementId || !Number.isFinite(amount)) return;
  const current = session.achievements[achievementId] || 0;
  session.achievements[achievementId] = mode === 'max' ? Math.max(current, amount) : current + amount;
}

export function createMasteryDefinition(augment) {
  return {
    id: `augment-mastery:${augment.augmentId}`,
    augmentId: augment.augmentId,
    name: `${augment.name} 마스터리`,
    description: `${augment.name}을(를) 선택하고 게임을 10번 완료하세요.`,
    target: MASTERY_TARGET
  };
}

export function getAugmentAchievementDefinitions(augment) {
  return [createMasteryDefinition(augment), ...(specialAchievementDefinitions[augment.augmentId] || [])];
}

export function getAchievementDefinition(achievementId) {
  for (const definitions of Object.values(specialAchievementDefinitions)) {
    const definition = definitions.find((item) => item.id === achievementId);
    if (definition) return definition;
  }
  return null;
}

export function getAugmentStats(userData, augmentId) {
  return userData?.stats?.augmentStats?.[augmentId] || {
    appearances: 0,
    selections: 0,
    completedSelections: 0,
    metrics: {}
  };
}

export function getAchievementProgress(userData, achievementId) {
  const progress = userData?.achievements?.[achievementId] || {};
  return {
    ...progress,
    current: progress.current ?? progress.progress ?? 0,
    completedAt: progress.completedAt || null
  };
}

export function calculateAdoptionRate(stats) {
  if (!stats.appearances) return 0;
  return Math.min(100, (stats.selections / stats.appearances) * 100);
}
