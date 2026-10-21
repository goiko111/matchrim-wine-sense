import { ArrowLeft, ChevronRight, FileText, LoaderCircle, Send, UserRound } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AiRimMark from '@/components/AiRimMark';

export type AiRimQuickAction99 = 'wine-for-dish' | 'dish-for-wine' | 'pairing-check' | 'special-moments';
type Message = { id: string; role: 'assistant' | 'user'; text: string };
interface Props {
  input: string;
  messages: Message[];
  loading: boolean;
  canSend: boolean;
  memoryLabel: string;
  notice: string;
  contextSent: boolean;
  onInput: (value: string) => void;
  onSend: () => void;
  onCancel: () => void;
  onBack: () => void;
  onProfile: () => void;
  onScan: () => void;
  onRestaurant: () => void;
  onSelectFunction?: (action: AiRimQuickAction99) => void;
}
const actions: ReadonlyArray<[AiRimQuickAction99, string]> = [
  ['wine-for-dish', 'Vino para un plato'], ['dish-for-wine', 'Plato para un vino'],
  ['pairing-check', 'Comprobar maridaje'], ['special-moments', 'Elegir para una ocasión'],
];

// Presentation only. Profile ownership, requests and cancellation stay in the existing controller.
export const NativeAiRimChat99 = (props: Props) => {
  const messageBody = useRef<HTMLDivElement>(null);
  const followsLatest = useRef(true);
  useEffect(() => {
    const body = messageBody.current;
    if (body && props.messages.length > 1 && (followsLatest.current || props.messages.at(-1)?.role === 'user')) {
      body.scrollTop = body.scrollHeight;
    }
  }, [props.messages, props.loading]);
  return <section
  className="fixed inset-0 flex min-h-0 flex-col bg-[#fafafa] pb-[var(--matchrim-bottom-nav-height,88px)] text-stone-950"
  data-testid="native-airim-chat99">
  <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white pb-2 pl-[calc(12px+var(--matchrim-safe-left))] pr-[calc(12px+var(--matchrim-safe-right))] pt-[calc(8px+var(--matchrim-safe-top))]">
    <button type="button" onClick={props.onBack} aria-label="Volver desde aiRIM" title="Volver" className="matchrim-pressable flex h-[44px] w-[44px] shrink-0 items-center justify-center"><ArrowLeft className="h-[20px] w-[20px]" aria-hidden="true" /></button>
    <h1 className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[24px] font-semibold" style={{ WebkitTextSizeAdjust: '100%' }}><AiRimMark className="h-[24px] w-[24px]" iconClassName="h-[24px] w-[24px]" />aiRIM</h1>
    <button type="button" onClick={props.onProfile} aria-label="Gestionar mis gustos" title="Mis gustos" className="matchrim-pressable flex h-[44px] w-[44px] shrink-0 items-center justify-center"><UserRound className="h-[20px] w-[20px]" aria-hidden="true" /></button>
  </header>
  <div ref={messageBody} onScroll={event => {
    const body = event.currentTarget;
    followsLatest.current = body.scrollHeight - body.scrollTop - body.clientHeight < 64;
  }} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[16px] pb-4 pt-4" data-testid="native-airim-messages99">
    <section className="space-y-4" aria-label="Conversación con aiRIM" aria-live="polite">
      {props.messages.map(message => message.id === 'welcome'
        ? <p key={message.id} className="max-w-xl text-base leading-7 text-stone-600">{message.text}</p>
        : <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <p className={`max-w-[92%] whitespace-pre-wrap break-words rounded-md px-3 py-3 text-sm leading-6 ${message.role === 'user' ? 'bg-stone-900 text-white' : 'border border-stone-200 bg-white text-stone-800'}`}>{message.text}</p>
        </div>)}
      {props.loading && <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <span role="status" className="flex items-center gap-2"><LoaderCircle className="h-[16px] w-[16px] shrink-0 animate-spin" aria-hidden="true" />Contrastando tu perfil y la consulta...</span>
        <Button type="button" variant="ghost" className="min-h-11" onClick={props.onCancel}>Cancelar consulta</Button>
      </div>}
    </section>
    {props.messages.every(message => message.id === 'welcome') && <div className="mt-6 border-y border-stone-200">
      <button type="button" onClick={props.onRestaurant} className="matchrim-pressable flex min-h-16 w-full items-center gap-3 py-3 text-left" aria-label="Comida y vinos del restaurante">
        <FileText className="h-[22px] w-[22px] shrink-0 text-red-900" aria-hidden="true" /><span className="min-w-0 flex-1 font-medium [overflow-wrap:normal]">Elegir con las cartas del restaurante</span><ChevronRight className="h-[20px] w-[20px] shrink-0 text-stone-400" aria-hidden="true" />
      </button>
      {props.onSelectFunction && <details className="group border-t border-stone-200">
        <summary aria-label="Consultas guiadas" className="matchrim-pressable flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-stone-700 [&::-webkit-details-marker]:hidden"><span aria-hidden="true">Consultas guiadas</span><ChevronRight className="h-[20px] w-[20px] shrink-0 group-open:rotate-90" aria-hidden="true" /></summary>
        <div className="divide-y divide-stone-100">{actions.map(([action, label]) => <button key={action} type="button" className="matchrim-pressable flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-sm" onClick={() => props.onSelectFunction?.(action)}><span className="min-w-0 [overflow-wrap:normal]">{label}</span><ChevronRight className="h-[20px] w-[20px] shrink-0 text-stone-400" aria-hidden="true" /></button>)}</div>
      </details>}
    </div>}
    <details className="group mt-5 text-sm text-stone-600" data-testid="airim-consumer-context">
      <summary aria-label="Tu perfil y privacidad" className="matchrim-pressable flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 py-3 font-medium [&::-webkit-details-marker]:hidden"><span aria-hidden="true">Tu perfil y privacidad</span><ChevronRight className="h-[20px] w-[20px] shrink-0 group-open:rotate-90" aria-hidden="true" /></summary>
      <p className="mt-2 text-xs">{props.contextSent ? 'Contexto enviado en esta consulta' : 'Contexto para tu próxima consulta'}</p>
      <p className="mt-2 font-semibold">{props.memoryLabel}</p><p role="status" className="mt-2 leading-6">{props.notice}</p>
      <p className="mt-2 leading-6">Un consejo general no es una afinidad personal con una botella.</p>
      <p className="mt-2 leading-6">Las fotos siguen en Escanear y no se incorporan a memoria por conversar aquí.</p>
      <Button type="button" variant="ghost" className="mt-2 min-h-11" onClick={props.onScan}>Escanear etiqueta o carta</Button>
    </details>
  </div>
  <div className="shrink-0 border-t border-stone-200 bg-white px-[16px] py-[8px]">
    <label htmlFor="airim-question" className="sr-only">Pregunta para aiRIM</label>
    <Textarea id="airim-question" value={props.input} onChange={event => props.onInput(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); props.onSend(); } }}
      placeholder="¿Qué vino o plato tienes en mente?" disabled={props.loading}
      className="h-[80px] min-h-[64px] max-h-[22dvh] resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0" />
    <div className="flex min-h-[44px] items-center justify-end gap-3">
      {!props.canSend && !props.loading && <p role="status" className="min-w-0 flex-1 text-xs text-stone-600">{props.memoryLabel}</p>}
      <Button type="button" size="icon" onClick={props.onSend} disabled={!props.input.trim() || props.loading || !props.canSend}
        className="matchrim-pressable h-[44px] w-[44px] shrink-0 rounded-full bg-red-900 hover:bg-red-950" aria-label="Enviar pregunta" title="Enviar"><Send className="h-[20px] w-[20px]" style={{ width: 20, height: 20 }} aria-hidden="true" /></Button>
    </div>
  </div>
</section>;
};
