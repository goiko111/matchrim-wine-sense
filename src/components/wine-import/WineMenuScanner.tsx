import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import { WineComparisonWorkspace } from "@/components/wine-import/WineComparisonWorkspace";
import { Loader2, Upload, Camera, X, CheckCircle, AlertCircle, Sparkles, BookmarkPlus, Edit3, Mail, MessageCircle, Trophy, CircleSlash, Target, Heart, ScanLine, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { trackAppEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { prepareImageForAnalysis, shouldRejectTextAnalysis } from "@/utils/imageAnalysis";
import { invokeEdgeFunction } from "@/utils/invokeEdgeFunction";
import { isMatchrimFixtureQaEnabled } from "@/utils/matchrimQaMode";
import { isWineMenuItem } from "@/utils/wineMenuGrounding";
import {
  calibrateInferredAffinity,
  calibrateMenuIdentityConfidence,
  getConfidenceBand,
} from "@/utils/scanConfidence";

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

interface ScannedWine {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  precio: number | null;
  tipo: string;
  descripcion: string | null;
  uvas?: string[];
  atributos?: {
    potencia: number;
    acidez: number;
    dulzura: number;
    taninos: number;
    afrutado: number;
  } | null;
  compatibilidad?: number | null;
  razon?: string | null;
  texto_fuente?: string | null;
  dudas?: string[] | null;
  campos_inferidos?: string[] | null;
  confidence?: number | null;
  servicio?: 'copa' | 'botella' | 'ambos' | null;
  seccion?: string | null;
  precios?: {
    copa?: number | null;
    botella?: number | null;
    llevar?: number | null;
  } | null;
  posicion?: {
    x?: number | null;
    y?: number | null;
    width?: number | null;
    height?: number | null;
    confidence?: number | null;
    confianza?: number | null;
  } | null;
}

interface WineMenuScannerProps {
  restaurantName?: string;
  matchrimCode?: string;
  restaurantSessionId?: string | null;
  pairingDishName?: string | null;
  similarWineName?: string | null;
  onScanComplete?: (winesDetected: number) => void;
}

interface WineMenuScanResponse {
  vinos?: ScannedWine[];
  has_profile?: boolean;
  coverage?: {
    status?: 'reported_complete' | 'partial' | 'unknown';
    extracted_wines?: number;
    estimated_visible_wines?: number | null;
    notes?: string[];
  };
}

interface MatchrimProfilePayload {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

type ScannedWineSortMode = 'compatibility' | 'price-asc' | 'price-desc' | 'name';

const formatWineType = (type?: string | null) => type?.trim() || 'Sin tipo';
const formatPrice = (price?: number | null) => typeof price === 'number' && Number.isFinite(price)
  ? `${price.toFixed(2)}€`
  : null;

const parseNullableNumber = (value: string) => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePercentage = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, numeric));
};

const normalizeAttributeTo5 = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
  return Math.max(1, Math.min(5, Math.round(scaled)));
};

const normalizeAttributesTo5 = (attributes: ScannedWine['atributos']) => {
  if (!attributes) return null;

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

const normalizeCompatibility = calibrateInferredAffinity;
const normalizeProfileValue = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(1, Math.min(5, Math.round(numeric)));
};

const readStoredMatchrimProfile = (): MatchrimProfilePayload | null => {
  try {
    const rawProfile = localStorage.getItem('matchrim_quiz_result');
    if (!rawProfile) return null;

    const parsed = JSON.parse(rawProfile) as Partial<Record<keyof MatchrimProfilePayload, unknown>>;
    const potente = normalizeProfileValue(parsed.potente);
    const acidez = normalizeProfileValue(parsed.acidez);
    const dulce = normalizeProfileValue(parsed.dulce);
    const tanico = normalizeProfileValue(parsed.tanico);
    const afrutado = normalizeProfileValue(parsed.afrutado);

    if (potente === null || acidez === null || dulce === null || tanico === null || afrutado === null) {
      return null;
    }

    return { potente, acidez, dulce, tanico, afrutado };
  } catch (error) {
    console.warn('Could not read stored Matchrim profile for wine menu scan:', error);
    return null;
  }
};

const normalizePositionConfidence = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
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
    compatibilidad: normalizeCompatibility(wine.compatibilidad),
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
  let score = 0;
  let signals = 0;

  if (source.atributos && candidate.atributos) {
    const distance = Math.sqrt(
      Math.pow(source.atributos.potencia - candidate.atributos.potencia, 2) +
      Math.pow(source.atributos.acidez - candidate.atributos.acidez, 2) +
      Math.pow(source.atributos.dulzura - candidate.atributos.dulzura, 2) +
      Math.pow(source.atributos.taninos - candidate.atributos.taninos, 2) +
      Math.pow(source.atributos.afrutado - candidate.atributos.afrutado, 2)
    );
    const maxDistance = Math.sqrt(5 * Math.pow(4, 2));
    score += Math.max(0, 100 - (distance / maxDistance) * 100) * 0.7;
    signals += 0.7;
  }

  const sourceType = formatWineType(source.tipo).toLowerCase();
  const candidateType = formatWineType(candidate.tipo).toLowerCase();
  if (sourceType && candidateType) {
    score += (sourceType === candidateType ? 100 : 35) * 0.15;
    signals += 0.15;
  }

  const sourceGrapes = new Set((source.uvas || []).map((grape) => grape.toLowerCase()));
  const candidateGrapes = new Set((candidate.uvas || []).map((grape) => grape.toLowerCase()));
  if (sourceGrapes.size && candidateGrapes.size) {
    const overlap = Array.from(sourceGrapes).filter((grape) => candidateGrapes.has(grape)).length;
    const union = new Set([...sourceGrapes, ...candidateGrapes]).size;
    score += ((overlap / union) * 100) * 0.15;
    signals += 0.15;
  }

  if (signals === 0) return 0;
  return Math.round(score / signals);
};

export const WineMenuScanner = ({
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
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [scannedWines, setScannedWines] = useState<ScannedWine[]>([]);
  const [savingWineKey, setSavingWineKey] = useState<string | null>(null);
  const [savedWineKeys, setSavedWineKeys] = useState<Set<string>>(new Set());
  const [hasProfile, setHasProfile] = useState(false);
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
  const [highlightedWineIndex, setHighlightedWineIndex] = useState<number | null>(null);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [menuQualityWarnings, setMenuQualityWarnings] = useState<string[]>([]);
  const [scanPhase, setScanPhase] = useState<'quality' | 'ocr' | 'ranking'>('quality');
  const [imageZoom, setImageZoom] = useState(1);
  const [selectedPinIndex, setSelectedPinIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const wineCardRefs = useRef(new Map<number, HTMLDivElement | null>());
  const scanAbortRef = useRef<AbortController | null>(null);

  const scannedWineTypes = useMemo(
    () => Array.from(new Set(scannedWines.map((wine) => formatWineType(wine.tipo)))).sort(),
    [scannedWines]
  );
  const scannedWineRegions = useMemo(
    () => Array.from(new Set(scannedWines.map((wine) => wine.region?.trim()).filter((region): region is string => Boolean(region)))).sort(),
    [scannedWines]
  );
  const selectedPinWine = selectedPinIndex === null ? null : scannedWines[selectedPinIndex] ?? null;

  const menuDecision = useMemo(() => {
    if (scannedWines.length === 0) return null;

    const scored = scannedWines
      .filter((wine) => typeof wine.compatibilidad === 'number')
      .map((wine, index) => ({ wine, index, score: wine.compatibilidad as number }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0] ?? null;
    const secondaries = scored.slice(1, 3);
    const safeAlternative = scored[1] ?? null;
    const value = scored
      .filter(({ wine, score }) => typeof wine.precio === 'number' && wine.precio > 0 && score >= 60)
      .sort((a, b) => (b.score / Math.max(b.wine.precio ?? 1, 1)) - (a.score / Math.max(a.wine.precio ?? 1, 1)))[0] ?? null;
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
  }, [scannedWines]);

  const visibleScannedWines = useMemo(() => {
    const maxPrice = parseNullableNumber(scanMaxPrice);

    return scannedWines
      .map((wine, index) => ({ wine, index }))
      .filter(({ wine }) => scanTypeFilter === 'all' || formatWineType(wine.tipo) === scanTypeFilter)
      .filter(({ wine }) => scanRegionFilter === 'all' || wine.region === scanRegionFilter)
      .filter(({ wine }) => scanServiceFilter === 'all' || wine.servicio === scanServiceFilter || wine.servicio === 'ambos')
      .filter(({ wine }) => scanMinScore === 'all' || (wine.compatibilidad ?? -1) >= Number(scanMinScore))
      .filter(({ wine }) => scanMinConfidence === 'all' || (wine.confidence ?? 0) >= Number(scanMinConfidence))
      .filter(({ wine }) => maxPrice === null || wine.precio === null || wine.precio === undefined || wine.precio <= maxPrice)
      .sort((a, b) => {
        if (scanSortMode === 'price-asc') {
          return (a.wine.precio ?? Number.POSITIVE_INFINITY) - (b.wine.precio ?? Number.POSITIVE_INFINITY);
        }
        if (scanSortMode === 'price-desc') {
          return (b.wine.precio ?? Number.NEGATIVE_INFINITY) - (a.wine.precio ?? Number.NEGATIVE_INFINITY);
        }
        if (scanSortMode === 'name') {
          return a.wine.nombre.localeCompare(b.wine.nombre, 'es');
        }

        return (b.wine.compatibilidad ?? -1) - (a.wine.compatibilidad ?? -1);
      });
  }, [scanMaxPrice, scanMinConfidence, scanMinScore, scanRegionFilter, scanServiceFilter, scanSortMode, scanTypeFilter, scannedWines]);

  useEffect(() => {
    if (loading || scannedWines.length === 0) return;

    window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
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

  const focusWine = (index: number) => {
    setHighlightedWineIndex(index);
    window.setTimeout(() => {
      wineCardRefs.current.get(index)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
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
    setLoading(true);
    setScannedWines([]);
    setScanFeedback(null);
    setFileType(isPDF ? 'pdf' : 'image');
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
      await convertPdfToImage(file);
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      await processFile(file, 'image');
    }
  };

  const convertPdfToImage = async (file: File) => {
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
        await processFile(imageFile, 'image');
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('Error converting PDF:', error);
      toast.error("Error al convertir el PDF. Por favor intenta con una imagen.");
      setLoading(false);
      setConvertingPdf(false);
    }
  };

  const processFile = async (file: File, type: 'image' | 'pdf') => {
    // Mantener el loader activo durante todo el proceso real
    setLoading(true);
    setScannedWines([]);
    setScanFeedback(null);
    setMenuQualityWarnings([]);
    scanAbortRef.current?.abort();
    const controller = new AbortController();
    scanAbortRef.current = controller;

    try {
      setScanPhase('quality');
      const prepared = await prepareImageForAnalysis(file);
      const base64File = prepared.dataUrl;
      setPreview(prepared.dataUrl);
      setMenuQualityWarnings(prepared.quality.warnings);
      if (controller.signal.aborted) return;
      if (shouldRejectTextAnalysis(prepared.quality)) {
        setScanFeedback('La imagen es demasiado pequena y desenfocada para leer la carta. Acerca la camara o fotografia una seccion con el texto enfocado.');
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

      const invokeScan = async (attempt = 1) => {
	        try {
	          return await invokeEdgeFunction<WineMenuScanResponse>('scan-wine-menu', {
	            image: base64File,
	            qa_fixture_name: file.name,
	            matchrimProfile: readStoredMatchrimProfile(),
	            pairingDishName: pairingDishName || null,
	            similarWineName: similarWineName || null,
	          }, controller.signal);
	        } catch (error) {
	          if (error instanceof DOMException && error.name === 'AbortError') throw error;
	          const rawMessage = error instanceof Error ? error.message : String(error);
	          const isTransient = /non-2xx|fetch|network|timeout|error 5\d\d/i.test(rawMessage);
	          if (attempt < 2 && isTransient) {
	            await new Promise((resolve) => window.setTimeout(resolve, 1200));
	            return invokeScan(attempt + 1);
	          }
	          throw error;
	        }
      };

      const data = await invokeScan();

      if (data?.vinos && data.vinos.length > 0) {
	      setScanPhase('ranking');
	        const normalizedWines = (data.vinos as ScannedWine[]).filter(isWineMenuItem).map(normalizeScannedWine);
	        if (data.coverage?.status === 'partial') {
	          const expected = data.coverage.estimated_visible_wines;
	          setMenuQualityWarnings((warnings) => [
	            ...warnings,
	            expected && expected > normalizedWines.length
	              ? `Cobertura parcial: ${normalizedWines.length} de aproximadamente ${expected} lineas legibles.`
	              : 'Cobertura parcial: revisa la imagen y vuelve a escanear la seccion que falte.',
	          ]);
	        }
        setScannedWines(normalizedWines);
        setHasProfile(!!data.has_profile);
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

        toast.success(`✨ ${normalizedWines.length} vinos detectados en la carta`);
      } else {
        setScanFeedback("No he encontrado vinos claros en el documento. Prueba con una foto más cercana o con una sección más pequeña de la carta.");
        toast.info("No se encontraron vinos en el documento");
      }
    } catch (error) {
	    if (error instanceof DOMException && error.name === 'AbortError') {
	      setScanFeedback('Analisis cancelado. Puedes reintentarlo con la misma imagen o elegir otra.');
	      return;
	    }
      console.error('Error processing file:', error);
      const rawMessage = error instanceof Error ? error.message : 'Error al procesar el documento';
      const message = /scanline|scanlines/i.test(rawMessage)
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
      setScanFeedback(`${message}. Si la carta es grande, prueba a escanear solo una página o una sección con menos vinos.`);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const clearScan = () => {
    scanAbortRef.current?.abort();
    setPreview(null);
    setScannedWines([]);
    setSavedWineKeys(new Set());
    setHasProfile(false);
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
    setHighlightedWineIndex(null);
    setScanFeedback(null);
    setMenuQualityWarnings([]);
    setImageZoom(1);
    setSelectedPinIndex(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const updateScannedWine = (index: number, updates: Partial<ScannedWine>) => {
    setScannedWines((currentWines) =>
      currentWines.map((wine, wineIndex) =>
        wineIndex === index ? { ...wine, ...updates } : wine
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

  const getWineDecision = (score?: number | null) => {
    if (typeof score !== 'number') {
      return {
        label: "Sin encaje",
        description: "Falta perfil o datos suficientes para ordenar este vino.",
        className: "border-stone-200 bg-stone-50 text-stone-700",
      };
    }
    if (score >= 85) {
      return {
        label: "Pediría",
        description: "Prioridad alta para tu perfil Matchrim.",
        className: "border-green-200 bg-green-50 text-green-900",
      };
    }
    if (score >= 70) {
      return {
        label: "Buen candidato",
        description: "Encaja bien, revisa precio y estilo antes de elegir.",
        className: "border-amber-200 bg-amber-50 text-amber-950",
      };
    }
    if (score >= 55) {
      return {
        label: "Con matices",
        description: "Puede gustarte si quieres algo menos evidente.",
        className: "border-orange-200 bg-orange-50 text-orange-950",
      };
    }
    return {
      label: "No priorizaría",
      description: "No parece la mejor opción de esta carta para ti.",
      className: "border-red-200 bg-red-50 text-red-950",
    };
  };

  const saveScannedWine = async (wine: ScannedWine, index: number, status: 'wishlist' | 'tasted', favorite = false) => {
    if (!user) {
      toast.error("Inicia sesión para guardar vinos");
      navigate(buildAuthRedirectPath(`${location.pathname}${location.search}`));
      return;
    }

    const saveKey = `${favorite ? 'favorite' : status}-${wine.nombre}-${index}`;
    setSavingWineKey(saveKey);

    try {
      const sensoryAttributes = normalizeAttributesTo5(wine.atributos);

      const { error } = await supabase
        .from("user_wines")
        .insert({
          user_id: user.id,
          name: wine.nombre,
          producer: wine.productor || null,
          vintage: wine.anada || null,
          region: wine.region || null,
          country: wine.pais || null,
          grape_varieties: wine.uvas || null,
          tasting_notes: wine.descripcion || wine.razon || null,
          status,
          is_favorite: favorite,
          matchrim_affinity: wine.compatibilidad || null,
          sensory_attributes: sensoryAttributes as Json,
          use_for_profile_training: status === 'tasted' && Boolean(sensoryAttributes),
          consumption_place: restaurantName || null,
          consumption_place_type: restaurantName ? "restaurant" : null,
          price: wine.precio || null,
          place_details: {
            source: "menu_scanner",
            restaurant_session_id: restaurantSessionId || null,
            matchrim_code: matchrimCode || null,
            pairing_dish_name: pairingDishName || null,
            similar_wine_name: similarWineName || null,
          } as Json,
        });

      if (error) throw error;

      setSavedWineKeys((currentKeys) => new Set(currentKeys).add(saveKey));
      trackAppEvent("wine_saved", {
        userId: user.id,
        metadata: {
          source: "menu_scanner",
          status,
          wine_name: wine.nombre,
          match: wine.compatibilidad || null,
          restaurant_name: restaurantName || null,
        },
      });
      toast.success(
        favorite
          ? `${wine.nombre} guardado en Quiero Probar y Favoritos`
          : status === 'wishlist'
          ? `${wine.nombre} guardado en Quiero Probar`
          : `${wine.nombre} guardado en Ya Probados. Puntúalo para afinar tu Matchrim`
      );
    } catch (error) {
      console.error("Error saving scanned wine:", error);
      toast.error("No se pudo guardar el vino");
    } finally {
      setSavingWineKey(null);
    }
  };

  const saveWineToWishlist = (wine: ScannedWine, index: number) => saveScannedWine(wine, index, 'wishlist');
  const saveWineAsTasted = (wine: ScannedWine, index: number) => saveScannedWine(wine, index, 'tasted');
  const saveWineAsFavorite = (wine: ScannedWine, index: number) => saveScannedWine(wine, index, 'wishlist', true);

  return (
    <div className="space-y-6">
      {isMatchrimFixtureQaEnabled && (
        <div role="status" className="border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          QA local: respuestas deterministas. Este build valida el flujo, no la precision del OCR.
        </div>
      )}
      {(restaurantName || matchrimCode) && (
        <div className="rounded-md border border-stone-800 bg-stone-950 p-4 text-white shadow-sm">
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
      <Card className="overflow-hidden border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {dishContext
              ? 'Scanner de carta para tu plato'
              : similarWineContext
                ? 'Scanner de carta para buscar parecidos'
                : 'Scanner de carta'}
          </CardTitle>
          <CardDescription>
            {dishContext
              ? `Sube la carta de vinos y te diré qué botella pediría para ${dishContext}.`
              : similarWineContext
                ? `Sube la carta de vinos y buscaré alternativas parecidas a ${similarWineContext}.`
                : 'Sube una carta y ordeno sus vinos por encaje con tu Matchrim.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-stone-800 bg-stone-950 p-4 text-center text-white">
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

	            {(preview || convertingPdf) && !loading ? (
	              <div className="space-y-4">
	                <div className="relative inline-block max-w-full">
		                  {preview ? (
		                    <>
			                    <div className="overflow-auto rounded-md bg-black shadow-2xl ring-1 ring-white/10" style={{ maxHeight: '68vh' }}>
			                      <div className="relative origin-top-left" style={{ width: `${imageZoom * 100}%` }}>
		                        <img
		                          src={preview}
		                          alt="Carta con vinos marcados mediante numeros"
			                          className="block h-auto w-full object-contain opacity-95"
		                        />
		                        {scannedWines.map((wine, index) => {
		                          const position = getWinePosition(wine);
		                          if (!position) return null;
		                          const width = Math.max(normalizePercentage(wine.posicion?.width) ?? 4, 4);
		                          const height = Math.max(wine.posicion?.height ?? 3, 3);

		                          return (
		                            <button
		                              key={`${wine.nombre}-${index}-pin`}
		                              type="button"
			                              className={`absolute z-10 min-h-8 min-w-8 border-2 bg-transparent transition ${
			                                highlightedWineIndex === index
			                                  ? 'border-amber-400 ring-2 ring-black/70'
			                                  : 'border-white/85 hover:border-amber-300'
			                              }`}
		                              style={{ left: `${position.x}%`, top: `${position.y}%`, width: `${width}%`, height: `${height}%` }}
		                              aria-label={`Vino ${index + 1}: ${wine.nombre}`}
			                              onClick={() => {
			                                setHighlightedWineIndex(index);
			                                setSelectedPinIndex(index);
			                              }}
			                            >
			                              <span className={`absolute -left-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[11px] font-bold shadow ring-1 ring-white ${
			                                highlightedWineIndex === index ? 'bg-amber-400 text-stone-950' : 'bg-stone-950 text-white'
			                              }`}>
		                                {index + 1}
		                              </span>
		                            </button>
		                          );
		                        })}
		                      </div>
		                    </div>
		                    {scannedWines.length > 0 && (
		                      <div className="absolute bottom-2 right-2 z-20 flex gap-1 rounded-md bg-stone-950/90 p-1 shadow">
		                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-white hover:bg-white/15 hover:text-white" onClick={() => setImageZoom((zoom) => Math.max(1, zoom - 0.5))} disabled={imageZoom <= 1} aria-label="Alejar carta">
		                          <ZoomOut className="h-4 w-4" />
		                        </Button>
		                        <span className="flex min-w-10 items-center justify-center text-xs font-semibold text-white">{Math.round(imageZoom * 100)}%</span>
		                        <Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-white hover:bg-white/15 hover:text-white" onClick={() => setImageZoom((zoom) => Math.min(3, zoom + 0.5))} disabled={imageZoom >= 3} aria-label="Acercar carta">
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
	                  <Button
	                    onClick={clearScan}
	                    variant="destructive"
                    size="icon"
                    className="absolute right-2 top-2 h-11 w-11 rounded-md bg-red-700 hover:bg-red-800"
                  >
	                    <X className="h-4 w-4" />
	                  </Button>
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
	                        : scanPhase === 'ranking'
	                          ? 'Ordenando resultados...'
	                          : 'Leyendo secciones, lineas y precios...'}
	                  </p>
	                  <p className="mb-3 text-sm text-white/65">
                    {convertingPdf 
                      ? 'Renderizando primera página del PDF' 
	                      : 'El texto se mantiene fuera de la imagen para no tapar la carta'}
                  </p>
	                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
	                    <div className="h-full bg-amber-400 animate-pulse" style={{ width: '70%' }} />
                  </div>
	                  <p className="mt-2 text-xs text-white/50">
	                    Esto puede tardar 30-60 segundos dependiendo del tamaño de la carta
	                  </p>
	                  {!convertingPdf && (
	                    <Button type="button" variant="outline" className="mt-4 min-h-11 border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => scanAbortRef.current?.abort()}>
	                      <X className="mr-2 h-4 w-4" /> Cancelar analisis
	                    </Button>
	                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
	                <Camera className="mx-auto h-10 w-10 text-white/35" />
                <div>
	                  <p className="mb-2 text-lg font-semibold text-white">
                    Sube la carta de vinos
                  </p>
	                  <p className="mb-3 text-sm text-white/65">
                    Haz una foto clara o sube una imagen/PDF. En PDF analizamos la primera página.
                  </p>
                  {dishContext && (
                    <p className="mx-auto mb-3 max-w-2xl rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                      Buscaré la mejor botella de esta carta para {dishContext}, equilibrando maridaje y tu Matchrim.
                    </p>
                  )}
                  {similarWineContext && (
                    <p className="mx-auto mb-3 max-w-2xl rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                      Buscaré vinos parecidos a {similarWineContext} dentro de esta carta, priorizando los que encajen con tu Matchrim.
                    </p>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={loading}
	                    className="gap-2 bg-amber-400 text-stone-950 hover:bg-amber-300"
                  >
                    <Camera className="h-4 w-4" />
                    Hacer foto
                  </Button>
	                  <Button
	                    onClick={() => fileInputRef.current?.click()}
	                    disabled={loading}
	                    variant="outline"
		                    className="gap-2 border-white/20 bg-white/10 text-white hover:bg-white/15"
	                  >
	                    <Upload className="h-4 w-4" />
	                    Subir archivo
	                  </Button>
                </div>
	                <ul className="mx-auto grid max-w-2xl gap-1.5 text-left text-xs text-white/55 sm:grid-cols-2">
                    <li>• Carta completa y con luz suficiente.</li>
                    <li>• Evita reflejos, sombras y fotos inclinadas.</li>
                    <li>• Si la carta es larga, escanea una sección.</li>
                    <li>• Mantén visibles precios, añadas y productores.</li>
                  </ul>
              </div>
            )}
          </div>
        </CardContent>
	      </Card>

	      {menuQualityWarnings.length > 0 && (
	        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
	          <div className="font-semibold">Avisos de calidad</div>
	          <ul className="mt-1 space-y-1">{menuQualityWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
	        </div>
	      )}

	      {scanFeedback && scannedWines.length === 0 && !loading && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-amber-950">No ha salido un escaneo útil</p>
              <p className="mt-1 text-sm text-amber-900">{scanFeedback}</p>
            </div>
            <Button
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
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Results Section */}
      {scannedWines.length > 0 && (
        <div ref={resultsRef} className="scroll-mt-24 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                Vinos Detectados ({scannedWines.length})
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa nombre, añada y precio antes de guardar. La carta puede tener errores de lectura.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!hasProfile && (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Completa el quiz Matchrim para ver compatibilidades
                </Badge>
              )}
              {fileType === 'pdf' && (
                <Badge variant="secondary">
                  PDF: primera página
                </Badge>
              )}
	            </div>
	          </div>

	          {menuDecision && (
	            <Card className="overflow-hidden border-red-100 bg-white shadow-sm">
	              <CardHeader className="border-b bg-red-950 text-white">
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
	                <div className="min-w-0 rounded-md border border-green-100 bg-green-50 p-4">
	                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-900">
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
		                        onClick={() => focusWine(best.index)}
	                      >
	                        <div className="flex items-start justify-between gap-3">
	                          <div className="min-w-0">
	                            <p className="break-words font-semibold leading-tight text-green-950">{best.wine.nombre}</p>
	                            {best.wine.productor && (
	                              <p className="mt-1 truncate text-sm text-green-900/70">{best.wine.productor}</p>
	                            )}
	                          </div>
	                          <Badge className="bg-green-700 hover:bg-green-700">{best.score}%</Badge>
	                        </div>
	                        {best.wine.razon && (
	                          <p className="break-words text-sm leading-5 text-green-900">{best.wine.razon}</p>
	                        )}
	                      </button>
	                    );
	                  })() : (
	                    <p className="text-sm text-green-900">Completa tu test para que pueda elegir por encaje.</p>
	                  )}
	                </div>

		                <div className="min-w-0 rounded-md border border-amber-100 bg-amber-50 p-4">
		                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-950">
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
		                        onClick={() => focusWine(safe.index)}
		                      >
		                        <span className="min-w-0">
		                          <span className="block break-words text-sm font-semibold leading-tight text-amber-950">{safe.wine.nombre}</span>
		                          <span className="mt-1 block break-words text-xs leading-5 text-amber-900/70">
		                            {[formatPrice(safe.wine.precio), formatWineType(safe.wine.tipo)].filter(Boolean).join(' · ')}
		                          </span>
		                        </span>
		                        <Badge variant="outline" className="shrink-0 border-amber-300 text-amber-950">{safe.score}%</Badge>
		                      </button>
		                    );
		                  })() : (
		                    <p className="text-sm text-amber-900">No hay suficientes alternativas con encaje calculado.</p>
		                  )}
		                </div>

		                <div className="min-w-0 rounded-md border border-stone-200 bg-stone-50 p-4">
		                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-950">
		                    <Target className="h-4 w-4" />
		                    Mejor calidad/precio para ti
		                  </div>
		                  {menuDecision.value ? (() => {
		                    const value = menuDecision.value;
		                    return (
		                      <button
		                        type="button"
		                        aria-label={`Ver detalle de ${value.wine.nombre}, ${value.score}% de encaje`}
		                        className="min-w-0 w-full rounded-md border bg-white p-3 text-left text-sm text-stone-950"
		                        onClick={() => focusWine(value.index)}
		                      >
		                        <span className="block break-words font-semibold leading-tight">{value.wine.nombre}</span>
		                        <span className="mt-1 block text-xs text-stone-500">
		                          {[formatPrice(value.wine.precio), `${value.score}%`].filter(Boolean).join(' · ')}
		                        </span>
		                      </button>
		                    );
		                  })() : (
		                    <p className="text-sm text-stone-600">No hay precio fiable suficiente para decidir por valor.</p>
		                  )}
		                </div>

		                <div className="min-w-0 rounded-md border border-orange-100 bg-orange-50 p-4">
		                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-950">
		                    <AlertCircle className="h-4 w-4" />
		                    Más arriesgado
		                  </div>
		                  {menuDecision.adventurous ? (() => {
		                    const adventurous = menuDecision.adventurous;
		                    return (
		                      <button
		                        type="button"
		                        aria-label={`Ver detalle de ${adventurous.wine.nombre}, ${adventurous.score}% de encaje`}
		                        className="min-w-0 w-full rounded-md border border-orange-200 bg-white p-3 text-left"
		                        onClick={() => focusWine(adventurous.index)}
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

		                <div className="min-w-0 rounded-md border border-red-100 bg-red-50 p-4">
		                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-950">
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
	                        onClick={() => focusWine(caution.index)}
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

		                <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground md:col-span-2">
	                  {menuDecision.anchored > 0
		                    ? `${menuDecision.anchored} pin${menuDecision.anchored !== 1 ? 'es' : ''} se han anclado a posiciones fiables. La afinidad y el detalle permanecen en la lista para no tapar el texto.`
		                    : 'La lectura no ha devuelto posiciones fiables para esta foto. Mantengo el ranking como lista y no invento marcadores sobre lineas dudosas.'}
	                </div>
	              </CardContent>
	            </Card>
		          )}

              <WineComparisonWorkspace
                wines={scannedWines.map((wine, index) => ({
                  id: `${index}-${wine.nombre}-${wine.productor ?? ''}`,
                  name: wine.nombre,
                  producer: wine.productor,
                  region: wine.region,
                  affinity: wine.compatibilidad,
                  confidence: wine.confidence,
                  price: wine.precio,
                  service: wine.servicio === 'copa'
                    ? 'glass'
                    : wine.servicio === 'botella'
                      ? 'bottle'
                      : wine.servicio === 'ambos'
                        ? 'both'
                        : null,
                  attributes: wine.atributos ? {
                    body: wine.atributos.potencia,
                    acidity: wine.atributos.acidez,
                    sweetness: wine.atributos.dulzura,
                    tannin: wine.atributos.taninos,
                    fruit: wine.atributos.afrutado,
                  } : null,
                }))}
              />

		          <div className="rounded-md border border-stone-200 bg-white p-3 shadow-sm">
		            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scan-sort">Orden</Label>
                <Select value={scanSortMode} onValueChange={(value) => setScanSortMode(value as ScannedWineSortMode)}>
                  <SelectTrigger id="scan-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compatibility">Mejor match</SelectItem>
                    <SelectItem value="price-asc">Precio menor</SelectItem>
                    <SelectItem value="price-desc">Precio mayor</SelectItem>
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
	                <Label htmlFor="scan-region-filter">Region</Label>
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
	                <Select value={scanServiceFilter} onValueChange={setScanServiceFilter}>
	                  <SelectTrigger id="scan-service"><SelectValue /></SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="all">Copa o botella</SelectItem>
	                    <SelectItem value="copa">Por copa</SelectItem>
	                    <SelectItem value="botella">Por botella</SelectItem>
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label htmlFor="scan-min-score">Afinidad minima</Label>
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
                <Label htmlFor="scan-max-price">Precio máximo</Label>
                <Input
                  id="scan-max-price"
                  value={scanMaxPrice}
                  onChange={(event) => setScanMaxPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="Sin límite"
                />
              </div>
            </div>
		          </div>

		          {visibleScannedWines.length > 0 && (
		            <div className="border-y border-stone-200 bg-white">
		              <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2">
		                <h3 className="font-semibold text-slate-950">Lista de la carta</h3>
		                <span className="text-xs text-slate-500">{visibleScannedWines.length} resultados</span>
		              </div>
		              <div className="divide-y divide-stone-100">
	                        {visibleScannedWines.map(({ wine, index }) => (
		                  <button
		                    key={`${wine.nombre}-${index}-list-row`}
		                    type="button"
		                    aria-label={`Abrir vino ${index + 1}: ${wine.nombre}`}
		                    className={`flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left ${highlightedWineIndex === index ? 'bg-amber-50' : 'hover:bg-stone-50'}`}
		                    onClick={() => {
		                      setHighlightedWineIndex(index);
		                      setSelectedPinIndex(index);
		                    }}
		                  >
	                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-950 text-sm font-bold text-white">{index + 1}</span>
		                    <span className="min-w-0 flex-1">
		                      <span className="block truncate font-semibold text-slate-950">{wine.nombre}</span>
		                      <span className="block truncate text-xs text-slate-500">
		                        {[wine.productor, wine.region, wine.servicio, formatPrice(wine.precio)].filter(Boolean).join(' · ') || 'Datos por revisar'}
		                      </span>
		                    </span>
		                    <span className="shrink-0 text-right">
		                      {typeof wine.compatibilidad === 'number' && <span className="block text-lg font-bold text-red-900">≈{wine.compatibilidad}%</span>}
		                      <span className="block text-[11px] text-slate-500">Identidad {getConfidenceBand(wine.confidence)}</span>
		                    </span>
		                  </button>
		                ))}
		              </div>
		            </div>
		          )}

	          {visibleScannedWines.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No hay vinos que cumplan esos filtros. Prueba a subir el precio máximo o cambiar el tipo.
              </CardContent>
            </Card>
	          ) : (
	            <details className="rounded-md border border-stone-200 bg-white">
	              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-900">Ver fichas completas y acciones</summary>
	              <div className="grid gap-4 border-t border-stone-100 p-3">
			              {visibleScannedWines.map(({ wine, index }) => {
			                const isEditing = editingWineIndex === index;
			                const similarWines = getSimilarWines(wine, index);
			                  const wishlistSaveKey = `wishlist-${wine.nombre}-${index}`;
			                  const tastedSaveKey = `tasted-${wine.nombre}-${index}`;
			                  const favoriteSaveKey = `favorite-${wine.nombre}-${index}`;
			                  const wineDecision = getWineDecision(wine.compatibilidad);

			                return (
			              <Card
		                key={index}
		                ref={(node) => {
		                  wineCardRefs.current.set(index, node);
		                }}
		                className={`overflow-hidden transition ${
		                  highlightedWineIndex === index ? 'ring-2 ring-red-700 ring-offset-2' : ''
		                }`}
	              >
	                <CardContent className="p-0">
                    <div className="border-b bg-gradient-to-r from-red-950 to-stone-950 px-5 py-4 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
	                          <p className="text-xs font-semibold uppercase tracking-wide text-white/55">Ficha de carta</p>
	                          <h4 className="mt-1 text-xl font-bold leading-tight">{wine.nombre}</h4>
	                          {wine.productor && (
	                            <p className="mt-1 truncate text-sm text-white/68">{wine.productor}</p>
	                          )}
	                          <Badge variant="outline" className="mt-3 border-white/15 bg-white/10 text-white">
	                            {wineDecision.label}
	                          </Badge>
	                        </div>
	                        {wine.compatibilidad !== null && wine.compatibilidad !== undefined && (
                          <div className="shrink-0 rounded-md bg-white px-3 py-2 text-center text-red-950">
                            <div className="text-2xl font-bold leading-none">≈{wine.compatibilidad}%</div>
	                            <div className="mt-1 text-[10px] font-semibold uppercase text-red-900/70">Encaje</div>
	                          </div>
	                        )}
                      </div>
                    </div>
                    <div className="p-6">
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
                          className="gap-2 self-start"
                          onClick={() => setEditingWineIndex(isEditing ? null : index)}
                        >
                          <Edit3 className="h-4 w-4" />
                          {isEditing ? 'Cerrar edición' : 'Editar'}
                        </Button>
                      </div>

                      {isEditing && (
                        <div className="rounded-lg border bg-muted/30 p-4">
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
                            <div className="space-y-1.5">
                              <Label htmlFor={`scan-price-${index}`}>Precio</Label>
                              <Input
                                id={`scan-price-${index}`}
                                value={wine.precio?.toString() || ''}
                                inputMode="decimal"
                                onChange={(event) => updateScannedWine(index, { precio: parseNullableNumber(event.target.value) })}
                              />
                            </div>
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
                        {wine.precio && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {wine.precio.toFixed(2)}€
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

	                      <div className={`rounded-lg border p-3 text-sm leading-6 ${wineDecision.className}`}>
	                        <p className="font-semibold">{wineDecision.label}</p>
	                        <p className="mt-1">{wineDecision.description}</p>
	                      </div>

	                    </div>

	                    {wine.compatibilidad !== null && wine.compatibilidad !== undefined && (
	                      <div className="flex flex-col justify-center gap-3 rounded-lg border bg-muted/20 p-4 lg:min-w-[170px]">
                          <div className="flex items-center gap-2">
                            {getCompatibilityIcon(wine.compatibilidad)}
                            <span className="text-sm font-semibold">Encaje conmigo</span>
                          </div>
                          <div>
                            <div className="text-3xl font-bold">≈{wine.compatibilidad}%</div>
                            <div className={`mt-2 h-2 w-full rounded-full ${getCompatibilityColor(wine.compatibilidad)}`} />
                          </div>
                          <p className="text-xs leading-5 text-muted-foreground">
                            Calculado contra tu perfil Matchrim, no contra popularidad general.
                          </p>
	                      </div>
	                    )}
	                  </div>

		                  <div className="mt-4">
		                    <AffinityExplanation
		                      wineKey={`${wine.nombre}-${wine.productor ?? ''}-${wine.anada ?? 'nv'}`}
		                      score={wine.compatibilidad}
		                      identificationConfidence={wine.confidence}
		                      attributes={wine.atributos}
		                      sensorySource="inference"
		                    />
		                  </div>

	                  {similarWines.length > 0 && (
	                    <div className="mt-4 rounded-lg border border-red-100 bg-red-50/70 p-3">
	                      <p className="text-sm font-semibold text-red-950">Si este te gusta, mira también en esta carta</p>
	                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
	                        {similarWines.map(({ wine: similarWine, index: similarIndex, score }) => (
	                          <button
	                            key={`${similarWine.nombre}-${similarIndex}-similar`}
	                            type="button"
	                            className="rounded-md border bg-white p-3 text-left text-sm shadow-sm transition hover:border-red-300 hover:bg-red-50"
		                            onClick={() => focusWine(similarIndex)}
	                          >
	                            <div className="flex items-start justify-between gap-2">
	                              <span className="font-medium text-red-950">{similarWine.nombre}</span>
	                              {similarWine.compatibilidad !== null && similarWine.compatibilidad !== undefined && (
	                                <Badge className="shrink-0 bg-red-800 hover:bg-red-800">
	                                  ≈{similarWine.compatibilidad}%
	                                </Badge>
	                              )}
	                            </div>
	                            <p className="mt-1 text-xs text-muted-foreground">
	                              Parecido {score}%{similarWine.tipo ? ` · ${formatWineType(similarWine.tipo)}` : ''}
	                            </p>
	                          </button>
	                        ))}
	                      </div>
	                    </div>
		          )}

			                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
		                    <Button
		                      onClick={() => saveWineToWishlist(wine, index)}
		                      disabled={savingWineKey === wishlistSaveKey || savedWineKeys.has(wishlistSaveKey)}
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
			                      disabled={savingWineKey === tastedSaveKey || savedWineKeys.has(tastedSaveKey)}
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
			                      disabled={savingWineKey === favoriteSaveKey || savedWineKeys.has(favoriteSaveKey)}
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
                          onClick={() => focusWine(similarWines[0]?.index ?? index)}
                          disabled={similarWines.length === 0}
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
		                      ¿Por qué encaja?
		                    </Button>
		                  </div>
                    </div>
		                </CardContent>
              </Card>
                );
	              })}
		              </div>
		            </details>
		          )}

		          {restaurantName && (
	            <div className="rounded-md border border-red-100 bg-red-50/80 p-4">
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

	      <Drawer open={selectedPinIndex !== null} onOpenChange={(open) => !open && setSelectedPinIndex(null)}>
	        <DrawerContent className="max-h-[88vh]">
	          {selectedPinWine && selectedPinIndex !== null && (
	            <>
	              <DrawerHeader className="border-b text-left">
	                <div className="flex items-start justify-between gap-3">
	                  <div className="min-w-0">
	                    <DrawerTitle>{selectedPinIndex + 1}. {selectedPinWine.nombre}</DrawerTitle>
	                    <DrawerDescription className="mt-1">
	                      {[selectedPinWine.productor, selectedPinWine.region, formatPrice(selectedPinWine.precio)].filter(Boolean).join(' · ') || 'Datos por revisar'}
	                    </DrawerDescription>
	                  </div>
	                  <DrawerClose asChild>
	                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0"><X className="h-4 w-4" /></Button>
	                  </DrawerClose>
	                </div>
	              </DrawerHeader>
	              <div className="overflow-y-auto p-4">
	                <div className="mb-4 grid grid-cols-3 gap-3 border-y border-stone-200 py-3 text-center">
	                  <div><div className="text-xl font-bold text-red-900">{selectedPinWine.compatibilidad == null ? '-' : `≈${selectedPinWine.compatibilidad}%`}</div><div className="text-xs text-slate-500">Afinidad estimada</div></div>
	                  <div><div className="text-xl font-bold capitalize text-slate-900">{getConfidenceBand(selectedPinWine.confidence)}</div><div className="text-xs text-slate-500">Señal de identidad</div></div>
	                  <div><div className="truncate text-sm font-bold capitalize text-slate-900">{selectedPinWine.tipo || '-'}</div><div className="text-xs text-slate-500">Tipo</div></div>
	                </div>
	                {selectedPinWine.descripcion && <p className="mb-4 text-sm leading-6 text-slate-600">{selectedPinWine.descripcion}</p>}
	                <div className="mb-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-slate-600">
	                  {selectedPinWine.texto_fuente ? (
	                    <p><span className="font-semibold text-slate-900">Texto visible:</span> {selectedPinWine.texto_fuente}</p>
	                  ) : (
	                    <p>No hay una transcripcion enlazada a esta fila. Productor, region y estilo pueden ser inferencias y requieren confirmacion.</p>
	                  )}
	                  {selectedPinWine.dudas && selectedPinWine.dudas.length > 0 && (
	                    <p className="mt-1"><span className="font-semibold text-slate-900">Dudas:</span> {selectedPinWine.dudas.join(', ')}</p>
	                  )}
	                  {selectedPinWine.campos_inferidos && selectedPinWine.campos_inferidos.length > 0 && (
	                    <p className="mt-1"><span className="font-semibold text-slate-900">Datos inferidos:</span> {selectedPinWine.campos_inferidos.join(', ')}</p>
	                  )}
	                </div>
	                <AffinityExplanation
	                  wineKey={`${selectedPinWine.nombre}-${selectedPinWine.productor ?? ''}-${selectedPinWine.anada ?? 'nv'}`}
	                  score={selectedPinWine.compatibilidad}
	                  identificationConfidence={selectedPinWine.confidence}
	                  attributes={selectedPinWine.atributos}
	                  sensorySource="inference"
	                />
	              </div>
	              <DrawerFooter className="border-t">
	                <div className="grid grid-cols-2 gap-2">
	                  <Button type="button" variant="outline" className="min-h-11" disabled={selectedPinIndex === 0} onClick={() => {
	                    const next = Math.max(0, selectedPinIndex - 1);
	                    setSelectedPinIndex(next);
	                    setHighlightedWineIndex(next);
	                  }}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
	                  <Button type="button" variant="outline" className="min-h-11" disabled={selectedPinIndex >= scannedWines.length - 1} onClick={() => {
	                    const next = Math.min(scannedWines.length - 1, selectedPinIndex + 1);
	                    setSelectedPinIndex(next);
	                    setHighlightedWineIndex(next);
	                  }}>Siguiente <ChevronRight className="h-4 w-4" /></Button>
	                </div>
	              </DrawerFooter>
	            </>
	          )}
	        </DrawerContent>
	      </Drawer>
    </div>
  );
};

export default WineMenuScanner;
