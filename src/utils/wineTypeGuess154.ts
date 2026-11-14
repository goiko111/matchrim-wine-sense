// 154: a saved wine has no type of its own, so where it has no photo its drawn bottle was grey until Winerim's store
// answered (and stayed grey when it did not). The colour is only for the drawing: it is read from the wine's own
// words (name, grapes) or from what the store said last time, never stored with the wine and never used for affinity.
const words: Array<[RegExp, string]> = [
  [/\b(cava|champagne|champan|espumoso|brut|prosecco|cremant|sparkling|franciacorta|corpinnat)\b/, 'espumoso'],
  [/\b(rosado|rose|rosat|rosato|clarete)\b/, 'rosado'],
  [/\b(fino|manzanilla|amontillado|oloroso|palo cortado|oporto|port|vermut|vermouth|madeira|marsala)\b/, 'generoso'],
  [/\b(moscatel|pedro ximenez|px|sauternes|tokaji|vendimia tardia|dulce|late harvest)\b/, 'dulce'],
  [/\b(blanco|blanc|white|bianco|branco|weiss)\b/, 'blanco'],
  [/\b(tinto|rouge|red|rosso|crianza|reserva|gran reserva|roble)\b/, 'tinto'],
];
const white = ['albarino', 'verdejo', 'godello', 'chardonnay', 'sauvignon blanc', 'riesling', 'viura', 'macabeo', 'xarel', 'parellada', 'treixadura', 'malvasia', 'garnacha blanca',
  'chenin', 'viognier', 'gewurztraminer', 'pinot grigio', 'pinot gris', 'hondarrabi zuri', 'palomino', 'airen', 'vermentino', 'loureira', 'semillon', 'gruner', 'moscato', 'arneis', 'garganega'];
const red = ['tempranillo', 'tinta de toro', 'tinto fino', 'tinta del pais', 'garnacha', 'grenache', 'monastrell', 'mencia', 'cabernet', 'merlot', 'syrah', 'shiraz', 'pinot noir', 'bobal', 'graciano',
  'mazuelo', 'carinena', 'malbec', 'nebbiolo', 'sangiovese', 'petit verdot', 'touriga', 'zinfandel', 'prieto picudo', 'listan negro', 'carmenere', 'barbera', 'gamay', 'cabernet franc'];
const plain = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const guessWineType154 = (name?: string | null, grapes?: readonly string[] | null): string | null => {
  const text = plain(name ?? '');
  for (const [pattern, type] of words) if (pattern.test(text)) return type;
  const list = (grapes ?? []).map(plain);
  const has = (names: string[]) => list.some(grape => names.some(known => grape.includes(known) && !(known === 'garnacha' && /blanca/.test(grape))));
  const isWhite = has(white), isRed = has(red);
  return isWhite && !isRed ? 'blanco' : isRed && !isWhite ? 'tinto' : null;
};

const KEY = 'matchrim.wine_types154';
const load = (): Record<string, string> => { try { const value = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return value && typeof value === 'object' ? value as Record<string, string> : {}; } catch { return {}; } };
/** What the store called this wine the last time it answered (kept on the phone, 300 wines at most). */
export const rememberedWineType154 = (identityKey: string): string | null => load()[identityKey] ?? null;
export const rememberWineType154 = (identityKey: string, type?: string | null) => {
  if (!type) return;
  try { const all = load(); if (all[identityKey] === type) return; delete all[identityKey]; all[identityKey] = type.slice(0, 40);
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(all).slice(-300)))); } catch { /* storage full or unavailable: the drawing falls back to the guess */ }
};
