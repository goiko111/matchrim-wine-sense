import carne from '@/assets/pairing162/carne.jpg';
import ave from '@/assets/pairing162/ave.jpg';
import pescado from '@/assets/pairing162/pescado.jpg';
import pasta from '@/assets/pairing162/pasta.jpg';
import arroz from '@/assets/pairing162/arroz.jpg';
import queso from '@/assets/pairing162/queso.jpg';
import { quizPhoto157 } from '@/components/QuizPhoto157';

// 162 (owner's video of the 159: «Combina muy bien con» should carry pictures like «A qué sabe»). Winerim names the
// pairings from a short closed list (meat, poultry, fish, seafood, pasta, rice, cheese, vegetables…): each gets a
// photograph in the light of the taste test, six new ones and the rest shared with it. A pairing nobody foresaw
// keeps its name on a plain card, so nothing is hidden.
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\baves?\b|pollo|pato/, ave], [/queso azul/, quizPhoto157(6)], [/queso/, queso], [/marisco/, quizPhoto157(17)], [/pescado|sushi/, pescado],
  [/pasta|pizza/, pasta], [/arroz|paella/, arroz], [/vegetar|verdura|ensalada/, quizPhoto157(8)], [/picante|especiad/, quizPhoto157(19)],
  [/aperitivo|tapa|encurtido/, quizPhoto157(18)], [/postre|dulce|chocolate/, quizPhoto157(9)], [/fruta/, quizPhoto157(16)], [/seta|trufa/, quizPhoto157(3)],
  [/carne|ternera|cordero|caza|cerdo|embutido|jamon|asado|guiso/, carne]];
export const pairingPhoto162 = (name: string): string | null => { const text = fold(name); return RULES.find(([rule]) => rule.test(text))?.[1] ?? null; };
export const PairingCards162 = ({ names }: { names: readonly string[] }) => <ul className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [html.matchrim-accessibility-text_&]:flex-wrap" data-testid="pairing-cards162">
  {names.map(name => { const photo = pairingPhoto162(name);
    return <li key={name} className={`relative h-28 w-28 shrink-0 snap-start overflow-hidden rounded-2xl [html.matchrim-accessibility-text_&]:h-auto [html.matchrim-accessibility-text_&]:min-h-28 [html.matchrim-accessibility-text_&]:w-full ${photo ? 'bg-stone-900' : 'bg-stone-700'}`}>
      {photo && <img src={photo} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />}
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 px-2 pb-2 text-sm font-semibold leading-4 text-white [overflow-wrap:anywhere] [html.matchrim-accessibility-text_&]:static [html.matchrim-accessibility-text_&]:relative [html.matchrim-accessibility-text_&]:block [html.matchrim-accessibility-text_&]:pt-16">{name}</span>
    </li>; })}
</ul>;
