
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { ArrowRight, BrainCircuit, ChefHat, GlassWater, MessageCircle, Sparkles, Utensils } from 'lucide-react';
import AppNav from '@/components/AppNav';
import { useAuth } from '@/contexts/AuthContext';
import MatchrimFunction from '@/components/MatchrimFunction';
import SpecialMomentsFlow from '@/components/SpecialMomentsFlow';
import MobileBottomNav from '@/components/MobileBottomNav';
import AiRimConversation from '@/components/AiRimConversation';
import { Input } from '@/components/ui/input';
import AiRimMark from '@/components/AiRimMark';

type AppState = 'landing' | 'function' | 'conversation';
type FunctionType = 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';

const VALID_FUNCTIONS: FunctionType[] = ['wine-for-dish', 'dish-for-wine', 'pairing-check', 'special-moments'];

const LiquidIntelligence = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNative = Capacitor.isNativePlatform();
  const [searchParams] = useSearchParams();
  const [currentState, setCurrentState] = useState<AppState>('landing');
  const [selectedFunction, setSelectedFunction] = useState<FunctionType | null>(null);
  const [initialInput1, setInitialInput1] = useState<string>('');
  const [initialInput2, setInitialInput2] = useState<string>('');
  const [freeQuestion, setFreeQuestion] = useState('');
  const [conversationQuestion, setConversationQuestion] = useState('');

  useEffect(() => {
    if (!isNative) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentState, isNative]);

  useEffect(() => {
    const rawFunction = searchParams.get('function');
    const fn = rawFunction as FunctionType | null;
    const wineParam = searchParams.get('wine') || '';
    const dishParam = searchParams.get('dish') || '';

    if (rawFunction === 'wine-fit' || rawFunction === 'similar-wine') {
      setConversationQuestion(rawFunction === 'similar-wine'
        ? `Recomiéndame tres vinos parecidos a ${wineParam}. Explica qué conservarías y qué cambiaría en cada alternativa.`
        : `Explícame cómo encaja ${wineParam} con mi perfil Matchrim: coincidencias, fricciones, confianza y una alternativa más segura.`);
      setCurrentState('conversation');
      return;
    }

    if (fn && VALID_FUNCTIONS.includes(fn)) {
      setSelectedFunction(fn);
      setCurrentState('function');
      if (fn === 'wine-for-dish') {
        setInitialInput1(dishParam);
        setInitialInput2('');
      } else if (fn === 'dish-for-wine') {
        setInitialInput1(wineParam);
        setInitialInput2('');
      } else if (fn === 'pairing-check') {
        setInitialInput1(wineParam);
        setInitialInput2(dishParam);
      }
    }
  }, [searchParams]);

  const handleSelectFunction = (functionType: FunctionType) => {
    setSelectedFunction(functionType);
    setInitialInput1('');
    setInitialInput2('');
    setCurrentState('function');
  };

  const handleBackToMenu = () => {
    setCurrentState('landing');
    setSelectedFunction(null);
    setInitialInput1('');
    setInitialInput2('');
    navigate('/inteligencia-liquida', { replace: true });
  };

  const openConversation = () => {
    const question = freeQuestion.trim();
    if (!question) return;
    setConversationQuestion(question);
    setCurrentState('conversation');
  };

  const renderLanding = () => {
    const actions = [
      { id: 'wine-for-dish' as const, title: 'Vino para un plato', detail: 'Con gusto y presupuesto', icon: Utensils },
      { id: 'dish-for-wine' as const, title: 'Plato para un vino', detail: 'Servicio y preparación', icon: GlassWater },
      { id: 'pairing-check' as const, title: 'Comprobar maridaje', detail: 'Fortalezas y fricciones', icon: ChefHat },
      { id: 'special-moments' as const, title: 'Elegir para una ocasión', detail: 'Personas, menú y presupuesto', icon: Sparkles },
    ];

    return (
      <main className="matchrim-native-airim-main matchrim-native-safe-x mx-auto w-full max-w-2xl pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))] sm:pt-6">
        <div className="flex min-h-12 items-center gap-3">
          {isNative ? (
            <AiRimMark className="h-11 w-11 rounded-lg bg-red-950 text-white ring-red-950" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-950 text-white">
              <BrainCircuit className="h-5 w-5" />
            </span>
          )}
          <div>
            <p className="text-sm font-semibold text-red-800">Tu copiloto de vino</p>
            <h1 className="text-2xl font-bold text-slate-950">aiRIM</h1>
          </div>
        </div>

        <section className="mt-7" aria-labelledby="airim-question-title">
          <h2 id="airim-question-title" className="text-[1.75rem] font-bold leading-tight text-slate-950">
            ¿Qué necesitas decidir?
          </h2>
          <p className="mt-2 text-[15px] leading-6 text-slate-600">
            Dame el vino, plato, ocasión o presupuesto. Separaré hechos, inferencias y preferencias.
          </p>
          <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <MessageCircle className="ml-2 h-5 w-5 shrink-0 text-red-800" />
            <label htmlFor="airim-quick-question" className="sr-only">Pregunta para aiRIM</label>
            <Input
              id="airim-quick-question"
              value={freeQuestion}
              onChange={(event) => setFreeQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') openConversation();
              }}
              placeholder="Ej. Vino para arroz, máximo 30 €"
              className="h-12 min-w-0 border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={openConversation}
              disabled={!freeQuestion.trim()}
              className="matchrim-pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-900 text-white disabled:opacity-40"
              aria-label="Abrir conversación"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="airim-actions-title">
          <h2 id="airim-actions-title" className="text-base font-bold text-slate-950">Decisiones frecuentes</h2>
          <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => handleSelectFunction(action.id)}
                  className="matchrim-pressable flex min-h-[4.75rem] w-full items-center gap-3 py-3 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-950">{action.title}</span>
                    <span className="mt-0.5 block text-sm text-slate-500">{action.detail}</span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-7 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          aiRIM usa tu perfil cuando está disponible. Las fotos siguen en el flujo Escanear y no se incorporan a memoria por conversar aquí.
        </section>
      </main>
    );
  };

  const renderContent = () => {
    switch (currentState) {
      case 'landing':
        return renderLanding();
      case 'conversation':
        return <AiRimConversation onBack={handleBackToMenu} initialQuestion={conversationQuestion} />;
      case 'function':
        if (!selectedFunction) return null;
        if (selectedFunction === 'special-moments') {
          return <SpecialMomentsFlow onBack={handleBackToMenu} />;
        }
        return (
          <MatchrimFunction
            functionType={selectedFunction}
            onBack={handleBackToMenu}
            initialInput1={initialInput1}
            initialInput2={initialInput2}
          />
        );
      default:
        return renderLanding();
    }
  };

  return (
    <div className="matchrim-app-shell min-h-screen">
      {user && !isNative && <AppNav />}
      <div className="min-h-screen">
        {renderContent()}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default LiquidIntelligence;
