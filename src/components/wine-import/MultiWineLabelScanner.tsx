import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Capacitor } from '@capacitor/core';
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
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { AffinityExplanation } from '@/components/AffinityExplanation';
import { WinerimOriginalSheet } from '@/components/WinerimOriginalSheet';
import { WinerimSheetLookup } from '@/components/WinerimSheetLookup';
import { catalogWineFromVerifiedSheet } from '@/utils/winerimOriginalSheet';
import { canAdmitNativeCatalogLookup97 } from '@/utils/nativeCatalogAdmission97';
import { normalizeNativeYear105 } from '@/utils/wineYearRole105';
import { localOCRAvailable106, readLocalWineText106, type LocalOCRResult106 } from '@/utils/nativeOCR106';
import { isPendingLocalIdentity109, localSingleCandidate109 } from '@/utils/nativeSingleLabel109';
import { applyNativeMaster102, lookupNativeMaster102, nativeMasterAudit102 } from '@/utils/nativeMasterCatalog102';
import { hasMissingVisibleQualifier102 } from '@/utils/nativeWineQualifier102';
import { applyGlobalCatalogue103, independentGlobalProducer103, isGlobalWine103, lookupGlobalCatalogue103 } from '@/utils/nativeGlobalCatalogue103';
import { GlobalWinePicker103, GlobalWineReference103 } from '@/components/wine-import/NativeGlobalCatalogue103';
import { GlobalWineRecovery104 } from '@/components/wine-import/GlobalWineRecovery104';
import { AiRimContextGuide } from '@/components/AiRimContextGuide';
import { WineComparisonWorkspace } from '@/components/wine-import/WineComparisonWorkspace';
import { LabelAnalysisView } from '@/components/wine-import/LabelAnalysisView';
import { NativeLabelIdentityEditor218 } from '@/components/wine-import/NativeLabelIdentityEditor218';
import { correctNativeIdentity218, type NativeIdentity218 } from '@/utils/nativeIdentityCorrection218';
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
import { loadMatchrimScanProfile } from '@/services/matchrimScanProfile';
import { loadNativeScanContext159 } from '@/services/nativeScanContext159';
import { personalVerdictTitle159, resolveNativeRescanVerdict159, type NativeVerdicts159 } from '@/utils/nativeRescanVerdict159';
import { NativeAffinitySummary } from '@/components/NativeAffinitySummary';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import { makeCellarCatalogEvidence, withCellarInitialAffinity } from '@/utils/bodegaAffinity';
import { makeCellarPublicReference107 } from '@/utils/cellarPublicReference107';
import { makeCellarReferenceStyle110 } from '@/utils/cellarReferenceStyle110';
import {
  EdgeFunctionError,
  invokeWithEdgeFunctionRetry,
  isProviderCreditExhausted,
} from '@/utils/edgeFunctionResilience';
import { cropImageRegion, cropImageRegionWithQuality, ImagePreparationError, NATIVE_IMAGE_PREPARATION_LIMITS, prepareImageForAnalysis, shouldRejectTextAnalysis, type ImageQualityReport } from '@/utils/imageAnalysis';
import { labelCropPadding } from '@/utils/imageCropGeometry';
import { createScanRequestBudget, cropQualityDeferral, deferRegion, MAX_MANUAL_REGION_REQUESTS, planAdditionalRegionAnalysis, planRegionAnalysis, regionPreflight, ScanRequestLimitError, type ScanRequestBudget } from '@/utils/scanAnalysisPolicy';
import { invokeEdgeFunction } from '@/utils/invokeEdgeFunction';
import { isMatchrimFixtureQaEnabled } from '@/utils/matchrimQaMode';
import { applyScanWineEvidence } from '@/utils/scanWineEvidence';
import { clusterScreenOverlayPins } from '@/utils/screenOverlayPins';
import { useOverlayViewport } from '@/hooks/useOverlayViewport';
import { formatScanRegionProgress, summarizeScanRegionProgress } from '@/utils/scanRegionProgress';
import { regionAnalysisErrorMessage } from '@/utils/regionAnalysisError';
import { manualWineIdentityNotice } from '@/utils/manualWineIdentityNotice';
import { nativeWineConsumerResult, nextNativeWineReview } from '@/utils/multiWineConsumer95';
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
  shouldRefineWineDetection,
  summarizeScanRegions,
  type ScanRegion,
  type ScanCoverage,
  type WineCandidate,
} from '@/utils/multiWineScan';
import { recordOwnedScanHistory } from '@/utils/scanHistory';
import { saveLabelBatch, type LabelSaveBatch, type LabelSaveCallback, type LabelSaveResult } from '@/utils/labelScanSave';

interface MultiWineLabelScannerProps {
  onExtractComplete: LabelSaveCallback;
}

type ScanPhase = 'idle' | 'quality' | 'profile' | 'detecting' | 'analyzing' | 'ready' | 'cancelled' | 'error';
type NativeResultView = 'scene' | 'wines' | 'compare';

interface ScanPerformance {
  qualityMs: number;
  profileMs: number;
  detectionMs: number;
  analysisMs: number;
  totalMs: number;
  concurrency: number;
  detectionCalls: number;
  detectionRefined: boolean;
  retries: number;
  edgeRequests: number;
  deferred: number;
}

const PHASE_LABELS: Record<ScanPhase, string> = {
  idle: 'Lista para escanear',
  quality: 'Comprobando imagen',
  profile: 'Cargando tu perfil',
  detecting: 'Localizando botellas y etiquetas',
  analyzing: 'Leyendo cada región por separado',
  ready: 'Lote listo para revisar',
  cancelled: 'Análisis cancelado',
  error: 'Análisis incompleto',
};

const statusLabel = (region: ScanRegion) => {
  if (region.error) return 'Error de análisis';
  if (region.status === 'recognized' && getSelectedCandidate(region)?.source === 'manual') return 'Identidad manual';
  if (region.status === 'recognized') return 'Reconocido';
  if (region.status === 'uncertain') return 'Dudoso';
  if (region.status === 'unrecognized') return region.fallback?.code === 'not_wine' ? 'Otra bebida' : 'Sin reconocer';
  if (region.status === 'discarded') return 'Descartado';
  if (region.status === 'deferred') return 'Sin analizar';
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

const userFacingScanError = (error: unknown) => {
  if (error instanceof ImagePreparationError) return error.message;
  if (isProviderCreditExhausted(error)) return 'La lectura de fotos no está disponible temporalmente. Conservamos la foto para que puedas reintentar más tarde.';
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

const MultiWineLabelScannerSession = ({ onExtractComplete }: MultiWineLabelScannerProps) => {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const [scanMode, setScanMode] = useState<'cloud' | 'local-single'>('cloud');
  const [localBatch, setLocalBatch] = useState(false);
  const [localReading, setLocalReading] = useState<{ regionId: string; value: LocalOCRResult106 } | null>(null);
  const nativeMasterUrl = isNative ? import.meta.env.VITE_MATCHRIM_MASTER_CATALOG_URL : undefined;
  const [preview, setPreview] = useState<string | null>(null);
  const [quality, setQuality] = useState<ImageQualityReport | null>(null);
  const [scanProfile, setScanProfile] = useState<ScanProfileSnapshot | null>(null);
  const [nativeVerdicts, setNativeVerdicts] = useState<NativeVerdicts159 | null>(null);
  const [regions, setRegions] = useState<ScanRegion[]>([]);
  const [coverage, setCoverage] = useState<ScanCoverage | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisConcurrency, setAnalysisConcurrency] = useState(0);
  const [scanMetrics, setScanMetrics] = useState<ScanPerformance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [batchLocked, setBatchLocked] = useState(false);
  const [saveResults, setSaveResults] = useState<Array<LabelSaveResult | undefined>>([]);
  const savingRef = useRef(false);
  const saveLifetime = useRef({ active: false, generation: 0 });
  const batchRef = useRef<(LabelSaveBatch & { groups: ReturnType<typeof getConfirmableWineGroups> }) | null>(null);
  const [nativeResultView, setNativeResultView] = useState<NativeResultView>('scene');
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const continuationRef = useRef<AbortController | null>(null);
  const lastFileRef = useRef<File | null>(null);
  const preparedSizeRef = useRef<{ width: number; height: number } | null>(null);
  const scanProfileRef = useRef<ScanProfileSnapshot | null>(null);
  const regionEditorBody = useRef<HTMLDivElement>(null);
  const regionEditorLayout = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!isNative || !selectedRegionId) return;
    // Opening another label must not inherit the previous label's reading position.
    const frame = requestAnimationFrame(() => {
      if (regionEditorLayout.current) regionEditorLayout.current.scrollTop = 0;
      if (regionEditorBody.current) regionEditorBody.current.scrollTop = 0;
      const header = regionEditorLayout.current?.firstElementChild;
      if (header instanceof HTMLElement) header.scrollTop = 0;
    });
    return () => cancelAnimationFrame(frame);
  }, [isNative, selectedRegionId]);

  useEffect(() => {
    if (!isNative || !selectedRegionId) return;
    let frame = 0;
    const revealFocusedField = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const body = regionEditorBody.current;
        const layout = regionEditorLayout.current;
        const field = document.activeElement;
        if (!body || !layout || !(field instanceof HTMLInputElement) || !body.contains(field)) return;
        // MAX text scrolls the outer layout; normal text scrolls the inner body.
        const scrollport = getComputedStyle(body).overflowY === 'visible' ? layout : body;
        const bounds = scrollport.getBoundingClientRect();
        const viewport = window.visualViewport;
        const top = Math.max(bounds.top, viewport?.offsetTop ?? 0);
        const bottom = Math.min(bounds.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight));
        const input = field.getBoundingClientRect();
        const inset = Math.min(8, Math.max(0, (bottom - top - input.height) / 2));
        if (bottom <= top) return;
        if (input.bottom > bottom - inset) scrollport.scrollTop += input.bottom - bottom + inset;
        else if (input.top < top + inset) scrollport.scrollTop -= top + inset - input.top;
      });
    };
    window.addEventListener('resize', revealFocusedField);
    window.addEventListener('focusin', revealFocusedField);
    window.addEventListener('input', revealFocusedField);
    window.visualViewport?.addEventListener('resize', revealFocusedField);
    window.visualViewport?.addEventListener('scroll', revealFocusedField);
    const observer = new ResizeObserver(revealFocusedField);
    const observeFrame = requestAnimationFrame(() => {
      const body = regionEditorBody.current;
      if (body) {
        observer.observe(body);
        for (const child of body.children) observer.observe(child);
      }
      if (regionEditorLayout.current) observer.observe(regionEditorLayout.current);
      revealFocusedField();
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(observeFrame);
      observer.disconnect();
      window.removeEventListener('resize', revealFocusedField);
      window.removeEventListener('focusin', revealFocusedField);
      window.removeEventListener('input', revealFocusedField);
      window.visualViewport?.removeEventListener('resize', revealFocusedField);
      window.visualViewport?.removeEventListener('scroll', revealFocusedField);
    };
  }, [isNative, selectedRegionId]);

  useLayoutEffect(() => {
    const lifetime = saveLifetime.current;
    lifetime.active = true;
    lifetime.generation += 1;
    return () => {
      lifetime.active = false;
      lifetime.generation += 1;
    };
  }, [user?.id]);

  useEffect(() => {
    abortRef.current?.abort();
    setRegions([]);
    setPreview(null);
    setSelectedRegionId(null);
    setScanProfile(null);
    setNativeVerdicts(null);
    setLocalReading(null);
    setLocalBatch(false);
    scanProfileRef.current = null;
    lastFileRef.current = null;
    setPhase('idle');
    return () => { abortRef.current?.abort(); };
  }, [user?.id]);

  const selectedRegion = regions.find((region) => region.id === selectedRegionId) ?? null;
  const selectedCandidate = selectedRegion ? getSelectedCandidate(selectedRegion) : null;
  const nativeConsumer = isNative ? nativeWineConsumerResult(selectedCandidate, scanProfile?.profile ?? null) : null;
  const selectedPersonalVerdict = isNative ? resolveNativeRescanVerdict159(user?.id ?? null, nativeVerdicts, selectedCandidate) : null;
  const nativeReviewTarget = isNative ? nextNativeWineReview(regions) : null;
  const summary = useMemo(() => summarizeScanRegions(regions), [regions]);
  const regionProgress = useMemo(() => formatScanRegionProgress(summarizeScanRegionProgress(regions)), [regions]);
  const continuationPlan = useMemo(() => preparedSizeRef.current
    ? planAdditionalRegionAnalysis(regions, preparedSizeRef.current.width, preparedSizeRef.current.height)
    : { automatic: [], deferred: [] }, [regions]);
  const nativeCloserPhotoCount = isNative ? regions.filter(region => region.status === 'deferred' && region.deferral?.code === 'resolution').length : 0;
  const duplicateGroups = useMemo(() => groupDuplicateWines(regions), [regions]);
  const confirmableGroups = useMemo(() => getConfirmableWineGroups(regions)
    .filter(group => !localBatch || !isPendingLocalIdentity109(group.candidate)), [regions, localBatch]);
  const savedCount = saveResults.filter((result) => result?.status === 'saved').length;
  const saveFailure = saveResults.find((result) => result && result.status !== 'saved');
  const overlay = useOverlayViewport(regions.length);
  const regionPinClusters = useMemo(() => clusterScreenOverlayPins(
    regions
      .filter((region) => region.status !== 'discarded')
      .map((region) => ({
        key: region.id,
        order: region.index,
        x: Math.max(5, Math.min(95, region.box.x + Math.min(5, region.box.width / 2))),
        y: Math.max(5, Math.min(95, region.box.y + Math.min(5, region.box.height / 2))),
        value: region,
      })),
    overlay.viewport,
  ), [regions, overlay.viewport]);
  const rankedGroups = useMemo(() => [...duplicateGroups].sort((a, b) => {
    const aRecognized = a.regionIds.some((id) => regions.some((region) => region.id === id && region.status === 'recognized'));
    const bRecognized = b.regionIds.some((id) => regions.some((region) => region.id === id && region.status === 'recognized'));
    if (aRecognized !== bRecognized) return bRecognized ? 1 : -1;
    return (b.candidate.affinity ?? -1) - (a.candidate.affinity ?? -1)
      || b.candidate.confidence - a.candidate.confidence;
  }), [duplicateGroups, regions]);
  const loading = phase === 'quality' || phase === 'profile' || phase === 'detecting' || phase === 'analyzing';
  const regionActionsLocked = batchLocked || loading;
  const manualLookupContext = { owner: user?.id ?? null, regionId: selectedRegionId, candidate: selectedCandidate,
    profile: scanProfile?.profile ?? null, locked: regionActionsLocked || saving || Boolean(batchRef.current) };
  const manualLookupKey = JSON.stringify(manualLookupContext);
  const currentManualLookupKey = useRef(manualLookupKey);
  currentManualLookupKey.current = manualLookupKey;
  const progress = phase === 'quality'
    ? 8
    : phase === 'profile' || phase === 'detecting'
      ? 24
      : phase === 'analyzing'
        ? 24 + Math.round(analysisProgress * 0.72)
        : phase === 'ready'
          ? 100
          : 0;

  const updateRegion = (regionId: string, updater: (region: ScanRegion) => ScanRegion) => {
    setRegions((current) => current.map((region) => region.id === regionId ? updater(region) : region));
  };

  const enrichCandidate = async (candidate: WineCandidate, signal: AbortSignal, budget: ScanRequestBudget) => {
    if (isNative && !isMatchrimFixtureQaEnabled && !independentGlobalProducer103(candidate)) {
      return applyScanWineEvidence({ ...candidate, uncertaintyReasons: [...new Set([...candidate.uncertaintyReasons,
        'La marca del vino no basta para confirmar la bodega. Revisa o elige su ficha en Winerim.'])] },
      scanProfileRef.current?.profile ?? null, null);
    }
    if (isNative && !isMatchrimFixtureQaEnabled && hasMissingVisibleQualifier102(candidate)) {
      return applyScanWineEvidence({ ...candidate, uncertaintyReasons: [...new Set([...candidate.uncertaintyReasons,
        'El nombre propuesto omite un calificador legible de la etiqueta. Revisa la referencia antes de elegir.'])] },
      scanProfileRef.current?.profile ?? null, null);
    }
    if (isNative && !isMatchrimFixtureQaEnabled && nativeMasterUrl && canAdmitNativeCatalogLookup97(candidate)) {
      const master = await lookupNativeMaster102(candidate, nativeMasterUrl, signal);
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if (master.status === 'verified') return applyNativeMaster102(candidate, scanProfileRef.current?.profile ?? null, master.record);
      if (master.status === 'ambiguous') return applyScanWineEvidence(candidate, scanProfileRef.current?.profile ?? null, null);
    }
    if (isNative && !isMatchrimFixtureQaEnabled && canAdmitNativeCatalogLookup97(candidate)) {
      const global = await lookupGlobalCatalogue103(candidate, signal);
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      if ('wine' in global) return applyGlobalCatalogue103(candidate, scanProfileRef.current?.profile ?? null, global.wine);
      if (global.status === 'ambiguous' || global.status === 'incomplete') return applyScanWineEvidence(candidate, scanProfileRef.current?.profile ?? null, null);
    }
    let enriched = candidate;
    const canResolveCanonically = candidate.confidence >= 0.72
      && candidate.evidence.length >= 2
      && candidate.uncertaintyReasons.length === 0;
    const shouldSearch = !isMatchrimFixtureQaEnabled && (isNative
      ? canAdmitNativeCatalogLookup97(candidate)
      : canResolveCanonically && budget.remaining > 0);
    if (shouldSearch && !isNative) budget.reserve(signal);
    const catalogMatch = !shouldSearch
      ? null
      : await findWinerimWineForLabel({
          name: candidate.name,
          producer: candidate.producer,
          vintage: candidate.vintage,
          region: candidate.region,
          country: candidate.country,
          inferredFields: candidate.inferredFields,
        }, isNative ? { signal } : undefined);
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');

    if (catalogMatch) {
      enriched = {
        ...candidate,
        name: catalogMatch.wine.name || candidate.name,
        producer: catalogMatch.wine.winery || candidate.producer,
        vintage: candidate.vintage,
        region: catalogMatch.wine.region || candidate.region,
        country: catalogMatch.wine.country || candidate.country,
        grapes: catalogMatch.wine.grapes?.length ? catalogMatch.wine.grapes : candidate.grapes,
        confidence: isNative ? candidate.confidence : Math.max(candidate.confidence, catalogMatch.confidence),
        source: candidate.source,
        evidence: [...candidate.evidence, 'Coincidencia en el catálogo Winerim'],
      };
    }

    return applyScanWineEvidence(enriched, scanProfileRef.current?.profile ?? null, catalogMatch?.wine);
  };

  const analyzeRegion = async (
    region: ScanRegion,
    imageDataUrl: string,
    signal: AbortSignal,
    budget: ScanRequestBudget,
    fixtureName?: string,
    onRetry?: () => void,
  ) => {
    updateRegion(region.id, (current) => ({ ...current, status: 'analyzing', error: null, fallback: null, deferral: null }));
    try {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const crop = await cropImageRegionWithQuality(imageDataUrl, region.box, labelCropPadding(region.box), 1600, signal);
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
      const cropDataUrl = crop.dataUrl;
      const qualityDeferral = cropQualityDeferral(crop.quality);
      if (qualityDeferral) return { ...deferRegion(region, qualityDeferral), cropDataUrl, cropGeometry: crop.geometry };
      const payload = await invokeWithEdgeFunctionRetry(
        () => {
          budget.reserve(signal);
          return invokeEdgeFunction<Record<string, unknown>>(
          'analyze-wine-region',
            {
              image: cropDataUrl,
              region_id: region.id,
              region_index: region.index,
              region_box: region.box,
              crop_box: crop.geometry.sourceBox,
              crop_pixels: crop.geometry.pixels,
              qa_fixture_name: fixtureName ?? null,
            },
            signal,
          );
        },
        signal,
        {
          maxAttempts: 3,
          onRetry: () => {
            onRetry?.();
          },
        },
      );
      let candidates = normalizeWineCandidates(payload, region.id);
      if (isNative) candidates = candidates.map(normalizeNativeYear105);
      if (candidates[0]) {
        const first = await enrichCandidate(candidates[0], signal, budget);
        candidates = [first, ...candidates.slice(1)];
      }
      return {
        ...region,
        cropDataUrl,
        cropGeometry: crop.geometry,
        deferral: null,
        candidates,
        selectedCandidateId: candidates[0]?.id ?? null,
        status: determineRegionStatus(candidates),
        fallback: normalizeRecognitionFallback(payload),
        error: null,
      } satisfies ScanRegion;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      if (error instanceof ScanRequestLimitError) return deferRegion(region, {
        code: 'request_limit', message: 'Pendiente de análisis: se alcanzó el límite de solicitudes de esta pasada. Puedes continuar con el siguiente lote o revisar esta región.',
      });
      return {
        ...region,
        status: 'unrecognized' as const,
        deferral: null,
        fallback: null,
        error: regionAnalysisErrorMessage(error, navigator.onLine),
      };
    }
  };

  const startScan = async (file: File) => {
    if (savingRef.current) return;
    saveLifetime.current.generation += 1;
    batchRef.current = null;
    setSaveResults([]);
    setBatchLocked(false);
    const scanStartedAt = globalThis.performance.now();
    const locally = isNative && scanMode === 'local-single';
    setLocalBatch(locally);
    setLocalReading(null);
    lastFileRef.current = file;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setConfirmed(false);
    setNativeResultView('scene');
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
    const budget = createScanRequestBudget();

    try {
      setPhase('quality');
      const prepared = await prepareImageForAnalysis(file, 2400, controller.signal, isNative ? NATIVE_IMAGE_PREPARATION_LIMITS : undefined);
      if (abortRef.current !== controller || controller.signal.aborted) return;
      preparedSizeRef.current = { width: prepared.width, height: prepared.height };
      const qualityFinishedAt = globalThis.performance.now();
      setPreview(prepared.dataUrl);
      setQuality(prepared.quality);
      if (shouldRejectTextAnalysis(prepared.quality)) {
        setErrorMessage('La imagen es demasiado pequeña y desenfocada para leer etiquetas. Acerca la cámara y enfoca el nombre o la bodega.');
        setPhase('error');
        return;
      }

      setPhase('profile');
      const nativeContext = isNative ? await loadNativeScanContext159(user?.id ?? null, controller.signal) : null;
      const profileSnapshot = nativeContext?.profile ?? await loadMatchrimScanProfile(user?.id ?? null, controller.signal);
      if (controller.signal.aborted) return;
      if (isNative) setNativeVerdicts(nativeContext?.verdicts ?? null);
      scanProfileRef.current = profileSnapshot;
      setScanProfile(profileSnapshot);
      const profileFinishedAt = globalThis.performance.now();
      if (locally) {
        setPhase('analyzing');
        const reading = await readLocalWineText106(prepared.dataUrl, controller.signal);
        if (abortRef.current !== controller || controller.signal.aborted) return;
        const regionId = `local-single-${reading.requestId}`;
        const candidate = localSingleCandidate109(reading, `${regionId}-candidate`);
        const region: ScanRegion = { id: regionId, index: 1, box: { x: 0, y: 0, width: 100, height: 100 },
          objectType: 'label', detectionConfidence: 0, quality: { glare: 'medium', occlusion: 'medium', legibility: 'limited' },
          status: candidate ? 'uncertain' : 'unrecognized', candidates: candidate ? [candidate] : [], selectedCandidateId: candidate?.id ?? null,
          duplicateCount: 1, cropDataUrl: prepared.dataUrl, error: null,
          fallback: candidate ? null : { code: 'insufficient_visible_text', message: 'No se lee suficiente texto. Prueba una foto mas cercana.', suggestedActions: ['Acercar la etiqueta', 'Escribir el nombre'] } };
        setLocalReading({ regionId, value: reading });
        setRegions([region]);
        setCoverage({ status: 'unknown', detectedObjects: 0, estimatedVisibleObjects: null, confidence: null,
          notes: ['Una etiqueta indicada por ti. No se ha buscado ni contado otras botellas.'] });
        setAnalysisProgress(100);
        setScanMetrics({ qualityMs: Math.round(qualityFinishedAt - scanStartedAt), profileMs: Math.round(profileFinishedAt - qualityFinishedAt),
          detectionMs: 0, analysisMs: Math.round(globalThis.performance.now() - profileFinishedAt), totalMs: Math.round(globalThis.performance.now() - scanStartedAt),
          concurrency: 1, detectionCalls: 0, detectionRefined: false, retries: 0, edgeRequests: 0, deferred: 0 });
        setPhase('ready'); setSelectedRegionId(regionId);
        trackAppEvent('multi_wine_label_scan_completed', { userId: user?.id,
          metadata: { regions: 1, reading_mode: 'device-single', recognized: 0, edge_requests: 0, detection_calls: 0 } });
        return;
      }
      setPhase('detecting');
      const detectImage = async (image: string, tileId: string) => {
        detectionCalls += 1;
        return invokeWithEdgeFunctionRetry(
          () => {
            budget.reserve(controller.signal);
            return invokeEdgeFunction<Record<string, unknown>>(
            'detect-wine-regions',
            { image, qa_fixture_name: file.name, detection_tile: tileId },
            controller.signal,
            );
          },
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
                  await cropImageRegion(prepared.dataUrl, tile.box, 0, 2400, controller.signal),
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
        const refined = mergeWineDetectionTileResults([
          { tile: fullTile, payload: detection },
          ...completedRegionalResults,
        ], { failedTiles: regionalResults.length - completedRegionalResults.length });
        detected = refined.regions;
        resolvedCoverage = refined.coverage;
        detectionRefined = refined.refined;
      }
      const detectionFinishedAt = globalThis.performance.now();
      setCoverage(resolvedCoverage);
      if (detected.length === 0) {
        setRegions([]);
        setErrorMessage('No he localizado botellas analizables. Acerca la cámara o evita reflejos fuertes.');
        setPhase('error');
        return;
      }

      const plan = planRegionAnalysis(detected, prepared.width, prepared.height);
      setRegions([...plan.automatic, ...plan.deferred].sort((a, b) => a.index - b.index));
      setSelectedRegionId(null);
      setPhase('analyzing');
      let completed = 0;
      const connection = (navigator as Navigator & {
        connection?: { effectiveType?: string; saveData?: boolean };
      }).connection ?? null;
      const concurrency = getRegionAnalysisConcurrency(plan.automatic.length, connection);
      setAnalysisConcurrency(concurrency);
      const analyzedByPriority = await mapWithConcurrency(plan.automatic, concurrency, async (region) => {
        const result = await analyzeRegion(region, prepared.dataUrl, controller.signal, budget, file.name, () => {
          retries += 1;
        });
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        completed += 1;
        setAnalysisProgress(Math.round(completed / plan.automatic.length * 100));
        updateRegion(region.id, () => result);
        return result;
      });
      if (controller.signal.aborted) return;
      const analyzed = [...analyzedByPriority, ...plan.deferred].sort((left, right) => left.index - right.index);
      const analysisFinishedAt = globalThis.performance.now();
      setRegions(analyzed);
      const scanPerformance = {
        qualityMs: Math.round(qualityFinishedAt - scanStartedAt),
        profileMs: Math.round(profileFinishedAt - qualityFinishedAt),
        detectionMs: Math.round(detectionFinishedAt - profileFinishedAt),
        analysisMs: Math.round(analysisFinishedAt - detectionFinishedAt),
        totalMs: Math.round(analysisFinishedAt - scanStartedAt),
        concurrency,
        detectionCalls,
        detectionRefined,
        retries,
        edgeRequests: budget.used,
        deferred: summarizeScanRegions(analyzed).deferred,
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
          profile_ms: scanPerformance.profileMs,
          detection_ms: scanPerformance.detectionMs,
          analysis_ms: scanPerformance.analysisMs,
          total_ms: scanPerformance.totalMs,
          concurrency: scanPerformance.concurrency,
          detection_calls: scanPerformance.detectionCalls,
          detection_refined: scanPerformance.detectionRefined,
          retries: scanPerformance.retries,
          edge_requests: scanPerformance.edgeRequests,
          deferred_regions: scanPerformance.deferred,
        },
      });
    } catch (error) {
      if (abortRef.current !== controller || controller.signal.aborted) return;
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (abortRef.current === controller) setPhase('cancelled');
        return;
      }
      console.error('[multi-label] Scan failed:', error);
      setErrorMessage(locally ? 'No se pudo leer la etiqueta en este iPhone. La foto no se ha enviado; puedes reintentar o elegir otra.' : userFacingScanError(error));
      setPhase('error');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (savingRef.current) return;
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
    setRegions((current) => current.map((region) => region.status === 'analyzing'
      ? { ...region, status: 'pending' as const } : region));
    setPhase('cancelled');
  };

  const resetScan = () => {
    if (savingRef.current) return;
    saveLifetime.current.generation += 1;
    batchRef.current = null;
    setSaveResults([]);
    setBatchLocked(false);
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
    setLocalReading(null);
    setLocalBatch(false);
    setConfirmed(false);
    lastFileRef.current = null;
    preparedSizeRef.current = null;
    setPhase('idle');
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const retryScan = () => {
    if (lastFileRef.current) void startScan(lastFileRef.current);
  };

  const continueScan = async () => {
    if (localBatch) return;
    if (batchRef.current || loading || savingRef.current || continuationRef.current || !preview || !preparedSizeRef.current) return;
    const plan = planAdditionalRegionAnalysis(regions, preparedSizeRef.current.width, preparedSizeRef.current.height);
    if (!plan.automatic.length) return;
    const controller = new AbortController();
    abortRef.current = controller;
    continuationRef.current = controller;
    const budget = createScanRequestBudget();
    const startedAt = globalThis.performance.now();
    let completed = 0;
    let retries = 0;
    const connection = (navigator as Navigator & {
      connection?: { effectiveType?: string; saveData?: boolean };
    }).connection ?? null;
    const concurrency = getRegionAnalysisConcurrency(plan.automatic.length, connection);
    setSelectedRegionId(null);
    setConfirmed(false);
    setErrorMessage(null);
    setAnalysisProgress(0);
    setAnalysisConcurrency(concurrency);
    setPhase('analyzing');
    try {
      const results = await mapWithConcurrency(plan.automatic, concurrency, async (region) => {
        const result = await analyzeRegion(region, preview, controller.signal, budget, lastFileRef.current?.name, () => { retries += 1; });
        if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        completed += 1;
        setAnalysisProgress(Math.round(completed / plan.automatic.length * 100));
        updateRegion(region.id, () => result);
        return result;
      });
      if (controller.signal.aborted || abortRef.current !== controller) return;
      const replacements = new Map([...plan.deferred, ...results].map((region) => [region.id, region]));
      const merged = regions.map((region) => replacements.get(region.id) ?? region);
      setRegions(merged);
      setScanMetrics((current) => current ? { ...current, deferred: summarizeScanRegions(merged).deferred } : null);
      setPhase('ready');
    } catch (error) {
      if (controller.signal.aborted || abortRef.current !== controller) return;
      setErrorMessage(userFacingScanError(error));
      setPhase('error');
    } finally {
      if (abortRef.current === controller && saveLifetime.current.active) {
        const elapsed = Math.round(globalThis.performance.now() - startedAt);
        setScanMetrics((current) => current ? {
          ...current, analysisMs: current.analysisMs + elapsed, totalMs: current.totalMs + elapsed,
          retries: current.retries + retries, edgeRequests: current.edgeRequests + budget.used, concurrency,
        } : null);
      }
      if (continuationRef.current === controller) continuationRef.current = null;
    }
  };

  const reanalyzeSelected = async () => {
    if (batchRef.current || !selectedRegion || !preview || !preparedSizeRef.current || loading) return;
    const preflight = regionPreflight(selectedRegion, preparedSizeRef.current.width, preparedSizeRef.current.height, true);
    if (preflight) {
      updateRegion(selectedRegion.id, () => deferRegion(selectedRegion, preflight));
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    setAnalysisProgress(0);
    try {
      if (localBatch) {
        const reading = await readLocalWineText106(selectedRegion.cropDataUrl || preview, controller.signal);
        if (abortRef.current !== controller || controller.signal.aborted) return;
        const candidate = localSingleCandidate109(reading, `${selectedRegion.id}-candidate`);
        updateRegion(selectedRegion.id, current => ({ ...current, status: candidate ? 'uncertain' : 'unrecognized',
          candidates: candidate ? [candidate] : [], selectedCandidateId: candidate?.id ?? null, error: null,
          fallback: candidate ? null : { code: 'insufficient_visible_text', message: 'No se lee suficiente texto en la etiqueta.', suggestedActions: ['Acercar la etiqueta'] } }));
        setLocalReading({ regionId: selectedRegion.id, value: reading });
        setAnalysisProgress(100); setPhase('ready'); return;
      }
      const result = await analyzeRegion(selectedRegion, preview, controller.signal, createScanRequestBudget(MAX_MANUAL_REGION_REQUESTS), lastFileRef.current?.name);
      if (controller.signal.aborted || (isNative && abortRef.current !== controller)) return;
      updateRegion(selectedRegion.id, () => result);
      setAnalysisProgress(100);
      setPhase('ready');
    } catch (error) {
      if (controller.signal.aborted || (isNative && abortRef.current !== controller)) return;
      setErrorMessage(localBatch ? 'No se pudo volver a leer la etiqueta en este iPhone. La foto no se ha enviado.' : userFacingScanError(error));
      setPhase('error');
    }
  };

  const discardSelected = () => {
    if (batchRef.current || loading || !selectedRegion) return;
    updateRegion(selectedRegion.id, (current) => ({ ...current, status: 'discarded' }));
    setSelectedRegionId(null);
  };

  const selectCandidate = (candidateId: string) => {
    if (batchRef.current || loading || !selectedRegion) return;
    updateRegion(selectedRegion.id, (current) => {
      const candidate = current.candidates.find((item) => item.id === candidateId);
      return {
        ...current,
        selectedCandidateId: candidateId,
        status: candidate ? determineRegionStatus([candidate]) : 'unrecognized',
        error: null,
        fallback: null,
      };
    });
  };

  const confirmSelectedCandidate = () => {
    if (batchRef.current || loading || !selectedRegion || !selectedCandidate) return;
    if (localBatch && isPendingLocalIdentity109(selectedCandidate)) {
      toast.error('Elige una referencia o escribe el nombre del vino antes de confirmar.'); return;
    }
    updateRegion(selectedRegion.id, (current) => ({
      ...current,
      status: 'recognized',
      error: null,
      fallback: null,
      candidates: current.candidates.map((candidate) => candidate.id === selectedCandidate.id
        ? confirmWineCandidateIdentity(candidate)
        : candidate),
    }));
  };

  const editCandidate = (patch: Pick<Partial<WineCandidate>, 'name' | 'producer'>) => {
    if (batchRef.current || loading || !selectedRegion || !selectedCandidate) return;
    updateRegion(selectedRegion.id, (current) => ({
      ...current,
      status: localBatch && isPendingLocalIdentity109({ name: patch.name ?? selectedCandidate.name }) ? 'uncertain' : 'recognized',
      error: null,
      fallback: null,
      candidates: current.candidates.map((candidate) => candidate.id === selectedCandidate.id
        ? correctWineCandidateIdentity(candidate, patch)
        : candidate),
    }));
  };

  const editNativeIdentity218 = (identity: NativeIdentity218) => {
    if (!isNative || batchRef.current || loading || !selectedRegion || !selectedCandidate) return;
    updateRegion(selectedRegion.id, current => {
      if (current.selectedCandidateId !== selectedCandidate.id || current.status === 'discarded') return current;
      const candidate = current.candidates.find(value => value.id === selectedCandidate.id);
      if (!candidate || candidate.name !== selectedCandidate.name || candidate.producer !== selectedCandidate.producer
        || candidate.vintage !== selectedCandidate.vintage) return current;
      const corrected = correctNativeIdentity218(candidate, identity);
      if (!corrected || corrected === candidate) return current;
      return { ...current, status: localBatch && isPendingLocalIdentity109(corrected) ? 'uncertain' : 'recognized', error: null, fallback: null,
        candidates: current.candidates.map(value => value.id === candidate.id ? corrected : value) };
    });
  };

  const identifySelectedManually = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (batchRef.current || loading || !selectedRegion) return;
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
  };

  const moveSelection = (direction: -1 | 1) => {
    if (!selectedRegion) return;
    const currentIndex = regions.findIndex((region) => region.id === selectedRegion.id);
    const target = regions[currentIndex + direction];
    if (target) setSelectedRegionId(target.id);
  };

  const confirmBatch = async () => {
    if (savingRef.current || confirmed || !saveLifetime.current.active) return;
    if (batchRef.current && batchRef.current.results.filter((result) => result?.status === 'saved').length === batchRef.current.wines.length) return;
    const groups = batchRef.current?.groups ?? getConfirmableWineGroups(regions).filter((group) => group.candidate.name
      && (!localBatch || !isPendingLocalIdentity109(group.candidate)));
    if (!groups.length) {
      toast.error('No hay referencias confirmables en este lote');
      return;
    }
    if (!batchRef.current) {
      batchRef.current = {
        ownerId: user?.id ?? null,
        groups,
        wines: groups.map(({ candidate }) => {
          const identity = { name: candidate.name, producer: candidate.producer,
            vintage: candidate.vintage, region: candidate.region, country: candidate.country };
          const evidence = isNative && candidate.sensorySource === 'catalog' && candidate.canonicalId && candidate.sensoryAttributes
            ? makeCellarCatalogEvidence(identity, candidate.canonicalId, candidate.sensoryAttributes) : null;
          const masterAudit = isNative ? nativeMasterAudit102(candidate) : null;
          const global = isNative && isGlobalWine103(candidate, candidate.globalRecord) ? candidate.globalRecord : null;
          const publicReference = global ? makeCellarPublicReference107(candidate, global) : null;
          const referenceStyle = global ? makeCellarReferenceStyle110(candidate, global, scanProfileRef.current) : null;
          const details = evidence || publicReference ? withCellarInitialAffinity({ ...identity,
            sensory_attributes: candidate.sensoryAttributes,
            place_details: { ...(evidence ? { bodega_sensory_evidence: evidence } : {}),
              ...(publicReference ? { winerim_public_catalogue: publicReference } : {}),
              ...(referenceStyle ? { matchrim_reference_style110: referenceStyle } : {}),
              ...(masterAudit ? { winerim_master_evidence: masterAudit } : {}) } }, scanProfileRef.current, 'saved') : null;
          return {
          nombre: candidate.name,
          productor: candidate.producer,
          ...(global?.photo ? { imagen_url: global.photo } : {}),
          anada: candidate.vintage,
          region: candidate.region,
          pais: candidate.country,
          uvas: candidate.grapes,
          alcohol: candidate.alcohol,
          notas_cata: candidate.evidence.join('. ') || null,
          matchrim_affinity: candidate.affinity,
          sensory_attributes: candidate.sensoryAttributes,
          affinity_reason: candidate.affinityReason,
          affinity_details: details,
          };
        }),
        results: [],
      };
    }
    const batch = batchRef.current;
    const generation = saveLifetime.current.generation;
    const isCurrent = () => saveLifetime.current.active && saveLifetime.current.generation === generation;
    const historyContext = { ownerId: batch.ownerId, isCurrent };
    savingRef.current = true;
    setSaving(true);
    setBatchLocked(true);
    const outcome = await saveLabelBatch(batch, onExtractComplete, isCurrent, () => setSaveResults([...batch.results]));
    if (!isCurrent()) return;
    savingRef.current = false;
    setSaving(false);
    if (outcome !== 'confirmed') return;
    recordOwnedScanHistory(historyContext, {
      type: 'label',
      title: `${groups.length} referencia${groups.length === 1 ? '' : 's'} confirmada${groups.length === 1 ? '' : 's'}`,
      subtitle: `${regions.length} objetos · ${summary.uncertain} dudosos · ${summary.unrecognized} sin reconocer${summary.errors ? ` · ${summary.errors} con error tecnico` : ''}`,
      route: '/escanear/etiqueta',
      payload: {
        batch: groups.map((group) => ({ name: group.candidate.name, count: group.count, affinity: group.candidate.affinity ?? null })),
      },
    });
    setConfirmed(true);
    toast.success(`Lote confirmado: ${groups.length} referencias`);
  };

  const scanDiagnostics = <>
    <div className="mt-1 text-xs matchrim-muted">
      {quality ? `${quality.megapixels} MP · brillo ${quality.brightness ?? '-'} · contraste ${quality.contrast ?? '-'}` : 'Preparando imagen'}
    </div>
    {(phase === 'analyzing' || phase === 'ready' || phase === 'cancelled') && regions.length > 0 && (
      <div className="mt-1 text-xs text-slate-600" role="status" data-testid="scan-region-progress">
        {regionProgress}
      </div>
    )}
    {phase === 'ready' && scanMetrics && (
      <div className="mt-1 text-xs matchrim-muted" data-testid="scan-performance-summary">
        {regions.length} regiones en {(scanMetrics.totalMs / 1000).toFixed(1)} s
        {scanMetrics.detectionRefined ? ' · detección refinada por zonas' : ''}
        {scanMetrics.retries > 0 ? ` · ${scanMetrics.retries} reintento${scanMetrics.retries === 1 ? '' : 's'}` : ''}
      </div>
    )}
  </>;
  const candidateDiagnostics = selectedCandidate && selectedRegion && <>
    <div className="matchrim-data-rail grid grid-cols-3 gap-2 rounded-lg px-2 py-3 text-center text-xs text-slate-500">
      <div><span className="block text-lg font-bold text-slate-900">{Math.round(selectedRegion.detectionConfidence * 100)}%</span>Detección</div>
      <div><span className="block text-lg font-bold text-slate-900">{selectedCandidate.source === 'manual' ? 'Por ti' : `${Math.round(selectedCandidate.confidence * 100)}%`}</span>Identidad</div>
      <div><span className="block text-lg font-bold text-slate-900">{selectedCandidate.affinityConfidence == null ? '-' : `${Math.round(selectedCandidate.affinityConfidence * 100)}%`}</span>Respaldo afinidad</div>
    </div>
    {isNative && <p className="text-xs text-stone-600" title="Confianza orientativa, sin validación estadística independiente.">Señales orientativas · sin calibrar</p>}
    {selectedCandidate.affinityReason && (
      <p className="text-sm leading-6 text-slate-600">{selectedCandidate.affinityReason}</p>
    )}
    {selectedCandidate.uncertaintyReasons.length > 0 && (
      <div className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3 py-3 text-sm text-amber-950">
        <div className="font-semibold">Duda:</div>
        <p className="mt-1">{selectedCandidate.uncertaintyReasons.join(' ')}</p>
      </div>
    )}
  </>;
  const identityEvidence = selectedCandidate && selectedCandidate.evidence.length > 0 && (
    <div className="text-sm">
      <div className="font-semibold text-slate-900">Evidencia de identidad</div>
      <ul className="mt-1 space-y-1 text-slate-600">{selectedCandidate.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
  const contextGuidance = selectedCandidate && selectedRegion && <AiRimContextGuide
    profile={scanProfile?.profile ?? null}
    context="label"
    name={selectedCandidate.name}
    identityConfidence={selectedCandidate.confidence}
    identityReviewedByUser={selectedCandidate.source === 'manual'}
    catalogIdentityLinked={isNative ? nativeConsumer?.catalogIdentityLinked : Boolean(selectedCandidate.originalSheet?.detailVerified)}
    affinity={isNative && !nativeConsumer?.canExplainAffinity ? null : selectedCandidate.affinity}
    attributes={isNative && !nativeConsumer?.canExplainAffinity ? null : selectedCandidate.sensoryAttributes}
    sensorySource={selectedCandidate.sensorySource ?? 'inference'}
    uncertaintyReasons={selectedCandidate.uncertaintyReasons}
    hasAlternatives={selectedRegion.candidates.length > 1 || duplicateGroups.length > 1}
    primaryAction={!regionActionsLocked && selectedRegion.status === 'uncertain'
      ? { label: 'Confirmar este candidato', onClick: confirmSelectedCandidate }
      : null}
    secondaryAction={!regionActionsLocked && selectedRegion.status === 'uncertain'
      ? { label: 'Reanalizar región', onClick: () => void reanalyzeSelected() }
      : null}
  />;
  const affinityExplanation = selectedCandidate && (isNative ? <NativeAffinitySummary
    profile={scanProfile?.profile ?? null} score={selectedCandidate.affinity}
    attributes={selectedCandidate.sensoryAttributes} sensorySource={selectedCandidate.sensorySource ?? 'inference'}
    catalogIdentityLinked={Boolean(nativeConsumer?.catalogIdentityLinked)} personalRating={selectedPersonalVerdict}
    personalHistoryUnavailable={Boolean(user && nativeVerdicts?.status === 'unavailable')}
  /> : <AffinityExplanation
    profile={scanProfile?.profile ?? null}
    wineKey={selectedCandidate.id}
    score={selectedCandidate.affinity}
    identificationConfidence={selectedCandidate.confidence}
    identityReviewedByUser={selectedCandidate.source === 'manual'}
    attributes={selectedCandidate.sensoryAttributes}
    sensorySource={selectedCandidate.sensorySource ?? 'inference'}
    catalogIdentityLinked={isNative ? Boolean(nativeConsumer?.catalogIdentityLinked) : Boolean(selectedCandidate.originalSheet?.detailVerified)}
  />);
  const referenceReview = selectedCandidate && selectedRegion && <>
    <WinerimOriginalSheet sheet={selectedCandidate.originalSheet} />
    {!localBatch && !selectedCandidate.originalSheet?.detailVerified && (!isNative || !selectedCandidate.globalRecord)
      && (!isNative || selectedCandidate.source !== 'manual') && <WinerimSheetLookup identity={{
      name: selectedCandidate.name, producer: selectedCandidate.producer, vintage: selectedCandidate.vintage,
      inferredFields: selectedCandidate.inferredFields,
      region: selectedCandidate.inferredFields.includes('region') ? null : selectedCandidate.region,
      country: selectedCandidate.inferredFields.some(field => /^(country|pais|país)$/i.test(field)) ? null : selectedCandidate.country,
    }} onVerified={(sheet) => {
      updateRegion(selectedRegion.id, current => ({ ...current, candidates: current.candidates.map(candidate => {
        if (candidate.id !== selectedCandidate.id) return candidate;
        const catalog = catalogWineFromVerifiedSheet(candidate, sheet);
        return catalog ? applyScanWineEvidence(candidate, scanProfileRef.current?.profile ?? null, catalog) : candidate;
      }) }));
    }} />}
    {isNative && !regionActionsLocked && <GlobalWinePicker103
      key={manualLookupKey} candidate={selectedCandidate} contextKey={manualLookupKey}
      ownerId={user?.id ?? null} savedVerdicts={nativeVerdicts}
      disabled={manualLookupContext.locked} profile={scanProfile?.profile ?? null}
      onConfirmed={confirmed => {
        if (currentManualLookupKey.current !== manualLookupKey) return;
        const expected = selectedCandidate;
        updateRegion(selectedRegion.id, current => {
          if (current.selectedCandidateId !== expected.id) return current;
          const candidate = current.candidates.find(value => value.id === expected.id);
          if (!candidate || candidate.name !== expected.name || candidate.producer !== expected.producer || candidate.vintage !== expected.vintage) return current;
          return isGlobalWine103(confirmed, confirmed.globalRecord) ? { ...current, status: 'recognized', error: null, fallback: null,
            candidates: current.candidates.map(value => value.id === expected.id ? confirmed : value) } : current;
        });
      }}
    />}
    {!isNative && selectedCandidate.source === 'manual' && (
      <div role="status" data-testid="manual-identity-notice" className="rounded-lg border-l-4 border-slate-500 bg-slate-50 px-3 py-2 text-sm text-slate-800">
        {manualWineIdentityNotice(selectedCandidate.affinity)}
      </div>
    )}
    {isNative ? <NativeLabelIdentityEditor218 key={selectedCandidate.id} identity={selectedCandidate}
      disabled={regionActionsLocked} onApply={editNativeIdentity218} /> : <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium text-slate-800">
        Vino
        <Input id="region-wine-name" disabled={regionActionsLocked} className="mt-1 min-h-11" value={selectedCandidate.name} onChange={(event) => editCandidate({ name: event.target.value })} />
      </label>
      <label className="text-sm font-medium text-slate-800">
        Bodega
        <Input disabled={regionActionsLocked} className="mt-1 min-h-11" value={selectedCandidate.producer ?? ''} onChange={(event) => editCandidate({ producer: event.target.value || null })} />
      </label>
    </div>}
  </>;
  const sceneDiagnostics = <>
    {summary.deferred > 0 && (
      <div className="border-l-4 border-stone-400 bg-stone-50 px-3 py-3 text-sm text-stone-800" data-testid="scan-deferred-summary" role="status">
        <strong>{summary.deferred} regiones sin analizar.</strong> Se conservan en la escena y en la lista; no cuentan como vinos sin reconocer. Continúa la lectura pendiente o revisa los recortes con poca calidad.
      </div>
    )}
    <div className="matchrim-data-rail grid grid-cols-3 gap-2 break-words rounded-lg px-2 py-3 text-center sm:grid-cols-5">
      <div><div className="text-xl font-bold text-emerald-700">{summary.recognized}</div><div className="text-xs text-slate-500">Reconocidos</div></div>
      <div><div className="text-xl font-bold text-amber-700">{summary.uncertain}</div><div className="text-xs text-slate-500">Dudosos</div></div>
      <div><div className="text-xl font-bold text-red-700">{summary.unrecognized}</div><div className="text-xs text-slate-500">Sin reconocer</div></div>
      <div className="hidden sm:block"><div className="text-xl font-bold text-slate-800">{duplicateGroups.length}</div><div className="text-xs text-slate-500">Referencias</div></div>
      <div className="hidden sm:block"><div className="text-xl font-bold text-slate-800">{regions.length}</div><div className="text-xs text-slate-500">Regiones</div></div>
    </div>
    {summary.errors > 0 && (
      <p role="status" className="text-sm text-red-800" data-testid="scan-technical-errors">
        {summary.errors} regiones con error técnico. No cuentan como vinos sin reconocer; puedes reintentar cada región.
      </p>
    )}
    <div className={`rounded-lg border-l-4 px-3 py-3 text-sm ${coverage?.status === 'reported_complete' ? 'border-emerald-600 bg-emerald-50 text-emerald-950' : coverage?.status === 'partial' ? 'border-amber-500 bg-amber-50 text-amber-950' : 'border-slate-400 bg-slate-50 text-slate-800'}`}>
      <div className="flex items-center gap-2 font-semibold">
        <Eye className="h-4 w-4" />
        {coverage?.status === 'reported_complete'
          ? 'Detección estimada completa'
          : coverage?.status === 'partial'
            ? 'Cobertura parcial'
            : 'Cobertura sin verificar'}
      </div>
      <p className="mt-1 leading-5">
        {coverage?.estimatedVisibleObjects
          ? `${coverage.detectedObjects} regiones de unos ${coverage.estimatedVisibleObjects} objetos estimados. No es un inventario confirmado.`
          : localBatch ? 'Una etiqueta seleccionada para lectura local. No se ha hecho una deteccion multibotella.'
            : `${regions.length} regiones detectadas. No sabemos cuántas botellas visibles quedaron fuera.`}
      </p>
      {coverage?.notes.length ? (
        <details className="mt-2 text-xs opacity-80">
          <summary className="min-h-11 cursor-pointer py-3">Detalles de la detección</summary>
          <p>{coverage.notes.join(' ')}</p>
        </details>
      ) : null}
    </div>
  </>;

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
              <h2 className="text-lg font-bold text-slate-950">{isNative && scanMode === 'local-single' ? 'Fotografía una etiqueta' : 'Fotografía las botellas'}</h2>
              <p className="mt-1 max-w-md text-sm leading-5 text-slate-600">
                {isNative && scanMode === 'local-single' ? 'La foto se queda en este iPhone. La busqueda en Winerim usa solo el texto leido.' : 'Puede haber una o varias. Revisarás cada identidad antes de confirmar.'}
              </p>
            </div>
          </div>
          {isNative && localOCRAvailable106() && <div role="group" aria-label="Tipo de lectura" className="mt-4 grid grid-cols-2 gap-2 [.matchrim-accessibility-text_&]:grid-cols-1">
            <Button type="button" variant={scanMode === 'local-single' ? 'default' : 'outline'} aria-pressed={scanMode === 'local-single'} disabled={loading || saving}
              className="h-auto min-h-11 gap-2 whitespace-normal py-3" onClick={() => setScanMode('local-single')}><Smartphone aria-hidden="true" className="h-4 w-4 shrink-0" />Una etiqueta</Button>
            <Button type="button" variant={scanMode === 'cloud' ? 'default' : 'outline'} aria-pressed={scanMode === 'cloud'} disabled={loading || saving}
              className="h-auto min-h-11 gap-2 whitespace-normal py-3" onClick={() => setScanMode('cloud')}><ScanLine aria-hidden="true" className="h-4 w-4 shrink-0" />Varias botellas</Button>
          </div>}
          <div className="scan-upload-actions mt-5 grid gap-2 sm:grid-cols-2">
            <Button type="button" disabled={loading || saving} className="matchrim-pressable min-h-12 gap-2 bg-red-900 hover:bg-red-800" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="h-4 w-4" /> Hacer foto
            </Button>
            <Button type="button" disabled={loading || saving} variant="outline" className="matchrim-pressable min-h-12 gap-2 border-slate-300 bg-white" onClick={() => fileInputRef.current?.click()}>
              <FolderOpen className="h-4 w-4" /> Elegir de galería
            </Button>
          </div>
          {loading && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="flex items-center gap-2 text-sm text-slate-700"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />{PHASE_LABELS[phase]}</p>
              <Button type="button" variant="outline" className="min-h-11 gap-2 bg-white" onClick={cancelScan}><X className="h-4 w-4" /> Cancelar</Button>
            </div>
          )}
          {(phase === 'error' || phase === 'cancelled') && (
            <div role={phase === 'error' ? 'alert' : 'status'} data-testid={phase === 'error' ? 'scan-input-error' : 'scan-input-cancelled'} className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-800">
              <p className="font-semibold">{phase === 'error' ? 'No se pudo preparar la foto' : PHASE_LABELS.cancelled}</p>
              {errorMessage && <p className="mt-1 leading-5">{errorMessage}</p>}
              {lastFileRef.current && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="min-h-11 gap-2 bg-white" onClick={retryScan}><RefreshCw className="h-4 w-4" /> Reintentar</Button>
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 bg-white" onClick={resetScan} aria-label="Descartar imagen"><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="matchrim-surface flex flex-wrap items-center justify-between gap-3 rounded-lg p-4">
            <div>
              <div className="text-sm font-semibold text-slate-950" aria-live="polite">{localBatch && phase === 'analyzing' ? 'Leyendo en este iPhone' : PHASE_LABELS[phase]}</div>
              {isNative ? <details data-testid="native-scan-diagnostics">
                <summary className="min-h-11 cursor-pointer py-3 text-sm text-stone-600">Detalles del análisis</summary>
                {scanDiagnostics}
              </details> : scanDiagnostics}
            </div>
            <div className="flex gap-2">
              {loading && (
                <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" onClick={cancelScan}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
              )}
              {phase === 'error' && regions.length === 0 && lastFileRef.current && (
                <Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" onClick={retryScan}>
                  <RefreshCw className="h-4 w-4" /> Reintentar
                </Button>
              )}
              {!loading && (
                <Button type="button" variant="outline" size="icon" className="matchrim-pressable h-11 w-11 bg-white" onClick={resetScan} disabled={saving} aria-label="Cerrar análisis">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {(loading || (!isNative && phase === 'ready')) && <Progress value={progress} aria-label="Progreso estimado del escaneo de etiquetas" className="h-2" />}

          {isNative && phase === 'ready' && <section className="min-w-0 space-y-2 break-words" aria-label="Revisión de vinos">
            <p role="status" className="text-sm text-stone-700">{nativeReviewTarget
              ? confirmableGroups.length > 0 ? 'Hay referencias disponibles para confirmar.' : 'Revisa una referencia antes de guardarla.'
              : 'No quedan vinos por revisar en esta foto.'}</p>
            <Button type="button" disabled={saving} className="h-auto min-h-12 w-full gap-2 whitespace-normal bg-red-950 py-3" onClick={() => {
              if (nativeReviewTarget) { setNativeResultView('wines'); setSelectedRegionId(nativeReviewTarget.id); }
              else resetScan();
            }}><Eye aria-hidden="true" className="h-4 w-4 shrink-0" />{nativeReviewTarget ? 'Revisar vinos' : 'Elegir otra foto'}</Button>
          </section>}

          {quality?.warnings.length ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Calidad con avisos</div>
              <ul className="mt-2 space-y-1">{quality.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
            </div>
          ) : null}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{errorMessage}</div>
          )}

          {continuationPlan.automatic.length > 0 && !batchLocked && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-stone-400 bg-stone-50 p-3" data-testid="scan-continue-batch">
              <p className="text-sm text-stone-800">{isNative ? <>
                Puedes seguir leyendo {continuationPlan.automatic.length + continuationPlan.deferred.length} zonas de esta foto.
                {nativeCloserPhotoCount > 0 && <> Para otras {nativeCloserPhotoCount}, haz una foto más cercana.</>}
              </> : <>{continuationPlan.automatic.length + continuationPlan.deferred.length} regiones pendientes de lectura.</>}</p>
              <Button type="button" variant="outline" disabled={loading || saving} className="min-h-11 max-w-full gap-2 whitespace-normal bg-white" onClick={() => void continueScan()}>
                <ScanLine aria-hidden="true" className="h-4 w-4 shrink-0" /> {`Analizar siguientes ${continuationPlan.automatic.length}`}
              </Button>
            </div>
          )}

          <div
            ref={overlay.ref}
            hidden={isNative && regions.length > 0 && nativeResultView !== 'scene'}
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
            {regions.filter((region) => region.status !== 'discarded' && region.id === selectedRegionId).map((region) => (
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
              {isNative && (
                <div className="matchrim-result-tabs grid grid-cols-[repeat(auto-fit,minmax(min(6rem,100%),1fr))] rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Vista de resultados">
                  {([
                    ['scene', 'Escena'],
                    ['wines', `Vinos (${rankedGroups.length})`],
                    ['compare', 'Comparar'],
                  ] as const).map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      role="tab"
                      aria-selected={nativeResultView === view}
                      onClick={() => setNativeResultView(view)}
                      className={`matchrim-pressable min-h-11 rounded-md px-2 text-sm font-semibold ${nativeResultView === view ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div hidden={isNative && nativeResultView !== 'scene'} className="space-y-4">
              {isNative ? <details data-testid="native-scene-diagnostics" className="space-y-3">
                <summary className="min-h-11 cursor-pointer py-3 text-sm text-stone-600">Detalles de la detección</summary>
                {sceneDiagnostics}
              </details> : sceneDiagnostics}
              </div>

              <div hidden={isNative && nativeResultView !== 'compare'}>
              <WineComparisonWorkspace
                wines={rankedGroups.map((group) => {
                  const consumer = isNative ? nativeWineConsumerResult(group.candidate, scanProfile?.profile ?? null) : null;
                  return {
                  id: group.key,
                  name: group.candidate.name,
                  producer: group.candidate.producer,
                  region: group.candidate.region,
                  personalRating: isNative ? resolveNativeRescanVerdict159(user?.id ?? null, nativeVerdicts, group.candidate) : undefined,
                  affinity: isNative && !consumer?.canExplainAffinity ? null : group.candidate.affinity,
                  confidence: group.candidate.confidence,
                  identityReviewedByUser: group.candidate.source === 'manual',
                  identityConfirmed: isNative ? consumer?.catalogIdentityLinked
                    : Boolean(group.candidate.originalSheet?.detailVerified)
                      || group.regionIds.some((id) => regions.some((region) => region.id === id && region.status === 'recognized')),
                  attributes: (!isNative || consumer?.canExplainAffinity) && group.candidate.sensoryAttributes ? {
                    body: group.candidate.sensoryAttributes.potencia,
                    acidity: group.candidate.sensoryAttributes.acidez,
                    sweetness: group.candidate.sensoryAttributes.dulzura,
                    tannin: group.candidate.sensoryAttributes.taninos,
                    fruit: group.candidate.sensoryAttributes.afrutado,
                    wood: group.candidate.sensoryAttributes.madera,
                    intensity: group.candidate.sensoryAttributes.intensidad,
                  } : null,
                }; })}
              />
              </div>

              <div hidden={isNative && nativeResultView !== 'wines'} className="space-y-4">
              {scanProfile && <p className="text-sm text-stone-600" data-testid="scan-profile-source">{scanProfile.note}</p>}
              {isNative && user && nativeVerdicts?.status === 'unavailable' && <p className="text-sm text-stone-600" role="status">No se pudieron consultar tus valoraciones guardadas para este análisis.</p>}
              <div className="matchrim-surface divide-y divide-stone-100 overflow-hidden rounded-lg">
                {rankedGroups.map((group, index) => {
                  const savedIndex = batchRef.current?.groups.findIndex((item) => item.key === group.key) ?? -1;
                  const saveResult = savedIndex < 0 ? undefined : saveResults[savedIndex];
                  const identityConfirmed = group.regionIds.some((id) => (
                    regions.some((region) => region.id === id && region.status === 'recognized')
                  ));
                  const consumer = isNative ? nativeWineConsumerResult(group.candidate, scanProfile?.profile ?? null) : null;
                  const personalVerdict = isNative ? resolveNativeRescanVerdict159(user?.id ?? null, nativeVerdicts, group.candidate) : null;
                  return (
                  <button
                    key={group.key}
                    type="button"
                    className={isNative
                      ? 'matchrim-pressable flex min-h-16 w-full min-w-0 flex-col items-stretch gap-2 px-3 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800'
                      : 'matchrim-pressable flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-800'}
                    onClick={() => setSelectedRegionId(regions.find((region) => (
                      group.regionIds.includes(region.id) && getSelectedCandidate(region)?.id === group.candidate.id
                    ))?.id ?? group.regionIds[0])}
                    aria-label={`Abrir detalle de ${group.candidate.name}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-950 text-sm font-bold text-white">{index + 1}</span>
                    <span className={isNative ? 'min-w-0 w-full' : 'min-w-0 flex-1'}>
                      <span className={`block font-semibold text-slate-950${isNative ? ' break-words [overflow-wrap:anywhere]' : ''}`}>{group.candidate.name}</span>
                      <span className={`block text-xs leading-5 text-slate-500${isNative ? ' break-words [overflow-wrap:anywhere]' : ''}`}>
                        {[group.candidate.producer, group.candidate.region].filter(Boolean).join(' · ') || 'Identidad parcial'}
                        {group.count > 1 ? ` · ${group.count} regiones agrupadas` : ''}
                      </span>
                      <span className={`block text-[11px] font-semibold ${isNative ? consumer?.catalogIdentityLinked ? 'text-emerald-700' : 'text-stone-600' : identityConfirmed ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {isNative ? consumer?.identityLabel : group.candidate.source === 'manual' ? 'Identidad confirmada por ti' : identityConfirmed ? 'Nombre leído · revisa la referencia' : `Por confirmar · ${Math.round(group.candidate.confidence * 100)}% identidad`}
                      </span>
                      {batchLocked && savedIndex >= 0 && (
                        <span className="mt-1 block text-xs font-medium text-slate-700">
                          {saveResult?.status === 'saved' ? 'Guardado en Quiero Probar'
                            : saveResult?.status === 'rejected' ? 'No guardado: rechazo'
                              : saveResult ? 'Guardado sin confirmar' : 'Pendiente de guardar'}
                        </span>
                      )}
                    </span>
                    <span className={isNative ? 'min-w-0 w-full text-left [overflow-wrap:anywhere]' : 'shrink-0 text-right'}>
                      <span data-testid="scan-affinity-value" className="block font-bold text-red-900">{isNative ? consumer?.affinityValue : group.candidate.affinity == null ? '-' : `${identityConfirmed ? '' : '≈'}${Math.round(group.candidate.affinity)}%`}</span>
                      <span className="block text-[11px] text-slate-500">{isNative ? consumer?.affinityLabel : group.candidate.affinity == null ? 'Sin datos' : identityConfirmed ? 'Afinidad' : 'Estimación'}</span>
                      {isNative && consumer?.pending && <span className="mt-1 block text-xs leading-5 text-stone-700" data-testid="native-affinity-gap-summary">{consumer.pending.summary}</span>}
                      {personalVerdict && <span className="mt-1 block font-semibold text-stone-900" data-testid="native-rescan-personal-verdict">{personalVerdictTitle159(personalVerdict)}</span>}
                    </span>
                  </button>
                  );
                })}
              </div>

              {regions.some((region) => region.status === 'deferred' || region.status === 'unrecognized') && (
                <section aria-label="Regiones pendientes de identificar" className="divide-y divide-stone-200">
                  {regions.filter((region) => region.status === 'deferred' || region.status === 'unrecognized').map((region) => (
                    <button key={region.id} type="button" onClick={() => setSelectedRegionId(region.id)}
                      className={isNative
                        ? 'flex min-h-16 w-full min-w-0 flex-col items-stretch gap-2 px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-red-800'
                        : 'flex min-h-16 w-full items-start gap-3 px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-red-800'}
                      aria-label={`Revisar región ${region.index}: ${statusLabel(region)}`}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold">{region.index}</span>
                      <span className={isNative ? 'min-w-0 w-full [overflow-wrap:anywhere]' : 'min-w-0'}><span className="block font-semibold">{statusLabel(region)}</span>
                        <span className="block text-xs leading-5 text-stone-600">{region.deferral?.message ?? region.fallback?.message ?? region.error ?? 'Revisa el recorte o identifica el vino manualmente.'}</span>
                      </span>
                    </button>
                  ))}
                </section>
              )}

              {phase === 'ready' && (
                <div className="space-y-3" aria-busy={saving}>
                {batchLocked && (
                  <p role="status" className="text-sm leading-6 text-slate-700">
                    {savedCount} de {batchRef.current?.wines.length ?? 0} referencias guardadas en Quiero Probar.
                  </p>
                )}
                {saveFailure && !saving && (
                  <div role="alert" className="border-l-4 border-amber-600 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                    {saveFailure.status === 'rejected'
                      ? 'Lote sin confirmar: una referencia fue rechazada. Puedes reintentar las pendientes; las ya guardadas no se repetirán.'
                      : 'No podemos confirmar el guardado de una referencia. Puede haberse guardado. Revisa tu Bodega antes de volver a escanear; no repetiremos esta inserción.'}
                  </div>
                )}
                {isNative && confirmableGroups.length === 0 && !batchLocked ? <div className="space-y-2" data-testid="native-review-before-save">
                  <p role="status" className="text-sm text-stone-700">{nativeReviewTarget ? 'Ninguna referencia lista para guardar todavía.' : 'Todos los vinos de esta foto están descartados.'}</p>
                  <Button type="button" className="h-auto min-h-12 w-full gap-2 whitespace-normal bg-red-950 py-3" onClick={() => {
                    if (nativeReviewTarget) setSelectedRegionId(nativeReviewTarget.id);
                    else resetScan();
                  }}><Eye aria-hidden="true" className="h-4 w-4 shrink-0" />{nativeReviewTarget ? 'Revisar una referencia' : 'Elegir otra foto'}</Button>
                </div> : <Button
                  type="button"
                  className="matchrim-pressable h-auto min-h-12 w-full gap-2 whitespace-normal bg-red-950 py-3 hover:bg-red-900"
                  onClick={() => void confirmBatch()}
                  disabled={saving || confirmed || confirmableGroups.length === 0 || Boolean(saveFailure && saveFailure.status !== 'rejected')}
                >
                  {saving ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
                    : saveFailure ? <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" /> : <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
                  {saving ? 'Guardando lote' : confirmed ? 'Lote confirmado' : saveFailure?.status === 'rejected' ? 'Reintentar pendientes' : saveFailure ? 'Guardado sin confirmar' : `Confirmar ${confirmableGroups.length} referencia${confirmableGroups.length === 1 ? '' : 's'}`}
                </Button>}
                </div>
              )}
              </div>
            </div>
          )}
        </>
      )}

      <Drawer open={Boolean(selectedRegion)} onOpenChange={(open) => !open && setSelectedRegionId(null)} repositionInputs={!isNative} shouldScaleBackground={!isNative}>
        <DrawerContent className="matchrim-scan-region-sheet w-full min-w-0 max-w-[100vw] max-h-[calc(100dvh-var(--matchrim-safe-top))] border-stone-200 bg-stone-50 pb-[var(--matchrim-safe-bottom)]">
          {selectedRegion && (
            <div ref={isNative ? regionEditorLayout : undefined} role={isNative ? 'region' : undefined} aria-label={isNative ? `Panel desplazable de la región ${selectedRegion.index}` : undefined} tabIndex={isNative ? 0 : undefined} className="matchrim-scan-region-layout mx-auto flex w-full min-w-0 max-w-2xl min-h-0 flex-1 flex-col">
              <DrawerHeader className={isNative ? 'max-h-[40dvh] min-w-0 shrink-0 overflow-y-auto break-words border-b border-stone-200 bg-white text-left [overflow-wrap:anywhere]' : 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white text-left'}>
                <DrawerTitle>{isNative ? <>{selectedCandidate?.name || 'Etiqueta sin identificar'}{selectedCandidate?.vintage ? ` · ${selectedCandidate.vintage}` : ''}</> : <>Región {selectedRegion.index}: {statusLabel(selectedRegion)}</>}</DrawerTitle>
                <DrawerDescription>
                  {isNative ? `${selectedCandidate?.producer || 'Bodega sin confirmar'}${selectedCandidate?.vintage ? '' : ' · Añada no indicada'}` : `Detección ${Math.round(selectedRegion.detectionConfidence * 100)}%. La identidad y la afinidad se muestran por separado.`}
                </DrawerDescription>
              </DrawerHeader>

              <div ref={isNative ? regionEditorBody : undefined} role="region" aria-label={`Contenido de la región ${selectedRegion.index}`} tabIndex={0} className="matchrim-scan-region-body min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto break-words px-4 pb-4">
                {loading && (
                  <p role="status" className="text-sm text-slate-600" data-testid="region-analysis-lock">
                    Análisis del lote en curso. Las identidades aún pueden cambiar.
                  </p>
                )}
                {isNative && selectedPersonalVerdict && !nativeConsumer?.canExplainAffinity && <section className="min-w-0 border-y border-stone-200 py-3" aria-label="Tu valoración guardada">
                  <h4 className="font-semibold text-slate-950">{personalVerdictTitle159(selectedPersonalVerdict)}</h4>
                  <p className="mt-1 text-sm leading-6 text-stone-600">Es tu valoración guardada de esta referencia. No sustituye la ficha sensorial ni verifica una añada desconocida.</p>
                </section>}
                {isNative && user && nativeVerdicts?.status === 'unavailable' && !nativeConsumer?.canExplainAffinity && <p role="status" className="text-sm leading-6 text-stone-600">No se pudieron consultar tus valoraciones guardadas para este vino.</p>}
                {isNative && selectedCandidate && <LabelAnalysisView isNativePlatform={isNative} showIdentity={false}
                  identity={selectedCandidate} identityLabel={nativeConsumer?.identityLabel ?? 'Referencia propuesta'}
                  catalogIdentityLinked={Boolean(nativeConsumer?.catalogIdentityLinked)}
                  canExplainAffinity={Boolean(nativeConsumer?.canExplainAffinity)} hasProfile={Boolean(scanProfile?.profile)}
                  pendingAffinity={nativeConsumer?.pending}
                  affinity={affinityExplanation} disabled={regionActionsLocked}
                  catalogueReference={isGlobalWine103(selectedCandidate, selectedCandidate.globalRecord)
                    ? <GlobalWineReference103 candidate={selectedCandidate} profile={scanProfile?.profile ?? null} /> : null}
                  onReturnToBatch={phase === 'ready' ? () => {
                    setNativeResultView('wines');
                    setSelectedRegionId(null);
                  } : undefined}
                  onFindSheet={() => {
                    const details = document.getElementById('native-label-reference');
                    if (!(details instanceof HTMLDetailsElement)) return;
                    details.open = true;
                    details.querySelector('summary')?.focus({ preventScroll: true });
                    details.scrollIntoView({ block: 'start', behavior: 'instant' });
                  }}
                  lookup={!nativeConsumer?.catalogIdentityLinked ? <div className="min-w-0" data-testid="native-manual-affinity-lookup">
                    <GlobalWineRecovery104 key={manualLookupKey} contextKey={manualLookupKey} disabled={manualLookupContext.locked}
                      image={selectedRegion.cropDataUrl}
                      reading={localReading?.regionId === selectedRegion.id ? localReading.value : undefined}
                      autoSearch={localBatch && selectedCandidate.source !== 'manual' && isPendingLocalIdentity109(selectedCandidate)}
                      profile={manualLookupContext.profile} candidate={selectedCandidate}
                      onConfirmed={confirmed => {
                        if (currentManualLookupKey.current !== manualLookupKey) return;
                        updateRegion(selectedRegion.id, region => {
                          const candidate = region.candidates.find(value => value.id === selectedCandidate.id);
                          if (region.status === 'discarded' || region.selectedCandidateId !== selectedCandidate.id || !candidate
                            || JSON.stringify({ ...manualLookupContext, candidate }) !== manualLookupKey
                            || !isGlobalWine103(confirmed, confirmed.globalRecord)) return region;
                          return { ...region, status: 'recognized', error: null, fallback: null,
                            candidates: region.candidates.map(value => value.id === selectedCandidate.id ? confirmed : value) };
                        });
                      }} />
                  </div> : null}
                  onCorrect={() => {
                    const input = document.getElementById('region-wine-name');
                    const details = input?.closest('details');
                    if (details) details.open = true;
                    input?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
                    input?.focus({ preventScroll: true });
                  }} />}
                {isNative && selectedCandidate && nativeConsumer?.canExplainAffinity && isGlobalWine103(selectedCandidate, selectedCandidate.globalRecord)
                  && <GlobalWineReference103 candidate={selectedCandidate} profile={scanProfile?.profile ?? null} />}
                {isNative && selectedCandidate && nativeMasterAudit102(selectedCandidate) && <p className="text-sm leading-6 text-stone-700" role="note">
                  {selectedCandidate.affinityReason}
                </p>}
                {selectedRegion.error && selectedRegion.candidates.length > 0 && (
                  <div role="alert" data-testid="region-analysis-error" className="border-l-4 border-red-700 bg-red-50 px-3 py-3 text-sm text-red-950">
                    <p className="font-semibold">Error de análisis</p>
                    <p className="mt-1">{selectedRegion.error}</p>
                    <p className="mt-1">Resultado anterior: este intento no ha podido actualizar la identificación ni la afinidad.</p>
                  </div>
                )}

                {selectedRegion.cropDataUrl && (
                  isNative ? <details className="min-w-0 border-b border-stone-200 pb-3" data-testid="native-label-photo">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-stone-700"><Camera aria-hidden="true" className="h-4 w-4 shrink-0" /> Foto de la etiqueta</summary>
                    <img src={selectedRegion.cropDataUrl} alt={`Recorte de la región ${selectedRegion.index}`} className="matchrim-scan-region-crop mt-2 max-h-40 w-full rounded-md bg-black object-contain" />
                  </details> : <img src={selectedRegion.cropDataUrl} alt={`Recorte de la región ${selectedRegion.index}`} className="matchrim-scan-region-crop max-h-48 w-full rounded-lg bg-black object-contain" />
                )}

                {selectedRegion.candidates.length === 0 ? (
                  <div className="space-y-4">
                    {!isNative && !selectedRegion.error && selectedRegion.status !== 'deferred' && selectedRegion.fallback?.code !== 'not_wine' && <AiRimContextGuide
                      profile={scanProfile?.profile ?? null}
                      context="label"
                      name={null}
                      identityConfidence={0}
                      affinity={null}
                      attributes={null}
                      primaryAction={regionActionsLocked ? null : { label: 'Reanalizar región', onClick: () => void reanalyzeSelected() }}
                    />}
                      <div role={selectedRegion.error ? 'alert' : undefined} data-testid={selectedRegion.error ? 'region-analysis-error' : undefined} className={`rounded-lg border-l-4 px-3 py-3 text-sm ${selectedRegion.status === 'deferred' ? 'border-stone-400 bg-stone-100 text-stone-900' : 'border-red-700 bg-red-50 text-red-950'}`}>
                      <div className="flex items-center gap-2 font-semibold"><CircleHelp className="h-4 w-4" /> {selectedRegion.error ? 'Error de análisis' : selectedRegion.status === 'deferred' ? 'Región sin analizar' : 'Sin identidad fiable'}</div>
                      <p className="mt-1">{selectedRegion.error ?? selectedRegion.deferral?.message ?? selectedRegion.fallback?.message ?? 'No hay evidencia visual suficiente para asignar un vino.'}</p>
                      {!isNative && <p className="mt-1 font-medium">No se asignara una identidad ni una afinidad inventadas.</p>}
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
                          <Input name="manual-wine-name" disabled={regionActionsLocked} className="mt-1 min-h-11" autoComplete="off" required />
                        </label>
                        <label className="text-sm font-medium text-slate-800">
                          Bodega (opcional)
                          <Input name="manual-wine-producer" disabled={regionActionsLocked} className="mt-1 min-h-11" autoComplete="off" />
                        </label>
                      </div>
                      <Button type="submit" disabled={regionActionsLocked} className={`min-h-11 gap-2${isNative ? ' h-auto max-w-full whitespace-normal' : ''}`}><Check className="h-4 w-4" /> Aplicar identidad manual</Button>
                    </form>
                  </div>
                ) : (
                  <>
                    {(!isNative || selectedRegion.candidates.length > 1) && <div>
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
                              disabled={regionActionsLocked}
                              aria-pressed={active}
                            >
                              <span className="text-xs font-bold text-red-900">{index + 1}</span>
                              <span className="min-w-0 flex-1">
                                <span className={`block font-semibold text-slate-950${isNative ? ' break-words [overflow-wrap:anywhere]' : ''}`}>{candidate.name}</span>
                                <span className={`block text-xs text-slate-500${isNative ? ' break-words [overflow-wrap:anywhere]' : ''}`}>{candidate.producer || 'Bodega no confirmada'}</span>
                              </span>
                              <span className="shrink-0 text-xs font-semibold text-slate-700">{isNative ? active ? 'Seleccionado' : 'Propuesto' : candidate.source === 'manual' ? 'Manual' : `Identidad ${Math.round(candidate.confidence * 100)}%`}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>}

                    {selectedCandidate && (
                      <>
                        {isNative ? <details id="native-label-reference" className="space-y-3" data-testid="native-reference-details">
                          <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-stone-700">Ficha e identificación</summary>
                          {referenceReview}
                          {!regionActionsLocked && selectedRegion.status === 'uncertain' && (!localBatch || !isPendingLocalIdentity109(selectedCandidate)) && <Button type="button" variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal" onClick={confirmSelectedCandidate}>
                            <Check aria-hidden="true" className="h-4 w-4 shrink-0" /> Confirmar este candidato
                          </Button>}
                        </details> : referenceReview}

                        {isNative ? <details className="space-y-3" data-testid="native-wine-diagnostics">
                          <summary className="min-h-11 cursor-pointer py-3 text-sm text-stone-600">Detalles de lectura</summary>
                          {candidateDiagnostics}
                          {identityEvidence}
                          {selectedCandidate.source === 'manual' && <p className="text-sm text-stone-600" data-testid="manual-identity-notice">{manualWineIdentityNotice(selectedCandidate.affinity)}</p>}
                        </details> : <>{candidateDiagnostics}{contextGuidance}{identityEvidence}</>}

                        {!isNative && affinityExplanation}
                      </>
                    )}
                  </>
                )}
              </div>

              <DrawerFooter className="min-w-0 shrink-0 border-t border-stone-200 bg-white">
                <div className={`matchrim-region-footer-actions grid ${isNative ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
                  <Button type="button" variant="outline" title="Anterior" className="matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2" disabled={regions.findIndex((region) => region.id === selectedRegion.id) <= 0} onClick={() => moveSelection(-1)}>
                    <ChevronLeft className="h-4 w-4" /><span className={isNative ? 'sr-only' : undefined}>Anterior</span>
                  </Button>
                  <Button type="button" variant="outline" title="Siguiente" className="matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2" disabled={regions.findIndex((region) => region.id === selectedRegion.id) >= regions.length - 1} onClick={() => moveSelection(1)}>
                    <span className={isNative ? 'sr-only' : undefined}>Siguiente</span><ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" title="Reanalizar" disabled={regionActionsLocked} className="matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2" onClick={isNative ? () => {
                    if (localBatch || window.confirm('Se enviará de nuevo el recorte al servicio de lectura con IA. ¿Quieres continuar?')) void reanalyzeSelected();
                  } : () => void reanalyzeSelected()}>
                    <RefreshCw className="h-4 w-4" /><span className={isNative ? 'sr-only' : undefined}>Reanalizar</span>
                  </Button>
                  <Button type="button" variant="outline" title="Descartar" disabled={regionActionsLocked} className="matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2 text-red-800" onClick={discardSelected}>
                    <Trash2 className="h-4 w-4" /><span className={isNative ? 'sr-only' : undefined}>Descartar</span>
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

export const MultiWineLabelScanner = (props: MultiWineLabelScannerProps) => {
  const { user } = useAuth();
  return <MultiWineLabelScannerSession key={user?.id ?? 'anonymous'} {...props} />;
};
