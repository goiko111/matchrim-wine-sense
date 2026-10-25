import React, { useEffect, useRef } from 'react';
import { Camera, ChevronDown, RotateCcw, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { QuizResult } from '@/data/quizData';
import { Button } from '@/components/ui/button';
import MatchrimPassport from './MatchrimPassport';
import { getSafeRedirectPath } from '@/utils/navigation';
import { nativeTasteSummary240 } from '@/utils/nativeTasteSummary240';

interface Props {
  result: QuizResult;
  onRestart: () => void;
  returnTo?: string | null;
  restartDisabled?: boolean;
}

const NativeQuizResults240: React.FC<Props> = ({ result, onRestart, returnTo, restartDisabled = false }) => {
  const navigate = useNavigate(), taste = nativeTasteSummary240(result);
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
          <dd className="min-w-0 text-right text-sm font-semibold text-stone-900 [overflow-wrap:normal] [html.matchrim-accessibility-text_&]:text-left">{row.description}</dd>
        </div>)}
      </dl>
    </section>
    <div className="grid min-w-0 gap-2">
      <Button className="h-auto min-h-[48px] w-full gap-[8px] whitespace-normal bg-red-900 px-[16px] py-[12px] text-white" onClick={() => navigate(getSafeRedirectPath(returnTo, '/escanear/etiqueta'))}>
        <Camera aria-hidden="true" className="h-[20px] w-[20px] shrink-0" /><span className="min-w-0 [overflow-wrap:normal]">{returnTo ? 'Continuar' : 'Escanear un vino'}</span>
      </Button>
      <Button variant="outline" className="h-auto min-h-[48px] w-full gap-[8px] whitespace-normal px-[16px] py-[12px]" onClick={() => navigate('/restaurante')}>
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
    <Button variant="ghost" className="h-auto min-h-[48px] w-full gap-[8px] whitespace-normal px-[16px] py-[12px]" onClick={onRestart} disabled={restartDisabled}>
      <RotateCcw aria-hidden="true" className="h-[20px] w-[20px] shrink-0" /><span className="min-w-0 [overflow-wrap:normal]">Repetir el test</span>
    </Button>
  </div>;
};

export default NativeQuizResults240;
