// 158: a front label with almost no words (a drawing, a logo, two letters) cannot name its wine, and the search then
// returns unrelated wines or nothing. The back label usually carries name, winery and region, so the sheet says so.
// Counts only what could identify a wine: words of three letters or more that are not a year, a volume or a strength.
const NOISE = /^(?:\d+(?:[.,]\d+)?(?:cl|ml|l|vol|%)?|(?:19|20)\d{2}|vol|alc|cl|ml|vino|wine|vin|product|produit|produce|of|de|del|la|el|les|the|and|contains|sulfites|sulfitos)$/i;
export const usefulWords158 = (lines: readonly string[]): string[] => [...new Set(lines.join(' ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9%.,]+/)
  .map(word => word.replace(/^[.,]+|[.,]+$/g, '')).filter(word => word.length >= 3 && !NOISE.test(word)))];
/** True when a reading exists and holds too little to name a wine (fewer than two useful words). */
export const thinLabel158 = (lines: readonly string[] | null | undefined): boolean => Array.isArray(lines) && usefulWords158(lines).length < 2;
