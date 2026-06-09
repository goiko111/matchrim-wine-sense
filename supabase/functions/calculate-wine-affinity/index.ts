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

const profileToScale10 = (profile: MatchrimProfile) => ({
  potencia: clamp(Math.round(profile.potente * 2), 1, 10),
  acidez: clamp(Math.round(profile.acidez * 2), 1, 10),
  dulzura: clamp(Math.round(profile.dulce * 2), 1, 10),
  taninos: clamp(Math.round(profile.tanico * 2), 1, 10),
  afrutado: clamp(Math.round(profile.afrutado * 2), 1, 10),
});

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

const calculateAffinityFromScale10 = (profile: ReturnType<typeof profileToScale10>, attrs: SensoryAttributes) => {
  const distance = Math.sqrt(
    Math.pow(profile.potencia - (Number(attrs.potencia) || 5), 2) +
    Math.pow(profile.acidez - (Number(attrs.acidez) || 5), 2) +
    Math.pow(profile.dulzura - (Number(attrs.dulzura) || 5), 2) +
    Math.pow(profile.taninos - (Number(attrs.taninos) || 5), 2) +
    Math.pow(profile.afrutado - (Number(attrs.afrutado) || 5), 2)
  );

  const maxDistance = Math.sqrt(5 * Math.pow(9, 2));
  return Math.round(Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100)));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wine_id } = await req.json();
    
    if (!wine_id) {
      throw new Error('Wine ID is required');
    }

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
      .select('potente, acidez, dulce, tanico, afrutado')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ 
          affinity: null, 
          message: 'No Matchrim profile found. Complete the quiz first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get wine from user_wines
    const { data: wine, error: wineError } = await supabaseClient
      .from('user_wines')
      .select('*')
      .eq('id', wine_id)
      .eq('user_id', user.id)
      .single();

    if (wineError || !wine) {
      throw new Error('Wine not found');
    }

    const learnedProfile = await buildLearnedProfile(supabaseClient, user.id, profile);
    const userProfile10 = profileToScale10(learnedProfile);

    // If wine already has sensory attributes, calculate affinity
    if (wine.sensory_attributes) {
      const attrs = wine.sensory_attributes;
      const affinity = calculateAffinityFromScale10(userProfile10, attrs);

      // Update wine with affinity
      await supabaseClient
        .from('user_wines')
        .update({ matchrim_affinity: affinity })
        .eq('id', wine_id);

      return new Response(
        JSON.stringify({ affinity }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no sensory attributes, try to estimate them using AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Eres un sommelier experto. Estima los atributos sensoriales de este vino en escala 1-10:

Vino: ${wine.name}
Bodega: ${wine.producer || 'Desconocida'}
Región: ${wine.region || 'Desconocida'}
País: ${wine.country || 'Desconocido'}
Uvas: ${wine.grape_varieties?.join(', ') || 'Desconocidas'}
Añada: ${wine.vintage || 'NV'}

Basándote en estos datos y tu conocimiento enológico, estima:
- potencia (1=delicado, 10=muy potente/alcohólico)
- acidez (1=baja, 10=muy ácida)
- dulzura (1=seco, 10=muy dulce)
- taninos (1=suaves, 10=muy tánico) - 5 para blancos
- afrutado (1=terroso/mineral, 10=muy afrutado)

Responde SOLO con JSON:
{
  "potencia": 7,
  "acidez": 6,
  "dulzura": 2,
  "taninos": 7,
  "afrutado": 6
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      throw new Error('AI API error');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{}';
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const sensoryAttrs = JSON.parse(content) as SensoryAttributes;

    const affinity = calculateAffinityFromScale10(userProfile10, sensoryAttrs);

    // Update wine with sensory attributes and affinity
    await supabaseClient
      .from('user_wines')
      .update({ 
        sensory_attributes: sensoryAttrs,
        matchrim_affinity: affinity 
      })
      .eq('id', wine_id);

    return new Response(
      JSON.stringify({ affinity, sensory_attributes: sensoryAttrs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calculate-wine-affinity:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
