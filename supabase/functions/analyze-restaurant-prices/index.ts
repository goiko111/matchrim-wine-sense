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

    const analyzedWines = await Promise.all(
      wines.map(async (wine) => {
        const prompt = `Analiza el precio de VENTA AL PÚBLICO EN RESTAURANTE de este vino:

- Nombre: ${wine.nombre}
- Bodega: ${wine.bodega}
- Precio en carta: ${wine.precio} ${wine.moneda}

IMPORTANTE: Este es un precio de VENTA AL PÚBLICO en restaurante (NO precio de distribuidor).
Los restaurantes típicamente aplican un markup de 200-300% sobre el precio de distribuidor.

Basándote en tu conocimiento del mercado de restaurantes y precios retail de vinos, indica:
1. Si el precio en carta está correcto, alto o bajo para esta moneda (${wine.moneda})
2. El precio medio de VENTA EN RESTAURANTE aproximado para un vino similar en ${wine.moneda}
3. Una breve explicación (máximo 50 palabras) sobre el precio en carta del restaurante

CONTEXTO: ${wine.moneda === 'MXN' ? 'Restaurante en México - precios al público' : wine.moneda === 'EUR' ? 'Restaurante en Europa - precios retail' : 'Restaurante en USA - precios al público'}

Considera:
- Markup típico de restaurante sobre distribuidor: 200-300%
- Precio justo para el consumidor
- Competitividad del mercado

Responde SOLO con un JSON válido en este formato exacto:
{
  "estado": "correcto" o "alto" o "bajo",
  "precio_medio_mercado": número (precio típico en carta de restaurante),
  "razonamiento": "texto breve sobre el precio retail"
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
                  content: 'Eres un experto sommelier y analista de precios de restaurantes. Respondes SOLO con JSON válido, sin markdown ni explicaciones adicionales.' 
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
        } catch (error: any) {
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
  } catch (error: any) {
    console.error('Error in analyze-restaurant-prices:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});