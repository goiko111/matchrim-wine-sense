import { getCropGeometry } from './imageCropGeometry';
import { prioritizeRegionsForAnalysis, type ScanRegion } from './multiWineScan';

export const MAX_AUTOMATIC_REGION_ANALYSES = 12;
export const MAX_SCAN_EDGE_REQUESTS = 24;
export const MAX_MANUAL_REGION_REQUESTS = 4;

export type RegionDeferral = {
  code: 'resolution' | 'legibility' | 'exposure' | 'automatic_limit' | 'request_limit';
  message: string;
};

export const regionPreflight = (region: ScanRegion, width: number, height: number, manual = false): RegionDeferral | null => {
  const { pixels } = getCropGeometry(width, height, region.box);
  // Operational floor, not a calibrated probability of readable text. Never upscale to pass.
  if (Math.min(pixels.width, pixels.height) < 64) return {
    code: 'resolution', message: 'La etiqueta ocupa muy pocos píxeles. Haz una foto más cercana de esta zona.',
  };
  if (!manual && region.quality.legibility === 'poor') return {
    code: 'legibility', message: 'El detector indica texto poco legible. Revisa el recorte o toma otra foto antes de analizarlo.',
  };
  return null;
};

export const cropQualityDeferral = (quality: { brightness: number | null; contrast: number | null }): RegionDeferral | null => (
  (quality.brightness !== null && (quality.brightness < 12 || quality.brightness > 248))
  || (quality.contrast !== null && quality.contrast < 8)
    ? { code: 'exposure', message: 'El recorte no tiene suficiente luz o contraste. Acerca la cámara y evita reflejos.' }
    : null
);

export const deferRegion = (region: ScanRegion, deferral: RegionDeferral): ScanRegion => ({
  ...region, status: 'deferred', deferral, candidates: [], selectedCandidateId: null, error: null, fallback: null,
});

export const planRegionAnalysis = (regions: ScanRegion[], width: number, height: number) => {
  const eligible: ScanRegion[] = [];
  const deferred: ScanRegion[] = [];
  for (const region of prioritizeRegionsForAnalysis(regions)) {
    const reason = regionPreflight(region, width, height);
    if (reason) deferred.push(deferRegion(region, reason));
    else eligible.push(region);
  }
  let ordered = eligible;
  if (eligible.length > MAX_AUTOMATIC_REGION_ANALYSES) {
    // Nine occupied areas fit within the unchanged twelve-request first pass.
    // Preserve quality order inside each area and original region IDs for retry.
    const cells = new Map<number, ScanRegion[]>();
    for (const region of eligible) {
      const column = Math.max(0, Math.min(2, Math.floor((region.box.x + region.box.width / 2) * 3 / 100)));
      const row = Math.max(0, Math.min(2, Math.floor((region.box.y + region.box.height / 2) * 3 / 100)));
      const key = row * 3 + column;
      const cell = cells.get(key) ?? [];
      cell.push(region);
      cells.set(key, cell);
    }
    const buckets = [...cells].sort(([a], [b]) => a - b).map(([, cell]) => cell);
    ordered = [];
    for (let round = 0; ordered.length < eligible.length; round++) {
      for (const cell of buckets) if (cell[round]) ordered.push(cell[round]);
    }
  }
  const automatic = ordered.slice(0, MAX_AUTOMATIC_REGION_ANALYSES);
  for (const region of ordered.slice(MAX_AUTOMATIC_REGION_ANALYSES)) deferred.push(deferRegion(region, {
    code: 'automatic_limit',
    message: 'Pendiente de an\u00e1lisis: la primera pasada lee hasta 12 regiones. Puedes continuar con el siguiente lote o revisar esta regi\u00f3n.',
  }));
  return { automatic, deferred: deferred.sort((a, b) => a.index - b.index) };
};

export const planAdditionalRegionAnalysis = (regions: ScanRegion[], width: number, height: number) => {
  // Continue only unattempted work. Errors and low-quality crops need explicit review,
  // and recognized/manual/discarded regions must never be submitted again as a batch.
  const pending = regions.filter((region) => region.status === 'pending'
    || (region.status === 'deferred'
      && (region.deferral?.code === 'automatic_limit' || region.deferral?.code === 'request_limit')));
  return planRegionAnalysis(pending, width, height);
};

export class ScanRequestLimitError extends Error {
  constructor() { super('Se alcanzó el límite de solicitudes de este lote.'); }
}

export const createScanRequestBudget = (limit = MAX_SCAN_EDGE_REQUESTS) => {
  if (!Number.isInteger(limit) || limit < 0) throw new Error('Invalid request limit');
  let used = 0;
  return {
    get used() { return used; },
    get remaining() { return limit - used; },
    reserve(signal: AbortSignal) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (used >= limit) throw new ScanRequestLimitError();
      used += 1;
    },
  };
};
export type ScanRequestBudget = ReturnType<typeof createScanRequestBudget>;
