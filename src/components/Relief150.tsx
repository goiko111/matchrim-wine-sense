// 150: «the app looks flat: everything is at the same level and you have to read it all to know what each thing is»
// (the owner's wife, 12-nov). These are the few pieces that let the eye tell things apart before reading:
// the score as a coloured tag with four levels, a bottle drawn in the colour of the wine where there is no photo,
// and one look for section titles and for cards that stand out from the page.

/** The four answers to «¿me gustará?» (same cuts as the verdict titles: 80, 65, 45), as tag colours. */
export const scoreTone150 = (score: number): string => score >= 80 ? 'bg-emerald-700 text-white'
  : score >= 65 ? 'bg-emerald-100 text-emerald-900' : score >= 45 ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-700';

export const ScorePill150 = ({ score, estimate = false, large = false, className = '' }: { score: number; estimate?: boolean; large?: boolean; className?: string }) =>
  <span aria-hidden="true" data-testid="score-pill150" data-level={score >= 80 ? 'top' : score >= 65 ? 'good' : score >= 45 ? 'maybe' : 'low'}
    className={`inline-flex shrink-0 items-baseline justify-center rounded-full font-bold tabular-nums leading-none ${large ? 'min-w-14 px-3 py-2 text-lg' : 'min-w-11 px-2.5 py-1.5 text-base'} ${scoreTone150(score)} ${className}`}>
    {estimate ? '≈' : ''}{score}<span className={`font-semibold opacity-80 ${large ? 'text-xs' : 'text-[10px]'}`}>/100</span></span>;

type Tone = { glass: string; back: string; label: string };
const tones: Record<string, Tone> = {
  tinto: { glass: '#7a1f2e', back: '#f6e9ea', label: 'Tinto' }, blanco: { glass: '#d8be55', back: '#faf5df', label: 'Blanco' },
  rosado: { glass: '#e58fa0', back: '#fcecef', label: 'Rosado' }, espumoso: { glass: '#2f5d3a', back: '#e7efe6', label: 'Espumoso' },
  dulce: { glass: '#b0702c', back: '#f8eddf', label: 'Dulce' }, generoso: { glass: '#8a5a2b', back: '#f4ebe1', label: 'Generoso' },
};
const none: Tone = { glass: '#a8a29e', back: '#f1efed', label: '' };
/** The wine's colour from whatever the catalogue calls its type («Tinto», «red», «Espumoso», «fortificado»…). */
export const wineTone150 = (type?: string | null): Tone => {
  const value = (type ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!value) return none;
  if (/espum|cava|champ|sparkl|burbuj/.test(value)) return tones.espumoso;
  if (/rosad|rose|rosat/.test(value)) return tones.rosado;
  if (/blanc|white|bianc/.test(value)) return tones.blanco;
  if (/generos|fortific|jerez|sherry|oporto|port|fino|vermut/.test(value)) return tones.generoso;
  if (/dulce|sweet|dessert|licor/.test(value)) return tones.dulce;
  if (/tint|red|ross|negr/.test(value)) return tones.tinto;
  return none;
};

/** A bottle in the wine's colour, for the places where there is no photo (it was a grey box that said «Sin foto»). */
export const Bottle150 = ({ type }: { type?: string | null }) => {
  const tone = wineTone150(type);
  return <span className="flex h-full w-full items-center justify-center" style={{ background: tone.back }} data-testid="bottle150" data-tone={tone.label || 'sin tipo'}>
    <svg viewBox="0 0 40 110" className="h-[78%] max-h-32 w-auto" aria-hidden="true">
      <path d="M16 2h8v22c0 5 8 9 8 20v56a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V44c0-11 8-15 8-20z" fill={tone.glass} />
      <rect x="15" y="1" width="10" height="9" rx="1.5" fill="#1c1917" opacity=".55" />
      <rect x="8" y="58" width="24" height="26" fill="#fff" opacity=".9" />
      <rect x="12" y="64" width="16" height="2.5" rx="1" fill={tone.glass} opacity=".7" /><rect x="14" y="70" width="12" height="2" rx="1" fill="#78716c" opacity=".5" />
      <path d="M11 46c0-7 3-10 5-14v70h-3a2 2 0 0 1-2-2z" fill="#fff" opacity=".18" />
    </svg><span className="sr-only">Sin foto</span></span>;
};

/** A small dot in the wine's colour with its type, so «tinto / blanco / rosado» is seen and not read. */
export const TypeDot150 = ({ type, className = '' }: { type?: string | null; className?: string }) => {
  const tone = wineTone150(type);
  return tone.label ? <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 ${className}`} style={{ background: tone.glass }} /> : null;
};

/** Page behind the cards, a card that stands out from it, and a section title. */
export const page150 = 'bg-[#f3efe9]';
export const card150 = 'rounded-2xl bg-white shadow-[0_1px_2px_rgba(41,37,36,.06),0_6px_16px_-8px_rgba(41,37,36,.18)]';
export const title150 = 'text-[22px] font-bold leading-7 tracking-tight text-stone-950';
