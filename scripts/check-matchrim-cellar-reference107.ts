import assert from 'node:assert/strict';
import { createGlobalCatalogue103, applyGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import { makeCellarPublicReference107, readCellarPublicReference107, confirmsCellarPublicReference107 } from '../src/utils/cellarPublicReference107';
import { readCellarSensoryEvidence, readCellarInitialAffinity, isVerifiedCellarTrainingWine, withCellarInitialAffinity } from '../src/utils/bodegaAffinity';
import { confirmedLabelInsertId } from '../src/utils/labelScanSave';
import type { WineCandidate } from '../src/utils/multiWineScan';
let groups = 0;
const test = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
const identity = { name: 'Synthetic Reserve', producer: 'Synthetic Estate', vintage: 2020, region: null, country: null };
const candidate: WineCandidate = { id: 'fixture', ...identity, grapes: [], alcohol: null, confidence: .9, source: 'manual',
  evidence: ['Synthetic Reserve', 'Synthetic Estate', '2020'], uncertaintyReasons: [], inferredFields: [] };
const row = { id: 107, name: identity.name, winery: identity.producer, vintage: null, slugname: 'synthetic-reserve',
  region: null, country: null, tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 3 } };
const client = createGlobalCatalogue103((async input => new Response(JSON.stringify(String(input).includes('?')
  ? { count: 1, page: 1, results: [row] } : row), { headers: { 'content-type': 'application/json' } })) as typeof fetch);
const result = await client.lookup(candidate);
assert('wine' in result);
const reference = makeCellarPublicReference107(identity, result.wine);
assert(reference);
const saved = { ...identity, sensory_attributes: null,
  place_details: withCellarInitialAffinity({ ...identity, sensory_attributes: null,
    place_details: { winerim_public_catalogue: reference } }, null, 'saved') };
await test('Verified NV reference survives serialization without creating vintage affinity or training evidence', () => {
  const read = JSON.parse(JSON.stringify(saved));
  assert.equal(readCellarPublicReference107(read)?.url, 'https://web.winerim.com/matchrim/store/107/synthetic-reserve');
  assert.equal(readCellarPublicReference107(read)?.bottle_identity.vintage, 2020);
  assert.equal(readCellarPublicReference107(read)?.catalogue_vintage, null);
  assert.equal(readCellarSensoryEvidence(read), null); assert.equal(readCellarInitialAffinity(read), null);
  assert.equal(isVerifiedCellarTrainingWine({ ...read, use_for_profile_training: true, rating: 'love' }), false);
  const applied = applyGlobalCatalogue103(candidate, null, result.wine, true);
  assert.equal(applied.sensoryAttributes, null); assert.equal(applied.affinity, null);
});
await test('Changed identity or unsafe persisted URL/slug/namespace cannot open another reference', () => {
  for (const changed of [{ name: 'Other' }, { producer: 'Other' }, { vintage: 2019 }, { region: 'Other' }])
    assert.equal(readCellarPublicReference107({ ...saved, ...changed }), null);
  for (const changed of [{ slug: '../other' }, { namespace: 'library' }, { id: -1 }, { url: 'https://evil.test' },
    { catalogue_vintage: '2019' }, { sensory: { power: 5 } }]) {
    assert.equal(readCellarPublicReference107({ ...saved, place_details: { winerim_public_catalogue: { ...reference as object, ...changed } } }), null);
  }
});
await test('Unverified objects and legacy unbound metadata cannot become trusted references', () => {
  assert.equal(makeCellarPublicReference107(identity, { ...result.wine }), null);
  assert.equal(readCellarPublicReference107({ ...identity, place_details: { winerim_public_catalogue: { id: 107, url: 'https://evil.test' } } }), null);
});
await test('Save acknowledgment requires actual returned reference, with zero duplicate retry promotion', () => {
  const data = { ...saved, id: 'saved-id', user_id: 'qa-owner', status: 'wishlist', is_favorite: false, use_for_profile_training: false };
  const input = { nombre: identity.name, productor: identity.producer, anada: 2020, affinity_details: saved.place_details };
  assert.equal(confirmsCellarPublicReference107(data, saved), true);
  assert.equal(confirmedLabelInsertId(data, input, 'qa-owner'), 'saved-id');
  for (const changed of [{ place_details: null }, { name: 'Other' }, { vintage: 2019 }]) {
    assert.equal(confirmsCellarPublicReference107({ ...data, ...changed }, saved), false);
    assert.equal(confirmedLabelInsertId({ ...data, ...changed }, input, 'qa-owner'), null);
  }
  assert.equal(confirmsCellarPublicReference107({}, identity), true, 'No web metadata means unchanged legacy behavior');
});
console.log(JSON.stringify({ groups, remoteCalls: 0, modelStarts: 0, fixture: 'Synthetic HTTP transport; real save not claimed' }));
