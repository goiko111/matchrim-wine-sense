import q1 from '@/assets/quiz157/q1.jpg';
import q3 from '@/assets/quiz157/q3.jpg';
import q5 from '@/assets/quiz157/q5.jpg';
import q9 from '@/assets/quiz157/q9.jpg';
import q10 from '@/assets/quiz157/q10.jpg';
import q11 from '@/assets/quiz157/q11.jpg';
import q12 from '@/assets/quiz157/q12.jpg';
import q13 from '@/assets/quiz157/q13.jpg';
import q15 from '@/assets/quiz157/q15.jpg';
import q16 from '@/assets/quiz157/q16.jpg';
import roja from '@/assets/flavour157/roja.jpg';
import negra from '@/assets/flavour157/negra.jpg';
import citricos from '@/assets/flavour157/citricos.jpg';
import hueso from '@/assets/flavour157/hueso.jpg';
import flor from '@/assets/flavour157/flor.jpg';
import madera from '@/assets/flavour157/madera.jpg';
import mineral from '@/assets/flavour157/mineral.jpg';
import bolleria from '@/assets/flavour157/bolleria.jpg';
import { flavours157, type FlavourId157 } from '@/utils/flavours157';

// 157: the flavours a tasting note names, as pictures in the same photographs as the taste test (ten are shared
// with it). A row that scrolls sideways; each picture carries its name, so the row reads without the images too.
const PHOTO: Record<FlavourId157, string> = { roja, negra, citricos, manzana: q1, hueso, tropical: q16, flor, hierbas: q15, especias: q10, vainilla: q13,
  tostados: q11, frutosSecos: q12, madera, cuero: q5, tierra: q3, mineral, miel: q9, bolleria };
export const FlavourCards157 = ({ texts }: { texts: (string | null | undefined)[] }) => {
  const found = flavours157(texts);
  if (found.length < 2) return null;
  return <ul className="-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [html.matchrim-accessibility-text_&]:flex-wrap" aria-label="Sabores que nombra la nota de cata" data-testid="flavour-cards157">
    {found.map(({ id, label }) => <li key={id} className="relative h-28 w-28 shrink-0 snap-start overflow-hidden rounded-2xl bg-stone-900 [html.matchrim-accessibility-text_&]:h-auto [html.matchrim-accessibility-text_&]:min-h-28 [html.matchrim-accessibility-text_&]:w-full">
      <img src={PHOTO[id]} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full object-cover" />
      <span className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 px-2 pb-2 text-sm font-semibold leading-4 text-white [overflow-wrap:anywhere] [html.matchrim-accessibility-text_&]:static [html.matchrim-accessibility-text_&]:relative [html.matchrim-accessibility-text_&]:block [html.matchrim-accessibility-text_&]:pt-16">{label}</span>
    </li>)}
  </ul>;
};
