# Lumio

Trening angielskiego pod jeden cel: **mówić płynnie o przeszłości, teraźniejszości i przyszłości**,
bez regułek i bez wkuwania słówek. Zdania są z pracy testerki, więc od pierwszego dnia dają się użyć.

- Decyzje projektowe i ryzyka: [lumio-plan.html](lumio-plan.html)
- Ustalenia z rozwoju apki i lista otwartych spraw: [DECYZJE.md](DECYZJE.md)
- Zasady pracy nad kodem: [AGENTS.md](AGENTS.md)

## Jak uruchomić

Potrzebny tylko Node. Do **uruchomienia apki** żadnego `npm install`.

```
node serve.js
```

Potem wejdź na **http://localhost:4173**. Zatrzymanie: `Ctrl+C`.

> Nie otwieraj `index.html` dwuklikiem — przeglądarka blokuje wtedy wczytywanie plików z dysku
> i apka pokaże Ci komunikat, żeby wystartować przez serwer.

Do pracy nad kodem raz: `npm install`. Przy commicie Prettier i ESLint sprawdzą same ruszane pliki.

Przy pierwszym wejściu wybierasz głos. Apka pokazuje angielskie głosy z tego komputera i mówi wprost,
jeśli nie ma amerykańskiego żeńskiego.

## Treść

| moduł | zdań | o czym |
|---|---|---|
| Czasy na zdaniach z pracy | 51 | byłam / jestem / będę — fundament |
| Rozmowa rekrutacyjna | 66 | doświadczenie, narzędzia, urlop, pytania do nich |
| Small talk | 39 | kawa, spotkanie, pożegnanie |
| Codzienna praca | 38 | daily, retro, podmiana, klient |
| Praca z zadaniami | 36 | ficzer, bug, baza, zgłoszenie |
| Moje zdania | Twoje | wpisujesz po polsku, angielski dopisuję ja |

Razem **230 zdań**. Każde ma wyjaśnienie, po co ta forma. 219 ma przewidziane błędy
z celną diagnozą — łącznie **290 pułapek**.

## Jak wygląda lekcja

Pięć rodzajów ćwiczeń, przeplatanych. Lekcja kończy się przy 15 zdaniach.

| typ | co trenuje |
|---|---|
| kafelki | rozpoznanie właściwej formy — w banku leżą też złe czasy tego samego czasownika |
| PL→EN + shadowing | produkcja zdania z podpowiedzi + wymowa |
| **sytuacja** | scenka zamiast polskiego zdania — formę wybierasz sama |
| dyktando | wyłapywanie końcówek, które w mowie znikają |

**Shadowing** — trzy przebiegi: wolno w kawałkach z prawdziwymi pauzami (mówisz razem),
normalne tempo, i na koniec cztery sekundy ciszy, żeby powiedzieć zdanie samej.

**Ocena** — wzorzec plus lista akceptowanych wariantów, przewidziane pułapki, tolerancja literówek
i dwa przyciski zgłoszeń: *to też jest poprawne* / *to brzmi dziwnie*.

## Jak apka wie, czego Cię uczyć

Każde zdanie siedzi w pudełku 0–5. Dobrze → wyżej i wraca później. Źle → spada i wraca od razu.
Odstępy: 10 minut → jutro → 3 dni → tydzień → 3 tygodnie → 2 miesiące.

**Powtórki obejmują wszystkie moduły naraz.** Zdania z modułu, który zamkniesz, nie przestają wracać.

**Ptaszek na liście lekcji znaczy „umiem"**, nie „widziałam". Lekcja przerobiona, ale jeszcze
nieopanowana, dostaje `↻`.

**Powrót po przerwie.** Po 14 dniach bez lekcji apka nie wita liczbą zaległości. Pierwsza lekcja
idzie od zdań, które szły najlepiej, a pomyłka cofa zdanie o jeden krok zamiast na dno.

## Nagradzanka

Trasa Warszawa → Edynburg, 15 przystanków, 520 km. Dwa liczniki: kilometry (przesuwają ludzika)
i monety (do wydania w sklepie). W miastach jedna rzecz za darmo, reszta zostaje w sklepie.
Po każdej lekcji skrzynka.

Lekcja doprowadzona do końca płaci pełną stawkę, także w gorszy dzień. Przerwana w połowie
płaci proporcjonalnie.

**Bez serii dni, bez ognika, bez kar.**

## Kopia postępu

Postęp siedzi w `localStorage` tej przeglądarki. W Ustawieniach wskazujesz **raz** folder,
a apka zapisuje do niego dwa pliki po każdej lekcji: bieżący i poprzedni.

Wskaż folder wewnątrz OneDrive albo Dropbox, a kopia sama trafi do chmury.

> Automatyczny zapis do folderu działa w Chrome i Edge na komputerze. Na telefonie zostaje
> ręczne **Zapisz kopię do pliku**.

## Struktura

```
index.html              szkielet
serve.js                lokalny serwer, zero zależności
css/app.css             styl, jasny i ciemny motyw
data/
  catalog.json          spis modułów
  module-*.json         treść: zdania, warianty, pułapki, sytuacje
  route.json            trasa, przedmioty, ceny
js/
  main.js               start, wczytanie danych, wybór głosu
  app.js                ekrany: mapa, moduły, sklep, szafa, ustawienia
  lesson.js             przebieg lekcji i shadowing
  scheduler.js          składanie lekcji, powtórki, powrót po przerwie, naliczanie
  grade.js              ocena odpowiedzi, normalizacja, różnica słowo po słowie
  forms.js              odmiana czasowników i rywalizujące kafelki
  store.js              stan i kopia zapasowa
  speech.js             głos, kawałki z pauzami
  avatar.js             ludzik: warstwy SVG
  disk.js               zapis kopii na dysk
  mine.js               własne zdania
  gate.js               hasło do wersji w sieci
  ui.js                 drobne narzędzia
test/                   testy jednostkowe (node --test)
sw.js                   offline — działa tylko w wersji wdrożonej na https
```

## Testy

```
npm test
```

Sprawdzają logikę lekcji, powrót po przerwie, naliczanie, odmianę czasowników
i **samą treść**: czy identyfikatory się nie powtarzają, czy kawałki składają się w zdanie,
czy przewidziany błąd nie jest przypadkiem poprawną odpowiedzią i czy żadne wyjaśnienie
nie używa nazwy czasu.

Odpalają się też na GitHubie przy każdej zmianie, przed wrzutką na stronę.

## Czego jeszcze nie ma

- **Postępu wspólnego dla telefonu i laptopa** — ustalone, że przez Firebase z kontami
  zakładanymi ręcznie. Do zrobienia, wymaga założenia projektu w Firebase.
- **Sytuacji poza modułem czasów** — na razie tylko tam, gdzie wybór formy waży najwięcej.
- **Kodu z wynikiem dla koleżanki na żywo** — wklejany kod już działa, automat nie.

## Testowanie ręczne

W Ustawieniach jest **Wyczyść wszystko** — kasuje postęp i wraca do wyboru głosu.
