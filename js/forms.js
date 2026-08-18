// Rywalizujące formy czasownika do kafelków — nie obce słowa, tylko zły czas.

const LEMMA = {
  t01: 'test',
  t05: 'test',
  t08: 'test',
  t19: 'test',
  t22: 'test',
  t02: 'report',
  t16: 'report',
  t03: 'check',
  t12: 'check',
  t17: 'check',
  t21: 'check',
  t04: 'have',
  t06: 'wait',
  t09: 'wait',
  t07: 'work',
  t10: 'work',
  t11: 'look',
  t13: 'take',
  t14: 'message',
  t15: 'be',
  t23: 'be',
  t24: 'be',
  t18: 'finish',
  t20: 'finish',
};

const IRR = {
  have: { base: 'have', ed: 'had', pp: 'had', ing: 'having' },
  be: { base: 'be', ed: 'was', pp: 'been', ing: 'being' },
  take: { base: 'take', ed: 'took', pp: 'taken', ing: 'taking' },
};

function parts(lemma) {
  if (IRR[lemma]) return IRR[lemma];
  const e = lemma.endsWith('e');
  return {
    base: lemma,
    ed: e ? `${lemma}d` : `${lemma}ed`,
    pp: e ? `${lemma}d` : `${lemma}ed`,
    ing: e ? `${lemma.slice(0, -1)}ing` : `${lemma}ing`,
  };
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
  const lemma = item.lemma || LEMMA[item.id];
  const taken = new Set((item.chunks || []).map(tileKey));
  const rivals = [];

  if (lemma) {
    const p = parts(lemma);
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
      if ((t.lemma || LEMMA[t.id]) !== lemma || t.id === item.id) continue;
      const first = (t.chunks || [])[0];
      if (first) rivals.push(first);
    }
  }

  return unique(rivals)
    .filter((r) => !taken.has(tileKey(r)))
    .slice(0, 4);
}

export function tileBank(item, module) {
  const chunks = item.chunks && item.chunks.length ? [...item.chunks] : [item.en];
  const seen = new Set(chunks.map(tileKey));
  const extras = [];
  for (const r of verbDistractors(item, module)) {
    const k = tileKey(r);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    extras.push(r);
  }
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
