// Rywalizujące formy czasownika do kafelków — nie obce słowa, tylko zły czas.

const IRR = {
  be: { ed: 'was', pp: 'been', ing: 'being' },
  begin: { ed: 'began', pp: 'begun', ing: 'beginning' },
  break: { ed: 'broke', pp: 'broken', ing: 'breaking' },
  bring: { ed: 'brought', pp: 'brought', ing: 'bringing' },
  build: { ed: 'built', pp: 'built', ing: 'building' },
  buy: { ed: 'bought', pp: 'bought', ing: 'buying' },
  catch: { ed: 'caught', pp: 'caught', ing: 'catching' },
  choose: { ed: 'chose', pp: 'chosen', ing: 'choosing' },
  come: { ed: 'came', pp: 'come', ing: 'coming' },
  do: { ed: 'did', pp: 'done', ing: 'doing' },
  feel: { ed: 'felt', pp: 'felt', ing: 'feeling' },
  find: { ed: 'found', pp: 'found', ing: 'finding' },
  get: { ed: 'got', pp: 'got', ing: 'getting' },
  give: { ed: 'gave', pp: 'given', ing: 'giving' },
  go: { ed: 'went', pp: 'gone', ing: 'going' },
  have: { ed: 'had', pp: 'had', ing: 'having' },
  keep: { ed: 'kept', pp: 'kept', ing: 'keeping' },
  know: { ed: 'knew', pp: 'known', ing: 'knowing' },
  let: { ed: 'let', pp: 'let', ing: 'letting' },
  leave: { ed: 'left', pp: 'left', ing: 'leaving' },
  make: { ed: 'made', pp: 'made', ing: 'making' },
  meet: { ed: 'met', pp: 'met', ing: 'meeting' },
  put: { ed: 'put', pp: 'put', ing: 'putting' },
  read: { ed: 'read', pp: 'read', ing: 'reading' },
  run: { ed: 'ran', pp: 'run', ing: 'running' },
  say: { ed: 'said', pp: 'said', ing: 'saying' },
  see: { ed: 'saw', pp: 'seen', ing: 'seeing' },
  send: { ed: 'sent', pp: 'sent', ing: 'sending' },
  set: { ed: 'set', pp: 'set', ing: 'setting' },
  speak: { ed: 'spoke', pp: 'spoken', ing: 'speaking' },
  spend: { ed: 'spent', pp: 'spent', ing: 'spending' },
  take: { ed: 'took', pp: 'taken', ing: 'taking' },
  teach: { ed: 'taught', pp: 'taught', ing: 'teaching' },
  tell: { ed: 'told', pp: 'told', ing: 'telling' },
  think: { ed: 'thought', pp: 'thought', ing: 'thinking' },
  understand: { ed: 'understood', pp: 'understood', ing: 'understanding' },
  write: { ed: 'wrote', pp: 'written', ing: 'writing' },
};

const SAMOGLOSKI = 'aeiou';

// Dłuższe słowa podwajają tylko wtedy, gdy akcent pada na ostatnią sylabę.
// Bez tej listy wychodzi „preferred" dobrze, ale też „monitorred" i „listenned".
const PODWAJA_MIMO_WSZYSTKO = new Set([
  'prefer',
  'refer',
  'defer',
  'confer',
  'infer',
  'occur',
  'recur',
  'incur',
  'admit',
  'permit',
  'commit',
  'submit',
  'omit',
  'transmit',
  'control',
  'patrol',
  'regret',
  'forget',
  'begin',
  'upset',
  'equip',
  'compel',
  'expel',
  'propel',
  'repel',
  'rebel',
  'deter',
]);

// Krótkie słowo typu spółgłoska-samogłoska-spółgłoska podwaja końcówkę: stop → stopped.
function podwaja(lemma) {
  if (lemma.length < 3) return false;
  const [a, b, c] = lemma.slice(-3);
  if (SAMOGLOSKI.includes(a) || !SAMOGLOSKI.includes(b) || SAMOGLOSKI.includes(c)) return false;
  if ('wxy'.includes(c)) return false;
  const sylaby = (lemma.match(/[aeiouy]+/g) || []).length;
  return sylaby === 1 || PODWAJA_MIMO_WSZYSTKO.has(lemma);
}

export function verbForms(lemma) {
  const slowo = String(lemma || '').toLowerCase();
  if (!slowo) return null;
  if (IRR[slowo]) return { base: slowo, ...IRR[slowo] };

  if (slowo.endsWith('e') && !slowo.endsWith('ee')) {
    const rdzen = slowo.slice(0, -1);
    return { base: slowo, ed: `${slowo}d`, pp: `${slowo}d`, ing: `${rdzen}ing` };
  }
  if (/[^aeiou]y$/.test(slowo)) {
    const rdzen = slowo.slice(0, -1);
    return { base: slowo, ed: `${rdzen}ied`, pp: `${rdzen}ied`, ing: `${slowo}ing` };
  }
  if (podwaja(slowo)) {
    const podwojone = slowo + slowo.slice(-1);
    return { base: slowo, ed: `${podwojone}ed`, pp: `${podwojone}ed`, ing: `${podwojone}ing` };
  }
  return { base: slowo, ed: `${slowo}ed`, pp: `${slowo}ed`, ing: `${slowo}ing` };
}

function unique(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const k = tileKey(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function tileKey(s) {
  let t = String(s)
    .toLowerCase()
    .replace(/[‘’ʼ′`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  t = t.replace(/\bi'm\b/g, 'i am');
  t = t.replace(/\bi've\b/g, 'i have');
  t = t.replace(/\bi'll\b/g, 'i will');
  t = t.replace(/^'m\b/g, 'i am');
  t = t.replace(/^'ve\b/g, 'i have');
  t = t.replace(/^am\b/g, 'i am');
  t = t.replace(/^have been\b/g, 'i have been');
  t = t.replace(/^will\b/g, 'i will');
  return t;
}

export function verbDistractors(item, module) {
  const lemma = item.lemma;
  const taken = new Set((item.chunks || []).map(tileKey));
  const rivals = [];

  if (lemma) {
    const p = verbForms(lemma);
    rivals.push(
      p.ed,
      p.ing,
      p.base,
      `have ${p.pp}`,
      `have been ${p.ing}`,
      `am ${p.ing}`,
      `was ${p.ing}`,
      `will ${p.base}`,
      `going to ${p.base}`
    );
  }

  if (module && lemma) {
    for (const t of module.translations || []) {
      if (t.lemma !== lemma || t.id === item.id) continue;
      const first = (t.chunks || [])[0];
      if (first) rivals.push(first);
    }
  }

  return unique(rivals)
    .filter((r) => !taken.has(tileKey(r)))
    .slice(0, 4);
}

export function usesTenseTiles(item) {
  return Boolean(item?.lemma);
}

function phraseDistractors(item, module) {
  const taken = new Set((item.chunks || []).map(tileKey));
  const same = [];
  const other = [];
  for (const t of module?.translations || []) {
    if (t.id === item.id) continue;
    const bucket = item.pattern && t.pattern === item.pattern ? same : other;
    for (const c of t.chunks || []) {
      if (!taken.has(tileKey(c))) bucket.push(c);
    }
  }
  return unique([...same, ...other]);
}

export function tileBank(item, module) {
  const chunks = item.chunks && item.chunks.length ? [...item.chunks] : [item.en];
  const seen = new Set(chunks.map(tileKey));
  const extras = [];
  const add = (list) => {
    for (const r of list) {
      if (extras.length >= 4) return;
      const k = tileKey(r);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      extras.push(r);
    }
  };
  add(verbDistractors(item, module));
  add(phraseDistractors(item, module));
  return [...chunks, ...extras];
}

export function formHint(answer, item) {
  const mine = String(answer || '').toLowerCase();
  const want = String(item?.en || '').toLowerCase();
  if (!mine || !want) return '';

  if (
    /\bbeen\b/.test(want) &&
    /\b\w+ing\b/.test(want) &&
    /\bbeen\b/.test(mine) &&
    /\b\w+ed\b/.test(mine) &&
    !/\b\w+ing\b/.test(mine)
  ) {
    return "Po have been / I've been zawsze -ing (testing), bo to czynność która TRWA. Forma z -ed po been znaczy coś innego — np. I've been tested = ktoś testował CIEBIE.";
  }
  if (/\b(i'm|i am|we're|we are)\b/.test(want) && /\bing\b/.test(want) && !/\bing\b/.test(mine)) {
    return "Po I'm / we're idzie -ing: testing, waiting, working — bo to dzieje się TERAZ, w trakcie.";
  }
  if (/\bhave been\b/.test(want) && (/\bi'm\b/.test(mine) || /\bi am\b/.test(mine))) {
    return "I'm testing to tylko ta chwila. Gdy coś trwa OD kiedyś do teraz: I've been testing.";
  }
  const hasPerfect = /\b(have|haven't|has|hasn't|i've|we've|you've|they've|'ve)\b/;
  if (hasPerfect.test(want) && hasPerfect.test(mine) && !/\bbeen\b/.test(want)) {
    const edWord = (want.match(/\b[a-z]+ed\b/) || [])[0];
    if (edWord && !new RegExp(`\\b${edWord}\\b`).test(mine)) {
      const base = edWord.replace(/ied$/, 'y').replace(/ed$/, '');
      return `Po have / haven't idzie ${edWord}, nie ${base}. Have/haven't znaczy że to już zrobione, dlatego forma z -ed.`;
    }
  }
  return '';
}
