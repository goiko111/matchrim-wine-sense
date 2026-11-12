import { useEffect, useState } from 'react';
import { readPageLines143 } from '@/utils/nativeOcrLines143';
import { quickMenuLines145, type QuickMenuLine145 } from '@/utils/quickMenu145';
import { estimateListing139, storeAffinity139, type ListingMatch139 } from '@/utils/storeListing139';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';

const dataUrl = (file: File) => new Promise<string | null>(resolve => { const reader = new FileReader();
  reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null); reader.onerror = () => resolve(null); reader.readAsDataURL(file); });

// 145: while the server reads the list (about forty seconds), the wines the phone can already read are shown with
// their Winerim estimate as each one answers. A preview only: the finished list replaces it, nothing is saved, and
// the photo is read on the phone (the same reader that places the numbers on the photo).
export const MenuQuickPreview145 = ({ file, profile }: { file: File | null | undefined; profile: MatchrimProfileLike | null }) => {
  const [lines, setLines] = useState<QuickMenuLine145[]>([]);
  const [matches, setMatches] = useState<Record<number, ListingMatch139 | null>>({});
  useEffect(() => {
    setLines([]); setMatches({});
    if (!file || !file.type.startsWith('image/')) return;
    let live = true; const controller = new AbortController();
    void (async () => {
      const image = await dataUrl(file); if (!live || !image) return;
      const read = await readPageLines143(image); if (!live || !read) return;
      const found = quickMenuLines145(read.lines); if (found.length < 3) return;
      setLines(found);
      found.forEach((line, index) => { void estimateListing139({ name: line.text }, controller.signal)
        .then(match => { if (live) setMatches(previous => ({ ...previous, [index]: match })); }, () => undefined); });
    })();
    return () => { live = false; controller.abort(); };
  }, [file]);
  const range = (match: ListingMatch139 | null | undefined): [number, number] | null => {
    if (match?.kind !== 'range' || !profile) return null;
    const scores = match.options.flatMap(option => { const result = storeAffinity139(profile, option.attributes); return result.state === 'ready' ? [result.score] : []; });
    return scores.length ? [Math.min(...scores), Math.max(...scores)] : null;
  };
  if (!lines.length) return null;
  return <section className="min-w-0 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left" aria-label="Vista rápida de la carta" data-testid="menu-quick-preview145">
    <h3 className="text-base font-semibold text-stone-950">Vista rápida</h3>
    <p className="mt-1 text-sm leading-5 text-stone-600">Lo que tu iPhone ya lee. La lista completa llega en unos segundos.</p>
    <ul className="mt-2 divide-y divide-stone-100">{lines.map((line, index) => { const match = matches[index];
      const result = match?.kind === 'exact' && profile ? storeAffinity139(profile, match.estimate.attributes) : null;
      const score = result?.state === 'ready' ? result.score : null;
      return <li key={`${index}-${line.text}`} className="flex min-h-11 items-center gap-3 py-2">
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-5 text-stone-950 [overflow-wrap:anywhere]">{line.text}</span>
          {line.price !== null && <span className="block text-xs text-stone-500">{line.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>}</span>
        {score !== null ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${score >= 65 ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-800'}`} aria-label={`Estimación: ${score} de 100`}>≈{score}</span>
          : match === undefined ? <span className="h-2 w-8 shrink-0 animate-pulse rounded-full bg-stone-200" aria-label="Buscando" />
            // 146: a dash on thirteen of nineteen lines looked broken. A winery with several wines shows its range; nothing found shows nothing.
            : range(match) ? <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-stone-600" aria-label={`Entre ${range(match)![0]} y ${range(match)![1]} de 100, según el vino`}>≈{range(match)![0] === range(match)![1] ? range(match)![0] : `${range(match)![0]}–${range(match)![1]}`}</span> : null}
      </li>; })}</ul>
  </section>;
};
