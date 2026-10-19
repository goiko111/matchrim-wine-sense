import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { optionalScanNumber, normalizeScanSensoryValue } from '../../../supabase/functions/_shared/matchrim-scan-values';
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { ChefHat } from 'lucide-react';
import { readRestaurantCarry, restaurantCarryState } from '@/utils/restaurantPairingContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AffinityExplanation } from "@/components/AffinityExplanation";
import { NativeAffinitySummary } from '@/components/NativeAffinitySummary';
import { nativeLiteralMenuEvidence95, nativeMenuWineAffinity } from '@/utils/menuWineConsumer95';
import { isLiteralWineStyle95, isNativeWineMenuItem95 } from '@/utils/menuLiteralStyle95';
import { nativeMenuScanFailure } from '@/utils/menuScanFailure95';
import { menuRecoveryTiles95, type MenuRecoveryLayout } from '@/utils/menuRecovery95';
import { MenuRecoveryControls95 } from './MenuRecoveryControls95';
import { renderRestaurantPage, RestaurantDocumentError91 } from '@/utils/restaurantDocuments91';
import { AiRimContextGuide } from "@/components/AiRimContextGuide";
import { WineComparisonWorkspace } from "@/components/wine-import/WineComparisonWorkspace";
import { MenuPriceEditor } from '@/components/wine-import/MenuPriceEditor';
import { clearMenuManualPriceOrigin, formatMenuPriceAmount, manualMenuPriceLines } from '@/utils/menuPriceReview';
import { menuReadingSourceLabel96, nativeMenuTakeawayText96 } from '@/utils/menuReadingPresentation96';
import { menuWineSensorySimilarity, menuWineSimilarityBand, menuWineSimilarityUnavailable } from '@/utils/menuWineSimilarity';
import { Loader2, Upload, Camera, X, CheckCircle, AlertCircle, Sparkles, BookmarkPlus, Edit3, Mail, MessageCircle, Trophy, CircleSlash, Target, Heart, ScanLine, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RefreshCw, ArrowUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { trackAppEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { cropImageRegion, NATIVE_IMAGE_PREPARATION_LIMITS, prepareImageForAnalysis, shouldRejectTextAnalysis } from "@/utils/imageAnalysis";
import { invokeEdgeFunction } from "@/utils/invokeEdgeFunction";
import { createMenuScanRun93, planNativeMenuInitialRead96, planNativeMenuRefinement93, type MenuScanMetrics93 } from '@/utils/wineMenuExecution93';
import { isMatchrimFixtureQaEnabled } from "@/utils/matchrimQaMode";
import { isWineMenuItem } from "@/utils/wineMenuGrounding";
import { normalizeScanCurrency, singlePriceCurrency } from '@/utils/scanMoney';
import { clusterScreenOverlayPins } from "@/utils/screenOverlayPins";
import { useOverlayViewport } from "@/hooks/useOverlayViewport";
import { applyMenuWineEvidence, menuWinePriceEvidence, updateMenuWineEvidence } from '@/utils/scanWineEvidence';
import { confirmsMenuInsert, menuFinancialPrice, menuPriceSnapshot, menuSaveEvidence } from '@/utils/menuWineSave';
import { labelInsertErrorResult } from '@/utils/labelScanSave';
import { confirmsMenuAction, menuCardIdentity, menuIntentChanges, type SavedMenuCard } from '@/utils/menuWineActions';
import { presentMenuAffinity } from '@/utils/menuAffinityPresentation';
import { wineComparisonPrice, wineComparisonPriceFormat, type WineServiceFormat } from '@/utils/wineComparison';
import { findWinerimWineForLabel } from '@/services/winerimApi';
import { WinerimOriginalSheet } from '@/components/WinerimOriginalSheet';
import { WinerimSheetLookup } from '@/components/WinerimSheetLookup';
import { WinerimCandidatePicker95 } from '@/components/WinerimCandidatePicker95';
import { confirmedMenuCatalogIdentity95 } from '@/utils/confirmedCatalogIdentity95';
import { catalogWineFromVerifiedSheet } from '@/utils/winerimOriginalSheet';
import { normalizeWineAttributesForInsight } from '@/utils/wineAffinityExplanation';
import { loadMatchrimScanProfile } from '@/services/matchrimScanProfile';
import { awaitMenuCatalog } from '@/utils/menuCatalogAwait';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import { confirmsCellarSaveEvidence, makeCellarCatalogEvidence, withCellarInitialAffinity } from '@/utils/bodegaAffinity';
import { canRetryScanProfile } from '@/utils/scanProfile';
import { refreshMenuProfileAffinity } from '@/utils/menuProfileRecovery';
import { mapWithConcurrency } from '@/utils/multiWineScan';
import {
  normalizeMenuAffinity,
  calibrateMenuIdentityConfidence,
  getConfidenceBand,
} from "@/utils/scanConfidence";
import {
  buildMenuScanTiles,
  getFullMenuScanTile,
  getRightFocusMenuScanTile,
  resolveMenuTileResults,
  literalMenuServingFormat95,
  shouldRunRightFocusMenuScan,
  needsMenuRefinement,
  mayHaveUnreadMenuColumn,
  isMenuIdentityConfirmed,
  canResolveMenuCatalogIdentity,
  type MenuScanResponse as WineMenuScanResponse,
  type MenuScanTile,
  type MenuTileResult,
  type MenuScanWine as ScannedWine,
} from "@/utils/wineMenuScan";

type PdfJsLib = typeof import('pdfjs-dist');

let pdfJsPromise: Promise<PdfJsLib> | null = null;
let pdfWorkerUrl: string | null = null;

const loadPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs'),
    ]).then(([pdfjsLib, pdfjsWorker]) => {
      if (!pdfWorkerUrl) {
        pdfWorkerUrl = URL.createObjectURL(
          new Blob([pdfjsWorker.default], { type: 'application/javascript' })
        );
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
      return pdfjsLib;
    });
  }

  return pdfJsPromise;
};

interface WineMenuScannerProps {
  restaurantName?: string;
  matchrimCode?: string;
  restaurantSessionId?: string | null;
  pairingDishName?: string | null;
  similarWineName?: string | null;
  onScanComplete?: (winesDetected: number) => void;
}

type ScannedWineSortMode = 'compatibility' | 'price-asc' | 'price-desc' | 'name';
type NativeMenuReadMode95 = 'full' | 'regions' | 'failed-regions';
type PartialMenuReading95 = { file: File; ownerId: string | null; successful: MenuTileResult[]; failed: MenuScanTile[] };

const formatWineType = (type?: string | null) => type?.trim() || 'Sin tipo';
const formatPrice = formatMenuPriceAmount;

const parseNullableNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePercentage = (value: unknown) => {
  const numeric = optionalScanNumber(value);
  if (numeric === null) return null;
  return Math.max(0, Math.min(100, numeric));
};

const normalizeAttributeTo5 = (value: unknown) => {
  const numeric = normalizeScanSensoryValue(value);
  return numeric === null ? null : Math.round(numeric);
};

const normalizeAttributesTo5 = (attributes: ScannedWine['atributos']) => {
  if (!attributes) return null;
  if (attributes.scale === 'winerim-0-5') {
    const exact = normalizeWineAttributesForInsight(attributes);
    return exact ? { scale: attributes.scale, potencia: exact.potente, acidez: exact.acidez,
      dulzura: exact.dulce, taninos: exact.tanico, afrutado: exact.afrutado } : null;
  }

  const normalized = {
    potencia: normalizeAttributeTo5(attributes.potencia),
    acidez: normalizeAttributeTo5(attributes.acidez),
    dulzura: normalizeAttributeTo5(attributes.dulzura),
    taninos: normalizeAttributeTo5(attributes.taninos),
    afrutado: normalizeAttributeTo5(attributes.afrutado),
  };

  if (Object.values(normalized).some((value) => value === null)) return null;
  return normalized as NonNullable<ScannedWine['atributos']>;
};

const normalizePositionConfidence = (value: unknown) => {
  const numeric = optionalScanNumber(value);
  if (numeric === null) return null;
  return numeric > 1 ? Math.max(0, Math.min(1, numeric / 100)) : Math.max(0, Math.min(1, numeric));
};

const normalizeScannedWine = (wine: ScannedWine): ScannedWine => {
  const x = normalizePercentage(wine.posicion?.x);
  const y = normalizePercentage(wine.posicion?.y);
  const positionConfidence = normalizePositionConfidence(wine.posicion?.confidence ?? wine.posicion?.confianza);
  const hasReliablePosition = x !== null && y !== null && positionConfidence !== null && positionConfidence >= 0.7;
  const confidence = calibrateMenuIdentityConfidence({
    rawConfidence: wine.confidence ?? positionConfidence,
    hasReliablePosition,
    hasTextEvidence: Boolean(wine.texto_fuente?.trim()),
    hasProducer: Boolean(wine.productor?.trim()),
    hasRegion: Boolean(wine.region?.trim()),
    hasPrice: typeof wine.precio === 'number' && Number.isFinite(wine.precio),
  });

  return {
    ...wine,
    atributos: normalizeAttributesTo5(wine.atributos),
    compatibilidad: normalizeMenuAffinity(wine.compatibilidad, wine.affinity_calibrated === true),
    confidence,
    posicion: hasReliablePosition
      ? {
          x,
          y,
          width: normalizePercentage(wine.posicion?.width),
          height: normalizePercentage(wine.posicion?.height),
          confidence: positionConfidence,
        }
      : null,
  };
};

const getWinePosition = (wine: ScannedWine) => {
  const x = normalizePercentage(wine.posicion?.x);
  const y = normalizePercentage(wine.posicion?.y);
  const width = normalizePercentage(wine.posicion?.width);
  const confidence = normalizePositionConfidence(wine.posicion?.confidence ?? wine.posicion?.confianza);

  if (x === null || y === null || confidence === null || confidence < 0.7) return null;
  const anchorX = width !== null ? Math.min(92, x + width + 2) : x;
  return { x: Math.max(8, Math.min(92, anchorX)), y: Math.max(4, Math.min(96, y)) };
};

const calculateWineSimilarity = (source: ScannedWine, candidate: ScannedWine) => {
  return menuWineSensorySimilarity(source, candidate)?.score ?? 0;
};

const WineMenuScannerSession = ({
  restaurantName,
  matchrimCode,
  restaurantSessionId,
  pairingDishName,
  similarWineName,
  onScanComplete,
}: WineMenuScannerProps = {}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scannedWines, setScannedWines] = useState<ScannedWine[]>([]);
  const [savingWineKey, setSavingWineKey] = useState<string | null>(null);
  const [savedWineKeys, setSavedWineKeys] = useState<Set<string>>(new Set());
  const [unconfirmedWineIndexes, setUnconfirmedWineIndexes] = useState<Set<number>>(new Set());
  const [identityHoldIndexes, setIdentityHoldIndexes] = useState<Set<number>>(new Set());
  const [hasProfile, setHasProfile] = useState(false);
  const [scanProfile, setScanProfile] = useState<ScanProfileSnapshot | null>(null);
  const [retryingProfile, setRetryingProfile] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
  const [convertingPdf, setConvertingPdf] = useState(false);
  const [scanSortMode, setScanSortMode] = useState<ScannedWineSortMode>('compatibility');
  const [scanTypeFilter, setScanTypeFilter] = useState('all');
  const [scanRegionFilter, setScanRegionFilter] = useState('all');
  const [scanServiceFilter, setScanServiceFilter] = useState('all');
  const [scanMinScore, setScanMinScore] = useState('all');
  const [scanMinConfidence, setScanMinConfidence] = useState('all');
  const [scanMaxPrice, setScanMaxPrice] = useState('');
  const [editingWineIndex, setEditingWineIndex] = useState<number | null>(null);
  const [expandedWineActionsIndex, setExpandedWineActionsIndex] = useState<number | null>(null);
  const [highlightedWineIndex, setHighlightedWineIndex] = useState<number | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [menuQualityWarnings, setMenuQualityWarnings] = useState<string[]>([]);
  const [scanPhase, setScanPhase] = useState<'quality' | 'profile' | 'ocr' | 'refinement' | 'ranking'>('quality');
  const [nativeScanMetrics, setNativeScanMetrics] = useState<MenuScanMetrics93 | null>(null);
  const [recoveryLayout, setRecoveryLayout] = useState<MenuRecoveryLayout>('auto');
  const [recoveryColumnSplit, setRecoveryColumnSplit] = useState(50);
  const [failedRegionCount, setFailedRegionCount] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const detailPreviousRef = useRef<HTMLButtonElement>(null);
  const detailNextRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const fullActionsSummaryRef = useRef<HTMLElement>(null);
  const comparisonPanelRef = useRef<HTMLDetailsElement>(null);
  const comparisonReturnCleanup = useRef<(() => void) | null>(null);
  const scanAbortRef = useRef<AbortController | null>(null);
  const lastScanInputRef = useRef<{ file: File; type: 'image' | 'pdf' } | null>(null);
  const partialMenuReadingRef = useRef<PartialMenuReading95 | null>(null);
  const saveLifetime = useRef({ active: false, generation: 0, ownerId: user?.id });
  const savingRef = useRef(false);
  const unconfirmedRef = useRef(new Set<number>());
  const savedCardsRef = useRef(new Map<number, SavedMenuCard>());
  const pendingIdentitiesRef = useRef(new Map<number, string>());
  const identityHoldsRef = useRef(new Set<number>());
  const profileRetryRef = useRef<AbortController | null>(null);
  const profileRetryLifetime = useRef({ active: false, generation: 0, ownerId: user?.id });
  const detectionNoticeRef = useRef({ active: false, generation: 0, id: null as string | number | null });
  const detailFocusRef = useRef({ active: false, open: false, generation: 0, opener: null as HTMLElement | null });

  useLayoutEffect(() => () => comparisonReturnCleanup.current?.(), [user?.id, preview, loading]);

  const goToEditing = () => {
    const summary = fullActionsSummaryRef.current;
    if (!isNative || !summary?.isConnected) return;
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ behavior: 'instant', block: 'center' });
  };

  const returnToComparison = () => {
    if (!isNative) return;
    comparisonReturnCleanup.current?.();
    const panel = comparisonPanelRef.current;
    const summary = panel?.querySelector('summary');
    if (!panel?.isConnected || !(summary instanceof HTMLElement)) return;
    (document.activeElement as HTMLElement | null)?.blur();
    panel.open = true;
    let frame = 0;
    let active = true;
    const viewport = window.visualViewport;
    const reveal = () => {
      cancelAnimationFrame(frame);
      // Recenter after WebKit's keyboard-dismissal scroll restoration, not before it.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!active || comparisonPanelRef.current !== panel || !panel.isConnected || !panel.open) return;
          summary.focus({ preventScroll: true });
          summary.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
      });
    };
    const observer = new MutationObserver(reveal);
    const cleanup = () => {
      active = false;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      window.removeEventListener('resize', reveal);
      viewport?.removeEventListener('resize', reveal);
      document.removeEventListener('pointerdown', cleanup);
      document.removeEventListener('keydown', cleanup);
      observer.disconnect();
      if (comparisonReturnCleanup.current === cleanup) comparisonReturnCleanup.current = null;
    };
    const timer = window.setTimeout(cleanup, 1000);
    comparisonReturnCleanup.current = cleanup;
    window.addEventListener('resize', reveal);
    viewport?.addEventListener('resize', reveal);
    document.addEventListener('pointerdown', cleanup);
    document.addEventListener('keydown', cleanup);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    reveal();
  };

  useEffect(() => {
    if (!isNative || !loading) return;
    const timer = window.setInterval(() => setNativeScanMetrics(current => current && !current.outcome
      ? { ...current, elapsedMs: Math.max(0, performance.now() - current.startedAt) } : current), 1000);
    return () => window.clearInterval(timer);
  }, [isNative, loading]);

  const invalidateDetailFocus = useCallback(() => {
    const focus = detailFocusRef.current;
    focus.generation += 1;
    focus.opener = null;
    focus.open = false;
  }, []);

  useLayoutEffect(() => {
    const focus = detailFocusRef.current;
    focus.active = true;
    return () => {
      focus.active = false;
      invalidateDetailFocus();
    };
  }, [user?.id, invalidateDetailFocus]);

  const detailFocusGeneration = detailFocusRef.current.generation;
  const restoreDetailFocus = (event: Event) => {
    event.preventDefault();
    const focus = detailFocusRef.current;
    if (!focus.active || focus.open || focus.generation !== detailFocusGeneration) return;
    const opener = focus.opener;
    focus.opener = null;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  };

  const dismissDetectionNotice = useCallback(() => {
    const id = detectionNoticeRef.current.id;
    detectionNoticeRef.current.id = null;
    detectionNoticeRef.current.generation += 1;
    if (id !== null) toast.dismiss(id);
  }, []);

  useLayoutEffect(() => {
    const notice = detectionNoticeRef.current;
    notice.active = true;
    return () => {
      notice.active = false;
      dismissDetectionNotice();
    };
  }, [user?.id, dismissDetectionNotice]);

  const invalidateProfileRetry = () => {
    profileRetryLifetime.current.generation += 1;
    profileRetryRef.current?.abort();
    profileRetryRef.current = null;
    setRetryingProfile(false);
  };

  useLayoutEffect(() => {
    profileRetryLifetime.current = { active: true, generation: profileRetryLifetime.current.generation + 1, ownerId: user?.id };
    return () => {
      profileRetryLifetime.current.active = false;
      profileRetryLifetime.current.generation += 1;
      profileRetryRef.current?.abort();
    };
  }, [user?.id]);

  useLayoutEffect(() => {
    saveLifetime.current = { active: true, generation: saveLifetime.current.generation + 1, ownerId: user?.id };
    savingRef.current = false;
    unconfirmedRef.current.clear();
    savedCardsRef.current.clear();
    pendingIdentitiesRef.current.clear();
    identityHoldsRef.current.clear();
    return () => { saveLifetime.current.active = false; saveLifetime.current.generation += 1; };
  }, [user?.id]);

  const resetSaveBatch = () => {
    saveLifetime.current.generation += 1;
    savingRef.current = false;
    unconfirmedRef.current.clear();
    savedCardsRef.current.clear();
    pendingIdentitiesRef.current.clear();
    identityHoldsRef.current.clear();
    setSavingWineKey(null);
    setSavedWineKeys(new Set());
    setUnconfirmedWineIndexes(new Set());
    setIdentityHoldIndexes(new Set());
  };

  useEffect(() => {
    scanAbortRef.current?.abort();
    lastScanInputRef.current = null;
    partialMenuReadingRef.current = null;
    setFailedRegionCount(0);
    setScannedWines([]);
    setPreview(null);
    setSelectedPinIndex(null);
    setSavedWineKeys(new Set());
    setUnconfirmedWineIndexes(new Set());
    setIdentityHoldIndexes(new Set());
    setScanProfile(null);
    setHasProfile(false);
    setLoading(false);
    return () => { scanAbortRef.current?.abort(); lastScanInputRef.current = null; partialMenuReadingRef.current = null; };
  }, [user?.id]);

  const scannedWineTypes = useMemo(
    () => Array.from(new Set(scannedWines.map((wine) => formatWineType(wine.tipo)))).sort(),
    [scannedWines]
  );
  const scannedWineRegions = useMemo(
    () => Array.from(new Set(scannedWines.map((wine) => wine.region?.trim()).filter((region): region is string => Boolean(region)))).sort(),
    [scannedWines]
  );
  const selectedPinWine = selectedPinIndex === null ? null : scannedWines[selectedPinIndex] ?? null;
  const requestedServiceFormat: WineServiceFormat = scanServiceFilter === 'copa' ? 'glass'
    : scanServiceFilter === 'botella' ? 'bottle' : 'any';
  const priceEligibleWines = useMemo(() => scannedWines
    .map((wine, index) => ({ wine, index, priceEvidence: {
      id: `menu-row-${index}`, name: wine.nombre, ...menuWinePriceEvidence(wine),
    } }))
    .filter(({ wine }) => scanTypeFilter === 'all' || formatWineType(wine.tipo) === scanTypeFilter)
    .filter(({ wine }) => scanRegionFilter === 'all' || wine.region === scanRegionFilter)
    .filter(({ priceEvidence }) => requestedServiceFormat === 'any' || priceEvidence.service === requestedServiceFormat || priceEvidence.service === 'both')
    .filter(({ wine }) => scanMinScore === 'all' || (wine.compatibilidad ?? -1) >= Number(scanMinScore))
    .filter(({ wine }) => scanMinConfidence === 'all' || (wine.confidence ?? 0) >= Number(scanMinConfidence)),
  [requestedServiceFormat, scanMinConfidence, scanMinScore, scanRegionFilter, scanTypeFilter, scannedWines]);
  const listPriceFormat = wineComparisonPriceFormat(priceEligibleWines.map(({ priceEvidence }) => priceEvidence), requestedServiceFormat);
  const menuPriceRows = priceEligibleWines.map((row) => ({
    ...row, price: listPriceFormat ? wineComparisonPrice(row.priceEvidence, listPriceFormat) : null,
    currency: row.priceEvidence.currency,
  }));
  const menuCurrency = listPriceFormat ? singlePriceCurrency(menuPriceRows) : null;

  useEffect(() => { setScanMaxPrice(''); }, [listPriceFormat, menuCurrency]);
  useEffect(() => {
    if (!menuCurrency && (scanSortMode === 'price-asc' || scanSortMode === 'price-desc')) setScanSortMode('name');
  }, [menuCurrency, scanSortMode]);
  const overlay = useOverlayViewport(scannedWines.length);
  const menuPinClusters = useMemo(() => clusterScreenOverlayPins(
    scannedWines.flatMap((wine, index) => {
      const position = getWinePosition(wine);
      return position ? [{
        key: `wine-${index}`,
        order: index,
        x: position.x,
        y: position.y,
        value: { wine, index },
      }] : [];
    }),
    overlay.viewport,
  ), [overlay.viewport, scannedWines]);

  const menuDecision = useMemo(() => {
    if (scannedWines.length === 0) return null;

    const scored = scannedWines
      .map((wine, index) => ({ wine, index, score: wine.compatibilidad as number }))
      .filter(({ wine }) => typeof wine.compatibilidad === 'number' && isMenuIdentityConfirmed(wine)
        && (!isNative || nativeMenuWineAffinity(wine, scanProfile?.profile ?? null).state === 'ready'))
      .sort((a, b) => b.score - a.score);

    const best = scored[0] ?? null;
    const secondaries = scored.slice(1, 3);
    const safeAlternative = scored[1] ?? null;
    const maxPrice = menuCurrency ? parseNullableNumber(scanMaxPrice) : null;
    const value = scored
      .map((entry) => ({ ...entry, price: menuPriceRows.find((row) => row.index === entry.index)?.price ?? null }))
      .filter((entry): entry is typeof entry & { price: number } => Boolean(
        listPriceFormat && menuCurrency && entry.wine.moneda === menuCurrency
        && entry.wine.sensorySource === 'catalog' && entry.wine.canonicalId && entry.wine.affinity_calibrated === true
        && typeof entry.price === 'number' && entry.price > 0 && (maxPrice === null || entry.price <= maxPrice)
        && Number.isFinite(entry.score) && entry.score >= 60,
      ))
      .sort((a, b) => (b.score / b.price) - (a.score / a.price))[0] ?? null;
    const adventurous = scored.find(({ score }, index) => index > 0 && score >= 60 && score < 75) ?? scored[2] ?? null;
    const caution = [...scored].reverse().find(({ score }) => score < 60) ?? null;
    const anchored = scannedWines.filter((wine) => getWinePosition(wine) && wine.compatibilidad != null).length;
    const highMatches = scored.filter(({ score }) => score >= 80).length;
    const mediumMatches = scored.filter(({ score }) => score >= 60 && score < 80).length;

    return {
      best,
      secondaries,
      safeAlternative,
      value,
      adventurous,
      caution,
      anchored,
      highMatches,
      mediumMatches,
    };
  }, [scannedWines, menuCurrency, listPriceFormat, menuPriceRows, scanMaxPrice, isNative, scanProfile?.profile]);

  const visibleScannedWines = useMemo(() => {
    const maxPrice = menuCurrency ? parseNullableNumber(scanMaxPrice) : null;

    return menuPriceRows
      .filter(({ price, currency }) => maxPrice === null || (currency === menuCurrency && price !== null && price <= maxPrice))
      .sort((a, b) => {
        if ((scanSortMode === 'price-asc' || scanSortMode === 'price-desc') && menuCurrency) {
          const left = a.currency === menuCurrency ? a.price : null;
          const right = b.currency === menuCurrency ? b.price : null;
          if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
          return scanSortMode === 'price-asc' ? left - right : right - left;
        }
        if (scanSortMode === 'name') {
          return a.wine.nombre.localeCompare(b.wine.nombre, 'es');
        }

        return (b.wine.compatibilidad ?? -1) - (a.wine.compatibilidad ?? -1);
      });
  }, [scanMaxPrice, scanSortMode, menuPriceRows, menuCurrency]);

  const listPriceText = (wine: ScannedWine, index: number) => {
    if (wine.precio_manual_pendiente) return `Precio manual ${formatPrice(wine.precio, wine.moneda) ?? 'sin importe'} · formato pendiente`;
    const evidence = { id: `menu-row-${index}`, name: wine.nombre, ...menuWinePriceEvidence(wine) };
    if (wine.precio_manual_asignacion) {
      const manual = wine.precio_manual_asignacion;
      const byFormat = (['glass', 'bottle'] as const).flatMap((format) => {
        if (listPriceFormat && listPriceFormat !== format) return [];
        const amount = formatPrice(wineComparisonPrice(evidence, format), evidence.currency);
        const unit = format === 'glass' ? 'copa' : 'botella';
        return amount ? [`${manual.prices[unit] !== null ? 'Manual' : 'Carta'} · ${unit === 'copa' ? 'Copa' : 'Botella'} ${amount}`] : [];
      });
      return byFormat.join(' · ') || 'Precio pendiente';
    }
    const prefix = wine.precio_origen === 'manual' ? 'Precio manual · ' : '';
    if (listPriceFormat) return prefix + (formatPrice(wineComparisonPrice(evidence, listPriceFormat), evidence.currency) ?? 'Precio pendiente');
    const byFormat = (['glass', 'bottle'] as const).flatMap((format) => {
      const amount = formatPrice(wineComparisonPrice(evidence, format), evidence.currency);
      return amount ? [`${format === 'glass' ? 'Copa' : 'Botella'} ${amount}`] : [];
    });
    return prefix + (byFormat.join(' · ') || (formatPrice(evidence.price, evidence.currency)
      ? `${formatPrice(evidence.price, evidence.currency)} · formato pendiente` : 'Precio pendiente'));
  };

  const renderNativeTakeawayPrice = (wine: ScannedWine, filteredFormat: 'glass' | 'bottle' | null = null) => {
    const text = isNative ? nativeMenuTakeawayText96(wine, filteredFormat) : null;
    return text ? <span data-testid="native-menu-takeaway-price" className="block whitespace-normal break-words text-xs text-slate-600">{text}</span> : null;
  };

  useEffect(() => {
    if (loading || scannedWines.length === 0) return;

    resultsRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
  }, [loading, scannedWines.length]);

  const dishContext = pairingDishName?.trim() || '';
  const similarWineContext = similarWineName?.trim() || '';
  const restaurantShareText = restaurantName
    ? `Hola, he intentado usar mi código Winerim${matchrimCode ? ` ${matchrimCode}` : ''} en ${restaurantName}. Me gustaría poder filtrar vuestra carta con mi perfil de vino. Podéis verlo en https://winerim.wine`
    : '';
  const restaurantMailtoHref = restaurantShareText
    ? `mailto:?subject=${encodeURIComponent('Clientes pidiendo Winerim')}&body=${encodeURIComponent(restaurantShareText)}`
    : '';
  const restaurantWhatsappHref = restaurantShareText
    ? `https://wa.me/?text=${encodeURIComponent(restaurantShareText)}`
    : '';

  const getSimilarWines = (sourceWine: ScannedWine, sourceIndex: number) =>
    scannedWines
      .map((candidate, candidateIndex) => ({
        wine: candidate,
        index: candidateIndex,
        score: candidateIndex === sourceIndex ? 0 : calculateWineSimilarity(sourceWine, candidate),
      }))
      .filter((candidate) => candidate.index !== sourceIndex && candidate.score >= 50)
      .sort((a, b) => {
        const compatibilityDelta = (b.wine.compatibilidad ?? 0) - (a.wine.compatibilidad ?? 0);
        if (compatibilityDelta !== 0) return compatibilityDelta;
        return b.score - a.score;
      })
      .slice(0, 2);

  const openWineDetail = (index: number, opener?: HTMLElement) => {
    const focus = detailFocusRef.current;
    if (focus.active && !focus.open) {
      focus.generation += 1;
      focus.opener = opener ?? null;
      focus.open = true;
    }
    dismissDetectionNotice();
    setHighlightedWineIndex(index);
    setSelectedPinIndex(index);
  };

  const openAiRimForWine = (wine: ScannedWine) => {
    const wineDescription = [
      wine.nombre,
      wine.productor,
      wine.anada,
      wine.region,
      wine.pais,
      wine.uvas?.join(', '),
    ].filter(Boolean).join(' · ');

    navigate(`/inteligencia-liquida?function=wine-fit&wine=${encodeURIComponent(wineDescription)}`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      toast.error("Por favor selecciona una imagen o PDF válido");
      return;
    }

    // Activar loader inmediatamente
    invalidateDetailFocus();
    dismissDetectionNotice();
    const noticeGeneration = detectionNoticeRef.current.generation;
    invalidateProfileRetry();
    resetSaveBatch();
    setLoading(true);
    setScannedWines([]);
    setScanFeedback(null);
    setFileType(isPDF ? 'pdf' : 'image');
    if (isNative) { setRecoveryLayout('auto'); setRecoveryColumnSplit(50); }
    trackAppEvent("wine_menu_scan_started", {
      userId: user?.id,
      metadata: {
        file_type: isPDF ? "pdf" : "image",
        restaurant_name: restaurantName || null,
        has_matchrim_code: Boolean(matchrimCode),
        pairing_dish_name: pairingDishName || null,
        similar_wine_name: similarWineName || null,
      },
    });

    if (isPDF) {
      setConvertingPdf(true);
      setPreview(null); // Limpiar preview anterior
      await convertPdfToImage(file, noticeGeneration);
    } else {
      // Preparation owns the single read and its preview; a second unguarded
      // reader could publish the cancelled file after this session ended.
      setPreview(null);
      await processFile(file, 'image', noticeGeneration);
    }
  };

  const convertPdfToImage = async (file: File, noticeGeneration: number, readMode: NativeMenuReadMode95 = 'full') => {
    if (isNative) {
      scanAbortRef.current?.abort();
      const controller = new AbortController();
      scanAbortRef.current = controller;
      lastScanInputRef.current = { file, type: 'pdf' };
      setNativeScanMetrics(null);
      try {
        const image = await renderRestaurantPage(file, 1, controller.signal);
        if (controller.signal.aborted || scanAbortRef.current !== controller || !detectionNoticeRef.current.active
          || detectionNoticeRef.current.generation !== noticeGeneration) return;
        setConvertingPdf(false);
        await processFile(image, 'image', noticeGeneration, readMode);
      } catch (failure) {
        if (scanAbortRef.current !== controller || !detectionNoticeRef.current.active) return;
        setScanFeedback(controller.signal.aborted ? 'Conversión cancelada. El PDF sigue disponible para reintentar.'
          : failure instanceof RestaurantDocumentError91 ? failure.message : nativeMenuScanFailure(failure));
      } finally {
        if (scanAbortRef.current === controller && detectionNoticeRef.current.active) { setLoading(false); setConvertingPdf(false); }
      }
      return;
    }
    try {
      toast.info("Convirtiendo PDF a imagen...");
      
      const arrayBuffer = await file.arrayBuffer();
      const pdfjsLib = await loadPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Renderizar la primera página
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 }); // Escala 2x para mejor calidad
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo crear el contexto del canvas');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      }).promise;
      
      // Convertir canvas a blob y luego a base64
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
      });
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setPreview(base64);
        setConvertingPdf(false);
        
        // Crear un archivo temporal con la imagen
        const imageFile = new File([blob], 'pdf-page.jpg', { type: 'image/jpeg' });
        await processFile(imageFile, 'image', noticeGeneration);
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Error converting PDF:', error);
      toast.error("Error al convertir el PDF. Por favor intenta con una imagen.");
      setLoading(false);
      setConvertingPdf(false);
    }
  };

  const processFile = async (file: File, type: 'image' | 'pdf', noticeGeneration: number, readMode: NativeMenuReadMode95 = 'full') => {
    const retained = isNative && readMode === 'failed-regions' ? partialMenuReadingRef.current : null;
    if (readMode === 'failed-regions' && (!retained || retained.file !== file || retained.ownerId !== (user?.id ?? null)
      || retained.failed.length === 0)) return;
    if (isNative && readMode !== 'failed-regions') { partialMenuReadingRef.current = null; setFailedRegionCount(0); }
    if (isNative) lastScanInputRef.current = { file, type };
    // Mantener el loader activo durante todo el proceso real
    setLoading(true);
    setScannedWines([]);
    setScanFeedback(null);
    setMenuQualityWarnings([]);
    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;
    const nativeRun = isNative ? createMenuScanRun93({ signal: controller.signal,
      onChange: metrics => {
        if (scanAbortRef.current === controller && !controller.signal.aborted) setNativeScanMetrics(metrics);
      },
    }) : null;
    if (nativeRun) setNativeScanMetrics(nativeRun.snapshot());
    let outcome: 'completed' | 'failed' | 'cancelled' = 'failed';

    try {
      setScanPhase('quality');
      const prepared = await prepareImageForAnalysis(file, 2400, controller.signal, isNative ? NATIVE_IMAGE_PREPARATION_LIMITS : undefined);
      if (scanAbortRef.current !== controller || controller.signal.aborted) return;
      const base64File = prepared.dataUrl;
      setPreview(prepared.dataUrl);
      setMenuQualityWarnings(prepared.quality.warnings);
      if (controller.signal.aborted) return;
      if (shouldRejectTextAnalysis(prepared.quality)) {
        setScanFeedback('La imagen es demasiado pequeña y desenfocada para leer la carta. Acerca la cámara o fotografía una sección con el texto enfocado.');
        trackAppEvent('wine_menu_scan_quality_rejected', {
          userId: user?.id,
          metadata: {
            width: prepared.quality.width,
            height: prepared.quality.height,
            sharpness: prepared.quality.sharpness,
          },
        });
        return;
      }
      setScanPhase('ocr');
      if (nativeRun) { setScanPhase('profile'); nativeRun.phase('profile'); }
      const profileSnapshot = await loadMatchrimScanProfile(user?.id ?? null, controller.signal);
      if (controller.signal.aborted) return;
      const profile = profileSnapshot.profile;
      setScanProfile(profileSnapshot);
      if (nativeRun) { setScanPhase('ocr'); nativeRun.phase('ocr'); }

      const invokeScan = async (tile: MenuScanTile, tileImage: string, attempt = 1): Promise<WineMenuScanResponse> => {
	        const payload = {
	          image: tileImage,
	          qa_fixture_name: `${file.name}:${tile.id}`,
	          scan_region: tile,
	          matchrimProfile: profile,
	          pairingDishName: pairingDishName || null,
	          similarWineName: similarWineName || null,
	        };
          if (nativeRun) return nativeRun.request(signal => invokeEdgeFunction<WineMenuScanResponse>('scan-wine-menu', payload, signal));
	        try {
	          return await invokeEdgeFunction<WineMenuScanResponse>('scan-wine-menu', payload, controller.signal);
	        } catch (error) {
	          if (error instanceof DOMException && error.name === 'AbortError') throw error;
	          const rawMessage = error instanceof Error ? error.message : String(error);
	          const isTransient = /non-2xx|fetch|network|timeout|error 5\d\d/i.test(rawMessage);
	          if (attempt < 2 && isTransient) {
	            await new Promise((resolve) => window.setTimeout(resolve, 1200));
	            return invokeScan(tile, tileImage, attempt + 1);
	          }
	          throw error;
	        }
      };

      const fullTile = getFullMenuScanTile();
      const successfulTiles: MenuTileResult[] = [];
      const failedTiles: MenuScanTile[] = [];
      let failedTileCount = 0;
      let attemptedTileCount = 1;
      let fullFailure: unknown;
      const nativeInitialTiles = nativeRun && readMode === 'full' && !isMatchrimFixtureQaEnabled
        ? planNativeMenuInitialRead96(prepared.width, prepared.height) : [];
      if (nativeInitialTiles.length || (isNative && readMode !== 'full')) {
        const initialTiles = nativeInitialTiles.length ? nativeInitialTiles : retained?.failed ?? (recoveryLayout === 'auto'
          ? buildMenuScanTiles(prepared.width, prepared.height, 'unknown', { preserveRowContext: true })
          : menuRecoveryTiles95(prepared.width, prepared.height, recoveryLayout, recoveryColumnSplit));
        if (retained) successfulTiles.push(...retained.successful);
        attemptedTileCount = successfulTiles.length + initialTiles.length;
        const initial = await Promise.allSettled(initialTiles.map(async tile => ({
          tile, response: await invokeScan(tile, tile.id === 'full' ? base64File
            : await cropImageRegion(base64File, tile.box, 0, 1800, controller.signal)),
        })));
        if (scanAbortRef.current !== controller || controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        successfulTiles.push(...initial.flatMap(result => result.status === 'fulfilled' ? [result.value] : []));
        initial.forEach((result, index) => { if (result.status === 'rejected') failedTiles.push(initialTiles[index]); });
        failedTileCount += initial.filter(result => result.status === 'rejected').length;
        if (!successfulTiles.length) {
          const failure = initial.find(result => result.status === 'rejected');
          throw failure?.status === 'rejected' ? failure.reason : new Error('No se pudo leer ninguna zona');
        }
      } else try {
        successfulTiles.push({ tile: fullTile, response: await invokeScan(fullTile, base64File) });
      } catch (error) {
        if (controller.signal.aborted) throw error;
        // Native retries require an explicit user action, not another paid full-page pass.
        if (nativeRun) throw error;
        fullFailure = error;
        failedTileCount += 1;
      }
      const fullResponse = nativeInitialTiles.length
        ? successfulTiles.find(({ tile }) => tile.id === 'full')?.response : successfulTiles[0]?.response;
      const scanTiles = isMatchrimFixtureQaEnabled || nativeInitialTiles.length || (isNative && readMode !== 'full') ? []
        : nativeRun && fullResponse ? planNativeMenuRefinement93(prepared.width, prepared.height, fullResponse, { preserveRowContext: true })
          : !fullResponse || needsMenuRefinement(fullResponse)
            ? buildMenuScanTiles(prepared.width, prepared.height, fullResponse?.layout) : [];
      if (nativeRun && scanTiles.length) { setScanPhase('refinement'); nativeRun.phase('refinement'); }
      attemptedTileCount += scanTiles.length;
      const settledTiles = await Promise.allSettled(scanTiles.map(async (tile) => ({
        tile,
        response: await invokeScan(tile, await cropImageRegion(base64File, tile.box, 0, 1800, controller.signal)),
      })));
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      successfulTiles.push(...settledTiles.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []));
      settledTiles.forEach((result, index) => { if (result.status === 'rejected') failedTiles.push(scanTiles[index]); });
      if (successfulTiles.length === 0) {
        const firstFailure = settledTiles.find((result) => result.status === 'rejected');
        throw firstFailure?.status === 'rejected' ? firstFailure.reason : fullFailure ?? new Error('No se pudo analizar la carta');
      }
      failedTileCount += settledTiles.filter((result) => result.status === 'rejected').length;
      if (isNative) {
        partialMenuReadingRef.current = failedTiles.length ? { file, ownerId: user?.id ?? null,
          successful: successfulTiles, failed: failedTiles } : null;
        setFailedRegionCount(failedTiles.length);
      }
      let data = resolveMenuTileResults(successfulTiles, { preserveNumericReferences: isNative, preserveServingFormats: isNative, preserveReadingAlternatives: isNative });
      if (!nativeRun && !isMatchrimFixtureQaEnabled && mayHaveUnreadMenuColumn({ ...data, layout: fullResponse?.layout }) && shouldRunRightFocusMenuScan(
        data.coverage?.status,
        data.vinos?.length ?? 0,
        successfulTiles.some(({ tile }) => tile.id === 'left')
          && successfulTiles.some(({ tile }) => tile.id === 'right'),
      )) {
        const focusTile = getRightFocusMenuScanTile();
        attemptedTileCount += 1;
        try {
          const focusImage = await cropImageRegion(base64File, focusTile.box, 0, 1800, controller.signal);
          successfulTiles.push({ tile: focusTile, response: await invokeScan(focusTile, focusImage) });
          data = resolveMenuTileResults(successfulTiles, { preserveNumericReferences: isNative, preserveServingFormats: isNative, preserveReadingAlternatives: isNative });
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') throw error;
          failedTileCount += 1;
        }
      }
      if (failedTileCount > 0) {
        if (isNative) setMenuQualityWarnings(warnings => [...warnings,
          `${failedTileCount} de ${attemptedTileCount} zonas no se han podido leer. Conservamos lo recuperado; la carta no está completa.`]);
        data.coverage = {
          ...data.coverage,
          status: 'partial',
          notes: [
            ...(data.coverage?.notes ?? []),
            `${failedTileCount} de ${attemptedTileCount} regiones no terminaron; vuelve a analizar esa zona.`,
          ],
        };
      }

      setScanPhase('ranking');
      nativeRun?.phase('ranking');
      const normalizedWines = await mapWithConcurrency(
        (Array.isArray(data?.vinos) ? data.vinos as ScannedWine[] : [])
          .filter(isNative ? isNativeWineMenuItem95 : isWineMenuItem).map(clearMenuManualPriceOrigin).map(normalizeScannedWine),
        3,
        async (wine) => {
          if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
          const literalStyle = isNative && isLiteralWineStyle95(wine);
          const catalog = !literalStyle && !isMatchrimFixtureQaEnabled && (isNative ? canResolveMenuCatalogIdentity(wine) : isMenuIdentityConfirmed(wine))
            ? await awaitMenuCatalog(
              () => findWinerimWineForLabel({ name: wine.nombre, producer: wine.productor, vintage: wine.anada,
                ...(isNative ? { region: wine.region, country: wine.pais, inferredFields: wine.campos_inferidos } : {}) },
                isNative ? { signal: controller.signal } : undefined),
              controller.signal,
            )
            : null;
          if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');
          const evidence = applyMenuWineEvidence(wine, profile, catalog?.wine);
          return literalStyle ? nativeLiteralMenuEvidence95(evidence) : evidence;
        },
      );
      if (normalizedWines.length > 0) {
	      setScanPhase('ranking');
	        if (data.coverage?.status === 'partial') {
	          const expected = data.coverage.estimated_visible_wines;
	          setMenuQualityWarnings((warnings) => [
	            ...warnings,
	            expected && expected > normalizedWines.length
              ? isNative ? `Cobertura parcial: ${normalizedWines.length} de unas ${expected} líneas legibles.`
                : `Cobertura parcial: ${normalizedWines.length} de aproximadamente ${expected} líneas legibles.`
              : 'Cobertura parcial: revisa la imagen y vuelve a escanear la sección que falte.',
	          ]);
	        }
        setScannedWines(normalizedWines);
        setHasProfile(Boolean(profile));
        onScanComplete?.(normalizedWines.length);
        trackAppEvent("wine_menu_scan_completed", {
          userId: user?.id,
          metadata: {
            wines_detected: normalizedWines.length,
            has_profile: Boolean(data.has_profile),
            restaurant_name: restaurantName || null,
            pairing_dish_name: pairingDishName || null,
            similar_wine_name: similarWineName || null,
          },
        });

        if (restaurantSessionId) {
          const { error: sessionError } = await supabase
            .from('restaurant_matchrim_sessions')
            .update({
              menu_scan_used: true,
              wines_detected: normalizedWines.length,
            })
            .eq('id', restaurantSessionId);

          if (sessionError) {
            console.error('Error updating restaurant Matchrim session:', sessionError);
          }
        }

        if (detectionNoticeRef.current.active && detectionNoticeRef.current.generation === noticeGeneration
          && scanAbortRef.current === controller && !controller.signal.aborted) {
          detectionNoticeRef.current.id = toast.success(isNative ? `${normalizedWines.length} lecturas para revisar`
            : `✨ ${normalizedWines.length} vinos detectados en la carta`);
        }
      } else {
        setScannedWines([]);
        setScanFeedback(data?.vinos?.length
          ? 'He leído categorías o descripciones, pero no una referencia de vino verificable. Prueba con una foto más cercana que incluya el nombre y la bodega.'
          : "No he encontrado vinos claros en el documento. Prueba con una foto más cercana o con una sección más pequeña de la carta.");
        toast.info("No se encontraron vinos en el documento");
      }
      outcome = 'completed';
    } catch (error) {
      if (scanAbortRef.current !== controller) return;
	    if (error instanceof DOMException && error.name === 'AbortError') {
      outcome = 'cancelled';
      if (scanAbortRef.current === controller) {
        setScanFeedback('Análisis cancelado. Puedes reintentarlo con la misma imagen o elegir otra.');
      }
	      return;
	    }
      console.error('Error processing file:', error);
      const rawMessage = error instanceof Error ? error.message : 'Error al procesar el documento';
      const message = isNative ? nativeMenuScanFailure(error) : /scanline|scanlines/i.test(rawMessage)
        ? 'No he podido leer esta imagen correctamente. Repite la foto con más luz o sube la carta desde archivo'
        : /non-2xx|FunctionsHttpError|User not authenticated|auth/i.test(rawMessage)
          ? 'No he podido analizar esta carta ahora. Reintenta en unos segundos o prueba con una foto más cercana'
        : rawMessage;
      trackAppEvent("wine_menu_scan_failed", {
        userId: user?.id,
        metadata: {
          error: message,
          restaurant_name: restaurantName || null,
          pairing_dish_name: pairingDishName || null,
          similar_wine_name: similarWineName || null,
        },
      });
      setScanFeedback(isNative ? message : `${message}. Si la carta es grande, prueba a escanear solo una página o una sección con menos vinos.`);
      if (!isNative) toast.error(message);
    } finally {
      if (nativeRun) {
        const metrics = nativeRun.finish(controller.signal.aborted ? 'cancelled' : outcome);
        console.info('matchrim.menu_scan.metrics', JSON.stringify(metrics));
      }
      if (scanAbortRef.current === controller) setLoading(false);
    }
  };

  const retryNativeScan = (readMode: NativeMenuReadMode95) => {
    const input = lastScanInputRef.current;
    if (!input || loading || savingRef.current) return;
    invalidateDetailFocus();
    dismissDetectionNotice();
    invalidateProfileRetry();
    resetSaveBatch();
    setScanFeedback(null);
    if (input.file.type === 'application/pdf') {
      setLoading(true); setConvertingPdf(true);
      void convertPdfToImage(input.file, detectionNoticeRef.current.generation, readMode);
    } else void processFile(input.file, input.type, detectionNoticeRef.current.generation, readMode);
  };

  const clearScan = () => {
    invalidateDetailFocus();
    dismissDetectionNotice();
    invalidateProfileRetry();
    scanAbortRef.current?.abort();
    lastScanInputRef.current = null;
    partialMenuReadingRef.current = null;
    setFailedRegionCount(0);
    resetSaveBatch();
    setPreview(null);
    setScannedWines([]);
    setSavedWineKeys(new Set());
    setHasProfile(false);
    setScanProfile(null);
    setFileType(null);
    setConvertingPdf(false);
    setScanSortMode('compatibility');
    setScanTypeFilter('all');
    setScanRegionFilter('all');
    setScanServiceFilter('all');
    setScanMinScore('all');
    setScanMinConfidence('all');
    setScanMaxPrice('');
    setEditingWineIndex(null);
    setExpandedWineActionsIndex(null);
    setHighlightedWineIndex(null);
    setScanFeedback(null);
    setMenuQualityWarnings([]);
    setNativeScanMetrics(null);
    setRecoveryLayout('auto');
    setRecoveryColumnSplit(50);
    setImageZoom(1);
    setSelectedPinIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const updateScannedWine = (index: number, updates: Partial<ScannedWine>) => {
    const boundIdentity = savedCardsRef.current.get(index)?.identity ?? pendingIdentitiesRef.current.get(index);
    const currentWine = scannedWines[index];
    if (boundIdentity && currentWine && menuCardIdentity({ ...currentWine, ...updates }) !== boundIdentity) {
      identityHoldsRef.current.add(index);
      setIdentityHoldIndexes(new Set(identityHoldsRef.current));
    }
    setScannedWines((currentWines) =>
      currentWines.map((wine, wineIndex) =>
        wineIndex === index ? updateMenuWineEvidence(wine, updates) : wine
      )
    );
  };

  const getCompatibilityColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCompatibilityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const getWineDecision = (wine: ScannedWine) => {
    if (isNative) {
      const result = nativeMenuWineAffinity(wine, scanProfile?.profile ?? null);
      const presentation = presentMenuAffinity(result.state === 'ready' ? result.score : null, result.state === 'ready',
        result.state === 'pending' ? result.description : null);
      return result.state === 'ready' ? { ...presentation, label: result.title,
        description: result.matches[0] ?? result.caution ?? 'Compara la ficha de este vino con tus gustos actuales.' } : presentation;
    }
    return presentMenuAffinity(wine.compatibilidad, wine.affinity_calibrated === true && Boolean(scanProfile?.profile),
      scanProfile?.source === 'unavailable' ? scanProfile.note : wine.razon);
  };
  const retryScanProfile = async () => {
    const ownerId = user?.id;
    if (!ownerId || loading || !scannedWines.length || profileRetryRef.current || !canRetryScanProfile(scanProfile)) return;
    const controller = new AbortController();
    profileRetryRef.current = controller;
    const generation = profileRetryLifetime.current.generation;
    const isCurrent = () => profileRetryLifetime.current.active && profileRetryLifetime.current.generation === generation
      && profileRetryLifetime.current.ownerId === ownerId && profileRetryRef.current === controller && !controller.signal.aborted;
    setRetryingProfile(true);
    try {
      const snapshot = await loadMatchrimScanProfile(ownerId, controller.signal);
      if (!isCurrent()) return;
      setScanProfile(snapshot);
      setHasProfile(Boolean(snapshot.profile));
      setScannedWines((current) => current.map((wine) => refreshMenuProfileAffinity(wine, snapshot.profile)));
    } catch {
      if (!isCurrent()) return;
      setScanProfile({ profile: null, source: 'unavailable', samples: null, status: 'base-error', note: 'No se pudo cargar tu perfil; afinidad pendiente.' });
      setHasProfile(false);
      setScannedWines((current) => current.map((wine) => refreshMenuProfileAffinity(wine, null)));
    } finally {
      if (isCurrent()) { profileRetryRef.current = null; setRetryingProfile(false); }
    }
  };
  const renderProfileRecovery = () => scanProfile && (
    <div role="status" aria-label="Estado del perfil del escáner" data-testid="scan-profile-recovery" className="mt-2 space-y-2 text-sm text-stone-600">
      <p data-testid="scan-profile-source">{retryingProfile ? 'Cargando perfil...' : isNative && scanProfile.status === 'ready'
        ? scanProfile.source === 'learned' ? 'Basado en tu test y en tus valoraciones.' : 'Basado en tu test de paladar.'
        : scanProfile.note}</p>
      {user && canRetryScanProfile(scanProfile) && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={retryingProfile} onClick={retryScanProfile}>
            {retryingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Reintentar perfil
          </Button>
          {retryingProfile && <Button type="button" variant="ghost" size="icon" className="h-11 w-11" aria-label="Cancelar carga del perfil" title="Cancelar carga del perfil" onClick={invalidateProfileRetry}><X className="h-4 w-4" /></Button>}
        </div>
      )}
    </div>
  );
  const selectedPinDecision = selectedPinWine ? getWineDecision(selectedPinWine) : null;
  const selectedReadingEvidence = selectedPinWine && (
    <div className="matchrim-soft-surface mb-4 rounded-lg p-3 text-sm text-slate-600">
      {selectedPinWine.texto_fuente ? (
        <p><span className="font-semibold text-slate-900">{isNative ? 'Transcripción automática, sin verificar:' : 'Texto visible:'}</span> {selectedPinWine.texto_fuente}</p>
      ) : (
        <p>No hay una transcripción enlazada a esta fila. Productor, región y estilo pueden ser inferencias y requieren confirmación.</p>
      )}
      {selectedPinWine.dudas && selectedPinWine.dudas.length > 0 && (
        <p className="mt-1"><span className="font-semibold text-slate-900">Dudas:</span> {selectedPinWine.dudas.join(', ')}</p>
      )}
      {selectedPinWine.campos_inferidos && selectedPinWine.campos_inferidos.length > 0 && (
        <p className="mt-1"><span className="font-semibold text-slate-900">Datos inferidos:</span> {selectedPinWine.campos_inferidos.join(', ')}</p>
      )}
      {isNative && selectedPinIndex !== null && Boolean(selectedPinWine.lecturas_alternativas?.length) && (
        <div className="mt-3 min-w-0 space-y-3 border-t border-stone-300 pt-3">
          <p className="font-semibold text-stone-800">Otra lectura de esta zona, sin verificar</p>
          <p>Los recortes discrepan. Revisa la imagen antes de elegir un nombre; ninguna lectura confirma la botella.</p>
          {selectedPinWine.lecturas_alternativas.map(reading => (
            <div key={`${reading.tile.id}-${reading.rawIndex}`} className="min-w-0 space-y-2 break-words">
              <p className="font-medium">{reading.nombre}</p>
              <p>Productor leído, sin verificar: {reading.productor || 'No indicado'}</p>
              <p>{menuReadingSourceLabel96(reading.tile.id)} · Lectura {reading.rawIndex + 1}</p>
              <p>Transcripción alternativa, sin verificar: {reading.texto_fuente}</p>
              <Button type="button" variant="outline" className="h-auto min-h-[44px] max-w-full whitespace-normal px-[12px] py-[8px] text-left"
                disabled={loading || selectedPinWine.nombre === reading.nombre}
                onClick={() => updateScannedWine(selectedPinIndex, { nombre: reading.nombre, productor: null })}>
                Usar este nombre como edición manual
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  const renderWineAffinityExplanation = (wine: ScannedWine) => {
    const decision = getWineDecision(wine);
    if (isNative) return <NativeAffinitySummary result={nativeMenuWineAffinity(wine, scanProfile?.profile ?? null)} />;
    return decision.state === 'pending' ? (
      <div role="status" aria-label={`Estado de afinidad de ${wine.nombre}`} className="matchrim-soft-surface rounded-lg p-3 text-sm text-stone-600">
        <p className="font-medium text-stone-800">Afinidad pendiente</p>
        <p className="mt-1 leading-5">{decision.description}</p>
        <p className="mt-1 leading-5">No es un resultado negativo ni significa que este vino no te guste.</p>
      </div>
    ) : (
      <AffinityExplanation
        profile={scanProfile?.profile ?? null}
        wineKey={`${wine.nombre}-${wine.productor ?? ''}-${wine.anada ?? 'nv'}`}
        score={decision.score}
        identificationConfidence={wine.confidence}
        attributes={wine.atributos}
        sensorySource={wine.sensorySource ?? 'inference'}
        catalogIdentityLinked={Boolean(wine.originalSheet?.detailVerified)}
      />
    );
  };
  const renderOptionalNativePanel = (kind: 'comparison' | 'filters', title: string, children: ReactNode) => isNative
    ? <details ref={kind === 'comparison' ? comparisonPanelRef : undefined} className="min-w-0 border-y border-stone-200 py-2" data-testid={`native-menu-${kind}`}>
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-stone-800">{title}</summary>
      <div className={kind === 'comparison' ? 'min-w-0 pt-2 [html.matchrim-accessibility-text_&_label]:flex-wrap [html.matchrim-accessibility-text_&_label]:px-[12px] [html.matchrim-accessibility-text_&_label>span]:basis-full' : 'min-w-0 pt-2'}>{children}</div>
    </details> : children;

  const saveScannedWine = async (wine: ScannedWine, index: number, status: 'wishlist' | 'tasted', favorite = false) => {
    if (isNative && isLiteralWineStyle95(wine)) {
      toast.info('Identifica primero la botella concreta para guardarla en Bodega.');
      return;
    }
    if (!user) {
      toast.error("Inicia sesión para guardar vinos");
      navigate(buildAuthRedirectPath(`${location.pathname}${location.search}`));
      return;
    }

    const saveKey = `${favorite ? 'favorite' : status}-${wine.nombre}-${index}`;
    if (savingRef.current || unconfirmedRef.current.has(index) || identityHoldsRef.current.has(index) || savedWineKeys.has(saveKey)) return;
    const ownerId = user.id;
    const generation = saveLifetime.current.generation;
    const isCurrent = () => saveLifetime.current.active && saveLifetime.current.generation === generation
      && saveLifetime.current.ownerId === ownerId;
    const markUnconfirmed = () => {
      unconfirmedRef.current.add(index);
      setUnconfirmedWineIndexes(new Set(unconfirmedRef.current));
      toast.warning('Guardado sin confirmar. Revisa Bodega antes de repetirlo.');
    };
    savingRef.current = true;
    const identity = menuCardIdentity(wine);
    pendingIdentitiesRef.current.set(index, identity);
    setSavingWineKey(saveKey);

    try {
      const sensoryAttributes = normalizeAttributesTo5(wine.atributos);
      const evidence = menuSaveEvidence(wine, sensoryAttributes as Json);
      const priceSnapshot = menuPriceSnapshot(wine);
      const draftPayload = {
          user_id: ownerId,
          name: wine.nombre,
          producer: wine.productor || null,
          vintage: wine.anada || null,
          region: wine.region || null,
          country: wine.pais || null,
          grape_varieties: wine.uvas || null,
          tasting_notes: wine.descripcion || wine.razon || null,
          status,
          is_favorite: favorite,
          matchrim_affinity: evidence.matchrim_affinity,
          sensory_attributes: evidence.sensory_attributes,
          use_for_profile_training: false,
          consumption_place: restaurantName || null,
          consumption_place_type: restaurantName ? "restaurant" : null,
          price: menuFinancialPrice(priceSnapshot),
          place_details: {
            source: "menu_scanner",
            restaurant_session_id: restaurantSessionId || null,
            matchrim_code: matchrimCode || null,
            pairing_dish_name: pairingDishName || null,
            similar_wine_name: similarWineName || null,
            scanned_price: wine.precio ?? null,
            scanned_currency: normalizeScanCurrency(wine.moneda),
            menu_price_snapshot: priceSnapshot,
            menu_wine_evidence: evidence.trace,
          } as Json,
        };
      if (isNative && wine.canonicalId && evidence.sensory_attributes) {
        const catalog = makeCellarCatalogEvidence(draftPayload, wine.canonicalId, sensoryAttributes);
        if (catalog) draftPayload.place_details = withCellarInitialAffinity({ ...draftPayload,
          place_details: { ...(draftPayload.place_details as Record<string, Json>), bodega_sensory_evidence: catalog } },
        scanProfile, 'saved');
      }
      const saved = savedCardsRef.current.get(index);
      if (saved && (saved.ownerId !== ownerId || saved.identity !== identity)) {
        identityHoldsRef.current.add(index);
        setIdentityHoldIndexes(new Set(identityHoldsRef.current));
        return;
      }
      const changes = saved ? menuIntentChanges(saved, status, favorite) : null;
      if (saved && Object.keys(changes).length === 0) {
        setSavedWineKeys((keys) => new Set(keys).add(saveKey));
        return;
      }
      const payload = saved ? { ...saved.payload, ...changes } : draftPayload;
      const query = saved
        ? supabase.from("user_wines").update(changes).eq('id', saved.rowId).eq('user_id', ownerId)
        : supabase.from("user_wines").insert(draftPayload);
      const { data, error } = await query
        .select('id, user_id, name, producer, vintage, region, country, status, is_favorite, rating, price, place_details, sensory_attributes, matchrim_affinity, use_for_profile_training').single();
      if (!isCurrent()) return;
      if (error) {
        if (labelInsertErrorResult(error).status === 'rejected') toast.error('No se pudo guardar el vino');
        else markUnconfirmed();
        return;
      }
      if (!(saved ? confirmsMenuAction(data, payload, saved.rowId) : confirmsMenuInsert(data, payload)) || data.rating !== null) { markUnconfirmed(); return; }
      if (!saved && isNative && !confirmsCellarSaveEvidence(data, payload)) { markUnconfirmed(); return; }
      savedCardsRef.current.set(index, { rowId: data.id, ownerId, identity, payload });
      if (identityHoldsRef.current.has(index)) return;

      setSavedWineKeys((currentKeys) => {
        const keys = new Set(currentKeys).add(`wishlist-${wine.nombre}-${index}`);
        if (payload.status === 'tasted') keys.add(`tasted-${wine.nombre}-${index}`);
        if (payload.is_favorite) keys.add(`favorite-${wine.nombre}-${index}`);
        return keys;
      });
      trackAppEvent("wine_saved", {
        userId: user.id,
        metadata: {
          source: "menu_scanner",
          status: payload.status,
          wine_name: wine.nombre,
          match: payload.matchrim_affinity,
          restaurant_name: restaurantName || null,
        },
      });
      toast.success(
        payload.is_favorite && payload.status !== 'tasted'
          ? `${wine.nombre} guardado en Quiero Probar y Favoritos`
          : payload.status === 'wishlist'
          ? `${wine.nombre} guardado en Quiero Probar`
          : `${wine.nombre} guardado en Ya Probados. Puntúalo para afinar tu Matchrim`
      );
    } catch (error) {
      if (!isCurrent()) return;
      console.error("Error saving scanned wine:", error);
      markUnconfirmed();
    } finally {
      if (isCurrent()) { pendingIdentitiesRef.current.delete(index); savingRef.current = false; setSavingWineKey(null); }
    }
  };

  const saveWineToWishlist = (wine: ScannedWine, index: number) => saveScannedWine(wine, index, 'wishlist');
  const saveWineAsTasted = (wine: ScannedWine, index: number) => saveScannedWine(wine, index, 'tasted');
  const saveWineAsFavorite = (wine: ScannedWine, index: number) => saveScannedWine(wine, index, 'wishlist', true);

  const nativeResultPreview = isNative && Boolean(preview) && scannedWines.length > 0 && !loading && !convertingPdf;
  const renderMenuPreview = (image: ReactNode) => nativeResultPreview ? (
    <div className="min-w-0 space-y-[8px]" data-testid="native-menu-image-review">
      <div className="flex justify-end gap-[8px]">
        <Button type="button" variant="outline" size="icon" className="h-[44px] w-[44px] shrink-0 bg-white text-stone-900 hover:bg-stone-100"
          aria-label="Subir otra carta" title="Subir otra carta" onClick={() => {
            if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
          }}><Upload aria-hidden="true" style={{ width: 20, height: 20 }} /></Button>
        <Button type="button" variant="destructive" size="icon" className="h-[44px] w-[44px] shrink-0"
          aria-label="Quitar carta" title="Quitar carta" onClick={clearScan}>
          <X aria-hidden="true" style={{ width: 20, height: 20 }} />
        </Button>
      </div>
      <details className="group min-w-0" data-testid="native-menu-preview">
        <summary aria-label="Ver carta" className="flex min-h-[44px] cursor-pointer items-center gap-[8px] py-[8px] text-left text-sm font-semibold">
          <span aria-hidden="true">Ver carta</span><ChevronRight aria-hidden="true" className="ml-auto shrink-0 group-open:rotate-90" style={{ width: 20, height: 20 }} />
        </summary>
        <div className="min-w-0 pt-[8px]">{image}</div>
      </details>
    </div>
  ) : image;

  return (
    <div className="space-y-6">
      {isMatchrimFixtureQaEnabled && (
        <div role="status" className="rounded-lg border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          QA local: respuestas deterministas. Este build valida el flujo, no la precisión del OCR.
        </div>
      )}
      {(restaurantName || matchrimCode) && (
        <div className="matchrim-ink-panel rounded-lg p-4 text-white shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {restaurantName && (
              <span className="font-medium">
                Restaurante: {restaurantName}
              </span>
            )}
            {matchrimCode && (
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                Código {matchrimCode}
              </Badge>
            )}
          </div>
          <p className="mt-2 text-sm text-white/70">
            {dishContext
              ? `Esta carta se analizará contra tu perfil Matchrim y el plato: ${dishContext}.`
              : similarWineContext
                ? `Esta carta se analizará para encontrar vinos parecidos a ${similarWineContext} que también encajen contigo.`
                : 'Esta carta se analizará contra tu perfil Matchrim para ordenar las mejores opciones.'}
          </p>
        </div>
      )}

      {/* Scanner Section */}
      <section aria-labelledby="wine-menu-upload-title">
          <div className={nativeResultPreview ? "matchrim-scan-stage min-w-0 rounded-lg p-[12px] text-left text-white" : preview || loading || convertingPdf
            ? "matchrim-scan-stage rounded-lg p-4 text-center text-white"
            : "rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />

	            {(preview || convertingPdf) && !loading ? renderMenuPreview(
	              <div className="space-y-4">
	                <div className="relative inline-block max-w-full">
		                  {preview ? (
		                    <>
			                    <div className="overflow-auto rounded-lg bg-black shadow-2xl ring-1 ring-white/10" style={{ maxHeight: '68vh' }}>
			                      <div ref={overlay.ref} className="relative origin-top-left" style={{ width: `${imageZoom * 100}%` }}>
		                        <img
		                          src={preview}
		                          alt="Carta con vinos marcados mediante numeros"
			                          className="block h-auto w-full object-contain opacity-95"
		                        />
			                        {menuPinClusters.map((cluster) => {
			                          const first = cluster.items[0].value;
			                          const clustered = cluster.items.length > 1;
			                          const active = cluster.items.some((item) => item.value.index === highlightedWineIndex);
			                          const names = cluster.items.map((item) => item.value.wine.nombre).join(', ');

			                          return (
			                            <button
			                              key={cluster.key}
			                              type="button"
			                              className={`absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-transparent transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
			                                active ? 'ring-2 ring-black/70' : ''
			                              }`}
			                              style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
			                              aria-label={clustered
			                                ? `Grupo de ${cluster.items.length} vinos: ${names}`
			                                : `Vino ${first.index + 1}: ${first.wine.nombre}`}
			                              data-testid={clustered ? `wine-pin-cluster-${first.index + 1}` : `wine-pin-${first.index + 1}`}
			                              onClick={(event) => openWineDetail(first.index, event.currentTarget)}
			                            >
			                              <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[11px] font-bold shadow ring-1 ring-white ${
			                                active ? 'bg-amber-400 text-stone-950' : 'bg-stone-950 text-white'
			                              }`}>
			                                {clustered ? `+${cluster.items.length}` : first.index + 1}
			                              </span>
			                            </button>
			                          );
			                        })}
		                      </div>
		                    </div>
		                    {scannedWines.length > 0 && (
		                      <div className="absolute bottom-2 right-2 z-20 flex gap-1 rounded-md bg-stone-950/90 p-1 shadow">
		                        <Button type="button" size="icon" variant="ghost" className="h-11 w-11 text-white hover:bg-white/15 hover:text-white" onClick={() => setImageZoom((zoom) => Math.max(1, zoom - 0.5))} disabled={imageZoom <= 1} aria-label="Alejar carta">
		                          <ZoomOut className="h-4 w-4" />
		                        </Button>
		                        <span className="flex min-w-10 items-center justify-center text-xs font-semibold text-white">{Math.round(imageZoom * 100)}%</span>
		                        <Button type="button" size="icon" variant="ghost" className="h-11 w-11 text-white hover:bg-white/15 hover:text-white" onClick={() => setImageZoom((zoom) => Math.min(3, zoom + 0.5))} disabled={imageZoom >= 3} aria-label="Acercar carta">
		                          <ZoomIn className="h-4 w-4" />
		                        </Button>
			                      </div>
			                    )}
		                    </>
	                  ) : convertingPdf ? (
		                    <div className="mx-auto flex max-h-60 flex-col items-center gap-4 rounded-md bg-white/8 p-8">
		                      <Loader2 className="h-12 w-12 animate-spin text-amber-400" />
		                      <p className="text-sm text-white/70">Convirtiendo PDF a imagen...</p>
                    </div>
                  ) : null}
	                {!nativeResultPreview && <Button
	                    onClick={clearScan}
	                    variant="destructive"
	                    size="icon"
                    className="matchrim-pressable absolute right-2 top-2 h-11 w-11 rounded-md bg-red-700 hover:bg-red-800"
	                    aria-label="Quitar carta"
                  >
	                    <X className="h-4 w-4" />
	                  </Button>}
	                </div>
	                {preview && scannedWines.length > 0 && (
		                  <div className="mx-auto max-w-2xl rounded-md border border-white/10 bg-white/8 p-3 text-left text-xs text-white/72">
	                    {scannedWines.some((wine) => getWinePosition(wine)) ? (
	                      <p>
			                        Toca un numero para revisar ese vino. Los detalles se abren fuera de la imagen y no tapan la carta.
	                      </p>
	                    ) : (
	                      <p>
		                        Esta lectura no devolvió posiciones fiables sobre la carta; mantengo el ranking completo debajo.
	                      </p>
	                    )}
	                  </div>
	                )}
	              </div>
            ) : loading || convertingPdf ? (
              <div className="space-y-4">
	                <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-400" />
                <div>
	                  <p className="text-lg font-semibold mb-2">
	                    {convertingPdf
	                      ? 'Convirtiendo PDF a imagen...'
	                      : scanPhase === 'quality'
	                        ? 'Comprobando calidad y perspectiva...'
	                        : scanPhase === 'profile'
                            ? 'Preparando perfil...'
                          : scanPhase === 'refinement'
                            ? 'Leyendo zonas pendientes...'
	                        : scanPhase === 'ranking'
	                          ? 'Ordenando resultados...'
                          : 'Leyendo secciones, líneas y precios...'}
	                  </p>
	                  <p className="mb-3 text-sm text-white/65">
                    {convertingPdf 
                      ? 'Renderizando primera página del PDF' 
	                      : 'El texto se mantiene fuera de la imagen para no tapar la carta'}
                  </p>
                    {isNative ? <>
                      <progress aria-label="Fase del analisis" max={4} value={scanPhase === 'quality' ? 0
                        : scanPhase === 'profile' ? 1 : scanPhase === 'ranking' ? 3 : 2} className="h-2 w-full accent-amber-400" />
                      <p className="mt-2 text-xs text-white/70" aria-live="off" data-testid="menu-scan-progress">
                        {Math.floor((nativeScanMetrics?.elapsedMs ?? 0) / 1000)} s · {nativeScanMetrics?.completed ?? 0}/{nativeScanMetrics?.requests ?? 0} lecturas terminadas
                      </p>
                    </> : <>
	                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
	                      <div className="h-full bg-amber-400 animate-pulse" style={{ width: '70%' }} />
	                    </div>
	                    <p className="mt-2 text-xs text-white/50">
	                      Esto puede tardar 30-60 segundos dependiendo del tamaño de la carta
	                    </p>
                    </>}
	                  {(isNative || !convertingPdf) && (
	                    <Button type="button" variant="outline" className="mt-4 min-h-11 border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => {
                          if (isNative) { partialMenuReadingRef.current = null; setFailedRegionCount(0); }
                          scanAbortRef.current?.abort();
                        }}>
                      <X className="mr-2 h-4 w-4" /> Cancelar análisis
	                    </Button>
	                  )}
                </div>
              </div>
            ) : (
              <div className="text-left">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-900">
                    <Camera className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
	                  <h2 id="wine-menu-upload-title" className="text-lg font-bold text-slate-950">
                      Fotografía la carta
	                  </h2>
	                  <p className="mt-1 text-sm leading-5 text-slate-600">
                      También puedes elegir una imagen o PDF. Matchrim conserva secciones, precios y añadas.
	                  </p>
                  </div>
                </div>
                  {dishContext && (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Buscaré la mejor botella de esta carta para {dishContext}, equilibrando maridaje y tu Matchrim.
                    </p>
                  )}
                  {similarWineContext && (
                    <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      Buscaré vinos parecidos a {similarWineContext} dentro de esta carta, priorizando los que encajen con tu Matchrim.
                    </p>
                  )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={loading}
		                    className="matchrim-pressable min-h-12 gap-2 bg-red-900 text-white hover:bg-red-800"
                  >
                    <Camera className="h-4 w-4" />
                    Hacer foto
                  </Button>
	                  <Button
	                    onClick={() => fileInputRef.current?.click()}
	                    disabled={loading}
	                    variant="outline"
		                    className="matchrim-pressable min-h-12 gap-2 border-slate-300 bg-white text-slate-950 hover:bg-slate-50"
	                  >
	                    <Upload className="h-4 w-4" />
	                    Subir archivo
	                  </Button>
                </div>
              </div>
            )}
          </div>
	      </section>

	      {menuQualityWarnings.length > 0 && (
	        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
	          <div className="font-semibold">Avisos de calidad</div>
	          <ul className="mt-1 space-y-1">{menuQualityWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
	        </div>
	      )}

	      {scanFeedback && scannedWines.length === 0 && !loading && (
        <Card className="rounded-lg border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-950">No ha salido un escaneo útil</p>
              <p className="mt-1 text-sm text-amber-900">{scanFeedback}</p>
            </div>
            {isNative ? <div className="flex min-w-0 flex-wrap gap-2" data-testid="native-menu-retry-actions">
              {lastScanInputRef.current && <>
                <Button variant="outline" className="h-auto min-h-[44px] min-w-0 w-full flex-col gap-[4px] whitespace-normal bg-white px-[12px] py-[10px]" onClick={() => retryNativeScan('full')}>
                  <RefreshCw aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />
                  <span className="min-w-0 w-full text-center">Reintentar esta imagen</span>
                </Button>
                <MenuRecoveryControls95 layout={recoveryLayout} columnSplit={recoveryColumnSplit} image={preview}
                  disabled={Boolean(savingWineKey)} onLayout={setRecoveryLayout} onColumnSplit={setRecoveryColumnSplit}
                  onRead={() => retryNativeScan('regions')} />
              </>}
              <Button variant="ghost" className="h-auto min-h-11 min-w-0 whitespace-normal" onClick={() => {
                if (fileInputRef.current) { fileInputRef.current.value = ''; fileInputRef.current.click(); }
              }}>Elegir otra imagen o PDF</Button>
            </div> : <Button
              variant="outline"
              className="gap-2 bg-white"
              onClick={() => {
                setScanFeedback(null);
                setPreview(null);
                cameraInputRef.current?.click();
              }}
            >
              <Camera className="h-4 w-4" />
              Reintentar foto
            </Button>}
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {scannedWines.length > 0 && (
        <div ref={resultsRef} className="scroll-mt-24 space-y-4 break-words">
          {isNative && nativeScanMetrics?.outcome === 'completed' && <p className="text-xs text-slate-500" data-testid="menu-scan-metrics">
            {Math.round(nativeScanMetrics.elapsedMs / 1000)} s · {nativeScanMetrics.requests} {nativeScanMetrics.requests === 1 ? 'solicitud' : 'solicitudes'} de lectura
          </p>}
          {isNative && failedRegionCount > 0 && !loading && <div className="min-w-0 space-y-2 border-l-2 border-amber-500 pl-[12px]">
            <p className="text-sm text-stone-700">Se conservan las zonas ya leídas. El reintento actualizará la lista y sustituirá las correcciones manuales de esta lectura.</p>
            <Button type="button" variant="outline" disabled={Boolean(savingWineKey)}
              className="h-auto min-h-[44px] min-w-0 w-full flex-col gap-[4px] whitespace-normal px-[12px] py-[10px]"
              onClick={() => retryNativeScan('failed-regions')}>
              <RefreshCw aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />
              <span className="min-w-0 w-full text-center">{failedRegionCount === 1 ? 'Reintentar la zona pendiente' : `Reintentar ${failedRegionCount} zonas pendientes`}</span>
            </Button>
          </div>}
          {isNative && lastScanInputRef.current && !loading && <details className="min-w-0 border-y border-stone-200 py-[8px]">
            <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-stone-700">Volver a leer la imagen</summary>
            <div className="min-w-0 space-y-[12px] py-[12px]">
              <p className="text-sm text-stone-600">La nueva lectura sustituirá a la actual.</p>
              <MenuRecoveryControls95 layout={recoveryLayout} columnSplit={recoveryColumnSplit} image={preview}
                disabled={Boolean(savingWineKey)} onLayout={setRecoveryLayout} onColumnSplit={setRecoveryColumnSplit}
                onRead={() => retryNativeScan('regions')} />
            </div>
          </details>}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                {isNative ? 'Lecturas de la carta' : 'Vinos Detectados'} ({scannedWines.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa nombre, añada y precio antes de guardar. La carta puede tener errores de lectura.
              </p>
              {renderProfileRecovery()}
            </div>
            <div className="flex flex-wrap gap-2">
              {isNative && <Button variant="outline" className="min-h-11 whitespace-normal" onClick={() => {
                const context = readRestaurantCarry(location.state, user?.id ?? null);
                const wineMenu = scannedWines.map(wine => wine.texto_fuente?.trim()
                  || [wine.nombre, wine.productor, wine.anada].filter(Boolean).join(' \u00b7 ')).join('\n').slice(0, 12000);
                navigate(`/inteligencia-liquida?function=${pairingDishName ? 'wine-for-dish' : 'dish-for-wine'}${pairingDishName ? `&dish=${encodeURIComponent(pairingDishName)}` : ''}`, {
                  state: restaurantCarryState(user?.id ?? null, { ...context, wineMenu,
                    restaurantName: restaurantName || context.restaurantName }),
                });
              }}>
                <ChefHat className="mr-2 h-4 w-4" />Maridar con la carta de comida
              </Button>}
              {!hasProfile && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Afinidad pendiente: perfil no disponible
                </Badge>
              )}
              {fileType === 'pdf' && (
                <Badge variant="secondary">
                  PDF: primera página
                </Badge>
              )}
	            </div>
	          </div>

              {isNative && menuDecision && <section className="min-w-0 space-y-3 border-y border-stone-200 py-4" aria-label="Tu elección en esta carta" data-testid="native-menu-decision">
                {menuDecision.best ? <>
                  <p className="text-sm font-medium text-stone-600">Mayor afinidad entre los vinos con ficha</p>
                  <Button variant="ghost" className="h-auto min-h-11 w-full min-w-0 justify-between gap-3 whitespace-normal px-0 text-left" onClick={(event) => openWineDetail(menuDecision.best!.index, event.currentTarget)}>
                    <span className="min-w-0 text-base font-semibold text-stone-950">{menuDecision.best.wine.nombre}</span>
                    <span className="shrink-0 font-bold text-red-900">≈{menuDecision.best.score}/100</span>
                  </Button>
                  {(() => {
                    const result = nativeMenuWineAffinity(menuDecision.best.wine, scanProfile?.profile ?? null);
                    return result.state === 'ready' && <p className="text-sm text-stone-700">{result.matches[0] ?? result.caution ?? result.title}</p>;
                  })()}
                  {[menuDecision.safeAlternative, menuDecision.value].some(entry => entry && entry.index !== menuDecision.best?.index) && <details className="border-t border-stone-200 pt-2">
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">Otras opciones</summary>
                    {[menuDecision.safeAlternative && { entry: menuDecision.safeAlternative, label: 'También puedes considerar' },
                      menuDecision.value && menuDecision.value.index !== menuDecision.safeAlternative?.index && { entry: menuDecision.value, label: 'Por afinidad y precio' }]
                      .filter(option => option && option.entry.index !== menuDecision.best?.index)
                      .map(option => option && <Button key={option.entry.index} variant="ghost" className="h-auto min-h-11 w-full min-w-0 justify-between gap-3 whitespace-normal px-0 text-left" onClick={(event) => openWineDetail(option.entry.index, event.currentTarget)}>
                        <span className="min-w-0"><span className="block text-xs text-stone-500">{option.label}</span>{option.entry.wine.nombre}</span>
                        <span className="shrink-0 text-red-900">≈{option.entry.score}/100</span>
                      </Button>)}
                  </details>}
                </> : <p role="status" className="text-sm leading-6 text-stone-700">{hasProfile
                  ? 'Todavía faltan fichas sensoriales verificadas para ordenar estos vinos por tus gustos.'
                  : 'Completa tu test de paladar para comparar los vinos que he podido leer con tus gustos.'}</p>}
              </section>}
	          {!isNative && menuDecision && (
	            <Card className="matchrim-surface overflow-hidden rounded-lg border-red-100 bg-white">
	              <CardHeader className="border-b border-white/10 matchrim-ink-panel text-white">
	                <CardTitle className="flex items-center gap-2 text-xl">
	                  <Target className="h-5 w-5" />
	                  {dishContext
	                    ? `Decisión para ${dishContext}`
	                    : similarWineContext
	                      ? `Parecidos a ${similarWineContext}`
	                      : 'Decisión Matchrim'}
	                </CardTitle>
	                <CardDescription className="text-white/75">
	                  {dishContext || similarWineContext
	                    ? 'Ordeno esta carta para resolver esta decisión concreta, no para venderte una botella.'
	                    : 'No te vendo vino: ordeno esta carta para que aciertes con tu perfil.'}
	                </CardDescription>
	              </CardHeader>
		              <CardContent className="grid gap-3 p-4 md:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
	                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-900">
	                    <Trophy className="h-4 w-4" />
	                    Pediría primero
	                  </div>
	                  {menuDecision.best ? (() => {
	                    const best = menuDecision.best;
	                    return (
		                      <button
		                        type="button"
		                        aria-label={`Ver detalle de ${best.wine.nombre}, ${best.score}% de encaje`}
		                        className="min-w-0 w-full space-y-2 text-left"
		                        onClick={(event) => openWineDetail(best.index, event.currentTarget)}
	                      >
	                        <div className="flex items-start justify-between gap-3">
	                          <div className="min-w-0">
	                            <p className="break-words font-semibold leading-tight text-emerald-950">{best.wine.nombre}</p>
	                            {best.wine.productor && (
	                              <p className="mt-1 truncate text-sm text-emerald-900/70">{best.wine.productor}</p>
	                            )}
	                          </div>
	                          <Badge className="bg-emerald-700 hover:bg-emerald-700">{best.score}%</Badge>
	                        </div>
	                        {best.wine.razon && (
	                          <p className="break-words text-sm leading-5 text-emerald-900">{best.wine.razon}</p>
	                        )}
	                      </button>
	                    );
	                  })() : (
                    <p className="text-sm text-emerald-900">{scannedWines.some((wine) => wine.compatibilidad != null)
                      ? 'Confirma primero las identidades dudosas. La afinidad de esos candidatos es provisional.'
                      : hasProfile ? 'Tu perfil está listo. Faltan fichas sensoriales verificadas de estos vinos para calcular afinidad.'
                        : 'Completa tu test para que pueda elegir por encaje.'}</p>
	                  )}
	                </div>

		                <div className="min-w-0 rounded-md border border-amber-100 bg-amber-50 p-4">
		                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-amber-950">
		                    <Sparkles className="h-4 w-4" />
		                    Alternativa más segura
		                  </div>
		                  {menuDecision.safeAlternative ? (() => {
		                    const safe = menuDecision.safeAlternative;
		                    return (
		                      <button
		                        type="button"
		                        aria-label={`Ver detalle de ${safe.wine.nombre}, ${safe.score}% de encaje`}
		                        className="flex min-w-0 w-full items-center justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-left"
		                        onClick={(event) => openWineDetail(safe.index, event.currentTarget)}
		                      >
		                        <span className="min-w-0">
		                          <span className="block break-words text-sm font-semibold leading-tight text-amber-950">{safe.wine.nombre}</span>
		                          <span className="mt-1 block break-words text-xs leading-5 text-amber-900/70">
		                            {[formatPrice(safe.wine.precio, safe.wine.moneda), formatWineType(safe.wine.tipo)].filter(Boolean).join(' · ')}
		                          </span>
		                        </span>
		                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-950">{safe.score}%</Badge>
		                      </button>
		                    );
		                  })() : (
		                    <p className="text-sm text-amber-900">No hay suficientes alternativas con encaje calculado.</p>
		                  )}
		                </div>

		                <div className="min-w-0 rounded-lg border border-stone-200 bg-stone-50 p-4">
		                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-stone-950">
		                    <Target className="h-4 w-4" />
		                    Mejor calidad/precio para ti
		                  </div>
		                  {menuDecision.value ? (() => {
		                    const value = menuDecision.value;
		                    return (
		                      <button
		                        type="button"
		                        aria-label={`Ver detalle de ${value.wine.nombre}, ${value.score}% de encaje`}
		                        className="matchrim-pressable min-w-0 w-full rounded-md border bg-white p-3 text-left text-sm text-stone-950"
		                        onClick={(event) => openWineDetail(value.index, event.currentTarget)}
		                      >
		                        <span className="block break-words font-semibold leading-tight">{value.wine.nombre}</span>
		                        <span className="mt-1 block text-xs text-stone-500">
                          {[formatPrice(value.price, value.wine.moneda), `${value.score}%`].filter(Boolean).join(' · ')}
		                        </span>
		                      </button>
		                    );
		                  })() : (
		                    <p className="text-sm text-stone-600">Falta afinidad acreditada o precio comparable por formato y moneda.</p>
		                  )}
		                </div>

		                <div className="min-w-0 rounded-lg border border-orange-100 bg-orange-50 p-4">
		                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-orange-950">
		                    <AlertCircle className="h-4 w-4" />
		                    Más arriesgado
		                  </div>
		                  {menuDecision.adventurous ? (() => {
		                    const adventurous = menuDecision.adventurous;
		                    return (
		                      <button
		                        type="button"
		                        aria-label={`Ver detalle de ${adventurous.wine.nombre}, ${adventurous.score}% de encaje`}
		                        className="matchrim-pressable min-w-0 w-full rounded-md border border-orange-200 bg-white p-3 text-left"
		                        onClick={(event) => openWineDetail(adventurous.index, event.currentTarget)}
		                      >
		                        <span className="block break-words text-sm font-semibold leading-tight text-orange-950">{adventurous.wine.nombre}</span>
		                        <span className="mt-1 block text-xs text-orange-900/70">
		                          {adventurous.score}% · puede sacarte de tu zona segura
		                        </span>
		                      </button>
		                    );
		                  })() : (
		                    <p className="text-sm text-orange-900">No veo una opción claramente más atrevida.</p>
		                  )}
		                </div>

		                <div className="min-w-0 rounded-lg border border-red-100 bg-red-50 p-4">
		                  <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-red-950">
		                    <CircleSlash className="h-4 w-4" />
		                    No lo pediría para ti
		                  </div>
	                  {menuDecision.caution ? (() => {
	                    const caution = menuDecision.caution;
	                    return (
	                      <button
	                        type="button"
	                        aria-label={`Ver detalle de ${caution.wine.nombre}, ${caution.score}% de encaje`}
	                        className="min-w-0 w-full space-y-2 text-left"
	                        onClick={(event) => openWineDetail(caution.index, event.currentTarget)}
	                      >
	                        <div className="flex items-start justify-between gap-3">
	                          <div className="min-w-0">
	                            <p className="break-words font-semibold leading-tight text-red-950">{caution.wine.nombre}</p>
	                            <p className="mt-1 text-sm text-red-900/75">
	                              Puede ser buena botella, pero no parece tu mejor elección en esta carta.
	                            </p>
	                          </div>
	                          <Badge variant="outline" className="border-red-300 text-red-900">{caution.score}%</Badge>
	                        </div>
	                      </button>
	                    );
	                  })() : (
	                    <p className="text-sm text-red-900">
	                      No veo descartes claros. {menuDecision.highMatches} opciones superan el 80% y {menuDecision.mediumMatches} quedan en zona correcta.
	                    </p>
	                  )}
		                </div>

		                <div className="matchrim-soft-surface rounded-lg px-4 py-3 text-sm matchrim-muted md:col-span-2">
	                  {menuDecision.anchored > 0
		                    ? `${menuDecision.anchored} pin${menuDecision.anchored !== 1 ? 'es' : ''} se han anclado a posiciones fiables. La afinidad y el detalle permanecen en la lista para no tapar el texto.`
                    : 'La lectura no ha devuelto posiciones fiables para esta foto. Mantengo el ranking como lista y no invento marcadores sobre líneas dudosas.'}
	                </div>
	              </CardContent>
	            </Card>
		          )}

              {(!isNative || scannedWines.length >= 2) && renderOptionalNativePanel('comparison', 'Comparar 2–5 vinos', <WineComparisonWorkspace
                wines={scannedWines.map((wine, index) => ({
                  id: `menu-row-${index}`,
                  ...menuWinePriceEvidence(wine),
                  name: wine.nombre,
                  producer: wine.productor,
                  region: wine.region,
                  affinity: isNative ? (() => { const result = nativeMenuWineAffinity(wine, scanProfile?.profile ?? null); return result.state === 'ready' ? result.score : null; })() : wine.compatibilidad,
                  confidence: wine.confidence,
                  identityConfirmed: isMenuIdentityConfirmed(wine),
                  attributes: wine.sensorySource === 'catalog' && isMenuIdentityConfirmed(wine) && wine.atributos ? {
                    body: wine.atributos.potencia,
                    acidity: wine.atributos.acidez,
                    sweetness: wine.atributos.dulzura,
                    tannin: wine.atributos.taninos,
                    fruit: wine.atributos.afrutado,
                  } : null,
                }))}
              />)}

		          {renderOptionalNativePanel('filters', 'Filtrar y ordenar', <div className={isNative ? 'min-w-0 py-2' : 'matchrim-surface rounded-lg p-3'}>
		            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scan-sort">Orden</Label>
                <Select value={scanSortMode} onValueChange={(value) => setScanSortMode(value as ScannedWineSortMode)}>
                  <SelectTrigger id="scan-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compatibility">Mejor match</SelectItem>
                    <SelectItem value="price-asc" disabled={!menuCurrency}>Precio menor</SelectItem>
                    <SelectItem value="price-desc" disabled={!menuCurrency}>Precio mayor</SelectItem>
                    <SelectItem value="name">Nombre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
	              <div className="space-y-2">
	                <Label htmlFor="scan-type">Tipo</Label>
                <Select value={scanTypeFilter} onValueChange={setScanTypeFilter}>
                  <SelectTrigger id="scan-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    {scannedWineTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
                <Label htmlFor="scan-region-filter">Región</Label>
	                <Select value={scanRegionFilter} onValueChange={setScanRegionFilter}>
	                  <SelectTrigger id="scan-region-filter"><SelectValue /></SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="all">Todas las regiones</SelectItem>
	                    {scannedWineRegions.map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label htmlFor="scan-service">Servicio</Label>
	                <Select value={scanServiceFilter} onValueChange={(value) => {
                    setScanMaxPrice('');
                    setScanServiceFilter(value);
                  }}>
	                  <SelectTrigger id="scan-service"><SelectValue /></SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="all">Copa o botella</SelectItem>
	                    <SelectItem value="copa">Por copa</SelectItem>
	                    <SelectItem value="botella">Por botella</SelectItem>
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
                <Label htmlFor="scan-min-score">Afinidad mínima</Label>
	                <Select value={scanMinScore} onValueChange={setScanMinScore}>
	                  <SelectTrigger id="scan-min-score"><SelectValue /></SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="all">Cualquier afinidad</SelectItem>
	                    <SelectItem value="60">60% o mas</SelectItem>
	                    <SelectItem value="75">75% o mas</SelectItem>
	                    <SelectItem value="85">85% o mas</SelectItem>
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label htmlFor="scan-min-confidence">Señal de identidad</Label>
	                <Select value={scanMinConfidence} onValueChange={setScanMinConfidence}>
	                  <SelectTrigger id="scan-min-confidence"><SelectValue /></SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="all">Cualquier confianza</SelectItem>
	                    <SelectItem value="0.5">50% o mas</SelectItem>
	                    <SelectItem value="0.7">70% o mas</SelectItem>
	                    <SelectItem value="0.85">85% o mas</SelectItem>
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
                <Label htmlFor="scan-max-price">Precio máximo{menuCurrency ? ` (${menuCurrency})` : listPriceFormat ? ' (moneda pendiente)' : ' (formato pendiente)'}</Label>
                <Input
                  id="scan-max-price"
                  value={menuCurrency ? scanMaxPrice : ''}
                  disabled={!menuCurrency}
                  onChange={(event) => setScanMaxPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="Sin límite"
                />
              </div>
            </div>
		          </div>)}

		          {visibleScannedWines.length > 0 && (
		            <div className="matchrim-surface overflow-hidden rounded-lg bg-white">
		              <div className={isNative ? 'flex min-w-0 flex-col items-start gap-3 border-b border-stone-100 px-[12px] py-2' : 'flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2'}>
		                <h3 className="font-semibold text-slate-950">Lista de la carta</h3>
		                <span role="status" aria-live="polite" aria-atomic="true" className="text-xs text-slate-500">{visibleScannedWines.length} {visibleScannedWines.length === 1 ? 'resultado' : 'resultados'}</span>
                    {isNative && <Button type="button" variant="outline" className="min-h-[44px] min-w-0 gap-[8px] whitespace-normal px-[12px] py-[8px] text-left" onClick={goToEditing}>
                      <Edit3 aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />Ir a edición
                    </Button>}
		              </div>
		              <div className="divide-y divide-stone-100" role={isNative ? 'list' : undefined}>
	                        {visibleScannedWines.map(({ wine, index }) => isNative ? (
                        <div key={`${wine.nombre}-${index}-list-row`} role="listitem" className="min-w-0 space-y-2 px-[12px] py-3">
                          <button
                            type="button"
                            aria-label={`Abrir ${isNative && isLiteralWineStyle95(wine) ? 'estilo' : 'vino'} ${index + 1}: ${wine.nombre}${isNative && literalMenuServingFormat95(wine) ? ` · ${literalMenuServingFormat95(wine)}` : ''}`}
                            className={`matchrim-pressable flex min-h-[44px] w-full min-w-0 flex-wrap items-center gap-[8px] px-[12px] py-[8px] text-left text-sm font-semibold ${highlightedWineIndex === index ? 'bg-amber-50' : 'hover:bg-stone-50'}`}
                            onClick={(event) => openWineDetail(index, event.currentTarget)}
                          >
                            <span aria-hidden="true">{index + 1}.</span>
                            <span>Abrir {isLiteralWineStyle95(wine) ? 'estilo' : 'vino'}</span>
                            <ChevronRight aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />
                          </button>
                          <div className="min-w-0">
                            <span className="block whitespace-normal break-words font-semibold text-slate-950">
                              {wine.nombre}{wine.anada ? ` ${wine.anada}` : ''}
                            </span>
                            {!isLiteralWineStyle95(wine) && !catalogWineFromVerifiedSheet({
                              name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
                              inferredFields: wine.campos_inferidos,
                            }, wine.originalSheet) && <span className="block text-xs font-medium text-stone-600">Nombre leído por confirmar</span>}
                            <span className="block whitespace-normal break-words text-xs text-slate-500">
                              {[wine.productor, wine.region, wine.campos_inferidos?.includes('servicio') ? 'Servicio sin confirmar' : wine.servicio, literalMenuServingFormat95(wine)].filter(Boolean).join(' · ') || 'Datos por revisar'}
                            </span>
                            <span className={`block whitespace-normal break-words text-xs ${wine.precio_manual_pendiente ? 'font-medium text-amber-800' : 'text-slate-500'}`}>{listPriceText(wine, index)}</span>
                            {renderNativeTakeawayPrice(wine, requestedServiceFormat === 'any' ? null : requestedServiceFormat)}
                            {Boolean(wine.lecturas_alternativas?.length) && <span className="block whitespace-normal break-words text-xs font-medium text-amber-800">Lecturas distintas: abre el detalle para revisar</span>}
                          </div>
                          <div className="min-w-0">
                            {getWineDecision(wine).score !== null
                              ? <span className="block text-lg font-bold text-red-900">≈{getWineDecision(wine).score}/100</span>
                              : <span className="block text-xs text-stone-600">Afinidad pendiente</span>}
                            <span className="block text-[11px] text-slate-500">{catalogWineFromVerifiedSheet({
                              name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
                              inferredFields: wine.campos_inferidos,
                            }, wine.originalSheet) ? 'Ficha original vinculada' : isLiteralWineStyle95(wine) ? 'Estilo de la carta \u00b7 botella sin identificar' : 'Referencia por confirmar'}</span>
                          </div>
                        </div>
                      ) : (
		                  <button
		                    key={`${wine.nombre}-${index}-list-row`}
		                    type="button"
                    aria-label={`Abrir ${isNative && isLiteralWineStyle95(wine) ? 'estilo' : 'vino'} ${index + 1}: ${wine.nombre}${isNative && literalMenuServingFormat95(wine) ? ` · ${literalMenuServingFormat95(wine)}` : ''}`}
			                    className={`matchrim-pressable flex min-h-16 w-full flex-wrap items-center gap-3 ${isNative ? 'px-[12px]' : 'px-3'} py-3 text-left ${highlightedWineIndex === index ? 'bg-amber-50' : 'hover:bg-stone-50'}`}
		                    onClick={(event) => openWineDetail(index, event.currentTarget)}
		                  >
	                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-950 text-sm font-bold text-white">{index + 1}</span>
		                    <span className={isNative ? 'min-w-[min(6rem,100%)] flex-1 [html.matchrim-accessibility-text_&]:basis-full' : 'min-w-[min(6rem,100%)] flex-1'}>
	                      <span className="block whitespace-normal break-words font-semibold text-slate-950">
                            {wine.nombre}{wine.anada ? ` ${wine.anada}` : ''}
                          </span>
                          {isNative && !isLiteralWineStyle95(wine) && !catalogWineFromVerifiedSheet({
                            name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
                            inferredFields: wine.campos_inferidos,
                          }, wine.originalSheet) && <span className="block text-xs font-medium text-stone-600">Nombre leído por confirmar</span>}
		                      <span className="block whitespace-normal break-words text-xs text-slate-500">
		                        {[wine.productor, wine.region, wine.campos_inferidos?.includes('servicio') ? 'Servicio sin confirmar' : wine.servicio, isNative ? literalMenuServingFormat95(wine) : null].filter(Boolean).join(' · ') || 'Datos por revisar'}
		                      </span>
                          <span className={`block whitespace-normal break-words text-xs ${wine.precio_manual_pendiente ? 'font-medium text-amber-800' : 'text-slate-500'}`}>{listPriceText(wine, index)}</span>
                          {renderNativeTakeawayPrice(wine, requestedServiceFormat === 'any' ? null : requestedServiceFormat)}
                          {isNative && Boolean(wine.lecturas_alternativas?.length) && <span className="block whitespace-normal break-words text-xs font-medium text-amber-800">Lecturas distintas: abre el detalle para revisar</span>}
		                    </span>
		                    <span className="shrink-0 text-right">
		                      {getWineDecision(wine).score !== null
                            ? <span className="block text-lg font-bold text-red-900">≈{getWineDecision(wine).score}{isNative ? '/100' : '%'}</span>
                            : <span className="block text-xs text-stone-600">Afinidad pendiente</span>}
		                      <span className="block text-[11px] text-slate-500">{isNative ? catalogWineFromVerifiedSheet({
                            name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
                            inferredFields: wine.campos_inferidos,
                          }, wine.originalSheet) ? 'Ficha original vinculada' : isLiteralWineStyle95(wine) ? 'Estilo de la carta \u00b7 botella sin identificar' : 'Referencia por confirmar'
                            : `Identidad ${getConfidenceBand(wine.confidence)}`}</span>
		                    </span>
		                  </button>
		                ))}
		              </div>
		            </div>
		          )}

	          {visibleScannedWines.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No hay vinos que cumplan esos filtros. Prueba a subir el precio máximo o cambiar el tipo.
              </CardContent>
            </Card>
	          ) : (
	            <details className="rounded-lg border border-stone-200 bg-white">
	              <summary ref={isNative ? fullActionsSummaryRef : undefined} className="flex min-h-12 cursor-pointer items-center px-4 py-3 text-sm font-semibold text-slate-900">Ver fichas completas y acciones</summary>
	              <div className="divide-y divide-stone-100 border-t border-stone-100">
			              {visibleScannedWines.map(({ wine, index }) => {
			                const isEditing = editingWineIndex === index;
			                const similarWines = getSimilarWines(wine, index);
			                  const wishlistSaveKey = `wishlist-${wine.nombre}-${index}`;
			                  const tastedSaveKey = `tasted-${wine.nombre}-${index}`;
			                  const favoriteSaveKey = `favorite-${wine.nombre}-${index}`;
			                  const wineDecision = getWineDecision(wine);

			                return (
			                  <div key={`menu-row-${index}-actions`}>
			                    <button
			                      type="button"
			                      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-stone-50"
			                      aria-expanded={expandedWineActionsIndex === index}
			                      aria-controls={`wine-actions-${index}`}
			                      onClick={() => setExpandedWineActionsIndex((current) => current === index ? null : index)}
			                    >
			                      <span className="min-w-0">
			                        <span className="block truncate text-sm font-semibold text-slate-950">{index + 1}. {wine.nombre}</span>
			                        <span className="block truncate text-xs text-slate-500">{wine.productor || 'Identidad parcial'}</span>
			                      </span>
			                      <span className="shrink-0 text-xs font-medium text-red-900">Editar y guardar</span>
			                    </button>
			                    {expandedWineActionsIndex === index && (
			                    <div id={`wine-actions-${index}`} className={isNative ? 'min-w-0 bg-white' : "bg-stone-50 p-2 sm:p-3"}>
			              <Card
		                className={isNative ? 'min-w-0 rounded-none border-0 bg-transparent shadow-none' : `overflow-hidden rounded-lg transition ${
		                  highlightedWineIndex === index ? 'ring-2 ring-red-700 ring-offset-2' : ''
		                }`}
	              >
	                <CardContent className="p-0">
                    <div className={isNative ? 'min-w-0 border-b border-stone-200 px-[12px] py-[12px] text-stone-950' : "border-b border-white/10 matchrim-ink-panel px-3 py-4 text-white sm:px-5"}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
	                          {!isNative && <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Ficha de carta</p>}
	                          <h4 className="mt-1 break-words text-xl font-bold leading-tight">{wine.nombre}</h4>
	                          {wine.productor && (
	                            <p className={isNative ? 'mt-1 break-words text-sm text-stone-600' : "mt-1 break-words text-sm text-white/68"}>{wine.productor}</p>
	                          )}
	                          {!isNative && <Badge variant="outline" className="mt-3 border-white/15 bg-white/10 text-white">
	                            {wineDecision.label}
	                          </Badge>}
	                        </div>
                        {!isNative && wineDecision.score !== null && (
                          <div className="shrink-0 rounded-md bg-white px-3 py-2 text-center text-red-950">
                            <div className="text-2xl font-bold leading-none">≈{wineDecision.score}{isNative ? '/100' : '%'}</div>
	                            <div className="mt-1 text-[10px] font-semibold uppercase text-red-900/70">Encaje</div>
	                          </div>
	                        )}
                      </div>
                    </div>
                    <div className={isNative ? 'min-w-0 p-[12px] [&_p]:break-words' : "p-3 sm:p-6 [&_p]:break-words"}>
                      {isNative && <div className="mb-[16px]">{renderWineAffinityExplanation(wine)}</div>}
	                  <div className="flex flex-col gap-4 lg:flex-row">
	                    {/* Wine Info */}
	                    <div className="flex-1 space-y-3">
	                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
	                        <div className="min-w-0">
                            <p className="text-sm font-medium text-muted-foreground">
                              {[wine.region, wine.pais, wine.anada].filter(Boolean).join(' · ') || 'Origen por confirmar'}
                            </p>
	                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto min-h-11 max-w-full gap-2 self-start whitespace-normal [&_svg]:shrink-0"
                          onClick={() => setEditingWineIndex(isEditing ? null : index)}
                        >
                          <Edit3 className="h-4 w-4" />
                          {isEditing ? 'Cerrar edición' : 'Editar'}
                        </Button>
                        {isNative && scannedWines.length >= 2 && <Button
                          type="button"
                          variant="outline"
                          className="h-auto min-h-[44px] w-full min-w-0 gap-[8px] self-start whitespace-normal px-[12px] py-[8px] sm:w-auto"
                          onClick={returnToComparison}
                        >
                          <ArrowUp aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />
                          Ir al comparador
                        </Button>}
                      </div>

                      {isEditing && (
                        <div className="matchrim-soft-surface rounded-lg p-0 sm:p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor={`scan-name-${index}`}>Nombre</Label>
                              <Input
                                id={`scan-name-${index}`}
                                value={wine.nombre}
                                onChange={(event) => updateScannedWine(index, { nombre: event.target.value })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-producer-${index}`}>Productor</Label>
                              <Input
                                id={`scan-producer-${index}`}
                                value={wine.productor || ''}
                                onChange={(event) => updateScannedWine(index, { productor: event.target.value || null })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-vintage-${index}`}>Añada</Label>
                              <Input
                                id={`scan-vintage-${index}`}
                                value={wine.anada?.toString() || ''}
                                inputMode="numeric"
                                onChange={(event) => updateScannedWine(index, { anada: parseNullableNumber(event.target.value) })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-region-${index}`}>Región</Label>
                              <Input
                                id={`scan-region-${index}`}
                                value={wine.region || ''}
                                onChange={(event) => updateScannedWine(index, { region: event.target.value || null })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-country-${index}`}>País</Label>
                              <Input
                                id={`scan-country-${index}`}
                                value={wine.pais || ''}
                                onChange={(event) => updateScannedWine(index, { pais: event.target.value || null })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-type-${index}`}>Tipo</Label>
                              <Input
                                id={`scan-type-${index}`}
                                value={wine.tipo}
                                onChange={(event) => updateScannedWine(index, { tipo: event.target.value })}
                              />
                            </div>
                            <MenuPriceEditor wine={wine} index={index}
                              locked={Boolean(savedCardsRef.current.has(index) || pendingIdentitiesRef.current.has(index)
                                || unconfirmedWineIndexes.has(index) || identityHoldIndexes.has(index) || savingWineKey)}
                              onApply={(updated) => updateScannedWine(index, updated)} />
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor={`scan-grapes-${index}`}>Uvas</Label>
                              <Input
                                id={`scan-grapes-${index}`}
                                value={wine.uvas?.join(', ') || ''}
                                onChange={(event) => updateScannedWine(index, {
                                  uvas: event.target.value.split(',').map((grape) => grape.trim()).filter(Boolean),
                                })}
                              />
                            </div>
                            <div className="space-y-1.5 md:col-span-2">
                              <Label htmlFor={`scan-description-${index}`}>Notas</Label>
                              <Textarea
                                id={`scan-description-${index}`}
                                value={wine.descripcion || ''}
                                onChange={(event) => updateScannedWine(index, { descripcion: event.target.value || null })}
                                rows={3}
                              />
                            </div>
                          </div>
	                        </div>
	                      )}

                      <div className="flex flex-wrap gap-2">
                        {wine.anada && (
                          <Badge variant="outline">{wine.anada}</Badge>
                        )}
                        {wine.region && (
                          <Badge variant="outline">{wine.region}</Badge>
                        )}
                        {wine.pais && (
                          <Badge variant="outline">{wine.pais}</Badge>
                        )}
                        <Badge variant="secondary" className="capitalize">{wine.tipo}</Badge>
                        {wine.precio !== null && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {wine.precio_manual_asignacion ? manualMenuPriceLines(wine).join(' · ') : formatPrice(wine.precio, wine.moneda)}
                          </Badge>
                        )}
                      </div>

                      {wine.uvas && wine.uvas.length > 0 && (
                        <div>
                          <span className="text-xs text-muted-foreground">Variedades: </span>
                          <span className="text-sm font-medium">{wine.uvas.join(', ')}</span>
                        </div>
                      )}

	                      {wine.descripcion && (
	                        <p className="text-sm text-muted-foreground leading-relaxed">
	                          {wine.descripcion}
	                        </p>
	                      )}

	                      {!isNative && <div className={`rounded-lg border p-3 text-sm leading-6 ${wineDecision.className}`}>
	                        <p className="font-semibold">{wineDecision.label}</p>
	                        <p className="mt-1">{wineDecision.description}</p>
	                      </div>}

	                    </div>

	                    {!isNative && wineDecision.score !== null && (
	                      <div className="matchrim-soft-surface flex flex-col justify-center gap-3 rounded-lg p-4 lg:min-w-[170px]">
                          <div className="flex items-center gap-2">
                            {getCompatibilityIcon(wineDecision.score)}
                            <span className="text-sm font-semibold">Encaje conmigo</span>
                          </div>
                          <div>
                            <div className="text-3xl font-bold">≈{wineDecision.score}{isNative ? '/100' : '%'}</div>
                            <div className={`mt-2 h-2 w-full rounded-full ${getCompatibilityColor(wineDecision.score)}`} />
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            Calculado contra tu perfil Matchrim, no contra popularidad general.
                          </p>
	                      </div>
	                    )}
	                  </div>

		                  {!isNative && <div className="mt-4">
		                    {renderWineAffinityExplanation(wine)}
		                  </div>}

	                  {similarWines.length > 0 && (
	                    <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-3">
	                      <p className="text-sm font-semibold text-red-950">Fichas de estilo parecido en esta carta</p>
                          <p className="mt-1 text-xs text-red-900">Comparación de cinco atributos de fichas Winerim; no es afinidad personal.</p>
	                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
	                        {similarWines.map(({ wine: similarWine, index: similarIndex, score }) => (
	                          <button
	                            key={`${similarWine.nombre}-${similarIndex}-similar`}
	                            type="button"
	                            className="matchrim-pressable rounded-md border bg-white p-3 text-left text-sm shadow-sm hover:border-red-300 hover:bg-red-50"
		                            onClick={(event) => openWineDetail(similarIndex, event.currentTarget)}
	                          >
	                            <div className="flex items-start justify-between gap-2">
	                              <span className="font-medium text-red-950">{similarWine.nombre}</span>
		                              {getWineDecision(similarWine).score !== null && (
	                                <Badge className="shrink-0 bg-red-800 hover:bg-red-800">
		                                  ≈{getWineDecision(similarWine).score}%
	                                </Badge>
	                              )}
	                            </div>
	                            <p className="mt-1 text-xs text-muted-foreground">
                              {menuWineSimilarityBand(score)}
	                            </p>
	                          </button>
	                        ))}
	                      </div>
	                    </div>
		          )}
                        {similarWines.length === 0 && <p id={`menu-similarity-pending-${index}`} className="mt-4 break-words text-sm text-slate-600">
                          {menuWineSimilarityUnavailable(wine, scannedWines.filter((_, candidateIndex) => candidateIndex !== index))}
                        </p>}

                        {unconfirmedWineIndexes.has(index) && (
                          <p role="status" className="mt-4 text-sm text-amber-900">Guardado sin confirmar. Revisa Bodega antes de repetirlo.</p>
                        )}
                        {identityHoldIndexes.has(index) && (
                          <p role="status" className="mt-4 text-sm text-amber-900">Identidad editada; el guardado anterior no se modifica. Revisa la identificación en Bodega.</p>
                        )}
			                {isNative && isLiteralWineStyle95(wine) && <p role="status" className="mt-4 text-sm text-stone-700">Esta carta indica un estilo, no la botella. Corrige la identificación con su nombre y bodega antes de guardarla.</p>}
			                  <div className={isNative ? 'mt-[16px] grid min-w-0 grid-cols-1 gap-[8px] [&>button]:h-auto [&>button]:min-h-[44px] [&>button]:min-w-0 [&>button]:whitespace-normal [&>button]:px-[12px] [&>button]:py-[10px] [&>button_svg]:shrink-0' : "mt-4 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 [&>button]:h-auto [&>button]:min-h-11 [&>button]:whitespace-normal [&>button]:py-2 [&>button_svg]:shrink-0"}>
		                    <Button
		                      onClick={() => saveWineToWishlist(wine, index)}
		                      disabled={isNative && isLiteralWineStyle95(wine) || Boolean(savingWineKey) || unconfirmedWineIndexes.has(index) || identityHoldIndexes.has(index) || savedWineKeys.has(wishlistSaveKey)}
		                      variant="outline"
		                      className="gap-2"
		                    >
		                      {savedWineKeys.has(wishlistSaveKey) ? (
		                        <CheckCircle className="h-4 w-4 text-green-600" />
		                      ) : savingWineKey === wishlistSaveKey ? (
		                        <Loader2 className="h-4 w-4 animate-spin" />
		                      ) : (
		                        <BookmarkPlus className="h-4 w-4" />
		                      )}
		                      {savedWineKeys.has(wishlistSaveKey) ? 'Guardado' : 'Quiero Probar'}
		                    </Button>
			                    <Button
			                      onClick={() => saveWineAsTasted(wine, index)}
			                      disabled={isNative && isLiteralWineStyle95(wine) || Boolean(savingWineKey) || unconfirmedWineIndexes.has(index) || identityHoldIndexes.has(index) || savedWineKeys.has(tastedSaveKey)}
			                      variant="outline"
		                      className="gap-2"
		                    >
		                      {savedWineKeys.has(tastedSaveKey) ? (
		                        <CheckCircle className="h-4 w-4 text-green-600" />
		                      ) : savingWineKey === tastedSaveKey ? (
		                        <Loader2 className="h-4 w-4 animate-spin" />
		                      ) : (
		                        <CheckCircle className="h-4 w-4" />
		                      )}
			                      {savedWineKeys.has(tastedSaveKey) ? 'Guardado' : 'Lo he probado'}
			                    </Button>
			                    <Button
			                      onClick={() => saveWineAsFavorite(wine, index)}
			                      disabled={isNative && isLiteralWineStyle95(wine) || Boolean(savingWineKey) || unconfirmedWineIndexes.has(index) || identityHoldIndexes.has(index) || savedWineKeys.has(favoriteSaveKey)}
			                      variant="outline"
			                      className="gap-2"
			                    >
			                      {savedWineKeys.has(favoriteSaveKey) ? (
			                        <CheckCircle className="h-4 w-4 text-green-600" />
			                      ) : savingWineKey === favoriteSaveKey ? (
			                        <Loader2 className="h-4 w-4 animate-spin" />
				                      ) : (
				                        <Heart className="h-4 w-4" />
				                      )}
				                      {savedWineKeys.has(favoriteSaveKey) ? 'Favorito' : 'Añadir favorito'}
				                    </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={(event) => openWineDetail(similarWines[0]?.index ?? index, event.currentTarget)}
                          disabled={similarWines.length === 0}
                          aria-describedby={similarWines.length === 0 ? `menu-similarity-pending-${index}` : undefined}
                        >
	                          <ScanLine className="h-4 w-4" />
	                          Ver parecidos
	                        </Button>
		                    <Button
		                      type="button"
		                      variant="outline"
	                      className="gap-2"
	                      onClick={() => openAiRimForWine(wine)}
	                    >
	                      <Sparkles className="h-4 w-4" />
                          Consultar afinidad
		                    </Button>
		                  </div>
                    </div>
		                </CardContent>
			              </Card>
			                    </div>
			                    )}
			                  </div>
                );
	              })}
		              </div>
		            </details>
		          )}

		          {restaurantName && (
	            <div className="rounded-lg border border-red-100 bg-red-50/80 p-4">
	              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	                <div>
	                  <p className="font-semibold text-red-950">Este restaurante todavía no usa Winerim</p>
	                  <p className="text-sm text-red-900/75">
	                    El escaneo queda como señal de demanda. También puedes enviárselo al restaurante.
	                  </p>
	                </div>
	                <div className="grid grid-cols-2 gap-2 sm:flex">
	                  <Button asChild variant="outline" size="sm" className="gap-2 bg-white">
	                    <a href={restaurantMailtoHref}>
	                      <Mail className="h-4 w-4" />
	                      Email
	                    </a>
	                  </Button>
	                  <Button asChild size="sm" className="gap-2 bg-red-800 hover:bg-red-900">
	                    <a href={restaurantWhatsappHref} target="_blank" rel="noopener noreferrer">
	                      <MessageCircle className="h-4 w-4" />
	                      WhatsApp
	                    </a>
	                  </Button>
	                </div>
	              </div>
	            </div>
	          )}
	        </div>
	      )}

	      <Drawer autoFocus open={selectedPinIndex !== null} onOpenChange={(open) => {
          if (!open) { detailFocusRef.current.open = false; if (profileRetryRef.current) invalidateProfileRetry(); setSelectedPinIndex(null); }
        }}>
	        <DrawerContent onCloseAutoFocus={restoreDetailFocus} className={isNative ? 'w-full min-w-0 max-w-[100vw] max-h-[88vh] border-stone-200 bg-stone-50 [&>div:first-child]:mt-[8px] [&>div:first-child]:h-[4px]' : 'w-full min-w-0 max-w-[100vw] max-h-[88vh] border-stone-200 bg-stone-50'}>
	          {selectedPinWine && selectedPinIndex !== null && (
	            <>
	              <DrawerHeader className={isNative ? 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white px-[8px] py-[12px] text-left' : 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white text-left'}>
	                <div className={isNative ? 'flex min-w-0 items-start justify-between gap-[4px]' : 'flex items-start justify-between gap-3'}>
	                  <div className={isNative ? 'max-h-[40vh] min-w-0 flex-1 overflow-y-auto' : 'min-w-0'}>
	                    <DrawerTitle className={isNative ? 'tracking-normal' : undefined}>{selectedPinIndex + 1}. {selectedPinWine.nombre}{isNative && literalMenuServingFormat95(selectedPinWine) && <span className="block text-sm font-normal leading-6 text-slate-600">{literalMenuServingFormat95(selectedPinWine)}</span>}</DrawerTitle>
	                    <DrawerDescription className={isNative ? 'sr-only' : 'mt-1'}>
	                      {[selectedPinWine.productor, selectedPinWine.region, formatPrice(selectedPinWine.precio, selectedPinWine.moneda)].filter(Boolean).join(' · ') || 'Datos por revisar'}
	                    </DrawerDescription>
	                  </div>
	                  <DrawerClose asChild>
	                    <Button type="button" variant="ghost" size="icon" className={isNative ? 'h-[44px] w-[44px] shrink-0' : 'h-11 w-11 shrink-0'} aria-label="Cerrar detalle"><X className={isNative ? 'h-[20px] w-[20px]' : 'h-4 w-4'} style={isNative ? { width: 20, height: 20 } : undefined} /></Button>
	                  </DrawerClose>
	                </div>
	              </DrawerHeader>
              <div role="region" aria-label="Contenido del vino" tabIndex={0} className={isNative ? 'min-h-[44px] min-w-0 flex-1 overflow-y-auto break-words p-[16px]' : 'min-h-0 min-w-0 flex-1 overflow-y-auto break-words p-4'}>
                            {isNative && !isLiteralWineStyle95(selectedPinWine) && !catalogWineFromVerifiedSheet({
                              name: selectedPinWine.nombre, producer: selectedPinWine.productor, vintage: selectedPinWine.anada,
                              region: selectedPinWine.region, country: selectedPinWine.pais, inferredFields: selectedPinWine.campos_inferidos,
                            }, selectedPinWine.originalSheet) && <p className="text-sm text-stone-600">Nombre leído por confirmar</p>}
                {renderProfileRecovery()}
                {isNative && renderWineAffinityExplanation(selectedPinWine)}
                {isNative && <p className="my-3 text-sm text-slate-600">{[selectedPinWine.productor, selectedPinWine.region,
                  formatPrice(selectedPinWine.precio, selectedPinWine.moneda)].filter(Boolean).join(' · ')}</p>}
                {renderNativeTakeawayPrice(selectedPinWine)}
	                {!isNative && <div className="matchrim-data-rail mb-4 grid grid-cols-3 gap-3 rounded-lg px-2 py-3 text-center">
	                  <div><div className="text-xl font-bold text-red-900">{selectedPinDecision?.score == null ? '-' : `≈${selectedPinDecision.score}%`}</div><div className="text-xs text-slate-500">{selectedPinDecision?.state === 'pending' ? 'Afinidad pendiente' : 'Afinidad estimada'}</div></div>
	                  <div><div className="text-xl font-bold capitalize text-slate-900">{getConfidenceBand(selectedPinWine.confidence)}</div><div className="text-xs text-slate-500">Señal de identidad</div></div>
	                  <div><div className="truncate text-sm font-bold capitalize text-slate-900">{selectedPinWine.tipo || '-'}</div><div className="text-xs text-slate-500">Tipo</div></div>
	                </div>}
	                <WinerimOriginalSheet sheet={selectedPinWine.originalSheet} />
                    {!selectedPinWine.originalSheet?.detailVerified && <WinerimSheetLookup identity={{
                      name: selectedPinWine.nombre, producer: selectedPinWine.productor, vintage: selectedPinWine.anada,
                      inferredFields: selectedPinWine.campos_inferidos,
                      region: selectedPinWine.campos_inferidos?.includes('region') ? null : selectedPinWine.region,
                      country: selectedPinWine.campos_inferidos?.some(field => /^(country|pais|país)$/i.test(field)) ? null : selectedPinWine.pais,
                    }} onVerified={(sheet) => {
                      const identity = menuCardIdentity(selectedPinWine);
                      setScannedWines(current => current.map((wine, index) => {
                        if (index !== selectedPinIndex || menuCardIdentity(wine) !== identity) return wine;
                        const catalog = catalogWineFromVerifiedSheet({ name: wine.nombre, producer: wine.productor,
                          vintage: wine.anada, region: wine.region, country: wine.pais, inferredFields: wine.campos_inferidos }, sheet);
                        return catalog ? applyMenuWineEvidence(wine, scanProfile?.profile ?? null, catalog) : wine;
                      }));
                    }} />}
	                {isNative && !loading && !retryingProfile && !selectedPinWine.originalSheet?.detailVerified && !savingRef.current
                    && !savedCardsRef.current.has(selectedPinIndex) && !unconfirmedRef.current.has(selectedPinIndex)
                    && !identityHoldsRef.current.has(selectedPinIndex) && <WinerimCandidatePicker95
                      initialQuery={selectedPinWine.nombre}
                      contextKey={JSON.stringify([selectedPinIndex, menuCardIdentity(selectedPinWine), scanProfile?.profile])}
                      onConfirmed={sheet => {
                        if (savingRef.current || savedCardsRef.current.has(selectedPinIndex) || unconfirmedRef.current.has(selectedPinIndex)
                          || identityHoldsRef.current.has(selectedPinIndex)) return;
                        const identity = menuCardIdentity(selectedPinWine);
                        setScannedWines(current => current.map((wine, index) => index === selectedPinIndex && menuCardIdentity(wine) === identity
                          ? confirmedMenuCatalogIdentity95(wine, sheet, scanProfile?.profile ?? null) ?? wine : wine));
                      }}
                    />}
	                {!isNative && selectedPinWine.descripcion && <p className="mb-4 text-sm leading-6 text-slate-600">{selectedPinWine.descripcion}</p>}
                    {isNative ? <details className="my-3 text-sm">
                      <summary className="min-h-11 cursor-pointer py-3 font-medium text-stone-700">Qué he leído en la carta</summary>
                      {selectedReadingEvidence}
                    </details> : selectedReadingEvidence}
			                <div className="mb-4">
			                  <AiRimContextGuide
                            profile={scanProfile?.profile ?? null}
			                    context="menu"
			                    name={selectedPinWine.nombre}
			                    identityConfidence={selectedPinWine.confidence}
			                    affinity={selectedPinDecision?.score ?? null}
			                    attributes={selectedPinWine.atributos}
			                    sensorySource={selectedPinWine.sensorySource ?? 'inference'}
                            catalogIdentityLinked={Boolean(selectedPinWine.originalSheet?.detailVerified)}
			                    uncertaintyReasons={selectedPinWine.dudas}
			                    hasAlternatives={scannedWines.length > 1}
			                  />
			                </div>
	                {!isNative && renderWineAffinityExplanation(selectedPinWine)}
	              </div>
	              <DrawerFooter className={isNative ? 'min-w-0 shrink-0 border-t border-stone-200 bg-white p-[12px]' : 'min-w-0 shrink-0 border-t border-stone-200 bg-white'}>
	                <div className={isNative ? 'grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-2' : 'grid grid-cols-2 gap-2'}>
	                  <Button ref={detailPreviousRef} type="button" variant="outline" aria-label={isNative ? 'Anterior' : undefined} title={isNative ? 'Vino anterior' : undefined} className={isNative ? 'matchrim-pressable h-[44px] w-[44px] min-w-0 bg-white p-0' : 'matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2'} disabled={selectedPinIndex === 0} onClick={(event) => {
	                    const next = Math.max(0, selectedPinIndex - 1);
                      if (next === 0 && document.activeElement === event.currentTarget) {
                        detailNextRef.current?.focus({ preventScroll: true });
                      }
	                    openWineDetail(next);
	                  }}><ChevronLeft className={isNative ? 'h-[20px] w-[20px]' : 'h-4 w-4'} />{!isNative && ' Anterior'}</Button>
                    {isNative && <span className="min-w-0 text-center text-sm text-slate-600" aria-live="polite">{selectedPinIndex + 1} de {scannedWines.length}</span>}
	                  <Button ref={detailNextRef} type="button" variant="outline" aria-label={isNative ? 'Siguiente' : undefined} title={isNative ? 'Vino siguiente' : undefined} className={isNative ? 'matchrim-pressable h-[44px] w-[44px] min-w-0 bg-white p-0' : 'matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2'} disabled={selectedPinIndex >= scannedWines.length - 1} onClick={(event) => {
	                    const next = Math.min(scannedWines.length - 1, selectedPinIndex + 1);
                      if (next === scannedWines.length - 1 && document.activeElement === event.currentTarget) {
                        detailPreviousRef.current?.focus({ preventScroll: true });
                      }
	                    openWineDetail(next);
	                  }}>{!isNative && 'Siguiente '}<ChevronRight className={isNative ? 'h-[20px] w-[20px]' : 'h-4 w-4'} /></Button>
	                </div>
	              </DrawerFooter>
	            </>
	          )}
	        </DrawerContent>
	      </Drawer>
    </div>
  );
};

export const WineMenuScanner = (props: WineMenuScannerProps = {}) => {
  const { user } = useAuth();
  return <WineMenuScannerSession key={user?.id ?? 'anonymous'} {...props} />;
};

export default WineMenuScanner;
