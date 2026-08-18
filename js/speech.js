// Głos. Zwolnione tempo robimy PAUZAMI między kawałkami, nie rozciąganiem nagrania.
const synth = window.speechSynthesis;

let voices = [];
let chosen = null;

const FEMALE_HINTS = [
  'zira',
  'aria',
  'jenny',
  'michelle',
  'ana',
  'samantha',
  'karen',
  'moira',
  'tessa',
  'susan',
  'linda',
  'heather',
  'catherine',
  'allison',
  'ava',
  'joanna',
  'kendra',
  'kimberly',
  'salli',
  'nicole',
  'amy',
  'emma',
  'hazel',
  'female',
  'woman',
  'kobieta',
];

export function supported() {
  return (
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export function loadVoices() {
  return new Promise((resolve) => {
    if (!supported()) return resolve([]);
    const pull = () => synth.getVoices().filter((v) => /^en/i.test(v.lang));
    const first = pull();
    if (first.length) {
      voices = first;
      return resolve(voices);
    }
    // Chrome i Edge wypełniają listę dopiero po chwili.
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      voices = pull();
      resolve(voices);
    };
    synth.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 1200);
  });
}

export function available() {
  return voices;
}

export function usVoices() {
  return voices.filter((v) => /^en[-_]us/i.test(v.lang));
}

export function looksFemale(voice) {
  const n = (voice.name || '').toLowerCase();
  if (FEMALE_HINTS.some((h) => n.includes(h))) return true;
  return /google us english$/.test(n);
}

// Kolejność: amerykański żeński → amerykański → żeński → cokolwiek angielskiego.
export function recommended() {
  const us = usVoices();
  return us.find(looksFemale) || us[0] || voices.find(looksFemale) || voices[0] || null;
}

export function setVoiceByName(name) {
  chosen = voices.find((v) => v.name === name) || null;
  return chosen;
}

export function currentVoice() {
  return chosen;
}

export function diagnosis() {
  if (!supported()) {
    return {
      level: 'blocked',
      text: 'Ta przeglądarka nie umie mówić. Spróbuj w Chrome albo Edge.',
    };
  }
  if (!voices.length) {
    return {
      level: 'blocked',
      text: 'Nie znalazłam na tym komputerze żadnego angielskiego głosu. Bez głosu shadowing nie zadziała.',
    };
  }
  if (!usVoices().length) {
    return {
      level: 'warn',
      text: 'Nie ma tu głosu amerykańskiego — jest tylko inny angielski. Będzie działać, ale wymowa, którą powtórzysz, nie będzie amerykańska.',
    };
  }
  if (!usVoices().some(looksFemale)) {
    return {
      level: 'note',
      text: 'Jest głos amerykański, ale wygląda na męski. Da się mówić razem z nim, tylko trudniej trafić w wysokość.',
    };
  }
  return { level: 'ok', text: 'Jest amerykański głos żeński — dokładnie to, czego chcemy.' };
}

// ---------- mówienie ----------

let sequenceToken = 0;
const waiters = new Set();

export function cancel() {
  sequenceToken += 1;
  try {
    synth.cancel();
  } catch {
    /* nieistotne */
  }
  for (const w of waiters) w();
  waiters.clear();
}

export function stillCurrent(token) {
  return token === sequenceToken;
}

export function waitCancellable(ms) {
  const mine = sequenceToken;
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      waiters.delete(abort);
      resolve(ok);
    };
    const abort = () => finish(false);
    waiters.add(abort);
    const t = setTimeout(() => finish(mine === sequenceToken), ms);
  });
}

function utter(text, { rate = 1, volume = 1, pitch = 1 } = {}) {
  return new Promise((resolve) => {
    if (!supported() || !text) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    if (chosen) {
      u.voice = chosen;
      u.lang = chosen.lang;
    } else {
      u.lang = 'en-US';
    }
    u.rate = rate;
    u.volume = volume;
    u.pitch = pitch;

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve();
    };
    u.onend = done;
    u.onerror = done;

    // Bezpiecznik: w Chrome zdarza się, że onend nigdy nie przychodzi.
    const guard = setTimeout(done, Math.max(2500, text.length * 130));
    synth.speak(u);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function speakOnce(text, opts) {
  cancel();
  return utter(text, opts);
}

// Kawałki z prawdziwymi pauzami. volumes opcjonalnie ścisza kolejne kawałki.
// onChunk(i) dostaje indeks kawałka przed wypowiedzeniem, a onChunk(-1) na koniec.
export async function speakChunks(
  chunks,
  { rate = 1, gapMs = 500, volumes = null, onChunk = null } = {}
) {
  cancel();
  const mine = sequenceToken;
  for (let i = 0; i < chunks.length; i += 1) {
    if (mine !== sequenceToken) return;
    if (onChunk) onChunk(i);
    const volume = volumes ? (volumes[i] ?? volumes[volumes.length - 1]) : 1;
    await utter(chunks[i], { rate, volume });
    if (mine !== sequenceToken) return;
    if (i < chunks.length - 1) await wait(gapMs);
  }
  if (onChunk && mine === sequenceToken) onChunk(-1);
}

// Do przebiegu z ciszeniem: jeśli zdanie ma jeden kawałek, dzielimy je na grupy słów.
export function fadeUnits(chunks, full) {
  if (chunks && chunks.length >= 2) return chunks;
  const words = (full || (chunks && chunks[0]) || '').split(/\s+/).filter(Boolean);
  if (words.length < 3) return words.length ? [words.join(' ')] : [];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

export function fadeVolumes(n) {
  if (n <= 1) return [0.45];
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    out.push(Number((1 - 0.9 * t * t).toFixed(3)));
  }
  out[n - 1] = 0.1;
  return out;
}
