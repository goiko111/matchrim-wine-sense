export const MATCHRIM_AFFINITY_MODEL = 'confidence-v1' as const;
export const MATCHRIM_AFFINITY_PRIOR = 72;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const calibrateMatchrimAffinityScore = (
  score: number,
  learningConfidence: number,
  prior = MATCHRIM_AFFINITY_PRIOR,
) => {
  const safeScore = clamp(Number.isFinite(score) ? score : prior, 0, 100);
  const safePrior = clamp(Number.isFinite(prior) ? prior : MATCHRIM_AFFINITY_PRIOR, 0, 100);
  const safeConfidence = clamp(Number.isFinite(learningConfidence) ? learningConfidence : 0, 0, 70);
  const reliability = 0.62 + (safeConfidence / 70) * 0.38;
  return Math.round(safePrior + (safeScore - safePrior) * reliability);
};

export const buildMatchrimAffinityCalibration = (
  score: number,
  learningConfidence: number,
) => {
  const safeScore = Number.isFinite(score) ? score : MATCHRIM_AFFINITY_PRIOR;
  const safeConfidence = Number.isFinite(learningConfidence) ? learningConfidence : 0;
  return {
    affinity: calibrateMatchrimAffinityScore(safeScore, safeConfidence),
    rawAffinity: Math.round(clamp(safeScore, 0, 100)),
    learningConfidence: Math.round(clamp(safeConfidence, 0, 100)),
    model: MATCHRIM_AFFINITY_MODEL,
  };
};
