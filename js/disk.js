// Dwie kopie na dysku: bieżąca i poprzednia. Folder wybierasz raz.
import * as store from './store.js';

const DB = 'lumio-disk';
const STORE = 'handles';
const CURRENT = 'lumio-biezaca.json';
const PREV = 'lumio-poprzednia.json';

export function supported() {
  return typeof window.showDirectoryPicker === 'function';
}

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveHandle(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(handle, 'folder');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function loadHandle() {
  try {
    const db = await openDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get('folder');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return handle || null;
  } catch {
    return null;
  }
}

export async function hasFolder() {
  return Boolean(await loadHandle());
}

async function writeFile(dir, name, text) {
  const file = await dir.getFileHandle(name, { create: true });
  const w = await file.createWritable();
  await w.write(text);
  await w.close();
}

async function readFile(dir, name) {
  const file = await dir.getFileHandle(name);
  return (await file.getFile()).text();
}

export async function pickFolder() {
  const dir = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'documents' });
  await saveHandle(dir);
  await writePair();
  return true;
}

export async function writePair() {
  const dir = await loadHandle();
  if (!dir) return false;
  if ((await dir.requestPermission({ mode: 'readwrite' })) !== 'granted') return false;
  let previous = '';
  try {
    previous = await readFile(dir, CURRENT);
  } catch {
    previous = '';
  }
  if (previous) await writeFile(dir, PREV, previous);
  await writeFile(dir, CURRENT, store.exportText());
  store.markBackedUp();
  return true;
}

export async function writePairQuiet() {
  try {
    return await writePair();
  } catch {
    return false;
  }
}
