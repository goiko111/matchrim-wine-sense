
import React, { useState } from 'react';
import { ArrowLeft, Send, Loader, Wine, ChefHat, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import WineRecommendationCard from './WineRecommendationCard';
import PairingScoreCard from './PairingScoreCard';

interface MatchrimFunctionProps {
  functionType: 'wine-for-dish' | 'dish-for-wine' | 'pairing-check';
  onBack: () => void;
}

const MatchrimFunction: React.FC<MatchrimFunctionProps> = ({ functionType, onBack }) => {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getFunctionConfig = () => {
    switch (functionType) {
      case 'wine-for-dish':
        return {
          icon: Wine,
          title: '¿Qué vino va con mi plato?',
          placeholder1: 'Describe tu plato (ej: canelones de espinacas)',
          showSecondInput: false,
          prompt: `Soy un sommelier experto. El usuario va a comer: "${input1}". 
          Recomiéndame:
          1. Tipo de vino ideal (tinto, blanco, rosado, espumoso)
          2. Estilo específico y características
          3. 2-3 ejemplos concretos de vinos
          4. Por qué funciona este maridaje
          
          Responde de forma conversacional, educativa y cercana.`
        };
      case 'dish-for-wine':
        return {
          icon: ChefHat,
          title: '¿Qué plato va con mi vino?',
          placeholder1: 'Describe tu vino (ej: Barolo 2016)',
          showSecondInput: false,
          prompt: `Soy un sommelier experto. El usuario tiene este vino: "${input1}".
          Sugiéreme:
          1. 3-4 platos ideales para acompañar este vino
          2. Ocasiones perfectas para servirlo
          3. Por qué estos maridajes funcionan
          4. Consejos de servicio (temperatura, copa)
          
          Responde de forma conversacional, educativa y cercana.`
        };
      case 'pairing-check':
        return {
          icon: Scale,
          title: '¿Maridan bien juntos?',
          placeholder1: 'Tu vino (ej: Malbec)',
          placeholder2: 'Tu plato (ej: asado)',
          showSecondInput: true,
          prompt: `Soy un sommelier experto. Evalúa este maridaje: "${input1}" con "${input2}".
          Analiza:
          1. ¿Es un buen maridaje? (puntuación del 1-10)
          2. Por qué funciona o no funciona
          3. Si no es ideal, sugiere alternativas (otro vino o ajuste al plato)
          4. Consejos para mejorar la experiencia
          
          Responde de forma conversacional, educativa y cercana.`
        };
    }
  };

  const config = getFunctionConfig();
  const IconComponent = config.icon;

  const handleSubmit = async () => {
    if (!input1.trim() || (config.showSecondInput && !input2.trim())) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos necesarios.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-wine-chat', {
        body: {
          message: config.prompt,
          context: 'Inteligencia Líquida - Sistema de maridajes'
        }
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);

      setResult(data.response);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo procesar tu consulta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInput1('');
    setInput2('');
    setResult('');
  };

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
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
            <IconComponent className="h-4 w-4 text-red-800" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-red-900">{config.title}</h1>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <div className="max-w-md mx-auto space-y-4 mb-6">
        <div>
          <Input
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder={config.placeholder1}
            className="w-full p-4 text-base border-red-200 focus:border-red-500"
            disabled={isLoading}
          />
        </div>

        {config.showSecondInput && (
          <div>
            <Input
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder={config.placeholder2}
              className="w-full p-4 text-base border-red-200 focus:border-red-500"
              disabled={isLoading}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !input1.trim() || (config.showSecondInput && !input2.trim())}
            className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-white"
          >
            {isLoading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Analizar
              </>
            )}
          </Button>
          {result && (
            <Button
              onClick={handleClear}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="max-w-md mx-auto space-y-4">
          {functionType === 'pairing-check' && <PairingScoreCard response={result} />}
          <WineRecommendationCard response={result} functionType={functionType} />
        </div>
      )}

      {/* Loading state */}
      {isLoading && !result && (
        <div className="max-w-md mx-auto">
          <div className="p-8 text-center bg-white rounded-lg border border-red-200 shadow-sm">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-red-700" />
            <p className="text-red-600 font-medium">Nuestro sommelier está analizando...</p>
            <p className="text-red-500 text-sm mt-2">Esto puede tomar unos segundos</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchrimFunction;
