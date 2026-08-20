// Przebieg jednej lekcji: prompt → odpowiedź → ocena → shadowing → dalej.
import { esc, h, mount, shuffle, seedFrom, toast } from './ui.js';
import { grade } from './grade.js';
import * as speech from './speech.js';
import * as store from './store.js';
import { buildLesson, buildReview, buildComeback, payout, LESSON_MAX_ITEMS } from './scheduler.js';
import { formHint, tileBank, usesTenseTiles } from './forms.js';

const KIND_LABEL = {
  tiles: 'Ułóż z kafelków',
  translate: 'Przetłumacz i powiedz na głos',
  dictate: 'Dyktando — zapisz, co słyszysz',
  situation: 'Sytuacja — powiedz to po angielsku',
};

const MAX_STEPS = 10;
const MAX_REQUEUE = 5;

export function startLesson({
  module,
  modules,
  onFinish,
  review = false,
  comeback = false,
  ids = null,
}) {
  const state = store.get();
  const wszystkie = modules && modules.length ? modules : [module];
  let built;
  if (comeback) built = buildComeback(wszystkie);
  else if (review) built = buildReview(wszystkie);
  else built = buildLesson(module, state, { ids });
  const { steps, focus } = built;

  if (!steps.length) {
    toast(
      built.review
        ? 'Nie ma jeszcze zdań do powtórki. Najpierw zrób lekcję.'
        : 'Na dziś nie ma nic nowego.'
    );
    onFinish({ aborted: true });
    return;
  }

  const session = {
    steps,
    index: 0,
    requeued: 0,
    correct: 0,
    answered: 0,
    startedAt: Date.now(),
    log: [],
    focus,
    review: Boolean(built.review),
  };

  renderStep(session, module, onFinish);
}

function elapsed(session) {
  return Date.now() - session.startedAt;
}

function progressDots(session) {
  const total = Math.min(session.steps.length, MAX_STEPS);
  let html = '';
  for (let i = 0; i < total; i += 1) {
    const rec = session.log[i];
    const cls = rec ? (rec.correct ? 'done' : 'miss') : i === session.index ? 'now' : '';
    html += `<i class="${cls}"></i>`;
  }
  return `<div class="dots" aria-hidden="true">${html}</div>`;
}

function header(session) {
  return `
    <div class="card flat" style="gap:.6rem">
      ${progressDots(session)}
      <div class="row between">
        <span class="label">${session.index + 1} z ${Math.min(session.steps.length, MAX_STEPS)}</span>
      </div>
    </div>`;
}

let currentShadow = null;
let enterToNext = null;

function clearEnterToNext() {
  if (!enterToNext) return;
  document.removeEventListener('keydown', enterToNext);
  enterToNext = null;
}

function renderStep(session, module, onFinish) {
  if (currentShadow) currentShadow.stop();
  speech.cancel();
  clearEnterToNext();

  if (session.index >= session.steps.length || session.index >= MAX_STEPS) {
    return finish(session, module, onFinish, 'materiał');
  }

  const step = session.steps[session.index];
  const wrap = h(
    `<div class="lekcja-krok" style="display:flex;flex-direction:column;gap:1.25rem"></div>`
  );
  wrap.appendChild(h(header(session)));

  const card = h(`<div class="card"></div>`);
  card.appendChild(h(`<span class="label">${esc(KIND_LABEL[step.kind])}</span>`));
  wrap.appendChild(card);

  if (step.kind === 'tiles') renderTiles(step, card, session, module, onFinish);
  else if (step.kind === 'dictate') renderDictate(step, card, session, module, onFinish);
  else if (step.kind === 'situation') renderSituation(step, card, session, module, onFinish);
  else renderTyped(step, card, session, module, onFinish);

  const quit = h(
    `<div class="row end"><button class="link" type="button">Przerwij lekcję</button></div>`
  );
  quit.querySelector('button').addEventListener('click', () => {
    if (currentShadow) currentShadow.stop();
    speech.cancel();
    if (session.answered === 0) return onFinish({ aborted: true });
    finish(session, module, onFinish, 'przerwane');
  });
  wrap.appendChild(quit);

  mount(wrap);
}

// ---------- typy ćwiczeń ----------

function renderTyped(step, card, session, module, onFinish) {
  const item = step.item;

  card.appendChild(h(`<p class="prompt-pl">${esc(item.pl)}</p>`));
  if (item.hint) card.appendChild(h(`<span class="prompt-hint">${esc(item.hint)}</span>`));

  const ta = h(`<textarea rows="2" spellcheck="false" autocapitalize="off" autocomplete="off"
    aria-label="Twoja odpowiedź po angielsku" placeholder="po angielsku…"></textarea>`);
  const btn = h(`<button class="primary" type="button">Sprawdź</button>`);
  card.appendChild(ta);
  card.appendChild(h(`<div class="row end"></div>`)).appendChild(btn);

  const submit = () => {
    const answer = ta.value;
    if (!answer.trim()) {
      ta.focus();
      return;
    }
    showResult({ step, card, session, module, onFinish, answer });
  };
  btn.addEventListener('click', submit);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  setTimeout(() => ta.focus(), 30);
}

// Sytuacja zamiast polskiego zdania. Nie ma czego tłumaczyć — formę wybierasz sama.
// To jest ten szczebel między „przetłumacz zdanie" a „mów", którego brakowało.
function renderSituation(step, card, session, module, onFinish) {
  const item = step.item;

  card.appendChild(h(`<p class="situation">${esc(item.situation)}</p>`));
  card.appendChild(
    h(`<p class="tiny">Bez polskiego zdania. Powiedz to po swojemu, po angielsku.</p>`)
  );

  const ta = h(`<textarea rows="2" spellcheck="false" autocapitalize="off" autocomplete="off"
    aria-label="Twoja odpowiedź po angielsku" placeholder="po angielsku…"></textarea>`);
  const btn = h(`<button class="primary" type="button">Sprawdź</button>`);
  card.appendChild(ta);
  card.appendChild(h(`<div class="row end"></div>`)).appendChild(btn);

  const submit = () => {
    if (!ta.value.trim()) {
      ta.focus();
      return;
    }
    showResult({ step, card, session, module, onFinish, answer: ta.value });
  };
  btn.addEventListener('click', submit);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });
  setTimeout(() => ta.focus(), 30);
}

function renderDictate(step, card, session, module, onFinish) {
  const item = step.item;
  card.appendChild(
    h(`<p class="muted">Bez polskiego. Posłuchaj i zapisz dokładnie to, co usłyszałaś.</p>`)
  );

  const controls = h(`<div class="row">
    <button class="primary" type="button" data-a="normal">▶ Odtwórz</button>
    <button type="button" data-a="slow">▶ Wolniej, z pauzami</button>
  </div>`);
  controls.querySelector('[data-a="normal"]').addEventListener('click', () => {
    speech.speakOnce(item.en, { rate: 1 });
  });
  controls.querySelector('[data-a="slow"]').addEventListener('click', () => {
    speech.speakChunks(item.chunks || [item.en], { rate: 0.92, gapMs: 520 });
  });
  card.appendChild(controls);

  const ta = h(`<textarea rows="2" spellcheck="false" autocapitalize="off" autocomplete="off"
    aria-label="Zapisz, co usłyszałaś" placeholder="zapisz, co słyszysz…"></textarea>`);
  const btn = h(`<button class="primary" type="button">Sprawdź</button>`);
  card.appendChild(ta);
  card.appendChild(h(`<div class="row end"></div>`)).appendChild(btn);

  const submit = () => {
    if (!ta.value.trim()) {
      ta.focus();
      return;
    }
    showResult({ step, card, session, module, onFinish, answer: ta.value });
  };
  btn.addEventListener('click', submit);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  });

  setTimeout(() => {
    speech.speakOnce(item.en, { rate: 1 });
    ta.focus();
  }, 250);
}

function renderTiles(step, card, session, module, onFinish) {
  const item = step.item;
  // Zdanie z powtórki może pochodzić z innego modułu — rywalizujące kafelki
  // muszą przyjść z jego własnego modułu, nie z otwartego.
  const bankTiles = shuffle(tileBank(item, step.mod || module), seedFrom(item.id + 'x'));

  card.appendChild(h(`<p class="prompt-pl">${esc(item.pl)}</p>`));
  if (item.hint) card.appendChild(h(`<span class="prompt-hint">${esc(item.hint)}</span>`));
  const bankHint = usesTenseTiles(item)
    ? `Wybierz właściwą formę czasownika — w banku są też złe czasy
    (tested / testing / have been testing). Złóż zdanie.`
    : `W banku są też zbędne kawałki. Złóż właściwe zdanie.`;
  card.appendChild(h(`<p class="tiny">${bankHint}</p>`));

  const slot = h(`<div class="tile-slot" aria-label="Twoje zdanie"></div>`);
  const bank = h(`<div class="tile-bank"></div>`);
  card.appendChild(slot);
  card.appendChild(bank);

  const btn = h(`<button class="primary" type="button" disabled>Sprawdź</button>`);
  card.appendChild(h(`<div class="row end"></div>`)).appendChild(btn);

  const sync = () => {
    btn.disabled = slot.children.length === 0;
  };

  const makeTile = (text, where) => {
    const t = h(`<button class="tile" type="button">${esc(text)}</button>`);
    t.addEventListener('click', () => {
      t.remove();
      const target = where === 'bank' ? slot : bank;
      const moved = makeTile(text, where === 'bank' ? 'slot' : 'bank');
      target.appendChild(moved);
      sync();
    });
    return t;
  };

  for (const text of bankTiles) bank.appendChild(makeTile(text, 'bank'));

  btn.addEventListener('click', () => {
    const answer = [...slot.children].map((c) => c.textContent).join(' ');
    showResult({ step, card, session, module, onFinish, answer });
  });
}

// ---------- ocena ----------

function highlightTypos(sentence, pairs) {
  const keys = new Set((pairs || []).map((p) => p.mine.toLowerCase()).filter(Boolean));
  if (!keys.size) return esc(sentence);
  return sentence
    .split(/(\s+)/)
    .map((tok) => {
      if (!tok || /^\s+$/.test(tok)) return tok;
      const core = tok.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '');
      if (keys.has(core.toLowerCase())) return `<mark class="typo-mark">${esc(tok)}</mark>`;
      return esc(tok);
    })
    .join('');
}

function markTypoInPlace(card, answer, pairs) {
  if (!pairs?.length) return;
  const ta = card.querySelector('textarea');
  if (ta) {
    ta.replaceWith(h(`<p class="typed-replay">${highlightTypos(answer.trim(), pairs)}</p>`));
  }
  const keys = pairs.map((p) => p.mine.toLowerCase());
  card.querySelectorAll('.tile-slot .tile').forEach((tile) => {
    const w = tile.textContent.trim().toLowerCase();
    if (keys.includes(w)) tile.classList.add('is-typo');
  });
}

function diffLine(tag, parts, cls) {
  const words = parts
    .map((p) => {
      if (p.t === 'same') return esc(p.w);
      if (p.t === 'typo') return `<span class="typo">${esc(p.w)}</span>`;
      return `<span class="${cls}">${esc(p.w)}</span>`;
    })
    .join(' ');
  return `<span class="line"><span class="tag">${tag}</span>${words}</span>`;
}

function showResult({ step, card, session, module, onFinish, answer }) {
  const item = step.item;
  const result = grade(item, answer);
  let correct = result.correct;

  // Zablokuj wejście — od tej chwili tylko odsłuch i „dalej".
  card.querySelectorAll('textarea, .tile, button').forEach((el) => {
    el.disabled = true;
  });
  card.querySelectorAll('.row.end').forEach((el) => el.remove());

  const panel = h(`<div class="verdict ${correct ? 'good' : 'bad'}"></div>`);

  const heads = {
    exact: 'Dobrze',
    variant: 'Dobrze — ale zapamiętaj wzorzec',
    typo: 'Dobrze, tylko literówka',
    trap: 'Nie tak',
    wrong: 'Nie tak',
  };
  panel.appendChild(h(`<span class="head">${esc(heads[result.verdict])}</span>`));

  if (result.verdict === 'variant') {
    panel.appendChild(h(`<p class="muted">Zrozumieją Cię. Ale naturalniej mówi się tak:</p>`));
    panel.appendChild(h(`<p class="pattern-answer">${esc(result.canonical)}</p>`));
  } else if (result.verdict === 'typo') {
    const pairs = result.typos || [];
    markTypoInPlace(card, answer, pairs);
    panel.appendChild(h(`<p class="muted">Konstrukcja dobra, tylko literówka w słowie:</p>`));
    if (pairs.length) {
      panel.appendChild(
        h(
          `<p class="typo-fix">${pairs
            .map((p) => `<mark class="typo-mark">${esc(p.mine)}</mark> → <b>${esc(p.want)}</b>`)
            .join('<br>')}</p>`
        )
      );
    } else if (result.diff) {
      panel.appendChild(
        h(`<div class="diff">
        ${diffLine('Twoja', result.diff.mine, 'extra')}
        ${diffLine('Wzorzec', result.diff.want, 'missing')}
      </div>`)
      );
    }
  } else if (result.verdict === 'exact') {
    panel.appendChild(h(`<p class="pattern-answer">${esc(result.canonical)}</p>`));
  } else {
    if (result.diff) {
      panel.appendChild(
        h(`<div class="diff">
        ${diffLine('Twoja', result.diff.mine, 'extra')}
        ${diffLine('Wzorzec', result.diff.want, 'missing')}
      </div>`)
      );
    }
  }

  const hint = formHint(answer, item);
  const showNote =
    Boolean(item.note) &&
    (step.kind === 'dictate' ||
      !correct ||
      step.isNew ||
      result.verdict === 'exact' ||
      result.verdict === 'typo');
  let tip = '';
  if (!correct) tip = hint || result.why || (showNote ? item.note : '');
  else if (showNote) tip = item.note;
  if (tip) panel.appendChild(h(`<p class="why">${esc(tip)}</p>`));
  // Przy dyktandzie i przy sytuacji polskiego nie było widać — pokazujemy je dopiero teraz,
  // żeby dało się zobaczyć, czemu ta forma pasowała.
  if ((step.kind === 'dictate' || step.kind === 'situation') && item.pl) {
    panel.appendChild(h(`<p class="muted">Po polsku: <b>${esc(item.pl)}</b></p>`));
  }
  // Podpowiedź, jak to przeczytać po polsku (np. „I have to" → „aj hew tu").
  if (item.wym) {
    panel.appendChild(h(`<p class="wymowa">Czytaj: <b>${esc(item.wym)}</b></p>`));
  }

  card.appendChild(panel);

  // Echo budujemy teraz, ale pokazujemy niżej — przycisk „Dalej" ma być tuż pod wynikiem.
  const shadow = buildShadow(item);
  currentShadow = shadow;

  // „Dalej" zaraz pod wynikiem, żeby nie scrollować na sam dół karty.
  const next = h(`<div class="row end">
    <button class="primary" type="button" id="btn-next">Dalej →</button>
  </div>`);
  const nextBtn = next.querySelector('#btn-next');
  nextBtn.addEventListener('click', () => {
    clearEnterToNext();
    shadow.stop();
    session.index += 1;
    renderStep(session, module, onFinish);
  });
  card.appendChild(next);

  // Przyciski zgłoszeń — Twoja lista poprawek do korpusu.
  const reports = h(`<div class="row"></div>`);
  if (!correct) {
    const alsoOk = h(`<button class="small" type="button">To też jest poprawne</button>`);
    alsoOk.addEventListener('click', () => {
      store.report(item.id, 'also-correct', answer);
      alsoOk.disabled = true;
      if (!correct) {
        correct = true;
        session.log[session.index] = { id: item.id, correct: true };
        session.correct += 1;
        store.recordAnswer(item.id, true);
        panel.classList.remove('bad');
        panel.classList.add('good');
        panel.querySelector('.head').textContent = 'Zapisane jako poprawne';
      }
      toast('Zapisane. Wrzucę to do poprawek modułu.');
    });
    reports.appendChild(alsoOk);
  }
  const weird = h(`<button class="small" type="button">To brzmi dziwnie</button>`);
  weird.addEventListener('click', () => {
    store.report(item.id, 'weird', item.en);
    weird.disabled = true;
    toast('Zapisane. Sprawdzę to zdanie.');
  });
  reports.appendChild(weird);
  card.appendChild(reports);

  // Zapis wyniku.
  session.answered += 1;
  session.log[session.index] = { id: item.id, correct };
  if (correct) session.correct += 1;
  store.recordAnswer(item.id, correct);

  // Źle → to samo zdanie wraca w innym rodzaju ćwiczenia.
  if (!correct && session.requeued < MAX_REQUEUE && session.steps.length < MAX_STEPS + 4) {
    const kinds = ['tiles', 'translate', 'dictate'];
    let nextKind = kinds[(kinds.indexOf(step.kind) + 1) % kinds.length];
    // Bez polskiego (reakcje, dyktanda) kafelki i tłumaczenie nie mają z czego wyjść —
    // taki wpis wraca na słuch.
    if (!item.pl) nextKind = 'dictate';
    session.steps.push({ ...step, kind: nextKind, isNew: false });
    session.requeued += 1;
  }

  // Echo (powtórz na głos) — pod przyciskami, opcjonalne.
  card.appendChild(shadow.node);

  enterToNext = (e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    nextBtn.click();
  };
  setTimeout(() => document.addEventListener('keydown', enterToNext), 280);

  shadow.run();
}

// ---------- shadowing ----------

function buildShadow(item) {
  const chunks = item.chunks && item.chunks.length ? item.chunks : [item.en];
  let aborted = false;

  const node = h(`<div class="shadow-box">
    <span class="label">Teraz na głos</span>
    <div class="chunks" id="sh-chunks">${chunks.map((c) => `<span>${esc(c)}</span>`).join('')}</div>
    <div class="shadow-steps">
      <div class="shadow-step" data-s="0">
        <span class="n">1</span>
        <span class="what"><b>Wolno, z pauzami</b><small>mów RAZEM z nagraniem</small></span>
        <button class="small ghost" type="button">▶</button>
      </div>
      <div class="shadow-step" data-s="1">
        <span class="n">2</span>
        <span class="what"><b>Normalne tempo</b><small>posłuchaj całości</small></span>
        <button class="small ghost" type="button">▶</button>
      </div>
      <div class="shadow-step" data-s="2">
        <span class="n">3</span>
        <span class="what"><b>Teraz Ty</b><small>4 sekundy — powiedz sama</small></span>
        <button class="small ghost" type="button">▶</button>
      </div>
    </div>
  </div>`);

  const chunkEls = [...node.querySelectorAll('#sh-chunks span')];
  const stepEls = [...node.querySelectorAll('.shadow-step')];

  const setActive = (i) => {
    stepEls.forEach((el, k) => {
      el.classList.toggle('active', k === i);
      el.classList.toggle('done', i > k);
    });
  };
  const lightChunks = (i) => {
    chunkEls.forEach((el, k) => el.classList.toggle('lit', k === i));
  };
  const clearChunks = () => chunkEls.forEach((el) => el.classList.remove('lit', 'fading'));

  const sayAlone = async () => {
    chunkEls.forEach((el) => el.classList.add('lit'));
    const ok = await speech.waitCancellable(4000);
    clearChunks();
    return ok;
  };

  const passes = [
    () =>
      speech.speakChunks(chunks, {
        rate: 0.92,
        gapMs: 520,
        onChunk: (i) => (i < 0 ? clearChunks() : lightChunks(i)),
      }),
    () => speech.speakOnce(item.en, { rate: 1 }),
    sayAlone,
  ];

  const stop = () => {
    aborted = true;
    speech.cancel();
  };

  stepEls.forEach((el, i) => {
    el.querySelector('button').addEventListener('click', async () => {
      if (aborted) return;
      setActive(i);
      await passes[i]();
      clearChunks();
      setActive(-1);
    });
  });

  const run = async () => {
    if (!speech.supported() || !speech.currentVoice()) {
      node.appendChild(
        h(`<p class="tiny">Brak wybranego głosu — wejdź w Ustawienia i wybierz jeden,
        inaczej shadowing nie zadziała.</p>`)
      );
      return;
    }
    for (let i = 0; i < passes.length; i += 1) {
      if (aborted) return;
      setActive(i);
      await passes[i]();
      if (aborted) return;
      await speech.waitCancellable(260);
    }
    clearChunks();
    setActive(-1);
  };

  return { node, run, stop };
}

// ---------- koniec lekcji ----------

function finish(session, module, onFinish, reason) {
  if (currentShadow) currentShadow.stop();
  speech.cancel();
  clearEnterToNext();
  const count = session.answered;
  if (count === 0) return onFinish({ aborted: true });

  const seconds = Math.round(elapsed(session) / 1000);
  const { km, coins } = payout({
    answered: count,
    target: Math.min(session.steps.length, MAX_STEPS),
    review: session.review,
    aborted: reason === 'przerwane',
  });
  store.addLesson({ count, correct: session.correct, km, coins, seconds });
  if (session.focus) {
    const left = module.translations.filter(
      (t) => t.pattern === session.focus && !store.itemState(t.id).introduced
    );
    if (!left.length) store.markPatternIntroduced(module.id, session.focus);
  }
  onFinish({
    count,
    correct: session.correct,
    km,
    coins,
    reason,
    seconds,
  });
}

export { LESSON_MAX_ITEMS };
