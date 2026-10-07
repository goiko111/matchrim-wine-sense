export const MATCHRIM_AFFINITY_MODEL = "confidence-v1" as const;
export const MATCHRIM_AFFINITY_PRIOR = 72;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const calibrateEdgeMatchrimAffinity = (
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

export const mergeEdgeAffinityTrace = (
  placeDetails: unknown,
  trace: {
    raw_affinity: number;
    affinity_confidence: number;
    affinity_model: typeof MATCHRIM_AFFINITY_MODEL;
  },
) => ({
  ...(placeDetails && typeof placeDetails === "object" && !Array.isArray(placeDetails)
    ? placeDetails as Record<string, unknown>
    : {}),
  matchrim_affinity_raw: trace.raw_affinity,
  matchrim_affinity_confidence: trace.affinity_confidence,
  matchrim_affinity_model: trace.affinity_model,
});
