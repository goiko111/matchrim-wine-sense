import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No text provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Analiza este texto de una carta de distribuidor de vinos y extrae TODOS los vinos con sus precios.

Texto:
${text}

Para cada vino, extrae:
- nombre: Nombre del vino
- bodega: Nombre de la bodega/productor
- precio: Precio en euros (solo el número, sin símbolo €)

IMPORTANTE: 
- Extrae TODOS los vinos que encuentres
- El precio puede estar con o sin símbolo €
- Si no encuentras el precio de algún vino, omítelo
- Si hay múltiples formatos de botella con precios diferentes, créalos como vinos separados

Responde SOLO con un JSON válido en este formato:
{
  "wines": [
    {"nombre": "Nombre Vino 1", "bodega": "Bodega 1", "precio": 45.90},
    {"nombre": "Nombre Vino 2", "bodega": "Bodega 2", "precio": 38.50}
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
          { 
            role: 'system', 
            content: 'Eres un experto en extraer información estructurada de listas de vinos. Respondes SOLO con JSON válido, sin markdown ni explicaciones adicionales.'
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"wines":[]}';
    
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanContent);

    console.log(`Extracted ${result.wines?.length || 0} wines with prices from text`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-distributor-text:', error);
    return new Response(
      JSON.stringify({ error: error.message, wines: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});