import { canAdmitNativeCatalogLookup97, type NativeCatalogAdmissionCandidate97 } from './nativeCatalogAdmission97';
import { hasMissingVisibleQualifier102 } from './nativeWineQualifier102';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { hasWinerimGeographyConflict } from './winerimOriginalSheet';
import { masterSearchParams188, parseMasterPage188, parseMasterDetail188, masterVintageEvidence188,
  type MasterQuery188, type MasterDetail188 } from './nativeMasterContract188';

// Prepared for the authenticated server bridge, not the old proposed102wire
// contract. The app does not import/activate this adapter until hosted QA passes.
export type MasterOperation195 = { operation: 'search'; query: MasterQuery188 }
  | { operation: 'detail'; mantalakWineId: number };
export type MasterInvoke195 = (operation: MasterOperation195, signal: AbortSignal) => Promise<unknown>;
type AuthenticatedFunctions195 = { invoke: (name: string, options: {
  method: 'POST'; body: MasterOperation195; signal: AbortSignal;
}) => Promise<{ data: unknown; error: unknown }> };
// Pass the existing signed-in Supabase functions client. It owns the user JWT;
// the catalogue key is never a constructor argument, header or native setting.
export const createMasterBridgeInvoker195 = (functions: AuthenticatedFunctions195): MasterInvoke195 => async (operation, signal) => {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  const response = await functions.invoke('matchrim-master-catalog', { method: 'POST', body: operation, signal });
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (response.error) throw new Error('MASTER_BRIDGE_UNAVAILABLE');
  return response.data;
};
type Evidence195 = ReturnType<typeof masterVintageEvidence188>;
export const describeMasterSensory195 = (wine: MasterDetail188, requested: string | null) => {
  const evidence = masterVintageEvidence188(wine, requested), row = evidence.sensory;
  return {
    scope: evidence.scope,
    requestedVintage: requested,
    sourceVintage: row?.vintage ?? null,
    axes: (['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const).map(axis => {
      const value = row?.[axis] ?? null;
      const status = value === null ? 'missing' : value === 0 ? 'not-applicable'
        : value === 3 ? 'default-indistinguishable' : row?.source ? 'ai-estimate' : 'origin-unrecorded';
      return { axis, value, status, usableForAffinity: false, usableForLearning: false };
    }),
    // An origin on the row does not identify default-bearing axes. These
    // descriptions explain the gap; they are not inferred per-axis provenance.
    perAxisProvenanceAvailable: false,
  };
};
export type MasterReferenceOutcome195 = {
  status: 'reference-match'; wine: MasterDetail188; vintage: Evidence195;
  sensory: ReturnType<typeof describeMasterSensory195>;
  imageIdentityConfirmed: false; affinityAttributes: null; learningEligible: false;
} | { status: 'identity-required' | 'not-found' | 'incomplete' | 'ambiguous' | 'unavailable';
  total?: number; catalogueAbsenceConfirmed?: false; lookupScope?: 'search-response-only';
  imageIdentityConfirmed: false; affinityAttributes: null; learningEligible: false };
const pending = (status: Exclude<MasterReferenceOutcome195['status'], 'reference-match'>, total?: number): MasterReferenceOutcome195 =>
  ({ status, ...(total === undefined ? {} : { total }),
    // A real detail exists for La Migratoria while its literal search is empty.
    // Do not turn search coverage into a claim of absence from the master.
    ...(status === 'not-found' ? { catalogueAbsenceConfirmed: false as const, lookupScope: 'search-response-only' as const } : {}),
    imageIdentityConfirmed: false, affinityAttributes: null, learningEligible: false });

const sameReference = (input: NativeCatalogAdmissionCandidate97, wine: Pick<MasterDetail188, 'name' | 'winery' | 'region' | 'country'>) =>
  typeof wine.name === 'string' && typeof wine.winery === 'string'
  && isSafeCanonicalLabelMatch(input, { ...wine, producer: wine.winery, vintage: input.vintage })
  && !hasMissingVisibleQualifier102({ name: wine.name, evidence: input.evidence })
  && !hasWinerimGeographyConflict({ region: input.inferredFields?.includes('region') ? null : input.region,
    country: input.inferredFields?.some(field => /^(country|pais|país)$/i.test(field)) ? null : input.country }, wine);

export const lookupMasterReference195 = async (
  input: NativeCatalogAdmissionCandidate97, invoke: MasterInvoke195, signal?: AbortSignal, timeoutMs = 8000,
): Promise<MasterReferenceOutcome195> => {
  if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
  try {
    if (!canAdmitNativeCatalogLookup97(input) || hasMissingVisibleQualifier102(input)) return pending('identity-required');
  } catch { return pending('identity-required'); }
  const requested = input.vintage == null ? null : String(input.vintage);
  const query: MasterQuery188 = { name: input.name.trim(), winery: input.producer!.trim(),
    ...(requested ? { vintage: requested, vintageMatch: 'prefer' } : {}), limit: 50, page: 1 };
  if (!masterSearchParams188(query)) return pending('identity-required');
  const controller = new AbortController(); let stop: () => void = () => undefined;
  const deadline = new Promise<never>((_resolve, reject) => { stop = () => reject(new Error('STOPPED')); });
  const abort = () => { controller.abort(); stop(); };
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  let calls = 0;
  const read = async (operation: MasterOperation195) => {
    if (controller.signal.aborted || ++calls > 2) throw new Error('MASTER_READ_BOUND');
    const result = await Promise.race([invoke(operation, controller.signal), deadline]);
    // A transport may resolve in the same turn in which it ignores cancellation.
    if (controller.signal.aborted) throw new Error('STOPPED');
    return result;
  };
  try {
    const page = parseMasterPage188(await read({ operation: 'search', query }), 1, 50);
    if (!page) return pending('unavailable');
    // An exact-looking row in a partial page does not prove uniqueness.
    if (page.total !== page.count) return pending('incomplete', page.total);
    if (!page.total) return pending('not-found', 0);
    const matches = page.results.filter(row => sameReference(input, row));
    if (matches.length !== 1) return pending('ambiguous', page.total);
    const selected = matches[0];
    const detail = parseMasterDetail188(await read({ operation: 'detail', mantalakWineId: selected.mantalakWineId }), selected.mantalakWineId);
    if (!detail || !sameReference(input, detail) || detail.name !== selected.name || detail.winery !== selected.winery
      || JSON.stringify([...detail.vintages].sort()) !== JSON.stringify([...selected.vintages].sort())) {
      return pending('ambiguous', page.total);
    }
    return { status: 'reference-match', wine: detail, vintage: masterVintageEvidence188(detail, requested),
      sensory: describeMasterSensory195(detail, requested),
      imageIdentityConfirmed: false, affinityAttributes: null, learningEligible: false };
  } catch {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return pending('unavailable');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); controller.abort(); }
};
