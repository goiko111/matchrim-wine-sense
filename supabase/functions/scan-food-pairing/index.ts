import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { isFoodScanPayload, MAX_MENU_DISHES, MAX_MENU_TILE_DISHES, normalizeFoodScan, parseFoodMenuRegionContext } from "./contract.ts";
import { calculateLearnedMatchrimProfile95, readMatchrimLearningOptions96, readMatchrimProfile95, MATCHRIM_PROFILE95_VERSION,
  MATCHRIM_PROFILE95_TRAINING_COLUMNS, type MatchrimProfile95 } from "../_shared/matchrim-profile95.ts";
import { runMatchrimAi } from "../_shared/matchrim-ai-provider.ts";
import { hasMatchrimOpenAiKey } from "../_shared/matchrim-openai.ts";
import { parseStructuredObject, structuredResponseError, STRUCTURED_RESPONSE_ERROR_STATUS,
  type StructuredResponseError } from "../_shared/structured-response.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_VERSION = 'scan-food-pairing-2026-10-17-profile95-v10';

// Observed error/signal only; this does not establish an upstream root cause.
const classifyNativeFoodProviderFailure96 = (error: unknown, signal: AbortSignal) => {
  const namedError = error instanceof Error || error instanceof DOMException;
  if (namedError && error.name === 'TimeoutError') return 'timeout_error';
  if (namedError && error.name === 'AbortError' && signal.aborted) return 'client_abort';
  return 'provider_unavailable';
};

// This selects unprivileged caller-supplied preferences, never a user or a server
// profile. Decoded public-key fields are NOT verified authentication claims.
const isPublicPreferencePresentation95 = (authorization: string, apiKey: string | null, supabaseUrl: string): boolean => {
  const bearer = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
  if (!bearer || !apiKey || bearer[1] !== apiKey.trim()) return false;
  const token = bearer[1];
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(token)) return true;
  if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return false;
  try {
    const decode = (part: string): Record<string, unknown> | null => {
      const bytes = Uint8Array.from(atob(part.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
      const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
    };
    const [header, claims] = token.split('.').slice(0, 2).map(decode);
    if (!header || header.alg !== 'HS256' || !claims || claims.role !== 'anon'
      || ['sub', 'user_id', 'session_id'].some(key => key in claims)) return false;
    const expectedRef = new URL(supabaseUrl).hostname.split('.')[0];
    const now = Date.now() / 1000;
    return Boolean(expectedRef && claims.ref === expectedRef
      && typeof claims.exp === 'number' && Number.isFinite(claims.exp) && claims.exp > now
      && (claims.nbf === undefined || (typeof claims.nbf === 'number' && Number.isFinite(claims.nbf) && claims.nbf <= now)));
  } catch {
    return false;
  }
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
    const { image, mode, restaurantName, matchrimProfile, matchrimLearningModel, scan_region: rawScanRegion } = body as Record<string, unknown>;
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

    const checkCancelled = () => { if (req.signal.aborted) throw new DOMException('Cancelled', 'AbortError'); };
    let learnedProfile: MatchrimProfile95 | null = null;
    let profileSource: 'auth' | 'client' | 'none' = 'none';
    let profileStatus: 'base' | 'learned' | 'client' | 'none' | 'missing' | 'invalid' | 'unavailable' | 'training-unavailable' = 'none';
    let profileSamples: number | null = null;
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const anonymous = !authHeader || token === Deno.env.get('SUPABASE_ANON_KEY')
      || isPublicPreferencePresentation95(authHeader, req.headers.get('apikey'), Deno.env.get('SUPABASE_URL') ?? '');
    checkCancelled();
    if (!anonymous) {
      try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        checkCancelled();
        if (!authError && user) {
          const { data: prof, error: baseError } = await supabaseClient
            .from("quiz_results")
            .select("potente, acidez, dulce, tanico, afrutado")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .abortSignal(req.signal)
            .maybeSingle();
          checkCancelled();
          learnedProfile = baseError ? null : readMatchrimProfile95(prof);
          profileStatus = baseError ? 'unavailable' : !prof ? 'missing' : !learnedProfile ? 'invalid' : 'base';
          if (learnedProfile) {
            profileSource = 'auth';
            try {
              const { data: rows, error: trainingError } = await supabaseClient.from('user_wines')
                .select(MATCHRIM_PROFILE95_TRAINING_COLUMNS).eq('user_id', user.id)
                .eq('use_for_profile_training', true).not('rating', 'is', null)
                .not('sensory_attributes', 'is', null).abortSignal(req.signal);
              checkCancelled();
              if (trainingError || !Array.isArray(rows)) {
                profileStatus = 'training-unavailable';
              } else {
                const learned = calculateLearnedMatchrimProfile95(learnedProfile, rows, readMatchrimLearningOptions96(matchrimLearningModel));
                learnedProfile = learned.profile;
                profileSamples = learned.samples;
                profileStatus = learned.samples > 0 ? 'learned' : 'base';
              }
            } catch {
              checkCancelled();
              profileStatus = 'training-unavailable';
            }
          }
        } else {
          profileStatus = 'unavailable';
        }
      } catch {
        checkCancelled();
        learnedProfile = null; profileSource = 'none'; profileStatus = 'unavailable';
      }
    } else {
      learnedProfile = readMatchrimProfile95(matchrimProfile);
      profileSource = learnedProfile ? 'client' : 'none';
      profileStatus = learnedProfile ? 'client' : 'none';
      profileSamples = learnedProfile ? 0 : null;
    }
    checkCancelled();
    const profileText = learnedProfile
      ? `Perfil Matchrim del usuario (escala 0-5): potencia=${learnedProfile.potente}, acidez=${learnedProfile.acidez}, dulzura=${learnedProfile.dulce}, taninos=${learnedProfile.tanico}, afrutado=${learnedProfile.afrutado}.${profileStatus === 'training-unavailable' ? ' Solo test base; valoraciones no disponibles.' : ''}`
      : "No hay un perfil Matchrim verificable disponible. Usa orientacion general, sin preferencias personales.";

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
      if (readMatchrimLearningOptions96(matchrimLearningModel).evidenceStrength === 'native-v2') {
        console.error("Food AI provider failure", {
          version: FUNCTION_VERSION, failure: classifyNativeFoodProviderFailure96(error, req.signal),
        });
      } else {
        console.error("Food AI provider unavailable");
      }
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
        dishes: normalized.dishes.map(dish => ({
          ...dish,
          recomendaciones: dish.recomendaciones.map(recommendation => ({ ...recommendation, atributos: null })),
        })),
        coverage: normalized.coverage,
        has_profile: Boolean(learnedProfile),
        profile_source: profileSource,
        profile_context: { version: MATCHRIM_PROFILE95_VERSION, source: profileSource, status: profileStatus, samples: profileSamples },
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
