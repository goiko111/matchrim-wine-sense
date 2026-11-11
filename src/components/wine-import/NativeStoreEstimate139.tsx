import { useEffect, useState } from 'react';
import { NativeAffinitySummary } from '@/components/NativeAffinitySummary';
import { estimateListing139, storeAffinity139 } from '@/utils/storeListing139';
import type { StoreEstimate138 } from '@/utils/storeEstimate138';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';

interface Props {
  identity: { name: string; producer?: string | null; vintage?: number | string | null };
  profile: MatchrimProfileLike | null;
  /** The verdict score, once known (the scanner remembers it with the scanned wine). */
  onScore?: (score: number) => void;
}

// 139: a scanned bottle that Winerim knows only through its public store ended in «aún necesitamos datos de sabor
// fiables», with no verdict. The store's flavour data now backs a labelled estimate here too; the verified
// identity, the saved wine and the profile learning are untouched (this renders nothing when there is no match).
export const NativeStoreEstimate139 = ({ identity, profile, onScore }: Props) => {
  const key = JSON.stringify([identity.name, identity.producer, identity.vintage]);
  const [found, setFound] = useState<{ key: string; estimate: StoreEstimate138 } | null>(null);
  useEffect(() => {
    if (!profile || !identity.name?.trim() || !identity.producer?.trim()) return;
    const controller = new AbortController();
    void estimateListing139({ name: identity.name, producer: identity.producer, vintage: identity.vintage }, controller.signal).then(match => {
      if (!controller.signal.aborted && match?.kind === 'exact') setFound({ key, estimate: match.estimate });
    }, () => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, Boolean(profile)]);
  const estimate = found?.key === key ? found.estimate : null;
  const result = estimate ? storeAffinity139(profile, estimate.attributes) : null;
  const score = result?.state === 'ready' ? result.score : null;
  useEffect(() => { if (score !== null) onScore?.(score); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [score, key]);
  if (!result || result.state !== 'ready') return null;
  return <div className="min-w-0" data-testid="native-store-estimate139">
    <NativeAffinitySummary result={result} />
    <p className="mt-2 text-xs leading-5 text-stone-500">Estimación con los datos de la tienda de Winerim{estimate!.row.vintage && String(estimate!.row.vintage) !== String(identity.vintage ?? '') ? ` (añada ${estimate!.row.vintage})` : ''}. Este vino aún no tiene ficha verificada, así que tómalo como una orientación.</p>
  </div>;
};
