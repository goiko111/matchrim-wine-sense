import { useEffect, useState } from 'react';

// 133: a saved scan kept no picture unless the catalogue had one, so most of the cellar showed
// "Sin foto". The bottle crop the person photographed is kept as a small thumbnail on this device
// only (IndexedDB, never uploaded, never catalogue evidence) and shown for that saved wine.
const DB_NAME = 'matchrim-own-photos133';
const STORE = 'thumbnails';
const MAX_SIDE = 360;
const MAX_ENTRIES = 400;

const openDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('NO_INDEXEDDB')); return; }
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => { request.result.createObjectStore(STORE); };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const run = async <T,>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) => {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
};

export const makeOwnThumbnail133 = (dataUrl: string) => new Promise<string | null>(resolve => {
  if (!/^data:image\/(?:jpeg|png|webp);base64,/.test(dataUrl)) { resolve(null); return; }
  const image = new Image();
  image.onload = () => {
    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) { resolve(null); return; }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL('image/jpeg', 0.8));
  };
  image.onerror = () => resolve(null);
  image.src = dataUrl;
});

export const saveOwnWinePhoto133 = async (rowId: string, dataUrl: string | null | undefined) => {
  if (!rowId || !dataUrl) return false;
  try {
    const thumbnail = await makeOwnThumbnail133(dataUrl);
    if (!thumbnail) return false;
    await run('readwrite', store => store.put({ thumbnail, savedAt: Date.now() }, rowId));
    // 134: one read of all entries instead of one connection per key.
    const keys = await run('readonly', store => store.getAllKeys());
    if (keys.length > MAX_ENTRIES) {
      const values = await run('readonly', store => store.getAll()) as { savedAt?: number }[];
      const entries = keys.map((key, index) => ({ key, savedAt: values[index]?.savedAt ?? 0 }));
      entries.sort((a, b) => a.savedAt - b.savedAt);
      for (const entry of entries.slice(0, keys.length - MAX_ENTRIES)) await run('readwrite', store => store.delete(entry.key));
    }
    return true;
  } catch { return false; }
};

// 134: a deleted wine no longer keeps its thumbnail or its place in the 400-photo budget.
export const deleteOwnWinePhoto133 = async (rowId: string) => {
  if (!rowId) return;
  try { await run('readwrite', store => store.delete(rowId)); } catch { /* best effort */ }
};

export const readOwnWinePhoto133 = async (rowId: string) => {
  try {
    const entry = await run('readonly', store => store.get(rowId)) as { thumbnail?: unknown } | undefined;
    return typeof entry?.thumbnail === 'string' && entry.thumbnail.startsWith('data:image/jpeg;base64,') ? entry.thumbnail : null;
  } catch { return null; }
};

export const useOwnWinePhoto133 = (rowId: string, enabled: boolean) => {
  const [photo, setPhoto] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!enabled || !rowId) return;
    let active = true;
    void readOwnWinePhoto133(rowId).then(url => { if (active && url) setPhoto({ id: rowId, url }); });
    return () => { active = false; };
  }, [rowId, enabled]);
  return photo?.id === rowId ? photo.url : null;
};
