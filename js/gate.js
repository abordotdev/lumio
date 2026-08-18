// Shared passphrase for the live site. Empty hash = no gate (localhost / until you pick a password).
export const GATE_HASH = '3576b40f66a3c0c17fc665c411cf35c570382c163505b05b790a8f7df843ead3';

export async function digest(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function gateRequired() {
  if (!GATE_HASH) return false;
  const host = location.hostname;
  if (['localhost', '127.0.0.1', ''].includes(host)) return false;
  return true;
}

export async function isUnlocked() {
  if (!gateRequired()) return true;
  return sessionStorage.getItem('lumio.gate') === GATE_HASH;
}

export async function tryUnlock(password) {
  const hash = await digest(String(password || ''));
  if (hash !== GATE_HASH) return false;
  sessionStorage.setItem('lumio.gate', hash);
  return true;
}
