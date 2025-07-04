
import React from 'react';
import { Wine, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatchrimWelcomeProps {
  onGetStarted: () => void;
}

const MatchrimWelcome: React.FC<MatchrimWelcomeProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo y branding */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-red-900 rounded-full flex items-center justify-center">
            <Wine className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-red-900 mb-2">
            AIRIM
          </h1>
          <p className="text-lg text-red-700 leading-relaxed">
            Tu asistente inteligente de maridajes
          </p>
        </div>

        {/* Descripción */}
        <div className="mb-8">
          <p className="text-red-600 mb-4">
            Tu asistente inteligente de maridajes que te ayuda a encontrar la combinación perfecta entre vinos y comidas.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-red-500">
            <Sparkles className="h-4 w-4" />
            <span>Powered by AI</span>
          </div>
        </div>

        {/* Botón principal */}
        <Button
          onClick={onGetStarted}
          className="w-full py-6 text-lg bg-red-900 hover:bg-red-800 text-white rounded-xl shadow-lg"
        >
          Comenzar
        </Button>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-red-200">
          <p className="text-xs text-red-500">
            Parte del ecosistema{' '}
            <span className="font-semibold text-red-700">Winerim</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MatchrimWelcome;
