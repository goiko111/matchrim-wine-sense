
import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Question } from '../data/quizData';
import { ChevronLeft, Home, Meh, ThumbsDown, ThumbsUp } from 'lucide-react';
import { QuizArt149 } from '@/components/QuizArt149';

interface QuizQuestionProps {
  question: Question;
  currentAnswer: string;
  onAnswer: (value: string) => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  onBackToStart: () => void;
  onContinue?: () => void;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({ 
  question, 
  currentAnswer, 
  onAnswer, 
  onPrevious, 
  isFirst, 
  isLast,
  currentQuestionIndex,
  totalQuestions,
  onBackToStart,
  onContinue
}) => {
  const isNative = Capacitor.isNativePlatform();
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (isNative) {
      title.current?.closest('section')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      title.current?.focus({ preventScroll: true });
    }
  }, [isNative, question.id]);
  // Función para manejar el cambio de respuesta que automáticamente avanza
  const handleAnswerChange = (value: string) => {
    onAnswer(value);
  };
  if (isNative) {
    return (
      <section className="matchrim-native-quiz-question mx-auto w-full min-w-0 max-w-2xl scroll-mt-[calc(12px+var(--matchrim-safe-top))] px-0 pb-[24px]">
        {/* 149: the test in the visual language of the rest of the app: a full-width progress line, the food as a flat
            illustration on its own colour (QuizArt149, the owner's choice), and three large answers with a face each. */}
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-[8px] text-sm text-stone-600">
          <span>{`Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`}</span>
          <Button type="button" onClick={onBackToStart} variant="ghost" size="icon" className="h-[44px] min-h-[44px] w-[44px] min-w-[44px] shrink-0 p-0" aria-label="Salir del test" title="Salir del test"><Home className="h-5 w-5" /></Button>
        </div>
        <progress aria-label="Progreso del test" value={currentQuestionIndex + 1} max={totalQuestions} className="block h-1.5 w-full overflow-hidden rounded-full accent-red-900 [&::-webkit-progress-bar]:bg-stone-200 [&::-webkit-progress-value]:bg-red-900" />
        <QuizArt149 id={question.id} className="matchrim-native-quiz-image mx-auto mt-4 aspect-square max-h-56 w-auto max-w-full rounded-3xl" />
        <h1 ref={title} tabIndex={-1} className="mt-5 text-center text-2xl font-bold leading-tight text-stone-950 outline-none">{question.text}</h1>
        <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange} className="mt-5 grid grid-cols-3 gap-2 [html.matchrim-accessibility-text_&]:grid-cols-1" aria-label={question.text}>
          {([['si', 'Me gusta', ThumbsUp], ['indiferente', 'Me da igual', Meh], ['no', 'No me gusta', ThumbsDown]] as const).map(([value, label, Icon]) => (
            <label key={value} className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center ${currentAnswer === value ? 'border-red-900 bg-red-900 text-white' : 'border-stone-200 bg-white text-stone-900'}`}>
              <RadioGroupItem value={value} id={`quiz-${question.id}-${value}`} aria-label={label} className="absolute inset-0 h-full w-full rounded-2xl border-0 opacity-0" />
              <Icon className="h-6 w-6" aria-hidden="true" /><span className="text-sm font-semibold leading-4">{label}</span>
            </label>
          ))}
        </RadioGroup>
        <div className="mt-5 grid min-w-0 grid-cols-[48px_minmax(0,1fr)] gap-[8px]">
          <Button type="button" onClick={onPrevious} disabled={isFirst} variant="outline" size="icon" className="h-[48px] min-h-[48px] w-[48px] min-w-[48px] rounded-full p-0" aria-label="Anterior" title="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" onClick={onContinue} disabled={!currentAnswer} className="h-auto min-h-[48px] w-full min-w-0 whitespace-normal rounded-full bg-red-900 px-[12px] py-[8px] text-base">{isLast ? 'Ver mi perfil' : 'Siguiente'}</Button>
        </div>
      </section>
    );
  }
  
  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-6">
      <div className="w-full mb-6 bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-red-700">
            Pregunta {currentQuestionIndex + 1} de {totalQuestions}
          </span>
          <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-red-600 h-2.5 rounded-full" 
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex items-center justify-center mb-6">
          <img 
            src={question.image} 
            alt={question.text} 
            className="h-48 w-auto object-contain rounded-lg shadow-lg"
          />
        </div>
        
        <h2 className="text-2xl font-semibold text-red-900 mb-6 text-center">
          {question.text}
        </h2>
        
        <RadioGroup 
          value={currentAnswer} 
          onValueChange={handleAnswerChange}
          className="flex flex-col space-y-4"
        >
          <label className="flex items-center space-x-2 border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-red-50 transition-colors">
            <RadioGroupItem value="si" id="si" className="text-red-600 border-red-600" />
            <span className="text-lg">Sí</span>
          </label>
          <label className="flex items-center space-x-2 border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-red-50 transition-colors">
            <RadioGroupItem value="indiferente" id="indiferente" className="text-red-600 border-red-600" />
            <span className="text-lg">Indiferente</span>
          </label>
          <label className="flex items-center space-x-2 border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-red-50 transition-colors">
            <RadioGroupItem value="no" id="no" className="text-red-600 border-red-600" />
            <span className="text-lg">No</span>
          </label>
        </RadioGroup>
      </div>
      
      <div className="flex justify-between w-full mt-4">
        <Button 
          onClick={onPrevious} 
          disabled={isFirst} 
          variant="outline"
          className={`flex items-center bg-white hover:bg-red-50 border-red-200 text-red-700 ${isFirst ? 'invisible' : ''}`}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <Button 
          onClick={onBackToStart}
          variant="outline" 
          className="flex items-center bg-white hover:bg-red-50 border-red-200 text-red-700"
        >
          <Home className="h-4 w-4 mr-2" />
          Volver al inicio
        </Button>
      </div>
    </div>
  );
};

export default QuizQuestion;
