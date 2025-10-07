import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuración de proveedores de APIs
const WINE_API_PROVIDER = Deno.env.get('WINE_API_PROVIDER') || 'ai';
const WINE_API_KEY = Deno.env.get('WINE_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

interface WineSearchParams {
  query: string;
  country?: string;
  grape?: string;
  type?: string;
}

interface WineResult {
  nombre: string;
  bodega: string;
  tipo_de_uva: string;
  pais: string;
  puntuacion: number;
  url: string;
}

interface SearchResponse {
  razonamiento: string;
  resultados: WineResult[];
}

async function analyzeSearchQuery(query: string, filters: any): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'system',
          content: `Eres un experto enólogo y asistente de búsqueda de vinos. Analiza las consultas de búsqueda de vinos en español y explica tu razonamiento de forma clara y concisa.

INSTRUCCIONES:
- Analiza el término de búsqueda e identifica: uvas, país/región, bodegas, año, tipo de vino
- Explica en 2-5 frases cómo interpretaste la búsqueda y qué estrategia usarás
- Sé claro, profesional y útil
- Responde SOLO el razonamiento, sin los resultados`
        },
        {
          role: 'user',
          content: `Analiza esta búsqueda de vino:
Término: "${query}"
Filtros aplicados: ${JSON.stringify(filters)}

Proporciona un razonamiento claro de cómo interpretarás esta búsqueda.`
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    console.error('Error calling AI Gateway:', await response.text());
    return `Búsqueda de: "${query}". Aplicando filtros disponibles y priorizando coincidencias exactas con puntuaciones altas.`;
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function searchWinesWithAI(params: WineSearchParams, reasoning: string): Promise<WineResult[]> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp',
      messages: [
        {
          role: 'system',
          content: `Eres un experto sommelier con acceso a una extensa base de datos de vinos internacionales. 
          
INSTRUCCIONES CRÍTICAS:
- Genera entre 3 y 10 vinos reales que coincidan con la búsqueda
- Usa SOLO vinos que existan realmente en el mercado
- Incluye información precisa: bodega real, uva(s), país, puntuación estimada
- Las puntuaciones deben ser realistas (70-100)
- Las URLs deben seguir el formato: https://www.vivino.com/search/wines?q={nombre-del-vino}
- Responde SOLO con un array JSON válido, sin texto adicional

Formato de salida (array JSON):
[
  {
    "nombre": "Nombre del vino",
    "bodega": "Nombre de la bodega",
    "tipo_de_uva": "Uva(s) principal(es)",
    "pais": "País de origen",
    "puntuacion": 85,
    "url": "https://www.vivino.com/search/wines?q=nombre-del-vino"
  }
]`
        },
        {
          role: 'user',
          content: `Basándote en este razonamiento: "${reasoning}"

Búsqueda: "${params.query}"
${params.country ? `País filtrado: ${params.country}` : ''}
${params.grape ? `Uva filtrada: ${params.grape}` : ''}
${params.type ? `Tipo filtrado: ${params.type}` : ''}

Genera entre 3 y 10 vinos reales que coincidan. Responde SOLO con el array JSON.`
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error('Error al buscar vinos con IA');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  // Extraer JSON del contenido (por si viene con markdown)
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No se pudo parsear la respuesta de IA');
  }
  
  return JSON.parse(jsonMatch[0]);
}

async function searchWinesSpoonacular(params: WineSearchParams): Promise<WineResult[]> {
  if (!WINE_API_KEY) {
    throw new Error('API key no configurada para Spoonacular');
  }

  const queryParams = new URLSearchParams({
    query: params.query,
    number: '10',
  });

  const response = await fetch(
    `https://api.spoonacular.com/food/wine/recommendation?${queryParams}`,
    {
      headers: {
        'x-api-key': WINE_API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Error al consultar Spoonacular API');
  }

  const data = await response.json();
  
  // Normalizar respuesta de Spoonacular
  return (data.recommendedWines || []).slice(0, 10).map((wine: any) => ({
    nombre: wine.title || 'Sin nombre',
    bodega: wine.winery || 'Desconocida',
    tipo_de_uva: wine.grape || 'N/A',
    pais: wine.country || 'N/A',
    puntuacion: wine.rating ? Math.round(wine.rating * 20) : 75,
    url: wine.link || `https://www.vivino.com/search/wines?q=${encodeURIComponent(wine.title)}`,
  }));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const params: WineSearchParams = await req.json();
    
    console.log('Wine search request:', params);

    if (!params.query || params.query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'El término de búsqueda es obligatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Generar razonamiento
    const filters = {
      pais: params.country || 'cualquiera',
      uva: params.grape || 'cualquiera',
      tipo: params.type || 'cualquiera',
    };
    
    const razonamiento = await analyzeSearchQuery(params.query, filters);
    console.log('Reasoning generated:', razonamiento);

    // 2. Buscar vinos según el proveedor configurado
    let resultados: WineResult[] = [];
    let attempt = 0;
    const maxAttempts = 2;

    while (resultados.length < 3 && attempt < maxAttempts) {
      attempt++;
      console.log(`Search attempt ${attempt}`);

      try {
        if (WINE_API_PROVIDER === 'spoonacular' && WINE_API_KEY) {
          resultados = await searchWinesSpoonacular(params);
        } else {
          // Usar IA como método principal/fallback
          resultados = await searchWinesWithAI(params, razonamiento);
        }

        // Si tenemos pocos resultados y es el primer intento, relajar filtros
        if (resultados.length < 3 && attempt === 1) {
          console.log('Few results, retrying with relaxed filters');
          // En el segundo intento, quitar algunos filtros
          const relaxedParams = {
            ...params,
            country: undefined,
            type: undefined,
          };
          
          if (WINE_API_PROVIDER === 'spoonacular' && WINE_API_KEY) {
            resultados = await searchWinesSpoonacular(relaxedParams);
          } else {
            resultados = await searchWinesWithAI(relaxedParams, 
              razonamiento + ' (búsqueda ampliada sin filtros de país y tipo)');
          }
        }
      } catch (error) {
        console.error(`Error in attempt ${attempt}:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    // Limitar a máximo 10 resultados
    resultados = resultados.slice(0, 10);

    const response: SearchResponse = {
      razonamiento,
      resultados,
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in wine-search function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Error al buscar vinos',
        details: error.message,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
