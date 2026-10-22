import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { loadMatchrimScanProfile } from './matchrimScanProfile';
import { nativeVerdictsSnapshot159, type NativeVerdicts159 } from '@/utils/nativeRescanVerdict159';

export const loadNativeSavedVerdicts159 = async (ownerId: string | null, signal: AbortSignal): Promise<NativeVerdicts159> => {
  const unavailable = () => nativeVerdictsSnapshot159(ownerId, null, null);
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
  if (!Capacitor.isNativePlatform() || !ownerId) return unavailable();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 5000);
  try {
    const pending = supabase.from('user_wines')
      .select('id, user_id, name, producer, vintage, region, country, place_details, rating, sensory_attributes', { count: 'exact' })
      .eq('user_id', ownerId).not('rating', 'is', null).limit(1000).abortSignal(controller.signal);
    const result = await new Promise<Awaited<typeof pending>>((resolve, reject) => {
      const stopped = () => reject(new DOMException('Cancelled', 'AbortError'));
      if (controller.signal.aborted) { stopped(); return; }
      controller.signal.addEventListener('abort', stopped, { once: true });
      void Promise.resolve(pending).then(value => {
        controller.signal.removeEventListener('abort', stopped); resolve(value);
      }, error => { controller.signal.removeEventListener('abort', stopped); reject(error); });
    });
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return result.error ? unavailable() : nativeVerdictsSnapshot159(ownerId, result.data, result.count);
  } catch {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    return unavailable();
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', abort);
  }
};

export const loadNativeScanContext159 = async (ownerId: string | null, signal: AbortSignal) => {
  const [profile, verdicts] = await Promise.all([
    loadMatchrimScanProfile(ownerId, signal), loadNativeSavedVerdicts159(ownerId, signal),
  ]);
  return { profile, verdicts };
};
