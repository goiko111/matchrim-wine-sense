type DraftInput = { name?: unknown; producer?: unknown; winery?: unknown; vintage?: unknown; photo?: unknown };
const text = (value: unknown) => typeof value === 'string' && value.trim() && value.length <= 300
  && !/[<>]/.test(value) && [...value].every(char => char.charCodeAt(0) >= 32) ? value.trim() : null;

export const createNativeWineDraft98 = (wine: DraftInput, ownerId: string) => ({
  nativeWineDraft98: { ownerId, name: text(wine.name), producer: text(wine.producer ?? wine.winery),
    vintage: wine.vintage == null ? null : String(wine.vintage) },
});

export const readNativeWineDraft98 = (state: unknown, ownerId?: string | null) => {
  if (!ownerId || !state || typeof state !== 'object') return null;
  const draft = (state as { nativeWineDraft98?: unknown }).nativeWineDraft98;
  if (!draft || typeof draft !== 'object') return null;
  const data = draft as Record<string, unknown>;
  const name = text(data.name), producer = text(data.producer);
  if (data.ownerId !== ownerId || !name) return null;
  const vintage = data.vintage == null || data.vintage === '' ? null
    : typeof data.vintage === 'string' && /^(19|20)\d{2}$/.test(data.vintage) ? Number(data.vintage) : NaN;
  return Number.isNaN(vintage) ? null : { name, producer, vintage };
};

// 134: a signed-out person who picked a wine was sent to sign in without it and found an empty
// form afterwards. The pick waits in this tab's sessionStorage for 30 minutes, then is consumed once.
const SIGNED_OUT_DRAFT134 = 'matchrim.signed_out_wine_draft134';
export const stashSignedOutWineDraft134 = (wine: DraftInput) => {
  try {
    const draft = createNativeWineDraft98(wine, 'signed-out').nativeWineDraft98;
    if (draft.name) sessionStorage.setItem(SIGNED_OUT_DRAFT134, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch { /* storage unavailable: the person retypes the wine */ }
};
export const takeSignedOutWineDraft134 = (ownerId?: string | null) => {
  if (!ownerId) return null;
  try {
    const raw = sessionStorage.getItem(SIGNED_OUT_DRAFT134);
    if (!raw) return null;
    sessionStorage.removeItem(SIGNED_OUT_DRAFT134);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > 30 * 60_000) return null;
    return readNativeWineDraft98({ nativeWineDraft98: { ...parsed, ownerId } }, ownerId);
  } catch { return null; }
};
