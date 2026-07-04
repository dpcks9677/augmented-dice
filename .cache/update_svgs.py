import re

svg_function_body = r"""
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
"""

with open('src/main.js', 'r', encoding='utf-8') as f:
    main_js = f.read()

main_js_new = re.sub(r'export function getVariantSvg\(id\) \{.*?\n\}', 'export function getVariantSvg(id) {\n' + svg_function_body + '\n  return `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style="vertical-align: text-bottom; margin-right: 6px;">\n    ${inner}\n  </svg>`;\n}', main_js, flags=re.DOTALL)
with open('src/main.js', 'w', encoding='utf-8') as f:
    f.write(main_js_new)

with open('inject_svg.js', 'r', encoding='utf-8') as f:
    inject_js = f.read()

inject_js_new = re.sub(r'function getVariantSvg\(id\) \{.*?\n\}', 'function getVariantSvg(id) {\n' + svg_function_body + '\n  return `<svg viewBox="0 0 24 24" width="24" height="24" style="vertical-align: middle; margin-right: 8px;">${inner.replace(/\\n/g,\'\').replace(/\\s+/g,\' \')}</svg>`;\n}', inject_js, flags=re.DOTALL)

new_map = """const map = {
  1: 'lucky-seven', 2: 'perfect-sq', 3: 'anti-2', 4: 'anti-3', 5: 'prime',
  6: 'anti-4', 7: 'anti-5', 8: 'anti-6', 9: 'gambler', 10: '3oak',
  11: '4x4', 12: 'tinyhouse', 13: 'two-pair', 14: 'head-tail', 15: 'evens',
  16: 'odds', 17: 'dbl-l-straight', 18: 'prime-col', 19: 'duplex', 20: 'mountain',
  21: 'high-dice', 22: '2nd-choice', 23: 'fibonacci', 24: 'rev-choice', 25: 'yacht-bank',
  26: 'blackjack',
  27: 'fast-straight', 28: 'no-waste', 29: 'step-by-step', 30: 'two-households',
  31: 'holdout', 32: 'cautious-straight', 33: 'mickle', 34: 'weighted-dice',
  35: 'lucky-punch', 36: 'momentum', 37: 'golden-die', 38: 'not-over',
  39: '8-sided', 40: 'strange-die', 41: 'promotion-die', 42: 'couple-dice',
  43: 'sevens-dice'
};"""
inject_js_new = re.sub(r'const map = \{[^}]+\};', new_map, inject_js_new)

inject_js_new = inject_js_new.replace('for (let i = 1; i <= 26; i++)', 'for (let i = 1; i <= 43; i++)')

with open('inject_svg.js', 'w', encoding='utf-8') as f:
    f.write(inject_js_new)

print("Updated main.js and inject_svg.js")
