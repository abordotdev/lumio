# Decyzje — sierpień 2026

Ustalenia z rozmowy o rozwoju Lumio. Zapisane, żeby nie trzeba było ich odtwarzać z pamięci.

Wcześniejsze decyzje projektowe: [lumio-plan.html](lumio-plan.html).

## Własne zdania — bez tłumacza z internetu

Apka wysyłała każde wpisane polskie zdanie do `api.mymemory.translated.net`. To publiczna pamięć
tłumaczeń — segmenty wysłane za darmo trafiają do wspólnej bazy. **Wyrzucone.**

Zamiast tego: wpisujesz zdania po polsku, one czekają na liście, a angielski dopisuję ja przy
najbliższej sesji — razem z wariantami i pułapkami, tak jak w pozostałych modułach.

## Postęp na telefonie i laptopie

**Firebase.** Nie usypia projektów za brak ruchu (Supabase usypia po tygodniu, a przy przerwach
w nauce rzędu miesięcy to znaczy budzenie go ręcznie po każdym powrocie). Karta płatnicza
niepotrzebna, darmowy plan starcza z ogromnym zapasem.

**Konta zakłada Agnieszka ręcznie** w panelu Firebase — dwa, dla siebie i dla koleżanki.
Bez ekranu rejestracji, bez weryfikacji maila, bez prawdziwych adresów (wystarczy `aga@lumio.local`).

**Odzyskiwanie hasła: przez Agnieszkę.** Wchodzi w panel, ustawia nowe, przekazuje.
Dlatego mail nie jest do niczego potrzebny.

**Ekran „zmień hasło" w Lumio** — użytkowniczka ustawia sobie własne, którego Agnieszka już nie zna.

**Paczki bez szyfrowania.** https chroni drogę do serwera, więc nikt po drodze nie podejrzy.
U Google paczka leży czytelna — świadomie, bo szyfrowanie kosztowałoby kolejny mechanizm
(klucz ratunkowy w pliku kopii), a chroni tylko kilometry, monety i wyniki zdań.

**W zamian jedna zasada:** we własnych zdaniach nie wpisujemy nazw klientów ani szczegółów
z projektów. Ostrzeżenie ma stać na tamtym ekranie.

**Odrzucone po drodze:** Supabase (usypia), kody parowania i wzajemne kody (zbędne, gdy konta
zakłada się ręcznie), szyfrowanie kluczem z hasła (zapomniane hasło kasowałoby cały postęp).

## Portfolio na CV — na później

Apka najpierw ma być użyteczna. Testy i materiały do CV robimy, ale nie one wyznaczają kolejność.

## Kolejność prac

1. Wyrzucenie tłumacza z „moich zdań"
2. Powtórki obejmują wszystkie moduły naraz + naprawa fałszywego ✓
3. Tryb powrotu po przerwie
4. Przegląd treści — od modułu rekrutacyjnego
5. `forms.js` na wszystkie moduły
6. Ćwiczenie „z sytuacji"
7. Firebase i logowanie
8. Refaktor kodu

Testy jednostkowe pisane wąsko, tuż przed dotknięciem danego pliku. Node ma je wbudowane
(`node --test`), więc apka dalej nie ma żadnych zależności.

## Znane dziury w kodzie, do naprawy

- ~~**Powtórki nie wychodzą poza moduł**~~ — naprawione. Kolejka powtórek sięga do wszystkich
  modułów, a każde zdanie niesie ze sobą swój moduł.
- ~~**„✓ zrobione" kłamie**~~ — naprawione. Lista lekcji ma teraz trzy stany: `→` bieżąca,
  `↻` przerobiona ale nieumiana, `✓` dopiero po dobrych odpowiedziach.
- ~~**To samo zdanie dwa razy w jednej lekcji**~~ — naprawione. Dyktanda powielają zdania
  z tłumaczeń pod innym id, więc lekcja porównuje też sam tekst, nie tylko id.
- **Dyktanda to w większości te same zdania co tłumaczenia** — w module czasy-it 7 z 9.
  Do przerobienia razem z treścią: dyktando ma ćwiczyć słuch na czymś, czego nie widziałaś.
- ~~**Powrót po przerwie straszy liczbą**~~ — naprawione. Po 14 dniach bez lekcji ekran startowy
  mówi „Nie było Cię 3 miesiące. Zaczynamy spokojnie", pierwsza lekcja idzie od najlepiej
  opanowanych zdań, a pomyłka cofa o jeden krok zamiast kasować miesiące.
- ~~**Przerwana lekcja płaciła pełne 20 km**~~ — naprawione. Wystarczyło kliknąć „Zaczynamy",
  odpowiedzieć raz i przerwać. Teraz przerwana płaci proporcjonalnie, dokończona pełną stawkę.
- **`forms.js` działa na 24 zdaniach ze 186** — tabela czasowników kończy się na `t24`,
  a moduł czasy-it ma 42 zdania. Pozostałe cztery moduły nie mają w niej nic.
- **Cztery moduły z pięciu nie tłumaczą błędów** — praca 0 pułapek, zadania 0, rekrutacja 2 na 54,
  small-talk 4 na 30. Wyjaśnienie po błędzie to najlepsza rzecz w tej apce i prawie jej nie ma.
- **Reakcje są martwe** — 8 reakcji w module czasy-it, żadna linijka kodu ich nie czyta.
- **Wersja w `sw.js` wpisywana ręcznie** — zapomniana przy wrzutce zostawia ludzi ze starą apką.
- **Wczytanie kopii wymaga Notatnika** — apka zna folder z kopią, więc powinna umieć wczytać
  plik sama, bez kopiuj-wklej.
