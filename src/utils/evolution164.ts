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

// 166: the advice was only shown when the same label was scanned again. The moment it helps is when choosing: on the
// sheet of a wine of the list or of the search. A wine is the same one by its name and winery (the year may differ:
// what the person noticed is how that wine behaves in the glass). Shown only when every saved note agrees.
const fold166 = (text: string | null | undefined) => (text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/\b(?:19|20)\d{2}\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
const brand166 = (text: string | null | undefined) => fold166(text).replace(/^(?:bodegas?|vinedos|vinos|pago de|pagos de|dominio de|adega|celler|cellers) /, '');
export const evolutionFor166 = (rows: ReadonlyArray<{ rating?: string | null; name?: string | null; producer?: string | null; place_details?: unknown }>,
  wine: { name?: string | null; producer?: string | null }): Evolution164 | null => {
  const name = fold166(wine.name), producer = brand166(wine.producer);
  if (name.length < 3) return null;
  const seen = new Set(rows.flatMap(row => { const evolution = row.rating ? readEvolution164(row.place_details) : null;
    if (!evolution) return [];
    const own = fold166(row.name), maker = brand166(row.producer);
    const sameName = own === name || (maker && `${maker} ${own}` === name) || (producer && `${producer} ${name}` === own);
    const sameMaker = !producer || !maker || producer === maker || producer.includes(maker) || maker.includes(producer);
    return sameName && sameMaker ? [evolution] : []; }));
  return seen.size === 1 ? [...seen][0] : null;
};
