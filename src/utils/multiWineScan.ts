export type ScanRegionStatus =
  | 'pending'
  | 'analyzing'
  | 'recognized'
  | 'uncertain'
  | 'unrecognized'
  | 'discarded';

export interface NormalizedBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RegionQuality {
  glare: 'low' | 'medium' | 'high';
  occlusion: 'low' | 'medium' | 'high';
  legibility: 'good' | 'limited' | 'poor';
}

export type RegionRecognitionFallbackCode =
  | 'insufficient_visible_text'
  | 'ungrounded_identity'
  | 'unknown';

export interface RegionRecognitionFallback {
  code: RegionRecognitionFallbackCode;
  message: string;
  suggestedActions: string[];
}

export interface WineCandidate {
  id: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  region: string | null;
  country: string | null;
  grapes: string[];
  alcohol: number | null;
  confidence: number;
  source: 'label' | 'catalog' | 'inference' | 'manual';
  evidence: string[];
  uncertaintyReasons: string[];
  inferredFields: string[];
  sensoryAttributes?: {
    potencia?: number | null;
    acidez?: number | null;
    dulzura?: number | null;
    taninos?: number | null;
    afrutado?: number | null;
    madera?: number | null;
    intensidad?: number | null;
  } | null;
  affinity?: number | null;
  affinityConfidence?: number | null;
  affinityReason?: string | null;
}

export interface ScanRegion {
  id: string;
  index: number;
  box: NormalizedBox;
  detectionConfidence: number;
  quality: RegionQuality;
  status: ScanRegionStatus;
  candidates: WineCandidate[];
  selectedCandidateId: string | null;
  duplicateCount: number;
  cropDataUrl?: string | null;
  error?: string | null;
  fallback?: RegionRecognitionFallback | null;
}

export type ScanCoverageStatus = 'reported_complete' | 'partial' | 'unknown';

export interface ScanCoverage {
  status: ScanCoverageStatus;
  detectedObjects: number;
  estimatedVisibleObjects: number | null;
  confidence: number | null;
  notes: string[];
}

type RawRecord = Record<string, unknown>;

const asRecord = (value: unknown): RawRecord | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as RawRecord : null
);

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const normalizeConfidence = (value: unknown, fallback = 0): number => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
};

export const normalizeBox = (value: unknown): NormalizedBox | null => {
  const raw = asRecord(value);
  if (!raw) return null;

  const x = Number(raw.x ?? raw.left);
  const y = Number(raw.y ?? raw.top);
  const width = Number(raw.width ?? raw.w);
  const height = Number(raw.height ?? raw.h);
  if (![x, y, width, height].every(Number.isFinite)) return null;

  const normalized = {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    width: clamp(width, 0, 100),
    height: clamp(height, 0, 100),
  };

  normalized.width = Math.min(normalized.width, 100 - normalized.x);
  normalized.height = Math.min(normalized.height, 100 - normalized.y);
  if (normalized.width < 2 || normalized.height < 2) return null;
  return normalized;
};

export const intersectionOverUnion = (a: NormalizedBox, b: NormalizedBox) => {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  if (intersection === 0) return 0;
  const union = a.width * a.height + b.width * b.height - intersection;
  return union > 0 ? intersection / union : 0;
};

const normalizeQualityLevel = (
  value: unknown,
  allowed: readonly string[],
  fallback: string,
) => {
  const normalized = typeof value === 'string' ? value.toLowerCase().trim() : '';
  return allowed.includes(normalized) ? normalized : fallback;
};

export const normalizeDetectedRegions = (payload: unknown): ScanRegion[] => {
  const root = asRecord(payload);
  const rawRegions = Array.isArray(root?.regions)
    ? root.regions
    : Array.isArray(root?.objects)
      ? root.objects
      : [];

  const normalized = rawRegions.flatMap((value, sourceIndex) => {
    const raw = asRecord(value);
    const box = normalizeBox(raw?.box ?? raw?.bbox ?? raw?.bounding_box ?? raw);
    if (!raw || !box) return [];

    const qualityRaw = asRecord(raw.quality) ?? {};
    const quality: RegionQuality = {
      glare: normalizeQualityLevel(qualityRaw.glare, ['low', 'medium', 'high'], 'medium') as RegionQuality['glare'],
      occlusion: normalizeQualityLevel(qualityRaw.occlusion, ['low', 'medium', 'high'], 'medium') as RegionQuality['occlusion'],
      legibility: normalizeQualityLevel(qualityRaw.legibility, ['good', 'limited', 'poor'], 'limited') as RegionQuality['legibility'],
    };

    return [{
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `region-${sourceIndex + 1}`,
      index: sourceIndex + 1,
      box,
      detectionConfidence: normalizeConfidence(raw.confidence ?? raw.detection_confidence, 0.5),
      quality,
      status: 'pending' as const,
      candidates: [],
      selectedCandidateId: null,
      duplicateCount: 1,
      error: null,
    }];
  });

  const deduplicated: ScanRegion[] = [];
  [...normalized]
    .sort((a, b) => b.detectionConfidence - a.detectionConfidence)
    .forEach((region) => {
      const duplicate = deduplicated.some((kept) => intersectionOverUnion(kept.box, region.box) >= 0.72);
      if (!duplicate) deduplicated.push(region);
    });

  return deduplicated
    .sort((a, b) => (a.box.y - b.box.y) || (a.box.x - b.box.x))
    .map((region, index) => ({ ...region, index: index + 1, id: `region-${index + 1}` }));
};

export const normalizeScanCoverage = (
  payload: unknown,
  detectedObjects: number,
): ScanCoverage => {
  const root = asRecord(payload);
  const rawCoverage = asRecord(root?.coverage);
  const rawStatus = typeof rawCoverage?.status === 'string'
    ? rawCoverage.status.toLowerCase().trim()
    : '';
  const status: ScanCoverageStatus = rawStatus === 'reported_complete'
    ? 'reported_complete'
    : rawStatus === 'partial'
      ? 'partial'
      : 'unknown';
  const estimated = Number(rawCoverage?.estimated_visible_objects);
  const confidenceValue = Number(rawCoverage?.confidence);
  const rootNotes = stringArray(root?.notes);
  const coverageNotes = stringArray(rawCoverage?.notes);

  return {
    status,
    detectedObjects,
    estimatedVisibleObjects: Number.isFinite(estimated) && estimated >= detectedObjects
      ? Math.round(estimated)
      : null,
    confidence: Number.isFinite(confidenceValue)
      ? normalizeConfidence(confidenceValue)
      : null,
    notes: Array.from(new Set([...coverageNotes, ...rootNotes])).slice(0, 5),
  };
};

const textValue = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null;
const numericValue = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const stringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
  : [];

export const normalizeRecognitionFallback = (payload: unknown): RegionRecognitionFallback | null => {
  const root = asRecord(payload);
  const raw = asRecord(root?.fallback);
  if (!raw) return null;
  const rawCode = textValue(raw.code);
  const code: RegionRecognitionFallbackCode = rawCode === 'insufficient_visible_text' || rawCode === 'ungrounded_identity'
    ? rawCode
    : 'unknown';
  const defaultMessage = code === 'insufficient_visible_text'
    ? 'No hay texto legible suficiente para identificar este vino.'
    : 'No hay evidencia visible suficiente para confirmar una identidad.';

  return {
    code,
    message: textValue(raw.message) ?? defaultMessage,
    suggestedActions: stringArray(raw.suggested_actions ?? raw.suggestedActions).slice(0, 4),
  };
};

export const normalizeWineCandidates = (payload: unknown, regionId: string): WineCandidate[] => {
  const root = asRecord(payload);
  const rawCandidates = Array.isArray(root?.candidates)
    ? root.candidates
    : asRecord(root?.wine)
      ? [root?.wine]
      : [];

  return rawCandidates.slice(0, 3).flatMap((value, index) => {
    const raw = asRecord(value);
    const name = textValue(raw?.name ?? raw?.nombre);
    if (!raw || !name || name.toLowerCase() === 'sin nombre') return [];
    const sensory = asRecord(raw.sensory_attributes ?? raw.atributos);

    return [{
      id: `${regionId}-candidate-${index + 1}`,
      name,
      producer: textValue(raw.producer ?? raw.productor),
      vintage: numericValue(raw.vintage ?? raw.anada),
      region: textValue(raw.region),
      country: textValue(raw.country ?? raw.pais),
      grapes: stringArray(raw.grapes ?? raw.uvas),
      alcohol: numericValue(raw.alcohol),
      confidence: normalizeConfidence(raw.confidence ?? raw.confianza, index === 0 ? 0.55 : 0.35),
      source: raw.source === 'catalog' ? 'catalog' : raw.source === 'manual' ? 'manual' : raw.source === 'inference' ? 'inference' : 'label',
      evidence: stringArray(raw.evidence ?? raw.evidencias),
      uncertaintyReasons: stringArray(raw.uncertainty_reasons ?? raw.motivos_duda),
      inferredFields: stringArray(raw.inferred_fields ?? raw.campos_inferidos),
      sensoryAttributes: sensory ? {
        potencia: numericValue(sensory.potencia ?? sensory.power),
        acidez: numericValue(sensory.acidez ?? sensory.acidity),
        dulzura: numericValue(sensory.dulzura ?? sensory.sweetness),
        taninos: numericValue(sensory.taninos ?? sensory.tannin),
        afrutado: numericValue(sensory.afrutado ?? sensory.fruity),
        madera: numericValue(sensory.madera ?? sensory.wood),
        intensidad: numericValue(sensory.intensidad ?? sensory.intensity),
      } : null,
      affinity: numericValue(raw.affinity ?? raw.matchrim_affinity),
      affinityConfidence: numericValue(raw.affinity_confidence),
      affinityReason: textValue(raw.affinity_reason ?? raw.reason ?? raw.razon),
    } satisfies WineCandidate];
  });
};

export const getSelectedCandidate = (region: ScanRegion) => (
  region.candidates.find((candidate) => candidate.id === region.selectedCandidateId) ?? region.candidates[0] ?? null
);

const normalizeIdentity = (value: string | null | undefined) => (value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

export const buildCanonicalWineKey = (candidate: WineCandidate) => [
  normalizeIdentity(candidate.name),
  normalizeIdentity(candidate.producer),
  candidate.vintage ?? 'nv',
].join('|');

export interface DuplicateWineGroup {
  key: string;
  regionIds: string[];
  count: number;
  candidate: WineCandidate;
}

export const groupDuplicateWines = (regions: ScanRegion[]): DuplicateWineGroup[] => {
  const groups = new Map<string, DuplicateWineGroup>();
  regions.forEach((region) => {
    if (region.status === 'discarded' || region.status === 'unrecognized') return;
    const candidate = getSelectedCandidate(region);
    if (!candidate) return;
    const canGroup = region.status === 'recognized'
      && candidate.confidence >= 0.72
      && candidate.uncertaintyReasons.length === 0;
    const canonicalKey = buildCanonicalWineKey(candidate);
    const key = canGroup ? canonicalKey : `${canonicalKey}|region:${region.id}`;
    const current = groups.get(key);
    if (current) {
      current.regionIds.push(region.id);
      current.count += 1;
      if (candidate.confidence > current.candidate.confidence) current.candidate = candidate;
    } else {
      groups.set(key, { key, regionIds: [region.id], count: 1, candidate });
    }
  });
  return Array.from(groups.values()).sort((a, b) => {
    const affinityDelta = (b.candidate.affinity ?? -1) - (a.candidate.affinity ?? -1);
    return affinityDelta || b.candidate.confidence - a.candidate.confidence;
  });
};

export const summarizeScanRegions = (regions: ScanRegion[]) => ({
  recognized: regions.filter((region) => region.status === 'recognized').length,
  uncertain: regions.filter((region) => region.status === 'uncertain').length,
  unrecognized: regions.filter((region) => region.status === 'unrecognized').length,
  discarded: regions.filter((region) => region.status === 'discarded').length,
  pending: regions.filter((region) => region.status === 'pending' || region.status === 'analyzing').length,
});

export const determineRegionStatus = (candidates: WineCandidate[]): ScanRegionStatus => {
  const best = candidates[0];
  if (!best || best.confidence < 0.35) return 'unrecognized';
  if (best.confidence < 0.72 || best.uncertaintyReasons.length > 0) return 'uncertain';
  return 'recognized';
};

export const mapWithConcurrency = async <Input, Output>(
  inputs: Input[],
  concurrency: number,
  mapper: (input: Input, index: number) => Promise<Output>,
): Promise<Output[]> => {
  const results = new Array<Output>(inputs.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < inputs.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(inputs[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), inputs.length) }, worker));
  return results;
};
