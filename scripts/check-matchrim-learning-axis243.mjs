import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { cellarTrainingRows, makeCellarCatalogEvidence, withCellarInitialAffinity, cellarAffinityView } from '../src/utils/bodegaAffinity.ts';
import { calculateLearnedMatchrimProfile, scoreMatchrimProfileAgainstSensory } from '../src/utils/matchrimLearning.ts';

globalThis.fetch = async () => { throw new Error('EXTERNAL_NETWORK_DENIED_AUDIT243'); };
const repo = new URL('../', import.meta.url).pathname.replace(/\/$/, '');
const base = { potente: 3, acidez: 3, dulce: 3, tanico: 3, afrutado: 3 };
const original = JSON.stringify(base), results = [];
for (const [name, power, tannin] of [['body-with-soft-tannin', 5, 0], ['light-with-firm-tannin', 0, 5]]) {
  const attrs = { scale: 'winerim-0-5', potencia: power, acidez: 3, dulzura: 3, taninos: tannin, afrutado: 3 };
  const rows = Array.from({ length: 6 }, (_, index) => {
    const row = { id: `synthetic243-${name}-${index}`, name: 'Synthetic axis calibration243', producer: 'Synthetic QA',
      vintage: 2023, region: null, country: null, sensory_attributes: attrs, rating: 'love',
      use_for_profile_training: true, created_at: '2026-10-24T12:00:00Z', updated_at: '2026-10-25T12:00:00Z' };
    row.place_details = { bodega_sensory_evidence: makeCellarCatalogEvidence(row, row.id, attrs), matchrim_rating_at: row.updated_at };
    assert(row.place_details.bodega_sensory_evidence);
    return row;
  });
  const beforeRows = JSON.stringify(rows);
  const learn = list => calculateLearnedMatchrimProfile(base, cellarTrainingRows(list, true), { evidenceStrength: 'native-v2' });
  const learned = learn(rows);
  const before = scoreMatchrimProfileAgainstSensory(base, attrs), after = scoreMatchrimProfileAgainstSensory(learned.profile, attrs);
  assert.equal(learned.samples, 6);
  assert(power > tannin ? learned.profile.potente > learned.profile.tanico : learned.profile.potente < learned.profile.tanico);
  assert(after > before);
  const optedOut = learn(rows.map(row => ({ ...row, use_for_profile_training: false })));
  assert.equal(optedOut.samples, 0); assert.deepEqual(optedOut.profile, base);
  const noProof = learn(rows.map(row => ({ ...row, place_details: {} })));
  assert.equal(noProof.samples, 0); assert.deepEqual(noProof.profile, base);
  const initialSnapshot = { profile: base, source: 'quiz', status: 'ready', samples: 0, note: 'Controlled initial quiz243' };
  const saved = { ...rows[0], place_details: withCellarInitialAffinity(rows[0], initialSnapshot, 'saved', '2026-10-25T13:00:00Z', true) };
  const initialView = cellarAffinityView(saved, initialSnapshot, true);
  const learnedView = cellarAffinityView(saved, { ...initialSnapshot, profile: learned.profile, source: 'learned', samples: learned.samples }, true);
  assert(initialView.initial && initialView.current !== null && learnedView.current !== null);
  assert(learnedView.current > initialView.current);
  assert.deepEqual(learnedView.initial, initialView.initial);
  assert.equal(learnedView.delta, learnedView.current - initialView.current);
  assert.equal(JSON.stringify(rows), beforeRows); assert.equal(JSON.stringify(base), original);
  results.push({ name, target: attrs, learned: learned.profile, samples: learned.samples,
    internalEvidenceConfidence: learned.confidence, internalHelperScoreBefore: before, internalHelperScoreAfter: after,
    actualNativeBodega: { initial: initialView.initial.score, currentBefore: initialView.current,
      currentAfter: learnedView.current, delta: learnedView.delta, model: initialView.initial.model,
      initialSnapshotUnchanged: true },
    optedOutAbstains: true, missingEvidenceAbstains: true });
}
const sources = ['src/utils/bodegaAffinity.ts', 'src/utils/matchrimLearning.ts',
  'supabase/functions/_shared/matchrim-training-evidence.ts'];
console.log(JSON.stringify({ recordedUTC: new Date().toISOString(), passed: true, scenarios: results,
  scope: 'Two new off-diagonal synthetic sensory histories through the actual native strict Bodega/learner path. Six separate fixture IDs each, not six human ratings or verified wines. Demonstrates independent-axis update and abstention, not predictive accuracy or real persistence.',
  initialProfileUnchanged: true, externalCalls: 0, writesToUserData: 0,
  sources: Object.fromEntries(sources.map(file => [file, createHash('sha256').update(fs.readFileSync(repo + '/' + file)).digest('hex')])) }, null, 2));
