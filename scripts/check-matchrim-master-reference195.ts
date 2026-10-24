import assert from 'node:assert/strict';
import fs from 'node:fs';
import { lookupMasterReference195, describeMasterSensory195, createMasterBridgeInvoker195,
  type MasterInvoke195, type MasterOperation195 } from '../src/utils/nativeMasterReference195';
import type { NativeCatalogAdmissionCandidate97 } from '../src/utils/nativeCatalogAdmission97';
import { createMasterBridge194 } from '../supabase/functions/_shared/matchrim-master194';
import type { SupabaseClient } from '@supabase/supabase-js';

const acceptsExistingSdk195 = (client: SupabaseClient) => createMasterBridgeInvoker195(client.functions);
void acceptsExistingSdk195; // Type-only compatibility check; never creates a client or session.

const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));
const zorrera = read('qa-fixtures/master193/2-BODY.json');
const vidure = read('qa-fixtures/master193/5-BODY.json');
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_MASTER_REFERENCE195'); };
let groups = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); groups++; console.log('PASS', name); };
// Controlled candidate inputs exercise admission, not new image/model output.
const candidate = (name = 'La Zorrera', producer = 'Chivite', vintage: string | null = '2015'): NativeCatalogAdmissionCandidate97 => ({
  name, producer, vintage, confidence: 0.9, evidence: [name, producer, ...(vintage ? [vintage] : [])],
});
const page = (detail = zorrera, others: unknown[] = []) => {
  const row = { ...detail, id: detail.representativePublicId, tastingAttributes: {}, representativePublicId: detail.representativePublicId };
  const results = [row, ...others]; return { results, count: results.length, total: results.length, page: 1, limit: 50, pageCount: 1 };
};
const transport = (search: unknown, detail: unknown) => {
  const operations: MasterOperation195[] = [];
  const invoke: MasterInvoke195 = async operation => {
    operations.push(operation); assert(operations.length <= 2);
    return structuredClone(operation.operation === 'search' ? search : detail);
  };
  return { invoke, operations };
};
try {
  await test('Observed Zorrera detail with controlled admitted input uses canonicalID, not publicID or invented102contract', async () => {
    const h = transport(page(), zorrera), result = await lookupMasterReference195(candidate(), h.invoke);
    assert.equal(result.status, 'reference-match'); assert.equal(h.operations.length, 2);
    assert.deepEqual(h.operations[1], { operation: 'detail', mantalakWineId: 180278 });
    assert(result.status === 'reference-match'); assert.equal(result.vintage.status, 'known'); assert.equal(result.vintage.scope, 'exact');
    assert.equal(result.vintage.sensory?.vintage, '2015'); assert.equal(result.affinityAttributes, null);
    assert.equal(result.imageIdentityConfirmed, false); assert.equal(result.learningEligible, false);
  });
  await test('Observed Vidure2020 keeps reference separate from unrecorded vintage and generic source', async () => {
    const h = transport(page(vidure), vidure);
    const result = await lookupMasterReference195(candidate('Vidure', 'Pago de Cirsus', '2020'), h.invoke);
    assert.equal(result.status, 'reference-match'); assert(result.status === 'reference-match');
    assert.deepEqual(result.wine.vintages, ['2018']); assert.equal(result.vintage.status, 'other-vintages-only');
    assert.equal(result.vintage.scope, 'generic'); assert.equal(result.vintage.sensory?.vintage, null);
    assert.equal(result.affinityAttributes, null); assert.equal(result.learningEligible, false);
    const query = h.operations[0]; assert(query.operation === 'search'); assert.equal(query.query.vintageMatch, 'prefer');
  });
  await test('Observed Meursault2024only cannot answer the2022sensory question or borrow its attributes', async () => {
    const detail = read('qa-fixtures/master194/responses/26-BODY.json');
    const h = transport(read('qa-fixtures/master194/responses/25-BODY.json'), detail);
    const result = await lookupMasterReference195(candidate('Meursault Les Grands Charrons', 'Pierre Girardin', '2022'), h.invoke);
    assert(result.status === 'reference-match'); assert.equal(result.vintage.status, 'other-vintages-only');
    assert.deepEqual(result.wine.vintages, ['2024']); assert.equal(result.vintage.scope, 'missing');
    assert.equal(result.vintage.sensory, null); assert.equal(result.affinityAttributes, null); assert.equal(result.learningEligible, false);
  });
  await test('Missing/inferred identity, visible omitted qualifiers and weak evidence make zero calls', async () => {
    for (const input of [{ ...candidate(), producer: null }, { ...candidate(), confidence: 0.71 },
      { ...candidate(), inferredFields: ['producer'] }, { ...candidate(), evidence: ['La Zorrera'] },
      { ...candidate(), evidence: ['La Zorrera', 'Chivite', '2015', 'Premier cru "Les Pucelles"'] }]) {
      const h = transport(page(), zorrera); assert.equal((await lookupMasterReference195(input, h.invoke)).status, 'identity-required');
      assert.equal(h.operations.length, 0);
    }
  });
  await test('Prefix/producer/cuvee/geography conflicts and duplicate canonical names never choose first candidate', async () => {
    for (const detail of [{ ...zorrera, name: 'La Zorrera Reserva' }, { ...zorrera, winery: 'Other Chivite' },
      { ...zorrera, country: 'IT' }]) {
      const h = transport(page(detail), detail);
      const input = { ...candidate(), country: 'ES' };
      assert.equal((await lookupMasterReference195(input, h.invoke)).status, 'ambiguous'); assert.equal(h.operations.length, 1);
    }
    const extra = { ...page().results[0], mantalakWineId: 180279 };
    const h = transport(page(zorrera, [extra]), zorrera);
    assert.equal((await lookupMasterReference195(candidate(), h.invoke)).status, 'ambiguous'); assert.equal(h.operations.length, 1);
  });
  await test('Partial page including an exact-looking row stays incomplete; no automatic pagination or detail', async () => {
    const partial = { ...page(), total: 57, pageCount: 2, results: Array.from({ length: 50 }, (_, index) => ({
      ...page().results[0], mantalakWineId: 180278 + index,
    })), count: 50 };
    const h = transport(partial, zorrera); const result = await lookupMasterReference195(candidate(), h.invoke);
    assert.equal(result.status, 'incomplete'); assert('total' in result); assert.equal(result.total, 57); assert.equal(h.operations.length, 1);
    const empty = transport({ results: [], count: 0, total: 0, page: 1, limit: 50, pageCount: 0 }, zorrera);
    assert.equal((await lookupMasterReference195(candidate(), empty.invoke)).status, 'not-found'); assert.equal(empty.operations.length, 1);
  });
  await test('Changed detail identity/ID/vintages or public ID substituted as canonical remain rejected', async () => {
    for (const detail of [{ ...zorrera, mantalakWineId: zorrera.representativePublicId },
      { ...zorrera, name: 'Different Wine' }, { ...zorrera, vintages: [...zorrera.vintages, '2020'] }]) {
      const h = transport(page(), detail); assert.equal((await lookupMasterReference195(candidate(), h.invoke)).status, 'ambiguous');
      assert.equal(h.operations.length, 2);
    }
  });
  await test('Observed default3/source:null/zero and recordedAIorigin never grant sensory score or learned taste', async () => {
    for (const source of [null, { type: 'ai', model: 'controlled-model', confidence: 0.99, generatedAt: '2026-10-24T10:00:00Z' }]) {
      const detail = structuredClone(zorrera);
      for (const row of detail.tastingAttributes.attributesByVintage) { row.source = source; row.power = 3; row.tannin = 0; }
      const h = transport(page(detail), detail); const result = await lookupMasterReference195(candidate(), h.invoke);
      assert(result.status === 'reference-match'); assert.equal(result.affinityAttributes, null); assert.equal(result.learningEligible, false);
      assert.equal(result.vintage.reason, 'default-values-not-distinguishable');
      assert.equal(result.sensory.axes.find(row => row.axis === 'power')?.status, 'default-indistinguishable');
      assert.equal(result.sensory.axes.find(row => row.axis === 'tannin')?.status, 'not-applicable');
      assert(result.sensory.axes.every(row => !row.usableForAffinity && !row.usableForLearning));
    }
  });
  await test('Per-axis explanation preserves unknown origin, generic scope and missing requested vintage without guessing provenance', () => {
    const exact = describeMasterSensory195(zorrera, '2015'); assert.equal(exact.scope, 'exact');
    assert.equal(exact.axes.find(row => row.axis === 'sweetness')?.status, 'not-applicable');
    assert(exact.axes.some(row => row.status === 'origin-unrecorded')); assert.equal(exact.perAxisProvenanceAvailable, false);
    const generic = describeMasterSensory195(vidure, '2020'); assert.equal(generic.scope, 'generic');
    assert.equal(generic.requestedVintage, '2020'); assert.equal(generic.sourceVintage, null);
    const detail = read('qa-fixtures/master194/responses/26-BODY.json');
    const missing = describeMasterSensory195(detail, '2022'); assert.equal(missing.scope, 'missing');
    assert(missing.axes.every(row => row.value === null && row.status === 'missing'));
    const estimated = structuredClone(zorrera);
    estimated.tastingAttributes.attributesByVintage.find((row: { vintage: string | null }) => row.vintage === '2015').source = {
      type: 'ai', model: 'controlled-model', confidence: 0.99, generatedAt: '2026-10-24T10:00:00Z',
    };
    assert(describeMasterSensory195(estimated, '2015').axes.some(row => row.status === 'ai-estimate'));
  });
  await test('Prepared native adapter traverses actual bridge and decoder with controlled session and retained payloads, no native key', async () => {
    let functionsCalls = 0, upstreamCalls = 0;
    const handler = createMasterBridge194({ authenticate: async token => token === 'controlled-session195'
      ? '19500000-0000-4000-8000-000000000001' : null,
      readSecret: () => 'controlled-server-key195', fetcher: async (url, init) => {
        upstreamCalls++; assert.equal(init?.method, 'GET');
        assert.equal(new Headers(init.headers).get('X-Matchrim-Key'), 'controlled-server-key195');
        const address = new URL(String(url));
        assert.equal(address.origin, 'https://app.winerim.com');
        return Response.json(address.pathname.endsWith('/search') ? page() : zorrera);
      } });
    const invoke = createMasterBridgeInvoker195({ invoke: async (name, options) => {
      functionsCalls++; assert.equal(name, 'matchrim-master-catalog'); assert.equal(options.method, 'POST');
      assert.deepEqual(Object.keys(options).sort(), ['body', 'method', 'signal']);
      assert(!JSON.stringify(options.body).includes('key'));
      const response = await handler(new Request('http://controlled.invalid/bridge', { method: options.method,
        headers: { Authorization: 'Bearer controlled-session195', 'Content-Type': 'application/json' },
        body: JSON.stringify(options.body), signal: options.signal }));
      return { data: await response.json(), error: response.ok ? null : new Error('controlled error') };
    } });
    const result = await lookupMasterReference195(candidate(), invoke); assert.equal(result.status, 'reference-match');
    assert.equal(functionsCalls, 2); assert.equal(upstreamCalls, 2); assert.equal(result.imageIdentityConfirmed, false);
    const failed = createMasterBridgeInvoker195({ invoke: async () => ({ data: null, error: { message: 'private failure detail' } }) });
    const failure = await lookupMasterReference195(candidate(), failed); assert.equal(failure.status, 'unavailable');
    assert(!JSON.stringify(failure).includes('private failure detail'));
  });
  await test('Timeout/abort/rejected transport has at most2calls and never retries', async () => {
    let calls = 0; let signal: AbortSignal | null = null;
    const stalled: MasterInvoke195 = async (_operation, current) => { calls++; signal = current; return new Promise(() => undefined); };
    assert.equal((await lookupMasterReference195(candidate(), stalled, undefined, 20)).status, 'unavailable');
    assert.equal(calls, 1); assert((signal as AbortSignal | null)?.aborted);
    calls = 0; const controller = new AbortController();
    const cancelled = lookupMasterReference195(candidate(), stalled, controller.signal); controller.abort();
    await assert.rejects(cancelled, { name: 'AbortError' }); assert.equal(calls, 1);
    const failed: MasterInvoke195 = async () => { calls++; throw new Error('controlled failure'); };
    calls = 0; assert.equal((await lookupMasterReference195(candidate(), failed)).status, 'unavailable'); assert.equal(calls, 1);
    controller.abort(); calls = 0; await assert.rejects(lookupMasterReference195(candidate(), stalled, controller.signal), { name: 'AbortError' });
    assert.equal(calls, 0);
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalRequests: 0, imageUploads: 0, accountWrites: 0,
    appActivated: false, scope: 'Controlled candidate inputs with retained catalogue payloads; not image-recognition accuracy' }));
} finally { globalThis.fetch = originalFetch; }
