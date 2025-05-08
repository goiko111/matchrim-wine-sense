import React from 'react';
import { Button } from "@/components/ui/button";
import { QuizResult, wines, calculateCompatibility } from '../data/quizData';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Copy, Wine } from 'lucide-react';
import { toast } from "@/hooks/use-toast";

interface QuizResultsProps {
  result: QuizResult;
  description: string;
  recommendations: string[];
  onRestart: () => void;
}

// Función para determinar el nombre Matchrim según el resultado
const generateMatchrimName = (result: QuizResult): string => {
  // Atributo dominante
  const attributes = [
    { name: "Potente", value: result.potente },
    { name: "Acidez", value: result.acidez },
    { name: "Dulce", value: result.dulce },
    { name: "Tánico", value: result.tanico },
    { name: "Afrutado", value: result.afrutado }
  ];
  
  // Ordenar por valor más alto
  attributes.sort((a, b) => b.value - a.value);
  
  // Primer nombre basado en el atributo dominante
  const firstNames: {[key: string]: string[]} = {
    "Potente": ["Garnacha", "Tempranillo", "Monastrell", "Malbec"],
    "Acidez": ["Albariño", "Godello", "Riesling", "Sauvignon"],
    "Dulce": ["Moscatel", "Pedro", "Malvasía", "Gewürztraminer"],
    "Tánico": ["Cabernet", "Syrah", "Mencía", "Nebbiolo"],
    "Afrutado": ["Merlot", "Pinot", "Verdejo", "Chardonnay"]
  };
  
  // Segundo nombre basado en el segundo atributo más dominante
  const lastNames: {[key: string]: string[]} = {
    "Potente": ["Roble", "Bravo", "Intenso", "Solar"],
    "Acidez": ["Fresco", "Vibrante", "Atlántico", "Luz"],
    "Dulce": ["Miel", "Ámbar", "Terciopelo", "Dorado"],
    "Tánico": ["Tierra", "Especia", "Fuego", "Noble"],
    "Afrutado": ["Jardín", "Aroma", "Primavera", "Velo"]
  };
  
  const firstName = firstNames[attributes[0].name][Math.floor(Math.random() * firstNames[attributes[0].name].length)];
  const lastName = lastNames[attributes[1].name][Math.floor(Math.random() * lastNames[attributes[1].name].length)];
  
  return `${firstName} ${lastName}`;
};

// Función para generar descripción emocional basada en el radar de atributos
const generateEmotionalDescription = (result: QuizResult): string => {
  let description = "";
  
  // Preferencia por potencia
  if (result.potente >= 4) {
    description += "Disfrutas vinos con personalidad y carácter, que dejan huella en el paladar. ";
  } else if (result.potente <= 2) {
    description += "Aprecias la elegancia y sutileza, vinos que no necesitan gritar para hacerse notar. ";
  }
  
  // Preferencia por acidez
  if (result.acidez >= 4) {
    description += "Tu paladar vibra con la frescura y vivacidad de vinos con buena acidez. ";
  } else if (result.acidez <= 2) {
    description += "Buscas vinos suaves, redondos, con equilibrio y amabilidad en boca. ";
  }
  
  // Preferencia por dulzor
  if (result.dulce >= 4) {
    description += "Disfrutas los matices dulces y la sensación envolvente que acaricia el paladar. ";
  } else if (result.dulce <= 2) {
    description += "Te atrae la sequedad y definición, vinos directos y precisos. ";
  }
  
  // Preferencia por taninos
  if (result.tanico >= 4) {
    description += "Te gusta la estructura tánica, vinos con cuerpo y capacidad de guarda. ";
  } else if (result.tanico <= 2) {
    description += "Prefieres vinos de tanino delicado, sin asperezas que distraigan. ";
  }
  
  // Preferencia por fruta
  if (result.afrutado >= 4) {
    description += "El perfil aromático frutal te conquista, vinos expresivos y de aromas intensos. ";
  } else if (result.afrutado <= 2) {
    description += "Te atraen más las notas minerales, especiadas y complejas que las puramente frutales. ";
  }
  
  return description;
};

// Función para generar recomendaciones de estilo de vino según la nueva tabla
const generateWineStyles = (result: QuizResult): string[] => {
  const styles = [];
  
  // Tabla de correspondencia según el nuevo documento
  const styleRecommendations = [
    { name: "Vinos blancos frescos y ligeros", criteria: { acidez: 4, afrutado: 3, potente: 0, dulce: 0, tanico: 0 } },
    { name: "Vinos blancos aromáticos", criteria: { acidez: 3, afrutado: 4, potente: 0, dulce: 0, tanico: 0 } },
    { name: "Vinos blancos con volumen", criteria: { acidez: 2, potente: 3, dulce: 0, tanico: 0, afrutado: 3 } },
    { name: "Vinos blancos dulces", criteria: { dulce: 4, acidez: 3, potente: 0, tanico: 0, afrutado: 4 } },
    { name: "Vinos rosados frescos", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 0, tanico: 1 } },
    { name: "Vinos tintos ligeros", criteria: { potente: 2, tanico: 2, acidez: 3, dulce: 0, afrutado: 4 } },
    { name: "Vinos tintos con cuerpo medio", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 0, afrutado: 3 } },
    { name: "Vinos tintos potentes", criteria: { potente: 4, tanico: 4, acidez: 2, dulce: 0, afrutado: 3 } },
    { name: "Vinos tintos maduros", criteria: { potente: 4, tanico: 3, acidez: 2, dulce: 2, afrutado: 3 } },
    { name: "Vinos espumosos", criteria: { acidez: 4, afrutado: 3, potente: 2, dulce: 0, tanico: 0 } }
  ];

  // Calcular la compatibilidad con cada estilo
  const compatibilityScores = styleRecommendations.map(style => {
    const score = calculateCompatibilityForStyle(result, style.criteria);
    return { name: style.name, score };
  });
  
  // Ordenar por puntuación y tomar los 3 mejores
  compatibilityScores.sort((a, b) => b.score - a.score);
  return compatibilityScores.slice(0, 3).map(style => style.name);
};

// Función para calcular la compatibilidad para estilos específicamente
const calculateCompatibilityForStyle = (result: QuizResult, criteria: any): number => {
  let score = 0;
  let relevantFactors = 0;
  
  // Solo considerar los factores que tienen un valor > 0 en el criterio
  Object.keys(criteria).forEach(factor => {
    if (criteria[factor] > 0) {
      const key = factor as keyof QuizResult;
      const factorWeight = criteria[factor];
      const similarity = 5 - Math.abs(result[key] - factorWeight);
      score += similarity * factorWeight;
      relevantFactors += factorWeight;
    }
  });
  
  // Normalizar la puntuación
  return relevantFactors > 0 ? score / relevantFactors : 0;
};

// Función para generar uvas recomendadas según la nueva tabla
const generateGrapeRecommendations = (result: QuizResult): string[] => {
  // Tabla de correspondencia según el nuevo documento
  const grapeRecommendations = [
    // Uvas blancas frescas
    { name: "Albariño", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Verdejo", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Sauvignon Blanc", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Godello", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Riesling", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 2, tanico: 1 } },
    
    // Uvas blancas aromáticas
    { name: "Gewürztraminer", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 3, tanico: 1 } },
    { name: "Moscatel", criteria: { acidez: 3, afrutado: 5, potente: 2, dulce: 4, tanico: 1 } },
    { name: "Viognier", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 2, tanico: 1 } },
    
    // Uvas blancas con volumen
    { name: "Chardonnay", criteria: { acidez: 3, afrutado: 3, potente: 4, dulce: 2, tanico: 1 } },
    { name: "Garnacha Blanca", criteria: { acidez: 3, afrutado: 3, potente: 4, dulce: 2, tanico: 2 } },
    { name: "Chenin Blanc", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    
    // Uvas tintas ligeras
    { name: "Pinot Noir", criteria: { potente: 3, tanico: 2, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Gamay", criteria: { potente: 2, tanico: 2, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Mencía", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    
    // Uvas tintas con cuerpo medio
    { name: "Tempranillo", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Garnacha", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 3, afrutado: 4 } },
    { name: "Merlot", criteria: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 4 } },
    { name: "Sangiovese", criteria: { potente: 3, tanico: 4, acidez: 4, dulce: 2, afrutado: 3 } },
    
    // Uvas tintas potentes
    { name: "Cabernet Sauvignon", criteria: { potente: 4, tanico: 5, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Syrah", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Monastrell", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Petit Verdot", criteria: { potente: 5, tanico: 5, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Malbec", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 3, afrutado: 4 } }
  ];

  // Calcular la compatibilidad con cada uva
  const compatibilityScores = grapeRecommendations.map(grape => {
    const score = calculateCompatibilityForGrape(result, grape.criteria);
    return { name: grape.name, score };
  });
  
  // Ordenar por puntuación
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  // Tomar el top 40% de las uvas
  const topGrapes = compatibilityScores.slice(0, Math.ceil(compatibilityScores.length * 0.4));
  
  // Seleccionar 6 uvas aleatorias de entre las mejores
  return shuffleArray(topGrapes).slice(0, 6).map(grape => grape.name);
};

// Función para generar regiones recomendadas según la nueva tabla
const generateRegionRecommendations = (result: QuizResult): string[] => {
  // Tabla de correspondencia según el nuevo documento
  const regionRecommendations = [
    // Regiones de blancos frescos
    { name: "Rías Baixas", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Rueda", criteria: { acidez: 4, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Txakoli", criteria: { acidez: 5, afrutado: 3, potente: 2, dulce: 1, tanico: 1 } },
    { name: "Mosel (Alemania)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 2, tanico: 1 } },
    { name: "Sancerre (Francia)", criteria: { acidez: 5, afrutado: 4, potente: 2, dulce: 1, tanico: 1 } },
    
    // Regiones de blancos con volumen
    { name: "Valdeorras", criteria: { acidez: 4, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Penedès", criteria: { acidez: 3, afrutado: 3, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Borgoña (Francia)", criteria: { acidez: 4, afrutado: 3, potente: 4, dulce: 2, tanico: 1 } },
    
    // Regiones de blancos aromáticos
    { name: "Somontano", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 2, tanico: 1 } },
    { name: "Alsacia (Francia)", criteria: { acidez: 3, afrutado: 5, potente: 3, dulce: 3, tanico: 1 } },
    
    // Regiones de dulces
    { name: "Jerez", criteria: { acidez: 3, afrutado: 4, potente: 4, dulce: 4, tanico: 1 } },
    { name: "Málaga", criteria: { acidez: 3, afrutado: 4, potente: 3, dulce: 5, tanico: 1 } },
    { name: "Tokaj (Hungría)", criteria: { acidez: 4, afrutado: 4, potente: 3, dulce: 5, tanico: 1 } },
    
    // Regiones de tintos ligeros
    { name: "Bierzo", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Ribeira Sacra", criteria: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Borgoña (Francia)", criteria: { potente: 3, tanico: 2, acidez: 4, dulce: 2, afrutado: 4 } },
    
    // Regiones de tintos con cuerpo medio
    { name: "Rioja", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Ribera del Duero", criteria: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Toro", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Navarra", criteria: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    
    // Regiones de tintos potentes
    { name: "Priorat", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Jumilla", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Toro", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Napa Valley (USA)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } },
    { name: "Barossa Valley (Australia)", criteria: { potente: 5, tanico: 4, acidez: 3, dulce: 3, afrutado: 3 } }
  ];

  // Calcular la compatibilidad con cada región
  const compatibilityScores = regionRecommendations.map(region => {
    const score = calculateCompatibilityForRegion(result, region.criteria);
    return { name: region.name, score };
  });
  
  // Ordenar por puntuación
  compatibilityScores.sort((a, b) => b.score - a.score);
  
  // Tomar el top 40% de las regiones
  const topRegions = compatibilityScores.slice(0, Math.ceil(compatibilityScores.length * 0.4));
  
  // Seleccionar 6 regiones aleatorias de entre las mejores, asegurando que no haya duplicados
  const selectedRegions = new Set<string>();
  const shuffledTopRegions = shuffleArray(topRegions);
  
  // Seguir añadiendo regiones hasta tener 6 o hasta agotar las opciones
  for (const region of shuffledTopRegions) {
    selectedRegions.add(region.name);
    if (selectedRegions.size >= 6) break;
  }
  
  // Convertir el Set a array
  return Array.from(selectedRegions);
};

// Función para calcular compatibilidad para uvas
const calculateCompatibilityForGrape = (result: QuizResult, criteria: any): number => {
  let score = 0;
  
  score += (5 - Math.abs(result.potente - criteria.potente)) * 2;
  score += (5 - Math.abs(result.acidez - criteria.acidez)) * 2;
  score += (5 - Math.abs(result.dulce - criteria.dulce)) * 2;
  score += (5 - Math.abs(result.tanico - criteria.tanico)) * 2;
  score += (5 - Math.abs(result.afrutado - criteria.afrutado)) * 2;
  
  return score;
};

// Función para calcular compatibilidad para regiones
const calculateCompatibilityForRegion = (result: QuizResult, criteria: any): number => {
  let score = 0;
  
  score += (5 - Math.abs(result.potente - criteria.potente)) * 2;
  score += (5 - Math.abs(result.acidez - criteria.acidez)) * 2;
  score += (5 - Math.abs(result.dulce - criteria.dulce)) * 2;
  score += (5 - Math.abs(result.tanico - criteria.tanico)) * 2;
  score += (5 - Math.abs(result.afrutado - criteria.afrutado)) * 2;
  
  return score;
};

// Función para mezclar un array (algoritmo de Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Función para generar recomendaciones de vinos específicos directamente desde la lista de vinos importada
const generateSpecificWines = (result: QuizResult): string[] => {
  // Prepare all wines with their compatibility scores
  const winesWithCompatibility = wines.map(wine => {
    const score = calculateCompatibility(result, wine.profile);
    return { 
      name: wine.name, 
      score, 
      origin: wine.origin, 
      type: wine.type,
      price: wine.price 
    };
  });
  
  // Sort by compatibility score (highest first)
  winesWithCompatibility.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Get the threshold score (70% of the max score)
  const maxScore = winesWithCompatibility[0].score || 0;
  const threshold = maxScore * 0.7;
  
  // Filter wines that are above the threshold (good matches)
  const goodMatches = winesWithCompatibility.filter(wine => (wine.score || 0) >= threshold);
  
  // If we have too few good matches, add more
  const matchPool = goodMatches.length >= 8 ? goodMatches : winesWithCompatibility.slice(0, Math.max(goodMatches.length, 12));
  
  // Shuffle the good matches to add randomness
  const shuffled = [...matchPool].sort(() => 0.5 - Math.random());
  
  // Select 5 wines from the shuffled list
  const selectedWines = shuffled.slice(0, 5);
  
  // Format the wine names with origin if available
  return selectedWines.map(wine => {
    let text = wine.name;
    
    // Add origin if available
    if (wine.origin) {
      text += ` (${wine.origin})`;
    }
    
    // Add price if available
    if (wine.price) {
      text += ` - ${wine.price}`;
    }
    
    return text;
  });
};

const QuizResults: React.FC<QuizResultsProps> = ({ result, description, recommendations, onRestart }) => {
  const chartData = [
    { attribute: "Potente", value: result.potente },
    { attribute: "Acidez", value: result.acidez },
    { attribute: "Dulce", value: result.dulce },
    { attribute: "Tánico", value: result.tanico },
    { attribute: "Afrutado", value: result.afrutado },
  ];
  
  const chartConfig = {
    radar: {
      label: "Radar",
      theme: {
        light: "#be123c",
        dark: "#be123c",
      },
    },
  };
  
  // Generar datos personalizados
  const profileName = generateMatchrimName(result);
  const emotionalDescription = generateEmotionalDescription(result);
  const wineStyles = generateWineStyles(result);
  const recommendedGrapes = generateGrapeRecommendations(result);
  const recommendedRegions = generateRegionRecommendations(result);

  // Función para copiar el perfil al portapapeles
  const copyProfileToClipboard = () => {
    navigator.clipboard.writeText(profileName);
    toast({
      title: "¡Perfil copiado!",
      description: `Tu perfil ${profileName} está listo para usar en Winerim.`,
    });
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md mb-8">
        <div className="flex items-center justify-center mb-8">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 flex items-center justify-center bg-red-100 rounded-full mb-2">
              <img 
                src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" 
                alt="Logo Winerim" 
                className="h-12 w-12"
              />
            </div>
            <h2 className="text-3xl font-bold text-red-900">Resultados de tu perfil</h2>
          </div>
        </div>
        
        <div className="border-b border-red-200 pb-6 mb-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-red-800 mb-2">
              🎉 Tu perfil sensorial es:
            </h3>
            <div className="inline-flex items-center gap-2 bg-red-50 px-4 py-2 rounded-lg">
              <span className="text-xl font-semibold text-red-900">{profileName}</span>
              <button 
                onClick={copyProfileToClipboard} 
                className="text-red-600 hover:text-red-800 transition-colors"
                aria-label="Copiar perfil"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-red-50/50 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
              <span className="text-2xl">🧭</span> Tu estilo de vino
            </h3>
            <p className="text-gray-700 mb-6">{emotionalDescription}</p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-red-700 mb-2">Estilo de vino:</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {wineStyles.map((style, index) => (
                    <li key={index}>{style}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-red-700 mb-2">Uvas que deberías probar:</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendedGrapes.map((grape, index) => (
                    <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                      {grape}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-red-700 mb-2">Regiones que van contigo:</h4>
                <div className="flex flex-wrap gap-2">
                  {recommendedRegions.map((region, index) => (
                    <span key={index} className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                      {region}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="h-80">
            <h3 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">🍷</span> Tu radar sensorial
            </h3>
            <ChartContainer config={chartConfig}>
              <RadarChart outerRadius={90} data={chartData}>
                <PolarGrid stroke="#be123c33" />
                <PolarAngleAxis dataKey="attribute" tick={{ fill: '#be123c' }} />
                <PolarRadiusAxis domain={[1, 5]} stroke="#be123c" />
                <Radar 
                  name="Perfil" 
                  dataKey="value" 
                  stroke="#be123c" 
                  fill="#be123c" 
                  fillOpacity={0.6} 
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </div>
        </div>
        
        <div className="border-t border-red-200 pt-6 mb-6">
          <h3 className="text-xl font-semibold text-red-800 flex items-center gap-2 mb-4">
            <span className="text-2xl">🔎</span> Vinos que te encantarán
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((wine, index) => (
              <div key={index} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0">
                    <Wine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{wine}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-red-50 p-5 rounded-lg border border-red-200 mt-8">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h4 className="font-medium text-red-800 mb-2">Tip del sumiller:</h4>
              <p className="text-gray-700">
                Guarda tu perfil <span className="font-semibold text-red-700">{profileName}</span> y, 
                cuando estés en un restaurante con Winerim, introdúcelo para recibir solo los vinos 
                que encajan contigo.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-center gap-4">
        <Button 
          onClick={onRestart}
          className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2"
        >
          Reiniciar Test
        </Button>
      </div>
    </div>
  );
};

export default QuizResults;
