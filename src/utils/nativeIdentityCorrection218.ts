import { correctWineCandidateIdentity, type WineCandidate } from './multiWineScan';
import { isPendingLocalIdentity109 } from './nativeSingleLabel109';

export type NativeIdentity218 = Pick<WineCandidate, 'name' | 'producer' | 'vintage'>;
type Draft218 = { name: string; producer: string; vintage: string };
export const nativeIdentityDraft218 = (identity: NativeIdentity218): Draft218 => ({
  name: isPendingLocalIdentity109(identity) ? '' : identity.name,
  producer: identity.producer ?? '', vintage: identity.vintage == null ? '' : String(identity.vintage),
});
export type IdentityValidation218 = { ok: true; identity: NativeIdentity218 }
  | { ok: false; field: keyof Draft218; message: string };
const safeText = (value: string) => value.length <= 240 && !Array.from(value).some(char => {
  const code = char.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159)
    || (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);
});

export const validateNativeIdentity218 = (draft: Draft218): IdentityValidation218 => {
  const name = draft.name.trim(), producer = draft.producer.trim(), vintage = draft.vintage.trim();
  if (!name || !safeText(name)) return { ok: false, field: 'name', message: 'Escribe un nombre de vino válido (máximo 240 caracteres).' };
  if (!safeText(producer)) return { ok: false, field: 'producer', message: 'La bodega contiene caracteres no válidos o supera 240 caracteres.' };
  if (vintage && !/^(19|20)\d{2}$/.test(vintage)) return { ok: false, field: 'vintage', message: 'La añada debe estar entre 1900 y 2099, o quedar vacía.' };
  return { ok: true, identity: { name, producer: producer || null, vintage: vintage ? Number(vintage) : null } };
};

export const correctNativeIdentity218 = (candidate: WineCandidate, identity: NativeIdentity218): WineCandidate | null => {
  const checked = validateNativeIdentity218({ name: identity.name, producer: identity.producer ?? '', vintage: identity.vintage == null ? '' : String(identity.vintage) });
  if (checked.ok === false) return null;
  const next = checked.identity;
  if (candidate.name === next.name && candidate.producer === next.producer && candidate.vintage === next.vintage) return candidate;
  // Harvest changes invalidate the same catalogue/sensory authority as a name
  // correction; retain only the explicitly entered new harvest, never old facts.
  return { ...correctWineCandidateIdentity(candidate, { name: next.name, producer: next.producer }),
    masterRecord: null, masterLink259: null, vintage: next.vintage };
};
