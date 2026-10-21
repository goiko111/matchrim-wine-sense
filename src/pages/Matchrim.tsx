import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNavigate, useSearchParams } from 'react-router-dom';
import QuizIntro from '@/components/QuizIntro';
import QuizQuestion from '@/components/QuizQuestion';
import QuizResults from '@/components/QuizResults';
import { questions, calculateProfile, getProfileDescription } from '@/data/quizData';
import { getDiverseWineRecommendations, UserProfile, WineRecommendation } from '@/utils/wineRecommendations';
import { generateWineStyles } from '@/utils/profileUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, CheckCircle, Loader2, RefreshCw, Wine } from 'lucide-react';
import AppNav from '@/components/AppNav';
import { readMatchrimLocalProfile } from '@/utils/matchrimLocalProfile';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { useQuizResults } from '@/hooks/useQuizResults';
import { buildAuthRedirectPath, getSafeRedirectPath } from '@/utils/navigation';

const NativeMatchrimLoading = () => (
  <div className="matchrim-native-page-top min-h-screen bg-white px-4 text-slate-700" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
    <section role="status" aria-live="polite" aria-busy="true" className="mx-auto flex max-w-2xl items-center gap-2 border-y border-slate-200 py-4">
      <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
      <p>Cargando tu test guardado...</p>
    </section>
  </div>
);

const MatchrimSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { saveQuizResult, getQuizHistory, isSaving } = useQuizResults();
  const returnTo = getSafeRedirectPath(searchParams.get('returnTo'), '');
  const [currentStep, setCurrentStep] = useState('intro'); // 'intro', 'quiz', 'results'
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: number]: string }>({});
  const [quizResult, setQuizResult] = useState(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const nativeRetake = isNative && searchParams.get('retake') === '1';
  const hasStartedQuiz = useRef(false);
  const [nativeHistoryStatus, setNativeHistoryStatus] = useState<'loading' | 'ready' | 'error'>(user ? 'loading' : 'ready');
  const [nativeHistoryRetry, setNativeHistoryRetry] = useState(0);
  const nativeHistoryPending = useRef(false);
  const nativeHistoryReader = useRef(getQuizHistory);
  nativeHistoryReader.current = getQuizHistory;
  const nativeSubmissionPending = useRef(false);
  const [nativeSaveStatus, setNativeSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unconfirmed'>('idle');
  const saveLifetime = useRef({ active: true, generation: 0 });
  useEffect(() => {
    const lifetime = saveLifetime.current;
    lifetime.active = true;
    return () => { lifetime.active = false; lifetime.generation += 1; };
  }, []);

  // Load saved quiz results on mount
  useEffect(() => {
    if (isNative && hasStartedQuiz.current) return;
    let active = true;
    const controller = isNative && user ? new AbortController() : null;
    let deadline: number | undefined;
    const loadSavedResults = async () => {
      if (user) {
        // For authenticated users, load from database
        if (controller) {
          nativeHistoryPending.current = true;
          setNativeHistoryStatus('loading');
        }
        try {
          const history = controller ? await Promise.race([
            nativeHistoryReader.current({ signal: controller.signal, throwOnError: true }),
            new Promise<never>((_resolve, reject) => {
              deadline = window.setTimeout(() => { controller.abort(); reject(new Error('QUIZ_HISTORY_TIMEOUT')); }, 12000);
            }),
          ]) : await getQuizHistory();
          if (!active || hasStartedQuiz.current) return;
          if (history && history.length > 0 && !nativeRetake) {
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
          if (controller) setNativeHistoryStatus('ready');
        } catch (error) {
          if (!controller) throw error;
          if (active && !hasStartedQuiz.current) setNativeHistoryStatus('error');
        } finally {
          if (deadline !== undefined) window.clearTimeout(deadline);
          if (active && controller) nativeHistoryPending.current = false;
        }
      } else {
        const savedResult = readMatchrimLocalProfile();
        const savedAnswers = localStorage.getItem('matchrim_quiz_answers');

        if (savedResult) {
          setQuizResult(savedResult);
          if (savedAnswers) {
            try { setAnswers(JSON.parse(savedAnswers)); } catch { setAnswers({}); }
          }
          setCurrentStep('results');
        }
      }
    };

    loadSavedResults();
    return () => {
      active = false;
      controller?.abort();
      if (deadline !== undefined) window.clearTimeout(deadline);
    };
  }, [isNative ? user?.id : user, isNative ? null : getQuizHistory, isNative, nativeHistoryRetry, nativeRetake]);

  const handleRetryHistory = () => {
    if (!isNative || !user || hasStartedQuiz.current || nativeHistoryPending.current || nativeHistoryStatus !== 'error') return;
    nativeHistoryPending.current = true;
    setNativeHistoryStatus('loading');
    setNativeHistoryRetry(value => value + 1);
  };

  const handleStart = () => {
    if (isNative && user && nativeHistoryStatus !== 'ready') return;
    hasStartedQuiz.current = true;
    setCurrentStep('quiz');
  };

  const advanceAnswer = (value: string) => {
    if (isNative && nativeSubmissionPending.current) return;
    const questionId = questions[currentQuestionIndex].id;
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      if (isNative) nativeSubmissionPending.current = true;
      // Quiz completed, calculate results
      const result = calculateProfile(newAnswers);
      setQuizResult(result);
      setCurrentStep('results');

      // Save results based on user authentication status
      if (user) {
        if (!isNative) saveQuizResult(result, newAnswers);
        else {
          setNativeSaveStatus('saving');
          const generation = ++saveLifetime.current.generation;
          const settle = (confirmed: boolean) => {
            if (saveLifetime.current.active && saveLifetime.current.generation === generation) {
              setNativeSaveStatus(confirmed ? 'saved' : 'unconfirmed');
            }
          };
          void saveQuizResult(result, newAnswers).then(id => settle(Boolean(id))).catch(() => settle(false));
        }
      } else {
        localStorage.setItem('matchrim_quiz_result', JSON.stringify(result));
        localStorage.setItem('matchrim_quiz_answers', JSON.stringify(newAnswers));
        localStorage.setItem('matchrim_test_completed', 'true');
      }
    }
  };

  const handleAnswer = (value: string) => {
    if (!isNative) { advanceAnswer(value); return; }
    setAnswers(current => ({ ...current, [questions[currentQuestionIndex].id]: value }));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleBackToHome = () => {
    navigate(returnTo || '/');
  };

  const handleRestartQuiz = () => {
    if (isNative && user && nativeHistoryStatus !== 'ready') return;
    if (isNative && (isSaving || nativeSaveStatus === 'saving')) return;
    saveLifetime.current.generation += 1;
    setNativeSaveStatus('idle');
    hasStartedQuiz.current = true;
    nativeSubmissionPending.current = false;
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
    let active = true;
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
        if (!active) return;

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
        if (active) { console.error('Error fetching recommendations:', error); setRecommendations([]); }
      } finally {
        if (active) setIsLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
    return () => { active = false; };
  }, [quizResult]);

  if (isNative && user && nativeHistoryStatus === 'loading') return <><AppNav /><NativeMatchrimLoading /></>;

  if (isNative && user && nativeHistoryStatus === 'error') return (
    <div className="matchrim-native-page-top min-h-screen bg-white text-slate-700" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
      <AppNav />
      <section role="alert" className="mx-auto max-w-2xl border-y border-slate-200 px-4 py-5">
        <h1 className="text-lg font-semibold">No hemos podido cargar tu test guardado</h1>
        <p className="mt-2 text-sm">No necesitas repetirlo. Puedes volver a intentar cargarlo.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={handleRetryHistory} className="min-h-11 gap-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Reintentar carga</Button>
          <Button variant="outline" onClick={() => navigate('/profile')} className="min-h-11 gap-2"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver a mi perfil</Button>
        </div>
      </section>
    </div>
  );

  return (
    <div className="matchrim-quiz-page min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-950">
      {user && <AppNav />}
      {!user && <MobileBottomNav />}

      {/* Header with back button */}
      {!user && (
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className={isNative ? 'min-h-11 text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al inicio
          </Button>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 pb-20">
        {currentStep === 'intro' && (
          <QuizIntro onStart={handleStart} returnTo={returnTo} />
        )}

        {currentStep === 'quiz' && (
          <QuizQuestion
            question={questions[currentQuestionIndex]}
            currentAnswer={answers[questions[currentQuestionIndex].id] || ''}
            onAnswer={handleAnswer}
            onContinue={() => {
              const answer = answers[questions[currentQuestionIndex].id];
              if (answer) advanceAnswer(answer);
            }}
            onPrevious={handlePrevious}
            isFirst={currentQuestionIndex === 0}
            isLast={currentQuestionIndex === questions.length - 1}
            currentQuestionIndex={currentQuestionIndex}
            totalQuestions={questions.length}
            onBackToStart={handleBackToHome}
          />
        )}

        {currentStep === 'results' && quizResult && (
          <>
          {isNative && user && nativeSaveStatus !== 'idle' && <section
            className="mx-auto mb-5 max-w-2xl border-y border-slate-200 py-3 text-sm text-slate-700"
            role="status" aria-live="polite" aria-atomic="true" aria-busy={nativeSaveStatus === 'saving'}
          >
            <p className="flex items-start gap-2">
              {nativeSaveStatus === 'saving' && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}
              {nativeSaveStatus === 'saved' && <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />}
              {nativeSaveStatus === 'saving' ? 'Guardando tu perfil en la cuenta...'
                : nativeSaveStatus === 'saved' ? 'Perfil guardado en tu cuenta.'
                  : 'No hemos podido confirmar el guardado. Revisa tu perfil antes de repetir el test.'}
            </p>
            {nativeSaveStatus === 'unconfirmed' && <Button variant="outline" className="mt-3 min-h-11" onClick={() => navigate('/profile')}>Revisar mi perfil</Button>}
          </section>}
          <QuizResults
            result={quizResult}
            description={getProfileDescription(quizResult)}
            recommendations={recommendations}
            onRestart={handleRestartQuiz}
            isLoggedIn={!!user}
            returnTo={returnTo}
            restartDisabled={isNative && (isSaving || nativeSaveStatus === 'saving')}
          />
          </>
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
                      onClick={() => navigate(buildAuthRedirectPath(returnTo || '/profile'))}
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

const Matchrim = () => {
  const { user, loading: authLoading } = useAuth();
  if (Capacitor.isNativePlatform() && authLoading) return <NativeMatchrimLoading />;
  return <MatchrimSession key={user?.id ?? 'anonymous'} />;
};

export default Matchrim;
