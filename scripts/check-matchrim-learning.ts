import assert from 'node:assert/strict';

import {
  calculateLearnedMatchrimProfile,
  calibrateMatchrimAffinityScore,
  detectMatchrimPreferenceShift,
} from '../src/utils/matchrimLearning';
import { buildMatchrimAffinityCalibration } from '../src/utils/matchrimAffinityCalibration';
import { generateMatchrimCode, normalizeMatchrimProfileForClassifier } from '../src/utils/matchrimPassport';
import { generateMatchrimName, generateWineStyles } from '../src/utils/profileUtils';
import {
  calibrateEdgeMatchrimAffinity,
  mergeEdgeAffinityTrace,
} from '../supabase/functions/_shared/matchrim-affinity';
import {
  calculateEdgeLearnedProfile,
  calculateEdgeLearnedProfileAudit,
} from '../supabase/functions/_shared/matchrim-learning';

const baseProfile = {
  potente: 2,
  acidez: 2,
  dulce: 2,
  tanico: 2,
  afrutado: 2,
};

const lovedProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'love',
    sensory_attributes: {
      potencia: 5,
      acidez: 4,
      dulzura: 3,
      taninos: 4,
      afrutado: 5,
    },
  },
]);

assert.equal(lovedProfile.samples, 1);
assert.ok(lovedProfile.confidence > 0);
assert.equal(lovedProfile.calibration.consistency, 100);
assert.equal(lovedProfile.calibration.diversity, 100);
assert.ok(lovedProfile.profile.potente > baseProfile.potente);
assert.ok(lovedProfile.profile.afrutado > baseProfile.afrutado);
assert.doesNotThrow(() => generateWineStyles(lovedProfile.profile));
assert.equal(generateWineStyles(lovedProfile.profile).length, 3);

const stablePublicCode = generateMatchrimCode(baseProfile);
assert.equal(stablePublicCode, generateMatchrimName(baseProfile));
const learnedProfileCode = generateMatchrimCode(lovedProfile.profile);
assert.equal(learnedProfileCode, generateMatchrimName(lovedProfile.profile));
assert.notEqual(
  learnedProfileCode,
  stablePublicCode,
  'This fixture must prove that learned profiles can rename the public code if used directly.'
);
assert.equal(generateMatchrimCode(baseProfile), stablePublicCode);

assert.deepEqual(
  normalizeMatchrimProfileForClassifier({ potente: 4.7, acidez: 3.2, dulce: -1, tanico: 5.8, afrutado: 2.5 }),
  { potente: 5, acidez: 3, dulce: 0, tanico: 5, afrutado: 3 },
  'Learned decimal profiles must be normalized before reaching the integer-only classifier',
);
assert.throws(
  () => normalizeMatchrimProfileForClassifier({ ...baseProfile, potente: Number.NaN }),
  /potente debe ser un número/,
);

const rejectedProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'not_for_me',
    sensory_attributes: {
      potencia: 5,
      acidez: 4,
      dulzura: 3,
      taninos: 4,
      afrutado: 5,
    },
  },
]);

assert.equal(rejectedProfile.samples, 1);
assert.ok(rejectedProfile.profile.potente < baseProfile.potente);
assert.ok(rejectedProfile.profile.afrutado < baseProfile.afrutado);

const ignoredProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'love',
    sensory_attributes: null,
  },
]);

assert.equal(ignoredProfile.samples, 0);
assert.deepEqual(ignoredProfile.profile, baseProfile);

const contradictoryProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'love',
    sensory_attributes: { potencia: 5, acidez: 4, dulzura: 3, taninos: 4, afrutado: 5 },
  },
  {
    rating: 'not_for_me',
    sensory_attributes: { potencia: 5, acidez: 4, dulzura: 3, taninos: 4, afrutado: 5 },
  },
  {
    rating: 'love',
    sensory_attributes: { potencia: 1, acidez: 1, dulzura: 1, taninos: 1, afrutado: 1 },
  },
  {
    rating: 'not_for_me',
    sensory_attributes: { potencia: 1, acidez: 1, dulzura: 1, taninos: 1, afrutado: 1 },
  },
]);
assert.equal(contradictoryProfile.calibration.conflicting, true);
assert.ok(contradictoryProfile.confidence < 20, 'Contradictory evidence must not create false confidence');

const now = Date.parse('2026-09-29T12:00:00Z');
const old = new Date(now - 365 * 86_400_000).toISOString();
const recent = new Date(now).toISOString();
const recencyRows = [
  ...Array.from({ length: 6 }, () => ({
    rating: 'love' as const,
    updated_at: old,
    sensory_attributes: { potencia: 5, acidez: 3, dulzura: 1, taninos: 5, afrutado: 3 },
  })),
  ...Array.from({ length: 6 }, () => ({
    rating: 'love' as const,
    updated_at: recent,
    sensory_attributes: { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 4 },
  })),
] as const;
const recencyProfile = calculateLearnedMatchrimProfile(baseProfile, [...recencyRows]);
assert.equal(recencyProfile.calibration.datedEvidence, 100);
assert.ok(recencyProfile.profile.acidez > 3, 'Recent evidence receives more weight than stale evidence');
assert.ok(recencyProfile.confidence < 100, 'Repeated evidence with low diversity cannot reach 100% confidence');
assert.deepEqual(
  calculateEdgeLearnedProfile(baseProfile, [
    ...recencyRows,
  ]),
  recencyProfile.profile,
  'Client and Edge Functions must derive the same active profile from the same rows',
);
const edgeRecencyAudit = calculateEdgeLearnedProfileAudit(baseProfile, [...recencyRows]);
assert.deepEqual(edgeRecencyAudit, {
  profile: recencyProfile.profile,
  confidence: recencyProfile.confidence,
  samples: recencyProfile.samples,
});

const oldStructured = Array.from({ length: 12 }, (_, index) => ({
  rating: 'love' as const,
  updated_at: new Date(now - (24 - index) * 7 * 86_400_000).toISOString(),
  sensory_attributes: { potencia: 5, acidez: 2, dulzura: 1, taninos: 5, afrutado: 2 },
}));
const recentFresh = Array.from({ length: 12 }, (_, index) => ({
  rating: 'love' as const,
  updated_at: new Date(now - (12 - index) * 7 * 86_400_000).toISOString(),
  sensory_attributes: { potencia: 2, acidez: 5, dulzura: 1, taninos: 1, afrutado: 5 },
}));
const shiftedEvidence = [...oldStructured, ...recentFresh];
const shiftSignal = detectMatchrimPreferenceShift(baseProfile, shiftedEvidence, 0.9);
assert.equal(shiftSignal.detected, true, 'A sustained reversal must activate adaptive recency');
assert.ok(shiftSignal.magnitude >= 0.9);

const measuredShiftProfile = calculateLearnedMatchrimProfile(baseProfile, shiftedEvidence, {
  detectPreferenceShift: true,
  driftThreshold: 0.9,
});
assert.equal(measuredShiftProfile.calibration.preferenceShiftDetected, true);

const stableEvidence = Array.from({ length: 24 }, (_, index) => ({
  rating: index % 5 === 0 ? 'ok' as const : 'love' as const,
  updated_at: new Date(now - (24 - index) * 7 * 86_400_000).toISOString(),
  sensory_attributes: { potencia: 4, acidez: 3, dulzura: 1, taninos: 4, afrutado: 3 },
}));
assert.equal(
  detectMatchrimPreferenceShift(baseProfile, stableEvidence, 0.9).detected,
  false,
  'Repeated stable evidence must not be mistaken for taste drift',
);

assert.equal(calibrateMatchrimAffinityScore(92, 0), 84);
assert.equal(calibrateMatchrimAffinityScore(92, 70), 92);
assert.equal(calibrateMatchrimAffinityScore(40, 0), 52);
for (const score of [0, 40, 72, 92, 100]) {
  for (const confidence of [0, 12, 35, 70, 100]) {
    const client = buildMatchrimAffinityCalibration(score, confidence);
    assert.equal(
      calibrateEdgeMatchrimAffinity(score, confidence),
      client.affinity,
      `Client and Edge affinity calibration must match for ${score}/${confidence}`,
    );
  }
}
for (const confidence of [0, 12, 35, 70, 100]) {
  let previous = -1;
  for (let score = 0; score <= 100; score += 1) {
    const calibrated = calibrateMatchrimAffinityScore(score, confidence);
    assert.ok(calibrated >= previous, 'Calibration must preserve raw score ordering');
    previous = calibrated;
  }
}
assert.deepEqual(buildMatchrimAffinityCalibration(Number.NaN, Number.NaN), {
  affinity: 72,
  rawAffinity: 72,
  learningConfidence: 0,
  model: 'confidence-v1',
});
assert.deepEqual(
  mergeEdgeAffinityTrace(
    { source: 'manual', name_verified_by_user: true },
    { raw_affinity: 92, affinity_confidence: 35, affinity_model: 'confidence-v1' },
  ),
  {
    source: 'manual',
    name_verified_by_user: true,
    matchrim_affinity_raw: 92,
    matchrim_affinity_confidence: 35,
    matchrim_affinity_model: 'confidence-v1',
  },
  'Persisting calibration trace must preserve unrelated place details',
);

console.log('Matchrim learning checks passed');
