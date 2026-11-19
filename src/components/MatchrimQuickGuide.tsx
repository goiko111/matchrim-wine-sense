import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { ArrowLeft, ArrowRight, Bookmark, Check, CircleHelp, Gauge, Minus, MessageCircleMore, ScanLine, Sparkles, UtensilsCrossed, Wine } from 'lucide-react';
import { QuizPhoto157 } from '@/components/QuizPhoto157';
import brindis159 from '@/assets/tour159/brindis.jpg';
import tienda159 from '@/assets/tour159/tienda.jpg';
import casa159 from '@/assets/tour159/casa.jpg';
import restaurante159 from '@/assets/tour159/restaurante.jpg';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { finishMatchrimOnboarding, recordOnboardingEvent, shouldShowMatchrimOnboarding } from '@/utils/matchrimOnboarding';
import { MAX_AUTOMATIC_REGION_ANALYSES } from '@/utils/scanAnalysisPolicy';

const webSteps = [
  { title: '¿Qué tienes delante?', text: 'Una botella, varias etiquetas o una carta. Si prefieres empezar por un plato, ve a aiRIM.' },
  { title: 'Revisa cada etiqueta', text: `Toca un número para revisar o corregir el vino. Se analizan hasta ${MAX_AUTOMATIC_REGION_ANALYSES} regiones automáticamente; otras quedan aplazadas por límite o calidad. Acerca una zona o analízala por separado. Detectar una región no significa haberla analizado ni identificado.` },
  { title: 'Lee las tres señales', text: 'Detección, identidad y afinidad son señales distintas. Sin ficha sensorial suficiente, puedes reconocer y revisar vinos sin porcentaje. La afinidad compara datos del vino con tu perfil; si falta evidencia, queda pendiente.' },
  { title: 'Guardar no es puntuar', text: 'Espera la confirmación de guardado antes de darlo por hecho. Si falla, revisa el aviso y reintenta. Puntúa cuando lo hayas probado y elige si esa valoración puede ajustar tu perfil. Favorito destaca el vino ya guardado.' },
  { title: 'Compara antes de elegir', text: 'Elige de dos a cinco vinos y revisa coincidencias, fricciones y datos faltantes. Comprueba añada, precio y copa o botella. Las ideas para platos son hipótesis de maridaje: tus gustos en vino no determinan tus preferencias de comida.' },
  { title: 'Vuelve a tu selección', text: 'En Bodega tienes tus vinos probados y pendientes. aiRIM está en el menú principal: lleva allí tu plato, ocasión y presupuesto. Puedes reabrir esta guía desde Ayuda.' },
];

// 158 (owner, 19-nov: «nos falta como un tutorial guiado de todo lo que la app puede hacer… para que nadie se pierda»).
// The guide the app opened was six screens of small print about regions and signals. On the iPhone it is now six
// short screens, one idea each, in the order a person meets the app: what it is for, the test, the photo, the score,
// saving and rating, the restaurant. Same first-run rule and the same «Saltar guía».
const tour158 = [
  { icon: Sparkles, title: '¿Me va a gustar este vino?', text: 'Matchrim te lo dice antes de pedirlo o comprarlo: una nota de 0 a 100 y el porqué. No hace falta saber de vinos.' },
  { icon: Wine, title: 'Empieza por el test', text: 'Veinte preguntas sobre comida: café, limón, picante… Son dos minutos. Con eso sabemos qué sabores te gustan y calculamos tu nota para cada vino.' },
  { icon: ScanLine, title: 'Haz una foto', text: 'A una botella, a varias en una estantería o a la carta de un restaurante. Matchrim lee los nombres y te dice cuál encaja más contigo.' },
  { icon: Gauge, title: 'Entiende la nota', text: 'Cuanto más alta, más encaja con tu gusto. Toca un vino para ver a qué sabe, por qué encaja contigo y qué has opinado de vinos parecidos.' },
  { icon: Bookmark, title: 'Guarda y valora', text: 'Guarda lo que quieres probar, lo que tienes en casa y lo que ya has bebido. Cada vino que valoras afina tu perfil: Matchrim acierta más cuanto más lo usas.' },
  { icon: UtensilsCrossed, title: 'En el restaurante', text: 'Fotografía la carta y di qué vas a comer: verás los vinos ordenados por lo que te gustará y por cómo acompañan al plato. Si tienes una duda, pregunta a aiRIM.' },
] as const;

export default function MatchrimQuickGuide({ existing, ownerId = null, ready = true, hasProfile = false }: { existing: boolean; ownerId?: string | null; ready?: boolean; hasProfile?: boolean }) {
  const native158 = Capacitor.isNativePlatform();
  const steps = native158 ? tour158 : webSteps;
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const decidedRef = useRef(false);
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState('/escanear/etiqueta');
  const [started, setStarted] = useState(false);
  const [exampleName, setExampleName] = useState('Vino de ejemplo');
  const [exampleConfirmed, setExampleConfirmed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!ready || decidedRef.current) return;
    decidedRef.current = true;
    setOpen(shouldShowMatchrimOnboarding(existing, ownerId));
  }, [ready, existing, ownerId]);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [step, open]);
  const close = () => {
    decidedRef.current = true;
    finishMatchrimOnboarding('skipped', ownerId);
    recordOnboardingEvent('skipped', step, ownerId);
    setOpen(false);
  };
  const complete = (route: string) => {
    finishMatchrimOnboarding('completed', ownerId);
    recordOnboardingEvent('completed', step, ownerId);
    setOpen(false);
    navigate(route);
  };
  return (
    <>
      <Button ref={helpRef} variant="ghost" className="min-h-11 gap-2 text-slate-700" onClick={() => {
        decidedRef.current = true;
        setStep(0); setExampleConfirmed(false); setExampleName('Vino de ejemplo'); setOpen(true); recordOnboardingEvent('reopened', 0, ownerId);
      }} aria-label="Ayuda: abrir guía de Matchrim" data-testid="tour-open158"><CircleHelp className="h-5 w-5" />{native158 ? 'Cómo funciona Matchrim' : 'Ayuda'}</Button>
      <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
        <DialogContent
          className="matchrim-quick-guide flex w-[calc(100%_-_2rem)] max-w-md max-h-[calc(100dvh_-_8rem)] flex-col overflow-hidden rounded-lg p-6 motion-reduce:animate-none [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:right-1 [&>button:last-child]:top-1"
          onOpenAutoFocus={() => { if (!started) { recordOnboardingEvent('started', 0, ownerId); setStarted(true); } }}
          onCloseAutoFocus={(event) => { event.preventDefault(); helpRef.current?.focus(); }}
        >
          <p className="text-sm font-semibold text-red-800" role="status" aria-live="polite">Matchrim · {step + 1} de {steps.length}</p>
          <div ref={contentRef} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain" data-testid="matchrim-guide-content">
          {/* 159: places instead of icons (a table, a shop, a home), and on «Entiende la nota» a wine as the app shows it. */}
          {native158 && <div data-testid="tour-hero158" className="relative h-40 overflow-hidden rounded-2xl bg-stone-100 [html.matchrim-accessibility-text_&]:hidden">
            {step === 1 ? <div className="grid h-full w-full grid-cols-4">{[1, 14, 2, 16].map(id => <QuizPhoto157 key={id} id={id} className="h-full w-full object-cover" />)}</div>
              : step === 3 ? <div className="flex h-full flex-col justify-center gap-2 bg-white px-4 ring-1 ring-inset ring-stone-200" data-testid="tour-example159">
                <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Ejemplo</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 text-base font-bold leading-5 text-stone-950">Un rioja crianza<span className="block text-xs font-medium text-stone-500">Tinto · Rioja</span></p>
                  <p className="shrink-0 rounded-full bg-emerald-700 px-3 py-1 text-lg font-bold text-white">86<span className="text-xs font-semibold text-white/80">/100</span></p>
                </div>
                <p className="text-sm font-semibold text-emerald-800">Muy de tu estilo</p>
                <ul className="space-y-0.5 text-xs leading-4 text-stone-700">
                  <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />El cuerpo es como te gusta</li>
                  <li className="flex items-center gap-1.5"><Minus className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />Algo menos fresco de lo que sueles preferir</li>
                </ul>
              </div>
              : <img src={[brindis159, '', tienda159, '', casa159, restaurante159][step]} alt="" aria-hidden="true" draggable={false} className="h-full w-full object-cover" data-testid="tour-photo159" />}
          </div>}
          <DialogTitle className="pr-6 text-2xl leading-tight tracking-normal">{steps[step].title}</DialogTitle>
          <DialogDescription className="text-base leading-6 text-slate-600">{steps[step].text}</DialogDescription>
          {!native158 && step === 0 && (
            <fieldset className="grid gap-2">
              <legend className="sr-only">Primer destino</legend>
              {[['/escanear/etiqueta', 'Botellas'], ['/escanear/carta-vinos', 'Carta o pizarra'], ['/inteligencia-liquida', 'Un plato u ocasión']].map(([route, label]) => (
                <label key={route} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                  <input type="radio" name="guide-target" value={route} checked={target === route} onChange={() => setTarget(route)} />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          {!native158 && step === 1 && <div className="space-y-2 border-l-2 border-amber-500 pl-3">
            <p className="text-sm font-semibold text-amber-900">Ejemplo simulado · no se guarda</p>
            <label htmlFor="guide-example-name" className="block text-sm">Nombre de la etiqueta 1</label>
            <input id="guide-example-name" className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-base" value={exampleName} onChange={(event) => { setExampleName(event.target.value); setExampleConfirmed(false); }} maxLength={80} />
            <Button variant="outline" className="min-h-11 gap-2" disabled={!exampleName.trim()} onClick={() => setExampleConfirmed(true)}><Check className="h-4 w-4" />Confirmar ejemplo</Button>
            {exampleConfirmed && <p role="status" className="break-words text-sm text-emerald-800">Nombre revisado: {exampleName}</p>}
          </div>}
          {!native158 && step === 2 && <div className="space-y-2 border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-slate-700"><Wine className="h-5 w-5" /><p>Tu gusto es opcional: puedes reconocer vinos antes de hacer el test. El porcentaje de afinidad no es una probabilidad de que te guste.</p></div>}
          {!native158 && step === 3 && <p className="border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-slate-700">Un vino guardado sin valoración no enseña al perfil. Las valoraciones con datos sensoriales incompletos tampoco bastan para calcular afinidad.</p>}
          {!native158 && step === 4 && <div className="flex items-start gap-3 border-l-2 border-amber-500 pl-3 text-sm leading-6 text-slate-700"><ScanLine className="mt-1 h-5 w-5 shrink-0" /><p>{Capacitor.isNativePlatform() ? 'El análisis con IA envía la foto y sus recortes. El modo local Una etiqueta mantiene la foto en el iPhone y busca solo el texto en Winerim. Puedes cancelar o reintentar.' : 'Antes de analizar, el escáner pide consentimiento para enviar la foto y sus recortes. Si cancelas o falla la conexión, puedes reintentar cuando estés listo.'}</p></div>}
          {!native158 && step === 5 && <div className="flex items-start gap-3 border-l-2 border-red-800 pl-3 text-sm leading-6 text-slate-700"><MessageCircleMore className="mt-1 h-5 w-5 shrink-0" /><p>Si aún no tienes vinos, empieza con una etiqueta o una carta. Revisa la identificación antes de guardar tu primera selección.</p></div>}
          </div>
          <div className="matchrim-guide-footer shrink-0 space-y-3 border-t border-slate-200 pt-3">
          <div className="matchrim-guide-primary flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="min-h-11" onClick={close}>Saltar guía</Button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Paso anterior" title="Anterior" onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /></Button>}
              <Button className="min-h-11 gap-2 bg-red-900 hover:bg-red-950" onClick={() => {
                if (step === steps.length - 1) complete(native158 ? (hasProfile ? '/escanear/etiqueta' : '/matchrim') : target);
                else { setStep(step + 1); recordOnboardingEvent('step', step + 1, ownerId); }
              }} data-testid="tour-next158">{step === steps.length - 1 ? native158 ? hasProfile ? 'Escanear un vino' : 'Hacer el test' : 'Empezar' : 'Continuar'}<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {native158 && <div className="flex justify-center gap-1.5" aria-hidden="true" data-testid="tour-dots158">{steps.map((item, index) => <span key={item.title} className={`h-1.5 rounded-full ${index === step ? 'w-5 bg-red-900' : 'w-1.5 bg-stone-300'}`} />)}</div>}
          {!native158 && step === steps.length - 1 && <Button variant="outline" className="min-h-11" onClick={() => complete('/matchrim')}>Crear mi perfil primero</Button>}
          {native158 && !hasProfile && step === steps.length - 1 && <Button variant="outline" className="min-h-11" onClick={() => complete('/escanear/etiqueta')}>Ahora no: escanear un vino</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
