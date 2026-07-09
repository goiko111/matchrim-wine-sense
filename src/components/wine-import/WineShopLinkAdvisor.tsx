import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ShoppingBag, Wine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readMatchrimLocalProfile } from "@/utils/matchrimLocalProfile";
import { recordScanHistory } from "@/utils/scanHistory";
import { trackAppEvent } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";

type Recommendation = {
  nombre: string;
  tipo: string | null;
  region: string | null;
  uvas: string[];
  precio_estimado: string | null;
  razon: string;
  atributos: Record<string, number>;
};

type AdvisorResponse = {
  version?: string;
  profile_source?: string;
  has_url?: boolean;
  summary: string;
  consejo: string;
  recomendaciones: Recommendation[];
};

const EXAMPLES = [
  "Quiero comprar un vino que me vaya a gustar, menos de 20€, y probar una región nueva.",
  "Tengo una cena con pescado y quiero llevar una botella fácil de acertar.",
  "Me gusta Predicador de Rioja. Recomiéndame algo parecido pero con otro carácter.",
  "Quiero una botella un poco más atrevida para aprender, sin pasarme de 30€.",
];

export const WineShopLinkAdvisor = () => {
  const { user } = useAuth();
  const [intent, setIntent] = useState("");
  const [url, setUrl] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AdvisorResponse | null>(null);

  const canSubmit = useMemo(() => intent.trim().length > 0 || url.trim().length > 0, [intent, url]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Escribe qué buscas o pega un enlace opcional");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const matchrimProfile = readMatchrimLocalProfile();
      const { data, error } = await supabase.functions.invoke("analyze-shop-link", {
        body: {
          intent: intent.trim() || null,
          url: url.trim() || null,
          budget: budget.trim() || null,
          matchrimProfile,
        },
      });
      if (error) throw error;
      const payload = data as AdvisorResponse | { error?: string };
      if (payload && "error" in payload && payload.error) {
        throw new Error(payload.error);
      }
      const advisor = payload as AdvisorResponse;
      setResult(advisor);

      const titleSource = advisor.recomendaciones?.[0]?.nombre?.trim() || intent.trim() || "consulta";
      recordScanHistory({
        type: "shop-link",
        title: `Encontrar vino: ${titleSource.slice(0, 60)}`,
        subtitle: advisor.summary?.slice(0, 90) ?? null,
        route: "/escanear/encontrar-vino",
        payload: {
          intent: intent.trim() || null,
          url: url.trim() || null,
          budget: budget.trim() || null,
        },
      });
      trackAppEvent("shop_link_analyzed", {
        userId: user?.id,
        metadata: { has_url: Boolean(url.trim()), has_intent: Boolean(intent.trim()) },
      });
    } catch (err) {
      console.error("analyze-shop-link error", err);
      const msg = (err as Error).message || "No se pudo analizar tu petición";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-red-900" />
            Encontrar vino
          </CardTitle>
          <CardDescription>
            Haz una pregunta abierta o pega una tienda. Matchrim no vende vino: te ayuda a decidir qué botella buscaría para ti.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-intent">Qué quieres encontrar</Label>
            <Textarea
              id="shop-intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="Ej.: quiero un tinto para regalar, presupuesto 25€, que sorprenda…"
              rows={4}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setIntent(ex)}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs text-slate-700 hover:border-red-200 hover:bg-red-50"
                >
                  {ex.length > 60 ? ex.slice(0, 60) + "…" : ex}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="shop-url">Enlace de tienda o búsqueda opcional</Label>
              <Input
                id="shop-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                type="url"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-budget">Presupuesto (opcional)</Label>
              <Input
                id="shop-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ej.: hasta 20€"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="w-full gap-2 bg-red-900 hover:bg-red-950"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? "Buscando…" : "Encontrar mi vino"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wine className="h-5 w-5 text-red-900" />
              Qué buscaría para ti
            </CardTitle>
            {result.summary && <CardDescription>{result.summary}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-3">
            {result.recomendaciones.length === 0 && (
              <p className="text-sm text-slate-500">No he podido armar recomendaciones. Prueba a dar más pistas.</p>
            )}
            {result.recomendaciones.map((rec, i) => (
              <div key={i} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h3 className="font-semibold text-slate-950">{rec.nombre}</h3>
                  {rec.tipo && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-900">{rec.tipo}</span>
                  )}
                  {rec.precio_estimado && (
                    <span className="text-xs text-slate-500">· {rec.precio_estimado}</span>
                  )}
                </div>
                {rec.region && <p className="mt-1 text-xs text-slate-500">{rec.region}</p>}
                {rec.uvas.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Uvas: {rec.uvas.join(", ")}</p>
                )}
                {rec.razon && <p className="mt-2 text-sm leading-6 text-slate-700">{rec.razon}</p>}
              </div>
            ))}
            {result.consejo && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                {result.consejo}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WineShopLinkAdvisor;
