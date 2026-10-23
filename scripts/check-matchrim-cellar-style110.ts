import assert from 'node:assert/strict';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import { makeCellarPublicReference107, readCellarPublicReference107 } from '../src/utils/cellarPublicReference107';
import { makeCellarReferenceStyle110, readCellarReferenceStyle110, cellarReferenceStyleView110,
  confirmsCellarReferenceStyle110, cellarDisplayAffinity110, isHighCellarAffinity110 } from '../src/utils/cellarReferenceStyle110';
import { makeCellarCatalogEvidence } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';
import type { WineCandidate } from '../src/utils/multiWineScan';

// Pre184 positive style tests remain in Git history. The backend clarification
// invalidates their assumption that legacy numeric axes are measured values.
const identity = { name: 'Synthetic Reserve', producer: 'Synthetic Estate', vintage: 2020, region: null, country: null };
const candidate: WineCandidate = { id: 'synthetic-style110', ...identity, grapes: [], alcohol: null, confidence: .9,
  source: 'manual', evidence: [identity.name, identity.producer, '2020'], uncertaintyReasons: [], inferredFields: [] };
const row = { id: 110, name: identity.name, winery: identity.producer, vintage: null, slugname: 'synthetic-reserve',
  tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 3 } };
const attributes = { scale: 'winerim-0-5' as const, potencia: 4, acidez: 3, dulzura: 1, taninos: 4, afrutado: 3 };
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 };
const snapshot: ScanProfileSnapshot = { profile, source: 'quiz', samples: 0, status: 'ready', note: 'Synthetic QA only' };
const previous = globalThis.fetch;
globalThis.fetch = async () => { throw Error('LIVE_NETWORK_FORBIDDEN_STYLE110'); };
let groups = 0, fixtureReads = 0;
const test = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };
try {
  const result = await createGlobalCatalogue103(async input => {
    fixtureReads++; return Response.json(String(input).includes('?') ? { count: 1, page: 1, results: [row] } : row);
  }).lookup(candidate);
  assert('wine' in result);
  const global = result.wine;
  const reference = makeCellarPublicReference107(identity, global); assert(reference);
  const historical = { version: 1, model: 'reference-style-l2-0to5-v1', scale: 'winerim-0-5', provenance: 'unspecified',
    recorded_at: '2026-10-21T19:00:00.000Z', public_reference: reference, attributes,
    attribute_signature: JSON.stringify(['winerim-0-5', 4, 3, 1, 4, 3]),
    initial: { score: calculateLocalMatchrimAffinity(profile, attributes), recorded_at: '2026-10-21T19:00:00.000Z',
      profile, profile_source: 'quiz', samples: 0 } };
  const saved = { ...identity, sensory_attributes: null, rating: 'love',
    place_details: { winerim_public_catalogue: reference, matchrim_reference_style110: historical } };
  const before = JSON.stringify(saved);
  test('Fifty profiles cannot mint or revive an unspecified public-reference style score', () => {
    const seen = new Set<string>();
    for (let index = 0; index < 50; index++) {
      const [potente, acidez, dulce, tanico, afrutado] = [0, 1, 2, 3, 4].map(axis => ((index * 7 + axis * 3) % 51) / 10);
      const person = { ...snapshot, profile: { potente, acidez, dulce, tanico, afrutado } };
      seen.add(JSON.stringify(person.profile));
      assert.equal(makeCellarReferenceStyle110(identity, global, person), null);
      assert.equal(readCellarReferenceStyle110(saved), null);
      assert.equal(cellarReferenceStyleView110(saved, person), null);
      assert.equal(cellarDisplayAffinity110(saved, person), null);
      assert.equal(isHighCellarAffinity110(saved, person), false);
    }
    assert.equal(seen.size, 50); assert.equal(JSON.stringify(saved), before);
  });
  test('Reference links, personal ratings and raw initial history remain intact', () => {
    assert(readCellarPublicReference107(saved)); assert.equal(saved.rating, 'love');
    assert.equal(saved.place_details.matchrim_reference_style110.initial.score, historical.initial.score);
    assert.equal(makeCellarReferenceStyle110(saved, { ...global }, snapshot), null);
    assert.equal(JSON.stringify(saved), before);
  });
  test('Persisted JSON cannot claim a new scale, model or provenance to escape quarantine', () => {
    for (const patch of [{ provenance: 'winerim-source' }, { provenance: 'winerim-generated' }, { version: 2 },
      { model: 'invented' }, { scale: '0-100' }, { attributes: { ...attributes, potencia: 0 } }, { initial: null }]) {
      const wine = { ...saved, place_details: { ...saved.place_details, matchrim_reference_style110: { ...historical, ...patch } } };
      assert.equal(readCellarReferenceStyle110(wine), null); assert.equal(cellarDisplayAffinity110(wine, snapshot), null);
    }
  });
  test('An old unsourced style-save receipt is not acknowledged as a fresh valid write', () => {
    assert.equal(confirmsCellarReferenceStyle110(saved, saved), false);
    assert.equal(confirmsCellarReferenceStyle110({}, identity), true);
  });
  test('Other catalogue evidence and the affinity formula remain unchanged', () => {
    const trace = makeCellarCatalogEvidence(identity, 'synthetic-other-source110', attributes); assert(trace);
    const other = { ...identity, sensory_attributes: attributes, place_details: { bodega_sensory_evidence: trace } };
    assert.equal(cellarDisplayAffinity110(other, snapshot), calculateLocalMatchrimAffinity(profile, attributes));
  });
} finally { globalThis.fetch = previous; }
console.log(JSON.stringify({ groups, syntheticProfiles: 50, fixtureReads, externalGET: 0, models: 0,
  scope: 'Legacy public-reference style quarantine after184; no actual users, source repairs or predictive taste validation.' }));
