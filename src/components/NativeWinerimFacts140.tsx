import { useEffect, useState } from 'react';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { estimateListing139 } from '@/utils/storeListing139';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { WinerimRich142 } from '@/components/WineSheet142';

/** 142: the Winerim data of a store row is now the rich block (facts with icons, flavour bars, pairings, notes). */
export const WinerimFactsList140 = ({ row, vintage, profile }: { row: PublicGlobalRow103; vintage?: string | number | null; profile?: MatchrimProfileLike | null }) =>
  <WinerimRich142 row={row} vintage={vintage} profile={profile} />;

// 140: the scanned-bottle sheet sent people to Safari («Ver ficha original Winerim») and showed no bottle. It now
// shows, inside the app, the same photo and Winerim data as the search sheet. Renders nothing when the store has no
// such wine. `part` lets the caller place the photo at the top and the data further down from one lookup each.
export const NativeWinerimFacts140 = ({ identity, part, profile }: { identity: { name: string; producer?: string | null; vintage?: string | number | null }; part: 'photo' | 'facts' | 'link'; profile?: MatchrimProfileLike | null }) => {
  const key = JSON.stringify([identity.name, identity.producer]);
  const [found, setFound] = useState<{ key: string; row: PublicGlobalRow103 } | null>(null);
  useEffect(() => {
    if (!identity.name?.trim() || !identity.producer?.trim()) return;
    const controller = new AbortController();
    void estimateListing139({ name: identity.name, producer: identity.producer, vintage: identity.vintage }, controller.signal).then(match => {
      if (!controller.signal.aborted && match?.kind === 'exact') setFound({ key, row: match.estimate.row });
    }, () => undefined);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const row = found?.key === key ? found.row : null;
  if (!row) return null;
  // 142: the framed Winerim web page is gone (it let people wander off to the whole Winerim store); the data is shown here instead.
  if (part === 'link') return null;
  return part === 'photo' ? (row.photo ? <NativeWinePhoto98 src={row.photo} name={identity.name} className="mx-auto h-[200px] w-[110px]" /> : null)
    : <WinerimFactsList140 row={row} vintage={identity.vintage} profile={profile} />;
};
