// 157: «La Nine» (Jean-Baptiste Sénat) is not in Winerim, and the sheet offered 13 and then 17 wines that only
// shared a common word with the label («Nine», «Jean Baptiste»). A candidate is put forward only when the label
// really reads like it: every word of the wine's name is on the label, or most of the words of name and winery
// together. The rest are not thrown away: they wait folded under «Ver vinos parecidos», so a right wine that the
// camera read badly can still be picked.
const STOP = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'le', 'les', 'du', 'des', 'di', 'da', 'do', 'y', 'e', 'and', 'the', 'vino', 'vinos', 'wine', 'bodega', 'bodegas',
  'domaine', 'chateau', 'vina', 'vinedos', 'tinto', 'blanco', 'rosado', 'red', 'white']);
const tokens = (text: string | null | undefined) => (text ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(19|20)\d{2}\b/g, ' ')
  .split(/[^a-z0-9]+/).filter(word => word.length >= 2 && !STOP.has(word));
// «minervois» on the label and «minervoise» in a name are different words here on purpose; only a plural counts as the same word.
const same = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && (a === b + 's' || b === a + 's'));
export const labelFit157 = (labelLines: readonly string[], name: string | null | undefined, winery: string | null | undefined): boolean => {
  const label = tokens(labelLines.join(' '));
  if (!label.length) return true;
  const on = (word: string) => label.some(read => same(read, word));
  const nameWords = [...new Set(tokens(name))], all = [...new Set([...nameWords, ...tokens(winery)])];
  if (!nameWords.length) return true;
  if (nameWords.every(on)) return true;
  return all.filter(on).length / all.length >= 0.6;
};
