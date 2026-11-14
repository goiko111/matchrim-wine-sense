import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ChevronDown, MapPin, Meh, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { readCellarPublicReference107 } from '@/utils/cellarPublicReference107';
import { cellarReferenceStyleView110 } from '@/utils/cellarReferenceStyle110';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { cellarAffinityView, type CellarAffinityWine } from '@/utils/bodegaAffinity';
import type { ScanProfileSnapshot } from '@/utils/scanProfile';
import { useOwnWinePhoto133 } from '@/utils/ownWinePhoto133';
import { NativeWineNote139 } from '@/components/NativeWineNote139';
import { shownScore145 } from '@/utils/consumerAffinity95';
import { WhyLines144 } from '@/components/WineSheet142';
import { card150, ScorePill150 } from '@/components/Relief150';
import { NativeWinerimFacts140 } from '@/components/NativeWinerimFacts140';
import { estimateListing139, storeAffinity139 } from '@/utils/storeListing139';
import type { StoreAttributes138 } from '@/utils/storeEstimate138';
import { guessWineType154, rememberedWineType154, rememberWineType154 } from '@/utils/wineTypeGuess154';
import { safeWineImageUrl98 } from '@/utils/wineImage98';

// 141: the pieces of the iOS sheet that need the page's handlers (rating, favourite, stock, delete). The sheet
// decides their order; the page only supplies them.
export interface NativeCellarSheet141 { verified: ReactNode; rate: ReactNode; extra?: ReactNode; more: ReactNode }

// 141: one store match per wine identity per session (photo + flavour data for the row's estimate). Only matches
// are kept: a miss may be a network failure, and the store search underneath already remembers its own answers.
type StoreHit141 = { photo: string | null; attributes: StoreAttributes138; type?: string | null };
const storeHits141 = new Map<string, StoreHit141>();

// 143: the saved-wine sheet and the list speak the visual language of the new wine sheet (WineSheet142): same
// cards, same faces, same green from 65, and the same four answers to «¿me gustará?» for a verified score.
// 150: the cards lift off the page with a shadow instead of a hairline.
const card143 = card150;
const rated143 = { love: ['Te encantó', ThumbsUp, 'bg-emerald-100 text-emerald-800', 'bg-emerald-50 text-emerald-900'], ok: ['Te pareció correcto', Meh, 'bg-white text-stone-700', 'bg-stone-100 text-stone-800'],
  not_for_me: ['No te gustó', ThumbsDown, 'bg-white text-stone-700', 'bg-stone-100 text-stone-700'] } as const;
const title143 = (score: number) => score >= 80 ? 'Muy de tu estilo' : score >= 65 ? 'Probablemente te guste' : score >= 45 ? 'Puede que sí, puede que no' : 'No es tu estilo';

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
  // 145: the same number as the scan and the search sheet (a tannin of 0 does not count; see buildConsumerAffinity).
  const displayScore = (view?.current != null ? shownScore145(snapshot?.profile, view.attributes, view.current) : null) ?? style?.current ?? null;
  // 143: the affinity history is folded so the sheet stays short, but it starts open while «Guardar afinidad de
  // hoy» is pending (nobody would find that button folded) and does not fold itself again once it is saved.
  const affinityUnsaved = view?.current != null && !view.initial;
  const [affinityOpen, setAffinityOpen] = useState(affinityUnsaved);
  useEffect(() => { if (affinityUnsaved) setAffinityOpen(true); }, [affinityUnsaved]);
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
      const hit = match?.kind === 'exact' ? { photo: safeWineImageUrl98(match.estimate.row.photo), attributes: match.estimate.attributes, type: match.estimate.row.type } : null;
      if (hit) { storeHits141.set(identityKey, hit); rememberWineType154(identityKey, hit.type); }
      setStore({ key: identityKey, hit });
    }, () => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsStore, identityKey]);
  if (!native) return <>{children}</>;
  const reference = readCellarPublicReference107(wine);
  const storeHit = store?.key === identityKey ? store.hit : null;
  const storeSettled = !canAskStore || store?.key === identityKey;
  // 143: the estimate keeps its reasons (one sentence per trait) for the sheet; it is still only displayed.
  const estimated = !wine.rating && displayScore === null && storeHit ? storeAffinity139(snapshot?.profile, storeHit.attributes) : null;
  const ready = estimated?.state === 'ready' ? estimated : null;
  const estimate = ready?.score ?? null;
  const rated = wine.rating === 'love' || wine.rating === 'ok' || wine.rating === 'not_for_me' ? rated143[wine.rating] : null;
  // 141: no verdict text at all when there is nothing to say ("Afinidad por calcular" told the person nothing).
  const verdict = rated?.[0] || (view?.current != null ? `≈${view.current}/100 para ti` : style?.current != null ? `≈${style.current}/100 por estilo` : estimate !== null ? `≈${estimate}/100 estimado` : null);
  const score = displayScore ?? estimate;
  const stock = wine.status === 'collection' && wine.quantity != null ? `${wine.quantity} ${wine.quantity === 1 ? 'botella' : 'botellas'}` : null;
  // 134: the label used to be only "Ver <name>", so VoiceOver skipped vintage, verdict and stock.
  const rowLabel = `Ver ${[wine.name, wine.producer, wine.vintage, verdict, stock].filter(Boolean).join(', ')}`;
  // 141: own photo first, then Winerim's store photo; the small verified Library is asked only as a last resort
  // and only with the sheet open (it was one more request per row while scrolling).
  const photo = wine.image_url || ownPhoto || storeHit?.photo || (resolved?.key === identityKey ? resolved.url : null);
  const identity = { name: wine.name, producer: wine.producer, vintage: wine.vintage };
  const RatedIcon = rated?.[1];
  return <>
    {/* 143: each wine is a card (bottle on a soft tile, winery, name, vintage · region, verdict chip) instead of a ruled row. */}
    <button ref={rowRef} type="button" className={`flex w-full min-w-0 items-center gap-3 p-3 text-left ${card143}`} aria-label={rowLabel} onClick={() => setOpen(true)} data-testid="native-cellar-item98">
      <NativeWinePhoto98 src={photo} ownedCapture name={wine.name} identity={identity} resolveMissing={!photo && open && storeSettled} onResolved={url => setResolved({ key: identityKey, url })} type={storeHit?.type ?? rememberedWineType154(identityKey) ?? guessWineType154(wine.name, (wine as { grape_varieties?: string[] | null }).grape_varieties)} className="h-[104px] w-[72px] !rounded-xl !bg-stone-100" />
      <span className="min-w-0 flex-1">{wine.producer && <span className="block break-words text-[11px] font-semibold uppercase tracking-wide leading-5 text-stone-500">{wine.producer}</span>}
        <span className="block break-words text-base font-semibold leading-6 text-stone-950">{wine.name}</span>
        {(wine.vintage || wine.region) && <span className="block break-words text-xs leading-5 text-stone-500">{[wine.vintage, wine.region].filter(Boolean).join(' · ')}</span>}
        {(rated || score !== null || stock) && <span className="mt-2 flex flex-wrap items-center gap-2">
          {rated && RatedIcon ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${rated[3]}`}><RatedIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{rated[0]}</span>
            : score !== null && <ScorePill150 score={score} />}
          {stock && <span className="text-xs text-stone-500">{stock}</span>}
        </span>}
      </span>
    </button>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" /><Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[94dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white text-stone-950">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2"><Dialog.Title className="min-w-0 break-words text-base font-semibold">Tu vino</Dialog.Title><Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label="Cerrar vino"><X className="h-5 w-5" /></Dialog.Close></div>
      <Dialog.Description className="sr-only">Ficha, afinidad y valoración de {wine.name}.</Dialog.Description>
      {/* 141: the sheet repeated the web card (affinity "por calcular", chips, five buttons, Winerim data on top).
          It now reads like the other wine sheets: bottle and name, verdict, your rating, your note, Winerim data,
          and the rest folded under "Más opciones". The web card (`children`) is no longer shown on iOS. */}
      <div className="min-h-0 overflow-y-auto bg-stone-50 pb-[calc(1rem+var(--matchrim-safe-bottom))]" data-testid="native-cellar-sheet141">
        {/* 143: same opening as the new wine sheet: a big bottle and, beside it, the answer. The person's own
            rating wins; then the verified score; then the store estimate. */}
        <header className={`grid items-center gap-2 bg-gradient-to-b from-stone-200 to-stone-50 px-4 pb-4 pt-6 ${photo ? 'grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
          {photo && <NativeWinePhoto98 src={photo} ownedCapture name={wine.name} className="mx-auto h-[260px] w-[130px] !bg-transparent" />}
          <div className="min-w-0 text-center" data-testid="native-cellar-verdict141">
            {rated && RatedIcon ? <><span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${rated[2]}`}><RatedIcon className="h-8 w-8" aria-hidden="true" /></span>
              <p className="mt-3 text-lg font-semibold leading-6" role="status">{rated[0]}</p><p className="mt-1 text-xs text-stone-600">Tu valoración</p></>
              : score !== null ? <><p className={`text-5xl font-bold tabular-nums leading-none ${score >= 65 ? 'text-emerald-800' : 'text-stone-800'}`} aria-label={`Afinidad orientativa: ${score} de 100`}>{score}<span className="text-lg font-semibold text-stone-500">/100</span></p>
                <p className="mt-2 text-lg font-semibold leading-6">{ready ? ready.title : title143(score)}</p>
                <p className="mt-1 text-xs text-stone-600">{ready ? 'estimación para tu paladar' : view?.current != null ? 'para tu paladar' : 'por estilo'}</p></>
                : storeSettled && <p className="text-sm leading-6 text-stone-600">Aún no tenemos datos de este vino para decirte cuánto encaja contigo.</p>}
          </div>
        </header>
        <div className="space-y-4 px-4 pt-4">
          <div className="min-w-0">
            {wine.producer && <p className="text-sm text-stone-600 [overflow-wrap:anywhere]">{wine.producer}</p>}
            <h3 className="text-2xl font-bold leading-8 [overflow-wrap:anywhere]">{wine.name}</h3>
            {wine.vintage && <p className="mt-1 inline-block rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">{wine.vintage}</p>}
            {stock && <p className="mt-2 text-sm text-stone-600">{stock}</p>}
            {wine.consumption_place && <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-stone-500"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{wine.consumption_place}</span></p>}
            {sheet?.extra && <div className="mt-2">{sheet?.extra}</div>}
          </div>
          {/* 151: an unrated wine asks for its rating in the one dark block of the sheet (the request went unnoticed among white cards). */}
          <div className={wine.rating ? `${card143} p-4` : 'rounded-2xl bg-red-950 p-4 shadow-[0_10px_22px_-12px_rgba(69,10,10,.7)] [&_p]:!text-white [&_p_span]:!text-white/80'} data-testid="native-cellar-rate141" data-ask151={wine.rating ? undefined : ''}>{sheet?.rate}</div>
          <div className={`${card143} [&>section]:border-0`}><NativeWineNote139 wineId={wine.id} initial={wine.personal_note} /></div>
          {/* 143: the estimate's reasons come from the store match the row already has: no second lookup, nothing saved. */}
          {ready && <section className={`${card143} px-4 py-2`} aria-label="Por qué" data-testid="native-cellar-why143">
            <WhyLines144 dimensions={ready.dimensions} note="Estimación con los datos de Winerim. Compara el estilo del vino con tus gustos; no es una nota de calidad." />
          </section>}
          {displayScore !== null && <details open={affinityOpen} onToggle={event => setAffinityOpen(event.currentTarget.open)} className={`group min-w-0 px-4 ${card143} [&_[data-testid=cellar-wine-affinity]]:border-0 [&_[data-testid=cellar-wine-affinity]]:pt-0 [&_[data-testid=native-affinity-summary]]:border-0 [&_[data-testid=native-affinity-summary]]:py-0`} data-testid="native-cellar-affinity143">
            <summary aria-label="Ver cómo ha cambiado tu afinidad" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-stone-800"><span aria-hidden="true">Ver cómo ha cambiado tu afinidad</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            {sheet?.verified}{reference?.catalogue_vintage === null && <p className="pb-3 text-xs leading-5 text-stone-600">Referencia sin añada. No confirma los datos sensoriales de tu botella.</p>}
          </details>}
          {/* 140: the Winerim sheet is shown here, inside the app; the link that opened Safari is gone. */}
          <div className="empty:hidden" data-testid="cellar-winerim-facts140"><NativeWinerimFacts140 identity={identity} part="facts" profile={snapshot?.profile ?? null} /></div>
          <details className={`group min-w-0 px-4 ${card143}`} data-testid="native-cellar-more141">
            <summary aria-label="Más opciones" className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-semibold text-stone-800"><span aria-hidden="true">Más opciones</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
            {sheet?.more}
          </details>
        </div>
      </div>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
};
