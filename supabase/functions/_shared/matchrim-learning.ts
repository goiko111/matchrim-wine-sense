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

const attributes = [
  ["potente", "potencia"],
  ["acidez", "acidez"],
  ["dulce", "dulzura"],
  ["tanico", "taninos"],
  ["afrutado", "afrutado"],
] as const;

const clamp = (value: number, min = 0, max = 5) => Math.max(min, Math.min(max, value));

const normalizeSensoryValue = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
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

export const calculateEdgeLearnedProfile = (
  baseProfile: MatchrimLearningProfile,
  rows: MatchrimTrainingRow[],
): MatchrimLearningProfile => {
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
  let totalWeight = 0;

  validRows.forEach((row) => {
    const timestamp = timestampFor(row);
    const ageDays = timestamp !== null && newestTimestamp !== null
      ? Math.max(0, (newestTimestamp - timestamp) / 86_400_000)
      : 0;
    const recencyWeight = timestamp === null ? 1 : 0.2 + 0.8 * Math.pow(0.5, ageDays / 120);
    const weight = ratingWeight(row.rating) * recencyWeight;
    attributes.forEach(([profileKey, sensoryKey]) => {
      const sensoryValue = normalizeSensoryValue(row.sensory_attributes?.[sensoryKey]);
      if (sensoryValue !== null) deltas[profileKey] += (sensoryValue - baseProfile[profileKey]) * weight;
    });
    totalWeight += Math.abs(weight);
  });

  if (!validRows.length || totalWeight === 0) return baseProfile;
  const blend = Math.min(0.9, 0.25 + validRows.length * 0.05);
  const result = { ...baseProfile };
  attributes.forEach(([profileKey]) => {
    result[profileKey] = clamp(
      Math.round((baseProfile[profileKey] + (deltas[profileKey] / totalWeight) * blend) * 10) / 10,
    );
  });
  return result;
};
