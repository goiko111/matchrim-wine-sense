import { Capacitor } from '@capacitor/core';
import { ExternalLink, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WinerimOriginalSheet as OriginalSheet } from '@/utils/winerimOriginalSheet';

export const WinerimOriginalSheet = ({ sheet }: { sheet?: OriginalSheet | null }) => {
  if (!sheet || !Capacitor.isNativePlatform()) return null;
  return (
    <section className="min-w-0 break-words border-y border-stone-200 py-4" aria-label="Ficha original Winerim" data-testid="winerim-original-sheet">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-900"><Wine className="h-4 w-4" /> Ficha Winerim</div>
      <p className="mt-2 font-semibold text-slate-950">{sheet.name}</p>
      <dl className="mt-2 grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Bodega</dt><dd>{sheet.producer || 'Sin dato'}</dd>
        <dt className="text-slate-500">Añada</dt><dd>{sheet.vintage || 'Sin dato'}</dd>
        <dt className="text-slate-500">Región</dt><dd>{sheet.region || 'Sin dato'}</dd>
        <dt className="text-slate-500">Uvas</dt><dd>{sheet.grapes.join(', ') || 'Sin dato'}</dd>
      </dl>
      <p className="mt-2 text-xs text-slate-500">Datos del catálogo Winerim. La afinidad personal se calcula por separado en Matchrim.</p>
      {sheet.url ? <Button asChild variant="outline" className="mt-3 h-auto min-h-11 whitespace-normal text-left">
        <a href={sheet.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Ver ficha original Winerim</a>
      </Button> : <p role="status" className="mt-3 text-xs text-slate-500">Enlace de la ficha original pendiente de verificar.</p>}
    </section>
  );
};
