import { useEffect, useState, type ReactNode } from 'react';
import { Calendar, Frown, Grape, MapPin, Meh, Smile, Thermometer, Wine } from 'lucide-react';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { usableStoreSensory138 } from '@/utils/storeEstimate138';
import { storeAffinity139, storeScore139, type StoreRow140 } from '@/utils/storeListing139';
import { compatLines142, loadWinerimDetail142, type WinerimDetail142 } from '@/utils/winerimDetail142';
import { formatCountryName, formatWineType } from '@/utils/wineFormatters';

const grapeNames = (row: PublicGlobalRow103) => [...new Set((row.grapes ?? []).flat(2).flatMap(grape => {
  const name = typeof grape === 'string' ? grape : grape && typeof grape === 'object' ? (grape as { name?: unknown }).name : null;
  return typeof name === 'string' && name.trim() ? [name.trim()] : [];
}))];
const card = 'rounded-2xl border border-stone-200 bg-white';
const heading = 'text-lg font-semibold text-stone-950';

// Two-ended flavour bars: where the wine sits and, when the person has a profile, where they sit.
const axes = [['power', 'potente', 'Ligero', 'Con cuerpo'], ['sweetness', 'dulce', 'Seco', 'Dulce'], ['acidity', 'acidez', 'Suave', 'Fresco y ácido'],
  ['tannin', 'tanico', 'Sedoso', 'Tánico'], ['fruity', 'afrutado', 'Sobrio', 'Afrutado']] as const;

/** Everything Winerim knows about the wine, laid out to be read at a glance. Renders the parts that exist. */
export const WinerimRich142 = ({ row, profile, vintage, onRelated }: { row: PublicGlobalRow103; profile?: MatchrimProfileLike | null;
  vintage?: string | number | null; onRelated?: (wine: StoreRow140) => void }) => {
  const [detail, setDetail] = useState<{ id: number; data: WinerimDetail142 | null } | null>(null);
  useEffect(() => { let live = true; void loadWinerimDetail142(row.id, row.slugname).then(data => { if (live) setDetail({ id: row.id, data }); }); return () => { live = false; }; }, [row.id, row.slugname]);
  const data = detail?.id === row.id ? detail.data : null;
  const attributes = usableStoreSensory138(row);
  const year = vintage ? String(vintage) : row.vintage ? String(row.vintage) : '';
  const facts: Array<[typeof Wine, string]> = ([[Wine, row.type ? formatWineType(row.type) : ''], [MapPin, [row.region, row.country ? formatCountryName(row.country) : ''].filter(Boolean).join(', ')],
    [Grape, grapeNames(row).join(', ')], [Calendar, year ? `Añada ${year}` : ''], [Thermometer, [data?.temperature ? `Sírvelo a ${data.temperature}` : '', data?.alcohol ?? ''].filter(Boolean).join(' · ')]] as Array<[typeof Wine, string]>)
    .filter(([, value]) => value);
  const dot = (value: number) => `calc(${Math.max(0, Math.min(5, value)) * 20}% - ${Math.max(0, Math.min(5, value)) * 0.4}rem)`;
  return <div className="space-y-6" data-testid="winerim-rich142">
    {facts.length > 0 && <ul className={`${card} divide-y divide-stone-100 px-4`} aria-label="Datos del vino" data-testid="winerim-facts140">
      {facts.map(([Icon, value]) => <li key={value} className="flex items-center gap-3 py-3 text-sm text-stone-900"><Icon className="h-5 w-5 shrink-0 text-stone-500" aria-hidden="true" /><span className="min-w-0 [overflow-wrap:anywhere]">{value}</span></li>)}
    </ul>}
    {attributes && <section aria-labelledby={`taste142-${row.id}`}>
      <h4 id={`taste142-${row.id}`} className={heading}>Cómo es</h4>
      <div className="mt-3 space-y-2">{axes.filter(([key]) => !(key === 'tannin' && attributes.tannin === 0)).map(([key, mine, low, high]) => {
        const you = typeof profile?.[mine] === 'number' ? profile[mine] as number : null;
        return <div key={key} className="relative flex h-11 items-center justify-between rounded-full border border-stone-200 bg-white px-4 text-sm"
          role="img" aria-label={`${low} a ${high}: este vino ${attributes[key]} de 5${you !== null ? `, tú ${you.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5` : ''}`}>
          <span className={attributes[key] <= 2 ? 'font-semibold text-stone-950' : 'text-stone-500'} aria-hidden="true">{low}</span>
          <span className={attributes[key] >= 4 ? 'font-semibold text-stone-950' : 'text-stone-500'} aria-hidden="true">{high}</span>
          <span className="pointer-events-none absolute inset-x-[5.5rem] inset-y-0" aria-hidden="true">
            <span className="absolute top-1/2 h-4 w-8 -translate-y-1/2 rounded-full bg-red-800" style={{ left: dot(attributes[key]) }} />
            {you !== null && <span className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-stone-950 bg-white/70" style={{ left: `calc(${Math.max(0, Math.min(5, you)) * 20}% - ${Math.max(0, Math.min(5, you)) * 0.3}rem)` }} />}
          </span>
        </div>; })}</div>
      {profile && <p className="mt-2 flex items-center gap-4 text-xs text-stone-600" aria-hidden="true"><span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-full bg-red-800" />Este vino</span><span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-full border-2 border-stone-950" />Tú</span></p>}
    </section>}
    {data && data.pairings.length > 0 && <section aria-labelledby={`pair142-${row.id}`}>
      <h4 id={`pair142-${row.id}`} className={heading}>Combina muy bien con</h4>
      <ul className="mt-3 flex flex-wrap gap-2">{data.pairings.map(name => <li key={name} className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-800">{name}</li>)}</ul>
    </section>}
    {data && (data.personality || data.nose || data.palate) && <section aria-labelledby={`note142-${row.id}`}>
      <h4 id={`note142-${row.id}`} className={heading}>A qué sabe</h4>
      {data.personality && <p className="mt-2 text-base leading-7 text-stone-800">{data.personality}</p>}
      {(data.nose || data.palate) && <details className="mt-1"><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-red-900">Leer la nota de cata</summary>
        <div className="space-y-2 pb-2 text-sm leading-6 text-stone-700">{data.nose && <p>{data.nose}</p>}{data.palate && <p>{data.palate}</p>}</div></details>}
    </section>}
    {data && (data.story || data.origin) && <section className={`${card} p-4`} aria-labelledby={`story142-${row.id}`}>
      <h4 id={`story142-${row.id}`} className="text-base font-semibold text-stone-950">{row.winery}</h4>
      {data.origin && <p className="mt-1 text-sm leading-6 text-stone-600">{data.origin}</p>}
      {data.story && <details><summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-red-900">La historia de este vino</summary><p className="pb-1 text-sm leading-6 text-stone-700">{data.story}</p></details>}
    </section>}
    {data && onRelated && data.related.length > 0 && <section aria-labelledby={`rel142-${row.id}`}>
      <h4 id={`rel142-${row.id}`} className={heading}>Vinos parecidos</h4>
      <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2" data-testid="winerim-related142">{data.related.map(wine => { const sensory = usableStoreSensory138(wine); const score = sensory ? storeScore139(profile, sensory) : null;
        return <button key={wine.id} type="button" className="w-36 shrink-0 text-left" onClick={() => onRelated(wine)}>
          <NativeWinePhoto98 src={wine.photo} name={wine.name} className="h-44 w-36 rounded-2xl bg-stone-100" />
          <span className="mt-2 block text-xs text-stone-600 [overflow-wrap:anywhere]">{wine.winery}</span>
          <span className="block text-sm font-semibold leading-5 text-stone-950 [overflow-wrap:anywhere]">{wine.name}</span>
          {score !== null && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${score >= 65 ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-800'}`}>{score}/100</span>}
        </button>; })}</div>
    </section>}
  </div>;
};

const faces = { good: [Smile, 'text-emerald-700'], fair: [Meh, 'text-amber-600'], far: [Frown, 'text-stone-500'] } as const;

// 142: one wine sheet for the whole iOS app, with the visual order of the best wine apps and Matchrim's own answer
// in the place of honour: the bottle, «¿me gustará?» beside it, why in plain sentences, then how the wine is.
export const WineSheet142 = ({ row, profile, photo, vintage, actions, onRelated }: { row: PublicGlobalRow103; profile?: MatchrimProfileLike | null;
  photo?: string | null; vintage?: string | number | null; actions?: ReactNode; onRelated?: (wine: StoreRow140) => void }) => {
  const attributes = usableStoreSensory138(row);
  const result = attributes && profile ? storeAffinity139(profile, attributes) : null;
  const ready = result?.state === 'ready' ? result : null;
  const name = [row.name, row.subname].filter(Boolean).join(' ');
  return <article className="pb-4 text-stone-950" data-testid="wine-sheet142">
    <header className="-mx-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 bg-gradient-to-b from-stone-200 to-stone-50 px-4 pb-4 pt-6">
      <NativeWinePhoto98 src={photo || row.photo} ownedCapture={Boolean(photo)} name={name} className="mx-auto h-[260px] w-[130px] !bg-transparent" />
      <div className="min-w-0 text-center" data-testid="wine-verdict142">
        {ready ? <><p className={`text-5xl font-bold tabular-nums leading-none ${ready.score >= 65 ? 'text-emerald-800' : 'text-stone-800'}`} aria-label={`Afinidad orientativa: ${ready.score} de 100`}>{ready.score}<span className="text-lg font-semibold text-stone-500">/100</span></p>
          <p className="mt-2 text-lg font-semibold leading-6">{ready.title}</p><p className="mt-1 text-xs text-stone-600">para tu paladar</p></>
          : !profile ? <><p className="text-base font-semibold leading-6">¿Te gustará?</p><a href="/matchrim" className="mt-2 inline-flex min-h-11 items-center rounded-full bg-red-900 px-4 text-sm font-semibold text-white">Haz el test · 2 min</a></>
            : <p className="text-sm leading-6 text-stone-600">Aún no tenemos sus datos de sabor para decirte cuánto encaja contigo.</p>}
      </div>
    </header>
    <div className="pt-4">
      <p className="text-sm text-stone-600 [overflow-wrap:anywhere]">{row.winery}</p>
      <h3 className="text-2xl font-bold leading-8 [overflow-wrap:anywhere]">{name}</h3>
      {(vintage || row.vintage) && <p className="mt-1 inline-block rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">{String(vintage || row.vintage)}</p>}
    </div>
    {actions && <div className="mt-4">{actions}</div>}
    {ready && <section className={`${card} mt-6 px-4 py-2`} aria-labelledby={`why142-${row.id}`} data-testid="wine-why142">
      <h4 id={`why142-${row.id}`} className="pt-2 text-base font-semibold">Por qué {ready.score >= 65 ? 'encaja contigo' : 'puede no encajarte'}</h4>
      <ul className="divide-y divide-stone-100">{compatLines142(ready.dimensions).map(line => { const [Face, tone] = faces[line.face];
        return <li key={line.key} className="flex items-center gap-3 py-3 text-sm leading-5"><Face className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />{line.text}</li>; })}</ul>
      <p className="pb-2 text-xs leading-5 text-stone-500">Estimación con los datos de Winerim. Compara el estilo del vino con tus gustos; no es una nota de calidad.</p>
    </section>}
    <div className="mt-6"><WinerimRich142 row={row} profile={profile} vintage={vintage} onRelated={onRelated} /></div>
  </article>;
};
