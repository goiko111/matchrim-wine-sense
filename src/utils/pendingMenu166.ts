// 166 (owner: «tras hacer el test, la carta no se recupera sola»). Someone without the test photographs a list, is
// sent to the test and must come back to that same list, now with its notes, without photographing it again and
// without having had to save it. The lines read are kept on the phone for a few hours, for that account only, and
// are removed when the list is opened again. Not a saved list: it has no restaurant and is not shown anywhere.
const KEY = (owner: string | null) => `matchrim.pending_menu166.${owner ?? 'anon'}`;
const HOURS = 6, MAX_WINES = 150;
export const PENDING_MENU_ID166 = 'pendiente166';
export const PENDING_MENU_RETURN166 = `/escanear/carta?carta=${PENDING_MENU_ID166}`;
export const keepPendingMenu166 = (owner: string | null, wines: readonly Record<string, unknown>[], now = Date.now()) => {
  if (!wines.length) return false;
  try { globalThis.localStorage?.setItem(KEY(owner), JSON.stringify({ at: now, wines: wines.slice(0, MAX_WINES) })); return true; } catch { return false; }
};
export const readPendingMenu166 = (owner: string | null, now = Date.now()): Record<string, unknown>[] | null => {
  try { const parsed = JSON.parse(globalThis.localStorage?.getItem(KEY(owner)) || 'null') as { at?: unknown; wines?: unknown } | null;
    if (!parsed || typeof parsed.at !== 'number' || now - parsed.at > HOURS * 3_600_000 || now < parsed.at || !Array.isArray(parsed.wines) || !parsed.wines.length) return null;
    return parsed.wines.filter(wine => wine && typeof wine === 'object') as Record<string, unknown>[]; } catch { return null; }
};
export const clearPendingMenu166 = (owner: string | null) => { try { globalThis.localStorage?.removeItem(KEY(owner)); } catch { /* nothing kept */ } };
