import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuizIntro from '@/components/QuizIntro';
import QuizQuestion from '@/components/QuizQuestion';
import QuizResults from '@/components/QuizResults';
import { questions, calculateProfile, getProfileDescription } from '@/data/quizData';
import { getDiverseWineRecommendations, UserProfile, WineRecommendation } from '@/utils/wineRecommendations';
import { generateWineStyles } from '@/utils/profileUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Wine } from 'lucide-react';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';

const Matchrim = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState('intro'); // 'intro', 'quiz', 'results'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [quizResult, setQuizResult] = useState(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Check if user has already taken the test (for non-logged users)
  useEffect(() => {
    if (!user) {
      const hasCompletedTest = localStorage.getItem('matchrim_test_completed');
      if (hasCompletedTest === 'true') {
        setCurrentStep('limit-reached');
      }
    }
  }, [user]);

  const handleStart = () => {
    // Check if non-logged user has already completed the test
    if (!user) {
      const hasCompletedTest = localStorage.getItem('matchrim_test_completed');
      if (hasCompletedTest === 'true') {
        setCurrentStep('limit-reached');
        return;
      }
    }
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
      
      // Mark test as completed for non-logged users
      if (!user) {
        localStorage.setItem('matchrim_test_completed', 'true');
      }
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
    // Only allow restart for logged users
    if (!user) {
      setCurrentStep('limit-reached');
      return;
    }
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
        
        // Get recommended styles for the user profile
        const recommendedStyles = generateWineStyles(quizResult);
        
        const wineRecommendations = await getDiverseWineRecommendations(userProfile, 12, recommendedStyles);
        
        // Convert to the format expected by QuizResults
        const formattedRecommendations = wineRecommendations.map(rec => {
          const wine = rec.wine;
          const region = wine.region || 'No especificada';
          
          // Extraer el país desde la región
          let country = 'Desconocido';
          const regionLower = region.toLowerCase();
          
          if (
            regionLower.includes('españa') || regionLower.includes('spain') ||
            regionLower.includes('rioja') || regionLower.includes('ribera') || regionLower.includes('priorat') ||
            regionLower.includes('rías baixas') || regionLower.includes('rias baixas') ||
            regionLower.includes('cataluña') || regionLower.includes('cataluna') ||
            regionLower.includes('costers del segre') ||
            regionLower.includes('castilla y león') || regionLower.includes('castilla y leon') ||
            regionLower.includes('tierra de castilla y león') || regionLower.includes('tierra de castilla y leon') ||
            regionLower.includes('granada') ||
            regionLower.includes('rueda') || regionLower.includes('navarra') ||
            regionLower.includes('penedès') || regionLower.includes('penedes')
          ) {
            country = 'España';
          } else if (
            regionLower.includes('francia') || regionLower.includes('france') ||
            regionLower.includes('bordeaux') || regionLower.includes('borgoña') || regionLower.includes('burgundy') ||
            regionLower.includes('champagne') || regionLower.includes('banyuls') ||
            regionLower.includes('roussillon') || regionLower.includes('languedoc')
          ) {
            country = 'Francia';
          } else if (
            regionLower.includes('italia') || regionLower.includes('italy') ||
            regionLower.includes('toscana') || regionLower.includes('tuscany') ||
            regionLower.includes('piemonte') || regionLower.includes('piedmont') ||
            regionLower.includes("barbera d'asti") || regionLower.includes('asti')
          ) {
            country = 'Italia';
          } else if (regionLower.includes('portugal')) {
            country = 'Portugal';
          } else if (regionLower.includes('alemania') || regionLower.includes('germany') || regionLower.includes('mosel') || regionLower.includes('rheingau')) {
            country = 'Alemania';
          } else if (regionLower.includes('argentina') || regionLower.includes('mendoza')) {
            country = 'Argentina';
          } else if (regionLower.includes('chile') || regionLower.includes('maipo') || regionLower.includes('colchagua')) {
            country = 'Chile';
          } else if (regionLower.includes('estados unidos') || regionLower.includes('united states') || regionLower.includes('usa') || regionLower.includes('california') || regionLower.includes('napa') || regionLower.includes('sonoma')) {
            country = 'Estados Unidos';
          } else if (regionLower.includes('australia') || regionLower.includes('barossa')) {
            country = 'Australia';
          } else if (regionLower.includes('nueva zelanda') || regionLower.includes('new zealand') || regionLower.includes('marlborough')) {
            country = 'Nueva Zelanda';
          } else if (regionLower.includes('sudáfrica') || regionLower.includes('south africa')) {
            country = 'Sudáfrica';
          } else if (regionLower.includes('grecia') || regionLower.includes('greece')) {
            country = 'Grecia';
          } else if (regionLower.includes('georgia')) {
            country = 'Georgia';
          }
          
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
      {user && <AppNav />}
      
      {/* Header with back button */}
      {!user && (
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
      )}

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
            isLoggedIn={!!user}
          />
        )}

        {currentStep === 'limit-reached' && (
          <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Card className="max-w-md w-full bg-white/95 backdrop-blur">
              <CardContent className="pt-6 text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <Wine className="h-10 w-10 text-red-900" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-red-900">
                    Ya has completado el test
                  </h2>
                  <p className="text-red-700">
                    Los usuarios sin cuenta pueden realizar el test una sola vez.
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full bg-red-900 hover:bg-red-800 text-white"
                  >
                    Crear cuenta gratis
                  </Button>
                  <Button
                    onClick={handleBackToHome}
                    variant="outline"
                    className="w-full"
                  >
                    Volver al inicio
                  </Button>
                </div>
                <p className="text-sm text-red-600">
                  Regístrate para repetir el test ilimitadamente y guardar tus resultados
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matchrim;