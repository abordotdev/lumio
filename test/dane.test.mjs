import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { verbForms } = await import('../js/forms.js');

const katalog = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const moduly = katalog.modules.map((w) => ({
  id: w.id,
  dane: JSON.parse(readFileSync(`data/${w.file}`, 'utf8')),
}));

function wszystkieZdania() {
  return moduly.flatMap((m) =>
    [...(m.dane.translations || []), ...(m.dane.dictation || [])].map((z) => ({
      ...z,
      modul: m.id,
    }))
  );
}

const zdania = wszystkieZdania();

test('identyfikatory zdań nie powtarzają się między modułami', () => {
  const widziane = new Map();
  const kolizje = [];
  for (const z of zdania) {
    if (widziane.has(z.id)) kolizje.push(`${z.id}: ${widziane.get(z.id)} i ${z.modul}`);
    widziane.set(z.id, z.modul);
  }
  assert.deepEqual(kolizje, [], 'te same id znaczą wspólny postęp dla różnych zdań');
});

test('każde zdanie ma polski, angielski i kawałki do shadowingu', () => {
  const braki = zdania.filter((z) => !z.pl || !z.en || !(z.chunks || []).length).map((z) => z.id);
  assert.deepEqual(braki, []);
});

test('kawałki do shadowingu składają się z powrotem w całe zdanie', () => {
  const goly = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}]/gu, '');
  const rozjazd = zdania
    .filter((z) => goly((z.chunks || []).join(' ')) !== goly(z.en))
    .map((z) => `${z.id}: „${(z.chunks || []).join(' | ')}" ≠ „${z.en}"`);
  assert.deepEqual(rozjazd, []);
});

// Rozbija zdanie na pojedyncze słowa: skróty rozwija, „isn't" daje „is" i „not".
function slowaZdania(en) {
  return new Set(
    String(en)
      .toLowerCase()
      .replace(/’/g, "'")
      .replace(/\bcan't\b/g, 'can not')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/n't\b/g, ' not')
      .replace(/'m\b/g, ' am')
      .replace(/'re\b/g, ' are')
      .replace(/'ve\b/g, ' have')
      .replace(/'ll\b/g, ' will')
      .replace(/'s\b/g, ' is')
      .split(/[^a-z]+/)
      .filter(Boolean)
  );
}

test('czasownik przypisany zdaniu naprawdę w nim występuje', () => {
  const rozjazd = [];
  for (const z of zdania) {
    if (!z.lemma) continue;
    const f = verbForms(z.lemma);
    // trzecia osoba: runs, starts, disappears, watches
    const trzecia = /(s|sh|ch|x|z|o)$/.test(f.base) ? `${f.base}es` : `${f.base}s`;
    const formy = [f.base, f.ed, f.pp, f.ing, trzecia];
    if (z.lemma === 'be') formy.push('am', 'is', 'are', 'were');
    if (z.lemma === 'have') formy.push('has');
    const slowa = slowaZdania(z.en);
    if (!formy.some((forma) => slowa.has(forma))) {
      rozjazd.push(`${z.id} [${z.lemma}]: ${z.en}`);
    }
  }
  assert.deepEqual(rozjazd, [], 'kafelki podsuną formy czasownika, którego w zdaniu nie ma');
});

test('lista akceptowanych wariantów nie powtarza wzorca', () => {
  const goly = (s) =>
    String(s)
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number} ]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  const duble = zdania
    .filter((z) => (z.accept || []).some((a) => goly(a) === goly(z.en)))
    .map((z) => z.id);
  assert.deepEqual(duble, []);
});
