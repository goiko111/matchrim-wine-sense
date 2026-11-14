import { useEffect, useState, type ReactNode } from 'react';
import { ScorePill150 } from '@/components/Relief150';
import { estimateListing139, storeAffinity139 } from '@/utils/storeListing139';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';

// 156: with several bottles in one photo each row said «Pendiente · Afinidad pendiente · Sin ficha de Winerim todavía»,
// and yet opening the wine showed 79/100: the row never asked the store. It asks now, with the very estimate the
// wine's own sheet shows, and keeps the old words only while it waits or when the store has nothing.
export const RowEstimate156 = ({ identity, profile, children }: { identity: { name?: string | null; producer?: string | null; vintage?: string | number | null };
  profile: MatchrimProfileLike | null; children: ReactNode }) => {
  const key = JSON.stringify([identity.name, identity.producer, identity.vintage]);
  const [found, setFound] = useState<{ key: string; score: number; title: string } | null>(null);
  useEffect(() => {
    if (!profile || !identity.name?.trim() || !identity.producer?.trim()) return;
    const controller = new AbortController();
    void estimateListing139({ name: identity.name, producer: identity.producer, vintage: identity.vintage }, controller.signal).then(match => {
      if (controller.signal.aborted || match?.kind !== 'exact') return;
      const result = storeAffinity139(profile, match.estimate.attributes);
      if (result.state === 'ready') setFound({ key, score: result.score, title: result.title });
    }, () => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, Boolean(profile)]);
  return found?.key === key
    ? <span className="flex flex-wrap items-center gap-2" data-testid="row-estimate156"><ScorePill150 score={found.score} estimate /><span className="text-sm font-semibold text-stone-800">{found.title}</span></span>
    : <>{children}</>;
};
