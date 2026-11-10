import type { MatchrimProfileLike } from './matchrimPassport';
import { calibrateMatchrimAffinityScore } from './matchrimAffinityCalibration';
import { optionalScanNumber } from '../../supabase/functions/_shared/matchrim-scan-values';
import { selectMatchrimTrainingEvidence } from '../../supabase/functions/_shared/matchrim-training-evidence';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';

export { calibrateMatchrimAffinityScore } from './matchrimAffinityCalibration';

type Rating = 'love' | 'ok' | 'not_for_me' | null;
type SensoryAttributes = { scale?: 'winerim-0-5' } & Partial<Record<'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado', unknown>>;

export interface TrainableWine {
  id?: string;
  use_for_profile_training?: boolean | null;
  rating?: Rating;
  sensory_attributes?: SensoryAttributes | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export interface LearnedMatchrimProfile {
  profile: MatchrimProfileLike;
  confidence: number;
  samples: number;
  calibration: {
    consistency: number;
    diversity: number;
    datedEvidence: number;
    conflicting: boolean;
    preferenceShiftDetected: boolean;
    preferenceShiftMagnitude: number;
  };
}

export interface MatchrimRecommendationCandidate {
  id: string;
  name: string;
  producer?: string | null;
  sensory_attributes: SensoryAttributes;
}

export interface MatchrimRecommendationAudit {
  id: string;
  name: string;
  producer?: string | null;
  beforeScore: number;
  afterScore: number;
  delta: number;
}

export interface MatchrimLearningAudit {
  learned: LearnedMatchrimProfile;
  recommendations: MatchrimRecommendationAudit[];
}

export interface MatchrimLearningOptions {
  evidenceStrength?: 'legacy-v1' | 'native-v2' | 'native-v3' | 'native-v4';
  detectPreferenceShift?: boolean;
  driftThreshold?: number;
  calibrateAffinity?: boolean;
  affinityPrior?: number;
}

const ATTRS = [
  ['potente', 'potencia'],
  ['acidez', 'acidez'],
  ['dulce', 'dulzura'],
  ['tanico', 'taninos'],
  ['afrutado', 'afrutado'],
] as const;

const clamp = (value: number, min = 0, max = 5) => Math.max(min, Math.min(max, value));

const normalizeSensoryValue = (value: unknown, scale?: unknown) => {
  if (scale !== undefined) return scale === 'winerim-0-5' && typeof value === 'number'
    && Number.isFinite(value) && value >= 0 && value <= 5 ? value : null;
  const numeric = optionalScanNumber(value);
  if (numeric === null || numeric < 0) return null;
  let v = numeric;
  if (v > 10) v = v / 20; // legacy 0-100
  else if (v > 5) v = v / 2; // legacy 0-10
  return clamp(Math.round(v), 1, 5);
};

export const scoreMatchrimProfileAgainstSensory = (
  profile: MatchrimProfileLike,
  sensory: SensoryAttributes,
) => {
  const weights: Record<keyof MatchrimProfileLike, number> = {
    potente: 0.25,
    acidez: 0.2,
    dulce: 0.2,
    tanico: 0.2,
    afrutado: 0.15,
  };

  let weightedScore = 0;
  let availableWeight = 0;

  ATTRS.forEach(([profileKey, sensoryKey]) => {
    const value = normalizeSensoryValue(sensory[sensoryKey], sensory.scale);
    if (value === null) return;
    const match = Math.max(0, 1 - Math.abs(profile[profileKey] - value) / (sensory.scale === 'winerim-0-5' ? 5 : 4));
    weightedScore += match * weights[profileKey];
    availableWeight += weights[profileKey];
  });

  if (!availableWeight) return null;
  return Math.round((weightedScore / availableWeight) * 100);
};

const ratingWeight = (rating: Rating) => {
  if (rating === 'love') return 1;
  if (rating === 'ok') return 0.25;
  if (rating === 'not_for_me') return -0.8;
  return 0;
};

// native-v3: a rating teaches in proportion to how much it surprises the starting profile.
// A "not for me" the profile already expected moves nothing; a love for a wine it expected
// the user to dislike pulls harder than a confirmation. Thresholds are on the shown 0-100 scale.
const surpriseRatingWeight = (rating: Rating, base: MatchrimProfileLike, attrs: SensoryAttributes) => {
  const values = ATTRS.map(([, sourceKey]) => normalizeSensoryValue(attrs[sourceKey], attrs.scale));
  if (values.some(value => value === null)) return 0;
  const [power, acidity, sweetness, tannin, fruity] = values as number[];
  const predicted = calculateLocalMatchrimAffinity(base,
    { scale: 'winerim-0-5', power, acidity, sweetness, tannin, fruity }, 'scan-local-rms-0to5-v3');
  if (predicted === null) return 0;
  const unexpectedLike = clamp((75 - predicted) / 25, 0, 1);
  if (rating === 'love') return 1 + 0.5 * unexpectedLike;
  if (rating === 'ok') return 0.25 + 0.25 * unexpectedLike;
  if (rating === 'not_for_me') return -0.8 * clamp((predicted - 65) / 25, 0, 1);
  return 0;
};

// native-v4: instead of averaging shifts, fit the profile so each rating sits at the distance it
// implies on the shown scale (love close, "ok" in the middle band, "not for me" far), pulled gently
// towards the quiz. Over 6283 real Winerim wines this keeps improving with more ratings, where the
// averaged learners plateau (v1) or drift back (v2/v3). Thresholds are RMS distances on 0-5.
const FIT_PRIOR = 0.7;
const FIT_LOVE = 0.3;
const FIT_OK_BAND = [0.8, 1.9] as const;
const FIT_NOT_FOR_ME = 2.1;
const FIT_CENTER = [3.5, 3.5, 1, 2, 3.5];
const FIT_NEGATIVE_ONLY = 3;
const FIT_NEGATIVE_PER_POSITIVE = 2;
const fitProfileToRatings = (
  baseProfile: MatchrimProfileLike,
  evidence: { values: number[]; rating: Rating; weight: number }[],
) => {
  const base = ATTRS.map(([key]) => baseProfile[key]);
  let point = [...base];
  const rate = 0.6 / (1 + evidence.length * 0.05 + FIT_PRIOR * 0.1);
  // 136: dislikes say what to avoid, not where the taste is; alone they pushed the profile ever further
  // from the quiz (simulated error 0.71 -> 1.00 after 40). Their total pull is worth FIT_NEGATIVE_ONLY votes
  // plus FIT_NEGATIVE_PER_POSITIVE per like/"ok", so one like no longer restores forty dislikes at once.
  const dislikes = evidence.filter(({ rating }) => rating === 'not_for_me').length;
  const negativeScale = dislikes ? Math.min(1, (FIT_NEGATIVE_ONLY + FIT_NEGATIVE_PER_POSITIVE * (evidence.length - dislikes)) / dislikes) : 1;
  for (let iteration = 0; iteration < 400; iteration += 1) {
    const gradient = point.map((value, index) => 2 * FIT_PRIOR * (value - base[index]) / 5);
    evidence.forEach(({ values, rating, weight }) => {
      let diff = point.map((value, index) => value - values[index]);
      // 134: a wine exactly on the profile gave a zero gradient, so "No va" or "Bien" on the
      // closest match taught nothing. Push away along a fixed direction from the wine scale centre.
      if (rating !== 'love' && diff.every(value => Math.abs(value) < 1e-3)) {
        const away = point.map((value, index) => value - FIT_CENTER[index]);
        diff = (away.some(value => Math.abs(value) > 1e-3) ? away : FIT_CENTER.map(() => 1))
          .map(value => value * 1e-3);
      }
      const distance = Math.sqrt(diff.reduce((sum, value) => sum + value * value, 0) / 5) || 1e-6;
      const residual = rating === 'love' ? distance - FIT_LOVE
        : rating === 'ok' ? (distance < FIT_OK_BAND[0] ? distance - FIT_OK_BAND[0] : distance > FIT_OK_BAND[1] ? distance - FIT_OK_BAND[1] : 0)
          : distance < FIT_NOT_FOR_ME ? distance - FIT_NOT_FOR_ME : 0;
      if (!residual) return;
      const scale = rating === 'not_for_me' ? negativeScale : 1;
      diff.forEach((value, index) => { gradient[index] += scale * weight * 2 * residual * value / (5 * distance); });
    });
    const next = point.map((value, index) => clamp(value - rate * gradient[index]));
    const moved = Math.max(...next.map((value, index) => Math.abs(value - point[index])));
    point = next;
    if (moved < 1e-5) break;
  }
  return point;
};

const evidenceTimestamp = (wine: TrainableWine) => {
  const value = wine.updated_at || wine.created_at;
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const sensorySignature = (attrs: SensoryAttributes) => ATTRS
  .map(([, sourceKey]) => normalizeSensoryValue(attrs[sourceKey], attrs.scale))
  .join(':');

export const detectMatchrimPreferenceShift = (
  baseProfile: MatchrimProfileLike,
  wines: TrainableWine[],
  threshold = 0.9,
) => {
  const dated = selectMatchrimTrainingEvidence(wines)
    .filter((wine) => ratingWeight(wine.rating ?? null) !== 0 && evidenceTimestamp(wine) !== null)
    .sort((left, right) => evidenceTimestamp(left)! - evidenceTimestamp(right)!);
  const windowSize = Math.min(12, Math.floor(dated.length / 2));
  if (windowSize < 6) return { detected: false, magnitude: 0, recentSamples: 0, olderSamples: 0 };
  const recent = dated.slice(-windowSize);
  const older = dated.slice(-windowSize * 2, -windowSize);
  if (older.length < 6) return { detected: false, magnitude: 0, recentSamples: recent.length, olderSamples: older.length };

  const preferenceDirection = (rows: TrainableWine[]) => {
    const result = { ...baseProfile };
    const totalWeight = rows.reduce((sum, wine) => sum + Math.abs(ratingWeight(wine.rating ?? null)), 0);
    ATTRS.forEach(([targetKey, sourceKey]) => {
      const direction = rows.reduce((sum, wine) => {
        const value = normalizeSensoryValue(wine.sensory_attributes?.[sourceKey], wine.sensory_attributes?.scale);
        if (value === null) return sum;
        return sum + (value - baseProfile[targetKey]) * ratingWeight(wine.rating ?? null);
      }, 0);
      result[targetKey] = clamp(baseProfile[targetKey] + direction / Math.max(totalWeight, Number.EPSILON));
    });
    return result;
  };
  const olderProfile = preferenceDirection(older);
  const recentProfile = preferenceDirection(recent);
  const shift = mean(ATTRS.map(([targetKey]) => Math.abs(recentProfile[targetKey] - olderProfile[targetKey])));
  return {
    detected: shift >= threshold,
    magnitude: Math.round(shift * 100) / 100,
    recentSamples: recent.length,
    olderSamples: older.length,
  };
};

const mean = (values: number[]) => values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0;

export const calculateLearnedMatchrimProfile = (
  baseProfile: MatchrimProfileLike,
  wines: TrainableWine[],
  options: MatchrimLearningOptions = {},
): LearnedMatchrimProfile => {
  const strengthAware = options.evidenceStrength === 'native-v2' || options.evidenceStrength === 'native-v3';
  const surpriseAware = options.evidenceStrength === 'native-v3';
  const fitAware = options.evidenceStrength === 'native-v4';
  const fitEvidence: { values: number[]; rating: Rating; weight: number }[] = [];
  const deltas: Record<keyof MatchrimProfileLike, number> = {
    potente: 0,
    acidez: 0,
    dulce: 0,
    tanico: 0,
    afrutado: 0,
  };
  const absoluteDeltas: Record<keyof MatchrimProfileLike, number> = {
    potente: 0,
    acidez: 0,
    dulce: 0,
    tanico: 0,
    afrutado: 0,
  };
  const validWines = selectMatchrimTrainingEvidence(wines).filter((wine) => {
    const weight = ratingWeight(wine.rating ?? null);
    const attrs = wine.sensory_attributes;
    return Boolean(weight && attrs && ATTRS.every(([, sourceKey]) => (
      normalizeSensoryValue(attrs[sourceKey], attrs.scale) !== null
    )));
  });
  const preferenceShift = options.detectPreferenceShift
    ? detectMatchrimPreferenceShift(baseProfile, validWines, options.driftThreshold ?? 0.9)
    : { detected: false, magnitude: 0, recentSamples: 0, olderSamples: 0 };
  const timestamps = validWines.map(evidenceTimestamp).filter((value): value is number => value !== null);
  const newestTimestamp = timestamps.length ? Math.max(...timestamps) : null;
  const signatures = new Set<string>();
  let totalWeight = 0;
  let samples = 0;
  let datedSamples = 0;

  validWines.forEach((wine) => {
    const attrs = wine.sensory_attributes!;
    const weight = surpriseAware
      ? surpriseRatingWeight(wine.rating ?? null, baseProfile, attrs)
      : ratingWeight(wine.rating ?? null);
    const timestamp = evidenceTimestamp(wine);
    const ageDays = timestamp !== null && newestTimestamp !== null
      ? Math.max(0, (newestTimestamp - timestamp) / 86_400_000)
      : 0;
    const recencyWeight = timestamp === null
      ? 1
      : 0.2 + 0.8 * Math.pow(0.5, ageDays / 120);
    const effectiveWeight = weight * recencyWeight;
    signatures.add(sensorySignature(attrs));
    if (timestamp !== null) datedSamples += 1;
    if (fitAware) fitEvidence.push({
      values: ATTRS.map(([, sourceKey]) => normalizeSensoryValue(attrs[sourceKey], attrs.scale) as number),
      rating: wine.rating ?? null,
      weight: recencyWeight,
    });

    ATTRS.forEach(([targetKey, sourceKey]) => {
      const sensoryValue = normalizeSensoryValue(attrs[sourceKey], attrs.scale);
      if (sensoryValue === null) return;
      const contribution = (sensoryValue - baseProfile[targetKey]) * effectiveWeight;
      deltas[targetKey] += contribution;
      absoluteDeltas[targetKey] += Math.abs(contribution);
    });

    totalWeight += Math.abs(effectiveWeight);
    samples += 1;
  });

  if (!samples || totalWeight === 0) {
    return {
      profile: baseProfile,
      confidence: 0,
      samples: 0,
      calibration: {
        consistency: 0,
        diversity: 0,
        datedEvidence: 0,
        conflicting: false,
        preferenceShiftDetected: false,
        preferenceShiftMagnitude: 0,
      },
    };
  }

  const totalAbsoluteDelta = Object.values(absoluteDeltas).reduce((sum, value) => sum + value, 0);
  const consistencyRatio = totalAbsoluteDelta > 0
    ? ATTRS.reduce((sum, [targetKey]) => sum + Math.abs(deltas[targetKey]), 0) / totalAbsoluteDelta
    : 1;
  const diversityRatio = Math.min(1, signatures.size / Math.min(samples, 6));
  const sampleCoverage = Math.min(1, (strengthAware ? totalWeight : samples) / 12);
  const rawConfidence = Math.round(
    sampleCoverage
      * (0.55 + 0.45 * consistencyRatio)
      * (0.65 + 0.35 * diversityRatio)
      * 100,
  );
  // 136: dislikes alone say what to avoid, not where the taste is; native-v4 no longer reports 95% for them.
  const confidence = fitAware && fitEvidence.length > 0 && fitEvidence.every(({ rating }) => rating === 'not_for_me')
    ? Math.min(rawConfidence, 40) : rawConfidence;
  const blend = Math.min(0.9, 0.25 + samples * 0.05);
  const evidenceDenominator = strengthAware ? samples : totalWeight;
  const learnedProfile = { ...baseProfile };

  const fitted = fitAware ? fitProfileToRatings(baseProfile, fitEvidence) : null;
  ATTRS.forEach(([targetKey], index) => {
    learnedProfile[targetKey] = fitted
      ? clamp(Math.round(fitted[index] * 10) / 10)
      : clamp(Math.round((baseProfile[targetKey] + (deltas[targetKey] / evidenceDenominator) * blend) * 10) / 10);
  });

  return {
    profile: learnedProfile,
    confidence,
    samples,
    calibration: {
      consistency: Math.round(consistencyRatio * 100),
      diversity: Math.round(diversityRatio * 100),
      datedEvidence: Math.round((datedSamples / samples) * 100),
      conflicting: samples >= 4 && consistencyRatio < 0.55,
      preferenceShiftDetected: preferenceShift.detected,
      preferenceShiftMagnitude: preferenceShift.magnitude,
    },
  };
};

export const auditMatchrimLearning = (
  baseProfile: MatchrimProfileLike,
  wines: TrainableWine[],
  candidates: MatchrimRecommendationCandidate[],
  options: MatchrimLearningOptions = {},
): MatchrimLearningAudit => {
  const learned = calculateLearnedMatchrimProfile(baseProfile, wines, options);

  const recommendations = candidates
    .flatMap((candidate) => {
      const beforeScore = scoreMatchrimProfileAgainstSensory(baseProfile, candidate.sensory_attributes);
      const rawAfterScore = scoreMatchrimProfileAgainstSensory(learned.profile, candidate.sensory_attributes);
      if (beforeScore === null || rawAfterScore === null) return [];
      const afterScore = options.calibrateAffinity
        ? calibrateMatchrimAffinityScore(rawAfterScore, learned.confidence, options.affinityPrior)
        : rawAfterScore;

      return [{
        id: candidate.id,
        name: candidate.name,
        producer: candidate.producer,
        beforeScore,
        afterScore,
        delta: afterScore - beforeScore,
        rawAfterScore,
        rawDelta: rawAfterScore - beforeScore,
      }];
    })
    .sort((a, b) => b.rawAfterScore - a.rawAfterScore || b.rawDelta - a.rawDelta || a.name.localeCompare(b.name))
    .map(({ rawAfterScore: _rawAfterScore, rawDelta: _rawDelta, ...recommendation }) => recommendation);

  return { learned, recommendations };
};
