import { Link } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import type { CellarReferenceStyleView110 } from '@/utils/cellarReferenceStyle110';
import { buildAffinityInsights } from '@/utils/wineAffinityExplanation';

export const CellarReferenceStyle110 = ({ view, snapshot }: { view: CellarReferenceStyleView110; snapshot: ScanProfileSnapshot | null }) => {
  const insights = buildAffinityInsights(snapshot?.profile, view.attributes);
  const names = { potente: 'cuerpo', acidez: 'frescura', dulce: 'dulzor', tanico: 'tanino', afrutado: 'fruta' };
  const matches = insights?.positives.slice(0, 2).map(item => names[item.key]).join(' y ');
  const friction = insights?.negatives[0];
  return <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]" data-testid="cellar-reference-style110">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h4 className="font-semibold text-stone-950">Por su estilo</h4>
      {view.current !== null && <p className="text-lg font-bold text-red-950" aria-live="polite">≈{view.current}/100 para ti</p>}
    </div>
    {view.current !== null ? <>
      {matches && <p className="text-sm leading-6 text-stone-800">Encaja contigo por su {matches}.</p>}
      {friction && <p className="text-sm leading-6 text-stone-800">{friction.direction === 'higher' ? 'Más' : 'Menos'} {names[friction.key]} que tu preferencia habitual.</p>}
    </> : <Button asChild className="h-auto min-h-11 w-full whitespace-normal py-3"><Link to="/matchrim">Completar mi test de gustos</Link></Button>}
    {view.initial && <p className="text-xs leading-5 text-stone-600">Al guardar: ≈{view.initial.score}/100 por estilo.
      {view.delta !== null && view.delta !== 0 && ` Tu perfil actual cambia esta orientación ${view.delta > 0 ? '+' : ''}${view.delta} puntos.`}
    </p>}
    <p className="text-xs leading-5 text-stone-600">Ficha Winerim sin añada. Orienta sobre el estilo, no verifica los datos de tu cosecha.</p>
    <details className="text-xs leading-5 text-stone-600">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium"><CircleHelp aria-hidden="true" className="h-4 w-4 shrink-0" />Origen y límites</summary>
      <p>La ficha pública no especifica si los atributos proceden de una cata o han sido generados. La cifra no es una probabilidad de que te guste y estos datos de referencia no se usan para enseñar al perfil.</p>
    </details>
  </div>;
};
