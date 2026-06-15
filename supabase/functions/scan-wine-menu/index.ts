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
type SensoryAttributes = Partial<Record<'potencia' | 'acidez' | 'dulzura' | 'taninos' | 'afrutado', unknown>>;
type RatedWine = {
  rating: Rating;
  sensory_attributes: SensoryAttributes | null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalizeSensoryValueTo5 = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 5 ? clamp(numeric / 2, 0, 5) : clamp(numeric, 0, 5);
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

  const deltas = {
    potente: 0,
    acidez: 0,
    dulce: 0,
    tanico: 0,
    afrutado: 0,
  };
  let totalWeight = 0;
  let samples = 0;

  (ratedWines as RatedWine[]).forEach((wine) => {
    const weight = ratingWeight(wine.rating);
    const attrs = wine.sensory_attributes;
    if (!weight || !attrs) return;

    const potencia = normalizeSensoryValueTo5(attrs.potencia);
    const acidez = normalizeSensoryValueTo5(attrs.acidez);
    const dulzura = normalizeSensoryValueTo5(attrs.dulzura);
    const taninos = normalizeSensoryValueTo5(attrs.taninos);
    const afrutado = normalizeSensoryValueTo5(attrs.afrutado);

    if (potencia === null || acidez === null || dulzura === null || taninos === null || afrutado === null) return;

    deltas.potente += (potencia - baseProfile.potente) * weight;
    deltas.acidez += (acidez - baseProfile.acidez) * weight;
    deltas.dulce += (dulzura - baseProfile.dulce) * weight;
    deltas.tanico += (taninos - baseProfile.tanico) * weight;
    deltas.afrutado += (afrutado - baseProfile.afrutado) * weight;
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

const profileToScale10 = (profile: MatchrimProfile) => ({
  potencia: clamp(Math.round(profile.potente * 2), 1, 10),
  acidez: clamp(Math.round(profile.acidez * 2), 1, 10),
  dulzura: clamp(Math.round(profile.dulce * 2), 1, 10),
  taninos: clamp(Math.round(profile.tanico * 2), 1, 10),
  afrutado: clamp(Math.round(profile.afrutado * 2), 1, 10),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, pdf } = await req.json();
    
    if (!image && !pdf) {
      throw new Error('No image or PDF provided');
    }

    // Validate data URL format
    const dataUrl = pdf || image;
    if (!dataUrl.startsWith('data:')) {
      throw new Error('Invalid image/PDF format. Must be a data URL.');
    }

    console.log('Processing file type:', pdf ? 'PDF' : 'Image');
    console.log('Data URL prefix:', dataUrl.substring(0, 50));

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer', '').trim();
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's Matchrim profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build a comprehensive prompt that extracts, enriches and calculates compatibility in ONE call
    let prompt = `Analiza esta carta de vinos y extrae un MÁXIMO de 15 vinos con sus características.

IMPORTANTE: Solo incluye hasta 15 vinos máximo. Si hay más, prioriza los más interesantes.

Para cada vino proporciona:
- nombre: Nombre del vino
- productor: Bodega/productor
- anada: Año (solo número, null si no está)
- region: Región vinícola
- pais: País
- precio: Precio (solo número)
- tipo: tinto, blanco, rosado o espumoso
- uvas: Array con variedades principales
- descripcion: Breve descripción (máximo 150 palabras) con aromas y notas de cata
- posicion: opcional, objeto { "x": number, "y": number } con la posición aproximada del centro de la línea/bloque del vino dentro de la imagen, expresada como porcentajes 0-100 (x=horizontal desde la izquierda, y=vertical desde arriba). Si no puedes estimarla con confianza, omite el campo o pon null.`;

    const learnedProfile = profile ? await buildLearnedProfile(supabaseClient, user.id, profile) : null;
    const profile10 = learnedProfile ? profileToScale10(learnedProfile) : null;

    // If user has profile, add compatibility calculation to the same prompt
    if (profile10) {
      prompt += `

ADEMÁS, calcula la compatibilidad de cada vino con este perfil de usuario (escala 1-10):
- Potencia: ${profile10.potencia}
- Acidez: ${profile10.acidez}
- Dulzura: ${profile10.dulzura}
- Taninos: ${profile10.taninos}
- Afrutado: ${profile10.afrutado}

Para cada vino, estima también:
- atributos: objeto con potencia, acidez, dulzura, taninos, afrutado (valores 1-10)
- compatibilidad: porcentaje 0-100 de compatibilidad con el perfil del usuario
- razon: explicación breve de la compatibilidad`;
    }

    prompt += `

RECUERDA: Máximo 15 vinos. Responde SOLO con JSON válido sin markdown:
{
  "vinos": [
    {
      "nombre": "Viña Pomal Reserva",
      "productor": "Bodegas Bilbaínas",
      "anada": 2018,
      "region": "Rioja",
      "pais": "España",
      "precio": 24.50,
      "tipo": "tinto",
      "uvas": ["Tempranillo", "Garnacha"],
      "descripcion": "Breve descripción con aromas y notas",
      "posicion": { "x": 42, "y": 17 }${profile ? `,
      "atributos": {
        "potencia": 7,
        "acidez": 6,
        "dulzura": 3,
        "taninos": 7,
        "afrutado": 6
      },
      "compatibilidad": 85,
      "razon": "Breve explicación"` : ''}
    }
  ]
}`;

     // For PDFs, convert to image format that Gemini can process
    // Gemini doesn't support PDF data URLs directly, only images
    const imageUrl = image;
    if (pdf) {
      console.log('PDF detected - user should upload as image instead');
      throw new Error('Por favor, convierte el PDF a imagen (captura de pantalla) antes de subirlo.');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Usar Flash para respuestas más rápidas y controladas
        messages: [
          { 
            role: 'user', 
            content: [
              { type: 'text', text: prompt },
              { 
                type: 'image_url', 
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 8192, // Suficiente para 15 vinos con descripciones breves
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
      }
      if (response.status === 402) {
        throw new Error('Créditos agotados. Añade créditos en Settings.');
      }
      
      throw new Error('Error al procesar la imagen.');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{"vinos":[]}';
    
    console.log('Raw AI response:', content);
    
    // Clean markdown más agresivamente
    content = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/^[^{]*/g, '') // Eliminar todo antes del primer {
      .replace(/[^}]*$/g, '') // Eliminar todo después del último }
      .trim();
    
    // Extraer solo el objeto JSON
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      content = content.substring(firstBrace, lastBrace + 1);
    }
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content length:', content.length);
      console.error('First 500 chars:', content.substring(0, 500));
      console.error('Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
      
        // Intentar reparar el JSON de forma más inteligente
        try {
          let fixedContent = content;
          
          // Si el contenido es muy corto, probablemente está incompleto
          if (content.length < 100) {
            console.error('Response too short:', content.length, 'chars');
            throw new Error('Respuesta de IA muy corta. Intenta con una sección más pequeña de la carta.');
          }
          
          // Encontrar el último objeto completo en el array de vinos
          const vinosMatch = content.match(/"vinos"\s*:\s*\[/);
          if (!vinosMatch) {
            console.error('Could not find vinos array in response');
            throw new Error('No se encontró la lista de vinos en la respuesta.');
          }

          const vinosStart = vinosMatch.index! + vinosMatch[0].length;
          let bracketCount = 0;
          let braceCount = 0;
          let lastCompleteObject = vinosStart;
          let inString = false;
          let escapeNext = false;
          
          // Rastrear objetos completos con más precisión
          for (let i = vinosStart; i < content.length; i++) {
            const char = content[i];
            
            // Manejar strings para no contar llaves/corchetes dentro de ellas
            if (char === '"' && !escapeNext) {
              inString = !inString;
            }
            escapeNext = char === '\\' && !escapeNext;
            
            if (!inString) {
              if (char === '{') braceCount++;
              if (char === '}') {
                braceCount--;
                if (braceCount === 0 && bracketCount === 0) {
                  // Encontramos el final de un objeto completo
                  lastCompleteObject = i + 1;
                }
              }
              if (char === '[') bracketCount++;
              if (char === ']') bracketCount--;
            }
          }
          
          // Reconstruir el JSON con solo objetos completos
          fixedContent = content.substring(0, lastCompleteObject).trim();
          
          // Asegurar que el array y objeto principal están cerrados
          if (!fixedContent.endsWith(']')) {
            fixedContent += '\n  ]\n}';
          } else if (!fixedContent.endsWith('}')) {
            fixedContent += '\n}';
          }
          
          console.log('Attempting JSON repair. Original length:', content.length, 'Fixed length:', fixedContent.length);
          result = JSON.parse(fixedContent);
          console.log('Successfully repaired JSON, extracted', result.vinos?.length || 0, 'wines');
        } catch (fixError) {
          console.error('JSON repair failed:', fixError);
          console.error('This usually means the response was truncated mid-generation');
          throw new Error('La carta es muy extensa. Por favor fotografía solo una sección con menos vinos.');
        }
    }
    
    const winesData = result as { vinos?: unknown; wines?: unknown };

    // Normalizar clave: aceptar "wines" o "vinos"
    const vinos = Array.isArray(winesData.vinos)
      ? winesData.vinos
      : Array.isArray(winesData.wines)
        ? winesData.wines
        : [];

    console.log(`Extracted ${vinos.length} wines from menu with ${profile ? 'compatibility' : 'basic info'}`);

    return new Response(JSON.stringify({ vinos, has_profile: !!profile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in scan-wine-menu:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: errorMessage, vinos: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
