import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { MAX_MENU_DISHES, normalizeFoodScan } from "./contract.ts";
import { calculateEdgeLearnedProfile, type MatchrimTrainingRow } from "../_shared/matchrim-learning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_VERSION = 'scan-food-pairing-2026-09-29-complete-menu-candidate-v2';

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

const tryParseJson = (txt: string): unknown => {
  try {
    return JSON.parse(txt);
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* ignore */ }
    }
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { image, mode, restaurantName, matchrimProfile } = body ?? {};
    if (!image || !image.startsWith("data:")) throw new Error("image debe ser data URL");
    if (mode !== "menu" && mode !== "dish") throw new Error("mode debe ser 'menu' o 'dish'");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const maxDishes = mode === "menu" ? MAX_MENU_DISHES : 1;
    const restaurantHint = restaurantName ? `Restaurante: ${restaurantName}.` : "";

    const prompt = `Eres un sumiller experto. Analiza esta imagen de ${mode === "menu" ? "un menú de comida (lista de platos)" : "un plato de comida"}.
${restaurantHint}
${profileText}

Responde EXCLUSIVAMENTE en JSON válido con esta forma:
{
  "summary": "resumen breve de lo detectado",
  "coverage": {
    "estimated_visible_dishes": 0,
    "unreadable_dishes": 0,
    "truncated": false,
    "notes": []
  },
  "dishes": [
    {
      "nombre": "...",
      "categoria": "entrante|principal|postre|...",
      "source_order": 1,
      "source_text": "texto exacto leído en la carta",
      "confidence": 0-100,
      "match": 0-100,
      "razon": "por qué este plato encaja con el usuario",
      "recomendaciones": [
        { "nombre": "vino", "tipo": "Tinto|Blanco|...", "uvas": ["..."], "match": 0-100, "razon": "...", "atributos": { "potencia": 1-5, "acidez": 1-5, "dulzura": 1-5, "taninos": 1-5, "afrutado": 1-5 } }
      ]
    }
  ]
}

REGLAS ESTRICTAS:
- Atributos sensoriales SIEMPRE enteros del 1 al 5 (NUNCA 6,7,8,9,10).
- match es 0-100.
- ${mode === "menu"
    ? `Cuenta primero todas las líneas de platos legibles y devuelve una fila por cada plato, en el orden y sección originales, hasta un máximo técnico de ${maxDishes}.`
    : "Devuelve exactamente el plato visible cuando sea legible."}
- NUNCA agrupes varios platos o postres en una misma fila. No uses barras, listas ni nombres compuestos para ahorrar espacio.
- No inventes texto ilegible. Indica confidence bajo, aumenta unreadable_dishes y explica la duda en coverage.notes.
- Marca coverage.truncated=true cuando estimated_visible_dishes sea mayor que el número de filas devueltas.
- 2 recomendaciones de vino por plato.
- No incluyas texto fuera del JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 16384,
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errTxt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content ?? "";
    const parsed = tryParseJson(typeof content === "string" ? content : JSON.stringify(content)) as
      | { summary?: string; coverage?: unknown; dishes?: unknown[] }
      | null;

    const normalized = normalizeFoodScan(
      Array.isArray(parsed?.dishes) ? parsed!.dishes! : [],
      parsed?.coverage,
      mode,
    );

    return new Response(
      JSON.stringify({
        mode,
        summary: parsed?.summary ? String(parsed.summary) : "",
        dishes: normalized.dishes,
        coverage: normalized.coverage,
        has_profile: Boolean(learnedProfile),
        profile_source: profileSource,
        scan_version: FUNCTION_VERSION,
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
