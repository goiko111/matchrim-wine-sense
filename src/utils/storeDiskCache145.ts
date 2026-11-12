// 145: every question to Winerim's public store takes about four seconds on its server (measured 2026-11-12), so
// what was already asked is kept on this phone: the same search, or the same wine sheet, opens at once the second
// time. Only public store data is kept (never anything about the person), for a week, and only the latest entries.
type Entry = { at: number; value: unknown };
const WEEK = 7 * 24 * 60 * 60 * 1000;
const read = (name: string): Record<string, Entry> => {
  try { const parsed = JSON.parse(globalThis.localStorage?.getItem(name) || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; }
  catch { return {}; }
};
export const diskGet145 = <T,>(name: string, key: string, now = Date.now()): T | null => {
  const entry = read(name)[key];
  return entry && typeof entry.at === 'number' && now - entry.at >= 0 && now - entry.at < WEEK ? entry.value as T : null;
};
export const diskSet145 = (name: string, key: string, value: unknown, max: number, now = Date.now()) => {
  try {
    const all = read(name); all[key] = { at: now, value };
    const kept = Object.entries(all).filter(([, entry]) => entry && now - entry.at < WEEK).sort((a, b) => b[1].at - a[1].at).slice(0, max);
    globalThis.localStorage?.setItem(name, JSON.stringify(Object.fromEntries(kept)));
  } catch { /* Storage full or unavailable: the answer was still given; only the shortcut is lost. */ }
};
