import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp, Loader2, RefreshCw, ThumbsDown, ThumbsUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { NativeAffinitySummary } from './NativeAffinitySummary';
import { cellarAffinityView, type CellarAffinityWine } from '@/utils/bodegaAffinity';
import { canRetryScanProfile, type ScanProfileSnapshot } from '@/utils/scanProfile';
import { cellarReferenceStyleView110 } from '@/utils/cellarReferenceStyle110';
import { CellarReferenceStyle110 } from './CellarReferenceStyle110';

interface Props {
  wine: CellarAffinityWine & { id: string; rating?: string | null };
  snapshot: ScanProfileSnapshot | null;
  resolving: boolean;
  onResolve: () => void;
  onRetryProfile: () => void;
}

export const CellarWineAffinity = ({ wine, snapshot, resolving, onResolve, onRetryProfile }: Props) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const view = cellarAffinityView(wine, snapshot);
  const referenceStyle = view.current === null ? cellarReferenceStyleView110(wine, snapshot) : null;
  const rating = wine.rating === 'not_for_me'
    ? { title: 'Ya sabes que no te gusta', note: 'Lo marcaste como un vino que no quieres repetir.', Icon: ThumbsDown }
    : wine.rating === 'love'
      ? { title: 'Ya sabes que te gusta', note: 'Lo valoraste con "Me encanta".', Icon: ThumbsUp }
      : wine.rating === 'ok'
        ? { title: 'Te pareci\u00f3 correcto', note: 'Tu valoraci\u00f3n de esta botella est\u00e1 guardada.', Icon: Minus }
        : null;
  const exactCalculation = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-950">{referenceStyle ? 'Afinidad de esta añada' : 'Afinidad actual'}</span>
        <span className="font-bold text-red-900" aria-live="polite">{view.current === null ? 'Por calcular' : `\u2248${view.current}/100`}</span>
      </div>
      {view.current !== null && <Progress value={view.current} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={view.current} aria-label={`Afinidad actual orientativa de ${wine.name}`} className="h-2" />}
      {view.initial ? (
        <p className="text-xs text-slate-600">
          {`${view.initial.phase === 'saved' ? 'Al guardar' : 'Primera afinidad registrada'}: ${view.initial.score}/100 \u00b7 ${new Date(view.initial.recorded_at).toLocaleDateString('es-ES')}${view.delta !== null && view.delta !== 0 ? ` \u00b7 ${view.delta > 0 ? '+' : ''}${view.delta} ${Math.abs(view.delta) === 1 ? 'punto' : 'puntos'} desde entonces` : ''}`}
        </p>
      ) : <p className="text-xs text-slate-500">{referenceStyle ? 'No hay una afinidad inicial verificada de esta añada.' : 'No hay una afinidad inicial guardada para este vino.'}</p>}
      <p className="text-xs leading-5 text-slate-600">{snapshot?.status === 'ready' && snapshot.profile
        ? !view.attributes ? referenceStyle ? 'Falta una ficha sensorial verificable de esta añada.' : 'Necesito la ficha de este vino para compararlo con tus gustos.'
          : snapshot.source === 'learned' ? 'Basado en tu test y en tus valoraciones.' : 'Basado en tu test de paladar.'
        : view.reason}</p>
      {!view.attributes && <Button variant="outline" className="min-h-11 w-full whitespace-normal" onClick={onResolve} disabled={resolving} aria-busy={resolving}>
        {resolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        {referenceStyle ? 'Buscar ficha de esta añada' : 'Buscar ficha y calcular afinidad'}
      </Button>}
      {snapshot && !snapshot.profile && ['missing', 'invalid'].includes(snapshot.status) && <Button variant="outline" className="min-h-11 w-full whitespace-normal"
        onClick={() => navigate('/matchrim')}>Completar test de paladar</Button>}
      {view.current !== null && !view.initial && <Button variant="outline" className="min-h-11 w-full whitespace-normal" onClick={onResolve} disabled={resolving} aria-busy={resolving}>
        {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar afinidad de hoy
      </Button>}
      {canRetryScanProfile(snapshot) && <Button variant="outline" className="min-h-11 w-full" onClick={onRetryProfile}>
        <RefreshCw className="mr-2 h-4 w-4" />Reintentar perfil
      </Button>}
      {view.current !== null && <Button variant="ghost" className="min-h-11 px-0" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <CircleHelp className="mr-2 h-4 w-4" />{expanded ? 'Ocultar explicaci\u00f3n' : 'Por qu\u00e9 esta afinidad'}
      </Button>}
      {expanded && view.current !== null && <div className="[&>.matchrim-surface]:border-0 [&>.matchrim-surface]:bg-transparent [&>.matchrim-surface]:p-0 [&>.matchrim-surface]:shadow-none">
        <NativeAffinitySummary personalRating={wine.rating} score={view.current}
          attributes={view.attributes} sensorySource="catalog" profile={snapshot?.profile ?? null}
          catalogIdentityLinked={Boolean(view.attributes)} />
      </div>}
    </>
  );
  const calculation = referenceStyle ? <>
    <CellarReferenceStyle110 view={referenceStyle} snapshot={snapshot} onRetryProfile={onRetryProfile} />
    <details className="text-sm"><summary aria-label="Datos de esta añada" className="flex min-h-11 cursor-pointer items-center gap-2 font-medium"><CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" /><span aria-hidden="true">Datos de esta añada</span></summary>
      <div className="space-y-2 pt-2">{exactCalculation}</div>
    </details>
  </> : exactCalculation;
  return (
    <section aria-label={`Afinidad de ${wine.name}`} className="space-y-2 border-y border-slate-200 py-3 text-sm" data-testid="cellar-wine-affinity">
      {rating ? <>
        <p className="flex items-start gap-2 font-semibold text-slate-950" role="status">
          <rating.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{rating.title}
        </p>
        <p className="text-sm leading-5 text-slate-600">{rating.note}</p>
        <details className="space-y-2" data-testid="rated-cellar-style97">
          <summary aria-label="Ver afinidad por estilo" className="flex min-h-11 cursor-pointer items-center gap-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <CircleHelp className="h-4 w-4 shrink-0" aria-hidden="true" /><span aria-hidden="true">Ver afinidad por estilo</span>
          </summary>
          <p className="text-xs leading-5 text-slate-600">{'Tu valoraci\u00f3n de este vino tiene prioridad. Esta cifra compara su estilo con tu perfil; no sustituye lo que ya has probado.'}</p>
          {calculation}
        </details>
      </> : calculation}
    </section>
  );
};
