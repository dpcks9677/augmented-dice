export const AUGMENT_CONFLICTS = Object.freeze({
  'table-flip': Object.freeze(['8-sided']),
  'strange-die': Object.freeze(['8-sided']),
  '8-sided': Object.freeze(['table-flip', 'strange-die'])
});

export function hasAugmentConflict(ownedIds, candidateId) {
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || []);
  return (AUGMENT_CONFLICTS[candidateId] || []).some((augmentId) => owned.has(augmentId));
}

export function canAcquireAugment(ownedIds, candidateId) {
  const owned = ownedIds instanceof Set ? ownedIds : new Set(ownedIds || []);
  return !owned.has(candidateId) && !hasAugmentConflict(owned, candidateId);
}
