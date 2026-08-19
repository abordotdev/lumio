// ekran-start.js - zawartosc kolumny na ekranie startowym.
// Oprawa (pasek boczny, gorny, ludzik w rogu) siedzi w powloka.js i zyje niezaleznie.

import { icon } from './ikony-ui.js';

const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]
  );

/**
 * @param {object} d dane ekranu
 * @param {object} h handlery: onLekcja, onPowtorka, onZmienLekcje, onPas, onWybor(id)
 * @returns {DocumentFragment}
 */
export function trescStartu(d, h = {}) {
  const t = document.createElement('template');
  t.innerHTML = `
    ${
      d.pas
        ? `<div class="pas">
             <span class="rosnij">${esc(d.pas.tekst)}</span>
             <button type="button" data-akcja="pas">${esc(d.pas.przycisk)}</button>
           </div>`
        : ''
    }

    <div class="naglowek">
      <div class="rosnij">
        <span class="oczko">${esc(d.oczko)}</span>
        <h1>Cześć, ${esc(d.imie)}!</h1>
        <p>${d.podtytul}</p>
      </div>
      <button class="btn btn-akcent" type="button" data-akcja="zmien">
        ${icon('i-swap', 16)} Zmień lekcję
      </button>
    </div>

    <section class="hero">
      <div class="tresc-hero">
        <span class="oczko">${icon('i-spark', 12)} ${esc(d.naglowekLekcji)}</span>
        <h2>${esc(d.lekcja.tytul)}</h2>
        <p class="desc">${esc(d.lekcja.opis)}</p>
        <div class="prog">
          <div class="track"><div class="fill" style="width:${d.lekcja.postep}%"></div></div>
          <span class="pc">${d.lekcja.postep}% modułu</span>
        </div>
        <div class="btns">
          <button class="btn btn-p" type="button" data-akcja="lekcja">
            ${icon('i-play', 15)} ${esc(d.lekcja.przycisk)}
          </button>
          ${
            d.lekcja.doPowtorki
              ? `<button class="btn btn-g" type="button" data-akcja="powtorka">
                   ${icon('i-refresh', 16)} Powtórka (${d.lekcja.doPowtorki})
                 </button>`
              : ''
          }
        </div>
      </div>
    </section>

    <div class="liczby">
      ${d.liczby
        .map(
          (l, i) => `<div class="liczba ${['', 'b', 'c'][i] || ''}">
            <span class="tic">${icon(l.ikona, 21)}</span>
            <span><b>${esc(l.wartosc)}</b><span>${esc(l.opis)}</span></span>
          </div>`
        )
        .join('')}
    </div>

    <div class="naglowek">
      <div class="rosnij">
        <span class="oczko">Na dobry początek</span>
        <h2>Co dzisiaj robimy?</h2>
      </div>
    </div>

    <div class="wybory">
      ${d.wybory
        .map(
          (
            w,
            i
          ) => `<button class="wybor ${i % 2 ? 'cieply' : ''}" type="button" data-wybor="${esc(w.id)}">
            <span class="oczko">${esc(w.oczko)}</span>
            <h3>${esc(w.tytul)}</h3>
            <p>${esc(w.opis)}</p>
            <span class="strzalka">→</span>
          </button>`
        )
        .join('')}
    </div>`;

  const frag = t.content;
  frag.addEventListener?.('click', () => {});

  // Klikniecia podpinamy do konkretnych wezlow - fragment nie lapie zdarzen po wstawieniu.
  const podepnij = (sel, fn) =>
    frag.querySelectorAll(sel).forEach((b) => b.addEventListener('click', fn));
  podepnij('[data-akcja="lekcja"]', () => h.onLekcja?.());
  podepnij('[data-akcja="powtorka"]', () => h.onPowtorka?.());
  podepnij('[data-akcja="zmien"]', () => h.onZmienLekcje?.());
  podepnij('[data-akcja="pas"]', () => h.onPas?.());
  frag
    .querySelectorAll('[data-wybor]')
    .forEach((b) => b.addEventListener('click', () => h.onWybor?.(b.dataset.wybor)));

  return frag;
}
