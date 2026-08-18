// Mały serwer plików, tylko do lokalnego odpalania Lumio.
// Uruchom:  node serve.js      → http://localhost:4173
// Bez npm install, bez żadnych zależności.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400).end('Zły adres');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  if (pathname === '/api/translate') {
    translatePl(req, res);
    return;
  }

  const target = path.join(ROOT, pathname);
  if (!target.startsWith(ROOT)) {
    res.writeHead(403).end('Nie tędy');
    return;
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Nie ma takiego pliku: ${pathname}`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Lumio działa na http://localhost:${PORT}`);
  console.log('Zatrzymanie: Ctrl+C');
});

async function translatePl(req, res) {
  const json = (code, body) => {
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(JSON.stringify(body));
  };
  try {
    const q = new URL(req.url, 'http://localhost').searchParams.get('q') || '';
    const text = q.trim();
    if (!text) return json(400, { error: 'puste' });
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(text) +
      '&langpair=pl|en';
    const r = await fetch(url);
    const data = await r.json();
    const en = String(data?.responseData?.translatedText || '').trim();
    if (!en) return json(502, { error: 'puste tłumaczenie' });
    return json(200, { en });
  } catch {
    return json(502, { error: 'tłumacz padł' });
  }
}
