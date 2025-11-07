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

    // Always search externally to complement results
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      try {
        console.log('Searching external sources for wines...');
        
        const remainingSlots = Math.max(5, limit - allWines.length);
        const searchPrompt = `Busca vinos REALES que coincidan con la búsqueda: "${query}"

INSTRUCCIONES CRÍTICAS:
- SOLO vinos que existan realmente en el mercado
- Da prioridad a vinos icónicos y reconocidos de la bodega/región mencionada
- Si buscas "Muga", incluye OBLIGATORIAMENTE: Muga Reserva, Muga Crianza, Prado Enea, Torre Muga
- Si buscas una bodega, incluye su gama completa de vinos principales
- Información completa y verificable de cada vino
- Devuelve máximo ${remainingSlots} vinos
- ORDENA por importancia/reconocimiento del vino

Formato JSON (sin markdown):
{
  "wines": [
    {
      "name": "nombre completo del vino",
      "producer": "nombre de la bodega",
      "region": "denominación de origen",
      "country": "país",
      "grape_varieties": ["variedad1", "variedad2"],
      "estilo": "categoría del vino (ej: Tinto Crianza, Blanco Fresco)"
    }
  ]
}

DEVUELVE SOLO EL JSON, SIN TEXTO ADICIONAL.`;

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
            temperature: 0.3,
            max_tokens: 2000,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '{}';
          
          // Clean up markdown code blocks
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          // Remove any text before the first {
          const firstBrace = content.indexOf('{');
          if (firstBrace > 0) {
            content = content.substring(firstBrace);
          }
          
          const externalData = JSON.parse(content);
          
          if (externalData.wines && Array.isArray(externalData.wines)) {
            console.log(`Found ${externalData.wines.length} wines from external sources`);
            
            // Merge results, avoiding duplicates
            const existingNames = new Set(allWines.map(w => w.name?.toLowerCase()));
            const newWines = externalData.wines.filter((wine: any) => 
              !existingNames.has(wine.name?.toLowerCase())
            );
            
            allWines = [...allWines, ...newWines];
          }
        }
      } catch (externalError) {
        console.error('Error searching external sources:', externalError);
        // Continue with database results
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