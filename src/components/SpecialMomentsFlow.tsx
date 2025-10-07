
import React, { useState } from 'react';
import { ArrowLeft, PartyPopper, Users, ChefHat, Brain, Star, DollarSign, Send, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import WineRecommendationCard from './WineRecommendationCard';

interface SpecialMomentsFlowProps {
  onBack: () => void;
}

type MomentType = 'dinner-friends' | 'gift' | 'intimate-dinner' | 'celebration';

interface QuestionData {
  momentType: MomentType | null;
  people: string;
  food: string;
  guestLevel: string;
  approach: string;
  budget: string;
}

const SpecialMomentsFlow: React.FC<SpecialMomentsFlowProps> = ({ onBack }) => {
  const [step, setStep] = useState<'select-moment' | 'questions' | 'result'>('select-moment');
  const [questionData, setQuestionData] = useState<QuestionData>({
    momentType: null,
    people: '',
    food: '',
    guestLevel: '',
    approach: '',
    budget: ''
  });
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const moments = [
    {
      id: 'dinner-friends' as const,
      emoji: '🎉',
      title: 'Cena con amigos',
      description: 'Para compartir buenos momentos'
    },
    {
      id: 'gift' as const,
      emoji: '🎁',
      title: 'Vino para regalar',
      description: 'El regalo perfecto para cualquier ocasión'
    },
    {
      id: 'intimate-dinner' as const,
      emoji: '💑',
      title: 'Cena íntima',
      description: 'Para momentos especiales en pareja'
    },
    {
      id: 'celebration' as const,
      emoji: '🎂',
      title: 'Cumpleaños / celebración',
      description: 'Para celebrar en grande'
    }
  ];

  const questions = [
    {
      icon: Users,
      question: '¿Cuántas personas sois?',
      options: ['2 personas', '3-4 personas', '5-8 personas', '9-12 personas', 'Más de 12'],
      key: 'people' as keyof QuestionData
    },
    {
      icon: ChefHat,
      question: '¿Qué tipo de comida habrá?',
      options: ['Picoteo variado', 'Carne / Asado', 'Sushi / Japonesa', 'Pasta italiana', 'Mariscos', 'Cocina mediterránea'],
      key: 'food' as keyof QuestionData
    },
    {
      icon: Brain,
      question: '¿Qué nivel de conocimiento tienen los invitados?',
      options: ['Principiantes', 'Nivel medio', 'Conocedores', 'Expertos / Sommeliers'],
      key: 'guestLevel' as keyof QuestionData
    },
    {
      icon: Star,
      question: '¿Quieres sorprender o acertar seguro?',
      options: ['Acertar seguro (clásico)', 'Sorprender moderadamente', 'Algo muy disruptivo'],
      key: 'approach' as keyof QuestionData
    },
    {
      icon: DollarSign,
      question: '¿Cuál es tu presupuesto por botella?',
      options: ['Hasta 15 €', '15 € - 30 €', '30 € - 50 €', '50 € - 100 €', 'Más de 100 €'],
      key: 'budget' as keyof QuestionData
    }
  ];

  const handleSelectMoment = (momentType: MomentType) => {
    setQuestionData({ ...questionData, momentType });
    setStep('questions');
  };

  const handleAnswerQuestion = (answer: string) => {
    const updatedData = { ...questionData, [questions[currentQuestion].key]: answer };
    setQuestionData(updatedData);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitRecommendation(updatedData);
    }
  };

  const handleSubmitRecommendation = async (data: QuestionData) => {
    setIsLoading(true);

    const momentLabels = {
      'dinner-friends': 'cena con amigos',
      'gift': 'vino para regalar',
      'intimate-dinner': 'cena íntima',
      'celebration': 'cumpleaños/celebración'
    };

    const prompt = `Soy un sommelier experto. El usuario quiere vino para: ${momentLabels[data.momentType!]}.

Detalles del evento:
- Número de personas: ${data.people}
- Tipo de comida: ${data.food}
- Nivel de conocimiento de los invitados: ${data.guestLevel}
- Enfoque deseado: ${data.approach}
- Presupuesto por botella: ${data.budget}

Por favor proporciona una recomendación completa que incluya:
1. 3 opciones específicas de vinos con nombres y bodegas reales
2. Justificación de por qué cada vino funciona para la ocasión
3. Número de botellas sugeridas según el número de personas
4. Consejos sobre temperatura de servicio y copa ideal
5. Información adicional relevante para el presupuesto indicado

Responde de forma conversacional, práctica y educativa, adaptándote al presupuesto especificado.`;

    try {
      const CHAT_URL = `https://tuoczkxunuoyfjlnqinc.supabase.co/functions/v1/ai-wine-chat`;
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1b2N6a3h1bnVveWZqbG5xaW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDIzMDMsImV4cCI6MjA2NjUxODMwM30.t9E5WIHp7HCoO68MkQ4-1gTTZTQiw7jI-3_w11yRxJ8`,
        },
        body: JSON.stringify({
          message: prompt,
          context: 'AIRIM - Vinos para momentos especiales'
        }),
      });

      if (!resp.ok) {
        let errText = 'Error en la respuesta del servidor';
        try { const e = await resp.json(); errText = e.error || errText; } catch {}
        throw new Error(errText);
      }
      if (!resp.body) throw new Error('No se recibió respuesta del servidor');

      // Pasamos a la vista de resultado y vamos actualizando por streaming
      setResult('');
      setStep('result');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let accumulatedResponse = '';
      let streamDone = false;

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

      // Flush final
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
        title: 'Error',
        description: 'No se pudo procesar tu consulta. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setQuestionData({
      momentType: null,
      people: '',
      food: '',
      guestLevel: '',
      approach: '',
      budget: ''
    });
    setCurrentQuestion(0);
    setResult('');
    setStep('select-moment');
  };

  if (step === 'select-moment') {
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
              <PartyPopper className="h-4 w-4 text-red-800" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-red-900">Vinos para momentos especiales</h1>
              <p className="text-sm text-red-600">¿Cuál es tu ocasión?</p>
            </div>
          </div>
        </div>

        {/* Moment Selection */}
        <div className="space-y-4 max-w-md mx-auto">
          {moments.map((moment) => (
            <Card 
              key={moment.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-red-200"
              onClick={() => handleSelectMoment(moment.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {moment.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">
                      {moment.title}
                    </h3>
                    <p className="text-sm text-red-600">
                      {moment.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'questions') {
    const question = questions[currentQuestion];
    const IconComponent = question.icon;

    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('select-moment')}
            className="text-red-700 hover:bg-red-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-red-800" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-red-900">{question.question}</h1>
              <p className="text-sm text-red-600">Pregunta {currentQuestion + 1} de {questions.length}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="w-full bg-red-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Options */}
        <div className="space-y-3 max-w-md mx-auto">
          {question.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleAnswerQuestion(option)}
              className="w-full p-4 bg-white hover:bg-red-50 text-red-900 border border-red-200 rounded-lg text-left justify-start h-auto"
              variant="outline"
            >
              {option}
            </Button>
          ))}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="max-w-md mx-auto mt-8">
            <div className="p-8 text-center bg-white rounded-lg border border-red-200 shadow-sm">
              <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-red-700" />
              <p className="text-red-600 font-medium">Analizando tu ocasión especial...</p>
              <p className="text-red-500 text-sm mt-2">Creando la recomendación perfecta</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('questions')}
            className="text-red-700 hover:bg-red-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <PartyPopper className="h-4 w-4 text-red-800" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-red-900">Tu recomendación personalizada</h1>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className="max-w-md mx-auto space-y-4">
          <WineRecommendationCard response={result} functionType="special-moments" />
          
          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleReset}
              className="flex-1 py-3 bg-red-900 hover:bg-red-800 text-white"
            >
              Nueva consulta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SpecialMomentsFlow;
