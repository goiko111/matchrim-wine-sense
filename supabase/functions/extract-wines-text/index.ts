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
    const { text } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó ningún texto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing text with Gemini...');

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
            content: `Eres un experto sommelier. Analiza el texto y extrae TODOS los vinos mencionados.

El texto puede tener diferentes formatos:
- Castillo Ygay - Marqués de Murrieta - Rioja
- Pingus 2015, Ribera del Duero
- Vega Sicilia Único (Tempranillo)
- Lista con bullets o números
- Formato libre

INSTRUCCIONES:
1. Extrae TODOS los vinos del texto
2. Para cada vino identifica: nombre, bodega, región, país, uva, añada
3. Si un dato no está claro, usa null
4. Responde SOLO con array JSON válido, sin texto adicional

Formato de salida:
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
            content: `Extrae todos los vinos de este texto:\n\n${text}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from Lovable AI:', errorText);
      throw new Error('Error al procesar el texto con IA');
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

    console.log(`Extracted ${wines.length} wines from text`);

    return new Response(
      JSON.stringify({ wines }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error in extract-wines-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al extraer vinos del texto',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
