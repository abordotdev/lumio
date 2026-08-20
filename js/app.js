// Ekrany: wybór głosu, mapa, podsumowanie lekcji, skrzynka, przystanki, sklep, szafa, ustawienia.
import { esc, h, mount, refreshCounters, plural, toast, applyPalette, markNav } from './ui.js';
import * as store from './store.js';
import * as speech from './speech.js';
import {
  renderAvatar,
  avatarOnLine,
  avatarNaPodlodze,
  renderItemIcon,
  renderOutfitIcon,
  withItem,
  HAIR_COLORS,
  EYE_COLORS,
  HAIR_STYLES,
} from './avatar.js';
import { startLesson } from './lesson.js';
import { LESSON_KM, nextStop, moduleOutline } from './scheduler.js';
import * as disk from './disk.js';
import { createTrasaMap } from './mapa-trasy.js';
import { trescStartu } from './ekran-start.js';
import { montujPowloke, odswiezPowloke } from './powloka.js';

// Zywa instancja mapy trasy oraz kilometr, na ktorym ostatnio stanela.
// Dzieki temu po powrocie z lekcji ludzik przejezdza roznice, zamiast pojawiac sie od razu.
let MAPA = null;
let MAPA_KM = null;

// Czy lista lekcji w otwartym module jest zwinięta. Trzymane w sesji, żeby raz
// zwinięta została zwinięta przy przełączaniu modułów.
let LESSONS_COLLAPSED = true;

let BASE_MODULES = [];
let MODULES = [];
let MODULE = null;
let ROUTE = null;
let SCREEN = 'home';
// Historia zakładek, żeby swipe w prawo na telefonie cofał do poprzedniej.
let HISTORIA = [];

// Instalacja jako aplikacja. Android/Chrome daje zdarzenie, które łapiemy i
// odpalamy z przycisku w Ustawieniach. iPhone tego nie ma — tam pokazujemy instrukcję.
let promptInstalacji = null;
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    promptInstalacji = e;
    if (SCREEN === 'settings') settings();
  });
  window.addEventListener('appinstalled', () => {
    promptInstalacji = null;
    if (SCREEN === 'settings') settings();
  });
}
const jabłko = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const jakoAplikacja = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;

function refreshModules() {
  MODULES = [...BASE_MODULES];
  const saved = store.get().moduleId;
  MODULE = MODULES.find((m) => m.id === saved) || MODULES[0] || null;
  if (MODULE) store.setModuleId(MODULE.id);
}

function navIsDrawer() {
  return window.matchMedia('(max-width: 64rem)').matches;
}

function setNavOpen(open) {
  const drawer = navIsDrawer();
  const show = drawer && open;
  document.body.classList.toggle('nav-open', show);
  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('nav-scrim');
  const nav = document.getElementById('sidenav');
  if (toggle) {
    toggle.setAttribute('aria-expanded', show ? 'true' : 'false');
    toggle.textContent = show ? 'Zamknij' : 'Menu';
  }
  if (scrim) scrim.hidden = !show;
  if (nav) {
    nav.toggleAttribute('inert', drawer && !show);
    nav.setAttribute('aria-hidden', drawer && !show ? 'true' : 'false');
  }
}

function bindChrome() {
  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    setNavOpen(!document.body.classList.contains('nav-open'));
  });
  document.getElementById('nav-scrim')?.addEventListener('click', () => setNavOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setNavOpen(false);
  });
  window.matchMedia('(max-width: 64rem)').addEventListener('change', () => setNavOpen(false));
}

export function boot({ modules, route }) {
  BASE_MODULES = modules || [];
  ROUTE = route;
  refreshModules();
  applyPalette(store.get().palette);
  montujPowloke(document.getElementById('app'), danePowloki(), {
    onNav: (id) => go(id),
    onOdswiez: odswiezApke,
    maskotka: () => avatarNaPodlodze(store.get().equipped, { look: store.get().look || {} }),
  });
  bindChrome();
  wlaczGestCofania();
  for (const btn of document.querySelectorAll('[data-go]')) {
    btn.addEventListener('click', () => go(btn.getAttribute('data-go')));
  }
  const brand = document.getElementById('btn-brand');
  if (brand) brand.addEventListener('click', () => go('home'));
  const state = store.get();
  refreshCounters(state);
  if (!state.voiceName) {
    const rec = speech.currentVoice() || speech.recommended();
    if (rec) {
      speech.setVoiceByName(rec.name);
      store.setVoice(rec.name);
    }
  }
  go('home');
  disk.writePairQuiet();
}

export function go(screen, params = {}) {
  if (MAPA) {
    MAPA.destroy();
    MAPA = null;
  }
  setNavOpen(false);
  speech.cancel();
  refreshCounters(store.get());
  // Wchodząc w Moduły z innej zakładki, lista lekcji startuje zwinięta — żeby nie
  // trzeba było scrollować. Przełączanie modułów w środku zostawia Twój wybór.
  if (screen === 'modules' && SCREEN !== 'modules') LESSONS_COLLAPSED = true;
  // Do historii wrzucamy tylko ruch „w przód", żeby swipe miał gdzie cofnąć.
  if (!params.back && SCREEN && SCREEN !== screen) {
    HISTORIA.push(SCREEN);
    if (HISTORIA.length > 20) HISTORIA.shift();
  }
  SCREEN = screen;
  markNav(screen);
  odswiezPowloke(danePowloki(screen));
  const screens = {
    onboarding,
    look,
    home,
    modules,
    map: fullMap,
    settings,
    shop,
    wardrobe,
    summary,
    arrival,
  };
  (screens[screen] || home)(params);
}

// Cofnięcie do poprzedniej zakładki (swipe w prawo na telefonie).
function cofnij() {
  if (!HISTORIA.length) return;
  const poprzednia = HISTORIA.pop();
  go(poprzednia, { back: true });
}

// Swipe w prawo = cofnij. Pomijamy lekcję (żeby nie przerwać jej gestem) oraz
// miejsca, które same łapią przeciąganie w poziomie: kafelki, mapę, pola tekstowe.
function wlaczGestCofania() {
  let start = null;
  const pomin = (t) => {
    // W trakcie lekcji nie cofamy gestem — od wyjścia jest „Przerwij lekcję".
    if (document.querySelector('.lekcja-krok')) return true;
    return Boolean(
      t &&
      t.closest &&
      t.closest('#mapa, .tile, .tile-bank, .tile-slot, textarea, input, select, svg')
    );
  };
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1 || pomin(e.target)) {
        start = null;
        return;
      }
      const t = e.touches[0];
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
    },
    { passive: true }
  );
  document.addEventListener(
    'touchend',
    (e) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dt = e.timeStamp - start.t;
      start = null;
      // Wyraźnie poziomy, w prawo, dość długi i szybki — i nie tuż przy krawędzi
      // menu na dole.
      if (dx > 80 && Math.abs(dx) > 2 * Math.abs(dy) && dt < 600) cofnij();
    },
    { passive: true }
  );
}

const itemById = (id) => (ROUTE.items || []).find((i) => i.id === id);
const stopById = (id) => (ROUTE.stops || []).find((s) => s.id === id);

const OUTFIT_SETS = [
  { name: 'Błękitny komplet', top: 'top-navy', bottom: 'bottom-navy' },
  { name: 'Różowy komplet', top: 'top-red', bottom: 'bottom-red' },
  { name: 'Komplet z Berlina', top: 'top-lilac', bottom: 'bottom-lilac' },
  { name: 'Czarny komplet', top: 'top-sun', bottom: 'bottom-sun' },
  { name: 'Sweter i jeansy', top: 'top-denim', bottom: 'bottom-jeans' },
  { name: 'Komplet w paski', top: 'top-mint', bottom: 'bottom-mint' },
  { name: 'Komplet w grochy', top: 'top-coral', bottom: 'bottom-coral' },
  { name: 'Płaszcz i krata', top: 'top-coat', bottom: 'bottom-skirt' },
];

// „Nie było Cię 3 miesiące" czyta się lepiej niż „nie było Cię 94 dni".
function przerwaLabel(dni) {
  if (dni >= 60) {
    const m = Math.round(dni / 30);
    return `${m} ${plural(m, 'miesiąc', 'miesiące', 'miesięcy')}`;
  }
  const t = Math.round(dni / 7);
  return `${t} ${plural(t, 'tydzień', 'tygodnie', 'tygodni')}`;
}

function runLesson({ review = false, comeback = false, ids = null, wszystkieModuly = false } = {}) {
  refreshModules();
  if (!MODULE) return toast('Wybierz moduł.');
  const back = SCREEN === 'modules' ? 'modules' : 'home';
  startLesson({
    module: MODULE,
    // Powtórka „ze wszystkich modułów" sięga do całości; powtórka w obrębie
    // modułu (np. Moje zdania) zostaje przy jego zdaniach.
    modules: wszystkieModuly ? MODULES : [MODULE],
    review,
    comeback,
    ids,
    onFinish: (res) => {
      disk.writePairQuiet();
      if (res.aborted) return go(back);
      go('summary', res);
    },
  });
}

function doll(equipped, size) {
  return renderAvatar(equipped, { size, look: store.get().look });
}

function dressHead(state, { label, title, hint }) {
  return h(`<div class="dress-head">
    <div>
      <span class="label">${esc(label)}</span>
      <h1>${esc(title)}</h1>
      <p class="muted">${esc(hint)}</p>
    </div>
    <div class="dress-doll" data-doll>${doll(state.equipped, 148)}</div>
  </div>`);
}

function paintDoll(root) {
  const box = root.querySelector('[data-doll]');
  if (box) box.innerHTML = doll(store.get().equipped, 148);
}

function bindRaceFields(card, { reload } = {}) {
  const nickIn = card.querySelector('[data-a="nick"]');
  const codeEl = card.querySelector('[data-a="code"]');
  card.querySelector('[data-a="nick-save"]')?.addEventListener('click', () => {
    store.setNick(nickIn?.value || '');
    const nick = store.get().nick;
    toast(nick ? 'Nick zapisany. Jest w Twoim kodzie.' : 'Nick skasowany.');
    if (codeEl) codeEl.textContent = store.encodeRace();
    if (reload) go('map');
  });
  card.querySelector('[data-a="cp"]')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(store.encodeRace());
      toast('Kod skopiowany. Wyślij na Messenger.');
    } catch {
      toast('Schowek zablokowany — zaznacz kod i skopiuj ręcznie.');
    }
  });
  card.querySelector('[data-a="go"]')?.addEventListener('click', () => {
    try {
      store.saveRival(store.decodeRace(card.querySelector('[data-a="in"]').value));
      toast('Jest na mapie.');
      go('map');
    } catch (err) {
      toast(err.message || 'Nie udało się wczytać kodu.');
    }
  });
}

function mapRaceForm() {
  const box = h(`<div class="map-race">
    <p class="tiny">Twój kod — koleżanka wkleja go u siebie i widzi Cię na mapie.
      Nick zmienisz w Szafie.</p>
    <p class="tiny" data-a="code" style="font-family:var(--mono);word-break:break-all;margin-top:.6rem">${esc(store.encodeRace())}</p>
    <div class="row" style="margin-top:.45rem">
      <button class="primary" type="button" data-a="cp">Kopiuj mój kod</button>
    </div>
    <p class="tiny" style="margin-top:.85rem">Kod koleżanki</p>
    <textarea data-a="in" rows="2" placeholder="wklej kod" aria-label="Kod koleżanki"></textarea>
    <div class="row end" style="margin-top:.55rem"><button type="button" data-a="go">Pokaż na mapie</button></div>
  </div>`);
  bindRaceFields(box, { reload: true });
  return box;
}

// ---------- wybór głosu ----------

function voiceOptions(selected) {
  return speech
    .available()
    .map((v) => {
      const tags = [];
      if (/^en[-_]us/i.test(v.lang)) tags.push('US');
      if (speech.looksFemale(v)) tags.push('żeński');
      if (v.localService) tags.push('offline');
      const label = `${v.name} — ${v.lang}${tags.length ? ` (${tags.join(', ')})` : ''}`;
      return `<option value="${esc(v.name)}"${v.name === selected ? ' selected' : ''}>${esc(label)}</option>`;
    })
    .join('');
}

function voiceBanner() {
  const d = speech.diagnosis();
  const cls = d.level === 'ok' ? 'ok' : d.level === 'blocked' ? 'bad' : 'warn';
  return `<div class="banner ${cls}"><span class="grow">${esc(d.text)}</span></div>`;
}

function onboarding() {
  const state = store.get();
  const rec = speech.recommended();
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);

  wrap.appendChild(
    h(`<div class="card">
    <span class="label">Zanim zaczniesz</span>
    <h1>Wybierz głos, który będziesz powtarzać</h1>
    <p class="muted">Nie ma mikrofonu, więc nikt nie poprawi Twojej wymowy — to nagranie jest jej jedynym
      nauczycielem. Chcemy amerykański żeński. Posłuchaj i wybierz.</p>
    ${voiceBanner()}
    <select id="voice-pick" aria-label="Głos">${voiceOptions(rec?.name || state.voiceName)}</select>
    <div class="row">
      <button type="button" id="try-normal">▶ Posłuchaj</button>
      <button type="button" id="try-slow">▶ Wolniej, z pauzami</button>
    </div>
    <p class="tiny">Próbka: <span style="font-family:var(--mono)">I've been testing it since this morning</span></p>
    <div class="row end"><button class="primary" type="button" id="voice-ok">Wybieram ten głos</button></div>
  </div>`)
  );

  mount(wrap);

  const sel = wrap.querySelector('#voice-pick');
  const apply = () => speech.setVoiceByName(sel.value);
  apply();
  sel.addEventListener('change', apply);

  const SAMPLE = "I've been testing it since this morning";
  wrap.querySelector('#try-normal').addEventListener('click', () => {
    apply();
    speech.speakOnce(SAMPLE, { rate: 1 });
  });
  wrap.querySelector('#try-slow').addEventListener('click', () => {
    apply();
    speech.speakChunks(["I've been", 'testing it', 'since this morning'], {
      rate: 0.92,
      gapMs: 520,
    });
  });
  wrap.querySelector('#voice-ok').addEventListener('click', () => {
    if (!sel.value) return toast('Najpierw wybierz głos z listy.');
    apply();
    store.setVoice(sel.value);
    go('look');
  });
}

function look(params = {}) {
  const wroc = params.from === 'wardrobe' ? 'wardrobe' : 'home';
  const state = store.get();
  const draft = {
    hair: state.equipped.hair || 'hair-bob',
    hairColor: state.look?.hairColor || 'brunette',
    eyeColor: state.look?.eyeColor || 'brown',
    postac: state.look?.postac || 'dziewczyna',
  };

  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);
  const card = h(`<div class="card">
    <span class="label">Twój ludzik</span>
    <h1>Ułóż wygląd</h1>
    <p class="muted">Fryzura, kolor włosów i oczy. Resztę ubierzesz w szafie.</p>
    <div class="look-preview" id="look-preview"></div>
    <span class="label">Postać</span>
    <div class="swatches" id="postac"></div>
    <span class="label">Fryzura</span>
    <div class="swatches" id="hair-styles"></div>
    <span class="label">Kolor włosów</span>
    <div class="swatches" id="hair-colors"></div>
    <span class="label">Oczy</span>
    <div class="swatches" id="eye-colors"></div>
    <div class="row end"><button class="primary" type="button" id="look-ok">Tak wyglądam</button></div>
  </div>`);
  wrap.appendChild(card);
  mount(wrap);

  const preview = () => {
    card.querySelector('#look-preview').innerHTML = renderAvatar(
      { ...state.equipped, hair: draft.hair },
      { size: 168, look: draft }
    );
  };

  const fill = (id, items, key, paint) => {
    const box = card.querySelector(id);
    box.replaceChildren();
    for (const item of items) {
      const on = draft[key] === item.id;
      const btn =
        h(`<button class="swatch ${on ? 'on' : ''}" type="button" title="${esc(item.name)}">
        ${paint ? `<i style="background:${paint(item)}"></i>` : `<span>${esc(item.name)}</span>`}
      </button>`);
      btn.addEventListener('click', () => {
        draft[key] = item.id;
        fill('#hair-styles', HAIR_STYLES, 'hair');
        fill(
          '#hair-colors',
          Object.entries(HAIR_COLORS).map(([id, v]) => ({ id, name: v.label })),
          'hairColor',
          (it) => HAIR_COLORS[it.id].main
        );
        fill(
          '#eye-colors',
          Object.entries(EYE_COLORS).map(([id, v]) => ({ id, name: v.label })),
          'eyeColor',
          (it) => EYE_COLORS[it.id].iris
        );
        preview();
      });
      box.appendChild(btn);
    }
  };

  fill('#hair-styles', HAIR_STYLES, 'hair');
  fill(
    '#hair-colors',
    Object.entries(HAIR_COLORS).map(([id, v]) => ({ id, name: v.label })),
    'hairColor',
    (it) => HAIR_COLORS[it.id].main
  );
  fill(
    '#eye-colors',
    Object.entries(EYE_COLORS).map(([id, v]) => ({ id, name: v.label })),
    'eyeColor',
    (it) => EYE_COLORS[it.id].iris
  );
  const POSTACIE = [
    { id: 'dziewczyna', name: 'Dziewczyna' },
    { id: 'chłopak', name: 'Chłopak' },
  ];
  const fillPostac = () => {
    const box = card.querySelector('#postac');
    box.replaceChildren();
    for (const p of POSTACIE) {
      const on = draft.postac === p.id;
      const btn = h(
        `<button class="swatch ${on ? 'on' : ''}" type="button"><span>${esc(p.name)}</span></button>`
      );
      btn.addEventListener('click', () => {
        draft.postac = p.id;
        // Wygodnie: chłopak dostaje krótkie włosy, dziewczyna wraca do „do ramion".
        if (p.id === 'chłopak' && draft.hair !== 'hair-short') draft.hair = 'hair-short';
        if (p.id === 'dziewczyna' && draft.hair === 'hair-short') draft.hair = 'hair-bob';
        fillPostac();
        fill('#hair-styles', HAIR_STYLES, 'hair');
        preview();
      });
      box.appendChild(btn);
    }
  };
  fillPostac();
  preview();

  card.querySelector('#look-ok').addEventListener('click', () => {
    store.setLook(draft);
    go(wroc);
  });
}

// ---------- mapa ----------

// Ile zdan siedzi juz na dobre - pudelko 3 znaczy, ze przetrwalo tydzien odstepu.
function umiemZdan() {
  let ile = 0;
  let wszystkich = 0;
  for (const m of MODULES) {
    for (const t of [...(m.translations || []), ...(m.dictation || [])]) {
      wszystkich += 1;
      if (store.isMastered(t.id)) ile += 1;
    }
  }
  return { ile, wszystkich };
}

// Co wymaga uwagi - to laduje pod dzwonkiem w prawym gornym rogu.
function sprawyDoZalatwienia() {
  const lista = [];
  if (speech.diagnosis().level === 'blocked') {
    lista.push('Nie ma głosu — lekcje nie przeczytają zdań.');
  }
  if (store.backupIsStale()) lista.push('Dawno nie było kopii postępu.');
  const doOdebrania = pendingStops();
  if (doOdebrania.length) lista.push(`${doOdebrania[0].name} — jest coś do odebrania.`);
  return lista;
}

// Odświeżenie apki z przycisku w górnym pasku: sprawdza nową wersję i przeładowuje.
async function odswiezApke() {
  toast('Odświeżam…');
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg) await reg.update();
  } catch {
    /* i tak przeładowujemy */
  }
  window.location.reload();
}

/** Dane dla wspolnej oprawy - pasek boczny, gorny i ludzik w rogu. */
function danePowloki(screen = SCREEN) {
  const state = store.get();
  const umiem = umiemZdan();
  const powrot = store.isComeback();
  return {
    ekran: screen,
    imie: state.nick || 'Ty',
    podpis: umiem.ile
      ? `${umiem.ile} ${plural(umiem.ile, 'zdanie w głowie', 'zdania w głowie', 'zdań w głowie')}`
      : 'Dopiero zaczynasz',
    km: state.km,
    monety: state.coins,
    uwaga: sprawyDoZalatwienia().length > 0,
    // Szeroka kolumna tylko tam, gdzie tresc jest na nia pisana.
    waska: !['home', 'map', 'modules'].includes(screen),
    dymek: screen !== 'home' ? '' : powrot ? 'Dobrze Cię widzieć.' : 'Gotowa na angielski?',
  };
}

function home() {
  refreshModules();
  const state = store.get();
  const outline = MODULE ? moduleOutline(MODULE, MODULES) : null;
  const emptyMine = false; // moduł „Moje zdania" usunięty
  const powrot = !emptyMine && store.isComeback();
  const next = nextStop(ROUTE, state.km);
  const umiem = umiemZdan();
  const meta = (ROUTE.stops || [])[(ROUTE.stops || []).length - 1];

  const zrobione = outline ? outline.lessons.filter((l) => l.done).length : 0;
  const postep = outline && outline.total ? Math.round((zrobione / outline.total) * 100) : 0;

  const podtytul = emptyMine
    ? 'Wpisz zdania po polsku — angielski dopiszę Ci przy najbliższej sesji.'
    : powrot
      ? `Nie było Cię <b>${przerwaLabel(store.daysSinceLastLesson())}</b>. Zaczynamy spokojnie.`
      : next
        ? `Do celu zostało <b>${next.km - state.km} km</b> — ${Math.ceil((next.km - state.km) / LESSON_KM)} ${plural(Math.ceil((next.km - state.km) / LESSON_KM), 'lekcja', 'lekcje', 'lekcji')}.`
        : 'Koniec narysowanej trasy. Kolejne miasta dosypię z treścią.';

  const opis = emptyMine
    ? 'Najpierw dodaj kilka swoich zdań z pracy.'
    : powrot
      ? 'Zaczynamy od zdań, które szły Ci najlepiej. Bez pośpiechu.'
      : outline?.dueCount
        ? `${outline.dueCount} ${plural(outline.dueCount, 'zdanie czeka', 'zdania czekają', 'zdań czeka')} na powtórkę. Jakieś 10 minut.`
        : 'Piętnaście zdań, jakieś 10 minut.';

  const wybory = [];
  if (outline?.dueCount) {
    wybory.push({
      id: 'powtorka',
      oczko: 'Powtórka',
      tytul: 'Zapamiętaj na dłużej',
      opis: 'Zdania ze wszystkich modułów, które zaczynają Ci uciekać.',
    });
  } else {
    wybory.push({
      id: 'szafa',
      oczko: 'Ludzik',
      tytul: 'Ubierz się',
      opis: 'Kup ciuchy za monety i ubierz swojego ludzika.',
    });
  }
  wybory.push({
    id: 'mapa',
    oczko: 'Nagroda',
    tytul: 'Zobacz, gdzie jesteś',
    opis: 'Trasa, przystanki i to, co czeka w następnym mieście.',
  });

  const sprawy = sprawyDoZalatwienia();

  const dane = {
    imie: state.nick || 'Ty',
    oczko: 'Angielski bez regułek',
    podtytul,
    naglowekLekcji: powrot ? 'WRACAMY' : 'DZISIEJSZA LEKCJA',
    pas: sprawy.length ? { tekst: sprawy[0], przycisk: 'Zobacz' } : null,
    lekcja: {
      tytul: powrot
        ? 'Spokojny powrót'
        : outline?.current
          ? `Lekcja ${outline.current.n}: ${outline.current.title}${outline.current.czesc ? ` · część ${outline.current.czesc}` : ''}`
          : MODULE?.title || 'Lekcja',
      opis,
      postep,
      doPowtorki: powrot || emptyMine ? 0 : outline?.dueCount || 0,
      przycisk: emptyMine ? 'Dodaj zdanie' : powrot ? 'Wracamy spokojnie' : 'Zaczynamy',
    },
    liczby: [
      { ikona: 'i-book', wartosc: state.lessons.length, opis: 'ukończonych lekcji' },
      { ikona: 'i-spark', wartosc: umiem.ile, opis: `umiesz z ${umiem.wszystkich} zdań` },
      { ikona: 'i-route', wartosc: state.km, opis: meta ? `km z ${meta.km}` : 'kilometrów' },
    ],
    wybory,
  };

  mount(
    trescStartu(dane, {
      onLekcja() {
        if (powrot) return runLesson({ comeback: true, wszystkieModuly: true });
        runLesson({ review: Boolean(outline?.reviewOnly) });
      },
      onPowtorka: () => runLesson({ review: true, wszystkieModuly: true }),
      onZmienLekcje: () => go('modules'),
      onPas: () => {
        const s = sprawy[0] || '';
        if (s.includes('kopii')) return go('settings');
        if (s.includes('odebrania')) return go('map');
        go('home');
      },
      onWybor(id) {
        if (id === 'powtorka') return runLesson({ review: true, wszystkieModuly: true });
        if (id === 'szafa') return go('wardrobe');
        go('map');
      },
    })
  );
}

/**
 * Lista lekcji pogrupowana po wzorcu.
 *
 * Wzorzec na szesc zdan daje dwie lekcje. Wypisywanie pelnej nazwy przy kazdej
 * robilo sciane powtorzonego tekstu - nazwa idzie wiec raz, jako naglowek grupy,
 * a wiersze mowia tylko, ktora to czesc.
 */
function lessonGroupsHtml(outline) {
  const grupy = [];
  for (const l of outline.lessons) {
    const ostatnia = grupy[grupy.length - 1];
    if (ostatnia && ostatnia.pattern === l.pattern) ostatnia.lekcje.push(l);
    else grupy.push({ pattern: l.pattern, title: l.title, lekcje: [l] });
  }

  return grupy
    .map((g) => {
      const wszystkieUmiem = g.lekcje.every((l) => l.done);
      const wiersze = g.lekcje
        .map((l) => {
          const isNow = Boolean(outline.current && l.n === outline.current.n);
          const kind = isNow ? 'now' : l.done ? 'done' : l.seen ? 'again' : '';
          const mark = isNow ? '→' : l.done ? '✓' : l.seen ? '↻' : '';
          const podpis = isNow
            ? 'tutaj jesteś'
            : l.done
              ? 'umiesz'
              : l.seen
                ? 'do poprawy'
                : 'jeszcze nie';
          const co = l.czesc ? `Część ${l.czesc} z ${l.czesci}` : 'Cała lekcja';
          return `<li class="${kind}"><button type="button" data-ids="${esc((l.ids || []).join(','))}"
            aria-label="Lekcja ${l.n}: ${esc(g.title)}, ${co.toLowerCase()}, ${podpis}">
            <span class="n">${l.n}</span>
            <span class="t">${esc(co)}</span>
            <span class="s">${l.sentences} ${plural(l.sentences, 'zdanie', 'zdania', 'zdań')}</span>
            <span class="m">${mark}</span>
          </button></li>`;
        })
        .join('');
      return `<div class="grupa ${wszystkieUmiem ? 'zrobiona' : ''}">
        <h3>${esc(g.title)}</h3>
        <ol class="lista-lekcji">${wiersze}</ol>
      </div>`;
    })
    .join('');
}

/** Ile w danym module zrobione, ile umiem, ile czeka. Liczone tylko dla niego. */
function statModulu(m) {
  const outline = moduleOutline(m, [m]);
  const zrobione = outline.lessons.filter((l) => l.done).length;
  const widziane = outline.lessons.filter((l) => l.seen).length;
  let umiem = 0;
  for (const t of [...(m.translations || []), ...(m.dictation || [])]) {
    if (store.isMastered(t.id)) umiem += 1;
  }
  return {
    outline,
    zrobione,
    widziane,
    umiem,
    postep: outline.total ? Math.round((zrobione / outline.total) * 100) : 0,
  };
}

function pickModule(id) {
  refreshModules();
  const nextMod = MODULES.find((m) => m.id === id);
  if (!nextMod) return;
  MODULE = nextMod;
  store.setModuleId(nextMod.id);
  go('modules');
}

function modules() {
  refreshModules();
  const emptyMine = false; // moduł „Moje zdania" usunięty
  const outline = MODULE ? moduleOutline(MODULE, MODULES) : null;
  const wlasny = MODULE ? statModulu(MODULE) : null;

  const opisOtwartego = emptyMine
    ? 'Jeszcze pusto. Wpisz zdanie po polsku, a angielski dopiszę Ci przy najbliższej sesji.'
    : outline?.reviewOnly
      ? 'Wszystkie lekcje z tego modułu zrobione. Zostaje powtórka.'
      : outline?.current
        ? `Następna: lekcja ${outline.current.n} — ${outline.current.title}${outline.current.czesc ? ` · część ${outline.current.czesc}` : ''}.`
        : 'Zaczynamy od pierwszej lekcji.';

  const wrap = h(`<div></div>`);

  wrap.appendChild(
    h(`<div class="naglowek">
      <div class="rosnij">
        <span class="oczko">Nauka</span>
        <h1>Moduły</h1>
        <p>Czasy to fundament. Reszta to sytuacje — bierz je, gdy czasy zaczną siedzieć.</p>
      </div>
    </div>`)
  );

  const hero = h(`<section class="hero">
    <div class="tresc-hero">
      <span class="oczko">Otwarty moduł</span>
      <h2>${esc(MODULE?.title || 'Wybierz moduł')}</h2>
      <p class="desc">${esc(opisOtwartego)}</p>
      <div class="prog">
        <div class="track"><div class="fill" style="width:${wlasny?.postep || 0}%"></div></div>
        <span class="pc">${wlasny?.zrobione || 0} z ${wlasny?.outline.total || 0} lekcji</span>
      </div>
      <div class="btns">
        <button class="btn btn-p" type="button" data-a="start">
          ${esc(emptyMine ? 'Dodaj zdanie' : outline?.reviewOnly ? 'Zaczynamy powtórkę' : 'Zaczynamy')}
        </button>
        ${
          outline?.dueCount && !outline.reviewOnly && !emptyMine
            ? `<button class="btn btn-g" type="button" data-a="powtorka">Powtórka (${outline.dueCount})</button>`
            : ''
        }
      </div>
    </div>
  </section>`);
  hero.querySelector('[data-a="start"]').addEventListener('click', () => {
    runLesson({ review: Boolean(outline?.reviewOnly) });
  });
  hero
    .querySelector('[data-a="powtorka"]')
    ?.addEventListener('click', () => runLesson({ review: true }));
  wrap.appendChild(hero);

  if (outline && outline.lessons.length && !emptyMine) {
    const zwiniety = LESSONS_COLLAPSED;
    const panel = h(`<div class="panel ${zwiniety ? 'zwiniety' : ''}">
      <button class="panel-naglowek" type="button" data-a="zwin" aria-expanded="${zwiniety ? 'false' : 'true'}">
        <div class="rosnij">
          <span class="oczko">Lekcje w tym module</span>
          <p class="podpowiedz">Kliknij dowolną, żeby ją zrobić — nie musisz iść po kolei.</p>
        </div>
        <span class="chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="grupy">${lessonGroupsHtml(outline)}</div>
    </div>`);
    panel.querySelector('[data-a="zwin"]').addEventListener('click', () => {
      LESSONS_COLLAPSED = !LESSONS_COLLAPSED;
      panel.classList.toggle('zwiniety', LESSONS_COLLAPSED);
      panel
        .querySelector('[data-a="zwin"]')
        .setAttribute('aria-expanded', LESSONS_COLLAPSED ? 'false' : 'true');
    });
    panel.querySelector('.grupy').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-ids]');
      if (!btn) return;
      const ids = btn.dataset.ids.split(',').filter(Boolean);
      if (!ids.length) return;
      runLesson({ ids });
    });
    wrap.appendChild(panel);
  }

  wrap.appendChild(
    h(`<div class="naglowek">
      <div class="rosnij">
        <span class="oczko">Do wyboru</span>
        <h2>Wszystkie moduły</h2>
      </div>
    </div>`)
  );

  const kartaModulu = (m) => {
    const otwarty = MODULE && m.id === MODULE.id;
    const st = statModulu(m);
    const pusty = false; // moduł „Moje zdania" usunięty

    const stan = pusty
      ? 'Puste'
      : otwarty
        ? 'Otwarty'
        : st.zrobione && st.zrobione === st.outline.total
          ? 'Zrobione'
          : st.widziane
            ? 'Zaczęty'
            : 'Nie zaczęty';

    const znaczniki = pusty
      ? '<span class="znacznik spokoj">czeka na Twoje zdania</span>'
      : [
          `<span class="znacznik">${st.umiem} ${plural(st.umiem, 'zdanie w głowie', 'zdania w głowie', 'zdań w głowie')}</span>`,
          st.outline.dueCount
            ? `<span class="znacznik czeka">${st.outline.dueCount} do powtórki</span>`
            : '',
        ]
          .filter(Boolean)
          .join('');

    const karta = h(`<button class="modul ${otwarty ? 'on' : ''}" type="button">
      <span class="oczko">${esc(stan)}</span>
      <h3>${esc(m.title)}</h3>
      <p>${esc(m.subtitle || '')}</p>
      ${
        pusty
          ? ''
          : `<div class="postep-jasny">
               <div class="track"><div class="fill" style="width:${st.postep}%"></div></div>
               <span class="pc">${st.postep}%</span>
             </div>`
      }
      <span class="stopka">${znaczniki}</span>
    </button>`);
    karta.addEventListener('click', () => {
      if (otwarty) return runLesson({ review: Boolean(outline?.reviewOnly) });
      pickModule(m.id);
    });
    return karta;
  };

  // Moduły w dwóch sekcjach: angielski w IT i ogólny. Zwykły angielski na górze,
  // bo to on jest łatwiejszy na wejście; brakującą sekcję traktujemy jako ogólną.
  const SEKCJE = [
    { id: 'Ogólne', tytul: 'Ogólny angielski' },
    { id: 'IT', tytul: 'Angielski w IT' },
  ];
  for (const sek of SEKCJE) {
    const wSekcji = MODULES.filter((m) => (m.sekcja || 'Ogólne') === sek.id);
    if (!wSekcji.length) continue;
    wrap.appendChild(h(`<div class="grupa-modulow"><span class="oczko">${sek.tytul}</span></div>`));
    const siatka = h(`<div class="moduly"></div>`);
    for (const m of wSekcji) siatka.appendChild(kartaModulu(m));
    wrap.appendChild(siatka);
  }

  mount(wrap);
}
// Ikonki miast z ikony.js. Przystanki dostaja domek automatycznie.
const IKONY_STACJI = {
  palace: 'pkin',
  bigben: 'bigben',
  gate: 'brama',
  tower: 'eiffel',
  spire: 'spire',
  mill: 'wiatrak',
  gaudi: 'sagrada',
  castle: 'zamek',
};

function stacjeZTrasy() {
  return (ROUTE.stops || []).map((s) => ({
    id: s.id,
    n: s.short || s.name,
    km: s.km,
    t: s.kind === 'stall' ? 'stop' : 'city',
    i: IKONY_STACJI[s.icon] || 'pkin',
  }));
}

function klikStacji(stacja, stan) {
  const stop = (ROUTE.stops || []).find((s) => s.id === stacja.id);
  if (!stop) return;
  const state = store.get();

  if (stan === 'locked') {
    // Nazwy miast po polsku sie odmieniaja, a my ich nie odmieniamy - stad szyk
    // „Nazwa — jeszcze X km” zamiast „do Amsterdam”.
    return toast(`${stop.short || stop.name} — jeszcze ${stop.km - state.km} km.`);
  }
  if (stan === 'next') {
    const lekcje = Math.ceil((stop.km - state.km) / LESSON_KM);
    toast(
      `${stop.short || stop.name} — jeszcze ${lekcje} ${plural(lekcje, 'lekcja', 'lekcje', 'lekcji')}.`
    );
    return runLesson();
  }
  // dojechana: najpierw odbierz, co tam czeka, potem juz tylko przypomnienie
  if (!state.visited.includes(stop.id)) return go('arrival', { stopId: stop.id });
  toast(stop.flavor || 'Tu już byłaś.');
}

function fullMap() {
  const state = store.get();
  const rywal = (state.rivals || [])[0] || null;

  const wrap = h(`<div class="home-stack"></div>`);
  const host = h(`<div class="trasa-host"></div>`);
  wrap.appendChild(host);

  const card = h(`<div class="card"><span class="label">Ściganie</span>
    <h2>Twój kod i kod koleżanki</h2></div>`);
  card.appendChild(mapRaceForm());
  wrap.appendChild(card);
  mount(wrap);

  // Startujemy tam, gdzie mapa stanela poprzednio, i dojezdzamy animacja do teraz.
  const doKm = state.km;
  const odKm = MAPA_KM === null ? doKm : MAPA_KM;

  MAPA = createTrasaMap(host, {
    stations: stacjeZTrasy(),
    me: { name: state.nick || 'Ty', km: odKm },
    friend: rywal ? { name: rywal.nick || 'Koleżanka', km: Math.round(rywal.km) } : null,
    renderAvatar(who, size) {
      if (who === 'me') return avatarOnLine(state.equipped, { size, look: state.look || {} });
      return avatarOnLine((rywal && rywal.eq) || {}, { size, look: (rywal && rywal.look) || {} });
    },
    onStation: klikStacji,
  });

  MAPA.scrollToCurrent('auto');
  if (odKm !== doKm) MAPA.update({ me: { km: doKm } });
  MAPA_KM = doKm;
}

// ---------- podsumowanie lekcji ----------

function summary(res) {
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);
  const mins = Math.floor((res.seconds || 0) / 60);
  const secs = String((res.seconds || 0) % 60).padStart(2, '0');
  const why = { materiał: 'materiał się skończył', przerwane: 'przerwałaś' }[res.reason] || '';

  wrap.appendChild(
    h(`<div class="card">
    <span class="label">Koniec na dziś — ${esc(why)}</span>
    <h1>Zrobione.</h1>
    <div class="facts">
      <div class="fact"><span>rzeczy w lekcji</span><b>${res.count}</b></div>
      <div class="fact"><span>za pierwszym razem dobrze</span><b>${res.correct} / ${res.count}</b></div>
      <div class="fact"><span>czas</span><b>${mins}:${secs}</b></div>
      <div class="fact"><span>kilometry</span><b>+${res.km}</b></div>
      <div class="fact"><span>monety</span><b>+${res.coins}</b></div>
    </div>
    <p class="tiny">${
      res.reason === 'przerwane'
        ? 'Przerwana lekcja płaci za to, co zdążyłaś. Dokończ następną, a stawka będzie pełna.'
        : 'Pełna wypłata leci nawet w gorszy dzień — liczy się, że usiadłaś.'
    }</p>
  </div>`)
  );

  const boxCard = h(`<div class="card">
    <span class="label">Skrzynka po lekcji</span>
    <div class="box-wrap">
      <button class="box-lid shake" type="button" id="open-box" aria-label="Otwórz skrzynkę">🎁</button>
      <p class="tiny">Zawsze coś w niej jest.</p>
    </div>
  </div>`);
  boxCard.querySelector('#open-box').addEventListener('click', () => openBox(boxCard));
  wrap.appendChild(boxCard);

  const nav = h(
    `<div class="row end"><button class="primary" type="button">Dalej →</button></div>`
  );
  nav.querySelector('button').addEventListener('click', () => afterLesson());
  wrap.appendChild(nav);

  mount(wrap);
}

function openBox(card) {
  const pool = (ROUTE.boxPool || []).filter((id) => !store.owns(id));
  const wrap = card.querySelector('.box-wrap');
  let prizeText;

  if (pool.length && Math.random() < 0.55) {
    const exclusive = pool.filter((id) => itemById(id)?.source === 'box');
    const pickFrom = exclusive.length ? exclusive : pool;
    const id = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    store.grant(id);
    prizeText = `${itemById(id)?.name || id} — Twoje, za darmo`;
  } else {
    const coins = 10 + Math.floor(Math.random() * 21);
    store.addCoins(coins);
    prizeText = `+${coins} monet`;
  }

  refreshCounters(store.get());
  wrap.replaceChildren(
    h(`<div class="reveal" style="font-size:3rem;line-height:1">✨</div>`),
    h(`<p class="prize reveal">${esc(prizeText)}</p>`)
  );
}

// ---------- przystanki ----------

function pendingStops() {
  const state = store.get();
  return ROUTE.stops.filter((s) => state.km >= s.km && !state.visited.includes(s.id));
}

function afterLesson() {
  disk.writePairQuiet();
  const pending = pendingStops();
  if (pending.length) return go('arrival', { stopId: pending[0].id });
  go('home');
}

function arrival({ stopId }) {
  const stop = stopById(stopId);
  const state = store.get();
  if (!stop) return go('home');

  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);
  const choices = (stop.freeChoice || []).filter((id) => !store.owns(id));
  const needsChoice = choices.length > 0 && !state.claimed[stop.id];

  wrap.appendChild(
    h(`<div class="card">
    <span class="label">${stop.km} km — dotarłaś</span>
    <h1>${esc(stop.name)}</h1>
    <p class="muted">${esc(stop.flavor || '')}</p>
  </div>`)
  );

  if (stop.kind === 'stall') {
    const stall = h(`<div class="card">
      <span class="label">Budka</span>
      <h2>Krótka powtórka</h2>
      <p class="muted">Sama dobieram zdania, które poszły źle albo są już do wałkowania.
        Dostaniesz je w innym rodzaju ćwiczenia niż w lekcji.</p>
      <div class="row">
        <button class="primary" type="button" id="stall-rev">Powtórz 8 zdań</button>
        <button type="button" id="stall-shop">Stragan</button>
        <button type="button" id="stall-skip">Później</button>
      </div>
    </div>`);
    stall.querySelector('#stall-rev').addEventListener('click', () => {
      store.markVisited(stop.id);
      runLesson({ review: true, wszystkieModuly: true });
    });
    stall.querySelector('#stall-shop').addEventListener('click', () => {
      store.markVisited(stop.id);
      go('shop', { stopId: stop.id });
    });
    stall.querySelector('#stall-skip').addEventListener('click', () => {
      store.markVisited(stop.id);
      afterLesson();
    });
    wrap.appendChild(stall);
  }

  if (needsChoice) {
    const card = h(`<div class="card">
      <span class="label">Jedna do wyboru, za darmo</span>
      <div class="grid"></div>
      <p class="tiny">Ta, której nie weźmiesz, nie znika — zostaje w sklepie tutaj, do kupienia za monety.</p>
    </div>`);
    const grid = card.querySelector('.grid');
    for (const id of choices) {
      const item = itemById(id);
      const preview = doll(withItem(state.equipped, item), 92);
      const btn =
        h(`<button class="thing" type="button" style="align-items:center;text-align:center">
        ${preview}
        <span class="n">${esc(item.name)}</span>
        <span class="s">weź za darmo</span>
      </button>`);
      btn.addEventListener('click', () => {
        store.claimStop(stop.id, item.id);
        store.equip(item);
        store.markVisited(stop.id);
        toast(`${item.name} — Twoja.`);
        afterLesson();
      });
      grid.appendChild(btn);
    }
    wrap.appendChild(card);
  } else if (stop.kind !== 'stall') {
    const card = h(`<div class="card">
      <div class="doll-frame" style="width:auto;justify-content:center">${doll(state.equipped, 120)}</div>
      <div class="row end">
        <button type="button" id="see-shop">Zobacz, co tu mają</button>
        <button class="primary" type="button" id="onward">Idę dalej</button>
      </div>
    </div>`);
    card.querySelector('#see-shop').addEventListener('click', () => {
      store.markVisited(stop.id);
      go('shop', { stopId: stop.id });
    });
    card.querySelector('#onward').addEventListener('click', () => {
      store.markVisited(stop.id);
      afterLesson();
    });
    wrap.appendChild(card);
  }

  mount(wrap);
}

// ---------- sklep ----------

function stockOf(stop) {
  const state = store.get();
  const extra = (stop.freeChoice || []).filter((id) => state.claimed[stop.id] !== id);
  return [...new Set([...(stop.stock || []), ...extra])];
}

function shop() {
  const state = store.get();
  const reached = ROUTE.stops.filter((s) => state.km >= s.km && stockOf(s).length);
  const wrap = h(`<div class="home-stack"></div>`);

  wrap.appendChild(
    dressHead(state, {
      label: `Masz ${state.coins} ${plural(state.coins, 'monetę', 'monety', 'monet')}`,
      title: 'Sklep',
      hint: 'Stroje kupujesz w komplecie: góra i dół razem. W szafie możesz je rozdzielić.',
    })
  );

  if (!reached.length) {
    wrap.appendChild(
      h(`<div class="card"><p class="muted">Jeszcze nigdzie nie dotarłaś.
      Pierwszy stragan czeka na ${ROUTE.stops[1]?.km ?? 25} km.</p></div>`)
    );
  }

  for (const stop of reached) {
    const ids = stockOf(stop);
    const used = new Set();
    const card = h(`<div class="card">
      <span class="label">${stop.km} km</span>
      <h2>${esc(stop.name)}</h2>
      <div class="grid"></div>
    </div>`);
    const grid = card.querySelector('.grid');

    for (const set of OUTFIT_SETS) {
      if (!ids.includes(set.top) && !ids.includes(set.bottom)) continue;
      used.add(set.top);
      used.add(set.bottom);
      const topItem = itemById(set.top);
      const bottomItem = itemById(set.bottom);
      if (!topItem || !bottomItem) continue;
      const haveTop = store.owns(set.top);
      const haveBottom = store.owns(set.bottom);
      const missing = [];
      if (!haveTop) missing.push(topItem);
      if (!haveBottom) missing.push(bottomItem);
      const price = missing.reduce((sum, it) => sum + it.price, 0);
      const owned = !missing.length;
      const afford = state.coins >= price;
      const thing = h(`<div class="thing ${owned ? 'on' : ''}">
        <div class="thing-art">${renderOutfitIcon(set.top, set.bottom, { size: 88 })}</div>
        <span class="n">${esc(set.name)}</span>
        <span class="price">${owned ? 'masz komplet' : missing.length === 1 ? `dokończ · ${price} monet` : `${price} monet`}</span>
      </div>`);
      if (!owned) {
        const buy =
          h(`<button class="small ${afford ? 'primary' : ''}" type="button" ${afford ? '' : 'disabled'}>
          ${afford ? (missing.length === 1 ? 'Dokończ' : 'Kup komplet') : 'za mało monet'}
        </button>`);
        buy.addEventListener('click', () => {
          if (!store.spend(price)) return toast('Za mało monet.');
          store.grantMany(missing.map((it) => it.id));
          store.equip(topItem);
          store.equip(bottomItem);
          toast(`${set.name} — kupione i założone.`);
          go('shop');
        });
        thing.appendChild(buy);
      }
      grid.appendChild(thing);
    }

    for (const id of ids) {
      if (used.has(id)) continue;
      const item = itemById(id);
      if (!item) continue;
      const owned = store.owns(id);
      const afford = state.coins >= item.price;
      const thing = h(`<div class="thing ${owned ? 'on' : ''}">
        <div class="thing-art">${renderItemIcon(item, { size: 72, look: state.look })}</div>
        <span class="n">${esc(item.name)}</span>
        <span class="price">${owned ? 'masz to' : `${item.price} monet`}</span>
      </div>`);
      if (!owned) {
        const buy =
          h(`<button class="small ${afford ? 'primary' : ''}" type="button" ${afford ? '' : 'disabled'}>
          ${afford ? 'Kup' : 'za mało monet'}
        </button>`);
        buy.addEventListener('click', () => {
          if (!store.spend(item.price)) return toast('Za mało monet.');
          store.grant(item.id);
          store.equip(item);
          toast(`${item.name} — kupione i założone.`);
          go('shop');
        });
        thing.appendChild(buy);
      }
      grid.appendChild(thing);
    }
    wrap.appendChild(card);
  }

  mount(wrap);
}

// ---------- szafa ----------

function wardrobe() {
  const state = store.get();
  const wrap = h(`<div class="home-stack"></div>`);

  const glowa = dressHead(state, {
    label: 'Szafa',
    title: 'Ubierz się',
    hint: 'Górę i dół zakładasz osobno. Kliknij to, co masz na sobie, żeby zdjąć.',
  });
  wrap.appendChild(glowa);
  // Przyklejony podgląd ludzika kurczy się przy przewijaniu, żeby nie zasłaniał ciuchów.
  const naScroll = () => {
    if (!document.body.contains(glowa)) {
      window.removeEventListener('scroll', naScroll, true);
      return;
    }
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    glowa.classList.toggle('zwarty', y > 50);
  };
  // capture=true łapie przewijanie z dowolnego kontenera, nie tylko okna.
  window.addEventListener('scroll', naScroll, { passive: true, capture: true });

  // Wygląd ludzika i nick — wszystko o ludziku w jednym miejscu.
  const lookCard = h(`<div class="card">
    <span class="label">Twój ludzik</span>
    <h2>Wygląd i imię</h2>
    <p class="muted">Postać, fryzura, kolor włosów i oczu — plus imię, które widzi koleżanka na mapie.</p>
    <div class="row"><button class="primary" type="button" id="edit-look">Zmień wygląd</button></div>
    <label class="pole-etykieta" for="nick-in">Twój nick</label>
    <input id="nick-in" type="text" maxlength="16" placeholder="np. Ania" value="${esc(state.nick || '')}" aria-label="Twój nick" />
    <div class="row" style="margin-top:.5rem"><button type="button" id="nick-save">Zapisz nick</button></div>
  </div>`);
  lookCard
    .querySelector('#edit-look')
    .addEventListener('click', () => go('look', { from: 'wardrobe' }));
  lookCard.querySelector('#nick-save').addEventListener('click', () => {
    store.setNick(lookCard.querySelector('#nick-in').value || '');
    const nick = store.get().nick;
    refreshCounters(store.get());
    odswiezPowloke(danePowloki());
    toast(nick ? 'Nick zapisany.' : 'Nick skasowany.');
  });
  wrap.appendChild(lookCard);

  const owned = state.owned.map(itemById).filter(Boolean);
  const bySlot = new Map();
  for (const item of owned) {
    if (!bySlot.has(item.slot)) bySlot.set(item.slot, []);
    bySlot.get(item.slot).push(item);
  }

  const card = h(`<div class="card"><div class="grid"></div></div>`);
  const grid = card.querySelector('.grid');
  for (const [, items] of bySlot) {
    for (const item of items) {
      const on = state.equipped[item.slot] === item.id;
      const btn =
        h(`<button class="thing ${on ? 'on' : ''}" type="button" data-item="${esc(item.id)}">
        <div class="thing-art">${renderItemIcon(item, { size: 72, look: state.look })}</div>
        <span class="n">${esc(item.name)}</span>
        <span class="s">${on ? 'na sobie' : 'załóż'}</span>
      </button>`);
      btn.addEventListener('click', () => {
        const wornNow = store.get().equipped[item.slot] === item.id;
        if (wornNow) store.unequip(item.slot);
        else store.equip(item);
        const next = store.get();
        paintDoll(wrap);
        for (const b of grid.querySelectorAll('[data-item]')) {
          const it = itemById(b.getAttribute('data-item'));
          const worn = next.equipped[it.slot] === it.id;
          b.classList.toggle('on', worn);
          const s = b.querySelector('.s');
          if (s) s.textContent = worn ? 'na sobie' : 'załóż';
        }
      });
      grid.appendChild(btn);
    }
  }
  wrap.appendChild(card);

  mount(wrap);
}

// ---------- ustawienia ----------

// Karta „Dodaj do ekranu głównego". Trzy warianty: już zainstalowane, Android
// (przycisk odpalający instalację) i iPhone/reszta (instrukcja krok po kroku).
function kartaInstalacji() {
  if (jakoAplikacja()) {
    return h(`<div class="card">
      <span class="label">Na telefonie</span>
      <h2>Masz już Lumio jak aplikację 🎉</h2>
      <p class="muted">Otwierasz ją z ikony na ekranie, a nowe wersje łapią się same.</p>
    </div>`);
  }

  const karta = h(`<div class="card">
    <span class="label">Na telefonie</span>
    <h2>Dodaj Lumio do ekranu głównego</h2>
    <p class="muted">Będziesz otwierać ją z ikony jak zwykłą apkę — bez wpisywania adresu.</p>
    <div data-slot></div>
  </div>`);
  const slot = karta.querySelector('[data-slot]');

  if (promptInstalacji) {
    const btn = h(
      `<div class="row"><button class="primary" type="button">Dodaj do ekranu głównego</button></div>`
    );
    btn.querySelector('button').addEventListener('click', async () => {
      const zdarzenie = promptInstalacji;
      if (!zdarzenie) return;
      promptInstalacji = null;
      zdarzenie.prompt();
      try {
        await zdarzenie.userChoice;
      } catch {
        /* nieważne, jak wybrała */
      }
      go('settings');
    });
    slot.appendChild(btn);
  } else if (jabłko()) {
    // Na iPhonie dodać do ekranu da się TYLKO z Safari. Chrome/Firefox/Edge na iOS
    // tego nie umieją (tak ustawił Apple) — wtedy kierujemy do Safari.
    const nieSafari = /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
    if (nieSafari) {
      const blok = h(`<div>
        <p class="tiny" style="margin:.4rem 0 0">Na iPhonie ikonę na pulpicie dodaje się
          <b>tylko z Safari</b> — ta przeglądarka tego nie umie (tak ustawił Apple).</p>
        <ol class="tiny" style="margin:.5rem 0 0;padding-left:1.1rem;line-height:1.7">
          <li>Skopiuj adres poniżej.</li>
          <li>Otwórz <b>Safari</b> i wklej go w pasku adresu.</li>
          <li>Kliknij <b>Udostępnij</b> ⬆️ → <b>„Do ekranu początkowego"</b> → <b>Dodaj</b>.</li>
        </ol>
        <div class="row" style="margin-top:.6rem"><button class="primary" type="button" data-a="kopiuj">Kopiuj adres</button></div>
      </div>`);
      blok.querySelector('[data-a="kopiuj"]').addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(location.origin + location.pathname);
          toast('Adres skopiowany. Wklej go w Safari.');
        } catch {
          toast('Skopiuj ręcznie: ' + location.host + location.pathname);
        }
      });
      slot.appendChild(blok);
    } else {
      slot.appendChild(
        h(`<ol class="tiny" style="margin:.4rem 0 0;padding-left:1.1rem;line-height:1.7">
          <li>Na dole ekranu kliknij przycisk <b>Udostępnij</b> (kwadrat ze strzałką w górę).</li>
          <li>Przewiń i wybierz <b>„Do ekranu początkowego"</b>.</li>
          <li>Kliknij <b>Dodaj</b> w prawym górnym rogu.</li>
        </ol>`)
      );
    }
  } else {
    slot.appendChild(
      h(`<p class="tiny" style="margin:.4rem 0 0">W menu przeglądarki (⋮) wybierz
        <b>„Zainstaluj aplikację"</b> albo <b>„Dodaj do ekranu głównego"</b>.</p>`)
    );
  }
  return karta;
}

function settings() {
  const state = store.get();
  const wrap = h(`<div class="home-stack"></div>`);

  // Nagłówek strony jak w Modułach — żeby Ustawienia nie zaczynały się „na zimno".
  wrap.appendChild(
    h(`<div class="naglowek">
      <div class="rosnij">
        <span class="oczko">Konto</span>
        <h1>Ustawienia</h1>
        <p>Wygląd strony, głos lektora, ludzik i kopia postępu — wszystko tutaj.</p>
      </div>
    </div>`)
  );

  wrap.appendChild(kartaInstalacji());

  const paletteCard = h(`<div class="card">
    <span class="label">Wygląd strony</span>
    <h2>Kolor</h2>
    <p class="muted">Zielony jak dotąd, albo liliowy — jaśniejszy, nowszy.</p>
    <div class="row">
      <button type="button" data-pal="forest" class="${state.palette !== 'lilac' ? 'primary' : ''}">Zielony</button>
      <button type="button" data-pal="lilac" class="${state.palette === 'lilac' ? 'primary' : ''}">Liliowy</button>
    </div>
  </div>`);
  paletteCard.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pal]');
    if (!btn) return;
    const next = store.setPalette(btn.getAttribute('data-pal'));
    applyPalette(next);
    go('settings');
  });
  wrap.appendChild(paletteCard);

  // Głos
  const voiceCard = h(`<div class="card">
    <span class="label">Głos</span>
    <h2>Kogo powtarzasz</h2>
    ${voiceBanner()}
    <select id="voice-pick" aria-label="Głos">${voiceOptions(state.voiceName)}</select>
    <div class="row">
      <button type="button" id="try-normal">▶ Posłuchaj</button>
      <button type="button" id="try-slow">▶ Wolniej, z pauzami</button>
      <button class="primary" type="button" id="save-voice">Zapisz</button>
    </div>
  </div>`);
  const sel = voiceCard.querySelector('#voice-pick');
  const SAMPLE = "I've been testing it since this morning";
  voiceCard.querySelector('#try-normal').addEventListener('click', () => {
    speech.setVoiceByName(sel.value);
    speech.speakOnce(SAMPLE, { rate: 1 });
  });
  voiceCard.querySelector('#try-slow').addEventListener('click', () => {
    speech.setVoiceByName(sel.value);
    speech.speakChunks(["I've been", 'testing it', 'since this morning'], {
      rate: 0.92,
      gapMs: 520,
    });
  });
  voiceCard.querySelector('#save-voice').addEventListener('click', () => {
    speech.setVoiceByName(sel.value);
    store.setVoice(sel.value);
    toast('Głos zapisany.');
  });
  wrap.appendChild(voiceCard);

  // Wygląd ludzika i nick przeniesione do Szafy — tam są wszystkie rzeczy o ludziku.

  // Kopia zapasowa
  const last = state.lastBackupAt ? new Date(state.lastBackupAt).toLocaleString('pl-PL') : 'nigdy';
  const backupCard = h(`<div class="card">
    <span class="label">Kopia postępu</span>
    <h2>To jedyne miejsce, gdzie żyje Twój postęp</h2>
    <p class="muted">Kilometry, monety i szafa siedzą w tej przeglądarce. Wyczyszczenie danych
      przeglądarki albo tryb prywatny skasuje wszystko. Ostatnia kopia: <b>${esc(last)}</b>.</p>
    <p class="tiny">Automatyczny zapis trzyma tylko dwa pliki: <b>lumio-biezaca.json</b> i
      <b>lumio-poprzednia.json</b>. Nie robi dwustu kopii.</p>
    <div class="row">
      <button class="primary" type="button" id="dl">Zapisz kopię do pliku</button>
      <button type="button" id="folder">Wybierz folder na automatyczny zapis</button>
      <button type="button" id="cp">Kopiuj do schowka</button>
      ${store.hasPrevBackup() ? `<button type="button" id="prev">Wczytaj poprzednią kopię</button>` : ''}
    </div>
    <details>
      <summary style="cursor:pointer;color:var(--primary)">Wczytaj kopię</summary>
      <p class="tiny" style="margin:.6rem 0">Wskaż plik z kopią (np. <b>lumio-biezaca.json</b>) — nie musisz otwierać go w Notatniku.
        To nadpisze obecny postęp.</p>
      <div class="row" style="margin:.4rem 0"><button type="button" id="pick-file">Wybierz plik z kopią…</button></div>
      <input type="file" id="imp-file" accept=".json,application/json" hidden />
      <p class="tiny" style="margin:.6rem 0">Albo wklej treść ręcznie:</p>
      <textarea id="imp" rows="4" placeholder="wklej tutaj…"></textarea>
      <div class="row end" style="margin-top:.6rem"><button type="button" id="do-imp">Wczytaj z pola</button></div>
    </details>
  </div>`);
  backupCard.querySelector('#dl').addEventListener('click', () => {
    const blob = new Blob([store.exportText()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lumio-biezaca.json';
    a.click();
    URL.revokeObjectURL(a.href);
    store.markBackedUp();
    toast('Kopia zapisana.');
  });
  backupCard.querySelector('#folder')?.addEventListener('click', async () => {
    if (!disk.supported()) {
      toast('Ta przeglądarka nie umie sama pisać na dysk. Zostaje zapis do pliku.');
      return;
    }
    try {
      await disk.pickFolder();
      toast('Folder zapisany. Od teraz tylko dwa pliki: bieżąca i poprzednia.');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      toast('Nie udało się wybrać folderu.');
    }
  });
  backupCard.querySelector('#prev')?.addEventListener('click', () => {
    try {
      store.importPrevBackup();
      toast('Wczytałam poprzednią kopię.');
      go('home');
    } catch (err) {
      toast(err.message || 'Nie ma poprzedniej kopii.');
    }
  });
  backupCard.querySelector('#cp').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(store.exportText());
      store.markBackedUp();
      toast('Skopiowane do schowka.');
    } catch {
      toast('Schowek zablokowany — użyj zapisu do pliku.');
    }
  });
  backupCard.querySelector('#do-imp').addEventListener('click', () => {
    const text = backupCard.querySelector('#imp').value;
    try {
      store.importText(text);
      toast('Postęp wczytany.');
      go('home');
    } catch (err) {
      toast(err.message || 'Nie udało się wczytać.');
    }
  });
  const impFile = backupCard.querySelector('#imp-file');
  backupCard.querySelector('#pick-file').addEventListener('click', () => impFile.click());
  impFile.addEventListener('change', async () => {
    const file = impFile.files && impFile.files[0];
    if (!file) return;
    try {
      store.importText(await file.text());
      toast('Postęp wczytany z pliku.');
      go('home');
    } catch (err) {
      toast(err.message || 'Nie udało się wczytać pliku.');
    } finally {
      impFile.value = '';
    }
  });
  wrap.appendChild(backupCard);

  // Zgłoszenia
  const reports = state.reports || [];
  const repCard = h(`<div class="card">
    <span class="label">Twoje zgłoszenia do korpusu</span>
    <h2>${reports.length} ${plural(reports.length, 'zgłoszenie', 'zgłoszenia', 'zgłoszeń')}</h2>
    <p class="muted">Wszystko, co oznaczyłaś jako „to też jest poprawne" albo „to brzmi dziwnie".
      Skopiuj i wyślij mi — wgram poprawki do modułu.</p>
    <div class="row"><button type="button" id="cp-rep" ${reports.length ? '' : 'disabled'}>Skopiuj zgłoszenia</button></div>
  </div>`);
  repCard.querySelector('#cp-rep').addEventListener('click', async () => {
    const text = reports.map((r) => `${r.kind}\t${r.itemId}\t${r.answer}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast('Skopiowane.');
    } catch {
      toast('Schowek zablokowany.');
    }
  });
  wrap.appendChild(repCard);

  // Reset
  const resetCard = h(`<div class="card">
    <span class="label">Prototyp</span>
    <h2>Zacznij od zera</h2>
    <p class="muted">Kasuje postęp, monety, szafę i zgłoszenia. Przydaje się, gdy testujesz.</p>
    <div class="row"><button type="button" id="wipe">Wyczyść wszystko</button></div>
  </div>`);
  resetCard.querySelector('#wipe').addEventListener('click', () => {
    if (!window.confirm('Na pewno? Cały postęp zniknie.')) return;
    store.wipe();
    toast('Wyczyszczone.');
    go('onboarding');
  });
  wrap.appendChild(resetCard);

  mount(wrap);
}
