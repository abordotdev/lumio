// Cały stan nauki. Nic nie wychodzi poza tę przeglądarkę.
import { DRESS_PARTS } from './avatar.js';

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
    customPhrases: [],
    nick: '',
    palette: 'forest',
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

function grantDressParts(owned) {
  const next = [...owned];
  for (const [dress, parts] of Object.entries(DRESS_PARTS)) {
    if (!next.includes(dress)) continue;
    if (!next.includes(parts.top)) next.push(parts.top);
    if (!next.includes(parts.bottom)) next.push(parts.bottom);
  }
  return next.filter((id) => !DRESS_PARTS[id]);
}

function splitLegacyDress(equipped) {
  const eq = { ...(equipped || {}) };
  if (eq.dress && DRESS_PARTS[eq.dress]) {
    Object.assign(eq, DRESS_PARTS[eq.dress]);
    delete eq.dress;
  }
  return eq;
}

// Góra i dół są osobno. Stara sukienka rozpada się na dwie części.
function normalizeEquipped(equipped, owned) {
  const eq = splitLegacyDress(equipped);
  for (const [slot, id] of Object.entries(eq)) {
    if (!owned.includes(id)) delete eq[slot];
  }
  if (!eq.top) eq.top = 'top-tshirt';
  if (!eq.bottom) eq.bottom = 'bottom-shorts';
  if (!eq.hair) eq.hair = 'hair-bob';
  return eq;
}

function migrate(loaded) {
  const base = fresh();
  const merged = { ...base, ...loaded };
  merged.items = loaded.items || {};
  merged.owned = grantDressParts(Array.isArray(loaded.owned) ? [...loaded.owned] : [...STARTER]);
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
  merged.customPhrases = Array.isArray(loaded.customPhrases) ? loaded.customPhrases : [];
  merged.nick = sanitizeNick(loaded.nick);
  merged.palette = loaded.palette === 'lilac' ? 'lilac' : 'forest';
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
    it.due = Date.now() + INTERVALS_MS[it.box];
  } else {
    it.wrong += 1;
    it.streak = 0;
    // Po długiej przerwie zapominanie jest normalne. Jedna pomyłka nie może
    // kasować miesięcy postępu — cofa o jeden krok, nie na sam dół.
    it.box = isComeback() ? Math.max(0, it.box - 1) : 0;
    // Źle = wraca od razu, nie za 10 minut.
    it.due = Date.now();
  }
  save();
  return it;
}

// Po tylu dniach bez lekcji traktujemy wejście jako powrót, nie jak zwykły dzień.
export const COMEBACK_AFTER_DAYS = 14;

export function lastLessonAt() {
  const list = state.lessons || [];
  return list.length ? list[list.length - 1].at : null;
}

export function daysSinceLastLesson() {
  const at = lastLessonAt();
  if (!at) return null;
  const diff = Date.now() - new Date(at).getTime();
  return Math.floor(diff / (24 * 3600 * 1000));
}

// Nie trzymamy osobnej flagi: gdy tylko zrobisz lekcję, przerwa przestaje istnieć sama.
export function isComeback() {
  const dni = daysSinceLastLesson();
  return dni !== null && dni >= COMEBACK_AFTER_DAYS;
}

function dzien(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Ile dni pod rząd była lekcja, licząc wstecz od dziś.
 *
 * Wczorajszy dzień też otwiera serię — inaczej seria kasowałaby się o północy,
 * zanim zdążysz usiąść do lekcji.
 */
export function streakDays(now = Date.now()) {
  const dni = new Set((state.lessons || []).map((l) => dzien(l.at)));
  if (!dni.size) return 0;

  const dzis = dzien(new Date(now).toISOString());
  const wczoraj = dzien(new Date(now - 24 * 3600 * 1000).toISOString());
  if (!dni.has(dzis) && !dni.has(wczoraj)) return 0;

  let ile = 0;
  for (let i = dni.has(dzis) ? 0 : 1; i < 400; i += 1) {
    if (!dni.has(dzien(new Date(now - i * 24 * 3600 * 1000).toISOString()))) break;
    ile += 1;
  }
  return ile;
}

// „Umiem" znaczy: odpowiedziałam dobrze, a nie: zdanie mi się kiedyś pokazało.
// Bez tego lista lekcji stawiała ptaszek za samo obejrzenie zdania.
export function isDone(id) {
  const st = itemState(id);
  return st.introduced && st.box >= 1;
}

// Zdanie, które przetrwało tydzień odstępu — to jest prawdziwe „umiem to powiedzieć".
export function isMastered(id) {
  return itemState(id).box >= 3;
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
  try {
    const cur = localStorage.getItem(KEY);
    if (cur) localStorage.setItem(`${KEY}.prev`, cur);
  } catch {
    /* schowek przeglądarki pełny */
  }
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
  delete eq.dress;
  if (item.slot === 'dress' && DRESS_PARTS[item.id]) {
    Object.assign(eq, DRESS_PARTS[item.id]);
  } else {
    eq[item.slot] = item.id;
  }
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
  } else if (slot === 'top') {
    eq.top = 'top-tshirt';
  } else if (slot === 'bottom') {
    eq.bottom = 'bottom-shorts';
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

export function setVoice(name) {
  state.voiceName = name || null;
  saveNow();
}

export function setLook(look) {
  state.look = {
    hairColor: look.hairColor,
    eyeColor: look.eyeColor,
    postac: look.postac === 'chłopak' ? 'chłopak' : 'dziewczyna',
    done: true,
  };
  if (look.hair) {
    state.equipped.hair = look.hair;
    if (!state.owned.includes(look.hair)) state.owned.push(look.hair);
  }
  save();
}

export function sanitizeNick(raw) {
  return String(raw || '')
    .trim()
    .replace(/~/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 16);
}

export function setNick(raw) {
  state.nick = sanitizeNick(raw);
  save();
  return state.nick;
}

export function setPalette(id) {
  state.palette = id === 'lilac' ? 'lilac' : 'forest';
  save();
  return state.palette;
}

export function grantMany(ids) {
  for (const id of ids) {
    if (id && !state.owned.includes(id)) state.owned.push(id);
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

export function importPrevBackup() {
  const raw = localStorage.getItem(`${KEY}.prev`);
  if (!raw) throw new Error('Nie ma poprzedniej kopii w tej przeglądarce.');
  return importText(raw);
}

export function hasPrevBackup() {
  return Boolean(localStorage.getItem(`${KEY}.prev`));
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

const RACE_HAIR_COLOR = ['blonde', 'brunette', 'black', 'auburn'];
const RACE_EYE_COLOR = ['blue', 'brown', 'green'];
const RACE_HAIR = ['hair-bob', 'hair-long', 'hair-ponytail'];
const RACE_DRESS = [
  '',
  'dress-navy',
  'dress-red',
  'dress-lilac',
  'dress-sun',
  'dress-mint',
  'dress-coral',
];
const RACE_TOP = ['', 'top-tshirt', 'top-denim', 'top-coat', 'top-navy', 'top-red', 'top-lilac'];
const RACE_BOTTOM = ['', 'bottom-shorts', 'bottom-jeans', 'bottom-skirt'];
const RACE_HEAD = ['', 'bow', 'beanie', 'clips', 'headband', 'beret'];
const RACE_NECK = ['', 'scarf', 'necklace', 'choker', 'pearls'];
const RACE_LIPS = ['', 'lipstick', 'gloss'];
const RACE_EARS = ['', 'earrings', 'studs', 'hoops'];
const RACE_GLASSES = ['', 'glasses'];

function raceIdx(list, id) {
  const i = list.indexOf(id || '');
  return i < 0 ? 0 : i;
}

function racePick(list, i) {
  return list[i] || list[0] || '';
}

function bytesToCode(bytes) {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function codeToBytes(code) {
  let b64 = String(code).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function matchingDress(eq) {
  for (const [dress, parts] of Object.entries(DRESS_PARTS)) {
    if (eq.top === parts.top && eq.bottom === parts.bottom) return dress;
  }
  return '';
}

export function encodeRace() {
  const s = state;
  const eq = s.equipped || {};
  const look = s.look || {};
  const km = Math.min(65535, Math.max(0, Math.round(Number(s.km) || 0)));
  const dress = matchingDress(eq) || eq.dress || '';
  const b = new Uint8Array(6);
  b[0] = (km >> 8) & 255;
  b[1] = km & 255;
  b[2] =
    (raceIdx(RACE_HAIR_COLOR, look.hairColor || 'brunette') << 6) |
    (raceIdx(RACE_EYE_COLOR, look.eyeColor || 'brown') << 4) |
    (raceIdx(RACE_HAIR, eq.hair || 'hair-bob') << 2) |
    raceIdx(RACE_EARS, eq.ears);
  b[3] =
    (raceIdx(RACE_DRESS, dress) << 5) |
    (raceIdx(RACE_TOP, dress ? '' : eq.top) << 2) |
    raceIdx(RACE_BOTTOM, dress ? '' : eq.bottom);
  b[4] =
    (raceIdx(RACE_HEAD, eq.head) << 5) |
    (raceIdx(RACE_NECK, eq.neck) << 2) |
    raceIdx(RACE_LIPS, eq.lips);
  b[5] = (raceIdx(RACE_GLASSES, eq.eyes) << 6) | ((b[0] ^ b[1] ^ b[2] ^ b[3] ^ b[4]) & 63);
  const code = bytesToCode(b);
  const nick = sanitizeNick(s.nick);
  return nick ? `${code}~${encodeURIComponent(nick)}` : code;
}

function decodeRaceShort(code) {
  const bytes = codeToBytes(code);
  if (bytes.length !== 6) throw new Error('zły rozmiar');
  const check = (bytes[0] ^ bytes[1] ^ bytes[2] ^ bytes[3] ^ bytes[4]) & 63;
  if (check !== (bytes[5] & 63)) throw new Error('suma');
  const km = (bytes[0] << 8) | bytes[1];
  const dress = racePick(RACE_DRESS, (bytes[3] >> 5) & 7);
  const top = racePick(RACE_TOP, (bytes[3] >> 2) & 7);
  const bottom = racePick(RACE_BOTTOM, bytes[3] & 3);
  const eq = {
    hair: racePick(RACE_HAIR, (bytes[2] >> 2) & 3) || 'hair-bob',
  };
  if (dress && DRESS_PARTS[dress]) {
    Object.assign(eq, DRESS_PARTS[dress]);
  } else {
    if (top) eq.top = top;
    if (bottom) eq.bottom = bottom;
  }
  const head = racePick(RACE_HEAD, (bytes[4] >> 5) & 7);
  const neck = racePick(RACE_NECK, (bytes[4] >> 2) & 7);
  const lips = racePick(RACE_LIPS, bytes[4] & 3);
  const ears = racePick(RACE_EARS, bytes[2] & 3);
  const glasses = racePick(RACE_GLASSES, (bytes[5] >> 6) & 3);
  if (head) eq.head = head;
  if (neck) eq.neck = neck;
  if (lips) eq.lips = lips;
  if (ears) eq.ears = ears;
  if (glasses) eq.eyes = glasses;
  return {
    km: Math.max(0, km),
    look: {
      hairColor: racePick(RACE_HAIR_COLOR, (bytes[2] >> 6) & 3) || 'brunette',
      eyeColor: racePick(RACE_EYE_COLOR, (bytes[2] >> 4) & 3) || 'brown',
    },
    eq,
  };
}

function decodeRaceLong(payload) {
  let json = payload.replace(/-/g, '+').replace(/_/g, '/');
  while (json.length % 4) json += '=';
  const parsed = JSON.parse(decodeURIComponent(escape(atob(json))));
  if (!parsed || typeof parsed.km !== 'number') throw new Error('Ten kod nie ma kilometrów.');
  return {
    km: Math.max(0, parsed.km),
    look: {
      hairColor: parsed.look?.hairColor || 'brunette',
      eyeColor: parsed.look?.eyeColor || 'brown',
    },
    eq: parsed.eq && typeof parsed.eq === 'object' ? parsed.eq : {},
    nick: sanitizeNick(parsed.nick),
  };
}

function decodeNickToken(token) {
  if (!token) return '';
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

export function decodeRace(text) {
  const raw = String(text || '').trim();
  const long = raw.match(/LUM1\.([A-Za-z0-9_-]+)/);
  if (long) {
    try {
      return decodeRaceLong(long[1]);
    } catch {
      throw new Error('Ten kod jest uszkodzony.');
    }
  }
  const short = raw.match(/([A-Za-z0-9_-]{8})(?:~([^\s~]{1,48}))?/);
  if (short) {
    try {
      const snap = decodeRaceShort(short[1]);
      snap.nick = sanitizeNick(decodeNickToken(short[2]));
      return snap;
    } catch {
      throw new Error('Ten kod jest uszkodzony.');
    }
  }
  throw new Error('To nie jest kod Lumio. Szukaj ośmiu znaków, albo starego LUM1.');
}

export function saveRival(snap) {
  const next = {
    km: snap.km,
    look: snap.look,
    eq: snap.eq,
    nick: sanitizeNick(snap.nick),
    at: new Date().toISOString(),
  };
  const list = Array.isArray(state.rivals) ? [...state.rivals] : [];
  const sig = JSON.stringify({ km: next.km, eq: next.eq, look: next.look, nick: next.nick });
  state.rivals = [
    next,
    ...list.filter(
      (r) => JSON.stringify({ km: r.km, eq: r.eq, look: r.look, nick: r.nick || '' }) !== sig
    ),
  ].slice(0, 3);
  save();
  return state.rivals;
}

export function wipe() {
  state = fresh();
  saveNow();
  return state;
}
