import { useId, useLayoutEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Check, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { confirmWinerimCandidate95, isWinerimCandidateQuery95, searchWinerimCandidates95,
  type WinerimCandidate95, type WinerimCandidateSearchResult95 } from '@/utils/winerimCandidateSearch95';
import type { WinerimOriginalSheet } from '@/utils/winerimOriginalSheet';

interface PickerProps95 {
  initialQuery?: string;
  // The parent changes this key when the current row or manually edited identity changes.
  contextKey: string;
  onConfirmed: (sheet: WinerimOriginalSheet) => void;
}

const searchMessages = {
  empty: 'No aparecen propuestas para este nombre en la consulta. No significa que el vino no exista en Winerim.',
  refine: 'La respuesta no permite mostrar propuestas completas. Concreta el nombre o la bodega y vuelve a buscar.',
  'invalid-query': 'Escribe un nombre de entre 2 y 120 caracteres, sin enlaces.',
  unavailable: 'No se pudo consultar la Library. La identidad y la afinidad siguen pendientes.',
};
const detailMessages = {
  'identity-required': 'Esta propuesta no tiene una identidad completa. Concreta el nombre o la bodega.',
  'not-found': 'No se pudo verificar la ficha de esta propuesta. La identidad y la afinidad siguen pendientes.',
  ambiguous: 'No se pudo verificar la referencia elegida. La identidad y la afinidad siguen pendientes. Concreta el nombre, la bodega o la añada.',
  incomplete: 'La consulta de la ficha es incompleta. La identidad y la afinidad siguen pendientes.',
  unavailable: 'No se pudo consultar la ficha original. La identidad y la afinidad siguen pendientes.',
};
type Request95 = { controller: AbortController; scope: string; query: string; selection: string | null };

const CandidatePicker95 = ({ initialQuery = '', contextKey, onConfirmed, ownerId, isCurrent }: PickerProps95 & {
  ownerId: string | null; isCurrent: () => boolean;
}) => {
  const scope = JSON.stringify([ownerId, contextKey, initialQuery]);
  const inputId = useId();
  const mounted = useRef(true);
  const request = useRef<Request95 | null>(null);
  const results = useRef<Extract<WinerimCandidateSearchResult95, { status: 'proposals' }> | null>(null);
  const committed = useRef<string | null>(null);
  const current = useRef({ scope, query: initialQuery, onConfirmed, isCurrent, open: false });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [outcome, setOutcome] = useState<WinerimCandidateSearchResult95 | null>(null);
  const [busy, setBusy] = useState<'search' | 'detail' | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  current.current = { scope, query, onConfirmed, isCurrent, open };

  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.controller.abort(); request.current = null; results.current = null; };
  }, []);

  const cancel = () => {
    request.current?.controller.abort();
    request.current = null;
    setBusy(null);
    setSelection(null);
  };
  const active = (run: Request95) => mounted.current && request.current === run && !run.controller.signal.aborted
    && current.current.scope === run.scope && current.current.query === run.query && current.current.isCurrent();
  const start = (selected: string | null): Request95 => {
    cancel();
    const run = { controller: new AbortController(), scope, query, selection: selected };
    request.current = run;
    setNotice('');
    committed.current = null;
    setConfirmed(null);
    setSelection(selected);
    return run;
  };
  const search = async () => {
    if (!mounted.current || !current.current.open || !current.current.isCurrent() || request.current
      || current.current.scope !== scope || current.current.query !== query) return;
    results.current = null;
    setOutcome(null);
    const run = start(null);
    setBusy('search');
    try {
      const next = await searchWinerimCandidates95(query, run.controller.signal);
      if (!active(run)) return;
      results.current = next.status === 'proposals' ? next : null;
      setOutcome(next);
    } catch {
      if (active(run)) setOutcome({ status: 'unavailable' });
    } finally {
      if (active(run)) { request.current = null; setBusy(null); }
    }
  };
  const confirm = async (proposal: WinerimCandidate95) => {
    // An old event closure, a model name or a former owner's list cannot select a source.
    if (!mounted.current || !current.current.open || !current.current.isCurrent() || committed.current !== null
      || current.current.scope !== scope || current.current.query !== query || results.current !== outcome
      || outcome?.status !== 'proposals' || !outcome.proposals.slice(0, 3).includes(proposal)
      || request.current?.selection === proposal.id || confirmed === proposal.id) return;
    const run = start(proposal.id);
    setBusy('detail');
    let sheet: WinerimOriginalSheet | null = null;
    try {
      const next = await confirmWinerimCandidate95(proposal, run.controller.signal);
      if (!active(run) || request.current?.selection !== proposal.id) return;
      if (next.status === 'verified') {
        sheet = next.sheet;
        committed.current = proposal.id;
        setConfirmed(proposal.id);
        setNotice('Ficha original verificada para la referencia que has elegido.');
      } else setNotice(detailMessages[next.status]);
    } catch {
      if (active(run)) setNotice(detailMessages.unavailable);
    } finally {
      if (active(run)) {
        request.current = null;
        setBusy(null);
        if (sheet) current.current.onConfirmed(sheet);
      }
    }
  };

  if (!open) return <Button type="button" variant="outline" onClick={() => { current.current.open = true; setOpen(true); }}
    aria-expanded={false} className="h-auto min-h-11 min-w-0 w-full gap-2 whitespace-normal py-3">
    <Search aria-hidden="true" className="h-4 w-4 shrink-0" />Buscar por nombre
  </Button>;

  return <section aria-label="Buscar referencia en Winerim" className="min-w-0 space-y-3 text-sm leading-relaxed"
    style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}>
    <div className="flex min-w-0 items-center justify-between gap-2">
      <p className="min-w-0 font-medium">Propuestas de la Library de Winerim</p>
      <Button type="button" variant="ghost" size="icon" aria-label="Cerrar búsqueda" title="Cerrar búsqueda"
        className="h-11 w-11 shrink-0" onClick={() => {
          cancel(); current.current.open = false; results.current = null; setOutcome(null); setNotice(''); setOpen(false);
        }}>
        <X aria-hidden="true" className="h-4 w-4" />
      </Button>
    </div>
    <form className="min-w-0 space-y-2" onSubmit={event => { event.preventDefault(); void search(); }}>
      <label htmlFor={inputId} className="block">Nombre del vino</label>
      <Input id={inputId} value={query} maxLength={120} autoComplete="off" className="min-h-11 min-w-0 w-full text-base"
        onChange={event => {
          cancel(); results.current = null;
          current.current.query = event.target.value;
          committed.current = null;
          setQuery(event.target.value); setOutcome(null); setNotice(''); setConfirmed(null);
        }} />
      <div className="flex min-w-0 flex-wrap gap-2">
        <Button type="submit" variant="outline" disabled={busy !== null || !isWinerimCandidateQuery95(query)}
          className="h-auto min-h-11 min-w-0 flex-1 gap-2 whitespace-normal py-3">
          {busy === 'search' ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" />
            : <Search aria-hidden="true" className="h-4 w-4 shrink-0" />}Buscar
        </Button>
        {busy && <Button type="button" variant="ghost" onClick={() => { cancel(); setNotice('Consulta cancelada. No se ha confirmado ninguna referencia.'); }}
          className="h-auto min-h-11 min-w-0 gap-2 whitespace-normal py-3"><X aria-hidden="true" className="h-4 w-4 shrink-0" />Cancelar</Button>}
      </div>
    </form>
    {busy && <p role="status">{busy === 'search' ? 'Consultando propuestas...' : 'Verificando la ficha de tu elección...'}</p>}
    {outcome?.status === 'proposals' ? <>
      <p>{outcome.total > 3 ? `Se muestran 3 de ${outcome.total} propuestas de esta consulta. Concreta el nombre o la bodega si no aparece tu referencia.`
        : `${outcome.total} ${outcome.total === 1 ? 'propuesta en esta consulta' : 'propuestas en esta consulta'}.`}</p>
      <p>La lectura sigue sin confirmar hasta que elijas una referencia y se verifique su ficha original.</p>
      <ul className="min-w-0 divide-y">
        {outcome.proposals.slice(0, 3).map(proposal => <li key={proposal.id} className="min-w-0 space-y-2 py-3">
          <p className="font-medium">{proposal.name}</p>
          <p>{proposal.winery}</p>
          <p>{proposal.vintage ?? 'Añada no indicada'}{proposal.region ? ` · ${proposal.region}` : ''}</p>
          {proposal.vintage === null && <p>Esta referencia no indica añada; elegirla no verifica la cosecha de tu botella.</p>}
          <Button type="button" variant="outline" disabled={confirmed !== null || busy === 'search' || (busy === 'detail' && selection === proposal.id)}
            onClick={() => void confirm(proposal)} className="h-auto min-h-11 min-w-0 w-full gap-2 whitespace-normal py-3">
            {confirmed === proposal.id ? <><Check aria-hidden="true" className="h-4 w-4 shrink-0" />Referencia confirmada</>
              : <><Check aria-hidden="true" className="h-4 w-4 shrink-0" />Esta es mi botella</>}
          </Button>
        </li>)}
      </ul>
    </> : outcome && <p role="status">{searchMessages[outcome.status]}</p>}
    {notice && <p role="status">{notice}</p>}
  </section>;
};

export const WinerimCandidatePicker95 = (props: PickerProps95) => {
  const { user } = useAuth();
  const ownerId = user?.id ?? null;
  const scope = JSON.stringify([ownerId, props.contextKey, props.initialQuery]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  if (!Capacitor.isNativePlatform()) return null;
  return <CandidatePicker95 key={scope} {...props} ownerId={ownerId} isCurrent={() => currentScope.current === scope} />;
};
