import { useId } from 'react';
import { Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  buildAiRimContextGuidance,
  type AiRimContextInput,
} from '@/utils/aiRimContextGuide';
import { readStoredMatchrimProfile } from '@/utils/wineAffinityExplanation';

interface AiRimContextGuideProps extends AiRimContextInput {
  primaryAction?: { label: string; onClick: () => void } | null;
  secondaryAction?: { label: string; onClick: () => void } | null;
}

export const AiRimContextGuide = ({
  primaryAction,
  secondaryAction,
  ...input
}: AiRimContextGuideProps) => {
  const titleId = useId();
  const guidance = buildAiRimContextGuidance(input, readStoredMatchrimProfile());
  const toneClass = guidance.tone === 'caution'
    ? 'border-amber-300 bg-amber-50 text-amber-950'
    : guidance.tone === 'positive'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
      : 'border-stone-200 bg-stone-50 text-slate-900';

  return (
    <section
      className={`border p-3 ${toneClass}`}
      aria-labelledby={titleId}
      data-testid="airim-context-guide"
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 border border-current bg-white">
          <AvatarFallback className="bg-white text-red-900">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase text-red-900">aiRIM - guía contextual</div>
          <h4 id={titleId} className="mt-1 text-sm font-semibold">{guidance.title}</h4>
          <p className="mt-1 text-sm leading-5">{guidance.summary}</p>
          <ul className="mt-2 space-y-1 text-xs opacity-80">
            {guidance.evidence.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-2 text-xs font-medium">Siguiente paso: {guidance.nextStep}</p>
          {(primaryAction || secondaryAction) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {primaryAction && (
                <Button type="button" size="sm" className="min-h-11" onClick={primaryAction.onClick}>
                  {primaryAction.label}
                </Button>
              )}
              {secondaryAction && (
                <Button type="button" size="sm" variant="outline" className="min-h-11 bg-white" onClick={secondaryAction.onClick}>
                  {secondaryAction.label}
                </Button>
              )}
            </div>
          )}
          <p className="mt-2 text-[11px] opacity-70">Esta guía explica datos existentes; no cambia la identidad ni el cálculo.</p>
        </div>
      </div>
    </section>
  );
};
