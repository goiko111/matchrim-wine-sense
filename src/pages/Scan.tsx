import AppNav from "@/components/AppNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import { NativeScanHub99 } from "@/components/NativeScanHub99";
import { Capacitor } from "@capacitor/core";
import { ScanPrivacyGate } from "@/components/ScanPrivacyGate";
import { ScanHub, scanOptions, type ScanMode } from "@/components/wine-import/ScanHub";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { trackAppEvent } from "@/lib/analytics";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { confirmedLabelInsertId, labelInsertErrorResult, type LabelSaveCallback } from "@/utils/labelScanSave";
import { ArrowLeft, ChefHat, ChevronRight, ScanLine } from "lucide-react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

const scanModes = new Set<ScanMode>(["label", "wine-menu", "food-menu", "dish", "shop-link"]);
const scanModePaths: Record<ScanMode, string> = {
  label: "etiqueta",
  "wine-menu": "carta-vinos",
  "food-menu": "menu-comida",
  dish: "plato",
  "shop-link": "encontrar-vino",
};
const scanPathAliases: Record<string, ScanMode> = {
  label: "label",
  etiqueta: "label",
  "wine-menu": "wine-menu",
  carta: "wine-menu",
  "carta-vinos": "wine-menu",
  "food-menu": "food-menu",
  menu: "food-menu",
  "menu-comida": "food-menu",
  dish: "dish",
  plato: "dish",
  "shop-link": "shop-link",
  "encontrar-vino": "shop-link",
  "enlace-tienda": "shop-link",
  enlace: "shop-link",
  tienda: "shop-link",
  compra: "shop-link",
  encontrar: "shop-link",
  "buscar-vino": "shop-link",
  "comprar-vino": "shop-link",
};

const Scan = () => {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode: modeParam } = useParams<{ mode?: string }>();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const pairingDishName = searchParams.get("dish");
  const similarWineName = searchParams.get("wine");
  const activeMode = modeParam ? scanPathAliases[modeParam] : null;
  const activeOption = activeMode
    ? scanOptions.find((option) => option.id === activeMode)
    : null;
  const ActiveScanIcon = activeOption?.icon;
  const saveLifetime = useRef({ active: false, generation: 0 });
  useLayoutEffect(() => {
    const lifetime = saveLifetime.current;
    lifetime.active = true;
    lifetime.generation += 1;
    return () => {
      lifetime.active = false;
      lifetime.generation += 1;
    };
  }, [user?.id, location.pathname, location.search]);

  useEffect(() => {
    if (modeParam || !scanModes.has(requestedMode as ScanMode)) return;
    navigate(`/escanear/${scanModePaths[requestedMode as ScanMode]}`, { replace: true });
  }, [modeParam, navigate, requestedMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleExtractComplete: LabelSaveCallback = async (wine, context) => {
    const generation = saveLifetime.current.generation;
    const isCurrent = () => saveLifetime.current.active
      && saveLifetime.current.generation === generation && context.isCurrent();
    if (!isCurrent()) return { status: "obsolete" };
    if (!user) {
      navigate(buildAuthRedirectPath(`${location.pathname}${location.search}`));
      return { status: "auth-required" };
    }

    try {
      const { data, error } = await supabase
        .from("user_wines")
        .insert({
          user_id: user.id,
          name: wine.nombre,
          producer: wine.productor || null,
          vintage: wine.anada || null,
          region: wine.region || null,
          country: wine.pais || null,
          grape_varieties: wine.uvas || null,
          alcohol_content: wine.alcohol || null,
          tasting_notes: wine.notas_cata || wine.affinity_reason || null,
          image_url: wine.imagen_url || null,
          matchrim_affinity: wine.matchrim_affinity ?? null,
          sensory_attributes: (wine.sensory_attributes || null) as Json,
          status: "wishlist",
          is_favorite: Boolean(wine.is_favorite),
          use_for_profile_training: false,
          place_details: {
            source: "label_scanner",
            affinity_reason: wine.affinity_reason || null,
            ...(isNative && wine.affinity_details && typeof wine.affinity_details === 'object' && !Array.isArray(wine.affinity_details)
              ? wine.affinity_details : {}),
          } as Json,
        })
        .select("id,user_id,name,producer,vintage,region,country,status,is_favorite,use_for_profile_training,sensory_attributes,place_details")
        .single();

      if (!isCurrent()) return { status: "obsolete" };
      if (error) return labelInsertErrorResult(error);
      const rowId = confirmedLabelInsertId(data, wine, user.id);
      if (!rowId) return { status: "ambiguous" };

      trackAppEvent("wine_saved", {
        userId: user.id,
        metadata: {
          source: "label_scanner",
          wine_name: wine.nombre,
          match: wine.matchrim_affinity || null,
        },
      });
      toast.success(
        wine.is_favorite
          ? `${wine.nombre} guardado en Quiero Probar y Favoritos`
          : `${wine.nombre} guardado en Quiero Probar`
      );
      return { status: "saved", rowId, ownerId: user.id };
    } catch {
      return { status: isCurrent() ? "ambiguous" : "obsolete" };
    }
  };

  if (modeParam && !activeMode) {
    return <Navigate to="/escanear" replace />;
  }

  if (isNative && !activeMode) {
    return (
      <div className="matchrim-app-shell min-h-screen bg-[#fafafa] pb-[calc(var(--matchrim-bottom-nav-height,88px)+16px)] text-stone-950">
        <main className="mx-auto w-full max-w-xl pb-[24px] pl-[calc(16px+var(--matchrim-safe-left))] pr-[calc(16px+var(--matchrim-safe-right))] pt-[calc(16px+var(--matchrim-safe-top))]">
          <NativeScanHub99
            ownerId={user?.id ?? null}
            options={scanOptions}
            onSelectMode={(mode) => {
              trackAppEvent("scan_option_selected", { userId: user?.id, metadata: { option: mode } });
              navigate(`/escanear/${scanModePaths[mode]}`);
            }}
            onOpenRestaurant={() => navigate("/restaurante")}
            onOpenRecent={(route) => navigate(route)}
          />
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="matchrim-app-shell min-h-screen pb-[calc(8rem+var(--matchrim-safe-bottom))]">
      {user && !isNative && <AppNav />}
      <main className="scan-page-main matchrim-native-safe-x mx-auto max-w-5xl pb-6 pt-[calc(1rem+var(--matchrim-safe-top))] sm:pt-6">
        {activeMode && activeOption ? (
          <>
            <div className="scan-page-heading mb-6">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/escanear")}
                  className={`scan-page-back matchrim-pressable flex ${isNative ? 'h-[44px] w-[44px]' : 'h-11 w-11'} shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm`}
                  aria-label="Volver a tipos de escaneo"
                  title="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className={`min-w-0 flex-1 pt-0.5${activeMode === "shop-link" ? " [overflow-wrap:anywhere]" : ""}`}>
                  {!isNative && <div className="flex items-center gap-2 text-red-800">
                    {ActiveScanIcon && <ActiveScanIcon className="h-4 w-4" />}
                    <span className="text-sm font-semibold">Escáner Matchrim</span>
                  </div>}
                  <h1 className={`mt-1 break-words ${isNative ? 'text-xl' : 'text-[1.75rem]'} font-bold leading-tight text-slate-950`}>{activeOption.title}</h1>
                  {!isNative && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{activeOption.description}</p>}
                </div>
              </div>
            </div>

            {activeMode === "wine-menu" && pairingDishName && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Buscando una botella de esta carta para: <span className="font-semibold">{pairingDishName}</span>.
              </div>
            )}
            {activeMode === "wine-menu" && similarWineName && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                Buscando vinos parecidos en esta carta a: <span className="font-semibold">{similarWineName}</span>.
              </div>
            )}

            <ScanPrivacyGate>
              <ScanHub
                onExtractComplete={handleExtractComplete}
                mode={activeMode}
                variant="selected"
                pairingDishName={pairingDishName}
                similarWineName={similarWineName}
              />
            </ScanPrivacyGate>
          </>
        ) : (
          <>
            <div className="mb-6">
              {!isNative && <div className="flex items-center gap-2 text-red-800">
                <ScanLine className="h-4 w-4" />
                <span className="text-sm font-semibold">Cámara y galería</span>
              </div>}
              <h1 className={`mt-1 ${isNative ? 'text-2xl' : 'text-[2rem]'} font-bold leading-tight text-slate-950 [overflow-wrap:anywhere]`}>Escanear</h1>
              {!isNative && <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">
                Elige lo que tienes delante. Cada vino se identifica y puntúa por separado.
              </p>}
            </div>

            {isNative && <button type="button" aria-label="Comida y vinos del restaurante" onClick={() => navigate('/restaurante')}
              className="matchrim-pressable mb-5 flex min-h-16 w-full items-center gap-3 border-y border-slate-200 py-4 text-left">
              <ChefHat className="h-6 w-6 shrink-0 text-red-900" aria-hidden="true" focusable="false" />
              <span className="min-w-0 flex-1"><span className="block font-semibold">Comida + vinos del restaurante</span>
                <span className="mt-1 block text-sm text-slate-500">Cartas completas, fotos, PDF y enlaces</span></span>
              <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" focusable="false" />
            </button>}
            <ScanHub
              onExtractComplete={handleExtractComplete}
              variant="hub"
              isNative={isNative}
              onSelectMode={(mode) => navigate(`/escanear/${scanModePaths[mode]}`)}
            />
          </>
        )}
      </main>
      {(isNative || !user) && <MobileBottomNav />}
    </div>
  );
};

export default Scan;
