// Własne zdania: polski wpisujesz ty, angielski tłumaczy apka.

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

function decodeHtml(s) {
  return String(s || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function fromMyMemory(q) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=pl|en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('tłumacz nie odpowiedział');
  const data = await res.json();
  const en = decodeHtml(data?.responseData?.translatedText || '');
  if (!en) throw new Error('puste tłumaczenie');
  return en;
}

async function fromLocalProxy(q) {
  const res = await fetch(`/api/translate?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('lokalny tłumacz padł');
  const data = await res.json();
  const en = decodeHtml(data?.en || '');
  if (!en) throw new Error('puste tłumaczenie');
  return en;
}

export async function plToEn(text) {
  const q = String(text || '').trim();
  if (!q) throw new Error('Wpisz zdanie po polsku.');
  try {
    return await fromMyMemory(q);
  } catch {
    return fromLocalProxy(q);
  }
}

export function buildMineModule(phrases = []) {
  const translations = (phrases || []).map((p) => ({
    id: p.id,
    pattern: 'mine',
    pl: p.pl,
    en: p.en,
    accept: p.accept || [],
    chunks: p.chunks && p.chunks.length ? p.chunks : chunkEnglish(p.en),
  }));
  return {
    id: 'moje',
    title: 'Moje zdania',
    subtitle: 'Wpisujesz po polsku. Apka tłumaczy i czyta na głos.',
    patterns: { mine: 'twoje zdania' },
    patternOrder: ['mine'],
    translations,
    dictation: [],
  };
}
