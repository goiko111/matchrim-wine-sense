
import React from 'react';
import { ArrowLeft, Wine, ChefHat, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MatchrimMenuProps {
  onBack: () => void;
  onSelectFunction: (functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check') => void;
}

const MatchrimMenu: React.FC<MatchrimMenuProps> = ({ onBack, onSelectFunction }) => {
  const functions = [
    {
      id: 'wine-for-dish' as const,
      icon: Wine,
      title: '¿Qué vino va con mi plato?',
      description: 'Describe tu plato y te recomendamos el vino perfecto',
      color: 'bg-red-100 text-red-800',
      example: 'Ej: "canelones de espinacas"'
    },
    {
      id: 'dish-for-wine' as const,
      icon: ChefHat,
      title: '¿Qué plato va con mi vino?',
      description: 'Tienes un vino y necesitas saber qué cocinar',
      color: 'bg-red-100 text-red-800',
      example: 'Ej: "Barolo 2016"'
    },
    {
      id: 'pairing-check' as const,
      icon: Scale,
      title: '¿Maridan bien juntos?',
      description: 'Evalúa si tu vino y plato son una buena combinación',
      color: 'bg-red-100 text-red-800',
      example: 'Ej: "Malbec + asado"'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-red-700 hover:bg-red-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-red-900">Inteligencia Líquida</h1>
          <p className="text-sm text-red-600">Elige tu función</p>
        </div>
      </div>

      {/* Functions */}
      <div className="space-y-4 max-w-md mx-auto">
        {functions.map((func) => {
          const IconComponent = func.icon;
          return (
            <Card 
              key={func.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-red-200"
              onClick={() => onSelectFunction(func.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${func.color} flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">
                      {func.title}
                    </h3>
                    <p className="text-sm text-red-600 mb-2">
                      {func.description}
                    </p>
                    <p className="text-xs text-red-500 italic">
                      {func.example}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-xs text-red-500">
          Todas las recomendaciones son generadas por inteligencia artificial especializada en maridajes
        </p>
      </div>
    </div>
  );
};

export default MatchrimMenu;
