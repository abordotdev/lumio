import { test, expect } from '@playwright/test';
import { idzDo, zasiej } from './helpers.js';

test('kupno w sklepie: czapka staje się „masz to"', async ({ page }) => {
  // Warunek wstępny: dość kilometrów (budka na 25 km) i monet.
  await zasiej(page, { km: 40, coins: 300 });
  await page.goto('/');
  await idzDo(page, 'shop');

  const czapka = page.locator('.thing').filter({ hasText: 'Czapka z daszkiem' });
  await expect(czapka).toBeVisible();
  await czapka.getByRole('button', { name: 'Kup' }).click();

  await expect(page.locator('.thing').filter({ hasText: 'Czapka z daszkiem' })).toContainText(
    'masz to'
  );
});
