// Drobne narzędzia do składania ekranów.

export function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function frag(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return t.content;
}

const app = () => document.getElementById('app');

export function mount(...nodes) {
  const root = app();
  root.replaceChildren(...nodes.filter(Boolean));
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  return root;
}

const PALETTE_THEME = { forest: '#2C6753', lilac: '#AC6D77' };

export function applyPalette(id) {
  const palette = id === 'lilac' ? 'lilac' : 'forest';
  document.documentElement.dataset.palette = palette;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', PALETTE_THEME[palette]);
}

export function markNav(screen) {
  const key = {
    home: 'home',
    modules: 'modules',
    phrases: 'modules',
    map: 'map',
    wardrobe: 'wardrobe',
    shop: 'shop',
    settings: 'settings',
    look: 'settings',
  }[screen];
  for (const btn of document.querySelectorAll('[data-go]')) {
    btn.classList.toggle('on', key && btn.getAttribute('data-go') === key);
  }
}

export function refreshCounters(state) {
  const km = document.getElementById('c-km');
  const coins = document.getElementById('c-coins');
  if (km) km.textContent = `${state.km} km`;
  if (coins) coins.textContent = `${state.coins} monet`;
  const who = document.getElementById('nav-who');
  if (who) who.textContent = state.nick || 'Ty';
}

export function plural(n, one, few, many) {
  const abs = Math.abs(n);
  if (abs === 1) return one;
  const last = abs % 10;
  const lastTwo = abs % 100;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return few;
  return many;
}

let toastTimer = null;
export function toast(message) {
  let node = document.getElementById('toast');
  if (!node) {
    node = h(`<div id="toast" role="status" style="
      position:fixed;left:50%;bottom:calc(1.5rem + env(safe-area-inset-bottom, 0px));transform:translateX(-50%);
      background:var(--ink);color:var(--bg);padding:.6rem 1rem;border-radius:8px;
      font-size:.92rem;z-index:60;max-width:90vw;text-align:center"></div>`);
    document.body.appendChild(node);
  }
  node.textContent = message;
  node.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.style.display = 'none';
  }, 2600);
}

export function shuffle(list, seed = 1) {
  // Powtarzalne tasowanie — ten sam zestaw kafelków przy powrocie do zdania.
  const out = [...list];
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function seedFrom(text) {
  let s = 7;
  for (let i = 0; i < text.length; i += 1) s = (s * 31 + text.charCodeAt(i)) & 0x7fffffff;
  return s || 7;
}

export function pick(list, rnd = Math.random) {
  return list[Math.floor(rnd() * list.length)];
}
