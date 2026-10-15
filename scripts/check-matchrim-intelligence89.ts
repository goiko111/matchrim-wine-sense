import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dgram from 'node:dgram';

let networkAttempts = 0;
const blocked = () => { networkAttempts++; throw new Error('NETWORK_FORBIDDEN'); };
globalThis.fetch = blocked;
net.Socket.prototype.connect = blocked;
tls.connect = blocked;
http.request = blocked;
http.get = blocked;
https.request = blocked;
https.get = blocked;
dgram.createSocket = blocked;

const { calculateLearnedMatchrimProfile: learn } = await import('../src/utils/matchrimLearning');
const { calculateEdgeLearnedProfileAudit: edgeLearn } = await import('../supabase/functions/_shared/matchrim-learning');
const { cellarTrainingRows } = await import('../src/utils/bodegaAffinity');
const { base89, item89, plan89, sensory89, training89 } = await import('./fixtures-matchrim-intelligence89');
const { diagnose89 } = await import('./diagnose-matchrim-intelligence89');
const { blindTemplate, evaluateFrozen, fitOwner, freezePlan, planTemplate, rankingMetrics, sha256,
  sourceHashes, validatePlan } = await import('./matchrim-intelligence89');
const checks: Array<{ name: string; status: string; error?: string }> = [];
const check = (name: string, run: () => void) => {
  try { run(); checks.push({ name, status: 'PASS' }); }
  catch (error) { checks.push({ name, status: 'FAIL', error: error instanceof Error ? error.message : String(error) }); }
};
const axes = Object.keys(base89) as Array<keyof typeof base89>;
const freezeTime = '2026-02-02T00:00:00Z';
function fit(rows = [training89(0)], base = base89) {
  const p = plan89();
  p.owners[0].training = rows;
  p.owners[0].base_profile = base;
  p.owners[0].test = [item89(10000, sensory89(1)), item89(10001, sensory89(3)), item89(10002, sensory89(5))];
  validatePlan(p);
  return fitOwner(p, p.owners[0]);
}
function filled(frozen: ReturnType<typeof freezePlan>) {
  const ballot = blindTemplate(frozen);
  ballot.collected_without_predictions = true;
  ballot.labels.forEach((label, index) => {
    label.rating = (['love', 'ok', 'not_for_me'] as const)[index % 3];
    label.rated_at = '2026-02-03T00:00:00Z';
  });
  return ballot;
}
function invalid(name: string, mutate: (p: ReturnType<typeof plan89>) => void, expected: RegExp) {
  check(name, () => { const p = plan89(); mutate(p); assert.throws(() => freezePlan(p, freezeTime), expected); });
}
const startHashes = sourceHashes();
const scenarios: Record<string, unknown> = {};
check('synthetic historical diagnostic exactly reproduces 44/45 -> 33/45', () => {
  const diagnostic = diagnose89();
  scenarios.historical_diagnostic = diagnostic;
  assert.equal(diagnostic.reproduced.top1_before, 44);
  assert.equal(diagnostic.reproduced.top1_after, 33);
  assert.equal(Number(diagnostic.reproduced.ndcg3_before.toFixed(6)), 0.999499);
  assert.equal(Number(diagnostic.reproduced.ndcg3_after.toFixed(6)), 0.997923);
  assert.equal(diagnostic.reproduced.target_row_overlap, 0);
  assert(diagnostic.reproduced.distinct_profile_counts.every(n => n > 1));
});
invalid('reject wrong training owner', p => { p.owners[0].training[0].owner_id = 'owner-b'; }, /WRONG_OWNER/);
invalid('reject wrong test owner', p => { p.owners[0].test[0].owner_id = 'owner-b'; }, /WRONG_OWNER/);
invalid('reject duplicate owners', p => { p.owners.push(structuredClone(p.owners[0])); }, /DUPLICATE_OWNER/);
invalid('reject duplicate test item IDs', p => { p.owners[0].test[1].item_id = p.owners[0].test[0].item_id; }, /DUPLICATE_ITEM_ID/);
invalid('reject duplicate training row IDs rather than count revisions twice', p => {
  p.owners[0].training.push({ ...training89(1), row_id: p.owners[0].training[0].row_id });
}, /DUPLICATE_ROW_ID/);
invalid('reject same-wine target even with a new item ID', p => {
  p.owners[0].test[0] = { ...item89(0), item_id: 'new-target-id' };
}, /TRAIN_TEST_IDENTITY_LEAKAGE/);
invalid('reject renamed alias sharing canonical ID', p => {
  p.owners[0].test[0].wine.place_details = structuredClone(p.owners[0].training[0].wine.place_details);
}, /TRAIN_TEST_IDENTITY_LEAKAGE/);
invalid('reject same family across another vintage', p => {
  p.owners[0].test[0].wine_group = p.owners[0].training[0].wine_group;
  p.owners[0].test[0].wine.vintage = 2015;
}, /TRAIN_TEST_IDENTITY_LEAKAGE/);
invalid('reject normalized name/producer alias across different catalog/group IDs', p => {
  const source = p.owners[0].training[0].wine;
  Object.assign(p.owners[0].test[0].wine, { name: '  ' + source.name.toUpperCase() + '  ',
    producer: source.producer.toUpperCase(), vintage: 2019 });
}, /TRAIN_TEST_IDENTITY_LEAKAGE/);
invalid('reject identity duplicated under two training row IDs', p => {
  p.owners[0].training.push({ ...training89(0), row_id: 'other-row', item_id: 'other-item' });
}, /DUPLICATE_TRAIN_IDENTITY/);
invalid('reject test-to-test identity duplication', p => {
  p.owners[0].test[1] = { ...p.owners[0].test[0], item_id: 'test-alias' };
}, /DUPLICATE_TEST_IDENTITY/);
invalid('reject post-cutoff training rating', p => { p.owners[0].training[0].rated_at = '2026-03-01T00:00:00Z'; }, /FUTURE_TRAINING/);
invalid('reject test rating accidentally embedded in feature plan', p => {
  Object.assign(p.owners[0].test[0], { rating: 'love' });
}, /Unrecognized key/);
invalid('reject invalid/nonfinite base vector', p => { p.owners[0].base_profile!.potente = NaN; }, /nan/);
for (const source of ['inference', 'unknown'] as const) check(source + ' cannot leak into training despite bound-looking metadata', () => {
  const row = training89(0); row.feature_source = source;
  const out = fit([row]);
  assert.equal(out.learned!.samples, 0);
  assert.equal(out.training_decisions[0].reason, 'UNSUPPORTED_FEATURE_SOURCE');
});
for (const source of ['model', 'unknown', 'independent_blind_human'] as const) check('synthetic plan rejects training-label source ' + source, () => {
  const row = training89(0); row.rating_source = source;
  assert.equal(fit([row]).learned!.samples, 0);
});
check('human plan cannot accept synthetic training labels', () => {
  const p = plan89(); p.evidence_kind = 'independent_blind_human';
  assert.equal(fitOwner(p, p.owners[0]).learned!.samples, 0);
});
for (const consent of [false, null]) check('only explicit training consent passes: ' + consent, () => {
  const row = training89(0); row.use_for_profile_training = consent;
  assert.equal(fit([row]).learned!.samples, 0);
});
for (const change of ['no-rating', 'no-proof', 'stale-identity', 'stale-attributes', 'partial', 'negative', 'nonfinite', 'no-reference'] as const) {
  check('exclude unsupported training row: ' + change, () => {
    const row = training89(0);
    if (change === 'no-rating') row.rating = null;
    if (change === 'no-proof') row.wine.place_details = {};
    if (change === 'stale-identity') row.wine.name = 'Different wine';
    if (change === 'stale-attributes') row.wine.sensory_attributes!.potencia = 1;
    if (change === 'partial') delete row.wine.sensory_attributes!.potencia;
    if (change === 'negative') row.wine.sensory_attributes!.potencia = -1;
    if (change === 'nonfinite') row.wine.sensory_attributes!.potencia = Infinity;
    if (change === 'no-reference') row.feature_reference = '';
    const out = fit([row]);
    assert.equal(out.learned!.samples, 0);
    assert.deepEqual(out.learned!.profile, base89);
    assert.notEqual(out.training_decisions[0].reason, null);
  });
}
check('no data keeps quiz and zero learning confidence', () => {
  const out = fit([]); scenarios.no_training = out;
  assert.deepEqual(out.learned!.profile, base89);
  assert.equal(out.learned!.samples, 0); assert.equal(out.learned!.confidence, 0);
  assert(out.predictions.every(p => p.before === p.after));
});
for (const rating of ['love', 'ok', 'not_for_me'] as const) {
  check(rating + ' direction follows the signed bounded update (integer 1..5 evidence)', () => {
    const out = fit([training89(0, 5, rating)]); scenarios[rating] = out;
    for (const key of axes) assert(rating === 'not_for_me'
      ? out.learned!.profile[key] < base89[key] : out.learned!.profile[key] > base89[key]);
  });
}
for (const [profileKey, sensoryKey] of [['potente', 'potencia'], ['acidez', 'acidez'], ['dulce', 'dulzura'],
  ['tanico', 'taninos'], ['afrutado', 'afrutado']] as const) {
  for (const rating of ['love', 'not_for_me'] as const) check('axis-specific direction: ' + profileKey + '/' + rating, () => {
    const row = training89(0, 3, rating);
    Object.assign(row, item89(0, { ...sensory89(3), [sensoryKey]: 5 }));
    const out = fit([row]);
    for (const key of axes) assert.equal(out.learned!.profile[key], key === profileKey
      ? rating === 'love' ? 3.6 : 2.4 : 3);
  });
}
check('one ok equals one love update because weight cancels in normalized direction', () => {
  assert.deepEqual(fit([training89(0, 5, 'ok')]).learned!.profile, fit([training89(0, 5, 'love')]).learned!.profile);
});
check('symmetric conflicting evidence signals conflict without false monotonic-confidence assumption', () => {
  const rows = [training89(0, 5, 'love'), training89(1, 5, 'not_for_me'),
    training89(2, 1, 'love'), training89(3, 1, 'not_for_me')];
  const out = fit(rows); scenarios.conflicting = out;
  assert.equal(out.learned!.calibration.conflicting, true);
  assert(out.learned!.confidence < fit(rows.map((_, i) => training89(i, 5, 'love'))).learned!.confidence);
  assert.deepEqual(out.learned!.profile, base89);
});
check('sustained recent reversal outweighs older ratings; detector is opt-in and diagnostic', () => {
  const rows = Array.from({ length: 12 }, (_, i) => ({ ...training89(i, i < 6 ? 5 : 1),
    rated_at: i < 6 ? '2024-01-01T00:00:00Z' : '2026-01-01T00:00:00Z' }));
  const out = fit(rows); scenarios.reversal = out;
  for (const key of axes) assert(out.learned!.profile[key] < base89[key]);
  assert.equal(out.learned!.calibration.preferenceShiftDetected, false);
  const strict = cellarTrainingRows(rows.map(r => ({ ...r.wine, id: r.row_id, rating: r.rating,
    use_for_profile_training: true, place_details: { ...r.wine.place_details, matchrim_rating_at: r.rated_at } })), true);
  const detected = learn(base89, strict, { detectPreferenceShift: true });
  assert.equal(detected.calibration.preferenceShiftDetected, true);
  assert.deepEqual(detected.profile, out.learned!.profile);
});
check('rerating, removal and consent withdrawal replace older evidence in both pure learners', () => {
  const old = { id: 'stable-row', rating: 'love' as const, use_for_profile_training: true,
    sensory_attributes: sensory89(5), updated_at: '2026-01-01T00:00:00Z' };
  for (const update of [{ rating: 'not_for_me' as const }, { rating: null }, { use_for_profile_training: false }]) {
    const latest = { ...old, ...update, updated_at: '2026-01-02T00:00:00Z' };
    for (const calculate of [learn, edgeLearn]) for (const rows of [[old, latest], [latest, old]]) {
      assert.deepEqual(calculate(base89, rows), calculate(base89, [latest]));
    }
  }
  assert.equal(learn(base89, [old, old, old]).samples, 1);
});
check('deterministic noisy fixtures preserve bounds, client/Edge parity, input immutability and order invariance', () => {
  let seed = 89;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const rows = Array.from({ length: 48 }, (_, i) => training89(i, 1 + next() % 5,
    (['love', 'ok', 'not_for_me'] as const)[next() % 3]));
  const before = structuredClone(rows);
  const out = fit(rows); scenarios.seeded_noise = out;
  const shuffled = [...rows].sort((a, b) => sha256(a.item_id).localeCompare(sha256(b.item_id)));
  assert.deepEqual(fit(shuffled).learned, out.learned);
  assert.deepEqual(rows, before);
  for (const value of Object.values(out.learned!.profile)) assert(Number.isFinite(value) && value >= 0 && value <= 5);
  assert(out.learned!.confidence >= 0 && out.learned!.confidence <= 100);
  assert.deepEqual(out.evolution.map(e => e.samples), [0, 1, 3, 6, 12, 24, 48]);
  assert.deepEqual(out.evolution.at(-1)!.profile, out.learned!.profile);
});
check('zero and fractional sensory compatibility is observed, not asserted as a continuous learner', () => {
  const row = training89(0, 0);
  const out = fit([row]); scenarios.zero_sensory_compatibility = out;
  assert.equal(out.learned!.samples, 1);
  // Existing learner normalizes sensory zero to one and rounds fractions. Do not change weights here.
  assert.deepEqual(out.learned!.profile, fit([training89(0, 1)]).learned!.profile);
});
check('freeze is deterministic with a fixed timestamp and never mutates its input', () => {
  const p = plan89(); const before = structuredClone(p);
  assert.deepEqual(freezePlan(p, freezeTime), freezePlan(p, freezeTime)); assert.deepEqual(p, before);
});
check('one frozen profile is used for all held-out predictions', () => {
  const frozen = freezePlan(plan89(), freezeTime);
  assert.equal(frozen.payload.owners[0].learned!.samples, 1);
  assert.equal(frozen.payload.owners[0].predictions.length, 3);
});
check('held-out sensory features cannot influence the fitted profile', () => {
  const p = plan89(); const fitA = fitOwner(p, p.owners[0]);
  p.owners[0].test = [item89(100, sensory89(5)), item89(101, sensory89(5)), item89(102, sensory89(5))];
  assert.deepEqual(fitA.learned, fitOwner(p, p.owners[0]).learned);
});
check('another owner training cannot alter owner A predictions or evolution', () => {
  const p = plan89(); const first = freezePlan(p, freezeTime).payload.owners[0];
  p.owners.push({ owner_id: 'owner-b', base_profile: { ...base89 }, training: [training89(200, 1, 'love', 'owner-b')],
    test: [item89(201, sensory89(5), 'owner-b'), item89(202, sensory89(3), 'owner-b'), item89(203, sensory89(1), 'owner-b')] });
  assert.deepEqual(freezePlan(p, freezeTime).payload.owners[0], first);
});
check('template has zero people claimed, null scores, no fabricated ratings and insufficient evidence', () => {
  const frozen = freezePlan(planTemplate(), '2026-10-16T00:00:00Z');
  const ballot = blindTemplate(frozen);
  assert(ballot.labels.every(l => l.rating === null));
  assert(!JSON.stringify(ballot).includes('before'));
  const out = evaluateFrozen(frozen, ballot); scenarios.empty_human_template = out;
  assert.equal(out.status, 'INSUFFICIENT_EVIDENCE'); assert.equal(out.macro, null);
  assert.equal(out.eligible_owners, 0);
});
check('test labels cannot change sealed fits or predictions', () => {
  const frozen = freezePlan(plan89(), freezeTime); const before = structuredClone(frozen);
  const a = filled(frozen); const b = structuredClone(a);
  b.labels.reverse().forEach(l => { l.rating = l.rating === 'love' ? 'not_for_me' : 'love'; });
  evaluateFrozen(frozen, a); evaluateFrozen(frozen, b); assert.deepEqual(frozen, before);
});
for (const bad of ['duplicate', 'wrong-owner', 'train-target', 'wrong-code', 'pre-freeze', 'different-study', 'synthetic-as-human', 'unscoped-extra'] as const) {
  check('reject bad test labels: ' + bad, () => {
    const frozen = freezePlan(plan89(), freezeTime); const labels = filled(frozen);
    if (bad === 'duplicate') labels.labels[1] = structuredClone(labels.labels[0]);
    if (bad === 'wrong-owner') labels.labels[0].owner_id = 'owner-b';
    if (bad === 'train-target') labels.labels[0].item_id = frozen.payload.plan.owners[0].training[0].item_id;
    if (bad === 'wrong-code') labels.labels[0].blind_code = 'wrong-code';
    if (bad === 'pre-freeze') labels.labels[0].rated_at = freezeTime;
    if (bad === 'different-study') labels.study_id = 'different-study';
    if (bad === 'synthetic-as-human') labels.evidence_kind = 'independent_blind_human';
    if (bad === 'unscoped-extra') Object.assign(labels.labels[0], { predicted_score: 90 });
    assert.throws(() => evaluateFrozen(frozen, labels));
  });
}
check('missing labels are insufficient, never an implicit zero or preference', () => {
  const frozen = freezePlan(plan89(), freezeTime); const ballot = filled(frozen);
  ballot.labels[0].rating = null; ballot.labels[0].rated_at = null;
  const out = evaluateFrozen(frozen, ballot);
  assert.equal(out.owners[0].reason, 'MISSING_TEST_RATINGS'); assert.equal(out.macro, null);
});
check('unscorable target with full ratings causes abstention, not favorable survivor selection', () => {
  const p = plan89(); p.owners[0].test[0].feature_source = 'unknown';
  const frozen = freezePlan(p, freezeTime); const out = evaluateFrozen(frozen, filled(frozen));
  assert.equal(out.owners[0].reason, 'UNSUPPORTED_TEST_FEATURES'); assert.equal(out.macro, null);
});
check('no base profile never produces numeric affinity', () => {
  const p = plan89(); p.owners[0].base_profile = null;
  const frozen = freezePlan(p, freezeTime);
  assert(frozen.payload.owners[0].predictions.every(p => p.before === null && p.after === null));
  assert.equal(evaluateFrozen(frozen, filled(frozen)).owners[0].reason, 'NO_BASE_PROFILE');
});
check('no training is insufficient for learning effectiveness even when quiz scores exist', () => {
  const p = plan89(); p.owners[0].training = [];
  const frozen = freezePlan(p, freezeTime);
  assert.equal(evaluateFrozen(frozen, filled(frozen)).owners[0].reason, 'INSUFFICIENT_TRAINING');
});
check('all-equal human ratings have no preference contrast, not perfect accuracy', () => {
  const frozen = freezePlan(plan89(), freezeTime); const ballot = filled(frozen);
  ballot.labels.forEach(l => { l.rating = 'love'; });
  const out = evaluateFrozen(frozen, ballot);
  assert.equal(out.owners[0].reason, 'NO_PREFERENCE_CONTRAST'); assert.equal(out.macro, null);
});
check('score ties use expected utility and half-credit pairwise, independent of IDs/order', () => {
  const rows = [0, 1, 2].map((relevance, i) => ({ id: String(i), score: 50, relevance }));
  const out = rankingMetrics(rows)!;
  assert.equal(out.top1, 1 / 3); assert.equal(out.pairwise, 0.5);
  assert.deepEqual(out, rankingMetrics(rows.reverse()));
});
check('manifest checksum and semantic prediction checks detect tampering', () => {
  const frozen = freezePlan(plan89(), freezeTime); const ballot = filled(frozen);
  frozen.payload.owners[0].predictions[0].after = 100;
  assert.throws(() => evaluateFrozen(frozen, ballot), /FREEZE_HASH_MISMATCH/);
  frozen.sha256 = sha256(frozen.payload);
  assert.throws(() => evaluateFrozen(frozen, ballot), /FROZEN_PREDICTION_MISMATCH/);
});
check('paired owner macro and bootstrap are deterministic; synthetic data never becomes human evidence', () => {
  const p = plan89();
  p.owners.push({ owner_id: 'owner-b', base_profile: { ...base89 }, training: [training89(20, 1, 'love', 'owner-b')],
    test: [item89(30, sensory89(1), 'owner-b'), item89(31, sensory89(3), 'owner-b'), item89(32, sensory89(5), 'owner-b')] });
  const frozen = freezePlan(p, freezeTime); const ballot = filled(frozen);
  const result = evaluateFrozen(frozen, ballot); scenarios.synthetic_metric_smoke = result;
  assert.equal(result.status, 'SYNTHETIC_ONLY_NOT_HUMAN_VALIDATION'); assert.equal(result.eligible_owners, 2);
  assert(result.macro!.ndcg3.owner_bootstrap_95_interval);
  assert.deepEqual(result, evaluateFrozen(frozen, ballot));
});
check('no network attempted during all evaluation/diagnostic scenarios', () => assert.equal(networkAttempts, 0));
check('network guard actively blocks fetch and raw TCP', () => {
  assert.throws(() => fetch('https://example.invalid'), /NETWORK_FORBIDDEN/);
  assert.throws(() => new net.Socket().connect(443, 'example.invalid'), /NETWORK_FORBIDDEN/);
  assert.equal(networkAttempts, 2);
});
check('production and evaluator sources unchanged throughout this run', () => assert.deepEqual(sourceHashes(), startHashes));
const report = { scope: 'Offline intelligence89 pure-function and anti-leakage tests. All inputs/ratings synthetic; zero human raters.',
  passed: checks.filter(c => c.status === 'PASS').length, failed: checks.filter(c => c.status === 'FAIL').length,
  outbound_calls: 0, blocked_guard_probes: networkAttempts, source_hashes: startHashes, checks, scenarios };
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice('--output='.length);
if (output) {
  if (!basename(output).includes('intelligence89')) throw new Error('OUTPUT_NAME_MUST_INCLUDE_intelligence89');
  writeFileSync(resolve(output), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ passed: report.passed, failed: report.failed,
  failures: checks.filter(c => c.status === 'FAIL'), diagnostic: (scenarios.historical_diagnostic as ReturnType<typeof diagnose89>)?.reproduced,
  empty_human_template: (scenarios.empty_human_template as ReturnType<typeof evaluateFrozen>)?.status }, null, 2));
process.exitCode = report.failed ? 1 : 0;
