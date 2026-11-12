import { useEffect, useState, type ReactNode } from 'react';
import { Calendar, Frown, Grape, MapPin, Meh, Smile, Thermometer, Wine } from 'lucide-react';
import { NativeWinePhoto98 } from '@/components/NativeWinePhoto98';
import type { PublicGlobalRow103 } from '@/utils/nativeGlobalCatalogue103';
import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import { buildConsumerAffinity } from '@/utils/consumerAffinity95';
import { calculateLocalMatchrimAffinity } from '@/utils/wineAffinityExplanation';
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
const more = 'flex min-h-11 cursor-pointer items-center text-sm font-semibold text-red-900';

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
  const pairs = (items: Array<[string, string | null | undefined]>) => items.filter((item): item is [string, string] => Boolean(item[1]));
  const note144 = pairs([['A la vista', data?.appearance], ['En nariz', data?.nose], ['En boca', data?.palate], ['Cuerpo', data?.body], ['Estructura', data?.structure], ['Final', data?.finish]]);
  const place144 = pairs([['La bodega', data?.wineryStory], ['El viñedo', data?.vineyard], ['El clima', data?.climate]]);
  const made144 = pairs([['', data?.style], ['', data?.aging], ['', data?.winemaking]]);
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
            {you !== null && <span className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-stone-950 bg-white shadow" style={{ left: `calc(${Math.max(0, Math.min(5, you)) * 20}% - ${Math.max(0, Math.min(5, you)) * 0.3}rem)` }} />}
          </span>
        </div>; })}</div>
      {data?.agingLevel != null && <div className="relative mt-2 flex h-11 items-center justify-between rounded-full border border-stone-200 bg-white px-4 text-sm" role="img" aria-label={`Joven a con crianza: este vino ${data.agingLevel} de 5`} data-testid="winerim-aging144">
        <span className={data.agingLevel <= 2 ? 'font-semibold text-stone-950' : 'text-stone-500'} aria-hidden="true">Joven</span><span className={data.agingLevel >= 4 ? 'font-semibold text-stone-950' : 'text-stone-500'} aria-hidden="true">Con crianza</span>
        <span className="pointer-events-none absolute inset-x-[5.5rem] inset-y-0" aria-hidden="true"><span className="absolute top-1/2 h-4 w-8 -translate-y-1/2 rounded-full bg-red-800" style={{ left: dot(data.agingLevel) }} /></span>
      </div>}
      {profile && <p className="mt-2 flex items-center gap-4 text-xs text-stone-600" aria-hidden="true"><span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded-full bg-red-800" />Este vino</span><span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-full border-2 border-stone-950" />Tú</span></p>}
    </section>}
    {data && data.pairings.length > 0 && <section aria-labelledby={`pair142-${row.id}`}>
      <h4 id={`pair142-${row.id}`} className={heading}>Combina muy bien con</h4>
      <ul className="mt-3 flex flex-wrap gap-2">{data.pairings.map(name => <li key={name} className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-800">{name}</li>)}</ul>
      {data.pairingLine && <p className="mt-3 text-sm leading-6 text-stone-700">{data.pairingLine}</p>}
    </section>}
    {data && (data.personality || note144.length > 0) && <section aria-labelledby={`note142-${row.id}`}>
      <h4 id={`note142-${row.id}`} className={heading}>A qué sabe</h4>
      {data.personality && <p className="mt-2 text-base leading-7 text-stone-800">{data.personality}</p>}
      {/* 144: the whole tasting note of Winerim (sight, nose, mouth, body, structure, finish), each part with its name. */}
      {note144.length > 0 && <details className="mt-1"><summary className={more}>Leer la nota de cata</summary>
        <dl className="space-y-3 pb-2 text-sm leading-6 text-stone-700">{note144.map(([label, value]) => <div key={label}><dt className="font-semibold text-stone-950">{label}</dt><dd>{value}</dd></div>)}</dl></details>}
    </section>}
    {data && made144.length > 0 && <section className={`${card} px-4 py-2`} aria-labelledby={`made144-${row.id}`} data-testid="winerim-made144">
      <h4 id={`made144-${row.id}`} className="pt-2 text-base font-semibold text-stone-950">Cómo se hace</h4>
      {data.style && <p className="mt-1 text-sm leading-6 text-stone-600">{data.style}</p>}
      {(data.aging || data.winemaking) && <details><summary className={more}>Crianza y elaboración</summary>
        <div className="space-y-2 pb-2 text-sm leading-6 text-stone-700">{data.aging && <p>{data.aging}</p>}{data.winemaking && <p>{data.winemaking}</p>}</div></details>}
    </section>}
    {data && (data.story || data.origin || place144.length > 0) && <section className={`${card} px-4 py-2`} aria-labelledby={`story142-${row.id}`}>
      <h4 id={`story142-${row.id}`} className="pt-2 text-base font-semibold text-stone-950">{row.winery}</h4>
      {data.origin && <p className="mt-1 text-sm leading-6 text-stone-600">{data.origin}</p>}
      {place144.length > 0 && <details data-testid="winerim-place144"><summary className={more}>La bodega y el viñedo</summary>
        <dl className="space-y-3 pb-2 text-sm leading-6 text-stone-700">{place144.map(([label, value]) => <div key={label}><dt className="font-semibold text-stone-950">{label}</dt><dd>{value}</dd></div>)}</dl></details>}
      {data.story && <details><summary className={more}>La historia de este vino</summary><p className="pb-2 text-sm leading-6 text-stone-700">{data.story}</p></details>}
    </section>}
    {data?.curiosity && <aside className="rounded-2xl bg-amber-50 px-4 py-3" aria-label="Curiosidad" data-testid="winerim-curiosity144">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">¿Sabías que…?</p><p className="mt-1 text-sm leading-6 text-stone-800">{data.curiosity}</p></aside>}
    {data && onRelated && data.related.length > 0 && <section aria-labelledby={`rel142-${row.id}`}>
      <h4 id={`rel142-${row.id}`} className={heading}>Vinos parecidos</h4>
      <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2" data-testid="winerim-related142">{data.related.map(wine => { const sensory = usableStoreSensory138(wine); const score = sensory ? storeScore139(profile, sensory) : null;
        return <button key={wine.id} type="button" className="w-36 shrink-0 text-left" onClick={() => onRelated(wine)}>
          <NativeWinePhoto98 src={wine.photo} name={wine.name} type={wine.type} className="h-44 w-36 rounded-2xl bg-stone-100" />
          <span className="mt-2 block text-xs text-stone-600 [overflow-wrap:anywhere]">{wine.winery}</span>
          <span className="block text-sm font-semibold leading-5 text-stone-950 [overflow-wrap:anywhere]">{wine.name}</span>
          {score !== null && <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${score >= 65 ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-800'}`}>{score}/100</span>}
        </button>; })}</div>
    </section>}
  </div>;
};

const faces = { good: [Smile, 'text-emerald-700'], fair: [Meh, 'text-amber-600'], far: [Frown, 'text-stone-500'] } as const;

// 144: «Por qué encaja contigo» listed, under that one title, also what does not fit. Two short lists now: what
// fits, and what the person may like less. Every wine sheet of the app (search, scan, saved wine) uses this block.
export const WhyLines144 = ({ dimensions, note }: { dimensions: Parameters<typeof compatLines142>[0]; note: string }) => {
  const lines = compatLines142(dimensions), fits = lines.filter(line => line.face === 'good'), rest = lines.filter(line => line.face !== 'good');
  const group = (title: string, items: typeof lines) => items.length > 0 && <div>
    <h4 className="pt-2 text-base font-semibold text-stone-950">{title}</h4>
    <ul className="divide-y divide-stone-100">{items.map(line => { const [Face, tone] = faces[line.face];
      return <li key={line.key} className="flex items-center gap-3 py-3 text-sm leading-5 text-stone-900"><Face className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden="true" />{line.text}</li>; })}</ul>
  </div>;
  return <>{group('Por qué encaja contigo', fits)}{group('Lo que podría gustarte menos', rest)}<p className="pb-2 pt-1 text-xs leading-5 text-stone-500">{note}</p></>;
};

// 142: one wine sheet for the whole iOS app, with the visual order of the best wine apps and Matchrim's own answer
// in the place of honour: the bottle, «¿me gustará?» beside it, why in plain sentences, then how the wine is.
export const WineSheet142 = ({ row, profile, photo, vintage, actions, onRelated, catalogueRule = false }: { row: PublicGlobalRow103; profile?: MatchrimProfileLike | null;
  photo?: string | null; vintage?: string | number | null; actions?: ReactNode; onRelated?: (wine: StoreRow140) => void;
  /** 144: a wine just scanned and linked to its catalogue sheet was scored by the catalogue comparison (which counts a
      tannin of 0); reopened from Home it must say the same number, so the sheet compares the same way. */
  catalogueRule?: boolean }) => {
  const attributes = usableStoreSensory138(row);
  const result = !attributes || !profile ? null : catalogueRule
    ? buildConsumerAffinity({ catalogIdentityLinked: true, sensorySource: 'catalog', attributes, profile, score: calculateLocalMatchrimAffinity(profile, attributes) })
    : storeAffinity139(profile, attributes);
  const ready = result?.state === 'ready' ? result : null;
  const name = [row.name, row.subname].filter(Boolean).join(' ');
  return <article className="pb-4 text-stone-950" data-testid="wine-sheet142">
    <header className="-mx-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 bg-gradient-to-b from-stone-200 to-stone-50 px-4 pb-4 pt-6">
      <NativeWinePhoto98 src={photo || row.photo} ownedCapture={Boolean(photo)} name={name} type={row.type} className="mx-auto h-[260px] w-[130px] !bg-transparent" />
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
    {ready && <section className={`${card} mt-6 px-4 py-2`} aria-label="Por qué" data-testid="wine-why142">
      <WhyLines144 dimensions={ready.dimensions} note="Estimación con los datos de Winerim. Compara el estilo del vino con tus gustos; no es una nota de calidad." />
    </section>}
    <div className="mt-6"><WinerimRich142 row={row} profile={profile} vintage={vintage} onRelated={onRelated} /></div>
  </article>;
};
