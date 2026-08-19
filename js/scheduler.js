// Składanie lekcji: bloki do opanowania + powtórki z odstępami.
//
// Powtórki sięgają do WSZYSTKICH modułów naraz. Wcześniej szukały tylko w module,
// który masz otwarty — więc zdania z modułu, który zamknęłaś, przestawały wracać
// i po cichu wyparowywały. To jest cała rzecz, po co ta apka istnieje.
import { itemState, isDone } from './store.js';

export const LESSON_MAX_ITEMS = 15;
export const LESSON_KM = 20;
export const LESSON_COINS = 20;
export const NEW_PER_LESSON = 3;

function asList(modules) {
  if (!modules) return [];
  return (Array.isArray(modules) ? modules : [modules]).filter(Boolean);
}

// Każde zdanie niesie ze sobą swój moduł — inaczej po wciągnięciu do lekcji
// nie wiadomo, skąd wziąć rywalizujące kafelki.
function pairsOf(mod) {
  return [
    ...(mod.translations || []).map((item) => ({ item, mod })),
    ...(mod.dictation || []).map((item) => ({ item, mod })),
  ];
}

function allPairs(modules) {
  return asList(modules).flatMap(pairsOf);
}

function due(id, now) {
  const st = itemState(id);
  return st.introduced && st.due <= now;
}

function weak(id, now) {
  const st = itemState(id);
  if (!st.introduced) return false;
  if (due(id, now)) return true;
  return st.wrong > 0 && st.streak === 0;
}

export function reviewQueue(modules, now = Date.now()) {
  const pool = allPairs(modules).filter((p) => weak(p.item.id, now));
  pool.sort((a, b) => {
    const wrongDiff = itemState(b.item.id).wrong - itemState(a.item.id).wrong;
    if (wrongDiff !== 0) return wrongDiff;
    return itemState(a.item.id).due - itemState(b.item.id).due;
  });
  return pool;
}

export function dueCount(modules, now = Date.now()) {
  return reviewQueue(modules, now).length;
}

function overdueSort(a, b) {
  return itemState(a.item.id).due - itemState(b.item.id).due;
}

function unseenFirst(a, b) {
  return itemState(a.item.id).seen - itemState(b.item.id).seen;
}

// To samo zdanie siedzi czasem i w tłumaczeniach, i w dyktandach, pod innym id
// (t08 i d01 to oba „Testuję to od rana"). Bez tego trafiały do jednej lekcji dwa razy.
function textKey(item) {
  return String(item.en || item.pl || '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function take(list, n, seen) {
  const out = [];
  for (const pair of list) {
    if (out.length >= n) break;
    const key = textKey(pair.item);
    if (seen.has(pair.item.id)) continue;
    if (key && seen.has('t:' + key)) continue;
    seen.add(pair.item.id);
    if (key) seen.add('t:' + key);
    out.push(pair);
  }
  return out;
}

function step(pair, kind, extra = {}) {
  return {
    kind,
    item: pair.item,
    mod: pair.mod,
    pattern: pair.item.pattern,
    isNew: !itemState(pair.item.id).introduced,
    ...extra,
  };
}

function reviewKind(pair, i) {
  const { item } = pair;
  if (!item.pl) return 'dictate';
  const canTiles = Boolean(item.en && item.chunks);
  const cycle = i % 3;
  if (cycle === 0 && canTiles) return 'tiles';
  if (cycle === 2) return 'dictate';
  return 'translate';
}

export function buildReview(modules) {
  const now = Date.now();
  const used = new Set();
  let picked = take(reviewQueue(modules, now), 8, used);
  if (picked.length < 8) {
    const learned = allPairs(modules)
      .filter((p) => itemState(p.item.id).introduced)
      .sort(overdueSort);
    picked = [...picked, ...take(learned, 8 - picked.length, used)];
  }
  return {
    steps: picked.map((pair, i) => step(pair, reviewKind(pair, i), { isNew: false, review: true })),
    focus: null,
    review: true,
  };
}

// Zdanie, które już umiesz, dostaje trudniejszą wersję: samą sytuację, bez polskiego
// zdania pod ręką. Wtedy formę wybierasz sama, zamiast tłumaczyć gotowca.
function typedKind(pair, i) {
  if (!pair.item.pl) return 'dictate';
  if (i % 3 === 2) return 'dictate';
  if (pair.item.situation && isDone(pair.item.id)) return 'situation';
  return 'translate';
}

export const COMEBACK_ITEMS = 10;

/**
 * Ile kilometrów i monet za lekcję.
 *
 * Lekcja doprowadzona do końca — czy to na materiale, czy na czasie — płaci pełną stawkę.
 * Gorszy dzień nie jest karany, tak było umówione.
 *
 * Ale przerwana w połowie płaci proporcjonalnie. Bez tego wystarczyło kliknąć
 * „Zaczynamy", odpowiedzieć raz i przerwać, żeby dostać całe 20 km — a wtedy
 * cała trasa przestaje cokolwiek znaczyć.
 */
export function payout({ answered, target, review, aborted }) {
  const pelneKm = review ? 10 : LESSON_KM;
  const pelneMonety = review ? 10 : LESSON_COINS;
  if (!answered) return { km: 0, coins: 0 };
  if (!aborted) return { km: pelneKm, coins: pelneMonety };
  const udzial = target > 0 ? Math.min(1, answered / target) : 0;
  return { km: Math.round(pelneKm * udzial), coins: Math.round(pelneMonety * udzial) };
}

/**
 * Pierwsza lekcja po długiej przerwie.
 *
 * Nie sypiemy jej w twarz liczbą zaległych zdań i nie zaczynamy od tych, które
 * szły najgorzej. Zaczynamy od najlepiej opanowanych — żeby wróciła pewność,
 * zanim wrócą trudne zdania. Te słabsze przyjdą przy następnej lekcji.
 */
export function buildComeback(modules) {
  const used = new Set();
  const known = allPairs(modules)
    .filter((p) => itemState(p.item.id).introduced)
    .sort((a, b) => {
      const boxDiff = itemState(b.item.id).box - itemState(a.item.id).box;
      if (boxDiff !== 0) return boxDiff;
      return itemState(b.item.id).streak - itemState(a.item.id).streak;
    });
  const picked = take(known, COMEBACK_ITEMS, used);
  return {
    steps: picked.map((pair, i) =>
      step(pair, reviewKind(pair, i), { isNew: false, review: true, comeback: true })
    ),
    focus: null,
    review: true,
    comeback: true,
  };
}

export function nextPattern(module) {
  for (const p of module.patternOrder || []) {
    if ((module.translations || []).some((t) => t.pattern === p && !itemState(t.id).introduced)) {
      return p;
    }
  }
  return null;
}

/**
 * Lekcja: 7 kafelków, 4 tłumaczenia, 4 dyktanda — przeplatane.
 *
 * Nowy materiał bierzemy tylko z otwartego modułu, żeby nauka szła po kolei.
 * Powtórki ciągniemy ze wszystkich, żeby nic nie zostało z tyłu.
 */
export function buildLesson(module, state, modules) {
  const now = Date.now();
  const used = new Set();
  const wszystkie = asList(modules).length ? asList(modules) : [module];
  const mine = (module.translations || []).map((item) => ({ item, mod: module }));
  const focus = nextPattern(module);

  const newOnes = focus
    ? take(
        mine.filter((p) => p.item.pattern === focus && !itemState(p.item.id).introduced),
        NEW_PER_LESSON,
        used
      )
    : [];

  const brakuje = (ile) => Math.max(0, 7 - ile);
  const extraTiles = take(
    mine.filter((p) => !itemState(p.item.id).introduced).sort(unseenFirst),
    brakuje(newOnes.length),
    used
  );
  const moreTiles = take(
    mine.slice().sort(unseenFirst),
    brakuje(newOnes.length + extraTiles.length),
    used
  );
  const tiles = [...newOnes, ...extraTiles, ...moreTiles]
    .slice(0, 7)
    .map((pair) => step(pair, 'tiles'));

  // Kontrast: zdanie z innego wzorca, już poznane. Może przyjść z dowolnego modułu —
  // zderzenie „byłam" z „jestem" działa tak samo dobrze w poprzek modułów.
  const contrast = focus
    ? take(
        allPairs(wszystkie)
          .filter((p) => p.item.pl && p.item.pattern !== focus && itemState(p.item.id).introduced)
          .sort(overdueSort),
        1,
        used
      )
    : [];

  const reviews = take(reviewQueue(wszystkie, now), 4, used);

  const filler = take(
    mine.filter((p) => !itemState(p.item.id).introduced).sort(unseenFirst),
    Math.max(0, 4 - (contrast.length + reviews.length)),
    used
  );

  const typed = [...contrast, ...reviews, ...filler].map((pair, i) =>
    step(pair, typedKind(pair, i))
  );

  while (typed.length < 4) {
    const more = take(mine.slice().sort(unseenFirst), 1, used);
    if (!more.length) break;
    typed.push(step(more[0], typedKind(more[0], typed.length)));
  }

  const dictations = take(
    (module.dictation || [])
      .map((item) => ({ item, mod: module }))
      .sort((a, b) => {
        const dueDiff = Number(due(b.item.id, now)) - Number(due(a.item.id, now));
        return dueDiff !== 0 ? dueDiff : unseenFirst(a, b);
      }),
    4,
    used
  ).map((pair) => step(pair, 'dictate'));

  const pools = [tiles, typed.slice(0, 4), dictations];
  const order = [0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1, 2];
  const steps = [];
  for (const p of order) {
    if (pools[p].length) steps.push(pools[p].shift());
  }
  while (steps.length < LESSON_MAX_ITEMS && pools.some((p) => p.length)) {
    for (const p of pools) {
      if (p.length && steps.length < LESSON_MAX_ITEMS) steps.push(p.shift());
    }
  }

  return { steps, focus };
}

export function focusLabel(module, pattern) {
  return (module.patterns && module.patterns[pattern]) || '';
}

export function moduleOutline(module, modules) {
  const now = Date.now();
  const lessons = [];
  for (const pattern of module.patternOrder || []) {
    const items = (module.translations || []).filter((t) => t.pattern === pattern);
    for (let i = 0; i < items.length; i += NEW_PER_LESSON) {
      const chunk = items.slice(i, i + NEW_PER_LESSON);
      lessons.push({
        n: lessons.length + 1,
        pattern,
        title: (module.patterns && module.patterns[pattern]) || pattern,
        // „widziane" pcha lekcje do przodu, „umiem" stawia ptaszek. Rozdzielone,
        // żeby jedna pomyłka nie cofała wskaźnika bieżącej lekcji o pół modułu.
        seen: chunk.every((t) => itemState(t.id).introduced),
        done: chunk.every((t) => isDone(t.id)),
        sentences: chunk.length,
      });
    }
  }
  const current = lessons.find((l) => !l.seen) || null;
  return {
    total: lessons.length,
    lessons,
    current,
    dueCount: dueCount(asList(modules).length ? modules : [module], now),
    reviewOnly: !current,
  };
}

export function nextStop(route, km) {
  return (route.stops || []).find((s) => s.km > km) || null;
}

export function formatMinutes(totalSeconds) {
  const mins = Math.round((totalSeconds || 0) / 60);
  if (mins < 1) return '0 min';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} godz. ${m} min` : `${h} godz.`;
}
