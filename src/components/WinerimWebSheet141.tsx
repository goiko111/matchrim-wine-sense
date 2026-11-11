import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BookOpen, Loader2, X } from 'lucide-react';

/** The public Winerim page of a store wine, or null when the id or slug cannot form one. */
export const winerimStoreUrl141 = (id: unknown, slug: unknown): string | null =>
  typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && typeof slug === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,239}$/.test(slug)
    ? `https://web.winerim.com/matchrim/store/${id}/${slug}` : null;

// 141: the owner wants Winerim's own sheet — the real page, with everything Winerim has built — framed inside the
// app, not a text summary and not Safari. The page is shown in a full-screen sheet with its own close button. The
// frame may run its scripts but cannot open windows or navigate the app away.
export const WinerimWebSheet141 = ({ url, name, className = '' }: { url: string | null; name: string; className?: string }) => {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!url) return null;
  return <Dialog.Root open={open} onOpenChange={next => { setOpen(next); if (!next) setLoaded(false); }}>
    <Dialog.Trigger className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 ${className}`} data-testid="winerim-web-open141">
      <BookOpen className="h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />Ver la ficha completa de Winerim
    </Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50" />
      <Dialog.Content className="fixed inset-0 z-[60] flex flex-col bg-white pt-[var(--matchrim-safe-top)]" data-testid="winerim-web-sheet141">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2">
          <Dialog.Title className="min-w-0 truncate text-base font-semibold text-stone-950">Ficha de Winerim</Dialog.Title>
          <Dialog.Close className="flex h-11 min-w-11 items-center justify-center gap-1 text-sm font-semibold text-red-900" aria-label="Cerrar la ficha de Winerim"><X className="h-5 w-5" aria-hidden="true" />Cerrar</Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">Página de Winerim de {name}, dentro de Matchrim.</Dialog.Description>
        <div className="relative min-h-0 flex-1 bg-stone-950">
          {!loaded && <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-stone-200"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Abriendo la ficha de Winerim…</p>}
          <iframe src={url} title={`Ficha de Winerim de ${name}`} onLoad={() => setLoaded(true)} referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms" className="absolute inset-0 h-full w-full border-0" />
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
};
