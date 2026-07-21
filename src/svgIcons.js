export function getDiceSvg(num) {
  const dots = [];
  const r = 1.8; // 눈금 반지름
  const c = 12, l = 7, r_pos = 17, t = 7, b = 17, m = 12;

  if (num === 1) {
    dots.push(`<circle cx="${c}" cy="${c}" r="${r}" fill="#222"/>`);
  } else if (num === 2) {
    dots.push(`<circle cx="${r_pos}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${l}" cy="${b}" r="${r}" fill="#222"/>`);
  } else if (num === 3) {
    dots.push(`<circle cx="${r_pos}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${c}" cy="${c}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${l}" cy="${b}" r="${r}" fill="#222"/>`);
  } else if (num === 4) {
    dots.push(`<circle cx="${l}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${l}" cy="${b}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${b}" r="${r}" fill="#222"/>`);
  } else if (num === 5) {
    dots.push(`<circle cx="${l}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${c}" cy="${c}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${l}" cy="${b}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${b}" r="${r}" fill="#222"/>`);
  } else if (num === 6) {
    dots.push(`<circle cx="${l}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${t}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${l}" cy="${m}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${m}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${l}" cy="${b}" r="${r}" fill="#222"/>`);
    dots.push(`<circle cx="${r_pos}" cy="${b}" r="${r}" fill="#222"/>`);
  }

  return `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style="vertical-align: text-bottom; margin-right: 6px;">
    <rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="#222" stroke-width="2"/>
    ${dots.join('')}
  </svg>`;
}

export function getSpecialSvg(id) {
  let inner = '';
  const rect = (x, y, w, h, fill="#222", stroke="none", sw="0") => 
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="0.5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;

  if (id === 'choice') {
    inner += rect(10, 4, 4, 4); // 상
    inner += rect(10, 16, 4, 4); // 하
    inner += rect(4, 10, 4, 4); // 좌
    inner += rect(16, 10, 4, 4); // 우
    inner += rect(10, 10, 4, 4); // 중앙
  } else if (id === '4oak') {
    const pos = (idx) => {
      const col = (idx - 1) % 4;
      const row = Math.floor((idx - 1) / 4);
      return [2.5 + col * 5, 2.5 + row * 5];
    };
    const [x4, y4] = pos(4);
    inner += rect(x4, y4, 4, 4, "none", "#222", "1.5");
    [1, 6, 11, 16].forEach(idx => {
      const [x, y] = pos(idx);
      inner += rect(x, y, 4, 4);
    });
  } else if (id === 'fullhouse') {
    inner += rect(3, 5, 4, 4);
    inner += rect(10, 5, 4, 4);
    inner += rect(17, 5, 4, 4);
    inner += rect(6.5, 14, 4, 4);
    inner += rect(13.5, 14, 4, 4);
  } else if (id === 's-straight') {
    inner += rect(4, 16, 4, 4);
    inner += rect(8, 12, 4, 4);
    inner += rect(12, 8, 4, 4);
    inner += rect(16, 4, 4, 4);
  } else if (id === 'l-straight') {
    inner += rect(2, 18, 4, 4);
    inner += rect(6, 14, 4, 4);
    inner += rect(10, 10, 4, 4);
    inner += rect(14, 6, 4, 4);
    inner += rect(18, 2, 4, 4);
  } else if (id === 'yacht') {
    inner += rect(10, 2, 4, 4); // 상
    inner += rect(18, 9, 4, 4); // 우상
    inner += rect(14, 17, 4, 4); // 우하
    inner += rect(6, 17, 4, 4); // 좌하
    inner += rect(2, 9, 4, 4); // 좌상
  }

  return `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style="vertical-align: text-bottom; margin-right: 6px;">
    ${inner}
  </svg>`;
}

export function getVariantSvg(id) {
  const map = {
    'lucky-sevens': 'lucky-seven',
    'perfect-squares': 'perfect-sq',
    'anti-ace-deuces': 'anti-2',
    'anti-four-threes': 'anti-3',
    'prime-numbers': 'prime',
    'anti-six-fours': 'anti-4',
    'anti-six-fives': 'anti-5',
    'anti-five-sixes': 'anti-6',
    'gambler': 'gambler',
    'three-of-a-kind': '3oak',
    'four-by-four': '4x4',
    'tiny-house': 'tinyhouse',
    'two-pair': 'two-pair',
    'head-and-tail': 'head-tail',
    'evens': 'evens',
    'odds': 'odds',
    'double-large-straight': 'dbl-l-straight',
    'prime-collection': 'prime-col',
    'duplex-house': 'duplex',
    'mountain': 'mountain',
    'high-dice': 'high-dice',
    '2nd-choice': '2nd-choice',
    'fibonacci-numbers': 'fibonacci',
    'reverse-choice': 'rev-choice',
    'yacht-bank': 'yacht-bank',
    'blackjack-21': 'blackjack',
    'fast-straight': 'fast-straight',
    'no-waste': 'no-waste',
    'step-by-step': 'step-by-step',
    'two-households': 'two-households',
    'holdout': 'holdout',
    'cautious-straight': 'cautious-straight',
    'mickle': 'mickle',
    'weighted-dice': 'weighted-dice',
    'lucky-punch': 'lucky-punch',
    'momentum': 'momentum',
    'golden-die': 'golden-die',
    'not-over': 'not-over',
    '8-sided': '8-sided',
    'strange-die': 'strange-die',
    'promotion-die': 'promotion-die',
    'couple-dice': 'couple-dice',
    'sevens-dice': 'sevens-dice'
  };
  const mappedId = map[id] || id;

  let inner = '';
  if (mappedId === '3oak') {
    inner = `
      <rect x="10" y="3" width="4" height="4" rx="0.5" fill="#222"/>
      <rect x="5" y="14" width="4" height="4" rx="0.5" fill="#222"/>
      <rect x="15" y="14" width="4" height="4" rx="0.5" fill="#222"/>
    `;
  } else if (mappedId === '2nd-choice') {
    inner = `
      <path d="M18 18 V10 C18 5, 6 5, 6 10 V18 M2 14 L6 18 L10 14" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  } else if (mappedId === 'two-pair') {
    inner = `
      <rect x="4" y="5" width="5" height="5" rx="0.5" fill="#222"/>
      <rect x="4" y="14" width="5" height="5" rx="0.5" fill="#222"/>
      <rect x="15" y="5" width="5" height="5" rx="0.5" fill="none" stroke="#222" stroke-width="1.5"/>
      <rect x="15" y="14" width="5" height="5" rx="0.5" fill="none" stroke="#222" stroke-width="1.5"/>
    `;
  } else if (mappedId === 'evens') {
    inner = `
      <circle cx="8" cy="5" r="2" fill="#222"/> <circle cx="16" cy="5" r="2" fill="#222"/>
      <circle cx="8" cy="12" r="2" fill="#222"/> <circle cx="16" cy="12" r="2" fill="#222"/>
      <circle cx="8" cy="19" r="2" fill="#222"/> <circle cx="16" cy="19" r="2" fill="#222"/>
    `;
  } else if (mappedId === 'odds') {
    inner = `
      <circle cx="12" cy="12" r="2.5" fill="#222"/>
      <circle cx="5" cy="5" r="2.5" fill="none" stroke="#222" stroke-width="1.5"/>
      <circle cx="19" cy="19" r="2.5" fill="none" stroke="#222" stroke-width="1.5"/>
    `;
  } else if (mappedId === 'mountain') {
    inner = `
      <path d="M3 18 L12 5 L21 18 Z" fill="none" stroke="#222" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M8 12 L12 16 L16 12" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round"/>
    `;
  } else if (mappedId === 'head-tail') {
    inner = `
      <rect x="7" y="3" width="4" height="6" rx="0.5" fill="#222" />
      <rect x="13" y="3" width="4" height="6" rx="0.5" fill="#222" />
      <rect x="4" y="13" width="4" height="6" rx="0.5" fill="none" stroke="#222" stroke-width="1.5" />
      <rect x="10" y="13" width="4" height="6" rx="0.5" fill="none" stroke="#222" stroke-width="1.5" />
      <rect x="16" y="13" width="4" height="6" rx="0.5" fill="none" stroke="#222" stroke-width="1.5" />
    `;
  } else if (mappedId === 'lucky-seven') {
    inner = `
      <path d="M7 6 H17 L11 20" fill="none" stroke="#222" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M4 12 L8 12 M6 10 L6 14" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
    `;
  } else if (mappedId === 'fibonacci') {
    inner = `
      <rect x="2.5" y="5.5" width="13" height="13" fill="none" stroke="#222" stroke-width="0.5"/>
      <rect x="15.5" y="5.5" width="8" height="8" fill="none" stroke="#222" stroke-width="0.5"/>
      <rect x="18.5" y="13.5" width="5" height="5" fill="none" stroke="#222" stroke-width="0.5"/>
      <rect x="15.5" y="15.5" width="3" height="3" fill="none" stroke="#222" stroke-width="0.5"/>
      <rect x="15.5" y="13.5" width="2" height="2" fill="none" stroke="#222" stroke-width="0.5"/>
      <rect x="17.5" y="13.5" width="1" height="1" fill="none" stroke="#222" stroke-width="0.5"/>
      <rect x="17.5" y="14.5" width="1" height="1" fill="none" stroke="#222" stroke-width="0.5"/>
      <path d="M 18.5 14.5 A 1 1 0 0 0 17.5 13.5 A 2 2 0 0 0 15.5 15.5 A 3 3 0 0 0 18.5 18.5 A 5 5 0 0 0 23.5 13.5 A 8 8 0 0 0 15.5 5.5 A 13 13 0 0 0 2.5 18.5" fill="none" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
    `;
  } else if (mappedId === 'prime') {
    inner = `
      <path d="M12 2 L20 12 L12 22 L4 12 Z" fill="none" stroke="#222" stroke-width="2.5" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="2.5" fill="#222"/>
    `;
  } else if (mappedId.startsWith('anti-')) {
    const num = parseInt(mappedId.split('-')[1]);
    const r = 2;
    const c = 12, l = 7, r_pos = 17, t = 7, b = 17, m = 12;
    const circlePath = (cx, cy) => ` M ${cx} ${cy-r} A ${r} ${r} 0 1 0 ${cx} ${cy+r} A ${r} ${r} 0 1 0 ${cx} ${cy-r} Z`;
    let pathD = `M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z`;
    
    if (num === 2) pathD += circlePath(r_pos, t) + circlePath(l, b);
    else if (num === 3) pathD += circlePath(r_pos, t) + circlePath(c, c) + circlePath(l, b);
    else if (num === 4) pathD += circlePath(l, t) + circlePath(r_pos, t) + circlePath(l, b) + circlePath(r_pos, b);
    else if (num === 5) pathD += circlePath(l, t) + circlePath(r_pos, t) + circlePath(c, c) + circlePath(l, b) + circlePath(r_pos, b);
    else if (num === 6) pathD += circlePath(l, t) + circlePath(r_pos, t) + circlePath(l, m) + circlePath(r_pos, m) + circlePath(l, b) + circlePath(r_pos, b);
    
    inner = `<path fill-rule="evenodd" d="${pathD}" fill="#222"/>`;
  } else if (mappedId === 'perfect-sq') {
    inner = `
      <rect x="5" y="5" width="6" height="6" fill="#222"/>
      <rect x="13" y="13" width="6" height="6" fill="#222"/>
      <rect x="5" y="13" width="6" height="6" fill="none" stroke="#222" stroke-width="1.5"/>
      <rect x="13" y="5" width="6" height="6" fill="none" stroke="#222" stroke-width="1.5"/>
    `;
  } else if (mappedId === 'gambler') {
    inner = `<path d="M12 2 C12 2 4 10 4 15 C4 18 7 20 10 20 C11 20 12 19 12 17 C12 19 13 20 14 20 C17 20 20 18 20 15 C20 10 12 2 12 2 Z M12 17 L10 22 H14 Z" fill="#222"/>`;
  } else if (mappedId === '4x4') {
    inner = `<rect x="4" y="4" width="7" height="7" fill="#222"/><rect x="13" y="4" width="7" height="7" fill="#222"/><rect x="4" y="13" width="7" height="7" fill="#222"/><rect x="13" y="13" width="7" height="7" fill="#222"/>`;
  } else if (mappedId === 'tinyhouse') {
    inner = `<path d="M12 4 L4 12 v8 h16 v-8 Z" fill="#222" stroke="#222" stroke-width="1.5" stroke-linejoin="round"/>`;
  } else if (mappedId === 'dbl-l-straight') {
    inner = `
      <path d="M3 21 v-4 h4 v-4 h4 v-4 h4 v-4 h4" stroke="#222" stroke-width="2" fill="none" stroke-linejoin="round"/>
      <path d="M8 21 v-4 h4 v-4 h4 v-4 h4" stroke="#222" stroke-width="2" fill="none" stroke-linejoin="round"/>
    `;
  } else if (mappedId === 'prime-col') {
    const dia = (x,y) => `<path d="M${x} ${y-3} L${x+3} ${y} L${x} ${y+3} L${x-3} ${y} Z" fill="#222"/>`;
    inner = dia(12,5) + dia(7,14) + dia(17,14);
  } else if (mappedId === 'duplex') {
    inner = `
      <path d="M6 7 L2 11 v7 h8 v-7 Z" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round"/>
      <path d="M18 7 L14 11 v7 h8 v-7 Z" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round"/>
    `;
  } else if (mappedId === 'high-dice') {
    inner = `<rect x="4" y="14" width="4" height="6" fill="#222"/><rect x="10" y="10" width="4" height="10" fill="#222"/><rect x="16" y="4" width="4" height="16" fill="#222"/>`;
  } else if (mappedId === 'rev-choice') {
    inner = `<path fill-rule="evenodd" d="M6 2 h12 a4 4 0 0 1 4 4 v12 a4 4 0 0 1 -4 4 h-12 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 Z M10 4 h4 v4 h-4 Z M10 16 h4 v4 h-4 Z M4 10 h4 v4 h-4 Z M16 10 h4 v4 h-4 Z M10 10 h4 v4 h-4 Z" fill="#222"/>`;
  } else if (mappedId === 'yacht-bank') {
    inner = `
      <path d="M12 3 L3 9 h18 Z" fill="#222" stroke-linejoin="round"/>
      <rect x="4" y="10" width="2" height="8" fill="#222"/>
      <rect x="11" y="10" width="2" height="8" fill="#222"/>
      <rect x="18" y="10" width="2" height="8" fill="#222"/>
      <rect x="2" y="19" width="20" height="2" fill="#222"/>
    `;
  } else if (mappedId === 'blackjack') {
    inner = `
      <circle cx="12" cy="12" r="10" fill="none" stroke="#222" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="8" fill="none" stroke="#222" stroke-width="4" stroke-dasharray="3.1416 3.1416"/>
      <circle cx="12" cy="12" r="6" fill="none" stroke="#222" stroke-width="1.5"/>
    `;
  } else if (mappedId === 'fast-straight') {
    inner = `<path d="M13 2 L3 14 h9 l-2 8 l10-12 h-9 z" fill="#222" stroke-linejoin="round"/>`;
  } else if (mappedId === 'no-waste') {
    inner = `<circle cx="12" cy="13" r="8" fill="none" stroke="#222" stroke-width="2"/><path d="M12 5 v-3 M9 2 h6 M12 13 l3 -3" stroke="#222" stroke-width="2" stroke-linecap="round"/>`;
  } else if (mappedId === 'step-by-step') {
    inner = `<path d="M4 20 v-5 h5 v-5 h5 v-5 h5" stroke="#222" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`;
  } else if (mappedId === 'two-households') {
    inner = `
      <path d="M4 13 l4 -4 l4 4 v6 h-8 z" fill="#222" stroke-linejoin="round"/>
      <path d="M13 13 l3.5 -3.5 l3.5 3.5 v6 h-7 z" fill="#222" stroke-linejoin="round"/>
    `;
  } else if (mappedId === 'holdout') {
    inner = `<path d="M8 22 v-18 l10 5 l-10 5" stroke="#222" stroke-width="2" fill="none" stroke-linejoin="round"/><rect x="4" y="20" width="8" height="2" fill="#222"/>`;
  } else if (mappedId === 'cautious-straight') {
    inner = `<circle cx="10" cy="10" r="5" fill="none" stroke="#222" stroke-width="2"/><path d="M13.5 13.5 l5.5 5.5" stroke="#222" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (mappedId === 'mickle') {
    inner = `<circle cx="12" cy="18" r="4" fill="#222"/><circle cx="12" cy="12" r="3" fill="#222"/><circle cx="12" cy="7" r="2" fill="#222"/>`;
  } else if (mappedId === 'weighted-dice') {
    inner = `<path d="M7 10 c0 -3 10 -3 10 0 v4 a5 5 0 0 1 -10 0 z" fill="#222"/><path d="M9 10 v-4 a3 3 0 0 1 6 0 v4" fill="none" stroke="#222" stroke-width="2"/>`;
  } else if (mappedId === 'lucky-punch') {
    inner = `<rect x="6" y="8" width="12" height="10" rx="4" fill="#222"/><path d="M6 14 h-2 a2 2 0 0 1 0 -4 h2" fill="#222"/>`;
  } else if (mappedId === 'momentum') {
    inner = `<path d="M12 2 l4 8 v8 l-4 -2 l-4 2 v-8 z" fill="#222" stroke-linejoin="round"/>`;
  } else if (mappedId === 'golden-die') {
    inner = `<path d="M12 2 l3 7 h7 l-5 5 l2 8 l-7 -4 l-7 4 l2 -8 l-5 -5 h7 z" fill="#222" stroke-linejoin="round"/>`;
  } else if (mappedId === 'not-over') {
    inner = `<path d="M12 4 a8 8 0 1 0 8 8" stroke="#222" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M20 7 v5 h-5" stroke="#222" stroke-width="2.5" fill="none" stroke-linejoin="round"/>`;
  } else if (mappedId === '8-sided') {
    inner = `<path d="M12 2 L20 12 L12 22 L4 12 Z M4 12 H20 M12 2 L16 12 L12 22 M12 2 L8 12 L12 22" fill="none" stroke="#222" stroke-width="1.5" stroke-linejoin="round"/>`;
  } else if (mappedId === 'strange-die') {
    inner = `<path d="M9 8 a3 3 0 0 1 6 0 c0 2 -3 3 -3 5" fill="none" stroke="#222" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="17" r="1.5" fill="#222"/>`;
  } else if (mappedId === 'promotion-die') {
    inner = `<path d="M4 20 h16 L20 8 l-4 4 l-4 -8 l-4 8 l-4 -4 Z" fill="#222" stroke-linejoin="round"/>`;
  } else if (mappedId === 'couple-dice') {
    inner = `<path d="M12 20 l-8 -8 a4 4 0 0 1 8 -5 a4 4 0 0 1 8 5 z" fill="#222" stroke-linejoin="round"/>`;
  } else if (mappedId === 'sevens-dice') {
    inner = `<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#222" stroke-width="2"/><path d="M8 7 H16 L11.5 17" fill="none" stroke="#222" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  return `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style="vertical-align: text-bottom; margin-right: 6px;">
    ${inner}
  </svg>`;
}

export function getDicesIconSvg() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="lucide-icon custom-dices-icon" style="flex-shrink: 0;">
    <path d="M 11.5 9.5 H 19.5 A 2.5 2.5 0 0 1 22 12 V 19.5 A 2.5 2.5 0 0 1 19.5 22 H 12 A 2.5 2.5 0 0 1 9.5 19.5 V 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    <circle cx="12.5" cy="12.5" r="1.1" fill="currentColor"/>
    <circle cx="18.5" cy="12.5" r="1.1" fill="currentColor"/>
    <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/>
    <circle cx="12.5" cy="18.5" r="1.1" fill="currentColor"/>
    <circle cx="18.5" cy="18.5" r="1.1" fill="currentColor"/>
    <g transform="rotate(-15 8 8)">
      <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="2" fill="#ffffff"/>
      <circle cx="5" cy="5" r="1.1" fill="#333333"/>
      <circle cx="8" cy="8" r="1.1" fill="#333333"/>
      <circle cx="11" cy="11" r="1.1" fill="#333333"/>
    </g>
  </svg>`;
}

export function getAugmentedDicesIconSvg() {
  return `<div class="mode-icon-augmented-wrapper" style="display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="lucide-icon custom-dices-icon" style="flex-shrink: 0;">
      <path d="M 11.5 9.5 H 19.5 A 2.5 2.5 0 0 1 22 12 V 19.5 A 2.5 2.5 0 0 1 19.5 22 H 12 A 2.5 2.5 0 0 1 9.5 19.5 V 12.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="12.5" cy="12.5" r="1.1" fill="currentColor"/>
      <circle cx="18.5" cy="12.5" r="1.1" fill="currentColor"/>
      <circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/>
      <circle cx="12.5" cy="18.5" r="1.1" fill="currentColor"/>
      <circle cx="18.5" cy="18.5" r="1.1" fill="currentColor"/>
      <g transform="rotate(-15 8 8)">
        <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" stroke-width="2" fill="#ffffff"/>
        <circle cx="5" cy="5" r="1.1" fill="#333333"/>
        <circle cx="8" cy="8" r="1.1" fill="#333333"/>
        <circle cx="11" cy="11" r="1.1" fill="#333333"/>
      </g>
    </svg>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-arrow-big-up" style="color: #27ae60; flex-shrink: 0;"><path d="M9 18v-6H5l7-7 7 7h-4v6H9z" fill="rgba(39, 174, 96, 0.2)"/></svg>
  </div>`;
}

export function getCirclePlusIconSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-circle-plus" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`;
}

export function getCircleMinusIconSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-circle-minus" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>`;
}

export function getFlagIconSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-flag" style="transform: rotate(-25deg); flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>`;
}

export function getUnplugIconSvg() {
  return `<svg width="22" height="22" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" fill="none" stroke="#ff6b6b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="lucide-icon lucide-unplug" style="flex-shrink: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m17.7 3.7-2.3 2.3 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/></svg>`;
}
