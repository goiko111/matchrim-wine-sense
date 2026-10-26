import { useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WineCandidate } from '@/utils/multiWineScan';
import type { MasterInvoke195 } from '@/utils/nativeMasterReference195';
import { masterAffinityGap259, nativeMasterLink259, resolveMasterCandidate259 } from '@/utils/nativeMasterLink259';

export const NativeMasterReference259 = ({ candidate }: { candidate: WineCandidate }) => {
  const link = nativeMasterLink259(candidate);
  if (!link) return null;
  const gap = masterAffinityGap259(link);
  return <section aria-label="Referencia del catálogo Winerim" data-testid="native-master-reference259"
    className="min-w-0 space-y-3 border-y border-stone-200 py-3 [overflow-wrap:anywhere]">
    <div className="min-w-0 space-y-1">
      <h4 className="font-semibold text-slate-950">{link.wine.name}</h4>
      <p className="text-sm leading-6 text-stone-700">{link.wine.winery}</p>
      {link.wine.region && <p className="text-sm text-stone-600">{link.wine.region}</p>}
    </div>
    <p className="font-semibold text-slate-950">{gap.title}</p>
    <p className="text-sm leading-6 text-stone-700">{gap.description}</p>
    <p className="text-sm leading-6 text-stone-700">{gap.nextStep}</p>
    {link.wine.webUrl && <Button asChild variant="outline" className="h-auto min-h-11 max-w-full gap-2 whitespace-normal px-3 py-3 text-left">
      <a href={link.wine.webUrl} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
        <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" /> Ver ficha original Winerim
      </a>
    </Button>}
  </section>;
};

type Props = { candidate: WineCandidate; contextKey: string; ownerId: string | null; disabled: boolean;
  invoke: MasterInvoke195; onConfirmed: (candidate: WineCandidate) => void; fallback: ReactNode };

export const NativeMasterLookup259 = ({ candidate, contextKey, ownerId, disabled, invoke, onConfirmed, fallback }: Props) => {
  const [proposal, setProposal] = useState<WineCandidate | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const current = useRef({ contextKey, ownerId, disabled, onConfirmed });
  current.current = { contextKey, ownerId, disabled, onConfirmed };
  useEffect(() => {
    setProposal(null); setMessage(''); setBusy(false);
    return () => { request.current?.abort(); request.current = null; };
  }, [contextKey, ownerId]);
  useEffect(() => { if (disabled) request.current?.abort(); }, [disabled]);
  const run = async () => {
    if (!ownerId || disabled || request.current) return;
    const controller = new AbortController(); request.current = controller;
    const active = () => request.current === controller && !controller.signal.aborted
      && current.current.contextKey === contextKey && current.current.ownerId === ownerId && !current.current.disabled;
    setBusy(true); setProposal(null); setMessage('Buscando la referencia en Winerim…');
    try {
      const result = await resolveMasterCandidate259(candidate, invoke, controller.signal);
      if (!active()) return;
      if (result.status === 'reference-ready') { setProposal(result.candidate); setMessage(''); }
      else setMessage(result.status === 'identity-required'
        ? 'Comprueba el nombre y la bodega antes de buscar. No basta con la uva o la añada.'
        : result.status === 'unavailable' ? 'No se ha podido consultar el catálogo. Conservamos tu etiqueta; puedes volver a intentarlo.'
          : result.status === 'incomplete' || result.status === 'ambiguous'
            ? 'Hay varias referencias posibles. Completa o corrige el nombre y la bodega; no elegiremos una por ti.'
            : 'Esta búsqueda no ha encontrado una coincidencia única. Revisa el nombre y la bodega; no confirma que el vino no exista en Winerim.');
    } catch { if (active()) setMessage('No se ha podido consultar el catálogo. No hemos cambiado tu vino.'); }
    finally {
      if (request.current === controller) {
        request.current = null; setBusy(false);
        if (controller.signal.aborted && current.current.contextKey === contextKey
          && current.current.ownerId === ownerId) setMessage('Búsqueda cancelada. No hemos cambiado tu vino.');
      }
    }
  };
  if (!ownerId || !candidate.producer?.trim() || !candidate.name.trim()) return <>{fallback}</>;
  return <div className="min-w-0 space-y-3" data-testid="native-master-lookup259">
    {!proposal && <Button type="button" disabled={disabled || busy} onClick={() => void run()}
      className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white">
      {busy ? <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin" />
        : <BookOpen aria-hidden="true" className="h-5 w-5 shrink-0" />} Buscar este vino en Winerim
    </Button>}
    {busy && <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => request.current?.abort()}>
      <X aria-hidden="true" className="h-4 w-4 shrink-0" /> Cancelar búsqueda
    </Button>}
    {message && <p role="status" className="text-sm leading-6 text-stone-700">{message}</p>}
    {proposal && <>
      <NativeMasterReference259 candidate={proposal} />
      <Button type="button" disabled={disabled || busy} onClick={() => {
        if (current.current.contextKey !== contextKey || current.current.ownerId !== ownerId || current.current.disabled
          || !nativeMasterLink259(proposal)) return;
        current.current.onConfirmed(proposal);
      }} className="h-auto min-h-11 w-full min-w-0 gap-2 whitespace-normal bg-red-950 px-3 py-3 text-left text-white">
        <Check aria-hidden="true" className="h-5 w-5 shrink-0" /> Esta es mi referencia
      </Button>
    </>}
    <details className="min-w-0 space-y-2">
      <summary className="flex min-h-11 cursor-pointer items-center text-sm text-stone-700">Buscar otra referencia</summary>
      {fallback}
    </details>
  </div>;
};
