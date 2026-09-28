import type { MatchrimProfileLike } from './matchrimPassport';

type Rating = 'love' | 'ok' | 'not_for_me' | null;
type SensoryAttributes = Partial<Record<'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado', unknown>>;

export interface TrainableWine {
  rating?: Rating;
  sensory_attributes?: SensoryAttributes | null;
}

export interface LearnedMatchrimProfile {
  profile: MatchrimProfileLike;
  confidence: number;
  samples: number;
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

const scoreProfileAgainstSensory = (
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

export const calculateLearnedMatchrimProfile = (
  baseProfile: MatchrimProfileLike,
  wines: TrainableWine[]
): LearnedMatchrimProfile => {
  const deltas: Record<keyof MatchrimProfileLike, number> = {
    potente: 0,
    acidez: 0,
    dulce: 0,
    tanico: 0,
    afrutado: 0,
  };
  let totalWeight = 0;
  let samples = 0;

  wines.forEach((wine) => {
    const weight = ratingWeight(wine.rating ?? null);
    const attrs = wine.sensory_attributes;
    if (!weight || !attrs) return;

    const hasUsableAttrs = ATTRS.every(([, sourceKey]) => normalizeSensoryValue(attrs[sourceKey]) !== null);
    if (!hasUsableAttrs) return;

    ATTRS.forEach(([targetKey, sourceKey]) => {
      const sensoryValue = normalizeSensoryValue(attrs[sourceKey]);
      if (sensoryValue === null) return;
      deltas[targetKey] += (sensoryValue - baseProfile[targetKey]) * weight;
    });

    totalWeight += Math.abs(weight);
    samples += 1;
  });

  if (!samples || totalWeight === 0) {
    return { profile: baseProfile, confidence: 0, samples: 0 };
  }

  const confidence = Math.min(100, Math.round((samples / 12) * 100));
  const blend = Math.min(0.75, 0.25 + samples * 0.05);
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
  };
};

export const auditMatchrimLearning = (
  baseProfile: MatchrimProfileLike,
  wines: TrainableWine[],
  candidates: MatchrimRecommendationCandidate[],
): MatchrimLearningAudit => {
  const learned = calculateLearnedMatchrimProfile(baseProfile, wines);

  const recommendations = candidates
    .flatMap((candidate) => {
      const beforeScore = scoreProfileAgainstSensory(baseProfile, candidate.sensory_attributes);
      const afterScore = scoreProfileAgainstSensory(learned.profile, candidate.sensory_attributes);
      if (beforeScore === null || afterScore === null) return [];

      return [{
        id: candidate.id,
        name: candidate.name,
        producer: candidate.producer,
        beforeScore,
        afterScore,
        delta: afterScore - beforeScore,
      }];
    })
    .sort((a, b) => b.afterScore - a.afterScore || b.delta - a.delta || a.name.localeCompare(b.name));

  return { learned, recommendations };
};
