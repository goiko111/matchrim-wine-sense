import { useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  FolderOpen,
  Loader2,
  RefreshCw,
  ScanLine,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AffinityExplanation } from '@/components/AffinityExplanation';
import { AiRimContextGuide } from '@/components/AiRimContextGuide';
import { WineComparisonWorkspace } from '@/components/wine-import/WineComparisonWorkspace';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/AuthContext';
import { trackAppEvent } from '@/lib/analytics';
import { findWinerimWineForLabel } from '@/services/winerimApi';
import {
  EdgeFunctionError,
  invokeWithEdgeFunctionRetry,
} from '@/utils/edgeFunctionResilience';
import { cropImageRegion, prepareImageForAnalysis, shouldRejectTextAnalysis, type ImageQualityReport } from '@/utils/imageAnalysis';
import { invokeEdgeFunction } from '@/utils/invokeEdgeFunction';
import { isMatchrimFixtureQaEnabled } from '@/utils/matchrimQaMode';
import { clusterOverlayPins } from '@/utils/overlayPins';
import {
  calculateLocalMatchrimAffinity,
  readStoredMatchrimProfile,
} from '@/utils/wineAffinityExplanation';
import {
  buildWineDetectionTiles,
  confirmWineCandidateIdentity,
  correctWineCandidateIdentity,
  determineRegionStatus,
  getConfirmableWineGroups,
  getFullWineDetectionTile,
  getSelectedCandidate,
  groupDuplicateWines,
  getRegionAnalysisConcurrency,
  mapWithConcurrency,
  mergeWineDetectionTileResults,
  normalizeDetectedRegions,
  normalizeRecognitionFallback,
  normalizeScanCoverage,
  normalizeWineCandidates,
  prioritizeRegionsForAnalysis,
  shouldRefineWineDetection,
  summarizeScanRegions,
  type ScanRegion,
  type ScanCoverage,
  type WineCandidate,
} from '@/utils/multiWineScan';
import { recordScanHistory } from '@/utils/scanHistory';

interface MultiWineLabelScannerProps {
  onExtractComplete: (wine: {
    nombre: string;
    productor: string | null;
    anada: number | null;
    region: string | null;
    pais: string | null;
    uvas: string[];
    alcohol: number | null;
    notas_cata: string | null;
    matchrim_affinity?: number | null;
    sensory_attributes?: WineCandidate['sensoryAttributes'];
    affinity_reason?: string | null;
  }) => void | Promise<void>;
}

type ScanPhase = 'idle' | 'quality' | 'detecting' | 'analyzing' | 'ready' | 'cancelled' | 'error';

interface ScanPerformance {
  qualityMs: number;
  detectionMs: number;
  analysisMs: number;
  totalMs: number;
  concurrency: number;
  detectionCalls: number;
  detectionRefined: boolean;
  retries: number;
}

const PHASE_LABELS: Record<ScanPhase, string> = {
  idle: 'Lista para escanear',
  quality: 'Comprobando imagen',
  detecting: 'Localizando botellas y etiquetas',
  analyzing: 'Leyendo cada región por separado',
  ready: 'Lote listo para revisar',
  cancelled: 'Análisis cancelado',
  error: 'Análisis incompleto',
};

const statusLabel = (region: ScanRegion) => {
  if (region.status === 'recognized') return 'Reconocido';
  if (region.status === 'uncertain') return 'Dudoso';
  if (region.status === 'unrecognized') return 'Sin reconocer';
  if (region.status === 'discarded') return 'Descartado';
  if (region.status === 'analyzing') return 'Analizando';
  return 'Pendiente';
};

const statusClass = (region: ScanRegion) => {
  if (region.status === 'recognized') return 'border-emerald-500 bg-emerald-600 text-white';
  if (region.status === 'uncertain') return 'border-amber-400 bg-amber-400 text-stone-950';
  if (region.status === 'unrecognized') return 'border-red-500 bg-red-700 text-white';
  if (region.status === 'discarded') return 'border-stone-400 bg-stone-600 text-white';
  return 'border-white bg-stone-950 text-white';
};

const candidateToAffinityWine = (candidate: WineCandidate) => ({
  name: candidate.name,
  producer: candidate.producer,
  vintage: candidate.vintage,
  region: candidate.region,
  country: candidate.country,
  grape_varieties: candidate.grapes,
  sensory_attributes: candidate.sensoryAttributes,
});

const userFacingScanError = (error: unknown) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No hay conexión. Conservamos la foto para que puedas reintentar cuando vuelva la red.';
  }
  const message = error instanceof Error ? error.message : '';
  if (/load failed|failed to fetch|network|404|not found/i.test(message)) {
    return 'No se pudo conectar con el servicio de detección. La foto sigue lista para reintentar.';
  }
  if (error instanceof EdgeFunctionError && error.status === 429) {
    return 'El servicio esta recibiendo demasiadas solicitudes. Conservamos la foto para reintentarlo en unos segundos.';
  }
  if (error instanceof EdgeFunctionError && error.status >= 500) {
    return 'El servicio no pudo terminar la lectura. Conservamos la foto para que puedas reintentar.';
  }
  return message || 'No se pudo completar el análisis. La foto sigue lista para reintentar.';
};

export const MultiWineLabelScanner = ({ onExtractComplete }: MultiWineLabelScannerProps) => {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState<ImageQualityReport | null>(null);
  const [regions, setRegions] = useState<ScanRegion[]>([]);
  const [coverage, setCoverage] = useState<ScanCoverage | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisConcurrency, setAnalysisConcurrency] = useState(0);
  const [scanMetrics, setScanMetrics] = useState<ScanPerformance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? null;
  const selectedCandidate = selectedRegion ? getSelectedCandidate(selectedRegion) : null;
  const summary = useMemo(() => summarizeScanRegions(regions), [regions]);
  const duplicateGroups = useMemo(() => groupDuplicateWines(regions), [regions]);
  const confirmableGroups = useMemo(() => getConfirmableWineGroups(regions), [regions]);
  const regionPinClusters = useMemo(() => clusterOverlayPins(
    regions
      .filter((region) => region.status !== 'discarded')
      .map((region) => ({
        key: region.id,
        order: region.index,
        x: Math.max(5, Math.min(95, region.box.x + Math.min(5, region.box.width / 2))),
        y: Math.max(5, Math.min(95, region.box.y + Math.min(5, region.box.height / 2))),
        value: region,
      })),
  ), [regions]);
  const rankedGroups = useMemo(() => [...duplicateGroups].sort((a, b) => (
    (b.candidate.affinity ?? -1) - (a.candidate.affinity ?? -1)
  )), [duplicateGroups]);
  const loading = phase === 'quality' || phase === 'detecting' || phase === 'analyzing';
  const progress = phase === 'quality'
    ? 8
    : phase === 'detecting'
      ? 24
      : phase === 'analyzing'
        ? 24 + Math.round(analysisProgress * 0.72)
        : phase === 'ready'
          ? 100
          : 0;

  const updateRegion = (regionId: string, updater: (region: ScanRegion) => ScanRegion) => {
    setRegions((current) => current.map((region) => region.id === regionId ? updater(region) : region));
  };

  const enrichCandidate = async (candidate: WineCandidate, signal: AbortSignal) => {
    let enriched = candidate;
    const canResolveCanonically = candidate.confidence >= 0.72
      && candidate.evidence.length >= 2
      && candidate.uncertaintyReasons.length === 0;
    const catalogMatch = isMatchrimFixtureQaEnabled || !canResolveCanonically
      ? null
      : await findWinerimWineForLabel({
          name: candidate.name,
          producer: candidate.producer,
          vintage: candidate.vintage,
          region: candidate.region,
          country: candidate.country,
        });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

    if (catalogMatch) {
      enriched = {
        ...candidate,
        name: catalogMatch.wine.name || candidate.name,
        producer: catalogMatch.wine.winery || candidate.producer,
        vintage: Number(catalogMatch.wine.vintage) || candidate.vintage,
        region: catalogMatch.wine.region || candidate.region,
        country: catalogMatch.wine.country || candidate.country,
        grapes: catalogMatch.wine.grapes?.length ? catalogMatch.wine.grapes : candidate.grapes,
        confidence: Math.max(candidate.confidence, catalogMatch.confidence),
        source: 'catalog',
        evidence: [...candidate.evidence, 'Coincidencia en el catálogo Winerim'],
      };
    }

    const localAffinity = calculateLocalMatchrimAffinity(
      readStoredMatchrimProfile(),
      enriched.sensoryAttributes,
    );
    if (localAffinity !== null) {
      enriched = {
        ...enriched,
        affinity: localAffinity,
        affinityConfidence: Math.round(Math.min(enriched.confidence, enriched.source === 'catalog' ? 0.9 : 0.58) * 100) / 100,
        affinityReason: enriched.source === 'catalog'
          ? 'Calculado localmente contra tu perfil con atributos del catálogo.'
          : 'Calculado localmente contra tu perfil con atributos sensoriales inferidos; confirma la identidad para mejorar la precisión.',
      };
    }

    if (!user) return enriched;
    try {
      const affinity = await invokeEdgeFunction<{
        affinity?: number | null;
        sensory_attributes?: WineCandidate['sensoryAttributes'];
      }>('calculate-wine-affinity', { wine: candidateToAffinityWine(enriched) }, signal);
      if (typeof affinity.affinity !== 'number') return enriched;
      return {
        ...enriched,
        affinity: affinity.affinity,
        sensoryAttributes: affinity.sensory_attributes ?? enriched.sensoryAttributes ?? null,
        affinityConfidence: Math.round(Math.min(enriched.confidence, enriched.source === 'catalog' ? 0.9 : 0.58) * 100) / 100,
        affinityReason: 'Calculado contra tu perfil Matchrim con atributos sensoriales declarados como ficha o inferencia.',
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      console.warn('[multi-label] Affinity unavailable:', error);
      return enriched;
    }
  };

  const analyzeRegion = async (
    region: ScanRegion,
    imageDataUrl: string,
    signal: AbortSignal,
    fixtureName?: string,
    onRetry?: () => void,
  ) => {
    updateRegion(region.id, (current) => ({ ...current, status: 'analyzing', error: null, fallback: null }));
    try {
      const cropDataUrl = await cropImageRegion(imageDataUrl, region.box);
      const payload = await invokeWithEdgeFunctionRetry(
        () => invokeEdgeFunction<Record<string, unknown>>(
            'analyze-wine-region',
            { image: cropDataUrl, region_id: region.id, qa_fixture_name: fixtureName ?? null },
            signal,
          ),
        signal,
        {
          maxAttempts: 3,
          onRetry: () => {
            onRetry?.();
          },
        },
      );
      let candidates = normalizeWineCandidates(payload, region.id);
      if (candidates[0]) {
        const first = await enrichCandidate(candidates[0], signal);
        candidates = [first, ...candidates.slice(1)];
      }
      return {
        ...region,
        cropDataUrl,
        candidates,
        selectedCandidateId: candidates[0]?.id ?? null,
        status: determineRegionStatus(candidates),
        fallback: normalizeRecognitionFallback(payload),
        error: null,
      } satisfies ScanRegion;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      return {
        ...region,
        status: 'unrecognized' as const,
        fallback: null,
        error: error instanceof Error ? error.message : 'No se pudo analizar la región',
      };
    }
  };

  const startScan = async (file: File) => {
    const scanStartedAt = globalThis.performance.now();
    lastFileRef.current = file;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConfirmed(false);
    setRegions([]);
    setCoverage(null);
    setSelectedRegionId(null);
    setErrorMessage(null);
    setAnalysisProgress(0);
    setAnalysisConcurrency(0);
    setScanMetrics(null);
    let retries = 0;
    let detectionCalls = 0;
    let detectionRefined = false;

    try {
      setPhase('quality');
      const prepared = await prepareImageForAnalysis(file);
      const qualityFinishedAt = globalThis.performance.now();
      if (controller.signal.aborted) return;
      setPreview(prepared.dataUrl);
      setQuality(prepared.quality);
      if (shouldRejectTextAnalysis(prepared.quality)) {
        setErrorMessage('La imagen es demasiado pequeña y desenfocada para leer etiquetas. Acerca la cámara y enfoca el nombre o la bodega.');
        setPhase('error');
        return;
      }

      setPhase('detecting');
      const detectImage = async (image: string, tileId: string) => {
        detectionCalls += 1;
        return invokeWithEdgeFunctionRetry(
          () => invokeEdgeFunction<Record<string, unknown>>(
            'detect-wine-regions',
            { image, qa_fixture_name: file.name, detection_tile: tileId },
            controller.signal,
          ),
          controller.signal,
          {
            maxAttempts: 2,
            onRetry: () => {
              retries += 1;
            },
          },
        );
      };
      const fullTile = getFullWineDetectionTile();
      const detection = await detectImage(prepared.dataUrl, fullTile.id);
      let detected = normalizeDetectedRegions(detection);
      let resolvedCoverage = normalizeScanCoverage(detection, detected.length);

      if (
        !isMatchrimFixtureQaEnabled
        && shouldRefineWineDetection(detection, detected)
      ) {
        const regionalResults = await mapWithConcurrency(
          buildWineDetectionTiles(prepared.width, prepared.height),
          2,
          async (tile) => {
            try {
              return {
                tile,
                payload: await detectImage(
                  await cropImageRegion(prepared.dataUrl, tile.box, 0, 2400),
                  tile.id,
                ),
              };
            } catch (error) {
              if (error instanceof DOMException && error.name === 'AbortError') throw error;
              console.warn(`[multi-label] Regional detector ${tile.id} unavailable; keeping full detection.`, error);
              return null;
            }
          },
        );
        const completedRegionalResults = regionalResults.filter((result): result is NonNullable<typeof result> => result !== null);
        if (completedRegionalResults.length === regionalResults.length) {
          const refined = mergeWineDetectionTileResults(completedRegionalResults);
          if (refined.regions.length > 0) {
            detected = refined.regions;
            resolvedCoverage = refined.coverage;
            detectionRefined = true;
          }
        }
      }
      const detectionFinishedAt = globalThis.performance.now();
      setCoverage(resolvedCoverage);
      if (detected.length === 0) {
        setRegions([]);
        setErrorMessage('No he localizado botellas analizables. Acerca la cámara o evita reflejos fuertes.');
        setPhase('error');
        return;
      }

      setRegions(detected);
      setSelectedRegionId(null);
      setPhase('analyzing');
      let completed = 0;
      const connection = (navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }).connection ?? null;
      const concurrency = getRegionAnalysisConcurrency(detected.length, connection);
      const prioritizedRegions = prioritizeRegionsForAnalysis(detected);
      setAnalysisConcurrency(concurrency);
      const analyzedByPriority = await mapWithConcurrency(prioritizedRegions, concurrency, async (region) => {
        const result = await analyzeRegion(region, prepared.dataUrl, controller.signal, file.name, () => {
          retries += 1;
        });
        completed += 1;
        setAnalysisProgress(Math.round(completed / detected.length * 100));
        updateRegion(region.id, () => result);
        return result;
      });
      if (controller.signal.aborted) return;
      const analyzed = [...analyzedByPriority].sort((left, right) => left.index - right.index);
      const analysisFinishedAt = globalThis.performance.now();
      setRegions(analyzed);
      const scanPerformance = {
        qualityMs: Math.round(qualityFinishedAt - scanStartedAt),
        detectionMs: Math.round(detectionFinishedAt - qualityFinishedAt),
        analysisMs: Math.round(analysisFinishedAt - detectionFinishedAt),
        totalMs: Math.round(analysisFinishedAt - scanStartedAt),
        concurrency,
        detectionCalls,
        detectionRefined,
        retries,
      };
      setScanMetrics(scanPerformance);
      setPhase('ready');
      trackAppEvent('multi_wine_label_scan_completed', {
        userId: user?.id,
        metadata: {
          regions: analyzed.length,
          recognized: summarizeScanRegions(analyzed).recognized,
          uncertain: summarizeScanRegions(analyzed).uncertain,
          quality_ms: scanPerformance.qualityMs,
          detection_ms: scanPerformance.detectionMs,
          analysis_ms: scanPerformance.analysisMs,
          total_ms: scanPerformance.totalMs,
          concurrency: scanPerformance.concurrency,
          detection_calls: scanPerformance.detectionCalls,
          detection_refined: scanPerformance.detectionRefined,
          retries: scanPerformance.retries,
        },
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setPhase('cancelled');
        return;
      }
      console.error('[multi-label] Scan failed:', error);
      setErrorMessage(userFacingScanError(error));
      setPhase('error');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona una imagen valida');
      return;
    }
    trackAppEvent('multi_wine_label_scan_started', {
      userId: user?.id,
      metadata: { file_type: file.type, file_size: file.size },
    });
    await startScan(file);
  };

  const cancelScan = () => {
    abortRef.current?.abort();
    setPhase('cancelled');
  };

  const resetScan = () => {
    abortRef.current?.abort();
    setPreview(null);
    setQuality(null);
    setRegions([]);
    setCoverage(null);
    setSelectedRegionId(null);
    setErrorMessage(null);
    setAnalysisProgress(0);
    setAnalysisConcurrency(0);
    setScanMetrics(null);
    setConfirmed(false);
    lastFileRef.current = null;
    setPhase('idle');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const retryScan = () => {
    if (lastFileRef.current) void startScan(lastFileRef.current);
  };

  const reanalyzeSelected = async () => {
    if (!selectedRegion || !preview || loading) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    setAnalysisProgress(0);
    const result = await analyzeRegion(selectedRegion, preview, controller.signal, lastFileRef.current?.name);
    updateRegion(selectedRegion.id, () => result);
    setAnalysisProgress(100);
    setPhase('ready');
  };

  const discardSelected = () => {
    if (!selectedRegion) return;
    updateRegion(selectedRegion.id, (current) => ({ ...current, status: 'discarded' }));
    setSelectedRegionId(null);
  };

  const selectCandidate = (candidateId: string) => {
    if (!selectedRegion) return;
    updateRegion(selectedRegion.id, (current) => {
      const candidate = current.candidates.find((item) => item.id === candidateId);
      return {
        ...current,
        selectedCandidateId: candidateId,
        status: candidate ? determineRegionStatus([candidate]) : 'unrecognized',
      };
    });
  };

  const confirmSelectedCandidate = () => {
    if (!selectedRegion || !selectedCandidate) return;
    updateRegion(selectedRegion.id, (current) => ({
      ...current,
      status: 'recognized',
      candidates: current.candidates.map((candidate) => candidate.id === selectedCandidate.id
        ? confirmWineCandidateIdentity(candidate)
        : candidate),
    }));
    toast.success('Identidad confirmada por el usuario');
  };

  const editCandidate = (patch: Pick<Partial<WineCandidate>, 'name' | 'producer'>) => {
    if (!selectedRegion || !selectedCandidate) return;
    updateRegion(selectedRegion.id, (current) => ({
      ...current,
      status: 'recognized',
      candidates: current.candidates.map((candidate) => candidate.id === selectedCandidate.id
        ? correctWineCandidateIdentity(candidate, patch)
        : candidate),
    }));
  };

  const identifySelectedManually = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRegion) return;
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('manual-wine-name') ?? '').trim();
    const producer = String(formData.get('manual-wine-producer') ?? '').trim();
    if (!name) {
      toast.error('Escribe el nombre del vino');
      return;
    }
    const manualCandidate: WineCandidate = {
      id: `${selectedRegion.id}-candidate-manual`,
      name,
      producer: producer || null,
      vintage: null,
      region: null,
      country: null,
      grapes: [],
      alcohol: null,
      confidence: 1,
      source: 'manual',
      evidence: [],
      uncertaintyReasons: [],
      inferredFields: [],
      sensoryAttributes: null,
      affinity: null,
      affinityConfidence: null,
      affinityReason: null,
    };
    updateRegion(selectedRegion.id, (current) => ({
      ...current,
      status: 'recognized',
      candidates: [manualCandidate],
      selectedCandidateId: manualCandidate.id,
      fallback: null,
      error: null,
    }));
    toast.success('Identidad manual aplicada sin estimar afinidad');
  };

  const moveSelection = (direction: -1 | 1) => {
    if (!selectedRegion) return;
    const currentIndex = regions.findIndex((region) => region.id === selectedRegion.id);
    const target = regions[currentIndex + direction];
    if (target) setSelectedRegionId(target.id);
  };

  const confirmBatch = async () => {
    const groups = getConfirmableWineGroups(regions).filter((group) => group.candidate.name);
    if (!groups.length) {
      toast.error('No hay referencias confirmables en este lote');
      return;
    }
    for (const group of groups) {
      const candidate = group.candidate;
      await Promise.resolve(onExtractComplete({
        nombre: candidate.name,
        productor: candidate.producer,
        anada: candidate.vintage,
        region: candidate.region,
        pais: candidate.country,
        uvas: candidate.grapes,
        alcohol: candidate.alcohol,
        notas_cata: candidate.evidence.join('. ') || null,
        matchrim_affinity: candidate.affinity,
        sensory_attributes: candidate.sensoryAttributes,
        affinity_reason: candidate.affinityReason,
      }));
    }
    recordScanHistory({
      type: 'label',
      title: `${groups.length} referencia${groups.length === 1 ? '' : 's'} confirmada${groups.length === 1 ? '' : 's'}`,
      subtitle: `${regions.length} objetos · ${summary.uncertain} dudosos · ${summary.unrecognized} sin reconocer`,
      route: '/escanear/etiqueta',
      payload: {
        batch: groups.map((group) => ({ name: group.candidate.name, count: group.count, affinity: group.candidate.affinity ?? null })),
      },
    });
    setConfirmed(true);
    toast.success(`Lote confirmado: ${groups.length} referencias`);
  };

  return (
    <div className="space-y-5">
      {isMatchrimFixtureQaEnabled && (
        <div role="status" className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          QA local: respuestas deterministas. Este build valida el flujo, no la precisión del OCR.
        </div>
      )}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif" onChange={handleFileSelect} className="hidden" />

      {!preview ? (
        <div className="scan-upload-empty matchrim-surface rounded-lg p-4 sm:p-6">
          <div className="flex items-start gap-3 text-left">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-900">
              <ScanLine className="scan-upload-empty-icon h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-950">Fotografía las botellas</h2>
              <p className="mt-1 max-w-md text-sm leading-5 text-slate-600">
                Puede haber una o varias. Revisarás cada identidad antes de confirmar.
              </p>
            </div>
          </div>
          <div className="scan-upload-actions mt-5 grid gap-2 sm:grid-cols-2">
            <Button type="button" className="matchrim-pressable min-h-12 gap-2 bg-red-900 hover:bg-red-800" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" /> Hacer foto
            </Button>
            <Button type="button" variant="outline" className="matchrim-pressable min-h-12 gap-2 border-slate-300 bg-white" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="h-4 w-4" /> Elegir de galería
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="matchrim-surface flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
            <div>
              <div className="text-sm font-semibold text-slate-950" aria-live="polite">{PHASE_LABELS[phase]}</div>
              <div className="mt-1 text-xs matchrim-muted">
                {quality ? `${quality.megapixels} MP · brillo ${quality.brightness ?? '-'} · contraste ${quality.contrast ?? '-'}` : 'Preparando imagen'}
              </div>
              {phase === 'analyzing' && regions.length > 0 && (
                <div className="mt-1 text-xs text-slate-600" role="status">
                  {regions.length - summary.pending} de {regions.length} regiones · {analysisConcurrency} en paralelo
                </div>
              )}
              {phase === 'ready' && scanMetrics && (
                <div className="mt-1 text-xs matchrim-muted" data-testid="scan-performance-summary">
                  {regions.length} regiones en {(scanMetrics.totalMs / 1000).toFixed(1)} s
                  {scanMetrics.detectionRefined ? ' · detección refinada por zonas' : ''}
                  {scanMetrics.retries > 0 ? ` · ${scanMetrics.retries} reintento${scanMetrics.retries === 1 ? '' : 's'}` : ''}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {loading && (
                <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" onClick={cancelScan}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              )}
              {phase === 'error' && lastFileRef.current && (
                <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" onClick={retryScan}>
                  <RefreshCw className="h-4 w-4" /> Reintentar
                </Button>
              )}
              {!loading && (
                <Button type="button" variant="outline" size="icon" className="matchrim-pressable h-11 w-11 bg-white" onClick={resetScan} aria-label="Cerrar análisis">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {(loading || phase === 'ready') && <Progress value={progress} className="h-2" />}

          {quality?.warnings.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Calidad con avisos</div>
              <ul className="mt-2 space-y-1">{quality.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          ) : null}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{errorMessage}</div>
          )}

          <div
            className="matchrim-scan-stage relative mx-auto overflow-hidden rounded-lg"
            style={{
              aspectRatio: quality?.width && quality?.height ? `${quality.width} / ${quality.height}` : undefined,
              width: '100%',
              maxWidth: quality?.width && quality?.height
                ? `min(100%, ${68 * quality.width / quality.height}vh)`
                : '100%',
            }}
          >
            <img src={preview} alt="Foto analizada con regiones numeradas" className="absolute inset-0 block h-full w-full object-contain" />
            {regions.filter((region) => region.status !== 'discarded').map((region) => (
                <div
                  key={region.id}
                  className={`pointer-events-none absolute border-2 transition ${selectedRegionId === region.id ? 'ring-2 ring-white ring-offset-1 ring-offset-black' : ''} ${statusClass(region)}`}
                  style={{ left: `${region.box.x}%`, top: `${region.box.y}%`, width: `${region.box.width}%`, height: `${region.box.height}%`, backgroundColor: 'transparent' }}
                  data-testid={`region-outline-${region.index}`}
                  aria-hidden="true"
                />
			))}
            {regionPinClusters.map((cluster) => {
              const first = cluster.items[0].value;
              const clustered = cluster.items.length > 1;
              const active = cluster.items.some((item) => item.value.id === selectedRegionId);
              const labels = cluster.items.map((item) => `${item.value.index} ${statusLabel(item.value)}`).join(', ');

              return (
                <button
                  key={cluster.key}
                  type="button"
                  className={`absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${active ? 'ring-2 ring-white/80' : ''}`}
                  style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
                  onClick={() => setSelectedRegionId(first.id)}
                  aria-label={clustered ? `Grupo de ${cluster.items.length} regiones: ${labels}` : `Región ${first.index}, ${statusLabel(first)}`}
                  data-testid={clustered ? `region-pin-cluster-${first.index}` : `region-pin-${first.index}`}
                >
				  <span className={`flex h-7 min-w-7 items-center justify-center rounded-full border px-1 text-xs font-bold shadow ${statusClass(first)}`}>
					{clustered ? `+${cluster.items.length}` : first.status === 'analyzing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : first.index}
				  </span>
				</button>
              );
            })}
          </div>

          {regions.length > 0 && (
            <div className="space-y-4">
              <div className="matchrim-data-rail grid grid-cols-3 gap-2 rounded-lg px-2 py-3 text-center sm:grid-cols-5">
                <div><div className="text-xl font-bold text-emerald-700">{summary.recognized}</div><div className="text-xs text-slate-500">Reconocidos</div></div>
                <div><div className="text-xl font-bold text-amber-700">{summary.uncertain}</div><div className="text-xs text-slate-500">Dudosos</div></div>
                <div><div className="text-xl font-bold text-red-700">{summary.unrecognized}</div><div className="text-xs text-slate-500">Sin reconocer</div></div>
                <div className="hidden sm:block"><div className="text-xl font-bold text-slate-800">{duplicateGroups.length}</div><div className="text-xs text-slate-500">Referencias</div></div>
                <div className="hidden sm:block"><div className="text-xl font-bold text-slate-800">{regions.length}</div><div className="text-xs text-slate-500">Regiones</div></div>
              </div>

              <div className={`rounded-lg border-l-4 px-3 py-3 text-sm ${coverage?.status === 'reported_complete' ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : coverage?.status === 'partial' ? 'border-amber-500 bg-amber-50 text-amber-950' : 'border-slate-400 bg-slate-50 text-slate-800'}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Eye className="h-4 w-4" />
                  {coverage?.status === 'reported_complete'
                    ? 'Cobertura estimada completa'
                    : coverage?.status === 'partial'
                      ? 'Cobertura parcial'
                      : 'Cobertura sin verificar'}
                </div>
                <p className="mt-1 leading-5">
                  {coverage?.estimatedVisibleObjects
                    ? `${coverage.detectedObjects} de unas ${coverage.estimatedVisibleObjects} botellas visibles detectadas.`
                    : `${regions.length} regiones revisadas. No sabemos cuántas botellas visibles quedaron fuera.`}
                </p>
                {coverage?.notes.length ? <p className="mt-1 text-xs opacity-80">{coverage.notes.join(' ')}</p> : null}
              </div>

              <WineComparisonWorkspace
                wines={rankedGroups.map((group) => ({
                  id: group.key,
                  name: group.candidate.name,
                  producer: group.candidate.producer,
                  region: group.candidate.region,
                  affinity: group.candidate.affinity,
                  confidence: group.candidate.confidence,
                  attributes: group.candidate.sensoryAttributes ? {
                    body: group.candidate.sensoryAttributes.potencia,
                    acidity: group.candidate.sensoryAttributes.acidez,
                    sweetness: group.candidate.sensoryAttributes.dulzura,
                    tannin: group.candidate.sensoryAttributes.taninos,
                    fruit: group.candidate.sensoryAttributes.afrutado,
                    wood: group.candidate.sensoryAttributes.madera,
                    intensity: group.candidate.sensoryAttributes.intensidad,
                  } : null,
                }))}
              />

              <div className="matchrim-surface divide-y divide-stone-100 overflow-hidden rounded-lg">
                {rankedGroups.map((group, index) => (
                  <button
                    key={group.key}
                    type="button"
                    className="matchrim-pressable flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800"
                    onClick={() => setSelectedRegionId(group.regionIds[0])}
                    aria-label={`Abrir detalle de ${group.candidate.name}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-950 text-sm font-bold text-white">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-950">{group.candidate.name}</span>
                      <span className="block text-xs leading-5 text-slate-500">
                        {[group.candidate.producer, group.candidate.region].filter(Boolean).join(' · ') || 'Identidad parcial'}
                        {group.count > 1 ? ` · ${group.count} botellas` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold text-red-900">{group.candidate.affinity == null ? '-' : `${Math.round(group.candidate.affinity)}%`}</span>
                      <span className="block text-[11px] text-slate-500">Afinidad</span>
                    </span>
                  </button>
                ))}
              </div>

              {phase === 'ready' && (
                <Button
                  type="button"
                  className="matchrim-pressable min-h-12 w-full gap-2 bg-red-950 hover:bg-red-900"
                  onClick={() => void confirmBatch()}
                  disabled={confirmed || confirmableGroups.length === 0}
                >
                  <Check className="h-4 w-4" />
                  {confirmed ? 'Lote confirmado' : `Confirmar ${confirmableGroups.length} referencia${confirmableGroups.length === 1 ? '' : 's'}`}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Drawer open={Boolean(selectedRegion)} onOpenChange={(open) => !open && setSelectedRegionId(null)}>
        <DrawerContent className="max-h-[calc(100dvh-var(--matchrim-safe-top))] border-stone-200 bg-stone-50 pb-[var(--matchrim-safe-bottom)]">
          {selectedRegion && (
            <div className="mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col">
              <DrawerHeader className="border-b border-stone-200 bg-white text-left">
                <DrawerTitle>Región {selectedRegion.index}: {statusLabel(selectedRegion)}</DrawerTitle>
                <DrawerDescription>
                  Detección {Math.round(selectedRegion.detectionConfidence * 100)}%. La identidad y la afinidad se muestran por separado.
                </DrawerDescription>
              </DrawerHeader>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
                {selectedRegion.cropDataUrl && (
                  <img src={selectedRegion.cropDataUrl} alt={`Recorte de la región ${selectedRegion.index}`} className="max-h-48 w-full rounded-lg bg-black object-contain" />
                )}

                {selectedRegion.candidates.length === 0 ? (
                  <div className="space-y-4">
                    <AiRimContextGuide
                      context="label"
                      name={null}
                      identityConfidence={0}
                      affinity={null}
                      attributes={null}
                      primaryAction={{ label: 'Reanalizar región', onClick: () => void reanalyzeSelected() }}
                    />
                      <div className="rounded-lg border-l-4 border-red-700 bg-red-50 px-3 py-3 text-sm text-red-950">
                      <div className="flex items-center gap-2 font-semibold"><CircleHelp className="h-4 w-4" /> Sin identidad fiable</div>
                      <p className="mt-1">{selectedRegion.fallback?.message ?? 'No hay evidencia visual suficiente para asignar un vino.'}</p>
                      <p className="mt-1 font-medium">No se asignara una identidad ni una afinidad inventadas.</p>
                      {selectedRegion.fallback?.suggestedActions.length ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {selectedRegion.fallback.suggestedActions.map((action) => <li key={action}>{action}</li>)}
                        </ul>
                      ) : null}
                    </div>

                    <form className="matchrim-surface space-y-3 rounded-lg p-4" onSubmit={identifySelectedManually}>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-950">Identificacion manual</h4>
                        <p className="mt-1 text-xs text-slate-600">Confirma solo lo que conoces. La afinidad quedara pendiente hasta disponer de datos del vino.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm font-medium text-slate-800">
                          Vino
                          <Input name="manual-wine-name" className="mt-1 min-h-11" autoComplete="off" required />
                        </label>
                        <label className="text-sm font-medium text-slate-800">
                          Bodega (opcional)
                          <Input name="manual-wine-producer" className="mt-1 min-h-11" autoComplete="off" />
                        </label>
                      </div>
                      <Button type="submit" className="min-h-11 gap-2"><Check className="h-4 w-4" /> Aplicar identidad manual</Button>
                    </form>
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-950">Candidatos</h4>
                      <div className="matchrim-surface mt-2 divide-y divide-stone-100 overflow-hidden rounded-lg">
                        {selectedRegion.candidates.map((candidate, index) => {
                          const active = candidate.id === selectedCandidate?.id;
                          return (
                            <button
                              key={candidate.id}
                              type="button"
                              className={`matchrim-pressable flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left ${active ? 'bg-red-50' : 'bg-white'}`}
                              onClick={() => selectCandidate(candidate.id)}
                              aria-pressed={active}
                            >
                              <span className="text-xs font-bold text-red-900">{index + 1}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-slate-950">{candidate.name}</span>
                                <span className="block text-xs text-slate-500">{candidate.producer || 'Bodega no confirmada'}</span>
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-slate-700">Identidad {Math.round(candidate.confidence * 100)}%</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedCandidate && (
                      <>
                        {selectedCandidate.source === 'manual' && (
                          <div className="rounded-lg border-l-4 border-slate-500 bg-slate-50 px-3 py-2 text-sm text-slate-800">
                            Identidad introducida manualmente. Afinidad pendiente de datos sensoriales verificables.
                          </div>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="text-sm font-medium text-slate-800">
                            Vino
                            <Input className="mt-1 min-h-11" value={selectedCandidate.name} onChange={(event) => editCandidate({ name: event.target.value })} />
                          </label>
                          <label className="text-sm font-medium text-slate-800">
                            Bodega
                            <Input className="mt-1 min-h-11" value={selectedCandidate.producer ?? ''} onChange={(event) => editCandidate({ producer: event.target.value || null })} />
                          </label>
                        </div>

                        <div className="matchrim-data-rail grid grid-cols-3 gap-2 rounded-lg px-2 py-3 text-center text-xs text-slate-500">
                          <div><span className="block text-lg font-bold text-slate-900">{Math.round(selectedRegion.detectionConfidence * 100)}%</span>Detección</div>
                          <div><span className="block text-lg font-bold text-slate-900">{Math.round(selectedCandidate.confidence * 100)}%</span>Identidad</div>
                          <div><span className="block text-lg font-bold text-slate-900">{selectedCandidate.affinityConfidence == null ? '-' : `${Math.round(selectedCandidate.affinityConfidence * 100)}%`}</span>Respaldo afinidad</div>
                        </div>

                        {selectedCandidate.uncertaintyReasons.length > 0 && (
                          <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                            <div className="font-semibold">Duda:</div>
                            <p className="mt-1">{selectedCandidate.uncertaintyReasons.join(' ')}</p>
                          </div>
                        )}

                        <AiRimContextGuide
                          context="label"
                          name={selectedCandidate.name}
                          identityConfidence={selectedCandidate.confidence}
                          affinity={selectedCandidate.affinity}
                          attributes={selectedCandidate.sensoryAttributes}
                          sensorySource={selectedCandidate.source === 'catalog' ? 'catalog' : 'inference'}
                          uncertaintyReasons={selectedCandidate.uncertaintyReasons}
                          hasAlternatives={selectedRegion.candidates.length > 1 || duplicateGroups.length > 1}
                          primaryAction={selectedRegion.status === 'uncertain'
                            ? { label: 'Confirmar este candidato', onClick: confirmSelectedCandidate }
                            : null}
                          secondaryAction={selectedRegion.status === 'uncertain'
                            ? { label: 'Reanalizar región', onClick: () => void reanalyzeSelected() }
                            : null}
                        />

                        {selectedCandidate.evidence.length > 0 && (
                          <div className="text-sm">
                            <div className="font-semibold text-slate-900">Evidencia de identidad</div>
                            <ul className="mt-1 space-y-1 text-slate-600">{selectedCandidate.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                          </div>
                        )}

                        <AffinityExplanation
                          wineKey={selectedCandidate.id}
                          score={selectedCandidate.affinity}
                          identificationConfidence={selectedCandidate.confidence}
                          attributes={selectedCandidate.sensoryAttributes}
                          sensorySource={selectedCandidate.source === 'catalog' ? 'catalog' : 'inference'}
                        />
                      </>
                    )}
                  </>
                )}
              </div>

              <DrawerFooter className="border-t border-stone-200 bg-white">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" disabled={regions.findIndex((region) => region.id === selectedRegion.id) <= 0} onClick={() => moveSelection(-1)}>
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" disabled={regions.findIndex((region) => region.id === selectedRegion.id) >= regions.length - 1} onClick={() => moveSelection(1)}>
                    Siguiente <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" onClick={() => void reanalyzeSelected()}>
                    <RefreshCw className="h-4 w-4" /> Reanalizar
                  </Button>
                  <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white text-red-800" onClick={discardSelected}>
                    <Trash2 className="h-4 w-4" /> Descartar
                  </Button>
                </div>
                <DrawerClose asChild><Button type="button" variant="secondary" className="min-h-11">Cerrar</Button></DrawerClose>
              </DrawerFooter>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};
