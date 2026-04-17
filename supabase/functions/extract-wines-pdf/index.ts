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
    const { pdf } = await req.json();

    if (!pdf) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó ningún PDF' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing PDF with Gemini...');

    // For PDFs, we'll use Gemini's multimodal capabilities
    // Convert base64 PDF to image pages and process
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
            content: `Eres un experto sommelier. Analiza el PDF y extrae TODOS los vinos mencionados.

INSTRUCCIONES:
1. Busca vinos en todo el documento
2. Para cada vino identifica: nombre, bodega, región, país, uva, añada
3. Si un dato no está, usa null
4. Responde SOLO con array JSON válido

Formato:
[
  {
    "nombre": "Nombre del vino",
    "bodega": "Bodega",
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
                text: 'Extrae todos los vinos de este PDF.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: pdf
                }
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from Lovable AI:', errorText);
      throw new Error('Error al procesar el PDF con IA');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('No se pudo parsear la respuesta de IA');
    }
    
    const wines = JSON.parse(jsonMatch[0]);

    console.log(`Extracted ${wines.length} wines from PDF`);

    return new Response(
      JSON.stringify({ wines }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in extract-wines-pdf function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al extraer vinos del PDF',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
