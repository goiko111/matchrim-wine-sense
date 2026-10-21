import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, Loader2, Search, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WineCandidate } from '@/utils/multiWineScan';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { applyGlobalCatalogue103, createGlobalCatalogue103, independentGlobalProducer103, type PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import { canAdmitNativeCatalogLookup97 } from '@/utils/nativeCatalogAdmission97';
import { globalRecoveryQueries104, rankGlobalProposals104, type WineProposal104 } from '@/utils/globalWineProposals104';
import { safeWineImageUrl98 } from '@/utils/wineImage98';
import { localOCRAvailable106, readLocalWineText106, type LocalOCRResult106 } from '@/utils/nativeOCR106';
import { wineYearRoles105 } from '@/utils/wineYearRole105';
import { suggestLocalOCRFragments108 } from '@/utils/localOCRFragments108';

export const GlobalWineRecovery104 = ({ candidate, contextKey, profile, disabled, image, reading, autoSearch = false, onConfirmed }: {
  candidate: WineCandidate; contextKey: string; profile: MatchrimProfileLike | null; disabled: boolean;
  image?: string;
  reading?: LocalOCRResult106;
  autoSearch?: boolean;
  onConfirmed: (candidate: WineCandidate) => void;
}) => {
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [proposals, setProposals] = useState<WineProposal104[]>([]);
  const [proposalVintage, setProposalVintage] = useState(candidate.vintage);
  const [reconstructed, setReconstructed] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const latestReading = useRef({ contextKey, prop: reading, value: reading });
  if (latestReading.current.contextKey !== contextKey || latestReading.current.prop !== reading)
    latestReading.current = { contextKey, prop: reading, value: reading };
  const resultsHeading = useRef<HTMLHeadingElement | null>(null);
  const current = useRef({ contextKey, disabled, onConfirmed });
  current.current = { contextKey, disabled, onConfirmed };
  useEffect(() => () => { pending.current?.abort(); pending.current = null; }, [contextKey]);
  useEffect(() => { if (disabled) pending.current?.abort(); }, [disabled]);
  useEffect(() => { if (proposals.length) resultsHeading.current?.focus(); }, [proposals]);
  const run = async (selection?: WineProposal104, onDevice = false) => {
    if (disabled || pending.current || (selection && !proposals.includes(selection))) return;
    const controller = new AbortController(); pending.current = controller; setBusy(true); setNotice('');
    if (!selection) { setProposals([]); setReconstructed(false); }
    const active = () => pending.current === controller && !controller.signal.aborted
      && current.current.contextKey === contextKey && !current.current.disabled;
    try {
      const client = createGlobalCatalogue103();
      if (selection) {
        const manual: WineCandidate = { ...candidate, name: selection.name, producer: selection.row.winery,
          vintage: selection.row.vintage == null ? proposalVintage : Number(selection.row.vintage),
          region: null, country: null, grapes: [], alcohol: null, inferredFields: [], evidence: ['Referencia elegida por el usuario'], uncertaintyReasons: [],
          source: 'manual', canonicalId: null, originalSheet: null, globalRecord: null, masterRecord: null, sensoryAttributes: null, affinity: null };
        const result = await client.confirmSelection(manual, selection.row, controller.signal);
        if (!active()) return;
        if ('wine' in result) current.current.onConfirmed(applyGlobalCatalogue103(manual, profile, result.wine, true));
        else setNotice('No hemos podido verificar esa ficha. Tu vino no ha cambiado.');
        return;
      }
      let evidence = candidate.evidence, vintage = candidate.vintage;
      const useLocalReading = onDevice || Boolean(latestReading.current.value && candidate.source !== 'manual');
      if (useLocalReading) {
        if (onDevice && (!image || !localOCRAvailable106())) { setNotice('La lectura local no esta disponible en esta version.'); return; }
        if (onDevice) setNotice('Leyendo el recorte en este iPhone. La foto no se envia.');
        const text = onDevice ? await readLocalWineText106(image!, controller.signal) : latestReading.current.value!; if (!active()) return;
        if (onDevice) latestReading.current.value = text;
        const fragments = suggestLocalOCRFragments108(text.lines);
        evidence = [...text.lines.map(line => line.text), ...fragments.alternatives.map(line => line.text)].slice(0, 100);
        setReconstructed(fragments.alternatives.length > 0);
        const years = wineYearRoles105(text.lines);
        if (!years.supported) { setNotice('No se ha podido revisar la fecha. Tu vino no ha cambiado.'); return; }
        const completeYears = text.lines.every(line => (line.text.match(/\b(?:19|20)\d{2}\b/g)?.length ?? 0) <= 8);
        const possible = completeYears ? years.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified') : [];
        vintage = candidate.source === 'manual' && candidate.vintage !== null ? candidate.vintage
          : possible.length === 1 ? possible[0].year : null;
        if (!evidence.length) { setProposals([]); setNotice('No se lee texto en este recorte. Prueba una foto mas cercana.'); return; }
      }
      setProposalVintage(vintage);
      if (!useLocalReading && (candidate.source === 'manual' || (canAdmitNativeCatalogLookup97(candidate) && independentGlobalProducer103(candidate)))) {
        const result = await client.lookup(candidate, controller.signal);
        if (!active()) return;
        if ('wine' in result) { current.current.onConfirmed(applyGlobalCatalogue103(candidate, profile, result.wine, candidate.source === 'manual')); return; }
      }
      const rows: PublicGlobalRow103[] = [];
      let unavailable = false;
      for (const query of globalRecoveryQueries104(candidate.name, evidence, !useLocalReading && candidate.source === 'manual', vintage)) {
        const page = await client.searchProposals(query, controller.signal); if (!active()) return;
        unavailable ||= page.status === 'unavailable';
        rows.push(...page.rows);
      }
      const next = rankGlobalProposals104(!useLocalReading && candidate.source === 'manual' ? [candidate.name, candidate.producer || ''] : evidence, rows, vintage);
      setProposals(next);
      setNotice(next.length ? 'No hemos confirmado el vino. Compara la etiqueta y elige solo si coincide.' : unavailable ? 'No podemos conectar con Winerim. Puedes reintentar sin cambiar tu vino.'
        : 'No hay una propuesta suficientemente parecida. Corrige el nombre o prueba una foto más cercana.');
    } catch { if (active()) setNotice('No se ha podido consultar Winerim. Puedes reintentar sin cambiar tu vino.'); }
    finally { if (pending.current === controller) { pending.current = null; setBusy(false); } }
  };
  const runLatest = useRef(run); runLatest.current = run;
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoSearch && !disabled && !autoStarted.current) { autoStarted.current = true; void runLatest.current(); }
    return () => { autoStarted.current = false; };
  }, [autoSearch, disabled, contextKey]);
  const searchActions = <div className="min-w-0 space-y-2">
    <Button type="button" disabled={disabled || busy} onClick={() => void run()} className="h-auto min-h-11 w-full gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white">
      {busy ? <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin" /> : <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" />} Encontrar mi vino en Winerim
    </Button>
    {image && localOCRAvailable106() && <Button type="button" variant="outline" disabled={disabled || busy}
      onClick={() => void run(undefined, true)} className="h-auto min-h-11 w-full gap-2 whitespace-normal px-3 py-3 text-left">
      <Smartphone aria-hidden="true" className="h-5 w-5 shrink-0" /> Releer recorte en este iPhone
    </Button>}
  </div>;
  return <section aria-label="Encontrar mi vino" className="min-w-0 space-y-3" data-testid="global-recovery104">
    {proposals.length === 0 && searchActions}
    {busy && <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => { pending.current?.abort(); pending.current = null; setBusy(false); setNotice('Búsqueda cancelada. No se ha cambiado tu vino.'); }}><X aria-hidden="true" className="h-4 w-4" /> Cancelar</Button>}
    {notice && <p role="status" className="text-sm leading-6 text-stone-700">{notice}</p>}
    {proposals.length > 0 && <h3 ref={resultsHeading} tabIndex={-1} className="text-base font-semibold text-stone-950 outline-none">Propuestas de Winerim</h3>}
    {reconstructed && <p className="text-sm leading-6 text-stone-700" data-testid="local-ocr-reconstruction108">Se han unido fragmentos de texto cercanos para buscar. Comprueba la etiqueta antes de elegir; no es una identidad confirmada.</p>}
    <ul className="min-w-0 divide-y divide-stone-200">{proposals.map(proposal => {
      const photo = safeWineImageUrl98(proposal.row.photo);
      return <li key={proposal.row.id} className="min-w-0 space-y-2 py-3 [overflow-wrap:anywhere]">
        <div className="flex min-w-0 items-start gap-3">{photo && <img src={photo} alt={`Propuesta de catálogo: ${proposal.name}`} className="h-24 w-14 shrink-0 object-contain" referrerPolicy="no-referrer" loading="lazy" />}
          <div className="min-w-0"><p className="font-semibold">{proposal.name}</p><p className="text-sm">{proposal.row.winery} · {proposal.row.vintage || 'Ficha sin añada'}</p>
            {(proposal.row.type || proposal.row.region) && <p className="text-sm text-stone-600">{[proposal.row.type, proposal.row.region].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        {proposal.missingProducer && <p className="text-sm text-stone-700">Comprueba la bodega: no se lee completa en tu foto.</p>}
        {proposal.readingCorrections.length > 0 && <p className="text-sm text-stone-700">La lectura de la uva puede contener una errata. Comprueba que coincide con la etiqueta antes de confirmar.</p>}
        {proposal.row.vintage == null ? <p className="text-sm text-stone-700">Esta ficha no confirma la cosecha de tu botella.</p>
          : proposalVintage !== Number(proposal.row.vintage) && <p className="text-sm text-stone-700">Elegirla cambiará tu añada a {proposal.row.vintage}.</p>}
        <Button type="button" variant="outline" disabled={disabled || busy} onClick={() => void run(proposal)} className="h-auto min-h-11 w-full gap-2 whitespace-normal py-3"><Check aria-hidden="true" className="h-4 w-4 shrink-0" /> Confirmar esta referencia</Button>
      </li>;
    })}</ul>
    {proposals.length > 0 && <details className="min-w-0 border-t border-stone-200 pt-2">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-900">
        <Search aria-hidden="true" className="h-4 w-4 shrink-0" />Buscar de nuevo
      </summary>
      <div className="pt-2">{searchActions}</div>
    </details>}
  </section>;
};
