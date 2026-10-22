import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { canAdmitNativeCatalogLookup97 } from '@/utils/nativeCatalogAdmission97';
import { Input } from '@/components/ui/input';
import type { WineCandidate } from '@/utils/multiWineScan';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { applyGlobalCatalogue103, createGlobalCatalogue103, exactGlobalVintage103, isGlobalWine103, lookupGlobalCatalogue103, globalSensory103, type GlobalWine103 } from '@/utils/nativeGlobalCatalogue103';
import { buildAffinityInsights, calculateLocalMatchrimAffinity } from '@/utils/wineAffinityExplanation';
import { nativeCataloguePage163 } from '@/utils/nativeCataloguePage163';
import { nativeSavedCatalogue168 } from '@/utils/nativeSavedCatalogue168';
import type { NativeVerdicts159 } from '@/utils/nativeRescanVerdict159';

export const GlobalWineReference103 = ({ candidate, profile }: { candidate: WineCandidate; profile: MatchrimProfileLike | null }) => {
  const wine = candidate.globalRecord;
  if (!isGlobalWine103(candidate, wine)) return null;
  const exact = exactGlobalVintage103(candidate, wine);
  const styleScore = calculateLocalMatchrimAffinity(profile, globalSensory103(wine));
  const insights = buildAffinityInsights(profile, globalSensory103(wine));
  const names = { potente: 'cuerpo', acidez: 'frescura', dulce: 'dulzor', tanico: 'tanino', afrutado: 'fruta' };
  const matches = insights?.positives.slice(0, 2).map(item => names[item.key]).join(' y ');
  const friction = insights?.negatives[0];
  return <section className="min-w-0 space-y-3 border-y border-stone-200 py-3 [overflow-wrap:anywhere]" aria-label="Ficha de Winerim" data-testid="global-wine-reference">
    <div className="flex min-w-0 items-start gap-3">
      {wine.photo && <img src={wine.photo} alt={`Botella de ${wine.name}, imagen del catálogo`} className="h-28 w-16 shrink-0 object-contain" loading="lazy" referrerPolicy="no-referrer" />}
      <div className="min-w-0 flex-1"><p className="font-semibold text-slate-950">{wine.name}</p>
        <p className="text-sm text-stone-700">{wine.producer} · {wine.vintage || 'Ficha sin añada'}</p>
        {!exact && <p className="mt-2 text-sm text-stone-700">{candidate.vintage ? `Tu etiqueta indica ${candidate.vintage}.` : 'No hemos confirmado la añada de tu botella.'} Esta ficha permite conocer el vino, pero no confirma los datos de esa cosecha.</p>}
      </div>
    </div>
    {!exact && styleScore !== null && <div className="space-y-1" data-testid="global-style-estimate">
      <p className="text-lg font-semibold text-red-950">Por su estilo: ≈{styleScore}/100</p>
      {matches && <p className="text-sm leading-6 text-stone-800">Encaja contigo por su {matches}.</p>}
      {friction && <p className="text-sm leading-6 text-stone-800">{friction.direction === 'higher' ? 'Más' : 'Menos'} {names[friction.key]} que tu preferencia habitual.</p>}
      <p className="text-sm leading-6 text-stone-700">Comparación de tus gustos con la ficha sin añada. No es la afinidad verificada de tu botella ni una probabilidad de que te guste.</p>
    </div>}
    {wine.sensory && styleScore === null && <Button asChild className="h-auto min-h-11 max-w-full whitespace-normal px-3 py-3"><Link to="/matchrim">Completar mi test de gustos</Link></Button>}
    <p className="text-xs leading-5 text-stone-600">Fuente: ficha pública Winerim. No especifica si el perfil sensorial procede de una cata o de datos generados.{!wine.sensory && ' Faltan atributos sensoriales completos.'}</p>
    <Button asChild variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal px-3 py-3 text-left">
      <a href={wine.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" /> Ver ficha original Winerim</a>
    </Button>
  </section>;
};

export const GlobalWineLookup103 = ({ candidate, contextKey, disabled, onVerified, onLoadingChange }: {
  candidate: WineCandidate; contextKey: string; disabled: boolean;
  onVerified: (wine: GlobalWine103) => void; onLoadingChange: (loading: boolean) => void;
}) => {
  const [state, setState] = useState('');
  const request = useRef<{ controller: AbortController; contextKey: string;
    onLoadingChange: (loading: boolean) => void } | null>(null);
  const current = useRef({ contextKey, disabled, onVerified });
  current.current = { contextKey, disabled, onVerified };
  useEffect(() => {
    setState('');
    return () => {
      const owned = request.current;
      if (owned?.contextKey === contextKey) {
        request.current = null; owned.controller.abort(); owned.onLoadingChange(false);
      }
    };
  }, [contextKey]);
  useEffect(() => { if (disabled) request.current?.controller.abort(); }, [disabled]);
  const lookup = async () => {
    if (disabled || request.current) return;
    if (candidate.source !== 'manual' && !canAdmitNativeCatalogLookup97(candidate)) {
      setState('Corrige o confirma primero el nombre, la bodega y la añada de tu etiqueta.'); return;
    }
    const owned = { controller: new AbortController(), contextKey, onLoadingChange };
    request.current = owned;
    const active = () => request.current === owned && !owned.controller.signal.aborted
      && current.current.contextKey === owned.contextKey && !current.current.disabled;
    setState('Buscando en Winerim…'); owned.onLoadingChange(true);
    try {
      const result = await lookupGlobalCatalogue103(candidate, owned.controller.signal);
      if (!active()) return;
      if ('wine' in result) { setState(''); current.current.onVerified(result.wine); }
      else setState(result.status === 'identity-required' ? 'Revisa el nombre, la bodega y la añada antes de buscar.'
        : result.status === 'unavailable' ? 'Winerim no ha respondido. Puedes volver a intentarlo.'
          : result.status === 'ambiguous' || result.status === 'incomplete' ? 'Hay varias referencias posibles. Corrige o completa el nombre para distinguirlas.'
            : 'No se ha encontrado una ficha con ese nombre y bodega. Puedes corregirlos; no significa que el vino no exista en Winerim.');
    } catch { if (active()) setState('No se ha podido consultar Winerim.'); }
    finally {
      if (request.current === owned) {
        request.current = null; owned.onLoadingChange(false);
        if (current.current.contextKey === owned.contextKey && (owned.controller.signal.aborted || current.current.disabled)) {
          setState('Búsqueda cancelada.');
        }
      }
    }
  };
  return <div className="min-w-0 space-y-2">
    <Button type="button" disabled={disabled || Boolean(request.current)} onClick={() => void lookup()} className="h-auto min-h-11 w-full gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white">
      {request.current ? <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin" /> : <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" />} Buscar ficha en Winerim
    </Button>
    {request.current && <Button type="button" variant="outline" onClick={() => request.current?.controller.abort()} className="min-h-11 gap-2"><X aria-hidden="true" className="h-4 w-4" /> Cancelar</Button>}
    {state && <p role="status" className="text-sm leading-6 text-stone-700">{state}</p>}
  </div>;
};

type PublicProposal103 = Awaited<ReturnType<ReturnType<typeof createGlobalCatalogue103>['search']>>['rows'][number];
export const GlobalWinePicker103 = ({ candidate, contextKey, disabled, profile, onConfirmed, ownerId = null, savedVerdicts = null }: {
  candidate: WineCandidate; contextKey: string; disabled: boolean; profile: MatchrimProfileLike | null;
  ownerId?: string | null; savedVerdicts?: NativeVerdicts159 | null;
  onConfirmed: (value: WineCandidate) => void;
}) => {
  const [query, setQuery] = useState(candidate.name), [open, setOpen] = useState(false);
  const [rows, setRows] = useState<PublicProposal103[]>([]), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [vintage, setVintage] = useState('all'), [page, setPage] = useState(0);
  const saved = nativeSavedCatalogue168(ownerId, savedVerdicts, rows);
  const visible = nativeCataloguePage163(rows, vintage, page, saved);
  const controller = useRef<AbortController | null>(null);
  const current = useRef({ contextKey, query, disabled, onConfirmed, vintage, page, ownerId, savedVerdicts });
  current.current = { contextKey, query, disabled, onConfirmed, vintage, page, ownerId, savedVerdicts };
  useEffect(() => {
    setBusy(false);
    return () => { controller.current?.abort(); controller.current = null; };
  }, [contextKey, ownerId, savedVerdicts]);
  useEffect(() => { if (disabled) controller.current?.abort(); }, [disabled]);
  const run = async (selected?: PublicProposal103) => {
    if (disabled || current.current.disabled || controller.current
      || current.current.contextKey !== contextKey || current.current.query !== query
      || current.current.ownerId !== ownerId || current.current.savedVerdicts !== savedVerdicts
      || current.current.vintage !== vintage || current.current.page !== page
      || (selected && !visible.rows.includes(selected))) return;
    const abort = new AbortController(); controller.current = abort; setBusy(true); setNotice('');
    const scope = { contextKey, query };
    const active = () => controller.current === abort && !abort.signal.aborted && !current.current.disabled
      && current.current.contextKey === scope.contextKey && current.current.query === scope.query
      && current.current.ownerId === ownerId && current.current.savedVerdicts === savedVerdicts
      && current.current.vintage === vintage && current.current.page === page;
    try {
      const client = createGlobalCatalogue103();
      if (!selected) {
        const result = await client.searchProposals(query, abort.signal); if (!active()) return;
        setRows(result.rows); setVintage('all'); setPage(0);
        setNotice(result.status === 'complete' ? result.rows.length ? 'Elige solo la referencia que coincida con tu etiqueta.' : 'No hay propuestas para esta búsqueda.'
          : result.status === 'partial' ? 'Búsqueda incompleta. Solo se muestran algunas referencias; concreta el nombre si no aparece la tuya.'
            : result.status === 'incomplete' ? 'No se ha podido completar la búsqueda. Concreta el nombre o busca por bodega.' : 'No se ha podido consultar Winerim.');
      } else {
        const name = selected.subname && !selected.name.toLowerCase().includes(selected.subname.toLowerCase()) ? `${selected.name} ${selected.subname}` : selected.name;
        const manual: WineCandidate = { ...candidate, name, producer: selected.winery,
          vintage: selected.vintage == null ? candidate.vintage : Number(selected.vintage), region: null, country: null, grapes: [], alcohol: null,
          inferredFields: [], uncertaintyReasons: [], evidence: ['Referencia elegida por el usuario'], source: 'manual',
          globalRecord: null, masterRecord: null, originalSheet: null, canonicalId: null, sensoryAttributes: null, affinity: null };
        const result = await client.confirmSelection(manual, selected, abort.signal); if (!active()) return;
        if ('wine' in result) current.current.onConfirmed(applyGlobalCatalogue103(manual, profile, result.wine, true));
        else setNotice('La ficha no se ha podido verificar. No se ha cambiado tu vino.');
      }
    } catch { if (active()) setNotice('No se ha podido consultar Winerim.'); }
    finally { if (controller.current === abort) { controller.current = null; setBusy(false); } }
  };
  if (!open) return <Button type="button" variant="outline" disabled={disabled} onClick={() => setOpen(true)} className="h-auto min-h-11 w-full gap-2 whitespace-normal py-3"><Search aria-hidden="true" className="h-4 w-4 shrink-0" /> Buscar otra referencia en Winerim</Button>;
  return <section aria-label="Buscar en el catálogo global" className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
    <form className="space-y-2" onSubmit={event => { event.preventDefault(); void run(); }}>
      <label className="block text-sm">Nombre del vino o bodega<Input value={query} maxLength={120} autoComplete="off" className="mt-1 min-h-11 text-base" onChange={event => {
        controller.current?.abort(); controller.current = null; setBusy(false); setRows([]); setNotice(''); setVintage('all'); setPage(0); setQuery(event.target.value);
      }} /></label>
      <Button type="submit" disabled={disabled || busy || query.trim().length < 2} variant="outline" className="min-h-11 gap-2"><Search aria-hidden="true" className="h-4 w-4" /> Buscar</Button>
    </form>
    {busy && <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => { controller.current?.abort(); controller.current = null; setBusy(false); setNotice('Búsqueda cancelada.'); }}><X aria-hidden="true" className="h-4 w-4" /> Cancelar</Button>}
    {notice && <p role="status" className="text-sm leading-6">{notice}</p>}
    {rows.length > 0 && <label className="block text-sm">Añada de la ficha
      <select aria-label="Filtrar por añada" value={vintage} disabled={disabled || busy}
        className="mt-1 min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base"
        onChange={event => { setVintage(event.target.value); setPage(0); }}>
        <option value="all">Todas las añadas</option>
        {visible.years.map(year => <option key={year} value={year}>{year === 'undated' ? 'Ficha sin añada' : year}</option>)}
      </select>
    </label>}
    {rows.length > 0 && <p role="status" className="text-sm">{visible.total} {visible.total === 1 ? 'referencia' : 'referencias'} · Página {visible.current + 1} de {visible.pages}</p>}
    <ul className="divide-y divide-stone-200">{visible.rows.map(row => <li key={row.id} className="min-w-0 space-y-2 py-3">
      {saved.has(row.id) && <p className="text-sm font-semibold text-red-950">Ya en tu Bodega</p>}
      <p className="font-semibold">{row.name}{row.subname && !row.name.includes(row.subname) ? ` ${row.subname}` : ''}</p>
      <p className="text-sm">{row.winery} · {row.vintage || 'Ficha sin añada'}</p>
      {row.vintage == null && <p className="text-sm">Elegir esta referencia no confirma la cosecha de tu botella.</p>}
      {row.vintage != null && candidate.vintage !== Number(row.vintage) && <p className="text-sm">Al elegirla, tu añada se cambiará a {row.vintage}.</p>}
      <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void run(row)} className="h-auto min-h-11 w-full gap-2 whitespace-normal py-3"><Check aria-hidden="true" className="h-4 w-4 shrink-0" /> Esta es mi referencia</Button>
    </li>)}</ul>
    {visible.pages > 1 && <nav aria-label="Páginas de referencias" className="flex items-center justify-between gap-3">
      <Button type="button" variant="outline" aria-label="Referencias anteriores" title="Referencias anteriores"
        className="h-11 w-11 shrink-0 p-0" disabled={disabled || busy || visible.current === 0}
        onClick={() => setPage(visible.current - 1)}><ChevronLeft aria-hidden="true" className="h-5 w-5" /></Button>
      <span className="text-sm">{visible.current + 1} / {visible.pages}</span>
      <Button type="button" variant="outline" aria-label="Referencias siguientes" title="Referencias siguientes"
        className="h-11 w-11 shrink-0 p-0" disabled={disabled || busy || visible.current + 1 >= visible.pages}
        onClick={() => setPage(visible.current + 1)}><ChevronRight aria-hidden="true" className="h-5 w-5" /></Button>
    </nav>}
  </section>;
};
