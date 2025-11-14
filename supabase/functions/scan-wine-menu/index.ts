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
    const { image, pdf } = await req.json();
    
    if (!image && !pdf) {
      throw new Error('No image or PDF provided');
    }

    // Validate data URL format
    const dataUrl = pdf || image;
    if (!dataUrl.startsWith('data:')) {
      throw new Error('Invalid image/PDF format. Must be a data URL.');
    }

    console.log('Processing file type:', pdf ? 'PDF' : 'Image');
    console.log('Data URL prefix:', dataUrl.substring(0, 50));

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer', '').trim();
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's Matchrim profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('quiz_results')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError);
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `Analiza esta carta de vinos de restaurante y extrae TODOS los vinos visibles con sus características.

Para cada vino, extrae:
- nombre: Nombre del vino
- productor: Bodega/productor (si está visible)
- anada: Año de cosecha (solo número, null si no está)
- region: Región vinícola
- pais: País (infiere del idioma/región si no está explícito)
- precio: Precio (solo el número, sin símbolo)
- tipo: Tipo de vino (tinto, blanco, rosado, espumoso)
- descripcion: Descripción breve si está presente

IMPORTANTE:
- Extrae TODOS los vinos que veas en la carta
- Si no encuentras algún campo, usa null
- Para el país, infiere: Rioja/Ribera=España, Bordeaux=Francia, etc.

Responde SOLO con un JSON válido:
{
  "vinos": [
    {
      "nombre": "Viña Pomal Reserva",
      "productor": "Bodegas Bilbaínas",
      "anada": 2018,
      "region": "Rioja",
      "pais": "España",
      "precio": 24.50,
      "tipo": "tinto",
      "descripcion": "Crianza de 24 meses en barrica"
    }
  ]
}`;

     // For PDFs, convert to image format that Gemini can process
    // Gemini doesn't support PDF data URLs directly, only images
    let imageUrl = image;
    if (pdf) {
      console.log('PDF detected - user should upload as image instead');
      throw new Error('Por favor, convierte el PDF a imagen (captura de pantalla) antes de subirlo.');
    }

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
              { 
                type: 'image_url', 
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 8192,
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
      
      throw new Error('Error al procesar la imagen.');
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '{"vinos":[]}';
    
    console.log('Raw AI response:', content);
    
    // Clean markdown
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Content that failed to parse:', content);
      
      // Try to salvage partial JSON by closing arrays/objects
      try {
        // Count opening and closing braces/brackets
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        const openBrackets = (content.match(/\[/g) || []).length;
        const closeBrackets = (content.match(/\]/g) || []).length;
        
        let fixedContent = content;
        
        // Close incomplete strings
        const quotes = (content.match(/"/g) || []).length;
        if (quotes % 2 !== 0) {
          fixedContent += '"';
        }
        
        // Close brackets and braces
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          fixedContent += ']';
        }
        for (let i = 0; i < openBraces - closeBraces; i++) {
          fixedContent += '}';
        }
        
        console.log('Attempting to fix JSON:', fixedContent);
        result = JSON.parse(fixedContent);
        console.log('Successfully fixed and parsed JSON');
      } catch (fixError) {
        console.error('Could not fix JSON:', fixError);
        throw new Error('La carta de vinos es muy extensa. Por favor fotografía solo una sección.');
      }
    }
    
    const extractedWines = result.vinos || [];

    console.log(`Extracted ${extractedWines.length} wines from menu`);

    // If user has a profile, enrich wines and estimate compatibility
    if (profile && extractedWines.length > 0) {
      console.log('User profile found, enriching wine data and estimating compatibility...');
      
      const compatibilityPrompt = `Tienes el perfil de preferencias de vino de un usuario:
- Potencia: ${profile.potente}/10
- Acidez: ${profile.acidez}/10
- Dulzura: ${profile.dulce}/10
- Taninos: ${profile.tanico}/10
- Afrutado: ${profile.afrutado}/10

Aquí está la lista de vinos de una carta de restaurante:
${JSON.stringify(extractedWines, null, 2)}

Para CADA vino en la lista:
1. ENRIQUECE la información del vino con datos reales (investiga online si es necesario):
   - Completa el productor si falta
   - Verifica y completa la región
   - Añade las variedades de uva principales
   - Añade una descripción detallada del vino (aromas, notas de cata, maridajes recomendados)
   
2. Estima sus atributos sensoriales (escala 1-10):
   - potencia
   - acidez
   - dulzura
   - taninos
   - afrutado
   
3. Calcula la compatibilidad con el perfil del usuario (0-100%)
4. Explica brevemente por qué es o no compatible

IMPORTANTE: Responde SOLO con JSON válido, sin markdown ni bloques de código.

{
  "vinos": [
    {
      "nombre": "nombre del vino",
      "productor": "nombre de la bodega",
      "region": "región verificada",
      "uvas": ["Tempranillo", "Garnacha"],
      "descripcion": "Descripción detallada del vino con aromas, notas de cata y maridajes",
      "atributos": {
        "potencia": 7,
        "acidez": 6,
        "dulzura": 3,
        "taninos": 7,
        "afrutado": 6
      },
      "compatibilidad": 75,
      "razon": "Este vino tiene características similares a tu perfil..."
    }
  ]
}`;

      const compatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            { role: 'user', content: compatibilityPrompt }
          ],
          max_tokens: 8192,
        }),
      });

      if (compatResponse.ok) {
        const compatData = await compatResponse.json();
        let compatContent = compatData.choices?.[0]?.message?.content || '{"vinos":[]}';
        
        console.log('Raw compatibility response (first 500 chars):', compatContent.substring(0, 500));
        
        // Clean JSON from markdown and code blocks more aggressively
        compatContent = compatContent
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        
        // Ensure we only have the JSON object
        const firstBrace = compatContent.indexOf('{');
        const lastBrace = compatContent.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          compatContent = compatContent.substring(firstBrace, lastBrace + 1);
        }
        
        let compatResult;
        try {
          compatResult = JSON.parse(compatContent);
          console.log('Successfully parsed compatibility JSON');
        } catch (parseError) {
          console.error('Compatibility JSON Parse Error:', parseError);
          console.error('Attempted to parse (first 1000 chars):', compatContent.substring(0, 1000));
          // Continue without compatibility data if parsing fails
          compatResult = { vinos: [] };
        }
        
        // Merge enriched data and compatibility with extracted wines
        const winesWithCompatibility = extractedWines.map((wine: any) => {
          const enrichedInfo = compatResult.vinos?.find(
            (c: any) => c.nombre.toLowerCase().trim() === wine.nombre.toLowerCase().trim()
          );
          
          if (enrichedInfo) {
            return {
              ...wine,
              productor: enrichedInfo.productor || wine.productor,
              region: enrichedInfo.region || wine.region,
              uvas: enrichedInfo.uvas || [],
              descripcion: enrichedInfo.descripcion || wine.descripcion,
              atributos: enrichedInfo.atributos || null,
              compatibilidad: enrichedInfo.compatibilidad || null,
              razon: enrichedInfo.razon || null
            };
          }
          
          return wine;
        });

        return new Response(
          JSON.stringify({ 
            vinos: winesWithCompatibility,
            has_profile: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Return wines without compatibility if no profile or AI call failed
    return new Response(
      JSON.stringify({ 
        vinos: extractedWines,
        has_profile: false
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scan-wine-menu:', error);
    return new Response(
      JSON.stringify({ error: error.message, vinos: [] }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});