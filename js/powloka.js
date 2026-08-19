// powloka.js - wspolna oprawa wszystkich ekranow: pasek boczny, gorny, kolumna tresci,
// ludzik w prawym dolnym rogu i dolny pasek na telefonie.
//
// Powloka powstaje raz i zyje przez cala sesje. Ekrany podmieniaja tylko zawartosc
// kolumny (#tresc) - dzieki temu ludzik nie skacze przy kazdej zmianie zakladki.
//
//   import { montujPowloke, odswiezPowloke } from './powloka.js';
//   montujPowloke(document.getElementById('app'), dane, handlery);

import { icon, ensureSprite } from './ikony-ui.js';

export const LUDZIK_VIEWBOX = '0 0 100 146';

export const NAV = [
  { id: 'home', label: 'Start', ic: 'i-home' },
  { id: 'modules', label: 'Moduły', ic: 'i-grid' },
  { id: 'map', label: 'Mapa', ic: 'i-map' },
  { id: 'wardrobe', label: 'Szafa', ic: 'i-shirt' },
  { id: 'shop', label: 'Sklep', ic: 'i-bag' },
  { id: 'settings', label: 'Ustawienia', ic: 'i-gear', tylkoDesktop: true },
];

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

let el = null;
let handlery = {};

function navHtml(dane, mobile) {
  return NAV.filter((n) => !(mobile && n.tylkoDesktop))
    .map((n) => {
      const on = n.id === dane.ekran ? ' class="on"' : '';
      const bdg = !mobile && n.id === 'map' ? `<span class="bdg">${dane.km} km</span>` : '';
      return `<a href="#" data-nav="${n.id}"${on}>${icon(n.ic, mobile ? 22 : 20, 'ic')}<span>${esc(n.label)}</span>${bdg}</a>`;
    })
    .join('');
}

/** Buduje oprawe w podanym kontenerze. Wolane raz przy starcie aplikacji. */
export function montujPowloke(host, dane, h = {}) {
  ensureSprite();
  handlery = h;

  host.innerHTML = `<div class="app">
    <aside class="side">
      <button class="brand" type="button" data-nav="home">
        <span class="mark">${icon('i-spark', 21)}</span>
        <span><span class="name">Lumio</span><span class="tag">PROTOTYP</span></span>
      </button>
      <div class="usr">
        <span class="av"><svg width="34" height="34" viewBox="18 6 64 64" aria-hidden="true"></svg></span>
        <span><span class="nm"></span><span class="lv"></span></span>
      </div>
      <nav class="nav" aria-label="Menu"></nav>
      <p class="side-stopka">Małe kroki.<b>Wielkie postępy.</b></p>
    </aside>

    <div class="scena">
      <header class="pasek">
        <button class="marka-mobi" type="button" data-nav="home" aria-label="Lumio — Start">
          <span class="mark">${icon('i-spark', 18)}</span><b class="name">Lumio</b>
        </button>
        <span class="rosnij"></span>
        <span class="chip"><span class="cic">${icon('i-route', 17)}</span><b class="km"></b><span class="un">km</span></span>
        <span class="chip coin"><span class="cic">${icon('i-coin', 17)}</span><b class="monety"></b><span class="un">monet</span></span>
        <button class="icon-btn ust" type="button" data-nav="settings" aria-label="Ustawienia">${icon('i-gear', 19)}</button>
        <button class="icon-btn" type="button" data-akcja="dzwonek" aria-label="Co wymaga uwagi">${icon('i-bell', 19)}<i class="kropka" hidden></i></button>
      </header>
      <div class="kolumna" id="tresc"></div>
    </div>

    <div class="ludzik-rog">
      <div class="bubble" hidden></div>
      <svg width="118" height="172" viewBox="${LUDZIK_VIEWBOX}" role="img" aria-label="Twój ludzik"></svg>
    </div>

    <nav class="tabbar" aria-label="Menu"></nav>
  </div>`;

  el = {
    app: host.querySelector('.app'),
    nav: host.querySelector('.nav'),
    tabbar: host.querySelector('.tabbar'),
    av: host.querySelector('.usr .av svg'),
    nm: host.querySelector('.usr .nm'),
    lv: host.querySelector('.usr .lv'),
    km: host.querySelector('.pasek .km'),
    monety: host.querySelector('.pasek .monety'),
    kropka: host.querySelector('.kropka'),
    ludzik: host.querySelector('.ludzik-rog svg'),
    bubble: host.querySelector('.ludzik-rog .bubble'),
    tresc: host.querySelector('#tresc'),
  };

  host.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      e.preventDefault();
      return handlery.onNav?.(nav.dataset.nav);
    }
    const akcja = e.target.closest('[data-akcja]');
    if (!akcja) return;
    e.preventDefault();
    if (akcja.dataset.akcja === 'dzwonek') return handlery.onDzwonek?.();
  });

  odswiezPowloke(dane);
  return el.tresc;
}

/** Aktualizuje same dane w oprawie. Tresc kolumny zostaje nietknieta. */
export function odswiezPowloke(dane) {
  if (!el) return;
  el.nav.innerHTML = navHtml(dane, false);
  el.tabbar.innerHTML = navHtml(dane, true);
  el.nm.textContent = dane.imie;
  el.lv.textContent = dane.podpis;
  el.km.textContent = dane.km;
  el.monety.textContent = dane.monety;
  el.kropka.hidden = !dane.uwaga;
  el.tresc.classList.toggle('waska', Boolean(dane.waska));

  const rysunek = handlery.maskotka ? handlery.maskotka() : '';
  el.av.innerHTML = rysunek;
  el.ludzik.innerHTML = rysunek;

  el.bubble.hidden = !dane.dymek;
  if (dane.dymek) el.bubble.textContent = dane.dymek;
}

export function gniazdoTresci() {
  return el?.tresc || null;
}
