export const mutationDefinitions = {
  // -------------------------
  // Upper Section
  // -------------------------
  'lucky-sevens': {
    id: 'lucky-sevens', name: '럭키 세븐', target: 'aces', enName: 'Lucky Sevens', excludeFromUpper: true,
    calculate: (dice, counts, sum) => [7, 17, 27].includes(sum) ? 15 : 0
  },
  'perfect-squares': {
    id: 'perfect-squares', name: '퍼펙트 스퀘어', target: 'aces', enName: 'P. Squares', excludeFromUpper: true,
    calculate: (dice, counts, sum) => [9, 16, 25].includes(sum) ? 12 : 0
  },
  'anti-ace-deuces': {
    id: 'anti-ace-deuces', name: '안티-에이스 듀스', target: 'deuces', enName: '-1. Deuces', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (counts[2] >= 3 && counts[1] === 0) ? 8 : 0
  },
  'anti-four-threes': {
    id: 'anti-four-threes', name: '안티-포 트리플', target: 'threes', enName: '-4. Threes', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (counts[3] >= 3 && counts[4] === 0) ? 12 : 0
  },
  'prime-numbers': {
    id: 'prime-numbers', name: '프라임 넘버즈', target: 'threes', enName: 'P. Numbers', excludeFromUpper: false,
    calculate: (dice, counts, sum) => dice.every(d => d === 2 || d === 3 || d === 5) ? 12 : 0
  },
  'anti-six-fours': {
    id: 'anti-six-fours', name: '안티-식스 쿼드', target: 'fours', enName: '-6. Fours', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (counts[4] >= 3 && counts[6] === 0) ? 16 : 0
  },
  'anti-six-fives': {
    id: 'anti-six-fives', name: '안티-식스 펜타', target: 'fives', enName: '-6. Fives', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (counts[5] >= 3 && counts[6] === 0) ? 20 : 0
  },
  'anti-five-sixes': {
    id: 'anti-five-sixes', name: '안티-파이브 헥사', target: 'sixes', enName: '-5. Sixes', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (counts[6] >= 3 && counts[5] === 0) ? 24 : 0
  },

  // -------------------------
  // Lower Section
  // -------------------------
  'gambler': {
    id: 'gambler', name: '갬블러', target: 'choice', enName: 'Gambler', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (sum >= 24) ? sum + 7 : 0
  },
  'three-of-a-kind': {
    id: 'three-of-a-kind', name: '쓰리 오브 어 카인드', target: '4oak', enName: '3 of a Kind', excludeFromUpper: false,
    calculate: (dice, counts, sum) => Object.values(counts).some(c => c >= 3) ? sum - 2 : 0
  },
  'four-by-four': {
    id: 'four-by-four', name: '포 바이 포', target: '4oak', enName: 'Four x Four', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      if (counts[4] >= 4) return sum + 10;
      if (Object.values(counts).some(c => c >= 4)) return sum - 4;
      return 0;
    }
  },
  'tiny-house': {
    id: 'tiny-house', name: '타이니 하우스', target: 'fullhouse', enName: 'Tiny House', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      if (counts[5] > 0 || counts[6] > 0) return 0; 
      const vals = Object.values(counts);
      if ((vals.includes(3) && vals.includes(2)) || vals.includes(5)) return 28;
      return 0;
    }
  },
  'two-pair': {
    id: 'two-pair', name: '투 페어', target: 'fullhouse', enName: 'Two Pair', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      let pairCount = 0;
      for (let i = 1; i <= 6; i++) {
        if (counts[i] >= 2) pairCount++;
      }
      return (pairCount >= 2 || Object.values(counts).some(c => c >= 4)) ? 15 : 0;
    }
  },
  'head-and-tail': {
    id: 'head-and-tail', name: '머리와 몸통', target: 'fullhouse', enName: 'Head & Tail', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      let valid = false;
      for (let pairVal = 1; pairVal <= 6; pairVal++) {
        if (counts[pairVal] >= 2) {
          counts[pairVal] -= 2; // 일시적 제거
          const str = Object.values(counts).map(c => c > 0 ? '1' : '0').join('');
          if (str.includes('111')) valid = true; // 3연속 숫자
          counts[pairVal] += 2; // 복구
          if (valid) break;
        }
      }
      return valid ? sum + 10 : 0;
    }
  },
  'evens': {
    id: 'evens', name: '에번스', target: 's-straight', enName: 'Evens', excludeFromUpper: false,
    calculate: (dice, counts, sum) => dice.every(d => d % 2 === 0) ? 20 : 0
  },
  'odds': {
    id: 'odds', name: '오즈', target: 's-straight', enName: 'Odds', excludeFromUpper: false,
    calculate: (dice, counts, sum) => dice.every(d => d % 2 !== 0) ? 20 : 0
  },
  'double-large-straight': {
    id: 'double-large-straight', name: '더블 라지 스트레이트', target: 's-straight', enName: 'L. Straight', excludeFromUpper: false, 
    calculate: (dice, counts, sum) => {
      const uStr = [...new Set(dice)].sort().join('');
      return /12345|23456/.test(uStr) ? 30 : 0;
    }
  },
  'prime-collection': {
    id: 'prime-collection', name: '프라임 컬렉션', target: 'l-straight', enName: 'P. Collection', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      if (!dice.every(d => d === 2 || d === 3 || d === 5)) return 0;
      if (counts[2] > 0 && counts[3] > 0 && counts[5] > 0) return 35;
      return 0;
    }
  },
  'duplex-house': {
    id: 'duplex-house', name: '땅콩주택', target: 'l-straight', enName: 'Duplex House', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      const vals = Object.values(counts);
      if (!((vals.includes(3) && vals.includes(2)) || vals.includes(5))) return 0;
      const nums = [];
      for(let i = 1; i <= 6; i++) if (counts[i] > 0) nums.push(i);
      if (nums.length === 2 && Math.abs(nums[0] - nums[1]) === 1) return 35;
      return 0;
    }
  },
  'mountain': {
    id: 'mountain', name: '마운틴', target: 'l-straight', enName: 'Mountain', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      const uStr = [...new Set(dice)].sort().join('');
      return uStr === '23456' ? 40 : 0;
    }
  },
  'high-dice': {
    id: 'high-dice', name: '하이 다이스', target: 'l-straight', enName: 'High Dice', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      if (dice.every(d => [4,5,6].includes(d)) && sum >= 26) return 35;
      return 0;
    }
  },
  '2nd-choice': {
    id: '2nd-choice', name: '두 번째 초이스', target: 'yacht', enName: '2nd Choice', excludeFromUpper: false,
    calculate: (dice, counts, sum) => Math.floor(sum / 2)
  },
  'fibonacci-numbers': {
    id: 'fibonacci-numbers', name: '피보나치 넘버즈', target: 'yacht', enName: 'Fib. Numbers', excludeFromUpper: false,
    calculate: (dice, counts, sum) => {
      const sorted = [...dice].sort();
      return sorted.join('') === '11235' ? 25 : 0;
    }
  },
  'reverse-choice': {
    id: 'reverse-choice', name: '리버스 초이스', target: 'yacht', enName: 'R. Choice', excludeFromUpper: false,
    calculate: (dice, counts, sum) => 30 - sum
  },
  'yacht-bank': {
    id: 'yacht-bank', name: '요트 뱅크', target: 'yacht', enName: 'Bank', excludeFromUpper: false,
    calculate: (dice, counts, sum, context) => {
      const isYacht = Object.values(counts).some(c => c >= 5);
      const bank = context ? (context.bank || 0) : 0;
      return isYacht ? bank * 2 : 0; 
    }
  },
  'blackjack-21': {
    id: 'blackjack-21', name: '블랙잭 21', target: 'yacht', enName: 'Blackjack', excludeFromUpper: false,
    calculate: (dice, counts, sum) => (sum === 21) ? 21 : 0
  }
};

export function calculateScores(dice, activeMutations = {}, context = {}) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let sum = 0;
  
  dice.forEach(d => {
    counts[d]++;
    sum += d;
  });

  const countValues = Object.values(counts);
  const hasMultiple = (n) => countValues.some(c => c >= n);
  const isFullHouse = (countValues.includes(3) && countValues.includes(2)) || countValues.includes(5);
  
  const uniqueSorted = [...new Set(dice)].sort();
  const uniqueStr = uniqueSorted.join('');
  const isSmallStraight = /1234|2345|3456/.test(uniqueStr);
  const isLargeStraight = /12345|23456/.test(uniqueStr);

  let scores = {
    aces: counts[1] * 1,
    deuces: counts[2] * 2,
    threes: counts[3] * 3,
    fours: counts[4] * 4,
    fives: counts[5] * 5,
    sixes: counts[6] * 6,
    choice: sum,
    '4oak': hasMultiple(4) ? sum : 0,
    fullhouse: isFullHouse ? sum : 0,
    's-straight': isSmallStraight ? 15 : 0,
    'l-straight': isLargeStraight ? 30 : 0,
    yacht: hasMultiple(5) ? 50 : 0
  };

  // 활성화된 증강 덮어씌우기
  for (const [targetCat, mutationId] of Object.entries(activeMutations)) {
    const mut = mutationDefinitions[mutationId];
    if (mut) {
      scores[targetCat] = mut.calculate(dice, counts, sum, context);
    }
  }

  return scores;
}
