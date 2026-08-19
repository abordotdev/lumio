// ikony-ui.js - sprite ikon interfejsu (SVG w kodzie). Wstrzykiwany raz, ikonki uzywane przez <use href="#id">.
// Dodajesz ikone? Dorzuc <g id="i-nazwa"> w SPRITE i uzyj icon('i-nazwa').
//
// Nazwa pliku rozni sie od dokumentu (tam: ikony.js), bo js/ikony.js trzyma juz
// landmarki miast dla mapy trasy. To sa dwa rozne zestawy i nie moga byc w jednym pliku.

const SPRITE = `<svg style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
<g id="i-home"><path d="M3 10.4 12 3l9 7.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 9.4V20h13V9.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.6 20v-5.2h4.8V20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></g>
<g id="i-grid"><rect x="3.2" y="3.2" width="7.4" height="7.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="13.4" y="3.2" width="7.4" height="7.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="3.2" y="13.4" width="7.4" height="7.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/><rect x="13.4" y="13.4" width="7.4" height="7.4" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.9"/></g>
<g id="i-map"><path d="M4 6.6 9 4.4l6 2.4 5-2.2v13l-5 2.2-6-2.4-5 2.2z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M9 4.4v13.4M15 6.8v13.2" fill="none" stroke="currentColor" stroke-width="1.9"/></g>
<g id="i-shirt"><path d="M8.6 3.4 5 5.2 3.4 9l2.8 1.3V20.6h11.6V10.3L20.6 9 19 5.2l-3.6-1.8a3.5 3.5 0 0 1-6.8 0Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></g>
<g id="i-bag"><path d="M5 8.4h14l-1.1 11a1.6 1.6 0 0 1-1.6 1.4H7.7a1.6 1.6 0 0 1-1.6-1.4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M8.8 8.4V6.6a3.2 3.2 0 0 1 6.4 0v1.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></g>
<g id="i-gear"><path d="M19.14 12.94c.04-.31.06-.62.06-.94s-.02-.63-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.49.49 0 0 0 .12.61l2.03 1.58c-.05.31-.07.63-.07.94s.02.63.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.05.7 1.62.94l.36 2.54c.05.24.25.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z" fill="currentColor"/></g>
<g id="i-route"><circle cx="6.2" cy="5.8" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><circle cx="17.8" cy="18.2" r="2.6" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M6.2 8.6v3.2a3.4 3.4 0 0 0 3.4 3.4h4.8a3.4 3.4 0 0 1 3.4 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></g>
<g id="i-coin"><circle cx="12" cy="12" r="8.4" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7.6v8.8M9.9 9.6h3.2a1.9 1.9 0 0 1 0 3.8h-2.6a1.9 1.9 0 0 0 0 3.8h3.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></g>
<g id="i-book"><path d="M4 4.6h5.2A2.8 2.8 0 0 1 12 7.4v12a2.4 2.4 0 0 0-2.4-2.2H4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M20 4.6h-5.2A2.8 2.8 0 0 0 12 7.4v12a2.4 2.4 0 0 1 2.4-2.2H20Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></g>
<g id="i-flame"><path d="M12 21c3.6 0 6.2-2.4 6.2-5.7 0-4.2-4-5.4-3.2-9.9-2.6.7-4.2 2.9-4.2 5 0 1.6.7 2.3.7 3.2 0 .9-.7 1.6-1.6 1.6-1 0-1.7-.8-1.7-2.1-1.5 1.3-2.4 3-2.4 4.8C5.8 18.7 8.4 21 12 21Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></g>
<g id="i-play"><path d="M8 5.6 19 12 8 18.4Z" fill="currentColor"/></g>
<g id="i-refresh"><path d="M20 12a8 8 0 1 1-2.6-5.9" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M20 3.6V8h-4.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></g>
<g id="i-swap"><path d="M4 8.4h13M13.6 4.8 17.4 8.4l-3.8 3.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 15.6H7M10.4 12 6.6 15.6l3.8 3.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></g>
<g id="i-bell"><path d="M6.4 10.4a5.6 5.6 0 0 1 11.2 0c0 4 1.4 5.4 1.4 5.4H5s1.4-1.4 1.4-5.4Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><path d="M10.2 18.8a2 2 0 0 0 3.6 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></g>
<g id="i-spark"><path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9Z" fill="currentColor"/></g>
</defs></svg>`;

/** Wstrzykuje sprite do <body> (idempotentnie). Wolane automatycznie przez icon(). */
export function ensureSprite() {
  if (document.getElementById('lumio-sprite')) return;
  const d = document.createElement('div');
  d.id = 'lumio-sprite';
  d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = SPRITE;
  document.body.appendChild(d);
}

/** @param {string} id np. 'i-home'  @param {number} size px */
export function icon(id, size = 20, cls = '') {
  ensureSprite();
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${id}"/></svg>`;
}
