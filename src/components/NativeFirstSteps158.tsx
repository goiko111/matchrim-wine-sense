import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, X } from 'lucide-react';

// 158 (owner, 19-nov: «explicar para qué vale cada cosa… para que nadie se pierda»). The guide explains the app once;
// this card stays on Home until the four things that make it useful are done, each said with what it is for and one
// tap away. It reads only what Home already knows and stores nothing but «hidden» on this iPhone.
const key = (ownerId: string | null) => `matchrim.first_steps158:${ownerId ?? 'anonymous'}`;
const hidden = (ownerId: string | null) => { try { return localStorage.getItem(key(ownerId)) === 'hidden'; } catch { return false; } };

export const NativeFirstSteps158 = ({ ownerId, hasQuiz, hasScan, hasSaved, hasRated }: { ownerId: string | null; hasQuiz: boolean; hasScan: boolean; hasSaved: boolean; hasRated: boolean }) => {
  const navigate = useNavigate();
  const [off, setOff] = useState(() => hidden(ownerId));
  const steps = [
    { done: hasQuiz, title: 'Haz el test de paladar', why: 'Dos minutos. Sin él no podemos darte tu nota.', to: '/matchrim' },
    { done: hasScan || hasSaved, title: 'Escanea tu primer vino', why: 'Una botella o una carta: verás cuánto encaja contigo.', to: '/escanear/etiqueta' },
    { done: hasSaved, title: 'Guarda un vino', why: 'Lo que quieres probar o lo que tienes en casa.', to: '/escanear/etiqueta' },
    { done: hasRated, title: 'Valora uno que hayas probado', why: 'Cada valoración afina tu perfil.', to: '/my-wines' },
  ];
  const left = steps.filter(step => !step.done).length;
  if (off || left === 0) return null;
  const next = steps.findIndex(step => !step.done);
  return <section className="rounded-2xl bg-white p-4 shadow-[0_8px_22px_-14px_rgba(28,25,23,.45)]" aria-labelledby="first-steps158-title" data-testid="first-steps158">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id="first-steps158-title" className="text-lg font-bold leading-6 text-stone-950">Primeros pasos</h2>
        <p className="text-sm leading-5 text-stone-600">{steps.length - left} de {steps.length} hechos</p>
      </div>
      <button type="button" aria-label="Ocultar primeros pasos" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-500 active:bg-stone-100"
        onClick={() => { try { localStorage.setItem(key(ownerId), 'hidden'); } catch { /* stays for this visit only */ } setOff(true); }}><X className="h-5 w-5" aria-hidden="true" /></button>
    </div>
    <ol className="mt-2 divide-y divide-stone-100">{steps.map((step, index) => <li key={step.title}>
      <button type="button" disabled={step.done} onClick={() => navigate(step.to)} data-testid={`first-step158-${index}`} data-done={step.done || undefined}
        className="flex min-h-14 w-full min-w-0 items-center gap-3 py-2 text-left disabled:opacity-100 [overflow-wrap:anywhere]">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-emerald-700 text-white' : index === next ? 'bg-red-950 text-white' : 'bg-stone-200 text-stone-700'}`}>
          {step.done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}</span>
        <span className="min-w-0 flex-1">
          <span className={`block text-[15px] font-semibold leading-5 ${step.done ? 'text-stone-500 line-through' : 'text-stone-950'}`}>{step.title}</span>
          {!step.done && <span className="block text-sm leading-5 text-stone-600">{step.why}</span>}
          {step.done && <span className="sr-only">Hecho</span>}
        </span>
        {!step.done && <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />}
      </button></li>)}</ol>
  </section>;
};
