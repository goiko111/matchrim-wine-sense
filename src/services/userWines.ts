import { supabase } from '@/integrations/supabase/client';
import { wineIdentityKey } from '@/utils/userWineIdentity';

type UserWineInsert = { user_id: string; name: string; status?: string; quantity?: number | null; is_favorite?: boolean; [key: string]: unknown };

export type SaveUserWineResult = { id: string | null; merged: boolean; row: any };

// Insert a wine unless the same wine already exists in the same list (status) of
// the user; then it is updated instead: collection stock is added, other lists
// keep the existing row (favorite is propagated). See userWineIdentity.ts.
export const saveUserWine = async (wine: UserWineInsert): Promise<SaveUserWineResult> => {
  const key = wineIdentityKey(wine as never);
  if (key) {
    const { data: rows, error: lookupError } = await supabase
      .from('user_wines')
      .select('*')
      .eq('user_id', wine.user_id)
      .eq('status', wine.status ?? 'collection')
      .order('created_at', { ascending: true });
    if (lookupError) throw lookupError;

    const existing = (rows || []).find((row) => wineIdentityKey(row as never) === key);
    if (existing) {
      const patch: Record<string, unknown> = {};
      if (wine.status === 'collection' || (existing as any).status === 'collection') {
        patch.quantity = ((existing as any).quantity ?? 1) + (wine.quantity ?? 1);
      }
      if (wine.is_favorite) patch.is_favorite = true;
      if (Object.keys(patch).length > 0) {
        const { data: updated, error } = await supabase
          .from('user_wines')
          .update(patch as never)
          .eq('id', (existing as any).id)
          .eq('user_id', wine.user_id)
          .select()
          .single();
        if (error) throw error;
        return { id: (updated as any).id, merged: true, row: updated };
      }
      return { id: (existing as any).id, merged: true, row: existing };
    }
  }

  const { data, error } = await supabase.from('user_wines').insert([wine as never]).select().single();
  if (error) throw error;
  return { id: (data as any)?.id ?? null, merged: false, row: data };
};
