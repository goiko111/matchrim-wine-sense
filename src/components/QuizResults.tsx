
import React from 'react';
import { Button } from "@/components/ui/button";
import { QuizResult } from '../data/quizData';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Copy, ChevronRight } from 'lucide-react';
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

// Función para generar recomendaciones de estilo de vino
const generateWineStyles = (result: QuizResult): string[] => {
  const styles = [];
  
  if (result.potente >= 4 && result.tanico >= 3) {
    styles.push("Tintos con cuerpo y estructura");
  }
  
  if (result.acidez >= 4 && result.afrutado >= 3) {
    styles.push("Blancos frescos y aromáticos");
  }
  
  if (result.dulce >= 4) {
    styles.push("Vinos con cierta dulzura");
  }
  
  if (result.tanico >= 4 && result.afrutado <= 2) {
    styles.push("Tintos de guarda con complejidad");
  }
  
  if (result.acidez >= 4 && result.potente <= 2) {
    styles.push("Espumosos secos y vibrantes");
  }
  
  // Asegurar que siempre haya al menos una recomendación
  if (styles.length === 0) {
    styles.push("Vinos equilibrados de carácter medio");
  }
  
  return styles;
};

// Función para generar uvas recomendadas
const generateGrapeRecommendations = (result: QuizResult): string[] => {
  const grapes = [];
  
  // Uvas para perfiles potentes y tánicos
  if (result.potente >= 4 && result.tanico >= 3) {
    grapes.push("Tempranillo", "Cabernet Sauvignon", "Syrah");
  }
  
  // Uvas para perfiles ácidos y afrutados
  if (result.acidez >= 3 && result.afrutado >= 3) {
    grapes.push("Albariño", "Verdejo", "Sauvignon Blanc");
  }
  
  // Uvas para perfiles dulces
  if (result.dulce >= 3) {
    grapes.push("Moscatel", "Pedro Ximénez", "Gewürztraminer");
  }
  
  // Uvas para perfiles tánicos
  if (result.tanico >= 4 && result.afrutado <= 3) {
    grapes.push("Mencía", "Nebbiolo", "Tinta de Toro");
  }
  
  // Uvas para perfiles frescos
  if (result.acidez >= 4 && result.potente <= 3) {
    grapes.push("Godello", "Riesling", "Chardonnay");
  }
  
  // Asegurar que haya al menos tres uvas
  const defaultGrapes = ["Garnacha", "Merlot", "Tempranillo", "Verdejo", "Chardonnay"];
  while (grapes.length < 3) {
    const randomGrape = defaultGrapes[Math.floor(Math.random() * defaultGrapes.length)];
    if (!grapes.includes(randomGrape)) {
      grapes.push(randomGrape);
    }
  }
  
  return grapes.slice(0, 5); // Máximo 5 uvas
};

// Función para generar regiones recomendadas
const generateRegionRecommendations = (result: QuizResult): string[] => {
  const regions = [];
  
  // Regiones para perfiles potentes y tánicos
  if (result.potente >= 4 && result.tanico >= 3) {
    regions.push("Ribera del Duero", "Toro", "Priorat");
  }
  
  // Regiones para perfiles ácidos y afrutados
  if (result.acidez >= 3 && result.afrutado >= 3) {
    regions.push("Rías Baixas", "Rueda", "Bierzo");
  }
  
  // Regiones para perfiles dulces
  if (result.dulce >= 3) {
    regions.push("Jerez", "Montilla-Moriles", "Alsacia");
  }
  
  // Regiones para perfiles tánicos
  if (result.tanico >= 4 && result.afrutado <= 3) {
    regions.push("Rioja", "Piamonte", "Burdeos");
  }
  
  // Regiones para perfiles frescos
  if (result.acidez >= 4 && result.potente <= 3) {
    regions.push("Valdeorras", "Mosel", "Chablis");
  }
  
  // Asegurar que haya al menos tres regiones
  const defaultRegions = ["Rioja", "Ribera del Duero", "Rueda", "Penedès", "Navarra"];
  while (regions.length < 3) {
    const randomRegion = defaultRegions[Math.floor(Math.random() * defaultRegions.length)];
    if (!regions.includes(randomRegion)) {
      regions.push(randomRegion);
    }
  }
  
  return regions.slice(0, 5); // Máximo 5 regiones
};

// Función para generar recomendaciones de vinos específicos
const generateSpecificWines = (result: QuizResult): string[] => {
  // Define a wine type with compatibility property
  interface Wine {
    name: string;
    profile: {
      potente: number;
      tanico: number;
      acidez: number;
      dulce: number;
      afrutado: number;
    };
    compatibility?: number; // Make compatibility optional with '?'
  }

  const allWines: Wine[] = [
    // Potentes y tánicos
    { name: "Matarromera Crianza (Ribera del Duero)", profile: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Pago de los Capellanes Crianza (Ribera del Duero)", profile: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Emilio Moro (Ribera del Duero)", profile: { potente: 5, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Marqués de Murrieta Reserva (Rioja)", profile: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 2 } },
    { name: "Muga Reserva (Rioja)", profile: { potente: 4, tanico: 4, acidez: 3, dulce: 2, afrutado: 3 } },
    
    // Frescos y afrutados
    { name: "Terras Gauda (Rías Baixas)", profile: { potente: 2, tanico: 1, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Pazo de Señorans (Rías Baixas)", profile: { potente: 2, tanico: 1, acidez: 5, dulce: 2, afrutado: 4 } },
    { name: "José Pariente Verdejo (Rueda)", profile: { potente: 3, tanico: 1, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Protos Verdejo (Rueda)", profile: { potente: 2, tanico: 1, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "Menade Sauvignon Blanc (Rueda)", profile: { potente: 3, tanico: 1, acidez: 5, dulce: 2, afrutado: 5 } },
    
    // Dulces
    { name: "Pedro Ximénez Tradición (Jerez)", profile: { potente: 4, tanico: 1, acidez: 3, dulce: 5, afrutado: 4 } },
    { name: "Lustau Pedro Ximénez San Emilio (Jerez)", profile: { potente: 4, tanico: 1, acidez: 3, dulce: 5, afrutado: 4 } },
    { name: "Jorge Ordoñez Nº 1 Selección Especial (Málaga)", profile: { potente: 3, tanico: 1, acidez: 3, dulce: 5, afrutado: 5 } },
    { name: "Gewürztraminer Viñas del Vero (Somontano)", profile: { potente: 3, tanico: 1, acidez: 3, dulce: 4, afrutado: 5 } },
    { name: "Moscatel Torres (Penedès)", profile: { potente: 3, tanico: 1, acidez: 3, dulce: 5, afrutado: 5 } },
    
    // Equilibrados
    { name: "Viña Ardanza Reserva (Rioja)", profile: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Ramón Bilbao Crianza (Rioja)", profile: { potente: 3, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Abadía Retuerta Selección Especial (Castilla y León)", profile: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Carmelo Rodero Crianza (Ribera del Duero)", profile: { potente: 4, tanico: 3, acidez: 3, dulce: 2, afrutado: 3 } },
    { name: "Godelia Mencía (Bierzo)", profile: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    
    // Más frescos
    { name: "Godeval Godello (Valdeorras)", profile: { potente: 3, tanico: 1, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "As Sortes Val de Paxariñas (Valdeorras)", profile: { potente: 3, tanico: 1, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "Belondrade y Lurton (Rueda)", profile: { potente: 3, tanico: 1, acidez: 4, dulce: 2, afrutado: 3 } },
    { name: "Dominio do Bibei Lalama (Ribeira Sacra)", profile: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } },
    { name: "La Montesa (Rioja)", profile: { potente: 3, tanico: 3, acidez: 4, dulce: 2, afrutado: 4 } }
  ];
  
  // Función para calcular compatibilidad entre perfiles
  const calculateCompatibility = (userProfile: QuizResult, wineProfile: any): number => {
    let score = 0;
    score += (5 - Math.abs(userProfile.potente - wineProfile.potente)) * 2;
    score += (5 - Math.abs(userProfile.acidez - wineProfile.acidez)) * 2;
    score += (5 - Math.abs(userProfile.dulce - wineProfile.dulce)) * 2;
    score += (5 - Math.abs(userProfile.tanico - wineProfile.tanico)) * 2;
    score += (5 - Math.abs(userProfile.afrutado - wineProfile.afrutado)) * 2;
    return score;
  };
  
  // Ordenar vinos por compatibilidad
  const winesWithCompatibility = allWines.map(wine => {
    return {
      ...wine,
      compatibility: calculateCompatibility(result, wine.profile)
    };
  });
  
  winesWithCompatibility.sort((a, b) => b.compatibility! - a.compatibility!); // Use non-null assertion
  
  // Devolver los 5 mejores
  return winesWithCompatibility.slice(0, 5).map(wine => wine.name);
};

const QuizResults: React.FC<QuizResultsProps> = ({ result, onRestart }) => {
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
  const specificWines = generateSpecificWines(result);
  
  // Logo de Winerim
  const winerimLogo = "/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png";

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
                src={winerimLogo} 
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
            <span className="text-2xl">🔎</span> Vinos que te encantarán (menos de 100€)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specificWines.map((wine, index) => (
              <div key={index} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0">
                    <span className="text-sm font-bold">{index + 1}</span>
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
          <img 
            src={winerimLogo} 
            alt="Logo Winerim" 
            className="h-4 w-4"
          />
          Reiniciar Test
        </Button>
        
        <div className="mt-2 flex justify-center">
          <img 
            src={winerimLogo}
            alt="Logo Winerim" 
            className="h-12 w-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default QuizResults;
