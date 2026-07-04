import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Camera, X, CheckCircle, AlertCircle, BookmarkPlus, ScanLine, Sparkles, FolderOpen, Heart, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackAppEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { recordScanHistory, updateScanHistoryItem } from "@/utils/scanHistory";
import { buildWinerimWineUrl, findWinerimWineForLabel, type WinerimLabelLookupResult } from "@/services/winerimApi";


interface ExtractedWineData {
  nombre: string;
  productor: string | null;
  anada: number | null;
  region: string | null;
  pais: string | null;
  uvas: string[];
  alcohol: number | null;
  notas_cata: string | null;
  imagen_url?: string | null;
  matchrim_affinity?: number | null;
  sensory_attributes?: {
    potencia?: number;
    acidez?: number;
    dulzura?: number;
    taninos?: number;
    afrutado?: number;
  } | null;
  affinity_reason?: string | null;
  is_favorite?: boolean;
}

interface WineLabelOCRImportProps {
  onExtractComplete: (wine: ExtractedWineData) => void;
}

const normalizeAttributeTo5 = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
  return Math.max(1, Math.min(5, Math.round(scaled)));
};

const normalizeSensoryAttributesTo5 = (attributes: ExtractedWineData['sensory_attributes']) => {
  if (!attributes) return null;

  const normalized = {
    potencia: normalizeAttributeTo5(attributes.potencia),
    acidez: normalizeAttributeTo5(attributes.acidez),
    dulzura: normalizeAttributeTo5(attributes.dulzura),
    taninos: normalizeAttributeTo5(attributes.taninos),
    afrutado: normalizeAttributeTo5(attributes.afrutado),
  };

  if (Object.values(normalized).some((value) => value === null)) return null;
  return normalized as NonNullable<ExtractedWineData['sensory_attributes']>;
};

export const WineLabelOCRImport = ({ onExtractComplete }: WineLabelOCRImportProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [affinityLoading, setAffinityLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedWine, setExtractedWine] = useState<ExtractedWineData | null>(null);
  const [affinityMessage, setAffinityMessage] = useState<string | null>(null);
  const [winerimMatch, setWinerimMatch] = useState<WinerimLabelLookupResult | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!extractedWine || loading) return;

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [extractedWine, loading]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    setLoading(true);
    setExtractedWine(null);
    setAffinityMessage(null);
    trackAppEvent("wine_label_scan_started", { userId: user?.id });
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    await processImage(file);
  };

  const processImage = async (file: File) => {
    try {
      // Convert file to base64 and await before calling the function
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('extract-wine-label-ocr', {
        body: { image: base64Image }
      });

      if (error) throw error;

      if (data.wine) {
        toast.success("✨ Etiqueta analizada correctamente");
        const detectedWine = data.wine as ExtractedWineData;

        // Search for bottle image
        try {
          const { data: imageData } = await supabase.functions.invoke('search-wine-image', {
            body: {
              wineName: detectedWine.nombre,
              producer: detectedWine.productor,
              vintage: detectedWine.anada
            }
          });

          if (imageData?.imageUrl) {
            detectedWine.imagen_url = imageData.imageUrl;
            toast.success("🍾 Imagen de la botella encontrada");
          }
        } catch (imageError) {
          console.error('Error searching for wine image:', imageError);
          // Continue without image if search fails
        }

        const affinityResult = await calculateTemporaryAffinity(detectedWine);
        const wineWithAffinity = affinityResult
          ? {
              ...detectedWine,
              matchrim_affinity: affinityResult.affinity,
              sensory_attributes: affinityResult.sensory_attributes,
              affinity_reason: affinityResult.reason,
            }
          : detectedWine;

        setExtractedWine(wineWithAffinity);
        trackAppEvent("wine_label_scan_completed", {
          userId: user?.id,
          metadata: {
            wine_name: wineWithAffinity.nombre,
            producer: wineWithAffinity.productor,
            affinity: wineWithAffinity.matchrim_affinity ?? null,
            has_affinity: typeof wineWithAffinity.matchrim_affinity === "number",
          },
        });
      } else {
        toast.info("No se pudo extraer información de la etiqueta");
      }
    } catch (error) {
      console.error('Error processing image:', error);
      trackAppEvent("wine_label_scan_failed", {
        userId: user?.id,
        metadata: {
          error: error instanceof Error ? error.message : "Error al procesar la imagen",
        },
      });
      toast.error("Error al procesar la imagen");
    } finally {
      setLoading(false);
    }
  };

  const calculateTemporaryAffinity = async (wine: ExtractedWineData) => {
    if (!user) {
      setAffinityMessage("Inicia sesión y completa tu Matchrim para ver el porcentaje de encaje antes de guardar.");
      return null;
    }

    setAffinityLoading(true);
    setAffinityMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('calculate-wine-affinity', {
        body: {
          wine: {
            name: wine.nombre,
            producer: wine.productor,
            vintage: wine.anada,
            region: wine.region,
            country: wine.pais,
            grape_varieties: wine.uvas || [],
          },
        },
      });

      if (error) throw error;

      if (data?.affinity === null) {
        setAffinityMessage(data.message || "Completa el test Matchrim para calcular el encaje de esta etiqueta.");
        return null;
      }

      if (typeof data?.affinity === 'number') {
        return {
          affinity: data.affinity as number,
          sensory_attributes: normalizeSensoryAttributesTo5(data.sensory_attributes || null),
          reason: buildAffinityReason(data.affinity as number),
        };
      }

      setAffinityMessage("No he podido calcular el encaje con tu perfil para esta etiqueta.");
      return null;
    } catch (error) {
      console.error('Error calculating temporary affinity:', error);
      setAffinityMessage("Etiqueta identificada, pero no he podido calcular el encaje ahora mismo.");
      return null;
    } finally {
      setAffinityLoading(false);
    }
  };

  const buildAffinityReason = (affinity: number) => {
    if (affinity >= 85) return "Muy alineado con tu perfil Matchrim. Es candidato claro para probar.";
    if (affinity >= 70) return "Buen encaje con tu perfil, aunque puede tener algún atributo más marcado.";
    if (affinity >= 55) return "Encaje medio: puede gustarte si buscas salir un poco de tu zona habitual.";
    return "Encaje bajo con tu perfil. Lo guardaría solo si buscas probar algo diferente.";
  };

  const getAffinityTone = (affinity: number) => {
    if (affinity >= 80) return "text-green-700";
    if (affinity >= 60) return "text-amber-700";
    return "text-red-700";
  };

  const getAffinityDecision = (affinity: number) => {
    if (affinity >= 85) {
      return {
        label: "Pediría sin dudar",
        description: "Encaje muy alto con tu código. Es una botella candidata para guardar y probar.",
        className: "border-green-200 bg-green-50 text-green-900",
      };
    }
    if (affinity >= 70) {
      return {
        label: "Buen candidato",
        description: "Tiene sentido para tu perfil, aunque conviene mirar los atributos antes de decidir.",
        className: "border-amber-200 bg-amber-50 text-amber-950",
      };
    }
    if (affinity >= 55) {
      return {
        label: "Fuera de zona segura",
        description: "Puede ser interesante si quieres explorar, pero no parece tu opción más natural.",
        className: "border-orange-200 bg-orange-50 text-orange-950",
      };
    }
    return {
      label: "No lo priorizaría",
      description: "Puede ser buen vino, pero Matchrim no lo ve como elección principal para ti.",
      className: "border-red-200 bg-red-50 text-red-950",
    };
  };

  const openAiRimForWine = (wine: ExtractedWineData) => {
    const wineDescription = [
      wine.nombre,
      wine.productor,
      wine.anada,
      wine.region,
      wine.pais,
    ].filter(Boolean).join(' · ');

    navigate(`/inteligencia-liquida?function=wine-fit&wine=${encodeURIComponent(wineDescription)}`);
  };

  const clearPreview = () => {
    setPreview(null);
    setExtractedWine(null);
    setAffinityMessage(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const affinityDecision = typeof extractedWine?.matchrim_affinity === 'number'
    ? getAffinityDecision(extractedWine.matchrim_affinity)
    : null;
  const sensoryAttributes = extractedWine?.sensory_attributes
    ? [
        { label: "Pot.", value: normalizeAttributeTo5(extractedWine.sensory_attributes.potencia) },
        { label: "Ac.", value: normalizeAttributeTo5(extractedWine.sensory_attributes.acidez) },
        { label: "Dul.", value: normalizeAttributeTo5(extractedWine.sensory_attributes.dulzura) },
        { label: "Tan.", value: normalizeAttributeTo5(extractedWine.sensory_attributes.taninos) },
        { label: "Frut.", value: normalizeAttributeTo5(extractedWine.sensory_attributes.afrutado) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground space-y-2">
        <p className="font-medium">✨ Reconocimiento inteligente de etiquetas</p>
        <p>Extrae automáticamente información del vino desde la foto de la etiqueta</p>
      </div>

      <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center bg-card">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
          onChange={handleFileSelect}
          className="hidden"
          disabled={loading}
        />

        {preview ? (
          <div className="space-y-4">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Preview"
                className={`${extractedWine && !loading ? "max-h-36" : "max-h-80"} mx-auto rounded-lg shadow-lg`}
              />
              {!loading && (
                <Button
                  onClick={clearPreview}
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">
                  {affinityLoading ? 'Calculando encaje Matchrim...' : 'Analizando etiqueta...'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Camera className="w-16 h-16 mx-auto text-primary/40" />
            <div>
              <p className="text-lg font-semibold text-foreground mb-2">
                Fotografía la etiqueta del vino
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                JPG, PNG, WEBP hasta 20MB
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="gap-2"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Hacer foto
              </Button>
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Subir archivo
              </Button>
            </div>
          </div>
        )}
      </div>
      {extractedWine && !loading && (
        <div ref={resultRef} className="scroll-mt-24 overflow-hidden rounded-lg border bg-card shadow-sm">
          <div className="border-b bg-stone-950 px-4 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60">
                  <CheckCircle className="h-4 w-4 text-green-300" />
                  Vino identificado
                </div>
                <h3 className="text-xl font-bold leading-tight">{extractedWine.nombre}</h3>
                {extractedWine.productor && (
                  <p className="mt-1 truncate text-sm text-white/68">{extractedWine.productor}</p>
                )}
              </div>
              {typeof extractedWine.matchrim_affinity === 'number' && (
                <div className="shrink-0 rounded-md bg-white px-3 py-2 text-center text-red-950">
                  <div className="text-2xl font-bold leading-none">{extractedWine.matchrim_affinity}%</div>
                  <div className="mt-1 text-[10px] font-semibold uppercase text-red-900/70">Encaje</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4">
            {affinityDecision && (
              <div className={`rounded-lg border p-3 ${affinityDecision.className}`}>
                <div className="flex items-center gap-2 font-semibold">
                  <Sparkles className="h-4 w-4" />
                  {affinityDecision.label}
                </div>
                <p className="mt-1 text-sm leading-6">{affinityDecision.description}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {extractedWine.anada && <Badge variant="outline">{extractedWine.anada}</Badge>}
              {extractedWine.region && <Badge variant="outline">{extractedWine.region}</Badge>}
              {extractedWine.pais && <Badge variant="outline">{extractedWine.pais}</Badge>}
              {extractedWine.alcohol && <Badge variant="secondary">{extractedWine.alcohol}% ABV</Badge>}
              {(extractedWine.uvas || []).slice(0, 3).map((grape) => (
                <Badge key={grape} variant="outline">{grape}</Badge>
              ))}
            </div>

            {typeof extractedWine.matchrim_affinity === 'number' ? (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Encaje conmigo
                  </div>
                  <span className={`text-2xl font-bold ${getAffinityTone(extractedWine.matchrim_affinity)}`}>
                    {extractedWine.matchrim_affinity}%
                  </span>
                </div>
                <Progress value={extractedWine.matchrim_affinity} className="h-2" />
                {extractedWine.affinity_reason && (
                  <p className="mt-2 text-sm text-muted-foreground">{extractedWine.affinity_reason}</p>
                )}
              </div>
            ) : affinityMessage ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{affinityMessage}</p>
              </div>
            ) : null}

            {sensoryAttributes.length > 0 && (
              <div className="grid grid-cols-5 gap-2 rounded-lg border bg-stone-50 p-3 text-center text-xs">
                {sensoryAttributes.map((attribute) => (
                  <div key={attribute.label}>
                    <div className="font-semibold">{attribute.value ?? '-'}/5</div>
                    <div className="text-muted-foreground">{attribute.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2 md:grid-cols-2">
              <Button className="matchrim-pressable gap-2 bg-red-900 hover:bg-red-950" onClick={() => onExtractComplete(extractedWine)}>
                <BookmarkPlus className="h-4 w-4" />
                Quiero probar
              </Button>
              <Button
                variant="outline"
                className="matchrim-pressable gap-2"
                onClick={() => onExtractComplete({ ...extractedWine, is_favorite: true })}
              >
                <Heart className="h-4 w-4" />
                Añadir favorito
              </Button>
              <Button
                variant="outline"
                className="matchrim-pressable gap-2"
                onClick={() => navigate(`/escanear/carta-vinos?wine=${encodeURIComponent(extractedWine.nombre)}`)}
              >
                <ScanLine className="h-4 w-4" />
                Buscar parecidos en carta
              </Button>
              <Button
                variant="outline"
                className="matchrim-pressable gap-2"
                onClick={() => openAiRimForWine(extractedWine)}
              >
                <Sparkles className="h-4 w-4" />
                Preguntar a aiRIM
              </Button>
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-3 text-primary">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm font-medium">
              {affinityLoading ? 'Calculando encaje Matchrim...' : 'Analizando etiqueta...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
