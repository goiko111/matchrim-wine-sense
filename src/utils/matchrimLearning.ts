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
  return numeric > 5 ? clamp(numeric / 2) : clamp(numeric);
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
