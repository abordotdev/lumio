// Ocena odpowiedzi. Zasada: akceptuj szeroko, ucz jednego wzorca.

const CONTRACTIONS = [
  ["i'm", 'i am'],
  ["i've", 'i have'],
  ["i'll", 'i will'],
  ["i'd", 'i would'],
  ["we're", 'we are'],
  ["we've", 'we have'],
  ["we'll", 'we will'],
  ["you're", 'you are'],
  ["you've", 'you have'],
  ["you'll", 'you will'],
  ["they're", 'they are'],
  ["they've", 'they have'],
  ["they'll", 'they will'],
  ["she's", 'she is'],
  ["he's", 'he is'],
  ["it's", 'it is'],
  ["that's", 'that is'],
  ["there's", 'there is'],
  ["what's", 'what is'],
  ["let's", 'let us'],
  ["don't", 'do not'],
  ["doesn't", 'does not'],
  ["didn't", 'did not'],
  ["haven't", 'have not'],
  ["hasn't", 'has not'],
  ["hadn't", 'had not'],
  ["isn't", 'is not'],
  ["aren't", 'are not'],
  ["wasn't", 'was not'],
  ["weren't", 'were not'],
  ["won't", 'will not'],
  ["wouldn't", 'would not'],
  ["couldn't", 'could not'],
  ["shouldn't", 'should not'],
  ["can't", 'can not'],
  ['cannot', 'can not'],
];

const DIGITS = [
  ['1', 'one'],
  ['2', 'two'],
  ['3', 'three'],
  ['4', 'four'],
  ['5', 'five'],
  ['6', 'six'],
  ['7', 'seven'],
  ['8', 'eight'],
  ['9', 'nine'],
  ['10', 'ten'],
  ['12', 'twelve'],
];

export function normalize(input) {
  let s = (input || '').toLowerCase();
  s = s.replace(/[‘’ʼ′`´]/g, "'");
  s = s.replace(/[“”„«»]/g, '"');
  s = s.replace(/[–—]/g, '-');
  for (const [short, long] of CONTRACTIONS) {
    s = s.replace(
      new RegExp(`(^|[^a-z'])${short.replace("'", "'")}(?![a-z'])`, 'g'),
      (m, p1) => `${p1}${long}`
    );
  }
  s = s.replace(/[.,!?;:"()…]/g, ' ');
  s = s.replace(/\s*-\s*/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  for (const [digit, word] of DIGITS) {
    s = s.replace(new RegExp(`(^|\\s)${digit}(?=\\s|$)`, 'g'), (m, p1) => `${p1}${word}`);
  }
  return s;
}

function distance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const SUFFIXES = ['ing', 'ied', 'ed', 'es', 'er', 'est', 's', 'd'];

function stems(word) {
  const w = word.toLowerCase();
  const out = new Set([w]);
  for (const s of SUFFIXES) {
    if (w.length > s.length + 2 && w.endsWith(s)) out.add(w.slice(0, -s.length));
  }
  return out;
}

function isFormChange(a, b) {
  if (a === b) return false;
  const sa = stems(a);
  const sb = stems(b);
  for (const x of sa) if (sb.has(x)) return true;
  return false;
}

function hasFormError(mine, want) {
  const mw = mine.split(' ').filter(Boolean);
  const ww = want.split(' ').filter(Boolean);
  const n = Math.min(mw.length, ww.length);
  for (let i = 0; i < n; i += 1) {
    if (isFormChange(mw[i], ww[i])) return true;
  }
  return false;
}

function typoPairs(mineNorm, wantNorm) {
  const diff = diffWords(mineNorm, wantNorm);
  const a = diff.mine.filter((p) => p.t === 'typo');
  const b = diff.want.filter((p) => p.t === 'typo');
  const n = Math.min(a.length, b.length);
  const pairs = [];
  for (let i = 0; i < n; i += 1) pairs.push({ mine: a[i].w, want: b[i].w });
  return pairs;
}

function isTypo(mine, want) {
  const d = distance(mine, want);
  if (d <= 0 || d > 2 || want.length < 10) return false;
  if (hasFormError(mine, want)) return false;
  return true;
}

/**
 * verdict:
 *   'exact'   — wzorzec
 *   'variant' — inny poprawny sposób; pokazujemy wzorzec jako "naturalniej powiedz tak"
 *   'typo'    — literówka, liczy się jako dobrze
 *   'trap'    — przewidziany błąd, mamy dla niego celną diagnozę
 *   'wrong'   — coś innego; pokazujemy różnicę
 */
export function grade(item, answer) {
  const target = item.en;
  const mine = normalize(answer);
  const want = normalize(target);

  if (!mine)
    return { verdict: 'wrong', correct: false, canonical: target, diff: diffWords('', target) };

  if (mine === want) return { verdict: 'exact', correct: true, canonical: target };

  for (const alt of item.accept || []) {
    if (mine === normalize(alt)) {
      return { verdict: 'variant', correct: true, canonical: target, yours: answer.trim() };
    }
  }

  for (const trap of item.traps || []) {
    if (mine === normalize(trap.input)) {
      return {
        verdict: 'trap',
        correct: false,
        canonical: target,
        why: trap.why,
        diff: diffWords(answer, target),
      };
    }
  }

  if (isTypo(mine, want)) {
    return {
      verdict: 'typo',
      correct: true,
      canonical: target,
      yours: answer.trim(),
      diff: diffWords(answer, target),
      typos: typoPairs(mine, want),
    };
  }
  for (const alt of item.accept || []) {
    const altNorm = normalize(alt);
    if (isTypo(mine, altNorm)) {
      return {
        verdict: 'typo',
        correct: true,
        canonical: target,
        yours: answer.trim(),
        diff: diffWords(answer, alt),
        typos: typoPairs(mine, altNorm),
      };
    }
  }

  return { verdict: 'wrong', correct: false, canonical: target, diff: diffWords(answer, target) };
}

// Różnica słowo po słowie — żebyś widziała dokładnie, co doszło i czego brakuje.
export function diffWords(mineRaw, targetRaw) {
  const a = (mineRaw || '').trim().split(/\s+/).filter(Boolean);
  const b = (targetRaw || '').trim().split(/\s+/).filter(Boolean);
  const key = (w) => normalize(w);

  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] =
        key(a[i]) === key(b[j])
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const mine = [];
  const want = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (key(a[i]) === key(b[j])) {
      mine.push({ w: a[i], t: 'same' });
      want.push({ w: b[j], t: 'same' });
      i += 1;
      j += 1;
    } else if (
      distance(key(a[i]), key(b[j])) <= 2 &&
      key(a[i]).length > 2 &&
      key(b[j]).length > 2
    ) {
      mine.push({ w: a[i], t: 'typo' });
      want.push({ w: b[j], t: 'typo' });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      mine.push({ w: a[i], t: 'extra' });
      i += 1;
    } else {
      want.push({ w: b[j], t: 'missing' });
      j += 1;
    }
  }
  while (i < a.length) {
    mine.push({ w: a[i], t: 'extra' });
    i += 1;
  }
  while (j < b.length) {
    want.push({ w: b[j], t: 'missing' });
    j += 1;
  }

  return { mine, want };
}
