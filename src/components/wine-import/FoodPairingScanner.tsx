import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, Camera, X, Sparkles, BookmarkPlus, MessageSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { readMatchrimLocalProfile } from "@/utils/matchrimLocalProfile";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trackAppEvent } from "@/lib/analytics";

type Mode = "menu" | "dish";

interface Recommendation {
  nombre: string;
  tipo: string | null;
  uvas: string[];
  match: number;
  razon: string;
  atributos: Partial<Record<"potencia" | "acidez" | "dulzura" | "taninos" | "afrutado", number>> | null;
}
interface Dish {
  nombre: string;
  categoria: string | null;
  match: number;
  razon: string;
  recomendaciones: Recommendation[];
}
interface ScanResult {
  mode: Mode;
  summary: string;
  dishes: Dish[];
  has_profile: boolean;
}

const STAGES: Record<Mode, string[]> = {
  menu: ["Leyendo el menú…", "Detectando platos…", "Sugiriendo vinos…"],
  dish: ["Analizando el plato…", "Buscando perfiles compatibles…", "Sugiriendo vinos…"],
};

interface Props {
  mode: Mode;
  restaurantName?: string;
}

const matchColor = (m: number) =>
  m >= 80 ? "text-green-600" : m >= 60 ? "text-yellow-600" : "text-red-600";

export const FoodPairingScanner = ({ mode, restaurantName }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPreview(null);
    setResult(null);
    setStage(0);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen válida");
      return;
    }
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    setPreview(dataUrl);
    setLoading(true);
    setStage(0);
    setResult(null);
    trackAppEvent("food_scan_started", { mode });

    // animated stage indicator
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES[mode].length - 1));
    }, 1800);

    try {
      const matchrimProfile = readMatchrimLocalProfile();
      const { data, error } = await supabase.functions.invoke("scan-food-pairing", {
        body: { image: dataUrl, mode, restaurantName: restaurantName ?? null, matchrimProfile },
      });
      clearInterval(interval);
      if (error) throw error;
      if (!data || data.error) throw new Error(data?.error ?? "scan-failed");
      setResult(data as ScanResult);
      trackAppEvent("food_scan_completed", { mode, dishes: (data.dishes ?? []).length, scan_version: data?.scan_version });
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      toast.error("No se pudo analizar la imagen");
      trackAppEvent("food_scan_failed", { mode, error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const saveWine = async (rec: Recommendation, dishName: string) => {
    if (!user) {
      toast.info("Inicia sesión para guardar vinos");
      navigate("/auth");
      return;
    }
    try {
      const { error } = await supabase.from("user_wines").insert({
        user_id: user.id,
        name: rec.nombre,
        grape_varieties: rec.uvas?.length ? rec.uvas : null,
        status: "wishlist",
        use_for_profile_training: false,
        sensory_attributes: rec.atributos ?? null,
        place_details: {
          source: "food_pairing_scanner",
          mode,
          dish: dishName,
          ...(restaurantName ? { restaurant: restaurantName } : {}),
        },
      } as never);
      if (error) throw error;
      toast.success("Añadido a Quiero Probar");
      trackAppEvent("wine_saved", { source: "food_pairing_scanner", mode });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo guardar el vino");
    }
  };

  const askAirim = (rec: Recommendation) => {
    trackAppEvent("airim_opened", { source: "food_pairing_scanner" });
    navigate(`/inteligencia-liquida?function=dish-for-wine&wine=${encodeURIComponent(rec.nombre)}`);
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFile}
        className="hidden"
        disabled={loading}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
        disabled={loading}
      />

      {!preview && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center bg-card">
          <Camera className="w-12 h-12 mx-auto text-primary/40 mb-3" />
          <p className="font-semibold mb-1">
            {mode === "menu" ? "Fotografía el menú de comida" : "Fotografía un plato"}
          </p>
          <p className="text-sm text-muted-foreground mb-3">
            {mode === "menu"
              ? "Detectaremos hasta 8 platos y sugeriremos vinos para cada uno."
              : "Identificaremos el plato y sugeriremos 2 vinos a medida."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 max-w-md mx-auto">
            <Button onClick={() => cameraRef.current?.click()} className="gap-2" disabled={loading}>
              <Camera className="h-4 w-4" /> Hacer foto
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" className="gap-2" disabled={loading}>
              <Upload className="h-4 w-4" /> Subir archivo
            </Button>
          </div>
        </div>
      )}


      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt="" className="max-h-64 rounded-lg shadow" />
          {!loading && (
            <Button onClick={reset} variant="destructive" size="icon" className="absolute top-2 right-2">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium">{STAGES[mode][stage]}</span>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {result.summary && (
            <p className="text-sm text-muted-foreground italic">{result.summary}</p>
          )}
          {!result.has_profile && (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
              Completa tu test Matchrim para encajes personalizados.
              <Button variant="link" className="px-1 h-auto text-amber-900" onClick={() => navigate("/matchrim")}>
                Hacer el test
              </Button>
            </div>
          )}
          {result.dishes.length === 0 && (
            <p className="text-sm text-muted-foreground">No detectamos platos en la imagen.</p>
          )}
          {result.dishes.map((dish, di) => (
            <Card key={di}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      {dish.nombre}
                      {dish.categoria && <Badge variant="outline">{dish.categoria}</Badge>}
                    </h3>
                    {dish.razon && (
                      <p className="text-xs text-muted-foreground mt-1">{dish.razon}</p>
                    )}
                  </div>
                  <span className={`text-sm font-bold ${matchColor(dish.match)}`}>{dish.match}%</span>
                </div>
                <div className="space-y-2">
                  {dish.recomendaciones.map((rec, ri) => (
                    <div key={ri} className="rounded-md border bg-muted/30 p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{rec.nombre}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {rec.tipo && <Badge variant="secondary" className="text-[10px]">{rec.tipo}</Badge>}
                            {rec.uvas?.map((u) => (
                              <Badge key={u} variant="outline" className="text-[10px]">{u}</Badge>
                            ))}
                          </div>
                          {rec.razon && <p className="text-xs text-muted-foreground mt-1">{rec.razon}</p>}
                        </div>
                        <span className={`text-xs font-bold ${matchColor(rec.match)}`}>{rec.match}%</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => saveWine(rec, dish.nombre)}>
                          <BookmarkPlus className="h-3 w-3" /> Quiero probar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => askAirim(rec)}>
                          <MessageSquare className="h-3 w-3" /> aiRIM
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1 h-7"
                          onClick={() => navigate(`/usar-matchrim?mode=scanner&q=${encodeURIComponent(rec.nombre)}`)}
                        >
                          <Search className="h-3 w-3" /> Buscar parecidos
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={reset} className="gap-2">
            <Sparkles className="h-4 w-4" /> Escanear otra imagen
          </Button>
        </div>
      )}
    </div>
  );
};

export default FoodPairingScanner;
