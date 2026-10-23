export const MATCHRIM_PROFILE95_VERSION = 'matchrim-profile95-strict-0to5-v1';
export const MATCHRIM_PROFILE95_TRAINING_COLUMNS = 'id, name, producer, vintage, region, country, place_details, rating, sensory_attributes, use_for_profile_training, created_at, updated_at';
export const NATIVE_MATCHRIM_LEARNING_MODEL = 'native-evidence-strength-v2' as const;
export type MatchrimLearningOptions96 = { evidenceStrength?: 'legacy-v1' | 'native-v2' };
// Model selection is not identity or authorization; unknown tags retain legacy.
export const readMatchrimLearningOptions96 = (model: unknown): MatchrimLearningOptions96 => ({
  evidenceStrength: model === NATIVE_MATCHRIM_LEARNING_MODEL ? 'native-v2' : 'legacy-v1',
});

export type MatchrimProfile95 = { potente: number; acidez: number; dulce: number; tanico: number; afrutado: number };
export type MatchrimLearnedProfile95 = { profile: MatchrimProfile95 | null; samples: number; confidence: number };
type Record95 = Record<string, unknown>;
type Training95 = { rating: 'love' | 'ok' | 'not_for_me'; attributes: MatchrimProfile95; timestamp: number | null; binding: string };

const axes = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const record = (value: unknown): Record95 | null => value !== null && typeof value === 'object' && !Array.isArray(value)
  ? value as Record95 : null;
const exact = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
const clamp = (value: number) => Math.max(0, Math.min(5, value));
const normalize = (value: unknown): string | null => value == null ? '' : typeof value === 'string'
  ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim() : null;
const ratingTimestamp = (value: unknown): number | null => {
  const raw = record(record(value)?.place_details)?.matchrim_rating_at;
  return typeof raw === 'string' && Number.isFinite(Date.parse(raw)) ? Date.parse(raw) : null;
};

export const readMatchrimProfile95 = (value: unknown): MatchrimProfile95 | null => {
  const input = record(value);
  if (!input || !axes.every(key => exact(input[key]))) return null;
  return { potente: input.potente as number, acidez: input.acidez as number, dulce: input.dulce as number,
    tanico: input.tanico as number, afrutado: input.afrutado as number };
};

const readTraining = (value: unknown, native = false): Training95 | null => {
  const wine = record(value);
  if (!wine || typeof wine.name !== 'string' || wine.use_for_profile_training !== true
    || (wine.rating !== 'love' && wine.rating !== 'ok' && wine.rating !== 'not_for_me')) return null;
  const sensory = record(wine.sensory_attributes), details = record(wine.place_details);
  const evidence = record(details?.bodega_sensory_evidence);
  if (!sensory || !evidence || evidence.scale !== sensory.scale || evidence.source !== 'catalog'
    || typeof evidence.canonical_id !== 'string' || !evidence.canonical_id.trim()) return null;
  if (native && evidence.canonical_id.startsWith('winerim-public-store:')) return null;
  const marked = sensory.scale === 'winerim-0-5' && evidence.version === 2;
  const legacy = sensory.scale === undefined && evidence.scale === undefined && evidence.version === 1;
  if (!marked && !legacy) return null;
  const raw = { potente: sensory.power ?? sensory.potencia,
    acidez: sensory.acidity ?? sensory.acidez, dulce: sensory.sweetness ?? sensory.dulzura ?? sensory.dulce,
    tanico: sensory.tannin ?? sensory.taninos ?? sensory.tanico, afrutado: sensory.fruity ?? sensory.afrutado };
  // v1 signatures bind the native legacy normalization, before its learner rounds.
  const normalizeLegacy = (value: unknown) => typeof value !== 'number' || !Number.isFinite(value) || value < 0 ? null
    : Math.max(1, Math.min(5, value > 10 ? value / 20 : value > 5 ? value / 2 : value));
  const attributes = marked ? readMatchrimProfile95(raw) : readMatchrimProfile95(
    Object.fromEntries(axes.map(key => [key, normalizeLegacy(raw[key])])),
  );
  if (!attributes) return null;
  const identity = [normalize(wine.name), normalize(wine.producer), wine.vintage ?? null,
    normalize(wine.region), normalize(wine.country)];
  if ([identity[0], identity[1], identity[3], identity[4]].some(part => part === null)
    || (wine.vintage != null && (typeof wine.vintage !== 'number' || !Number.isInteger(wine.vintage)))) return null;
  const attributeSignature = JSON.stringify(marked ? [sensory.scale, ...axes.map(key => attributes[key])]
    : axes.map(key => attributes[key]));
  if (evidence.identity_signature !== JSON.stringify(identity) || evidence.attribute_signature !== attributeSignature) return null;
  const binding = JSON.stringify([identity, marked ? 2 : 1, attributeSignature]);
  if (legacy) for (const key of axes) attributes[key] = Math.max(1, Math.round(attributes[key]));
  return { rating: wine.rating, attributes, timestamp: ratingTimestamp(wine), binding };
};

// v2 is exact 0..5; explicitly bound v1 keeps native compatibility, never coercion.
export const calculateLearnedMatchrimProfile95 = (base: unknown, rows: readonly unknown[], options: MatchrimLearningOptions96 = {}): MatchrimLearnedProfile95 => {
  const strengthAware = options.evidenceStrength === 'native-v2';
  const profile = readMatchrimProfile95(base);
  if (!profile) return { profile: null, samples: 0, confidence: 0 };
  type Candidate = { row: Training95 | null; timestamp: number | null; conflicting: boolean };
  const latest = new Map<string, Candidate>(), withoutId: Training95[] = [];
  for (const value of rows) {
    const row = readTraining(value, strengthAware);
    const id = record(value)?.id;
    if (typeof id !== 'string' || !id) { if (row) withoutId.push(row); continue; }
    const candidate: Candidate = { row, timestamp: ratingTimestamp(value), conflicting: false };
    const previous = latest.get(id);
    const timestamp = candidate.timestamp ?? -Infinity, previousTimestamp = previous?.timestamp ?? -Infinity;
    if (previous && timestamp === previousTimestamp && (previous.conflicting || !row || !previous.row
      || row.rating !== previous.row.rating || row.binding !== previous.row.binding)) {
      latest.set(id, { ...candidate, conflicting: true });
      continue;
    }
    if (!previous || timestamp >= previousTimestamp) latest.set(id, candidate);
  }
  const valid = [...withoutId, ...[...latest.values()].flatMap(candidate => !candidate.conflicting && candidate.row ? [candidate.row] : [])];
  const samples = valid.length;
  if (!samples) return { profile, samples: 0, confidence: 0 };
  const dates = valid.map(row => row.timestamp).filter((date): date is number => date !== null);
  const newest = dates.length ? Math.max(...dates) : null;
  const deltas = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  const absolute = { ...deltas };
  const signatures = new Set<string>();
  let totalWeight = 0;
  for (const row of valid) {
    const weight = row.rating === 'love' ? 1 : row.rating === 'ok' ? 0.25 : -0.8;
    const age = row.timestamp !== null && newest !== null ? Math.max(0, (newest - row.timestamp) / 86_400_000) : 0;
    const effectiveWeight = weight * (row.timestamp === null ? 1 : 0.2 + 0.8 * Math.pow(0.5, age / 120));
    signatures.add(axes.map(key => row.attributes[key]).join(':'));
    for (const key of axes) {
      const contribution = (row.attributes[key] - profile[key]) * effectiveWeight;
      deltas[key] += contribution; absolute[key] += Math.abs(contribution);
    }
    totalWeight += Math.abs(effectiveWeight);
  }
  const totalAbsolute = axes.reduce((sum, key) => sum + absolute[key], 0);
  const consistency = totalAbsolute > 0 ? axes.reduce((sum, key) => sum + Math.abs(deltas[key]), 0) / totalAbsolute : 1;
  const confidence = Math.round(Math.min(1, (strengthAware ? totalWeight : samples) / 12) * (0.55 + 0.45 * consistency)
    * (0.65 + 0.35 * Math.min(1, signatures.size / Math.min(samples, 6))) * 100);
  const blend = Math.min(0.9, 0.25 + samples * 0.05);
  const evidenceDenominator = strengthAware ? samples : totalWeight;
  for (const key of axes) profile[key] = clamp(Math.round((profile[key] + deltas[key] / evidenceDenominator * blend) * 10) / 10);
  return { profile, samples, confidence };
};
