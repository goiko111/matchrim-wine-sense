import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_VERSION = "analyze-shop-link-2026-07-09-v3";

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

const sanitizeAttributes = (raw: unknown) => {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const k of ["potencia", "acidez", "dulzura", "taninos", "afrutado"]) {
    const v = normalizeSensoryValueTo5((raw as Record<string, unknown>)[k]);
    if (v != null) out[k] = v;
  }
  return out;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const intent = typeof body?.intent === "string" ? body.intent.trim() : "";
    const budget = typeof body?.budget === "string" ? body.budget.trim() : "";
    const matchrimProfile = body?.matchrimProfile;

    if (!url && !intent) {
      return new Response(
        JSON.stringify({ error: "Escribe que vino buscas o pega un enlace opcional." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    let authProfile: MatchrimProfile | null = null;
    let recentWines: Array<Record<string, unknown>> = [];
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer", "").trim();
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (user) {
          const { data: prof } = await supabaseClient
            .from("quiz_results")
            .select("potente, acidez, dulce, tanico, afrutado")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (prof) authProfile = prof as MatchrimProfile;
          const { data: wines } = await supabaseClient
            .from("user_wines")
            .select("name, producer, region, rating")
            .eq("user_id", user.id)
            .not("rating", "is", null)
            .limit(10);
          if (wines) recentWines = wines;
        }
      } catch (e) {
        console.log("Anonymous request:", (e as Error).message);
      }
    }

    const clientProfile = normalizeClientProfile(matchrimProfile);
    const profile: MatchrimProfile | null = authProfile ?? clientProfile;
    const profileSource: "auth" | "client" | "none" = authProfile ? "auth" : clientProfile ? "client" : "none";

    const profileText = profile
      ? `Perfil Matchrim del usuario (escala 1-5): potencia=${profile.potente}, acidez=${profile.acidez}, dulzura=${profile.dulce}, taninos=${profile.tanico}, afrutado=${profile.afrutado}.`
      : "El usuario no tiene perfil Matchrim; recomienda estilo genérico accesible.";

    const historyText = recentWines.length
      ? `Historial reciente del usuario: ${recentWines.map((w) => `${w.name}${w.producer ? " ("+w.producer+")" : ""} [${w.rating}]`).join("; ")}.`
      : "";

    const intentText = intent ? `Petición del usuario: "${intent}".` : "El usuario no escribió petición.";
    const budgetText = budget ? `Presupuesto: ${budget}.` : "";

    const contextBlock = url
      ? `El usuario ha compartido este enlace de tienda o búsqueda para dar contexto: ${url}. No abras la URL; úsala solo como pista sobre dónde compraría.`
      : "No hay enlace. Responde como asesor personal usando solo la peticion, el perfil Matchrim, presupuesto e historial del usuario.";

    const prompt = `Eres Matchrim, un asesor de vinos personal. NO vendes vino: ayudas a decidir qué botella buscar.

${contextBlock}
${intentText}
${budgetText}
${profileText}
${historyText}

Devuelve EXCLUSIVAMENTE JSON válido con esta forma:
{
  "summary": "1-2 frases sobre qué buscarías para este usuario",
  "recomendaciones": [
    {
      "nombre": "nombre del vino o descripción del estilo a buscar",
      "tipo": "Tinto|Blanco|Espumoso|Rosado|Dulce|Fortificado",
      "region": "región/DO sugerida",
      "uvas": ["..."],
      "precio_estimado": "rango aproximado en €",
      "razon": "por qué encaja con el usuario",
      "atributos": { "potencia": 1-5, "acidez": 1-5, "dulzura": 1-5, "taninos": 1-5, "afrutado": 1-5 }
    }
  ],
  "consejo": "una recomendación práctica de compra"
}

REGLAS ESTRICTAS:
- Atributos sensoriales SIEMPRE enteros del 1 al 5 (nunca 0, nunca >5, nunca decimales).
- Máximo 3 recomendaciones.
- No incluyas texto fuera del JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
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
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");
    let parsed: Record<string, unknown> = {};
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(content.slice(jsonStart, jsonEnd + 1));
      } catch (e) {
        console.error("JSON parse error:", (e as Error).message, content);
      }
    }

    const recomendaciones = Array.isArray(parsed.recomendaciones)
      ? (parsed.recomendaciones as Array<Record<string, unknown>>).slice(0, 3).map((r) => ({
          nombre: String(r.nombre ?? ""),
          tipo: r.tipo ? String(r.tipo) : null,
          region: r.region ? String(r.region) : null,
          uvas: Array.isArray(r.uvas) ? r.uvas.map(String) : [],
          precio_estimado: r.precio_estimado ? String(r.precio_estimado) : null,
          razon: r.razon ? String(r.razon) : "",
          atributos: sanitizeAttributes(r.atributos),
        }))
      : [];

    return new Response(
      JSON.stringify({
        version: FUNCTION_VERSION,
        profile_source: profileSource,
        has_url: Boolean(url),
        summary: parsed.summary ? String(parsed.summary) : "",
        consejo: parsed.consejo ? String(parsed.consejo) : "",
        recomendaciones,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("analyze-shop-link error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message ?? "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
