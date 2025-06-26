
import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LiquidIntelligenceHeroProps {
  onGetStarted: () => void;
}

const LiquidIntelligenceHero: React.FC<LiquidIntelligenceHeroProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-red-900 to-red-700 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-light text-red-900 mb-6 leading-tight">
            Inteligencia Líquida
          </h1>
          
          <p className="text-xl md:text-2xl text-red-700 mb-4 font-light">
            para comensales curiosos
          </p>
          
          <p className="text-lg text-red-600 mb-12 leading-relaxed max-w-xl mx-auto">
            Elige tu plato. Elige tu vino. O deja que Inteligencia Líquida lo haga por ti.
          </p>
        </div>

        {/* Call to Action */}
        <div className="space-y-4">
          <Button
            onClick={onGetStarted}
            className="bg-red-900 hover:bg-red-800 text-white px-12 py-4 text-lg rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Empezar ahora
          </Button>
          
          <p className="text-sm text-red-500 font-light">
            Sin registros. Solo el maridaje perfecto.
          </p>
        </div>

        {/* Footer hint */}
        <div className="mt-20 pt-8 border-t border-red-100">
          <p className="text-xs text-red-400 font-light">
            Potenciado por inteligencia artificial especializada en maridajes
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiquidIntelligenceHero;
