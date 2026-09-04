import AppNav from "@/components/AppNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Capacitor } from "@capacitor/core";
import { ScanPrivacyGate } from "@/components/ScanPrivacyGate";
import { ScanHub, scanOptions, type ScanMode } from "@/components/wine-import/ScanHub";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { trackAppEvent } from "@/lib/analytics";
import { buildAuthRedirectPath } from "@/utils/navigation";
import { ArrowLeft, ScanLine } from "lucide-react";
import { useEffect } from "react";
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

interface ScanExtractedWine {
  nombre: string;
  productor?: string | null;
  anada?: number | null;
  region?: string | null;
  pais?: string | null;
  uvas?: string[] | null;
  alcohol?: number | null;
  notas_cata?: string | null;
  affinity_reason?: string | null;
  imagen_url?: string | null;
  matchrim_affinity?: number | null;
  sensory_attributes?: Json | null;
  is_favorite?: boolean;
}

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

  useEffect(() => {
    if (modeParam || !scanModes.has(requestedMode as ScanMode)) return;
    navigate(`/escanear/${scanModePaths[requestedMode as ScanMode]}`, { replace: true });
  }, [modeParam, navigate, requestedMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleExtractComplete = async (wine: ScanExtractedWine) => {
    if (!user) {
      navigate(buildAuthRedirectPath(`${location.pathname}${location.search}`));
      return;
    }

    try {
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
          alcohol_content: wine.alcohol || null,
          tasting_notes: wine.notas_cata || wine.affinity_reason || null,
          image_url: wine.imagen_url || null,
          matchrim_affinity: wine.matchrim_affinity || null,
          sensory_attributes: (wine.sensory_attributes || null) as Json,
          status: "wishlist",
          is_favorite: Boolean(wine.is_favorite),
          use_for_profile_training: false,
          place_details: {
            source: "label_scanner",
            affinity_reason: wine.affinity_reason || null,
          } as Json,
        });

      if (error) throw error;

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
    } catch (error) {
      console.error("Error saving scanned label wine:", error);
      toast.error("No se pudo guardar el vino");
    }
  };

  if (modeParam && !activeMode) {
    return <Navigate to="/escanear" replace />;
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
                  className="scan-page-back matchrim-pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
                  aria-label="Volver a tipos de escaneo"
                  title="Volver"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 text-red-800">
                    {ActiveScanIcon && <ActiveScanIcon className="h-4 w-4" />}
                    <span className="text-sm font-semibold">Escáner Matchrim</span>
                  </div>
                  <h1 className="mt-1 text-[1.75rem] font-bold leading-tight text-slate-950">{activeOption.title}</h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{activeOption.description}</p>
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
              <div className="flex items-center gap-2 text-red-800">
                <ScanLine className="h-4 w-4" />
                <span className="text-sm font-semibold">Cámara y galería</span>
              </div>
              <h1 className="mt-1 text-[2rem] font-bold leading-tight text-slate-950">Escanear</h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">
                Elige lo que tienes delante. Cada vino se identifica y puntúa por separado.
              </p>
            </div>

            <ScanHub
              onExtractComplete={handleExtractComplete}
              variant="hub"
              onSelectMode={(mode) => navigate(`/escanear/${scanModePaths[mode]}`)}
            />
          </>
        )}
      </main>
      <MobileBottomNav />
    </div>
  );
};

export default Scan;
