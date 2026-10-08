import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleHelp, MessageCircleMore, ScanLine, Wine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { finishMatchrimOnboarding, recordOnboardingEvent, shouldShowMatchrimOnboarding } from '@/utils/matchrimOnboarding';

const steps = [
  { title: '¿Qué tienes delante?', text: 'Una botella, varias etiquetas o una carta. Si prefieres empezar por un plato, ve a aiRIM.' },
  { title: 'Revisa cada etiqueta', text: 'Toca un número para revisar el vino. Corrige el nombre, descarta objetos o acerca solo la zona que no se lea. En una carta, comprueba también añada, precio y copa o botella.' },
  { title: 'Lee las tres señales', text: 'La detección localiza una etiqueta. La identidad indica cuánto sabemos de su nombre. La afinidad compara sus datos con tu perfil y tiene su propio respaldo. Sin datos suficientes, queda pendiente.' },
  { title: 'Guardar no es puntuar', text: 'Guarda lo que quieras recordar en Bodega. Puntúa cuando lo hayas probado y elige si esa valoración puede ajustar tu perfil. Editar o borrar una valoración cambia esa evidencia.' },
  { title: 'Compara antes de elegir', text: 'Elige de dos a cinco vinos y revisa coincidencias, posibles fricciones y datos faltantes. Añade plato y presupuesto; un precio sin moneda o un dato inferido necesita revisión.' },
  { title: 'Vuelve a tu selección', text: 'En Bodega tienes tus vinos probados y pendientes. aiRIM está en el menú principal: lleva allí tu plato, ocasión y presupuesto. Puedes reabrir esta guía desde Ayuda.' },
];

export default function MatchrimQuickGuide({ existing }: { existing: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(() => shouldShowMatchrimOnboarding(existing));
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState('/escanear/etiqueta');
  const [started, setStarted] = useState(false);
  const [exampleName, setExampleName] = useState('Vino de ejemplo');
  const [exampleConfirmed, setExampleConfirmed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => { contentRef.current?.scrollTo({ top: 0 }); }, [step, open]);
  const close = () => {
    finishMatchrimOnboarding('skipped');
    recordOnboardingEvent('skipped', step);
    setOpen(false);
  };
  const complete = (route: string) => {
    finishMatchrimOnboarding('completed');
    recordOnboardingEvent('completed', step);
    setOpen(false);
    navigate(route);
  };
  return (
    <>
      <Button variant="ghost" className="min-h-11 gap-2 text-slate-700" onClick={() => {
        setStep(0); setExampleConfirmed(false); setExampleName('Vino de ejemplo'); setOpen(true); recordOnboardingEvent('reopened', 0);
      }} aria-label="Ayuda: abrir guía de Matchrim"><CircleHelp className="h-5 w-5" />Ayuda</Button>
      <Dialog open={open} onOpenChange={(value) => { if (!value) close(); }}>
        <DialogContent
          className="matchrim-quick-guide flex w-[calc(100%_-_2rem)] max-w-md max-h-[calc(100dvh_-_8rem)] flex-col overflow-hidden rounded-lg p-6 motion-reduce:animate-none [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:right-1 [&>button:last-child]:top-1"
          onOpenAutoFocus={() => { if (!started) { recordOnboardingEvent('started', 0); setStarted(true); } }}
        >
          <p className="text-sm font-semibold text-red-800" role="status" aria-live="polite">Matchrim · {step + 1} de {steps.length}</p>
          <div ref={contentRef} className="min-h-0 space-y-4 overflow-y-auto overscroll-contain" data-testid="matchrim-guide-content">
          <DialogTitle className="pr-6 text-2xl leading-tight tracking-normal">{steps[step].title}</DialogTitle>
          <DialogDescription className="text-base leading-6 text-slate-600">{steps[step].text}</DialogDescription>
          {step === 0 && (
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
          {step === 1 && <div className="space-y-2 border-l-2 border-amber-500 pl-3">
            <p className="text-sm font-semibold text-amber-900">Ejemplo simulado · no se guarda</p>
            <label htmlFor="guide-example-name" className="block text-sm">Nombre de la etiqueta 1</label>
            <input id="guide-example-name" className="min-h-11 w-full rounded-md border border-slate-300 px-3 text-base" value={exampleName} onChange={(event) => { setExampleName(event.target.value); setExampleConfirmed(false); }} maxLength={80} />
            <Button variant="outline" className="min-h-11 gap-2" disabled={!exampleName.trim()} onClick={() => setExampleConfirmed(true)}><Check className="h-4 w-4" />Confirmar ejemplo</Button>
            {exampleConfirmed && <p role="status" className="break-words text-sm text-emerald-800">Nombre revisado: {exampleName}</p>}
          </div>}
          {step === 2 && <div className="space-y-2 border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-slate-700"><Wine className="h-5 w-5" /><p>Tu gusto es opcional: puedes reconocer vinos antes de hacer el test. El porcentaje de afinidad no es una probabilidad de que te guste.</p></div>}
          {step === 3 && <p className="border-l-2 border-emerald-600 pl-3 text-sm leading-6 text-slate-700">Un vino guardado sin valoración no enseña al perfil. Las valoraciones con datos sensoriales incompletos tampoco bastan para calcular afinidad.</p>}
          {step === 4 && <div className="flex items-start gap-3 border-l-2 border-amber-500 pl-3 text-sm leading-6 text-slate-700"><ScanLine className="mt-1 h-5 w-5 shrink-0" /><p>Antes de analizar, el escáner pide consentimiento para enviar la foto y sus recortes. Si cancelas o falla la conexión, puedes reintentar cuando estés listo.</p></div>}
          {step === 5 && <div className="flex items-start gap-3 border-l-2 border-red-800 pl-3 text-sm leading-6 text-slate-700"><MessageCircleMore className="mt-1 h-5 w-5 shrink-0" /><p>Si aún no tienes vinos, empieza con una etiqueta o una carta. Revisa la identificación antes de guardar tu primera selección.</p></div>}
          </div>
          <div className="matchrim-guide-footer shrink-0 space-y-3 border-t border-slate-200 pt-3">
          <div className="matchrim-guide-primary flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" className="min-h-11" onClick={close}>Saltar guía</Button>
            <div className="flex gap-2">
              {step > 0 && <Button variant="outline" size="icon" className="h-11 w-11" aria-label="Paso anterior" title="Anterior" onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /></Button>}
              <Button className="min-h-11 gap-2 bg-red-900 hover:bg-red-950" onClick={() => {
                if (step === steps.length - 1) complete(target);
                else { setStep(step + 1); recordOnboardingEvent('step', step + 1); }
              }}>{step === steps.length - 1 ? 'Empezar' : 'Continuar'}<ArrowRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {step === steps.length - 1 && <Button variant="outline" className="min-h-11" onClick={() => complete('/matchrim')}>Crear mi perfil primero</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
