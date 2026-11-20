// 160 (owner's video of the 159, 20-nov-2026): a person without a session tapped «Ya lo he probado · No me gustó» in
// the scanner, was thrown to the sign-in screen with no word of why, then to the old «Añadir vino» form, and the
// rating was lost. The choice now waits here (this tab only, 30 minutes), the sign-in screen says why an account is
// needed, and once there is a session the wine is saved where the person said, with the rating.
import type { QuickSaveWine141 } from '@/components/NativeQuickSave141';

export type PendingPlace160 = 'wishlist' | 'tasted' | 'collection';
export type PendingRating160 = 'love' | 'ok' | 'not_for_me' | null;
export type PendingSave160 = { wine: QuickSaveWine141; place: PendingPlace160; rating: PendingRating160; at: number };
const KEY160 = 'matchrim.pending_save160';
let memory160: PendingSave160 | null = null;
const fresh = (item: PendingSave160 | null) => item && typeof item.at === 'number' && Date.now() - item.at < 30 * 60_000 && typeof item.wine?.name === 'string' && item.wine.name.trim() ? item : null;

export const stashPendingSave160 = (wine: QuickSaveWine141, place: PendingPlace160, rating: PendingRating160) => {
  memory160 = { wine, place, rating, at: Date.now() };
  // The label photo stays in memory only: it is large and never leaves the phone.
  try { sessionStorage.setItem(KEY160, JSON.stringify({ ...memory160, wine: { ...wine, labelPhoto: null } })); } catch { /* memory is enough */ }
};
export const peekPendingSave160 = (): PendingSave160 | null => {
  if (fresh(memory160)) return memory160;
  try { const raw = sessionStorage.getItem(KEY160); return raw ? fresh(JSON.parse(raw) as PendingSave160) : null; } catch { return null; }
};
const take = () => { const item = peekPendingSave160(); memory160 = null; try { sessionStorage.removeItem(KEY160); } catch { /* nothing kept */ } return item; };

let running160: Promise<PendingSave160 | null> | null = null;
/** Saves the waiting wine once for the person now signed in; every caller awaits the same save. Resolves to what was saved, or null. */
export const settlePendingSave160 = (userId: string | null | undefined, save: (userId: string, item: PendingSave160) => Promise<boolean>): Promise<PendingSave160 | null> => {
  if (!userId) return Promise.resolve(null);
  if (running160) return running160;
  const item = take();
  if (!item) return Promise.resolve(null);
  running160 = save(userId, item).then(ok => ok ? item : null, () => null).finally(() => { running160 = null; });
  return running160;
};
