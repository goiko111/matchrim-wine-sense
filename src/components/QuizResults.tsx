import React from 'react';
import { Button } from "@/components/ui/button";
import { QuizResult } from '../data/quizData';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Heart, ChartPie } from 'lucide-react';

interface QuizResultsProps {
  result: QuizResult;
  description: string;
  recommendations: string[];
  onRestart: () => void;
}

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

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md mb-8">
        <div className="flex items-center justify-center mb-6">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 flex items-center justify-center bg-red-100 rounded-full mb-2">
              <Heart className="h-12 w-12 text-red-700" />
            </div>
            <h2 className="text-3xl font-bold text-red-900">Tu Perfil Sensorial</h2>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-80">
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
          
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <ChartPie className="h-5 w-5 text-red-700" />
              <h3 className="text-xl font-semibold text-red-800">Tu estilo de vino</h3>
            </div>
            <p className="text-gray-700 mb-6">{description}</p>
            
            <div className="bg-red-50 p-4 rounded-lg mt-2">
              <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Recomendaciones para ti:
              </h4>
              <ul className="list-disc list-inside space-y-1">
                {recommendations.map((wine, index) => (
                  <li key={index} className="text-gray-700">{wine}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <h4 className="text-lg font-medium text-red-800 mb-3">Desglose de tu perfil:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="bg-red-50 p-3 rounded-lg">
                <p className="font-semibold capitalize">{key}</p>
                <div className="flex items-center justify-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 mx-0.5 rounded-full ${i < value ? 'bg-red-700' : 'bg-gray-200'}`} 
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <Button 
          onClick={onRestart}
          className="bg-red-700 hover:bg-red-800 text-white flex items-center gap-2"
        >
          <Heart className="h-4 w-4" />
          Reiniciar Test
        </Button>
      </div>
    </div>
  );
};

export default QuizResults;
