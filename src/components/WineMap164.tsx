import { useEffect, useState } from 'react';
import { ChevronRight, MapPinned } from 'lucide-react';
import { loadRegions164, mapUrl164, matchRegion164, nearby164, tastedMap164, type Region164 } from '@/utils/wineMap164';

const link = 'flex min-h-11 items-center gap-1 text-sm font-semibold text-red-900 underline underline-offset-4';
const chip = 'inline-flex min-h-11 items-center rounded-full bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-[0_1px_2px_rgba(41,37,36,.08)] ring-1 ring-stone-200';
// «Getariako Txakolina / Txakolí de Getaria» → the Castilian form, which is the second one in the map's names.
const short = (name: string) => name.split(' / ')[1] ?? name;
const useRegions = () => { const [regions, setRegions] = useState<Region164[]>([]);
  useEffect(() => { let live = true; void loadRegions164().then(list => { if (live) setRegions(list); }); return () => { live = false; }; }, []); return regions; };

// 164: «De dónde viene» on a wine sheet — the zone on the Winerim map and the denominations around it.
export const WineOrigin164 = ({ region, country }: { region?: string | null; country?: string | null }) => {
  const regions = useRegions();
  const zone = matchRegion164(regions, region, country);
  if (!zone) return null;
  const around = nearby164(regions, zone);
  return <section className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(41,37,36,.08)] ring-1 ring-stone-100" aria-labelledby={`origin164-${zone.deeplink}`} data-testid="wine-origin164">
    <h4 id={`origin164-${zone.deeplink}`} className="text-lg font-semibold text-stone-950">De dónde viene</h4>
    <p className="mt-1 flex items-start gap-2 text-base leading-6 text-stone-800"><MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-red-900" aria-hidden="true" />
      <span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-semibold">{zone.name}</span>{zone.parent ? `, dentro de ${zone.parent}` : ''}{zone.country ? ` · ${zone.country}` : ''}</span></p>
    <a href={mapUrl164(zone)} target="_blank" rel="noreferrer" className={link} data-testid="wine-origin-map164">Ver {zone.name} en el mapa<ChevronRight className="h-4 w-4" aria-hidden="true" /></a>
    {around.length > 0 && <div className="mt-1 border-t border-stone-100 pt-2"><p className="text-sm text-stone-600">Zonas vecinas</p>
      <ul className="mt-2 flex flex-wrap gap-2" data-testid="wine-origin-near164">{around.map(near => <li key={near.deeplink}><a href={mapUrl164(near)} target="_blank" rel="noreferrer" className={chip}>{short(near.name)}</a></li>)}</ul></div>}
  </section>;
};

// 164: «Tu mapa del vino» on the profile — the zones of the wines you have rated and where to look next.
export const TastedMap164 = ({ wines }: { wines: Array<{ region?: string | null; country?: string | null; rating?: string | null }> }) => {
  const regions = useRegions();
  const { tasted, favourite, next } = tastedMap164(regions, wines);
  if (!tasted.length) return null;
  return <section aria-labelledby="tasted-map164" data-testid="tasted-map164">
    <h2 id="tasted-map164" className="text-[20px] font-bold leading-7 tracking-tight text-stone-950">Tu mapa del vino</h2>
    <p className="mt-1 text-sm leading-5 text-stone-600">Has probado vinos de {tasted.length} zona{tasted.length !== 1 ? 's' : ''}. Toca una para verla en el mapa de Winerim.</p>
    <ul className="mt-3 divide-y divide-stone-100 rounded-2xl bg-white shadow-[0_1px_2px_rgba(41,37,36,.08)]">
      {tasted.slice(0, 8).map(zone => <li key={zone.region.deeplink}><a href={mapUrl164(zone.region)} target="_blank" rel="noreferrer" className="flex min-h-14 items-center gap-3 px-4 py-3">
        <span className={`h-3 w-3 shrink-0 rounded-full ${zone.loved > zone.disliked ? 'bg-emerald-600' : zone.disliked > zone.loved ? 'bg-stone-400' : 'bg-amber-500'}`} aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block text-base font-semibold text-stone-950 [overflow-wrap:anywhere]">{zone.region.name}</span>
          <span className="block text-sm leading-5 text-stone-600">{zone.wines} vino{zone.wines !== 1 ? 's' : ''}{zone.loved ? ` · ${zone.loved} te ${zone.loved !== 1 ? 'encantaron' : 'encantó'}` : ''}{zone.disliked ? ` · ${zone.disliked} no ${zone.disliked !== 1 ? 'fueron' : 'fue'} para ti` : ''}</span></span>
        <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" /></a></li>)}
    </ul>
    {tasted.length > 8 && <p className="mt-2 text-xs leading-5 text-stone-500">Y {tasted.length - 8} zona{tasted.length - 8 !== 1 ? 's' : ''} más.</p>}
    {favourite && next.length > 0 && <div className="mt-4" data-testid="tasted-next164"><p className="text-sm leading-5 text-stone-700">Te gusta <span className="font-semibold">{favourite.region.name}</span>. Prueba al lado:</p>
      <ul className="mt-2 flex flex-wrap gap-2">{next.map(near => <li key={near.deeplink}><a href={mapUrl164(near)} target="_blank" rel="noreferrer" className={chip}>{short(near.name)}</a></li>)}</ul></div>}
  </section>;
};
