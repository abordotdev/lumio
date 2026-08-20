import { test, expect } from '@playwright/test';
import { idzDo } from './helpers.js';

test('moduły są w sekcjach, bez „Moje zdania"', async ({ page }) => {
  await page.goto('/');
  await idzDo(page, 'modules');
  await expect(page.locator('#tresc')).toContainText('Ogólny angielski');
  await expect(page.locator('#tresc')).toContainText('Angielski w IT');
  await expect(page.locator('#tresc')).not.toContainText('Moje zdania');
});

test('lista lekcji startuje zwinięta, można ją rozwinąć i wybrać lekcję', async ({ page }) => {
  await page.goto('/');
  await idzDo(page, 'modules');

  const panel = page.locator('.panel');
  await expect(panel).toHaveClass(/zwiniety/);

  await page.locator('[data-a="zwin"]').click();
  await expect(panel).not.toHaveClass(/zwiniety/);

  // Klik w konkretną lekcję odpala ćwiczenie.
  await page.locator('.grupy [data-ids]').first().click();
  await expect(page.locator('.tile-bank, #tresc textarea').first()).toBeVisible();
});
