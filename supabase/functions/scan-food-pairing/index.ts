import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_VERSION = 'scan-food-pairing-2026-06-30-client-profile-v1';

type MatchrimProfile = {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
};
type Rating = "love" | "ok" | "not_for_me" | null;
type SensoryAttributes = Partial<Record<"potencia" | "acidez" | "dulzura" | "taninos" | "afrutado", number>>;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const normalizeSensoryValueTo5 = (value: unknown): number | null => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  let v = n;
  if (v > 10) v = v / 20;
  else if (v > 5) v = v / 2;
  return clamp(Math.round(v), 1, 5);
};

const normalizeSensoryAttributes = (
  attrs: Record<string, unknown> | null | undefined,
): SensoryAttributes | null => {
  if (!attrs || typeof attrs !== "object") return null;
  const keys = ["potencia", "acidez", "dulzura", "taninos", "afrutado"] as const;
  const out: SensoryAttributes = {};
  let any = false;
  for (const k of keys) {
    const v = normalizeSensoryValueTo5((attrs as Record<string, unknown>)[k]);
    if (v !== null) {
      out[k] = v;
      any = true;
    }
  }
  return any ? out : null;
};

const ratingWeight = (rating: Rating) => {
  if (rating === "love") return 1;
  if (rating === "ok") return 0.25;
  if (rating === "not_for_me") return -0.8;
  return 0;
};

const buildLearnedProfile = async (
  // deno-lint-ignore no-explicit-any
  client: any,
  userId: string,
  baseProfile: MatchrimProfile,
): Promise<MatchrimProfile> => {
  const { data, error } = await client
    .from("user_wines")
    .select("rating, sensory_attributes, use_for_profile_training")
    .eq("user_id", userId)
    .eq("use_for_profile_training", true)
    .not("rating", "is", null)
    .not("sensory_attributes", "is", null)
    .limit(50);
  if (error || !data?.length) return baseProfile;

  const deltas = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  let totalWeight = 0;
  let samples = 0;

  // deno-lint-ignore no-explicit-any
  data.forEach((wine: any) => {
    const w = ratingWeight(wine.rating as Rating);
    const a = normalizeSensoryAttributes(wine.sensory_attributes);
    if (!w || !a) return;
    if (a.potencia == null || a.acidez == null || a.dulzura == null || a.taninos == null || a.afrutado == null) return;
    deltas.potente += (a.potencia - baseProfile.potente) * w;
    deltas.acidez += (a.acidez - baseProfile.acidez) * w;
    deltas.dulce += (a.dulzura - baseProfile.dulce) * w;
    deltas.tanico += (a.taninos - baseProfile.tanico) * w;
    deltas.afrutado += (a.afrutado - baseProfile.afrutado) * w;
    totalWeight += Math.abs(w);
    samples += 1;
  });

  if (!samples || !totalWeight) return baseProfile;
  const blend = Math.min(0.75, 0.25 + samples * 0.05);
  const r = (key: keyof MatchrimProfile) =>
    clamp(Math.round((baseProfile[key] + (deltas[key] / totalWeight) * blend) * 10) / 10, 0, 5);
  return { potente: r("potente"), acidez: r("acidez"), dulce: r("dulce"), tanico: r("tanico"), afrutado: r("afrutado") };
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

const clampMatch = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return clamp(Math.round(n), 0, 100);
};

const normalizeRecommendation = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nombre = String(r.nombre ?? "").trim();
  if (!nombre) return null;
  return {
    nombre,
    tipo: r.tipo ? String(r.tipo) : null,
    uvas: Array.isArray(r.uvas) ? r.uvas.map(String) : [],
    match: clampMatch(r.match),
    razon: r.razon ? String(r.razon) : "",
    atributos: normalizeSensoryAttributes(r.atributos as Record<string, unknown> | null) ?? null,
  };
};

const normalizeDish = (raw: unknown) => {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nombre = String(r.nombre ?? "").trim();
  if (!nombre) return null;
  const recs = Array.isArray(r.recomendaciones)
    ? r.recomendaciones.map(normalizeRecommendation).filter(Boolean).slice(0, 2)
    : [];
  return {
    nombre,
    categoria: r.categoria ? String(r.categoria) : null,
    match: clampMatch(r.match),
    razon: r.razon ? String(r.razon) : "",
    recomendaciones: recs,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, mode, restaurantName } = await req.json();
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

    let baseProfile: MatchrimProfile | null = null;
    let userId: string | null = null;
    if (authHeader) {
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
        if (prof) baseProfile = prof as MatchrimProfile;
      }
    }

    const learnedProfile = baseProfile && userId
      ? await buildLearnedProfile(supabaseClient, userId, baseProfile)
      : baseProfile;

    const profileText = learnedProfile
      ? `Perfil Matchrim del usuario (escala 1-5): potencia=${learnedProfile.potente}, acidez=${learnedProfile.acidez}, dulzura=${learnedProfile.dulce}, taninos=${learnedProfile.tanico}, afrutado=${learnedProfile.afrutado}.`
      : "El usuario no tiene perfil Matchrim. Usa recomendaciones de afinidad clásica.";

    const maxDishes = mode === "menu" ? 8 : 1;
    const restaurantHint = restaurantName ? `Restaurante: ${restaurantName}.` : "";

    const prompt = `Eres un sumiller experto. Analiza esta imagen de ${mode === "menu" ? "un menú de comida (lista de platos)" : "un plato de comida"}.
${restaurantHint}
${profileText}

Responde EXCLUSIVAMENTE en JSON válido con esta forma:
{
  "summary": "resumen breve de lo detectado",
  "dishes": [
    {
      "nombre": "...",
      "categoria": "entrante|principal|postre|...",
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
- Devuelve como mucho ${maxDishes} ${mode === "menu" ? "platos" : "plato"}.
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
      | { summary?: string; dishes?: unknown[] }
      | null;

    const dishes = Array.isArray(parsed?.dishes)
      ? parsed!.dishes!.map(normalizeDish).filter(Boolean).slice(0, maxDishes)
      : [];

    return new Response(
      JSON.stringify({
        mode,
        summary: parsed?.summary ? String(parsed.summary) : "",
        dishes,
        has_profile: Boolean(learnedProfile),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("scan-food-pairing error:", err);
    const message = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
