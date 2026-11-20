import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { searchPlaces162, type Place162 } from '@/utils/places162';

// 162: one field to name a place. It searches Apple's maps as the person types and lets them pick the real place
// (name and address); if nothing is picked, what was typed is what is kept.
export const PlaceField162 = ({ id, placeholder, typed, onTyped, picked, onPicked }: { id: string; placeholder: string; typed: string; onTyped: (value: string) => void;
  picked: Place162 | null; onPicked: (place: Place162 | null) => void }) => {
  const [found, setFound] = useState<Place162[]>([]), [searching, setSearching] = useState(false);
  const turn = useRef(0);
  useEffect(() => {
    const mine = ++turn.current;
    if (picked || typed.trim().length < 3) { setFound([]); setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(() => { void searchPlaces162(typed).then(places => { if (turn.current === mine) { setFound(places); setSearching(false); } }); }, 450);
    return () => clearTimeout(timer);
  }, [typed, picked]);
  if (picked) return <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3" data-testid="where-picked162">
    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" aria-hidden="true" />
    <p className="min-w-0 flex-1 text-base font-semibold leading-6 text-stone-950 [overflow-wrap:anywhere]">{picked.name}{picked.address && <span className="block text-sm font-normal text-stone-600">{picked.address}</span>}</p>
    <button type="button" className="min-h-11 shrink-0 px-2 text-sm font-semibold text-red-900 underline underline-offset-4" onClick={() => onPicked(null)}>Cambiar</button>
  </div>;
  return <>
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" aria-hidden="true" />
      <input id={id} type="text" inputMode="text" autoComplete="off" autoCorrect="off" enterKeyHint="search" maxLength={80} value={typed} onChange={event => onTyped(event.target.value)}
        placeholder={placeholder} className="min-h-12 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-3 text-base text-stone-950" />
      {searching && <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-stone-400" aria-hidden="true" />}
    </div>
    {found.length > 0 && <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200" data-testid="where-results162">
      {found.map(place => <li key={`${place.name}|${place.address}`}><button type="button" onClick={() => onPicked(place)}
        className="flex min-h-14 w-full items-start gap-3 px-3 py-2 text-left"><MapPin className="mt-1 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-base font-semibold leading-5 text-stone-950 [overflow-wrap:anywhere]">{place.name}<span className="block text-sm font-normal leading-5 text-stone-600">{place.address}</span></span></button></li>)}
    </ul>}
    {typed.trim().length >= 3 && !searching && found.length === 0 && <p className="text-sm leading-5 text-stone-600" role="status">Si no aparece en la lista, lo guardamos tal como lo has escrito.</p>}
  </>;
};
