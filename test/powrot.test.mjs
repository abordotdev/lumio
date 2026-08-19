import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubStorage, testModule } from './helpers.mjs';

stubStorage();

const store = await import('../js/store.js');
const { buildComeback, COMEBACK_ITEMS } = await import('../js/scheduler.js');

const DZIEN = 24 * 3600 * 1000;
const czasy = testModule('czasy', ['past', 'now'], { past: 6, now: 6 });
const wszystkie = [czasy];

function lekcjaSprzed(dni) {
  store.get().lessons.push({
    at: new Date(Date.now() - dni * DZIEN).toISOString(),
    count: 15,
    correct: 12,
    km: 20,
    coins: 20,
  });
}

test('bez ani jednej lekcji to nie jest powrót po przerwie', () => {
  store.wipe();
  assert.equal(store.isComeback(), false);
});

test('lekcja sprzed dwóch dni to nie przerwa', () => {
  store.wipe();
  lekcjaSprzed(2);
  assert.equal(store.isComeback(), false);
});

test('lekcja sprzed trzech miesięcy to przerwa', () => {
  store.wipe();
  lekcjaSprzed(90);
  assert.equal(store.isComeback(), true);
  assert.equal(store.daysSinceLastLesson(), 90);
});

test('pierwsza lekcja po przerwie zaczyna od zdań, które szły najlepiej', () => {
  store.wipe();
  lekcjaSprzed(90);

  // jedno zdanie mocno opanowane, jedno ledwo tknięte
  for (let i = 0; i < 4; i += 1) store.recordAnswer('czasy-past-0', true);
  store.recordAnswer('czasy-past-1', true);
  store.recordAnswer('czasy-now-0', false);

  const { steps, comeback } = buildComeback(wszystkie);

  assert.equal(comeback, true);
  assert.equal(steps[0].item.id, 'czasy-past-0', 'najpierw to, co umiem najlepiej');
  assert.ok(
    steps.findIndex((s) => s.item.id === 'czasy-now-0') > 0,
    'zdanie, które szło źle, nie otwiera powrotu'
  );
  assert.ok(steps.length <= COMEBACK_ITEMS);
});

test('powrót nie wciąga zdań, których nigdy nie widziałam', () => {
  store.wipe();
  lekcjaSprzed(90);
  store.recordAnswer('czasy-past-0', true);

  const { steps } = buildComeback(wszystkie);
  assert.equal(steps.length, 1, 'jest tylko jedno poznane zdanie');
});

test('normalnie pomyłka zrzuca zdanie na sam dół', () => {
  store.wipe();
  lekcjaSprzed(1);
  for (let i = 0; i < 4; i += 1) store.recordAnswer('czasy-past-0', true);
  assert.equal(store.itemState('czasy-past-0').box, 4);

  store.recordAnswer('czasy-past-0', false);
  assert.equal(store.itemState('czasy-past-0').box, 0);
});

test('po przerwie pomyłka cofa o jeden krok, nie kasuje miesięcy', () => {
  store.wipe();
  lekcjaSprzed(90);
  for (let i = 0; i < 4; i += 1) store.recordAnswer('czasy-past-0', true);
  assert.equal(store.itemState('czasy-past-0').box, 4);

  store.recordAnswer('czasy-past-0', false);
  assert.equal(store.itemState('czasy-past-0').box, 3, 'zapominanie po przerwie jest normalne');
});
