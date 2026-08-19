import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubStorage } from './helpers.mjs';

stubStorage();
const store = await import('../js/store.js');

test('dobra odpowiedź podnosi pudełko i zapala „zrobione"', () => {
  store.wipe();
  assert.equal(store.isDone('x'), false);
  store.recordAnswer('x', true);
  assert.equal(store.itemState('x').box, 1);
  assert.equal(store.isDone('x'), true);
  assert.equal(store.isMastered('x'), false);
});

test('trzy dobre odpowiedzi to „umiem" — pudełko 3', () => {
  store.wipe();
  store.recordAnswer('x', true);
  store.recordAnswer('x', true);
  store.recordAnswer('x', true);
  assert.equal(store.itemState('x').box, 3);
  assert.equal(store.isMastered('x'), true);
});

test('pomyłka poza trybem powrotu zrzuca zdanie na sam dół', () => {
  store.wipe();
  store.recordAnswer('x', true);
  store.recordAnswer('x', true);
  store.recordAnswer('x', false);
  assert.equal(store.itemState('x').box, 0);
  assert.equal(store.isDone('x'), false);
  assert.equal(store.itemState('x').wrong, 1);
});

test('kopia postępu przeżywa eksport i import w całości', () => {
  store.wipe();
  store.recordAnswer('a', true);
  store.recordAnswer('b', true);
  store.recordAnswer('b', true);
  store.addLesson({ count: 10, correct: 8, km: 20, coins: 20 });
  const km = store.get().km;
  const boxB = store.itemState('b').box;
  const tekst = store.exportText();

  store.wipe();
  assert.equal(store.get().km, 0, 'po wyczyszczeniu jest pusto');

  store.importText(tekst);
  assert.equal(store.get().km, km, 'kilometry wracają z kopii');
  assert.equal(store.itemState('b').box, boxB, 'pudełka zdań wracają z kopii');
  assert.equal(store.itemState('a').introduced, true, 'poznane zdania zostają poznane');
});

test('import odrzuca plik, który nie jest kopią Lumio', () => {
  assert.throws(() => store.importText('{"cos":"innego"}'));
  assert.throws(() => store.importText('to nie jest nawet JSON'));
});
