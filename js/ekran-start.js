// ekran-start.js - ekran startowy Lumio. Czysty ES module, zero zaleznosci.
//
//   import { renderStart } from './ekran-start.js';
//   const start = renderStart(document.querySelector('#app'), DANE, {
//     onLekcja(){}, onPowtorka(){}, onZmienLekcje(){}, onNav(id){}, maskotka(){}
//   });
//   start.update({ me: { km: 180 } });
//
// Cala tresc ekranu przychodzi w obiekcie danych - komponent nic sam nie liczy
// poza procentem modulu i tekstem "zostalo X km".
//
// Dwa odstepstwa od dokumentu:
//  - ikony z ./ikony-ui.js, bo js/ikony.js trzyma juz landmarki mapy;
//  - maskotka nie jest importowana, tylko podawana w opcji `maskotka()`. Lumio ma
//    wlasnego ludzika z ubraniami i to on ma stac na podlodze, nie postac z dokumentu.
//    Kontrakt zostaje ten sam: viewBox "0 0 100 146", stopy na y=146.

import { icon, ensureSprite } from './ikony-ui.js';

export const LUDZIK_VIEWBOX = '0 0 100 146';

/** Pozycje w nawigacji. Kolejnosc = kolejnosc na ekranie i w dolnym pasku. */
export const NAV = [
  { id: 'start', label: 'Start', ic: 'i-home' },
  { id: 'moduly', label: 'Moduły', ic: 'i-grid' },
  { id: 'mapa', label: 'Mapa', ic: 'i-map' },
  { id: 'szafa', label: 'Szafa', ic: 'i-shirt' },
  { id: 'sklep', label: 'Sklep', ic: 'i-bag' },
  { id: 'ustawienia', label: 'Ustawienia', ic: 'i-gear', tylkoDesktop: true },
];

const esc = (v) =>
  String(v).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

/**
 * @param {HTMLElement} host kontener (zostanie nadpisany)
 * @param {object} d dane ekranu
 * @param {object} [h] handlery: onLekcja, onPowtorka, onZmienLekcje, onNav(id), onDzwonek, maskotka()
 */
export function renderStart(host, d, h = {}) {
  ensureSprite();
  const state = structuredClone(d);
  const maskotka = h.maskotka || (() => '');

  function navHtml(mobile) {
    return NAV.filter((n) => !(mobile && n.tylkoDesktop))
      .map((n) => {
        const on = n.id === state.aktywnaZakladka ? ' class="on"' : '';
        const bdg = !mobile && n.badge ? `<span class="bdg">${esc(n.badge)}</span>` : '';
        return `<a href="#" data-nav="${n.id}"${on}>${icon(n.ic, mobile ? 22 : 20, 'ic')}${esc(n.label)}${bdg}</a>`;
      })
      .join('');
  }

  function html() {
    const { me, lekcja, kafle } = state;
    NAV.find((n) => n.id === 'mapa').badge = `${me.km} km`;

    return `<div class="app">
      <aside class="side">
        <div class="brand">
          <div class="mark">${icon('i-spark', 21)}</div>
          <div><div class="name">Lumio</div><div class="tag">PROTOTYP</div></div>
        </div>

        <div class="usr">
          <div class="av"><svg width="36" height="36" viewBox="18 6 64 64" aria-hidden="true">${maskotka()}</svg></div>
          <div><div class="nm">${esc(me.imie)}</div><div class="lv">${esc(me.poziom)}</div></div>
        </div>

        <nav class="nav">${navHtml(false)}</nav>
      </aside>

      <main class="main">
        <div class="topbar">
          <div class="chip"><span class="cic">${icon('i-route', 17)}</span><span class="val">${me.km}</span><span class="un">km</span></div>
          <div class="chip coin"><span class="cic">${icon('i-coin', 17)}</span><span class="val">${me.monety}</span><span class="un">monet</span></div>
          <button class="icon-btn" data-akcja="powiadomienia" aria-label="Co wymaga uwagi">${icon('i-bell', 19)}</button>
        </div>

        <h1 class="hello">Cześć, ${esc(me.imie)}!</h1>
        <p class="sub">${state.podtytul}</p>

        <section class="hero">
          <div class="blobs"><i class="b1"></i><i class="b2"></i></div>
          <div class="inner">
            <span class="eyebrow">${icon('i-spark', 12)} ${esc(state.naglowekLekcji || 'DZISIEJSZA LEKCJA')}</span>
            <h2>${esc(lekcja.tytul)}</h2>
            <p class="desc">${esc(lekcja.opis)}</p>
            <div class="prog">
              <div class="track"><div class="fill" style="width:${lekcja.postepModulu}%"></div></div>
              <span class="pc">${lekcja.postepModulu}% modułu</span>
            </div>
            <div class="btns">
              <a class="btn btn-p" href="#" data-akcja="lekcja">${icon('i-play', 15)} ${esc(lekcja.przyciskStart || 'Zaczynamy')}</a>
              ${
                lekcja.doPowtorki
                  ? `<a class="btn btn-g" href="#" data-akcja="powtorka">${icon('i-refresh', 16)} Powtórka (${lekcja.doPowtorki})</a>`
                  : ''
              }
              <a class="btn btn-t" href="#" data-akcja="zmien">${icon('i-swap', 16)} Zmień lekcję</a>
            </div>
          </div>
        </section>

        <div class="tiles">
          <div class="tile les">
            <span class="tic">${icon('i-book', 23)}</span>
            <div>
              <div class="lab">Lekcje</div>
              <div class="val">${kafle.lekcjeZrobione}<small>ukończonych</small></div>
              <div class="note">${esc(kafle.lekcjeNota)}</div>
            </div>
          </div>
          ${drugiKafel(kafle)}
        </div>

        <div class="footzone">
          <div class="mascot">
            ${state.dymek ? `<div class="bubble">${esc(state.dymek)}</div>` : ''}
            <svg width="132" height="193" viewBox="${LUDZIK_VIEWBOX}" role="img" aria-label="Twój ludzik">${maskotka()}</svg>
          </div>
        </div>
      </main>

      <nav class="tabbar">${navHtml(true)}</nav>
    </div>`;
  }

  // Drugi kafelek. Serie dni wlacza sie flaga w app.js - patrz SERIA_DNI.
  function drugiKafel(kafle) {
    if (kafle.seria === null || kafle.seria === undefined) {
      return `<div class="tile les">
            <span class="tic">${icon('i-spark', 23)}</span>
            <div>
              <div class="lab">${esc(kafle.drugiLab || 'Umiem')}</div>
              <div class="val">${kafle.drugiVal}<small>${esc(kafle.drugiJednostka || '')}</small></div>
              <div class="note">${esc(kafle.drugiNota || '')}</div>
            </div>
          </div>`;
    }
    return `<div class="tile streak">
            <span class="tic">${icon('i-flame', 23)}</span>
            <div>
              <div class="lab">Seria</div>
              <div class="val">${kafle.seria} dni<small>z rzędu</small></div>
              <div class="dots">${Array.from(
                { length: 7 },
                (_, i) => `<i class="${i < kafle.seria ? 'on' : ''}"></i>`
              ).join('')}</div>
            </div>
          </div>`;
  }

  function mount() {
    host.innerHTML = html();
    host.querySelectorAll('[data-nav]').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        h.onNav?.(a.dataset.nav);
      })
    );
    const on = (sel, fn) =>
      host.querySelector(`[data-akcja="${sel}"]`)?.addEventListener('click', (e) => {
        e.preventDefault();
        fn?.();
      });
    on('lekcja', h.onLekcja);
    on('powtorka', h.onPowtorka);
    on('zmien', h.onZmienLekcje);
    on('powiadomienia', h.onDzwonek);
  }

  mount();

  return {
    /** Podmien fragment danych i przerysuj. */
    update(patch) {
      Object.assign(state, structuredClone(patch));
      mount();
    },
    destroy() {
      host.innerHTML = '';
    },
  };
}
