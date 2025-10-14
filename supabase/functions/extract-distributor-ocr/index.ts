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
        model: 'google/gemini-2.5-pro',
        messages: [
          { 
            role: 'user', 
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Demasiadas solicitudes. Espera un momento e intenta de nuevo.');
      }
      if (response.status === 402) {
        throw new Error('Créditos agotados. Añade créditos en Settings.');
      }
      
      throw new Error('Error al procesar la imagen. Intenta con una más pequeña.');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{"wines":[]}';
    
    console.log('Raw AI response:', content);
    
    // Limpiar markdown
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Si el JSON está incompleto, intentar arreglarlo
    if (!content.endsWith('}') && !content.endsWith(']')) {
      console.log('Incomplete JSON detected, attempting to fix...');
      const winesMatch = content.match(/"wines"\s*:\s*\[/);
      if (winesMatch) {
        let depth = 0;
        let lastCompleteIndex = -1;
        for (let i = winesMatch.index + winesMatch[0].length; i < content.length; i++) {
          if (content[i] === '{') depth++;
          if (content[i] === '}') {
            depth--;
            if (depth === 0) lastCompleteIndex = i;
          }
        }
        if (lastCompleteIndex > 0) {
          content = content.substring(0, lastCompleteIndex + 1) + ']}';
        }
      }
    }
    
    const result = JSON.parse(content);

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