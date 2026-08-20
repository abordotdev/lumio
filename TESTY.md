# Testy w Lumio

Jak apka jest testowana i jak to odpalić. Trzymamy się piramidy testów: dużo
szybkich testów jednostkowych na dole, garść testów E2E na górze. Wszystko chodzi
w CI (GitHub Actions) przed każdą wrzutką na produkcję — czerwone nie wchodzi.

## Jak odpalić

```bash
npm test          # testy jednostkowe (Node, wbudowany runner)
npm run test:e2e  # testy E2E (Playwright: desktop + mobile)
npm run test:all  # jedno i drugie
```

Playwright sam startuje serwer (`serve.js`) i sam pobiera przeglądarkę przy
pierwszym uruchomieniu (`npx playwright install chromium`).

## Warstwa 1 — testy jednostkowe (`test/`)

Czysta logika, bez przeglądarki. Uruchamiane przez `node --test`, zero zależności.

| Plik | Co sprawdza |
| --- | --- |
| `scheduler.test.mjs` | Budowanie lekcji i powtórek: nowe zdania z modułu, powtórka w obrębie modułu, tryb „tylko kafelki", numeracja lekcji, `✓` dopiero po dobrej odpowiedzi |
| `dane.test.mjs` | Walidacja treści: kawałki składają się w zdanie, czasownik naprawdę występuje, pułapki nie są poprawną odpowiedzią, brak nazw czasów, unikalne id, reakcje |
| `formy.test.mjs` | Silnik form czasownika (regularne, nieregularne, podwajanie) |
| `ocena.test.mjs` | Ocenianie odpowiedzi: literówka = dobrze, zły czas ≠ literówka, warianty, pułapki, puste pole |
| `postep.test.mjs` | Pudełka powtórek, `zrobione`/`umiem`, zrzut po pomyłce, roundtrip eksport→import kopii |
| `powrot.test.mjs` | Tryb powrotu po długiej przerwie |
| `seria.test.mjs` | Liczenie serii dni pod rząd |
| `naliczanie.test.mjs` | Naliczanie km/monet, przerwana lekcja płaci proporcjonalnie |

## Warstwa 2 — testy E2E (`e2e/`, Playwright)

Klikają przez apkę jak użytkownik. Każdy test leci na **dwóch projektach**:
`desktop` (Chrome) i `mobile` (widok telefonu). Brama hasła na localhoście jest
wyłączona, więc testy wchodzą prosto do apki.

| Plik | Scenariusz |
| --- | --- |
| `smoke.spec.js` | Apka wstaje; każda zakładka renderuje swoją treść; mapa pokazuje kod |
| `lekcja.spec.js` | Otwórz moduł → zacznij lekcję → ułóż zdanie z kafelków → Sprawdź → zielony wynik i podpowiedź wymowy |
| `moduly.spec.js` | Moduły w sekcjach (IT / Ogólny), bez „Moje zdania"; lista lekcji startuje zwinięta, rozwija się, można wybrać lekcję |
| `szafa.spec.js` | Zmiana postaci na chłopaka wraca do Szafy; zapisany nick pojawia się na starcie |
| `sklep.spec.js` | Warunek wstępny (monety + km zasiane w localStorage) → kup czapkę → „masz to" |

`e2e/helpers.js`: `idzDo(page, id)` (klik w widoczną zakładkę na desktopie i mobile)
oraz `zasiej(page, stan)` (ustawienie warunków wstępnych przez localStorage).

## CI

`.github/workflows/pages.yml` przed deployem odpala: `lint` → `format:check` →
`test` (jednostkowe) → `test:e2e` (Playwright). Deploy zależy od zielonego
przebiegu. Przy błędzie E2E raport HTML ląduje jako artefakt buildu.

## Przykładowe przypadki testowe (styl QA)

| # | Krok | Oczekiwany wynik | Pokryte przez |
| --- | --- | --- | --- |
| 1 | Ułóż poprawnie zdanie z kafelków, kliknij Sprawdź | Zielony wynik + „Czytaj: …" | `lekcja.spec.js` |
| 2 | Wejdź w Moduły z innej zakładki | Lista lekcji jest zwinięta | `moduly.spec.js` |
| 3 | Ustaw postać „Chłopak", zatwierdź | Powrót do Szafy, ludzik bez rzęs | `szafa.spec.js` + `postep.test.mjs` (zapis `postac`) |
| 4 | Kup przedmiot, gdy starcza monet | Przedmiot „masz to", monety zdjęte | `sklep.spec.js` |
| 5 | Odpowiedz z literówką | Liczy się jako dobrze | `ocena.test.mjs` |
| 6 | Odpowiedz złą formą czasownika | Liczy się jako błąd, nie literówka | `ocena.test.mjs` |
| 7 | Zapisz i wczytaj kopię postępu | Postęp wraca w całości | `postep.test.mjs` |
