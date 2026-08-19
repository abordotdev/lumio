import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubStorage } from './helpers.mjs';

stubStorage();

const { payout, LESSON_KM, LESSON_COINS } = await import('../js/scheduler.js');

test('lekcja doprowadzona do końca płaci pełną stawkę', () => {
  const p = payout({ answered: 15, target: 15, review: false, aborted: false });
  assert.equal(p.km, LESSON_KM);
  assert.equal(p.coins, LESSON_COINS);
});

test('koniec po czasie też płaci pełną stawkę, choćby zdań było mniej', () => {
  const p = payout({ answered: 6, target: 15, review: false, aborted: false });
  assert.equal(p.km, LESSON_KM, 'gorszy dzień nie jest karany');
});

test('przerwanie po jednej odpowiedzi nie płaci pełnej stawki', () => {
  const p = payout({ answered: 1, target: 15, review: false, aborted: true });
  assert.ok(p.km < LESSON_KM, 'inaczej wystarczy klikać start i przerwij');
  assert.ok(p.km >= 0);
});

test('przerwanie tuż przed końcem płaci prawie całość', () => {
  const p = payout({ answered: 14, target: 15, review: false, aborted: true });
  assert.ok(p.km >= LESSON_KM - 3);
});

test('powtórka płaci połowę stawki', () => {
  const p = payout({ answered: 8, target: 8, review: true, aborted: false });
  assert.equal(p.km, 10);
  assert.equal(p.coins, 10);
});

test('zerowy cel nie wysadza dzielenia', () => {
  const p = payout({ answered: 0, target: 0, review: false, aborted: true });
  assert.equal(Number.isFinite(p.km), true);
  assert.equal(p.km, 0);
});
