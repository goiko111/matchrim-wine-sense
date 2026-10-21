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
