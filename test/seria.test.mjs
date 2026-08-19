import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubStorage } from './helpers.mjs';

stubStorage();
const store = await import('../js/store.js');

const DZIEN = 24 * 3600 * 1000;
const TERAZ = new Date('2026-08-19T18:00:00').getTime();

function lekcjeSprzed(...dni) {
  store.wipe();
  for (const d of dni) {
    store.get().lessons.push({
      at: new Date(TERAZ - d * DZIEN).toISOString(),
      count: 15,
      correct: 12,
      km: 20,
      coins: 20,
    });
  }
}

test('bez lekcji nie ma serii', () => {
  store.wipe();
  assert.equal(store.streakDays(TERAZ), 0);
});

test('lekcja dziś to seria jednego dnia', () => {
  lekcjeSprzed(0);
  assert.equal(store.streakDays(TERAZ), 1);
});

test('trzy dni pod rząd to seria trzech', () => {
  lekcjeSprzed(0, 1, 2);
  assert.equal(store.streakDays(TERAZ), 3);
});

test('dwie lekcje tego samego dnia liczą się raz', () => {
  lekcjeSprzed(0, 0, 1);
  assert.equal(store.streakDays(TERAZ), 2);
});

test('seria z wczoraj jeszcze żyje — nie kasuje się o północy', () => {
  lekcjeSprzed(1, 2);
  assert.equal(store.streakDays(TERAZ), 2, 'masz jeszcze dziś czas usiąść do lekcji');
});

test('dziura w środku ucina serię', () => {
  lekcjeSprzed(0, 1, 3, 4);
  assert.equal(store.streakDays(TERAZ), 2);
});

test('lekcja sprzed tygodnia to już nie seria', () => {
  lekcjeSprzed(7);
  assert.equal(store.streakDays(TERAZ), 0);
});
