import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, ChevronRight, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { readCellarPublicReference107 } from '@/utils/cellarPublicReference107';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { cellarAffinityView, type CellarAffinityWine } from '@/utils/bodegaAffinity';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';

interface Props {
  native: boolean;
  wine: CellarAffinityWine & { id: string; producer?: string | null; vintage?: number | null; image_url?: string | null; rating?: string | null; quantity?: number | null; status?: string };
  snapshot: ScanProfileSnapshot | null;
  resolveImage: boolean;
  children: ReactNode;
}

export const NativeCellarItem98 = ({ native, wine, snapshot, resolveImage, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null);
  const identityKey = JSON.stringify([wine.name, wine.producer, wine.vintage]);
  if (!native) return <>{children}</>;
  const view = cellarAffinityView(wine, snapshot);
  const reference = readCellarPublicReference107(wine);
  const rating = wine.rating === 'love' ? 'Te gusta' : wine.rating === 'not_for_me' ? 'No es para ti' : wine.rating === 'ok' ? 'Te pareció correcto' : null;
  return <>
    <button type="button" className="flex min-h-36 w-full min-w-0 items-center gap-4 border-b border-stone-200 py-4 text-left" aria-label={`Ver ${wine.name}`} onClick={() => setOpen(true)} data-testid="native-cellar-item98">
      <NativeWinePhoto98 src={wine.image_url} ownedCapture name={wine.name} identity={{ name: wine.name, producer: wine.producer, vintage: wine.vintage }} resolveMissing={resolveImage || open} onResolved={url => setResolved({ key: identityKey, url })} className="h-[112px] w-[80px] border border-stone-200" />
      <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold leading-6 text-stone-950">{wine.name}</span><span className="mt-1 block break-words text-xs leading-5 text-stone-500">{[wine.producer, wine.vintage].filter(Boolean).join(' · ')}</span>
        <span className={`mt-2 flex items-center gap-1 text-sm font-semibold ${wine.rating === 'not_for_me' ? 'text-stone-700' : rating || view.current !== null ? 'text-emerald-800' : 'text-stone-600'}`}>{wine.rating === 'love' && <ThumbsUp className="h-4 w-4" aria-hidden="true" />}{wine.rating === 'not_for_me' && <ThumbsDown className="h-4 w-4" aria-hidden="true" />}{rating || (view.current !== null ? `≈${view.current}/100 para ti` : 'Afinidad por calcular')}</span>
        {wine.status === 'collection' && wine.quantity != null && <span className="mt-1 block text-xs text-stone-500">{wine.quantity} {wine.quantity === 1 ? 'botella' : 'botellas'}</span>}
      </span><ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
    </button>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-white text-stone-950">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2"><Dialog.Title className="min-w-0 break-words text-base font-semibold">Tu vino</Dialog.Title><Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Cerrar vino"><X className="h-5 w-5" /></Dialog.Close></div>
      <Dialog.Description className="sr-only">Ficha, afinidad y valoración de {wine.name}.</Dialog.Description>
      <div className="min-h-0 overflow-y-auto pb-[calc(1rem+var(--matchrim-safe-bottom))] [&>.relative]:border-0 [&>.relative]:shadow-none">
        {reference && <div className="border-b border-stone-200 px-4 py-3">
          <a href={reference.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-950" data-testid="cellar-public-reference107">
            <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />Ficha original de Winerim
          </a>
          {reference.catalogue_vintage === null && <p className="text-xs leading-5 text-stone-600">Referencia sin añada. No confirma los datos sensoriales de tu botella.</p>}
        </div>}
        {!wine.image_url && resolved?.key === identityKey && <NativeWinePhoto98 src={resolved.url} name={wine.name} className="mx-auto mt-4 h-48 w-32" />}
        {children}
      </div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
};
