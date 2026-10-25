import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { cellarTrainingRows, makeCellarCatalogEvidence, withCellarInitialAffinity, cellarAffinityView } from '../src/utils/bodegaAffinity.ts';
import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning.ts';
import { calculateLearnedMatchrimProfile95 } from '../supabase/functions/_shared/matchrim-profile95.ts';

const root = new URL('../', import.meta.url).pathname;
const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
const all = n => Object.fromEntries(axes.map(key => [key, n]));
const stamp = '2026-01-01T12:00:00.000Z', next = '2026-06-01T12:00:00.000Z';
const wine = (id, n, ratingAt = stamp) => {
  const attributes = { scale: 'winerim-0-5', potencia: n, acidez: n, dulzura: n, taninos: n, afrutado: n };
  const row = { id, name: 'Synthetic lifecycle reference230', producer: 'Synthetic QA', vintage: 2020,
    region: null, country: null, sensory_attributes: attributes, rating: 'love', use_for_profile_training: true,
    updated_at: ratingAt, created_at: stamp };
  row.place_details = { bodega_sensory_evidence: makeCellarCatalogEvidence(row, 'synthetic-qa230-' + id, attributes), matchrim_rating_at: ratingAt };
  assert(row.place_details.bodega_sensory_evidence);
  return row;
};
const native = (profile, rows) => {
  const result = calculateLearnedMatchrimProfile(profile, cellarTrainingRows(rows, true), { evidenceStrength: 'native-v2' });
  return { profile: result.profile, samples: result.samples, confidence: result.confidence };
};
globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_LEARNING230'); };
const scenarios = ['newer-optout', 'newer-unrated', 'newer-invalid-proof', 'same-date-attributes-conflict', 'same-row-duplicate', 'separate-vintages'];
const results = [];
const distinctProfiles = new Set();
for (let index = 0; index < 50; index++) {
  const base = Object.fromEntries(axes.map((key, axis) => [key,
    ((Math.floor(index / 21 ** axis) + (index % 21) * (axis + 1) + axis * 3) % 21) / 4]));
  distinctProfiles.add(JSON.stringify(base));
  const first = wine('case-' + index, index % 6);
  const snapshot = { profile: base, source: 'quiz', status: 'ready', samples: 0, note: 'Synthetic lifecycle230' };
  const saved = { ...first, place_details: withCellarInitialAffinity(first, snapshot, 'saved', stamp, true) };
  const initial = cellarAffinityView(saved, snapshot, true).initial;
  assert(initial, 'Controlled verified wine must retain its original affinity snapshot');
  const recent = { ...first, updated_at: next, place_details: { ...first.place_details, matchrim_rating_at: next } };
  for (const scenario of scenarios) {
    let second;
    if (scenario === 'newer-optout') second = { ...recent, use_for_profile_training: false };
    if (scenario === 'newer-unrated') second = { ...recent, rating: null };
    if (scenario === 'newer-invalid-proof') second = { ...recent, place_details: { matchrim_rating_at: next } };
    if (scenario === 'same-date-attributes-conflict') second = wine(first.id, (index + 3) % 6);
    if (scenario === 'same-row-duplicate') second = structuredClone(first);
    if (scenario === 'separate-vintages') {
      second = { ...wine(first.id + '-2021', (index + 3) % 6), vintage: 2021 };
      second.place_details.bodega_sensory_evidence = makeCellarCatalogEvidence(second, 'synthetic-qa230-' + second.id, second.sensory_attributes);
    }
    for (const reverse of [false, true]) {
      const rows = reverse ? [second, first] : [first, second];
      const before = JSON.stringify(rows), actual = native(base, rows);
      const expected = calculateLearnedMatchrimProfile95(base, rows, { evidenceStrength: 'native-v2' });
      assert.equal(JSON.stringify(rows), before, 'Actual source must not mutate incoming history');
      const expectedSamples = scenario === 'same-row-duplicate' ? 1 : scenario === 'separate-vintages' ? 2 : 0;
      const passed = JSON.stringify(actual) === JSON.stringify(expected) && actual.samples === expectedSamples
        && (expectedSamples !== 0 || JSON.stringify(actual.profile) === JSON.stringify(base));
      const active = { ...snapshot, profile: actual.profile, samples: actual.samples, source: actual.samples ? 'learned' : 'quiz' };
      const view = cellarAffinityView(saved, active, true);
      assert.deepEqual(view.initial, initial, 'Learning or re-reading must not rewrite the original score');
      assert.deepEqual(withCellarInitialAffinity(saved, active, 'first_verified', next, true), saved.place_details);
      if (expectedSamples === 0 && passed) assert.equal(view.current, initial.score, 'Revoked evidence must not change current affinity');
      results.push({ profile: index + 1, scenario, reverse, passed, ...(index === 0 ? { actual, expected } : {}) });
    }
  }
}
assert.equal(distinctProfiles.size, 50, 'A labelled loop is not evidence of fifty distinct taste vectors');
const untouched = [wine('legacy-web-unchanged', 3)];
assert.equal(cellarTrainingRows(untouched, false), untouched, 'Legacy web must receive its original array unchanged');
assert.deepEqual(cellarTrainingRows([null, undefined, false, [], {}], true), [], 'Malformed history must abstain');
const byScenario = Object.fromEntries(scenarios.map(scenario => {
  const selected = results.filter(row => row.scenario === scenario);
  return [scenario, { passed: selected.filter(row => row.passed).length, total: selected.length }];
}));
const files = ['src/utils/bodegaAffinity.ts', 'src/utils/matchrimLearning.ts', 'supabase/functions/_shared/matchrim-profile95.ts'];
const result = { checkedUTC: new Date().toISOString(), passed: results.every(row => row.passed), byScenario,
  syntheticProfiles: distinctProfiles.size, comparisons: results.length, failed: results.filter(row => !row.passed).length,
  examples: results.filter(row => row.profile === 1),
  sources: Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(root + file)).digest('hex')])),
  initialSnapshots: 50, affinityReReads: results.length,
  externalCalls: 0, scope: 'Actual native strict Bodega-to-learner pipeline versus existing Food95 contract on synthetic versioned history, both orders, plus immutable initial/current affinity re-reads. Synthetic catalogue binding, not real wine evidence or 50human users/RLS/native UI. Duplicate-version stress cases do not prove a current single-snapshot database failure.' };
const target = process.argv[2] ? new URL(process.argv[2], 'file://' + process.cwd() + '/') : null;
if (target) { assert(!fs.existsSync(target)); fs.writeFileSync(target, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify({ target: target?.pathname ?? null, passed: result.passed, syntheticProfiles: 50, comparisons: results.length, byScenario }));
if (!result.passed) process.exitCode = 1;
