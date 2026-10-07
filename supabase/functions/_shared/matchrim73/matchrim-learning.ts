import { optionalScanNumber } from './matchrim-scan-values.ts';

export type MatchrimLearningProfile = {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
};

export type MatchrimTrainingRow = {
  rating?: string | null;
  sensory_attributes?: Record<string, unknown> | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export type MatchrimEdgeLearningAudit = {
  profile: MatchrimLearningProfile;
  confidence: number;
  samples: number;
};

const attributes = [
  ["potente", "potencia"],
  ["acidez", "acidez"],
  ["dulce", "dulzura"],
  ["tanico", "taninos"],
  ["afrutado", "afrutado"],
] as const;

const clamp = (value: number, min = 0, max = 5) => Math.max(min, Math.min(max, value));

const normalizeSensoryValue = (value: unknown) => {
  const numeric = optionalScanNumber(value);
  if (numeric === null || numeric < 0 || numeric > 100) return null;
  const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
  return clamp(Math.round(scaled), 1, 5);
};

const ratingWeight = (rating: string | null | undefined) => {
  if (rating === "love") return 1;
  if (rating === "ok") return 0.25;
  if (rating === "not_for_me") return -0.8;
  return 0;
};

const timestampFor = (row: MatchrimTrainingRow) => {
  const raw = row.updated_at || row.created_at;
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const sensorySignature = (sensory: Record<string, unknown>) => attributes
  .map(([, sensoryKey]) => normalizeSensoryValue(sensory[sensoryKey]))
  .join(":");

export const calculateEdgeLearnedProfileAudit = (
  baseProfile: MatchrimLearningProfile,
  rows: MatchrimTrainingRow[],
): MatchrimEdgeLearningAudit => {
  const validRows = rows.filter((row) => {
    const sensory = row.sensory_attributes;
    return Boolean(
      ratingWeight(row.rating)
      && sensory
      && attributes.every(([, sensoryKey]) => normalizeSensoryValue(sensory[sensoryKey]) !== null),
    );
  });
  const timestamps = validRows.map(timestampFor).filter((value): value is number => value !== null);
  const newestTimestamp = timestamps.length ? Math.max(...timestamps) : null;
  const deltas: MatchrimLearningProfile = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  const absoluteDeltas: MatchrimLearningProfile = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  const signatures = new Set<string>();
  let totalWeight = 0;

  validRows.forEach((row) => {
    const timestamp = timestampFor(row);
    const ageDays = timestamp !== null && newestTimestamp !== null
      ? Math.max(0, (newestTimestamp - timestamp) / 86_400_000)
      : 0;
    const recencyWeight = timestamp === null ? 1 : 0.2 + 0.8 * Math.pow(0.5, ageDays / 120);
    const weight = ratingWeight(row.rating) * recencyWeight;
    signatures.add(sensorySignature(row.sensory_attributes!));
    attributes.forEach(([profileKey, sensoryKey]) => {
      const sensoryValue = normalizeSensoryValue(row.sensory_attributes?.[sensoryKey]);
      if (sensoryValue !== null) {
        const contribution = (sensoryValue - baseProfile[profileKey]) * weight;
        deltas[profileKey] += contribution;
        absoluteDeltas[profileKey] += Math.abs(contribution);
      }
    });
    totalWeight += Math.abs(weight);
  });

  if (!validRows.length || totalWeight === 0) {
    return { profile: baseProfile, confidence: 0, samples: 0 };
  }
  const totalAbsoluteDelta = Object.values(absoluteDeltas).reduce((sum, value) => sum + value, 0);
  const consistencyRatio = totalAbsoluteDelta > 0
    ? attributes.reduce((sum, [profileKey]) => sum + Math.abs(deltas[profileKey]), 0) / totalAbsoluteDelta
    : 1;
  const diversityRatio = Math.min(1, signatures.size / Math.min(validRows.length, 6));
  const sampleCoverage = Math.min(1, validRows.length / 12);
  const confidence = Math.round(
    sampleCoverage
      * (0.55 + 0.45 * consistencyRatio)
      * (0.65 + 0.35 * diversityRatio)
      * 100,
  );
  const blend = Math.min(0.9, 0.25 + validRows.length * 0.05);
  const result = { ...baseProfile };
  attributes.forEach(([profileKey]) => {
    result[profileKey] = clamp(
      Math.round((baseProfile[profileKey] + (deltas[profileKey] / totalWeight) * blend) * 10) / 10,
    );
  });
  return { profile: result, confidence, samples: validRows.length };
};

export const calculateEdgeLearnedProfile = (
  baseProfile: MatchrimLearningProfile,
  rows: MatchrimTrainingRow[],
) => calculateEdgeLearnedProfileAudit(baseProfile, rows).profile;
