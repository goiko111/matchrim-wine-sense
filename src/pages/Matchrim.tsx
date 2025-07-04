import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuizIntro from '@/components/QuizIntro';
import QuizQuestion from '@/components/QuizQuestion';
import QuizResults from '@/components/QuizResults';
import { questions, calculateProfile, getProfileDescription } from '@/data/quizData';
import { getDiverseWineRecommendations, UserProfile, WineRecommendation } from '@/utils/wineRecommendations';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Matchrim = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('intro'); // 'intro', 'quiz', 'results'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [quizResult, setQuizResult] = useState(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  const handleStart = () => {
    setCurrentStep('quiz');
  };

  const handleAnswer = (value: string) => {
    const questionId = questions[currentQuestionIndex].id;
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Quiz completed, calculate results
      const result = calculateProfile(newAnswers);
      setQuizResult(result);
      setCurrentStep('results');
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleRestartQuiz = () => {
    setCurrentStep('intro');
    setCurrentQuestionIndex(0);
    setAnswers({});
    setQuizResult(null);
    setRecommendations([]);
  };

  // Fetch recommendations when quiz result is available
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!quizResult) return;
      
      setIsLoadingRecommendations(true);
      try {
        const userProfile: UserProfile = {
          potente: quizResult.potente,
          acidez: quizResult.acidez,
          dulce: quizResult.dulce,
          tanico: quizResult.tanico,
          afrutado: quizResult.afrutado
        };
        
        const wineRecommendations = await getDiverseWineRecommendations(userProfile, 8);
        
        // Convert to the format expected by QuizResults
        const formattedRecommendations = wineRecommendations.map(rec => {
          const wine = rec.wine;
          const region = wine.region || 'No especificada';
          const country = wine.region?.includes('España') || wine.region?.includes('Spain') ? 'España' : 'Internacional';
          return `${wine.name}, ${wine.estilo}, ${wine.producer || 'Desconocido'}, ${region}, ${country}`;
        });
        
        setRecommendations(formattedRecommendations);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setRecommendations([]);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [quizResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-950">
      {/* Header with back button */}
      <div className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          onClick={handleBackToHome}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al inicio
        </Button>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 pb-20">
        {currentStep === 'intro' && (
          <QuizIntro onStart={handleStart} />
        )}

        {currentStep === 'quiz' && (
          <QuizQuestion
            question={questions[currentQuestionIndex]}
            currentAnswer={answers[questions[currentQuestionIndex].id] || ''}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isFirst={currentQuestionIndex === 0}
            isLast={currentQuestionIndex === questions.length - 1}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            onBackToStart={handleBackToHome}
          />
        )}

        {currentStep === 'results' && quizResult && (
          <QuizResults
            result={quizResult}
            description={getProfileDescription(quizResult)}
            recommendations={recommendations}
            onRestart={handleRestartQuiz}
          />
        )}
      </div>
    </div>
  );
};

export default Matchrim;