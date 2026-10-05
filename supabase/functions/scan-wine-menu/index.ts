import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { runMatchrimAi } from '../_shared/matchrim-ai-provider.ts';
import { calculateEdgeLearnedProfile, type MatchrimTrainingRow } from '../_shared/matchrim-learning.ts';
import { normalizeScanSensoryValue, optionalScanNumber } from '../_shared/matchrim-scan-values.ts';
import { hasGroundedMenuName } from '../_shared/matchrim-menu-grounding.ts';
import { normalizeScanCurrency, normalizeScanPrice, resolveScanCurrency } from '../_shared/matchrim-scan-money.ts';

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
type SensoryAttributes = Partial<Record<'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado', number>>;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const FUNCTION_VERSION = 'scan-wine-menu-2026-10-05-grounded-compact-v8';

const normalizeText = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const normalizeStringArray = (value: unknown) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 12)
  : [];
const nonWinePattern = /\b(vermut|vermouth|cerveza|beer|bier|sidra|cider|whisky|whiskey|ginebra|gin|vodka|ron|rum|cocktail|coctel|licor|destilado|destilados|spirits?)\b/i;
const wineTypePattern = /\b(tinto|blanco|rosado|espumoso|generoso|dulce|fortificado|orange|natural|champagne|cava|sherry|jerez)\b/i;
const genericWineNamePattern = /^(brut|cava|champagne|reserva|reserve|rose|rosado|spumante|tinto|blanco|wine|vino)$/i;

const isWineRecord = (wine: Record<string, unknown>) => {
  const name = normalizeText(wine.nombre ?? wine.name);
  if (!name || nonWinePattern.test(`${name} ${normalizeText(wine.tipo)}`)) return false;
  if (!hasGroundedMenuName(name, normalizeText(wine.texto_fuente), normalizeText(wine.productor))) return false;
  const section = normalizeText(wine.seccion);
  return !nonWinePattern.test(section) || wineTypePattern.test(normalizeText(wine.tipo));
};

// Sensory attrs always 1-5 integers. Normalize legacy 0-10 or 0-100 inputs.
const normalizeSensoryValueTo5 = (value: unknown): number | null => {
  const numeric = normalizeScanSensoryValue(value);
  return numeric === null ? null : Math.round(numeric);
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

const buildLearnedProfile = async (
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  baseProfile: MatchrimProfile
): Promise<MatchrimProfile> => {
  const { data: ratedWines, error } = await supabaseClient
    .from('user_wines')
    .select('rating, sensory_attributes, created_at, updated_at')
    .eq('user_id', userId)
    .eq('use_for_profile_training', true)
    .not('rating', 'is', null)
    .not('sensory_attributes', 'is', null);

  if (error || !ratedWines?.length) {
    if (error) console.error('Error loading rated wines for learned profile:', error);
    return baseProfile;
  }

  return calculateEdgeLearnedProfile(baseProfile, ratedWines as MatchrimTrainingRow[]);
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
  const numeric = optionalScanNumber(rawValue);
  if (numeric === null) return null;
  const raw = clamp(numeric > 1 ? numeric / 100 : numeric, 0, 1);
  let cap = 0.88;
  if (typeof wine.texto_fuente !== 'string' || !wine.texto_fuente.trim()) cap = Math.min(cap, 0.82);
  if (!position) cap = Math.min(cap, 0.78);
  if (typeof wine.productor !== 'string' || !wine.productor.trim()) cap = Math.min(cap, 0.74);
  const doubts = normalizeStringArray(wine.dudas);
  const inferredFields = normalizeStringArray(wine.campos_inferidos).map((field) => field.toLowerCase());
  const visibleName = normalizeText(wine.nombre ?? wine.name);
  if (doubts.some((field) => /nombre|productor|linea|columna|asociacion/i.test(field))) cap = Math.min(cap, 0.62);
  if (/^(do|ditto|idem|same)$/i.test(visibleName)) cap = Math.min(cap, 0.4);
  if (inferredFields.some((field) => ['nombre', 'name', 'productor', 'producer'].includes(field))) cap = Math.min(cap, 0.55);
  const hasRegion = typeof wine.region === 'string' && Boolean(wine.region.trim());
  const hasPrice = optionalScanNumber(wine.precio) !== null;
  if (!hasRegion && !hasPrice) cap = Math.min(cap, 0.68);
  return Math.round(Math.min(raw, cap) * 100) / 100;
};

const normalizePosicion = (raw: unknown): { x: number; y: number; width: number; height: number; confidence: number } | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const x = optionalScanNumber(r.x);
  const y = optionalScanNumber(r.y);
  const confidence = optionalScanNumber(r.confidence);
  if (x === null || y === null || confidence === null) return null;
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
    const databaseSchema = Deno.env.get('MATCHRIM_DB_SCHEMA')?.trim() || 'public';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        db: { schema: databaseSchema },
        global: { headers: { Authorization: authHeader } },
      }
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


    let prompt = `Analiza esta carta de vinos o pizarra y extrae un MÁXIMO de 30 vinos conservando su estructura visual.

IMPORTANTE:
- No mezcles texto ni precios de columnas distintas.
- Indica layout "columns" solo si hay columnas independientes de vinos; usa "rows" para una pizarra o lista con nombre a la izquierda y precio a la derecha. Un nombre y su precio NO son dos columnas de vinos.
- Conserva la moneda impresa SIN convertir importes: GBP para libra, EUR para euro. Nunca asumas EUR por el idioma del usuario, ni USD por un simbolo $ ambiguo. Si no hay evidencia, moneda null. El encabezado de la carta puede establecer la moneda de sus filas.
- Respeta secciones, orden de lectura y si el precio es por copa, botella o para llevar.
- Une productor, anada y nombre cuando aparezcan apilados en lineas contiguas dentro del mismo bloque y compartan un unico precio. No conviertas una marca y su variedad inmediatamente inferior en dos vinos si forman una sola referencia.
- En cartas historicas, "Do", "idem" o comillas pueden heredar la identidad de la linea anterior solo cuando la alineacion visual lo demuestra. Conserva el nuevo formato/precio, incluye la herencia en campos_inferidos y baja confidence si la asociacion no es inequivoca.
- Conserva como filas distintas dos apariciones de la misma referencia cuando tengan diferente tamano, servicio o precio. No las dedupliques dentro de esta respuesta.
- Si una linea no se puede asociar con seguridad, baja confidence o no la incluyas.
- Nunca inventes un nombre a partir de la descripcion, el precio o el numero de fila. No uses sustitutos como "Wine 1", "Sparkling Wine (Fifth 12.00)" o "Tinto aromas chocolate". Si la marca/referencia no es legible, omite la fila y declara cobertura parcial.
- confidence mide solo la asociacion visual entre los campos de esa linea. No subas confidence por conocer el vino.
- Usa confidence > 0.90 solo si nombre, productor y precio son inequivocos y visibles en la misma linea.
- Endereza mentalmente la perspectiva, pero devuelve las posiciones respecto a la imagen original.
- Incluye TODAS las lineas de vino completas y legibles, hasta 30. Haz una segunda pasada por cada seccion y por el borde inferior antes de responder. Si hay mas de 30, prioriza lineas completas y legibles, no supuesta importancia.
- Excluye cerveza, vermut/vermouth, sidra, destilados, cocteles, encabezados y cualquier producto que no sea vino. Espumosos, generosos y vinos dulces si cuentan como vino.
- No completes productor, region, pais, uvas o anada por conocimiento general sin declararlo en campos_inferidos. Si no puede leerse ni inferirse con suficiente base, usa null.
- Si una linea de marca o referencia va seguida por un estilo generico como "Brut", el nombre debe conservar la marca (por ejemplo "JP Chenet France Brut"). Nunca devuelvas solo "Brut", "Reserva", "Cava" o una variedad si la marca contigua es legible.

Para cada vino proporciona:
- nombre: Nombre del vino
- productor: Bodega/productor
- anada: Año (solo número, null si no está)
- region: Región vinícola
- pais: País
- precio: Precio (solo número)
- moneda: codigo ISO de moneda visible o null; conserva el simbolo/codigo en texto_fuente si figura en la fila
- precios: objeto { "copa": number|null, "botella": number|null, "llevar": number|null }
- servicio: "copa", "botella", "ambos" o null
- seccion: encabezado visible al que pertenece el vino
- confidence: confianza 0-1 en que nombre, productor y precio pertenecen a la misma linea
- texto_fuente: transcripcion literal breve de la linea que sustenta el resultado
- dudas: array de campos o asociaciones que no se leen con seguridad
- campos_inferidos: array de campos no leidos literalmente en la imagen
- tipo: tinto, blanco, rosado, espumoso, generoso o dulce
- uvas: Array con variedades principales
- descripcion: Maximo 24 palabras, solo notas visibles o respaldadas por una identidad legible; null si no hay base. Declara descripcion y atributos en campos_inferidos cuando no se lean literalmente. No inventes notas de cata.
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
- atributos: objeto con potencia, acidez, dulzura, taninos, afrutado (enteros 1-5; null si no hay evidencia suficiente, NUNCA conviertas ausencia en 0 o 1)
- compatibilidad: porcentaje 0-100 de compatibilidad con el perfil del usuario
- razon: explicacion de maximo 18 palabras basada en los atributos disponibles; null si no hay evidencia suficiente`;
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
      "moneda": null,
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
  "moneda": null,
  "layout": "columns|rows|unknown",
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

    const ai = await runMatchrimAi({ prompt, image: imageUrl, maxTokens: 8192 });
    let content = ai.text || '{"vinos":[]}';

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
      const completeAttributes = atributos &&
        atributos.potencia != null && atributos.acidez != null &&
        atributos.dulzura != null && atributos.taninos != null && atributos.afrutado != null;
      if (learnedProfile && completeAttributes) {
        out.compatibilidad = calculateCompatibilityScale5(learnedProfile, atributos!);
      } else {
        out.compatibilidad = null;
      }
      out.affinity_calibrated = true;

      const position = normalizePosicion(w.posicion);
      out.posicion = position;
      out.confidence = calibrateMenuIdentityConfidence(w.confidence, w, position);
      const rawName = normalizeText(w.nombre ?? w.name);
      const producer = normalizeText(w.productor);
      out.nombre = genericWineNamePattern.test(rawName) && producer
        ? `${producer} ${rawName}`
        : rawName;
      out.productor = producer || null;
      out.region = normalizeText(w.region) || null;
      out.pais = normalizeText(w.pais) || null;
      out.texto_fuente = normalizeText(w.texto_fuente) || null;
      out.dudas = normalizeStringArray(w.dudas);
      out.campos_inferidos = normalizeStringArray(w.campos_inferidos);
      out.precio = normalizeScanPrice(w.precio);
      out.moneda = resolveScanCurrency(w.moneda, w.texto_fuente, result.moneda);
      out.servicio = w.servicio === 'copa' || w.servicio === 'botella' || w.servicio === 'ambos' ? w.servicio : null;
      out.seccion = typeof w.seccion === 'string' ? w.seccion.trim() || null : null;
      if (w.precios && typeof w.precios === 'object' && !Array.isArray(w.precios)) {
        const rawPrices = w.precios as Record<string, unknown>;
        out.precios = {
          copa: normalizeScanPrice(rawPrices.copa),
          botella: normalizeScanPrice(rawPrices.botella),
          llevar: normalizeScanPrice(rawPrices.llevar),
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
      moneda: normalizeScanCurrency(result.moneda),
      layout: result.layout === 'columns' || result.layout === 'rows' ? result.layout : 'unknown',
      coverage,
      scan_version: FUNCTION_VERSION,
      ai_provider: ai.provider,
      ai_model: ai.model,
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
