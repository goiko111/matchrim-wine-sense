export class PublicLibraryInputError extends Error {}

const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : null;
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const key = (value: string | null) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const hasControl = (value: string) => Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127);

export const parsePublicLibraryInput = (value: unknown): { query: string; limit: number } => {
  const input = object(value);
  if (!input || typeof input.query !== 'string' || input.query.length > 120 || hasControl(input.query)) throw new PublicLibraryInputError('Invalid query');
  const limit = input.limit === undefined ? 20 : input.limit;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 20) throw new PublicLibraryInputError('Invalid limit');
  return { query: input.query.trim(), limit };
};

export type PublicLibrarySensory = Record<'power' | 'acidity' | 'sweetness' | 'tannin' | 'fruity', number>;
export interface PublicLibrarySearchWine {
  id: string;
  name: string;
  producer: string;
  vintage: string | null;
  region: string | null;
  country: string | null;
  slugname: string;
  grape_varieties: string[];
  tipo: string | null;
  tasting_attributes?: PublicLibrarySensory;
  tastingAttributes?: PublicLibrarySensory;
  originalSheetSource?: 'winerim-api';
  originalSheetUrl?: string;
  originalSheetApiUrl?: string;
}

const safeId = (value: unknown): string | null => {
  if (typeof value !== 'string' && !(typeof value === 'number' && Number.isSafeInteger(value) && value > 0)) return null;
  const id = String(value);
  return /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(id) && !/^winerim-\d+$/i.test(id) ? id : null;
};
const safeSlug = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,239}$/i.test(value);
export const parsePublicLibrarySensory = (value: unknown): PublicLibrarySensory | null => {
  const attrs = object(value), keys = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;
  return attrs && keys.every(name => typeof attrs[name] === 'number' && Number.isFinite(attrs[name]) && Number(attrs[name]) >= 0 && Number(attrs[name]) <= 5)
    ? Object.fromEntries(keys.map(name => [name, attrs[name]])) as PublicLibrarySensory : null;
};
export const parsePublicLibraryWine = (value: unknown): PublicLibrarySearchWine | null => {
  const raw = object(value);
  if (!raw) return null;
  const id = safeId(raw.id), base = text(raw.name), producer = text(raw.winery);
  if (!id || !base || !producer || !key(base) || !key(producer) || !safeSlug(raw.slugname)
    || hasControl(base) || hasControl(producer) || base.length > 320 || producer.length > 200) return null;
  if (raw.subname != null && typeof raw.subname !== 'string') return null;
  const subname = text(raw.subname);
  if (subname && (hasControl(subname) || subname.length > 160)) return null;
  const name = subname && !` ${key(base)} `.includes(` ${key(subname)} `) ? `${base} ${subname}` : base;
  if (raw.vintage != null && typeof raw.vintage !== 'string' && typeof raw.vintage !== 'number') return null;
  const vintage = raw.vintage == null || String(raw.vintage).trim() === '' ? null : String(raw.vintage).trim();
  if (vintage && !/^(19|20)\d{2}$/.test(vintage)) return null;
  for (const field of ['region', 'country', 'type']) if (raw[field] != null && typeof raw[field] !== 'string') return null;
  const grapes = Array.isArray(raw.grapes) ? raw.grapes.flat(2).flatMap(value => {
    const grape = text(value) || text(object(value)?.name);
    return grape && !hasControl(grape) && grape.length <= 120 ? [grape] : [];
  }) : [];
  const attrs = parsePublicLibrarySensory(raw.tastingAttributes);
  return { id, name, producer, vintage, slugname: raw.slugname, region: text(raw.region), country: text(raw.country),
    tipo: text(raw.type), grape_varieties: [...new Set(grapes)],
    ...(attrs ? { tasting_attributes: attrs, tastingAttributes: attrs } : {}) };
};

export type PublicLibraryPage = {
  status: 'complete' | 'incomplete' | 'ambiguous' | 'malformed';
  wines: PublicLibrarySearchWine[];
  sourceCount: number | null;
};
export const parsePublicLibraryPage = (value: unknown, limit: number): PublicLibraryPage => {
  const raw = object(value);
  if (!raw || !Array.isArray(raw.results) || raw.page !== 1 || !Number.isSafeInteger(raw.count) || Number(raw.count) < 0) {
    return { status: 'malformed', wines: [], sourceCount: null };
  }
  const count = Number(raw.count);
  // The legacy client ignores metadata. Never expose a truncated subset that
  // could look like a unique canonical match while other source rows are hidden.
  if (raw.results.length > 20 || count !== raw.results.length || count > limit) return { status: 'incomplete', wines: [], sourceCount: count };
  const wines = new Map<string, PublicLibrarySearchWine>(), identities = new Map<string, string>();
  for (const value of raw.results) {
    const wine = parsePublicLibraryWine(value);
    if (!wine) return { status: 'malformed', wines: [], sourceCount: count };
    const prior = wines.get(wine.id);
    if (prior && JSON.stringify(prior) !== JSON.stringify(wine)) return { status: 'ambiguous', wines: [], sourceCount: count };
    const identity = JSON.stringify([key(wine.name), key(wine.producer), wine.vintage]);
    const previousId = identities.get(identity);
    if (previousId && previousId !== wine.id) return { status: 'ambiguous', wines: [], sourceCount: count };
    wines.set(wine.id, wine); identities.set(identity, wine.id);
  }
  return { status: 'complete', wines: [...wines.values()], sourceCount: count };
};

export const publicLibraryUuid = (value: unknown): string | null => {
  const uuid = object(value)?.restaurant;
  return typeof uuid === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(uuid) ? uuid : null;
};

export const verifyPublicLibraryDetail = (
  listed: PublicLibrarySearchWine, value: unknown, uuid: string,
): PublicLibrarySearchWine | null => {
  const detail = parsePublicLibraryWine(value);
  if (!detail || detail.id !== listed.id || detail.slugname !== listed.slugname || key(detail.name) !== key(listed.name)
    || key(detail.producer) !== key(listed.producer) || detail.vintage !== listed.vintage
    || (detail.region && listed.region && key(detail.region) !== key(listed.region))
    || (detail.country && listed.country && key(detail.country) !== key(listed.country))) return null;
  if (!publicLibraryUuid({ restaurant: uuid })) return null;
  return { ...detail, originalSheetSource: 'winerim-api',
    originalSheetUrl: `https://web.winerim.com/the-library/wines/${detail.id}/${detail.slugname}`,
    originalSheetApiUrl: `https://app.winerim.com/api/v1/restaurant/${uuid}/wines/${detail.id}/${detail.slugname}` };
};
