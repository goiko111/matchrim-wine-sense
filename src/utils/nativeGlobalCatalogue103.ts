import { z } from 'zod';
import type { WineCandidate } from './multiWineScan';
import type { MatchrimProfileLike } from './matchrimPassport';
import { canAdmitNativeCatalogLookup97 } from './nativeCatalogAdmission97';
import { hasMissingVisibleQualifier102 } from './nativeWineQualifier102';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';
import { nonVintageYear105 } from './wineYearRole105';
import { hasExactWinerimProducer, hasWinerimGeographyConflict, canLookupWinerimOriginal,
  validateWinerimOriginalSensory, type WinerimOriginalIdentity } from './winerimOriginalSheet';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { isNonWineIdentity } from './wineCategory';
import { safeWineImageUrl98 } from './wineImage98';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';

// Observed public Matchrim store, not the administrative Mantalak namespace.
const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const text = z.string().trim().min(1).max(240).refine(value => !Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159) || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
}));
// Observed catalogue subnames may be ASCII spaces. Missing optional metadata is
// null, never evidence; identity fields keep the strict nonempty text schema.
const optionalText = z.preprocess(value => typeof value === 'string' && value.length <= 240 && /^ *$/.test(value) ? null : value, text.nullish());
// A few public names use tabs as word separators. This is response formatting,
// not OCR correction; query input and all other controls remain strict.
const responseName = z.preprocess(value => typeof value === 'string' && value.length <= 240
  ? value.replace(/\t+/g, ' ') : value, text);
const rowSchema = z.object({ id: z.number().int().positive().safe(), name: responseName, winery: text,
  slugname: z.string().regex(/^(?:[a-z0-9][a-z0-9_-]{0,239}|_(?:19|20)\d{2})$/i),
  vintage: z.union([z.string().regex(/^(19|20)\d{2}$/), z.number().int().min(1900).max(2099)]).nullable(),
  subname: optionalText, type: optionalText, region: optionalText, country: optionalText,
  photo: z.string().nullish(), grapes: z.array(z.unknown()).max(100).optional(), tastingAttributes: z.unknown().optional(),
});
type Row = z.infer<typeof rowSchema>;
export type PublicGlobalRow103 = Row;
export type GlobalWine103 = Readonly<{
  namespace: 'winerim-public-store'; id: number; name: string; producer: string; vintage: string | null;
  region: string | null; country: string | null; slug: string; url: string; photo: string | null;
  sensory: ReturnType<typeof validateWinerimOriginalSensory>; provenance: 'unspecified';
}>;
export type GlobalLookup103 = { status: 'exact' | 'reference'; wine: GlobalWine103 }
  | { status: 'identity-required' | 'not-found' | 'ambiguous' | 'incomplete' | 'unavailable' };
const trusted = new WeakSet<object>();
const observedSelections = new WeakSet<object>();
const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
// A brand embedded in the cuvee name is not a second, independent winery read.
// Explicit manual selection remains possible; this only gates automatic linking.
export const independentGlobalProducer103 = (input: WinerimOriginalIdentity & { evidence?: readonly string[] }) => {
  const literalProducer = key(input.producer || '');
  const producer = literalProducer.replace(/^(bodegas?|winery) /, '');
  if (!producer || !(` ${key(input.name)} `).includes(` ${producer} `)) return true;
  const fragments = (input.evidence || []).map(key);
  if (fragments.some(fragment => fragment.replace(/^(bodegas?|winery) /, '') === producer)) return true;
  const explicitRole = /^(bodegas?|winery|finca|domaine|chateau|quinta|weingut|tenuta)\b/.test(literalProducer);
  return explicitRole && fragments.some((fragment, index) =>
    (` ${fragment} ${fragments[index + 1] || ''} `).includes(` ${literalProducer} `));
};
const identity = (row: Row) => {
  const sub = row.subname && !(` ${key(row.name)} `).includes(` ${key(row.subname)} `) ? row.subname : '';
  return { name: [row.name, sub].filter(Boolean).join(' '), producer: row.winery,
    vintage: row.vintage == null ? null : String(row.vintage), region: row.region ?? null, country: row.country ?? null };
};
const withoutYear = (value: WinerimOriginalIdentity) => ({ ...value,
  name: value.vintage ? value.name.replace(new RegExp(`\\s+\\(?${value.vintage}\\)?$`), '').trim() : value.name,
  vintage: null });
const sameReference = (input: WinerimOriginalIdentity, wine: WinerimOriginalIdentity) =>
  !hasConflictingNativeVintage100(wine) && hasExactWinerimProducer(input.producer, wine.producer)
  && isSafeCanonicalLabelMatch(withoutYear(input), withoutYear(wine))
  && !hasWinerimGeographyConflict({ region: input.inferredFields?.includes('region') ? null : input.region,
    country: input.inferredFields?.some(field => /^(country|pais|país)$/i.test(field)) ? null : input.country }, wine);
export const isGlobalWine103 = (input: WinerimOriginalIdentity & { evidence?: readonly string[] }, wine: unknown): wine is GlobalWine103 =>
  Boolean(wine && typeof wine === 'object' && trusted.has(wine) && canLookupWinerimOriginal(input)
    && !hasConflictingNativeVintage100(input) && !hasMissingVisibleQualifier102(input)
    && !nonVintageYear105(input.vintage, input.evidence || [])
    && sameReference(input, wine as GlobalWine103)
    && ((wine as GlobalWine103).vintage === null || String(input.vintage ?? '') === (wine as GlobalWine103).vintage));

export const globalSensory103 = (wine: GlobalWine103) => wine.sensory ? { scale: 'winerim-0-5' as const,
  potencia: wine.sensory.power, acidez: wine.sensory.acidity, dulzura: wine.sensory.sweetness,
  taninos: wine.sensory.tannin, afrutado: wine.sensory.fruity } : null;
export const exactGlobalVintage103 = (input: WinerimOriginalIdentity, wine: GlobalWine103) =>
  input.vintage != null && wine.vintage != null && String(input.vintage) === wine.vintage;

// Each operation has a total deadline, bounded streaming and cancellation even
// when a native fetch adapter ignores AbortSignal. No cookies, keys or model API.
export const createGlobalCatalogue103 = (fetcher: typeof fetch = fetch) => {
  const operation = async <T,>(signal: AbortSignal | undefined, work: (read: (url: string) => Promise<unknown>) => Promise<T>): Promise<T> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 12000);
    const bound = <V,>(pending: Promise<V>) => new Promise<V>((resolve, reject) => {
      const stop = () => reject(new DOMException('Cancelled', 'AbortError'));
      if (controller.signal.aborted) { void pending.catch(() => undefined); stop(); return; }
      controller.signal.addEventListener('abort', stop, { once: true });
      void pending.then(value => { controller.signal.removeEventListener('abort', stop); resolve(value); },
        error => { controller.signal.removeEventListener('abort', stop); reject(error); });
    });
    const read = async (url: string): Promise<unknown> => {
      if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const pending = fetcher(url, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' }, signal: controller.signal });
      void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
      const response = await bound(pending);
      if (!response.ok || response.redirected || (response.url && response.url !== url) || !response.body
        || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
        void response.body?.cancel().catch(() => undefined); throw new Error('CATALOGUE_UNAVAILABLE');
      }
      const reader = response.body.getReader();
      const cancel = () => { void reader.cancel().catch(() => undefined); };
      controller.signal.addEventListener('abort', cancel, { once: true });
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let bytes = 0, body = '';
      try {
        while (true) {
          const item = await bound(reader.read());
          if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
          if (item.done) break;
          bytes += item.value.byteLength;
          if (bytes > 262144) throw new Error('CATALOGUE_BODY_BOUND');
          body += decoder.decode(item.value, { stream: true });
        }
        return JSON.parse(body + decoder.decode());
      } catch (error) { cancel(); throw error; }
      finally { controller.signal.removeEventListener('abort', cancel); try { reader.releaseLock(); } catch { /* Native pending read. */ } }
    };
    try { return await work(read); }
    finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); }
  };
  const search = async (query: string, signal?: AbortSignal, allowPartialProposals = false, paginateProposals = false) => {
    if (!text.safeParse(query).success || query.trim().length < 2 || query.length > 120) return { status: 'identity-required' as const, rows: [] as Row[] };
    try {
      return await operation(signal, async read => {
        if (paginateProposals && allowPartialProposals) {
          // Trust the bounded page envelope before inspecting individual rows.
          // Schema damage is recoverable only for explicit, incomplete proposals.
          const envelope = z.object({ count: z.number().int().nonnegative().safe(), page: z.number().int().positive(),
            results: z.array(z.unknown()).max(20) });
          const rows: Row[] = [], seenIds = new Set<number>();
          let duplicate = false;
          const finish = (status: 'complete' | 'partial' | 'incomplete') => {
            if (duplicate) return { status: 'ambiguous' as const, rows: [] as Row[] };
            for (const row of rows) { Object.freeze(row); observedSelections.add(row); }
            return { status, rows: rows.filter(row => !isNonWineIdentity(row.name, row.type)) };
          };
          const append = (values: unknown[]) => {
            let malformed = false;
            for (const value of values) {
              // An invalid row cannot hide a collision with a valid public ID.
              const id = value && typeof value === 'object' && 'id' in value ? value.id : undefined;
              if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0) {
                if (seenIds.has(id)) duplicate = true;
                seenIds.add(id);
              }
              const parsed = rowSchema.safeParse(value);
              if (parsed.success) rows.push(parsed.data);
              else malformed = true;
            }
            return malformed;
          };
          const first = envelope.safeParse(await read(`${root}?${new URLSearchParams({ page: '1', text: query.trim(), store: '1' })}`));
          if (!first.success || first.data.page !== 1 || first.data.count < first.data.results.length) return finish('incomplete');
          const malformed = append(first.data.results);
          if (malformed || (first.data.count <= 80 && first.data.count > rows.length && first.data.results.length !== 20)) return finish('incomplete');
          if (first.data.count > rows.length && first.data.count <= 80) {
            for (let number = 2; number <= Math.ceil(first.data.count / 20); number++) {
              const next = envelope.safeParse(await read(`${root}?${new URLSearchParams({ page: String(number), text: query.trim(), store: '1' })}`));
              const expected = Math.min(20, first.data.count - (number - 1) * 20);
              if (!next.success || next.data.count !== first.data.count || next.data.page !== number
                || next.data.results.length !== expected) return finish('incomplete');
              if (append(next.data.results)) return finish('incomplete');
            }
          }
          return finish(first.data.count === rows.length ? 'complete' : 'partial');
        }
        const page = z.object({ count: z.number().int().nonnegative().safe(), page: z.literal(1), results: z.array(rowSchema).max(20) })
          .safeParse(await read(`${root}?${new URLSearchParams({ page: '1', text: query.trim(), store: '1' })}`));
        if (!page.success || page.data.count < page.data.results.length) return { status: 'incomplete' as const, rows: [] as Row[] };
        if (page.data.count !== page.data.results.length && !allowPartialProposals) return { status: 'incomplete' as const, rows: [] as Row[] };
        const rows = [...page.data.results];
        if (new Set(rows.map(row => row.id)).size !== rows.length) return { status: 'ambiguous' as const, rows: [] as Row[] };
        for (const row of rows) { Object.freeze(row); observedSelections.add(row); }
        return { status: page.data.count === rows.length ? 'complete' as const : 'partial' as const,
          rows: rows.filter(row => !isNonWineIdentity(row.name, row.type)) };
      });
    } catch { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); return { status: 'unavailable' as const, rows: [] as Row[] }; }
  };
  const lookup = async (input: WinerimOriginalIdentity & { evidence?: readonly string[] }, signal?: AbortSignal, selectedPublicId?: number): Promise<GlobalLookup103> => {
    if (!canLookupWinerimOriginal(input) || hasConflictingNativeVintage100(input) || hasMissingVisibleQualifier102(input)
      || nonVintageYear105(input.vintage, input.evidence || [])) return { status: 'identity-required' };
    if (selectedPublicId !== undefined && (!Number.isSafeInteger(selectedPublicId) || selectedPublicId <= 0)) return { status: 'identity-required' };
    const query = input.name.trim().replace(new RegExp(`\\s+\\(?${input.vintage || 'NONE'}\\)?$`), '').trim();
    let page = await search(query, signal, selectedPublicId !== undefined);
    if (page.status === 'incomplete' && input.producer) page = await search(input.producer.trim(), signal);
    // The observed API searches the wine name, not a concatenated winery/name.
    // A literal producer prefix may be omitted from the query, never the match.
    const producer = key(input.producer || ''), name = key(query);
    const shorter = producer && name.startsWith(producer + ' ') ? name.slice(producer.length + 1) : null;
    if (page.status === 'complete' && !page.rows.length && shorter && shorter.length >= 2) page = await search(shorter, signal);
    // A human-selected public ID needs independent detail verification, not a
    // claim that an incomplete search page contains every possible reference.
    if (page.status !== 'complete' && !(page.status === 'partial' && selectedPublicId !== undefined)) return { status: page.status === 'partial' ? 'incomplete' : page.status };
    const matches = page.rows.filter(row => sameReference(input, identity(row)) && (selectedPublicId === undefined || row.id === selectedPublicId));
    const exact = matches.filter(row => String(row.vintage ?? '') === String(input.vintage ?? ''));
    const possible = exact.length ? exact : matches.filter(row => row.vintage == null);
    if (!possible.length) return { status: 'not-found' };
    if (possible.length !== 1) return { status: 'ambiguous' };
    return verifySelection(input, possible[0], signal);
  };
  const verifySelection = async (input: WinerimOriginalIdentity, selected: Row, signal?: AbortSignal): Promise<GlobalLookup103> => {
    try {
      return await operation(signal, async read => {
        const parsed = rowSchema.safeParse(await read(`${root}/${selected.id}/${selected.slugname}`));
        if (!parsed.success) return { status: 'unavailable' };
        const detail = parsed.data, id = identity(detail), previous = identity(selected);
        if (detail.id !== selected.id || detail.slugname !== selected.slugname || isNonWineIdentity(detail.name, detail.type)
          || !sameReference(input, id) || !sameReference(previous, id) || id.vintage !== previous.vintage) return { status: 'ambiguous' };
        const sensory = validateWinerimOriginalSensory(detail.tastingAttributes);
        if (sensory) Object.freeze(sensory);
        const wine: GlobalWine103 = Object.freeze({ namespace: 'winerim-public-store', id: detail.id, ...id,
          slug: detail.slugname, url: `https://web.winerim.com/matchrim/store/${detail.id}/${detail.slugname}`,
          photo: safeWineImageUrl98(detail.photo) || null, sensory, provenance: 'unspecified' });
        trusted.add(wine);
        return { status: exactGlobalVintage103(input, wine) ? 'exact' : 'reference', wine };
      });
    } catch { if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError'); return { status: 'unavailable' }; }
  };
  const confirmSelection = async (input: WinerimOriginalIdentity & { evidence?: readonly string[] }, selected: Row, signal?: AbortSignal): Promise<GlobalLookup103> => {
    if (!observedSelections.has(selected) || !rowSchema.safeParse(selected).success || !canLookupWinerimOriginal(input)
      || hasConflictingNativeVintage100(input) || hasMissingVisibleQualifier102(input)
      || nonVintageYear105(input.vintage, input.evidence || [])
      || !sameReference(input, identity(selected))
      || (selected.vintage != null && String(input.vintage ?? '') !== String(selected.vintage))) return { status: 'identity-required' };
    return verifySelection(input, selected, signal);
  };
  const searchProposals = (query: string, signal?: AbortSignal) => search(query, signal, true, true);
  return { search, searchProposals, lookup, confirmSelection };
};
export const lookupGlobalCatalogue103 = (input: WinerimOriginalIdentity & { evidence?: readonly string[] }, signal?: AbortSignal) =>
  createGlobalCatalogue103().lookup(input, signal);

export const applyGlobalCatalogue103 = (candidate: WineCandidate, profile: MatchrimProfileLike | null, wine: GlobalWine103, manual = false): WineCandidate => {
  if ((!manual && (!canAdmitNativeCatalogLookup97(candidate) || !independentGlobalProducer103(candidate))) || !isGlobalWine103(candidate, wine)) return candidate;
  const exact = exactGlobalVintage103(candidate, wine);
  const sensoryAttributes = exact ? globalSensory103(wine) : null;
  return { ...candidate, globalRecord: wine, masterRecord: null, originalSheet: null,
    canonicalId: exact ? `winerim-public-store:${wine.id}` : null, sensoryAttributes, sensorySource: 'catalog',
    affinity: calculateLocalMatchrimAffinity(profile, sensoryAttributes), affinityConfidence: null,
    affinityReason: exact ? 'Afinidad orientativa con la ficha pública de Winerim. La API no indica si los atributos proceden de una cata o han sido generados.'
      : `Winerim tiene esta referencia sin añada. ${candidate.vintage ? `No verifica la ficha sensorial de ${candidate.vintage}.` : 'La cosecha de tu botella no está confirmada.'} Puedes consultar su estilo general por separado.` };
};
