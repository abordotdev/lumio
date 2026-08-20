import { test, expect } from '@playwright/test';
import { idzDo } from './helpers.js';

test('apka wstaje i pokazuje ekran startowy', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#tresc')).toBeVisible();
  await expect(page.locator('#tresc')).toContainText('Angielski bez regułek');
});

test('nawigacja działa — każda zakładka pokazuje swoją treść', async ({ page }) => {
  await page.goto('/');
  const kroki = [
    ['modules', 'Moduły'],
    ['wardrobe', 'Ubierz się'],
    ['shop', 'Sklep'],
    ['settings', 'Ustawienia'],
    ['home', 'Angielski bez regułek'],
  ];
  for (const [id, tekst] of kroki) {
    await idzDo(page, id);
    await expect(page.locator('#tresc')).toContainText(tekst);
  }
});

test('mapa się otwiera i pokazuje kod do wysłania', async ({ page }) => {
  await page.goto('/');
  await idzDo(page, 'map');
  await expect(page.locator('#tresc')).toContainText('Twój kod');
});
