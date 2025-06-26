
import React, { useState } from 'react';
import { ArrowLeft, Send, Loader, BookmarkPlus, Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AIResponseCard from './AIResponseCard';

interface AIChatProps {
  queryType: 'dish-to-wine' | 'wine-to-dish' | 'pairing-check';
  onBack: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ queryType, onBack }) => {
  const [input1, setInput1] = useState('');
  const [input2, setInput2] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getQueryConfig = () => {
    switch (queryType) {
      case 'dish-to-wine':
        return {
          title: '¿Qué vino me recomiendas?',
          placeholder1: 'Describe tu plato (ej: risotto de setas)',
          showSecondInput: false,
          prompt: `Soy un sommelier experto y cercano. El usuario va a comer: "${input1}". 
          Dame una recomendación conversacional que incluya:
          1. El tipo de vino ideal con características específicas
          2. 2-3 ejemplos concretos de vinos
          3. Una explicación educativa de por qué funciona este maridaje
          4. Un consejo adicional sobre temperatura o servicio
          
          Responde como si fuera una conversación amigable con un sommelier experto.`
        };
      case 'wine-to-dish':
        return {
          title: '¿Qué plato le va a mi vino?',
          placeholder1: 'Describe tu vino (ej: Albariño de Rías Baixas)',
          showSecondInput: false,
          prompt: `Soy un sommelier experto y cercano. El usuario tiene este vino: "${input1}".
          Dame una recomendación conversacional que incluya:
          1. 3-4 platos ideales que mariden perfectamente
          2. Ocasiones perfectas para disfrutar este vino
          3. Explicación de por qué estos maridajes funcionan
          4. Consejos de servicio y presentación
          
          Responde como si fuera una conversación amigable con un sommelier experto.`
        };
      case 'pairing-check':
        return {
          title: '¿Hacen buen match?',
          placeholder1: 'Tu vino (ej: Tempranillo)',
          placeholder2: 'Tu plato (ej: cordero asado)',
          showSecondInput: true,
          prompt: `Soy un sommelier experto y cercano. Evalúa este maridaje: "${input1}" con "${input2}".
          Dame una evaluación conversacional que incluya:
          1. Puntuación del 1-10 con justificación
          2. Por qué funciona o qué se puede mejorar
          3. Alternativas si no es el match ideal
          4. Tips para optimizar la experiencia
          
          Responde como si fuera una conversación amigable con un sommelier experto.`
        };
    }
  };

  const config = getQueryConfig();

  const handleSubmit = async () => {
    if (!input1.trim() || (config.showSecondInput && !input2.trim())) {
      toast({
        title: "Completa la información",
        description: "Por favor describe tu consulta para poder ayudarte.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResponse('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-wine-chat', {
        body: {
          message: config.prompt,
          context: 'Inteligencia Líquida - Sommelier Digital'
        }
      });

      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error);

      setResponse(data.response);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Algo salió mal",
        description: "No pudimos procesar tu consulta. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewQuery = () => {
    setInput1('');
    setInput2('');
    setResponse('');
  };

  const handleSave = () => {
    toast({
      title: "¡Guardado!",
      description: "Tu maridaje se ha guardado en favoritos.",
    });
  };

  const handleShare = () => {
    toast({
      title: "¡Compartido!",
      description: "El enlace se ha copiado al portapapeles.",
    });
  };

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
          <h1 className="text-xl font-light text-red-900">{config.title}</h1>
        </div>
      </div>

      {/* Input Form */}
      <div className="max-w-md mx-auto space-y-4 mb-8">
        <div>
          <Input
            value={input1}
            onChange={(e) => setInput1(e.target.value)}
            placeholder={config.placeholder1}
            className="w-full p-4 text-base border-red-200 focus:border-red-500 rounded-xl bg-white/80"
            disabled={isLoading}
          />
        </div>

        {config.showSecondInput && (
          <div>
            <Input
              value={input2}
              onChange={(e) => setInput2(e.target.value)}
              placeholder={config.placeholder2}
              className="w-full p-4 text-base border-red-200 focus:border-red-500 rounded-xl bg-white/80"
              disabled={isLoading}
            />
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={isLoading || !input1.trim() || (config.showSecondInput && !input2.trim())}
          className="w-full py-4 bg-red-900 hover:bg-red-800 text-white rounded-xl transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Consultando al sommelier...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Preguntar
            </>
          )}
        </Button>
      </div>

      {/* AI Response */}
      {response && (
        <div className="max-w-md mx-auto space-y-6">
          <AIResponseCard response={response} queryType={queryType} />
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              variant="outline"
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Guardar
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartir
            </Button>
            <Button
              onClick={handleNewQuery}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 rounded-xl"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Restaurant CTA */}
          <div className="mt-8 p-4 bg-gradient-to-r from-red-50 to-red-100 rounded-xl border border-red-200">
            <p className="text-sm text-red-700 text-center">
              💡 ¿Sabías que esto también está integrado en las cartas de restaurantes con Winerim?
            </p>
            <Button
              variant="link"
              className="w-full text-red-800 hover:text-red-900 font-medium mt-2"
            >
              Más información →
            </Button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && !response && (
        <div className="max-w-md mx-auto">
          <div className="p-8 text-center bg-white/80 rounded-xl border border-red-100 backdrop-blur-sm">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-red-700" />
            <p className="text-red-700 font-medium">Nuestro sommelier está pensando...</p>
            <p className="text-red-500 text-sm mt-2 font-light">Un momento por favor</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChat;
