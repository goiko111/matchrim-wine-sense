
import React, { useState } from 'react';
import QuizIntro from '../components/QuizIntro';
import QuizQuestion from '../components/QuizQuestion';
import QuizResults from '../components/QuizResults';
import { questions, calculateProfile, getProfileDescription, getRecommendedWines, QuizResult } from '../data/quizData';
import { toast } from "@/hooks/use-toast";

enum QuizState {
  INTRO,
  QUESTIONS,
  RESULTS
}

const Index = () => {
  const [quizState, setQuizState] = useState<QuizState>(QuizState.INTRO);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [profileDescription, setProfileDescription] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleStartQuiz = () => {
    setQuizState(QuizState.QUESTIONS);
    setCurrentQuestionIndex(0);
    setAnswers({});
  };

  const handleAnswer = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestionIndex].id]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate results
      const profileResult = calculateProfile(answers);
      setResult(profileResult);
      setProfileDescription(getProfileDescription(profileResult));
      setRecommendations(getRecommendedWines(profileResult));
      setQuizState(QuizState.RESULTS);
      toast({
        title: "¡Test completado!",
        description: "Descubre tu perfil sensorial para el vino.",
      });
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleRestart = () => {
    setQuizState(QuizState.INTRO);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setResult(null);
  };

  return (
    <div className="min-h-screen winerim-bg py-8 px-4">
      <div className="container mx-auto">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/b9329c73-68b0-4f4a-96a2-c96545694186.png" 
              alt="Winerim Logo" 
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-3xl font-bold text-white">Winerim</h1>
          </div>
        </div>
        
        {quizState === QuizState.INTRO && (
          <QuizIntro onStart={handleStartQuiz} />
        )}
        
        {quizState === QuizState.QUESTIONS && (
          <QuizQuestion
            question={questions[currentQuestionIndex]}
            currentAnswer={answers[questions[currentQuestionIndex].id] || ""}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirst={currentQuestionIndex === 0}
            isLast={currentQuestionIndex === questions.length - 1}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
          />
        )}
        
        {quizState === QuizState.RESULTS && result && (
          <QuizResults
            result={result}
            description={profileDescription}
            recommendations={recommendations}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
