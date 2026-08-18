# Lumio — prototyp

Trening angielskiego pod jeden cel: **mówić płynnie o przeszłości, teraźniejszości i przyszłości**,
bez regułek i bez wkuwania słówek. Zdania są z pracy testerki, więc od pierwszego dnia dają się użyć.

Wszystkie decyzje projektowe i ryzyka: [lumio-plan.html](lumio-plan.html).

## Jak uruchomić

Potrzebny tylko Node (jest u Ciebie: v26). Do **uruchomienia apki** żadnego `npm install`.

```
node serve.js
```

Potem wejdź na **http://localhost:4173**

Zatrzymanie serwera: `Ctrl+C`.

> Nie otwieraj `index.html` dwuklikiem — przeglądarka blokuje wtedy wczytywanie plików z dysku
> i apka pokaże Ci komunikat, żeby wystartować przez serwer.

Do pracy nad kodem raz: `npm install`. Przy commicie Prettier i ESLint sprawdzą same tylko ruszane pliki.

Przy pierwszym wejściu wybierasz głos. Apka pokazuje, jakie angielskie głosy są na tym komputerze,
i mówi wprost, jeśli nie ma amerykańskiego żeńskiego. U Ciebie jest **Microsoft Zira** — dokładnie ten,
którego chcieliśmy.

## Co jest w prototypie

Pełna mechanika na drobnej treści — bo generowanie 300 zdań z wariantami i pułapkami to największa
pozycja pracy, a nie ma sensu jej robić przed zobaczeniem, czy pętla Ci pasuje.

**Cztery typy ćwiczeń, przeplatane w jednej lekcji:**

| typ | ile w lekcji | co trenuje |
|---|---|---|
| kafelki | 2× | pierwsze spotkanie z nowym wzorcem — rusztowanie, nie kula |
| PL→EN + shadowing | 8× | rdzeń: produkcja zdania z pustej głowy + wymowa |
| dyktando | 5× | wyłapywanie końcówek i słów, które w mowie znikają |

**Lekcja kończy się przy 15 zdaniach.** W gorszy dzień
dostajesz pełne 20 km i 20 monet tak samo. Zdanie z nowego wzorca, na którym się potknęłaś, wraca
jeszcze raz w tej samej lekcji (maksymalnie 3 takie powroty, żeby lekcja zawsze się skończyła).

**Shadowing** — trzy przebiegi: wolno w kawałkach z prawdziwymi pauzami (mówisz razem), normalne
tempo, i ostatni raz **4 sekundy ciszy**, żeby powiedzieć zdanie sama.

**Ocena** — wzorzec plus lista akceptowanych wariantów, przewidziane pułapki z celną diagnozą
(`I reported that bug in Friday` → *przy dniach tygodnia zawsze on*), tolerancja literówek,
i dwa przyciski zgłoszeń: **to też jest poprawne** / **to brzmi dziwnie**. Zgłoszenia zapisują się
i można je skopiować w Ustawieniach.

**Nagradzanka** — trasa Warszawa → Budka przy Sprint Review (25 km) → Londyn (60 km).
Dwa liczniki: kilometry (nie do wydania, przesuwają ludzika) i monety (do wydania w sklepie).
W Londynie wybierasz jedną z dwóch sukienek za darmo — **druga nie znika**, zostaje w sklepie
za 150 monet. Po każdej lekcji skrzynka, która nigdy nie jest pusta.

**Bez serii dni, bez ognika, bez kar.** Postęp pokazany jako „co umiesz już powiedzieć".

## Struktura

```
index.html              szkielet
serve.js                lokalny serwer, zero zależności
css/app.css             styl, jasny i ciemny motyw
data/
  module-czasy-it.json  treść: 24 zdania, 8 reakcji, 5 dyktand
  route.json            trasa, przedmioty, ceny
js/
  main.js               start, wczytanie danych, wybór głosu
  app.js                ekrany: mapa, sklep, szafa, przystanki, ustawienia
  lesson.js             przebieg lekcji i shadowing
  scheduler.js          składanie lekcji: bloki + powtórki z odstępami
  grade.js              ocena odpowiedzi, normalizacja, różnica słowo po słowie
  store.js              stan i kopia zapasowa
  speech.js             głos, kawałki z pauzami
  avatar.js             ludzik: warstwy SVG
  ui.js                 drobne narzędzia
sw.js                   offline — działa tylko w wersji wdrożonej na https
```

## Czego jeszcze NIE ma

- **Kodu z wynikiem dla koleżanki** — wchodzi w wersji 1, nie w prototypie.
- **Firebase i ścigania na żywo** — wersja 2, jeśli obie wytrwacie miesiąc.
- **Modułu small talk i luźnego gadania** — po pierwszym module.
- **Więcej niż 60 km trasy** — kolejne miasta dosypię razem z treścią.

## Znane rzeczy do ustalenia

- **Gdzie żyje postęp.** Siedzi w `localStorage` tej przeglądarki. Wyczyszczenie danych
  przeglądarki albo tryb prywatny kasuje wszystko. Jest kopia do pliku i do schowka plus
  przypomnienie po trzech lekcjach — ale to nie jest jeszcze rozwiązane porządnie.
- **Jak rosną koszty dalej na trasie**, żeby nie zrobiło się absurdu przy dziesiątym mieście.
- **Głos u znajomej może być inny** (albo żaden) — apka to wykryje i powie, ale nie naprawi.

## Testowanie

W Ustawieniach jest **Wyczyść wszystko** — kasuje postęp i wraca do wyboru głosu.
Przydaje się, żeby przejść pierwsze wejście jeszcze raz.
