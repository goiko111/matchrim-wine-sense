import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BrainCircuit, LoaderCircle, Send, Sparkles, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
import { generateMatchrimCode, type MatchrimProfileLike } from '@/utils/matchrimPassport';
import { AIRIM_EVIDENCE_GUARDRAILS } from '@/utils/aiRimGrounding';

type ConversationMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
};

interface AiRimConversationProps {
  onBack: () => void;
  initialQuestion?: string;
}

const AiRimConversation = ({ onBack, initialQuestion = '' }: AiRimConversationProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState(initialQuestion);
  const [isLoading, setIsLoading] = useState(false);
  const [profileContext, setProfileContext] = useState<string | null>(null);
  const [learningSamples, setLearningSamples] = useState(0);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Cuéntame qué vino, plato, carta u ocasión tienes delante. Te daré una decisión concreta y señalaré lo que no pueda saber.',
    },
  ]);

  useEffect(() => {
    if (!user) {
      setProfileContext(null);
      setLearningSamples(0);
      return;
    }

    let cancelled = false;

    const loadContext = async () => {
      const [{ data: baseProfile }, { data: trainingWines }] = await Promise.all([
        supabase
          .from('quiz_results')
          .select('potente, acidez, dulce, tanico, afrutado')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_wines')
          .select('rating, sensory_attributes')
          .eq('user_id', user.id)
          .eq('use_for_profile_training', true)
          .not('rating', 'is', null)
          .not('sensory_attributes', 'is', null),
      ]);

      if (cancelled || !baseProfile) return;
      const learned = calculateLearnedMatchrimProfile(
        baseProfile as MatchrimProfileLike,
        (trainingWines || []) as TrainableWine[],
      );
      const active = learned.samples > 0 ? learned.profile : (baseProfile as MatchrimProfileLike);
      setLearningSamples(learned.samples);
      setProfileContext([
        `Código Matchrim estable: ${generateMatchrimCode(baseProfile as MatchrimProfileLike)}.`,
        `Perfil activo 0-5: potencia ${active.potente}, acidez ${active.acidez}, dulzura ${active.dulce}, taninos ${active.tanico}, fruta ${active.afrutado}.`,
        learned.samples > 0
          ? `Aprendizaje basado en ${learned.samples} valoraciones explícitas; confianza ${learned.confidence}%.`
          : 'Sin aprendizaje por valoraciones todavía; usa únicamente el test base.',
        AIRIM_EVIDENCE_GUARDRAILS,
      ].join('\n'));
    };

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const memoryLabel = useMemo(() => {
    if (!user) return 'Sin memoria personal';
    if (learningSamples > 0) return `Perfil + ${learningSamples} valoraciones`;
    if (profileContext) return 'Perfil Matchrim base';
    return 'Perfil aún no disponible';
  }, [learningSamples, profileContext, user]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
    };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-wine-chat', {
        body: {
          message: question,
          context: [
            'aiRIM dentro de Matchrim. Responde con una recomendación accionable, breve y trazable.',
            profileContext,
            AIRIM_EVIDENCE_GUARDRAILS,
          ].filter(Boolean).join('\n'),
        },
      });
      if (error) throw error;
      if (!data?.success || !data?.response) throw new Error(data?.error || 'Respuesta vacía');

      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: String(data.response),
      }]);
    } catch (error) {
      console.error('Error asking aiRIM:', error);
      toast.error('aiRIM no está disponible ahora. Tu pregunta no se ha perdido.');
      setInput(question);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="matchrim-native-safe-x mx-auto w-full max-w-2xl pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))] sm:pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="matchrim-pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Volver a aiRIM"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">aiRIM</p>
          <h1 className="truncate text-xl font-bold text-slate-950">Decide con contexto</h1>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(user ? '/profile' : '/matchrim')}
        className="matchrim-pressable mt-5 flex min-h-14 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left shadow-sm"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-900">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-slate-500">Memoria usada en esta conversación</span>
          <span className="block truncate text-sm font-semibold text-slate-900">{memoryLabel}</span>
        </span>
        <span className="text-xs font-semibold text-red-900">Gestionar</span>
      </button>

      <section className="mt-6 space-y-3" aria-label="Conversación con aiRIM" aria-live="polite">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-950 text-white">
                <BrainCircuit className="h-4 w-4" />
              </span>
            )}
            <div className={`max-w-[84%] rounded-lg px-4 py-3 text-sm leading-6 ${
              message.role === 'user'
                ? 'bg-slate-950 text-white'
                : 'border border-slate-200 bg-white text-slate-700 shadow-sm'
            }`}>
              <p className="whitespace-pre-wrap">{message.text}</p>
            </div>
            {message.role === 'user' && (
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                <UserRound className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-500" role="status">
            <LoaderCircle className="h-4 w-4 animate-spin text-red-800" />
            Contrastando tu perfil y la consulta...
          </div>
        )}
      </section>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <label htmlFor="airim-question" className="sr-only">Pregunta para aiRIM</label>
        <Textarea
          id="airim-question"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ej. Tengo lubina, 25 € por botella y prefiero vinos frescos"
          className="min-h-24 resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          disabled={isLoading}
        />
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-2">
          <p className="text-xs leading-4 text-slate-500">No inventaré datos que no estén disponibles.</p>
          <Button
            type="button"
            size="icon"
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isLoading}
            className="matchrim-pressable h-11 w-11 shrink-0 rounded-full bg-red-900 hover:bg-red-950"
            aria-label="Enviar pregunta"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </main>
  );
};

export default AiRimConversation;
