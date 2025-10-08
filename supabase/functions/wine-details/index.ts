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
    const { nombre, bodega, pais, region, uva } = await req.json();

    if (!nombre || !bodega) {
      return new Response(
        JSON.stringify({ error: 'Se requiere nombre y bodega del vino' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching detailed info for: ${nombre} - ${bodega}`);

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
            content: `Eres un sommelier experto. Proporciona información detallada y precisa sobre vinos.

INSTRUCCIONES CRÍTICAS:
1. Proporciona información REAL y verificable del vino específico
2. Si no tienes información exacta, indícalo claramente
3. Estructura la información de forma clara y útil
4. Responde SOLO con un objeto JSON válido, sin texto adicional

Formato de salida:
{
  "descripcion": "Descripción detallada del vino (2-3 párrafos)",
  "notas_cata": {
    "vista": "Descripción visual",
    "nariz": "Aromas y bouquet",
    "boca": "Sabores y textura"
  },
  "caracteristicas": {
    "varietal": "Uva(s) principal(es)",
    "capacidad": "Capacidad de la botella (ej: 750ml, 1.5L)",
    "alcohol": "% Vol aproximado",
    "temperatura_servicio": "Temperatura ideal",
    "potencial_guarda": "Años de guarda"
  },
  "maridajes": ["Plato 1", "Plato 2", "Plato 3", "Plato 4"],
  "historia": "Breve historia de la bodega o el vino",
  "premios": ["Premio 1", "Premio 2"] o null si no aplica
}`
          },
          {
            role: 'user',
            content: `Proporciona información detallada sobre este vino:

Nombre: ${nombre}
Bodega: ${bodega}
${pais ? `País: ${pais}` : ''}
${region ? `Región: ${region}` : ''}
${uva ? `Uva: ${uva}` : ''}

Responde SOLO con el objeto JSON especificado.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from Lovable AI:', errorText);
      throw new Error('Error al consultar información del vino');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('Raw AI response:', content);

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('No se pudo parsear la respuesta de IA');
    }
    
    const wineInfo = JSON.parse(jsonMatch[0]);

    console.log('Wine info extracted successfully');

    return new Response(
      JSON.stringify(wineInfo),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in wine-details function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al obtener detalles del vino',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
