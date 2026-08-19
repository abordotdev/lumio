# Lumio — zasady pracy agenta

Stosuj w każdej sesji. Gdy czegoś nie wiesz — pytaj, nie zgaduj.

Mów krótko i prosto (skill caveman, poziom lite). Zero żargonu. Jedna myśl na linię. Off tylko po „stop caveman”.

## Pytaj, gdy nie wiesz

- Nie zgaduj wymagań, copy, treści zdań, zachowania gry ani decyzji produktowych.
- Jedno pytanie na raz, z rekomendacją, jeśli masz typ.
- Jeśli w kodzie albo w `lumio-plan.html` jest już odpowiedź — najpierw tam sprawdź, potem pytaj tylko o lukę.

## Testy — nigdy wszystkie naraz

- **Nie odpalaj wszystkich testów naraz. Najpierw zapytaj i poczekaj na zgodę.** Dotyczy to też pełnego zestawu jednostkowych, nie tylko e2e.
- Sam z siebie odpalasz wyłącznie testy tego, co właśnie zmieniasz. Wąsko, jeden plik.
- Po approve („wygląda dobrze”): też tylko edytowane komponenty.
- Bez „odpalę wszystko na wszelki wypadek”.
- Jeśli uważasz, że pełny przebieg jest potrzebny — powiedz dlaczego i zapytaj.

## Kod

- Runtime bez zależności: apka działa przez `node serve.js`. Prettier, ESLint, Husky to tylko narzędzia do kodu.
- Nie dokładaj bibliotek do działania apki bez pytania.
- Małe, celowane zmiany. Bez refaktorów „przy okazji”.
- Nie ruszaj `data/` ani mechaniki lekcji, jeśli zadanie tego nie dotyczy.
- Wygląd ludzika: najpierw `http://localhost:4173/_doll-preview.html`, czekaj na OK. Nie kasuj `_doll-preview.html`.

## Review przed commitem

Przegląd robimy **przed commitem**, nie dopiero przed wrzutką na stronę.

Przed każdym `git commit`:

1. Przeczytaj własną zmianę (`git diff`) tak, jakby napisał ją ktoś inny.
2. Sprawdź: błędy logiczne, bezpieczeństwo, dane użytkownika, przypadki brzegowe.
3. Krytyczne i ważne popraw teraz. Reszta idzie na listę i mówisz o niej.
4. Dopiero wtedy commit.

Przy większej zmianie powiedz mi, co znalazłaś w review, zanim commitniesz.

## Commit

Przy `git commit` sam odpala się haczyk: Prettier + ESLint **tylko na plikach w tym commicie**. Nie formatuj całego repo ręcznie.

Jeśli haczyk padnie na kodzie, którego nie ruszałaś — pytaj, czy naprawiać, zamiast przeczesywać całość.

## Dobre praktyki — zawsze

Pracuj jak w porządnym repo. Nie skracaj drogi.

- **Gałąź, nie prosto na `main`.** Zmiana na osobnej gałęzi. Na `main` idzie dopiero po review. Wrzutka na stronę = merge na `main`.
- **Haczyka nie omijaj.** Bez `--no-verify`. Haczyk ma się odpalić.
- **Małe zapisy.** Jedna myśl na commit. Wiadomość mówi po co, nie co kliknęłam.
- **Bez sekretów.** Nie commituj haseł, kluczy, `.env`, kopii postępu.
- **Dane użytkownika zostają u użytkownika.** Nic nie wysyłamy na zewnątrz bez pytania i bez napisania o tym w apce.
- **Nie zostawiaj dziury.** Wiesz, że coś psuje grę — nie mów że skończone.
- **Lint na GitHubie musi przejść**, zanim odświeży się strona.
