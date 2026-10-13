import type { ScanRegion } from './multiWineScan';

export interface ScanRegionProgress {
  analyzed: number;
  analyzing: number;
  pending: number;
  deferred: number;
  failed: number;
  discarded: number;
}

export const summarizeScanRegionProgress = (
  regions: ReadonlyArray<Pick<ScanRegion, 'status' | 'error'>>,
): ScanRegionProgress => {
  const counts: ScanRegionProgress = {
    analyzed: 0, analyzing: 0, pending: 0, deferred: 0, failed: 0, discarded: 0,
  };
  for (const region of regions) {
    switch (region.status) {
      case 'recognized':
      case 'uncertain':
      case 'unrecognized':
        // A completed analysis can have no identity; a failed request is separate.
        counts[region.error ? 'failed' : 'analyzed']++;
        break;
      case 'analyzing':
      case 'pending':
      case 'deferred':
      case 'discarded':
        counts[region.status]++;
        break;
    }
  }
  return counts;
};

export const formatScanRegionProgress = (counts: ScanRegionProgress): string => [
  `${counts.analyzed} analizada${counts.analyzed === 1 ? '' : 's'}`,
  counts.analyzing > 0 ? `${counts.analyzing} en curso` : null,
  counts.pending > 0 ? `${counts.pending} en espera` : null,
  counts.failed > 0 ? `${counts.failed} con error` : null,
  counts.deferred > 0 ? `${counts.deferred} sin analizar` : null,
  counts.discarded > 0 ? `${counts.discarded} descartada${counts.discarded === 1 ? '' : 's'}` : null,
].filter((part) => part !== null).join(' \u00b7 ');
