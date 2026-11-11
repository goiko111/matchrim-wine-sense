import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { WINE_FACTS139 } from '@/utils/wineFacts139';

interface Props {
  /** The real steps of this wait, in order («Leyendo la etiqueta», «Buscando en Winerim»…). */
  steps: readonly string[];
  /** Index of the step in progress; steps before it are shown as done. */
  current: number;
  className?: string;
}

// 139: a scan can take from a few seconds to a minute. Show which real step is running and, underneath, a general
// wine fact that changes every few seconds, so the wait says something to a person who is not a wine expert.
export const ScanWaiting139 = ({ steps, current, className = '' }: Props) => {
  const [fact, setFact] = useState(() => Math.floor(Math.random() * WINE_FACTS139.length));
  useEffect(() => {
    const timer = setInterval(() => setFact(value => (value + 1) % WINE_FACTS139.length), 6000);
    return () => clearInterval(timer);
  }, []);
  const active = Math.max(0, Math.min(steps.length - 1, current));
  return <section role="status" aria-label={steps[active]} className={`min-w-0 rounded-xl border border-stone-200 bg-white p-4 text-stone-950 ${className}`} data-testid="scan-waiting139">
    <div className="h-1.5 overflow-hidden rounded-full bg-stone-100" aria-hidden="true">
      <div className="h-full rounded-full bg-red-900 transition-all duration-500" style={{ width: `${Math.round(((active + 0.5) / steps.length) * 100)}%` }} />
    </div>
    <ol className="mt-3 space-y-1.5 text-sm">
      {steps.map((step, index) => <li key={step} className={`flex items-center gap-2 ${index === active ? 'font-semibold' : index < active ? 'text-stone-500' : 'text-stone-400'}`}>
        {index < active ? <Check className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
          : index === active ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-red-900" aria-hidden="true" />
            : <span className="h-4 w-4 shrink-0" aria-hidden="true" />}{step}</li>)}
    </ol>
    <div className="mt-4 border-t border-stone-200 pt-3" aria-live="off">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">¿Sabías que…?</p>
      <p className="mt-1 min-h-[4.5rem] text-sm leading-6 text-stone-700" data-testid="scan-fact139">{WINE_FACTS139[fact]}</p>
    </div>
  </section>;
};
