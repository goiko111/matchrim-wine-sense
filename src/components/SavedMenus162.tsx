import { useState } from 'react';
import { BookmarkPlus, Check, MapPin, ScrollText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlaceField162 } from '@/components/PlaceField162';
import { googleMapUrl163, placeMapUrl162, type Place162 } from '@/utils/places162';
import { listSavedMenus162, removeSavedMenu162, saveMenu162, type SavedMenu162 } from '@/utils/savedMenus162';

// 163 (owner: «me estás usando Maps de Apple, ¿y qué pasa con Google?»): both maps, the person chooses.
export const MapLinks163 = ({ place }: { place: Place162 }) => <span className="flex shrink-0 flex-wrap items-center gap-x-3 text-sm font-semibold" data-testid="map-links163">
  <a href={placeMapUrl162(place)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center underline underline-offset-4">Apple Maps</a>
  <a href={googleMapUrl163(place)} target="_blank" rel="noreferrer" className="flex min-h-11 items-center underline underline-offset-4">Google Maps</a>
</span>;

// 162: keep a wine list that was read, with its restaurant, on this phone; open it again; find it on the map.
export const SaveMenu162 = ({ ownerId, wines, restaurantName, place: known }: { ownerId: string | null; wines: readonly Record<string, unknown>[]; restaurantName?: string | null; place?: Place162 | null }) => {
  const [open, setOpen] = useState(false), [typed, setTyped] = useState(restaurantName ?? ''), [picked, setPicked] = useState<Place162 | null>(known ?? null);
  const [saved, setSaved] = useState<SavedMenu162 | null>(null), [failed, setFailed] = useState(false);
  if (saved) return <p role="status" className="flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-50 px-3 text-sm font-medium text-emerald-900" data-testid="menu-saved162">
    <Check className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 flex-1 [overflow-wrap:anywhere]">Carta de {saved.place.name} guardada. La tienes en Mis vinos › Cartas.</span>
    <MapLinks163 place={saved.place} /></p>;
  // 163 (owner: «este de guardar esta carta se tiene que ver mucho más»): a full-width card, not a small outline button.
  if (!open) return <button type="button" className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-red-900 px-4 py-3 text-left text-white shadow-sm active:bg-red-950" onClick={() => setOpen(true)} data-testid="menu-save162">
    <BookmarkPlus className="h-6 w-6 shrink-0" aria-hidden="true" />
    <span className="min-w-0 flex-1 text-base font-semibold leading-5">{known ? `Guardar los cambios en la carta de ${known.name}` : 'Guardar esta carta'}
      <span className="block text-sm font-normal leading-5 text-red-100">{known ? 'Añade otra foto para ponerla al día.' : 'Con su restaurante, para volver a ella sin fotografiarla.'}</span></span>
  </button>;
  const place: Place162 | null = picked ?? (typed.trim().length >= 2 ? { name: typed.trim(), address: '', lat: null, lng: null } : null);
  return <section className="w-full min-w-0 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-stone-200" aria-labelledby="menu-save162-title" data-testid="menu-save-panel162">
    <h4 id="menu-save162-title" className="text-base font-semibold text-stone-950">¿De qué restaurante es esta carta?</h4>
    <p className="text-sm leading-5 text-stone-600">La guardamos en este iPhone con sus {wines.length} vinos, para volver a ella sin fotografiarla.</p>
    <PlaceField162 id="menu-place162" placeholder="Nombre y ciudad" typed={typed} onTyped={setTyped} picked={picked} onPicked={setPicked} />
    {failed && <p role="alert" className="text-sm text-red-800">No se ha podido guardar: el iPhone no tiene espacio para la app.</p>}
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="ghost" className="min-h-12 rounded-full" onClick={() => setOpen(false)}>Ahora no</Button>
      <Button type="button" disabled={!place} className="min-h-12 rounded-full bg-red-900 hover:bg-red-950" data-testid="menu-save-confirm162"
        onClick={() => { if (!place) return; const done = saveMenu162(ownerId, place, wines); if (done) setSaved(done); else setFailed(true); }}>Guardar</Button>
    </div>
  </section>;
};

export const SavedMenus162 = ({ ownerId, onOpen, title = 'Cartas guardadas' }: { ownerId: string | null; onOpen: (menu: SavedMenu162) => void; title?: string }) => {
  const [menus, setMenus] = useState(() => listSavedMenus162(ownerId)), [asking, setAsking] = useState<string | null>(null);
  if (!menus.length) return null;
  return <section className="min-w-0 space-y-2 text-left" aria-labelledby="saved-menus162-title" data-testid="saved-menus162">
    <h3 id="saved-menus162-title" className="text-base font-semibold text-stone-950">{title}</h3>
    <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">
      {menus.map(menu => <li key={menu.id} className="min-w-0 px-3 py-2">
        <button type="button" onClick={() => onOpen(menu)} className="flex min-h-12 w-full items-center gap-3 text-left" data-testid="saved-menu-open162">
          <ScrollText className="h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-base font-semibold leading-5 text-stone-950 [overflow-wrap:anywhere]">{menu.place.name}
            <span className="block text-sm font-normal leading-5 text-stone-600">{menu.wines.length} vinos · {new Date(menu.at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{menu.place.address ? ` · ${menu.place.address}` : ''}</span></span>
        </button>
        <div className="flex items-center gap-4 pl-8">
          <MapPin className="h-4 w-4 shrink-0 text-red-900" aria-hidden="true" /><MapLinks163 place={menu.place} />
          {asking === menu.id ? <button type="button" className="min-h-11 text-sm font-semibold text-red-800" onClick={() => { removeSavedMenu162(ownerId, menu.id); setMenus(listSavedMenus162(ownerId)); setAsking(null); }}>Sí, quitarla</button>
            : <button type="button" className="flex min-h-11 items-center gap-1 text-sm text-stone-600" onClick={() => setAsking(menu.id)}><Trash2 className="h-4 w-4" aria-hidden="true" />Quitar</button>}
        </div>
      </li>)}
    </ul>
  </section>;
};
