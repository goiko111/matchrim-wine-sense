import assert from 'node:assert/strict';

import { runMatchrimYearSimulation } from './simulate-matchrim-year';

const config = {
  users: 120,
  days: 240,
  seed: 10_012_026,
  catalogSize: 72,
  candidatePoolSize: 18,
  auditProfiles: 20,
};

const first = runMatchrimYearSimulation(config);
const second = runMatchrimYearSimulation(config);

assert.equal(first.deterministicFingerprint, second.deterministicFingerprint, 'Fixed seeds must reproduce the same study');
assert.equal(first.auditProfiles.length, config.auditProfiles, 'Requested profile audits must be complete');
assert.equal(new Set(first.auditProfiles.map((profile) => profile.id)).size, config.auditProfiles, 'Audited users stay isolated');
assert.ok(first.totals.explicitRatings < first.totals.events, 'Unrated events remain distinct from learning evidence');
assert.ok(
  first.strategyMetrics.hybrid.ndcgAt5 > first.strategyMetrics.popularity.ndcgAt5,
  'Personalized ranking must beat static popularity in the controlled cohort',
);
assert.equal(
  first.strategyMetrics.candidate.ndcgAt5,
  first.strategyMetrics.hybrid.ndcgAt5,
  'Confidence calibration must not reorder recommendations',
);
assert.equal(
  first.strategyMetrics.candidate.meanRegret,
  first.strategyMetrics.hybrid.meanRegret,
  'Confidence calibration must preserve the selected wine',
);
assert.ok(
  first.strategyMetrics.candidate.affinityMae! < first.strategyMetrics.hybrid.affinityMae!,
  'Confidence calibration must reduce affinity error in the controlled cohort',
);
assert.equal(first.strategyMetrics.oracle.meanRegret, 0, 'Oracle remains an evaluation ceiling only');
assert.ok(
  first.profileLearning.find((row) => row.ratings === 5)!.meanProfileRmse
    < first.profileLearning.find((row) => row.ratings === 0)!.meanProfileRmse,
  'Five explicit ratings should reduce average profile error in the controlled cohort',
);
assert.match(first.isolation, /No production accounts/, 'The study must declare production isolation');

console.log(`Matchrim year simulation checks passed: ${first.totals.events} deterministic events`);
