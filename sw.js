// Offline: wszystko do cache przy instalacji, potem cache-first.
const VERSION = 'lumio-v23-2026-08-19';
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'css/mapa-trasy.css',
  'css/ekran-start.css',
  'js/main.js',
  'js/mapa-trasy.js',
  'js/ekran-start.js',
  'js/ikony-ui.js',
  'js/ikony.js',
  'js/ludzik.js',
  'js/app.js',
  'js/lesson.js',
  'js/store.js',
  'js/speech.js',
  'js/forms.js',
  'js/scheduler.js',
  'js/avatar.js',
  'js/ui.js',
  'js/gate.js',
  'js/grade.js',
  'js/disk.js',
  'js/mine.js',
  'data/catalog.json',
  'data/module-czasy-it.json',
  'data/module-small-talk.json',
  'data/module-rekrutacja.json',
  'data/module-praca.json',
  'data/module-zadania.json',
  'data/route.json',
  'manifest.webmanifest',
  'icons/icon-192.svg',
  'icons/icon-512.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await cache.addAll(SHELL);
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) {
        // Odśwież w tle, ale nie każ na to czekać.
        fetch(request)
          .then(async (res) => {
            if (res && res.ok) (await caches.open(VERSION)).put(request, res.clone());
          })
          .catch(() => {});
        return cached;
      }
      try {
        const res = await fetch(request);
        if (res && res.ok) (await caches.open(VERSION)).put(request, res.clone());
        return res;
      } catch (err) {
        const shell = await caches.match('index.html');
        if (shell && request.mode === 'navigate') return shell;
        throw err;
      }
    })()
  );
});
