
import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Question } from '../data/quizData';
import { ChevronLeft, Home } from 'lucide-react';

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
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-[8px] text-sm text-slate-500">
          <span>{`Pregunta ${currentQuestionIndex + 1} de ${totalQuestions}`}</span>
          <progress aria-label="Progreso del test" value={currentQuestionIndex + 1} max={totalQuestions} className="h-2 w-[96px] max-w-full accent-red-800" />
        </div>
        <img src={question.image} alt="" aria-hidden="true" className="matchrim-native-quiz-image mt-4 aspect-[3/2] max-h-64 w-full rounded-lg bg-white object-contain" />
        <h1 ref={title} tabIndex={-1} className="mt-5 text-xl font-semibold leading-tight text-slate-950 outline-none">{question.text}</h1>
        <RadioGroup value={currentAnswer} onValueChange={handleAnswerChange} className="mt-4 gap-2" aria-label={question.text}>
          {([['si', 'Me gusta'], ['indiferente', 'Me da igual'], ['no', 'No me gusta']] as const).map(([value, label]) => (
            <label key={value} className={`flex min-h-14 items-center gap-3 rounded-md border px-4 py-3 ${currentAnswer === value ? 'border-red-800 bg-red-50' : 'border-stone-200 bg-white'}`}>
              <RadioGroupItem value={value} id={`quiz-${question.id}-${value}`} aria-label={label} /><span className="font-medium">{label}</span>
            </label>
          ))}
        </RadioGroup>
        <div className="mt-5 grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] gap-[8px]">
          <Button type="button" onClick={onPrevious} disabled={isFirst} variant="outline" size="icon" className="col-start-1 row-start-1 h-[44px] min-h-[44px] w-[44px] min-w-[44px] p-0" aria-label="Anterior" title="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button type="button" onClick={onContinue} disabled={!currentAnswer} className="col-span-3 row-start-2 h-auto min-h-[44px] w-full min-w-0 whitespace-normal bg-red-900 px-[12px] py-[8px]">{isLast ? 'Ver mi perfil' : 'Siguiente'}</Button>
          <Button type="button" onClick={onBackToStart} variant="ghost" size="icon" className="col-start-3 row-start-1 h-[44px] min-h-[44px] w-[44px] min-w-[44px] shrink-0 p-0" aria-label="Salir del test" title="Salir del test"><Home className="h-5 w-5" /></Button>
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
