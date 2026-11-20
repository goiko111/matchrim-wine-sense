import { useState } from 'react';
import { Bookmark, Camera, Check, Home, Images, Minus, ScrollText, ThumbsDown, ThumbsUp, Utensils, Wine } from 'lucide-react';
import { QuizPhoto157 } from '@/components/QuizPhoto157';

// 162 (owner's video of the 159: the tour photos «cantan… muy de banco de fotos», the guide should be «más
// interactiva»; he chose «pantallas reales»). Each step of the tour is now a small piece of the app itself, drawn
// with the same shapes and words as the real screen, and it answers to the finger: nothing here is saved or sent.
const pill = (score: number) => <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${score >= 80 ? 'bg-emerald-700 text-white' : score >= 65 ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-700'}`}>{score}<span className="text-[10px] font-semibold opacity-80">/100</span></span>;
const frame = 'flex h-full flex-col justify-center gap-2 rounded-2xl bg-white p-3 ring-1 ring-inset ring-stone-200';
const hint = 'text-center text-xs font-medium text-red-900';
const WINES = [{ name: 'Un albariño', place: 'Blanco · Rías Baixas', price: '24 €', plain: 88, meat: 61 }, { name: 'Un rioja crianza', place: 'Tinto · Rioja', price: '22 €', plain: 74, meat: 90 },
  { name: 'Un ribera roble', place: 'Tinto · Ribera del Duero', price: '26 €', plain: 58, meat: 79 }] as const;
const Row = ({ name, place, score }: { name: string; place: string; score: number }) => <li className="flex items-center gap-2 py-1.5">
  <span className="flex h-9 w-7 shrink-0 items-center justify-center rounded bg-stone-100 text-stone-500"><Wine className="h-4 w-4" aria-hidden="true" /></span>
  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-stone-950">{name}</span><span className="block truncate text-xs text-stone-500">{place}</span></span>{pill(score)}</li>;

const Verdict = () => { const [picked, setPicked] = useState(0); const wine = WINES[picked];
  return <div className={frame} data-testid="tour-scene162-0">
    <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Ejemplo · toca un vino</p>
    <div className="grid grid-cols-3 gap-1.5">{WINES.map((item, index) => <button key={item.name} type="button" aria-pressed={picked === index} onClick={() => setPicked(index)}
      className={`min-h-11 rounded-xl px-1 py-1.5 text-xs font-semibold leading-4 ${picked === index ? 'bg-red-900 text-white' : 'bg-stone-100 text-stone-800'}`}>{item.name}</button>)}</div>
    <div className="flex items-center justify-between gap-3" role="status"><p className="min-w-0 text-base font-bold leading-5 text-stone-950">{wine.plain >= 80 ? 'Muy de tu estilo' : wine.plain >= 65 ? 'Probablemente te guste' : 'No es tu estilo'}
      <span className="block text-xs font-medium text-stone-500">{wine.place} · {wine.price}</span></p>{pill(wine.plain)}</div>
  </div>; };

const Quiz = () => { const [answer, setAnswer] = useState<null | boolean>(null);
  return <div className="relative h-full overflow-hidden rounded-2xl bg-stone-900" data-testid="tour-scene162-1">
    <QuizPhoto157 id={8} className="absolute inset-0 h-full w-full" eager />
    <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80" aria-hidden="true" />
    <div className="absolute inset-x-0 bottom-0 space-y-2 p-3">
      <p className="text-base font-bold leading-5 text-white" role="status">{answer === null ? '¿Te gustan las berenjenas asadas?' : answer ? 'Apuntado: te van los sabores tostados.' : 'Apuntado: mejor sabores más suaves.'}</p>
      <div className="grid grid-cols-2 gap-2">{([[true, 'Me gusta', ThumbsUp], [false, 'No me gusta', ThumbsDown]] as const).map(([value, label, Icon]) => <button key={label} type="button" aria-pressed={answer === value} onClick={() => setAnswer(value)}
        className={`flex min-h-11 items-center justify-center gap-1.5 rounded-full text-sm font-semibold ${answer === value ? 'bg-white text-stone-950' : 'bg-white/20 text-white backdrop-blur'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</div>
    </div>
  </div>; };

const SCAN = [{ icon: Camera, label: 'Una botella', text: 'Te decimos si te gustará esa botella.' }, { icon: Images, label: 'Varias botellas', text: 'Una estantería entera: una nota para cada una.' },
  { icon: ScrollText, label: 'Una carta', text: 'La carta del restaurante, ordenada para ti.' }] as const;
const Scan = () => { const [picked, setPicked] = useState(0);
  return <div className={frame} data-testid="tour-scene162-2">
    <div className="grid grid-cols-3 gap-1.5">{SCAN.map((item, index) => <button key={item.label} type="button" aria-pressed={picked === index} onClick={() => setPicked(index)}
      className={`flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold leading-4 ${picked === index ? 'bg-red-900 text-white' : 'bg-stone-100 text-stone-800'}`}><item.icon className="h-5 w-5" aria-hidden="true" />{item.label}</button>)}</div>
    <p className="text-sm leading-5 text-stone-700" role="status">{SCAN[picked].text}</p>
    <p className={hint}>El botón rojo «Escanear» está siempre abajo, en el centro.</p>
  </div>; };

const Score = () => { const [open, setOpen] = useState(false);
  return <div className={frame} data-testid="tour-scene162-3">
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex min-h-11 items-center justify-between gap-3 text-left">
      <span className="min-w-0 text-base font-bold leading-5 text-stone-950">Un rioja crianza<span className="block text-xs font-medium text-stone-500">Tinto · Rioja</span></span>
      <span className="shrink-0 rounded-full bg-emerald-700 px-3 py-1 text-lg font-bold text-white">86<span className="text-xs font-semibold text-white/80">/100</span></span></button>
    {open ? <ul className="space-y-1 text-xs leading-4 text-stone-700" data-testid="tour-why162">
      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />El cuerpo es como te gusta</li>
      <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />Sabe a fruta roja y vainilla, que te van</li>
      <li className="flex items-center gap-1.5"><Minus className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />Algo menos fresco de lo que sueles preferir</li>
    </ul> : <p className={hint}>Toca la nota para ver por qué</p>}
  </div>; };

const SAVE = [{ icon: Bookmark, label: 'Quiero probarlo', text: 'Guardado en «Por probar».' }, { icon: Check, label: 'Ya lo he probado', text: '¿Te gustó? Tu respuesta afina tu perfil.' },
  { icon: Home, label: 'Lo tengo en casa', text: 'Guardado en «En casa», con cuántas botellas.' }] as const;
const Save = () => { const [picked, setPicked] = useState<number | null>(null);
  return <div className={frame} data-testid="tour-scene162-4">
    <div className="grid gap-1.5">{SAVE.map((item, index) => <button key={item.label} type="button" aria-pressed={picked === index} onClick={() => setPicked(index)}
      className={`flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold ${picked === index ? 'bg-red-900 text-white' : 'bg-stone-100 text-stone-800'}`}><item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />{item.label}</button>)}</div>
    <p className={picked === null ? hint : 'text-center text-xs font-medium text-emerald-800'} role="status">{picked === null ? 'Toca uno: así se guarda un vino' : SAVE[picked].text}</p>
  </div>; };

const Table = () => { const [meat, setMeat] = useState(false);
  const rows = [...WINES].sort((a, b) => (meat ? b.meat - a.meat : b.plain - a.plain));
  return <div className={frame} data-testid="tour-scene162-5">
    <button type="button" aria-pressed={meat} onClick={() => setMeat(value => !value)} className={`flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold ${meat ? 'bg-red-900 text-white' : 'bg-stone-100 text-stone-800'}`}>
      <Utensils className="h-4 w-4" aria-hidden="true" />{meat ? 'Voy a comer chuletón' : 'Toca: voy a comer chuletón'}</button>
    <ul className="divide-y divide-stone-100" aria-live="polite">{rows.map(item => <Row key={item.name} name={item.name} place={`${item.place} · ${item.price}`} score={meat ? item.meat : item.plain} />)}</ul>
  </div>; };

const SCENES = [Verdict, Quiz, Scan, Score, Save, Table];
export const TourScene162 = ({ step }: { step: number }) => { const Scene = SCENES[step]; return Scene ? <Scene key={step} /> : null; };
