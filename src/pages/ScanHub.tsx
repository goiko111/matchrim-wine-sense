import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AppNav from "@/components/AppNav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScanLine, Wine, Utensils, Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react";
import { trackAppEvent } from "@/lib/analytics";

const WineLabelOCRImport = lazy(() =>
  import("@/components/wine-import/WineLabelOCRImport").then((m) => ({ default: m.WineLabelOCRImport })),
);
const WineMenuScanner = lazy(() => import("@/components/wine-import/WineMenuScanner"));
const FoodPairingScanner = lazy(() => import("@/components/wine-import/FoodPairingScanner"));

type Option = "label" | "wine-menu" | "food-menu" | "dish";

const OPTIONS: { id: Option; title: string; description: string; icon: typeof Wine }[] = [
  { id: "label", title: "Etiqueta de vino", description: "Identifica un vino fotografiando su etiqueta.", icon: Wine },
  { id: "wine-menu", title: "Carta de vinos", description: "Escanea una carta y encuentra los mejores vinos para ti.", icon: ScanLine },
  { id: "food-menu", title: "Menú de comida", description: "Sugerencias de vinos para cada plato del menú.", icon: Utensils },
  { id: "dish", title: "Plato", description: "Vinos a medida para un plato concreto.", icon: ImageIcon },
];

const Fallback = () => (
  <div className="flex items-center justify-center py-10 text-muted-foreground">
    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando…
  </div>
);

const PATH_TO_OPTION: Record<string, Option> = {
  "/escanear/etiqueta": "label",
  "/escanear/carta-vinos": "wine-menu",
  "/escanear/menu-comida": "food-menu",
  "/escanear/plato": "dish",
};

export default function ScanHub() {
  const navigate = useNavigate();
  const location = useLocation();
  const initial = PATH_TO_OPTION[location.pathname] ?? null;
  const [selected, setSelected] = useState<Option | null>(initial);

  useEffect(() => {
    trackAppEvent("scan_hub_opened");
  }, []);

  useEffect(() => {
    setSelected(PATH_TO_OPTION[location.pathname] ?? null);
  }, [location.pathname]);

  const choose = (opt: Option) => {
    trackAppEvent("scan_option_selected", { option: opt });
    setSelected(opt);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <AppNav />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Escanear</h1>
          <p className="text-muted-foreground">Convierte una foto en una recomendación a tu medida.</p>
        </div>

        {!selected && (
          <div className="grid gap-3 sm:grid-cols-2">
            {OPTIONS.map(({ id, title, description, icon: Icon }) => (
              <Card
                key={id}
                onClick={() => choose(id)}
                className="cursor-pointer hover:border-primary transition"
              >
                <CardHeader className="flex-row items-center gap-3 space-y-0">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Otras opciones
            </Button>
            <Suspense fallback={<Fallback />}>
              {selected === "label" && (
                <WineLabelOCRImport onExtractComplete={() => navigate("/my-wines")} />
              )}
              {selected === "wine-menu" && <WineMenuScanner />}
              {selected === "food-menu" && <FoodPairingScanner mode="menu" />}
              {selected === "dish" && <FoodPairingScanner mode="dish" />}
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
