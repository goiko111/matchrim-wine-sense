
import React, { useState } from 'react';
import { ArrowLeft, PartyPopper, Users, ChefHat, Brain, Star, DollarSign, Loader, Gift, Heart, CakeSlice, ChevronRight } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { streamAiRimResponse } from '@/lib/aiRimStream';
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
  const isNative = Capacitor.isNativePlatform();
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
      icon: Users,
      title: 'Cena con amigos',
      description: 'Para compartir buenos momentos'
    },
    {
      id: 'gift' as const,
      emoji: '🎁',
      icon: Gift,
      title: 'Vino para regalar',
      description: 'El regalo perfecto para cualquier ocasión'
    },
    {
      id: 'intimate-dinner' as const,
      emoji: '💑',
      icon: Heart,
      title: 'Cena íntima',
      description: 'Para momentos especiales en pareja'
    },
    {
      id: 'celebration' as const,
      emoji: '🎂',
      icon: CakeSlice,
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

    try {
      // Pasamos a la vista de resultado y vamos actualizando por streaming
      setResult('');
      setStep('result');

      await streamAiRimResponse(
        {
          functionType: 'special-moments',
          input1: momentLabels[data.momentType!],
          context: 'aiRIM - Vinos para momentos especiales',
          eventDetails: {
            people: data.people,
            food: data.food,
            guestLevel: data.guestLevel,
            approach: data.approach,
            budget: data.budget,
          },
        },
        setResult,
      );

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
      <main className={isNative ? 'matchrim-app-shell matchrim-native-safe-x min-h-screen pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6'}>
        {/* Header */}
        <div className={isNative ? 'mx-auto mb-7 flex max-w-2xl items-center gap-3' : 'flex items-center gap-4 mb-8'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className={isNative ? 'matchrim-pressable h-11 w-11 rounded-full border border-slate-200 bg-white p-0 text-slate-700' : 'text-red-700 hover:bg-red-100'}
            aria-label="Volver a aiRIM"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
              <PartyPopper className="h-4 w-4 text-red-800" />
            </div>
            <div>
              <h1 className={isNative ? 'text-xl font-bold text-slate-950' : 'text-xl font-bold text-red-900'}>Vinos para momentos especiales</h1>
              <p className={isNative ? 'text-sm text-slate-500' : 'text-sm text-red-600'}>¿Cuál es tu ocasión?</p>
            </div>
          </div>
        </div>

        {/* Moment Selection */}
        <div className={isNative ? 'mx-auto max-w-2xl divide-y divide-slate-200 border-y border-slate-200' : 'space-y-4 max-w-md mx-auto'}>
          {moments.map((moment) => {
            const MomentIcon = moment.icon;
            return (
            <Card 
              key={moment.id}
              className={isNative ? 'matchrim-pressable cursor-pointer rounded-none border-0 bg-transparent shadow-none' : 'cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-red-200'}
              onClick={() => handleSelectMoment(moment.id)}
            >
              <CardContent className={isNative ? 'p-0' : 'p-6'}>
                <div className={isNative ? 'flex min-h-[4.75rem] items-center gap-3 py-3' : 'flex items-start gap-4'}>
                  <div className={isNative ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-800' : 'text-3xl'}>
                    {isNative ? <MomentIcon className="h-5 w-5" /> : moment.emoji}
                  </div>
                  <div className="flex-1">
                    <h3 className={isNative ? 'font-semibold text-slate-950' : 'font-semibold text-red-900 mb-2'}>
                      {moment.title}
                    </h3>
                    <p className={isNative ? 'mt-0.5 text-sm text-slate-500' : 'text-sm text-red-600'}>
                      {moment.description}
                    </p>
                  </div>
                  {isNative && <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />}
                </div>
              </CardContent>
            </Card>
          );})}
        </div>
      </main>
    );
  }

  if (step === 'questions') {
    const question = questions[currentQuestion];
    const IconComponent = question.icon;

    return (
      <main className={isNative ? 'matchrim-app-shell matchrim-native-safe-x min-h-screen pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6'}>
        {/* Header */}
        <div className={isNative ? 'mx-auto mb-7 flex max-w-2xl items-center gap-3' : 'flex items-center gap-4 mb-8'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('select-moment')}
            className={isNative ? 'matchrim-pressable h-11 w-11 rounded-full border border-slate-200 bg-white p-0 text-slate-700' : 'text-red-700 hover:bg-red-100'}
            aria-label="Volver a ocasiones"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <IconComponent className="h-4 w-4 text-red-800" />
            </div>
            <div>
              <h1 className={isNative ? 'text-lg font-bold text-slate-950' : 'text-lg font-bold text-red-900'}>{question.question}</h1>
              <p className={isNative ? 'text-sm text-slate-500' : 'text-sm text-red-600'}>Pregunta {currentQuestion + 1} de {questions.length}</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={isNative ? 'mx-auto mb-8 max-w-2xl' : 'max-w-md mx-auto mb-8'}>
          <div className="w-full bg-red-200 rounded-full h-2">
            <div 
              className="bg-red-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Options */}
        <div className={isNative ? 'mx-auto max-w-2xl divide-y divide-slate-200 border-y border-slate-200' : 'space-y-3 max-w-md mx-auto'}>
          {question.options.map((option, index) => (
            <Button
              key={index}
              onClick={() => handleAnswerQuestion(option)}
              className={isNative ? 'matchrim-pressable min-h-14 w-full justify-between rounded-none border-0 bg-transparent px-1 py-3 text-left text-slate-900 hover:bg-slate-50' : 'w-full p-4 bg-white hover:bg-red-50 text-red-900 border border-red-200 rounded-lg text-left justify-start h-auto'}
              variant="outline"
            >
              {option}{isNative && <ChevronRight className="ml-auto h-5 w-5 text-slate-400" />}
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
      </main>
    );
  }

  if (step === 'result') {
    return (
      <main className={isNative ? 'matchrim-app-shell matchrim-native-safe-x min-h-screen pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6'}>
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
      </main>
    );
  }

  return null;
};

export default SpecialMomentsFlow;
