import { test, expect } from '@playwright/test';
import { idzDo } from './helpers.js';

test('lekcja z kafelków: ułóż zdanie, sprawdź, zobacz wynik i wymowę', async ({ page }) => {
  await page.goto('/');
  await idzDo(page, 'modules');

  // Otwórz moduł „W podróży" (tylko kafelki — przewidywalny do testu).
  await page.locator('.modul').filter({ hasText: 'W podróży' }).click();
  await page.locator('.hero [data-a="start"]').click();

  const bank = page.locator('.tile-bank');
  await expect(bank).toBeVisible();

  // Pierwsze zdanie to „Jestem zmęczona" → ułóż „I am tired".
  await expect(page.locator('.prompt-pl')).toHaveText('Jestem zmęczona');
  await bank.locator('.tile', { hasText: /^I am$/ }).click();
  await bank.locator('.tile', { hasText: /^tired$/ }).click();
  await page.locator('.card button.primary').filter({ hasText: 'Sprawdź' }).click();

  // Zielony wynik i podpowiedź wymowy po polsku.
  await expect(page.locator('.verdict.good')).toBeVisible();
  await expect(page.locator('.wymowa')).toContainText('aj em tajerd');
});
