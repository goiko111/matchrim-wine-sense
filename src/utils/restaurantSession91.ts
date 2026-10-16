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
  origins?: Array<{ pageId: string; row: RestaurantRow91; mentionedNames?: string[]; ordinal?: number }>;
  correction?: Partial<RestaurantRow91>;
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
    pages: state.pages.filter(page => !removed.has(page.id)),
    rows: groupRestaurantRows91(withoutOrigins91(state.rows, origin => removed.has(origin.pageId)), state.pages),
  };
};
const fold = (value: string | undefined) => (value ?? '').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const rowKey = (row: RestaurantRow91) => JSON.stringify([
  row.kind, fold(row.name), fold(row.sourceText), fold(row.producer), row.vintage ?? '',
  row.price ?? null, row.currency ?? '', row.service ?? 'unknown', row.availability ?? 'unknown',
  row.kind === 'food' ? fold(row.description) : '',
]);

// Keep local provenance out of the wire contract, but retain user-declared flags.
export const restaurantRowForRequest91 = (row: RestaurantRow91): RestaurantRow91 => {
  const { id, kind, name, sourceText, producer, vintage, description, price, currency,
    service, availability, notes, reviewed, manual } = row;
  return { id, kind, name, sourceText, producer, vintage, description, price, currency,
    service, availability, notes: notes?.slice(), reviewed, manual };
};
type Origin91 = NonNullable<SourcedRestaurantRow91['origins']>[number];
export const restaurantRowOrigins91 = (row: SourcedRestaurantRow91): Origin91[] => row.origins
  ?? row.pageIds.map((pageId, index) => ({ pageId, row: restaurantRowForRequest91({ ...row,
    id: index ? `${row.id.slice(0, 140)}:legacy-${index}` : row.id,
  }) }));
const originKey91 = (origin: Origin91) => `${origin.pageId}\0${origin.row.id}`;
const passageKey91 = (origin: Origin91) => JSON.stringify([origin.pageId, fold(origin.row.sourceText)]);
const passageNames91 = (rows: SourcedRestaurantRow91[]) => {
  const names = new Map<string, string[]>();
  for (const origin of rows.flatMap(restaurantRowOrigins91)) {
    const key = passageKey91(origin);
    names.set(key, [...(names.get(key) ?? []), ...(origin.mentionedNames ?? [origin.row.name])]);
  }
  return names;
};
const compareOrigins91 = (a: Origin91, b: Origin91) => originKey91(a).localeCompare(originKey91(b), 'en');
const representative91 = (origins: Origin91[]) => [...origins].sort((a, b) =>
  Number(b.row.price !== undefined) - Number(a.row.price !== undefined) || compareOrigins91(a, b))[0].row;
const materialize91 = (origins: Origin91[], protectedRow?: SourcedRestaurantRow91): SourcedRestaurantRow91 => {
  const ordered = [...origins].sort(compareOrigins91);
  const reading = representative91(ordered);
  // Only explicitly corrected fields survive a change of representative, never
  // the previous representative's price, format or source text.
  const correction = protectedRow?.correction ?? (protectedRow?.reviewed ? {
    name: protectedRow.name, producer: protectedRow.producer,
    vintage: protectedRow.vintage, description: protectedRow.description,
  } : undefined);
  const corrected = { ...reading, ...correction };
  for (const key of ['price', 'currency', 'service'] as const) {
    if (correction?.[key] !== undefined && correction[key] !== reading[key]) Object.assign(corrected, { [key]: undefined });
  }
  return { ...corrected, id: ordered[0].row.id, kind: reading.kind,
    sourceText: reading.sourceText, reviewed: Boolean(protectedRow?.reviewed), manual: protectedRow?.manual,
    pageIds: [...new Set(ordered.map(origin => origin.pageId))], origins: ordered,
    ...(correction ? { correction } : {}),
  };
};
const withoutOrigins91 = (rows: SourcedRestaurantRow91[], remove: (origin: Origin91) => boolean) => {
  const names = passageNames91(rows);
  const nextOrdinal = new Map<string, number>();
  return rows.flatMap(row => {
    if (row.manual) return [row];
    // Older drafts have no source ordinal. Preserve their saved row order before
    // any filtering or identity sorting; IDs are never reading-order evidence.
    const origins = restaurantRowOrigins91(row).map(origin => {
      const next = nextOrdinal.get(origin.pageId) ?? 0;
      const ordinal = origin.ordinal ?? next;
      nextOrdinal.set(origin.pageId, Math.max(next, ordinal + 1));
      return { ...origin, ordinal, mentionedNames: origin.mentionedNames ?? names.get(passageKey91(origin)) };
    }).filter(origin => !remove(origin));
    return origins.length ? [materialize91(origins, row.reviewed ? row : undefined)] : [];
  });
};

const priceLiteral91 = /(?:\$|\u20ac|\u00a3|\b(?:EUR|USD|GBP|CAD|AUD|NZD|CHF|JPY|CNY|SEK|NOK|DKK)\b)\s*\d+(?:[.,]\d+)*|\d+(?:[.,]\d+)*\s*(?:\u20ac|\u00a3|\b(?:EUR|USD|GBP|CAD|AUD|NZD|CHF|JPY|CNY|SEK|NOK|DKK)\b)/gi;
const literalName91 = (name: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${fold(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'gu');
const foodContext91 = (origin: Origin91, names: string[]) => {
  const row = origin.row;
  let text = fold(row.sourceText);
  const sections: string[] = [];
  // Section markers are context, not interchangeable preparations. SPECIALS may
  // wrap a named section; MEATS and SANDWICHES must remain distinct.
  const sectionPattern = /^[\s*:-]*(specials?|desserts?|postres?|meats?|carnes?|sandwiches?|sides?|platters?)\b[\s*:-]*/;
  let section: RegExpExecArray | null;
  while ((section = sectionPattern.exec(text))) {
    sections.push(section[1].replace(/s$/, ''));
    text = text.slice(section[0].length);
  }
  const context = sections.filter(value => value !== 'special').join('/') || sections.join('/');
  if (!literalName91(row.name).test(text)) return null;
  // A bare dessert list can mention several separately extracted dishes. Strip
  // only names actually read from this same page and exact source passage.
  const mentionedNames = /^(?:dessert|postre)$/.test(context) ? names : [row.name];
  for (const name of [...mentionedNames].sort((a, b) => b.length - a.length)) text = text.replace(literalName91(name), '$1');
  const prices = (text.match(priceLiteral91) ?? []).map(fold).sort();
  text = text.replace(priceLiteral91, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return { key: JSON.stringify([fold(row.name), fold(row.producer), row.vintage ?? '', fold(row.description),
    row.currency ?? '', row.service ?? 'unknown', row.availability ?? 'unknown', context, text]), prices: JSON.stringify(prices) };
};

const groupRestaurantRows91 = (rows: SourcedRestaurantRow91[], pages: RestaurantPage91[]): SourcedRestaurantRow91[] => {
  const protectedRows = rows.filter(row => row.manual || row.reviewed);
  const origins = rows.filter(row => !row.manual && !row.reviewed).flatMap(restaurantRowOrigins91).sort(compareOrigins91);
  const passageNames = passageNames91(rows);
  const buckets = new Map<string, Array<{ origins: Origin91[]; prices: string }>>();
  for (const origin of origins) {
    const context = origin.row.kind === 'food' ? foodContext91(origin, passageNames.get(passageKey91(origin))!) : null;
    const key = context ? `food:${context.key}` : `exact:${rowKey(origin.row)}`;
    const bucket = buckets.get(key) ?? [];
    const exact = bucket.find(group => rowKey(group.origins[0].row) === rowKey(origin.row));
    if (exact) exact.origins.push(origin);
    else bucket.push({ origins: [origin], prices: context?.prices ?? '[]' });
    buckets.set(key, bucket);
  }
  const grouped: SourcedRestaurantRow91[] = [];
  for (const bucket of buckets.values()) {
    // Resolve concrete variants before missing-price mentions. A mention that
    // fits two conflicting variants stays independent, regardless of page order.
    bucket.sort((a, b) => Number(b.origins[0].row.price !== undefined) - Number(a.origins[0].row.price !== undefined)
      || Number(b.prices !== '[]') - Number(a.prices !== '[]') || compareOrigins91(a.origins[0], b.origins[0]));
    const groups: typeof bucket = [];
    for (const candidate of bucket) {
      const matches = groups.filter(group => group.origins.every(a => candidate.origins.every(b =>
        (a.row.price === undefined || b.row.price === undefined || a.row.price === b.row.price)))
        && (group.prices === '[]' || candidate.prices === '[]' || group.prices === candidate.prices));
      if (matches.length === 1) {
        matches[0].origins.push(...candidate.origins);
        if (matches[0].prices === '[]') matches[0].prices = candidate.prices;
      } else groups.push(candidate);
    }
    grouped.push(...groups.map(group => materialize91(group.origins)));
  }
  // Identity/representative selection above stays independent of completion
  // order. Display follows the menu, including provenance within a grouped row.
  const pageOrder = new Map(pages.map((page, index) => [page.id, index]));
  const compareDisplay = (a: Origin91, b: Origin91) =>
    (pageOrder.get(a.pageId) ?? Number.MAX_SAFE_INTEGER) - (pageOrder.get(b.pageId) ?? Number.MAX_SAFE_INTEGER)
    || (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER);
  return [...protectedRows, ...grouped].map(row => {
    if (row.manual) return row;
    const ordered = [...restaurantRowOrigins91(row)].sort(compareDisplay);
    return { ...row, origins: ordered, pageIds: [...new Set(ordered.map(origin => origin.pageId))] };
  }).sort((a, b) => {
    if (a.manual || b.manual) return Number(Boolean(a.manual)) - Number(Boolean(b.manual));
    return compareDisplay(restaurantRowOrigins91(a)[0], restaurantRowOrigins91(b)[0]);
  });
};
export const completeRestaurantPage91 = (
  state: RestaurantSession91, pageId: string, rows: RestaurantRow91[], partial: boolean, warnings: string[],
): RestaurantSession91 => {
  const page = state.pages.find(item => item.id === pageId);
  const doc = state.documents.find(item => item.id === page?.documentId);
  if (!page || !doc) return state;
  if (rows.some(row => row.kind !== doc.kind || !row.sourceText.trim())) throw new Error('La lectura no coincide con esta página.');
  const retained = withoutOrigins91(state.rows, origin => origin.pageId === pageId);
  const usedIds = new Set(retained.flatMap(row => [row.id, ...restaurantRowOrigins91(row).map(origin => origin.row.id)]));
  for (const [ordinal, row] of rows.entries()) {
    const reading = restaurantRowForRequest91({ ...row, id: usedIds.has(row.id) ? `${row.id}-${crypto.randomUUID()}` : row.id });
    usedIds.add(reading.id);
    const mentionedNames = rows.filter(item => fold(item.sourceText) === fold(row.sourceText)).map(item => item.name);
    retained.push({ ...reading, pageIds: [pageId], reviewed: Boolean(row.reviewed), origins: [{ pageId, row: reading, mentionedNames, ordinal }] });
  }
  return { ...invalidate(state), rows: groupRestaurantRows91(retained, state.pages), pages: state.pages.map(item => item.id === pageId
    ? { ...item, status: 'read', partial, warnings, error: undefined } : item) };
};
export const editRestaurantRow91 = (state: RestaurantSession91, id: string, patch: Partial<RestaurantRow91>) => {
  const row = activeRestaurantRows91(state).find(item => item.id === id);
  if (!row) return state;
  const correction = { ...row.correction };
  for (const key of ['name', 'producer', 'vintage', 'description', 'price', 'currency', 'service', 'availability', 'notes'] as const) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) Object.assign(correction, { [key]: patch[key] });
  }
  const edited = { ...row, ...correction, correction, id: row.id, kind: row.kind, reviewed: true };
  if (row.manual) return { ...invalidate(state), rows: state.rows.map(item => item.id === id ? edited : item) };
  const editedOrigins = new Set(restaurantRowOrigins91(row).map(originKey91));
  return { ...invalidate(state), rows: groupRestaurantRows91([
    ...withoutOrigins91(state.rows, origin => editedOrigins.has(originKey91(origin))), edited,
  ], state.pages) };
};
export const discardRestaurantRow91 = (state: RestaurantSession91, id: string): RestaurantSession91 => {
  const row = activeRestaurantRows91(state).find(item => item.id === id);
  if (!row) return state;
  const discarded = new Set(restaurantRowOrigins91(row).map(originKey91));
  return { ...invalidate(state), rows: groupRestaurantRows91(row.manual ? state.rows.filter(item => item.id !== id)
    : withoutOrigins91(state.rows, origin => discarded.has(originKey91(origin))), state.pages) };
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
  return groupRestaurantRows91(withoutOrigins91(state.rows, origin => !active.has(origin.pageId)), state.pages);
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
