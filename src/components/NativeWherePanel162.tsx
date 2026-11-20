import { useState } from 'react';
import { Building2, Check, Globe, Home, MapPin, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { placeLabel162, type Place162 } from '@/utils/places162';
import { PlaceField162 } from '@/components/PlaceField162';

// 162 (owner's video of the 159: «¿Dónde lo tomaste?» — «hay que rehacerla entera»: the restaurant by its real name
// and place, and the price). One question at a time, big targets, everything optional except the kind of place:
// 1) where, 2) which place (searched on Apple's maps as it is typed; what is typed is kept if nothing is picked),
// 3) what it cost, 4) when. The answer has the same shape the old form returned.
type Mode = 'collection' | 'wishlist' | 'tasted';
type Kind = 'store' | 'online' | 'restaurant' | 'home' | 'other';
export type WhereData162 = { type: 'purchase' | 'seen' | 'consumed'; place_name?: string; price?: number; purchase_date?: string; location_type?: Kind; place_id?: string };
const TITLE: Record<Mode, string> = { collection: '¿Dónde lo compraste?', wishlist: '¿Dónde lo viste?', tasted: '¿Dónde lo tomaste?' };
const KINDS: Record<Mode, ReadonlyArray<readonly [Kind, string, typeof Home]>> = {
  tasted: [['restaurant', 'En un restaurante o bar', Building2], ['home', 'En casa', Home], ['other', 'En otro sitio', MapPin]],
  collection: [['store', 'En una tienda', ShoppingBag], ['online', 'Por internet', Globe], ['restaurant', 'En un restaurante', Building2]],
  wishlist: [['restaurant', 'En un restaurante', Building2], ['store', 'En una tienda', ShoppingBag], ['online', 'En internet', Globe]],
};
const today = () => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().split('T')[0]; };

export const NativeWherePanel162 = ({ mode, onConfirm, onCancel }: { mode: Mode; onConfirm: (data: WhereData162) => void; onCancel: () => void }) => {
  const [kind, setKind] = useState<Kind | null>(null);
  const [typed, setTyped] = useState(''), [picked, setPicked] = useState<Place162 | null>(null);
  const [price, setPrice] = useState(''), [date, setDate] = useState(today);
  const searchable = kind === 'restaurant' || kind === 'store' || kind === 'other';
  const placeWord = kind === 'store' ? 'la tienda' : kind === 'other' ? 'el sitio' : 'el restaurante';
  const amount = Number(price.replace(',', '.'));
  const confirm = () => { if (!kind) return;
    onConfirm({ type: mode === 'collection' ? 'purchase' : mode === 'wishlist' ? 'seen' : 'consumed', location_type: kind,
      place_name: (picked ? placeLabel162(picked) : typed.trim()) || undefined,
      place_id: picked && picked.lat !== null && picked.lng !== null ? `apple:${picked.lat.toFixed(5)},${picked.lng.toFixed(5)}` : undefined,
      price: price.trim() && Number.isFinite(amount) && amount > 0 ? amount : undefined, purchase_date: date }); };
  const field = 'min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-950';
  return <section className="mx-auto w-full min-w-0 max-w-md space-y-5 px-1 text-left" data-testid="where162">
    <h2 className="pr-12 text-2xl font-bold leading-8 text-stone-950">{TITLE[mode]}</h2>
    <div className="grid gap-2" role="radiogroup" aria-label={TITLE[mode]}>
      {KINDS[mode].map(([value, label, Icon]) => <button key={value} type="button" role="radio" aria-checked={kind === value} data-testid={`where-kind162-${value}`}
        onClick={() => { setKind(value); setPicked(null); }}
        className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left text-base font-semibold ${kind === value ? 'bg-red-900 text-white' : 'bg-stone-100 text-stone-900'}`}>
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1">{label}</span>{kind === value && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}</button>)}
    </div>
    {kind && searchable && <div className="space-y-2">
      <label htmlFor="where-place162" className="block text-base font-semibold text-stone-950">¿Cómo se llama {placeWord}? <span className="font-normal text-stone-500">(opcional)</span></label>
      <PlaceField162 id="where-place162" placeholder={kind === 'store' ? 'Nombre y ciudad' : 'Nombre y ciudad, p. ej. Narru Donostia'} typed={typed} onTyped={setTyped} picked={picked} onPicked={setPicked} />
    </div>}
    {kind && <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
      <div className="min-w-0 space-y-2">
        <label htmlFor="where-price162" className="block text-base font-semibold text-stone-950">{mode === 'tasted' && kind !== 'home' ? 'Precio en carta' : 'Precio'} <span className="font-normal text-stone-500">(€)</span></label>
        <input id="where-price162" type="text" inputMode="decimal" maxLength={8} value={price} onChange={event => setPrice(event.target.value.replace(/[^\d.,]/g, ''))} placeholder="Opcional" className={field} />
      </div>
      <div className="min-w-0 space-y-2">
        <label htmlFor="where-date162" className="block text-base font-semibold text-stone-950">{mode === 'collection' ? 'Cuándo' : mode === 'tasted' ? 'Cuándo' : 'Fecha'}</label>
        <input id="where-date162" type="date" value={date} max={today()} onChange={event => setDate(event.target.value)} className={`${field} min-w-0 max-w-full appearance-none [&::-webkit-date-and-time-value]:text-left`} />
      </div>
    </div>}
    <div className="grid gap-2 pt-1">
      <Button type="button" disabled={!kind} onClick={confirm} className="min-h-12 rounded-full bg-red-900 text-base hover:bg-red-950" data-testid="where-confirm162">Guardar</Button>
      <Button type="button" variant="ghost" onClick={onCancel} className="min-h-12 rounded-full text-base">Cancelar</Button>
    </div>
  </section>;
};
