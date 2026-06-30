export function calculateScores(dice) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let sum = 0;
  
  dice.forEach(d => {
    counts[d]++;
    sum += d;
  });

  const countValues = Object.values(counts);
  const hasMultiple = (n) => countValues.some(c => c >= n);
  const isFullHouse = (countValues.includes(3) && countValues.includes(2)) || countValues.includes(5);
  
  // Straight helpers
  const uniqueSorted = [...new Set(dice)].sort();
  const uniqueStr = uniqueSorted.join('');
  const isSmallStraight = /1234|2345|3456/.test(uniqueStr);
  const isLargeStraight = /12345|23456/.test(uniqueStr);

  return {
    aces: counts[1] * 1,
    deuces: counts[2] * 2,
    threes: counts[3] * 3,
    fours: counts[4] * 4,
    fives: counts[5] * 5,
    sixes: counts[6] * 6,
    choice: sum,
    '4oak': hasMultiple(4) ? sum : 0,
    fullhouse: isFullHouse ? sum : 0, // In standard Yacht, Full House is sum. (Sometimes fixed 25)
    's-straight': isSmallStraight ? 15 : 0,
    'l-straight': isLargeStraight ? 30 : 0,
    yacht: hasMultiple(5) ? 50 : 0
  };
}
