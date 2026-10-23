import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import { cellarAffinityView, type CellarAffinityWine } from './bodegaAffinity';
import type { MatchrimProfileLike } from './matchrimPassport';
import type { ScanProfileSnapshot } from './scanProfile';
import { globalSensory103, isGlobalWine103, type GlobalWine103 } from './nativeGlobalCatalogue103';
import { makeCellarPublicReference107, readCellarPublicReference107 } from './cellarPublicReference107';
import { calculateLocalMatchrimAffinity, currentLocalAffinityModel187, normalizeWineAttributesForInsight } from './wineAffinityExplanation';

const key = 'matchrim_reference_style110';
const axis = z.number().finite().min(0).max(5);
const date = z.string().max(40).datetime();
const profileSchema = z.object({ potente: axis, acidez: axis, dulce: axis, tanico: axis, afrutado: axis }).strict();
const attributesSchema = z.object({ scale: z.literal('winerim-0-5'),
  potencia: axis, acidez: axis, dulzura: axis, taninos: axis, afrutado: axis }).strict();
const initialSchema = z.object({ score: z.number().int().min(0).max(100), recorded_at: date,
  profile: profileSchema, profile_source: z.enum(['quiz', 'learned']),
  samples: z.number().int().nonnegative().safe().nullable() }).strict();
const schema = z.object({ version: z.literal(1), model: z.literal('reference-style-l2-0to5-v1'),
  scale: z.literal('winerim-0-5'), provenance: z.literal('unspecified'), recorded_at: date,
  public_reference: z.unknown(), attributes: attributesSchema,
  attribute_signature: z.string().max(240), initial: initialSchema.nullable() }).strict();
const snapshotSchema = z.object({ profile: profileSchema, profile_source: z.enum(['quiz', 'learned']),
  samples: z.number().int().nonnegative().safe().nullable(),
  status: z.enum(['ready', 'training-error', 'training-timeout']) });

// Explicit validated types: z.infer makes required properties optional with strictNullChecks off.
export type CellarReferenceStyleAttributes110 = {
  scale: 'winerim-0-5'; potencia: number; acidez: number; dulzura: number; taninos: number; afrutado: number;
};
export type CellarReferenceStyleInitial110 = {
  score: number; recorded_at: string; profile: MatchrimProfileLike;
  profile_source: 'quiz' | 'learned'; samples: number | null;
};
export type CellarReferenceStyle110 = {
  version: 1; model: 'reference-style-l2-0to5-v1'; scale: 'winerim-0-5'; provenance: 'unspecified';
  recorded_at: string; public_reference: Json; attributes: CellarReferenceStyleAttributes110;
  attribute_signature: string; initial: CellarReferenceStyleInitial110 | null;
};
export type CellarReferenceStyleView110 = {
  current: number | null; initial: CellarReferenceStyleInitial110 | null;
  delta: number | null; attributes: CellarReferenceStyleAttributes110;
};
const record = (input: unknown): Record<string, unknown> | null =>
  input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : null;
// An exact normalized binding, not a cryptographic proof or evidence of a tasting.
const signature = (attributes: CellarReferenceStyleAttributes110) => {
  const normalized = normalizeWineAttributesForInsight(attributes)!;
  return JSON.stringify([attributes.scale, normalized.potente, normalized.acidez,
    normalized.dulce, normalized.tanico, normalized.afrutado]);
};
const validSnapshot = (snapshot: ScanProfileSnapshot | null): {
  profile: MatchrimProfileLike; profile_source: 'quiz' | 'learned'; samples: number | null;
} | null => {
  if (!snapshot) return null;
  const parsed = snapshotSchema.safeParse({ profile: snapshot.profile, profile_source: snapshot.source,
    samples: snapshot.samples, status: snapshot.status });
  return parsed.success ? parsed.data as {
    profile: MatchrimProfileLike; profile_source: 'quiz' | 'learned'; samples: number | null;
  } : null;
};

// Presentation only. Never writes sensory_attributes, canonical identity, exact affinity or training evidence.
export const makeCellarReferenceStyle110 = (
  wine: CellarAffinityWine, global: GlobalWine103, snapshot: ScanProfileSnapshot | null,
  recordedAt = new Date().toISOString(),
): Json | null => {
  if (!isGlobalWine103(wine, global) || global.vintage !== null) return null;
  const publicReference = makeCellarPublicReference107(wine, global);
  const parsedAttributes = attributesSchema.safeParse(globalSensory103(global));
  if (!publicReference || !parsedAttributes.success) return null;
  const attributes = parsedAttributes.data as CellarReferenceStyleAttributes110;
  const attributeSignature = signature(attributes);
  const previous = readCellarReferenceStyle110(wine);
  if (previous) {
    // A catalogue refresh must never redefine what the user saw when saving.
    // Keep that immutable snapshot; a different public binding needs a separate migration.
    return JSON.stringify(previous.public_reference) === JSON.stringify(publicReference) ? previous as unknown as Json : null;
  }
  const profile = validSnapshot(snapshot);
  const initial = profile ? { score: calculateLocalMatchrimAffinity(profile.profile, attributes, 'scan-local-l2-0to5-v2'),
    recorded_at: recordedAt, profile: profile.profile, profile_source: profile.profile_source, samples: profile.samples } : null;
  const parsed = schema.safeParse({ version: 1, model: 'reference-style-l2-0to5-v1', scale: 'winerim-0-5',
    provenance: 'unspecified', recorded_at: recordedAt, public_reference: publicReference,
    attributes, attribute_signature: attributeSignature, initial });
  return parsed.success ? parsed.data as Json : null;
};

export const readCellarReferenceStyle110 = (wine: CellarAffinityWine): CellarReferenceStyle110 | null => {
  const parsed = schema.safeParse(record(wine.place_details)?.[key]);
  if (!parsed.success) return null;
  const data = parsed.data as CellarReferenceStyle110;
  // Legacy public vectors can be server defaults. Keep stored history intact,
  // but do not revive its score without a new sourced sensory contract.
  if (data.provenance === 'unspecified') return null;
  const embedded = readCellarPublicReference107({ ...wine,
    place_details: { winerim_public_catalogue: data.public_reference } });
  const linked = readCellarPublicReference107(wine);
  if (!embedded || !linked || embedded.catalogue_vintage !== null
    || JSON.stringify(embedded) !== JSON.stringify(linked)
    || data.attribute_signature !== signature(data.attributes)
    || (data.initial && (data.initial.recorded_at !== data.recorded_at
      || calculateLocalMatchrimAffinity(data.initial.profile, data.attributes, 'scan-local-l2-0to5-v2') !== data.initial.score))) return null;
  // JSONB may reorder object keys; 107 supplies a stable validated reference shape.
  const { url: _url, ...publicReference } = embedded;
  return { ...data, public_reference: publicReference as Json };
};

export const cellarReferenceStyleView110 = (
  wine: CellarAffinityWine, snapshot: ScanProfileSnapshot | null,
): CellarReferenceStyleView110 | null => {
  const data = readCellarReferenceStyle110(wine);
  if (!data) return null;
  const profile = validSnapshot(snapshot);
  const current = profile ? calculateLocalMatchrimAffinity(profile.profile, data.attributes) : null;
  return { current, initial: data.initial, delta: current !== null && data.initial
    && currentLocalAffinityModel187(data.attributes) === 'scan-local-l2-0to5-v2' ? current - data.initial.score : null,
    attributes: data.attributes };
};

export const confirmsCellarReferenceStyle110 = (data: unknown, expected: CellarAffinityWine): boolean => {
  if (!Object.prototype.hasOwnProperty.call(record(expected.place_details) || {}, key)) return true;
  const row = record(data);
  if (!row || typeof row.name !== 'string') return false;
  const wanted = readCellarReferenceStyle110(expected);
  // Validate the returned identity through 107 before accepting a style-save acknowledgment.
  const identity = z.object({ name: z.string(), producer: z.string().nullable(), vintage: z.number().int().nullable(),
    region: z.string().nullable(), country: z.string().nullable() }).safeParse({ name: row.name,
    producer: row.producer ?? null, vintage: row.vintage ?? null, region: row.region ?? null, country: row.country ?? null });
  if (!identity.success || !wanted) return false;
  const actual = readCellarReferenceStyle110({ ...identity.data as CellarAffinityWine, place_details: row.place_details });
  return Boolean(actual && JSON.stringify(actual) === JSON.stringify(wanted));
};

// Presentation/filtering only; never use this score as training evidence.
export const cellarDisplayAffinity110 = (wine: CellarAffinityWine, snapshot: ScanProfileSnapshot | null) =>
  cellarAffinityView(wine, snapshot, true).current ?? cellarReferenceStyleView110(wine, snapshot)?.current ?? null;
export const isHighCellarAffinity110 = (wine: CellarAffinityWine & { rating?: string | null }, snapshot: ScanProfileSnapshot | null) =>
  wine.rating !== 'not_for_me' && (cellarDisplayAffinity110(wine, snapshot) ?? -1) >= 70;
