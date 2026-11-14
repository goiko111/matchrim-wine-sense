import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RatedWine157 } from '@/utils/history157';

// 157: the person's rated wines (zone, grapes, rating) for the sheet's «Lo que ya has probado». Read once per
// minute per account at most; a failure simply shows nothing.
let cache: { owner: string; at: number; rows: RatedWine157[] } | null = null;
export const useRatedWines157 = (enabled = true) => {
  const { user } = useAuth();
  const owner = user?.id ?? null;
  const [rows, setRows] = useState<RatedWine157[]>(() => owner && cache?.owner === owner ? cache.rows : []);
  useEffect(() => {
    if (!owner || !enabled) { setRows([]); return; }
    if (cache?.owner === owner && Date.now() - cache.at < 60_000) { setRows(cache.rows); return; }
    let live = true;
    void (async () => { try {
      const { data, error } = await supabase.from('user_wines').select('id,region,grape_varieties,rating').eq('user_id', owner).limit(600);
      if (error || !live) return;
      const rated = (data ?? []).filter(row => row.rating) as RatedWine157[];
      cache = { owner, at: Date.now(), rows: rated }; setRows(rated);
    } catch { /* nothing to show */ } })();
    return () => { live = false; };
  }, [owner, enabled]);
  return rows;
};
