const fs = require('fs');
const names = {
  'lucky-sevens': '럭키 세븐',
  'perfect-squares': '퍼펙트 스퀘어',
  'anti-ace-deuces': '안티-에이스 듀스',
  'anti-four-threes': '안티-포 트리플',
  'prime-numbers': '프라임 넘버즈',
  'anti-six-fours': '안티-식스 쿼드',
  'anti-six-fives': '안티-식스 펜타',
  'anti-five-sixes': '안티-파이브 헥사',
  'gambler': '갬블러',
  'three-of-a-kind': '쓰리 오브 어 카인드',
  'four-by-four': '포 바이 포',
  'tiny-house': '타이니 하우스',
  'two-pair': '투 페어',
  'head-and-tail': '머리와 몸통',
  'evens': '에번스',
  'odds': '오즈',
  'double-large-straight': '더블 라지 스트레이트',
  'prime-collection': '프라임 컬렉션',
  'duplex-house': '땅콩주택',
  'mountain': '마운틴',
  'high-dice': '하이 다이스',
  '2nd-choice': '두 번째 초이스',
  'fibonacci-numbers': '피보나치 넘버즈',
  'reverse-choice': '리버스 초이스',
  'yacht-bank': '요트 뱅크',
  'blackjack-21': '블랙잭 21'
};

let file = 'c:/Users/dpcks/OneDrive/문서/yec/augmented-dice/src/scoreEngine.js';
let data = fs.readFileSync(file, 'utf8');

for(let id in names) {
  let name = names[id];
  let regex = new RegExp(`id: '${id}', target:`, 'g');
  data = data.replace(regex, `id: '${id}', name: '${name}', target:`);
}

fs.writeFileSync(file, data);
console.log('done');
