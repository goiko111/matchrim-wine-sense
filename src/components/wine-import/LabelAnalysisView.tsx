import type { ReactNode } from 'react';
import { BookOpen, Check, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import './nativeLabelSheet102.css';

interface LabelAnalysisViewProps {
  isNativePlatform: boolean;
  showIdentity?: boolean;
  identity: { name: string; producer: string | null; vintage: number | null };
  identityLabel: string;
  catalogIdentityLinked: boolean;
  canExplainAffinity: boolean;
  hasProfile: boolean;
  affinity: ReactNode;
  catalogueReference?: ReactNode;
  lookup: ReactNode;
  disabled: boolean;
  onFindSheet: () => void;
  onCorrect: () => void;
  onReturnToBatch?: () => void;
  children?: ReactNode;
}

// Presentation only: the scanner retains identity, lookup and affinity authority.
export const LabelAnalysisView = ({ isNativePlatform, showIdentity = true, identity, identityLabel,
  catalogIdentityLinked, canExplainAffinity, hasProfile, affinity, catalogueReference, lookup, disabled,
  onFindSheet, onCorrect, onReturnToBatch, children = null }: LabelAnalysisViewProps) => {
  if (!isNativePlatform) return <>{children}</>;

  return <section className="min-w-0 space-y-4 py-3" aria-label="Vino seleccionado" data-testid="native-wine-primary">
    {showIdentity ? <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
      <h3 className="text-xl font-semibold leading-snug text-slate-950">{identity.name}</h3>
      <p className="text-sm leading-6 text-stone-700">
        {identity.producer || 'Bodega sin confirmar'} · {identity.vintage || 'Añada no indicada'}
      </p>
      <p className="text-xs leading-5 text-stone-500">{identityLabel}</p>
    </div> : <p className="text-xs leading-5 text-stone-500">{identityLabel}</p>}

    {canExplainAffinity ? affinity : catalogueReference || <div className="min-w-0 space-y-2 border-y border-stone-200 py-3" data-testid="native-label-next-step">
      <h4 className="font-semibold text-slate-950">Afinidad pendiente</h4>
      <p className="text-sm leading-6 text-stone-700">{catalogIdentityLinked
        ? hasProfile ? 'La ficha está enlazada, pero aún faltan datos para calcular tu afinidad.'
          : 'La ficha está enlazada. Completa tu test para compararla con tus gustos.'
        : 'Aún no hay una ficha enlazada para comparar este vino con tus gustos.'}</p>
      {!catalogIdentityLinked && (lookup || <Button type="button" disabled={disabled} onClick={onFindSheet}
        className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white hover:bg-red-900">
        <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">Buscar ficha para mi afinidad</span>
      </Button>)}
      {catalogIdentityLinked && !hasProfile && <Button asChild className="h-auto min-h-11 max-w-full whitespace-normal">
        <Link to="/matchrim">Completar mi test</Link>
      </Button>}
    </div>}

    {canExplainAffinity && onReturnToBatch && <Button type="button" disabled={disabled} onClick={onReturnToBatch}
      className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white hover:bg-red-900">
      <Check aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">Volver al lote para guardar</span>
    </Button>}

    <div className="flex min-w-0 flex-wrap gap-2">
      <Button type="button" variant="outline" aria-label="Corregir identificación" disabled={disabled} onClick={onCorrect}
        className="h-auto min-h-11 min-w-0 flex-1 basis-32 gap-2 whitespace-normal px-3 py-3">
        <Pencil aria-hidden="true" className="h-4 w-4 shrink-0" /> Corregir
      </Button>
    </div>
  </section>;
};
