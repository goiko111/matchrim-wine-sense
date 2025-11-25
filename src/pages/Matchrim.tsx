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
import { useQuizResults } from '@/hooks/useQuizResults';

const Matchrim = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveQuizResult, getQuizHistory, isSaving } = useQuizResults();
  const [currentStep, setCurrentStep] = useState('intro'); // 'intro', 'quiz', 'results'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [quizResult, setQuizResult] = useState(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Load saved quiz results on mount
  useEffect(() => {
    const loadSavedResults = async () => {
      if (user) {
        // For authenticated users, load from database
        const history = await getQuizHistory();
        if (history && history.length > 0) {
          const lastResult = history[0];
          setQuizResult({
            potente: lastResult.potente,
            acidez: lastResult.acidez,
            dulce: lastResult.dulce,
            tanico: lastResult.tanico,
            afrutado: lastResult.afrutado
          });
          setCurrentStep('results');
        }
      } else {
        const savedResult = localStorage.getItem('matchrim_quiz_result');
        const savedAnswers = localStorage.getItem('matchrim_quiz_answers');

        if (savedResult) {
          setQuizResult(JSON.parse(savedResult));
          if (savedAnswers) {
            setAnswers(JSON.parse(savedAnswers));
          }
          setCurrentStep('results');
        }
      }
    };

    loadSavedResults();
  }, [user, getQuizHistory]);

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

      // Save results based on user authentication status
      if (user) {
        saveQuizResult(result, newAnswers);
      } else {
        localStorage.setItem('matchrim_quiz_result', JSON.stringify(result));
        localStorage.setItem('matchrim_quiz_answers', JSON.stringify(newAnswers));
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
    // Clear localStorage for anonymous users
    if (!user) {
      localStorage.removeItem('matchrim_quiz_result');
      localStorage.removeItem('matchrim_quiz_answers');
      localStorage.removeItem('matchrim_test_completed');
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
            <Card className="max-w-2xl w-full bg-white/95 backdrop-blur shadow-2xl">
              <CardContent className="pt-8 pb-8 px-6 md:px-10">
                <div className="text-center space-y-6">
                  {/* Icon */}
                  <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg">
                    <Wine className="h-12 w-12 text-white" />
                  </div>

                  {/* Title */}
                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-4xl font-bold text-red-900">
                      ¡Desbloquea todo el potencial de Winerim!
                    </h2>
                    <p className="text-lg text-red-700 font-medium">
                      Ya completaste tu test gratuito. Regístrate ahora y disfruta de beneficios exclusivos.
                    </p>
                  </div>

                  {/* Benefits List */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200 text-left space-y-4">
                    <h3 className="font-bold text-xl text-red-900 text-center mb-4">
                      ✨ Con tu cuenta gratuita obtienes:
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Tests ilimitados</p>
                          <p className="text-sm text-gray-700">Repite el test todas las veces que quieras</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Historial completo</p>
                          <p className="text-sm text-gray-700">Guarda y compara todos tus resultados</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Recomendaciones personalizadas</p>
                          <p className="text-sm text-gray-700">Vinos perfectos para tu perfil único</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Maridajes inteligentes</p>
                          <p className="text-sm text-gray-700">Encuentra el vino perfecto para cada comida</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Base de datos completa</p>
                          <p className="text-sm text-gray-700">Acceso a miles de vinos catalogados</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Sin anuncios</p>
                          <p className="text-sm text-gray-700">Experiencia premium sin interrupciones</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CTA Buttons */}
                  <div className="space-y-3 pt-4">
                    <Button
                      onClick={() => navigate('/auth')}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-lg py-6 shadow-lg hover:shadow-xl transition-all duration-300 font-bold"
                    >
                      🚀 Crear cuenta gratis ahora
                    </Button>
                    <Button
                      onClick={handleBackToHome}
                      variant="outline"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                    >
                      Volver al inicio
                    </Button>
                  </div>

                  {/* Footer note */}
                  <p className="text-sm text-gray-600 pt-2">
                    🔒 Registro 100% gratuito • No requiere tarjeta de crédito
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Matchrim;