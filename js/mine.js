// Własne zdania: polski wpisujesz ty, angielski dopisuję ja przy najbliższej sesji.
// Nic stąd nie wychodzi do internetu — wcześniej każde zdanie leciało do obcego tłumacza.

export function chunkEnglish(en) {
  const clean = String(en || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.?!]+$/, '');
  const words = clean.split(' ').filter(Boolean);
  if (!words.length) return [clean];
  if (words.length <= 4) return [clean];
  const size = words.length <= 9 ? 3 : 4;
  const chunks = [];
  for (let i = 0; i < words.length; i += size) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks;
}

export function isTranslated(phrase) {
  return Boolean(String(phrase?.en || '').trim());
}

// Zdania bez angielskiego czekają w poczekalni — do lekcji jeszcze nie wchodzą.
export function waitingPhrases(phrases = []) {
  return (phrases || []).filter((p) => !isTranslated(p));
}

export function translatedPhrases(phrases = []) {
  return (phrases || []).filter(isTranslated);
}

export function buildMineModule(phrases = []) {
  const translations = translatedPhrases(phrases).map((p) => ({
    id: p.id,
    pattern: 'mine',
    pl: p.pl,
    en: p.en,
    accept: p.accept || [],
    note: p.note || '',
    traps: p.traps || [],
    chunks: p.chunks && p.chunks.length ? p.chunks : chunkEnglish(p.en),
  }));
  return {
    id: 'moje',
    title: 'Moje zdania',
    subtitle: 'Twoje zdania z pracy, przetłumaczone tak jak reszta modułów.',
    patterns: { mine: 'twoje zdania' },
    patternOrder: ['mine'],
    translations,
    dictation: [],
  };
}
