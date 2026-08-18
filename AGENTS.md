# Lumio — zasady pracy agenta

Stosuj w każdej sesji. Gdy czegoś nie wiesz — pytaj, nie zgaduj.

Mów krótko i prosto (skill caveman, poziom lite). Zero żargonu. Jedna myśl na linię. Off tylko po „stop caveman”.

## Pytaj, gdy nie wiesz

- Nie zgaduj wymagań, copy, treści zdań, zachowania gry ani decyzji produktowych.
- Jedno pytanie na raz, z rekomendacją, jeśli masz typ.
- Jeśli w kodzie albo w `lumio-plan.html` jest już odpowiedź — najpierw tam sprawdź, potem pytaj tylko o lukę.

## Testy — wąsko i po approve

- **Nie odpalaj testów całej aplikacji** z własnej inicjatywy.
- Przed approve: tylko krótkie testy tej funkcjonalności, którą zmieniasz.
- Po approve („wygląda dobrze”): testuj wyłącznie edytowane komponenty / pliki.
- Bez e2e całej apki i bez „odpalę wszystko na wszelki wypadek”.

## Kod

- Runtime bez zależności: apka działa przez `node serve.js`. Prettier, ESLint, Husky to tylko narzędzia do kodu.
- Nie dokładaj bibliotek do działania apki bez pytania.
- Małe, celowane zmiany. Bez refaktorów „przy okazji”.
- Nie ruszaj `data/` ani mechaniki lekcji, jeśli zadanie tego nie dotyczy.
- Wygląd ludzika: najpierw `http://localhost:4173/_doll-preview.html`, czekaj na OK. Nie kasuj `_doll-preview.html`.

## Commit

Przy `git commit` sam odpala się haczyk: Prettier + ESLint **tylko na plikach w tym commicie**. Nie formatuj całego repo ręcznie.

Jeśli haczyk padnie na kodzie, którego nie ruszałaś — pytaj, czy naprawiać, zamiast przeczesywać całość.
