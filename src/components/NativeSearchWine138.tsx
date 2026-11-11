import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { usableStoreSensory138 } from '@/utils/storeEstimate138';
import { storeAffinity139 } from '@/utils/storeListing139';
import { NativeAffinitySummary } from '@/components/NativeAffinitySummary';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { NativeWineSave98 } from '@/components/NativeWineSave98';

interface Props {
  wine: PublicGlobalRow103 | null;
  profile?: MatchrimProfileLike | null;
  onClose: () => void;
}

const grapes = (row: PublicGlobalRow103) => [...new Set((row.grapes ?? []).flat(2).flatMap(grape => {
  const name = typeof grape === 'string' ? grape : grape && typeof grape === 'object' ? (grape as { name?: unknown }).name : null;
  return typeof name === 'string' && name.trim() ? [name.trim()] : [];
}))];

// 138: picking a search result opened the ten-field «Añadir vino» form. Whoever searches a wine wants to know
// whether they will like it. 139: the result is a row of Winerim's public store, so the sheet opens at once with
// its photo, its Winerim data and the affinity (a labelled estimate: store data is not a verified sheet).
export const NativeSearchWine138 = ({ wine, profile, onClose }: Props) => {
  const attributes = wine ? usableStoreSensory138(wine) : null;
  const name = wine ? [wine.name, wine.subname].filter(Boolean).join(' ') : '';
  const facts = wine ? [['Tipo', wine.type], ['Zona', [wine.region, wine.country].filter(Boolean).join(' · ')], ['Uvas', grapes(wine).join(', ')],
    ['Añada de la ficha', wine.vintage == null ? '' : String(wine.vintage)]].filter(([, value]) => value) : [];
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
          {wine && <div className="py-4" data-testid={attributes ? 'native-search-estimate138' : 'native-search-missing138'}>
            <div className="flex min-w-0 flex-wrap items-start gap-4">
              <NativeWinePhoto98 src={wine.photo} name={name} className="h-[176px] w-[96px]" />
              <div className="min-w-[min(100%,12rem)] flex-1 pt-2">
                <h4 className="break-words text-xl font-semibold leading-7">{name}</h4>
                <p className="mt-2 break-words text-sm leading-6 text-stone-600">{[wine.winery, wine.region].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
            {attributes ? <>
              <div className="mt-3"><NativeAffinitySummary result={storeAffinity139(profile, attributes)} /></div>
              <p className="mt-3 text-xs leading-5 text-stone-500">Estimación con los datos de la tienda de Winerim. Este vino aún no tiene ficha verificada, así que tómalo como una orientación.</p>
            </> : <div className="mt-4 border-y border-stone-200 py-4">
              <p className="text-base font-semibold">Aún no tenemos sus datos de sabor</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">Sin ellos no podemos decirte cuánto encaja contigo. No significa que no te vaya a gustar. Puedes guardarlo y valorarlo cuando lo pruebes.</p>
            </div>}
            {facts.length > 0 && <section className="mt-4" aria-label="Ficha de Winerim" data-testid="native-search-sheet139">
              <h5 className="text-sm font-semibold">Ficha de Winerim</h5>
              <dl className="mt-1 divide-y divide-stone-100 text-sm">{facts.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-2"><dt className="text-stone-500">{label}</dt><dd className="min-w-0 text-right capitalize [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
            </section>}
            <NativeWineSave98 wine={{ name, winery: wine.winery, vintage: wine.vintage ?? undefined }} />
          </div>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
};
