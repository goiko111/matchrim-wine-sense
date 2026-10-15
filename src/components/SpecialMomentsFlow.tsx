
import React, { useLayoutEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowLeft, PartyPopper, Users, ChefHat, Brain, Star, DollarSign, Loader, Gift, Heart, CakeSlice, ChevronRight, RotateCcw, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { streamAiRimResponse } from '@/lib/aiRimStream';
import { emptySpecialMomentAnswers, isCompleteSpecialMoment, specialMomentPlainText, SPECIAL_MOMENT_LABELS, SPECIAL_MOMENT_OPTIONS, type SpecialMomentType, type SpecialMomentAnswers } from '@/utils/specialMomentsRequest';
import WineRecommendationCard from './WineRecommendationCard';

interface SpecialMomentsFlowProps {
  onBack: () => void;
}

const SpecialMomentsFlow: React.FC<SpecialMomentsFlowProps> = ({ onBack }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p role="status" className="p-6">Comprobando la sesión...</p>;
  return <SpecialMomentsSession key={JSON.stringify([user?.id ?? null, location.key])} ownerId={user?.id ?? null} onBack={onBack} />;
};

const SpecialMomentsSession: React.FC<SpecialMomentsFlowProps & { ownerId: string | null }> = ({ onBack, ownerId }) => {
  const isNative = Capacitor.isNativePlatform();
  const [step, setStep] = useState<'select-moment' | 'questions' | 'result'>('select-moment');
  const [questionData, setQuestionData] = useState(emptySpecialMomentAnswers);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestController = useRef<AbortController | null>(null);
  const requestGeneration = useRef(0);
  const lifetime = useRef(false);
  const questionIndex = useRef(0);
  const screen = useRef(step);

  useLayoutEffect(() => {
    lifetime.current = true;
    return () => {
      lifetime.current = false;
      requestGeneration.current += 1;
      requestController.current?.abort();
      requestController.current = null;
    };
  }, []);

  const invalidateRequest = () => {
    requestGeneration.current += 1;
    requestController.current?.abort();
    requestController.current = null;
    setIsLoading(false);
    setResult('');
    setError('');
    setNotice('');
  };

  const resetQuestions = (momentType: SpecialMomentType | null = null) => {
    invalidateRequest();
    setQuestionData(emptySpecialMomentAnswers(momentType));
    questionIndex.current = 0;
    setCurrentQuestion(0);
    screen.current = momentType ? 'questions' : 'select-moment';
    setStep(screen.current);
  };

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
      options: SPECIAL_MOMENT_OPTIONS.people,
      key: 'people' as const
    },
    {
      icon: ChefHat,
      question: '¿Qué tipo de comida habrá?',
      options: SPECIAL_MOMENT_OPTIONS.food,
      key: 'food' as const
    },
    {
      icon: Brain,
      question: '¿Qué nivel de conocimiento tienen los invitados?',
      options: SPECIAL_MOMENT_OPTIONS.guestLevel,
      key: 'guestLevel' as const
    },
    {
      icon: Star,
      question: '¿Quieres sorprender o acertar seguro?',
      options: SPECIAL_MOMENT_OPTIONS.approach,
      key: 'approach' as const
    },
    {
      icon: DollarSign,
      question: '¿Cuál es tu presupuesto por botella?',
      options: SPECIAL_MOMENT_OPTIONS.budget,
      key: 'budget' as const
    }
  ];

  const handleSelectMoment = (momentType: SpecialMomentType) => resetQuestions(momentType);

  const handleAnswerQuestion = (answer: string) => {
    if (!lifetime.current || screen.current !== 'questions' || requestController.current || questionIndex.current !== currentQuestion) return;
    if (!(questions[currentQuestion].options as readonly string[]).includes(answer)) return;
    const updatedData = { ...questionData, [questions[currentQuestion].key]: answer };
    setQuestionData(updatedData);

    if (currentQuestion < questions.length - 1) {
      questionIndex.current = currentQuestion + 1;
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitRecommendation(updatedData);
    }
  };

  const handleSubmitRecommendation = async (data: SpecialMomentAnswers) => {
    if (!lifetime.current || requestController.current || !isCompleteSpecialMoment(data)) return;
    invalidateRequest();
    const controller = new AbortController();
    const generation = requestGeneration.current;
    requestController.current = controller;
    const isCurrent = () => lifetime.current && requestGeneration.current === generation && requestController.current === controller && !controller.signal.aborted;
    setIsLoading(true);
    screen.current = 'result';
    setStep('result');

    try {
      const response = await streamAiRimResponse(
        {
          functionType: 'special-moments',
          input1: SPECIAL_MOMENT_LABELS[data.momentType!],
          context: 'aiRIM - Vinos para momentos especiales',
          eventDetails: {
            people: data.people,
            food: data.food,
            guestLevel: data.guestLevel,
            approach: data.approach,
            budget: data.budget,
          },
        },
        (partial) => { if (isCurrent()) setResult(partial); },
        { signal: controller.signal, ownerId },
      );
      if (!isCurrent()) return;
      if (!response.trim()) throw new Error('Empty recommendation');
      setResult(response);
    } catch (error) {
      if (!isCurrent()) return;
      setResult('');
      const errorName = error instanceof Error || error instanceof DOMException ? error.name : '';
      if (errorName === 'AbortError') {
        setNotice('La sesión ha cambiado. Vuelve a elegir una ocasión.');
      } else {
        setError(errorName === 'TimeoutError'
          ? 'La consulta ha tardado demasiado. Puedes reintentar o cambiar de ocasión.'
          : 'No se pudo completar la recomendación. Puedes reintentar o cambiar de ocasión.');
      }
    } finally {
      if (isCurrent()) {
        requestController.current = null;
        setIsLoading(false);
      }
    }
  };

  const handleReset = () => resetQuestions();

  const handleCancel = () => {
    invalidateRequest();
    setNotice('Consulta cancelada. Puedes reintentar o cambiar de ocasión.');
  };

  if (step === 'select-moment') {
    return (
      <main className={isNative ? 'matchrim-app-shell matchrim-native-safe-x min-h-screen pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6'}>
        {/* Header */}
        <div className={isNative ? 'mx-auto mb-7 flex max-w-2xl items-center gap-3' : 'flex items-center gap-4 mb-8'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { invalidateRequest(); onBack(); }}
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
              role="button"
              tabIndex={0}
              aria-label={moment.title}
              className={isNative ? 'matchrim-pressable cursor-pointer rounded-none border-0 bg-transparent shadow-none' : 'cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-red-200'}
              onClick={() => handleSelectMoment(moment.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelectMoment(moment.id);
                }
              }}
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
            onClick={handleReset}
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
          {question.options.map((option) => (
            <Button
              key={`${currentQuestion}:${option}`}
              onClick={() => handleAnswerQuestion(option)}
              disabled={isLoading}
              className={isNative ? 'matchrim-pressable min-h-14 w-full justify-between rounded-none border-0 bg-transparent px-1 py-3 text-left text-slate-900 hover:bg-slate-50' : 'w-full p-4 bg-white hover:bg-red-50 text-red-900 border border-red-200 rounded-lg text-left justify-start h-auto'}
              variant="outline"
            >
              {option}{isNative && <ChevronRight className="ml-auto h-5 w-5 text-slate-400" />}
            </Button>
          ))}
        </div>

      </main>
    );
  }

  if (step === 'result') {
    return (
      <main className={isNative ? 'matchrim-app-shell matchrim-native-safe-x min-h-screen pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-b from-red-50 to-red-100 px-4 py-6'}>
        {/* Header */}
        <div className={isNative ? 'mx-auto mb-7 flex max-w-2xl items-center gap-3' : 'flex items-center gap-4 mb-8'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetQuestions(questionData.momentType)}
            className={isNative ? 'matchrim-pressable h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-white p-0 text-slate-700' : 'h-11 w-11 p-0 text-red-700 hover:bg-red-100'}
            aria-label="Volver a preguntas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-3">
            <div className="w-8 h-8 shrink-0 bg-red-100 rounded-lg flex items-center justify-center">
              <PartyPopper className="h-4 w-4 text-red-800" />
            </div>
            <div>
              <h1 className={isNative ? 'text-lg font-bold text-slate-950' : 'text-lg font-bold text-red-900'}>{isLoading ? 'Preparando tu recomendación' : error || notice ? 'Tu consulta' : 'Tu recomendación personalizada'}</h1>
            </div>
          </div>
        </div>

        {/* Result */}
        <div className={isNative ? 'mx-auto max-w-2xl space-y-4' : 'max-w-md mx-auto space-y-4'}>
          {isLoading ? (
            <section aria-label="Consulta en curso" aria-busy="true" className="space-y-4 py-6">
              <p role="status" className="flex items-center gap-3 text-sm text-red-800">
                <Loader className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
                Analizando tu ocasión especial...
              </p>
              <Button variant="outline" onClick={handleCancel} className="min-h-11">
                <X className="mr-2 h-4 w-4" aria-hidden="true" />Cancelar consulta
              </Button>
            </section>
          ) : error || notice ? (
            <section className="space-y-4 py-4">
              <p role={error ? 'alert' : 'status'} className="text-sm leading-6 text-slate-700">{error || notice}</p>
              <Button variant="outline" onClick={() => void handleSubmitRecommendation(questionData)} className="min-h-11">
                <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />Reintentar consulta
              </Button>
            </section>
          ) : result.trim() ? (
            isNative ? (
              <section aria-label="Recomendación de aiRIM" className="min-w-0 space-y-4 border-y border-slate-200 py-5">
                <p role="note" className="border-l-2 border-stone-300 pl-3 text-xs leading-5 text-slate-600">Respuesta generada por IA. Referencias, precios y disponibilidad no verificados con el catálogo Winerim.</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800 [overflow-wrap:anywhere]">{specialMomentPlainText(result)}</p>
              </section>
            ) : <WineRecommendationCard response={result} functionType="special-moments" />
          ) : (
            <p role="alert" className="text-sm text-slate-700">No se recibió una recomendación. Vuelve a elegir una ocasión.</p>
          )}
          
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
