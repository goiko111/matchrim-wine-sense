import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGlobalCatalogue103, applyGlobalCatalogue103, globalSensory103 } from '../src/utils/nativeGlobalCatalogue103';
import { nativeWineConsumerResult } from '../src/utils/multiWineConsumer95';
import type { WineCandidate } from '../src/utils/multiWineScan';
import { makeCellarCatalogEvidence, withCellarInitialAffinity, cellarAffinityView, cellarTrainingRows,
  readCellarSensoryEvidence } from '../src/utils/bodegaAffinity';
import { makeCellarPublicReference107, readCellarPublicReference107 } from '../src/utils/cellarPublicReference107';
import { makeCellarReferenceStyle110, readCellarReferenceStyle110, cellarDisplayAffinity110 } from '../src/utils/cellarReferenceStyle110';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';

// Controlled legacy responses model the developer's documented defaults. They
// do not establish a real exact-year Vidure record or repair any source data.
const observed = JSON.parse(fs.readFileSync('qa-fixtures/global103/winerim-public.observed.json', 'utf8')).vidure.wine;
const candidate: WineCandidate = { id: 'synthetic184', name: 'Vidure', producer: 'Pago de Cirsus', vintage: 2020,
  region: null, country: null, grapes: [], alcohol: null, confidence: .8, source: 'label',
  evidence: ['VIDURE', 'Pago de Cirsus', '2020'], uncertaintyReasons: [], inferredFields: [] };
const snapshot: ScanProfileSnapshot = { profile: { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 },
  source: 'quiz', samples: 0, status: 'ready', note: 'Synthetic QA' };
const attributes = { scale: 'winerim-0-5' as const, potencia: 3, acidez: 3, dulzura: 3, taninos: 3, afrutado: 3 };
let groups = 0, fixtureReads = 0;
const test = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
const lookup = async (tastingAttributes: unknown, vintage: string | null = '2020') => {
  const row = { ...observed, vintage, tastingAttributes };
  let reads = 0;
  const result = await createGlobalCatalogue103(async (_url, init) => {
    assert.equal(init?.method, 'GET'); assert.equal(init.credentials, 'omit');
    reads++; fixtureReads++;
    return Response.json(reads === 1 ? { count: 1, page: 1, results: [row] } : row);
  }).lookup(candidate);
  assert('wine' in result); assert.equal(reads, 2); return result.wine;
};
const previous = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('EXTERNAL_NETWORK_FORBIDDEN184'); };
try {
  await test('A legacy all-three vector cannot supply exact-year affinity or explanatory factors', async () => {
    const wine = await lookup({ power: 3, acidity: 3, sweetness: 3, tannin: 3, fruity: 3 });
    assert.equal(globalSensory103(wine), null);
    const applied = applyGlobalCatalogue103(candidate, snapshot.profile, wine);
    assert.equal(applied.canonicalId, `winerim-public-store:${observed.id}`);
    assert.equal(applied.sensoryAttributes, null); assert.equal(applied.affinity, null);
    assert.equal(nativeWineConsumerResult(applied, snapshot.profile).canExplainAffinity, false);
  });
  await test('Zeros and plausible non-default values cannot bypass missing per-axis provenance', async () => {
    for (const values of [[0, 0, 0, 0, 0], [4, 2, 1, 5, 4], [3, 4, 0, 2, 1]]) {
      const [power, acidity, sweetness, tannin, fruity] = values;
      const wine = await lookup({ power, acidity, sweetness, tannin, fruity });
      assert.equal(globalSensory103(wine), null);
      assert.equal(applyGlobalCatalogue103(candidate, snapshot.profile, wine).affinity, null);
    }
  });
  const nv = await lookup(observed.tastingAttributes, null);
  const reference = makeCellarPublicReference107(candidate, nv); assert(reference);
  await test('Identity/photo/original-sheet access survive without creating a new NV style estimate', () => {
    assert.equal(nv.id, observed.id); assert.equal(nv.slug, observed.slugname);
    assert(nv.url.startsWith('https://web.winerim.com/matchrim/store/'));
    const saved = { ...candidate, place_details: { winerim_public_catalogue: reference } };
    assert(readCellarPublicReference107(saved));
    assert.equal(makeCellarReferenceStyle110(saved, nv, snapshot), null);
    const display = nativeWineConsumerResult(applyGlobalCatalogue103(candidate, snapshot.profile, nv), snapshot.profile);
    assert.equal(display.affinityValue, 'Ver ficha'); assert.equal(display.canExplainAffinity, false);
  });
  await test('Persisted public-store vectors and initial scores are quarantined only in native evaluation', () => {
    const trace = makeCellarCatalogEvidence(candidate, `winerim-public-store:${observed.id}`, attributes); assert(trace);
    const base = { ...candidate, sensory_attributes: attributes, place_details: { bodega_sensory_evidence: trace } };
    const saved = { ...base, place_details: withCellarInitialAffinity(base, snapshot, 'saved') };
    const before = JSON.stringify(saved);
    assert(readCellarSensoryEvidence(saved)); // Default web/legacy path stays byte-compatible.
    assert.equal(readCellarSensoryEvidence(saved, true), null);
    const native = cellarAffinityView(saved, snapshot, true);
    assert.equal(native.current, null); assert.equal(native.initial, null); assert.equal(native.attributes, null);
    assert.equal(cellarDisplayAffinity110(saved, snapshot), null);
    assert.equal(JSON.stringify(saved), before, 'Do not mutate or delete historical user data');
  });
  await test('Native profile training excludes quarantined public vectors but web and other sources are unchanged', () => {
    const row = (id: string) => ({ id: 'synthetic184', ...candidate, rating: 'love', use_for_profile_training: true,
      sensory_attributes: attributes, place_details: { bodega_sensory_evidence: makeCellarCatalogEvidence(candidate, id, attributes) } });
    const publicRow = row(`winerim-public-store:${observed.id}`), other = row('synthetic-other-source184');
    assert.equal(cellarTrainingRows([publicRow], true).length, 0);
    assert.equal(cellarTrainingRows([publicRow], false).length, 1);
    assert.equal(cellarTrainingRows([other], true).length, 1);
    assert.equal(cellarAffinityView(other, snapshot, true).current, calculateLocalMatchrimAffinity(snapshot.profile, attributes));
  });
  await test('Old reference-style JSON cannot revive an unspecified legacy score', () => {
    const historical = { version: 1, model: 'reference-style-l2-0to5-v1', scale: 'winerim-0-5',
      provenance: 'unspecified', recorded_at: '2026-10-21T12:00:00.000Z', public_reference: reference,
      attributes, attribute_signature: JSON.stringify(['winerim-0-5', 3, 3, 3, 3, 3]), initial: null };
    const saved = { ...candidate, place_details: { winerim_public_catalogue: reference, matchrim_reference_style110: historical } };
    const before = JSON.stringify(saved);
    assert(readCellarPublicReference107(saved));
    assert.equal(readCellarReferenceStyle110(saved), null);
    assert.equal(cellarDisplayAffinity110(saved, snapshot), null);
    assert.equal(JSON.stringify(saved), before);
  });
} finally { globalThis.fetch = previous; }
console.log(JSON.stringify({ groups, fixtureReads, externalGET: 0, modelCalls: 0, realUsers: 0,
  scope: 'Legacy-default quarantine only; controlled responses, no source repair or predictive-accuracy approval.' }));
