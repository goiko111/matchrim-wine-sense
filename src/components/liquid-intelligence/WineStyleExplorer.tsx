
import React, { useState } from 'react';
import { ArrowLeft, Waves, Cherry, TreePine, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WineStyleExplorerProps {
  onBack: () => void;
}

const WineStyleExplorer: React.FC<WineStyleExplorerProps> = ({ onBack }) => {
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const wineStyles = [
    {
      id: 'fresh',
      icon: Waves,
      emoji: '🌊',
      title: 'Fresco y mineral',
      description: 'Vinos ligeros, crujientes y con personalidad mineral',
      examples: ['Albariño', 'Verdejo', 'Riesling'],
      occasions: 'Perfecto para mariscos, aperitivos y días de calor'
    },
    {
      id: 'fruity',
      icon: Cherry,
      emoji: '🍓',
      title: 'Frutal y goloso',
      description: 'Vinos expresivos, aromáticos y con fruta protagonista',
      examples: ['Garnacha', 'Pinot Noir', 'Moscatel'],
      occasions: 'Ideal para carnes blancas, quesos y postres'
    },
    {
      id: 'structured',
      icon: TreePine,
      emoji: '🪵',
      title: 'Estructurado y con crianza',
      description: 'Vinos complejos, con cuerpo y evolución en barrica',
      examples: ['Tempranillo Reserva', 'Cabernet Sauvignon', 'Ribera del Duero'],
      occasions: 'Perfecto para carnes rojas, guisos y celebraciones'
    },
    {
      id: 'natural',
      icon: Leaf,
      emoji: '🌿',
      title: 'Natural y vivo',
      description: 'Vinos biodinámicos, sin sulfitos añadidos, expresión pura',
      examples: ['Orange wines', 'Pet-nat', 'Vinos de anfora'],
      occasions: 'Para experiencias gastronómicas experimentales'
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
          <h1 className="text-2xl font-light text-red-900">Descubre tu estilo</h1>
          <p className="text-sm text-red-600 font-light">¿Eres más de blancos frescos o tintos intensos?</p>
        </div>
      </div>

      {/* Wine Styles Grid */}
      <div className="max-w-2xl mx-auto grid gap-4 md:grid-cols-2">
        {wineStyles.map((style) => {
          const IconComponent = style.icon;
          const isSelected = selectedStyle === style.id;
          
          return (
            <Card 
              key={style.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-red-100 bg-white/80 backdrop-blur-sm ${
                isSelected ? 'ring-2 ring-red-300 border-red-300' : 'hover:border-red-200'
              }`}
              onClick={() => setSelectedStyle(isSelected ? null : style.id)}
            >
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-4xl mb-3">
                    {style.emoji}
                  </div>
                  <h3 className="font-medium text-red-900 mb-2 text-lg">
                    {style.title}
                  </h3>
                  <p className="text-sm text-red-600 font-light mb-4">
                    {style.description}
                  </p>
                  
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-red-100 text-left">
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-red-800 mb-1">Ejemplos:</h4>
                        <div className="flex flex-wrap gap-1">
                          {style.examples.map((example) => (
                            <span
                              key={example}
                              className="px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs"
                            >
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-red-800 mb-1">Ocasiones:</h4>
                        <p className="text-xs text-red-600 font-light">
                          {style.occasions}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom section */}
      <div className="mt-12 text-center max-w-md mx-auto">
        <p className="text-sm text-red-500 font-light mb-4">
          Cada estilo tiene su momento perfecto. ¡Descubre el tuyo!
        </p>
        
        {selectedStyle && (
          <Button
            className="bg-red-900 hover:bg-red-800 text-white px-8 py-3 rounded-xl"
          >
            Ver recomendaciones de este estilo
          </Button>
        )}
      </div>
    </div>
  );
};

export default WineStyleExplorer;
