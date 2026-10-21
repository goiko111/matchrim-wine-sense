const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// This is a conservative conflict vocabulary, not an exhaustive grape resolver.
// Unknown catalogue varieties disable rejection, so an unrecognised synonym in
// a blend cannot turn partial metadata into a false contradiction.
const families = [
  ['cabernet sauvignon'], ['cabernet franc'], ['pinot noir'], ['pinot gris', 'pinot grigio'],
  ['chardonnay'], ['riesling'], ['godello'], ['albarino', 'alvarinho'], ['viognier'],
  ['merlot'], ['malbec'], ['tempranillo'], ['syrah', 'shiraz'],
  ['garnacha', 'grenache'], ['monastrell', 'mourvedre'],
] as const;
const catalogueKey = new Map<string, number>();
families.forEach((names, key) => names.forEach(name => catalogueKey.set(name, key)));

export const hasObservedGrapeConflict124 = (evidence: readonly string[], grapes: unknown): boolean => {
  if (!Array.isArray(evidence) || evidence.length > 100
    || evidence.some(line => typeof line !== 'string' || line.length > 1000)) return true;
  if (!Array.isArray(grapes)) return false;
  const values: unknown[] = grapes.flat(2);
  if (!values.length || values.length > 100) return false;
  const known = new Set<number>();
  for (const value of values) {
    const name = typeof value === 'string' ? value : value && typeof value === 'object'
      && 'name' in value && typeof value.name === 'string' ? value.name : null;
    if (!name || name.length > 240) return false;
    const key = catalogueKey.get(fold(name));
    if (key === undefined) return false;
    known.add(key);
  }
  const visible = new Set<number>();
  for (const line of evidence) {
    const words = ` ${fold(line)} `;
    families.forEach((names, key) => {
      if (names.some(name => words.includes(` ${name} `))) visible.add(key);
    });
  }
  return visible.size > 0 && [...visible].every(key => !known.has(key));
};
