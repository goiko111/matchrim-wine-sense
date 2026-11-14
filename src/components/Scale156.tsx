// 156: «en vez de una línea, que el vino sea un círculo que encaje dentro del círculo que es mi perfil… y me falta
// una línea para saber si está al 50 o al 60 %» (owner, 14-nov). One drawing for every two-ended scale of the app:
// a track with five marks, the wine as a red dot and the person as a ring. When the wine is where the person likes
// it, the dot sits inside the ring; the further apart, the worse that trait fits.
const at = (value: number) => `calc(0.75rem + ${Math.max(0, Math.min(5, value)) / 5} * (100% - 1.5rem))`;

export const ScaleMarks156 = ({ wine = null, you = null, base = null }: { wine?: number | null; you?: number | null;
  /** The profile's starting point (the taste test), drawn as a small grey dot when it differs from today's. */
  base?: number | null }) =>
  <span className="pointer-events-none absolute inset-x-[5.5rem] inset-y-0" aria-hidden="true" data-testid="scale156"
    data-fit={wine !== null && you !== null ? (Math.abs(wine - you) <= 0.75 ? 'inside' : 'apart') : undefined}>
    <span className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-stone-300" />
    {[0, 1.25, 2.5, 3.75, 5].map(mark => <span key={mark} className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2 bg-stone-300" style={{ left: at(mark) }} />)}
    {base !== null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-300" style={{ left: at(base) }} />}
    {wine !== null && <span className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-800" style={{ left: at(wine) }} />}
    {you !== null && <span className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-stone-950" style={{ left: at(you) }} />}
  </span>;

export const ScaleLegend156 = () => <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600" aria-hidden="true">
  <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-full bg-red-800" />Este vino</span>
  <span className="flex items-center gap-1.5"><span className="h-4 w-4 rounded-full border-2 border-stone-950" />Tú</span>
  <span className="basis-full">Cuanto más dentro de tu círculo, más encaja.</span></p>;
