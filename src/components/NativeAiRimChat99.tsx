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

const examples137 = ['¿Qué vino pido con un entrecot?', 'Quiero un blanco fresco por menos de 25 €', 'No sé de vino, ¿por dónde empiezo?', '¿Qué llevo a una cena con amigos?'];

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
  className="fixed inset-0 flex min-h-0 flex-col bg-[#f3efe9] pb-[var(--matchrim-bottom-nav-height,88px)] text-stone-950"
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
    {/* 139: on a real phone nothing said this was a place to ask; the title and the framed box below do. */}
    {/* 148: the same visual language as the wine sheet and the profile: a soft header card, round bubbles with the aiRIM mark, and the examples as cards. */}
    {props.messages.every(message => message.id === 'welcome') && <h2 className="-mb-2 rounded-t-2xl bg-gradient-to-b from-stone-200 to-stone-100 px-5 pb-2 pt-5 text-[22px] font-bold leading-7 text-stone-950" data-testid="airim-title139">Pregúntame lo que quieras sobre vino</h2>}
    <section className="space-y-4" aria-label="Conversación con aiRIM" aria-live="polite">
      {props.messages.map(message => message.id === 'welcome'
        ? <p key={message.id} className="rounded-b-2xl bg-gradient-to-b from-stone-100 to-stone-50 px-5 pb-5 pt-2 text-base leading-7 text-stone-700">{message.text}</p>
        : <div key={message.id} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {message.role !== 'user' && <span className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-stone-200" aria-hidden="true"><AiRimMark className="h-[16px] w-[16px]" iconClassName="h-[16px] w-[16px]" /></span>}
          <p className={`max-w-[86%] whitespace-pre-wrap break-words px-4 py-3 text-[15px] leading-6 ${message.role === 'user' ? 'rounded-2xl rounded-br-md bg-red-900 text-white' : 'rounded-2xl rounded-bl-md border border-stone-200 bg-white text-stone-900'}`}>{message.text}</p>
        </div>)}
      {props.loading && <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        <span role="status" className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-3"><LoaderCircle className="h-[16px] w-[16px] shrink-0 animate-spin" aria-hidden="true" />Pensando la respuesta…</span>
        <Button type="button" variant="ghost" className="min-h-11" onClick={props.onCancel}>Cancelar consulta</Button>
      </div>}
    </section>
    {/* 137: an empty chat gave no idea what to ask; a tap writes the example so the person can edit or send it. */}
    {props.messages.every(message => message.id === 'welcome') && !props.input.trim() && <div className="mt-5" data-testid="airim-examples137">
      <p className="text-sm font-semibold text-stone-800">Toca una pregunta o escribe la tuya abajo</p>
      <div className="mt-2 grid grid-cols-2 gap-2 [html.matchrim-accessibility-text_&]:grid-cols-1">{examples137.map(example => <button key={example} type="button" disabled={props.loading}
        className="matchrim-pressable flex min-h-[4.5rem] items-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left text-sm font-medium leading-5 text-stone-900 active:bg-stone-50" onClick={() => props.onInput(example)}>{example}</button>)}</div>
    </div>}
    {props.messages.every(message => message.id === 'welcome') && <div className="mt-6 rounded-2xl border border-stone-200 bg-white px-4">
      <button type="button" onClick={props.onRestaurant} className="matchrim-pressable flex min-h-16 w-full items-center gap-3 py-3 text-left" aria-label="Comida y vinos del restaurante">
        <FileText className="h-[22px] w-[22px] shrink-0 text-red-900" aria-hidden="true" /><span className="min-w-0 flex-1 font-medium [overflow-wrap:normal]">Elegir con las cartas del restaurante</span><ChevronRight className="h-[20px] w-[20px] shrink-0 text-stone-400" aria-hidden="true" />
      </button>
      {props.onSelectFunction && <details className="group border-t border-stone-200">
        <summary aria-label="Consultas guiadas" className="matchrim-pressable flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-medium text-stone-700 [&::-webkit-details-marker]:hidden"><span aria-hidden="true">Consultas guiadas</span><ChevronRight className="h-[20px] w-[20px] shrink-0 group-open:rotate-90" aria-hidden="true" /></summary>
        <div className="divide-y divide-stone-100">{actions.map(([action, label]) => <button key={action} type="button" className="matchrim-pressable flex min-h-12 w-full items-center justify-between gap-3 py-3 text-left text-sm" onClick={() => props.onSelectFunction?.(action)}><span className="min-w-0 [overflow-wrap:normal]">{label}</span><ChevronRight className="h-[20px] w-[20px] shrink-0 text-stone-400" aria-hidden="true" /></button>)}</div>
      </details>}
    </div>}
    <details className="group mt-3 rounded-2xl border border-stone-200 bg-white px-4 pb-1 text-sm text-stone-600" data-testid="airim-consumer-context">
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
      placeholder="Escribe aquí tu pregunta: un plato, un vino, una ocasión…" disabled={props.loading}
      className="h-[72px] min-h-[64px] max-h-[22dvh] resize-none rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-base shadow-none placeholder:text-stone-500 focus-visible:border-red-900 focus-visible:ring-0" />
    <div className="flex min-h-[44px] items-center justify-end gap-3">
      {!props.canSend && !props.loading && <p role="status" className="min-w-0 flex-1 text-xs text-stone-600">{props.memoryLabel}</p>}
      <Button type="button" size="icon" onClick={props.onSend} disabled={!props.input.trim() || props.loading || !props.canSend}
        className="matchrim-pressable h-[44px] w-[44px] shrink-0 rounded-full bg-red-900 hover:bg-red-950" aria-label="Enviar pregunta" title="Enviar"><Send className="h-[20px] w-[20px]" style={{ width: 20, height: 20 }} aria-hidden="true" /></Button>
    </div>
  </div>
</section>;
};
