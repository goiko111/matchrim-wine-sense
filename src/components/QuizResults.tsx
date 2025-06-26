import React from 'react';
import { Button } from "@/components/ui/button";
import { QuizResult, calculateCompatibility } from '../data/quizData';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Copy, Wine } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import { 
  generateMatchrimName, 
  generateWineStyles, 
  generateGrapeRecommendations, 
  generateRegionRecommendations 
} from '@/utils/profileUtils';

interface QuizResultsProps {
  result: QuizResult;
  description: string;
  recommendations: string[];
  onRestart: () => void;
}

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
  
  // Generar datos personalizados usando las funciones consistentes
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

  // Organize recommendations into Spanish and International sections
  const spanishWines = recommendations.filter(wine => wine.includes("España"));
  const internationalWines = recommendations.filter(wine => !wine.includes("España"));

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
          
          <div className="mb-4">
            <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
              <span className="emoji">🇪🇸</span> España
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {spanishWines.map((wine, index) => {
                const parts = wine.split(", ");
                const name = parts[0];
                const type = parts[1] || "";
                const winery = parts[2] || "";
                const region = parts[3] || "";
                const country = parts[4] || "";
                
                return (
                  <div key={index} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0">
                        <Wine className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{name}</p>
                        <p className="text-sm text-gray-600">{type}</p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Bodega:</span> {winery}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Región:</span> {region}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">País:</span> {country}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
              <span className="emoji">🌎</span> Internacional
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {internationalWines.map((wine, index) => {
                const parts = wine.split(", ");
                const name = parts[0];
                const type = parts[1] || "";
                const winery = parts[2] || "";
                const region = parts[3] || "";
                const country = parts[4] || "";
                
                return (
                  <div key={index} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-red-100 rounded-full p-2 text-red-700 flex-shrink-0">
                        <Wine className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{name}</p>
                        <p className="text-sm text-gray-600">{type}</p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Bodega:</span> {winery}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Región:</span> {region}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">País:</span> {country}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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
