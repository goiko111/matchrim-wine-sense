import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGlobalCatalogue103, applyGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import { correctWineCandidateIdentity, type WineCandidate } from '../src/utils/multiWineScan';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { lookupNativeMaster102, applyNativeMaster102 } from '../src/utils/nativeMasterCatalog102';

// The retained public record has NO vintage. Exact-year variants below are
// deliberately synthetic transition tests, never a repaired source receipt.
const observed = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8')).vidure.wine;
assert.equal(observed.vintage, null);
const candidate: WineCandidate = { id: 'rescan183-controlled', name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020,
  region: null, country: null, grapes: [], alcohol: null, confidence: .8, source: 'label',
  evidence: ['VIDURE', 'Pago de Cirsus', '2020'], uncertaintyReasons: [], inferredFields: [] };
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
let fixtureReads = 0, groups = 0, profileTransitions = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => {
  await work(); groups++; console.log('PASS', name);
};
const lookup = async (row: typeof observed, input: WineCandidate = candidate) => {
  let calls = 0;
  const client = createGlobalCatalogue103(async (_url, init) => {
    assert.equal(init?.method, 'GET'); assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'error'); assert.equal(init.body, undefined);
    calls++; fixtureReads++; assert(calls <= 2);
    return Response.json(calls === 1 ? { count: 1, page: 1, results: [row] } : row);
  });
  const result = await client.lookup(input);
  assert('wine' in result); assert.equal(calls, 2);
  return result.wine;
};
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('LIVE_NETWORK_FORBIDDEN183'); };
try {
  const exact = await lookup({ ...observed, vintage: '2020' });
  // Public default-bearing vectors are quarantined by184. Keep positive
  // recomputation coverage on the explicitly synthetic proposed master contract.
  const master = async (attributes = { power: 4, acidity: 3, sweetness: 1, tannin: 3, fruity: 4 }) => {
    const identity = { namespace: 'mantalak', id: '91000001', name: candidate.name, producer: candidate.producer,
      vintage: '2020', region: null, country: null };
    const wine = { ...identity, sensory: { vintage: '2020', scale: 'winerim-0-5', provenance: 'winerim-source',
      sourceReference: 'synthetic184-not-an-observed-contract', attributes } };
    let reads = 0;
    const result = await lookupNativeMaster102(candidate, 'https://app.winerim.com/api/v1/matchrim/catalogue', undefined, async () => {
      reads++; fixtureReads++;
      return Response.json(reads === 1 ? { contract: 'matchrim-master-catalogue-v1', scope: 'full-master', complete: true,
        count: 1, matches: [identity] } : { contract: 'matchrim-master-catalogue-v1', scope: 'full-master', wine });
    });
    assert.equal(result.status, 'verified'); assert.equal(reads, 2);
    if (result.status !== 'verified') throw new Error('CONTROLLED_MASTER_FIXTURE');
    return result.record;
  };
  const record = await master();
  const first = { ...applyNativeMaster102(candidate, profile, record), globalRecord: null };
  assert(first.affinity !== null && first.affinity !== undefined);
  const snapshot = JSON.stringify(first);

  await test('Fifty profile transitions and return rescans recompute without rewriting the initial scan', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 50; index++) {
      const [potente, acidez, dulce, tanico, afrutado] = [0, 1, 2, 3, 4].map(axis => ((index * 7 + axis * 3) % 51) / 10);
      const person = { potente, acidez, dulce, tanico, afrutado };
      seen.add(JSON.stringify(person));
      const rescanned = applyNativeMaster102(first, person, record);
      assert.equal(rescanned.affinity, calculateLocalMatchrimAffinity(person, first.sensoryAttributes));
      assert.equal(nativeWineConsumerResult(rescanned, person).canExplainAffinity, true);
      assert.equal(rescanned.confidence, candidate.confidence);
      assert.equal(rescanned.canonicalId, first.canonicalId);
      assert.equal(applyNativeMaster102(rescanned, profile, record).affinity, first.affinity);
      assert.equal(JSON.stringify(first), snapshot);
      profileTransitions++;
    }
    assert.equal(seen.size, 50);
  });

  await test('A fresh retained NV result clears a preceding exact-year score rather than reusing it', async () => {
    const nv = await lookup(observed);
    const rescanned = applyGlobalCatalogue103(first, profile, nv);
    assert.equal(rescanned.vintage, 2020);
    assert.equal(rescanned.globalRecord?.vintage, null);
    for (const field of ['canonicalId', 'sensoryAttributes', 'affinity', 'affinityConfidence', 'masterRecord', 'originalSheet'] as const)
      assert.equal(rescanned[field], null, field);
    assert.equal(nativeWineConsumerResult(rescanned, profile).canExplainAffinity, false);
    assert.equal(JSON.stringify(first), snapshot);
  });

  await test('A new exact-year detail without sensory data removes the preceding vector and score', async () => {
    const missing = await lookup({ ...observed, vintage: '2020', tastingAttributes: null });
    const rescanned = applyGlobalCatalogue103(first, profile, missing);
    assert.equal(rescanned.canonicalId, `winerim-public-store:${observed.id}`);
    assert.equal(rescanned.sensoryAttributes, null); assert.equal(rescanned.affinity, null);
    assert.equal(nativeWineConsumerResult(rescanned, profile).canExplainAffinity, false);
  });

  await test('Profile removal hides the previous score even while exact catalogue identity remains available', () => {
    const rescanned = applyNativeMaster102(first, null, record);
    assert.equal(rescanned.canonicalId, first.canonicalId); assert.equal(rescanned.affinity, null);
    assert.equal(nativeWineConsumerResult(rescanned, null).canExplainAffinity, false);
  });

  await test('Changing identity or harvest cannot carry the old verified binding into a new scan', () => {
    for (const patch of [{ name: 'Other Wine' }, { producer: 'Other Producer' }, { vintage: 2019 }]) {
      const corrected = correctWineCandidateIdentity(first, patch);
      const before = JSON.stringify(corrected);
      const rescanned = applyGlobalCatalogue103(corrected, profile, exact);
      assert.equal(rescanned.affinity, null); assert.equal(rescanned.globalRecord, null);
      assert.equal(rescanned.canonicalId, null);
      assert.equal(nativeWineConsumerResult(rescanned, profile).canExplainAffinity, false);
      assert.equal(JSON.stringify(corrected), before);
    }
  });

  await test('Fresh valid zero-valued sensory data is not replaced by the previous nonzero vector', async () => {
    const zeros = await master({ power: 0, acidity: 0, sweetness: 0, tannin: 0, fruity: 0 });
    const rescanned = applyNativeMaster102(first, profile, zeros);
    assert.equal(rescanned.sensoryAttributes?.potencia, 0);
    assert.equal(rescanned.sensoryAttributes?.dulzura, 0);
    assert.equal(rescanned.affinity, calculateLocalMatchrimAffinity(profile, rescanned.sensoryAttributes));
    assert.equal(nativeWineConsumerResult(rescanned, profile).canExplainAffinity, true);
    assert.equal(JSON.stringify(first), snapshot);
  });
} finally { globalThis.fetch = previousFetch; }
console.log(JSON.stringify({ groups, profileTransitions, fixtureReads, externalGET: 0, modelCalls: 0, realUsers: 0,
  scope: 'Controlled rescan transitions. Positive vectors use a synthetic proposed master contract; public legacy vectors are quarantined by184. Retained source remains NV. No recognition, deployed contract, source repair, taste accuracy or UIKit claim.' }));
