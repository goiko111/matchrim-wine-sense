
import React from 'react';
import { Button } from "@/components/ui/button";
import { QuizResult } from '../data/quizData';
import { 
  ChartContainer, 
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

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
        light: "#9b87f5",
        dark: "#9b87f5",
      },
    },
  };

  return (
    <div className="flex flex-col max-w-4xl mx-auto p-6">
      <div className="bg-white/90 rounded-lg p-6 shadow-md mb-8">
        <h2 className="text-3xl font-bold text-purple-900 text-center mb-6">Tu Perfil Sensorial</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="h-80">
            <ChartContainer config={chartConfig}>
              <RadarChart outerRadius={90} data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="attribute" />
                <PolarRadiusAxis domain={[1, 5]} />
                <Radar 
                  name="Perfil" 
                  dataKey="value" 
                  stroke="#9b87f5" 
                  fill="#9b87f5" 
                  fillOpacity={0.6} 
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
          </div>
          
          <div className="flex flex-col justify-center">
            <h3 className="text-xl font-semibold text-purple-800 mb-4">Tu estilo de vino</h3>
            <p className="text-gray-700 mb-6">{description}</p>
            
            <div className="bg-purple-50 p-4 rounded-lg mt-2">
              <h4 className="font-semibold text-purple-700 mb-3">Recomendaciones para ti:</h4>
              <ul className="list-disc list-inside space-y-1">
                {recommendations.map((wine, index) => (
                  <li key={index} className="text-gray-700">{wine}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <h4 className="text-lg font-medium text-purple-800 mb-3">Desglose de tu perfil:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(result).map(([key, value]) => (
              <div key={key} className="bg-purple-50 p-3 rounded-lg">
                <p className="font-semibold capitalize">{key}</p>
                <div className="flex items-center justify-center mt-1">
                  {[...Array(5)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-4 h-4 mx-0.5 rounded-full ${i < value ? 'bg-purple-700' : 'bg-gray-200'}`} 
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
          className="bg-purple-700 hover:bg-purple-800 text-white"
        >
          Reiniciar Test
        </Button>
      </div>
    </div>
  );
};

export default QuizResults;
