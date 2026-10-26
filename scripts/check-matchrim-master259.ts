import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolveMasterCandidate259, nativeMasterLink259, masterAffinityGap259 } from '../src/utils/nativeMasterLink259';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { correctNativeIdentity218 } from '../src/utils/nativeIdentityCorrection218';
import { confirmWineCandidateIdentity, type WineCandidate } from '../src/utils/multiWineScan';
import type { MasterInvoke195, MasterOperation195 } from '../src/utils/nativeMasterReference195';

const root = 'qa-artifacts/master253-20261026/hosted-six-r1';
const read = (name: string) => JSON.parse(fs.readFileSync(`${root}/${name}`, 'utf8'));
const unlisted = read('02-BODY.json'), detail = read('03-BODY.json'), generic = read('04-BODY.json');
const candidate = (patch: Partial<WineCandidate> = {}): WineCandidate => ({ id: 'region259-one', name: 'La Migratoria',
  producer: 'Bodegas Frontonio', vintage: 2023, region: null, country: null, grapes: [], alcohol: null,
  source: 'label', confidence: .9, evidence: ['La Migratoria', 'Bodegas Frontonio', '2023'],
  uncertaintyReasons: [], inferredFields: [], ...patch });
const harness = (search = unlisted, wine = detail) => {
  const calls: MasterOperation195[] = [];
  const invoke: MasterInvoke195 = async operation => {
    calls.push(operation); assert(calls.length <= 2);
    return structuredClone(operation.operation === 'search' ? search : wine);
  };
  return { calls, invoke };
};
const oldFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_NETWORK_MASTER259'); };
let groups = 0;
const test = async (name: string, work: () => void | Promise<void>) => { await work(); groups++; console.log('PASS', name); };
try {
  await test('Actual retained unlisted search/detail traverse new native resolver with explicit opt-in, no invented public URL', async () => {
    const h = harness(), input = candidate(), before = JSON.stringify(input);
    const result = await resolveMasterCandidate259(input, h.invoke);
    assert.equal(result.status, 'reference-ready'); assert(result.status === 'reference-ready');
    assert.equal(h.calls.length, 2);
    assert.deepEqual(h.calls[0], { operation: 'search', query: { name: input.name, winery: input.producer,
      includeUnlisted: true, vintage: '2023', vintageMatch: 'prefer', limit: 10, page: 1 } });
    assert.deepEqual(h.calls[1], { operation: 'detail', mantalakWineId: 217480 });
    const link = nativeMasterLink259(result.candidate); assert(link);
    assert.equal(link.wine.webUrl, null); assert.equal(link.wine.representativePublicId, null);
    assert.equal(result.candidate.canonicalId, 'mantalak-master:217480');
    assert.equal(result.candidate.affinity, null); assert.equal(result.candidate.sensoryAttributes, null);
    assert.equal(result.candidate.confidence, input.confidence);
    assert.equal(result.candidate.source, input.source); assert.equal(JSON.stringify(input), before);
    assert(Object.isFrozen(link) && Object.isFrozen(link.wine) && Object.isFrozen(link.wine.vintages));
  });
  await test('Human-corrected fields can search without pretending they are OCR fragments; inferred fields cannot', async () => {
    const input = candidate({ source: 'manual', confidence: .1, evidence: ['Identidad corregida manualmente por el usuario'] });
    const h = harness(), result = await resolveMasterCandidate259(input, h.invoke);
    assert.equal(result.status, 'reference-ready'); assert.equal(h.calls.length, 2);
    for (const patch of [{ source: 'label' as const }, { inferredFields: ['producer'] }, { producer: null }]) {
      const blocked = harness();
      assert.equal((await resolveMasterCandidate259({ ...input, ...patch }, blocked.invoke)).status, 'identity-required');
      assert.equal(blocked.calls.length, 0);
    }
  });
  await test('Empty opt-in search is scoped not-found, never authoritative absence', async () => {
    const empty = harness({ ...unlisted, results: [], count: 0, total: 0, pageCount: 0 });
    const result = await resolveMasterCandidate259(candidate(), empty.invoke);
    assert.equal(result.status, 'not-found'); assert('catalogueAbsenceConfirmed' in result);
    assert.equal(result.catalogueAbsenceConfirmed, false); assert.equal(empty.calls.length, 1);
  });
  await test('Partial, duplicate, wrong-detail and ambiguous responses cannot create a bound reference', async () => {
    const partial = { ...unlisted, results: Array.from({ length: 10 }, (_, index) => ({ ...unlisted.results[0], mantalakWineId: 217480 + index })),
      total: 11, count: 10, pageCount: 2 };
    const duplicate = { ...unlisted, results: [unlisted.results[0], unlisted.results[0]], count: 2, total: 2 };
    const ambiguous = { ...unlisted, results: [unlisted.results[0], { ...unlisted.results[0], mantalakWineId: 217481 }], count: 2, total: 2 };
    for (const [page, wine, status] of [[partial, detail, 'incomplete'], [duplicate, detail, 'unavailable'],
      [ambiguous, detail, 'ambiguous'], [unlisted, { ...detail, mantalakWineId: 999 }, 'ambiguous']] as const) {
      const h = harness(page, wine); assert.equal((await resolveMasterCandidate259(candidate(), h.invoke)).status, status);
    }
  });
  await test('Reference binding survives explicit same-identity confirmation, not correction, foreign ID, JSON restore or forgery', async () => {
    const result = await resolveMasterCandidate259(candidate(), harness().invoke); assert(result.status === 'reference-ready');
    const value = result.candidate;
    assert(nativeMasterLink259(confirmWineCandidateIdentity(value)));
    for (const patch of [{ id: 'other-region' }, { name: 'Other wine' }, { producer: 'Other winery' },
      { vintage: 2024 }, { canonicalId: 'mantalak-master:999' },
      { masterLink259: structuredClone(value.masterLink259) }]) {
      assert.equal(nativeMasterLink259({ ...value, ...patch }), null);
    }
    assert.equal(nativeMasterLink259(JSON.parse(JSON.stringify(value))), null);
    const corrected = correctNativeIdentity218(value, { name: value.name, producer: value.producer, vintage: 2024 });
    assert(corrected); assert.equal(corrected.masterLink259, null); assert.equal(corrected.canonicalId, null);
  });
  await test('Fifty distinct profiles never receive an invented score or sensory attributes from a source-less catalogue reference', async () => {
    const result = await resolveMasterCandidate259(candidate(), harness().invoke); assert(result.status === 'reference-ready');
    const seen = new Set<string>();
    for (let index = 0; index < 50; index++) {
      const profile = { potente: index % 6, acidez: Math.floor(index / 6) % 6,
        dulce: Math.floor(index / 36), tanico: 3, afrutado: 4 };
      seen.add(JSON.stringify(profile));
      const actual = nativeWineConsumerResult(result.candidate, profile);
      assert.equal(actual.catalogIdentityLinked, true); assert.equal(actual.canExplainAffinity, false);
      assert.equal(actual.affinityValue, 'Sin calcular'); assert.equal(actual.pending?.reason, 'sensory');
      assert(actual.pending?.description.includes('Winerim tiene esta referencia'));
      assert(actual.pending?.nextStep.includes('2023')); assert.equal(result.candidate.affinity, null);
    }
    assert.equal(seen.size, 50);
  });
  await test('Current generic source-less record explains provenance instead of claiming the wine was not found', async () => {
    const input = candidate({ name: generic.name, producer: generic.winery, evidence: [generic.name, generic.winery, '2023'] });
    const search = { ...unlisted, results: [{ ...generic, id: generic.representativePublicId, tastingAttributes: {} }] };
    const result = await resolveMasterCandidate259(input, harness(search, generic).invoke); assert(result.status === 'reference-ready');
    const link = nativeMasterLink259(result.candidate); assert(link);
    const gap = masterAffinityGap259(link); assert(gap.description.includes('valores de relleno'));
    assert(!gap.description.includes('no exista')); assert.equal(result.candidate.affinity, null);
  });
  await test('Abort in detail resolution and unresolved timeout cannot issue late references or retry', async () => {
    const controller = new AbortController(); let calls = 0;
    await assert.rejects(resolveMasterCandidate259(candidate(), async operation => {
      calls++; if (operation.operation === 'detail') controller.abort();
      return structuredClone(operation.operation === 'search' ? unlisted : detail);
    }, controller.signal), { name: 'AbortError' }); assert.equal(calls, 2);
    calls = 0;
    const result = await resolveMasterCandidate259(candidate(), async () => { calls++; return new Promise(() => undefined); }, undefined, 5);
    assert.equal(result.status, 'unavailable'); assert.equal(calls, 1);
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalCalls: 0, syntheticProfiles: 50,
    scope: 'Native resolver and consumer with retained live payloads; not new recognition or taste accuracy',
    photoIdentitiesAutomaticallyConfirmed: 0, affinityGranted: false }));
} finally { globalThis.fetch = oldFetch; }
