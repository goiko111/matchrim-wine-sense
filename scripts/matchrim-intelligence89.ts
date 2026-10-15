import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '../src/utils/matchrimLearning';
import { calculateEdgeLearnedProfileAudit } from '../supabase/functions/_shared/matchrim-learning';
import { cellarTrainingRows, readCellarSensoryEvidence } from '../src/utils/bodegaAffinity';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';

export const sha256 = (value: unknown) => createHash('sha256')
  .update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const id = z.string().trim().min(1);
const date = z.string().datetime({ offset: true });
const axis = z.number().finite().min(0).max(5);
const profile = z.object({ potente: axis, acidez: axis, dulce: axis, tanico: axis, afrutado: axis }).strict();
const wine = z.object({
  name: id, producer: id, vintage: z.number().int().nullable(), region: z.string().nullable(),
  country: z.string().nullable(), sensory_attributes: z.record(z.unknown()).nullable(),
  place_details: z.record(z.unknown()),
}).strict();
const item = z.object({
  item_id: id, owner_id: id, wine_group: id, feature_source: z.enum(['catalog', 'inference', 'unknown']),
  feature_reference: z.string(), wine,
}).strict();
const training = item.extend({
  row_id: id, rating: z.enum(['love', 'ok', 'not_for_me']).nullable(),
  use_for_profile_training: z.boolean().nullable(), rated_at: date,
  rating_source: z.enum(['independent_blind_human', 'synthetic', 'model', 'unknown']),
}).strict();
const owner = z.object({
  owner_id: id, base_profile: profile.nullable(), training: z.array(training), test: z.array(item),
}).strict();
export const planSchema = z.object({
  version: z.literal('intelligence89-v1'), study_id: id,
  evidence_kind: z.enum(['synthetic', 'independent_blind_human']),
  selection: z.literal('predeclared_without_test_outcomes'), cutoff_at: date,
  minimum_owners: z.number().int().min(2), minimum_training: z.number().int().min(1),
  minimum_test: z.number().int().min(3), bootstrap_seed: z.number().int().nonnegative(),
  owners: z.array(owner).min(1),
}).strict();
export type Intelligence89Plan = z.infer<typeof planSchema>;
export type Intelligence89Item = z.infer<typeof item>;
export type Intelligence89Training = z.infer<typeof training>;

export const sourceFiles = [
  'src/utils/matchrimLearning.ts', 'supabase/functions/_shared/matchrim-learning.ts',
  'supabase/functions/_shared/matchrim-training-evidence.ts', 'src/utils/bodegaAffinity.ts',
  'src/utils/wineAffinityExplanation.ts', 'supabase/functions/_shared/matchrim-scan-values.ts',
  'src/utils/matchrimAffinityCalibration.ts', 'scripts/matchrim-intelligence89.ts',
  'scripts/run-matchrim-intelligence89.ts', 'node_modules/zod/package.json',
];
export const sourceHashes = () => Object.fromEntries(sourceFiles.map(path => [path,
  sha256(readFileSync(fileURLToPath(new URL('../' + path, import.meta.url)), 'utf8'))]));
const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function canonical(value: Intelligence89Item) {
  const trace = value.wine.place_details.bodega_sensory_evidence as Record<string, unknown> | undefined;
  return typeof trace?.canonical_id === 'string' ? normalized(trace.canonical_id) : null;
}
function identityKeys(value: Intelligence89Item) {
  // Ignore vintage conservatively: another vintage must not become an unseen-wine target.
  return ['group:' + normalized(value.wine_group),
    'name:' + normalized(value.wine.name) + ':' + normalized(value.wine.producer),
    ...(canonical(value) ? ['catalog:' + canonical(value)] : [])];
}
function unsupported(value: Intelligence89Item): string | null {
  if (value.feature_source !== 'catalog') return 'UNSUPPORTED_FEATURE_SOURCE';
  if (!value.feature_reference.trim()) return 'MISSING_FEATURE_REFERENCE';
  if (!readCellarSensoryEvidence(value.wine)) return 'UNBOUND_OR_INVALID_SENSORY';
  return null;
}
function requireUnique(values: string[], message: string) {
  if (new Set(values).size !== values.length) throw new Error(message);
}
export function validatePlan(input: unknown) {
  const plan = planSchema.parse(input);
  requireUnique(plan.owners.map(o => o.owner_id), 'DUPLICATE_OWNER');
  const globalItems = new Set<string>();
  const globalRows = new Set<string>();
  for (const o of plan.owners) {
    if (!o.test.length) throw new Error('EMPTY_TEST_SET:' + o.owner_id);
    const all = [...o.training, ...o.test];
    for (const row of all) {
      if (row.owner_id !== o.owner_id) throw new Error('WRONG_OWNER:' + row.item_id);
      if (globalItems.has(row.item_id)) throw new Error('DUPLICATE_ITEM_ID:' + row.item_id);
      globalItems.add(row.item_id);
    }
    for (const row of o.training) {
      if (globalRows.has(row.row_id)) throw new Error('DUPLICATE_ROW_ID:' + row.row_id);
      globalRows.add(row.row_id);
      if (Date.parse(row.rated_at) > Date.parse(plan.cutoff_at)) throw new Error('FUTURE_TRAINING:' + row.item_id);
    }
    const trainKeys = new Set<string>();
    for (const row of o.training) for (const key of identityKeys(row)) {
      if (trainKeys.has(key)) throw new Error('DUPLICATE_TRAIN_IDENTITY:' + row.item_id);
      trainKeys.add(key);
    }
    const testKeys = new Set<string>();
    for (const row of o.test) for (const key of identityKeys(row)) {
      if (trainKeys.has(key)) throw new Error('TRAIN_TEST_IDENTITY_LEAKAGE:' + row.item_id);
      if (testKeys.has(key)) throw new Error('DUPLICATE_TEST_IDENTITY:' + row.item_id);
      testKeys.add(key);
    }
  }
  return plan;
}

export function fitOwner(plan: Intelligence89Plan, o: Intelligence89Plan['owners'][number]) {
  const decisions = o.training.map(row => ({ item_id: row.item_id, reason:
    row.use_for_profile_training !== true ? 'NO_EXPLICIT_CONSENT'
      : !row.rating ? 'NO_RATING'
        : row.rating_source !== (plan.evidence_kind === 'synthetic' ? 'synthetic' : 'independent_blind_human')
          ? 'UNSUPPORTED_RATING_SOURCE' : unsupported(row) }));
  const eligible = o.training.filter((_, index) => decisions[index].reason === null);
  const rows: TrainableWine[] = eligible.map(row => ({ ...row.wine, id: row.row_id,
    rating: row.rating, use_for_profile_training: true,
    sensory_attributes: row.wine.sensory_attributes,
    place_details: { ...row.wine.place_details, matchrim_rating_at: row.rated_at },
  }));
  const strictRows = cellarTrainingRows(rows, true);
  if (strictRows.length !== rows.length) throw new Error('TRAINING_BOUNDARY_DISAGREEMENT');
  const learned = o.base_profile ? calculateLearnedMatchrimProfile(o.base_profile, strictRows) : null;
  if (learned && o.base_profile) {
    const edge = calculateEdgeLearnedProfileAudit(o.base_profile, strictRows);
    if (JSON.stringify(edge) !== JSON.stringify({ profile: learned.profile,
      confidence: learned.confidence, samples: learned.samples })) throw new Error('CLIENT_EDGE_DISAGREEMENT');
  }
  const predictions = o.test.map(row => {
    const reason = !o.base_profile ? 'NO_BASE_PROFILE' : unsupported(row);
    const sensory = row.wine.sensory_attributes;
    return { item_id: row.item_id, reason,
      before: reason ? null : calculateLocalMatchrimAffinity(o.base_profile, sensory),
      after: reason ? null : calculateLocalMatchrimAffinity(learned!.profile, sensory) };
  });
  const chronological = [...strictRows].sort((a, b) => Date.parse(a.updated_at!) - Date.parse(b.updated_at!)
    || a.id!.localeCompare(b.id!));
  const checkpoints = [...new Set([0, 1, 3, 6, 12, 24, 48, chronological.length])]
    .filter(n => n <= chronological.length).sort((a, b) => a - b);
  // Every checkpoint starts from the original quiz, never the previous learned vector.
  const evolution = o.base_profile ? checkpoints.map(n => {
    const state = calculateLearnedMatchrimProfile(o.base_profile!, chronological.slice(0, n));
    return { through_row_id: n ? chronological[n - 1].id : null,
      through_rated_at: n ? chronological[n - 1].updated_at : null,
      profile: state.profile, samples: state.samples, confidence: state.confidence,
      calibration: state.calibration };
  }) : [];
  return { owner_id: o.owner_id, learned, training_decisions: decisions, evolution, predictions };
}

export function freezePlan(input: unknown, frozenAt = new Date().toISOString()) {
  const plan = validatePlan(input);
  date.parse(frozenAt);
  if (Date.parse(frozenAt) < Date.parse(plan.cutoff_at)) throw new Error('CUTOFF_AFTER_FREEZE');
  const sources = sourceHashes();
  const payload = { version: 'intelligence89-freeze-v1' as const, frozen_at: frozenAt,
    plan_sha256: sha256(plan), sources, plan, owners: plan.owners.map(o => fitOwner(plan, o)) };
  if (JSON.stringify(sources) !== JSON.stringify(sourceHashes())) throw new Error('SOURCE_CHANGED_DURING_FREEZE');
  return { sha256: sha256(payload), payload };
}
export type Intelligence89Frozen = ReturnType<typeof freezePlan>;
export function verifyFrozen(input: unknown): Intelligence89Frozen {
  const parsed = z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/), payload: z.record(z.unknown()) }).strict().parse(input);
  if (sha256(parsed.payload) !== parsed.sha256) throw new Error('FREEZE_HASH_MISMATCH');
  const frozen = input as Intelligence89Frozen;
  if (frozen.payload.version !== 'intelligence89-freeze-v1') throw new Error('WRONG_FREEZE_VERSION');
  const plan = validatePlan(frozen.payload.plan);
  date.parse(frozen.payload.frozen_at);
  if (sha256(plan) !== frozen.payload.plan_sha256) throw new Error('PLAN_HASH_MISMATCH');
  if (JSON.stringify(sourceHashes()) !== JSON.stringify(frozen.payload.sources)) throw new Error('SOURCE_HASH_MISMATCH');
  // Revalidate the sealed fit, independently of labels, to detect edited predictions or inputs.
  if (JSON.stringify(plan.owners.map(o => fitOwner(plan, o))) !== JSON.stringify(frozen.payload.owners)) {
    throw new Error('FROZEN_PREDICTION_MISMATCH');
  }
  return frozen;
}

const labelSchema = z.object({
  item_id: id, owner_id: id, blind_code: id,
  rating: z.enum(['love', 'ok', 'not_for_me']).nullable(), rated_at: date.nullable(),
}).strict();
const ratingsSchema = z.object({
  version: z.literal('intelligence89-ratings-v1'), study_id: id, freeze_sha256: id,
  evidence_kind: z.enum(['synthetic', 'independent_blind_human']),
  collected_without_predictions: z.boolean(), labels: z.array(labelSchema),
}).strict();
export type Intelligence89Ratings = z.infer<typeof ratingsSchema>;
export function blindTemplate(frozen: Intelligence89Frozen): Intelligence89Ratings {
  const rows = frozen.payload.plan.owners.flatMap(o => o.test).sort((a, b) =>
    sha256(frozen.sha256 + a.item_id).localeCompare(sha256(frozen.sha256 + b.item_id)));
  return { version: 'intelligence89-ratings-v1', study_id: frozen.payload.plan.study_id,
    freeze_sha256: frozen.sha256, evidence_kind: frozen.payload.plan.evidence_kind,
    collected_without_predictions: false,
    labels: rows.map(row => ({ item_id: row.item_id, owner_id: row.owner_id,
      blind_code: sha256(frozen.sha256 + row.item_id).slice(0, 16), rating: null, rated_at: null })) };
}
const utility = { not_for_me: 0, ok: 1, love: 2 };
export function rankingMetrics(rows: Array<{ id: string; score: number; relevance: number }>) {
  if (!rows.length || rows.every(r => r.relevance === rows[0].relevance)) return null;
  const ranked = [...rows].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const ideal = [...rows].sort((a, b) => b.relevance - a.relevance);
  const k = Math.min(3, rows.length);
  const dcg = (gains: number[]) => gains.slice(0, k).reduce((sum, gain, i) => sum + gain / Math.log2(i + 2), 0);
  // Average gain inside score-ties: opaque item IDs must not decide the metric.
  const gains: number[] = [];
  let top1 = 0;
  const best = Math.max(...rows.map(r => r.relevance));
  for (let start = 0; start < ranked.length;) {
    let end = start + 1;
    while (end < ranked.length && ranked[end].score === ranked[start].score) end++;
    const group = ranked.slice(start, end);
    gains.push(...group.map(() => group.reduce((sum, r) => sum + r.relevance, 0) / group.length));
    if (start === 0) top1 = group.filter(r => r.relevance === best).length / group.length;
    start = end;
  }
  let pairs = 0;
  let correct = 0;
  rows.forEach((left, i) => rows.slice(i + 1).forEach(right => {
    if (left.relevance === right.relevance) return;
    pairs++;
    correct += left.score === right.score ? 0.5 :
      Math.sign(left.score - right.score) === Math.sign(left.relevance - right.relevance) ? 1 : 0;
  }));
  return { ndcg3: dcg(gains) / dcg(ideal.map(r => r.relevance)), top1,
    pairwise: correct / pairs, non_tied_label_pairs: pairs };
}
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
function bootstrap(values: number[], seed: number) {
  let state = seed >>> 0;
  const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
  const means = Array.from({ length: 2000 }, () => average(values.map(() => values[Math.floor(random() * values.length)])))
    .sort((a, b) => a - b);
  return [means[49], means[1949]];
}
export function evaluateFrozen(frozenInput: unknown, ratingsInput: unknown) {
  const frozen = verifyFrozen(frozenInput);
  const ratings = ratingsSchema.parse(ratingsInput);
  const { plan } = frozen.payload;
  if (ratings.study_id !== plan.study_id || ratings.freeze_sha256 !== frozen.sha256) throw new Error('WRONG_RATING_MANIFEST');
  if (ratings.evidence_kind !== plan.evidence_kind) throw new Error('EVIDENCE_KIND_MISMATCH');
  const expected = new Map(blindTemplate(frozen).labels.map(row => [row.item_id, row]));
  requireUnique(ratings.labels.map(row => row.item_id), 'DUPLICATE_TEST_LABEL');
  if (ratings.labels.length !== expected.size) throw new Error('INCOMPLETE_LABEL_MANIFEST');
  for (const label of ratings.labels) {
    const target = expected.get(label.item_id);
    if (!target || label.owner_id !== target.owner_id || label.blind_code !== target.blind_code) throw new Error('WRONG_LABEL_TARGET');
    if ((label.rating === null) !== (label.rated_at === null)) throw new Error('RATING_DATE_MISMATCH');
    if (label.rated_at && Date.parse(label.rated_at) <= Math.max(Date.parse(plan.cutoff_at), Date.parse(frozen.payload.frozen_at))) {
      throw new Error('TEST_LABEL_NOT_AFTER_FREEZE');
    }
  }
  const owners = frozen.payload.owners.map(fit => {
    const labels = ratings.labels.filter(label => label.owner_id === fit.owner_id);
    const complete = labels.every(label => label.rating !== null);
    const scored = fit.predictions.every(p => p.before !== null && p.after !== null);
    const metricRows = (key: 'before' | 'after') => fit.predictions.map(p => ({ id: p.item_id,
      score: p[key]!, relevance: utility[labels.find(l => l.item_id === p.item_id)!.rating!] }));
    const reason = !ratings.collected_without_predictions ? 'BLIND_COLLECTION_NOT_ATTESTED'
      : !fit.learned ? 'NO_BASE_PROFILE'
        : fit.learned.samples < plan.minimum_training ? 'INSUFFICIENT_TRAINING'
          : labels.length < plan.minimum_test ? 'INSUFFICIENT_TEST_ITEMS'
            : !complete ? 'MISSING_TEST_RATINGS' : !scored ? 'UNSUPPORTED_TEST_FEATURES' : null;
    const before = reason ? null : rankingMetrics(metricRows('before'));
    const after = reason ? null : rankingMetrics(metricRows('after'));
    return { owner_id: fit.owner_id, samples: fit.learned?.samples ?? 0,
      rated: labels.filter(l => l.rating !== null).length, test_items: labels.length,
      reason: reason ?? (!before ? 'NO_PREFERENCE_CONTRAST' : null), before, after,
      delta: before && after ? { ndcg3: after.ndcg3 - before.ndcg3,
        top1: after.top1 - before.top1, pairwise: after.pairwise - before.pairwise } : null };
  });
  const eligible = owners.filter(o => o.delta !== null);
  const enough = eligible.length >= plan.minimum_owners;
  const macro = eligible.length ? Object.fromEntries((['ndcg3', 'top1', 'pairwise'] as const).map(key => [key, {
    before: average(eligible.map(o => o.before![key])), after: average(eligible.map(o => o.after![key])),
    delta: average(eligible.map(o => o.delta![key])),
    owner_bootstrap_95_interval: enough ? bootstrap(eligible.map(o => o.delta![key]), plan.bootstrap_seed) : null,
  }])) : null;
  return { version: 'intelligence89-result-v1', study_id: plan.study_id, freeze_sha256: frozen.sha256,
    ratings_sha256: sha256(ratings), evidence_kind: plan.evidence_kind,
    status: plan.evidence_kind === 'synthetic' ? 'SYNTHETIC_ONLY_NOT_HUMAN_VALIDATION'
      : enough ? 'DESCRIPTIVE_ONLY_NOT_RELEASE_VALIDATION' : 'INSUFFICIENT_EVIDENCE',
    eligible_owners: eligible.length, required_owners: plan.minimum_owners, owners, macro,
    conclusion: 'No human-taste accuracy, causality, probability calibration or release approval is inferred automatically.',
    limits: ['JSON provenance and blinding are attestations, not independently verified identities or catalog access.',
      'Owner bootstrap assumes independent owners; supplied synthetic variants are not independent people.',
      'Scores are native local L2 affinity; confidence is learner evidence consistency, not a probability.',
      'No weight search or fitting to test labels; all test candidates use one frozen profile per owner.'] };
}

export function planTemplate(): Intelligence89Plan {
  const make = (index: number) => ({ item_id: 'owner-a-item-' + index, owner_id: 'owner-a',
    wine_group: 'REPLACE-STABLE-WINE-FAMILY-' + index, feature_source: 'unknown' as const,
    feature_reference: '', wine: { name: 'REPLACE-NAME-' + index, producer: 'REPLACE-PRODUCER-' + index,
      vintage: null, region: null, country: null, sensory_attributes: null, place_details: {} } });
  return { version: 'intelligence89-v1', study_id: 'REPLACE-STUDY-ID', evidence_kind: 'independent_blind_human',
    selection: 'predeclared_without_test_outcomes', cutoff_at: '2026-10-15T00:00:00Z',
    minimum_owners: 20, minimum_training: 3, minimum_test: 3, bootstrap_seed: 89,
    owners: [{ owner_id: 'owner-a', base_profile: null,
      training: Array.from({ length: 3 }, (_, i) => ({ ...make(i), row_id: 'owner-a-row-' + i,
        rating: null, use_for_profile_training: false, rated_at: '2026-10-14T00:00:00Z',
        rating_source: 'unknown' as const })), test: Array.from({ length: 3 }, (_, i) => make(i + 3)) }] };
}
