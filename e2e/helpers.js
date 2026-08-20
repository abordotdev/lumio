// Wspólne narzędzia dla testów E2E.

// Klik w zakładkę nawigacji — działa i na desktopie (boczny pasek), i na telefonie
// (dolny pasek / zębatka w górnym pasku). Bierzemy pierwszy WIDOCZNY element z danym
// data-nav, bo ten sam identyfikator jest w kilku miejscach oprawy.
export async function idzDo(page, id) {
  await page.locator(`[data-nav="${id}"]`).filter({ visible: true }).first().click();
}

// Zasiewa localStorage stanem PRZED wejściem na stronę — do ustawiania warunków
// wstępnych (np. kilometry i monety, żeby dało się coś kupić).
export async function zasiej(page, stan) {
  await page.addInitScript((s) => {
    localStorage.setItem('lumio.v1', JSON.stringify(s));
  }, stan);
}
