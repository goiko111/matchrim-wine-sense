import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { NativeSaveChoice142 } from '@/components/NativeSaveChoice142';
import type { LocalOCRResult106 } from '@/utils/nativeOCR106';
import { labelName156, labelYear156 } from '@/utils/labelName156';

// 156: a wine Winerim does not have («La Nine», Minervois) left the person with a list of other wines and a button
// that opened the mail app. A customer needs a way out that stays in the app: keep the wine with what its label
// says. It is saved to their wines with no flavour data and no affinity, and says so; nothing is invented.
export const KeepUnlisted156 = ({ reading, open = false, onSaved }: { reading?: LocalOCRResult106; open?: boolean; onSaved?: (place: 'wishlist' | 'tasted' | 'collection') => void }) => {
  const [name, setName] = useState(() => labelName156(reading?.lines));
  const [producer, setProducer] = useState('');
  const [vintage, setVintage] = useState(() => labelYear156(reading?.lines));
  const field = 'mt-1 min-h-11 bg-white';
  return <details open={open} className="group min-w-0 rounded-2xl border border-stone-300 bg-white" data-testid="keep-unlisted156">
    <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-stone-950 [&::-webkit-details-marker]:hidden">
      <span>¿No está tu vino? Guárdalo igualmente</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
    <div className="space-y-3 border-t border-stone-200 px-4 pb-4 pt-3">
      <p className="text-sm leading-6 text-stone-700">Winerim aún no tiene este vino. Lo guardamos en tus vinos con lo que dice la etiqueta; cuando tenga ficha podremos decirte cuánto encaja contigo.</p>
      <label className="block text-sm font-medium text-stone-800">Nombre del vino
        <Input value={name} maxLength={80} onChange={event => setName(event.target.value)} className={field} autoComplete="off" data-testid="keep-name156" /></label>
      <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
        <label className="block text-sm font-medium text-stone-800">Bodega (opcional)
          <Input value={producer} maxLength={80} onChange={event => setProducer(event.target.value)} className={field} autoComplete="off" /></label>
        <label className="block text-sm font-medium text-stone-800">Añada
          <Input value={vintage} maxLength={4} inputMode="numeric" onChange={event => setVintage(event.target.value.replace(/\D/g, ''))} className={field} autoComplete="off" /></label>
      </div>
      {name.trim().length >= 2 ? <NativeSaveChoice142 wine={{ name: name.trim(), producer: producer.trim() || null, vintage: vintage || null, source: 'label' }} onSaved={onSaved} />
        : <p className="text-sm text-stone-600">Escribe el nombre para poder guardarlo.</p>}
    </div>
  </details>;
};
