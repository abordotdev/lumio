import { test } from 'node:test';
import assert from 'node:assert/strict';

const { verbForms, verbDistractors, usesTenseTiles, tileBank } = await import('../js/forms.js');

test('regularny czasownik odmienia się poprawnie', () => {
  assert.deepEqual(verbForms('check'), {
    base: 'check',
    ed: 'checked',
    pp: 'checked',
    ing: 'checking',
  });
});

test('czasownik na -e nie dubluje litery', () => {
  assert.deepEqual(verbForms('use'), { base: 'use', ed: 'used', pp: 'used', ing: 'using' });
});

test('spółgłoska plus y daje -ied', () => {
  const f = verbForms('try');
  assert.equal(f.ed, 'tried');
  assert.equal(f.ing, 'trying');
});

test('samogłoska plus y zostaje bez zmian', () => {
  const f = verbForms('play');
  assert.equal(f.ed, 'played');
  assert.equal(f.ing, 'playing');
});

test('krótkie słowo podwaja spółgłoskę', () => {
  assert.equal(verbForms('stop').ed, 'stopped');
  assert.equal(verbForms('stop').ing, 'stopping');
  assert.equal(verbForms('plan').ing, 'planning');
});

test('czasowniki nieregularne mają własne formy', () => {
  assert.equal(verbForms('go').ed, 'went');
  assert.equal(verbForms('go').pp, 'gone');
  assert.equal(verbForms('write').ed, 'wrote');
  assert.equal(verbForms('write').pp, 'written');
  assert.equal(verbForms('read').ed, 'read');
  assert.equal(verbForms('leave').ed, 'left');
});

test('zdanie z pola lemma dostaje rywalizujące formy, bez tabelki w kodzie', () => {
  const item = { id: 'zupelnie-nowe', lemma: 'check', chunks: ['I checked', 'the logs'] };
  assert.equal(usesTenseTiles(item), true);
  const rywale = verbDistractors(item, { translations: [] });
  assert.ok(rywale.length > 0);
  assert.ok(
    rywale.some((r) => /checking/.test(r)),
    'wśród rywali ma być forma z -ing'
  );
});

test('zdanie bez czasownika nie udaje, że ma formy', () => {
  assert.equal(usesTenseTiles({ id: 'nic', chunks: ['Nice to meet you'] }), false);
});

test('bank kafelków rozdziela osobę od czasownika i nie dubluje', () => {
  const item = { id: 'a', lemma: 'test', chunks: ['I tested', 'it yesterday'] };
  const bank = tileBank(item, { translations: [] });
  const male = bank.map((b) => b.toLowerCase());
  assert.equal(new Set(male).size, male.length, 'żaden kafelek się nie dubluje');
  assert.ok(bank.includes('I') && bank.includes('tested'), 'osoba i czasownik jako osobne kafelki');
  assert.ok(!bank.includes('I tested'), 'nie ma sklejonego „I tested"');
});

test('dłuższe słowa nie podwajają spółgłoski bez powodu', () => {
  assert.equal(verbForms('monitor').ed, 'monitored');
  assert.equal(verbForms('listen').ed, 'listened');
  assert.equal(verbForms('cover').ed, 'covered');
  assert.equal(verbForms('offer').ing, 'offering');
});

test('ale podwajają, gdy akcent pada na koniec', () => {
  assert.equal(verbForms('prefer').ed, 'preferred');
  assert.equal(verbForms('commit').ing, 'committing');
});
