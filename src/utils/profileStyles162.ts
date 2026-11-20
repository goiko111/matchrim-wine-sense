import type { MatchrimProfileLike } from './matchrimPassport';

// 162 (owner's video of the 159: «a la página de Tu perfil le falta chicha»). The profile was five words in a table.
// It now also says where to start: three wine styles that follow from the five answers by plain rules. They are
// examples of styles, not scores and not a promise: the real answer for a wine is still its own note.
export type ProfileStyle162 = { id: string; title: string; examples: string; why: string; photo: number };
const n = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : 3;
export const profileStyles162 = (profile: MatchrimProfileLike | null | undefined): ProfileStyle162[] => {
  if (!profile) return [];
  const body = n(profile.potente), fresh = n(profile.acidez), sweet = n(profile.dulce), tannin = n(profile.tanico), fruit = n(profile.afrutado);
  const red: ProfileStyle162 = body >= 4 && tannin >= 3 ? { id: 'tinto-cuerpo', title: 'Tintos con cuerpo', examples: 'Ribera del Duero, Toro, Priorat', why: 'Te van los sabores intensos y con agarre.', photo: 5 }
    : body <= 2 || tannin <= 2 ? { id: 'tinto-ligero', title: 'Tintos ligeros', examples: 'Mencía, garnacha joven, pinot noir', why: 'Prefieres vinos que no pesen ni sequen la boca.', photo: 4 }
      : { id: 'tinto-medio', title: 'Tintos de cuerpo medio', examples: 'Rioja crianza, Ribera roble, Bierzo', why: 'Ni ligeros ni pesados: el punto medio.', photo: 12 };
  const white: ProfileStyle162 = fresh >= 4 ? { id: 'blanco-fresco', title: 'Blancos frescos', examples: 'Albariño, verdejo, txakoli', why: 'Te gusta la acidez viva, como la del limón.', photo: 1 }
    : fresh <= 2 ? { id: 'blanco-suave', title: 'Blancos suaves', examples: 'Chardonnay con barrica, viura fermentada en barrica', why: 'Mejor redondos y cremosos que ácidos.', photo: 13 }
      : { id: 'blanco-equilibrado', title: 'Blancos equilibrados', examples: 'Godello, Rueda, Rioja blanco', why: 'Frescos, pero sin pasarse de acidez.', photo: 15 };
  const third: ProfileStyle162 = sweet >= 4 ? { id: 'dulce', title: 'Con un punto dulce', examples: 'Riesling semiseco, moscatel, cava semiseco', why: 'El dulzor te resulta agradable.', photo: 9 }
    : fruit >= 4 ? { id: 'afrutado', title: 'Jóvenes y afrutados', examples: 'Rosados, tintos jóvenes, maceración carbónica', why: 'Buscas fruta clara por delante de la madera.', photo: 16 }
      : { id: 'espumoso', title: 'Espumosos secos', examples: 'Cava brut nature, champán brut', why: 'Secos y con poca fruta dulce, como te gusta.', photo: 20 };
  return [red, white, third];
};
