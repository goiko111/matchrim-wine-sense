import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { usableStoreSensory138 } from '@/utils/storeEstimate138';
import { NativeSaveChoice142 } from '@/components/NativeSaveChoice142';
import { WineSheet142 } from '@/components/WineSheet142';
import { ArrowLeft } from 'lucide-react';

interface Props {
  wine: PublicGlobalRow103 | null;
  profile?: MatchrimProfileLike | null;
  onClose: () => void;
  /** 140: when the sheet was opened from the search, closing it returns there. */
  backLabel?: string;
}

// 138: picking a search result opened the ten-field «Añadir vino» form. Whoever searches a wine wants to know
// whether they will like it. 139: the result is a row of Winerim's public store, so the sheet opens at once with
// its photo, its Winerim data and the affinity (a labelled estimate: store data is not a verified sheet).
export const NativeSearchWine138 = ({ wine, profile, onClose, backLabel }: Props) => {
  // 142: a related wine opens in the same sheet; «back» returns to the one before it.
  const [trail, setTrail] = useState<PublicGlobalRow103[]>([]);
  useEffect(() => { setTrail([]); }, [wine]);
  const shown = trail.at(-1) ?? wine;
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => { body.current?.scrollTo(0, 0); }, [shown]);
  const name = shown ? [shown.name, shown.subname].filter(Boolean).join(' ') : '';
  return <Dialog.Root open={Boolean(wine)} onOpenChange={open => { if (!open) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
      <Dialog.Content aria-describedby="search-wine138-description" data-testid="native-search-wine138"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[96dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-stone-50 text-stone-950">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-2">
          {trail.length ? <button type="button" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-900" onClick={() => setTrail(previous => previous.slice(0, -1))}><ArrowLeft className="h-5 w-5" aria-hidden="true" />Volver al vino anterior</button>
            : backLabel ? <Dialog.Close className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-900"><ArrowLeft className="h-5 w-5" aria-hidden="true" />{backLabel}</Dialog.Close> : null}
          <Dialog.Title className={trail.length || backLabel ? 'sr-only' : 'text-base font-semibold'}>El vino y tú</Dialog.Title>
          <Dialog.Close className="flex h-11 w-11 items-center justify-center" aria-label="Cerrar explicación del vino"><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
        </div>
        <div ref={body} className="min-h-0 overflow-y-auto px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))]">
          <Dialog.Description id="search-wine138-description" className="sr-only">El vino que has buscado y cómo encaja con tus gustos.</Dialog.Description>
          {shown && <div data-testid={usableStoreSensory138(shown) ? 'native-search-estimate138' : 'native-search-missing138'}>
            <WineSheet142 key={shown.id} row={shown} profile={profile} onRelated={next => setTrail(previous => [...previous, next])}
              actions={<NativeSaveChoice142 key={shown.id} wine={{ name, producer: shown.winery, vintage: shown.vintage, region: shown.region, country: shown.country, photo: shown.photo, storeId: shown.id, storeSlug: shown.slugname }} />} />
          </div>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
};
