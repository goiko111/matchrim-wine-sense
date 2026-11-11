import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, ChevronRight, MapPin, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { readCellarPublicReference107 } from '@/utils/cellarPublicReference107';
import { cellarReferenceStyleView110 } from '@/utils/cellarReferenceStyle110';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { cellarAffinityView, type CellarAffinityWine } from '@/utils/bodegaAffinity';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import { useOwnWinePhoto133 } from '@/utils/ownWinePhoto133';
import { NativeWineNote139 } from '@/components/NativeWineNote139';
import { NativeWinerimFacts140 } from '@/components/NativeWinerimFacts140';

import { NativeStoreEstimate139 } from '@/components/wine-import/NativeStoreEstimate139';
import { estimateListing139, storeScore139 } from '@/utils/storeListing139';
import type { StoreAttributes138 } from '@/utils/storeEstimate138';
import { safeWineImageUrl98 } from '@/utils/wineImage98';

// 141: the pieces of the iOS sheet that need the page's handlers (rating, favourite, stock, delete). The sheet
// decides their order; the page only supplies them.
export interface NativeCellarSheet141 { verified: ReactNode; rate: ReactNode; extra?: ReactNode; more: ReactNode }

// 141: one store match per wine identity per session (photo + flavour data for the row's estimate). Only matches
// are kept: a miss may be a network failure, and the store search underneath already remembers its own answers.
type StoreHit141 = { photo: string | null; attributes: StoreAttributes138 };
const storeHits141 = new Map<string, StoreHit141>();

interface Props {
  native: boolean;
  wine: CellarAffinityWine & { id: string; producer?: string | null; vintage?: number | null; image_url?: string | null; rating?: string | null; quantity?: number | null; status?: string; personal_note?: string | null; consumption_place?: string | null };
  snapshot: ScanProfileSnapshot | null;
  resolveImage: boolean;
  sheet?: NativeCellarSheet141;
  children: ReactNode;
}

export const NativeCellarItem98 = ({ native, wine, snapshot, resolveImage, sheet, children }: Props) => {
  const [open, setOpen] = useState(false);
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null);
  const identityKey = JSON.stringify([wine.name, wine.producer, wine.vintage]);
  // 133: the catalogue photo was looked up only for the first four wines; the rest said "Sin foto"
  // until opened. Now each row looks it up when it comes near the screen, after the own photo.
  const rowRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const near = resolveImage || visible || open;
  // 141: every row opened its own IndexedDB connection on mount, however long the list; now only rows near the screen do.
  const ownPhoto = useOwnWinePhoto133(wine.id, native && !wine.image_url && near);
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
  const view = native ? cellarAffinityView(wine, snapshot, true) : null;
  const style = native && view?.current === null ? cellarReferenceStyleView110(wine, snapshot) : null;
  const displayScore = view?.current ?? style?.current ?? null;
  // 141: a wine saved from search or scan showed "Sin foto · Afinidad por calcular" although the same wine had a
  // bottle photo and an estimate a minute earlier. The row now asks Winerim's store (same lookup as those screens)
  // when it is missing a photo or a verdict; the answer is only displayed, never saved to the wine or the profile.
  const canAskStore = native && Boolean(wine.name?.trim() && wine.producer?.trim());
  const wantsStore = canAskStore && near && (!wine.image_url || (!wine.rating && displayScore === null));
  const [store, setStore] = useState<{ key: string; hit: StoreHit141 | null } | null>(null);
  useEffect(() => {
    if (!wantsStore) return;
    const cached = storeHits141.get(identityKey);
    if (cached) { setStore({ key: identityKey, hit: cached }); return; }
    const controller = new AbortController();
    void estimateListing139({ name: wine.name, producer: wine.producer, vintage: wine.vintage }, controller.signal).then(match => {
      if (controller.signal.aborted) return;
      const hit = match?.kind === 'exact' ? { photo: safeWineImageUrl98(match.estimate.row.photo), attributes: match.estimate.attributes } : null;
      if (hit) storeHits141.set(identityKey, hit);
      setStore({ key: identityKey, hit });
    }, () => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsStore, identityKey]);
  if (!native) return <>{children}</>;
  const reference = readCellarPublicReference107(wine);
  const storeHit = store?.key === identityKey ? store.hit : null;
  const storeSettled = !canAskStore || store?.key === identityKey;
  const estimate = !wine.rating && displayScore === null && storeHit ? storeScore139(snapshot?.profile, storeHit.attributes) : null;
  const rating = wine.rating === 'love' ? 'Te gusta' : wine.rating === 'not_for_me' ? 'No es para ti' : wine.rating === 'ok' ? 'Te pareció correcto' : null;
  // 141: no verdict text at all when there is nothing to say ("Afinidad por calcular" told the person nothing).
  const verdict = rating || (view?.current != null ? `≈${view.current}/100 para ti` : style?.current != null ? `≈${style.current}/100 por estilo` : estimate !== null ? `≈${estimate}/100 estimado` : null);
  const stock = wine.status === 'collection' && wine.quantity != null ? `${wine.quantity} ${wine.quantity === 1 ? 'botella' : 'botellas'}` : null;
  // 134: the label used to be only "Ver <name>", so VoiceOver skipped vintage, verdict and stock.
  const rowLabel = `Ver ${[wine.name, wine.producer, wine.vintage, verdict, stock].filter(Boolean).join(', ')}`;
  // 141: own photo first, then Winerim's store photo; the small verified Library is asked only as a last resort
  // and only with the sheet open (it was one more request per row while scrolling).
  const photo = wine.image_url || ownPhoto || storeHit?.photo || (resolved?.key === identityKey ? resolved.url : null);
  const identity = { name: wine.name, producer: wine.producer, vintage: wine.vintage };
  const ratedTitle = wine.rating === 'love' ? 'Ya sabes que te gusta' : wine.rating === 'not_for_me' ? 'Ya sabes que no te gusta' : wine.rating === 'ok' ? 'Te pareció correcto' : null;
  return <>
    <button ref={rowRef} type="button" className="flex min-h-36 w-full min-w-0 items-center gap-4 border-b border-stone-200 py-4 text-left" aria-label={rowLabel} onClick={() => setOpen(true)} data-testid="native-cellar-item98">
      <NativeWinePhoto98 src={photo} ownedCapture name={wine.name} identity={identity} resolveMissing={!photo && open && storeSettled} onResolved={url => setResolved({ key: identityKey, url })} className="h-[112px] w-[80px] border border-stone-200" />
      <span className="min-w-0 flex-1"><span className="block break-words text-base font-semibold leading-6 text-stone-950">{wine.name}</span><span className="mt-1 block break-words text-xs leading-5 text-stone-500">{[wine.producer, wine.vintage].filter(Boolean).join(' · ')}</span>
        {verdict && <span className={`mt-2 flex items-center gap-1 text-sm font-semibold ${wine.rating === 'not_for_me' ? 'text-stone-700' : wine.rating === 'love' || (displayScore ?? estimate ?? -1) >= 70 ? 'text-emerald-800' : 'text-stone-600'}`}>{wine.rating === 'love' && <ThumbsUp className="h-4 w-4" aria-hidden="true" />}{wine.rating === 'not_for_me' && <ThumbsDown className="h-4 w-4" aria-hidden="true" />}{verdict}</span>}
        {stock && <span className="mt-1 block text-xs text-stone-500">{stock}</span>}
      </span><ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
    </button>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-lg bg-white text-stone-950">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2"><Dialog.Title className="min-w-0 break-words text-base font-semibold">Tu vino</Dialog.Title><Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Cerrar vino"><X className="h-5 w-5" /></Dialog.Close></div>
      <Dialog.Description className="sr-only">Ficha, afinidad y valoración de {wine.name}.</Dialog.Description>
      {/* 141: the sheet repeated the web card (affinity "por calcular", chips, five buttons, Winerim data on top).
          It now reads like the other wine sheets: bottle and name, verdict, your rating, your note, Winerim data,
          and the rest folded under "Más opciones". The web card (`children`) is no longer shown on iOS. */}
      <div className="min-h-0 overflow-y-auto pb-[calc(1rem+var(--matchrim-safe-bottom))]" data-testid="native-cellar-sheet141">
        <div className="flex min-w-0 items-center gap-4 border-b border-stone-200 px-4 py-4">
          {photo && <NativeWinePhoto98 src={photo} ownedCapture name={wine.name} className="h-[168px] w-[96px]" />}
          <div className="min-w-0 flex-1"><h3 className="break-words text-xl font-semibold leading-7">{wine.name}</h3>
            <p className="mt-1 break-words text-sm leading-5 text-stone-600">{[wine.producer, wine.vintage].filter(Boolean).join(' · ')}</p>
            {stock && <p className="mt-1 text-xs text-stone-500">{stock}</p>}
            {wine.consumption_place && <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-stone-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{wine.consumption_place}</span></p>}
            {sheet?.extra && <div className="mt-2">{sheet?.extra}</div>}
          </div>
        </div>
        <div className="border-b border-stone-200 px-4 py-3 [&>section]:border-0 [&>section]:py-0 [&_[data-testid=native-affinity-summary]]:border-0 [&_[data-testid=native-affinity-summary]]:py-0" data-testid="native-cellar-verdict141">
          {displayScore !== null ? <>{sheet?.verified}{reference?.catalogue_vintage === null && <p className="pt-2 text-xs leading-5 text-stone-600">Referencia sin añada. No confirma los datos sensoriales de tu botella.</p>}</>
            // 141: a rated wine keeps the person's own verdict; an estimate next to "No va" would contradict it.
            : ratedTitle ? <p className="text-sm font-semibold text-stone-950" role="status">{ratedTitle}</p>
              : <><NativeStoreEstimate139 identity={identity} profile={snapshot?.profile ?? null} />
                {storeSettled && estimate === null && <p className="text-sm leading-6 text-stone-600">Aún no tenemos datos de este vino para decirte cuánto encaja contigo.</p>}</>}
        </div>
        <div className="border-b border-stone-200 px-4 py-3" data-testid="native-cellar-rate141">{sheet?.rate}</div>
        <NativeWineNote139 wineId={wine.id} initial={wine.personal_note} />
        {/* 140: the Winerim sheet is shown here, inside the app; the link that opened Safari is gone. */}
        <div className="border-b border-stone-200 px-4 py-3 empty:hidden" data-testid="cellar-winerim-facts140"><NativeWinerimFacts140 identity={identity} part="facts" /></div>
        <details className="group min-w-0 px-4" data-testid="native-cellar-more141">
          <summary aria-label="Más opciones" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-stone-800"><span aria-hidden="true">Más opciones</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
          {sheet?.more}
        </details>
      </div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
};
