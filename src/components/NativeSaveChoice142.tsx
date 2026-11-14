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
const panel151 = 'rounded-2xl bg-red-950 p-4 shadow-[0_10px_22px_-12px_rgba(69,10,10,.7)] [html.matchrim-accessibility-text_&]:p-3';
// 156: with the largest text three columns left a few letters per line (seen in native QA inside the candidates sheet): one column there.
const grid156 = 'mt-3 grid grid-cols-3 gap-2 [html.matchrim-accessibility-text_&]:grid-cols-1';
const saved: Record<Place, string> = { wishlist: 'Guardado en Por probar', tasted: 'Guardado en Probados', collection: 'Guardado en tu bodega' };

/** Saves a wine known from Winerim's store to the person's wines. Never stores flavour data; never trains the profile. */
export const saveStoreWine142 = async (userId: string, wine: QuickSaveWine141, place: Place, rating: 'love' | 'ok' | 'not_for_me' | null = null) => {
  const vintage = /^(19|20)\d{2}$/.test(String(wine.vintage ?? '')) ? Number(wine.vintage) : null;
  // 145: the same wine was saved twice (once «Por probar» from the scan, again «Probado» from Home's thumb). A wine
  // the person already has moves to the new place (and takes the rating) instead of being added again.
  const same = (value: string | null | undefined, other: string | null | undefined) => (value ?? '').trim().toLowerCase() === (other ?? '').trim().toLowerCase();
  const { data: mine } = await supabase.from('user_wines').select('id,name,producer,vintage,status,rating').eq('user_id', userId).eq('name', wine.name.slice(0, 200)).limit(20);
  const had = (mine ?? []).find(row => same(row.producer, wine.producer?.slice(0, 160)) && (row.vintage == null || vintage == null || row.vintage === vintage));
  if (had) {
    // 146 (owner's decision): a wine can be tasted and at home at once. «Probados» is every wine with a rating and
    // «En bodega» every wine kept at home, so a bottle at home that is rated keeps its place and takes the rating;
    // a rated wine brought home goes to the cellar and keeps its rating. «Por probar» never takes a wine back.
    const change = place === 'wishlist' ? null
      : place === 'tasted' ? had.status === 'collection' ? (rating ? { rating } : null) : { status: 'tasted' as const, ...(rating ? { rating } : {}) }
        : { status: 'collection' as const, quantity: 1 };
    if (!change) return true;
    const { error } = await supabase.from('user_wines').update(change).eq('id', had.id).eq('user_id', userId);
    return !error;
  }
  const { error } = await supabase.from('user_wines').insert([{ user_id: userId, name: wine.name.slice(0, 200), producer: wine.producer?.slice(0, 160) || null, vintage,
    region: wine.region || null, country: wine.country || null, grape_varieties: wine.grapes?.length ? wine.grapes.slice(0, 12) : null,
    image_url: wine.photo && /^https:\/\/app\.winerim\.com\//.test(wine.photo) ? wine.photo : null, status: place, quantity: place === 'collection' ? 1 : null, rating,
    matchrim_affinity: null, sensory_attributes: null, use_for_profile_training: false,
    place_details: (wine.source === 'label' ? { source: 'label_only' } : { source: 'winerim_store', store_id: wine.storeId ?? null, store_slug: wine.storeSlug ?? null }) as Json }]);
  return !error;
};

// 142: a searched or scanned wine is not always one «to try»: the person may have drunk it already or have it at home.
// One row of three choices saves it where it belongs; «Ya lo he probado» asks how it was in the same place.
// The store's flavour data is never stored, and a wine saved here does not train the profile.
export const NativeSaveChoice142 = ({ wine, onWishlist, onSaved }: { wine: QuickSaveWine141;
  /** 145 (scanner): «Quiero probarlo» keeps the scanner's own save, which stores the linked sheet with the wine. */
  onWishlist?: () => void;
  /** 145 (scanner): told once a wine is saved here, so the scan can close instead of offering to save it again. */
  onSaved?: (place: Place) => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<{ phase: 'idle' | 'rating' | 'saving' | 'error' } | { phase: 'saved'; place: Place }>({ phase: 'idle' });
  // 144: the first choice was filled in wine red and read as already selected; the three are now equal, and the one tapped shows the wait.
  const [busy144, setBusy144] = useState<Place | null>(null);
  const save = async (place: Place, rating: 'love' | 'ok' | 'not_for_me' | null = null) => {
    if (!user) { stashSignedOutWineDraft134({ name: wine.name, producer: wine.producer, vintage: wine.vintage }); navigate(buildAuthRedirectPath('/my-wines/add')); return; }
    setBusy144(place); setState({ phase: 'saving' });
    const ok = await saveStoreWine142(user.id, wine, place, rating);
    setState(ok ? { phase: 'saved', place } : { phase: 'error' });
    if (ok) onSaved?.(place);
  };
  if (state.phase === 'saved') return <div className="rounded-2xl bg-emerald-50 px-4 py-3" role="status" data-testid="save-done142">
    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><Check className="h-5 w-5 shrink-0" aria-hidden="true" />{saved[state.place]}</p>
    <button type="button" className="min-h-11 text-sm font-semibold text-red-900 underline underline-offset-2" onClick={() => navigate(state.place === 'collection' ? '/my-wines' : `/my-wines/${state.place}`)}>Ver mis vinos</button>
  </div>;
  // 151: the three answers were three identical white boxes; each now carries its own colour (green, amber, grey).
  if (state.phase === 'rating') return <div className={panel151} data-testid="save-rating142">
    <p className="text-lg font-bold leading-6 text-white">¿Qué te pareció?</p>
    <div className={grid156}>{([['love', ThumbsUp, 'Me encantó', 'bg-emerald-700 text-white'], ['ok', Smile, 'Correcto', 'bg-amber-100 text-amber-900'], ['not_for_me', ThumbsDown, 'No me gustó', 'bg-stone-200 text-stone-700']] as const).map(([rating, Icon, label, tone]) =>
      <button key={rating} type="button" className="flex min-h-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-xl bg-white px-1 text-xs font-semibold text-stone-950 active:bg-stone-100 [html.matchrim-accessibility-text_&]:min-h-14 [html.matchrim-accessibility-text_&]:px-2 [html.matchrim-accessibility-text_&]:py-3 [html.matchrim-accessibility-text_&]:[overflow-wrap:anywhere]" onClick={() => void save('tasted', rating)}>
        <span className={`flex h-10 w-10 items-center justify-center rounded-full [html.matchrim-accessibility-text_&]:hidden ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></span>{label}</button>)}</div>
    <button type="button" className="mt-1 min-h-11 text-sm text-white/85 underline underline-offset-2" onClick={() => void save('tasted')}>Guardar sin valorar</button>
  </div>;
  // 151: «el siguiente paso me pasa desapercibido: todo es del mismo color y no veo los botones» (13-nov). The three
  // choices were white boxes on a white sheet. They now sit in the one dark block of the sheet, under a title that
  // says what to do; the three stay equal (144: a single filled one read as already chosen).
  return <div className={panel151} data-testid="save-choice142" data-panel151>
    <p className="text-lg font-bold leading-6 text-white">¿Qué haces con este vino?</p>
    <p className="mt-0.5 text-sm leading-5 text-white/80">Guárdalo. Si ya lo has probado, nos dices qué te pareció.</p>
    <div className={grid156}>{places.map(([place, Icon, label]) =>
      <button key={place} type="button" disabled={state.phase === 'saving'} data-testid={`save-${place}142`}
        className="flex min-h-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-xl bg-white px-1 text-center text-xs font-semibold leading-4 text-stone-950 disabled:opacity-60 active:bg-stone-100 [html.matchrim-accessibility-text_&]:min-h-14 [html.matchrim-accessibility-text_&]:px-2 [html.matchrim-accessibility-text_&]:py-3 [html.matchrim-accessibility-text_&]:[overflow-wrap:anywhere]"
        onClick={() => place === 'tasted' ? setState({ phase: 'rating' }) : place === 'wishlist' && onWishlist && user ? onWishlist() : void save(place)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/10 text-red-900 [html.matchrim-accessibility-text_&]:hidden">{state.phase === 'saving' && busy144 === place ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}</span>{label}</button>)}</div>
    {state.phase === 'error' && <p role="alert" className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-red-800">No se ha podido guardar. Comprueba la conexión e inténtalo de nuevo.</p>}
  </div>;
};
