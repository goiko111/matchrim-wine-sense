import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Loader2, BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WinerimOriginalSheet } from './WinerimOriginalSheet';
import { canLookupWinerimOriginal, lookupWinerimOriginalSheet, type WinerimOriginalIdentity,
  type WinerimOriginalLookupResult, type WinerimOriginalSheet as OriginalSheet } from '@/utils/winerimOriginalSheet';

const lookupMessages = {
  'identity-required': 'Ficha pendiente: falta un nombre y una bodega confirmados, o la añada no es válida.',
  'not-found': 'No se ha podido enlazar esta identidad y añada con una ficha de la Library consultada. No confirma que el vino no exista en Winerim.',
  ambiguous: 'La consulta no permite identificar una única ficha original. La ficha y sus atributos siguen pendientes de verificar.',
  incomplete: 'La consulta es incompleta. No se puede verificar una ficha única para esta referencia.',
  unavailable: 'No se ha podido consultar la ficha original de Winerim. Puedes volver a intentarlo; la identificación y la afinidad no han cambiado.',
};

type LookupProps = { identity: WinerimOriginalIdentity; onVerified?: (sheet: OriginalSheet) => void };
const OriginalSheetLookup = ({ identity, onVerified }: LookupProps) => {
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const verifiedCallback = useRef(onVerified);
  verifiedCallback.current = onVerified;
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<WinerimOriginalLookupResult | null>(null);
  const result = useRef<HTMLDivElement>(null);
  const ready = canLookupWinerimOriginal(identity);
  useEffect(() => { if (outcome?.status === 'verified') result.current?.focus({ preventScroll: true }); }, [outcome]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); };
  }, []);
  const lookup = async () => {
    if (controller.current || !ready) return;
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setOutcome(null);
    try {
      const next = await lookupWinerimOriginalSheet(identity, abort.signal);
      if (mounted.current && !abort.signal.aborted) {
        setOutcome(next);
        if (next.status === 'verified') verifiedCallback.current?.(next.sheet);
      }
    } catch {
      if (mounted.current && !abort.signal.aborted) setOutcome({ status: 'unavailable' });
    } finally {
      if (mounted.current && controller.current === abort) { controller.current = null; setLoading(false); }
    }
  };
  if (outcome?.status === 'verified') return <div ref={result} tabIndex={-1} className="min-w-0 outline-none" aria-label={`Ficha original Winerim: ${outcome.sheet.name}`}>
    <p role="status" className="sr-only">Ficha original Winerim verificada para {outcome.sheet.name} {outcome.sheet.vintage}.</p><WinerimOriginalSheet sheet={outcome.sheet} />
  </div>;
  const status = ready ? outcome?.status : 'identity-required';
  return (
    <div className="min-w-0" aria-busy={loading}>
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="outline" disabled={loading || !ready} aria-label={`Ficha original Winerim: ${identity.name}${identity.vintage ? ` ${identity.vintage}` : ''}`} onClick={() => void lookup()} className="h-auto min-h-11 min-w-0 flex-1 gap-2 whitespace-normal break-words">
          {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" /> : <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0" />} {outcome ? 'Reintentar ficha original Winerim' : 'Ficha original Winerim'}
        </Button>
        {loading && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Cancelar búsqueda de ficha" title="Cancelar búsqueda de ficha" onClick={() => {
          controller.current?.abort(); controller.current = null; setLoading(false);
        }}><X aria-hidden="true" className="h-4 w-4" /></Button>}
      </div>
      {loading && <p role="status" className="mt-2 text-xs text-slate-600">Consultando la ficha original de Winerim...</p>}
      {status && <p role="status" className="mt-2 text-xs text-slate-600">{lookupMessages[status]}</p>}
    </div>
  );
};

export const WinerimSheetLookup = ({ identity, onVerified }: LookupProps) => {
  if (!Capacitor.isNativePlatform()) return null;
  const key = JSON.stringify([identity.name, identity.producer, identity.vintage, identity.region, identity.country, identity.inferredFields]);
  return <OriginalSheetLookup key={key} identity={identity} onVerified={onVerified} />;
};
