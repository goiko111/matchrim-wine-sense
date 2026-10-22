import { Link } from 'react-router-dom';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { buildConsumerAffinity, type ConsumerAffinityInput, type ConsumerAffinityResult } from '@/utils/consumerAffinity95';

export const NativeAffinitySummary = (input: ConsumerAffinityInput & { result?: ConsumerAffinityResult; personalRating?: string | null }) => {
  const result = input.result ?? buildConsumerAffinity(input);
  const personalTitle = input.personalRating === 'not_for_me' ? 'Tu valoración: no es para ti'
    : input.personalRating === 'love' ? 'Tu valoración: te encanta'
      : input.personalRating === 'ok' ? 'Tu valoración: correcto' : null;
  if (result.state === 'pending') return (
    <section className="min-w-0 border-y border-stone-200 py-4 text-sm" aria-label="Estado de tu afinidad" data-testid="native-affinity-pending">
      <h4 className="flex items-start gap-2 font-semibold text-slate-950"><CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{result.title}</h4>
      <p className="mt-2 leading-6 text-stone-600">{result.description}</p>
      {result.reason === 'profile' && <Link className="mt-2 inline-flex min-h-11 items-center font-semibold text-red-900 underline underline-offset-4" to="/matchrim">Completar mi test</Link>}
    </section>
  );
  return (
    <section className="min-w-0 space-y-4 border-y border-stone-200 py-4" aria-label="Cuánto encaja contigo" data-testid="native-affinity-summary">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-44">
          <p className="text-xs font-medium text-stone-500">{personalTitle ? 'Comparación de estilo' : 'Tu afinidad'}</p>
          <h4 className="mt-1 text-lg font-semibold leading-6 text-slate-950">{personalTitle ?? result.title}</h4>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums text-red-900" aria-label={`Afinidad orientativa: ${result.score} de 100`}>
          <span aria-hidden="true">≈{result.score}<span className="text-sm font-medium text-stone-500">/100</span></span>
        </p>
      </div>
      <div className="space-y-2 text-sm leading-6 text-stone-700">
        {personalTitle && <p>El porcentaje compara estilos; no cambia tu valoración de este vino.</p>}
        {result.matches.length > 0 ? result.matches.map(reason => <p key={reason}>{reason}</p>)
          : <p>No destaca una coincidencia clara con tus preferencias actuales.</p>}
        {result.caution && <div className="border-l-2 border-amber-500 pl-3"><p className="font-semibold text-stone-900">Lo que podría gustarte menos</p><p>{result.caution}</p></div>}
        <p className="text-xs leading-5 text-stone-500">Basado en tu perfil y en la ficha de este vino. El gusto también depende del momento y de cómo se sirva.</p>
      </div>
      <details className="min-w-0 border-t border-stone-200 pt-3 text-sm" data-testid="native-affinity-details">
        <summary aria-label="Ver el detalle de afinidad" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-medium text-stone-800"><span aria-hidden="true">Ver el detalle de afinidad</span><ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" /></summary>
        <dl className="mt-2 divide-y divide-stone-100">
          {result.dimensions.map(dimension => <div className="flex min-w-0 flex-wrap justify-between gap-x-4 gap-y-1 py-3" key={dimension.key}>
            <dt className="font-medium capitalize text-stone-800">{dimension.label}</dt>
            <dd className="min-w-0 text-xs leading-5 text-stone-600" aria-label={`${dimension.label}: tu perfil ${dimension.profileValue.toFixed(1)}/5; este vino ${dimension.wineValue.toFixed(1)}/5`}><span aria-hidden="true">Tu perfil: {dimension.profileValue.toFixed(1)}/5 · Este vino: {dimension.wineValue.toFixed(1)}/5</span></dd>
          </div>)}
        </dl>
        <p className="mt-3 text-xs leading-5 text-stone-500">Comparamos cinco rasgos del vino con tu perfil. La cifra indica encaje sensorial: no es una probabilidad de que te guste ni una valoración de calidad.</p>
      </details>
    </section>
  );
};
