import { isMatchrimLocalOwner } from './matchrimLocalOwner';

// 139: a scanned bottle was kept only if the person tapped «Guardar»; leaving the screen lost it. The wines a scan
// identifies are remembered on this device (name, winery, vintage, score), per account, so Home can offer them again.
export interface ScannedWine139 { name: string; winery: string | null; vintage: string | null; score: number | null; at: number }
const KEY = 'matchrim.scanned_wines.v1', MAX = 12;
export const SCANNED_WINES_EVENT139 = 'matchrim:scanned-wines-updated';
const read = (): Record<string, ScannedWine139[]> => {
  try { const parsed = JSON.parse(window.localStorage.getItem(KEY) || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
  catch { return {}; }
};
const valid = (item: unknown): item is ScannedWine139 => Boolean(item && typeof item === 'object'
  && typeof (item as ScannedWine139).name === 'string' && (item as ScannedWine139).name.trim() && typeof (item as ScannedWine139).at === 'number');
const id = (wine: Pick<ScannedWine139, 'name' | 'winery' | 'vintage'>) => [wine.name, wine.winery ?? '', wine.vintage ?? ''].join('|').toLowerCase();

export const getScannedWines139 = (ownerId: string | null): ScannedWine139[] => {
  if (typeof window === 'undefined') return [];
  const list = read()[ownerId ?? 'anonymous'];
  return Array.isArray(list) ? list.filter(valid).slice(0, MAX) : [];
};
export const recordScannedWine139 = (ownerId: string | null, wine: { name?: string | null; winery?: string | null; vintage?: string | number | null; score?: number | null }) => {
  if (typeof window === 'undefined' || !wine.name?.trim() || (ownerId !== null && !isMatchrimLocalOwner(ownerId))) return;
  const entry: ScannedWine139 = { name: wine.name.trim().slice(0, 200), winery: wine.winery?.trim().slice(0, 160) || null,
    vintage: wine.vintage == null || wine.vintage === '' ? null : String(wine.vintage).slice(0, 4),
    score: typeof wine.score === 'number' && Number.isFinite(wine.score) ? Math.round(wine.score) : null, at: Date.now() };
  try {
    const all = read(), owner = ownerId ?? 'anonymous';
    all[owner] = [entry, ...(Array.isArray(all[owner]) ? all[owner].filter(valid).filter(item => id(item) !== id(entry)) : [])].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(SCANNED_WINES_EVENT139));
  } catch { /* Storage full or unavailable: the scan itself is unaffected. */ }
};
export const clearScannedWines139 = (ownerId: string | null) => {
  try { const all = read(); delete all[ownerId ?? 'anonymous']; window.localStorage.setItem(KEY, JSON.stringify(all)); window.dispatchEvent(new Event(SCANNED_WINES_EVENT139)); }
  catch { /* nothing to clear */ }
};
