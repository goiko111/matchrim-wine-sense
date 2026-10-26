import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createHash } from 'node:crypto';
import * as learning from '../src/utils/matchrimLearning.ts';
import * as profile95 from '../supabase/functions/_shared/matchrim-profile95.ts';
import { cellarTrainingRows, makeCellarCatalogEvidence, withCellarInitialAffinity, cellarAffinityView } from '../src/utils/bodegaAffinity.ts';

globalThis.fetch = async () => { throw new Error('EXTERNAL_NETWORK_DENIED248'); };
const root = new URL('../', import.meta.url);
const load = (file, dependencies) => {
  const sandbox = { exports: {}, DOMException, Number, require: id => {
    assert(id in dependencies, 'Unmodeled dependency: ' + id);
    return dependencies[id];
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(file, root), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText, sandbox);
  return sandbox.exports;
};
const platform = load('src/utils/matchrimLearningPlatform.ts', {
  '@capacitor/core': { Capacitor: { isNativePlatform: () => true } },
  './matchrimLearning': learning, '../../supabase/functions/_shared/matchrim-profile95': profile95,
});
const { resolveScanProfile } = load('src/utils/scanProfile.ts', { './matchrimLearningPlatform': platform });
const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const cases = [];
for (const [name, power, tannin] of [['body-soft', 5, 0], ['light-firm', 0, 5]]) {
  const attrs = { scale: 'winerim-0-5', potencia: power, acidez: 3, dulzura: 3, taninos: tannin, afrutado: 3 };
  const rows = Array.from({ length: 6 }, (_, i) => {
    const row = { id: `synthetic248-${name}-${i}`, name: 'Synthetic resolver248', producer: 'Synthetic QA',
      vintage: 2023, region: null, country: null, sensory_attributes: attrs, rating: 'love', use_for_profile_training: true,
      created_at: '2026-10-24T12:00:00Z', updated_at: '2026-10-25T12:00:00Z' };
    row.place_details = { bodega_sensory_evidence: makeCellarCatalogEvidence(row, row.id, attrs), matchrim_rating_at: row.updated_at };
    return row;
  });
  const inputs = JSON.stringify({ base, rows });
  const signal = new AbortController().signal;
  const initial = await resolveScanProfile('SYN248', null, { base: async () => base, training: async () => [] }, signal);
  const current = await resolveScanProfile('SYN248', null, {
    base: async () => base, training: async () => cellarTrainingRows(rows, true),
  }, signal);
  assert.equal(current.source, 'learned'); assert.equal(current.samples, 6); assert.equal(current.status, 'ready');
  assert(power > tannin ? current.profile.potente > current.profile.tanico : current.profile.potente < current.profile.tanico);
  const saved = { ...rows[0], place_details: withCellarInitialAffinity(rows[0], initial, 'saved', '2026-10-25T13:00:00Z', true) };
  const before = cellarAffinityView(saved, initial, true), after = cellarAffinityView(saved, current, true);
  assert(after.current > before.current); assert.deepEqual(after.initial, before.initial);
  const excluded = await resolveScanProfile('SYN248', null, { base: async () => base,
    training: async () => cellarTrainingRows(rows.map(row => ({ ...row, use_for_profile_training: false })), true) }, signal);
  assert.equal(excluded.source, 'quiz'); assert.equal(excluded.samples, 0);
  let anonymousReads = 0;
  const anonymous = await resolveScanProfile(null, base, {
    base: async () => { anonymousReads++; return base; }, training: async () => { anonymousReads++; return []; },
  }, signal);
  assert.equal(anonymousReads, 0); assert.equal(anonymous.source, 'quiz');
  assert.equal(JSON.stringify({ base, rows }), inputs);
  cases.push({ name, source: current.source, samples: current.samples, profile: current.profile,
    internalEvidenceConfidence: current.confidence, initial: before.initial.score, currentBefore: before.current,
    currentAfter: after.current, delta: after.delta, optedOutSource: excluded.source, anonymousReads });
}
const sources = ['src/utils/scanProfile.ts', 'src/utils/matchrimLearningPlatform.ts', 'src/utils/matchrimLearning.ts',
  'src/utils/bodegaAffinity.ts', 'supabase/functions/_shared/matchrim-training-evidence.ts'];
console.log(JSON.stringify({ recordedUTC: new Date().toISOString(), passed: true, cases,
  scope: 'Actual profile resolver/platform wrapper with controlled native Capacitor and in-memory loaders, actual strict Bodega/learner/affinity view. No authentication, RLS, native UI, persistence or predictive accuracy proof. Internal confidence is not probability of liking.',
  externalCalls: 0, userDataWrites: 0,
  sources: Object.fromEntries(sources.map(file => [file, createHash('sha256').update(fs.readFileSync(new URL(file, root))).digest('hex')])),
}, null, 2));
