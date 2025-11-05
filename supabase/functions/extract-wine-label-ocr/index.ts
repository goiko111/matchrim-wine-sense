import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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

    const prompt = `Analiza esta etiqueta de vino y extrae TODA la información visible.

Extrae:
- nombre: Nombre del vino (si no está visible, usa "Sin nombre")
- productor: Nombre de la bodega/productor
- anada: Año de cosecha (vintage) - solo el número, o null si no está visible
- region: Región vinícola (DO, DOCa, AOC, etc.)
- pais: País de origen
- uvas: Array de variedades de uva mencionadas
- alcohol: Grado alcohólico (solo el número decimal, ej: 13.5)
- notas_cata: Notas de cata si están presentes en la etiqueta (descripción de sabores, aromas, etc.)

IMPORTANTE: 
- Extrae SOLO información que esté VISIBLE en la etiqueta
- Si no ves un campo, usa null o array vacío según corresponda
- Para el país, infiere del idioma o región si no está explícito (ej: Rioja = España)
- Las uvas pueden estar en diferentes idiomas (Tempranillo, Garnacha, Cabernet Sauvignon, etc.)

Responde SOLO con un JSON válido en este formato:
{
  "nombre": "Nombre del Vino",
  "productor": "Bodega XYZ",
  "anada": 2019,
  "region": "Rioja",
  "pais": "España",
  "uvas": ["Tempranillo", "Garnacha"],
  "alcohol": 14.5,
  "notas_cata": "Notas de cata si están presentes"
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
        max_tokens: 2048,
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
      
      throw new Error('Error al procesar la imagen. Intenta con una más pequeña o de mejor calidad.');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{}';
    
    console.log('Raw AI response:', content);
    
    // Limpiar markdown
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const result = JSON.parse(content);

    console.log('Extracted wine data from label:', result);

    // Si faltan datos y tenemos nombre + productor, buscar en la base de datos local
    if ((!result.region || !result.alcohol) && result.nombre && result.productor) {
      console.log('Missing region or alcohol, searching in database...');
      
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Buscar vinos similares en la base de datos
        const { data: wines, error } = await supabaseClient
          .from('wines')
          .select('region, alcohol')
          .ilike('name', `%${result.nombre}%`)
          .ilike('producer', `%${result.productor}%`)
          .limit(1);

        if (!error && wines && wines.length > 0) {
          const dbWine = wines[0];
          
          // Completar solo los campos que faltan con datos de la BD
          if (!result.region && dbWine.region) {
            result.region = dbWine.region;
            console.log('Region found in database:', dbWine.region);
          }
          if (!result.alcohol && dbWine.alcohol) {
            result.alcohol = dbWine.alcohol;
            console.log('Alcohol found in database:', dbWine.alcohol);
          }
        } else {
          console.log('No matching wine found in database');
        }
      } catch (searchError) {
        console.error('Error searching database:', searchError);
        // Continuar con los datos extraídos de la etiqueta
      }
    }

    console.log('Final wine data:', result);

    return new Response(
      JSON.stringify({ wine: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in extract-wine-label-ocr:', error);
    return new Response(
      JSON.stringify({ error: error.message, wine: null }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});