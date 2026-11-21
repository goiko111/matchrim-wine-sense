import { useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeWherePanel162, type WhereData162 } from '@/components/NativeWherePanel162';

// 163 (owner's video of the 162: «en este vino no me sale dónde lo tomaste»). The question only existed when a wine
// was typed by hand; a wine saved from a scan never asked it and the saved wine had no place to answer it. Every
// saved wine now shows where, at what price and when, and lets the person fill it in or change it.
type Mode = 'collection' | 'wishlist' | 'tasted';
const ASK: Record<Mode, string> = { tasted: '¿Dónde lo tomaste?', collection: '¿Dónde lo compraste?', wishlist: '¿Dónde lo viste?' };
const KIND: Record<string, string> = { restaurant: 'Restaurante', store: 'Tienda', online: 'Internet', home: 'En casa', other: 'Otro sitio' };
export const CellarWhere163 = ({ mode, place, kind, price, date, busy, onSave }: { mode: Mode; place: string | null; kind: string | null;
  price: number | null; date: string | null; busy?: boolean; onSave: (data: WhereData162) => Promise<boolean> }) => {
  const [open, setOpen] = useState(false);
  const day = date && !Number.isNaN(Date.parse(date)) ? new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const filled = Boolean(place || kind);
  const where = place || (kind ? KIND[kind] ?? null : null);
  return <section className="min-w-0 rounded-2xl bg-stone-50 p-3" aria-label={ASK[mode]} data-testid="cellar-where163">
    {filled ? <div className="flex min-w-0 items-start gap-3">
      <MapPin className="mt-1 h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-base font-semibold leading-6 text-stone-950 [overflow-wrap:anywhere]">{where}
        <span className="block text-sm font-normal leading-5 text-stone-600">{[typeof price === 'number' && price > 0 ? `${price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : null, day].filter(Boolean).join(' · ')}</span></p>
      <button type="button" disabled={busy} className="flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-red-900" onClick={() => setOpen(true)} data-testid="cellar-where-edit163"><Pencil className="h-4 w-4" aria-hidden="true" />Cambiar</button>
    </div> : <button type="button" disabled={busy} className="flex min-h-12 w-full items-center gap-3 text-left" onClick={() => setOpen(true)} data-testid="cellar-where-add163">
      <MapPin className="h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />
      <span className="min-w-0 flex-1 text-base font-semibold leading-5 text-stone-950">{ASK[mode]}<span className="block text-sm font-normal leading-5 text-stone-600">Apunta el sitio, el precio y el día.</span></span>
    </button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="matchrim-native-cellar-dialog left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen min-w-0 max-w-none translate-x-0 translate-y-0 grid-cols-[minmax(0,1fr)] overflow-x-hidden overflow-y-auto rounded-none pb-[calc(1.5rem+var(--matchrim-safe-bottom))] pt-[calc(1.5rem+var(--matchrim-safe-top))]">
        <DialogHeader className="sr-only"><DialogTitle>{ASK[mode]}</DialogTitle><DialogDescription>Sitio, precio y fecha de este vino.</DialogDescription></DialogHeader>
        {open && <NativeWherePanel162 mode={mode} onCancel={() => setOpen(false)} onConfirm={data => { void onSave(data).then(done => { if (done) setOpen(false); }); }} />}
      </DialogContent>
    </Dialog>
  </section>;
};
