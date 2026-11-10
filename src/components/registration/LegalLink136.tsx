import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import Terms from '@/pages/Terms';
import PrivacyPolicy from '@/pages/PrivacyPolicy';

// 136: inside the iOS app a target="_blank" link to /terms or /privacy did nothing, so the person could not
// read what they were accepting. On iOS the document opens in a sheet over the form (the form keeps its data);
// on the web the original new-tab link is unchanged.
export const LegalLink136 = ({ doc, className, children }: { doc: 'terms' | 'privacy'; className?: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(doc);
  if (!Capacitor.isNativePlatform()) {
    return <a href={doc === 'terms' ? '/terms' : '/privacy'} target="_blank" rel="noreferrer" className={className}>{children}</a>;
  }
  const title = shown === 'terms' ? 'Términos de uso' : 'Política de privacidad';
  return <>
    <button type="button" className={className} onClick={event => { event.preventDefault(); event.stopPropagation(); setShown(doc); setOpen(true); }}>{children}</button>
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed inset-0 z-50 mx-auto flex w-full max-w-xl flex-col bg-stone-50 px-4 pb-[calc(1rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]">
          <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
            <Dialog.Title className="min-w-0 text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label={`Cerrar ${title.toLowerCase()}`}><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Léelo y vuelve al registro; lo que has escrito se conserva.</Dialog.Description>
          <div className="min-h-0 flex-1 overflow-y-auto">{shown === 'terms' ? <Terms embedded onOpenPrivacy={() => setShown('privacy')} /> : <PrivacyPolicy embedded />}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>;
};
