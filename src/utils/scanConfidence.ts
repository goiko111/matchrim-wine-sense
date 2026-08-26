export type ConfidenceBand = 'alta' | 'media' | 'baja' | 'sin medir';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const normalizeConfidence = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
};

export const calibrateInferredAffinity = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const bounded = clamp(numeric, 0, 100);

  // Sensory attributes here are inferred, not measured. Pull extremes towards
  // neutral so an ordinal match cannot be presented as certainty.
  return Math.round(50 + (bounded - 50) * 0.85);
};

export const calibrateMenuIdentityConfidence = (options: {
  rawConfidence: unknown;
  hasReliablePosition: boolean;
  hasTextEvidence: boolean;
  hasProducer: boolean;
  hasRegion: boolean;
  hasPrice: boolean;
}): number | null => {
  const raw = normalizeConfidence(options.rawConfidence);
  if (raw === null) return null;

  let cap = 0.88;
  if (!options.hasTextEvidence) cap = Math.min(cap, 0.82);
  if (!options.hasReliablePosition) cap = Math.min(cap, 0.78);
  if (!options.hasProducer) cap = Math.min(cap, 0.74);
  if (!options.hasRegion && !options.hasPrice) cap = Math.min(cap, 0.68);
  return Math.round(Math.min(raw, cap) * 100) / 100;
};

export const getConfidenceBand = (value: number | null | undefined): ConfidenceBand => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'sin medir';
  if (value >= 0.85) return 'alta';
  if (value >= 0.62) return 'media';
  return 'baja';
};
