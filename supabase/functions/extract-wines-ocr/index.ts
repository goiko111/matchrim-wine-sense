import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó ninguna imagen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing image with Gemini Vision...');

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
            content: `Eres un experto sommelier y analista de imágenes de vinos. Tu tarea es extraer información de vinos de cualquier imagen que contenga:
- Etiquetas de botellas
- Cartas de vino de restaurantes
- Listas manuscritas o impresas
- Catálogos de bodegas

INSTRUCCIONES CRÍTICAS:
1. Extrae TODOS los vinos que aparezcan en la imagen
2. Para cada vino, identifica: nombre, bodega, región, país, uva/varietal, añada/año
3. Si algún dato no está visible, déjalo como null
4. Responde SOLO con un array JSON válido, sin texto adicional

Formato de salida:
[
  {
    "nombre": "Nombre del vino",
    "bodega": "Nombre de la bodega",
    "region": "Región o null",
    "pais": "País o null",
    "uva": "Varietal o null",
    "anada": "Año o null"
  }
]`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae todos los vinos de esta imagen siguiendo el formato JSON especificado.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from Lovable AI:', errorText);
      throw new Error('Error al procesar la imagen con IA');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Extract JSON from the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('No se pudo parsear la respuesta de IA');
    }
    
    const wines = JSON.parse(jsonMatch[0]);

    console.log(`Extracted ${wines.length} wines from image`);

    return new Response(
      JSON.stringify({ wines }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in extract-wines-ocr function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al extraer vinos de la imagen',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
