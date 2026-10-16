import type { RestaurantRow91, RestaurantPair91 } from '../../supabase/functions/_shared/matchrim-restaurant91';

export type MenuKind91 = 'food' | 'wine';
export type RestaurantDocument91 = {
  id: string; kind: MenuKind91; name: string; digest: string; pageCount: number;
  file?: File; text?: string; sourceUrl?: string;
};
export type RestaurantPage91 = {
  id: string; documentId: string; number: number; enabled: boolean;
  status: 'queued' | 'reading' | 'read' | 'error'; partial: boolean;
  error?: string; warnings: string[];
};
export type SourcedRestaurantRow91 = RestaurantRow91 & {
  pageIds: string[]; reviewed: boolean; manual?: boolean;
};
export type RestaurantSession91 = {
  version: 1; id: string; restaurant: string; revision: number;
  documents: RestaurantDocument91[]; pages: RestaurantPage91[];
  rows: SourcedRestaurantRow91[]; pairs: RestaurantPair91[]; pairWarnings: string[];
};
export const RESTAURANT_SESSION_MAX_PAGES = 100;
export const RESTAURANT_SESSION_MAX_FILES = 20;
export const createRestaurantSession91 = (): RestaurantSession91 => ({
  version: 1, id: crypto.randomUUID(), restaurant: '', revision: 0,
  documents: [], pages: [], rows: [], pairs: [], pairWarnings: [],
});
const invalidate = (state: RestaurantSession91): RestaurantSession91 => ({
  ...state, revision: state.revision + 1, pairs: [], pairWarnings: [],
});
export const addRestaurantDocument91 = (state: RestaurantSession91, doc: RestaurantDocument91) => {
  if (state.documents.some(item => item.kind === doc.kind && item.digest === doc.digest)) {
    throw new Error('Este archivo ya está añadido a esta carta.');
  }
  if (state.documents.length >= RESTAURANT_SESSION_MAX_FILES) throw new Error('La sesión admite hasta 20 archivos.');
  if (!Number.isSafeInteger(doc.pageCount) || doc.pageCount < 1 || doc.pageCount > 50) throw new Error('Cada documento admite de 1 a 50 páginas. Divide el PDF antes de añadirlo.');
  if (state.pages.length + doc.pageCount > RESTAURANT_SESSION_MAX_PAGES) throw new Error('La sesión admite hasta 100 páginas. No se ha recortado el documento.');
  const next = invalidate(state);
  return { ...next, documents: [...state.documents, doc], pages: [...state.pages,
    ...Array.from({ length: doc.pageCount }, (_, index): RestaurantPage91 => ({
      id: `${doc.id}-p${index + 1}`, documentId: doc.id, number: index + 1,
      enabled: true, status: 'queued', partial: false, warnings: [],
    })),
  ] };
};
export const removeRestaurantDocument91 = (state: RestaurantSession91, id: string) => {
  const removed = new Set(state.pages.filter(page => page.documentId === id).map(page => page.id));
  return { ...invalidate(state), documents: state.documents.filter(doc => doc.id !== id),
    pages: state.pages.filter(page => !removed.has(page.id)), rows: state.rows
      .map(row => ({ ...row, pageIds: row.pageIds.filter(page => !removed.has(page)) }))
      .filter(row => row.manual || row.pageIds.length > 0),
  };
};
const fold = (value: string | undefined) => (value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const rowKey = (row: RestaurantRow91) => JSON.stringify([
  row.kind, fold(row.name), fold(row.sourceText), fold(row.producer), row.vintage ?? '',
  row.price ?? null, row.currency ?? '', row.service ?? 'unknown', row.availability ?? 'unknown',
]);
export const completeRestaurantPage91 = (
  state: RestaurantSession91, pageId: string, rows: RestaurantRow91[], partial: boolean, warnings: string[],
): RestaurantSession91 => {
  const page = state.pages.find(item => item.id === pageId);
  const doc = state.documents.find(item => item.id === page?.documentId);
  if (!page || !doc) return state;
  if (rows.some(row => row.kind !== doc.kind || !row.sourceText.trim())) throw new Error('La lectura no coincide con esta página.');
  // Only byte-equivalent normalized readings merge; producer, vintage, price and
  // service conflicts remain separate. Every origin survives deduplication.
  const retained = state.rows.map(row => ({ ...row, pageIds: row.pageIds.filter(id => id !== pageId) }))
    .filter(row => row.manual || row.pageIds.length);
  for (const row of rows) {
    const duplicate = retained.find(item => !item.manual && rowKey(item) === rowKey(row));
    if (duplicate) duplicate.pageIds = [...new Set([...duplicate.pageIds, pageId])];
    else retained.push({ ...row, id: retained.some(item => item.id === row.id) ? `${row.id}-${crypto.randomUUID()}` : row.id,
      pageIds: [pageId], reviewed: false });
  }
  return { ...invalidate(state), rows: retained, pages: state.pages.map(item => item.id === pageId
    ? { ...item, status: 'read', partial, warnings, error: undefined } : item) };
};
export const editRestaurantRow91 = (state: RestaurantSession91, id: string, patch: Partial<RestaurantRow91>) => {
  const row = state.rows.find(item => item.id === id);
  if (!row) return state;
  return { ...invalidate(state), rows: state.rows.map(item => item.id === id
    ? { ...item, ...patch, id: item.id, kind: item.kind, reviewed: true } : item) };
};
export const restaurantCoverage91 = (state: RestaurantSession91, kind: MenuKind91) => {
  const ids = new Set(state.documents.filter(doc => doc.kind === kind).map(doc => doc.id));
  const pages = state.pages.filter(page => ids.has(page.documentId) && page.enabled);
  return { total: pages.length, read: pages.filter(page => page.status === 'read').length,
    failed: pages.filter(page => page.status === 'error').length,
    partial: pages.some(page => page.status !== 'read' || page.partial),
    omitted: state.pages.filter(page => ids.has(page.documentId) && !page.enabled).length,
  };
};
export const activeRestaurantRows91 = (state: RestaurantSession91): SourcedRestaurantRow91[] => {
  const active = new Set(state.pages.filter(page => page.enabled && page.status === 'read').map(page => page.id));
  return state.rows.filter(row => row.manual || row.pageIds.some(id => active.has(id)));
};
export const resetInterruptedRestaurant91 = (state: RestaurantSession91): RestaurantSession91 => ({
  ...state, pages: state.pages.map(page => page.status === 'reading'
    ? { ...page, status: 'queued', error: undefined } : page),
});

const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('matchrim.restaurant91', 2);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains('sessions')) request.result.createObjectStore('sessions');
    if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files');
  };
  request.onerror = () => reject(new Error('No se pudo abrir el borrador local.'));
  request.onsuccess = () => resolve(request.result);
});
export const readRestaurantSession91 = async (owner: string): Promise<RestaurantSession91 | null> => {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessions', 'files'], 'readonly');
      const request = transaction.objectStore('sessions').get(owner);
      request.onerror = () => reject(new Error('No se pudo recuperar el borrador.'));
      request.onsuccess = () => {
        const state = request.result as RestaurantSession91 | undefined;
        if (state?.version !== 1 || !Array.isArray(state.pages) || !Array.isArray(state.documents)
          || !Array.isArray(state.rows) || !Array.isArray(state.pairs)) { resolve(null); return; }
        const fileReads = state.documents.filter(doc => !doc.file && doc.text === undefined).map(doc => new Promise<void>((done, fail) => {
          const file = transaction.objectStore('files').get(`${owner}:${doc.id}`);
          file.onsuccess = () => { if (file.result instanceof Blob) doc.file = file.result as File; done(); };
          file.onerror = () => fail(new Error('No se pudo recuperar un archivo.'));
        }));
        Promise.all(fileReads).then(() => resolve({ ...resetInterruptedRestaurant91(state), pairs: [], pairWarnings: [] }), reject);
      };
    });
  } finally { db.close(); }
};
export const writeRestaurantSession91 = async (owner: string, state: RestaurantSession91) => {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(['sessions', 'files'], 'readwrite');
      const files = transaction.objectStore('files');
      const activeKeys = new Set(state.documents.map(doc => `${owner}:${doc.id}`));
      for (const doc of state.documents) {
        if (!doc.file) continue;
        const key = `${owner}:${doc.id}`;
        const exists = files.getKey(key);
        exists.onsuccess = () => { if (exists.result === undefined) files.put(doc.file, key); };
      }
      const oldFiles = files.getAllKeys(IDBKeyRange.bound(`${owner}:`, `${owner}:\uffff`));
      oldFiles.onsuccess = () => {
        for (const key of oldFiles.result) if (!activeKeys.has(String(key))) files.delete(key);
      };
      transaction.objectStore('sessions').put({ ...state, documents: state.documents.map(({ file: _file, ...doc }) => doc) }, owner);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('El borrador no se ha guardado en este dispositivo.'));
      transaction.onabort = () => reject(new Error('El borrador no se ha guardado en este dispositivo.'));
    });
  } finally { db.close(); }
};
