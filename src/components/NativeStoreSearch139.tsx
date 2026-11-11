import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import { searchStore139 } from '@/utils/storeListing139';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';

interface Props {
  onSelect: (row: PublicGlobalRow103) => void;
  onManualEntry: (name: string) => void;
}

const key = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** One entry per wine (name + winery): the most recent vintage with a photo wins. */
export const groupStoreRows139 = (rows: readonly PublicGlobalRow103[]) => {
  const wines = new Map<string, PublicGlobalRow103>();
  for (const row of rows) {
    const id = `${key(row.name)}|${key(row.subname ?? '')}|${key(row.winery)}`, previous = wines.get(id);
    if (!previous || (!previous.photo && row.photo) || (Boolean(previous.photo) === Boolean(row.photo) && Number(row.vintage ?? 0) > Number(previous.vintage ?? 0))) wines.set(id, row);
  }
  return [...wines.values()];
};

// 139: the Home search used a small catalogue of our own (no Ramón Bilbao, no Mar de Frades, three odd rows for
// Viña Ardanza, the brand as winery). It now searches Winerim's public store: the bottle photo, the real winery
// and the region are on each result, so the person can tell which wine they are picking.
export const NativeStoreSearch139 = ({ onSelect, onManualEntry }: Props) => {
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ query: string; phase: 'idle' | 'loading' | 'ready' | 'error'; wines: PublicGlobalRow103[] }>({ query: '', phase: 'idle', wines: [] });
  const input = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();
  // One tap to type: the keyboard opens with the dialog.
  useEffect(() => { const timer = setTimeout(() => input.current?.focus(), 150); return () => clearTimeout(timer); }, []);
  useEffect(() => {
    if (trimmed.length < 2) { setState({ query: trimmed, phase: 'idle', wines: [] }); return; }
    const controller = new AbortController();
    setState(previous => ({ query: trimmed, phase: 'loading', wines: previous.wines }));
    const timer = setTimeout(() => {
      searchStore139(trimmed, controller.signal).then(rows => { if (!controller.signal.aborted) setState({ query: trimmed, phase: 'ready', wines: groupStoreRows139(rows).slice(0, 20) }); },
        () => { if (!controller.signal.aborted) setState({ query: trimmed, phase: 'error', wines: [] }); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [trimmed, retry]);
  const current = state.query === trimmed ? state : null;
  return <div className="min-w-0 space-y-2" data-testid="native-store-search139">
    <div className="relative min-w-0">
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-500" />
      <input ref={input} type="search" aria-label="Buscar vino o bodega" maxLength={120} value={query} placeholder="Nombre del vino o de la bodega"
        autoComplete="off" autoCorrect="off" enterKeyHint="search" aria-busy={current?.phase === 'loading'}
        onChange={event => setQuery(event.target.value.slice(0, 120))}
        className="min-h-12 w-full min-w-0 rounded-md border border-stone-300 bg-white pl-10 pr-3 text-base text-stone-950 outline-none focus:border-red-900" />
    </div>
    {current?.phase === 'loading' && <p role="status" className="flex min-h-11 items-center gap-2 text-sm text-stone-600"><Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin" />Buscando en Winerim…</p>}
    {current?.phase === 'error' && <div className="space-y-2">
      <p role="alert" className="text-sm">No hemos podido buscar. Comprueba la conexión.</p>
      <button type="button" className="flex min-h-11 items-center gap-2 text-sm font-semibold text-red-900" onClick={() => setRetry(value => value + 1)}><RefreshCw aria-hidden="true" className="h-4 w-4" />Reintentar búsqueda</button>
    </div>}
    {current?.phase === 'ready' && current.wines.length === 0 && <p role="status" className="text-sm text-stone-600">No lo encontramos en Winerim. Prueba con menos palabras o con el nombre de la bodega.</p>}
    {current && current.wines.length > 0 && current.phase !== 'error' && <ul aria-label="Resultados de vinos" className="min-w-0 divide-y divide-stone-200">
      {current.wines.map(wine => <li key={wine.id} className="min-w-0">
        <button type="button" onClick={() => onSelect(wine)} className="grid min-h-20 w-full min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 py-2 text-left active:bg-stone-50">
          <NativeWinePhoto98 src={wine.photo} name={wine.name} className="h-16 w-12" />
          <span className="block min-w-0 [overflow-wrap:anywhere]">
            <span className="block text-base font-semibold leading-6">{[wine.name, wine.subname].filter(Boolean).join(' ')}</span>
            <span className="block text-sm leading-5 text-stone-600">{wine.winery}</span>
            <span className="block text-xs leading-5 text-stone-500">{[wine.type, wine.region].filter(Boolean).join(' · ')}</span>
          </span>
        </button>
      </li>)}
    </ul>}
    {(current?.phase === 'ready' || current?.phase === 'error') && current.query.length >= 2 && <button type="button" className="flex min-h-11 w-full items-center justify-center rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800" onClick={() => onManualEntry(current.query)}>
      {current.wines.length === 0 ? `Añadir «${current.query}» a mano` : '¿No está en la lista? Añadirlo a mano'}
    </button>}
  </div>;
};
