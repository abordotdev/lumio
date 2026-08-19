import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubStorage, testModule } from './helpers.mjs';

stubStorage();

const store = await import('../js/store.js');
const { reviewQueue, buildLesson, buildReview, moduleOutline, dueCount } =
  await import('../js/scheduler.js');

function fresh() {
  store.wipe();
}

const czasy = testModule('czasy', ['past', 'now'], { past: 6, now: 6 });
const praca = testModule('praca', ['daily'], { daily: 6 });
const wszystkie = [czasy, praca];

test('powtórki widzą zdania ze wszystkich modułów, nie tylko z otwartego', () => {
  fresh();
  // jedno zdanie z każdego modułu odpowiedziane źle — oba powinny czekać
  store.recordAnswer('czasy-past-0', false);
  store.recordAnswer('praca-daily-0', false);

  const kolejka = reviewQueue(wszystkie);
  const idki = kolejka.map((x) => x.item.id);

  assert.ok(idki.includes('czasy-past-0'), 'zdanie z czasy ma czekać');
  assert.ok(idki.includes('praca-daily-0'), 'zdanie z praca też ma czekać');
});

test('każde zdanie w kolejce wie, z którego modułu pochodzi', () => {
  fresh();
  store.recordAnswer('praca-daily-0', false);

  const kolejka = reviewQueue(wszystkie);
  const wpis = kolejka.find((x) => x.item.id === 'praca-daily-0');

  assert.equal(wpis.mod.id, 'praca');
});

test('lekcja bierze nowe zdania z otwartego modułu, a powtórki z każdego', () => {
  fresh();
  store.recordAnswer('praca-daily-0', false);

  const { steps } = buildLesson(czasy, store.get(), wszystkie);
  const zPracy = steps.filter((s) => s.mod && s.mod.id === 'praca');
  const noweZCzasow = steps.filter((s) => s.isNew && s.mod.id === 'czasy');

  assert.ok(zPracy.length > 0, 'zdanie z praca ma wrócić w powtórce');
  assert.ok(noweZCzasow.length > 0, 'nowe zdania mają być z otwartego modułu');
  assert.equal(
    steps.filter((s) => s.isNew && s.mod.id === 'praca').length,
    0,
    'nowych zdań z innego modułu nie bierzemy'
  );
});

test('powtórka bez nowego materiału też sięga do wszystkich modułów', () => {
  fresh();
  store.recordAnswer('czasy-past-0', false);
  store.recordAnswer('praca-daily-0', false);

  const { steps } = buildReview(wszystkie);
  const moduly = new Set(steps.map((s) => s.mod.id));

  assert.ok(moduly.has('czasy'));
  assert.ok(moduly.has('praca'));
});

test('licznik „czeka na powtórkę" liczy wszystkie moduły razem', () => {
  fresh();
  store.recordAnswer('czasy-past-0', false);
  store.recordAnswer('praca-daily-0', false);

  assert.equal(dueCount(wszystkie), 2);
});

test('✓ pojawia się dopiero po dobrej odpowiedzi, nie po samym pokazaniu zdania', () => {
  fresh();
  const lekcja = moduleOutline(czasy).lessons[0];
  const idki = czasy.translations.filter((t) => t.pattern === 'past').slice(0, lekcja.sentences);

  for (const t of idki) store.recordAnswer(t.id, false);

  const po = moduleOutline(czasy).lessons[0];
  assert.equal(po.seen, true, 'zdania były pokazane');
  assert.equal(po.done, false, 'ale nic z nich nie umiem — bez ptaszka');

  for (const t of idki) store.recordAnswer(t.id, true);

  const naprawione = moduleOutline(czasy).lessons[0];
  assert.equal(naprawione.done, true, 'po dobrych odpowiedziach ptaszek jest');
});

test('pomyłka nie cofa wskaźnika bieżącej lekcji', () => {
  fresh();
  for (const t of czasy.translations) store.recordAnswer(t.id, true);
  const przed = moduleOutline(czasy).current;

  store.recordAnswer(czasy.translations[0].id, false);
  const po = moduleOutline(czasy).current;

  assert.deepEqual(po, przed, 'wskaźnik ma stać w miejscu');
});

test('to samo zdanie nie wchodzi do lekcji dwa razy pod dwoma id', () => {
  fresh();
  const bliznaki = {
    id: 'bliz',
    title: 'bliz',
    patterns: { p: 'p' },
    patternOrder: ['p'],
    translations: [
      {
        id: 'x1',
        pattern: 'p',
        pl: 'Testuję to od rana',
        en: 'I have been testing it',
        chunks: ['a'],
      },
    ],
    dictation: [
      { id: 'd1', pl: 'Testuję to od rana', en: 'I have been testing it', chunks: ['a'] },
    ],
  };
  const { steps } = buildLesson(bliznaki, store.get(), [bliznaki]);
  const teksty = steps.map((s) => s.item.en);
  assert.equal(new Set(teksty).size, teksty.length, 'żadne zdanie nie powtarza się w lekcji');
});

test('sytuacja pojawia się dopiero przy zdaniu, które już umiem', () => {
  fresh();
  // Moduł musi być większy niż pula kafelków (7), inaczej na tłumaczenia nic nie zostaje.
  const zdania = [];
  for (let i = 0; i < 12; i += 1) {
    zdania.push({
      id: `s${i}`,
      pattern: 'p',
      pl: `polskie ${i}`,
      en: `english number ${i}`,
      chunks: [`english number ${i}`],
      situation: `scenka ${i}`,
    });
  }
  const mod = {
    id: 'syt',
    title: 'syt',
    patterns: { p: 'p' },
    patternOrder: ['p'],
    translations: zdania,
    dictation: [],
  };

  // połowę już umiem, połowy nie widziałam
  for (let i = 0; i < 6; i += 1) store.recordAnswer(`s${i}`, true);

  const { steps } = buildLesson(mod, store.get(), [mod]);
  const sytuacje = steps.filter((s) => s.kind === 'situation');

  assert.ok(sytuacje.length > 0, 'znane zdania mają wracać jako sytuacje');
  for (const s of sytuacje) {
    assert.ok(store.isDone(s.item.id), `${s.item.id} nie jest jeszcze umiane, a dostało sytuację`);
  }
});

test('zdanie bez sytuacji zostaje zwykłym tłumaczeniem', () => {
  fresh();
  const mod = {
    id: 'bez',
    title: 'bez',
    patterns: { p: 'p' },
    patternOrder: ['p'],
    translations: [{ id: 'b1', pattern: 'p', pl: 'a', en: 'a b c', chunks: ['a b c'] }],
    dictation: [],
  };
  store.recordAnswer('b1', true);
  const { steps } = buildLesson(mod, store.get(), [mod]);
  assert.ok(!steps.some((s) => s.kind === 'situation'));
});
