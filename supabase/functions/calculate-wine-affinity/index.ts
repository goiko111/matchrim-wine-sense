import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { runMatchrimAi } from '../_shared/matchrim-ai-provider.ts';
import {
  calibrateEdgeMatchrimAffinity,
  MATCHRIM_AFFINITY_MODEL,
  mergeEdgeAffinityTrace,
} from '../_shared/matchrim-affinity.ts';
import {
  calculateEdgeLearnedProfileAudit,
  type MatchrimEdgeLearningAudit,
  type MatchrimTrainingRow,
} from '../_shared/matchrim-learning.ts';

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

const buildLearnedProfile = async (
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  baseProfile: MatchrimProfile
): Promise<MatchrimEdgeLearningAudit> => {
  const { data: ratedWines, error } = await supabaseClient
    .from('user_wines')
    .select('rating, sensory_attributes, created_at, updated_at')
    .eq('user_id', userId)
    .eq('use_for_profile_training', true)
    .not('rating', 'is', null)
    .not('sensory_attributes', 'is', null);

  if (error || !ratedWines?.length) {
    if (error) console.error('Error loading rated wines for learned profile:', error);
    return { profile: baseProfile, confidence: 0, samples: 0 };
  }

  return calculateEdgeLearnedProfileAudit(baseProfile, ratedWines as MatchrimTrainingRow[]);
};

// Afinidad `manhattan-v1`: MISMA métrica que el backend (GET /api/v1/matchrim/recommendations,
// `rel = max(0, 1 - manhattan/maxDist)`), para que el % de "Mis Vinos" sea coherente con el de
// la home. En espacio 1-5 el delta máximo por eje es 4 y son 5 ejes -> maxDist = 20.
const calculateAffinityFromScale5 = (profile: MatchrimProfile, attrs: SensoryAttributes) => {
  const distance =
    Math.abs(profile.potente - (attrs.potencia ?? 3)) +
    Math.abs(profile.acidez - (attrs.acidez ?? 3)) +
    Math.abs(profile.dulce - (attrs.dulzura ?? 3)) +
    Math.abs(profile.tanico - (attrs.taninos ?? 3)) +
    Math.abs(profile.afrutado - (attrs.afrutado ?? 3));
  const maxDistance = 20;
  return Math.round(Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100)));
};

const buildAffinityResult = (
  learned: MatchrimEdgeLearningAudit,
  attrs: SensoryAttributes,
) => {
  const rawAffinity = calculateAffinityFromScale5(learned.profile, attrs);
  return {
    affinity: calibrateEdgeMatchrimAffinity(rawAffinity, learned.confidence),
    raw_affinity: rawAffinity,
    affinity_confidence: learned.confidence,
    affinity_model: MATCHRIM_AFFINITY_MODEL,
    learning_samples: learned.samples,
  };
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

    const databaseSchema = Deno.env.get('MATCHRIM_DB_SCHEMA')?.trim() || 'public';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        db: { schema: databaseSchema },
        global: { headers: { Authorization: authHeader } },
      }
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

    const estimateSensory = async (wineLike: {
      name?: string | null;
      producer?: string | null;
      region?: string | null;
      country?: string | null;
      grape_varieties?: string[] | null;
      vintage?: number | null;
    }): Promise<SensoryAttributes> => {
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

      const ai = await runMatchrimAi({ prompt, maxTokens: 256 });
      let content = ai.text || '{}';
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
      const affinityResult = buildAffinityResult(learnedProfile, sensoryAttrs);
      return new Response(
        JSON.stringify({ ...affinityResult, sensory_attributes: sensoryAttrs, temporary: true }),
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
      const affinityResult = buildAffinityResult(learnedProfile, existingAttrs);
      await supabaseClient
        .from('user_wines')
        .update({
          matchrim_affinity: affinityResult.affinity,
          sensory_attributes: existingAttrs,
          place_details: mergeEdgeAffinityTrace(wine.place_details, affinityResult),
        })
        .eq('id', wine_id);
      return new Response(
        JSON.stringify({ ...affinityResult, sensory_attributes: existingAttrs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sensoryAttrs = await estimateSensory(wine);
    const affinityResult = buildAffinityResult(learnedProfile, sensoryAttrs);

    await supabaseClient
      .from('user_wines')
      .update({
        sensory_attributes: sensoryAttrs,
        matchrim_affinity: affinityResult.affinity,
        place_details: mergeEdgeAffinityTrace(wine.place_details, affinityResult),
      })
      .eq('id', wine_id);

    return new Response(
      JSON.stringify({ ...affinityResult, sensory_attributes: sensoryAttrs }),
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
