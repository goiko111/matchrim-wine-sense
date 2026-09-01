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
  objectType: 'bottle' | 'label' | null;
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

export const intersectionOverSmallerArea = (a: NormalizedBox, b: NormalizedBox) => {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const smallerArea = Math.min(a.width * a.height, b.width * b.height);
  return smallerArea > 0 ? intersection / smallerArea : 0;
};

const overlapRatio = (startA: number, sizeA: number, startB: number, sizeB: number) => {
  const overlap = Math.max(0, Math.min(startA + sizeA, startB + sizeB) - Math.max(startA, startB));
  return overlap / Math.min(sizeA, sizeB);
};

const isEdgeSliver = (box: NormalizedBox) => (
  Math.min(box.width, box.height) <= 2.25
  && (box.x + box.width >= 99.5 || box.y + box.height >= 99.5)
);

export const areLikelySamePhysicalDetection = (left: NormalizedBox, right: NormalizedBox) => {
  if (intersectionOverUnion(left, right) >= 0.72) return true;

  const leftArea = left.width * left.height;
  const rightArea = right.width * right.height;
  const areaRatio = Math.max(leftArea, rightArea) / Math.min(leftArea, rightArea);
  if (areaRatio >= 1.3 && intersectionOverSmallerArea(left, right) >= 0.84) return true;
  if (areaRatio >= 4 && intersectionOverSmallerArea(left, right) >= 0.6) return true;

  const horizontalOverlap = overlapRatio(left.x, left.width, right.x, right.width);
  const verticalOverlap = overlapRatio(left.y, left.height, right.y, right.height);
  const horizontalCenterDistance = Math.abs(
    left.x + left.width / 2 - (right.x + right.width / 2),
  );
  const narrowWidth = Math.min(left.width, right.width);

  // Models sometimes split a neck, label or shelf tag from the taller bottle box.
  if (areaRatio >= 1.8
    && horizontalOverlap >= 0.7
    && verticalOverlap >= 0.25
    && horizontalCenterDistance <= Math.max(3, narrowWidth * 0.4)) return true;

  return areaRatio >= 2.2
    && horizontalOverlap >= 0.5
    && verticalOverlap > 0
    && verticalOverlap < 0.25
    && horizontalCenterDistance <= Math.max(3, narrowWidth * 0.55);
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
    if (!raw || !box || isEdgeSliver(box)) return [];

    const qualityRaw = asRecord(raw.quality) ?? {};
    const quality: RegionQuality = {
      glare: normalizeQualityLevel(qualityRaw.glare, ['low', 'medium', 'high'], 'medium') as RegionQuality['glare'],
      occlusion: normalizeQualityLevel(qualityRaw.occlusion, ['low', 'medium', 'high'], 'medium') as RegionQuality['occlusion'],
      legibility: normalizeQualityLevel(qualityRaw.legibility, ['good', 'limited', 'poor'], 'limited') as RegionQuality['legibility'],
    };

    return [{
      id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `region-${sourceIndex + 1}`,
      index: sourceIndex + 1,
      objectType: raw.object_type === 'label' ? 'label' : raw.object_type === 'bottle' ? 'bottle' : null,
      box,
      detectionConfidence: normalizeConfidence(raw.confidence ?? raw.detection_confidence, 0.5),
      quality,
      status: 'pending' as const,
      candidates: [],
      selectedCandidateId: null,
      duplicateCount: 1,
      error: null,
    } satisfies ScanRegion];
  });

  const deduplicated: ScanRegion[] = [];
  [...normalized]
    .sort((a, b) => b.detectionConfidence - a.detectionConfidence)
    .forEach((region) => {
      const duplicateIndex = deduplicated.findIndex((kept) => areLikelySamePhysicalDetection(kept.box, region.box));
      if (duplicateIndex === -1) {
        deduplicated.push(region);
        return;
      }

      const kept = deduplicated[duplicateIndex];
      const keptArea = kept.box.width * kept.box.height;
      const regionArea = region.box.width * region.box.height;
      const keptLegibility = legibilityPriority[kept.quality.legibility];
      const regionLegibility = legibilityPriority[region.quality.legibility];
      if (
        region.detectionConfidence > kept.detectionConfidence
        || (region.detectionConfidence === kept.detectionConfidence && regionLegibility > keptLegibility)
        || (
          region.detectionConfidence === kept.detectionConfidence
          && regionLegibility === keptLegibility
          && regionArea > keptArea
        )
      ) {
        deduplicated[duplicateIndex] = region;
      }
    });

  return deduplicated
    .sort((a, b) => (a.box.y - b.box.y) || (a.box.x - b.box.x))
    .map((region, index) => ({ ...region, index: index + 1, id: `region-${index + 1}` }));
};

export interface WineDetectionTile {
  id: 'full' | 'left' | 'right' | 'top' | 'bottom';
  box: NormalizedBox;
}

export interface WineDetectionTileResult {
  tile: WineDetectionTile;
  payload: unknown;
}

export interface ResolvedWineDetection {
  regions: ScanRegion[];
  coverage: ScanCoverage;
  refined: boolean;
}

const fullDetectionTile: WineDetectionTile = {
  id: 'full',
  box: { x: 0, y: 0, width: 100, height: 100 },
};

export const getFullWineDetectionTile = (): WineDetectionTile => ({
  ...fullDetectionTile,
  box: { ...fullDetectionTile.box },
});

export const buildWineDetectionTiles = (width: number, height: number): WineDetectionTile[] => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [getFullWineDetectionTile()];
  }
  return width >= height
    ? [
        { id: 'left', box: { x: 0, y: 0, width: 56, height: 100 } },
        { id: 'right', box: { x: 44, y: 0, width: 56, height: 100 } },
      ]
    : [
        { id: 'top', box: { x: 0, y: 0, width: 100, height: 56 } },
        { id: 'bottom', box: { x: 0, y: 44, width: 100, height: 56 } },
      ];
};

export const mapDetectedRegionFromTile = (
  region: ScanRegion,
  tile: WineDetectionTile,
): ScanRegion => ({
  ...region,
  box: {
    x: tile.box.x + region.box.x * tile.box.width / 100,
    y: tile.box.y + region.box.y * tile.box.height / 100,
    width: region.box.width * tile.box.width / 100,
    height: region.box.height * tile.box.height / 100,
  },
});

export const shouldRefineWineDetection = (payload: unknown, regions: ScanRegion[]) => {
  const coverage = normalizeScanCoverage(payload, regions.length);
  if (coverage.status === 'partial') return true;
  if (
    coverage.estimatedVisibleObjects !== null
    && coverage.estimatedVisibleObjects > regions.length + 1
  ) return true;

  const root = asRecord(payload);
  const rawRegions = Array.isArray(root?.regions)
    ? root.regions
    : Array.isArray(root?.objects)
      ? root.objects
      : [];
  const rawBoxes = rawRegions.flatMap((value) => {
    const raw = asRecord(value);
    const box = normalizeBox(raw?.box ?? raw?.bbox ?? raw?.bounding_box ?? raw);
    return box ? [box] : [];
  });
  const shortFragments = rawBoxes.filter((box) => box.height <= 25 && box.width <= 25);
  const tallRegions = rawBoxes.filter((box) => box.height >= 45);

  return rawBoxes.length >= regions.length + 2
    || (shortFragments.length >= 2 && tallRegions.length >= 1)
    || rawBoxes.some(isEdgeSliver);
};

export const mergeWineDetectionTileResults = (
  results: WineDetectionTileResult[],
): ResolvedWineDetection => {
  const mapped = results.flatMap(({ tile, payload }) => (
    normalizeDetectedRegions(payload).map((region) => mapDetectedRegionFromTile(region, tile))
  ));
  const regions = normalizeDetectedRegions({
    regions: mapped.map((region) => ({
      object_type: region.objectType,
      box: region.box,
      confidence: region.detectionConfidence,
      quality: region.quality,
    })),
  }).slice(0, 30);
  const tileCoverage = results.map(({ payload }) => normalizeScanCoverage(payload, normalizeDetectedRegions(payload).length));
  const statuses = tileCoverage.map((item) => item.status);
  const status: ScanCoverageStatus = statuses.every((item) => item === 'reported_complete')
    ? 'reported_complete'
    : statuses.includes('partial')
      ? 'partial'
      : 'unknown';
  const estimates = tileCoverage.flatMap((item) => item.estimatedVisibleObjects === null ? [] : [item.estimatedVisibleObjects]);
  const notes = Array.from(new Set([
    'Deteccion refinada por zonas solapadas para reducir objetos mezclados.',
    ...tileCoverage.flatMap((item) => item.notes),
  ])).slice(0, 5);

  return {
    regions,
    coverage: {
      status,
      detectedObjects: regions.length,
      estimatedVisibleObjects: status === 'reported_complete'
        ? regions.length
        : estimates.length
          ? Math.max(regions.length, ...estimates)
          : null,
      confidence: tileCoverage.every((item) => item.confidence !== null)
        ? Math.min(...tileCoverage.map((item) => item.confidence as number))
        : null,
      notes,
    },
    refined: true,
  };
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

const identityTokens = (value: string | null | undefined) => new Set(normalizeIdentity(value).split(' ').filter(Boolean));
const producerStopWords = new Set(['bodega', 'bodegas', 'winery', 'wine', 'wines', 'sa']);

export const areLikelyDuplicateWines = (left: WineCandidate, right: WineCandidate) => {
  if (left.vintage && right.vintage && left.vintage !== right.vintage) return false;
  const leftName = identityTokens(left.name);
  const rightName = identityTokens(right.name);
  const leftProducer = new Set([...identityTokens(left.producer)].filter((token) => !producerStopWords.has(token)));
  const rightProducer = new Set([...identityTokens(right.producer)].filter((token) => !producerStopWords.has(token)));
  const sharedProducer = [...leftProducer].filter((token) => rightProducer.has(token));
  if (leftProducer.size && rightProducer.size && sharedProducer.length < Math.min(leftProducer.size, rightProducer.size)) {
    return false;
  }
  if ([...leftName].every((token) => rightName.has(token)) && leftName.size === rightName.size) return true;

  const sharedName = [...leftName].filter((token) => rightName.has(token));
  if (sharedName.length < Math.min(leftName.size, rightName.size)) return false;
  const producerTokens = new Set([...leftProducer, ...rightProducer]);
  const extraTokens = [...new Set([...leftName, ...rightName])]
    .filter((token) => !leftName.has(token) || !rightName.has(token));
  return extraTokens.length > 0 && extraTokens.every((token) => /^\d{4}$/.test(token) || producerTokens.has(token));
};

export interface DuplicateWineGroup {
  key: string;
  regionIds: string[];
  count: number;
  candidate: WineCandidate;
}

export const groupDuplicateWines = (regions: ScanRegion[]): DuplicateWineGroup[] => {
  const groups: DuplicateWineGroup[] = [];
  regions.forEach((region) => {
    if (region.status === 'discarded' || region.status === 'unrecognized') return;
    const candidate = getSelectedCandidate(region);
    if (!candidate) return;
    const canGroup = region.status === 'recognized'
      && candidate.confidence >= 0.72
      && candidate.uncertaintyReasons.length === 0;
    const canonicalKey = buildCanonicalWineKey(candidate);
    const current = canGroup ? groups.find((group) => areLikelyDuplicateWines(group.candidate, candidate)) : null;
    if (current) {
      current.regionIds.push(region.id);
      current.count += 1;
      if (candidate.confidence > current.candidate.confidence) current.candidate = candidate;
    } else {
      groups.push({
        key: canGroup ? canonicalKey : `${canonicalKey}|region:${region.id}`,
        regionIds: [region.id],
        count: 1,
        candidate,
      });
    }
  });
  return groups.sort((a, b) => {
    const affinityDelta = (b.candidate.affinity ?? -1) - (a.candidate.affinity ?? -1);
    return affinityDelta || b.candidate.confidence - a.candidate.confidence;
  });
};

export const getConfirmableWineGroups = (regions: ScanRegion[]) => (
  groupDuplicateWines(regions.filter((region) => region.status === 'recognized'))
);

export const confirmWineCandidateIdentity = (candidate: WineCandidate): WineCandidate => ({
  ...candidate,
  confidence: 1,
  evidence: Array.from(new Set([...candidate.evidence, 'Identidad confirmada manualmente por el usuario'])),
  uncertaintyReasons: [],
});

export const correctWineCandidateIdentity = (
  candidate: WineCandidate,
  patch: Pick<Partial<WineCandidate>, 'name' | 'producer'>,
): WineCandidate => ({
  ...candidate,
  ...patch,
  vintage: null,
  region: null,
  country: null,
  grapes: [],
  alcohol: null,
  confidence: 1,
  source: 'manual',
  evidence: ['Identidad corregida manualmente por el usuario'],
  uncertaintyReasons: [],
  inferredFields: [],
  sensoryAttributes: null,
  affinity: null,
  affinityConfidence: null,
  affinityReason: null,
});

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

export interface NetworkConcurrencyHints {
  effectiveType?: string | null;
  saveData?: boolean;
}

export const getRegionAnalysisConcurrency = (
  regionCount: number,
  network: NetworkConcurrencyHints | null = null,
) => {
  if (regionCount <= 1) return Math.max(0, regionCount);
  let concurrency = regionCount >= 20 ? 5 : regionCount >= 8 ? 4 : 3;
  const effectiveType = network?.effectiveType?.toLowerCase();
  if (network?.saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
    concurrency = Math.min(concurrency, 2);
  } else if (effectiveType === '3g') {
    concurrency = Math.min(concurrency, 3);
  }
  return Math.min(regionCount, concurrency);
};

const legibilityPriority: Record<RegionQuality['legibility'], number> = {
  good: 3,
  limited: 2,
  poor: 1,
};

export const prioritizeRegionsForAnalysis = (regions: ScanRegion[]) => [...regions].sort((left, right) => (
  legibilityPriority[right.quality.legibility] - legibilityPriority[left.quality.legibility]
  || right.detectionConfidence - left.detectionConfidence
  || left.index - right.index
));
