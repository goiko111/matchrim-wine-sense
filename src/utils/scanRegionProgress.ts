import type { ScanRegion } from './multiWineScan';

export interface ScanRegionProgress {
  analyzed: number;
  manual: number;
  analyzing: number;
  pending: number;
  deferred: number;
  failed: number;
  discarded: number;
}

export const summarizeScanRegionProgress = (
  regions: ReadonlyArray<Pick<ScanRegion, 'status' | 'error'> & Partial<Pick<ScanRegion, 'candidates' | 'selectedCandidateId'>>>,
): ScanRegionProgress => {
  const counts: ScanRegionProgress = {
    analyzed: 0, manual: 0, analyzing: 0, pending: 0, deferred: 0, failed: 0, discarded: 0,
  };
  for (const region of regions) {
    switch (region.status) {
      case 'recognized':
      case 'uncertain':
      case 'unrecognized':
        {
          const candidate = region.candidates?.find((item) => item.id === region.selectedCandidateId) ?? region.candidates?.[0];
          counts[region.error ? 'failed' : candidate?.source === 'manual' ? 'manual' : 'analyzed']++;
        }
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
  counts.manual > 0 ? `${counts.manual} identidad${counts.manual === 1 ? '' : 'es'} manual${counts.manual === 1 ? '' : 'es'}` : null,
  counts.analyzing > 0 ? `${counts.analyzing} en curso` : null,
  counts.pending > 0 ? `${counts.pending} en espera` : null,
  counts.failed > 0 ? `${counts.failed} con error` : null,
  counts.deferred > 0 ? `${counts.deferred} sin analizar` : null,
  counts.discarded > 0 ? `${counts.discarded} descartada${counts.discarded === 1 ? '' : 's'}` : null,
].filter((part) => part !== null).join(' \u00b7 ');
