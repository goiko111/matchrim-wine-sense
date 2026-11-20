import type { Place162 } from './places162';

// 162 (owner's video of the 159: «me gustaría guardar la carta con su restaurante y encontrarla en el mapa»). A wine
// list that was read is kept ON THIS PHONE with the restaurant the person names, so it can be opened again without
// photographing it and found on the map. Nothing goes to a server: sharing lists between phones or people needs
// development and the owner's decision. The photo is not kept, only the lines read. Twelve lists at most.
export type SavedMenu162 = { id: string; at: number; place: Place162; wines: Record<string, unknown>[] };
const KEY = (owner: string | null) => `matchrim.saved_menus.v1.${owner ?? 'anon'}`;
const MAX_MENUS = 12, MAX_WINES = 150;
const valid = (value: unknown): value is SavedMenu162 => { const item = value as SavedMenu162;
  return Boolean(item) && typeof item === 'object' && typeof item.id === 'string' && typeof item.at === 'number'
    && Boolean(item.place) && typeof item.place.name === 'string' && item.place.name.length > 0 && Array.isArray(item.wines) && item.wines.length > 0; };
export const listSavedMenus162 = (owner: string | null): SavedMenu162[] => {
  try { const parsed = JSON.parse(globalThis.localStorage?.getItem(KEY(owner)) || '[]');
    return (Array.isArray(parsed) ? parsed : []).filter(valid).sort((a, b) => b.at - a.at).slice(0, MAX_MENUS); }
  catch { return []; }
};
const write = (owner: string | null, menus: SavedMenu162[]) => { try { globalThis.localStorage?.setItem(KEY(owner), JSON.stringify(menus.slice(0, MAX_MENUS))); return true; } catch { return false; } };
/** Lines as read, without what belonged to the photo (its position, its page) or to the screen. */
const strip = (wine: Record<string, unknown>) => { const { posicion: _p, pagina141: _g, ...rest } = wine; return rest; };
export const saveMenu162 = (owner: string | null, place: Place162, wines: readonly Record<string, unknown>[], now = Date.now()): SavedMenu162 | null => {
  const name = place.name.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!name || !wines.length) return null;
  const same = (item: SavedMenu162) => item.place.name.toLowerCase() === name.toLowerCase() && item.place.address === place.address;
  const menu: SavedMenu162 = { id: `m${now.toString(36)}`, at: now, place: { ...place, name }, wines: wines.slice(0, MAX_WINES).map(strip) };
  // The same restaurant saved again replaces its earlier list.
  return write(owner, [menu, ...listSavedMenus162(owner).filter(item => !same(item))]) ? menu : null;
};
export const removeSavedMenu162 = (owner: string | null, id: string) => { write(owner, listSavedMenus162(owner).filter(item => item.id !== id)); };
