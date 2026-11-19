import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import brindis from '@/assets/tour159/brindis.jpg';
import restaurante from '@/assets/tour159/restaurante.jpg';

// 159: twenty questions in a row gave no sign of what they were for. Twice (after 7 and after 14) the test stops for
// one screen that says what the answers are used for and how much is left. Nothing here is computed from the
// answers: the profile only exists once the twenty are in.
export const QUIZ_BREAKS159: Record<number, { photo: string; title: string; text: string }> = {
  7: { photo: brindis, title: 'Ya llevas 7 de 20', text: 'Por eso preguntamos por comida y no por vino: lo que te gusta comer dice si te van los vinos frescos, los suaves o los intensos.' },
  14: { photo: restaurante, title: 'Solo quedan 6', text: 'Al terminar tendrás tu perfil y una nota de 0 a 100 para cada vino que escanees o busques, con el porqué.' },
};
export const QuizBreak159 = ({ at, onContinue }: { at: number; onContinue: () => void }) => {
  const item = QUIZ_BREAKS159[at]; if (!item) return null;
  return <section className="mx-auto flex w-full min-w-0 max-w-2xl flex-col pb-6" data-testid="quiz-break159" data-at={at}>
    <img src={item.photo} alt="" aria-hidden="true" draggable={false} className="-mx-4 h-[38vh] min-h-48 w-[calc(100%+2rem)] max-w-none object-cover [html.matchrim-accessibility-text_&]:hidden" />
    <h1 className="mt-6 text-3xl font-bold leading-9 text-stone-950" tabIndex={-1}>{item.title}</h1>
    <p className="mt-3 text-base leading-6 text-stone-700">{item.text}</p>
    <Button type="button" onClick={onContinue} className="mt-7 min-h-12 gap-2 rounded-full bg-red-900 text-base" data-testid="quiz-break-continue159">Seguir<ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
  </section>;
};
