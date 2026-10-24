import { Link } from 'react-router-dom';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { buildConsumerAffinity, type ConsumerAffinityInput, type ConsumerAffinityResult } from '@/utils/consumerAffinity95';

export const NativeAffinitySummary = (input: ConsumerAffinityInput & { result?: ConsumerAffinityResult; personalRating?: string | null; personalHistoryUnavailable?: boolean }) => {
  const result = input.result ?? buildConsumerAffinity(input);
  const personalTitle = input.personalRating === 'not_for_me' ? 'Tu valoración: no es para ti'
    : input.personalRating === 'love' ? 'Tu valoración: te encanta'
      : input.personalRating === 'ok' ? 'Tu valoración: correcto' : null;
  if (result.state === 'pending') return (
    <section className="min-w-0 border-y border-stone-200 py-4 text-sm" aria-label="Estado de tu afinidad" data-testid="native-affinity-pending">
      {personalTitle && <p className="mb-3 text-base font-semibold text-slate-950">{personalTitle}</p>}
      <h4 className="flex items-start gap-2 text-base font-semibold text-slate-950"><CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{result.reason === 'identity' ? 'Primero, confirmemos el vino'
        : result.reason === 'profile' ? 'Conoce tu afinidad' : result.reason === 'score' ? 'Tu afinidad necesita actualizarse' : 'Nos faltan datos de este vino'}</h4>
      <p className="mt-2 leading-6 text-stone-600">{result.description}</p>
      {result.reason !== 'profile' && <p className="mt-2 leading-6 text-stone-600">No significa que no te vaya a gustar. Todavía no tenemos una comparación fiable.</p>}
      {result.reason === 'profile' && <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-red-900 underline underline-offset-4" to="/matchrim">Completar mi test</Link>}
    </section>
  );
  return (
    <section className="min-w-0 space-y-4 border-y border-stone-200 py-4" aria-label="Cuánto encaja contigo" data-testid="native-affinity-summary">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-44">
          <p className="text-xs font-medium text-stone-500">{personalTitle ? 'Tu experiencia con este vino' : 'Para tu paladar'}</p>
          <h4 className="mt-1 text-lg font-semibold leading-6 text-slate-950">{personalTitle ?? (input.personalHistoryUnavailable ? 'Comparación de estilo provisional' : result.title)}</h4>
        </div>
        {!personalTitle && <p className="shrink-0 text-xl font-semibold tabular-nums text-red-900" aria-label={`Afinidad orientativa: ${result.score} de 100`}>
          <span aria-hidden="true">≈{result.score}<span className="text-sm font-medium text-stone-500">/100</span></span>
          <span className="block text-xs font-normal text-stone-500" aria-hidden="true">Por estilo</span>
        </p>}
      </div>
      <div className="space-y-2 text-sm leading-6 text-stone-700">
        {personalTitle && <p>Tu valoración tiene prioridad sobre la comparación de estilo.</p>}
        {input.personalHistoryUnavailable && !personalTitle && <p role="status">No se pudieron consultar tus valoraciones guardadas. Tu experiencia previa puede cambiar esta recomendación.</p>}
        {!personalTitle && <>
          {result.matches.length > 0 ? <div><p className="mb-1 font-semibold text-stone-900">Por qué encaja</p><ul className="list-disc space-y-1 pl-5">{result.matches.slice(0, 2).map(reason => <li key={reason}>{reason}</li>)}</ul></div>
            : <p>No destaca una coincidencia clara con tus preferencias actuales.</p>}
          {result.caution && <div className="border-l-2 border-amber-500 pl-3"><p className="font-semibold text-stone-900">Lo que podría gustarte menos</p><p>{result.caution}</p></div>}
          <p className="text-xs leading-5 text-stone-500">Compara el estilo con tus gustos. No es una garantía ni una nota de calidad.</p>
        </>}
      </div>
      <details className="min-w-0 border-t border-stone-200 pt-3 text-sm" data-testid="native-affinity-details">
        <summary aria-label="Ver el detalle de afinidad" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium text-stone-800"><span aria-hidden="true">Ver el detalle de afinidad</span><ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" /></summary>
        {personalTitle && <p className="mt-3 leading-6 text-stone-600">Encaje de estilo: ≈{result.score}/100. No cambia lo que tú has valorado.</p>}
        <dl className="mt-2 divide-y divide-stone-100">
          {result.dimensions.map(dimension => <div className="min-w-0 py-3" key={dimension.key}>
            <dt className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-medium capitalize text-stone-800">{dimension.label}<span className="text-xs font-normal normal-case text-stone-600">{dimension.tone === 'positive' ? 'Cerca de tu gusto' : dimension.direction === 'higher' ? 'Más de lo que prefieres' : 'Menos de lo que prefieres'}</span></dt>
            <dd className="mt-2 min-w-0 space-y-2 text-xs leading-5 text-stone-600" aria-label={`${dimension.label}: tu perfil ${dimension.profileValue.toFixed(1)}/5; este vino ${dimension.wineValue.toFixed(1)}/5`}>
              {[{ label: 'Tú', value: dimension.profileValue, color: 'bg-stone-500' }, { label: 'Vino', value: dimension.wineValue, color: 'bg-red-800' }].map(row => <span key={row.label} className="grid grid-cols-[2rem_minmax(0,1fr)_3rem] items-center gap-2" aria-hidden="true">
                <span>{row.label}</span><span className="h-1.5 overflow-hidden rounded-full bg-stone-100"><span className={`block h-full ${row.color}`} style={{ width: `${row.value * 20}%` }} /></span><span className="text-right tabular-nums">{row.value.toFixed(1)}/5</span>
              </span>)}
            </dd>
          </div>)}
        </dl>
        <p className="mt-3 text-xs leading-5 text-stone-500">Comparamos cinco rasgos del vino con tus preferencias actuales. La cifra indica encaje sensorial: no es una probabilidad de que te guste ni una valoración de calidad.</p>
        <p className="mt-2 text-xs leading-5 text-stone-500">Estos rasgos son los datos disponibles de la ficha; no acreditan una cata humana ni permiten asegurar cómo estará una botella concreta.</p>
      </details>
    </section>
  );
};
