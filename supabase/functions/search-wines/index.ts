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
    const { query, limit = 20 } = await req.json();
    
    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ wines: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const sanitizedQuery = query.replace(/,/g, '\\,');

    // Search in local database first
    const { data: wines, error } = await supabaseClient
      .from('wines')
      .select('*')
      .or(`name.ilike.%${sanitizedQuery}%,producer.ilike.%${sanitizedQuery}%,region.ilike.%${sanitizedQuery}%`)
      .limit(limit);

    if (error) {
      console.error('Error searching wines:', error);
      throw error;
    }

    let allWines = wines || [];
    console.log(`Found ${allWines.length} wines in database matching "${query}"`);

    // If we don't have enough results, search externally
    if (allWines.length < limit) {
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (LOVABLE_API_KEY) {
        try {
          console.log('Searching external sources for more wines...');
          
          const searchPrompt = `Busca vinos reales que coincidan con: "${query}"

IMPORTANTE:
- Solo vinos que existan realmente
- Incluye información verificable: nombre, bodega, región, país, variedades de uva
- Devuelve máximo ${limit - allWines.length} vinos
- Si no encuentras vinos verificables, devuelve array vacío

Responde SOLO con JSON:
{
  "wines": [
    {
      "name": "nombre del vino",
      "producer": "bodega",
      "region": "denominación de origen",
      "country": "país",
      "grape_varieties": ["uva1", "uva2"],
      "estilo": "estilo del vino (Tinto Potente, Blanco Fresco, etc.)"
    }
  ]
}`;

          const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                { role: 'user', content: searchPrompt }
              ],
              max_tokens: 1500,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            let content = data.choices?.[0]?.message?.content || '{}';
            content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const externalData = JSON.parse(content);
            
            if (externalData.wines && Array.isArray(externalData.wines)) {
              console.log(`Found ${externalData.wines.length} wines from external sources`);
              allWines = [...allWines, ...externalData.wines];
            }
          }
        } catch (externalError) {
          console.error('Error searching external sources:', externalError);
          // Continue with database results
        }
      }
    }

    return new Response(
      JSON.stringify({ wines: allWines }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in search-wines:', error);
    return new Response(
      JSON.stringify({ error: error.message, wines: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});