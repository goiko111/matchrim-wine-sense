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

    const prompt = `Analiza este texto de una carta de vinos de restaurante y extrae TODOS los vinos con sus precios de venta al público.

Texto:
${text}

Para cada vino, extrae:
- nombre: Nombre del vino
- bodega: Nombre de la bodega/productor
- precio: Precio de venta al público (solo el número, sin símbolo ni comas)
- moneda: Código de moneda (MXN, EUR, USD) - detecta del símbolo o texto

IMPORTANTE: 
- Estos son precios de VENTA AL PÚBLICO en restaurante (retail)
- Extrae TODOS los vinos que encuentres
- El precio puede estar con o sin símbolo ($, €, USD)
- Si ves $ sin especificar, asume que son pesos mexicanos (MXN)
- Si ves "pesos" o "MXN", usa MXN como moneda

Responde SOLO con un JSON válido en este formato:
{
  "wines": [
    {"nombre": "Nombre Vino 1", "bodega": "Bodega 1", "precio": 1800, "moneda": "MXN"},
    {"nombre": "Nombre Vino 2", "bodega": "Bodega 2", "precio": 95, "moneda": "EUR"}
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
            content: 'Eres un experto en extraer información estructurada de cartas de vinos. Respondes SOLO con JSON válido, sin markdown ni explicaciones adicionales.'
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

    console.log(`Extracted ${result.wines?.length || 0} wines with restaurant prices from text`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-restaurant-text:', error);
    return new Response(
      JSON.stringify({ error: error.message, wines: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});