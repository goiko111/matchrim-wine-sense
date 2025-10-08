import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WineWithPrice {
  nombre: string;
  bodega: string;
  precio: number;
  moneda: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wines } = await req.json() as { wines: WineWithPrice[] };
    
    if (!wines || wines.length === 0) {
      throw new Error('No wines provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Analizar cada vino
    const analyzedWines = await Promise.all(
      wines.map(async (wine) => {
        const prompt = `Analiza el precio MAYORISTA/DISTRIBUIDOR de este vino (precio de venta de distribuidor a restaurante, NO precio de venta al público):

- Nombre: ${wine.nombre}
- Bodega: ${wine.bodega}
- Precio distribuidor: ${wine.precio} ${wine.moneda}

IMPORTANTE: Este es un precio WHOLESALE (distribuidor a restaurante), típicamente 40-60% menor que el precio retail.

Basándote en tu conocimiento del mercado mayorista de vinos, indica:
1. Si el precio de distribuidor está correcto, alto o bajo para esta moneda (${wine.moneda})
2. El precio medio de DISTRIBUIDOR aproximado para un vino similar en ${wine.moneda}
3. Una breve explicación (máximo 50 palabras) enfocada en precios mayoristas

CONTEXTO: ${wine.moneda === 'MXN' ? 'Mercado mexicano - precios de distribuidor a restaurantes' : wine.moneda === 'EUR' ? 'Mercado europeo - precios mayoristas' : 'Mercado estadounidense - precios wholesale'}

Responde SOLO con un JSON válido en este formato exacto:
{
  "estado": "correcto" o "alto" o "bajo",
  "precio_medio_mercado": número (precio de distribuidor, no retail),
  "razonamiento": "texto breve sobre el precio mayorista"
}`;

        try {
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
                  role: 'system', 
                  content: 'Eres un experto sommelier y analista de precios de vinos. Respondes SOLO con JSON válido, sin markdown ni explicaciones adicionales.' 
                },
                { role: 'user', content: prompt }
              ],
            }),
          });

          if (!response.ok) {
            console.error('AI API error:', response.status);
            return {
              ...wine,
              analisis: {
                estado: 'correcto' as const,
                razonamiento: 'No se pudo analizar el precio',
                precio_medio_mercado: wine.precio
              }
            };
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || '{}';
          
          // Limpiar la respuesta de markdown si existe
          const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const analisis = JSON.parse(cleanContent);

          return {
            ...wine,
            analisis: {
              estado: analisis.estado || 'correcto',
              razonamiento: analisis.razonamiento || 'Precio dentro del rango esperado',
              precio_medio_mercado: analisis.precio_medio_mercado || wine.precio
            }
          };
        } catch (error) {
          console.error(`Error analyzing wine ${wine.nombre}:`, error);
          return {
            ...wine,
            analisis: {
              estado: 'correcto' as const,
              razonamiento: 'Error al analizar',
              precio_medio_mercado: wine.precio
            }
          };
        }
      })
    );

    return new Response(
      JSON.stringify({ wines: analyzedWines }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-distributor-prices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});