import { Hourglass } from 'lucide-react';
import { useRatedWines157 } from '@/hooks/useRatedWines157';
import { evolutionAdvice164, evolutionFor166 } from '@/utils/evolution164';

// 166: «dale tiempo en la copa», said where the wine is chosen (list and search), from the person's own note.
export const EvolutionAdvice166 = ({ name, producer, className = '' }: { name?: string | null; producer?: string | null; className?: string }) => {
  const advice = evolutionAdvice164(evolutionFor166(useRatedWines157(), { name, producer }));
  if (!advice) return null;
  return <p className={`flex flex-wrap items-start gap-x-2 gap-y-1 rounded-xl bg-amber-50 px-3 py-3 text-sm font-semibold leading-5 text-amber-950 ${className}`} data-testid="evolution-advice166">
    <Hourglass aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-[min(100%,11rem)] flex-1">{advice}</span></p>;
};
