// Składanie lekcji: bloki do opanowania + powtórki z odstępami.
import { itemState } from './store.js';

export const LESSON_MAX_ITEMS = 15;
export const LESSON_KM = 20;
export const LESSON_COINS = 20;

function due(id, now) {
  const st = itemState(id);
  return st.introduced && st.due <= now;
}

function overdueSort(a, b) {
  return itemState(a.id).due - itemState(b.id).due;
}

function unseenFirst(a, b) {
  return itemState(a.id).seen - itemState(b.id).seen;
}

function take(list, n, seen) {
  const out = [];
  for (const x of list) {
    if (out.length >= n) break;
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
}

export function nextPattern(module, state) {
  const prefix = `${module.id}::`;
  for (const p of module.patternOrder) {
    if (state.patternsIntroduced.includes(`${prefix}${p}`)) continue;
    if (module.translations.some((t) => t.pattern === p)) return p;
  }
  return null;
}

/**
 * Lekcja: 7 kafelków, 4 tłumaczenia, 4 dyktanda — przeplatane.
 */
export function buildLesson(module, state) {
  const now = Date.now();
  const used = new Set();
  const translations = module.translations;
  const focus = nextPattern(module, state);

  const newOnes = focus
    ? take(
        translations.filter((t) => t.pattern === focus && !itemState(t.id).introduced),
        3,
        used
      )
    : [];
  const extraTiles =
    newOnes.length < 7
      ? take(
          translations.filter((t) => !itemState(t.id).introduced).sort(unseenFirst),
          7 - newOnes.length,
          used
        )
      : [];
  const moreTiles =
    [...newOnes, ...extraTiles].length < 7
      ? take(translations.slice().sort(unseenFirst), 7 - newOnes.length - extraTiles.length, used)
      : [];
  const tileItems = [...newOnes, ...extraTiles, ...moreTiles].slice(0, 7);
  const tiles = tileItems.map((item) => ({
    kind: 'tiles',
    item,
    pattern: item.pattern,
    isNew: !itemState(item.id).introduced,
  }));

  const contrast = focus
    ? take(
        translations
          .filter((t) => t.pattern !== focus && itemState(t.id).introduced)
          .sort(overdueSort),
        1,
        used
      )
    : [];

  const reviews = take(translations.filter((t) => due(t.id, now)).sort(overdueSort), 2, used);

  const filler = take(
    translations.filter((t) => !itemState(t.id).introduced).sort(unseenFirst),
    Math.max(0, 4 - (contrast.length + reviews.length)),
    used
  );

  const typed = [...contrast, ...reviews, ...filler].map((item) => ({
    kind: 'translate',
    item,
    pattern: item.pattern,
    isNew: !itemState(item.id).introduced,
  }));

  while (typed.length < 4) {
    const more = take(translations.slice().sort(unseenFirst), 1, used);
    if (!more.length) break;
    typed.push({
      kind: 'translate',
      item: more[0],
      pattern: more[0].pattern,
      isNew: !itemState(more[0].id).introduced,
    });
  }

  const dictations = take(
    [...module.dictation].sort((a, b) => {
      const dueDiff = Number(due(b.id, now)) - Number(due(a.id, now));
      return dueDiff !== 0 ? dueDiff : unseenFirst(a, b);
    }),
    4,
    used
  ).map((item) => ({ kind: 'dictate', item }));

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
