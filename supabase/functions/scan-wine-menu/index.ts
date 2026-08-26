import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type MatchrimProfile = {
  potente: number;
  acidez: number;
  dulce: number;
  tanico: number;
  afrutado: number;
};
type Rating = 'love' | 'ok' | 'not_for_me' | null;
type SensoryAttributes = Partial<Record<'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado', number>>;
type RatedWine = {
  rating: Rating;
  sensory_attributes: Record<string, unknown> | null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const FUNCTION_VERSION = 'scan-wine-menu-2026-08-26-grounded-v3';

const normalizeText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const normalizeStringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 12)
  : [];
const nonWinePattern = /\b(vermut|vermouth|cerveza|beer|bier|sidra|cider|whisky|whiskey|ginebra|gin|vodka|ron|rum|cocktail|coctel|licor|destilado|destilados|spirits?)\b/i;
const wineTypePattern = /\b(tinto|blanco|rosado|espumoso|generoso|dulce|fortificado|orange|natural|champagne|cava|sherry|jerez)\b/i;

const isWineRecord = (wine: Record<string, unknown>) => {
  const name = normalizeText(wine.nombre ?? wine.name);
  if (!name || nonWinePattern.test(`${name} ${normalizeText(wine.tipo)}`)) return false;
  const section = normalizeText(wine.seccion);
  return !nonWinePattern.test(section) || wineTypePattern.test(normalizeText(wine.tipo));
};

// Sensory attrs always 1-5 integers. Normalize legacy 0-10 or 0-100 inputs.
const normalizeSensoryValueTo5 = (value: unknown): number | null => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  let v = numeric;
  if (v > 10) v = v / 20;
  else if (v > 5) v = v / 2;
  return clamp(Math.round(v), 1, 5);
};

const normalizeSensoryAttributes = (
  attrs: Record<string, unknown> | null | undefined
): SensoryAttributes | null => {
  if (!attrs || typeof attrs !== 'object') return null;
  const keys = ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const;
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

const ratingWeight = (rating: string | null) => {
  if (rating === 'love') return 1;
  if (rating === 'ok') return 0.25;
  if (rating === 'not_for_me') return -0.8;
  return 0;
};

const buildLearnedProfile = async (
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  baseProfile: MatchrimProfile
): Promise<MatchrimProfile> => {
  const { data: ratedWines, error } = await supabaseClient
    .from('user_wines')
    .select('rating, sensory_attributes')
    .eq('user_id', userId)
    .not('rating', 'is', null)
    .not('sensory_attributes', 'is', null)
    .limit(30);

  if (error || !ratedWines?.length) {
    if (error) console.error('Error loading rated wines for learned profile:', error);
    return baseProfile;
  }

  const deltas = { potente: 0, acidez: 0, dulce: 0, tanico: 0, afrutado: 0 };
  let totalWeight = 0;
  let samples = 0;

  (ratedWines as RatedWine[]).forEach((wine) => {
    const weight = ratingWeight(wine.rating);
    const attrs = normalizeSensoryAttributes(wine.sensory_attributes);
    if (!weight || !attrs) return;
    if (
      attrs.potencia == null || attrs.acidez == null ||
      attrs.dulzura == null || attrs.taninos == null || attrs.afrutado == null
    ) return;

    deltas.potente += (attrs.potencia - baseProfile.potente) * weight;
    deltas.acidez += (attrs.acidez - baseProfile.acidez) * weight;
    deltas.dulce += (attrs.dulzura - baseProfile.dulce) * weight;
    deltas.tanico += (attrs.taninos - baseProfile.tanico) * weight;
    deltas.afrutado += (attrs.afrutado - baseProfile.afrutado) * weight;
    totalWeight += Math.abs(weight);
    samples += 1;
  });

  if (!samples || totalWeight === 0) return baseProfile;

  const blend = Math.min(0.75, 0.25 + samples * 0.05);
  return {
    potente: clamp(Math.round((baseProfile.potente + (deltas.potente / totalWeight) * blend) * 10) / 10, 0, 5),
    acidez: clamp(Math.round((baseProfile.acidez + (deltas.acidez / totalWeight) * blend) * 10) / 10, 0, 5),
    dulce: clamp(Math.round((baseProfile.dulce + (deltas.dulce / totalWeight) * blend) * 10) / 10, 0, 5),
    tanico: clamp(Math.round((baseProfile.tanico + (deltas.tanico / totalWeight) * blend) * 10) / 10, 0, 5),
    afrutado: clamp(Math.round((baseProfile.afrutado + (deltas.afrutado / totalWeight) * blend) * 10) / 10, 0, 5),
  };
};

const calculateCompatibilityScale5 = (profile: MatchrimProfile, attrs: SensoryAttributes) => {
  const distance = Math.sqrt(
    Math.pow(profile.potente - (attrs.potencia ?? 3), 2) +
    Math.pow(profile.acidez - (attrs.acidez ?? 3), 2) +
    Math.pow(profile.dulce - (attrs.dulzura ?? 3), 2) +
    Math.pow(profile.tanico - (attrs.taninos ?? 3), 2) +
    Math.pow(profile.afrutado - (attrs.afrutado ?? 3), 2)
  );
  const maxDistance = Math.sqrt(5 * Math.pow(4, 2));
  const rawScore = Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100));
  return Math.round(50 + (rawScore - 50) * 0.85);
};

const calibrateMenuIdentityConfidence = (
  rawValue: unknown,
  wine: Record<string, unknown>,
  position: { confidence: number } | null,
) => {
  const numeric = Number(rawValue);
  if (!Number.isFinite(numeric)) return null;
  const raw = clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
  let cap = 0.88;
  if (typeof wine.texto_fuente !== 'string' || !wine.texto_fuente.trim()) cap = Math.min(cap, 0.82);
  if (!position) cap = Math.min(cap, 0.78);
  if (typeof wine.productor !== 'string' || !wine.productor.trim()) cap = Math.min(cap, 0.74);
  const hasRegion = typeof wine.region === 'string' && Boolean(wine.region.trim());
  const hasPrice = Number.isFinite(Number(wine.precio));
  if (!hasRegion && !hasPrice) cap = Math.min(cap, 0.68);
  return Math.round(Math.min(raw, cap) * 100) / 100;
};

const normalizePosicion = (raw: unknown): { x: number; y: number; width: number; height: number; confidence: number } | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const x = Number(r.x);
  const y = Number(r.y);
  const confidence = Number(r.confidence);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(confidence)) return null;
  if (x < 0 || x > 100 || y < 0 || y > 100) return null;
  if (confidence < 0.7) return null;
  const width = Number.isFinite(Number(r.width)) ? clamp(Number(r.width), 0, 100) : 0;
  const height = Number.isFinite(Number(r.height)) ? clamp(Number(r.height), 0, 100) : 0;
  return {
    x: clamp(x, 0, 100),
    y: clamp(y, 0, 100),
    width,
    height,
    confidence: clamp(confidence, 0, 1),
  };
};

const normalizeClientProfile = (raw: unknown): MatchrimProfile | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const keys: (keyof MatchrimProfile)[] = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
  const out: Partial<MatchrimProfile> = {};
  for (const k of keys) {
    const v = normalizeSensoryValueTo5(r[k]);
    if (v == null) return null;
    out[k] = v;
  }
  return out as MatchrimProfile;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image, pdf, matchrimProfile } = body ?? {};

    if (!image && !pdf) {
      throw new Error('No image or PDF provided');
    }

    const dataUrl = pdf || image;
    if (!dataUrl.startsWith('data:')) {
      throw new Error('Invalid image/PDF format. Must be a data URL.');
    }

    console.log('Processing file type:', pdf ? 'PDF' : 'Image');

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    let userId: string | null = null;
    let authProfile: MatchrimProfile | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer', '').trim();
        const { data: { user } } = await supabaseClient.auth.getUser(token);
        if (user) {
          userId = user.id;
          const { data: prof } = await supabaseClient
            .from('quiz_results')
            .select('potente, acidez, dulce, tanico, afrutado')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (prof) authProfile = prof as MatchrimProfile;
        }
      } catch (e) {
        console.log('Anonymous request (no valid auth user):', (e as Error).message);
      }
    }

    const clientProfile = normalizeClientProfile(matchrimProfile);
    const profile: MatchrimProfile | null = authProfile ?? clientProfile;
    const profileSource: 'auth' | 'client' | 'none' = authProfile ? 'auth' : clientProfile ? 'client' : 'none';


    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    let prompt = `Analiza esta carta de vinos o pizarra y extrae un MÁXIMO de 30 vinos conservando su estructura visual.

IMPORTANTE:
- No mezcles texto ni precios de columnas distintas.
- Respeta secciones, orden de lectura y si el precio es por copa, botella o para llevar.
- Si una linea no se puede asociar con seguridad, baja confidence o no la incluyas.
- confidence mide solo la asociacion visual entre los campos de esa linea. No subas confidence por conocer el vino.
- Usa confidence > 0.90 solo si nombre, productor y precio son inequivocos y visibles en la misma linea.
- Endereza mentalmente la perspectiva, pero devuelve las posiciones respecto a la imagen original.
- Incluye TODAS las lineas de vino completas y legibles, hasta 30. Haz una segunda pasada por cada seccion y por el borde inferior antes de responder. Si hay mas de 30, prioriza lineas completas y legibles, no supuesta importancia.
- Excluye cerveza, vermut/vermouth, sidra, destilados, cocteles, encabezados y cualquier producto que no sea vino. Espumosos, generosos y vinos dulces si cuentan como vino.
- No completes productor, region, pais, uvas o anada por conocimiento general sin declararlo en campos_inferidos. Si no puede leerse ni inferirse con suficiente base, usa null.

Para cada vino proporciona:
- nombre: Nombre del vino
- productor: Bodega/productor
- anada: Año (solo número, null si no está)
- region: Región vinícola
- pais: País
- precio: Precio (solo número)
- precios: objeto { "copa": number|null, "botella": number|null, "llevar": number|null }
- servicio: "copa", "botella", "ambos" o null
- seccion: encabezado visible al que pertenece el vino
- confidence: confianza 0-1 en que nombre, productor y precio pertenecen a la misma linea
- texto_fuente: transcripcion literal breve de la linea que sustenta el resultado
- dudas: array de campos o asociaciones que no se leen con seguridad
- campos_inferidos: array de campos no leidos literalmente en la imagen
- tipo: tinto, blanco, rosado, espumoso, generoso o dulce
- uvas: Array con variedades principales
- descripcion: Breve descripción (máximo 150 palabras) con aromas y notas de cata
- posicion: opcional. Objeto { "x": number 0-100, "y": number 0-100, "width": number 0-100, "height": number 0-100, "confidence": number 0-1 } donde (x,y) es el punto de anclaje EXACTO justo al lado del nombre del vino dentro de la imagen, expresado como porcentaje del ancho/alto de la imagen. width/height describen el bounding box del bloque del vino. confidence es tu certeza de que la posición es exacta. Si NO puedes ver el bloque con claridad o tu confidence sería < 0.7, devuelve posicion: null. NUNCA inventes columnas, posiciones aproximadas ni distribuyas vinos uniformemente.`;

    const learnedProfile = profile
      ? (userId ? await buildLearnedProfile(supabaseClient, userId, profile) : profile)
      : null;


    if (learnedProfile) {
      prompt += `

ADEMÁS, calcula la compatibilidad de cada vino con este perfil de usuario (escala ENTERA 1-5, NO uses valores mayores que 5):
- Potencia: ${Math.round(learnedProfile.potente)}
- Acidez: ${Math.round(learnedProfile.acidez)}
- Dulzura: ${Math.round(learnedProfile.dulce)}
- Taninos: ${Math.round(learnedProfile.tanico)}
- Afrutado: ${Math.round(learnedProfile.afrutado)}

Para cada vino, estima también:
- atributos: objeto con potencia, acidez, dulzura, taninos, afrutado (enteros 1-5, NUNCA 0 ni >5)
- compatibilidad: porcentaje 0-100 de compatibilidad con el perfil del usuario
- razon: explicación breve de la compatibilidad`;
    }

    prompt += `

RECUERDA: Maximo 30 vinos. Responde SOLO con JSON válido sin markdown:
{
  "vinos": [
    {
      "nombre": "Viña Pomal Reserva",
      "productor": "Bodegas Bilbaínas",
      "anada": 2018,
      "region": "Rioja",
      "pais": "España",
      "precio": 24.50,
      "precios": { "copa": 4.50, "botella": 24.50, "llevar": null },
      "servicio": "ambos",
      "seccion": "Tintos",
      "confidence": 0.91,
      "texto_fuente": "Viña Pomal Reserva 2018 · Bodegas Bilbaínas · 24,50",
      "dudas": [],
      "campos_inferidos": ["uvas"],
      "tipo": "tinto",
      "uvas": ["Tempranillo", "Garnacha"],
      "descripcion": "Breve descripción con aromas y notas",
      "posicion": { "x": 42, "y": 17, "width": 50, "height": 6, "confidence": 0.85 }${profile ? `,
      "atributos": {
        "potencia": 4,
        "acidez": 3,
        "dulzura": 1,
        "taninos": 4,
        "afrutado": 3
      },
      "compatibilidad": 85,
      "razon": "Breve explicación"` : ''}
    }
  ],
  "coverage": {
    "status": "reported_complete|partial|unknown",
    "estimated_visible_wines": 1,
    "notes": []
  }
}`;

    const imageUrl = image;
    if (pdf) {
      throw new Error('Por favor, convierte el PDF a imagen (captura de pantalla) antes de subirlo.');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ]
          }
        ],
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      if (response.status === 429) throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
      if (response.status === 402) throw new Error('Créditos agotados. Añade créditos en Settings.');
      throw new Error('Error al procesar la imagen.');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{"vinos":[]}';

    content = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/g, '')
      .replace(/[^}]*$/g, '')
      .trim();

    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      content = content.substring(firstBrace, lastBrace + 1);
    }

    let result: { vinos?: unknown; wines?: unknown; coverage?: unknown };
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      try {
        let fixedContent = content;
        if (content.length < 100) {
          throw new Error('Respuesta de IA muy corta. Intenta con una sección más pequeña de la carta.');
        }
        const vinosMatch = content.match(/"vinos"\s*:\s*\[/);
        if (!vinosMatch) throw new Error('No se encontró la lista de vinos en la respuesta.');
        const vinosStart = vinosMatch.index! + vinosMatch[0].length;
        let bracketCount = 0;
        let braceCount = 0;
        let lastCompleteObject = vinosStart;
        let inString = false;
        let escapeNext = false;
        for (let i = vinosStart; i < content.length; i++) {
          const char = content[i];
          if (char === '"' && !escapeNext) inString = !inString;
          escapeNext = char === '\\' && !escapeNext;
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0 && bracketCount === 0) lastCompleteObject = i + 1;
            }
            if (char === '[') bracketCount++;
            if (char === ']') bracketCount--;
          }
        }
        fixedContent = content.substring(0, lastCompleteObject).trim();
        if (!fixedContent.endsWith(']')) fixedContent += '\n  ]\n}';
        else if (!fixedContent.endsWith('}')) fixedContent += '\n}';
        result = JSON.parse(fixedContent);
      } catch (fixError) {
        console.error('JSON repair failed:', fixError);
        throw new Error('La carta es muy extensa. Por favor fotografía solo una sección con menos vinos.');
      }
    }

    const rawVinos = Array.isArray(result.vinos)
      ? result.vinos
      : Array.isArray(result.wines)
        ? result.wines
        : [];

    const vinos = (rawVinos as Array<Record<string, unknown>>).filter(isWineRecord).map((w) => {
      const out: Record<string, unknown> = { ...w };
      const atributos = normalizeSensoryAttributes(w.atributos as Record<string, unknown> | null | undefined);
      out.atributos = atributos;

      // Recalculate compatibilidad server-side when we have a profile + attrs to keep AI honest.
      if (learnedProfile && atributos &&
        atributos.potencia != null && atributos.acidez != null &&
        atributos.dulzura != null && atributos.taninos != null && atributos.afrutado != null) {
        out.compatibilidad = calculateCompatibilityScale5(learnedProfile, atributos);
      } else if (typeof w.compatibilidad === 'number') {
        out.compatibilidad = clamp(Math.round(w.compatibilidad), 0, 100);
      } else {
        out.compatibilidad = null;
      }

      const position = normalizePosicion(w.posicion);
      out.posicion = position;
      out.confidence = calibrateMenuIdentityConfidence(w.confidence, w, position);
      out.nombre = normalizeText(w.nombre ?? w.name);
      out.productor = normalizeText(w.productor) || null;
      out.region = normalizeText(w.region) || null;
      out.pais = normalizeText(w.pais) || null;
      out.texto_fuente = normalizeText(w.texto_fuente) || null;
      out.dudas = normalizeStringArray(w.dudas);
      out.campos_inferidos = normalizeStringArray(w.campos_inferidos);
      out.servicio = w.servicio === 'copa' || w.servicio === 'botella' || w.servicio === 'ambos' ? w.servicio : null;
      out.seccion = typeof w.seccion === 'string' ? w.seccion.trim() || null : null;
      if (w.precios && typeof w.precios === 'object' && !Array.isArray(w.precios)) {
        const rawPrices = w.precios as Record<string, unknown>;
        const normalizePrice = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
        out.precios = {
          copa: normalizePrice(rawPrices.copa),
          botella: normalizePrice(rawPrices.botella),
          llevar: normalizePrice(rawPrices.llevar),
        };
      } else {
        out.precios = null;
      }
      return out;
    });

    const rawCoverage = result.coverage && typeof result.coverage === 'object' && !Array.isArray(result.coverage)
      ? result.coverage as Record<string, unknown>
      : {};
    const estimatedVisibleWines = Number(rawCoverage.estimated_visible_wines);
    let coverageStatus = rawCoverage.status === 'reported_complete' || rawCoverage.status === 'partial'
      ? rawCoverage.status
      : 'unknown';
    if (Number.isFinite(estimatedVisibleWines) && estimatedVisibleWines > vinos.length) coverageStatus = 'partial';
    const coverage = {
      status: coverageStatus,
      extracted_wines: vinos.length,
      estimated_visible_wines: Number.isFinite(estimatedVisibleWines) && estimatedVisibleWines >= vinos.length
        ? Math.round(estimatedVisibleWines)
        : null,
      notes: normalizeStringArray(rawCoverage.notes).slice(0, 5),
    };

    console.log(`Extracted ${vinos.length} wines from menu (${coverage.status})`);

    return new Response(JSON.stringify({
      vinos,
      has_profile: Boolean(profile),
      profile_source: profileSource,
      coverage,
      scan_version: FUNCTION_VERSION,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in scan-wine-menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage, vinos: [], scan_version: FUNCTION_VERSION }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
