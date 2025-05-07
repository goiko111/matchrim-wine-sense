
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Question } from '../data/quizData';
import { ChevronLeft, Home } from 'lucide-react';

interface QuizQuestionProps {
  question: Question;
  currentAnswer: string;
  onAnswer: (value: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  isFirst: boolean;
  isLast: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  onBackToStart: () => void;
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({ 
  question, 
  currentAnswer, 
  onAnswer, 
  onNext, 
  onPrevious, 
  isFirst, 
  isLast,
  currentQuestionIndex,
  totalQuestions,
  onBackToStart
}) => {
  // Función para manejar el cambio de respuesta que automáticamente avanza
  const handleAnswerChange = (value: string) => {
    onAnswer(value);
    // Avanzar automáticamente después de responder
    setTimeout(() => {
      onNext();
    }, 500); // Pequeño retraso para que el usuario vea su selección
  };

  // Imagen fija de pimiento para todas las preguntas
  const questionImage = "/lovable-uploads/9619b04e-8a8f-4c87-94a5-c676792d96ad.png";

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
            src={questionImage} 
            alt="Ilustración de la pregunta" 
            className="h-32 w-auto object-contain rounded-lg"
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
