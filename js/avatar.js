// Ludzik: warstwy SVG, styl lalki. Kolor włosów i oczu to paleta, fryzura to warstwa.

export const HAIR_COLORS = {
  blonde: { main: '#E8C56B', dark: '#C9A24B', shine: '#FFF4C8', brow: '#B8944A', label: 'blond' },
  brunette: { main: '#6B3E24', dark: '#3F2416', shine: '#A06A45', brow: '#4A2A18', label: 'brąz' },
  black: { main: '#2A2220', dark: '#141010', shine: '#5A4E4A', brow: '#1A1414', label: 'czerń' },
  auburn: { main: '#A0432A', dark: '#6E2C1C', shine: '#D47A5A', brow: '#7A2E1C', label: 'rudy' },
};

export const EYE_COLORS = {
  blue: { iris: '#5A8FD4', dark: '#2E5A96', label: 'niebieskie' },
  brown: { iris: '#6B4A2C', dark: '#3D2918', label: 'brązowe' },
  green: { iris: '#4F8A62', dark: '#2D5A3C', label: 'zielone' },
};

export const HAIR_STYLES = [
  { id: 'hair-bob', name: 'Do ramion' },
  { id: 'hair-long', name: 'Długie' },
  { id: 'hair-ponytail', name: 'Kucyk' },
  { id: 'hair-short', name: 'Krótkie (chłopak)' },
];

const SKIN = '#F3C4A4';
const SKIN_DARK = '#E3B08E';
const SKIN_DEEP = '#D4A07E';

function hairBack(id, c) {
  if (id === 'hair-ponytail') {
    return `
      <path d="M50,70 Q46,86 54,104 Q62,90 60,72 Z" fill="${c.main}"/>
      <path d="M110,70 Q114,86 106,104 Q98,90 100,72 Z" fill="${c.main}"/>
      <ellipse cx="80" cy="54" rx="32" ry="30" fill="${c.dark}"/>
      <path d="M106,58 Q136,70 128,150 Q122,188 104,176 Q118,120 100,70 Z" fill="${c.main}"/>
      <path d="M118,96 Q126,128 114,168" fill="none" stroke="${c.shine}" stroke-width="2" opacity=".4"/>
      <ellipse cx="107" cy="62" rx="6" ry="5" fill="#E8C56B"/>`;
  }
  if (id === 'hair-long') {
    return `
      <path d="M46,62 Q38,120 46,200 Q50,228 62,222 Q54,150 56,88 Z" fill="${c.main}"/>
      <path d="M114,62 Q122,120 114,200 Q110,228 98,222 Q106,150 104,88 Z" fill="${c.main}"/>
      <ellipse cx="80" cy="52" rx="36" ry="32" fill="${c.dark}"/>
      <path d="M50,80 Q44,150 54,210" fill="none" stroke="${c.shine}" stroke-width="2.2" opacity=".35"/>`;
  }
  if (id === 'hair-short') {
    // Krótkie, chłopięce — sam czepek na czubku, bez pukli po bokach.
    return `<ellipse cx="80" cy="50" rx="33" ry="29" fill="${c.dark}"/>`;
  }
  return `
    <ellipse cx="80" cy="54" rx="34" ry="32" fill="${c.dark}"/>
    <path d="M46,64 Q42,92 50,118 Q60,96 58,70 Z" fill="${c.main}"/>
    <path d="M114,64 Q118,92 110,118 Q100,96 102,70 Z" fill="${c.main}"/>`;
}

function hairFront(id, c) {
  if (id === 'hair-ponytail') {
    return `
      <path d="M50,46 Q80,10 110,46 L108,58 Q96,36 80,38 Q64,36 52,58 Z" fill="${c.main}"/>
      <path d="M58,40 Q80,28 96,46 Q88,50 80,44 Q70,50 62,46 Z" fill="${c.dark}"/>
      <path d="M50,58 Q54,78 50,92" fill="${c.main}"/>
      <path d="M110,58 Q106,78 110,92" fill="${c.main}"/>
      <path d="M66,28 Q80,18 94,32" fill="none" stroke="${c.shine}" stroke-width="2.4" opacity=".45"/>`;
  }
  if (id === 'hair-long') {
    return `
      <path d="M46,48 Q80,6 114,48 L112,62 Q100,34 80,32 Q60,34 48,62 Z" fill="${c.main}"/>
      <path d="M62,36 Q80,22 90,40 Q82,52 74,48 Q68,54 62,44 Z" fill="${c.dark}"/>
      <path d="M48,60 Q52,92 48,118" fill="${c.main}"/>
      <path d="M112,60 Q108,92 112,118" fill="${c.main}"/>
      <path d="M64,26 Q80,14 100,34" fill="none" stroke="${c.shine}" stroke-width="2.6" opacity=".5"/>`;
  }
  if (id === 'hair-short') {
    // Krótka grzywka i przystrzyżone boki — czytelnie „chłopięce".
    return `
      <path d="M48,54 Q50,20 80,16 Q110,20 112,54 Q104,40 94,38 L66,38 Q56,40 48,54 Z" fill="${c.main}"/>
      <path d="M62,34 Q80,24 98,34 Q88,44 80,40 Q72,44 62,34 Z" fill="${c.dark}"/>
      <path d="M48,54 Q50,68 50,80 L56,80 Q55,64 58,50 Z" fill="${c.main}"/>
      <path d="M112,54 Q110,68 110,80 L104,80 Q105,64 102,50 Z" fill="${c.main}"/>
      <path d="M64,26 Q80,18 96,30" fill="none" stroke="${c.shine}" stroke-width="2.2" opacity=".45"/>`;
  }
  return `
    <path d="M47,46 Q80,8 113,46 L111,60 Q98,34 80,34 Q62,34 49,60 Z" fill="${c.main}"/>
    <path d="M60,36 Q78,24 88,42 Q80,50 72,46 Q64,52 58,42 Z" fill="${c.dark}"/>
    <path d="M48,58 Q50,82 47,98" fill="${c.main}"/>
    <path d="M112,58 Q110,82 113,98" fill="${c.main}"/>
    <path d="M64,26 Q80,16 96,34" fill="none" stroke="${c.shine}" stroke-width="2.4" opacity=".5"/>`;
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

// Krój z pierwszej niebieskiej sukienki: wąskie ramiona, małe rękawy.
function fittedTop(fill) {
  return `
    <path d="M58,100 L70,96 Q80,108 90,96 L102,100
             L98,148 Q80,154 62,148 Z" fill="${fill}"/>
    <path d="M58,100 Q49,107 48,118 L62,122 Q64,108 67,103 Z" fill="${fill}"/>
    <path d="M102,100 Q111,107 112,118 L98,122 Q96,108 93,103 Z" fill="${fill}"/>`;
}

function fittedSkirt(fill, hem = '') {
  return `
    <path d="M62,148 Q80,156 98,148 L108,200 Q80,210 52,200 Z" fill="${fill}"/>
    ${hem}`;
}

function fittedHem(deep) {
  return `<path d="M52,200 Q80,210 108,200 L106,194 Q80,202 54,194 Z" fill="${deep}"/>`;
}

export const DRESS_PARTS = {
  'dress-navy': { top: 'top-navy', bottom: 'bottom-navy' },
  'dress-red': { top: 'top-red', bottom: 'bottom-red' },
  'dress-lilac': { top: 'top-lilac', bottom: 'bottom-lilac' },
  'dress-sun': { top: 'top-sun', bottom: 'bottom-sun' },
  'dress-mint': { top: 'top-mint', bottom: 'bottom-mint' },
  'dress-coral': { top: 'top-coral', bottom: 'bottom-coral' },
  'dress-ball': { top: 'top-ball', bottom: 'bottom-ball' },
};

function clothesOf(equipped = {}) {
  if (equipped.dress && DRESS_PARTS[equipped.dress]) return DRESS_PARTS[equipped.dress];
  return {
    top: equipped.top || 'top-tshirt',
    bottom: equipped.bottom || 'bottom-shorts',
  };
}

const TOP_SHAPE = `M58,100 L70,96 Q80,108 90,96 L102,100 L98,148 Q80,154 62,148 Z
M58,100 Q49,107 48,118 L62,122 Q64,108 67,103 Z
M102,100 Q111,107 112,118 L98,122 Q96,108 93,103 Z`;
const SKIRT_SHAPE = `M62,148 Q80,156 98,148 L108,200 Q80,210 52,200 Z`;

const TOPS = {
  'top-tshirt': (col = '#FFF8F4') => `
    <path d="M58,98 Q80,91 102,98 L98,156 Q80,164 62,156 Z" fill="${col}"/>
    <path d="M58,98 Q49,106 47,120 L61,124 Q63,108 66,102 Z" fill="${col}"/>
    <path d="M102,98 Q111,106 113,120 L99,124 Q97,108 94,102 Z" fill="${col}"/>
    <path d="M68,96 Q80,108 92,96" fill="none" stroke="${SKIN_DARK}" stroke-width="2"/>
    <path d="M80,118 L80,150" fill="none" stroke="${SKIN_DARK}" stroke-width="1" opacity=".25"/>`,
  'top-denim': () => `
    ${fittedTop('#F3E6C8')}
    <path d="M68,96 Q80,108 92,96" fill="none" stroke="${SKIN_DARK}" stroke-width="2"/>
    <path d="M72,118 Q80,128 88,118 Q80,124 72,118" fill="none" stroke="#C9B48A" stroke-width="1.2"/>
    <path d="M74,132 Q80,142 86,132 Q80,138 74,132" fill="none" stroke="#C9B48A" stroke-width="1.2"/>
    <path d="M80,108 L80,148" fill="none" stroke="#C9B48A" stroke-width="1"/>
    <path d="M58,118 Q49,122 48,128" fill="none" stroke="#2C6753" stroke-width="2.4"/>
    <path d="M102,118 Q111,122 112,128" fill="none" stroke="#2C6753" stroke-width="2.4"/>`,
  'top-coat': () => `
    ${fittedTop('#3A3344')}
    <path d="M70,98 L66,122 L80,114 L94,122 L90,98" fill="none" stroke="#C9A24B" stroke-width="1"/>
    <circle cx="74" cy="124" r="1.8" fill="#C9A24B"/>
    <circle cx="74" cy="136" r="1.8" fill="#C9A24B"/>`,
  'top-navy': () => `
    ${fittedTop('#7EC8E8')}
    <path d="M70,96 Q80,108 90,96" fill="none" stroke="${SKIN_DARK}" stroke-width="1.8"/>
    <rect x="64" y="147" width="32" height="5" rx="1.2" fill="#F7F3EC"/>`,
  'top-red': () => `
    ${fittedTop('#F48FB1')}
    <path d="M70,96 Q76,108 80,104 Q84,108 90,96" fill="none" stroke="${SKIN_DARK}" stroke-width="1.8"/>`,
  'top-lilac': () => `
    ${fittedTop('#9B7BB8')}
    <path d="M70,96 Q80,108 90,96" fill="none" stroke="${SKIN_DARK}" stroke-width="1.8"/>
    <path d="M80,108 L80,148" fill="none" stroke="#7A5898" stroke-width="1"/>`,
  'top-sun': () => `
    ${fittedTop('#2A2826')}
    <path d="M70,96 Q80,108 90,96" fill="none" stroke="${SKIN_DARK}" stroke-width="1.8"/>
    <path d="M80,108 L74,116 L80,114 L86,116 Z" fill="#C42A45"/>`,
  'top-mint': () => {
    const cid = uid('breton-top');
    return `
    <defs><clipPath id="${cid}"><path d="${TOP_SHAPE}"/></clipPath></defs>
    ${fittedTop('#F7F3EC')}
    <g clip-path="url(#${cid})">
      <path d="M40,112 H120" stroke="#1F3A5C" stroke-width="4"/>
      <path d="M40,124 H120" stroke="#1F3A5C" stroke-width="4"/>
      <path d="M40,136 H120" stroke="#1F3A5C" stroke-width="4"/>
    </g>`;
  },
  'top-coral': () => `
    ${fittedTop('#E86B5A')}
    <circle cx="72" cy="122" r="2.1" fill="#FFF8F4"/>
    <circle cx="88" cy="120" r="2.1" fill="#FFF8F4"/>
    <circle cx="80" cy="136" r="2.2" fill="#FFF8F4"/>`,
  'top-ball': () => `
    ${fittedTop('#6B2A4A')}
    <path d="M70,96 Q76,108 80,104 Q84,108 90,96" fill="none" stroke="#E8C56B" stroke-width="1.8"/>
    <circle cx="80" cy="118" r="2.2" fill="#E8C56B"/>`,
};

const BOTTOMS = {
  'bottom-shorts': (col = '#6E7C8C') => `
    <path d="M62,154 Q80,162 98,154 L104,198 Q94,202 84,198 L80,172 L76,198 Q66,202 56,198 Z" fill="${col}"/>
    <path d="M80,162 L80,172" fill="none" stroke="#5A6775" stroke-width="1.4"/>`,
  'bottom-jeans': () => `
    <path d="M62,154 Q80,162 98,154 L104,248 L88,248 L84,190 L80,176 L76,190 L72,248 L56,248 Z" fill="#2F4A6E"/>
    <path d="M80,162 L80,176" fill="none" stroke="#1E334E" stroke-width="1.4"/>
    <path d="M64,176 Q68,172 74,176" fill="none" stroke="#C9A24B" stroke-width="1"/>
    <path d="M96,176 Q92,172 86,176" fill="none" stroke="#C9A24B" stroke-width="1"/>`,
  'bottom-skirt': () => {
    const pid = uid('tartan');
    return `
    <defs>
      <pattern id="${pid}" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#1F3A4C"/>
        <rect x="0" y="0" width="10" height="3" fill="#2C6753"/>
        <rect x="0" y="0" width="3" height="10" fill="#6B2A3A"/>
        <rect x="0" y="0" width="10" height="1" fill="#E8C56B" opacity=".7"/>
        <rect x="0" y="0" width="1" height="10" fill="#E8C56B" opacity=".7"/>
      </pattern>
    </defs>
    ${fittedSkirt(`url(#${pid})`)}`;
  },
  'bottom-navy': () => fittedSkirt('#7EC8E8', fittedHem('#4FA8CE')),
  'bottom-red': () => `
    ${fittedSkirt('#F48FB1', fittedHem('#E56B94'))}
    <rect x="64" y="147" width="32" height="5" rx="1.2" fill="#FFF"/>
    <path d="M80,150 L72,147 L72,155 Z" fill="#FFF"/>
    <path d="M80,150 L88,147 L88,155 Z" fill="#FFF"/>
    <circle cx="80" cy="150.5" r="2" fill="#E56B94"/>`,
  'bottom-lilac': () => `
    <path d="M62,148 Q80,156 98,148 L102,208 Q80,214 58,208 Z" fill="#9B7BB8"/>
    <rect x="64" y="147" width="32" height="5" rx="1.2" fill="#1A1210"/>`,
  'bottom-sun': () => fittedSkirt('#2A2826', fittedHem('#1A1816')),
  'bottom-mint': () => {
    const cid = uid('breton-skirt');
    return `
    <defs><clipPath id="${cid}"><path d="${SKIRT_SHAPE}"/></clipPath></defs>
    ${fittedSkirt('#F7F3EC', fittedHem('#1F3A5C'))}
    <g clip-path="url(#${cid})">
      <path d="M40,164 H120" stroke="#1F3A5C" stroke-width="4"/>
      <path d="M40,176 H120" stroke="#1F3A5C" stroke-width="4"/>
      <path d="M40,188 H120" stroke="#1F3A5C" stroke-width="4"/>
    </g>`;
  },
  'bottom-coral': () => `
    ${fittedSkirt('#E86B5A', fittedHem('#F4A090'))}
    <circle cx="70" cy="172" r="2.1" fill="#FFF8F4"/>
    <circle cx="90" cy="176" r="2.1" fill="#FFF8F4"/>
    <circle cx="80" cy="188" r="2.2" fill="#FFF8F4"/>`,
  'bottom-ball': () => `
    <path d="M62,148 Q80,156 98,148 L120,236 Q80,248 40,236 Z" fill="#6B2A4A"/>
    <path d="M40,236 Q80,248 120,236 L118,228 Q80,238 42,228 Z" fill="#8A3A62"/>
    <rect x="64" y="147" width="32" height="5" rx="1.2" fill="#E8C56B"/>`,
};

function sneakers(upper = '#F4EFE6', sole = '#2A2826') {
  const shine = 'rgba(255,255,255,.45)';
  return `
    <g class="shoes">
      <path d="M72,246 C76,246 76,252 74,257 C70,263 54,264 45,258 C41,254 44,248 53,246 C61,244 68,244 72,246 Z" fill="${upper}"/>
      <path d="M45,257 C48,263 58,265 68,263 C74,262 75,258 73,256 C66,261 52,261 45,257 Z" fill="${sole}"/>
      <ellipse cx="50" cy="251" rx="3.2" ry="2" fill="${shine}"/>
      <path d="M88,246 C84,246 84,252 86,257 C90,263 106,264 115,258 C119,254 116,248 107,246 C99,244 92,244 88,246 Z" fill="${upper}"/>
      <path d="M115,257 C112,263 102,265 92,263 C86,262 85,258 87,256 C94,261 108,261 115,257 Z" fill="${sole}"/>
      <ellipse cx="110" cy="251" rx="3.2" ry="2" fill="${shine}"/>
    </g>`;
}

function shoesFor(parts) {
  const { top, bottom } = parts;
  if (top === 'top-red' || bottom === 'bottom-red') return sneakers('#F48FB1', '#FFFFFF');
  if (top === 'top-navy' || bottom === 'bottom-navy') return sneakers('#7EC8E8', '#FFFFFF');
  if (top === 'top-lilac' || bottom === 'bottom-lilac') return sneakers('#1A1210', '#C9A24B');
  if (top === 'top-sun' || bottom === 'bottom-sun') return sneakers('#2A2826', '#C42A45');
  if (top === 'top-mint' || bottom === 'bottom-mint') return sneakers('#1F3A5C', '#F7F3EC');
  if (top === 'top-coral' || bottom === 'bottom-coral') return sneakers('#E86B5A', '#FFFFFF');
  if (top === 'top-denim') return sneakers('#F3E6C8', '#6B3E24');
  if (top === 'top-coat' || bottom === 'bottom-skirt') return sneakers('#3A3344', '#C9A24B');
  if (top === 'top-ball' || bottom === 'bottom-ball') return sneakers('#E8C56B', '#6B2A4A');
  return sneakers();
}

const EXTRAS = {
  glasses: `
    <g fill="none" stroke="#2C2C33" stroke-width="2.2" stroke-linecap="round">
      <circle cx="68" cy="62" r="11" fill="#FFFFFF" fill-opacity="0.18"/>
      <circle cx="92" cy="62" r="11" fill="#FFFFFF" fill-opacity="0.18"/>
      <path d="M79,61 L81,61"/>
      <path d="M57,60 L52,62"/>
      <path d="M103,60 L108,62"/>
    </g>`,
  earrings: `
    <circle cx="50" cy="74" r="3.4" fill="#E8C56B"/>
    <circle cx="110" cy="74" r="3.4" fill="#E8C56B"/>`,
  bow: `
    <g transform="translate(80 22)">
      <path d="M0,0 L-14,-8 L-14,8 Z" fill="#E35A7A"/>
      <path d="M0,0 L14,-8 L14,8 Z" fill="#E35A7A"/>
      <circle cx="0" cy="0" r="4.2" fill="#C44868"/>
    </g>`,
  beanie: `
    <path d="M52,40 Q80,6 108,40 Q102,32 80,30 Q58,32 52,40 Z" fill="#3A6B5A"/>
    <ellipse cx="80" cy="28" rx="7" ry="4" fill="#C44868"/>`,
  scarf: `
    <path d="M64,98 Q80,112 96,98 L94,138 Q80,128 70,146 Z" fill="#C43B4C"/>
    <path d="M68,98 Q80,108 92,98" fill="none" stroke="#8E2A38" stroke-width="1.4"/>`,
  necklace: `
    <path d="M68,108 Q80,124 92,108" fill="none" stroke="#E8C56B" stroke-width="2"/>
    <circle cx="80" cy="124" r="3" fill="#E8C56B"/>`,
  clips: `
    <rect x="56" y="28" width="10" height="5" rx="2" fill="#E8C56B" transform="rotate(-18 61 30)"/>
    <rect x="94" y="28" width="10" height="5" rx="2" fill="#E8C56B" transform="rotate(18 99 30)"/>`,
  headband: `
    <path d="M54,34 Q80,18 106,34" fill="none" stroke="#C44868" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M54,34 Q80,18 106,34" fill="none" stroke="#F4E8CE" stroke-width="1.8" stroke-linecap="round"/>`,
  beret: `
    <ellipse cx="88" cy="30" rx="24" ry="11" fill="#C23A52"/>
    <ellipse cx="86" cy="26" rx="16" ry="7" fill="#A32F44"/>
    <circle cx="106" cy="22" r="3" fill="#F4E8CE"/>`,
  choker: `
    <rect x="67" y="100" width="26" height="6" rx="2" fill="#2A2220"/>
    <circle cx="80" cy="103" r="2.3" fill="#E8C56B"/>`,
  studs: `
    <circle cx="50" cy="74" r="2.4" fill="#C9D2DC"/>
    <circle cx="110" cy="74" r="2.4" fill="#C9D2DC"/>`,
  hoops: `
    <circle cx="50" cy="78" r="5.2" fill="none" stroke="#E8C56B" stroke-width="1.8"/>
    <circle cx="110" cy="78" r="5.2" fill="none" stroke="#E8C56B" stroke-width="1.8"/>`,
  pearls: `
    <circle cx="70" cy="108" r="2.1" fill="#F4EFE6"/>
    <circle cx="75" cy="114" r="2.1" fill="#F4EFE6"/>
    <circle cx="80" cy="118" r="2.3" fill="#F4EFE6"/>
    <circle cx="85" cy="114" r="2.1" fill="#F4EFE6"/>
    <circle cx="90" cy="108" r="2.1" fill="#F4EFE6"/>`,
  tiara: `
    <path d="M58,28 Q80,12 102,28" fill="none" stroke="#E8C56B" stroke-width="2.2"/>
    <path d="M80,12 L80,20" stroke="#E8C56B" stroke-width="1.6"/>
    <circle cx="80" cy="12" r="3" fill="#E8C56B"/>
    <circle cx="68" cy="22" r="2" fill="#F4EFE6"/>
    <circle cx="92" cy="22" r="2" fill="#F4EFE6"/>`,
  flower: `
    <g transform="translate(104 36)">
      <circle cx="0" cy="0" r="3.2" fill="#E35A7A"/>
      <circle cx="-4" cy="-2" r="2.6" fill="#F48FB1"/>
      <circle cx="4" cy="-2" r="2.6" fill="#F48FB1"/>
      <circle cx="-3" cy="3" r="2.6" fill="#F48FB1"/>
      <circle cx="3" cy="3" r="2.6" fill="#F48FB1"/>
      <circle cx="0" cy="0" r="1.6" fill="#E8C56B"/>
    </g>`,
};

const LIPS = {
  none: `<path d="M73,80 Q80,86 87,80" fill="none" stroke="#C46B72" stroke-width="2.3" stroke-linecap="round"/>`,
  lipstick: `
    <path d="M73,78 Q76.8,76 80,77.4 Q83.2,76 87,78 Q80,88 73,78 Z" fill="#C42A45"/>
    <path d="M75,79.4 Q80,86.2 85,79.4" fill="none" stroke="#9A1F36" stroke-width="1" opacity=".5"/>`,
  gloss: `
    <path d="M73,78 Q76.8,76.4 80,77.6 Q83.2,76.4 87,78 Q80,86 73,78 Z" fill="#E56B94"/>
    <ellipse cx="82" cy="80" rx="3" ry="1.4" fill="#FFF" opacity=".45"/>`,
};

const SLOT_OF = {
  hair: 'hair',
  top: 'top',
  bottom: 'bottom',
  dress: 'dress',
  eyes: 'eyes',
  ears: 'ears',
  lips: 'lips',
  head: 'head',
  neck: 'neck',
};

function face(color, brow, meski = false) {
  const e = EYE_COLORS[color] || EYE_COLORS.brown;
  const brwi = meski
    ? `<path d="M59,54 Q68,50.5 77,54" fill="none" stroke="${brow}" stroke-width="3.2" stroke-linecap="round"/>
       <path d="M83,54 Q92,50.5 101,54" fill="none" stroke="${brow}" stroke-width="3.2" stroke-linecap="round"/>`
    : `<path d="M60,52 Q68,46 76,53" fill="none" stroke="${brow}" stroke-width="2.4" stroke-linecap="round"/>
       <path d="M84,53 Q92,46 100,52" fill="none" stroke="${brow}" stroke-width="2.4" stroke-linecap="round"/>`;
  return `
    <g>
      ${brwi}
      <ellipse cx="68" cy="62" rx="7.4" ry="8.6" fill="#FFF"/>
      <ellipse cx="92" cy="62" rx="7.4" ry="8.6" fill="#FFF"/>
      <ellipse cx="69" cy="63" rx="4.5" ry="5.4" fill="${e.iris}"/>
      <ellipse cx="93" cy="63" rx="4.5" ry="5.4" fill="${e.iris}"/>
      <ellipse cx="69" cy="63" rx="2.2" ry="2.8" fill="${e.dark}"/>
      <ellipse cx="93" cy="63" rx="2.2" ry="2.8" fill="${e.dark}"/>
      <circle cx="70.8" cy="60.8" r="1.35" fill="#FFF"/>
      <circle cx="94.8" cy="60.8" r="1.35" fill="#FFF"/>
      <path d="M80,66 Q83,71 79,74" fill="none" stroke="${SKIN_DEEP}" stroke-width="1.8" stroke-linecap="round"/>
    </g>`;
}

function lashes() {
  return `
    <g class="lashes" fill="none" stroke="#1A1210" stroke-linecap="round">
      <path d="M61,56 Q68,52.6 75.2,56.4" stroke-width="1.7"/>
      <path d="M84.8,56.4 Q92,52.6 99,56" stroke-width="1.7"/>
      <path d="M60.6,56 L56.4,49.6" stroke-width="1.4"/>
      <path d="M63,54.2 L60.2,47.8" stroke-width="1.35"/>
      <path d="M66.2,53.2 L64.8,47.6" stroke-width="1.25"/>
      <path d="M69.2,53.4 L69,48.4" stroke-width="1.15"/>
      <path d="M99.4,56 L103.6,49.6" stroke-width="1.4"/>
      <path d="M97,54.2 L99.8,47.8" stroke-width="1.35"/>
      <path d="M93.8,53.2 L95.2,47.6" stroke-width="1.25"/>
      <path d="M90.8,53.4 L91,48.4" stroke-width="1.15"/>
    </g>`;
}

// Wymiary rysunku ludzika. Mapa stawia go stopami na linii, więc musi wiedzieć,
// gdzie w rysunku kończą się buty.
export const DOLL = { w: 160, h: 320, feet: 265 };

// Sam rysunek, bez ramki <svg>. Potrzebny mapie, która wkłada ludzika do własnego SVG.
export function avatarBody(equipped = {}, { look = {} } = {}) {
  const hairId = equipped.hair || 'hair-bob';
  const palette = HAIR_COLORS[look.hairColor] || HAIR_COLORS.brunette;
  const eyeColor = look.eyeColor || 'brown';
  // Chłopak: bez rzęs, mocniejsze brwi, mniej różu na policzkach.
  const meski = look.postac === 'chłopak';
  const parts = clothesOf(equipped);

  const clothes = `${(BOTTOMS[parts.bottom] || BOTTOMS['bottom-shorts'])()}${(TOPS[parts.top] || TOPS['top-tshirt'])()}`;

  const lips = LIPS[equipped.lips] || LIPS.none;
  const neck = EXTRAS[equipped.neck] || '';
  const head = EXTRAS[equipped.head] || '';
  const faceBits = ['eyes', 'ears'].map((slot) => EXTRAS[equipped[slot]] || '').join('');
  const footwear = shoesFor(parts);

  return `
  ${hairBack(hairId, palette)}

  <path d="M61,102 L54,104 Q44,128 40,152 Q38,168 42,174 L50,176 Q54,168 52,154 Q56,128 66,108 Z" fill="${SKIN}"/>
  <path d="M99,102 L106,104 Q116,128 120,152 Q122,168 118,174 L110,176 Q106,168 108,154 Q104,128 94,108 Z" fill="${SKIN}"/>
  <path d="M40,172 Q36,178 40,184 Q48,188 54,182 Q56,176 50,172 Z" fill="${SKIN}"/>
  <path d="M120,172 Q124,178 120,184 Q112,188 106,182 Q104,176 110,172 Z" fill="${SKIN}"/>

  <path d="M66,158 L62,158 Q58,188 56,216 Q54,238 58,248 L70,248 Q72,216 74,188 L76,160 Z" fill="${SKIN}"/>
  <path d="M94,158 L98,158 Q102,188 104,216 Q106,238 102,248 L90,248 Q88,216 86,188 L84,160 Z" fill="${SKIN}"/>
  ${footwear}

  <path d="M58,98 Q80,90 102,98 L96,160 Q80,168 64,160 Z" fill="${SKIN}"/>
  <rect x="73" y="84" width="14" height="18" rx="7" fill="${SKIN_DARK}"/>

  <ellipse cx="80" cy="60" rx="27" ry="29" fill="${SKIN}"/>
  <ellipse cx="68" cy="70" rx="7" ry="4.2" fill="#F2A8A0" opacity="${meski ? '.16' : '.35'}"/>
  <ellipse cx="92" cy="70" rx="7" ry="4.2" fill="#F2A8A0" opacity="${meski ? '.16' : '.35'}"/>

  ${clothes}
  ${face(eyeColor, palette.brow, meski)}
  ${lips}
  ${hairFront(hairId, palette)}
  ${neck}
  ${meski ? '' : lashes()}
  ${faceBits}
  ${head}`;
}

export function renderAvatar(equipped = {}, { size = 220, look = {} } = {}) {
  return `
<svg viewBox="0 0 ${DOLL.w} ${DOLL.h}" width="${size}" height="${(size * DOLL.h) / DOLL.w}" role="img"
     aria-label="Twój ludzik" class="doll">${avatarBody(equipped, { look })}</svg>`;
}

// Ludzik dla ekranu startowego. Komponent rysuje go w układzie „0 0 100 146"
// ze stopami na y=146 — inaczej przestaje stać na podłodze. Klasa „body" jest
// potrzebna, bo to ją komponent kołysze animacją.
export const PODLOGA = { w: 100, h: 146 };

export function avatarNaPodlodze(equipped = {}, { look = {} } = {}) {
  const s = PODLOGA.h / DOLL.feet;
  const x = PODLOGA.w / 2 - (DOLL.w / 2) * s;
  return `<g class="body"><g transform="translate(${x.toFixed(2)} 0) scale(${s.toFixed(4)})">${avatarBody(
    equipped,
    { look }
  )}</g></g>`;
}

// Ludzik dla mapy trasy: (0,0) wypada na stopach, rysunek idzie w górę.
// Taki kontrakt ma komponent mapy — dzięki temu stawia postać na linii bez zgadywania wysokości.
export function avatarOnLine(equipped = {}, { size = 54, look = {} } = {}) {
  const s = size / DOLL.feet;
  return `<g transform="translate(${(-DOLL.w / 2) * s} ${-DOLL.feet * s}) scale(${s})">${avatarBody(
    equipped,
    { look }
  )}</g>`;
}

const ICON_BOX = {
  top: [46, 94, 68, 62],
  bottom: [40, 144, 80, 108],
  hair: [42, 6, 76, 110],
  head: [52, 4, 56, 44],
  eyes: [50, 48, 60, 28],
  ears: [45, 70, 10, 10],
  lips: [70, 74, 20, 16],
  neck: [60, 96, 40, 52],
  'hair-long': [40, 4, 80, 160],
  'hair-ponytail': [40, 6, 96, 140],
  'hair-short': [44, 8, 72, 86],
  'bottom-jeans': [48, 152, 64, 100],
  'bottom-ball': [36, 146, 88, 106],
  earrings: [45, 70, 10, 10],
  studs: [46, 70, 8, 8],
  hoops: [44, 72, 12, 12],
  glasses: [50, 48, 60, 28],
  bow: [62, 10, 36, 24],
  beanie: [50, 4, 60, 40],
  beret: [64, 14, 48, 28],
  clips: [54, 24, 52, 16],
  tiara: [56, 8, 48, 24],
  headband: [50, 14, 60, 24],
  flower: [96, 28, 16, 16],
  scarf: [62, 96, 36, 52],
  necklace: [64, 104, 32, 28],
  pearls: [66, 104, 28, 20],
  choker: [64, 96, 32, 16],
};

function iconSvg(inner, box, size) {
  const [x, y, w, h] = box;
  const pad = Math.max(w, h) * 0.14;
  const side = Math.max(w, h) + pad * 2;
  const vx = x - (side - w) / 2;
  const vy = y - (side - h) / 2;
  return `<svg class="item-icon" viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}" width="${size}" height="${size}" aria-hidden="true">${inner}</svg>`;
}

function pieceOf(item, look = {}) {
  if (TOPS[item.id]) return TOPS[item.id]();
  if (BOTTOMS[item.id]) return BOTTOMS[item.id]();
  if (item.slot === 'hair') {
    const c = HAIR_COLORS[look.hairColor] || HAIR_COLORS.brunette;
    return `${hairBack(item.id, c)}${hairFront(item.id, c)}`;
  }
  if (LIPS[item.id]) return LIPS[item.id];
  if (EXTRAS[item.id]) return EXTRAS[item.id];
  return '';
}

export function renderItemIcon(item, { size = 72, look = {} } = {}) {
  if (!item) return '';
  const box = ICON_BOX[item.id] || ICON_BOX[item.slot] || [40, 80, 80, 80];
  return iconSvg(pieceOf(item, look), box, size);
}

export function renderOutfitIcon(topId, bottomId, { size = 88 } = {}) {
  const inner = `${(BOTTOMS[bottomId] || BOTTOMS['bottom-shorts'])()}${(TOPS[topId] || TOPS['top-tshirt'])()}`;
  return iconSvg(inner, [40, 92, 80, 164], size);
}

export function withItem(equipped, item) {
  const next = { ...equipped };
  delete next.dress;
  if (item.slot === 'dress' && DRESS_PARTS[item.id]) {
    return { ...next, ...DRESS_PARTS[item.id] };
  }
  next[item.slot] = item.id;
  return next;
}

export function slotName(slot) {
  return (
    {
      hair: 'włosy',
      top: 'góra',
      bottom: 'dół',
      dress: 'sukienka',
      eyes: 'okulary',
      ears: 'kolczyki',
      lips: 'usta',
      head: 'na głowę',
      neck: 'szyja',
    }[SLOT_OF[slot] || slot] || slot
  );
}
