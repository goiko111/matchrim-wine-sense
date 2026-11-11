import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Check, Home, Loader2, ThumbsDown, ThumbsUp, Smile } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { stashSignedOutWineDraft134 } from '@/utils/nativeWineDraft98';
import type { Json } from '@/integrations/supabase/types';
import type { QuickSaveWine141 } from '@/components/NativeQuickSave141';

type Place = 'wishlist' | 'tasted' | 'collection';
const places: Array<[Place, typeof Bookmark, string]> = [['wishlist', Bookmark, 'Quiero probarlo'], ['tasted', Check, 'Ya lo he probado'], ['collection', Home, 'Lo tengo en casa']];
const saved: Record<Place, string> = { wishlist: 'Guardado en Por probar', tasted: 'Guardado en Probados', collection: 'Guardado en tu bodega' };

// 142: a searched or scanned wine is not always one «to try»: the person may have drunk it already or have it at home.
// One row of three choices saves it where it belongs; «Ya lo he probado» asks how it was in the same place.
// The store's flavour data is never stored, and a wine saved here does not train the profile.
export const NativeSaveChoice142 = ({ wine }: { wine: QuickSaveWine141 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<{ phase: 'idle' | 'rating' | 'saving' | 'error' } | { phase: 'saved'; place: Place }>({ phase: 'idle' });
  const save = async (place: Place, rating: 'love' | 'ok' | 'not_for_me' | null = null) => {
    if (!user) { stashSignedOutWineDraft134({ name: wine.name, producer: wine.producer, vintage: wine.vintage }); navigate(buildAuthRedirectPath('/my-wines/add')); return; }
    setState({ phase: 'saving' });
    const vintage = /^(19|20)\d{2}$/.test(String(wine.vintage ?? '')) ? Number(wine.vintage) : null;
    const { error } = await supabase.from('user_wines').insert([{ user_id: user.id, name: wine.name.slice(0, 200), producer: wine.producer?.slice(0, 160) || null, vintage,
      region: wine.region || null, country: wine.country || null, grape_varieties: wine.grapes?.length ? wine.grapes.slice(0, 12) : null,
      image_url: wine.photo && /^https:\/\/app\.winerim\.com\//.test(wine.photo) ? wine.photo : null, status: place, quantity: place === 'collection' ? 1 : null, rating,
      matchrim_affinity: null, sensory_attributes: null, use_for_profile_training: false,
      place_details: { source: 'winerim_store', store_id: wine.storeId ?? null, store_slug: wine.storeSlug ?? null } as Json }]);
    setState(error ? { phase: 'error' } : { phase: 'saved', place });
  };
  if (state.phase === 'saved') return <div className="rounded-2xl bg-emerald-50 px-4 py-3" role="status" data-testid="save-done142">
    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><Check className="h-5 w-5 shrink-0" aria-hidden="true" />{saved[state.place]}</p>
    <button type="button" className="min-h-11 text-sm font-semibold text-red-900 underline underline-offset-2" onClick={() => navigate(state.place === 'collection' ? '/my-wines' : `/my-wines/${state.place}`)}>Ver mis vinos</button>
  </div>;
  if (state.phase === 'rating') return <div className="rounded-2xl border border-stone-200 bg-white p-4" data-testid="save-rating142">
    <p className="text-base font-semibold">¿Qué te pareció?</p>
    <div className="mt-3 grid grid-cols-3 gap-2">{([['love', ThumbsUp, 'Me encantó'], ['ok', Smile, 'Correcto'], ['not_for_me', ThumbsDown, 'No me gustó']] as const).map(([rating, Icon, label]) =>
      <button key={rating} type="button" className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-stone-300 bg-white px-1 text-xs font-semibold text-stone-900 active:bg-stone-50" onClick={() => void save('tasted', rating)}>
        <Icon className="h-5 w-5" aria-hidden="true" />{label}</button>)}</div>
    <button type="button" className="mt-1 min-h-11 text-sm text-stone-600 underline underline-offset-2" onClick={() => void save('tasted')}>Guardar sin valorar</button>
  </div>;
  return <div data-testid="save-choice142">
    <div className="grid grid-cols-3 gap-2">{places.map(([place, Icon, label], index) =>
      <button key={place} type="button" disabled={state.phase === 'saving'} data-testid={`save-${place}142`}
        className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-xl px-1 text-center text-xs font-semibold leading-4 disabled:opacity-60 ${index === 0 ? 'bg-red-900 text-white' : 'border border-stone-300 bg-white text-stone-900'}`}
        onClick={() => place === 'tasted' ? setState({ phase: 'rating' }) : void save(place)}>
        {state.phase === 'saving' && index === 0 ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}{label}</button>)}</div>
    {state.phase === 'error' && <p role="alert" className="mt-2 text-sm text-red-800">No se ha podido guardar. Comprueba la conexión e inténtalo de nuevo.</p>}
  </div>;
};
