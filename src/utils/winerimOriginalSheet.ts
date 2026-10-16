import { canonicalProducerKey, isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { isNonWineIdentity } from './wineCategory';

export interface WinerimOriginalIdentity {
  name: string;
  producer?: string | null;
  vintage?: string | number | null;
  region?: string | null;
  country?: string | null;
  inferredFields?: readonly string[];
}

export type WinerimOriginalSensory = Record<'power' | 'acidity' | 'sweetness' | 'tannin' | 'fruity', number>;

export interface WinerimOriginalSheet {
  id: string;
  name: string;
  producer: string | null;
  vintage: string | null;
  region: string | null;
  country?: string | null;
  grapes: string[];
  url: string | null;
  detailVerified?: boolean;
  sensoryAttributes?: WinerimOriginalSensory | null;
}

const geoWords = (value?: string | null) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
const countryKey = (value?: string | null) => {
  const text = geoWords(value).join(' ');
  const aliases: Record<string, string> = { espana: 'es', spain: 'es', francia: 'fr', france: 'fr', italia: 'it', italy: 'it',
    portugal: 'pt', germany: 'de', alemania: 'de', argentina: 'ar', chile: 'cl', 'united states': 'us', 'estados unidos': 'us' };
  return Object.prototype.hasOwnProperty.call(aliases, text) ? aliases[text] : text;
};

export const hasWinerimGeographyConflict = (
  input: { region?: string | null; country?: string | null }, catalog: { region?: string | null; country?: string | null },
) => {
  const left = countryKey(input.country), right = countryKey(catalog.country);
  if (left && right && left !== right) return true;
  const meaningfulRegion = (value?: string | null) => geoWords(value).filter(word => !['de', 'del', 'la', 'el', 'do', 'doc', 'doca'].includes(word));
  const region = meaningfulRegion(input.region), sourceRegion = meaningfulRegion(catalog.region);
  return region.length > 0 && sourceRegion.length > 0
    && !region.every(word => sourceRegion.includes(word)) && !sourceRegion.every(word => region.includes(word));
};

export const hasExactWinerimProducer = (left?: string | null, right?: string | null) => {
  return Boolean(canonicalProducerKey(left) && canonicalProducerKey(left) === canonicalProducerKey(right));
};

const clean = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() || null : null;
const safeId = (value: unknown): string | null => {
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value) && value > 0)) return null;
  const id = String(value);
  return /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(id) && !/^winerim-\d+$/i.test(id) ? id : null;
};
const safeSlug = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,239}$/i.test(value);

export const validateWinerimOriginalSheetUrl = (id: unknown, value: unknown): string | null => {
  if (!safeId(id) || typeof value !== 'string' || /[\\\s?#]/.test(value)) return null;
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/');
    if (url.origin !== 'https://web.winerim.com' || url.username || url.password || url.port
      || url.href !== value || parts.length !== 5 || parts[1] !== 'the-library' || parts[2] !== 'wines'
      || parts[3] !== String(id) || !safeSlug(parts[4])) return null;
    return url.href;
  } catch { return null; }
};

export const createWinerimOriginalSheet = (catalog: {
  id: string | number; name: string; winery?: string; vintage?: string | number;
  region?: string; grapes?: string[]; originalSheetUrl?: string; originalSheetSource?: 'winerim-api';
}): WinerimOriginalSheet | null => {
  const id = safeId(catalog.id);
  if (catalog.originalSheetSource !== 'winerim-api' || !id) return null;
  try {
    const publicUrl = catalog.originalSheetUrl ? validateWinerimOriginalSheetUrl(id, catalog.originalSheetUrl) : null;
    if (catalog.originalSheetUrl && !publicUrl) return null;
    const name = clean(catalog.name);
    const vintage = clean(catalog.vintage);
    if (!name || (vintage && !/^(19|20)\d{2}$/.test(vintage))) return null;
    return { id, name, producer: clean(catalog.winery), vintage,
      region: clean(catalog.region), grapes: catalog.grapes?.map(clean).filter((grape): grape is string => Boolean(grape)) ?? [], url: publicUrl };
  } catch { return null; }
};

export type WinerimOriginalLookupResult =
  | { status: 'verified'; sheet: WinerimOriginalSheet }
  | { status: 'identity-required' | 'not-found' | 'ambiguous' | 'incomplete' | 'unavailable' };

const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : null;
const identityName = (value: string, vintage?: string | number | null) => {
  const words = geoWords(value);
  if (vintage && words[words.length - 1] === String(vintage)) words.pop();
  return words.join(' ');
};
export const canLookupWinerimOriginal = (input: WinerimOriginalIdentity): boolean => {
  if (input.vintage != null && typeof input.vintage !== 'string' && typeof input.vintage !== 'number') return false;
  if (input.inferredFields != null && (!Array.isArray(input.inferredFields) || input.inferredFields.some(field => typeof field !== 'string'))) return false;
  const vintage = clean(input.vintage);
  if (input.inferredFields?.some(field => /^(name|nombre|producer|productor|winery|bodega|vintage|anada|añada|year)$/i.test(field))) return false;
  return typeof input.name === 'string' && input.name.trim().length >= 2 && input.name.length <= 120
    && !Array.from(input.name).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) && typeof input.producer === 'string'
    && input.producer.trim().length >= 2 && input.producer.length <= 160
    && (!vintage || /^(19|20)\d{2}$/.test(vintage))
    && isSafeCanonicalLabelMatch(input, input);
};

type LibraryWine = WinerimOriginalIdentity & {
  id: string;
  slug: string;
  grapes: string[];
  sensoryAttributes: WinerimOriginalSensory | null;
};
export const validateWinerimOriginalSensory = (value: unknown): WinerimOriginalSensory | null => {
  const attrs = record(value);
  const keys = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;
  return attrs && keys.every(key => typeof attrs[key] === 'number'
    && Number.isFinite(attrs[key]) && Number(attrs[key]) >= 0 && Number(attrs[key]) <= 5)
    ? Object.fromEntries(keys.map(key => [key, attrs[key]])) as WinerimOriginalSensory : null;
};
const parseLibraryWine = (value: unknown): LibraryWine | null => {
  const raw = record(value);
  if (!raw || typeof raw.name !== 'string' || typeof raw.winery !== 'string') return null;
  if (raw.vintage != null && typeof raw.vintage !== 'string' && typeof raw.vintage !== 'number') return null;
  const id = safeId(raw.id), vintage = clean(raw.vintage);
  if (!id || !safeSlug(raw.slugname) || !raw.name.trim() || !raw.winery.trim()
    || (vintage && !/^(19|20)\d{2}$/.test(vintage)) || isNonWineIdentity(raw.name, raw.type)) return null;
  const base = raw.name.trim(), subname = typeof raw.subname === 'string' ? raw.subname.trim() : '';
  const name = subname && !` ${geoWords(base).join(' ')} `.includes(` ${geoWords(subname).join(' ')} `) ? `${base} ${subname}` : base;
  const sensoryAttributes = validateWinerimOriginalSensory(raw.tastingAttributes);
  const grapes = Array.isArray(raw.grapes) ? raw.grapes.flat(2).flatMap(grape => {
    const name = typeof grape === 'string' ? grape : record(grape)?.name;
    return typeof name === 'string' && name.trim() ? [name.trim()] : [];
  }) : [];
  return { id, slug: raw.slugname, name, producer: raw.winery.trim(), vintage,
    region: typeof raw.region === 'string' ? raw.region.trim() : null,
    country: typeof raw.country === 'string' ? raw.country.trim() : null,
    grapes: [...new Set(grapes)], sensoryAttributes };
};
const matchesLibraryIdentity = (input: WinerimOriginalIdentity, wine: WinerimOriginalIdentity) =>
  (identityName(input.name, input.vintage) === identityName(wine.name, wine.vintage)
    || isSafeCanonicalLabelMatch({ ...input, name: identityName(input.name, input.vintage) },
      { ...wine, name: identityName(wine.name, wine.vintage) }))
  && hasExactWinerimProducer(input.producer, wine.producer)
  && String(clean(input.vintage) ?? '') === String(clean(wine.vintage) ?? '')
  && !hasWinerimGeographyConflict({
    region: input.inferredFields?.includes('region') ? null : input.region,
    country: input.inferredFields?.some(field => /^(country|pais|país)$/i.test(field)) ? null : input.country,
  }, wine);

export const isVerifiedWinerimSheetForIdentity = (input: WinerimOriginalIdentity, sheet?: WinerimOriginalSheet | null) =>
  Boolean(sheet?.detailVerified && validateWinerimOriginalSheetUrl(sheet.id, sheet.url)
    && canLookupWinerimOriginal(input) && matchesLibraryIdentity(input, sheet));

export const catalogWineFromVerifiedSheet = (input: WinerimOriginalIdentity, sheet?: WinerimOriginalSheet | null) => {
  if (!isVerifiedWinerimSheetForIdentity(input, sheet) || !sheet) return null;
  return {
    id: sheet.id, name: sheet.name, winery: sheet.producer || undefined,
    vintage: sheet.vintage || undefined, region: sheet.region || undefined, country: sheet.country || undefined,
    grapes: sheet.grapes, tastingAttributes: validateWinerimOriginalSensory(sheet.sensoryAttributes),
    originalSheetSource: 'winerim-api' as const, originalSheetUrl: sheet.url!, verifiedOriginalSheet: sheet,
  };
};

// Observed in the public Library client (chunk-RBZVLNIE.js / chunk-KCMF6UK6.js),
// 2026-10-15: slug resolver -> text search -> ID/slug detail. Recommendation IDs
// and local search UUIDs are never substituted for this independently read binding.
export const lookupWinerimOriginalSheet = async (
  input: WinerimOriginalIdentity, signal?: AbortSignal, fetcher: typeof fetch = fetch,
): Promise<WinerimOriginalLookupResult> => {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!canLookupWinerimOriginal(input)) return { status: 'identity-required' };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  const bounded = <T,>(work: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    const stop = () => reject(new DOMException('Aborted', 'AbortError'));
    if (controller.signal.aborted) { void work.catch(() => undefined); stop(); return; }
    controller.signal.addEventListener('abort', stop, { once: true });
    work.then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', stop));
  });
  const read = async (path: string): Promise<unknown> => {
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const pending = fetcher(`https://app.winerim.com/api/v1/${path}`, {
      method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit',
      redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal,
    });
    void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
    const response = await bounded(pending);
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json') || !response.body) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error('Unavailable Library');
    }
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    const decoder = new TextDecoder();
    let text = '', size = 0;
    try {
      while (true) {
        const { done, value } = await bounded(reader.read());
        if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        if (done) break;
        size += value.byteLength;
        if (size > 262144) { await reader.cancel(); throw new Error('Library response too large'); }
        text += decoder.decode(value, { stream: true });
      }
    } finally { controller.signal.removeEventListener('abort', cancel); reader.releaseLock(); }
    return JSON.parse(text + decoder.decode());
  };
  try {
    const resolved = record(await read('whoami/slugname?s=the-library'));
    const uuid = resolved?.restaurant;
    if (typeof uuid !== 'string' || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(uuid)) return { status: 'unavailable' };
    const root = `restaurant/${uuid}/wines`;
    const query = input.vintage ? input.name.trim().replace(new RegExp(`\\s+\\(?${input.vintage}\\)?$`), '').trim() : input.name.trim();
    const page = record(await read(`${root}?${new URLSearchParams({ page: '1', text: query })}`));
    if (!page || !Array.isArray(page.results) || page.page !== 1 || !Number.isSafeInteger(page.count)
      || Number(page.count) < 0 || page.results.length > 20 || Number(page.count) !== page.results.length) return { status: 'incomplete' };
    const wines = page.results.map(parseLibraryWine);
    if (wines.some(wine => !wine)) return { status: 'incomplete' };
    const byId = new Map<string, LibraryWine>();
    for (const wine of wines) {
      const previous = byId.get(wine.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(wine)) return { status: 'ambiguous' };
      byId.set(wine.id, wine);
    }
    const matches = [...byId.values()].filter(wine => matchesLibraryIdentity(input, wine));
    if (!matches.length) return { status: 'not-found' };
    if (matches.length !== 1) return { status: 'ambiguous' };
    const selected = matches[0];
    const detail = parseLibraryWine(await read(`${root}/${selected.id}/${selected.slug}`));
    if (!detail || detail.id !== selected.id || detail.slug !== selected.slug
      || !matchesLibraryIdentity(input, detail) || !matchesLibraryIdentity(selected, detail)) return { status: 'ambiguous' };
    if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const sheet = createWinerimOriginalSheet({ id: detail.id, name: detail.name, winery: detail.producer,
      vintage: detail.vintage, region: detail.region, grapes: detail.grapes, originalSheetSource: 'winerim-api',
      originalSheetUrl: `https://web.winerim.com/the-library/wines/${detail.id}/${detail.slug}` });
    return sheet ? { status: 'verified', sheet: { ...sheet, country: detail.country, detailVerified: true, sensoryAttributes: detail.sensoryAttributes } }
      : { status: 'unavailable' };
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
};
