import type { PublicGlobalRow103 } from './nativeGlobalCatalogue103';
import { buildConsumerAffinity, type ConsumerAffinityResult } from './consumerAffinity95';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';
import type { MatchrimProfileLike } from './matchrimPassport';
import { usableStoreSensory138, type StoreAttributes138, type StoreEstimate138 } from './storeEstimate138';

// 139: on a real iPhone a wine list printed «RODA – Tempranillo» or «LUIS R.» and got no verdict at all, because
// only an exact name + winery reached Winerim. A list line is matched to the public store by exact name first and,
// when the list prints only the brand, to that winery's wines of the same colour: the verdict is then a range.
// Everything here is a labelled estimate (see storeEstimate138); it never feeds the profile.
export type ListingLine139 = { name: string; producer?: string | null; vintage?: number | string | null;
  type?: string | null; grapes?: readonly string[] | null };
export type ListingMatch139 = { kind: 'exact'; estimate: StoreEstimate138 } | { kind: 'range'; options: StoreEstimate138[] };

const key = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const brandKey = (value: string) => key(value).replace(/^(bodegas?|vinedos|vinos|pago de|pagos de|dominio de) /, '');
const colour = (value?: string | null) => { const text = key(value ?? '');
  return /tinto|red|rouge|negre/.test(text) ? 'tinto' : /blanc|white/.test(text) ? 'blanco' : /rosad|rose/.test(text) ? 'rosado'
    : /espumos|cava|champ|sparkl/.test(text) ? 'espumoso' : null; };
const rowName = (row: PublicGlobalRow103) => {
  const sub = row.subname && !(` ${key(row.name)} `).includes(` ${key(row.subname)} `) ? row.subname : '';
  return key([row.name, sub].filter(Boolean).join(' '));
};

/** «MARCO REAL – Syrah 2021» → brand «marco real», grape hint «syrah», vintage «2021». */
export const readListingLine139 = (line: ListingLine139) => {
  const year = line.name.match(/\b((?:19|20)\d{2})\b/);
  const vintage = line.vintage == null || line.vintage === '' ? year?.[1] ?? '' : String(line.vintage);
  const [head, ...tail] = line.name.replace(/\b(?:19|20)\d{2}\b/g, ' ').split(/\s+[–—-]\s+/);
  const hints = [...tail, ...(line.grapes ?? [])].map(key).filter(Boolean);
  return { name: key(head), vintage, hints, query: head.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim() };
};

export const matchListing139 = (line: ListingLine139, rows: readonly PublicGlobalRow103[]): ListingMatch139 | null => {
  const read = readListingLine139(line);
  if (read.name.length < 3) return null;
  // One entry per wine: the asked vintage if the store has it, otherwise the most recent one.
  const wines = new Map<string, StoreEstimate138>(), prices = new Map<string, number[]>(), photos = new Map<string, string>();
  for (const row of rows) {
    const attributes = usableStoreSensory138(row); if (!attributes) continue;
    const id = `${rowName(row)}|${brandKey(row.winery)}`, previous = wines.get(id), year = String(row.vintage ?? '');
    const price = (row as { bottlePrice?: number | null }).bottlePrice;
    if (typeof price === 'number') prices.set(id, [...(prices.get(id) ?? []), price]);
    if (row.photo && !photos.has(id)) photos.set(id, row.photo);
    const better = !previous || (read.vintage && year === read.vintage)
      || (String(previous.row.vintage ?? '') !== read.vintage && Number(row.vintage ?? 0) > Number(previous.row.vintage ?? 0));
    if (better) wines.set(id, { row, attributes });
  }
  const all = [...wines.entries()].map(([id, item]) => ({ ...item, row: item.row.photo ? item.row : { ...item.row, photo: photos.get(id) ?? null },
    typicalPrice: median(prices.get(id) ?? []) }));
  const producer = line.producer ? brandKey(line.producer) : '';
  const ofProducer = (item: StoreEstimate138) => !producer || brandKey(item.row.winery) === producer;
  // «PAGOS DE ANGUIX COSTALARA» is the wine «Costalara» of the winery «Pagos de Anguix».
  const withoutWinery = (item: StoreEstimate138) => { const winery = key(item.row.winery);
    return read.name.startsWith(winery + ' ') ? read.name.slice(winery.length + 1) : null; };
  const exact = all.filter(item => ofProducer(item) && (rowName(item.row) === read.name || rowName(item.row) === `${producer} ${read.name}`.trim()
    || rowName(item.row) === withoutWinery(item)));
  // A wine called exactly like the line wins, unless a winery of that name exists and the wine is somebody else's.
  const homonym = all.some(item => brandKey(item.row.winery) === brandKey(read.name)) && exact.some(item => brandKey(item.row.winery) !== brandKey(read.name));
  if (exact.length && !homonym && new Set(exact.map(item => brandKey(item.row.winery))).size === 1) return { kind: 'exact', estimate: exact[0] };
  // Brand only: the line names the winery (or the first words of its wines), not one wine.
  const padded = ` ${read.name} `;
  let family = all.filter(item => ofProducer(item) && (brandKey(item.row.winery) === brandKey(read.name)
    || ` ${rowName(item.row)} `.startsWith(padded) || ` ${key(item.row.winery)} `.includes(padded)));
  if (new Set(family.map(item => brandKey(item.row.winery))).size > 1) {
    const own = family.filter(item => brandKey(item.row.winery) === brandKey(read.name));
    if (!own.length) return null;
    family = own;
  }
  const wanted = colour(line.type);
  if (wanted) { const same = family.filter(item => colour(item.row.type) === wanted); if (same.length) family = same; }
  // A grape printed on the list narrows the family only when a wine carries it in its name («Amaren Graciano»).
  if (read.hints.length) {
    const hinted = family.filter(item => read.hints.some(hint => ` ${rowName(item.row)} `.includes(` ${hint} `)));
    if (hinted.length) family = hinted;
  }
  family = family.filter((item, index) => family.findIndex(other => key(other.row.name) === key(item.row.name)) === index);
  if (!family.length || family.length > 8) return null;
  return family.length === 1 ? { kind: 'exact', estimate: family[0] } : { kind: 'range', options: family };
};

/** Affinity for a store estimate. A tannin of 0 means «not applicable» (whites, rosés, sparkling): it is left out. */
export const storeAffinity139 = (profile: MatchrimProfileLike | null | undefined, attributes: StoreAttributes138): ConsumerAffinityResult => {
  const noTannin = attributes.tannin === 0 && typeof profile?.tanico === 'number';
  const compared = noTannin ? { ...attributes, tannin: Math.max(0, Math.min(5, profile!.tanico as number)) } : attributes;
  return buildConsumerAffinity({ catalogIdentityLinked: true, sensorySource: 'catalog', attributes: compared, profile,
    score: calculateLocalMatchrimAffinity(profile, compared), notApplicable: noTannin ? ['tanico'] : undefined });
};
export const storeScore139 = (profile: MatchrimProfileLike | null | undefined, attributes: StoreAttributes138) => {
  const result = storeAffinity139(profile, attributes); return result.state === 'ready' ? result.score : null;
};

// One store search per distinct query per session. Measured 2026-11-11: a request takes 3-5 s and the server
// starts timing out above roughly six at once, so six are in flight and only the first page (20 rows) is read.
// 140: the store is read here directly instead of through the scanner's strict catalogue client, which read up to
// four pages in sequence and dropped the prices. The public store lists one row per restaurant that sells a wine,
// so its prices are restaurant prices: their median says which wine of a winery a list line at 30 € most likely is.
const STORE139 = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
export type StoreRow140 = PublicGlobalRow103 & { bottlePrice: number | null };
const parseRow140 = (value: unknown): StoreRow140 | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const text = (field: unknown) => typeof field === 'string' && field.trim() && field.length <= 240 ? field.replace(/\s+/g, ' ').trim() : null;
  const name = text(raw.name), winery = text(raw.winery);
  if (typeof raw.id !== 'number' || !Number.isSafeInteger(raw.id) || raw.id <= 0 || !name || !winery) return null;
  const vintage = /^(19|20)\d{2}$/.test(String(raw.vintage ?? '')) ? String(raw.vintage) : null;
  const bottle = (Array.isArray(raw.prices) ? raw.prices : []).flatMap(price => {
    const item = price && typeof price === 'object' ? price as Record<string, unknown> : {};
    const amount = Number(item.price);
    return item.variant === 'botella' && Number.isFinite(amount) && amount >= 6 && amount <= 900 ? [amount] : [];
  })[0] ?? null;
  return { id: raw.id, name, winery, slugname: typeof raw.slugname === 'string' ? raw.slugname : '_', vintage, subname: text(raw.subname), type: text(raw.type),
    region: text(raw.region), country: text(raw.country), photo: typeof raw.photo === 'string' && /^https:\/\/app\.winerim\.com\//.test(raw.photo) ? raw.photo : null,
    grapes: Array.isArray(raw.grapes) ? raw.grapes.slice(0, 20) : [], tastingAttributes: raw.tastingAttributes, bottlePrice: bottle } as StoreRow140;
};
const cache = new Map<string, Promise<readonly StoreRow140[]>>();
let running = 0; const waiting: Array<() => void> = [];
const slot = async <T,>(work: () => Promise<T>): Promise<T> => {
  if (running >= 6) await new Promise<void>(resolve => waiting.push(resolve));
  running += 1;
  try { return await work(); } finally { running -= 1; waiting.shift()?.(); }
};
const readPage140 = async (query: string, page: number, signal?: AbortSignal) => {
  const response = await fetch(`${STORE139}?${new URLSearchParams({ page: String(page), text: query, store: '1' })}`,
    { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error('STORE_UNAVAILABLE');
  const body = await response.json() as { count?: unknown; results?: unknown };
  return { count: typeof body.count === 'number' ? body.count : 0, rows: Array.isArray(body.results) ? body.results.slice(0, 20).flatMap(row => parseRow140(row) ?? []) : [] };
};
export const searchStore139 = (query: string, signal?: AbortSignal): Promise<readonly StoreRow140[]> => {
  const id = key(query); if (id.length < 2 || query.length > 120) return Promise.resolve([]);
  const cached = cache.get(id); if (cached) return cached;
  // The shared request is not tied to one caller's signal: another line of the same list may be waiting for it.
  const pending = slot(async () => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const first = await readPage140(query.trim(), 1, controller.signal);
      const seen = new Set<number>();
      return first.rows.filter(row => !seen.has(row.id) && seen.add(row.id) && !/\b\d+([.,]\d+)?\s*(euros?|€)/i.test(`${row.name} ${row.subname ?? ''}`));
    } finally { clearTimeout(timer); }
  });
  cache.set(id, pending); pending.catch(() => cache.delete(id));
  return signal ? Promise.race([pending, new Promise<never>((_, reject) => signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }))]) : pending;
};
const median = (values: number[]) => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null; };
/** Which option a list price points at: the wine whose usual restaurant price is closest, when one clearly is. */
export const likelyByPrice140 = (options: readonly StoreEstimate138[], listPrice: number | null | undefined): StoreEstimate138 | null => {
  if (typeof listPrice !== 'number' || !Number.isFinite(listPrice) || listPrice <= 0) return null;
  const ranked = options.filter(item => typeof item.typicalPrice === 'number' && item.typicalPrice > 0)
    .map(item => ({ item, gap: Math.abs(Math.log(listPrice / (item.typicalPrice as number))) })).sort((a, b) => a.gap - b.gap);
  if (!ranked.length || ranked[0].gap > 0.36) return null;
  return ranked.length === 1 || ranked[1].gap - ranked[0].gap >= 0.12 ? ranked[0].item : null;
};
export const estimateListing139 = async (line: ListingLine139, signal?: AbortSignal): Promise<ListingMatch139 | null> => {
  const read = readListingLine139(line);
  if (read.query.length < 2) return null;
  try { return matchListing139(line, await searchStore139(read.query, signal)); }
  catch { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); return null; }
};
