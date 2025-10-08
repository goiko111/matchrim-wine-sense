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
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Analiza esta imagen de una carta de distribuidor de vinos y extrae TODOS los vinos con sus precios.

Para cada vino, extrae:
- nombre: Nombre del vino
- bodega: Nombre de la bodega/productor
- precio: Precio (solo el número, sin símbolo ni comas)
- moneda: Código de moneda (MXN, EUR, USD) - detecta del símbolo o texto ($=MXN por defecto, €=EUR, USD si está especificado)

IMPORTANTE: 
- Extrae TODOS los vinos que encuentres
- Si no encuentras el precio de algún vino, omítelo
- Si hay múltiples formatos de botella con precios diferentes, créalos como vinos separados
- Si ves $ sin especificar, asume que son pesos mexicanos (MXN)
- Si ves "pesos", usa MXN como moneda

Responde SOLO con un JSON válido en este formato:
{
  "wines": [
    {"nombre": "Nombre Vino 1", "bodega": "Bodega 1", "precio": 850, "moneda": "MXN"},
    {"nombre": "Nombre Vino 2", "bodega": "Bodega 2", "precio": 45.90, "moneda": "EUR"}
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
            role: 'user', 
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
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

    console.log(`Extracted ${result.wines?.length || 0} wines with prices from image`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-distributor-ocr:', error);
    return new Response(
      JSON.stringify({ error: error.message, wines: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});