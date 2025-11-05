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

    // Si falta región o alcohol, buscar información adicional
    if ((!result.region || !result.alcohol) && result.nombre && result.productor) {
      console.log('Missing region or alcohol, searching additional info...');
      
      try {
        const searchPrompt = `Busca información sobre este vino y proporciona SOLO los datos faltantes:
        
Nombre: ${result.nombre}
Bodega: ${result.productor}
${result.pais ? `País: ${result.pais}` : ''}
${result.anada ? `Añada: ${result.anada}` : ''}

Proporciona:
- region: Región vinícola oficial (DO, DOCa, IGP, AOC, etc.) si la conoces
- alcohol: Grado alcohólico típico de este vino (número decimal, ej: 13.5)

Responde SOLO con JSON:
{
  "region": "Región" o null,
  "alcohol": número o null
}`;

        const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: searchPrompt }
            ],
            max_tokens: 500,
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          let searchContent = searchData.choices?.[0]?.message?.content || '{}';
          searchContent = searchContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const additionalInfo = JSON.parse(searchContent);
          
          // Completar solo los campos que faltan
          if (!result.region && additionalInfo.region) {
            result.region = additionalInfo.region;
            console.log('Region found:', additionalInfo.region);
          }
          if (!result.alcohol && additionalInfo.alcohol) {
            result.alcohol = additionalInfo.alcohol;
            console.log('Alcohol found:', additionalInfo.alcohol);
          }
        }
      } catch (searchError) {
        console.error('Error searching additional info:', searchError);
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