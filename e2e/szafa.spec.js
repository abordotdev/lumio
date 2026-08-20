import { test, expect } from '@playwright/test';
import { idzDo } from './helpers.js';

test('zmiana postaci na chłopaka wraca do Szafy', async ({ page }) => {
  await page.goto('/');
  await idzDo(page, 'wardrobe');

  await page.locator('#edit-look').click();
  await page.locator('#postac .swatch').filter({ hasText: 'Chłopak' }).click();
  await page.locator('#look-ok').click();

  await expect(page.locator('#tresc')).toContainText('Ubierz się');
});

test('zapisany nick pojawia się na ekranie startowym', async ({ page }) => {
  await page.goto('/');
  await idzDo(page, 'wardrobe');

  await page.locator('#nick-in').fill('Ania');
  await page.locator('#nick-save').click();

  await idzDo(page, 'home');
  await expect(page.locator('#tresc')).toContainText('Ania');
});
