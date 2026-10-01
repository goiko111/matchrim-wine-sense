import type { MatchrimProfileLike } from './matchrimPassport';
import { calibrateMatchrimAffinityScore } from './matchrimAffinityCalibration';

export { calibrateMatchrimAffinityScore } from './matchrimAffinityCalibration';

type Rating = 'love' | 'ok' | 'not_for_me' | null;
type SensoryAttributes = Partial<Record<'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado', unknown>>;

export interface TrainableWine {
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

const normalizeSensoryValue = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  let v = numeric;
  if (v > 10) v = v / 20; // legacy 0-100
  else if (v > 5) v = v / 2; // legacy 0-10
  return clamp(Math.round(v));
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
    const value = normalizeSensoryValue(sensory[sensoryKey]);
    if (value === null) return;
    const match = Math.max(0, 1 - Math.abs(profile[profileKey] - value) / 4);
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

const evidenceTimestamp = (wine: TrainableWine) => {
  const value = wine.updated_at || wine.created_at;
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const sensorySignature = (attrs: SensoryAttributes) => ATTRS
  .map(([, sourceKey]) => normalizeSensoryValue(attrs[sourceKey]))
  .join(':');

export const detectMatchrimPreferenceShift = (
  baseProfile: MatchrimProfileLike,
  wines: TrainableWine[],
  threshold = 0.9,
) => {
  const dated = wines
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
        const value = normalizeSensoryValue(wine.sensory_attributes?.[sourceKey]);
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
  const validWines = wines.filter((wine) => {
    const weight = ratingWeight(wine.rating ?? null);
    const attrs = wine.sensory_attributes;
    return Boolean(weight && attrs && ATTRS.every(([, sourceKey]) => (
      normalizeSensoryValue(attrs[sourceKey]) !== null
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
    const weight = ratingWeight(wine.rating ?? null);
    const attrs = wine.sensory_attributes!;
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

    ATTRS.forEach(([targetKey, sourceKey]) => {
      const sensoryValue = normalizeSensoryValue(attrs[sourceKey]);
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
  const sampleCoverage = Math.min(1, samples / 12);
  const confidence = Math.round(
    sampleCoverage
      * (0.55 + 0.45 * consistencyRatio)
      * (0.65 + 0.35 * diversityRatio)
      * 100,
  );
  const blend = Math.min(0.9, 0.25 + samples * 0.05);
  const learnedProfile = { ...baseProfile };

  ATTRS.forEach(([targetKey]) => {
    learnedProfile[targetKey] = clamp(
      Math.round((baseProfile[targetKey] + (deltas[targetKey] / totalWeight) * blend) * 10) / 10
    );
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
