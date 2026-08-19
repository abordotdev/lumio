// Offline-first, ale bez pułapki starej apki. Kod i wejścia na stronę idą
// „najpierw sieć": online zawsze dostajesz świeżą wersję, offline — z cache.
// Fonty, ikony i obrazki idą z cache (szybko), odświeżane w tle. Dzięki temu
// numer wersji niżej służy tylko do nazwania cache — jak go zapomnę podbić,
// nikt nie utknie na starym kodzie, bo kod i tak leci z sieci.
const VERSION = 'lumio-v28-2026-08-19';
const SHELL = [
  './',
  'index.html',
  'css/fonts.css',
  'css/app.css',
  'css/mapa-trasy.css',
  'css/powloka.css',
  'css/ekran-start.css',
  'fonts/fraunces-latin.woff2',
  'fonts/fraunces-latin-ext.woff2',
  'js/main.js',
  'js/mapa-trasy.js',
  'js/ekran-start.js',
  'js/powloka.js',
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
  'data/module-dokumentacja.json',
  'data/route.json',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
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

// Kod apki i dane — najpierw sieć, więc online zawsze świeże.
const NAJPIERW_SIEC = /\.(?:js|mjs|css|json|webmanifest)$/;

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) return;

  const sciezka = new URL(request.url).pathname;
  const najpierwSiec = request.mode === 'navigate' || NAJPIERW_SIEC.test(sciezka);

  event.respondWith(
    (async () => {
      if (najpierwSiec) {
        // Świeży kod ma pierwszeństwo. Bez sieci — sięgamy do cache.
        try {
          const res = await fetch(request);
          if (res && res.ok) (await caches.open(VERSION)).put(request, res.clone());
          return res;
        } catch (err) {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          if (request.mode === 'navigate') {
            const shell = await caches.match('index.html');
            if (shell) return shell;
          }
          throw err;
        }
      }

      // Fonty, ikony, obrazki — z cache od ręki, odświeżane w tle.
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) {
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
