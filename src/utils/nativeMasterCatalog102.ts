import { z } from 'zod';
import { canAdmitNativeCatalogLookup97 } from './nativeCatalogAdmission97';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { hasWinerimGeographyConflict, type WinerimOriginalIdentity } from './winerimOriginalSheet';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';
import type { MatchrimProfileLike } from './matchrimPassport';
import type { WineCandidate } from './multiWineScan';
import { hasMissingVisibleQualifier102 } from './nativeWineQualifier102';

// This is an opt-in application read contract, NOT an observed/deployed route.
// Never substitute an admin URL, a recommendation sample or the GT manifest.
const text = (max: number) => z.string().trim().min(1).max(max)
  .refine(value => !Array.from(value).some(char => {
    const code = char.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
  }));
const vintage = z.string().regex(/^(19|20)\d{2}$/).nullable();
const identitySchema = z.object({
  namespace: z.literal('mantalak'), id: z.string().regex(/^[1-9]\d{0,14}$/),
  name: text(160), producer: text(160), vintage,
  region: text(160).nullable(), country: text(160).nullable(),
}).strict();
const axis = z.number().finite().min(0).max(5);
const sensorySchema = z.object({
  vintage, scale: z.literal('winerim-0-5'),
  provenance: z.enum(['winerim-source', 'winerim-generated']), sourceReference: text(240),
  attributes: z.object({ power: axis, acidity: axis, sweetness: axis, tannin: axis, fruity: axis }).strict(),
}).strict();
const recordSchema = identitySchema.extend({ sensory: sensorySchema.nullable() }).strict();
const searchSchema = z.object({
  contract: z.literal('matchrim-master-catalogue-v1'), scope: z.literal('full-master'),
  complete: z.literal(true), count: z.number().int().min(0).max(5),
  matches: z.array(identitySchema).max(5),
}).strict();
const detailSchema = z.object({ contract: z.literal('matchrim-master-catalogue-v1'),
  scope: z.literal('full-master'), wine: recordSchema }).strict();

export type NativeMasterRecord102 = Readonly<z.infer<typeof recordSchema>>;
const verifiedRecords = new WeakSet<object>();
export type NativeMasterOutcome102 =
  | { status: 'verified'; record: NativeMasterRecord102 }
  | { status: 'not-configured' | 'identity-required' | 'not-found' | 'ambiguous' | 'unavailable' };

const sameIdentity = (input: WinerimOriginalIdentity, row: z.infer<typeof identitySchema>) =>
  !hasConflictingNativeVintage100({ name: row.name, vintage: row.vintage }) && isSafeCanonicalLabelMatch(input, row)
  && String(input.vintage ?? '') === String(row.vintage ?? '')
  && !hasWinerimGeographyConflict({
    region: input.inferredFields?.includes('region') ? null : input.region,
    country: input.inferredFields?.some(field => /^(country|pais|país)$/i.test(field)) ? null : input.country,
  }, row);

export const isVerifiedNativeMaster102 = (input: WinerimOriginalIdentity & { evidence?: readonly string[] }, value: unknown): value is NativeMasterRecord102 =>
  Boolean(value && typeof value === 'object' && verifiedRecords.has(value)
    && !hasMissingVisibleQualifier102(input) && sameIdentity(input, value as NativeMasterRecord102));

export const nativeMasterEndpoint102 = (value?: string): string | null => {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin === 'https://app.winerim.com' && url.href === value
      && url.pathname === '/api/v1/matchrim/catalogue'
      && !url.username && !url.password && !url.search && !url.hash ? url.href : null;
  } catch { return null; }
};

export const lookupNativeMaster102 = async (
  input: WinerimOriginalIdentity, endpoint?: string, signal?: AbortSignal, fetcher: typeof fetch = fetch,
): Promise<NativeMasterOutcome102> => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (!endpoint) return { status: 'not-configured' };
  const base = nativeMasterEndpoint102(endpoint);
  if (!base) return { status: 'unavailable' };
  if (!input.name?.trim() || !input.producer?.trim()
    || input.inferredFields?.some(field => /^(name|nombre|producer|productor|winery|bodega|vintage|anada|añada|year)$/i.test(field))) {
    return { status: 'identity-required' };
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 3500);
  let calls = 0;
  // Race all transport operations as some platform adapters ignore AbortSignal.
  const bounded = <T,>(work: Promise<T>) => new Promise<T>((resolve, reject) => {
    const stop = () => reject(new DOMException('Cancelled', 'AbortError'));
    if (controller.signal.aborted) { void work.catch(() => undefined); stop(); return; }
    controller.signal.addEventListener('abort', stop, { once: true });
    void work.then(value => { controller.signal.removeEventListener('abort', stop); resolve(value); },
      error => { controller.signal.removeEventListener('abort', stop); reject(error); });
  });
  const read = async (params: URLSearchParams): Promise<unknown> => {
    if (controller.signal.aborted || ++calls > 2) throw new Error('MASTER_READ_BOUND');
    const url = `${base}?${params}`;
    const pending = fetcher(url, { method: 'GET', credentials: 'omit', redirect: 'error',
      referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal: controller.signal });
    void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
    const response = await bounded(pending);
    if (!response.ok || response.redirected || (response.url && response.url !== url) || !response.body
      || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
      void response.body?.cancel().catch(() => undefined); throw new Error('MASTER_UNAVAILABLE');
    }
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => undefined); };
    controller.signal.addEventListener('abort', cancel, { once: true });
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let body = '', bytes = 0;
    try {
      while (true) {
        const item = await bounded(reader.read());
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (item.done) break;
        bytes += item.value.byteLength;
        if (bytes > 262144) throw new Error('MASTER_BODY_BOUND');
        body += decoder.decode(item.value, { stream: true });
      }
      return JSON.parse(body + decoder.decode());
    } catch (error) { cancel(); throw error; }
    finally {
      controller.signal.removeEventListener('abort', cancel);
      try { reader.releaseLock(); } catch { /* Aborted adapters can retain a pending read. */ }
    }
  };
  try {
    const params = new URLSearchParams({ name: input.name.trim(), producer: input.producer.trim(), vintage: String(input.vintage ?? '') });
    const search = searchSchema.safeParse(await read(params));
    if (!search.success || search.data.count !== search.data.matches.length) return { status: 'unavailable' };
    if (!search.data.count) return { status: 'not-found' };
    if (new Set(search.data.matches.map(row => row.id)).size !== search.data.matches.length) return { status: 'ambiguous' };
    const matches = search.data.matches.filter(row => sameIdentity(input, row));
    if (matches.length !== 1) return { status: 'ambiguous' };
    const selected = matches[0];
    const detail = detailSchema.safeParse(await read(new URLSearchParams({ id: selected.id, vintage: selected.vintage ?? '' })));
    if (!detail.success || detail.data.wine.id !== selected.id
      || !sameIdentity(input, detail.data.wine) || !sameIdentity({ ...selected, name: selected.name }, detail.data.wine)) return { status: 'ambiguous' };
    const record = detail.data.wine;
    if (record.sensory && record.sensory.vintage !== record.vintage) return { status: 'ambiguous' };
    if (record.sensory) { Object.freeze(record.sensory.attributes); Object.freeze(record.sensory); }
    Object.freeze(record); verifiedRecords.add(record);
    return { status: 'verified', record };
  } catch {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return { status: 'unavailable' };
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); controller.abort(); }
};

export const applyNativeMaster102 = (
  candidate: WineCandidate, profile: MatchrimProfileLike | null, record: NativeMasterRecord102,
): WineCandidate => {
  if (!canAdmitNativeCatalogLookup97(candidate) || hasMissingVisibleQualifier102(candidate) || !isVerifiedNativeMaster102(candidate, record)) return candidate;
  const attrs = record.sensory?.attributes;
  const sensoryAttributes = attrs ? { scale: 'winerim-0-5' as const, potencia: attrs.power,
    acidez: attrs.acidity, dulzura: attrs.sweetness, taninos: attrs.tannin, afrutado: attrs.fruity } : null;
  const affinity = calculateLocalMatchrimAffinity(profile, sensoryAttributes);
  return { ...candidate, canonicalId: `mantalak:${record.id}`, masterRecord: record,
    originalSheet: null, source: 'catalog', sensorySource: 'catalog', sensoryAttributes, affinity,
    affinityConfidence: null,
    affinityReason: !attrs ? 'Vino identificado en Winerim; faltan datos sensoriales de esta añada.'
      : !profile ? 'Vino identificado en Winerim. Completa tu perfil para calcular tu afinidad.'
        : `Afinidad orientativa con tu perfil. ${record.sensory?.provenance === 'winerim-generated'
          ? 'Datos sensoriales generados en Winerim, no una cata verificada.' : 'Datos sensoriales de la fuente indicada en Winerim.'}`,
  };
};

export const nativeMasterAudit102 = (candidate: WineCandidate) => {
  const record = candidate.masterRecord;
  if (!isVerifiedNativeMaster102(candidate, record) || candidate.canonicalId !== `mantalak:${record.id}`) return null;
  return { namespace: record.namespace, id: record.id, vintage: record.vintage,
    sensory_vintage: record.sensory?.vintage ?? null, provenance: record.sensory?.provenance ?? null,
    source_reference: record.sensory?.sourceReference ?? null, public_fiche_verified: false };
};
