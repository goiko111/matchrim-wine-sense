import type { ReactNode } from 'react';
import { BookOpen, Check, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import './nativeLabelSheet102.css';
import type { NativeAffinityGap210 } from '@/utils/multiWineConsumer95';

interface LabelAnalysisViewProps {
  isNativePlatform: boolean;
  showIdentity?: boolean;
  identity: { name: string; producer: string | null; vintage: number | null };
  identityLabel: string;
  catalogIdentityLinked: boolean;
  canExplainAffinity: boolean;
  hasProfile: boolean;
  pendingAffinity?: NativeAffinityGap210 | null;
  affinity: ReactNode;
  catalogueReference?: ReactNode;
  /** 139: a labelled store estimate, shown above the pending explanation when there is no verified affinity. */
  estimate?: ReactNode;
  /** 140: the Winerim bottle photo (above the verdict) and the Winerim data (below the save button), as in the search sheet. */
  photo?: ReactNode;
  facts?: ReactNode;
  /** 145: replaces the single «Guardar en Por probar» button when the scan holds one bottle. */
  saveChoice?: ReactNode;
  lookup: ReactNode;
  disabled: boolean;
  onFindSheet: () => void;
  onCorrect: () => void;
  onReturnToBatch?: () => void;
  /** 137: with a single bottle the button saves it; there is no batch to go back to. */
  returnLabel?: string;
  children?: ReactNode;
}

// Presentation only: the scanner retains identity, lookup and affinity authority.
export const LabelAnalysisView = ({ isNativePlatform, showIdentity = true, identity, identityLabel,
  catalogIdentityLinked, canExplainAffinity, hasProfile, pendingAffinity, affinity, catalogueReference, estimate = null, photo = null, facts = null, saveChoice = null, lookup, disabled,
  onFindSheet, onCorrect, onReturnToBatch, returnLabel = 'Volver al lote para guardar', children = null }: LabelAnalysisViewProps) => {
  if (!isNativePlatform) return <>{children}</>;

  // 144: while the person is still choosing the wine among candidates, the explanation of why there is no affinity yet
  // («Primero, identifiquemos el vino…») is noise above the list: it stays for VoiceOver only.
  const picking = isNativePlatform && !catalogIdentityLinked && pendingAffinity?.reason === 'identity' && Boolean(lookup);
  return <section className="min-w-0 space-y-4 py-3 [&:has([data-testid=native-store-estimate139])_.gap139]:hidden" aria-label="Vino seleccionado" data-testid="native-wine-primary">
    {showIdentity ? <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
      <h3 className="text-xl font-semibold leading-snug text-slate-950">{identity.name}</h3>
      <p className="text-sm leading-6 text-stone-700">
        {identity.producer || 'Bodega sin confirmar'} · {identity.vintage || 'Añada no indicada'}
      </p>
      <p className="text-xs leading-5 text-stone-500">{identityLabel}</p>
    </div>
      // 140: «Referencia del catálogo Winerim» as a grey line under a verdict told the person nothing. With a verified
      // affinity nothing is said; with a store estimate (gap139) its own sentence explains it. Other states keep the line.
      : !canExplainAffinity && <p className={`gap139 text-xs leading-5 text-stone-500 ${picking ? 'sr-only' : ''}`}>{identityLabel}</p>}

    {photo}
    {!canExplainAffinity && estimate}
    {/* 140: with a store estimate on screen the «found, no flavour data» reference block under it only repeats the wine. */}
    {canExplainAffinity ? affinity : catalogueReference ? <div className="gap139">{catalogueReference}</div> : <div className={`min-w-0 space-y-2 ${picking ? '' : 'border-y border-stone-200 py-3'}`} data-testid="native-label-next-step">
      <h4 className={picking ? 'sr-only' : 'font-semibold text-slate-950'}>{pendingAffinity?.title ?? 'Afinidad pendiente'}</h4>
      <p className={picking ? 'sr-only' : 'text-sm leading-6 text-stone-700'} data-testid="native-affinity-gap-reason">{pendingAffinity?.description ?? (catalogIdentityLinked
        ? hasProfile ? 'La ficha está enlazada, pero aún faltan datos para calcular tu afinidad.'
          : 'La ficha está enlazada. Completa tu test para compararla con tus gustos.'
        : 'Aún no hay una ficha enlazada para comparar este vino con tus gustos.')}</p>
      {pendingAffinity && <p className={picking ? 'sr-only' : 'text-sm leading-6 text-stone-700'} data-testid="native-affinity-gap-next-step">{pendingAffinity.nextStep}</p>}
      {!catalogIdentityLinked && (lookup || <Button type="button" disabled={disabled} onClick={onFindSheet}
        className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white hover:bg-red-900">
        <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">Buscar ficha para mi afinidad</span>
      </Button>)}
      {catalogIdentityLinked && (!hasProfile || pendingAffinity?.reason === 'profile') && <Button asChild className="h-auto min-h-11 max-w-full whitespace-normal">
        <Link to="/matchrim">Completar mi test</Link>
      </Button>}
      {catalogIdentityLinked && pendingAffinity && ['sensory', 'score'].includes(pendingAffinity.reason) && <Button
        type="button" variant="outline" disabled={disabled} onClick={onFindSheet}
        className="h-auto min-h-11 max-w-full gap-2 whitespace-normal px-3 py-3 text-left">
        <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" /> Revisar ficha
      </Button>}
    </div>}

    {/* 140: a wine whose verdict is a store estimate can be saved from here too (the button shows only then). */}
    {/* 145: one bottle is saved where it belongs (to try, tasted, at home), as in every other wine sheet. */}
    {saveChoice ? (canExplainAffinity || estimate) && <div className={canExplainAffinity ? '' : 'hidden [section:has([data-testid=native-store-estimate139])_&]:block'} data-testid="scan-save-choice145">{saveChoice}</div>
      : onReturnToBatch && (canExplainAffinity || estimate) && <Button type="button" disabled={disabled} onClick={onReturnToBatch}
      className={`h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white hover:bg-red-900 ${canExplainAffinity ? '' : 'hidden [section:has([data-testid=native-store-estimate139])_&]:flex'}`}>
      <Check aria-hidden="true" className="h-5 w-5 shrink-0" /><span className="min-w-0 [overflow-wrap:anywhere]">{returnLabel}</span>
    </Button>}

    {facts}
    <div className="flex min-w-0 flex-wrap gap-2">
      <Button type="button" variant="outline" aria-label="Corregir identificación" disabled={disabled} onClick={onCorrect}
        className="h-auto min-h-11 min-w-0 flex-1 basis-32 gap-2 whitespace-normal px-3 py-3">
        <Pencil aria-hidden="true" className="h-4 w-4 shrink-0" /> Corregir
      </Button>
    </div>
  </section>;
};
