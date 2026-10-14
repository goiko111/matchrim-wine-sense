import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WinerimOriginalSheet } from './WinerimOriginalSheet';
import { findOriginalWinerimWineForLabel, type WinerimLabelLookupInput } from '@/services/winerimApi';
import { createWinerimOriginalSheet, type WinerimOriginalSheet as OriginalSheet } from '@/utils/winerimOriginalSheet';

export const WinerimSheetLookup = ({ identity }: { identity: WinerimLabelLookupInput }) => {
  const key = JSON.stringify([identity.name, identity.producer, identity.vintage, identity.region, identity.country]);
  const generation = useRef(0);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sheet, setSheet] = useState<OriginalSheet | null>(null);
  const result = useRef<HTMLDivElement>(null);
  useEffect(() => { if (sheet) result.current?.focus({ preventScroll: true }); }, [sheet]);
  useEffect(() => {
    generation.current += 1;
    pending.current = false;
    setLoading(false);
    setSearched(false);
    setSheet(null);
    return () => { generation.current += 1; controller.current?.abort(); };
  }, [key]);
  if (!Capacitor.isNativePlatform()) return null;
  const lookup = async () => {
    if (pending.current) return;
    pending.current = true;
    const request = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    try {
      const match = await findOriginalWinerimWineForLabel(identity, abort.signal);
      if (request !== generation.current) return;
      setSheet(match ? createWinerimOriginalSheet(match) : null);
      setSearched(true);
    } catch {
      if (request === generation.current) { setSheet(null); setSearched(true); }
    } finally {
      if (request === generation.current) { pending.current = false; setLoading(false); }
    }
  };
  if (sheet) return <div ref={result} tabIndex={-1} className="min-w-0 outline-none" aria-label={`Ficha original Winerim: ${sheet.name}`}>
    <p role="status" className="sr-only">Ficha Winerim verificada para {sheet.name} {sheet.vintage}.</p><WinerimOriginalSheet sheet={sheet} />
  </div>;
  return (
    <div className="min-w-0" aria-busy={loading}>
      <Button type="button" variant="outline" disabled={loading} aria-label={`Ficha original Winerim: ${identity.name}${identity.vintage ? ` ${identity.vintage}` : ''}`} onClick={() => void lookup()} className="h-auto min-h-11 w-full gap-2 whitespace-normal">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />} Ficha original Winerim
      </Button>
      {searched && <p role="status" className="mt-2 text-xs text-slate-600">No hay una ficha Winerim verificada para esta referencia y añada. Revisa la identificación o vuelve a intentarlo.</p>}
    </div>
  );
};
