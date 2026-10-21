import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGlobalCatalogue103, applyGlobalCatalogue103, independentGlobalProducer103, isGlobalWine103, globalSensory103 } from '../src/utils/nativeGlobalCatalogue103';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { correctWineCandidateIdentity, type WineCandidate } from '../src/utils/multiWineScan';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import ts from 'typescript';
import vm from 'node:vm';
import { applyScanWineEvidence } from '../src/utils/scanWineEvidence';
const sourceFixture = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8'));
const observed = sourceFixture.vidure.wine;
const search = { count: 1, page: 1, results: [observed] };
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const candidate: WineCandidate = { id: 'vidure-observed-regression', name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020,
  region: null, country: null, grapes: [], alcohol: null, confidence: .8, source: 'label', evidence: ['VIDURE', 'Pago de Cirsus', '2020'], uncertaintyReasons: [], inferredFields: [] };
const fixture = (responses: unknown[] = [search, observed]) => {
  const calls: string[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push(String(url)); assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.body, undefined); assert(calls.length <= 3);
    assert(!String(url).includes('/admin/')); assert(!String(url).includes('functions'));
    return Response.json(responses[calls.length - 1]);
  };
  return { client: createGlobalCatalogue103(fetcher), calls };
};
let checks = 0;
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); checks++; console.log('PASS', name); };
globalThis.fetch = async () => { throw new Error('NO_LIVE_AI_OR_NETWORK_IN_UNIT_TEST'); };
await check('Observed global Vidure is a reference, not a verified 2020 or a Mantalak ID', async () => {
  const h = fixture(), result = await h.client.lookup(candidate); assert.equal(result.status, 'reference');
  if (!('wine' in result)) throw new Error('expected wine');
  assert.equal(result.wine.id, 364050); assert.equal(result.wine.namespace, 'winerim-public-store');
  assert.equal(result.wine.provenance, 'unspecified'); assert.equal(result.wine.vintage, null);
  assert.equal(result.wine.url, 'https://web.winerim.com/matchrim/store/364050/Vidure');
  assert.match(h.calls[0], /store=1/); assert.equal(h.calls.length, 2);
  const applied = applyGlobalCatalogue103(candidate, profile, result.wine);
  assert.equal(applied.canonicalId, null); assert.equal(applied.affinity, null); assert.equal(applied.sensoryAttributes, null);
  assert.equal(nativeWineConsumerResult(applied, profile).canExplainAffinity, false);
  assert.equal(isGlobalWine103(candidate, structuredClone(result.wine)), false);
});
await check('Two missing vintages remain a style reference, never an exact sensory binding', async () => {
  const h = fixture(), nv = { ...candidate, vintage: null };
  const result = await h.client.lookup(nv); assert.equal(result.status, 'reference'); if (!('wine' in result)) throw new Error('wine');
  const applied = applyGlobalCatalogue103(nv, profile, result.wine);
  assert.equal(applied.canonicalId, null); assert.equal(applied.affinity, null);
  assert.equal(nativeWineConsumerResult(applied, profile).catalogIdentityLinked, false);
});
await check('A synthetic exact2020 sensory binding calculates without OCR confidence promotion', async () => {
  const row = { ...observed, vintage: '2020' }, h = fixture([{ ...search, results: [row] }, row]);
  const nv = candidate;
  const result = await h.client.lookup(nv); assert.equal(result.status, 'exact'); if (!('wine' in result)) throw new Error('wine');
  const applied = applyGlobalCatalogue103(nv, profile, result.wine);
  assert.equal(applied.canonicalId, 'winerim-public-store:364050'); assert.equal(applied.confidence, .8);
  assert.equal(applied.affinityConfidence, null); assert.equal(nativeWineConsumerResult(applied, profile).canExplainAffinity, true);
  assert.equal(nativeWineConsumerResult({ ...applied, affinity: 100 }, profile).canExplainAffinity, false);
  assert.equal(nativeWineConsumerResult({ ...applied, canonicalId: 'mantalak:364050' }, profile).canExplainAffinity, false);
  assert.equal(nativeWineConsumerResult(correctWineCandidateIdentity(applied, { name: applied.name }), profile).catalogIdentityLinked, false);
});
await check('Fifty synthetic profiles recompute from the observed axes with the unchanged formula', async () => {
  const row = { ...observed, vintage: '2020' };
  const result = await fixture([{ ...search, results: [row] }, row]).client.lookup(candidate); if (!('wine' in result)) throw new Error('wine');
  for (let index = 0; index < 50; index++) {
    const [potente, acidez, dulce, tanico, afrutado] = [0, 1, 2, 3, 4].map(axis => ((index * 7 + axis * 3) % 51) / 10);
    const person = { potente, acidez, dulce, tanico, afrutado };
    const value = applyGlobalCatalogue103(candidate, person, result.wine);
    assert.equal(value.affinity, calculateLocalMatchrimAffinity(person, globalSensory103(result.wine)));
    assert.equal(nativeWineConsumerResult(value, person).canExplainAffinity, true);
    assert.equal(applyGlobalCatalogue103({ ...candidate, vintage: null }, person, result.wine).affinity ?? null, null);
  }
});
await check('Exact vintage is preferred over NV; different vintages never satisfy the request', async () => {
  const exact = { ...observed, vintage: '2020' };
  const h = fixture([{ ...search, count: 2, results: [{ ...observed, id: 22 }, exact] }, exact]);
  const result = await h.client.lookup(candidate); assert.equal(result.status, 'exact');
  const wrong = fixture([{ ...search, results: [{ ...observed, vintage: '2019' }] }]);
  assert.equal((await wrong.client.lookup(candidate)).status, 'not-found'); assert.equal(wrong.calls.length, 1);
});
await check('Incomplete pages, duplicate IDs and ambiguous NV references remain unresolved', async () => {
  for (const page of [{ ...search, count: 2, results: [observed, observed] },
    { ...search, count: 2, results: [observed, { ...observed, id: 45 }] }]) {
    const h = fixture([page]); const result = await h.client.lookup(candidate);
    assert(['incomplete', 'ambiguous'].includes(result.status)); assert.equal(h.calls.length, 1);
  }
});
await check('A broad wine-name page is narrowed by literal producer without weakening identity checks', async () => {
  const h = fixture([{ ...search, count: 21 }, search, observed]);
  assert.equal((await h.client.lookup(candidate)).status, 'reference'); assert.equal(h.calls.length, 3);
  assert.equal(new URL(h.calls[1]).searchParams.get('text'), 'Pago de Cirsus');
});
await check('A literal winery prefix is removed only from the search, not from identity checks', async () => {
  const h = fixture([{ ...search, count: 0, results: [] }, search, observed]);
  const result = await h.client.lookup({ ...candidate, name: 'Pago de Cirsus Vidure' });
  assert.equal(result.status, 'reference'); assert.equal(new URL(h.calls[1]).searchParams.get('text'), 'vidure');
});
await check('A brand split across name fragments cannot fabricate independent producer evidence', () => {
  assert.equal(independentGlobalProducer103({ name: 'Foral de Melgaço Old Vines Alvarinho', producer: 'Foral de Melgaço',
    evidence: ['FORAL', 'D MELGAÇO', 'OLD VINES', 'ALVARINHO', '• de de.'] }), false);
  assert.equal(independentGlobalProducer103({ name: 'Bodegas Aurora Reserva', producer: 'Bodegas Aurora', evidence: ['BODEGAS AURORA', 'RESERVA'] }), true);
  assert.equal(independentGlobalProducer103({ name: 'Finca Aurora Malbec', producer: 'Finca Aurora', evidence: ['FINCA', 'AURORA', 'MALBEC'] }), true);
  assert.equal(independentGlobalProducer103({ name: 'Domaine de la Croix Touraine', producer: 'Domaine de la Croix', evidence: ['DOMAINE DE LA CROIX BOUQEI', 'TOURAINE'] }), true);
  assert.equal(independentGlobalProducer103(candidate), true);
});
await check('Explicit user selection distinguishes duplicate public IDs but never bypasses detail readback', async () => {
  const h = fixture([{ ...search, count: 2, results: [observed, { ...observed, id: 45 }] }, observed]);
  const result = await h.client.lookup(candidate, undefined, observed.id);
  assert.equal(result.status, 'reference'); assert.equal(h.calls.length, 2);
  const miss = fixture([{ ...search, count: 2, results: [observed, { ...observed, id: 45 }] }]);
  assert.equal((await miss.client.lookup(candidate, undefined, 99)).status, 'not-found'); assert.equal(miss.calls.length, 1);
});
await check('Detail identity, vintage, slug, type and producer drift cannot certify the search result', async () => {
  for (const patch of [{ id: 9 }, { slugname: 'Other' }, { vintage: '2020' }, { winery: 'Other' }, { type: 'cerveza', name: 'Beer' }, { name: 'Vidure Reserva' }]) {
    const result = await fixture([search, { ...observed, ...patch }]).client.lookup(candidate);
    assert(!('wine' in result), JSON.stringify(patch));
  }
});
await check('Missing/inferred identity, vintage conflicts and omitted visible qualifiers do not query', async () => {
  for (const input of [{ ...candidate, producer: null }, { ...candidate, inferredFields: ['producer'] },
    { ...candidate, name: 'Vidure 2019' }, { ...candidate, evidence: [...candidate.evidence, 'Grand Cru'] }]) {
    const h = fixture(); assert.equal((await h.client.lookup(input)).status, 'identity-required'); assert.equal(h.calls.length, 0);
  }
});
await check('No producer alias is invented for Chivite Family Estates; unknown sensory remains null', async () => {
  const zorrera = sourceFixture.zorrera.wine;
  const input = { ...candidate, name: 'La Zorrera', producer: 'Chivite Family Estates', vintage: 2015 };
  const h = fixture([{ ...search, results: [zorrera] }]); assert.equal((await h.client.lookup(input)).status, 'not-found');
  const result = await fixture([search, { ...observed, tastingAttributes: { power: 99 } }]).client.lookup({ ...candidate, vintage: null });
  assert('wine' in result && result.wine.sensory === null);
});
await check('Sensory zero is preserved and JSON cannot self-certify a global record', async () => {
  const result = await fixture([search, { ...observed, tastingAttributes: { power: 4, acidity: 3, sweetness: 0, tannin: 3, fruity: 4 } }]).client.lookup(candidate);
  if (!('wine' in result)) throw new Error('wine'); assert.equal(result.wine.sensory?.sweetness, 0);
  assert(Object.isFrozen(result.wine)); assert(Object.isFrozen(result.wine.sensory));
  assert.equal(applyGlobalCatalogue103(candidate, profile, structuredClone(result.wine)), candidate);
});
await check('Cancellation rejects even when the fetch adapter ignores AbortSignal', async () => {
  const controller = new AbortController();
  const client = createGlobalCatalogue103(async () => new Promise(() => undefined));
  const pending = client.lookup(candidate, controller.signal); controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});
await check('Response size/UTF-8/content-type/redirect and transport failures cannot become identities', async () => {
  for (const response of [new Response('x'.repeat(262145), { headers: { 'content-type': 'application/json' } }),
    new Response(new Uint8Array([0xff]), { headers: { 'content-type': 'application/json' } }), new Response('{}'),
    new Response('{}', { status: 502, headers: { 'content-type': 'application/json' } })]) {
    const client = createGlobalCatalogue103(async () => response);
    assert.equal((await client.lookup(candidate)).status, 'unavailable');
  }
});
await check('Actual current scanner dispatch is native-only, cancellable and consumes no AI budget', async () => {
  const file = 'src/components/wine-import/MultiWineLabelScanner.tsx', source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression = '';
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'enrichCandidate') expression = node.initializer!.getText(ast);
    ts.forEachChild(node, visit);
  }; visit(ast); assert(expression);
  for (const native of [true, false]) {
    const h = fixture(), result = await h.client.lookup(candidate); if (!('wine' in result)) throw new Error('wine');
    let globalCalls = 0, legacyCalls = 0, reserves = 0;
    const sandbox = { subject: undefined, DOMException, isNative: native, isMatchrimFixtureQaEnabled: false, nativeMasterUrl: '',
      scanProfileRef: { current: { profile } }, hasMissingVisibleQualifier102: () => false, canAdmitNativeCatalogLookup97: () => true,
      independentGlobalProducer103,
      lookupGlobalCatalogue103: async () => { globalCalls++; return result; }, applyGlobalCatalogue103,
      findWinerimWineForLabel: async () => { legacyCalls++; return null; }, applyScanWineEvidence };
    vm.runInNewContext(ts.transpileModule(`subject = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
    await (sandbox.subject as unknown as (value: WineCandidate, signal: AbortSignal, budget: unknown) => Promise<unknown>)(candidate,
      new AbortController().signal, { remaining: 1, reserve: () => { reserves++; } });
    assert.equal(globalCalls, native ? 1 : 0); assert.equal(legacyCalls, native ? 0 : 1); assert.equal(reserves, native ? 0 : 1);
    if (native) {
      globalCalls = legacyCalls = reserves = 0;
      const unbacked = { ...candidate, name: 'Foral de Melgaço Old Vines Alvarinho', producer: 'Foral de Melgaço',
        affinity: 99, evidence: ['FORAL', 'D MELGAÇO', 'OLD VINES', 'ALVARINHO', '• de de.'] };
      const held = await (sandbox.subject as unknown as (value: WineCandidate, signal: AbortSignal, budget: unknown) => Promise<WineCandidate>)(unbacked,
        new AbortController().signal, { remaining: 1, reserve: () => { reserves++; } });
      assert.equal(globalCalls + legacyCalls + reserves, 0); assert.equal(held.affinity, null);
      assert(held.uncertaintyReasons.some(reason => reason.includes('marca del vino')));
    }
  }
});
console.log(JSON.stringify({ groups: checks, syntheticProfiles: 50, paidStarts: 0 }));
