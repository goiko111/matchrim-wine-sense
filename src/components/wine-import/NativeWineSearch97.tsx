import { useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { invokeEdgeFunction } from '@/utils/invokeEdgeFunction';
import { resolveMatchrimEdgeFunctionName } from '@/utils/matchrimEdgeRouting';

export interface NativeWine {
  id: string;
  name: string;
  producer: string | null;
  region: string | null;
  vintage: number | null;
  grape_varieties: string[] | null;
  tipo?: string | null;
  estilo: string;
}

interface NativeWineSearch97Props {
  onSelectWine: (wine: NativeWine) => void;
}

type SearchState = {
  query: string;
  owner: string;
  phase: 'idle' | 'loading' | 'ready' | 'error';
  wines: NativeWine[];
};

const searchFunction = resolveMatchrimEdgeFunctionName('search-wines', '75');
const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
const catalogRows = (response: unknown): NativeWine[] => {
  if (!response || typeof response !== 'object' || !Array.isArray((response as { wines?: unknown }).wines)) {
    throw new Error('Invalid catalogue response');
  }
  const result: NativeWine[] = [];
  const ids = new Set<string>();
  for (const value of (response as { wines: unknown[] }).wines) {
    if (!value || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const id = text(row.id) ?? (Number.isSafeInteger(row.id) && (row.id as number) >= 0 ? String(row.id) : null);
    const name = text(row.name);
    if (!id || !name || ids.has(id)) continue;
    ids.add(id);
    result.push({
      id, name, producer: text(row.producer), region: text(row.region),
      vintage: Number.isSafeInteger(row.vintage) && (row.vintage as number) >= 1000 && (row.vintage as number) <= 2999 ? row.vintage as number : null,
      grape_varieties: Array.isArray(row.grape_varieties) ? row.grape_varieties.filter((grape): grape is string => typeof grape === 'string') : null,
      tipo: text(row.tipo), estilo: text(row.estilo) ?? '',
    });
    if (result.length === 10) break;
  }
  return result;
};

export const NativeWineSearch97 = ({ onSelectWine }: NativeWineSearch97Props) => {
  const { user, loading: authLoading } = useAuth();
  const owner = user ? `user:${user.id}` : 'anonymous';
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<SearchState>({ query: '', owner, phase: 'idle', wines: [] });
  const trimmed = query.trim();
  const current = useRef({ query: trimmed, owner, authLoading });
  const request = useRef<AbortController | null>(null);
  current.current = { query: trimmed, owner, authLoading };

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    const active = () => !controller.signal.aborted && current.current.query === trimmed
      && current.current.owner === owner && !current.current.authLoading;
    if (authLoading || trimmed.length < 2) {
      setState({ query: trimmed, owner, phase: 'idle', wines: [] });
      return () => controller.abort();
    }
    setState({ query: trimmed, owner, phase: 'loading', wines: [] });
    const timer = setTimeout(async () => {
      if (!active()) return;
      try {
        const response = await invokeEdgeFunction<unknown>(searchFunction, {
          query: trimmed, limit: 10, catalogOnly: true,
        }, controller.signal);
        if (!active()) return;
        const wines = catalogRows(response);
        setState({ query: trimmed, owner, phase: 'ready', wines });
      } catch {
        if (active()) setState({ query: trimmed, owner, phase: 'error', wines: [] });
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [trimmed, owner, authLoading, retry]);

  const visible = !authLoading && state.query === trimmed && state.owner === owner ? state : null;
  const select = (wine: NativeWine) => {
    if (current.current.authLoading || current.current.query !== state.query || current.current.owner !== state.owner
      || state.phase !== 'ready' || !state.wines.includes(wine)) return;
    request.current?.abort();
    current.current = { query: '', owner, authLoading };
    setQuery('');
    setState({ query: '', owner, phase: 'idle', wines: [] });
    onSelectWine(wine);
  };

  return (
    <div className="min-w-0 space-y-2" data-testid="native-wine-search97">
      <div className="relative min-w-0">
        <Search aria-hidden="true" focusable="false" className="pointer-events-none absolute left-[12px] top-1/2 h-[20px] w-[20px] -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label="Buscar vino o bodega" maxLength={240} value={query}
          placeholder="Busca vino o bodega..." autoComplete="off" enterKeyHint="search"
          aria-busy={visible?.phase === 'loading'}
          onChange={event => {
            const next = event.target.value.slice(0, 240);
            if (next.trim() !== current.current.query) request.current?.abort();
            current.current = { query: next.trim(), owner, authLoading };
            setQuery(next);
          }} className="h-auto min-h-[44px] w-full min-w-0 pl-[40px] pr-[12px]" />
      </div>
      {visible?.phase === 'loading' && <p role="status" className="flex min-h-[44px] items-center gap-2 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" focusable="false" className="h-[20px] w-[20px] shrink-0 animate-spin" /> Buscando vinos...
      </p>}
      {visible?.phase === 'error' && <div className="min-w-0 space-y-2">
        <p role="alert" className="break-words text-sm">No se pudo buscar en el catálogo.</p>
        <Button type="button" variant="outline" className="h-auto min-h-[44px] max-w-full whitespace-normal" onClick={() => setRetry(value => value + 1)}>
          <RefreshCw aria-hidden="true" focusable="false" className="mr-2 h-[20px] w-[20px] shrink-0" /> Reintentar búsqueda
        </Button>
      </div>}
      {visible?.phase === 'ready' && visible.wines.length === 0 && <p role="status" className="break-words text-sm text-muted-foreground">No se encontraron vinos.</p>}
      {visible?.phase === 'ready' && visible.wines.length > 0 && <ul aria-label="Resultados de vinos" className="min-w-0 divide-y divide-border">
        {visible.wines.map(wine => <li key={wine.id} className="min-w-0">
          <button type="button" onClick={() => select(wine)} className="block min-h-[44px] w-full min-w-0 break-words px-[4px] py-[12px] text-left [overflow-wrap:anywhere] hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            <span className="block font-medium">{wine.name}</span>
            {wine.producer && <span className="block text-sm text-muted-foreground">{wine.producer}</span>}
            {(wine.vintage || wine.region) && <span className="block text-sm text-muted-foreground">{[wine.vintage, wine.region].filter(Boolean).join(' · ')}</span>}
          </button>
        </li>)}
      </ul>}
    </div>
  );
};
