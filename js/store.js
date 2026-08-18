// Cały stan nauki. Nic nie wychodzi poza tę przeglądarkę.
const KEY = 'lumio.v1';
const STARTER = ['hair-bob', 'hair-long', 'hair-ponytail', 'top-tshirt', 'bottom-shorts'];

// Odstępy powtórek. Indeks = "pudełko", w którym siedzi zdanie.
export const INTERVALS_MS = [
  10 * 60 * 1000, // 0 → za 10 minut
  20 * 60 * 60 * 1000, // 1 → jutro
  3 * 24 * 3600 * 1000, // 2 → za 3 dni
  7 * 24 * 3600 * 1000, // 3 → za tydzień
  21 * 24 * 3600 * 1000, // 4 → za 3 tygodnie
  60 * 24 * 3600 * 1000, // 5 → za 2 miesiące
];

function fresh() {
  return {
    v: 1,
    createdAt: new Date().toISOString(),
    voiceName: null,
    km: 0,
    coins: 0,
    owned: [...STARTER],
    equipped: { hair: 'hair-bob', top: 'top-tshirt', bottom: 'bottom-shorts' },
    claimed: {},
    visited: ['warszawa'],
    look: { hairColor: 'brunette', eyeColor: 'brown', done: false },
    learnedSeconds: 0,
    items: {},
    patternsIntroduced: [],
    moduleId: 'czasy-it',
    lessons: [],
    reports: [],
    lastBackupAt: null,
    rivals: [],
  };
}

let state = fresh();
let saveTimer = null;

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = migrate(JSON.parse(raw));
  } catch (err) {
    console.warn('Nie udało się odczytać postępu, zaczynam od zera.', err);
    state = fresh();
  }
  return state;
}

// Sukienka wyklucza górę i dół. Bez tego po wczytaniu stanu można nosić
// jednocześnie sukienkę i koszulkę — ludzik wygląda dobrze, ale dane kłamią.
function normalizeEquipped(equipped, owned) {
  const eq = { ...(equipped || {}) };
  for (const [slot, id] of Object.entries(eq)) {
    if (!owned.includes(id)) delete eq[slot];
  }
  if (eq.dress) {
    delete eq.top;
    delete eq.bottom;
  } else {
    if (!eq.top) eq.top = 'top-tshirt';
    if (!eq.bottom) eq.bottom = 'bottom-shorts';
  }
  if (!eq.hair) eq.hair = 'hair-bob';
  return eq;
}

function migrate(loaded) {
  const base = fresh();
  const merged = { ...base, ...loaded };
  merged.items = loaded.items || {};
  merged.owned = Array.isArray(loaded.owned) ? [...loaded.owned] : [...STARTER];
  for (const id of STARTER) if (!merged.owned.includes(id)) merged.owned.push(id);
  // Uwaga: NIE scalamy domyślnego stroju na wczytany — usunięte slotów nie ma
  // w zapisie, więc scalenie przywróciłoby je z powrotem.
  merged.equipped = normalizeEquipped(loaded.equipped, merged.owned);
  merged.look = {
    hairColor: loaded.look?.hairColor || 'brunette',
    eyeColor: loaded.look?.eyeColor || 'brown',
    done: Boolean(loaded.look?.done),
  };
  merged.learnedSeconds = Number(loaded.learnedSeconds) || 0;
  merged.moduleId = loaded.moduleId || 'czasy-it';
  merged.rivals = Array.isArray(loaded.rivals) ? loaded.rivals.slice(0, 3) : [];
  if (
    Array.isArray(merged.patternsIntroduced) &&
    merged.patternsIntroduced.length &&
    !String(merged.patternsIntroduced[0]).includes('::')
  ) {
    merged.patternsIntroduced = merged.patternsIntroduced.map((p) => `czasy-it::${p}`);
  }
  return merged;
}

export function get() {
  return state;
}

export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Nie udało się zapisać postępu.', err);
    }
  }, 120);
}

export function saveNow() {
  clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Nie udało się zapisać postępu.', err);
  }
}

// ---------- pojedyncze zdania ----------

export function itemState(id) {
  if (!state.items[id]) {
    state.items[id] = { box: 0, streak: 0, due: 0, seen: 0, wrong: 0, introduced: false };
  }
  return state.items[id];
}

export function recordAnswer(id, correct) {
  const it = itemState(id);
  it.seen += 1;
  it.introduced = true;
  if (correct) {
    it.streak += 1;
    it.box = Math.min(INTERVALS_MS.length - 1, it.box + 1);
  } else {
    it.wrong += 1;
    it.streak = 0;
    it.box = Math.max(0, it.box - 2);
  }
  it.due = Date.now() + INTERVALS_MS[it.box];
  save();
  return it;
}

export function markPatternIntroduced(moduleId, pattern) {
  const key = moduleId && pattern ? `${moduleId}::${pattern}` : pattern;
  if (key && !state.patternsIntroduced.includes(key)) {
    state.patternsIntroduced.push(key);
    save();
  }
}

export function setModuleId(id) {
  if (!id || state.moduleId === id) return;
  state.moduleId = id;
  save();
}

// ---------- ekonomia ----------

export function addLesson({ count, correct, km, coins, seconds = 0 }) {
  state.km += km;
  state.coins += coins;
  state.learnedSeconds = (state.learnedSeconds || 0) + seconds;
  state.lessons.push({ at: new Date().toISOString(), count, correct, km, coins, seconds });
  save();
}

export function spend(amount) {
  if (state.coins < amount) return false;
  state.coins -= amount;
  save();
  return true;
}

export function addCoins(amount) {
  state.coins += amount;
  save();
}

export function grant(itemId) {
  if (!state.owned.includes(itemId)) state.owned.push(itemId);
  save();
}

export function owns(itemId) {
  return state.owned.includes(itemId);
}

export function equip(item) {
  const eq = state.equipped;
  if (item.slot === 'dress') {
    delete eq.top;
    delete eq.bottom;
  }
  if (item.slot === 'top' || item.slot === 'bottom') delete eq.dress;
  eq[item.slot] = item.id;
  save();
}

export function unequip(slot) {
  const eq = state.equipped;
  if (slot === 'dress') {
    delete eq.dress;
    eq.top = 'top-tshirt';
    eq.bottom = 'bottom-shorts';
  } else if (slot === 'hair') {
    eq.hair = 'hair-bob';
  } else {
    delete eq[slot];
  }
  save();
}

export function claimStop(stopId, itemId) {
  state.claimed[stopId] = itemId;
  grant(itemId);
  save();
}

export function markVisited(stopId) {
  if (!state.visited.includes(stopId)) {
    state.visited.push(stopId);
    save();
  }
}

export function setLook(look) {
  state.look = {
    hairColor: look.hairColor,
    eyeColor: look.eyeColor,
    done: true,
  };
  if (look.hair) {
    state.equipped.hair = look.hair;
    if (!state.owned.includes(look.hair)) state.owned.push(look.hair);
  }
  save();
}

// ---------- zgłoszenia od Ciebie ----------

export function report(itemId, kind, answer) {
  state.reports.push({ itemId, kind, answer, at: new Date().toISOString() });
  save();
}

// ---------- kopia zapasowa ----------

export function exportText() {
  return JSON.stringify(state, null, 2);
}

export function importText(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.km !== 'number') {
    throw new Error('To nie wygląda na kopię postępu z Lumio.');
  }
  state = migrate(parsed);
  saveNow();
  return state;
}

export function markBackedUp() {
  state.lastBackupAt = new Date().toISOString();
  save();
}

export function backupIsStale() {
  const lessons = state.lessons.length;
  if (lessons < 3) return false;
  if (!state.lastBackupAt) return true;
  return Date.now() - new Date(state.lastBackupAt).getTime() > 7 * 24 * 3600 * 1000;
}

export function encodeRace() {
  const s = state;
  const raw = JSON.stringify({
    v: 1,
    km: s.km,
    look: { hairColor: s.look?.hairColor || 'brunette', eyeColor: s.look?.eyeColor || 'brown' },
    eq: s.equipped || {},
  });
  const b64 = btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `LUM1.${b64}`;
}

export function decodeRace(text) {
  const m = String(text || '')
    .trim()
    .match(/LUM1\.([A-Za-z0-9_-]+)/);
  if (!m) throw new Error('To nie jest kod Lumio. Szukaj kawałka zaczynającego się od LUM1.');
  let json = m[1].replace(/-/g, '+').replace(/_/g, '/');
  while (json.length % 4) json += '=';
  let parsed;
  try {
    parsed = JSON.parse(decodeURIComponent(escape(atob(json))));
  } catch {
    throw new Error('Ten kod jest uszkodzony.');
  }
  if (!parsed || typeof parsed.km !== 'number') throw new Error('Ten kod nie ma kilometrów.');
  return {
    km: Math.max(0, parsed.km),
    look: {
      hairColor: parsed.look?.hairColor || 'brunette',
      eyeColor: parsed.look?.eyeColor || 'brown',
    },
    eq: parsed.eq && typeof parsed.eq === 'object' ? parsed.eq : {},
  };
}

export function saveRival(snap) {
  const next = {
    km: snap.km,
    look: snap.look,
    eq: snap.eq,
    at: new Date().toISOString(),
  };
  const list = Array.isArray(state.rivals) ? [...state.rivals] : [];
  const sig = JSON.stringify({ km: next.km, eq: next.eq, look: next.look });
  state.rivals = [next, ...list.filter((r) => JSON.stringify({ km: r.km, eq: r.eq, look: r.look }) !== sig)].slice(
    0,
    3
  );
  save();
  return state.rivals;
}

export function wipe() {
  state = fresh();
  saveNow();
  return state;
}
