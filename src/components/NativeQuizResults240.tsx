import React, { useEffect, useRef } from 'react';
import { Camera, ChevronDown, RotateCcw, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QuizResult } from '@/data/quizData';
import { Button } from '@/components/ui/button';
import MatchrimPassport from './MatchrimPassport';
import { getSafeRedirectPath } from '@/utils/navigation';
import { nativeTasteSummary240 } from '@/utils/nativeTasteSummary240';
import { profileStyles162 } from '@/utils/profileStyles162';
import { QuizPhoto157 } from '@/components/QuizPhoto157';

interface Props {
  result: QuizResult;
  onRestart: () => void;
  returnTo?: string | null;
  restartDisabled?: boolean;
}

const NativeQuizResults240: React.FC<Props> = ({ result, onRestart, returnTo, restartDisabled = false }) => {
  const navigate = useNavigate(), taste = nativeTasteSummary240(result), styles162 = profileStyles162(result);
  const page = useRef<HTMLDivElement>(null), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    page.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [result]);
  if (!taste) return <section className="mx-auto max-w-2xl space-y-4">
    <h1 className="text-2xl font-bold">Tu perfil no est&aacute; disponible</h1>
    <Button onClick={onRestart} disabled={restartDisabled} className="h-auto min-h-[48px] gap-2 whitespace-normal"><RotateCcw aria-hidden="true" className="h-5 w-5 shrink-0" />Repetir el test</Button>
  </section>;
  return <div ref={page} className="mx-auto min-w-0 max-w-2xl scroll-mt-[calc(12px+var(--matchrim-safe-top))] space-y-5" data-testid="native-quiz-results240">
    <header className="space-y-2">
      <p className="text-sm font-medium text-stone-600">Perfil de este test</p>
      <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold text-stone-950 outline-none">Tu perfil</h1>
      <p className="text-base leading-relaxed text-stone-700">{taste.summary}</p>
    </header>
    <section aria-labelledby="taste240-heading">
      <h2 id="taste240-heading" className="text-base font-semibold">Tus preferencias</h2>
      <dl className="mt-2 divide-y divide-stone-200 border-y border-stone-200">
        {taste.rows.map(row => <div key={row.key} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] items-start gap-4 py-3 [html.matchrim-accessibility-text_&]:grid-cols-1 [html.matchrim-accessibility-text_&]:gap-[8px]">
          <dt className="min-w-0 text-sm text-stone-600 [overflow-wrap:normal]">{row.label}</dt>
          <dd className="min-w-0 text-right text-sm font-semibold text-stone-900 [overflow-wrap:normal] [html.matchrim-accessibility-text_&]:text-left">{row.description}
            {/* 162: where the answer falls between little and much, at a glance. */}
            <span className="mt-1.5 flex justify-end gap-1 [html.matchrim-accessibility-text_&]:justify-start" aria-hidden="true" data-testid="taste-scale162">{[1, 2, 3, 4, 5].map(step => <span key={step} className={`h-1.5 w-6 rounded-full ${step <= Math.round(row.value) ? 'bg-red-900' : 'bg-stone-200'}`} />)}</span></dd>
        </div>)}
      </dl>
    </section>
    {styles162.length > 0 && <section aria-labelledby="styles162-heading" data-testid="profile-styles162">
      <h2 id="styles162-heading" className="text-base font-semibold">Por dónde empezar</h2>
      <p className="mt-1 text-sm leading-6 text-stone-600">Estilos que suelen encajar con un perfil como el tuyo. Son ejemplos: la nota de cada vino te lo confirma.</p>
      <ul className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [html.matchrim-accessibility-text_&]:flex-wrap">
        {styles162.map(style => <li key={style.id} className="relative h-44 w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-stone-900 [html.matchrim-accessibility-text_&]:h-auto [html.matchrim-accessibility-text_&]:w-full">
          <QuizPhoto157 id={style.photo} className="absolute inset-0 h-full w-full [html.matchrim-accessibility-text_&]:hidden" />
          <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" aria-hidden="true" />
          <span className="relative flex h-full flex-col justify-end p-3 text-white">
            <span className="text-base font-bold leading-5">{style.title}</span>
            <span className="mt-1 text-xs leading-4 text-white/90">{style.examples}</span>
            <span className="mt-1 text-xs leading-4 text-white/75">{style.why}</span>
          </span>
        </li>)}
      </ul>
    </section>}
    <section aria-labelledby="next162-heading" className="rounded-2xl bg-stone-100 p-4" data-testid="profile-next162">
      <h2 id="next162-heading" className="text-base font-semibold">Qué hace Matchrim con esto</h2>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-700">
        <li>Compara cada vino que escaneas con estas cinco preferencias y te da una nota de 0 a 100.</li>
        <li>Te dice el porqué: qué encaja contigo y qué no.</li>
        <li>Se afina con cada vino que valoras: lo que bebes pesa más que el test.</li>
      </ul>
    </section>
    <div className="grid min-w-0 gap-2">
      <Button className="h-auto min-h-[48px] w-full gap-[8px] whitespace-normal bg-red-900 px-[16px] py-[12px] text-white [&_svg]:size-[20px]" onClick={() => navigate(getSafeRedirectPath(returnTo, '/escanear/etiqueta'))}>
        <Camera aria-hidden="true" className="h-[20px] w-[20px] shrink-0" /><span className="min-w-0 [overflow-wrap:normal]">{returnTo?.includes('carta=pendiente166') ? 'Ver mi carta con sus notas' : returnTo ? 'Continuar' : 'Escanear un vino'}</span>
      </Button>
      <Button variant="outline" className="h-auto min-h-[48px] w-full gap-[8px] whitespace-normal px-[16px] py-[12px] [&_svg]:size-[20px]" onClick={() => navigate('/restaurante')}>
        <Utensils aria-hidden="true" className="h-[20px] w-[20px] shrink-0" /><span className="min-w-0 [overflow-wrap:normal]">Elegir vino para mi comida</span>
      </Button>
    </div>
    <p className="text-sm leading-relaxed text-stone-600">Orientaci&oacute;n inicial basada en comida y aromas. No confirma todav&iacute;a qu&eacute; vinos te gustan.</p>
    <details className="min-w-0 border-y border-stone-200">
      <summary className="flex min-h-[48px] cursor-pointer items-center justify-between gap-[12px] py-3 text-sm font-medium">
        <span className="min-w-0 [overflow-wrap:normal]">Mi c&oacute;digo y compartir</span><ChevronDown aria-hidden="true" className="h-[20px] w-[20px] shrink-0" />
      </summary>
      <div className="min-w-0 pb-4"><MatchrimPassport profile={result} compact showUseAction={false} /></div>
    </details>
    <Button variant="ghost" className="h-auto min-h-[48px] w-full gap-[8px] whitespace-normal px-[16px] py-[12px] [&_svg]:size-[20px]" onClick={onRestart} disabled={restartDisabled}>
      <RotateCcw aria-hidden="true" className="h-[20px] w-[20px] shrink-0" /><span className="min-w-0 [overflow-wrap:normal]">Repetir el test</span>
    </Button>
  </div>;
};

export default NativeQuizResults240;
