import AppNav from "@/components/AppNav";
import MobileBottomNav from "@/components/MobileBottomNav";
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

const Scan = () => {
  const { user } = useAuth();
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

  const handleExtractComplete = async (wine: any) => {
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
    <div className="min-h-screen bg-stone-50 pb-[calc(8rem+var(--matchrim-safe-bottom))]">
      {user && <AppNav />}
      <main className="mx-auto max-w-3xl px-4 py-6">
        {activeMode && activeOption ? (
          <>
            <button
              type="button"
              onClick={() => navigate("/escanear")}
              className="mb-5 inline-flex items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-red-200 hover:text-red-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Otras opciones
            </button>

            <div className="mb-6 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-900">
                {ActiveScanIcon && <ActiveScanIcon className="h-5 w-5" />}
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight text-slate-950">{activeOption.title}</h1>
                <p className="mt-1 text-sm leading-6 text-slate-500">{activeOption.description}</p>
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

            <ScanHub
              onExtractComplete={handleExtractComplete}
              mode={activeMode}
              variant="selected"
              pairingDishName={pairingDishName}
              similarWineName={similarWineName}
            />
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-red-50 text-red-900">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-950">Escanear</h1>
                <p className="text-sm leading-6 text-slate-500">
                  Escanea lo que tienes delante. Matchrim lo convierte en una decisión, no en una lista más.
                </p>
              </div>
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
