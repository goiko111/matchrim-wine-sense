import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { trackAppEvent } from "@/lib/analytics";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { convertPdfFirstPageToImageFile } from "@/utils/pdfToImage";
import { prepareImageForAnalysis } from "@/utils/imageAnalysis";
import { readMatchrimLocalProfile } from "@/utils/matchrimLocalProfile";
import { FoodScanResponseError, parseFoodScanResponse, type FoodScanResult, type FoodDishResult, type FoodWineRecommendation } from "@/utils/foodScanResponse";
import { invokeEdgeFunction } from '@/utils/invokeEdgeFunction';
import { scanFoodMenu89 } from '@/utils/foodMenuScan89';
import { foodRowPolicy90, foodPairingContext90 } from '@/utils/foodRowPolicy90';
import { readRestaurantCarry, restaurantCarryIsForeign, restaurantCarryState, restaurantScanPath, unsupportedRestaurantClaim } from "@/utils/restaurantPairingContext";

type FoodScanMode = "menu" | "dish";

interface FoodPairingScannerProps {
  initialMode?: FoodScanMode;
  restaurantName?: string;
  lockMode?: boolean;
}

const processingSteps: Record<FoodScanMode, string[]> = {
  menu: ["Leyendo el menú...", "Detectando platos...", "Sugiriendo vinos para cada plato..."],
  dish: ["Analizando el plato...", "Leyendo textura e intensidad...", "Buscando vinos que encajen contigo..."],
};

export const FoodPairingScanner = (props: FoodPairingScannerProps) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const routeOwner = useRef<{ key: string; owner: string | null } | null>(null);
  if (!authLoading && (!routeOwner.current || routeOwner.current.key !== location.key)) {
    routeOwner.current = { key: location.key, owner: user?.id ?? null };
  }
  return <FoodPairingScannerSession key={JSON.stringify([user?.id ?? 'anonymous', authLoading, props.initialMode, props.restaurantName, location.key])} {...props} seedFromRoute={!authLoading && routeOwner.current?.owner === (user?.id ?? null) && !restaurantCarryIsForeign(location.state, user?.id ?? null)} />;
};

const FoodPairingScannerSession = ({ initialMode = "menu", restaurantName, lockMode = false, seedFromRoute }: FoodPairingScannerProps & { seedFromRoute: boolean }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const carriedContext = readRestaurantCarry(seedFromRoute ? location.state : null, user?.id ?? null);
  const [selectedWine, setSelectedWine] = useState(isNative && seedFromRoute ? new URLSearchParams(location.search).get('wine') ?? '' : '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const saveErrorRef = useRef<HTMLParagraphElement>(null);
  const [mode, setMode] = useState<FoodScanMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<{ rowKey: string; message: string } | null>(null);
  const savedRows = useRef(new Map<string, string>());
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const scanController = useRef<AbortController | null>(null);
  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      scanController.current?.abort();
    };
  }, []);

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

  useEffect(() => {
    if (scanError && !loading) errorRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [scanError, loading]);

  useEffect(() => {
    if (saveError) saveErrorRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [saveError]);

  const selectMode = (nextMode: FoodScanMode) => {
    if (savingRef.current) return;
    scanController.current?.abort();
    setLoading(false);
    setScanError(null);
    setMode(nextMode);
    setResult(null);
    setPreview(null);
    setSavedKeys(new Set());
    setSaveError(null);
    savedRows.current.clear();
    resetFileInputs();
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
    const input = event.currentTarget;
    if (!file || savingRef.current) return;

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
    setScanError(null);
    setResult(null);
    setSavedKeys(new Set());
    setSaveError(null);
    savedRows.current.clear();
    scanController.current?.abort();
    const controller = new AbortController();
    scanController.current = controller;

    try {
      const imageFile = isPdf ? await convertPdfFirstPageToImageFile(file, "menu-page.jpg") : file;
      if (controller.signal.aborted) return;
      const { dataUrl: image, width, height } = await prepareImageForAnalysis(imageFile, 2400, controller.signal);
      if (controller.signal.aborted) return;
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

      const context = { restaurantName, matchrimProfile: readMatchrimLocalProfile() };
      const scanResult = mode === 'menu'
        ? await scanFoodMenu89({ image, width, height, signal: controller.signal, context,
          invoke: (body, signal) => invokeEdgeFunction<unknown>('scan-food-pairing', body, signal) })
        : parseFoodScanResponse(await invokeEdgeFunction<unknown>('scan-food-pairing',
          { image, mode, ...context }, controller.signal));

      if (controller.signal.aborted || !mountedRef.current || scanController.current !== controller) return;

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
            ? `${scanResult.dishes.length} lecturas para revisar`
            : "Plato analizado"
        );
      } else {
        toast.info("No he podido detectar platos claros. Prueba con una foto más cercana.");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof FoodScanResponseError) console.warn("Invalid food scan response");
      else console.error("Error scanning food pairing:", error);
      const message = error instanceof Error ? error.message : "No se pudo analizar la imagen";
      setScanError(message);
      trackAppEvent("food_scan_failed", {
        userId: user?.id,
        metadata: { mode, error: message },
      });
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        input.value = "";
      }
    }
  };

  const saveRecommendation = async (
    dish: FoodDishResult,
    recommendation: FoodWineRecommendation,
    dishIndex: number,
    recommendationIndex: number,
    favorite = false
  ) => {
    if (!foodRowPolicy90(dish).pairingAllowed) return;
    if (!user) {
      navigate(buildAuthRedirectPath("/my-wines"));
      return;
    }

    const rowKey = `${dishIndex}-${recommendationIndex}`;
    const saveKey = `${favorite ? "favorite" : "wishlist"}-${rowKey}`;
    if (savingRef.current || savedKeys.has(saveKey)) return;
    savingRef.current = true;
    setSaveError(null);
    setSavingKey(saveKey);

    try {
      const existingId = savedRows.current.get(rowKey);
      // A favourite is a flag on the same saved idea, not a second wine.
      const mutation = existingId
        ? supabase.from("user_wines").update({ is_favorite: true }).eq('id', existingId).eq('user_id', user.id)
        : supabase
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
          sensory_attributes: null,
          use_for_profile_training: false,
          consumption_place: restaurantName || null,
          consumption_place_type: restaurantName ? "restaurant" : null,
          place_details: {
            source: "food_pairing_scanner",
            scan_mode: mode,
            dish_name: dish.nombre,
            dish_category: dish.categoria,
            dish_match: dish.match,
            evidence: 'unverified_style_suggestion',
          } as Json,
        });
      const { data, error } = await mutation.select('id').single();

      if (error) throw error;
      if (!data?.id) throw new Error('Saved recommendation not confirmed');
      if (!mountedRef.current) return;
      savedRows.current.set(rowKey, data.id);

      setSavedKeys((current) => new Set(current).add(`wishlist-${rowKey}`).add(saveKey));
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
      if (!mountedRef.current) return;
      console.error("Error saving food recommendation:", error);
      setSaveError({ rowKey, message: "No se pudo guardar la recomendación" });
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSavingKey(null);
    }
  };

  const clearScan = () => {
    if (savingRef.current) return;
    scanController.current?.abort();
    setLoading(false);
    setScanError(null);
    setPreview(null);
    setResult(null);
    setSavedKeys(new Set());
    setSaveError(null);
    savedRows.current.clear();
    resetFileInputs();
  };

  const contextWithMenu = () => ({
    ...carriedContext,
    restaurantName: restaurantName || carriedContext.restaurantName,
    foodMenu: result ? foodPairingContext90(result.dishes) : carriedContext.foodMenu,
  });

  const findBottle = (dishName?: string) => {
    const context = contextWithMenu();
    navigate(restaurantScanPath('wine-menu', { dish: dishName }, context), {
      state: restaurantCarryState(user?.id ?? null, context),
    });
  };

  const askWithMenu = () => {
    if (!selectedWine.trim() || !result?.dishes.some((dish) => foodRowPolicy90(dish).pairingAllowed)) return;
    const query = new URLSearchParams({ function: 'dish-for-wine', wine: selectedWine.trim() });
    navigate(`/inteligencia-liquida?${query}`, {
      state: restaurantCarryState(user?.id ?? null, contextWithMenu()),
    });
  };

  const currentStep = processingSteps[mode][stepIndex];

  return (
    <div className={`space-y-5${isNative ? ' [&_button]:h-auto [&_button]:min-h-11 [&_button]:whitespace-normal' : ''}`}>
      {isNative && mode === 'menu' && (
        <div className="space-y-2 border-b border-stone-200 pb-4 [overflow-wrap:anywhere]">
          <label htmlFor="restaurant-menu-wine" className="text-sm font-semibold text-slate-800">Vino para este menú</label>
          <Input id="restaurant-menu-wine" value={selectedWine} maxLength={300} disabled={loading || Boolean(savingKey)} onChange={(event) => setSelectedWine(event.target.value)} />
          {carriedContext.restaurantName && <p className="text-sm text-slate-600">Restaurante: {carriedContext.restaurantName}</p>}
          {carriedContext.budget && <p className="text-sm text-slate-600">Límite solicitado: {carriedContext.budget} {carriedContext.currency}; {carriedContext.service === 'glass' ? 'copa' : carriedContext.service === 'bottle' ? 'botella' : 'formato sin indicar'}. Precio y servicio sin confirmar.</p>}
        </div>
      )}
      {!lockMode && (
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-stone-200 bg-white p-1">
          <Button
            type="button"
            variant={mode === "menu" ? "default" : "ghost"}
            className={mode === "menu" ? "bg-red-900 hover:bg-red-950" : "text-slate-700"}
            onClick={() => selectMode("menu")}
            disabled={Boolean(savingKey)}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Menú
          </Button>
          <Button
            type="button"
            variant={mode === "dish" ? "default" : "ghost"}
            className={mode === "dish" ? "bg-red-900 hover:bg-red-950" : "text-slate-700"}
            onClick={() => selectMode("dish")}
            disabled={Boolean(savingKey)}
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
          disabled={loading || Boolean(savingKey)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => handleFileSelect(event, "camera")}
          className="hidden"
          disabled={loading || Boolean(savingKey)}
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
                  aria-label="Elegir otra imagen"
                  title="Elegir otra imagen"
                  className="absolute right-3 top-3 h-11 w-11 rounded-md"
                  onClick={clearScan}
                  disabled={Boolean(savingKey)}
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
                <Progress value={((stepIndex + 1) / processingSteps[mode].length) * 100} aria-label="Progreso del análisis de comida" className="h-2" />
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

      {isNative && loading && (
        <Button type="button" variant="outline" className="min-h-11 w-full gap-2" onClick={clearScan}><X className="h-4 w-4" />Cancelar análisis de comida</Button>
      )}

      {scanError && (
        <div ref={errorRef} role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <p>{scanError}</p>
          <Button type="button" variant="outline" className="mt-3 min-h-11 gap-2" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4" />
            Seleccionar otra foto
          </Button>
        </div>
      )}

      {result && (
        <div ref={resultRef} className="scroll-mt-24 space-y-4">
          {isNative && mode === 'menu' && selectedWine.trim() && result.dishes.some((dish) => foodRowPolicy90(dish).pairingAllowed) && (
            <Button type="button" className="min-h-11 w-full gap-2 whitespace-normal bg-red-900 hover:bg-red-950" onClick={askWithMenu}>
              <Sparkles className="h-4 w-4 shrink-0" />Elegir plato de este menú para mi vino
            </Button>
          )}
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-red-900" />
              <div className={isNative ? 'min-w-0 flex-1' : undefined}>
                <h3 className="font-semibold text-slate-950">Resultado</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{result.summary}</p>
                <p className="mt-2 text-sm text-amber-800">Tus gustos en vino no determinan tus preferencias de comida.</p>
                {result.coverage?.estimated_visible_dishes != null && (
                  <p className="mt-2 text-sm text-stone-600">El detector estima {result.coverage.estimated_visible_dishes} platos visibles; ha devuelto {result.dishes.length}.</p>
                )}
                {result.coverage?.truncated && <p className="mt-2 font-medium text-amber-800">Lectura parcial o sin verificar; revisa la carta original.</p>}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <p className="font-semibold">Maridajes orientativos, sin puntuación personal</p>
            <p className="mt-1">
              Faltan una botella identificada y sus datos sensoriales para calcular afinidad. No se han evaluado tus gustos de comida, alergias ni restricciones dietéticas.
            </p>
            <p className="mt-1">
              Si no hemos escaneado una carta de vinos concreta, estas tarjetas son ideas de estilo, uva o región. Para convertirlas en una botella real del restaurante, escanea su carta de vinos.
            </p>
          </div>

          {result.dishes.map((dish, dishIndex) => {
            const policy = foodRowPolicy90(dish);
            return (
            <div key={`${dish.nombre}-${dishIndex}`} data-testid={`food-row-${dishIndex}`} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm [overflow-wrap:anywhere]">
              <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-4">
                <div className="min-w-0">
                  <Badge variant="outline" className="mb-2 border-red-100 text-red-900">
                    {dish.categoria}
                  </Badge>
                  <h3 className="text-lg font-bold leading-tight text-slate-950">{dish.nombre}</h3>
                  <p data-testid="food-availability" className="mt-2 text-sm font-medium text-amber-900">{policy.label}</p>
                  {dish.source_text && <p className="mt-2 text-sm leading-6 text-slate-600">Lectura: {dish.source_text}</p>}
                </div>
              </div>

              {policy.pairingAllowed ? <div className="space-y-3 p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <WineIcon />
                  Ideas de vino para este plato
                </div>

                {dish.recomendaciones.map((recommendation, recommendationIndex) => {
                  const saveKey = `wishlist-${dishIndex}-${recommendationIndex}`;
                  const favoriteSaveKey = `favorite-${dishIndex}-${recommendationIndex}`;
                  const isSaved = savedKeys.has(saveKey);
                  const isFavoriteSaved = savedKeys.has(favoriteSaveKey);
                  if (isNative && unsupportedRestaurantClaim([recommendation.nombre, recommendation.tipo, ...(recommendation.uvas ?? [])].join('\n'))) {
                    return <p key={saveKey} className="text-sm text-amber-900">El modelo devolvió una idea con datos no verificables. No la he mostrado.</p>;
                  }

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
	                          </div>
	                          <h4 className="font-semibold text-slate-950">{recommendation.nombre}</h4>
	                          <div className="mt-2 flex flex-wrap gap-2">
	                            <Badge className="bg-red-900 text-white hover:bg-red-900">{recommendation.tipo}</Badge>
                            {(recommendation.uvas || []).slice(0, 2).map((grape) => (
                              <Badge key={grape} variant="outline">{grape}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

	                      <p className="mt-3 text-xs font-semibold text-stone-600">Hipótesis de maridaje del modelo</p>
	                      <p className="mt-1 text-sm leading-6 text-slate-600">{isNative && (unsupportedRestaurantClaim(recommendation.razon) || /\d/.test(recommendation.razon)) ? 'Idea de estilo pendiente de contrastar con la carta de vinos.' : recommendation.razon}</p>
	                      <p className="mt-2 rounded-md border border-stone-200 bg-white p-2 text-xs leading-5 text-slate-500">
	                        Esto todavía no es una botella concreta: úsalo como dirección de búsqueda o escanea la carta de vinos para elegir el vino real del restaurante.
	                      </p>

	                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <Button
                          type="button"
                          variant={isSaved ? "secondary" : "outline"}
                          className="gap-2"
                          disabled={isSaved || Boolean(savingKey)}
                          onClick={() => saveRecommendation(dish, recommendation, dishIndex, recommendationIndex)}
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
                          disabled={isFavoriteSaved || Boolean(savingKey)}
                          onClick={() => saveRecommendation(dish, recommendation, dishIndex, recommendationIndex, true)}
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
                          onClick={() => navigate(`/inteligencia-liquida?function=pairing-check&wine=${encodeURIComponent(recommendation.nombre)}&dish=${encodeURIComponent(dish.nombre)}`, isNative ? { state: restaurantCarryState(user?.id ?? null, contextWithMenu()) } : undefined)}
                        >
                          <Sparkles className="h-4 w-4" />
                          Preguntar a aiRIM
                        </Button>
                      </div>
                      {saveError?.rowKey === `${dishIndex}-${recommendationIndex}` && (
                        <p ref={saveErrorRef} role="alert" className="mt-2 text-sm text-red-800">{saveError.message}</p>
                      )}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  className="w-full gap-2 bg-red-900 hover:bg-red-950"
	                  onClick={() => isNative ? findBottle(dish.nombre) : navigate(`/escanear/carta-vinos?dish=${encodeURIComponent(dish.nombre)}`)}
	                >
	                  <ScanLine className="h-4 w-4" />
	                  Encontrar botella real en la carta
	                </Button>
              </div> : <p className="p-4 text-sm leading-6 text-stone-700">Esta lectura no se usa para elegir un maridaje hasta confirmar el plato y su disponibilidad.</p>}
            </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 bg-white"
            onClick={() => {
              const firstDishName = result.dishes.find((dish) => foodRowPolicy90(dish).pairingAllowed)?.nombre;
              if (isNative) { findBottle(firstDishName); return; }
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
