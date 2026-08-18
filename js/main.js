import * as store from './store.js';
import * as speech from './speech.js';
import { boot } from './app.js';
import { h, mount, toast } from './ui.js';

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path} — HTTP ${res.status}`);
  return res.json();
}

function fail(message, detail) {
  mount(h(`<div class="card">
    <span class="label">Nie wystartowało</span>
    <h1>${message}</h1>
    <p class="muted">${detail}</p>
  </div>`));
}

(async () => {
  store.load();

  if (location.protocol === 'file:') {
    return fail(
      'Otwórz Lumio przez serwer, nie dwuklikiem',
      'Przeglądarka blokuje wczytywanie plików z dysku. W katalogu projektu uruchom <b>node serve.js</b> '
      + 'i wejdź na <b>http://localhost:4173</b>. Instrukcja jest w README.md.'
    );
  }

  let module;
  let route;
  try {
    [module, route] = await Promise.all([
      loadJson('data/module-czasy-it.json'),
      loadJson('data/route.json')
    ]);
  } catch (err) {
    return fail('Nie udało się wczytać modułu', String(err.message || err));
  }

  await speech.loadVoices();

  const state = store.get();
  if (state.voiceName && !speech.setVoiceByName(state.voiceName)) {
    const fallback = speech.recommended();
    if (fallback) {
      speech.setVoiceByName(fallback.name);
      setTimeout(() => toast(`Głosu „${state.voiceName}" nie ma na tym komputerze. Wzięłam ${fallback.name}.`), 400);
    }
  }
  if (!speech.currentVoice()) {
    const rec = speech.recommended();
    if (rec) speech.setVoiceByName(rec.name);
  }

  boot({ module, route });

  // Offline włączamy tylko w wersji wdrożonej. Na localhoście service worker
  // podawałby starą, zacachowaną apkę po każdej zmianie w kodzie — i wyrejestrowujemy
  // taki, który został po wcześniejszych wejściach.
  if (!('serviceWorker' in navigator)) return;
  const local = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  if (location.protocol === 'https:' && !local) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline po prostu nie zadziała */ });
  } else {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) await reg.unregister();
    if (window.caches) {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n.startsWith('lumio-')).map((n) => caches.delete(n)));
    }
  }
})();
