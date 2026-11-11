import { useEffect, useState } from 'react';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { estimateListing139 } from '@/utils/storeListing139';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import { formatCountryName, formatWineType } from '@/utils/wineFormatters';

const grapes = (row: PublicGlobalRow103) => [...new Set((row.grapes ?? []).flat(2).flatMap(grape => {
  const name = typeof grape === 'string' ? grape : grape && typeof grape === 'object' ? (grape as { name?: unknown }).name : null;
  return typeof name === 'string' && name.trim() ? [name.trim()] : [];
}))];

/** The Winerim data of a store row as a short definition list (type, zone, grapes, vintage). */
export const WinerimFactsList140 = ({ row, vintage }: { row: PublicGlobalRow103; vintage?: string | number | null }) => {
  const facts = [['Tipo', row.type ? formatWineType(row.type) : ''], ['Zona', [row.region, row.country ? formatCountryName(row.country) : ''].filter(Boolean).join(' · ')],
    ['Uvas', grapes(row).join(', ')], ['Añada', vintage ? String(vintage) : row.vintage ? String(row.vintage) : '']].filter(([, value]) => value);
  if (!facts.length) return null;
  return <section className="min-w-0" aria-label="Ficha de Winerim" data-testid="winerim-facts140">
    <h5 className="text-sm font-semibold text-stone-950">Ficha de Winerim</h5>
    <dl className="mt-1 divide-y divide-stone-100 text-sm">{facts.map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-2"><dt className="text-stone-500">{label}</dt><dd className="min-w-0 text-right [overflow-wrap:anywhere]">{value}</dd></div>)}</dl>
  </section>;
};

// 140: the scanned-bottle sheet sent people to Safari («Ver ficha original Winerim») and showed no bottle. It now
// shows, inside the app, the same photo and Winerim data as the search sheet. Renders nothing when the store has no
// such wine. `part` lets the caller place the photo at the top and the data further down from one lookup each.
export const NativeWinerimFacts140 = ({ identity, part }: { identity: { name: string; producer?: string | null; vintage?: string | number | null }; part: 'photo' | 'facts' }) => {
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
  return part === 'photo' ? (row.photo ? <NativeWinePhoto98 src={row.photo} name={identity.name} className="mx-auto h-[200px] w-[110px]" /> : null)
    : <WinerimFactsList140 row={row} vintage={identity.vintage} />;
};
