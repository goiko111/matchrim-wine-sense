import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { data: { user } } = await supabaseClient.auth.getUser();
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

    // If wine already has sensory attributes, calculate affinity
    if (wine.sensory_attributes) {
      const attrs = wine.sensory_attributes;
      
      // Calculate Euclidean distance (lower is better)
      const distance = Math.sqrt(
        Math.pow(profile.potente - (attrs.potencia || 5), 2) +
        Math.pow(profile.acidez - (attrs.acidez || 5), 2) +
        Math.pow(profile.dulce - (attrs.dulzura || 5), 2) +
        Math.pow(profile.tanico - (attrs.taninos || 5), 2) +
        Math.pow(profile.afrutado - (attrs.afrutado || 5), 2)
      );
      
      // Convert to affinity percentage (max distance ~22.4, min 0)
      const maxDistance = Math.sqrt(5 * Math.pow(9, 2)); // ~20.1
      const affinity = Math.round(Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100)));

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
    
    const sensoryAttrs = JSON.parse(content);

    // Calculate affinity
    const distance = Math.sqrt(
      Math.pow(profile.potente - sensoryAttrs.potencia, 2) +
      Math.pow(profile.acidez - sensoryAttrs.acidez, 2) +
      Math.pow(profile.dulce - sensoryAttrs.dulzura, 2) +
      Math.pow(profile.tanico - sensoryAttrs.taninos, 2) +
      Math.pow(profile.afrutado - sensoryAttrs.afrutado, 2)
    );
    
    const maxDistance = Math.sqrt(5 * Math.pow(9, 2));
    const affinity = Math.round(Math.max(0, Math.min(100, (1 - distance / maxDistance) * 100)));

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
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});