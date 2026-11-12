import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface TasteRow { key: string; label: string; value: number; description: string }
interface Props {
  /** The sentence that says what this person likes; it carries its own test id. */
  sentence: ReactNode;
  mainStyle?: string | null;
  rows: TasteRow[];
  baseValues?: Record<string, number> | null;
  learnedSamples: number;
  styles: Array<{ id: string | number; name: string; description?: string | null }>;
  grapes: string[];
  regions: string[];
  wines: ReactNode;
  learning: ReactNode;
  passport: ReactNode;
  profileName: string;
  onStyle: (name: string) => void;
  onAllStyles: () => void;
  onRetake: () => void;
}

// The same ends as the wine sheet's «Cómo es», so «Tú» means the same thing in both places.
const ends147: Record<string, [string, string]> = { potente: ['Ligero', 'Con cuerpo'], dulce: ['Seco', 'Dulce'], acidez: ['Suave', 'Fresco y ácido'], tanico: ['Sedoso', 'Tánico'], afrutado: ['Sobrio', 'Afrutado'] };
const chip = 'rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800';
const heading = 'text-lg font-semibold text-stone-950';

// 138: the iOS profile was seven screens of pastel cards, emoji and «RANGO WINERIM · Pot. Ac. Dul.» scales. It now
// follows Home: what you like in one sentence, five plain traits, and short lists for styles, grapes and regions.
export const NativeProfileBody138 = ({ sentence, mainStyle, rows, baseValues, learnedSamples, styles, grapes, regions,
  wines, learning, passport, profileName, onStyle, onAllStyles, onRetake }: Props) => (
  <div className="space-y-8 text-stone-950" data-testid="native-profile138">
    {/* 147: the profile speaks the visual language of the wine sheet (142): soft header, round cards, and the same
        two-ended scales with the «Tú» mark the person sees on every wine. */}
    <section className="rounded-2xl bg-gradient-to-b from-stone-200 to-stone-50 px-5 py-6" aria-label="Tu paladar">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Tu paladar</p>
      <div className="mt-2 text-xl font-semibold leading-7 text-stone-950">{sentence}</div>
      {mainStyle && <p className="mt-3 text-sm leading-6 text-stone-700">Estilos que más te van: <span className="font-semibold text-stone-950">{mainStyle}</span></p>}
    </section>

    {rows.length > 0 && <section aria-labelledby="profile-traits138">
      <h2 id="profile-traits138" className={heading}>Tus gustos, rasgo a rasgo</h2>
      <dl className="mt-3 space-y-2">
        {rows.map(row => { const base = baseValues?.[row.key], [low, high] = ends147[row.key] ?? ['Menos', 'Más'];
          const at = (value: number) => `calc(${Math.max(0, Math.min(5, value)) * 20}% - ${Math.max(0, Math.min(5, value)) * 0.3}rem)`;
          return <div key={row.key}>
            <dt className="sr-only">{row.label}</dt>
            <dd className="relative flex h-11 items-center justify-between rounded-full border border-stone-200 bg-white px-4 text-sm" role="meter" aria-label={`${row.label}: perfil actual`}
              aria-valuemin={0} aria-valuemax={5} aria-valuenow={row.value}
              aria-valuetext={`${row.description}; ${row.value.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5${typeof base === 'number' && learnedSamples > 0 ? `; test inicial: ${base.toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5` : ''}`}>
              <span className={row.value <= 2 ? 'font-semibold text-stone-950' : 'text-stone-500'} aria-hidden="true">{low}</span>
              <span className={row.value >= 3.5 ? 'font-semibold text-stone-950' : 'text-stone-500'} aria-hidden="true">{high}</span>
              <span className="pointer-events-none absolute inset-x-[5.5rem] inset-y-0" aria-hidden="true">
                {typeof base === 'number' && learnedSamples > 0 && base !== row.value && <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-stone-300" style={{ left: at(base) }} />}
                <span className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-[3px] border-stone-950 bg-white shadow" style={{ left: at(row.value) }} />
              </span>
            </dd>
          </div>; })}
      </dl>
      {learnedSamples > 0 && <p className="mt-2 text-xs leading-5 text-stone-500">El círculo son tus gustos de hoy, ajustados con {learnedSamples} vino{learnedSamples !== 1 ? 's' : ''} que has valorado. El punto gris es tu test inicial.</p>}
    </section>}

    {styles.length > 0 && <section aria-labelledby="profile-styles138">
      <div className="flex items-center justify-between gap-3"><h2 id="profile-styles138" className={heading}>Estilos que te van</h2>
        <button type="button" className="min-h-11 text-sm font-semibold text-red-900" onClick={onAllStyles}>Ver todos</button></div>
      <ul className="mt-1 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {styles.map((style, index) => <li key={style.id}>
          <button type="button" className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left" onClick={() => onStyle(style.name)}>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-base font-semibold">{style.name}
              {index === 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-900">El que más</span>}</span>
              {style.description && <span className="mt-1 block text-sm leading-5 text-stone-600">{style.description}</span>}</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
          </button></li>)}
      </ul>
    </section>}

    {grapes.length > 0 && <section aria-labelledby="profile-grapes138">
      <h2 id="profile-grapes138" className={heading}>Uvas que suelen gustarte</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">Son las uvas de los vinos que más encajan contigo, de cualquier color. Si ves alguna en una carta, es buena pista.</p>
      <ul className="mt-3 flex flex-wrap gap-2">{grapes.map(grape => <li key={grape} className={chip}>{grape}</li>)}</ul>
    </section>}

    {regions.length > 0 && <section aria-labelledby="profile-regions138">
      <h2 id="profile-regions138" className={heading}>Regiones para explorar</h2>
      <ul className="mt-3 flex flex-wrap gap-2">{regions.map(region => <li key={region} className={chip}>{region}</li>)}</ul>
    </section>}

    {wines}

    <section className="rounded-2xl border border-stone-200 bg-white px-4 [&>details:first-child]:border-t-0 [&>details]:border-b-0" aria-label="Más sobre tu perfil">
      {learning}
      {passport}
      {profileName && <p className="border-t border-stone-200 py-4 text-sm leading-6 text-stone-700 first:border-t-0">En un restaurante con Winerim, di tu código <span className="font-semibold text-red-900">{profileName}</span> y verás solo los vinos que encajan contigo.</p>}
    </section>

    <button type="button" className="flex min-h-12 w-full items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900" onClick={onRetake}>Repetir el test de gustos</button>
  </div>
);
