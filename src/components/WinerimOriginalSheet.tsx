import { Capacitor } from '@capacitor/core';
import { ExternalLink, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateWinerimOriginalSheetUrl, validateWinerimOriginalSensory, type WinerimOriginalSheet as OriginalSheet } from '@/utils/winerimOriginalSheet';

export const WinerimOriginalSheet = ({ sheet }: { sheet?: OriginalSheet | null }) => {
  if (!sheet || !Capacitor.isNativePlatform()) return null;
  const url = validateWinerimOriginalSheetUrl(sheet.id, sheet.url);
  const verified = sheet.detailVerified === true && Boolean(url);
  const sensory = verified ? validateWinerimOriginalSensory(sheet.sensoryAttributes) : null;
  return (
    <section className="min-w-0 break-words border-y border-stone-200 py-4" aria-label="Ficha original Winerim" data-testid="winerim-original-sheet">
      <div className="flex items-center gap-2 text-sm font-semibold text-red-900"><Wine className="h-4 w-4" /> Ficha Winerim</div>
      <p className="mt-2 font-semibold text-slate-950">{sheet.name}</p>
      <dl className="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        <dt className="text-slate-500">Bodega</dt><dd>{sheet.producer || 'Sin dato'}</dd>
        <dt className="text-slate-500">Añada</dt><dd>{sheet.vintage || 'Sin dato'}</dd>
        <dt className="text-slate-500">Región</dt><dd>{sheet.region || 'Sin dato'}</dd>
        <dt className="text-slate-500">Uvas</dt><dd>{sheet.grapes.join(', ') || 'Sin dato'}</dd>
      </dl>
      <p className="mt-2 text-xs text-slate-500">{verified ? 'Identidad contrastada con el detalle original de Winerim.' : 'Datos del catálogo Winerim.'} La afinidad personal se calcula por separado en Matchrim.</p>
      {verified && (sensory ? <div className="mt-3">
        <p className="text-xs font-semibold text-slate-700">Atributos de la ficha original</p>
        <dl className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-xs text-slate-600">
          {([['power', 'Potencia'], ['acidity', 'Acidez'], ['sweetness', 'Dulzor'], ['tannin', 'Tanino'], ['fruity', 'Fruta']] as const).map(([key, label]) =>
            <div key={key} className="contents"><dt>{label}</dt><dd>{sensory[key]}/5</dd></div>)}
        </dl>
      </div> : <p className="mt-2 text-xs text-slate-500">La ficha original no aporta los cinco atributos sensoriales válidos. No se recalcula la afinidad a partir de esta ficha.</p>)}
      {url ? <Button asChild variant="outline" className="mt-3 h-auto min-h-11 max-w-full whitespace-normal break-words text-left">
        <a href={url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"><ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" /> Ver ficha original Winerim</a>
      </Button> : <p role="status" className="mt-3 text-xs text-slate-500">Enlace de la ficha original pendiente de verificar. Los datos de catálogo no confirman una ficha pública.</p>}
    </section>
  );
};
