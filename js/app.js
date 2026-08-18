// Ekrany: wybór głosu, mapa, podsumowanie lekcji, skrzynka, przystanki, sklep, szafa, ustawienia.
import { esc, h, mount, refreshCounters, plural, toast, applyPalette, markNav } from './ui.js';
import * as store from './store.js';
import * as speech from './speech.js';
import {
  renderAvatar,
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
import { plToEn, chunkEnglish, buildMineModule } from './mine.js';

let BASE_MODULES = [];
let MODULES = [];
let MODULE = null;
let ROUTE = null;
let SCREEN = 'home';

function refreshModules() {
  MODULES = [...BASE_MODULES, buildMineModule(store.get().customPhrases || [])];
  const saved = store.get().moduleId;
  MODULE = MODULES.find((m) => m.id === saved) || MODULES[0] || null;
  if (MODULE) store.setModuleId(MODULE.id);
}

function setNavOpen(open) {
  document.body.classList.toggle('nav-open', open);
  const toggle = document.getElementById('nav-toggle');
  const scrim = document.getElementById('nav-scrim');
  if (toggle) {
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.textContent = open ? 'Zamknij' : 'Menu';
  }
  if (scrim) scrim.hidden = !open;
}

function bindChrome() {
  document.getElementById('nav-toggle')?.addEventListener('click', () => {
    setNavOpen(!document.body.classList.contains('nav-open'));
  });
  document.getElementById('nav-scrim')?.addEventListener('click', () => setNavOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setNavOpen(false);
  });
}

export function boot({ modules, route }) {
  BASE_MODULES = modules || [];
  ROUTE = route;
  refreshModules();
  applyPalette(store.get().palette);
  bindChrome();
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
  setNavOpen(false);
  speech.cancel();
  refreshCounters(store.get());
  SCREEN = screen;
  markNav(screen);
  const screens = {
    onboarding,
    look,
    home,
    modules,
    map: fullMap,
    settings,
    shop,
    wardrobe,
    phrases,
    summary,
    arrival,
  };
  (screens[screen] || home)(params);
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

function runLesson({ review = false } = {}) {
  refreshModules();
  if (!MODULE) return toast('Wybierz moduł.');
  if (MODULE.id === 'moje' && !(MODULE.translations || []).length) {
    toast('Najpierw dodaj zdanie po polsku.');
    return go('phrases');
  }
  const back = SCREEN === 'modules' ? 'modules' : 'home';
  startLesson({
    module: MODULE,
    review,
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
  const state = store.get();
  const box = h(`<div class="map-race">
    <p class="tiny">Twój nick — koleżanka zobaczy go na mapie, jak wklei Twój kod.</p>
    <input type="text" data-a="nick" maxlength="16" placeholder="np. Ania" value="${esc(state.nick || '')}" aria-label="Twój nick">
    <div class="row" style="margin-top:.45rem">
      <button type="button" data-a="nick-save">Zapisz nick</button>
    </div>
    <p class="tiny" data-a="code" style="font-family:var(--mono);word-break:break-all;margin-top:.8rem">${esc(store.encodeRace())}</p>
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

const LANDMARKS = {
  palace: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="14" y="18" width="20" height="34" fill="#C9D2DC"/>
    <rect x="6" y="28" width="10" height="24" fill="#B4C0CC"/>
    <rect x="32" y="28" width="10" height="24" fill="#B4C0CC"/>
    <rect x="20" y="4" width="8" height="16" fill="#8FA0B0"/>
    <polygon points="24,0 28,8 20,8" fill="#2C6753"/>
    <rect x="18" y="24" width="3" height="5" fill="#5B7A9A"/>
    <rect x="27" y="24" width="3" height="5" fill="#5B7A9A"/>
  </svg>`,
  kiosk: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="8" y="26" width="32" height="22" rx="2" fill="#E8C56B"/>
    <polygon points="4,26 24,12 44,26" fill="#C23A52"/>
    <rect x="20" y="32" width="8" height="16" fill="#6B3E24"/>
    <circle cx="24" cy="18" r="3" fill="#FFF4C8"/>
  </svg>`,
  bigben: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="16" y="10" width="16" height="42" fill="#C4B089"/>
    <rect x="14" y="6" width="20" height="8" fill="#A8946A"/>
    <polygon points="24,0 32,8 16,8" fill="#2C6753"/>
    <circle cx="24" cy="22" r="5.5" fill="#F4E8CE"/>
    <circle cx="24" cy="22" r="1" fill="#191F1C"/>
    <rect x="22" y="36" width="4" height="8" fill="#5B7A9A"/>
  </svg>`,
  gate: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="6" y="18" width="8" height="34" fill="#C9D2DC"/>
    <rect x="34" y="18" width="8" height="34" fill="#C9D2DC"/>
    <rect x="10" y="22" width="28" height="6" fill="#B4C0CC"/>
    <rect x="10" y="32" width="28" height="6" fill="#B4C0CC"/>
    <rect x="22" y="18" width="4" height="34" fill="#8FA0B0"/>
  </svg>`,
  tower: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <polygon points="24,2 28,22 20,22" fill="#8A8F7A"/>
    <rect x="21" y="22" width="6" height="30" fill="#9AA184"/>
    <polygon points="14,52 24,28 34,52" fill="#C4B089"/>
  </svg>`,
  spire: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="22" y="8" width="4" height="44" fill="#8FA0B0"/>
    <polygon points="24,0 28,10 20,10" fill="#2C6753"/>
    <rect x="16" y="40" width="16" height="12" fill="#C9D2DC"/>
  </svg>`,
  mill: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="20" y="28" width="8" height="24" fill="#C4B089"/>
    <circle cx="24" cy="26" r="4" fill="#6B3E24"/>
    <rect x="22" y="8" width="4" height="18" fill="#F4E8CE" transform="rotate(25 24 26)"/>
    <rect x="22" y="8" width="4" height="18" fill="#E8C56B" transform="rotate(70 24 26)"/>
    <rect x="22" y="8" width="4" height="18" fill="#F4E8CE" transform="rotate(115 24 26)"/>
    <rect x="22" y="8" width="4" height="18" fill="#E8C56B" transform="rotate(160 24 26)"/>
  </svg>`,
  gaudi: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <path d="M10,52 Q14,20 24,8 Q34,20 38,52 Z" fill="#C4B089"/>
    <path d="M18,52 Q20,28 24,18 Q28,28 30,52 Z" fill="#E8C56B"/>
    <circle cx="24" cy="22" r="3" fill="#5B7A9A"/>
  </svg>`,
  castle: `<svg class="landmark" viewBox="0 0 48 56" aria-hidden="true">
    <rect x="8" y="22" width="32" height="30" fill="#8FA0B0"/>
    <rect x="6" y="18" width="8" height="34" fill="#C9D2DC"/>
    <rect x="34" y="18" width="8" height="34" fill="#C9D2DC"/>
    <polygon points="10,18 14,8 18,18" fill="#2C6753"/>
    <polygon points="38,18 34,8 30,18" fill="#2C6753"/>
    <rect x="20" y="34" width="8" height="18" fill="#6B3E24"/>
  </svg>`,
};

function landmark(stop) {
  return LANDMARKS[stop.icon] || `<span class="landmark-dot"></span>`;
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

function look() {
  const state = store.get();
  const draft = {
    hair: state.equipped.hair || 'hair-bob',
    hairColor: state.look?.hairColor || 'brunette',
    eyeColor: state.look?.eyeColor || 'brown',
  };

  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);
  const card = h(`<div class="card">
    <span class="label">Twój ludzik</span>
    <h1>Ułóż wygląd</h1>
    <p class="muted">Fryzura, kolor włosów i oczy. Resztę ubierzesz w szafie.</p>
    <div class="look-preview" id="look-preview"></div>
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
  preview();

  card.querySelector('#look-ok').addEventListener('click', () => {
    store.setLook(draft);
    go('home');
  });
}

// ---------- mapa ----------

function stopIndexForKm(km, stops) {
  let i = 0;
  while (i < stops.length - 1 && km >= stops[i + 1].km) i += 1;
  return i;
}

function routeListHtml(state) {
  const stops = ROUTE.stops;
  const youIdx = stopIndexForKm(state.km, stops);
  const youName = state.nick || 'ty';
  const rows = stops
    .map((s, i) => {
      const here = i === youIdx;
      const them = (state.rivals || []).filter((r) => stopIndexForKm(r.km, stops) === i);
      const dolls = [
        here
          ? `<div class="route-doll">${renderAvatar(state.equipped, { size: 52, look: state.look || {} })}<span>${esc(youName)}</span></div>`
          : '',
        ...them.map(
          (r) =>
            `<div class="route-doll them">${renderAvatar(r.eq || {}, { size: 52, look: r.look || {} })}<span>${esc(r.nick || 'ona')}</span></div>`
        ),
      ].join('');
      return `<li class="route-stop ${state.km >= s.km ? 'reached' : ''} ${here ? 'here' : ''}">
        ${landmark(s)}
        <div class="route-copy">
          <div class="name">${esc(s.short || s.name)}</div>
          <div class="km">${s.km} km</div>
        </div>
        <div class="route-people">${dolls}</div>
      </li>`;
    })
    .join('');
  return `<ol class="route-list">${rows}</ol>`;
}

function peopleRow(state, { prompt = false } = {}) {
  const youName = state.nick || 'Ty';
  const you = `<div class="map-person">
    ${renderAvatar(state.equipped, { size: 72, look: state.look || {} })}
    <b>${esc(youName)}</b>
    <span>${state.km} km</span>
  </div>`;
  const them = (state.rivals || [])
    .map(
      (r) => `<div class="map-person them">
      ${renderAvatar(r.eq || {}, { size: 72, look: r.look || {} })}
      <b>${esc(r.nick || 'Koleżanka')}</b>
      <span>${Math.round(r.km)} km</span>
    </div>`
    )
    .join('');
  const empty =
    prompt && !them ? `<p class="tiny">Wklej kod niżej, a jej ludzik stanie tu obok.</p>` : '';
  return `<div class="map-people">${you}${them}${empty}</div>`;
}

function nextStopInfo(state) {
  const next = nextStop(ROUTE, state.km);
  if (!next)
    return `<p class="muted">Koniec narysowanej trasy. Kolejne miasta dosypię z treścią.</p>`;
  const left = next.km - state.km;
  const lessons = Math.ceil(left / LESSON_KM);
  return `<p class="muted">Zostało <b>${left} km</b> do ${esc(next.name)}
    — ${lessons} ${plural(lessons, 'lekcja', 'lekcje', 'lekcji')}.</p>`;
}

function home() {
  refreshModules();
  const state = store.get();
  const wrap = h(`<div class="home-stack"></div>`);

  if (store.backupIsStale()) {
    const b = h(`<div class="banner warn">
      <span class="grow"><b>Dawno nie było kopii.</b> Zapisz postęp, zanim przeglądarka go skasuje.</span>
      <button class="small primary" type="button">Zapisz kopię</button>
    </div>`);
    b.querySelector('button').addEventListener('click', () => go('settings'));
    wrap.appendChild(b);
  }

  const d = speech.diagnosis();
  if (d.level === 'blocked') wrap.appendChild(h(voiceBanner()));

  const who = state.nick || 'Ty';
  const outline = MODULE ? moduleOutline(MODULE, state) : null;
  const emptyMine = MODULE?.id === 'moje' && !(MODULE.translations || []).length;
  const startLabel = emptyMine
    ? 'Dodaj zdanie'
    : !outline
      ? 'Zaczynamy'
      : outline.reviewOnly
        ? 'Zaczynamy powtórkę'
        : 'Zaczynamy';
  const next = nextStop(ROUTE, state.km);
  const missionHint = emptyMine
    ? 'Wpisz zdanie po polsku. Apka przetłumaczy i przeczyta.'
    : outline?.dueCount
      ? `${outline.dueCount} ${plural(outline.dueCount, 'zdanie czeka', 'zdania czekają', 'zdań czeka')} na powtórkę.`
      : next
        ? `Zostało ${next.km - state.km} km do ${next.name}.`
        : 'Koniec narysowanej trasy.';
  const lessonTitle = outline?.current
    ? `Lekcja ${outline.current.n}: ${outline.current.title}`
    : MODULE?.title || 'Lekcja';

  wrap.appendChild(
    h(`<div class="hello">
    <h1>Cześć, ${esc(who)}!</h1>
    <p class="muted">Gotowa na angielski?</p>
  </div>`)
  );

  const mission = h(`<div class="mission">
    <div class="mission-copy">
      <span class="label">Dzisiejsza lekcja</span>
      <h2>${esc(lessonTitle)}</h2>
      <p>${esc(missionHint)}</p>
      <div class="row">
        <button class="primary" type="button" id="start">${esc(startLabel)}</button>
        ${
          outline && outline.dueCount && !outline.reviewOnly
            ? `<button type="button" id="review">Powtórka (${outline.dueCount})</button>`
            : ''
        }
      </div>
    </div>
    <div class="mission-doll">${doll(state.equipped, 132)}</div>
  </div>`);
  mission.querySelector('#start').addEventListener('click', () => {
    if (emptyMine) return go('phrases');
    runLesson({ review: Boolean(outline?.reviewOnly) });
  });
  mission.querySelector('#review')?.addEventListener('click', () => runLesson({ review: true }));
  wrap.appendChild(mission);

  wrap.appendChild(
    h(`<div class="stat-row">
    <div class="stat"><b>${state.km}</b><span>kilometrów</span></div>
    <div class="stat"><b>${state.lessons.length}</b><span>lekcji</span></div>
    <div class="stat"><b>${state.coins}</b><span>monet</span></div>
  </div>`)
  );

  mount(wrap);
}

function lessonRowsHtml(outline) {
  return outline.lessons
    .map((l) => {
      const kind = l.done ? 'done' : outline.current && l.n === outline.current.n ? 'now' : '';
      const mark = l.done ? '✓' : outline.current && l.n === outline.current.n ? '→' : '';
      return `<li class="${kind}"><span class="n">${l.n}</span><span class="t">${esc(l.title)}</span><span class="s">${l.sentences} ${plural(l.sentences, 'zdanie', 'zdania', 'zdań')}</span>${mark ? `<span class="m">${mark}</span>` : ''}</li>`;
    })
    .join('');
}

function moduleDetail(module) {
  const outline = moduleOutline(module);
  const emptyMine = module.id === 'moje' && !(module.translations || []).length;
  const startLabel = emptyMine
    ? 'Dodaj zdanie'
    : !outline
      ? 'Zaczynamy'
      : outline.reviewOnly
        ? 'Zaczynamy powtórkę'
        : 'Zaczynamy';
  const reviewLine = emptyMine
    ? 'Wpisz zdanie po polsku. Apka przetłumaczy i przeczyta.'
    : outline?.dueCount
      ? `${outline.dueCount} ${plural(outline.dueCount, 'zdanie czeka', 'zdania czekają', 'zdań czeka')} na powtórkę.`
      : outline?.reviewOnly
        ? 'Wszystkie lekcje zrobione. Zostaje powtórka.'
        : '';
  const list =
    outline && outline.lessons.length && !emptyMine
      ? `<ol class="lesson-list">${lessonRowsHtml(outline)}</ol>`
      : '';
  const reviewBtn =
    outline && outline.dueCount && !outline.reviewOnly && !emptyMine
      ? `<button type="button" data-review>Powtórka (${outline.dueCount})</button>`
      : '';
  const panel = h(`<div class="mod-panel">
    ${list}
    ${reviewLine ? `<p class="muted review-line">${esc(reviewLine)}</p>` : ''}
    <div class="row">
      <button class="primary" type="button" data-start>${esc(startLabel)}</button>
      ${reviewBtn}
    </div>
  </div>`);
  panel.querySelector('[data-start]')?.addEventListener('click', () => {
    if (emptyMine) return go('phrases');
    runLesson({ review: Boolean(outline?.reviewOnly) });
  });
  panel
    .querySelector('[data-review]')
    ?.addEventListener('click', () => runLesson({ review: true }));
  return panel;
}

function pickModule(id) {
  refreshModules();
  const nextMod = MODULES.find((m) => m.id === id);
  if (!nextMod) return;
  MODULE = nextMod;
  store.setModuleId(nextMod.id);
  go('modules');
  document.querySelector('.mod-block.open')?.scrollIntoView({ block: 'start' });
}

function modules() {
  refreshModules();
  const wrap = h(`<div class="home-stack"></div>`);
  wrap.appendChild(
    h(`<div>
    <span class="label">Nauka</span>
    <h1>Moduły</h1>
    <p class="muted">Kliknij moduł — rozwinie się lista lekcji. Potem Zaczynamy.</p>
  </div>`)
  );
  const list = h(`<div class="mod-list"></div>`);
  for (const m of MODULES) {
    const on = MODULE && m.id === MODULE.id;
    const n = (m.translations || []).length;
    const count =
      m.id === 'moje'
        ? n
          ? `${n} ${plural(n, 'zdanie', 'zdania', 'zdań')}`
          : 'jeszcze pusto'
        : m.subtitle || '';
    const block = h(`<div class="mod-block ${on ? 'open' : ''}"></div>`);
    const btn = h(`<button class="mod-card ${on ? 'on' : ''}" type="button">
      <b>${esc(m.title)}</b>
      <span>${esc(count)}</span>
    </button>`);
    btn.addEventListener('click', () => {
      if (on) return;
      pickModule(m.id);
    });
    block.appendChild(btn);
    if (on) block.appendChild(moduleDetail(m));
    list.appendChild(block);
  }
  wrap.appendChild(list);
  mount(wrap);
}

function fullMap() {
  const state = store.get();
  const wrap = h(`<div class="home-stack"></div>`);
  const card = h(`<div class="card">
    <span class="label">Trasa</span>
    <h1>Mapa</h1>
    ${peopleRow(state, { prompt: true })}
  </div>`);
  card.appendChild(mapRaceForm());
  card.appendChild(h(routeListHtml(state)));
  card.appendChild(h(nextStopInfo(state)));
  wrap.appendChild(card);
  mount(wrap);
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
    <p class="tiny">Pełna wypłata leci nawet w gorszy dzień — liczy się, że usiadłaś.</p>
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
      runLesson({ review: true });
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

function phrases() {
  const wrap = h(`<div class="home-stack"></div>`);
  wrap.appendChild(
    h(`<div class="card">
    <span class="label">Moje zdania</span>
    <h1>Wpisz po polsku</h1>
    <p class="muted">Apka tłumaczy na angielski i czyta to głosem, którego używasz w lekcjach.</p>
    <label class="tiny" for="pl-in">Polski</label>
    <textarea id="pl-in" rows="3" placeholder="np. Nie mam jeszcze komercyjnego Selenium"></textarea>
    <div class="row" style="margin-top:.6rem">
      <button class="primary" type="button" id="do-tr">Przetłumacz i odczytaj</button>
    </div>
    <p class="tiny" id="tr-status" style="margin-top:.5rem"></p>
    <label class="tiny" for="en-out">Angielski</label>
    <textarea id="en-out" rows="3" placeholder="tu wpadnie tłumaczenie" readonly></textarea>
    <div class="row end" style="margin-top:.6rem">
      <button type="button" id="hear" disabled>▶ Posłuchaj jeszcze raz</button>
      <button class="primary" type="button" id="save-ph" disabled>Dodaj do lekcji</button>
    </div>
  </div>`)
  );

  const list = store.get().customPhrases || [];
  if (list.length) {
    const card = h(
      `<div class="card"><span class="label">Już dodane</span><div id="ph-list"></div></div>`
    );
    const box = card.querySelector('#ph-list');
    for (const p of list.slice().reverse()) {
      const row = h(`<div class="phrase-row">
        <div>
          <p class="muted" style="margin:0">${esc(p.pl)}</p>
          <p style="margin:.2rem 0 0">${esc(p.en)}</p>
        </div>
        <button class="small ghost" type="button" data-del="${esc(p.id)}">Usuń</button>
      </div>`);
      box.appendChild(row);
    }
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-del]');
      if (!btn) return;
      store.removeCustomPhrase(btn.getAttribute('data-del'));
      toast('Usunięte.');
      go('phrases');
    });
    wrap.appendChild(card);
  }

  const pl = wrap.querySelector('#pl-in');
  const en = wrap.querySelector('#en-out');
  const status = wrap.querySelector('#tr-status');
  const saveBtn = wrap.querySelector('#save-ph');
  const hearBtn = wrap.querySelector('#hear');
  const trBtn = wrap.querySelector('#do-tr');

  const playEn = () => {
    if (en.value.trim()) speech.speakOnce(en.value.trim(), { rate: 1 });
  };

  trBtn.addEventListener('click', async () => {
    const text = pl.value.trim();
    if (!text) return toast('Najpierw wpisz zdanie po polsku.');
    trBtn.disabled = true;
    status.textContent = 'Tłumaczę…';
    try {
      const translated = await plToEn(text);
      en.value = translated;
      en.readOnly = false;
      saveBtn.disabled = false;
      hearBtn.disabled = false;
      status.textContent = 'Gotowe. Jeśli źle trafiło, popraw angielski i dodaj.';
      playEn();
    } catch {
      status.textContent = 'Nie udało się przetłumaczyć. Sprawdź internet i spróbuj jeszcze raz.';
    }
    trBtn.disabled = false;
  });

  hearBtn.addEventListener('click', playEn);

  saveBtn.addEventListener('click', () => {
    try {
      store.addCustomPhrase({
        pl: pl.value.trim(),
        en: en.value.trim(),
        chunks: chunkEnglish(en.value.trim()),
      });
      toast('Zdanie w lekcjach.');
      store.setModuleId('moje');
      go('home');
    } catch (err) {
      toast(err.message || 'Nie dało się dodać.');
    }
  });

  mount(wrap);
  pl.focus();
}

// ---------- szafa ----------

function wardrobe() {
  const state = store.get();
  const wrap = h(`<div class="home-stack"></div>`);

  wrap.appendChild(
    dressHead(state, {
      label: 'Szafa',
      title: 'Ubierz się',
      hint: 'Górę i dół zakładasz osobno. Kliknij coś założonego, żeby to zdjąć.',
    })
  );

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
        <span class="s">${on ? 'na sobie — kliknij, by zdjąć' : 'założ'}</span>
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
          if (s) s.textContent = worn ? 'na sobie — kliknij, by zdjąć' : 'założ';
        }
      });
      grid.appendChild(btn);
    }
  }
  wrap.appendChild(card);

  mount(wrap);
}

// ---------- ustawienia ----------

function settings() {
  const state = store.get();
  const wrap = h(`<div class="home-stack"></div>`);

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

  const lookCard = h(`<div class="card">
    <span class="label">Ludzik</span>
    <h2>Wygląd</h2>
    <p class="muted">Fryzura, kolor włosów i oczy.</p>
    <div class="row"><button type="button" id="edit-look">Zmień wygląd</button></div>
  </div>`);
  lookCard.querySelector('#edit-look').addEventListener('click', () => go('look'));
  wrap.appendChild(lookCard);

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
      <p class="tiny" style="margin:.6rem 0">Wklej treść kopii i kliknij Wczytaj. To nadpisze obecny postęp.</p>
      <textarea id="imp" rows="4" placeholder="wklej tutaj…"></textarea>
      <div class="row end" style="margin-top:.6rem"><button type="button" id="do-imp">Wczytaj</button></div>
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
