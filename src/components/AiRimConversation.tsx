import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BrainCircuit, LoaderCircle, ScanLine, Send, Sparkles, UserRound } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { calculateLearnedMatchrimProfile, type TrainableWine } from '@/utils/matchrimLearning';
import { generateMatchrimCode, type MatchrimProfileLike } from '@/utils/matchrimPassport';
import { AIRIM_EVIDENCE_GUARDRAILS } from '@/utils/aiRimGrounding';
import AiRimMark from '@/components/AiRimMark';
import { cellarTrainingRows } from '@/utils/bodegaAffinity';
import { loadMatchrimScanProfile } from '@/services/matchrimScanProfile';
import { aiRimRequestContext95, assertAiRimConsumerAnswer95, buildAiRimConsumer95, loadAiRimConsumer95, pendingAiRimConsumer95, type AiRimConsumerContext95 } from '@/utils/aiRimConsumer95';

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
  const isNative = Capacitor.isNativePlatform();
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerId = user?.id ?? null;
  const currentOwner = useRef(ownerId);
  currentOwner.current = ownerId;
  const [input, setInput] = useState(initialQuestion);
  const [isLoading, setIsLoading] = useState(false);
  const [profileContext, setProfileContext] = useState<string | null>(null);
  const [learningSamples, setLearningSamples] = useState(0);
  const [nativeProfile, setNativeProfile] = useState(() => buildAiRimConsumer95(ownerId, null));
  const [nativeRequestContext, setNativeRequestContext] = useState<AiRimConsumerContext95 | null>(null);
  const pendingNativeMessage = useRef<ConversationMessage | null>(null);
  const requestController = useRef<AbortController | null>(null);
  const contextOwner = useRef(user?.id);
  useEffect(() => () => {
    requestController.current?.abort();
    if (isNative) requestController.current = null;
  }, [user?.id, isNative]);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Cuéntame qué vino, plato, carta u ocasión tienes delante. Te daré una decisión concreta y señalaré lo que no pueda saber.',
    },
  ]);

  useEffect(() => {
    if (contextOwner.current !== user?.id) {
      requestController.current?.abort();
      requestController.current = null;
      setMessages((current) => current.filter(message => message.id === 'welcome'));
      setInput('');
      setIsLoading(false);
      if (isNative) { setNativeRequestContext(null); pendingNativeMessage.current = null; }
      contextOwner.current = user?.id;
    }
    if (isNative) {
      const controller = new AbortController();
      setNativeProfile(buildAiRimConsumer95(ownerId, null));
      void loadAiRimConsumer95(ownerId, controller.signal, signal => loadMatchrimScanProfile(ownerId, signal))
        .then(context => {
          if (!controller.signal.aborted && currentOwner.current === ownerId) setNativeProfile(context);
        }).catch(() => { /* Owner change/unmount cancels this context, never the next owner's. */ });
      return () => controller.abort();
    }
    if (!user) {
      setProfileContext(null);
      setLearningSamples(0);
      return;
    }

    let cancelled = false;
    setProfileContext(null);
    setLearningSamples(0);

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
          .select('id, name, producer, vintage, region, country, place_details, rating, sensory_attributes, use_for_profile_training, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('use_for_profile_training', true)
          .not('rating', 'is', null)
          .not('sensory_attributes', 'is', null),
      ]);

      if (cancelled || !baseProfile) return;
      const learned = calculateLearnedMatchrimProfile(
        baseProfile as MatchrimProfileLike,
        cellarTrainingRows((trainingWines || []) as TrainableWine[], isNative),
      );
      const active = learned.samples > 0 ? learned.profile : (baseProfile as MatchrimProfileLike);
      setLearningSamples(learned.samples);
      setProfileContext([
        `Código Matchrim estable: ${generateMatchrimCode(baseProfile as MatchrimProfileLike)}.`,
        `Perfil activo 0-5: potencia ${active.potente}, acidez ${active.acidez}, dulzura ${active.dulce}, taninos ${active.tanico}, fruta ${active.afrutado}.`,
        learned.samples > 0
          ? `Aprendizaje basado en ${learned.samples} valoraciones explícitas; confianza ${learned.confidence}%, coherencia ${learned.calibration.consistency}% y diversidad ${learned.calibration.diversity}%.${learned.calibration.conflicting ? ' Las señales se contradicen: dilo y no presentes la afinidad como estable.' : ''}`
          : 'Sin aprendizaje por valoraciones todavía; usa únicamente el test base.',
        AIRIM_EVIDENCE_GUARDRAILS,
      ].join('\n'));
    };

    loadContext();
    return () => {
      cancelled = true;
    };
  }, [user, isNative, ownerId]);

  const nativeContext = nativeProfile.ownerId === ownerId ? nativeProfile : pendingAiRimConsumer95(ownerId);
  const sentNativeContext = nativeRequestContext?.ownerId === ownerId ? nativeRequestContext : null;
  const nativeCanSend = Boolean(aiRimRequestContext95(ownerId, nativeContext));

  const memoryLabel = useMemo(() => {
    if (isNative) return (sentNativeContext ?? nativeContext).label;
    if (!user) return 'Sin memoria personal';
    if (learningSamples > 0) return `Perfil + ${learningSamples} ${learningSamples === 1 ? 'valoración' : 'valoraciones'}`;
    if (profileContext) return 'Perfil Matchrim base';
    return 'Perfil aún no disponible';
  }, [learningSamples, profileContext, user, isNative, sentNativeContext, nativeContext]);

  const cancelNativeMessage = () => {
    requestController.current?.abort();
    requestController.current = null;
    const pending = pendingNativeMessage.current;
    pendingNativeMessage.current = null;
    if (pending && currentOwner.current === ownerId) {
      setMessages(current => current.filter(message => message.id !== pending.id));
      setInput(pending.text);
    }
    setIsLoading(false);
  };

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isLoading) return;
    const requestContext = isNative ? aiRimRequestContext95(ownerId, nativeContext) : null;
    if (isNative && (!requestContext || requestController.current)) return;

    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: question,
    };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoading(true);
    const controller = new AbortController();
    requestController.current = controller;
    if (isNative) { setNativeRequestContext(requestContext); pendingNativeMessage.current = userMessage; }

    try {
      const { data, error } = await supabase.functions.invoke('ai-wine-chat', {
        signal: controller.signal,
        body: {
          message: question,
          context: [
            'aiRIM dentro de Matchrim. Responde con una recomendación accionable, breve y trazable.',
            isNative ? requestContext!.context : profileContext,
            AIRIM_EVIDENCE_GUARDRAILS,
          ].filter(Boolean).join('\n'),
        },
      });
      if (controller.signal.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
      if (requestController.current !== controller) return;
      if (isNative && currentOwner.current !== ownerId) return;
      if (error) throw error;
      if (!data?.success || !data?.response) throw new Error(data?.error || 'Respuesta vacía');

      let answer = String(data.response);
      if (isNative) {
        try { answer = assertAiRimConsumerAnswer95(answer); }
        catch { answer = 'Sin una ficha sensorial contrastada no puedo afirmar una afinidad personal con ese vino. Podría orientarte de forma general según el plato y la preparación. Escanea la etiqueta o carta para contrastar la referencia.'; }
        pendingNativeMessage.current = null;
      }
      setMessages((current) => [...current, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: answer,
      }]);
    } catch (error) {
      if (requestController.current !== controller) return;
      if (isNative && currentOwner.current !== ownerId) return;
      setMessages((current) => current.filter(message => message.id !== userMessage.id));
      setInput(question);
      if (controller.signal.aborted) return;
      console.error('Error asking aiRIM:', error);
      toast.error('aiRIM no está disponible ahora. Tu pregunta no se ha perdido.');
    } finally {
      if (requestController.current === controller && (!isNative || currentOwner.current === ownerId)) {
        requestController.current = null;
        if (isNative) pendingNativeMessage.current = null;
        setIsLoading(false);
      }
    }
  };

  if (isNative && contextOwner.current !== user?.id) return <p role="status">Actualizando el contexto de esta cuenta...</p>;

  return (
    <main className="matchrim-native-safe-x mx-auto w-full max-w-2xl pb-[calc(8rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))] sm:pt-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isNative ? () => { cancelNativeMessage(); onBack(); } : onBack}
          className="matchrim-pressable flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
          aria-label="Volver a aiRIM"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">aiRIM</p>
          <h1 className={isNative ? 'text-xl font-bold text-slate-950' : 'truncate text-xl font-bold text-slate-950'}>Decide con contexto</h1>
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate(user ? '/profile' : '/matchrim')}
        className={isNative ? 'matchrim-pressable mt-5 grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left shadow-sm' : 'matchrim-pressable mt-5 flex min-h-14 w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left shadow-sm'}
      >
        <span className={isNative ? 'row-span-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-900' : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-900'}>
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium text-slate-500">{isNative ? sentNativeContext ? 'Contexto enviado en esta consulta' : 'Contexto para tu próxima consulta' : 'Memoria usada en esta conversación'}</span>
          <span className={isNative ? 'block text-sm font-semibold text-slate-900' : 'block truncate text-sm font-semibold text-slate-900'}>{memoryLabel}</span>
        </span>
        <span className={isNative ? 'col-start-2 text-xs font-semibold text-red-900' : 'text-xs font-semibold text-red-900'}>Gestionar</span>
      </button>

      {isNative && <div className="mt-3 text-sm leading-6 text-slate-600" data-testid="airim-consumer-context">
        <p role="status">{(sentNativeContext ?? nativeContext).notice}</p>
        <p>Un consejo general no es una afinidad personal con una botella.</p>
        <Button variant="ghost" className="min-h-11 gap-2" onClick={() => { cancelNativeMessage(); navigate('/escanear'); }}><ScanLine className="h-4 w-4" />Escanear etiqueta o carta</Button>
      </div>}

      <section className="mt-6 space-y-3" aria-label="Conversación con aiRIM" aria-live="polite">
        {(isNative && contextOwner.current !== user?.id ? messages.filter(message => message.id === 'welcome') : messages).map((message) => (
          <div key={message.id} className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              isNative ? (
                <AiRimMark className="mt-1 h-8 w-8 rounded-full bg-red-950 text-white ring-red-950" iconClassName="h-4 w-4" />
              ) : (
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-950 text-white">
                  <BrainCircuit className="h-4 w-4" />
                </span>
              )
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
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span role="status" className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin text-red-800" />Contrastando tu perfil y la consulta...</span>
            <Button variant="ghost" className="min-h-11" onClick={isNative ? cancelNativeMessage : () => requestController.current?.abort()}>Cancelar consulta</Button>
          </div>
        )}
      </section>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
        <label htmlFor="airim-question" className="sr-only">Pregunta para aiRIM</label>
        <Textarea
          id="airim-question"
          value={isNative && contextOwner.current !== user?.id ? '' : input}
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
            disabled={!input.trim() || isLoading || (isNative && !nativeCanSend)}
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
