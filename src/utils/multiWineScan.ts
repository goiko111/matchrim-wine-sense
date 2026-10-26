import { optionalScanNumber } from '../../supabase/functions/_shared/matchrim-scan-values';
import { hasSpecificWineIdentity } from '../../supabase/functions/_shared/matchrim-menu-grounding';
import { isNonWineIdentity } from './wineCategory';
import { hasLabelProducerRoleConflict } from './winerimLabelIdentity';
import type { CropGeometry } from './imageCropGeometry';
import type { RegionDeferral } from './scanAnalysisPolicy';
import { hasWinerimGeographyConflict, type WinerimOriginalSheet } from './winerimOriginalSheet';

export type ScanRegionStatus =
  | 'pending'
  | 'analyzing'
  | 'recognized'
  | 'uncertain'
  | 'unrecognized'
  | 'deferred'
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
  | 'not_wine'
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
  canonicalId?: string | null;
  masterRecord?: import('./nativeMasterCatalog102').NativeMasterRecord102 | null;
  masterLink259?: import('./nativeMasterLink259').NativeMasterLink259 | null;
  globalRecord?: import('./nativeGlobalCatalogue103').GlobalWine103 | null;
  originalSheet?: WinerimOriginalSheet | null;
  sensorySource?: 'catalog' | 'inference';
  sensoryAttributes?: {
    scale?: 'winerim-0-5';
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
  deferral?: RegionDeferral | null;
  cropGeometry?: CropGeometry;
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

export const normalizeBox = (value: unknown, minimumDimension = 2): NormalizedBox | null => {
  const raw = asRecord(value);
  if (!raw) return null;

  const x = optionalScanNumber(raw.x ?? raw.left);
  const y = optionalScanNumber(raw.y ?? raw.top);
  const width = optionalScanNumber(raw.width ?? raw.w);
  const height = optionalScanNumber(raw.height ?? raw.h);
  if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) return null;

  const normalized = {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    width: clamp(x + width, 0, 100) - clamp(x, 0, 100),
    height: clamp(y + height, 0, 100) - clamp(y, 0, 100),
  };

  normalized.width = Math.min(normalized.width, 100 - normalized.x);
  normalized.height = Math.min(normalized.height, 100 - normalized.y);
  if (normalized.width <= 0 || normalized.height <= 0
    || normalized.width < minimumDimension || normalized.height < minimumDimension) return null;
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
  if (areaRatio >= 8 && intersectionOverSmallerArea(left, right) >= 0.5) return true;

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

  const verticalGap = Math.max(
    0,
    Math.max(left.y, right.y) - Math.min(left.y + left.height, right.y + right.height),
  );
  if (verticalOverlap === 0
    && verticalGap <= 6
    && Math.min(left.height, right.height) <= 30
    && Math.max(left.height, right.height) >= 45
    && areaRatio >= 1.5
    && horizontalOverlap >= 0.75
    && horizontalCenterDistance <= Math.max(4, narrowWidth * 0.2)) return true;

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
    const rawBox = raw?.box ?? raw?.bbox ?? raw?.bounding_box ?? raw;
    const clippedBottle = raw?.object_type === 'bottle' ? normalizeBox(rawBox, 0) : null;
    const touchesEdge = clippedBottle && (clippedBottle.x === 0 || clippedBottle.y === 0
      || clippedBottle.x + clippedBottle.width === 100 || clippedBottle.y + clippedBottle.height === 100);
    // Keep explicitly detected edge bottles for pixel preflight, not automatic OCR.
    const box = normalizeBox(rawBox) ?? (touchesEdge ? clippedBottle : null);
    if (!raw || !box || (isEdgeSliver(box) && raw.object_type !== 'bottle')) return [];

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

  // A scene-sized proposal containing separate bottles is a container, not an
  // individual object. Let the smaller detections survive instead of absorbing them.
  const objects = normalized.filter((container) => {
    const contained = normalized.filter((other) => other !== container
      && container.box.width * container.box.height >= 2.5 * other.box.width * other.box.height
      && intersectionOverSmallerArea(container.box, other.box) >= 0.9);
    return !contained.some((left, i) => contained.slice(i + 1).some((right) => {
      if (intersectionOverUnion(left.box, right.box) > 0.15) return false;
      const sideBySide = overlapRatio(left.box.y, left.box.height, right.box.y, right.box.height) >= 0.5
        && Math.abs(left.box.x + left.box.width / 2 - right.box.x - right.box.width / 2)
          >= (left.box.width + right.box.width) / 2 * 0.8;
      const stackedBottles = left.objectType === 'bottle' && right.objectType === 'bottle'
        && overlapRatio(left.box.x, left.box.width, right.box.x, right.box.width) >= 0.5
        && Math.abs(left.box.y + left.box.height / 2 - right.box.y - right.box.height / 2)
          >= (left.box.height + right.box.height) / 2;
      return sideBySide || stackedBottles;
    }));
  });
  const deduplicated: Array<{ region: ScanRegion; members: NormalizedBox[]; bottles: NormalizedBox[] }> = [];
  [...objects]
    .sort((a, b) => b.detectionConfidence - a.detectionConfidence)
    .forEach((region) => {
      let merged: ScanRegion = region;
      let members = [region.box];
      let bottles = region.objectType === 'bottle' ? [region.box] : [];
      const compatibleCluster = (cluster: { members: NormalizedBox[]; bottles: NormalizedBox[] }) => {
        const proposedBottles = [...bottles, ...cluster.bottles];
        // A detached label may belong to a bottle; two explicitly reported
        // bottles on separate shelves cannot be joined by alignment alone.
        if (proposedBottles.some((left, i) => proposedBottles.slice(i + 1).some((right) =>
          overlapRatio(left.y, left.height, right.y, right.height) === 0))) return false;
        const proposed = [...members, ...cluster.members];
        const anchor = proposed.reduce((largest, box) => box.width * box.height > largest.width * largest.height ? box : largest);
        return proposed.every((box) => box === anchor || areLikelySamePhysicalDetection(anchor, box));
      };
      let duplicateIndex = deduplicated.findIndex(compatibleCluster);
      while (duplicateIndex !== -1) {
        const cluster = deduplicated.splice(duplicateIndex, 1)[0];
        const kept = cluster.region;
        members = [...members, ...cluster.members];
        bottles = [...bottles, ...cluster.bottles];
        const keptArea = kept.box.width * kept.box.height;
        const mergedArea = merged.box.width * merged.box.height;
        const keptLegibility = legibilityPriority[kept.quality.legibility];
        const mergedLegibility = legibilityPriority[merged.quality.legibility];
        const preferKept = kept.detectionConfidence > merged.detectionConfidence
          || (kept.detectionConfidence === merged.detectionConfidence && keptLegibility > mergedLegibility)
          || (kept.detectionConfidence === merged.detectionConfidence
            && keptLegibility === mergedLegibility && keptArea > mergedArea);
        const x = Math.min(kept.box.x, merged.box.x);
        const y = Math.min(kept.box.y, merged.box.y);

        // Keep the full physical extent even when a partial crop has higher confidence.
        // Compatibility uses observed boxes, never an enlarged synthetic union.
        merged = {
          ...(preferKept ? kept : merged),
          objectType: kept.objectType === 'bottle' || merged.objectType === 'bottle'
            ? 'bottle' : merged.objectType ?? kept.objectType,
          box: {
            x, y,
            width: Math.max(kept.box.x + kept.box.width, merged.box.x + merged.box.width) - x,
            height: Math.max(kept.box.y + kept.box.height, merged.box.y + merged.box.height) - y,
          },
        };
        duplicateIndex = deduplicated.findIndex(compatibleCluster);
      }
      deduplicated.push({ region: merged, members, bottles });
    });

  return deduplicated
    .map(({ region }) => region)
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

export const MAX_REFINED_WINE_REGIONS = 60;

export const selectWineRegionsForBatch = (
  regions: ScanRegion[],
  limit = MAX_REFINED_WINE_REGIONS,
): ScanRegion[] => {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_REFINED_WINE_REGIONS) {
    throw new RangeError('Invalid wine-region batch limit');
  }
  if (regions.length <= limit) return regions;

  // A reading-order prefix can discard entire lower shelves. Share the same
  // bounded batch across occupied cells, preferring reliable evidence per cell.
  const gridSize = 4;
  const cells = new Map<number, ScanRegion[]>();
  for (const region of regions) {
    const column = Math.min(gridSize - 1, Math.max(0, Math.floor((region.box.x + region.box.width / 2) / 100 * gridSize)));
    const row = Math.min(gridSize - 1, Math.max(0, Math.floor((region.box.y + region.box.height / 2) / 100 * gridSize)));
    const key = row * gridSize + column;
    const cell = cells.get(key) ?? [];
    cell.push(region);
    cells.set(key, cell);
  }
  const buckets = [...cells].sort(([a], [b]) => a - b).map(([, cell]) => cell.sort((a, b) =>
    b.detectionConfidence - a.detectionConfidence
    || legibilityPriority[b.quality.legibility] - legibilityPriority[a.quality.legibility]
    || a.box.y - b.box.y || a.box.x - b.box.x || a.id.localeCompare(b.id)));
  const selected: ScanRegion[] = [];
  for (let round = 0; selected.length < limit; round++) {
    for (const bucket of buckets) {
      if (bucket[round]) selected.push(bucket[round]);
      if (selected.length === limit) break;
    }
  }
  return selected.sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
    .map((region, index) => ({ ...region, id: `region-${index + 1}`, index: index + 1 }));
};

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
  { failedTiles = 0 }: { failedTiles?: number } = {},
): ResolvedWineDetection => {
  const mapped = results.flatMap(({ tile, payload }) => (
    normalizeDetectedRegions(payload).map((region) => mapDetectedRegionFromTile(region, tile))
  ));
  const allRegions = normalizeDetectedRegions({
    regions: mapped.map((region) => ({
      object_type: region.objectType,
      box: region.box,
      confidence: region.detectionConfidence,
      quality: region.quality,
    })),
  });
  const regions = selectWineRegionsForBatch(allRegions);
  const capped = allRegions.length > regions.length;
  const tileCoverage = results.map(({ payload }) => normalizeScanCoverage(payload, normalizeDetectedRegions(payload).length));
  const statuses = tileCoverage.map((item) => item.status);
  const status: ScanCoverageStatus = capped || failedTiles > 0 ? 'partial' : statuses.length > 0 && statuses.every((item) => item === 'reported_complete')
    ? 'reported_complete'
    : statuses.includes('partial')
      ? 'partial'
      : 'unknown';
  const estimates = tileCoverage.flatMap((item) => item.estimatedVisibleObjects === null ? [] : [item.estimatedVisibleObjects]);
  const refined = results.some(({ tile }) => tile.id !== 'full');
  const notes = Array.from(new Set([
    ...(failedTiles > 0 ? [`${failedTiles} zona${failedTiles === 1 ? '' : 's'} sin analizar; se conservan los resultados disponibles. Acerca esa parte de la imagen y vuelve a escanear.`] : []),
    ...(refined ? ['Deteccion refinada por zonas solapadas para reducir objetos mezclados.'] : []),
    ...(capped ? ['Quedan objetos fuera del limite de este lote; acerca la imagen y escanea otra zona.'] : []),
    ...tileCoverage.flatMap((item) => item.notes),
  ])).slice(0, 5);

  return {
    regions,
    coverage: {
      status,
      detectedObjects: regions.length,
      estimatedVisibleObjects: failedTiles > 0 ? null : status === 'reported_complete'
        ? regions.length
        : estimates.length
          ? Math.max(allRegions.length, ...estimates)
          : capped ? allRegions.length : null,
      confidence: failedTiles === 0 && tileCoverage.every((item) => item.confidence !== null)
        ? Math.min(...tileCoverage.map((item) => item.confidence as number))
        : null,
      notes,
    },
    refined,
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
const numericValue = optionalScanNumber;

const stringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
  : [];

export const normalizeRecognitionFallback = (payload: unknown): RegionRecognitionFallback | null => {
  const root = asRecord(payload);
  const candidates = Array.isArray(root?.candidates) ? root.candidates : root?.wine ? [root.wine] : [];
  if (candidates.length && candidates.every((value) => {
    const candidate = asRecord(value);
    return candidate && isNonWineIdentity(candidate.name ?? candidate.nombre, candidate.type, candidate.tipo, candidate.category, candidate.beverage_type);
  })) return {
    code: 'not_wine',
    message: 'La referencia leida corresponde a otra bebida, no a un vino. No se calcula afinidad.',
    suggestedActions: ['Revisar el recorte si la lectura es incorrecta', 'Descartar esta region'],
  };
  const raw = asRecord(root?.fallback);
  if (!raw) return null;
  const rawCode = textValue(raw.code);
  const code: RegionRecognitionFallbackCode = rawCode === 'not_wine' || rawCode === 'insufficient_visible_text' || rawCode === 'ungrounded_identity'
    ? rawCode
    : 'unknown';
  const defaultMessage = code === 'not_wine'
    ? 'La referencia leida corresponde a otra bebida, no a un vino. No se calcula afinidad.'
    : code === 'insufficient_visible_text'
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
    if (!raw || !name || name.toLowerCase() === 'sin nombre'
      || isNonWineIdentity(name, raw.type, raw.tipo, raw.category, raw.beverage_type)) return [];
    const rawProducer = textValue(raw.producer ?? raw.productor);
    const region = textValue(raw.region);
    const country = textValue(raw.country ?? raw.pais);
    const producerRoleConflict = hasLabelProducerRoleConflict({ producer: rawProducer, region, country });
    const producer = producerRoleConflict ? null : rawProducer;
    if (!hasSpecificWineIdentity(name, producer || '')) return [];
    const sensory = asRecord(raw.sensory_attributes ?? raw.atributos);

    return [{
      id: `${regionId}-candidate-${index + 1}`,
      name,
      producer,
      vintage: numericValue(raw.vintage ?? raw.anada),
      region,
      country,
      grapes: stringArray(raw.grapes ?? raw.uvas),
      alcohol: numericValue(raw.alcohol),
      confidence: normalizeConfidence(raw.confidence ?? raw.confianza, index === 0 ? 0.55 : 0.35),
      source: raw.source === 'inference' ? 'inference' : 'label',
      evidence: stringArray(raw.evidence ?? raw.evidencias),
      uncertaintyReasons: [...stringArray(raw.uncertainty_reasons ?? raw.motivos_duda),
        ...(producerRoleConflict ? ['La ubicaci\u00f3n le\u00edda no confirma la bodega. Revisa el productor en la etiqueta.'] : [])],
      inferredFields: [...new Set([...stringArray(raw.inferred_fields ?? raw.campos_inferidos),
        ...(producerRoleConflict ? ['producer'] : [])])],
      sensoryAttributes: sensory ? {
        potencia: numericValue(sensory.potencia ?? sensory.power),
        acidez: numericValue(sensory.acidez ?? sensory.acidity),
        dulzura: numericValue(sensory.dulzura ?? sensory.sweetness),
        taninos: numericValue(sensory.taninos ?? sensory.tannin),
        afrutado: numericValue(sensory.afrutado ?? sensory.fruity),
        madera: numericValue(sensory.madera ?? sensory.wood),
        intensidad: numericValue(sensory.intensidad ?? sensory.intensity),
      } : null,
      sensorySource: 'inference',
      affinity: null,
      affinityConfidence: null,
      affinityReason: 'Afinidad pendiente de una ficha sensorial verificada.',
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
const genericWineNameTokens = new Set([
  'blanc',
  'blanco',
  'brut',
  'crianza',
  'cuvee',
  'gran',
  'original',
  'product',
  'reserve',
  'reserva',
  'rose',
  'rosado',
  'sparkling',
  'spumante',
  'tinto',
  'vino',
  'wine',
]);

const hasUnresolvedProducerGeographyConflict = (left: WineCandidate, right: WineCandidate) => {
  if (![left, right].some(candidate => candidate.inferredFields.some(field => /^(producer|productor|winery|bodega)$/i.test(field)))) return false;
  const geography = (candidate: WineCandidate) => ({
    region: candidate.inferredFields.includes('region') ? null : candidate.region,
    country: candidate.inferredFields.some(field => /^(country|pais|pa\u00eds)$/i.test(field)) ? null : candidate.country,
  });
  return hasWinerimGeographyConflict(geography(left), geography(right));
};

const hasWineIdentityConflict = (left: WineCandidate, right: WineCandidate) => {
  if (left.canonicalId && right.canonicalId && left.canonicalId !== right.canonicalId) return true;
  if (left.vintage && right.vintage && left.vintage !== right.vintage) return true;
  if (hasUnresolvedProducerGeographyConflict(left, right)) return true;
  const leftProducer = [...identityTokens(left.producer)].filter((token) => !producerStopWords.has(token));
  const rightProducer = [...identityTokens(right.producer)].filter((token) => !producerStopWords.has(token));
  return leftProducer.length > 0 && rightProducer.length > 0
    && leftProducer.filter((token) => rightProducer.includes(token)).length < Math.min(leftProducer.length, rightProducer.length);
};

export const areLikelyDuplicateWines = (left: WineCandidate, right: WineCandidate) => {
  if (hasWineIdentityConflict(left, right)) return false;
  const leftName = identityTokens(left.name);
  const rightName = identityTokens(right.name);
  const leftProducer = new Set([...identityTokens(left.producer)].filter((token) => !producerStopWords.has(token)));
  const rightProducer = new Set([...identityTokens(right.producer)].filter((token) => !producerStopWords.has(token)));
  const sharedProducer = [...leftProducer].filter((token) => rightProducer.has(token));
  if ([...leftName].every((token) => rightName.has(token)) && leftName.size === rightName.size) return true;

  const sharedName = [...leftName].filter((token) => rightName.has(token));
  if (sharedName.length < Math.min(leftName.size, rightName.size)) return false;
  const producerTokens = new Set([...leftProducer, ...rightProducer]);
  const extraTokens = [...new Set([...leftName, ...rightName])]
    .filter((token) => !leftName.has(token) || !rightName.has(token));
  const producerInFullName = (!leftProducer.size || !rightProducer.size) && producerTokens.size > 0
    && [...producerTokens].every((token) => leftName.has(token) || rightName.has(token));
  const sameProducerAlias = (sharedProducer.length > 0 || producerInFullName)
    && sharedName.some((token) => !producerTokens.has(token) && !genericWineNameTokens.has(token))
    && extraTokens.every((token) => producerTokens.has(token));
  if (sameProducerAlias) return true;
  return sharedName.length >= 2
    && extraTokens.length > 0
    && extraTokens.every((token) => producerTokens.has(token) || ['wine', 'vino', 'product', 'sparkling'].includes(token));
};

export interface DuplicateWineGroup {
  key: string;
  regionIds: string[];
  count: number;
  candidate: WineCandidate;
}

export const groupDuplicateWines = (regions: ScanRegion[]): DuplicateWineGroup[] => {
  const groups: DuplicateWineGroup[] = [];
  const members = new Map<DuplicateWineGroup, WineCandidate[]>();
  regions.forEach((region) => {
    if (region.status === 'discarded' || region.status === 'unrecognized') return;
    const candidate = getSelectedCandidate(region);
    if (!candidate) return;
    const canonicalKey = buildCanonicalWineKey(candidate);
    const canGroup = (region.status === 'recognized' || region.status === 'uncertain')
      && candidate.confidence >= 0.5;
    const current = canGroup ? groups.find((group) => {
      // A stronger but incomplete representative must not bridge conflicting
      // vintages, producers or canonical records hidden elsewhere in the group.
      const evidence = members.get(group);
      if (!evidence || evidence.some((member) => hasWineIdentityConflict(member, candidate))) return false;
      if (buildCanonicalWineKey(group.candidate) === canonicalKey) return true;
      const exactWineName = normalizeIdentity(group.candidate.name) === normalizeIdentity(candidate.name);
      const compatibleVintage = !group.candidate.vintage
        || !candidate.vintage
        || group.candidate.vintage === candidate.vintage;
      const distinctiveNameTokens = normalizeIdentity(candidate.name)
        .split(' ')
        .filter((token) => token && !genericWineNameTokens.has(token));
      const compatibleProducerEvidence = areLikelyDuplicateWines(group.candidate, candidate);
      if (exactWineName && compatibleVintage && distinctiveNameTokens.length >= 2 && compatibleProducerEvidence) return true;
      if (exactWineName && areLikelyDuplicateWines(group.candidate, candidate)) return true;
      return Math.min(group.candidate.confidence, candidate.confidence) >= 0.5
        && areLikelyDuplicateWines(group.candidate, candidate);
    }) : null;
    if (current) {
      members.get(current)!.push(candidate);
      current.regionIds.push(region.id);
      current.count += 1;
      if (candidate.confidence > current.candidate.confidence) current.candidate = candidate;
    } else {
      const geographicSplit = canGroup && groups.some(group => buildCanonicalWineKey(group.candidate) === canonicalKey
        && members.get(group)?.some(member => hasUnresolvedProducerGeographyConflict(member, candidate)));
      const group: DuplicateWineGroup = {
        key: canGroup && !geographicSplit ? canonicalKey : `${canonicalKey}|region:${region.id}`,
        regionIds: [region.id],
        count: 1,
        candidate,
      };
      groups.push(group);
      if (canGroup) members.set(group, [candidate]);
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
  source: 'manual',
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
  canonicalId: null,
  originalSheet: null,
  ...(candidate.globalRecord ? { globalRecord: null } : {}),
  sensorySource: 'inference',
  affinity: null,
  affinityConfidence: null,
  affinityReason: null,
});

export const summarizeScanRegions = (regions: ScanRegion[]) => ({
  deferred: regions.filter((region) => region.status === 'deferred').length,
  recognized: regions.filter((region) => region.status === 'recognized').length,
  uncertain: regions.filter((region) => region.status === 'uncertain').length,
  unrecognized: regions.filter((region) => region.status === 'unrecognized' && !region.error).length,
  errors: regions.filter((region) => Boolean(region.error) && region.status !== 'discarded').length,
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
