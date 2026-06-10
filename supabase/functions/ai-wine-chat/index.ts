import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AiRimFunctionType =
  | "wine-for-dish"
  | "dish-for-wine"
  | "pairing-check"
  | "special-moments";

interface AiRimPayload {
  functionType?: AiRimFunctionType;
  input1?: string;
  input2?: string | null;
  context?: string;
  eventDetails?: Record<string, string | null>;
  message?: string;
}

interface QuizResult {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
  profile_description?: string | null;
}

const systemPrompt = `Eres aiRIM, el motor de IA de Winerim especializado en vinos y maridajes.
Hablas siempre en primera persona: "Te recomiendo", "He seleccionado para ti", "En mi experiencia".
Nunca te refieras a ti mismo en tercera persona como "un sommelier" o "tu colega sommelier".
Responde siempre en español, con tono amigable, educativo y profesional.
Evita latinismos como "platillo"; usa "plato".`;

const buildProfileBlock = (profile: QuizResult | null) => {
  if (!profile) {
    return `\n[Perfil Matchrim no disponible]: da recomendaciones generales y, al final, invita de forma breve a completar el quiz Matchrim para personalizar mejor.\n`;
  }

  const description = profile.profile_description
    ? `\nDescripción del perfil: ${profile.profile_description}`
    : "";

  return `
Mi perfil sensorial Matchrim (escala 0-5):
- Potencia: ${profile.potente}/5
- Acidez: ${profile.acidez}/5
- Dulzura: ${profile.dulce}/5
- Taninos: ${profile.tanico}/5
- Afrutado: ${profile.afrutado}/5${description}

Pondera tus recomendaciones para que encajen con este perfil. Si propones algo fuera del perfil,
justifica por qué puede funcionar en este caso concreto.`;
};

const buildAiRimPrompt = (payload: AiRimPayload, profile: QuizResult | null) => {
  const profileBlock = buildProfileBlock(profile);
  const appContext = payload.context?.trim()
    ? `\nContexto adicional de Winerim:\n${payload.context.trim()}\n`
    : "";

  switch (payload.functionType) {
    case "wine-for-dish":
      return `Quiero vino para este plato: "${payload.input1}".
${profileBlock}
${appContext}

Debes dar EXACTAMENTE 3 vinos diferentes. Usa este formato exacto:

### 1. [Nombre del vino]

**Recomendación:** [Nombre completo del vino - Bodega]

- **Tipo:** [Tipo de vino]
- **Bodega:** [Nombre de la bodega]
- **Región:** [Región específica]
- **País:** [País de origen]
- **Precio aproximado:** [Rango de precio en euros]

**Por qué funciona para ti:** [Explicación de 3-4 líneas sobre el maridaje y el encaje con el perfil Matchrim]

### 2. [Nombre del vino]
[Mismo formato]

### 3. [Nombre del vino]
[Mismo formato]`;

    case "dish-for-wine":
      return `Tengo este vino: "${payload.input1}".
${profileBlock}
${appContext}

Debes dar EXACTAMENTE 3 platos diferentes. Usa este formato exacto:

### 1. [Nombre del plato]

**Recomendación:** [Nombre completo del plato con breve descripción]

- **Tipo de cocina:** [Tipo de cocina]
- **Ingredientes principales:** [Ingredientes clave]
- **Técnica de cocción:** [Cómo se prepara]
- **Ocasión ideal:** [Cuándo servir este plato]
- **Dificultad:** [Fácil, Media, Alta]

**Por qué funciona:** [Explicación detallada de 3-4 líneas]

### 2. [Nombre del plato]
[Mismo formato]

### 3. [Nombre del plato]
[Mismo formato]`;

    case "pairing-check":
      return `Evalúa este maridaje: "${payload.input1}" con "${payload.input2 ?? ""}".
${profileBlock}
${appContext}

Usa este formato exacto:

**Puntuación del maridaje:** [Número del 1-10]/10

**Evaluación general:** [Frase corta sobre si es excelente, bueno o mejorable]

**¿Por qué funciona (o no)?**

[Explicación de 4-5 líneas: sabores, taninos/acidez, intensidades, texturas y encaje con el perfil]

**Aspectos positivos:**

- [Punto positivo 1]
- [Punto positivo 2]
- [Punto positivo 3]

**Aspectos a considerar:**

- [Aspecto 1]
- [Aspecto 2]

**Consejos para mejorar la experiencia:**

- **Temperatura:** [Temperatura ideal]
- **Preparación:** [Sugerencias]
- **Acompañamientos:** [Guarniciones o complementos]

**Alternativas si no es ideal:**

[Si la puntuación es menor a 7, sugiere 2-3 vinos alternativos]`;

    case "special-moments": {
      const details = payload.eventDetails ?? {};
      return `Quiero vino para: "${payload.input1}".
${profileBlock}
${appContext}

Detalles del evento:
- Número de personas: ${details.people ?? "No indicado"}
- Tipo de comida: ${details.food ?? "No indicado"}
- Nivel de conocimiento de los invitados: ${details.guestLevel ?? "No indicado"}
- Enfoque deseado: ${details.approach ?? "No indicado"}
- Presupuesto por botella: ${details.budget ?? "No indicado"} (en euros si aplica)

Debes dar EXACTAMENTE 3 vinos diferentes usando este formato exacto:

### 1. [Nombre del vino]

**Recomendación:** [Nombre completo del vino - Bodega]

- **Tipo:** [Tipo de vino]
- **Bodega:** [Nombre de la bodega]
- **Región:** [Región específica]
- **País:** [País de origen]
- **Precio aproximado:** [Rango de precio en euros]

**Por qué funciona para esta ocasión:** [Explicación de 3-4 líneas]

### 2. [Nombre del vino]
[Mismo formato]

### 3. [Nombre del vino]
[Mismo formato]`;
    }

    default:
      throw new Error("functionType no soportado");
  }
};

const getSupabaseClient = (authHeader: string | null) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
  });

const getUserId = async (authHeader: string | null) => {
  if (!authHeader || !supabaseUrl || !supabaseAnonKey) return null;

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === supabaseAnonKey) return null;

  const supabaseClient = getSupabaseClient(authHeader);
  const { data, error } = await supabaseClient.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user.id;
};

const loadProfile = async (authHeader: string | null, userId: string | null) => {
  if (!userId) return null;

  const supabaseClient = getSupabaseClient(authHeader);
  const { data, error } = await supabaseClient
    .from("quiz_results")
    .select("potente, acidez, dulce, tanico, afrutado, profile_description")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error loading quiz profile:", error);
    return null;
  }

  return (data ?? null) as QuizResult | null;
};

const logAiRimQuery = (
  authHeader: string | null,
  userId: string | null,
  payload: AiRimPayload,
  hadProfile: boolean,
) => {
  if (!userId) return;

  const supabaseClient = getSupabaseClient(authHeader);
  supabaseClient
    .from("liquid_intelligence_queries")
    .insert({
      user_id: userId,
      function_type: payload.functionType,
      input1: payload.input1,
      input2: payload.input2 ?? null,
      context: payload.context ?? null,
      event_details: payload.eventDetails ?? null,
      had_profile: hadProfile,
      model: "google/gemini-2.5-pro",
    })
    .then(() => {})
    .catch((err) => console.error("Error logging aiRIM query:", err));
};

const callLovableGateway = async (messages: Array<{ role: string; content: string }>, stream: boolean) => {
  if (!lovableApiKey) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: stream ? "google/gemini-2.5-pro" : "google/gemini-2.5-flash",
      messages,
      stream,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return {
        handledError: true,
        response: new Response(
          JSON.stringify({
            error: "Límite de solicitudes excedido. Por favor, espera un momento e inténtalo de nuevo.",
            success: false,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        ),
      };
    }
    if (response.status === 402) {
      return {
        handledError: true,
        response: new Response(
          JSON.stringify({
            error: "Se requiere pago. Por favor, añade créditos a tu cuenta de Lovable.",
            success: false,
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        ),
      };
    }

    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  return { handledError: false, response };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as AiRimPayload;
    const authHeader = req.headers.get("Authorization");
    const userId = await getUserId(authHeader);
    const profile = await loadProfile(authHeader, userId);

    if (payload.functionType) {
      if (!payload.input1?.trim()) {
        return new Response(JSON.stringify({ error: "input1 es obligatorio" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const prompt = buildAiRimPrompt(payload, profile);
      const upstream = await callLovableGateway(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        true,
      );

      if (upstream.handledError) {
        return upstream.response;
      }

      logAiRimQuery(authHeader, userId, payload, !!profile);

      return new Response(upstream.response.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    if (!payload.message?.trim()) {
      return new Response(JSON.stringify({ error: "message o functionType son obligatorios", success: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const legacyContext = payload.context ? `\nContexto: ${payload.context}` : "";
    const response = await callLovableGateway(
      [
        { role: "system", content: `${systemPrompt}${legacyContext}` },
        { role: "user", content: payload.message },
      ],
      false,
    );

    if (response.handledError) {
      return response.response;
    }

    const data = await response.response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ success: true, response: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in ai-wine-chat function:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({
        error: message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
