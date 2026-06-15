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

// All sensory attributes live on a 1-5 integer scale.
// Normalize legacy values that may still be on 0-10 or 0-100.
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

// Distance in 1-5 space. Max single-axis delta = 4, 5 axes -> max distance sqrt(5*16).
const calculateAffinityFromScale5 = (profile: MatchrimProfile, attrs: SensoryAttributes) => {
  const distance = Math.sqrt(
    Math.pow(profile.potente - (attrs.potencia ?? 3), 2) +
    Math.pow(profile.acidez - (attrs.acidez ?? 3), 2) +
    Math.pow(profile.dulce - (attrs.dulzura ?? 3), 2) +
    Math.pow(profile.tanico - (attrs.taninos ?? 3), 2) +
    Math.pow(profile.afrutado - (attrs.afrutado ?? 3), 2)
  );
  const maxDistance = Math.sqrt(5 * Math.pow(4, 2));
  return Math.round(Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100)));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { wine_id, wine: tempWine } = body || {};

    if (!wine_id && !tempWine) {
      throw new Error('Wine ID or temporary wine data is required');
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

    const learnedProfile = await buildLearnedProfile(supabaseClient, user.id, profile);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const estimateSensory = async (wineLike: {
      name?: string | null;
      producer?: string | null;
      region?: string | null;
      country?: string | null;
      grape_varieties?: string[] | null;
      vintage?: number | null;
    }): Promise<SensoryAttributes> => {
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY not configured');
      }
      const prompt = `Eres un sommelier experto. Estima los atributos sensoriales de este vino en una escala ENTERA 1-5 (1=muy bajo, 5=muy alto). NO uses 0 ni valores mayores que 5.

Vino: ${wineLike.name || 'Desconocido'}
Bodega: ${wineLike.producer || 'Desconocida'}
Región: ${wineLike.region || 'Desconocida'}
País: ${wineLike.country || 'Desconocido'}
Uvas: ${wineLike.grape_varieties?.join(', ') || 'Desconocidas'}
Añada: ${wineLike.vintage || 'NV'}

Estima estos cinco atributos (enteros 1-5):
- potencia, acidez, dulzura, taninos (3 para blancos sin taninos perceptibles), afrutado.
Responde SOLO con JSON: {"potencia":4,"acidez":3,"dulzura":1,"taninos":4,"afrutado":3}`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 256,
        }),
      });
      if (!response.ok) throw new Error('AI API error');
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '{}';
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(content) as Record<string, unknown>;
      const normalized = normalizeSensoryAttributes(parsed);
      if (!normalized) throw new Error('AI returned no usable sensory attributes');
      return normalized;
    };

    // Branch A: temporary wine (no DB write)
    if (tempWine && !wine_id) {
      let sensoryAttrs = normalizeSensoryAttributes(tempWine.sensory_attributes ?? null);
      if (!sensoryAttrs) {
        sensoryAttrs = await estimateSensory({
          name: tempWine.name ?? tempWine.nombre,
          producer: tempWine.producer ?? tempWine.productor,
          region: tempWine.region,
          country: tempWine.country ?? tempWine.pais,
          grape_varieties: tempWine.grape_varieties ?? tempWine.uvas,
          vintage: tempWine.vintage ?? tempWine.anada,
        });
      }
      const affinity = calculateAffinityFromScale5(learnedProfile, sensoryAttrs);
      return new Response(
        JSON.stringify({ affinity, sensory_attributes: sensoryAttrs, temporary: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Branch B: existing wine_id
    const { data: wine, error: wineError } = await supabaseClient
      .from('user_wines')
      .select('*')
      .eq('id', wine_id)
      .eq('user_id', user.id)
      .single();

    if (wineError || !wine) {
      throw new Error('Wine not found');
    }

    const existingAttrs = normalizeSensoryAttributes(wine.sensory_attributes);
    if (existingAttrs) {
      const affinity = calculateAffinityFromScale5(learnedProfile, existingAttrs);
      await supabaseClient
        .from('user_wines')
        .update({ matchrim_affinity: affinity, sensory_attributes: existingAttrs })
        .eq('id', wine_id);
      return new Response(
        JSON.stringify({ affinity, sensory_attributes: existingAttrs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sensoryAttrs = await estimateSensory(wine);
    const affinity = calculateAffinityFromScale5(learnedProfile, sensoryAttrs);

    await supabaseClient
      .from('user_wines')
      .update({
        sensory_attributes: sensoryAttrs,
        matchrim_affinity: affinity,
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
