// Ekrany: wybór głosu, mapa, podsumowanie lekcji, skrzynka, przystanki, sklep, szafa, ustawienia.
import { esc, h, mount, refreshCounters, plural, toast } from './ui.js';
import * as store from './store.js';
import * as speech from './speech.js';
import { renderAvatar, withItem, HAIR_COLORS, EYE_COLORS, HAIR_STYLES } from './avatar.js';
import { startLesson } from './lesson.js';
import { nextPattern, LESSON_KM, nextStop, formatMinutes } from './scheduler.js';

let MODULE = null;
let ROUTE = null;

export function boot({ module, route }) {
  MODULE = module;
  ROUTE = route;
  document.getElementById('btn-home').addEventListener('click', () => go('map'));
  document.getElementById('btn-settings').addEventListener('click', () => go('settings'));
  const brand = document.getElementById('btn-brand');
  if (brand) brand.addEventListener('click', () => go('home'));
  const state = store.get();
  refreshCounters(state);
  if (!state.voiceName) go('onboarding');
  else if (!state.look?.done) go('look');
  else go('home');
}

export function go(screen, params = {}) {
  speech.cancel();
  refreshCounters(store.get());
  const screens = {
    onboarding,
    look,
    home,
    map: fullMap,
    settings,
    shop,
    wardrobe,
    summary,
    arrival,
  };
  (screens[screen] || home)(params);
}

const itemById = (id) => (ROUTE.items || []).find((i) => i.id === id);
const stopById = (id) => (ROUTE.stops || []).find((s) => s.id === id);

function doll(equipped, size) {
  return renderAvatar(equipped, { size, look: store.get().look });
}

function backHome() {
  const nav = h(`<div class="row"><button class="link" type="button">← Strona główna</button></div>`);
  nav.querySelector('button').addEventListener('click', () => go('home'));
  return nav;
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

function sliceRange(state, full) {
  const stops = ROUTE.stops;
  if (full || stops.length <= 2) {
    return { stops, fromKm: 0, toKm: Math.max(...stops.map((s) => s.km), 1) };
  }
  let i = 0;
  while (i < stops.length - 1 && state.km >= stops[i + 1].km) i += 1;
  const from = i >= stops.length - 1 ? Math.max(0, stops.length - 2) : i;
  const to = Math.min(stops.length - 1, from + 1);
  const slice = stops.slice(from, to + 1);
  const fromKm = slice[0].km;
  const toKm = Math.max(slice[slice.length - 1].km, fromKm + 1);
  return { stops: slice, fromKm, toKm };
}

function trackHtml(state, { full = false } = {}) {
  const { stops, fromKm, toKm } = sliceRange(state, full);
  const span = toKm - fromKm || 1;
  const pos = Math.min(Math.max(state.km, fromKm), toKm);
  const pct = (km) => `${((km - fromKm) / span) * 100}%`;

  const dots = stops
    .map(
      (s) => `
    <div class="stop ${state.km >= s.km ? 'reached' : ''}" style="left:${pct(s.km)}">
      ${landmark(s)}
      <div class="name">${esc(full ? s.name : s.short || s.name)}</div>
      <div class="km">${s.km} km</div>
    </div>`
    )
    .join('');

  return `
    <div class="track ${full ? 'full' : 'slice'}">
      <div class="track-inner">
        <div class="track-line"></div>
        <div class="track-fill" style="width:${pct(pos)}"></div>
        <div class="track-label" style="left:${pct(pos)}">${state.km} km</div>
        <div class="track-dot" style="left:${pct(pos)}" aria-hidden="true"></div>
        <div class="stops">${dots}</div>
      </div>
    </div>`;
}

function nextStopInfo(state) {
  const next = nextStop(ROUTE, state.km);
  if (!next)
    return `<p class="muted">Cała trasa prototypu zaliczona. Kolejne miasta dosypię z treścią.</p>`;
  const left = next.km - state.km;
  const lessons = Math.ceil(left / LESSON_KM);
  return `<p class="muted">Zostało <b>${left} km</b> do ${esc(next.name)}
    — ${lessons} ${plural(lessons, 'lekcja', 'lekcje', 'lekcji')}.</p>`;
}

function home() {
  const state = store.get();
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);

  if (store.backupIsStale()) {
    const b = h(`<div class="banner warn">
      <span class="grow"><b>Zrób kopię postępu.</b> Wyczyszczenie danych przeglądarki skasuje całą trasę i szafę.</span>
      <button class="small" type="button">Ustawienia</button>
    </div>`);
    b.querySelector('button').addEventListener('click', () => go('settings'));
    wrap.appendChild(b);
  }

  const d = speech.diagnosis();
  if (d.level === 'blocked') wrap.appendChild(h(voiceBanner()));

  const maxKm = Math.max(...ROUTE.stops.map((s) => s.km));
  wrap.appendChild(
    h(`<div class="map">
    <div>
      <div class="row between" style="align-items:baseline">
        <span class="label">Trasa</span>
        <span class="label">${state.km} / ${maxKm} km</span>
      </div>
      ${trackHtml(state)}
      ${nextStopInfo(state)}
    </div>
    <div class="doll-frame">${doll(state.equipped, 106)}</div>
  </div>`)
  );

  const focus = nextPattern(MODULE, state);
  const focusText = focus
    ? `Nowy wzorzec w tej lekcji: <b>${esc(MODULE.patterns[focus])}</b>.`
    : 'Nowych wzorców nie ma — to będzie lekcja powtórkowa.';

  const startCard = h(`<div class="card">
    <span class="label">${esc(MODULE.title)}</span>
    <h1>Lekcja: 15 zdań</h1>
    <p class="muted">${focusText}</p>
    <div class="row">
      <button class="primary" type="button" id="start">Zacznij lekcję</button>
      <button type="button" id="to-wardrobe">Szafa</button>
      <button type="button" id="to-shop">Sklep</button>
    </div>
  </div>`);
  startCard.querySelector('#start').addEventListener('click', () => {
    startLesson({
      module: MODULE,
      onFinish: (res) => (res.aborted ? go('home') : go('summary', res)),
    });
  });
  startCard.querySelector('#to-wardrobe').addEventListener('click', () => go('wardrobe'));
  startCard.querySelector('#to-shop').addEventListener('click', () => go('shop'));
  wrap.appendChild(startCard);

  const next = nextStop(ROUTE, state.km);
  const left = next ? `${next.km - state.km} km do ${next.name}` : 'koniec trasy';
  wrap.appendChild(
    h(`<div class="card flat">
    <span class="label">Co umiesz już powiedzieć</span>
    <div class="facts">
      <div class="fact"><span>zrobione lekcje</span><b>${state.lessons.length}</b></div>
      <div class="fact"><span>czas łącznie</span><b>${esc(formatMinutes(state.learnedSeconds))}</b></div>
      <div class="fact"><span>do następnej stacji</span><b>${esc(left)}</b></div>
    </div>
  </div>`)
  );

  mount(wrap);
}

function fullMap() {
  const state = store.get();
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);
  wrap.appendChild(backHome());
  wrap.appendChild(
    h(`<div class="card">
    <span class="label">Cała trasa</span>
    <h1>Mapa</h1>
    ${trackHtml(state, { full: true })}
    ${nextStopInfo(state)}
  </div>`)
  );
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

  if (pool.length && Math.random() < 0.3) {
    const id = pool[Math.floor(Math.random() * pool.length)];
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
  } else {
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
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);

  wrap.appendChild(backHome());
  wrap.appendChild(
    h(`<div class="card flat">
    <span class="label">Masz ${state.coins} ${plural(state.coins, 'monetę', 'monety', 'monet')}</span>
    <h1>Sklep</h1>
    <p class="muted">Kupujesz tylko tam, gdzie już dotarłaś. Monety nie ruszają Twoich kilometrów —
      to dwa osobne liczniki.</p>
  </div>`)
  );

  if (!reached.length) {
    wrap.appendChild(
      h(`<div class="card"><p class="muted">Jeszcze nigdzie nie dotarłaś.
      Pierwszy stragan czeka na ${ROUTE.stops[1]?.km ?? 25} km.</p></div>`)
    );
  }

  for (const stop of reached) {
    const card = h(`<div class="card">
      <span class="label">${stop.km} km</span>
      <h2>${esc(stop.name)}</h2>
      <div class="grid"></div>
    </div>`);
    const grid = card.querySelector('.grid');

    for (const id of stockOf(stop)) {
      const item = itemById(id);
      if (!item) continue;
      const owned = store.owns(id);
      const afford = state.coins >= item.price;
      const thing = h(`<div class="thing ${owned ? 'on' : ''}">
        <div style="display:flex;justify-content:center">${doll(withItem(state.equipped, item), 76)}</div>
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
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);

  wrap.appendChild(backHome());
  wrap.appendChild(
    h(`<div class="map">
    <div>
      <span class="label">Szafa</span>
      <h1 style="margin-top:.3rem">Ubierz się</h1>
      <p class="muted">Sukienka zdejmuje górę i dół. Kliknij coś założonego, żeby to zdjąć.</p>
    </div>
    <div class="doll-frame">${doll(state.equipped, 118)}</div>
  </div>`)
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
        h(`<button class="thing ${on ? 'on' : ''}" type="button" style="align-items:center;text-align:center">
        ${doll(withItem(state.equipped, item), 76)}
        <span class="n">${esc(item.name)}</span>
        <span class="s">${on ? 'na sobie — kliknij, by zdjąć' : 'założ'}</span>
      </button>`);
      btn.addEventListener('click', () => {
        if (on) store.unequip(item.slot);
        else store.equip(item);
        go('wardrobe');
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
  const wrap = h(`<div style="display:flex;flex-direction:column;gap:1.25rem"></div>`);
  wrap.appendChild(backHome());

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
    <div class="row">
      <button class="primary" type="button" id="dl">Zapisz kopię do pliku</button>
      <button type="button" id="cp">Skopiuj do schowka</button>
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
    a.download = `lumio-postep-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    store.markBackedUp();
    toast('Kopia zapisana.');
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
