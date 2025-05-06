
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Question } from '../data/quizData';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  totalQuestions
}) => {
  // Imágenes para cada pregunta basadas en su ID
  const getQuestionImage = () => {
    const images = {
      1: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=500&auto=format&fit=crop",
      2: "https://images.unsplash.com/photo-1626692445033-8f6ed80eabf5?q=80&w=500&auto=format&fit=crop",
      3: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?q=80&w=500&auto=format&fit=crop",
      4: "https://images.unsplash.com/photo-1605195413839-8caefa025edd?q=80&w=500&auto=format&fit=crop",
      5: "https://images.unsplash.com/photo-1626957341926-98752fc2ba23?q=80&w=500&auto=format&fit=crop",
      6: "https://images.unsplash.com/photo-1595475207225-428b62bda831?q=80&w=500&auto=format&fit=crop",
      7: "https://images.unsplash.com/photo-1607152571560-b32c8210f590?q=80&w=500&auto=format&fit=crop",
      8: "https://images.unsplash.com/photo-1599819055803-717bea16e6c6?q=80&w=500&auto=format&fit=crop",
      9: "https://images.unsplash.com/photo-1521302080334-4bebac2763a6?q=80&w=500&auto=format&fit=crop",
      10: "https://images.unsplash.com/photo-1508061253366-f7da158b9d31?q=80&w=500&auto=format&fit=crop",
      11: "https://images.unsplash.com/photo-1499889808931-317a0255c0e9?q=80&w=500&auto=format&fit=crop",
      12: "https://images.unsplash.com/photo-1504630083234-14187a9df0f5?q=80&w=500&auto=format&fit=crop",
      13: "https://images.unsplash.com/photo-1564182842519-8a3b2af3e228?q=80&w=500&auto=format&fit=crop",
      14: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?q=80&w=500&auto=format&fit=crop", 
      15: "https://images.unsplash.com/photo-1559138803-bcdd7e9a2176?q=80&w=500&auto=format&fit=crop",
      16: "https://images.unsplash.com/photo-1633693765316-c5d2b7c47ab5?q=80&w=500&auto=format&fit=crop",
      17: "https://images.unsplash.com/photo-1528750997573-91b62be67565?q=80&w=500&auto=format&fit=crop",
      18: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?q=80&w=500&auto=format&fit=crop"
    };
    return images[question.id as keyof typeof images] || "";
  };

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto p-6">
      <div className="w-full mb-6 bg-white/90 rounded-lg p-6 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-purple-700">
            Pregunta {currentQuestionIndex + 1} de {totalQuestions}
          </span>
          <div className="w-1/2 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-purple-600 h-2.5 rounded-full" 
              style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-4 flex justify-center">
          <img 
            src={getQuestionImage()} 
            alt={`Imagen para ${question.text}`}
            className="rounded-lg object-cover h-48 w-full max-w-md shadow-md"
          />
        </div>
        
        <h2 className="text-2xl font-semibold text-purple-900 mb-6 text-center">
          {question.text}
        </h2>
        
        <RadioGroup 
          value={currentAnswer} 
          onValueChange={onAnswer}
          className="flex flex-col space-y-4"
        >
          <label className="flex items-center space-x-2 border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-purple-50 transition-colors">
            <RadioGroupItem value="si" id="si" />
            <span className="text-lg">Sí</span>
          </label>
          <label className="flex items-center space-x-2 border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-purple-50 transition-colors">
            <RadioGroupItem value="indiferente" id="indiferente" />
            <span className="text-lg">Indiferente</span>
          </label>
          <label className="flex items-center space-x-2 border border-gray-200 rounded-md p-4 cursor-pointer hover:bg-purple-50 transition-colors">
            <RadioGroupItem value="no" id="no" />
            <span className="text-lg">No</span>
          </label>
        </RadioGroup>
      </div>
      
      <div className="flex justify-between w-full mt-4">
        <Button 
          onClick={onPrevious} 
          disabled={isFirst} 
          variant="outline"
          className={`flex items-center ${isFirst ? 'invisible' : ''}`}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        <Button 
          onClick={onNext} 
          disabled={!currentAnswer} 
          className="bg-purple-700 hover:bg-purple-800 text-white flex items-center"
        >
          {isLast ? 'Ver resultados' : 'Siguiente'}
          {!isLast && <ChevronRight className="h-4 w-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
};

export default QuizQuestion;
