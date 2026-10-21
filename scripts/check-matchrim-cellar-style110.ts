import assert from 'node:assert/strict';
import { createGlobalCatalogue103, applyGlobalCatalogue103, globalSensory103 } from '../src/utils/nativeGlobalCatalogue103';
import { makeCellarPublicReference107 } from '../src/utils/cellarPublicReference107';
import { makeCellarReferenceStyle110, readCellarReferenceStyle110, cellarReferenceStyleView110,
  confirmsCellarReferenceStyle110, cellarDisplayAffinity110, isHighCellarAffinity110 } from '../src/utils/cellarReferenceStyle110';
import { confirmedLabelInsertId } from '../src/utils/labelScanSave';
import { readCellarSensoryEvidence, readCellarInitialAffinity, isVerifiedCellarTrainingWine,
  cellarAffinityView, cellarTrainingRows, type CellarAffinityWine } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import type { ScanProfileSnapshot } from '../src/utils/scanProfile';
import type { MatchrimProfileLike } from '../src/utils/matchrimPassport';
import type { WineCandidate } from '../src/utils/multiWineScan';
import type { TrainableWine } from '../src/utils/matchrimLearning';

let groups = 0, transportCalls = 0;
const test = async (name: string, run: () => unknown | Promise<unknown>) => {
  await run(); groups++; console.log('PASS', name);
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const key = 'matchrim_reference_style110';
const identity = { name: 'Synthetic Reserve', producer: 'Synthetic Estate', vintage: 2020, region: null, country: null };
const candidate: WineCandidate = { id: 'style110-fixture', ...identity, grapes: [], alcohol: null, confidence: .9,
  source: 'manual', evidence: [identity.name, identity.producer, '2020'], uncertaintyReasons: [], inferredFields: [] };
const row = { id: 110, name: identity.name, winery: identity.producer, vintage: null, slugname: 'synthetic-reserve',
  region: 'Rioja', country: 'Spain', tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 3 } };
// Every catalogue operation uses this in-memory transport; there is no real request.
const catalogue = (fixture: typeof row) => createGlobalCatalogue103((async input => {
  transportCalls++;
  return new Response(JSON.stringify(String(input).includes('?') ? { count: 1, page: 1, results: [fixture] } : fixture),
    { headers: { 'content-type': 'application/json' } });
}) as typeof fetch);
const result = await catalogue(row).lookup(candidate);
assert('wine' in result);
const global = result.wine;
const profile: MatchrimProfileLike = { potente: 4, acidez: 3, dulce: 1, tanico: 4, afrutado: 3 };
const snapshot: ScanProfileSnapshot = { profile, source: 'quiz', samples: 0, status: 'ready', note: 'Synthetic QA only' };
const recordedAt = '2026-10-21T19:00:00.000Z';
const publicReference = makeCellarPublicReference107(identity, global); assert(publicReference);
const payload = makeCellarReferenceStyle110(identity, global, snapshot, recordedAt); assert(payload);
const saved = { ...identity, sensory_attributes: null,
  place_details: { winerim_public_catalogue: publicReference, [key]: payload } };
const read = readCellarReferenceStyle110(saved); assert(read);
const styleWine = (style: unknown): CellarAffinityWine => ({ ...saved, place_details: { ...saved.place_details, [key]: style } });

await test('Verified NV style roundtrips with an explicitly separate, immutable initial estimate', () => {
  const persisted = clone(saved), view = cellarReferenceStyleView110(persisted, snapshot); assert(view);
  assert.deepEqual(readCellarReferenceStyle110(persisted), read);
  assert.deepEqual(view.attributes, globalSensory103(global));
  assert.equal(view.current, calculateLocalMatchrimAffinity(profile, globalSensory103(global)));
  assert.equal(view.initial?.score, view.current); assert.equal(view.delta, 0);
  assert.equal(view.initial?.recorded_at, recordedAt); assert.equal(view.initial?.profile_source, 'quiz');
  assert.equal(view.initial?.samples, 0); assert.deepEqual(view.initial?.profile, profile);
  assert.equal(read.provenance, 'unspecified'); assert.equal(read.scale, 'winerim-0-5');
  assert.equal(confirmsCellarReferenceStyle110(persisted, saved), true);
  const reorder = (input: unknown): unknown => Array.isArray(input) ? input.map(reorder)
    : input && typeof input === 'object' ? Object.fromEntries(Object.entries(input).reverse()
      .map(([name, value]) => [name, reorder(value)])) : input;
  assert.equal(confirmsCellarReferenceStyle110(reorder(persisted), saved), true, 'JSONB key order is not a change');
  assert.equal(makeCellarReferenceStyle110(identity, { ...global }, snapshot), null, 'Cloning loses WeakSet trust');
  assert.equal(makeCellarReferenceStyle110({ ...identity, producer: 'Other Estate' }, global, snapshot), null);
  assert.equal(makeCellarReferenceStyle110(identity, global, snapshot, 'invalid'), null);
  assert.deepEqual(makeCellarReferenceStyle110(saved, global, { ...snapshot, profile: { ...profile, potente: 0 } },
    '2026-10-22T19:00:00.000Z'), payload);
});

await test('Identity and public reference metadata must remain bound through 107', () => {
  for (const change of [{ name: 'Other Reserve' }, { producer: 'Other Estate' }, { vintage: 2021 },
    { region: 'Other' }, { country: 'Other' }]) {
    assert.equal(readCellarReferenceStyle110({ ...saved, ...change }), null);
    assert.equal(confirmsCellarReferenceStyle110({ ...saved, ...change }, saved), false);
  }
  for (const change of [{ id: 111 }, { slug: 'other' }, { namespace: 'other' }, { catalogue_vintage: '2020' },
    { version: 2 }, { url: 'https://invalid.example' }, { bottle_identity: { ...identity, vintage: 2021 } }]) {
    const changedReference = { ...publicReference as object, ...change };
    assert.equal(readCellarReferenceStyle110(styleWine({ ...read, public_reference: changedReference })), null);
    assert.equal(readCellarReferenceStyle110({ ...saved,
      place_details: { ...saved.place_details, winerim_public_catalogue: changedReference } }), null);
  }
  assert.equal(readCellarReferenceStyle110({ ...saved, place_details: { [key]: payload } }), null);
  assert.equal(readCellarReferenceStyle110({ ...identity }), null);
  assert.equal(cellarReferenceStyleView110(identity, snapshot), null);
});

await test('Strict model, provenance, scale, attributes, signature and historical-score validation', () => {
  for (const change of [{ version: 2 }, { model: 'scan-local-l2-v1' }, { scale: '0-100' },
    { provenance: 'catalog' }, { recorded_at: 'invalid' }, { extra: true }, { public_reference: undefined },
    { attribute_signature: 'changed' }, { initial: undefined }]) {
    assert.equal(readCellarReferenceStyle110(styleWine({ ...read, ...change })), null);
  }
  for (const axis of ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado']) {
    for (const invalid of [-1, 5.01, NaN, Infinity, '3', null, undefined]) {
      assert.equal(readCellarReferenceStyle110(styleWine({ ...read, attributes: { ...read.attributes, [axis]: invalid } })), null);
    }
    assert.equal(readCellarReferenceStyle110(styleWine({ ...read,
      attributes: { ...read.attributes, [axis]: read.attributes[axis] === 0 ? 1 : 0 } })), null);
  }
  assert.equal(readCellarReferenceStyle110(styleWine({ ...read, attributes: { ...read.attributes, power: 4 } })), null);
  for (const change of [{ score: read.initial!.score - 1 }, { recorded_at: '2026-10-22T19:00:00.000Z' },
    { profile_source: 'unavailable' }, { samples: -1 }, { samples: '0' }, { profile: { ...profile, potente: '4' } },
    { profile: { ...profile, potente: 0 } }, { extra: true }]) {
    assert.equal(readCellarReferenceStyle110(styleWine({ ...read, initial: { ...read.initial, ...change } })), null);
  }
});

await test('Exact-year and missing-sensory catalogue records cannot mint reference style', async () => {
  const exact = await catalogue({ ...row, vintage: '2020' }).lookup(candidate); assert('wine' in exact);
  assert.equal(exact.status, 'exact');
  assert.equal(makeCellarReferenceStyle110(identity, exact.wine, snapshot), null);
  const exactReference = makeCellarPublicReference107(identity, exact.wine); assert(exactReference);
  assert.equal(readCellarReferenceStyle110({ ...saved, place_details: { winerim_public_catalogue: exactReference,
    [key]: { ...read, public_reference: exactReference } } }), null);
  const missing = await catalogue({ ...row, tastingAttributes: null }).lookup(candidate); assert('wine' in missing);
  assert.equal(makeCellarReferenceStyle110(identity, missing.wine, snapshot), null);
});

await test('Unavailable and invalid profiles never produce current or initial style affinity', () => {
  const invalidSnapshots: ScanProfileSnapshot[] = [null, { ...snapshot, profile: null },
    { ...snapshot, source: 'unavailable' }, { ...snapshot, status: 'invalid' },
    { ...snapshot, samples: -1 }, { ...snapshot, samples: undefined }];
  for (const axis of ['potente', 'acidez', 'dulce', 'tanico', 'afrutado']) {
    for (const invalid of [-1, 6, NaN, Infinity, '4', null, undefined]) invalidSnapshots.push({ ...snapshot,
      profile: { ...profile, [axis]: invalid } as MatchrimProfileLike });
  }
  for (const invalid of invalidSnapshots) {
    const style = makeCellarReferenceStyle110(identity, global, invalid, recordedAt); assert(style);
    const noInitial = readCellarReferenceStyle110(styleWine(style)); assert(noInitial);
    assert.equal(noInitial.initial, null); assert.equal(noInitial.recorded_at, recordedAt);
    const view = cellarReferenceStyleView110(styleWine(style), invalid); assert(view);
    assert.equal(view.current, null); assert.equal(view.initial, null); assert.equal(view.delta, null);
    const retained = cellarReferenceStyleView110(saved, invalid); assert(retained);
    assert.equal(retained.current, null); assert.equal(retained.delta, null); assert.deepEqual(retained.initial, read.initial);
    assert.deepEqual(makeCellarReferenceStyle110(styleWine(style), global, snapshot), style,
      'An initially unavailable profile must not be backfilled as an initial score later');
  }
  for (const status of ['training-error', 'training-timeout'] as const) {
    assert.equal(cellarReferenceStyleView110(saved, { ...snapshot, status, samples: null })?.current, read.initial!.score);
  }
  const zero = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  assert.equal(cellarReferenceStyleView110(saved, { ...snapshot, profile: zero })?.current,
    calculateLocalMatchrimAffinity(zero, read.attributes), 'Numeric zero is a valid axis, not a missing profile');
});

await test('Readback fails for dropped or changed expected style; absent style preserves legacy behavior', () => {
  assert.equal(confirmsCellarReferenceStyle110({}, identity), true);
  assert.equal(confirmsCellarReferenceStyle110(null, identity), true);
  assert.equal(confirmsCellarReferenceStyle110(saved, styleWine(null)), false);
  assert.equal(confirmsCellarReferenceStyle110(null, saved), false);
  assert.equal(confirmsCellarReferenceStyle110({ ...saved, place_details: null }, saved), false);
  assert.equal(confirmsCellarReferenceStyle110({ ...saved,
    place_details: { winerim_public_catalogue: publicReference } }, saved), false);
  for (const change of [{ initial: null }, { recorded_at: '2026-10-22T19:00:00.000Z',
    initial: { ...read.initial, recorded_at: '2026-10-22T19:00:00.000Z' } }]) {
    const changed = styleWine({ ...read, ...change }); assert(readCellarReferenceStyle110(changed));
    assert.equal(confirmsCellarReferenceStyle110(changed, saved), false);
  }
  const other = makeCellarReferenceStyle110(identity, global,
    { ...snapshot, profile: { ...profile, potente: 0 }, source: 'learned', samples: 10 }, recordedAt); assert(other);
  assert.equal(confirmsCellarReferenceStyle110(styleWine(other), saved), false);
  const attributes = { ...read.attributes, potencia: 3.99 };
  const changed = styleWine({ ...read, attributes,
    attribute_signature: JSON.stringify(['winerim-0-5', 3.99, 3, 1, 4, 3]), initial: null });
  assert(readCellarReferenceStyle110(changed), 'Signature binds exact fractional attributes without rounding');
  assert.equal(confirmsCellarReferenceStyle110(changed, saved), false, 'Self-consistent changed style is not the expected save');
});

await test('Fifty distinct profiles change current style while preserving the initial record and exact/training boundary', () => {
  const before = JSON.stringify(saved), initial = JSON.stringify(read.initial);
  const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
  let seed = 110, changedScores = 0;
  const seen = new Set<string>(), currentScores = new Set<number>();
  const values = [4, 3, 1, 4, 3];
  const expected = (input: MatchrimProfileLike) => Math.round(50 + ((1 - Math.sqrt(axes.reduce((sum, axis, index) =>
    sum + (input[axis] - values[index]) ** 2, 0)) / Math.sqrt(125)) * 100 - 50) * .85);
  for (let index = 0; index < 50; index++) {
    let next: MatchrimProfileLike;
    do {
      next = Object.fromEntries(axes.map(axis => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return [axis, Math.floor(seed / 2 ** 32 * 6)];
      })) as unknown as MatchrimProfileLike;
    } while (seen.has(JSON.stringify(next)));
    seen.add(JSON.stringify(next));
    const evolved: ScanProfileSnapshot = { ...snapshot, profile: next, source: 'learned', samples: index + 1 };
    const reopened = clone(saved), view = cellarReferenceStyleView110(reopened, evolved); assert(view);
    assert.equal(view.current, expected(next)); assert.equal(view.delta, expected(next) - read.initial!.score);
    currentScores.add(view.current!); if (view.current !== read.initial!.score) changedScores++;
    assert.equal(JSON.stringify(view.initial), initial); assert.equal(JSON.stringify(reopened), before);
    assert.deepEqual(makeCellarReferenceStyle110(reopened, global, evolved), payload);
    assert.equal(readCellarSensoryEvidence(reopened), null); assert.equal(readCellarInitialAffinity(reopened), null);
    assert.equal(cellarAffinityView(reopened, evolved).current, null);
    const training = { ...reopened, sensory_attributes: view.attributes, use_for_profile_training: true, rating: 'love' };
    assert.equal(isVerifiedCellarTrainingWine(training), false);
    assert.deepEqual(cellarTrainingRows([training as unknown as TrainableWine], true), []);
    const applied = applyGlobalCatalogue103(candidate, next, global, true);
    assert.equal(applied.sensoryAttributes, null); assert.equal(applied.canonicalId, null); assert.equal(applied.affinity, null);
  }
  assert.equal(seen.size, 50); assert(changedScores > 0); assert(currentScores.size > 1);
  assert.deepEqual(Object.keys(payload as object).sort(), ['attribute_signature', 'attributes', 'initial', 'model',
    'provenance', 'public_reference', 'recorded_at', 'scale', 'version']);
  for (const forbidden of ['bodega_sensory_evidence', 'matchrim_affinity_initial', 'canonical_id', 'sensory_attributes'])
    assert.equal(Object.prototype.hasOwnProperty.call(saved.place_details, forbidden), false);
});

await test('Actual label-save acknowledgment requires style history to survive, not just the public reference', () => {
  const data = { ...saved, id: 'style-row110', user_id: 'qa-owner110', status: 'wishlist', is_favorite: false, use_for_profile_training: false };
  const input = { nombre: identity.name, productor: identity.producer, anada: identity.vintage, affinity_details: saved.place_details };
  assert.equal(confirmedLabelInsertId(data, input, 'qa-owner110'), data.id);
  assert.equal(confirmedLabelInsertId({ ...data, place_details: { winerim_public_catalogue: publicReference } }, input, 'qa-owner110'), null);
});
await test('Native presentation filters include useful NV style but never recommend a rejected wine as high affinity', () => {
  assert.equal(cellarDisplayAffinity110(saved, snapshot), read.initial!.score);
  assert.equal(isHighCellarAffinity110(saved, snapshot), true);
  assert.equal(isHighCellarAffinity110({ ...saved, rating: 'not_for_me' }, snapshot), false);
  assert.equal(cellarDisplayAffinity110(saved, null), null);
  assert.equal(isHighCellarAffinity110(saved, null), false);
  assert.equal(cellarAffinityView(saved, snapshot).current, null, 'Display filtering must not promote exact affinity');
});
console.log(JSON.stringify({ groups, syntheticProfiles: 50, transportCalls, remoteCalls: 0, realUsers: 0,
  modelStarts: 0, fixture: 'Presentation-only NV estimate, serialization and mathematical invariants; no predictive accuracy claim' }));
