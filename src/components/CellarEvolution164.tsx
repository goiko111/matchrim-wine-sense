import { Hourglass } from 'lucide-react';
import { type Evolution164, evolutionAdvice164 } from '@/utils/evolution164';

// 164: «¿Cambió en la copa?» under the rating of a tasted wine. One tap, can be undone by tapping again.
const OPTIONS: Array<{ value: Evolution164; label: string }> = [{ value: 'better', label: 'Mejoró con el rato' }, { value: 'worse', label: 'Fue a peor' }];
export const CellarEvolution164 = ({ value, busy, onChange }: { value: Evolution164 | null; busy?: boolean; onChange: (next: Evolution164 | null) => void }) => (
  <section className="min-w-0 rounded-2xl bg-stone-50 p-3" aria-label="¿Cambió en la copa?" data-testid="cellar-evolution164">
    <p className="flex min-w-0 items-start gap-3 text-base font-semibold leading-5 text-stone-950">
      <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />
      <span className="min-w-0 flex-1">¿Cambió en la copa?<span className="block text-sm font-normal leading-5 text-stone-600">Tu valoración es la impresión final. Esto es para avisarte la próxima vez.</span></span>
    </p>
    <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.5rem),1fr))] gap-2">
      {OPTIONS.map(option => <button key={option.value} type="button" disabled={busy} aria-pressed={value === option.value} data-testid={`cellar-evolution164-${option.value}`}
        className={`min-h-11 rounded-full border px-3 py-2 text-sm font-semibold leading-tight ${value === option.value ? 'border-red-900 bg-red-900 text-white' : 'border-stone-300 bg-white text-stone-900'}`}
        onClick={() => onChange(value === option.value ? null : option.value)}>{option.label}</button>)}
    </div>
    {value && <p className="mt-2 text-sm leading-5 text-stone-700" data-testid="cellar-evolution164-advice">{evolutionAdvice164(value)}</p>}
  </section>
);
