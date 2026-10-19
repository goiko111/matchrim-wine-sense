import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

type LookupProps = { identity: WinerimOriginalIdentity; onVerified?: (sheet: OriginalSheet) => void;
  buttonLabel?: string; contextKey?: string; disabled?: boolean; onLoadingChange?: (loading: boolean) => void };

const pendingIdentityMessage = (identity: WinerimOriginalIdentity, disabled: boolean) => {
  if (disabled) return 'Ficha pendiente: termina la operación en curso antes de buscar la ficha.';
  const missingName = identity.name == null || (typeof identity.name === 'string' && !identity.name.trim());
  const missingProducer = identity.producer == null || (typeof identity.producer === 'string' && !identity.producer.trim());
  const reasons: string[] = [];
  if (missingName && missingProducer) reasons.push('añade el nombre y la bodega');
  else if (missingName) reasons.push('añade el nombre del vino');
  else if (missingProducer) reasons.push('añade la bodega');
  const vintage = identity.vintage;
  if (vintage != null && ((typeof vintage !== 'string' && typeof vintage !== 'number')
    || (String(vintage).trim() && !/^(19|20)\d{2}$/.test(String(vintage).trim())))) reasons.push('revisa la añada');
  if (Array.isArray(identity.inferredFields)) {
    if (!missingName && identity.inferredFields.some(field => typeof field === 'string' && /^(name|nombre)$/i.test(field))) reasons.push('confirma el nombre del vino');
    if (!missingProducer && identity.inferredFields.some(field => typeof field === 'string' && /^(producer|productor|winery|bodega)$/i.test(field))) reasons.push('confirma la bodega');
    if (identity.inferredFields.some(field => typeof field === 'string' && /^(vintage|anada|añada|year)$/i.test(field))) reasons.push('confirma la añada');
  }
  return reasons.length ? `Ficha pendiente: ${reasons.join('; ')}.`
    : 'Ficha pendiente: revisa los datos de identificación antes de buscar la ficha.';
};

const OriginalSheetLookup = ({ identity, onVerified, buttonLabel, disabled = false, onLoadingChange }: LookupProps) => {
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const verifiedCallback = useRef(onVerified);
  verifiedCallback.current = onVerified;
  const loadingCallback = useRef(onLoadingChange);
  loadingCallback.current = onLoadingChange;
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<WinerimOriginalLookupResult | null>(null);
  const result = useRef<HTMLDivElement>(null);
  const ready = !disabled && canLookupWinerimOriginal(identity);
  useEffect(() => { if (outcome?.status === 'verified') result.current?.focus({ preventScroll: true }); }, [outcome]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); loadingCallback.current?.(false); };
  }, []);
  const lookup = async () => {
    if (controller.current || !ready) return;
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    loadingCallback.current?.(true);
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
      if (mounted.current && controller.current === abort) { controller.current = null; setLoading(false); loadingCallback.current?.(false); }
    }
  };
  if (outcome?.status === 'verified') return <div ref={result} tabIndex={-1} className="min-w-0 outline-none" aria-label={`Ficha original Winerim: ${outcome.sheet.name}`}>
    <p role="status" className="sr-only">Ficha original Winerim verificada para {outcome.sheet.name} {outcome.sheet.vintage}.</p><WinerimOriginalSheet sheet={outcome.sheet} />
  </div>;
  const status = ready ? outcome?.status : 'identity-required';
  return (
    <div className="min-w-0" aria-busy={loading}>
      <div className="flex min-w-0 items-center gap-2">
        <Button type="button" variant="outline" disabled={loading || !ready} aria-label={`Ficha original Winerim: ${identity.name}${identity.vintage ? ` ${identity.vintage}` : ''}${buttonLabel ? `. ${buttonLabel}` : ''}`} onClick={() => void lookup()} className={buttonLabel ? 'h-auto min-h-[44px] min-w-0 flex-1 gap-2 whitespace-normal px-3 py-3 text-left [overflow-wrap:normal]' : 'h-auto min-h-11 min-w-0 flex-1 gap-2 whitespace-normal break-words'}>
          {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin" /> : <BookOpen aria-hidden="true" className="h-4 w-4 shrink-0" />} {buttonLabel || (outcome ? 'Reintentar ficha original Winerim' : 'Ficha original Winerim')}
        </Button>
        {loading && <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Cancelar búsqueda de ficha" title="Cancelar búsqueda de ficha" onClick={() => {
          controller.current?.abort(); controller.current = null; setLoading(false); loadingCallback.current?.(false);
        }}><X aria-hidden="true" className="h-4 w-4" /></Button>}
      </div>
      {loading && <p role="status" className="mt-2 text-xs text-slate-600">Consultando la ficha original de Winerim...</p>}
      {status && <p role="status" className="mt-2 text-xs text-slate-600">{status === 'identity-required' ? pendingIdentityMessage(identity, disabled) : lookupMessages[status]}</p>}
    </div>
  );
};

export const WinerimSheetLookup = ({ identity, onVerified, contextKey, ...options }: LookupProps) => {
  if (!Capacitor.isNativePlatform()) return null;
  const key = JSON.stringify([identity.name, identity.producer, identity.vintage, identity.region, identity.country, identity.inferredFields,
    ...(contextKey === undefined ? [] : [contextKey])]);
  return <OriginalSheetLookup key={key} identity={identity} onVerified={onVerified} {...options} />;
};
