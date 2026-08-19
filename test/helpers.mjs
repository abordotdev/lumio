// localStorage nie istnieje w Node, a store.js go używa. Podstawiamy pamięć.
export function stubStorage() {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: (k) => mem.delete(k),
    clear: () => mem.clear(),
  };
}

// Zdanie w module. Domyślnie wszystko, czego potrzebuje harmonogram.
export function sentence(id, pattern, extra = {}) {
  return {
    id,
    pattern,
    pl: `polskie ${id}`,
    en: `english ${id}`,
    chunks: ['english', id],
    accept: [],
    ...extra,
  };
}

export function testModule(id, patternOrder, counts) {
  const translations = [];
  patternOrder.forEach((p) => {
    for (let i = 0; i < (counts[p] || 0); i += 1) {
      translations.push(sentence(`${id}-${p}-${i}`, p));
    }
  });
  return {
    id,
    title: id,
    patterns: Object.fromEntries(patternOrder.map((p) => [p, p])),
    patternOrder,
    translations,
    dictation: [],
  };
}
