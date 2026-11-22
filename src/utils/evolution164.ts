// 164 (owner: «al principio no me gustó mucho, pasados 20 minutos me gustó bastante»). A wine can change in the
// glass. The rating stays the final impression; this only remembers which way the wine moved, so the app can say
// «dale tiempo» the next time. It lives inside place_details (no schema change) and never trains the profile.
export type Evolution164 = 'better' | 'worse';
export const EVOLUTION_KEY164 = 'matchrim_evolution164';
export const readEvolution164 = (details: unknown): Evolution164 | null => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const value = (details as Record<string, unknown>)[EVOLUTION_KEY164];
  return value === 'better' || value === 'worse' ? value : null;
};
export const evolutionAdvice164 = (evolution: Evolution164 | null) => evolution === 'better'
  ? 'La otra vez te gustó más pasado un rato: dale tiempo en la copa.'
  : evolution === 'worse' ? 'La otra vez fue a peor con el rato: mejor recién servido.' : null;
// What the saved wines say about the person: shown only when it repeats.
export const evolutionPattern164 = (wines: Array<{ place_details?: unknown }>) => {
  const better = wines.filter(wine => readEvolution164(wine.place_details) === 'better').length;
  const worse = wines.filter(wine => readEvolution164(wine.place_details) === 'worse').length;
  if (better >= 2 && better > worse) return `${better} vinos te han gustado más pasado un rato: no juzgues el primer sorbo.`;
  if (worse >= 2 && worse > better) return `${worse} vinos te han ido a peor con el rato: los disfrutas más recién servidos.`;
  return null;
};
