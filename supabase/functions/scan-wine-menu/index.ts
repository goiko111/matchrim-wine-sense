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
                image_url: { url: pdf || image }
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

    // If user has a profile, estimate compatibility for each wine
    if (profile && extractedWines.length > 0) {
      // Use AI to estimate sensory attributes and calculate compatibility
      const compatibilityPrompt = `Eres un sommelier experto. Dado este perfil de preferencias del usuario y esta lista de vinos, estima los atributos sensoriales de cada vino y calcula la compatibilidad.

Perfil del usuario (escala 1-10):
- Potencia: ${profile.potente}
- Acidez: ${profile.acidez}
- Dulzura: ${profile.dulce}
- Taninos: ${profile.tanico}
- Afrutado: ${profile.afrutado}

Vinos:
${JSON.stringify(extractedWines, null, 2)}

Para cada vino, estima sus atributos sensoriales (1-10) basándote en:
- Tipo de vino (tinto/blanco/rosado)
- Región y país (estilos regionales conocidos)
- Año de cosecha (vinos jóvenes vs reservas)
- Descripción si está disponible

Luego calcula compatibilidad (0-100%) comparando con las preferencias del usuario.

Responde SOLO con JSON:
{
  "vinos": [
    {
      "nombre": "...",
      "atributos": {
        "potencia": 8,
        "acidez": 6,
        "dulzura": 2,
        "taninos": 7,
        "afrutado": 6
      },
      "compatibilidad": 85,
      "razon": "Alta potencia y taninos como prefieres. Moderada acidez y afrutado."
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
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'user', content: compatibilityPrompt }
          ],
          max_tokens: 4096,
        }),
      });

      if (compatResponse.ok) {
        const compatData = await compatResponse.json();
        let compatContent = compatData.choices?.[0]?.message?.content || '{"vinos":[]}';
        compatContent = compatContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        let compatResult;
        try {
          compatResult = JSON.parse(compatContent);
        } catch (parseError) {
          console.error('Compatibility JSON Parse Error:', parseError);
          console.error('Compatibility content that failed:', compatContent);
          // Continue without compatibility data if parsing fails
          compatResult = { vinos: [] };
        }
        
        // Merge compatibility data with extracted wines
        const winesWithCompatibility = extractedWines.map((wine: any, index: number) => {
          const compatData = compatResult.vinos?.[index] || {};
          return {
            ...wine,
            atributos: compatData.atributos || null,
            compatibilidad: compatData.compatibilidad || null,
            razon: compatData.razon || null
          };
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