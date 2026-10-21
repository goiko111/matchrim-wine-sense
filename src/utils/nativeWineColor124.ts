const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const colors = new Map([
  ['tinto', 'red'], ['red', 'red'], ['rouge', 'red'], ['rosso', 'red'],
  ['blanco', 'white'], ['white', 'white'], ['blanc', 'white'], ['bianco', 'white'],
  ['rosado', 'rose'], ['rose', 'rose'], ['rosato', 'rose'],
]);
const colorPhrase = /^(?:(?:vino|vin|vinho|wine|espumoso) )?(tinto|red|rouge|rosso|blanco|white|blanc|bianco|rosado|rose|rosato)(?: (?:wine|vino|vin|vinho))?(?: (?:seco|sec|dry|brut|trocken))?$/;
const varietalRose = /^(?:pinot noir|garnacha|grenache|tempranillo|syrah|shiraz|merlot|cabernet sauvignon|cabernet franc) (rose|rosado|rosato)(?: (?:seco|sec|dry|brut|trocken))?$/;

// Color is a categorical contradiction only when explicitly stated. Never
// derive it from bottle appearance, a grape's name or a partial grape list.
export const hasObservedWineColorConflict124 = (evidence: readonly string[], catalogueType?: string | null): boolean => {
  if (!Array.isArray(evidence) || evidence.length > 100
    || evidence.some(line => typeof line !== 'string' || line.length > 1000)) return true;
  if (typeof catalogueType !== 'string' || catalogueType.length > 240) return false;
  const declared = fold(catalogueType).match(colorPhrase);
  const expected = declared ? colors.get(declared[1]) : null;
  if (!expected) return false;
  const observed = new Set<string>();
  for (const line of evidence) {
    const value = fold(line), explicit = value.match(colorPhrase) || value.match(varietalRose);
    if (explicit) observed.add(colors.get(explicit[1])!);
  }
  return observed.size === 1 && !observed.has(expected);
};
