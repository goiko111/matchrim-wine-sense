
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
          Proporciona exactamente 3 recomendaciones específicas de vinos que mariden perfectamente con este plato:
          
          VINO 1:
          - Nombre específico y bodega
          - Tipo y estilo del vino
          - Por qué funciona con este plato
          - Rango de precio estimado
          
          VINO 2:
          - Nombre específico y bodega
          - Tipo y estilo del vino
          - Por qué funciona con este plato
          - Rango de precio estimado
          
          VINO 3:
          - Nombre específico y bodega
          - Tipo y estilo del vino
          - Por qué funciona con este plato
          - Rango de precio estimado
          
          Incluye también consejos generales sobre temperatura de servicio y copa ideal.
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
      const CHAT_URL = `https://tuoczkxunuoyfjlnqinc.supabase.co/functions/v1/ai-wine-chat`;
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1b2N6a3h1bnVveWZqbG5xaW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDIzMDMsImV4cCI6MjA2NjUxODMwM30.t9E5WIHp7HCoO68MkQ4-1gTTZTQiw7jI-3_w11yRxJ8`,
        },
        body: JSON.stringify({
          message: config.prompt,
          context: 'AIRIM - Sistema de maridajes'
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Error en la respuesta del servidor');
      }

      if (!resp.body) throw new Error('No se recibió respuesta del servidor');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let accumulatedResponse = '';

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulatedResponse += content;
              setResult(accumulatedResponse);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulatedResponse += content;
              setResult(accumulatedResponse);
            }
          } catch { /* ignore partial leftovers */ }
        }
      }

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
