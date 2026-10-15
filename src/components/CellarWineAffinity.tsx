import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AffinityExplanation } from './AffinityExplanation';
import { cellarAffinityView, type CellarAffinityWine } from '@/utils/bodegaAffinity';
import { canRetryScanProfile, type ScanProfileSnapshot } from '@/utils/scanProfile';

interface Props {
  wine: CellarAffinityWine & { id: string };
  snapshot: ScanProfileSnapshot | null;
  resolving: boolean;
  onResolve: () => void;
  onRetryProfile: () => void;
}

export const CellarWineAffinity = ({ wine, snapshot, resolving, onResolve, onRetryProfile }: Props) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const view = cellarAffinityView(wine, snapshot);
  return (
    <section aria-label={`Afinidad de ${wine.name}`} className="space-y-2 border-y border-slate-200 py-3 text-sm" data-testid="cellar-wine-affinity">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-slate-950">Afinidad actual</span>
        <span className="font-bold text-red-900" aria-live="polite">{view.current === null ? 'Pendiente' : `\u2248${view.current}%`}</span>
      </div>
      {view.current !== null && <Progress value={view.current} role="meter" aria-label={`Afinidad actual orientativa de ${wine.name}`} className="h-2" />}
      {view.initial ? (
        <p className="text-xs text-slate-600">
          {view.initial.phase === 'saved' ? 'Al guardar' : 'Primera estimaci\u00f3n verificada'}: {view.initial.score}%
          {' \u00b7 '}{new Date(view.initial.recorded_at).toLocaleDateString('es-ES')}
          {view.delta !== null && view.delta !== 0 && ` \u00b7 ${view.delta > 0 ? '+' : ''}${view.delta} puntos desde entonces`}
        </p>
      ) : <p className="text-xs text-slate-500">{'No hay una estimaci\u00f3n inicial registrada; no reconstruimos el pasado con tu perfil de hoy.'}</p>}
      <p className="text-xs leading-5 text-slate-600">{view.reason}</p>
      {view.current !== null && <p className="text-xs text-slate-500">{'Encaje sensorial orientativo, no tu valoraci\u00f3n del vino ni una probabilidad de que te guste.'}</p>}
      {!view.attributes && <Button variant="outline" className="min-h-11 w-full whitespace-normal" onClick={onResolve} disabled={resolving} aria-busy={resolving}>
        {resolving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        Verificar ficha y afinidad
      </Button>}
      {snapshot && !snapshot.profile && ['missing', 'invalid'].includes(snapshot.status) && <Button variant="outline" className="min-h-11 w-full whitespace-normal"
        onClick={() => navigate('/matchrim')}>Completar test de paladar</Button>}
      {view.current !== null && !view.initial && <Button variant="outline" className="min-h-11 w-full whitespace-normal" onClick={onResolve} disabled={resolving} aria-busy={resolving}>
        {resolving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar primera afinidad
      </Button>}
      {canRetryScanProfile(snapshot) && <Button variant="outline" className="min-h-11 w-full" onClick={onRetryProfile}>
        <RefreshCw className="mr-2 h-4 w-4" />Reintentar perfil
      </Button>}
      {view.current !== null && <Button variant="ghost" className="min-h-11 px-0" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <CircleHelp className="mr-2 h-4 w-4" />{expanded ? 'Ocultar explicaci\u00f3n' : 'Por qu\u00e9 encaja contigo'}
      </Button>}
      {expanded && view.current !== null && <div className="[&>.matchrim-surface]:border-0 [&>.matchrim-surface]:bg-transparent [&>.matchrim-surface]:p-0 [&>.matchrim-surface]:shadow-none">
        <AffinityExplanation wineKey={`cellar:${wine.id}`} score={view.current}
          attributes={view.attributes} sensorySource="catalog" profile={snapshot?.profile ?? null}
          catalogIdentityLinked={Boolean(view.attributes)} compact />
      </div>}
    </section>
  );
};
