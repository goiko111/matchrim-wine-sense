import { useEffect, useState } from 'react';
import { WhyLines144 } from '@/components/WineSheet142';
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
  // 143: the scanned-bottle sheet shows the verdict the way the new wine sheet does: the number, the answer, and
  // why in one sentence per trait.
  return <div className="min-w-0" data-testid="native-store-estimate139">
    <div className="rounded-2xl bg-gradient-to-b from-stone-200 to-stone-50 px-4 py-5 text-center">
      <p className={`text-5xl font-bold tabular-nums leading-none ${result.score >= 65 ? 'text-emerald-800' : 'text-stone-800'}`} aria-label={`Afinidad orientativa: ${result.score} de 100`}>{result.score}<span className="text-lg font-semibold text-stone-500">/100</span></p>
      <p className="mt-2 text-lg font-semibold leading-6 text-stone-950">{result.title}</p><p className="mt-1 text-xs text-stone-600">para tu paladar</p>
    </div>
    <section className="mt-4 rounded-2xl border border-stone-200 bg-white px-4 py-2" aria-label="Por qué">
      <WhyLines144 dimensions={result.dimensions} note={`Estimación con los datos de la tienda de Winerim${estimate!.row.vintage && String(estimate!.row.vintage) !== String(identity.vintage ?? '') ? ` (añada ${estimate!.row.vintage})` : ''}. Este vino aún no tiene ficha verificada, así que tómalo como una orientación.`} />
    </section>
  </div>;
};
