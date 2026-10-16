import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { isFoodScanPayload, MAX_MENU_DISHES, MAX_MENU_TILE_DISHES, normalizeFoodScan, parseFoodMenuRegionContext } from "./contract.ts";
import { calculateEdgeLearnedProfile, type MatchrimTrainingRow } from "../_shared/matchrim-learning.ts";
import { runMatchrimAi } from "../_shared/matchrim-ai-provider.ts";
import { hasMatchrimOpenAiKey } from "../_shared/matchrim-openai.ts";
import { parseStructuredObject, structuredResponseError, STRUCTURED_RESPONSE_ERROR_STATUS,
  type StructuredResponseError } from "../_shared/structured-response.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_VERSION = 'scan-food-pairing-2026-10-15-tiled-regions-v8';

type MatchrimProfile = {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const normalizeSensoryValueTo5 = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  let v = n;
  if (v > 10) v = v / 20;
  else if (v > 5) v = v / 2;
  return clamp(Math.round(v), 1, 5);
};

const buildLearnedProfile = async (
  // deno-lint-ignore no-explicit-any
  client: any,
  userId: string,
  baseProfile: MatchrimProfile,
): Promise<MatchrimProfile> => {
  const { data, error } = await client
    .from("user_wines")
    .select("rating, sensory_attributes, use_for_profile_training, created_at, updated_at")
    .eq("user_id", userId)
    .eq("use_for_profile_training", true)
    .not("rating", "is", null)
    .not("sensory_attributes", "is", null)
    .limit(50);
  if (error || !data?.length) return baseProfile;

  return calculateEdgeLearnedProfile(baseProfile, data as MatchrimTrainingRow[]);
};

const invalidModelResponse = (error: StructuredResponseError) => new Response(JSON.stringify({
  ...error, dishes: [], scan_version: FUNCTION_VERSION,
}), { status: STRUCTURED_RESPONSE_ERROR_STATUS,
  headers: { ...corsHeaders, "Content-Type": "application/json", "sb-error-code": error.error } });

const invalidRequest = () => new Response(JSON.stringify({
  error: "invalid_request", message: "Selecciona una imagen valida y un modo menu o dish.",
  recoverable: true, retryable: false, dishes: [], scan_version: FUNCTION_VERSION,
}), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: unknown;
    try { body = await req.json(); } catch { return invalidRequest(); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalidRequest();
    const { image, mode, restaurantName, matchrimProfile, scan_region: rawScanRegion } = body as Record<string, unknown>;
    if (typeof image !== "string" || !image.startsWith("data:")) return invalidRequest();
    if (mode !== "menu" && mode !== "dish") return invalidRequest();
    if (restaurantName != null && typeof restaurantName !== "string") return invalidRequest();
    const scanRegion = parseFoodMenuRegionContext(rawScanRegion);
    if (rawScanRegion !== undefined && (!scanRegion || mode !== 'menu')) return invalidRequest();

    if (!hasMatchrimOpenAiKey()) {
      return new Response(JSON.stringify({ error: "provider_not_configured", recoverable: true,
        retryable: false, dishes: [], scan_version: FUNCTION_VERSION }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    let authProfile: MatchrimProfile | null = null;
    let userId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer", "").trim();
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (user) {
          userId = user.id;
          const { data: prof } = await supabaseClient
            .from("quiz_results")
            .select("potente, acidez, dulce, tanico, afrutado")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (prof) authProfile = prof as MatchrimProfile;
        }
      } catch (e) {
        console.log("Anonymous request:", (e as Error).message);
      }
    }

    const normalizeClientProfile = (raw: unknown): MatchrimProfile | null => {
      if (!raw || typeof raw !== "object") return null;
      const r = raw as Record<string, unknown>;
      const keys: (keyof MatchrimProfile)[] = ["potente", "acidez", "dulce", "tanico", "afrutado"];
      const out: Partial<MatchrimProfile> = {};
      for (const k of keys) {
        const v = normalizeSensoryValueTo5(r[k]);
        if (v == null) return null;
        out[k] = v;
      }
      return out as MatchrimProfile;
    };
    const clientProfile = normalizeClientProfile(matchrimProfile);
    const baseProfile: MatchrimProfile | null = authProfile ?? clientProfile;
    const profileSource: "auth" | "client" | "none" = authProfile ? "auth" : clientProfile ? "client" : "none";

    const learnedProfile = baseProfile && userId && authProfile
      ? await buildLearnedProfile(supabaseClient, userId, baseProfile)
      : baseProfile;


    const profileText = learnedProfile
      ? `Perfil Matchrim del usuario (escala 1-5): potencia=${learnedProfile.potente}, acidez=${learnedProfile.acidez}, dulzura=${learnedProfile.dulce}, taninos=${learnedProfile.tanico}, afrutado=${learnedProfile.afrutado}.`
      : "El usuario no tiene perfil Matchrim. Usa recomendaciones de afinidad clásica.";

    const maxDishes = mode === "menu" ? (scanRegion ? MAX_MENU_TILE_DISHES : MAX_MENU_DISHES) : 1;
    const maxTokens = scanRegion ? 8192 : 16384;
    const restaurantHint = restaurantName ? `Restaurante: ${restaurantName}.` : "";

    const prompt = `Eres un sumiller experto. Analiza esta imagen de ${mode === "menu" ? "un menú de comida (lista de platos)" : "un plato de comida"}.
${restaurantHint}
${profileText}
${scanRegion ? `Esta imagen es SOLO el recorte ${scanRegion.id} de dos recortes solapados. Lee unicamente sus pixeles, hasta ${maxDishes} platos. No estimes platos del resto de la imagen ni completes lineas cortadas. Todas las cajas son porcentajes de ESTA imagen recibida (recorte), nunca de la imagen completa; el cliente las remapea. Los recuentos de coverage y de sus regiones se refieren SOLO a este recorte. No hay recuentos previos conocidos: usa null cuando no puedas estimarlos, nunca un cero de relleno. Marca truncated si alcanzas el limite o hay lineas cortadas.` : ''}

Responde EXCLUSIVAMENTE en JSON compacto valido, sin indentacion, con esta forma:
{
  "summary": "resumen breve de lo detectado",
  "coverage": {
    "estimated_visible_dishes": 0,
    "unreadable_dishes": 0,
    "truncated": false,
    "notes": [],
    "regions": [
      { "id": "columna-1-seccion-1", "box": { "x": 0, "y": 0, "width": 50, "height": 100 }, "estimated_visible_dishes": 0, "unreadable_dishes": 0, "truncated": false }
    ]
  },
  "dishes": [
    {
      "nombre": "...",
      "categoria": "entrante|principal|postre|...",
      "source_order": 1,
      "region_id": "columna-1-seccion-1",
      "source_box": { "x": 5, "y": 10, "width": 40, "height": 5 },
      "source_text": "texto exacto leído en la carta",
      "confidence": 0-100,
      "match": null,
      "razon": "características culinarias visibles o inferidas; nunca preferencias del usuario",
      "recomendaciones": [
        { "nombre": "estilo de vino orientativo", "tipo": "Tinto|Blanco|...", "uvas": [], "match": null, "razon": "hipotesis breve de maridaje", "atributos": null }
      ]
    }
  ]
}

REGLAS ESTRICTAS:
- No generes vectores sensoriales de estilos genericos: atributos siempre null. No hay ficha de botella verificada.
- Resumen de hasta 180 caracteres y cada razon de hasta 90 caracteres. Evita repetir el mismo aviso en cada plato: usa coverage.notes. No reduzcas el inventario para ahorrar texto.
- match siempre null: una idea de estilo no es una botella con ficha sensorial verificada. No inventes porcentajes.
- El perfil Matchrim describe preferencias de VINO, no de comida. No deduzcas gustos por postres, picante, carne ni restricciones alimentarias. Vino seco no implica rechazo del azúcar en la comida.
- La extracción es independiente del perfil: incluye TODOS los platos, guarniciones, postres y opciones legibles. No omitas platos por su supuesto encaje personal. Conserva alternativas y tamaños sin convertir ingredientes en platos nuevos.
- El resumen describe solo lo leído y sus límites, nunca lo que supuestamente quiere comer el usuario. Las razones son hipótesis de maridaje, no hechos sobre ingredientes no visibles o gustos personales.
- ${mode === "menu"
    ? `Cuenta primero todas las líneas de platos legibles y devuelve una fila por cada plato, en el orden y sección originales, hasta un máximo técnico de ${maxDishes}.`
    : "Devuelve exactamente el plato visible cuando sea legible."}
- ${mode === "menu"
    ? "Antes de proponer vinos, inventaria cada columna, panel y seccion en coverage.regions con un id distinto, box y su recuento local. Recorre cada region de arriba abajo, despues pasa a la siguiente; no unas lineas que solo coinciden en altura entre columnas. Cada plato lleva region_id, source_order local y source_box de su propia linea, incluida dentro de su region. Todas las cajas usan porcentajes de la imagen recibida: x/y esquina superior izquierda, width/height positivos, sin salir de 0..100. Si la imagen recibida es un recorte, no remapees sus cajas a otra imagen. Los numeros del ejemplo son solo formato, no coordenadas a copiar. Revisa tambien guarniciones, salsas y postres legibles; una region sin filas no puede desaparecer del inventario. Los recuentos y cajas son estimaciones tuyas, no precision medida."
    : "No inventes regiones de carta para una fotografia de un plato."}
- NUNCA agrupes varios platos o postres en una misma fila para ahorrar espacio. Conserva literalmente una barra o guion cuando pertenezca a un unico nombre o alternativa; no asumas que Poisson-Poulet es un plato o dos sin leer sus lineas y regiones.
- source_text transcribe solo la linea de ese plato, no texto de otra columna. No completes nombres por conocimiento culinario ni copies un sufijo, salsa o guarnicion a otro plato sin texto que lo apoye.
- Si excepcionalmente una fila de salida contiene varios platos, incluye source_rows con una entrada por linea leida: {"nombre":"nombre literal", "source_text":"fragmento literal incluido en source_text de la fila", "region_id":"id del inventario", "source_order":1, "source_box":{"x":5,"y":10,"width":40,"height":5}}. Sus cajas deben ser distintas, no solaparse y quedar dentro de sus respectivas regiones y de la fila agregada si tiene caja. No lo uses para alternativas o ingredientes de un solo plato. Sin evidencia suficiente deja la duda en coverage.notes; no repares ni inventes filas. No atribuyas recomendaciones agregadas a cada fragmento.
- No inventes texto ilegible. Indica confidence bajo, aumenta unreadable_dishes y explica la duda en coverage.notes.
- Marca coverage.truncated=true y el limite local cuando falten filas en cualquier region, haya texto ilegible o estimated_visible_dishes sea mayor que el numero de filas devueltas; no declares cobertura completa por haber llenado una sola columna.
- 2 recomendaciones de vino por plato.
- No incluyas texto fuera del JSON.`;

    let content: unknown;
    let provider = "openai";
    let model = "";
    try {
      const ai = await runMatchrimAi({ prompt, image, maxTokens, signal: req.signal });
      if (ai.complete === false) return invalidModelResponse(structuredResponseError('incomplete_response'));
      content = ai.text;
      provider = ai.provider;
      model = ai.model;
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof TypeError) {
        return invalidModelResponse(structuredResponseError("invalid_json"));
      }
      const limited = error instanceof Error && /demasiadas solicitudes/i.test(error.message);
      console.error("Food AI provider unavailable");
      return new Response(JSON.stringify({ error: limited ? "rate_limited" : "provider_unavailable", recoverable: true,
        retryable: false, dishes: [], scan_version: FUNCTION_VERSION }), {
        status: limited ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = parseStructuredObject(content);
    if (!parsed.ok) return invalidModelResponse(parsed.error);
    if (!isFoodScanPayload(parsed.value)) return invalidModelResponse(structuredResponseError("invalid_schema"));

    const normalized = normalizeFoodScan(
      parsed.value.dishes,
      parsed.value.coverage,
      mode,
      maxDishes,
    );

    return new Response(
      JSON.stringify({
        mode,
        summary: parsed.value.summary ?? "",
        dishes: normalized.dishes,
        coverage: normalized.coverage,
        has_profile: Boolean(learnedProfile),
        profile_source: profileSource,
        scan_version: FUNCTION_VERSION,
        ai_provider: provider,
        ai_model: model,
        scan_region: scanRegion ?? undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("scan-food-pairing error:", err);
    const message = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: message, dishes: [], scan_version: FUNCTION_VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
