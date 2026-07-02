import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  BookmarkPlus,
  Camera,
  CheckCircle,
  ChefHat,
  FileUp,
  Heart,
  Loader2,
  ScanLine,
  Sparkles,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { trackAppEvent } from "@/lib/analytics";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { convertPdfFirstPageToImageFile } from "@/utils/pdfToImage";

type FoodScanMode = "menu" | "dish";

interface FoodWineRecommendation {
  nombre: string;
  tipo: string;
  uvas?: string[];
  match: number;
  razon: string;
  atributos?: {
    potencia: number;
    acidez: number;
    dulzura: number;
    taninos: number;
    afrutado: number;
  } | null;
}

interface FoodDishResult {
  nombre: string;
  categoria: string;
  match: number;
  razon: string;
  recomendaciones: FoodWineRecommendation[];
}

interface FoodScanResult {
  mode: FoodScanMode;
  summary: string;
  dishes: FoodDishResult[];
  has_profile: boolean;
  profile_source?: "auth" | "client" | "none";
  scan_version?: string;
}

interface FoodPairingScannerProps {
  initialMode?: FoodScanMode;
  restaurantName?: string;
  lockMode?: boolean;
}

interface MatchrimProfilePayload {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
}

const processingSteps: Record<FoodScanMode, string[]> = {
  menu: ["Leyendo el menú...", "Detectando platos...", "Sugiriendo vinos para cada plato..."],
  dish: ["Analizando el plato...", "Leyendo textura e intensidad...", "Buscando vinos que encajen contigo..."],
};

const normalizeImageFile = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getMatchTone = (match: number) => {
  if (match >= 80) return "text-green-700";
  if (match >= 65) return "text-amber-700";
  return "text-red-800";
};

const getPairingDecision = (match: number) => {
  if (match >= 80) return "Muy buen camino";
  if (match >= 65) return "Buena opción";
  if (match >= 50) return "Con matices";
  return "Difícil para tu perfil";
};

const normalizeProfileValue = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(1, Math.min(5, Math.round(numeric)));
};

const readStoredMatchrimProfile = (): MatchrimProfilePayload | null => {
  try {
    const rawProfile = localStorage.getItem("matchrim_quiz_result");
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
    console.warn("Could not read stored Matchrim profile for food scan:", error);
    return null;
  }
};

export const FoodPairingScanner = ({ initialMode = "menu", restaurantName, lockMode = false }: FoodPairingScannerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<FoodScanMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setMode(initialMode);
    setResult(null);
    setPreview(null);
    setSavedKeys(new Set());
  }, [initialMode]);

  useEffect(() => {
    if (!loading) {
      setStepIndex(0);
      return;
    }

    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % processingSteps[mode].length);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [loading, mode]);

  useEffect(() => {
    if (!result || loading) return;

    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [result, loading]);

  const selectMode = (nextMode: FoodScanMode) => {
    setMode(nextMode);
    setResult(null);
    setPreview(null);
    setSavedKeys(new Set());
    trackAppEvent("scan_option_selected", {
      userId: user?.id,
      metadata: { option: nextMode === "menu" ? "food_menu" : "dish_photo" },
    });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
    source: "camera" | "file"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      toast.error(mode === "menu" ? "Selecciona una imagen o PDF válido" : "Selecciona una imagen válida");
      if (event.target) event.target.value = "";
      return;
    }

    if (isPdf && mode !== "menu") {
      toast.error("Para un plato concreto necesito una imagen, no un PDF");
      if (event.target) event.target.value = "";
      return;
    }

    setLoading(true);
    setResult(null);
    setSavedKeys(new Set());

    try {
      const imageFile = isPdf ? await convertPdfFirstPageToImageFile(file, "menu-page.jpg") : file;
      const image = await normalizeImageFile(imageFile);
      setPreview(image);
      trackAppEvent("food_scan_started", {
        userId: user?.id,
        metadata: {
          mode,
          restaurant_name: restaurantName || null,
          source,
          file_type: isPdf ? "pdf" : "image",
        },
      });

      const { data, error } = await supabase.functions.invoke("scan-food-pairing", {
        body: { image, mode, restaurantName, matchrimProfile: readStoredMatchrimProfile() },
      });

      if (error) throw error;

      const scanResult = data as FoodScanResult;
      setResult(scanResult);
      trackAppEvent("food_scan_completed", {
        userId: user?.id,
        metadata: {
          mode,
          dish_count: scanResult?.dishes?.length || 0,
          has_profile: Boolean(scanResult?.has_profile),
        },
      });

      if (scanResult?.dishes?.length) {
        toast.success(
          mode === "menu"
            ? `${scanResult.dishes.length} platos detectados`
            : "Plato analizado"
        );
      } else {
        toast.info("No he podido detectar platos claros. Prueba con una foto más cercana.");
      }
    } catch (error) {
      console.error("Error scanning food pairing:", error);
      const message = error instanceof Error ? error.message : "No se pudo analizar la imagen";
      trackAppEvent("food_scan_failed", {
        userId: user?.id,
        metadata: { mode, error: message },
      });
      toast.error(message);
    } finally {
      setLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const saveRecommendation = async (
    dish: FoodDishResult,
    recommendation: FoodWineRecommendation,
    recommendationIndex: number,
    favorite = false
  ) => {
    if (!user) {
      navigate(buildAuthRedirectPath("/my-wines"));
      return;
    }

    const saveKey = `${favorite ? "favorite" : "wishlist"}-${dish.nombre}-${recommendation.nombre}-${recommendationIndex}`;
    setSavingKey(saveKey);

    try {
      const { error } = await supabase
        .from("user_wines")
        .insert({
          user_id: user.id,
          name: recommendation.nombre,
          producer: null,
          vintage: null,
          region: null,
          country: null,
          grape_varieties: recommendation.uvas?.length ? recommendation.uvas : null,
          tasting_notes: recommendation.razon,
          status: "wishlist",
          is_favorite: favorite,
          matchrim_affinity: recommendation.match,
          sensory_attributes: (recommendation.atributos || null) as Json,
          use_for_profile_training: false,
          consumption_place: restaurantName || null,
          consumption_place_type: restaurantName ? "restaurant" : null,
          place_details: {
            source: "food_pairing_scanner",
            scan_mode: mode,
            dish_name: dish.nombre,
            dish_category: dish.categoria,
            dish_match: dish.match,
          } as Json,
        });

      if (error) throw error;

      setSavedKeys((current) => new Set(current).add(saveKey));
      trackAppEvent("wine_saved", {
        userId: user.id,
        metadata: {
          source: "food_pairing_scanner",
          mode,
          dish_name: dish.nombre,
          wine_name: recommendation.nombre,
          match: recommendation.match,
        },
      });
      toast.success(
        favorite
          ? `${recommendation.nombre} guardado en Quiero Probar y Favoritos`
          : `${recommendation.nombre} guardado en Quiero Probar`
      );
    } catch (error) {
      console.error("Error saving food recommendation:", error);
      toast.error("No se pudo guardar la recomendación");
    } finally {
      setSavingKey(null);
    }
  };

  const clearScan = () => {
    setPreview(null);
    setResult(null);
    setSavedKeys(new Set());
  };

  const currentStep = processingSteps[mode][stepIndex];

  return (
    <div className="space-y-5">
      {!lockMode && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 bg-white p-1">
          <Button
            type="button"
            variant={mode === "menu" ? "default" : "ghost"}
            className={mode === "menu" ? "bg-red-900 hover:bg-red-950" : "text-slate-700"}
            onClick={() => selectMode("menu")}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Menú
          </Button>
          <Button
            type="button"
            variant={mode === "dish" ? "default" : "ghost"}
            className={mode === "dish" ? "bg-red-900 hover:bg-red-950" : "text-slate-700"}
            onClick={() => selectMode("dish")}
          >
            <ChefHat className="mr-2 h-4 w-4" />
            Plato
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-900">
            {mode === "menu" ? <BookOpen className="h-5 w-5" /> : <Utensils className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="font-semibold text-slate-950">
              {mode === "menu" ? "Escaneo del menú" : "Foto del plato"}
            </h3>
            <p className="text-sm leading-6 text-slate-500">
              {mode === "menu"
              ? "Detecta platos y propone vinos para cada uno según tu Matchrim."
                : "Analiza el plato que tienes delante y busca vinos que encajen contigo."}
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "menu" ? "image/*,application/pdf" : "image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"}
          onChange={(event) => handleFileSelect(event, "file")}
          className="hidden"
          disabled={loading}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => handleFileSelect(event, "camera")}
          className="hidden"
          disabled={loading}
        />
        {preview ? (
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-stone-950">
              <img
                src={preview}
                alt="Vista previa"
                className={`${result && !loading ? "max-h-44" : "max-h-[58vh]"} w-full object-contain opacity-95`}
              />
              {!loading && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-3 top-3 h-10 w-10 rounded-md"
                  onClick={clearScan}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {loading && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-3 text-amber-950">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">{currentStep}</span>
                </div>
                <Progress value={((stepIndex + 1) / processingSteps[mode].length) * 100} className="h-2" />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-red-100 bg-red-50/40 p-6 text-center">
            <Camera className="mx-auto h-12 w-12 text-red-900/50" />
            <p className="mt-3 font-semibold text-slate-950">
              {mode === "menu" ? "Haz una foto del menú" : "Haz una foto del plato"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {mode === "menu"
                ? "Haz una foto o sube una imagen/PDF claro del menú. Subir archivo permite elegir biblioteca o archivo."
                : "Haz una foto o sube una imagen guardada desde biblioteca o archivo."}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                className="gap-2 bg-red-900 hover:bg-red-950"
                disabled={loading}
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
                Hacer foto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                Subir archivo
              </Button>
            </div>
          </div>
        )}
      </div>

      {result && (
        <div ref={resultRef} className="scroll-mt-24 space-y-4">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-red-900" />
              <div>
                <h3 className="font-semibold text-slate-950">Resultado</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{result.summary}</p>
                {!result.has_profile && (
                  <p className="mt-2 text-sm text-amber-700">
                    Completa el test Matchrim para ordenar estas recomendaciones por tu gusto real.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">Cómo leer estos porcentajes</p>
            <p className="mt-1">
              El porcentaje del plato mide lo fácil que es maridarlo con tu perfil. El porcentaje de cada recomendación mide el encaje entre esa idea de vino, el plato y tu Matchrim.
            </p>
            <p className="mt-1">
              Si no hemos escaneado una carta de vinos concreta, estas tarjetas son ideas de estilo, uva o región. Para convertirlas en una botella real del restaurante, escanea su carta de vinos.
            </p>
          </div>

          {result.dishes.map((dish, dishIndex) => (
            <div key={`${dish.nombre}-${dishIndex}`} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-4">
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2 border-red-100 text-red-900">
                    {dish.categoria}
                  </Badge>
                  <h3 className="text-lg font-bold leading-tight text-slate-950">{dish.nombre}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{dish.razon}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-2xl font-bold ${getMatchTone(dish.match)}`}>{dish.match}%</div>
                  <p className="text-xs font-medium uppercase text-slate-400">maridaje</p>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <WineIcon />
                  Ideas de vino para este plato
                </div>

                {dish.recomendaciones.map((recommendation, recommendationIndex) => {
                  const saveKey = `wishlist-${dish.nombre}-${recommendation.nombre}-${recommendationIndex}`;
                  const favoriteSaveKey = `favorite-${dish.nombre}-${recommendation.nombre}-${recommendationIndex}`;
                  const isSaved = savedKeys.has(saveKey);
                  const isFavoriteSaved = savedKeys.has(favoriteSaveKey);
                  const recommendationDecision = getPairingDecision(recommendation.match);

                  return (
                    <div
                      key={saveKey}
                      className="rounded-lg border border-stone-100 bg-stone-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
	                        <div className="min-w-0">
	                          <div className="mb-1 flex flex-wrap items-center gap-2">
	                            <Badge variant="outline" className="border-amber-200 bg-white text-amber-950">
	                              Idea de vino
	                            </Badge>
	                            <span className={`text-xs font-semibold ${getMatchTone(recommendation.match)}`}>
	                              {recommendationDecision}
	                            </span>
	                          </div>
	                          <h4 className="font-semibold text-slate-950">{recommendation.nombre}</h4>
	                          <div className="mt-2 flex flex-wrap gap-2">
	                            <Badge className="bg-red-900 text-white hover:bg-red-900">{recommendation.tipo}</Badge>
                            {(recommendation.uvas || []).slice(0, 2).map((grape) => (
                              <Badge key={grape} variant="outline">{grape}</Badge>
                            ))}
                          </div>
                        </div>
                        <span className={`shrink-0 text-lg font-bold ${getMatchTone(recommendation.match)}`}>
                          {recommendation.match}%
                          <span className="block text-right text-[10px] font-medium uppercase text-slate-400">idea + plato</span>
                        </span>
                      </div>

	                      <p className="mt-3 text-sm leading-6 text-slate-600">{recommendation.razon}</p>
	                      <p className="mt-2 rounded-md border border-stone-200 bg-white p-2 text-xs leading-5 text-slate-500">
	                        Esto todavía no es una botella concreta: úsalo como dirección de búsqueda o escanea la carta de vinos para elegir el vino real del restaurante.
	                      </p>

	                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <Button
                          type="button"
                          variant={isSaved ? "secondary" : "outline"}
                          className="gap-2"
                          disabled={isSaved || savingKey === saveKey}
                          onClick={() => saveRecommendation(dish, recommendation, recommendationIndex)}
                        >
                          {isSaved ? (
                            <CheckCircle className="h-4 w-4 text-green-700" />
                          ) : savingKey === saveKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <BookmarkPlus className="h-4 w-4" />
                          )}
                          {isSaved ? "En Quiero Probar" : "Guardar en Quiero Probar"}
                        </Button>
                        <Button
                          type="button"
                          variant={isFavoriteSaved ? "secondary" : "outline"}
                          className="gap-2"
                          disabled={isFavoriteSaved || savingKey === favoriteSaveKey}
                          onClick={() => saveRecommendation(dish, recommendation, recommendationIndex, true)}
                        >
                          {isFavoriteSaved ? (
                            <CheckCircle className="h-4 w-4 text-green-700" />
                          ) : savingKey === favoriteSaveKey ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Heart className="h-4 w-4" />
                          )}
                          {isFavoriteSaved ? "Favorito" : "Guardar como favorito"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="gap-2"
                          onClick={() => navigate(`/inteligencia-liquida?function=pairing-check&wine=${encodeURIComponent(recommendation.nombre)}&dish=${encodeURIComponent(dish.nombre)}`)}
                        >
                          <Sparkles className="h-4 w-4" />
                          Preguntar a aiRIM
                        </Button>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  className="w-full gap-2 bg-red-900 hover:bg-red-950"
	                  onClick={() => navigate(`/escanear/carta-vinos?dish=${encodeURIComponent(dish.nombre)}`)}
	                >
	                  <ScanLine className="h-4 w-4" />
	                  Encontrar botella real en la carta
	                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 bg-white"
            onClick={() => {
              const firstDishName = result.dishes[0]?.nombre;
              const query = firstDishName ? `?dish=${encodeURIComponent(firstDishName)}` : "";
              navigate(`/escanear/carta-vinos${query}`);
            }}
          >
	            <ScanLine className="h-4 w-4" />
	            Escanear carta de vinos y elegir botella real
	          </Button>
        </div>
      )}
    </div>
  );
};

const WineIcon = () => (
  <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-50 text-red-900">
    <BookOpen className="h-4 w-4" />
  </span>
);

export default FoodPairingScanner;
