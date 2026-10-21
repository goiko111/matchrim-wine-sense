import { z } from 'zod';
import { isNonWineIdentity } from './wineCategory';
import { hasLabelProducerRoleConflict } from './winerimLabelIdentity';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';
import { canLookupWinerimOriginal, isVerifiedWinerimSheetForIdentity, lookupWinerimOriginalSheet,
  type WinerimOriginalIdentity, type WinerimOriginalLookupResult } from './winerimOriginalSheet';

const unsafeText = (value: string) => Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
});
const publicText = (max: number) => z.string().trim().min(1).max(max).refine(value => !unsafeText(value));
const idSchema = z.union([z.string(), z.number().int().positive().safe()]).transform(String)
  .refine(value => /^[a-z0-9][a-z0-9_-]{0,127}$/i.test(value) && !/^winerim-\d+$/i.test(value));
const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,239}$/i);
const vintageSchema = z.union([z.string(), z.number().int()]).nullable().optional()
  .transform(value => value == null || value === '' ? null : String(value).trim())
  .refine(value => value === null || /^(19|20)\d{2}$/.test(value));
const placeholder = /^(?:vino|wine|house wine|unknown|desconocid[oa]|sin (?:identificar|nombre|bodega)|n\/?a|tbd)$/i;
const candidateSchema = z.object({
  id: idSchema, name: publicText(120), winery: publicText(160), vintage: vintageSchema,
  slug: slugSchema, type: publicText(80).nullable(), region: publicText(160).nullable(),
}).strict().refine(value => !placeholder.test(value.name) && !placeholder.test(value.winery) && !isNonWineIdentity(value.name, value.type)
  && !hasConflictingNativeVintage100({ name: value.name, vintage: value.vintage })
  && canLookupWinerimOriginal({ name: value.name, producer: value.winery, vintage: value.vintage, region: value.region }));
const rowSchema = z.object({
  id: idSchema, name: publicText(120), subname: publicText(120).nullable().optional(),
  winery: publicText(160), vintage: vintageSchema, slugname: slugSchema,
  type: publicText(80).nullable().optional(), region: publicText(160).nullable().optional(),
  country: publicText(160).nullable().optional(),
}).strict();
const pageSchema = z.object({ page: z.literal(1), count: z.number().int().nonnegative().safe(),
  results: z.array(z.unknown()).max(20), limit: z.number().int().positive().max(20).optional() }).strip();
const resolverSchema = z.object({ restaurant: z.string().regex(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i) }).strip();

export interface WinerimCandidate95 {
  readonly id: string;
  readonly name: string;
  readonly winery: string;
  readonly vintage: string | null;
  readonly slug: string;
  readonly type: string | null;
  readonly region: string | null;
}

export type WinerimCandidateSearchResult95 =
  | { status: 'proposals'; query: string; proposals: readonly WinerimCandidate95[]; total: number }
  | { status: 'empty' | 'refine' | 'invalid-query' | 'unavailable' };

export const isWinerimCandidateQuery95 = (value: unknown): value is string => typeof value === 'string'
  && value.trim().length >= 2 && value.length <= 120
  && !unsafeText(value) && !value.includes('\\')
  && !/https?:|^\s*\/\//i.test(value);

const words = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, unknown> : null;

const parseCandidate = (value: unknown): WinerimCandidate95 | null => {
  const raw = object(value);
  if (!raw) return null;
  // Project public identity fields before strict validation; photos, prices, profiles
  // and sensory fields from the wire never become proposal evidence.
  const row = rowSchema.safeParse(Object.fromEntries(['id', 'name', 'subname', 'winery', 'vintage', 'slugname', 'type', 'region', 'country']
    .map(key => [key, raw[key]])));
  if (!row.success) return null;
  const wine = row.data;
  if (hasLabelProducerRoleConflict({ producer: wine.winery, region: wine.region, country: wine.country })) return null;
  const subname = wine.subname;
  const name = subname && !` ${words(wine.name)} `.includes(` ${words(subname)} `) ? `${wine.name} ${subname}` : wine.name;
  const parsed = candidateSchema.safeParse({ id: wine.id, name, winery: wine.winery, vintage: wine.vintage,
    slug: wine.slugname, type: wine.type ?? null, region: wine.region ?? null });
  return parsed.success ? Object.freeze(parsed.data) as WinerimCandidate95 : null;
};

export const winerimCandidateIdentity95 = (candidate: WinerimCandidate95): WinerimOriginalIdentity => ({
  name: candidate.name, producer: candidate.winery, vintage: candidate.vintage, region: candidate.region,
});

// Observed public Library sequence, not a global catalogue search or identity claim.
export const searchWinerimCandidates95 = async (
  query: string, signal?: AbortSignal, fetcher: typeof fetch = fetch, timeoutMs = 12000,
): Promise<WinerimCandidateSearchResult95> => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (!isWinerimCandidateQuery95(query)) return { status: 'invalid-query' };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, Number.isFinite(timeoutMs) ? Math.max(1, Math.min(12000, timeoutMs)) : 12000);
  const bounded = <T,>(work: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    const stop = () => reject(new DOMException('Cancelled', 'AbortError'));
    if (controller.signal.aborted) { void work.catch(() => undefined); stop(); return; }
    controller.signal.addEventListener('abort', stop, { once: true });
    void work.then(value => { controller.signal.removeEventListener('abort', stop); resolve(value); },
      error => { controller.signal.removeEventListener('abort', stop); reject(error); });
  });
  const read = async (path: string): Promise<unknown> => {
    const url = `https://app.winerim.com/api/v1/${path}`;
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    const pending = fetcher(url, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit',
      redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal });
    void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
    const response = await bounded(pending);
    const length = response.headers.get('content-length');
    if (!response.ok || response.redirected || (response.url && response.url !== url)
      || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '') || !response.body
      || (length !== null && (!/^\d+$/.test(length) || Number(length) > 262144))) {
      void response.body?.cancel().catch(() => undefined);
      throw new Error('Public Library unavailable');
    }
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let text = '', size = 0;
    try {
      while (true) {
        const chunk = await bounded(reader.read());
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 262144) { cancel(); throw new Error('Public Library response too large'); }
        text += decoder.decode(chunk.value, { stream: true });
      }
      return JSON.parse(text + decoder.decode());
    } catch (error) {
      cancel();
      throw error;
    } finally {
      controller.signal.removeEventListener('abort', cancel);
      try { reader.releaseLock(); } catch { /* A cancelled transport may still hold a pending read. */ }
    }
  };
  try {
    const resolver = resolverSchema.safeParse(await read('whoami/slugname?s=the-library'));
    if (!resolver.success) return { status: 'unavailable' };
    const params = new URLSearchParams({ page: '1', text: query.trim() });
    const page = pageSchema.safeParse(await read(`restaurant/${resolver.data.restaurant}/wines?${params}`));
    if (!page.success || page.data.count !== page.data.results.length) return { status: 'refine' };
    const proposals: WinerimCandidate95[] = [];
    const ids = new Set<string>();
    for (const row of page.data.results) {
      const proposal = parseCandidate(row);
      if (!proposal || ids.has(proposal.id)) return { status: 'refine' };
      ids.add(proposal.id);
      proposals.push(proposal);
    }
    if (!proposals.length) return { status: 'empty' };
    return { status: 'proposals', query: query.trim(), proposals: Object.freeze(proposals), total: proposals.length };
  } catch {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return { status: 'unavailable' };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
};

// Only the picker's explicit confirmation action calls this; a proposal alone
// is never an original fiche and never grants attributes, a score or save authority.
export const confirmWinerimCandidate95 = async (
  candidate: WinerimCandidate95, signal?: AbortSignal, fetcher: typeof fetch = fetch,
): Promise<WinerimOriginalLookupResult> => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  const parsed = candidateSchema.safeParse(candidate);
  if (!parsed.success) return { status: 'identity-required' };
  const selected = Object.freeze(parsed.data) as WinerimCandidate95;
  const identity = winerimCandidateIdentity95(selected);
  const outcome = await lookupWinerimOriginalSheet(identity, signal, fetcher);
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (outcome.status !== 'verified') return outcome;
  const expectedUrl = `https://web.winerim.com/the-library/wines/${selected.id}/${selected.slug}`;
  return outcome.sheet.id === selected.id && outcome.sheet.url === expectedUrl
    && isVerifiedWinerimSheetForIdentity(identity, outcome.sheet) ? outcome : { status: 'ambiguous' };
};
