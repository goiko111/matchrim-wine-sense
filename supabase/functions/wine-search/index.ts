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
  winery?: string;
  region?: string;
}

interface WineResult {
  nombre: string;
  bodega: string;
  tipo_de_uva: string;
  pais: string;
  region: string;
  puntuacion: number;
  url: string;
  imagen_url: string;
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
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Eres un sommelier experto que ayuda a usuarios a entender y disfrutar mejor los vinos. 

MISIÓN: Generar información ÚTIL y PRÁCTICA sobre los vinos que el usuario está buscando.

ESTRUCTURA (3-5 frases naturales y fluidas):
1. Contexto de los vinos: Características principales, regiones destacadas, estilos
2. Maridajes recomendados: Qué platos combinan perfectamente
3. Consejos prácticos: Temperatura de servicio, cuándo beberlos, cómo guardarlos
4. Dato curioso o interesante sobre la uva/región/estilo

TONO: Cercano, profesional pero no pretencioso, educativo
EVITA: Tecnicismos innecesarios, jerga compleja, información sobre "cómo buscamos"
ENFÓCATE: En ayudar al usuario a disfrutar mejor el vino

EJEMPLO:
Búsqueda: "malbec argentino"
❌ MAL: "He detectado 'malbec' como variedad y 'Argentina' como país. Priorizaré coincidencias exactas..."
✅ BIEN: "Los Malbec argentinos son vinos intensos y afrutados, principalmente de Mendoza, con notas de ciruela y chocolate. Perfectos para acompañar asados, carnes rojas y quesos curados. Sírvelos a 16-18°C y déjalos respirar 30 minutos antes. Dato curioso: El Malbec encontró en Argentina su mejor expresión, siendo más robusto que su versión francesa de Cahors."`
        },
        {
          role: 'user',
          content: `Genera información útil sobre esta búsqueda de vino:
Término: "${query}"
${filters.bodega !== 'cualquiera' ? `Bodega: ${filters.bodega}` : ''}
${filters.pais !== 'cualquiera' ? `País: ${filters.pais}` : ''}
${filters.uva !== 'cualquiera' ? `Uva: ${filters.uva}` : ''}
${filters.tipo !== 'cualquiera' ? `Tipo: ${filters.tipo}` : ''}
${filters.region !== 'cualquiera' ? `Región: ${filters.region}` : ''}`
        }
      ],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!response.ok) {
    console.error('Error calling AI Gateway:', await response.text());
    return `Explora nuestra selección de vinos que coinciden con "${query}". Descubre opciones perfectas para cualquier ocasión, desde cenas especiales hasta reuniones casuales.`;
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
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Eres un experto sommelier con acceso a una extensa base de datos de vinos internacionales. 

REGLA CRÍTICA DE COINCIDENCIA:
- SOLO devuelve vinos que REALMENTE coincidan con el término de búsqueda exacto
- Si buscas "Castillo de Ygay", SOLO devuelve variantes de Castillo de Ygay (diferentes añadas, tipos, etc.)
- NO devuelvas vinos "similares", "de la misma región" o "del mismo estilo"
- Si solo hay 1-2 vinos que coincidan exactamente, devuelve SOLO esos
- Mejor pocos resultados exactos que muchos resultados irrelevantes

IMPORTANTE - URLs DE IMÁGENES:
- SIEMPRE incluye el campo imagen_url para cada vino
- Genera URLs genéricas de placeholder en este formato: https://placehold.co/400x600/8B0000/FFFFFF/png?text={Nombre+Vino}
- Reemplaza espacios con + en el texto
- Ejemplo: "Castillo Ygay 2010" -> "https://placehold.co/400x600/8B0000/FFFFFF/png?text=Castillo+Ygay+2010"
- El color 8B0000 es un rojo vino elegante, FFFFFF es blanco para el texto
- NUNCA uses URLs de servicios externos que puedan dar error 410

INSTRUCCIONES:
- Genera entre 1 y 10 vinos reales que coincidan EXACTAMENTE con la búsqueda
- Usa SOLO vinos que existan realmente en el mercado
- Incluye información precisa: bodega real, uva(s), país, puntuación estimada
- Las puntuaciones deben ser realistas (70-100)
- Las URLs deben usar Wine-Searcher: https://www.wine-searcher.com/find/{nombre-del-vino-con-guiones}
- Responde SOLO con un array JSON válido, sin texto adicional

Formato de salida (array JSON):
[
  {
    "nombre": "Nombre del vino",
    "bodega": "Nombre de la bodega",
    "tipo_de_uva": "Uva(s) principal(es)",
    "pais": "País de origen",
    "region": "Región vitivinícola (ej: Rioja, Ribera del Duero, Napa Valley)",
    "puntuacion": 85,
    "url": "https://www.wine-searcher.com/find/nombre-del-vino-con-guiones",
    "imagen_url": "https://placehold.co/400x600/8B0000/FFFFFF/png?text=Nombre+del+Vino"
  }
]`
        },
        {
          role: 'user',
          content: `IMPORTANTE: Devuelve SOLO vinos que coincidan EXACTAMENTE con el término de búsqueda. NO incluyas vinos similares o de la misma categoría.

Búsqueda exacta: "${params.query}"
${params.country ? `País filtrado: ${params.country}` : ''}
${params.grape ? `Uva filtrada: ${params.grape}` : ''}
${params.type ? `Tipo filtrado: ${params.type}` : ''}
${params.winery ? `Bodega filtrada: ${params.winery}` : ''}
${params.region ? `Región filtrada: ${params.region}` : ''}

Genera entre 1 y 10 vinos reales que coincidan EXACTAMENTE. Responde SOLO con el array JSON.`
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
    region: wine.region || 'N/A',
    puntuacion: wine.rating ? Math.round(wine.rating * 20) : 75,
    url: `https://www.wine-searcher.com/find/${encodeURIComponent(wine.title.replace(/\s+/g, '-').toLowerCase())}`,
    imagen_url: wine.imageUrl || `https://images.vivino.com/thumbs/${encodeURIComponent(wine.title.replace(/\s+/g, '-').toLowerCase())}_1_600x600.png`,
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
      bodega: params.winery || 'cualquiera',
      region: params.region || 'cualquiera',
    };
    
    const razonamiento = await analyzeSearchQuery(params.query, filters);
    console.log('Reasoning generated:', razonamiento);

    // 2. Buscar vinos según el proveedor configurado
    let resultados: WineResult[] = [];
    let attempt = 0;
    const maxAttempts = 2;

    while (resultados.length < 1 && attempt < maxAttempts) {
      attempt++;
      console.log(`Search attempt ${attempt}`);

      try {
        if (WINE_API_PROVIDER === 'spoonacular' && WINE_API_KEY) {
          resultados = await searchWinesSpoonacular(params);
        } else {
          // Usar IA como método principal/fallback
          resultados = await searchWinesWithAI(params, razonamiento);
        }

        // Si no tenemos resultados y es el primer intento, relajar filtros
        if (resultados.length < 1 && attempt === 1) {
          console.log('No exact results found, search completed');
          break; // No relajar filtros, mejor devolver pocos resultados exactos
        }
      } catch (error: any) {
        console.error(`Error in attempt ${attempt}:`, error);
        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    // Limitar a máximo 10 resultados
    resultados = resultados.slice(0, 10);

    // Enriquecer con imágenes reales cuando sea posible
    const makePlaceholder = (name: string) =>
      `https://placehold.co/400x600/8B0000/FFFFFF/png?text=${encodeURIComponent(name || 'Vino')}`;

    const isValidImage = async (url?: string | null): Promise<boolean> => {
      if (!url) return false;
      try {
        const head = await fetch(url, { method: 'HEAD' });
        if (head.ok && (head.headers.get('content-type') || '').startsWith('image')) return true;
        // Algunos CDNs no soportan HEAD: probar GET con rango mínimo
        const getResp = await fetch(url, { headers: { Range: 'bytes=0-1024' } });
        return getResp.ok && (getResp.headers.get('content-type') || '').startsWith('image');
      } catch {
        return false;
      }
    };

    const getImageCandidatesAI = async (wine: WineResult): Promise<string[]> => {
      try {
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content:
                  'Devuelve SOLO un array JSON de URLs directas a imágenes (.jpg/.png/.webp) de alta calidad y públicas del vino indicado. Fuentes válidas: web oficial de la bodega, Vivino, Wine.com, TotalWine, Decántalo, El Corte Inglés, Laithwaites, Berry Bros. Prohíbe redirecciones HTML o páginas de producto; deben ser URLs directas a la imagen. Máximo 5.',
              },
              {
                role: 'user',
                content: `Vino: ${wine.nombre}\nBodega: ${wine.bodega}\nPaís: ${wine.pais}\nRegión: ${wine.region || ''}`,
              },
            ],
            temperature: 0.2,
            max_tokens: 400,
          }),
        });
        if (!resp.ok) return [];
        const data = await resp.json();
        const content: string = data.choices?.[0]?.message?.content || '[]';
        const match = content.match(/\[[\s\S]*\]/);
        const arr = JSON.parse(match ? match[0] : content);
        return Array.isArray(arr) ? arr.filter((u: any) => typeof u === 'string') : [];
      } catch {
        return [];
      }
    };

    for (const wine of resultados) {
      if (!(await isValidImage(wine.imagen_url))) {
        const candidates = await getImageCandidatesAI(wine);
        let chosen: string | null = null;
        for (const c of candidates) {
          if (await isValidImage(c)) { chosen = c; break; }
        }
        wine.imagen_url = chosen || makePlaceholder(wine.nombre);
      }
    }

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

  } catch (error: any) {
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
