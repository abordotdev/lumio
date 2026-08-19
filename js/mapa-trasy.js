// mapa-trasy.js - mapa postepu "Kolej": pionowa linia + karty stacji + ludzik na linii.
// Czysty ES module, zero zaleznosci. Rysuje jeden <svg> do podanego kontenera.
//
//   import { createTrasaMap } from './mapa-trasy.js';
//   const mapa = createTrasaMap(document.querySelector('#mapa'), { stations, me, friend, onStation });
//   mapa.update({ me: { name: 'Lusia', km: 180 } });   // po zaliczonej lekcji - ludzik plynnie jedzie
//
// Wspolrzedne: os Y rosnie w dol, stacja i = top + i * step. Kilometry NIE sa skala osi -
// odstepy miedzy stacjami sa rowne, a pozycja ludzika jest interpolowana po km wewnatrz odcinka.
//
// Odstepstwo od dokumentu: domyslny ludzik nie jest importowany, bo Lumio zawsze podaje
// wlasnego przez opcje `renderAvatar`. Z ludzik.js zostaje tylko nameChip.

import { icon } from './ikony.js';
import { nameChip } from './ludzik.js';

/** Stale ukladu - jedyne miejsce, w ktorym zmieniasz proporcje mapy. */
export const LAYOUT = {
  maxWidth: 760,        // szerzej mapa juz nie rosnie (karty robia sie nieczytelne)
  wideFrom: 520,        // powyzej tej szerokosci kontenera wchodzi uklad "wide"
  narrow: { step: 84, lineX: 74, cardMax: 560 },
  wide:   { step: 92, lineX: 96, cardMax: 560 },
  top: 56,              // odstep od gory do pierwszej stacji
  bottom: 80,           // zapas pod ostatnia stacja
  cardH: { city: 70, stop: 58 },
  dotR:  { city: 15, stop: 9 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * @param {HTMLElement} host  pusty kontener (mapa nadpisuje jego innerHTML)
 * @param {object} opts
 * @param {Array<{n:string, km:number, t:'city'|'stop', i?:string}>} opts.stations posortowane rosnaco po km
 * @param {{name:string, km:number}} opts.me
 * @param {{name:string, km:number}|null} [opts.friend]
 * @param {(station, state:'done'|'next'|'locked') => void} [opts.onStation]
 * @param {(who:'me'|'friend', size:number) => string} opts.renderAvatar Twoj ludzik; (0,0) = stopy
 * @param {boolean} [opts.header=true]  pasek z postepem nad mapa
 * @param {boolean} [opts.legend=true]  legenda kolorow
 */
export function createTrasaMap(host, opts) {
  const state = {
    stations: [...opts.stations].sort((a, b) => a.km - b.km),
    me: { ...opts.me },
    friend: opts.friend ? { ...opts.friend } : null,
  };
  const drawAvatar = opts.renderAvatar;
  const showHead = opts.header !== false;
  const showLegend = opts.legend !== false;

  host.classList.add('trasa');
  host.innerHTML =
    (showHead ? '<div class="trasa-head"></div>' : '') +
    (showLegend ? '<div class="trasa-legend"></div>' : '') +
    '<div class="trasa-map"></div>';
  const elHead = host.querySelector('.trasa-head');
  const elLegend = host.querySelector('.trasa-legend');
  const elMap = host.querySelector('.trasa-map');

  // ---------- model ----------
  const total = () => state.stations[state.stations.length - 1].km;
  const nextStation = () => state.stations.find((s) => s.km > state.me.km) || state.stations[state.stations.length - 1];
  const stateOf = (km) => (km <= state.me.km ? 'done' : km === nextStation().km ? 'next' : 'locked');

  /** gdzie na liscie stacji lezy dany kilometr: indeks odcinka + ulamek 0..1 */
  function posOnList(km) {
    const S = state.stations;
    for (let i = 0; i < S.length - 1; i++) {
      if (km >= S[i].km && km <= S[i + 1].km) return { idx: i, frac: (km - S[i].km) / (S[i + 1].km - S[i].km) };
    }
    return km < S[0].km ? { idx: 0, frac: 0 } : { idx: S.length - 2, frac: 1 };
  }

  /** publiczne podsumowanie postepu - przyda sie, gdy robisz wlasny naglowek */
  function progress() {
    const nx = nextStation();
    return {
      pct: Math.round((state.me.km / total()) * 100),
      left: Math.max(0, nx.km - state.me.km),
      next: nx,
      doneCount: state.stations.filter((s) => s.km <= state.me.km).length,
      total: total(),
    };
  }

  // ---------- geometria ----------
  let geo = null;
  function measure() {
    const W = clamp(host.clientWidth || 390, 300, LAYOUT.maxWidth);
    const L = W > LAYOUT.wideFrom ? LAYOUT.wide : LAYOUT.narrow;
    const pts = state.stations.map((_, i) => ({ x: L.lineX, y: LAYOUT.top + i * L.step }));
    const H = LAYOUT.top + (state.stations.length - 1) * L.step + LAYOUT.bottom;
    // Na waskim ekranie karta nie miesci dopisku "miasto" - miasto i tak poznasz
    // po wiekszej kropce i po landmarku.
    geo = { W, H, L, pts, wide: W > LAYOUT.wideFrom };
    return geo;
  }
  const yAtKm = (km) => {
    const p = posOnList(km);
    return geo.pts[p.idx].y + (geo.pts[p.idx + 1].y - geo.pts[p.idx].y) * p.frac;
  };

  // ---------- render ----------
  function renderHead() {
    if (!elHead) return;
    const p = progress();
    elHead.innerHTML = `
      <div class="trasa-row">
        <svg class="trasa-ava" width="44" height="44" viewBox="-22 -44 44 44" aria-hidden="true">${drawAvatar('me', 42)}</svg>
        <div class="trasa-grow">
          <div class="trasa-who">${esc(state.me.name)}</div>
          <div class="trasa-sub">${state.me.km} km z ${p.total} km &middot; ${p.doneCount} przystanków za Tobą</div>
        </div>
        <div class="trasa-pct">${p.pct}%</div>
      </div>
      <div class="trasa-row trasa-row--bar"><div class="trasa-track"><div class="trasa-fill" style="width:${p.pct}%"></div></div></div>
      <div class="trasa-goal">Zostało <b>${p.left} km</b> — następny przystanek <b>${esc(p.next.n)}</b></div>`;
  }

  function renderLegend() {
    if (!elLegend) return;
    elLegend.innerHTML = `
      <span><i class="trasa-dot trasa-dot--done"></i>zaliczone</span>
      <span><i class="trasa-dot trasa-dot--next"></i>teraz</span>
      <span><i class="trasa-dot trasa-dot--locked"></i>zamknięte</span>
      ${state.friend ? `<span><i class="trasa-dot trasa-dot--friend"></i>${esc(state.friend.name)}</span>` : ''}`;
  }

  function stationSvg(s, i) {
    const { x, y } = geo.pts[i];
    const st = stateOf(s.km);
    const city = s.t === 'city';
    const r = city ? LAYOUT.dotR.city : LAYOUT.dotR.stop;
    const cardX = x + 40;
    const cardW = Math.min(geo.W - cardX - 16, geo.L.cardMax);
    const cardH = city ? LAYOUT.cardH.city : LAYOUT.cardH.stop;
    // Odstepstwo od dokumentu, sprawdzone przy 360 px: pigulka "TERAZ" siedziala
    // w linii nazwy i przy dluzszym miescie ("Amsterdam") na nia wchodzila.
    // Pigulka schodzi wiec do drugiej linii, gdzie stoi krotkie "60 km",
    // a nazwa dostaje cala szerokosc karty. Male odznaki zostaja na srodku.
    const textX = cardX + 58;
    const nameW = cardX + cardW - 20 - textX;
    const metaW = (st === 'next' ? cardX + cardW - 78 : cardX + cardW - 46) - textX;

    const badge =
      st === 'done'
        ? `<g transform="translate(${cardX + cardW - 28} ${y})"><circle r="11" class="trasa-badge-bg"/>
             <path d="M-4 0 L-1 3.2 L4.4 -3.4" class="trasa-check" fill="none" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></g>`
        : st === 'next'
        ? `<g transform="translate(${cardX + cardW - 46} ${y + 12})"><rect x="-26" y="-12" width="52" height="24" rx="12" class="trasa-now-pill"/>
             <text class="trasa-t-chip" x="0" y="4" text-anchor="middle">TERAZ</text></g>`
        : `<g transform="translate(${cardX + cardW - 28} ${y})" class="trasa-lock"><rect x="-7" y="-4" width="14" height="11" rx="2.5"/>
             <path d="M-4 -4 v-3 a4 4 0 0 1 8 0 v3" fill="none" stroke-width="2"/></g>`;

    return `<g class="trasa-station trasa-station--${st}" data-i="${i}" tabindex="0" role="listitem"
              aria-label="${esc(s.n)}, ${s.km} kilometr, ${st === 'done' ? 'zaliczone' : st === 'next' ? 'następna stacja' : 'zamknięte'}">
      <rect class="trasa-card" x="${cardX}" y="${y - cardH / 2}" width="${cardW}" height="${cardH}" rx="16"/>
      <g class="trasa-icon">${icon(city ? s.i : 'domek', cardX + 30, y + cardH / 2 - 13, city ? 42 : 32)}</g>
      <clipPath id="trasa-nazwa-${i}"><rect x="${textX}" y="${y - cardH / 2}" width="${Math.max(20, nameW)}" height="${cardH / 2 + 5}"/></clipPath>
      <clipPath id="trasa-meta-${i}"><rect x="${textX}" y="${y + 5}" width="${Math.max(20, metaW)}" height="${cardH / 2 - 5}"/></clipPath>
      <text class="trasa-name ${city ? 'is-city' : ''}" clip-path="url(#trasa-nazwa-${i})" x="${textX}" y="${y - 1}">${esc(s.n)}</text>
      <text class="trasa-meta" clip-path="url(#trasa-meta-${i})" x="${textX}" y="${y + 16}">${s.km} km${city && geo.wide ? ' &middot; miasto' : ''}</text>
      ${badge}
      <circle class="trasa-dot-halo" cx="${x}" cy="${y}" r="${r + 5}"/>
      <circle class="trasa-dot-mark" cx="${x}" cy="${y}" r="${r}" stroke-width="3.5"/>
      ${city && st !== 'locked' ? `<circle class="trasa-dot-core" cx="${x}" cy="${y}" r="5"/>` : ''}
      <rect class="trasa-hit" x="${x - 24}" y="${y - cardH / 2}" width="${cardX + cardW - x + 24}" height="${cardH}"/>
    </g>`;
  }

  function render() {
    measure();
    renderHead();
    renderLegend();

    const { W, H, L } = geo;
    const y0 = LAYOUT.top;
    const y1 = H - 60;
    const meY = yAtKm(state.me.km);

    const friendMark = state.friend
      ? `<g class="trasa-friend" transform="translate(${L.lineX} ${yAtKm(state.friend.km)})">
           <circle r="17" class="trasa-marker-halo"/><circle r="15" class="trasa-marker-ring"/>
           <g transform="translate(0 12)">${drawAvatar('friend', 44)}</g>
           ${nameChip(0, 34, esc(state.friend.name), 'var(--trasa-friend)', 10)}
         </g>`
      : '';

    elMap.innerHTML = `<svg class="trasa-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="list">
      <line class="trasa-rail"      x1="${L.lineX}" y1="${y0}" x2="${L.lineX}" y2="${y1}" stroke-width="9" stroke-linecap="round"/>
      <line class="trasa-rail-dash" x1="${L.lineX}" y1="${y0}" x2="${L.lineX}" y2="${y1}" stroke-width="3" stroke-dasharray="6 10" stroke-linecap="round"/>
      <line class="trasa-rail-done" x1="${L.lineX}" y1="${y0}" x2="${L.lineX}" y2="${meY}" stroke-width="9" stroke-linecap="round"/>
      ${state.stations.map(stationSvg).join('')}
      ${friendMark}
      <g class="trasa-me" transform="translate(${L.lineX} ${meY})">
        <circle r="26" class="trasa-pulse"/>
        <circle r="20" class="trasa-marker-halo"/><circle r="18" class="trasa-marker-ring is-me"/>
        <g class="trasa-bob"><g transform="translate(0 14)">${drawAvatar('me', 54)}</g>
        ${nameChip(0, 40, esc(state.me.name), 'var(--trasa-done)', 10)}</g>
      </g>
    </svg>`;

    elMap.querySelectorAll('.trasa-station').forEach((g) => {
      const s = state.stations[+g.dataset.i];
      const fire = () => opts.onStation && opts.onStation(s, stateOf(s.km));
      g.addEventListener('click', fire);
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fire(); }
      });
    });
  }

  // ---------- animacja przejazdu ----------
  let raf = 0;
  function rideTo(km, ms = 700) {
    if (!elMap.querySelector('.trasa-rail-done')) { state.me.km = km; render(); return; }
    const from = state.me.km;
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const tick = (t) => {
      // Elementy szukamy w kazdej klatce, a nie raz na starcie. Przy zmianie rozmiaru
      // render() wymienia caly <svg>, a przejazd pisalby wtedy do wezla juz odpietego
      // od dokumentu - animacji nie bylo widac, zostawal sam skok na koncu.
      const rail = elMap.querySelector('.trasa-rail-done');
      const me = elMap.querySelector('.trasa-me');
      if (!rail || !me) { state.me.km = km; render(); return; }
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);            // easeOutCubic
      const km2 = from + (km - from) * e;
      const y = yAtKm(km2);
      rail.setAttribute('y2', y);
      me.setAttribute('transform', `translate(${geo.L.lineX} ${y})`);
      if (k < 1) { raf = requestAnimationFrame(tick); }
      else { state.me.km = km; render(); }         // dojechal - przelicz stany stacji
    };
    raf = requestAnimationFrame(tick);
  }

  // ---------- API ----------
  function update(next = {}, { animate = true } = {}) {
    if (next.stations) state.stations = [...next.stations].sort((a, b) => a.km - b.km);
    if (next.friend !== undefined) state.friend = next.friend ? { ...next.friend } : null;
    const newKm = next.me ? next.me.km : state.me.km;
    if (next.me) state.me.name = next.me.name ?? state.me.name;
    if (animate && !next.stations && newKm !== state.me.km) rideTo(newKm);
    else { state.me.km = newKm; render(); }
  }

  function scrollToCurrent(behavior = 'smooth') {
    const el = elMap.querySelector('.trasa-station--next') || elMap.querySelector('.trasa-me');
    el?.scrollIntoView({ behavior, block: 'center' });
  }

  // Pierwsze wywolanie ResizeObserver leci od razu po observe(), a mape wlasnie
  // narysowalismy. Pomijamy je - inaczej kazde otwarcie mapy rysuje ja dwa razy.
  let pierwszyPomiar = true;
  const ro = new ResizeObserver(() => {
    if (pierwszyPomiar) { pierwszyPomiar = false; return; }
    render();
  });
  render();
  ro.observe(host);

  return {
    update,
    progress,
    scrollToCurrent,
    destroy() { ro.disconnect(); cancelAnimationFrame(raf); host.innerHTML = ''; },
  };
}
