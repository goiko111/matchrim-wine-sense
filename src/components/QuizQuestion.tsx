
import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Question } from '../data/quizData';
import { ChevronLeft, ChevronRight, Home, Meh, ThumbsDown, ThumbsUp } from 'lucide-react';
import { QuizPhoto157 } from '@/components/QuizPhoto157';

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
  // 157 (native; declared before the scroll effect, which check 241 expects to be the last one): the parent's onContinue reads the stored answer, so it is called through a ref once the answer has
  // been rendered; leaving the question (Anterior, exit) cancels a pending advance.
  const continueRef = useRef(onContinue); continueRef.current = onContinue;
  const pending = useRef<number | null>(null);
  useEffect(() => () => { if (pending.current !== null) { window.clearTimeout(pending.current); pending.current = null; } }, [question.id]);
  const advanceSoon = (value: string) => {
    if (pending.current !== null) return;
    if (currentAnswer !== value) onAnswer(value);
    pending.current = window.setTimeout(() => { pending.current = null; continueRef.current?.(); }, 280);
  };
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
      <section className="matchrim-native-quiz-question mx-auto w-full min-w-0 max-w-2xl scroll-mt-[calc(12px+var(--matchrim-safe-top))] px-0 pb-[24px]" data-quiz157>
        {/* 157: the owner chose full-bleed photographs (QuizPhoto157) over the flat drawings of 149, and asked that an
            answer moves on by itself. The photo carries the progress line and the question; a tap on an answer shows
            it selected for a moment and advances. «Anterior» stays, and an answered question can be passed again. */}
        <div className="relative -mx-4 flex min-h-[46vh] flex-col justify-between overflow-hidden bg-stone-900 [@media(orientation:landscape)_and_(max-height:600px)]:min-h-[9rem]">
          <QuizPhoto157 key={question.id} id={question.id} eager className="matchrim-native-quiz-image absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" aria-hidden="true" />
          <div className="relative px-4 pt-2">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-[8px] text-sm font-medium text-white">
              <span>{`Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`}</span>
              <Button type="button" onClick={onBackToStart} variant="ghost" size="icon" className="h-[44px] min-h-[44px] w-[44px] min-w-[44px] shrink-0 p-0 text-white hover:bg-white/15 hover:text-white" aria-label="Salir del test" title="Salir del test"><Home className="h-5 w-5" /></Button>
            </div>
            <progress aria-label="Progreso del test" value={currentQuestionIndex + 1} max={totalQuestions} className="block h-1.5 w-full overflow-hidden rounded-full accent-white [&::-webkit-progress-bar]:bg-white/35 [&::-webkit-progress-value]:bg-white" />
          </div>
          <h1 ref={title} tabIndex={-1} className="relative px-4 pb-4 pt-10 text-3xl font-bold leading-tight text-white outline-none [overflow-wrap:anywhere]">{question.text}</h1>
        </div>
        <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange} className="mt-4 grid grid-cols-3 gap-2 [html.matchrim-accessibility-text_&]:grid-cols-1" aria-label={question.text}>
          {([['si', 'Me gusta', ThumbsUp], ['indiferente', 'Me da igual', Meh], ['no', 'No me gusta', ThumbsDown]] as const).map(([value, label, Icon]) => (
            <label key={value} className={`relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center ${currentAnswer === value ? 'border-red-900 bg-red-900 text-white' : 'border-stone-200 bg-white text-stone-900'}`}>
              <RadioGroupItem value={value} id={`quiz-${question.id}-${value}`} aria-label={label} onClick={() => advanceSoon(value)} className="absolute inset-0 h-full w-full rounded-2xl border-0 opacity-0" />
              <Icon className="h-6 w-6" aria-hidden="true" /><span className="text-sm font-semibold leading-4">{label}</span>
            </label>
          ))}
        </RadioGroup>
        <div className="mt-4 flex min-w-0 items-center justify-between gap-[8px]">
          <Button type="button" onClick={onPrevious} disabled={isFirst} variant="outline" className="h-[48px] min-h-[48px] min-w-[48px] gap-1 rounded-full px-4" aria-label="Anterior" title="Anterior"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Anterior</Button>
          {currentAnswer && <Button type="button" onClick={onContinue} variant="outline" className="h-[48px] min-h-[48px] min-w-[48px] gap-1 rounded-full px-4" data-testid="quiz-forward157">{isLast ? 'Ver mi perfil' : 'Siguiente'}<ChevronRight className="h-4 w-4" aria-hidden="true" /></Button>}
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
