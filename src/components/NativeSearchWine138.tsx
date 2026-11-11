import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X } from 'lucide-react';
import WineCard from '@/components/WineCard';
import type { NativeWine } from '@/components/wine-import/NativeWineSearch97';
import { findWinerimWineForLabel, type WinerimWineWithMatch } from '@/services/winerimApi';
import { calculateLocalMatchrimAffinity, currentLocalAffinityModel187 } from '@/utils/wineAffinityExplanation';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { findStoreEstimate138, type StoreEstimate138 } from '@/utils/storeEstimate138';
import { buildConsumerAffinity } from '@/utils/consumerAffinity95';
import { NativeAffinitySummary } from '@/components/NativeAffinitySummary';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { NativeWineSave98 } from '@/components/NativeWineSave98';

interface Props {
  wine: NativeWine | null;
  profile?: MatchrimProfileLike | null;
  onClose: () => void;
  onSave: (wine: NativeWine) => void;
}

type Lookup = { key: string; phase: 'loading' | 'missing' } | { key: string; phase: 'ready'; sheet: WinerimWineWithMatch }
  | { key: string; phase: 'estimate'; estimate: StoreEstimate138 };

// 138: picking a search result opened the ten-field «Añadir vino» form. Whoever searches a wine wants to know
// whether they will like it, so the result now opens the same sheet as a recommendation, with its Winerim data.
export const NativeSearchWine138 = ({ wine, profile, onClose, onSave }: Props) => {
  const [lookup, setLookup] = useState<Lookup | null>(null);
  useEffect(() => {
    if (!wine) { setLookup(null); return; }
    const controller = new AbortController();
    setLookup({ key: wine.id, phase: 'loading' });
    void findWinerimWineForLabel({ name: wine.name, producer: wine.producer, vintage: wine.vintage, region: wine.region },
      { signal: controller.signal }).then(result => {
      if (controller.signal.aborted) return;
      if (!result) {
        // Not in the verified Library: fall back to the public store, as a labelled estimate.
        return findStoreEstimate138(wine, controller.signal).then(estimate => {
          if (!controller.signal.aborted) setLookup(estimate ? { key: wine.id, phase: 'estimate', estimate } : { key: wine.id, phase: 'missing' });
        });
      }
      // A verified Library sheet carries the five values on Winerim's 0-5 scale.
      const attributes = result.wine.tastingAttributes ? { ...result.wine.tastingAttributes, scale: 'winerim-0-5' as const } : null;
      setLookup({ key: wine.id, phase: 'ready', sheet: { ...result.wine, tastingAttributes: attributes,
        matchPercentage: calculateLocalMatchrimAffinity(profile, attributes) ?? 0,
        affinityModel: currentLocalAffinityModel187(attributes) } });
    }, () => { if (!controller.signal.aborted) setLookup({ key: wine.id, phase: 'missing' }); });
    return () => controller.abort();
  // The profile is read when the sheet opens; it does not change while it is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wine]);
  const current = wine && lookup?.key === wine.id ? lookup : null;
  return <Dialog.Root open={Boolean(wine)} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Dialog.Content aria-describedby="search-wine138-description" data-testid="native-search-wine138"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-white text-stone-950">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2">
          <Dialog.Title className="text-base font-semibold">El vino y tú</Dialog.Title>
          <Dialog.Close className="flex h-11 w-11 items-center justify-center" aria-label="Cerrar explicación del vino"><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
        </div>
        <div className="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))]">
          <Dialog.Description id="search-wine138-description" className="sr-only">El vino que has buscado y cómo encaja con tus gustos.</Dialog.Description>
          {wine && current?.phase === 'ready' ? <WineCard wine={current.sheet} index={0} profile={profile} />
            : wine && current?.phase === 'estimate' ? <div className="py-4" data-testid="native-search-estimate138">
              <div className="flex min-w-0 flex-wrap items-start gap-4">
                <NativeWinePhoto98 src={current.estimate.row.photo} name={wine.name} className="h-[176px] w-[96px]" />
                <div className="min-w-[min(100%,12rem)] flex-1 pt-2">
                  <h4 className="break-words text-xl font-semibold leading-7">{wine.name}</h4>
                  <p className="mt-2 break-words text-sm leading-6 text-stone-600">{[current.estimate.row.winery, wine.vintage, current.estimate.row.region].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <div className="mt-3"><NativeAffinitySummary result={buildConsumerAffinity({ catalogIdentityLinked: true, sensorySource: 'catalog',
                attributes: current.estimate.attributes, profile, score: calculateLocalMatchrimAffinity(profile, current.estimate.attributes) })} /></div>
              <p className="mt-3 text-xs leading-5 text-stone-500">Estimación con los datos de la tienda de Winerim{current.estimate.row.vintage && String(current.estimate.row.vintage) !== String(wine.vintage ?? '') ? ` (añada ${current.estimate.row.vintage})` : ''}. Este vino aún no tiene ficha verificada, así que tómalo como una orientación.</p>
              <NativeWineSave98 wine={{ name: wine.name, winery: wine.producer ?? current.estimate.row.winery, vintage: wine.vintage ?? undefined }} />
            </div>
            : wine && <div className="py-5">
              <h4 className="break-words text-xl font-semibold leading-7">{wine.name}</h4>
              <p className="mt-1 break-words text-sm leading-6 text-stone-600">{[wine.producer, wine.vintage, wine.region].filter(Boolean).join(' · ')}</p>
              {current?.phase === 'missing' ? <>
                <p className="mt-4 text-base font-semibold">Aún no tenemos la ficha de este vino</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">Sin sus datos de sabor no podemos decirte cuánto encaja contigo. No significa que no te vaya a gustar. Puedes guardarlo y valorarlo cuando lo pruebes.</p>
                <button type="button" className="mt-4 flex min-h-12 w-full items-center justify-center rounded-md bg-red-900 px-4 py-3 text-sm font-semibold text-white" onClick={() => onSave(wine)}>Guardar en Mis vinos</button>
              </> : <p role="status" className="mt-4 flex min-h-11 items-center gap-2 text-sm text-stone-600"><Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />Buscando su ficha en Winerim…</p>}
            </div>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
};
