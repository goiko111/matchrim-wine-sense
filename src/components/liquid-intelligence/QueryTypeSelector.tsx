
import React from 'react';
import { ArrowLeft, ChefHat, Wine, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface QueryTypeSelectorProps {
  onBack: () => void;
  onSelectQuery: (type: 'dish-to-wine' | 'wine-to-dish' | 'pairing-check') => void;
}

const QueryTypeSelector: React.FC<QueryTypeSelectorProps> = ({ onBack, onSelectQuery }) => {
  const queryTypes = [
    {
      id: 'dish-to-wine' as const,
      icon: ChefHat,
      emoji: '🍽',
      title: 'Voy a comer...',
      subtitle: '¿Qué vino me recomiendas?',
      description: 'Describe tu plato y encuentra el vino perfecto'
    },
    {
      id: 'wine-to-dish' as const,
      icon: Wine,
      emoji: '🍷',
      title: 'Tengo este vino...',
      subtitle: '¿Qué plato le va?',
      description: 'Conoce qué cocinar con tu vino favorito'
    },
    {
      id: 'pairing-check' as const,
      icon: Scale,
      emoji: '⚖️',
      title: 'Este plato y este vino',
      subtitle: '¿Hacen buen match?',
      description: 'Evalúa la compatibilidad de tu maridaje'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-red-700 hover:bg-red-100 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-light text-red-900">¿Qué quieres saber?</h1>
        </div>
      </div>

      {/* Query Type Cards */}
      <div className="max-w-md mx-auto space-y-4">
        {queryTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <Card 
              key={type.id}
              className="cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-red-100 hover:border-red-200 bg-white/80 backdrop-blur-sm"
              onClick={() => onSelectQuery(type.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl mb-2">
                    {type.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900 mb-1 text-lg">
                      {type.title}
                    </h3>
                    <h4 className="font-light text-red-800 mb-3 text-base">
                      {type.subtitle}
                    </h4>
                    <p className="text-sm text-red-600 font-light">
                      {type.description}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                    <IconComponent className="h-4 w-4 text-red-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="mt-16 text-center">
        <p className="text-xs text-red-400 font-light max-w-sm mx-auto">
          Cada respuesta está personalizada por nuestro sommelier digital especializado
        </p>
      </div>
    </div>
  );
};

export default QueryTypeSelector;
