import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { stashSignedOutWineDraft134 } from '@/utils/nativeWineDraft98';
import type { Json } from '@/integrations/supabase/types';

export interface QuickSaveWine141 { name: string; producer?: string | null; vintage?: string | number | null; region?: string | null;
  country?: string | null; grapes?: string[]; photo?: string | null; storeId?: number | null; storeSlug?: string | null;
  /** 156: a wine Winerim does not have, kept with what its label says. */
  source?: 'label' }

// 141: saving a wine found by search opened the ten-field «Añadir vino» form («No encuentro coincidencias claras ·
// Nombre confirmado»). A wine that comes from Winerim already has its name, winery, zone and photo: one tap saves it
// to «Por probar». The store's flavour data is not stored and the wine does not train the profile until it is rated.
export const NativeQuickSave141 = ({ wine }: { wine: QuickSaveWine141 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const save = async () => {
    if (!user) { stashSignedOutWineDraft134({ name: wine.name, producer: wine.producer, vintage: wine.vintage }); navigate(buildAuthRedirectPath('/my-wines/add')); return; }
    setState('saving');
    const vintage = /^(19|20)\d{2}$/.test(String(wine.vintage ?? '')) ? Number(wine.vintage) : null;
    const { error } = await supabase.from('user_wines').insert([{ user_id: user.id, name: wine.name.slice(0, 200), producer: wine.producer?.slice(0, 160) || null, vintage,
      region: wine.region || null, country: wine.country || null, grape_varieties: wine.grapes?.length ? wine.grapes.slice(0, 12) : null,
      image_url: wine.photo && /^https:\/\/app\.winerim\.com\//.test(wine.photo) ? wine.photo : null, status: 'wishlist', quantity: null,
      matchrim_affinity: null, sensory_attributes: null, use_for_profile_training: false,
      place_details: { source: 'winerim_store', store_id: wine.storeId ?? null, store_slug: wine.storeSlug ?? null } as Json }]);
    setState(error ? 'error' : 'saved');
  };
  if (state === 'saved') return <div className="mt-4 rounded-md bg-emerald-50 px-4 py-3" role="status" data-testid="quick-saved141">
    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><Check className="h-5 w-5 shrink-0" aria-hidden="true" />Guardado en Por probar</p>
    <button type="button" className="mt-1 min-h-11 text-sm font-semibold text-red-900 underline underline-offset-2" onClick={() => navigate('/my-wines/wishlist')}>Ver mis vinos</button>
  </div>;
  return <div className="mt-4">
    <button type="button" disabled={state === 'saving'} onClick={() => void save()} data-testid="quick-save141"
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-red-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70">
      {state === 'saving' ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Bookmark className="h-5 w-5" aria-hidden="true" />}Guardar en Por probar
    </button>
    {state === 'error' && <p role="alert" className="mt-2 text-sm text-red-800">No se ha podido guardar. Comprueba la conexión e inténtalo de nuevo.</p>}
  </div>;
};
