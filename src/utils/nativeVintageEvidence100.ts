import type { WinerimOriginalIdentity } from './winerimOriginalSheet';

// A year-like name suffix and a different explicit vintage need human review.
// This is an abstention, not proof that a numbered cuvee or catalogue row is wrong.
export const hasConflictingNativeVintage100 = (identity: WinerimOriginalIdentity): boolean => {
  if (typeof identity.name !== 'string' || identity.vintage == null) return false;
  const vintage = String(identity.vintage).trim();
  if (!/^(19|20)\d{2}$/.test(vintage)) return false;
  const suffix = identity.name.trim().match(/(?:^|[\s([])((?:19|20)\d{2})[)\]]?$/u)?.[1];
  return Boolean(suffix && suffix !== vintage);
};
