import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WineCandidate } from '@/utils/multiWineScan';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import type { MasterInvoke195 } from '@/utils/nativeMasterReference195';
import type { LocalOCRResult106 } from '@/utils/nativeOCR106';
import { applyGlobalCatalogue103, createGlobalCatalogue103 } from '@/utils/nativeGlobalCatalogue103';
import { globalRecoveryQueries104 } from '@/utils/globalWineProposals104';
import { searchCandidates286, type Candidate286, type CandidateDecision286 } from '@/utils/candidateRecognition286';
import { resolveMasterCandidate259 } from '@/utils/nativeMasterLink259';
import { safeWineImageUrl98 } from '@/utils/wineImage98';
import { wineYearRoles105 } from '@/utils/wineYearRole105';
import { suggestLocalOCRFragments108 } from '@/utils/localOCRFragments108';
import { PilotFeedback130 } from '@/components/PilotFeedback130';

type Props = {
  candidate: WineCandidate; contextKey: string; profile: MatchrimProfileLike | null; disabled: boolean;
  reading?: LocalOCRResult106; ownerId: string | null; invoke: MasterInvoke195;
  onConfirmed: (candidate: WineCandidate) => void;
};

// Recognition by candidates (286): the text read on this iPhone searches Winerim
// on its own, and the user picks the wine with one tap. Nothing is linked
// without that tap; a pick is verified against Winerim before it is applied.
export const CandidateRecovery286 = ({ candidate, contextKey, profile, disabled, reading, ownerId, invoke, onConfirmed }: Props) => {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [decision, setDecision] = useState<CandidateDecision286 | null>(null);
  const [vintage, setVintage] = useState<number | null>(candidate.vintage);
  const [typed, setTyped] = useState('');
  const pending = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const current = useRef({ contextKey, disabled, onConfirmed });
  current.current = { contextKey, disabled, onConfirmed };
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [contextKey]);
  useEffect(() => { if (disabled) pending.current?.abort(); }, [disabled]);
  useEffect(() => { if (decision && decision.mode !== 'none') heading.current?.focus(); }, [decision]);

  const start = () => {
    if (disabled || pending.current) return null;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setNotice('');
    const active = () => pending.current === controller && !controller.signal.aborted
      && current.current.contextKey === contextKey && !current.current.disabled;
    return { controller, active, finish: () => { if (pending.current === controller) { pending.current = null; setBusy(false); } } };
  };
  const find = async (manualQuery?: string) => {
    const job = start(); if (!job) return;
    const { controller, active, finish } = job;
    if (!manualQuery) setDecision(null);
    setNotice(manualQuery ? 'Buscando en Winerim…' : 'Buscando tu vino en Winerim con el texto leído…');
    try {
      const lines = reading?.lines ?? [];
      const read = lines.length ? lines.map(line => line.text) : candidate.evidence;
      const fragments = lines.length ? suggestLocalOCRFragments108(lines).alternatives.map(line => line.text) : [];
      const evidence = [...(manualQuery ? [manualQuery] : []), ...read, ...fragments].slice(0, 100);
      let year = candidate.vintage;
      if (lines.length) {
        const years = wineYearRoles105(lines);
        const possible = years.supported ? years.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified') : [];
        year = possible.length === 1 ? possible[0].year : null;
      }
      setVintage(year);
      if (!evidence.length) { setDecision({ mode: 'none' }); setNotice('No se lee texto en este recorte. Escribe el nombre o la bodega.'); return; }
      const literal = manualQuery ? [manualQuery] : globalRecoveryQueries104(candidate.name, evidence, false, year, lines.length ? lines : undefined);
      const client = createGlobalCatalogue103();
      const found = await searchCandidates286(evidence, literal, year, query => client.searchProposals(query, controller.signal), lines);
      if (!active()) return;
      setDecision(found.decision);
      setNotice(found.decision.mode !== 'none'
        ? found.incomplete ? 'Algunas búsquedas no se han completado; puede haber más candidatos.' : ''
        : found.unavailable ? 'No podemos conectar con Winerim. Puedes reintentar; tu vino no ha cambiado.'
          : 'No hemos encontrado candidatos con el texto leído. Escribe el nombre o la bodega.');
    } catch { if (active()) setNotice('No se ha podido consultar Winerim. Puedes reintentar; tu vino no ha cambiado.'); }
    finally { finish(); }
  };
  const choose = async (picked: Candidate286) => {
    const job = start(); if (!job) return;
    const { controller, active, finish } = job;
    setNotice('Comprobando la ficha en Winerim…');
    try {
      const manual: WineCandidate = { ...candidate, name: picked.name, producer: picked.row.winery,
        vintage: picked.row.vintage == null ? vintage : Number(picked.row.vintage),
        region: null, country: null, grapes: [], alcohol: null, inferredFields: [], evidence: ['Referencia elegida por el usuario'],
        uncertaintyReasons: [], source: 'manual', canonicalId: null, originalSheet: null, globalRecord: null, masterRecord: null,
        sensoryAttributes: null, affinity: null };
      // Winerim's master reference carries the 0-5 taste values; the public store
      // sheet is the fallback without a session or when the master has no unique match.
      if (ownerId) {
        const master = await resolveMasterCandidate259(manual, invoke, controller.signal, 8000, profile);
        if (!active()) return;
        if (master.status === 'reference-ready') { setNotice(''); current.current.onConfirmed(master.candidate); return; }
      }
      const result = await createGlobalCatalogue103().confirmSelection(manual, picked.row, controller.signal);
      if (!active()) return;
      if ('wine' in result) { setNotice(''); current.current.onConfirmed(applyGlobalCatalogue103(manual, profile, result.wine, true)); }
      else setNotice('No hemos podido verificar esa ficha. Tu vino no ha cambiado.');
    } catch { if (active()) setNotice('No se ha podido consultar Winerim. Tu vino no ha cambiado.'); }
    finally { finish(); }
  };
  const findLatest = useRef(find); findLatest.current = find;
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!disabled && !autoStarted.current) { autoStarted.current = true; void findLatest.current(); }
    return () => { autoStarted.current = false; };
  }, [disabled, contextKey]);

  const card = (value: Candidate286, action: string) => {
    const photo = safeWineImageUrl98(value.row.photo);
    return <li key={value.row.id} className="min-w-0 space-y-2 py-3 [overflow-wrap:anywhere]" data-testid="candidate286">
      <div className="flex min-w-0 items-start gap-3">
        {photo && <img src={photo} alt={`Foto de Winerim: ${value.name}`} className="h-[112px] w-[64px] shrink-0 object-contain" referrerPolicy="no-referrer" loading="lazy" />}
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{value.name}</p>
          <p className="text-sm text-stone-700">{value.row.winery} · {value.row.vintage || 'Ficha sin añada'}</p>
          {(value.row.type || value.row.region) && <p className="text-sm text-stone-600">{[value.row.type, value.row.region].filter(Boolean).join(' · ')}</p>}
        </div>
      </div>
      {value.coverage < 0.75 && <p className="text-sm text-stone-700">Lectura parcial: compara la etiqueta antes de elegir.</p>}
      {value.row.vintage == null ? <p className="text-sm text-stone-700">Esta ficha no confirma la cosecha de tu botella.</p>
        : vintage !== null && vintage !== Number(value.row.vintage) && <p className="text-sm text-stone-700">Elegirla cambiará tu añada a {value.row.vintage}.</p>}
      <Button type="button" variant={action === 'Sí, es este' ? 'default' : 'outline'} disabled={disabled || busy} onClick={() => void choose(value)}
        className={`h-auto min-h-11 w-full gap-2 whitespace-normal py-3 ${action === 'Sí, es este' ? 'bg-red-950 text-white' : ''}`}>
        <Check aria-hidden="true" className="h-4 w-4 shrink-0" /> {action}
      </Button>
    </li>;
  };
  const shown = decision?.mode === 'one' ? [decision.first] : decision?.mode === 'choose' ? decision.shown : [];
  const more = decision && decision.mode !== 'none' ? decision.more : [];
  return <section aria-label="¿Es alguno de estos?" className="min-w-0 space-y-3" data-testid="candidate-recovery286">
    {busy && <div className="flex min-w-0 flex-wrap items-center gap-2">
      <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin" />
      <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => {
        pending.current?.abort(); pending.current = null; setBusy(false); setNotice('Búsqueda cancelada. Tu vino no ha cambiado.');
      }}><X aria-hidden="true" className="h-4 w-4" /> Cancelar</Button>
    </div>}
    {notice && <p role="status" className="text-sm leading-6 text-stone-700">{notice}</p>}
    {shown.length > 0 && <h3 ref={heading} tabIndex={-1} className="text-base font-semibold text-stone-950 outline-none">
      {decision?.mode === 'one' ? '¿Es este tu vino?' : '¿Es alguno de estos?'}</h3>}
    {shown.length > 0 && <ul className="min-w-0 divide-y divide-stone-200">{shown.map(value => card(value, decision?.mode === 'one' ? 'Sí, es este' : 'Es este'))}</ul>}
    {more.length > 0 && <details className="min-w-0 border-t border-stone-200 pt-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium">
        {decision?.mode === 'one' ? `No es este: ver otros candidatos (${more.length})` : `Ver más candidatos (${more.length})`}
      </summary>
      <ul className="min-w-0 divide-y divide-stone-200">{more.map(value => card(value, 'Es este'))}</ul>
    </details>}
    <form className="min-w-0 space-y-2 border-t border-stone-200 pt-3" onSubmit={event => {
      event.preventDefault(); const query = typed.trim(); if (query.length >= 2) void find(query);
    }}>
      <label htmlFor="candidate-search286" className="text-sm font-medium text-stone-800">
        {shown.length ? '¿No está? Busca por nombre o bodega' : 'Busca por nombre o bodega'}</label>
      <div className="flex min-w-0 gap-2">
        <Input id="candidate-search286" value={typed} maxLength={100} disabled={disabled}
          onChange={event => setTyped(event.target.value)} className="min-h-11 min-w-0 flex-1" autoComplete="off" />
        <Button type="submit" disabled={disabled || busy || typed.trim().length < 2} className="min-h-11 gap-2">
          <Search aria-hidden="true" className="h-4 w-4" /> Buscar
        </Button>
      </div>
    </form>
    {!busy && decision?.mode === 'none' && <Button type="button" variant="outline" disabled={disabled} onClick={() => void find()}
      className="h-auto min-h-11 w-full gap-2 whitespace-normal py-3"><BookOpen aria-hidden="true" className="h-4 w-4 shrink-0" /> Reintentar con el texto leído</Button>}
    {!busy && decision && <PilotFeedback130 label={shown.length ? '¿Ninguno es tu vino? Avísanos' : 'Avísanos de este fallo'}
      context={{ where: 'candidatos', read: reading?.lines.map(line => line.text) ?? candidate.evidence,
        shown: [...shown, ...more].slice(0, 5).map(value => `${value.name} (${value.row.winery})`), searched: typed }} />}
  </section>;
};
