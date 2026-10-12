import { supabase } from '@/integrations/supabase/client';
import { readStoredMatchrimProfile } from '@/utils/wineAffinityExplanation';
import { resolveScanProfile, ScanProfileReadFailure } from '@/utils/scanProfile';
import type { TrainableWine } from '@/utils/matchrimLearning';

export const loadMatchrimScanProfile = async (ownerId: string | null, signal: AbortSignal) => {
  const request = new AbortController();
  const abort = () => request.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) request.abort();
  let timedOut = false;
  const timeout = setTimeout(() => { timedOut = true; abort(); }, 5000);
  try {
    return await resolveScanProfile(
  ownerId, ownerId ? null : readStoredMatchrimProfile(), {
    base: async () => {
      try {
      const { data, error } = await supabase.from('quiz_results')
        .select('potente, acidez, dulce, tanico, afrutado').eq('user_id', ownerId!)
        .order('created_at', { ascending: false }).limit(1).abortSignal(request.signal).maybeSingle();
      if (error) throw error;
      return data;
      } catch {
        throw new ScanProfileReadFailure(timedOut ? 'timeout' : 'failed');
      }
    },
    training: async () => {
      try {
      const { data, error } = await supabase.from('user_wines')
        .select('id, rating, sensory_attributes, use_for_profile_training, created_at, updated_at')
        .eq('user_id', ownerId!).eq('use_for_profile_training', true)
        .not('rating', 'is', null).not('sensory_attributes', 'is', null).abortSignal(request.signal);
      if (error) throw error;
      return (data ?? []) as TrainableWine[];
      } catch {
        throw new ScanProfileReadFailure(timedOut ? 'timeout' : 'failed');
      }
    },
  }, signal,
    );
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener('abort', abort);
  }
};
