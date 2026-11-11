import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, ChevronRight, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { readCellarPublicReference107 } from '@/utils/cellarPublicReference107';
import { readCellarMasterReference260 } from '@/utils/cellarMasterReference260';
import { cellarReferenceStyleView110 } from '@/utils/cellarReferenceStyle110';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { cellarAffinityView, type CellarAffinityWine } from '@/utils/bodegaAffinity';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import { useOwnWinePhoto133 } from '@/utils/ownWinePhoto133';
import { NativeWineNote139 } from '@/components/NativeWineNote139';

interface Props {
  native: boolean;
  wine: CellarAffinityWine & { id: string; producer?: string | null; vintage?: number | null; image_url?: string | null; rating?: string | null; quantity?: number | null; status?: string; personal_note?: string | null };
  snapshot: ScanProfileSnapshot | null;
  resolveImage: boolean;
  children: ReactNode;
}

export const NativeCellarItem98 = ({ native, wine, snapshot, resolveImage, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null);
  const identityKey = JSON.stringify([wine.name, wine.producer, wine.vintage]);
  // 133: the catalogue photo was looked up only for the first four wines; the rest said "Sin foto"
  // until opened. Now each row looks it up when it comes near the screen, after the own photo.
  const rowRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const ownPhoto = useOwnWinePhoto133(wine.id, native && !wine.image_url);
  useEffect(() => {
    const node = rowRef.current;
    if (!native || visible || !node) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '300px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [native, visible]);
  if (!native) return <>{children}</>;
  const view = cellarAffinityView(wine, snapshot, true);
  const reference = readCellarPublicReference107(wine);
  const masterReference = readCellarMasterReference260(wine);
  const style = view.current === null ? cellarReferenceStyleView110(wine, snapshot) : null;
  const displayScore = view.current ?? style?.current ?? null;
  const rating = wine.rating === 'love' ? 'Te gusta' : wine.rating === 'not_for_me' ? 'No es para ti' : wine.rating === 'ok' ? 'Te pareció correcto' : null;
  const verdict = rating || (view.current !== null ? `≈${view.current}/100 para ti` : style?.current != null ? `≈${style.current}/100 por estilo` : masterReference ? 'Ficha de sabor incompleta' : 'Afinidad por calcular');
  const stock = wine.status === 'collection' && wine.quantity != null ? `${wine.quantity} ${wine.quantity === 1 ? 'botella' : 'botellas'}` : null;
  // 134: the label used to be only "Ver <name>", so VoiceOver skipped vintage, verdict and stock.
  const rowLabel = `Ver ${[wine.name, wine.producer, wine.vintage, verdict, stock].filter(Boolean).join(', ')}`;
  // 134: the sheet showed only a catalogue photo; a wine with its own photo opened with none.
  const sheetPhoto = wine.image_url ? null : ownPhoto || (resolved?.key === identityKey ? resolved.url : null);
  return <>
    <button ref={rowRef} type="button" className="flex min-h-36 w-full min-w-0 items-center gap-4 border-b border-stone-200 py-4 text-left" aria-label={rowLabel} onClick={() => setOpen(true)} data-testid="native-cellar-item98">
      <NativeWinePhoto98 src={wine.image_url || ownPhoto} ownedCapture name={wine.name} identity={{ name: wine.name, producer: wine.producer, vintage: wine.vintage }} resolveMissing={!ownPhoto && (resolveImage || open || visible)} onResolved={url => setResolved({ key: identityKey, url })} className="h-[112px] w-[80px] border border-stone-200" />
      <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold leading-6 text-stone-950">{wine.name}</span><span className="mt-1 block break-words text-xs leading-5 text-stone-500">{[wine.producer, wine.vintage].filter(Boolean).join(' · ')}</span>
        <span className={`mt-2 flex items-center gap-1 text-sm font-semibold ${wine.rating === 'not_for_me' ? 'text-stone-700' : wine.rating === 'love' || (displayScore ?? -1) >= 70 ? 'text-emerald-800' : 'text-stone-600'}`}>{wine.rating === 'love' && <ThumbsUp className="h-4 w-4" aria-hidden="true" />}{wine.rating === 'not_for_me' && <ThumbsDown className="h-4 w-4" aria-hidden="true" />}{verdict}</span>
        {stock && <span className="mt-1 block text-xs text-stone-500">{stock}</span>}
      </span><ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
    </button>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-white text-stone-950">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2"><Dialog.Title className="min-w-0 break-words text-base font-semibold">Tu vino</Dialog.Title><Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Cerrar vino"><X className="h-5 w-5" /></Dialog.Close></div>
      <Dialog.Description className="sr-only">Ficha, afinidad y valoración de {wine.name}.</Dialog.Description>
      <div className="min-h-0 overflow-y-auto pb-[calc(1rem+var(--matchrim-safe-bottom))] [&>.relative]:border-0 [&>.relative]:shadow-none">
        {masterReference && <div className="min-w-0 space-y-2 border-b border-stone-200 px-4 py-3" data-testid="cellar-master-reference260">
          <p className="text-sm font-semibold">Referencia encontrada en Winerim</p>
          <p className="text-sm leading-6 text-stone-700">Conservamos la referencia del catálogo. Faltan datos de sabor respaldados para calcular tu afinidad; guardar el vino no los completa.</p>
          {masterReference.public_url && <a href={masterReference.public_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-950"><BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" />Ficha original de Winerim</a>}
        </div>}
        {reference && <div className="border-b border-stone-200 px-4 py-3">
          <a href={reference.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
            className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-950" data-testid="cellar-public-reference107">
            <BookOpen className="h-5 w-5 shrink-0" aria-hidden="true" />Ficha original de Winerim
          </a>
          {reference.catalogue_vintage === null && <p className="text-xs leading-5 text-stone-600">Referencia sin añada. No confirma los datos sensoriales de tu botella.</p>}
        </div>}
        {sheetPhoto && <NativeWinePhoto98 src={sheetPhoto} name={wine.name} className="mx-auto mt-[12px] h-[144px] w-[88px]" />}
        {children}
        <NativeWineNote139 wineId={wine.id} initial={wine.personal_note} />
      </div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
};
