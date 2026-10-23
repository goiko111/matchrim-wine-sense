import { z } from 'zod';
import { Capacitor } from '@capacitor/core';
import type { Json } from '@/integrations/supabase/types';
import type { ScanProfileSnapshot } from './scanProfile';
import type { MatchrimProfileLike } from './matchrimPassport';
import type { TrainableWine } from './matchrimLearning';
import type { WineAttributeInput } from './wineAffinityExplanation';
import { calculateLocalMatchrimAffinity, currentLocalAffinityModel187, normalizeWineAttributesForInsight } from './wineAffinityExplanation';

export interface CellarAffinityWine {
  name: string;
  producer?: string | null;
  vintage?: number | null;
  region?: string | null;
  country?: string | null;
  sensory_attributes?: unknown;
  place_details?: unknown;
}

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const normalize = (value?: string | null) => (value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const identitySignature = (wine: CellarAffinityWine) => JSON.stringify([
  normalize(wine.name), normalize(wine.producer), wine.vintage ?? null,
  normalize(wine.region), normalize(wine.country),
]);
const attributesSignature = (attributes: WineAttributeInput) => {
  if (attributes.scale !== undefined && attributes.scale !== 'winerim-0-5') return null;
  const values = normalizeWineAttributesForInsight(attributes);
  if (!values) return null;
  const axes = [values.potente, values.acidez, values.dulce, values.tanico, values.afrutado];
  return JSON.stringify(attributes.scale === 'winerim-0-5' ? [attributes.scale, ...axes] : axes);
};
const evidenceFields = {
  source: z.literal('catalog'), canonical_id: z.string().trim().min(1),
  identity_signature: z.string(), attribute_signature: z.string(),
};
const evidenceSchema = z.discriminatedUnion('version', [
  z.object({ ...evidenceFields, version: z.literal(1), scale: z.undefined().optional() }),
  z.object({ ...evidenceFields, version: z.literal(2), scale: z.literal('winerim-0-5') }),
]);
const profileSchema = z.object({ potente: z.number().min(0).max(5), acidez: z.number().min(0).max(5),
  dulce: z.number().min(0).max(5), tanico: z.number().min(0).max(5), afrutado: z.number().min(0).max(5) });
const initialFields = {
  identity_signature: z.string(), attribute_signature: z.string(),
  score: z.number().int().min(0).max(100), recorded_at: z.string().datetime(),
  phase: z.enum(['saved', 'first_verified']), profile: profileSchema,
  profile_source: z.enum(['quiz', 'learned']), samples: z.number().int().nonnegative().nullable(),
};
const initialSchema = z.discriminatedUnion('model', [
  z.object({ ...initialFields, version: z.literal(1), model: z.literal('scan-local-l2-v1'), scale: z.undefined().optional() }),
  z.object({ ...initialFields, version: z.literal(2), model: z.literal('scan-local-l2-0to5-v2'), scale: z.literal('winerim-0-5') }),
  z.object({ ...initialFields, version: z.literal(3), model: z.literal('scan-local-rms-0to5-v3'), scale: z.literal('winerim-0-5') }),
]);
const persistedIdentitySchema = z.object({ name: z.string(), producer: z.string().nullable(),
  vintage: z.number().int().nullable(), region: z.string().nullable(), country: z.string().nullable() });

export const hasLegacyPublicSensory184 = (wine: CellarAffinityWine) => {
  const trace = record(record(wine.place_details)?.bodega_sensory_evidence);
  return typeof trace?.canonical_id === 'string' && trace.canonical_id.startsWith('winerim-public-store:');
};

export const makeCellarCatalogEvidence = (
  wine: CellarAffinityWine, canonicalId: string | number, attributes: WineAttributeInput,
): Json | null => {
  const signature = attributesSignature(attributes);
  const id = String(canonicalId).trim();
  if (!wine.name.trim() || !id || /^(unknown|manual|external|generated)(?:$|[-_:])/i.test(id) || !signature) return null;
  return { ...(attributes.scale === 'winerim-0-5' ? { version: 2, scale: attributes.scale } : { version: 1 }),
    source: 'catalog', canonical_id: id,
    identity_signature: identitySignature(wine), attribute_signature: signature };
};

export const readCellarSensoryEvidence = (wine: CellarAffinityWine, native = false) => {
  const attributes = record(wine.sensory_attributes) as WineAttributeInput | null;
  if (!attributes || !normalizeWineAttributesForInsight(attributes)) return null;
  const details = record(wine.place_details);
  const trace = evidenceSchema.safeParse(details?.bodega_sensory_evidence);
  if (trace.success && !(native && hasLegacyPublicSensory184(wine))
    && trace.data.scale === attributes.scale && trace.data.identity_signature === identitySignature(wine)
    && trace.data.attribute_signature === attributesSignature(attributes)) return attributes;
  // Legacy menu metadata does not bind identity or attributes; require reverification.
  return null;
};

export const isVerifiedCellarTrainingWine = (value: unknown, native = false): boolean => {
  const wine = record(value);
  return Boolean(wine && typeof wine.name === 'string' && wine.use_for_profile_training === true
    && ['love', 'ok', 'not_for_me'].includes(String(wine.rating))
    && readCellarSensoryEvidence(wine as unknown as CellarAffinityWine, native));
};

export const cellarTrainingRows = (rows: TrainableWine[], strict: boolean): TrainableWine[] => {
  if (!strict) return rows;
  return rows.filter(wine => isVerifiedCellarTrainingWine(wine, true)).map(wine => {
    const details = record(record(wine)?.place_details);
    const sensory = readCellarSensoryEvidence(wine as unknown as CellarAffinityWine, true)!;
    const attributes = normalizeWineAttributesForInsight(sensory)!;
    const raw = details?.matchrim_rating_at;
    const timestamp = typeof raw === 'string' && Number.isFinite(Date.parse(raw)) ? raw : null;
    // Metadata edits are not a new tasting; unknown historic rating dates stay unknown.
    return { ...wine, sensory_attributes: { ...(sensory.scale === 'winerim-0-5' ? { scale: sensory.scale } : {}),
      potencia: attributes.potente, acidez: attributes.acidez,
      dulzura: attributes.dulce, taninos: attributes.tanico, afrutado: attributes.afrutado },
      created_at: timestamp, updated_at: timestamp };
  });
};

const readStoredInitial187 = (wine: CellarAffinityWine, key: string, native: boolean) => {
  const parsed = initialSchema.safeParse(record(wine.place_details)?.[key]);
  const attributes = readCellarSensoryEvidence(wine, native);
  if (!parsed.success || !attributes || parsed.data.scale !== attributes.scale
    || parsed.data.identity_signature !== identitySignature(wine)
    || parsed.data.attribute_signature !== attributesSignature(attributes)
    || calculateLocalMatchrimAffinity(parsed.data.profile as MatchrimProfileLike, attributes, parsed.data.model) !== parsed.data.score) return null;
  return parsed.data;
};
const initialBinding187 = (value: z.infer<typeof initialSchema>) => JSON.stringify([
  value.identity_signature, value.attribute_signature, value.recorded_at, value.phase,
  value.profile, value.profile_source, value.samples, value.scale,
]);

export const readCellarInitialAffinity = (wine: CellarAffinityWine, native = false) => {
  const legacy = readStoredInitial187(wine, 'matchrim_affinity_initial', native);
  if (!native || legacy?.model !== 'scan-local-l2-0to5-v2') return legacy;
  const current = readStoredInitial187(wine, 'matchrim_affinity_initial_v3', native);
  return current?.model === 'scan-local-rms-0to5-v3' && initialBinding187(current) === initialBinding187(legacy)
    ? current : legacy;
};

export const confirmsCellarSaveEvidence = (data: unknown, expected: CellarAffinityWine): boolean => {
  const expectedDetails = record(expected.place_details);
  const expectedTrace = evidenceSchema.safeParse(expectedDetails?.bodega_sensory_evidence);
  if (!expectedTrace.success) return !expectedDetails?.bodega_sensory_evidence;
  const row = record(data);
  const identity = persistedIdentitySchema.safeParse(row);
  const actualDetails = record(row?.place_details);
  const actualTrace = evidenceSchema.safeParse(actualDetails?.bodega_sensory_evidence);
  if (!identity.success || !actualTrace.success || identitySignature(identity.data as CellarAffinityWine) !== identitySignature(expected)
    || JSON.stringify(actualTrace.data) !== JSON.stringify(expectedTrace.data)) return false;
  const actual: CellarAffinityWine = { ...(identity.data as CellarAffinityWine),
    sensory_attributes: row?.sensory_attributes, place_details: actualDetails };
  if (!readCellarSensoryEvidence(actual)) return false;
  if (Object.prototype.hasOwnProperty.call(expectedDetails, 'matchrim_affinity_initial')
    !== Object.prototype.hasOwnProperty.call(actualDetails, 'matchrim_affinity_initial')) return false;
  const currentSnapshot = Object.prototype.hasOwnProperty.call(expectedDetails, 'matchrim_affinity_initial_v3');
  if (currentSnapshot !== Object.prototype.hasOwnProperty.call(actualDetails, 'matchrim_affinity_initial_v3')) return false;
  const actualInitial = readCellarInitialAffinity(actual, currentSnapshot);
  const expectedInitial = readCellarInitialAffinity(expected, currentSnapshot);
  if (currentSnapshot && (actualInitial?.model !== 'scan-local-rms-0to5-v3' || expectedInitial?.model !== 'scan-local-rms-0to5-v3')) return false;
  return JSON.stringify(actualInitial) === JSON.stringify(expectedInitial);
};

export const cellarAffinityView = (wine: CellarAffinityWine, snapshot: ScanProfileSnapshot | null, native = false) => {
  const attributes = readCellarSensoryEvidence(wine, native);
  const model = currentLocalAffinityModel187(attributes, native);
  const current = attributes ? calculateLocalMatchrimAffinity(snapshot?.profile, attributes, model) : null;
  const initial = readCellarInitialAffinity(wine, native);
  const modelChanged = current !== null && Boolean(initial && initial.model !== model);
  const sensoryHold = native && hasLegacyPublicSensory184(wine);
  return { current, initial, attributes, delta: current !== null && initial?.model === model ? current - initial.score : null,
    sensoryHold, modelChanged,
    reason: !snapshot ? 'Cargando tu perfil de gustos.'
      : !snapshot.profile ? snapshot.note
        : !attributes ? 'Falta una ficha sensorial verificable de esta referencia; no basta con su nombre o una estimaci\u00f3n de IA.'
          : snapshot.note };
};

export const withCellarInitialAffinity = (
  wine: CellarAffinityWine, snapshot: ScanProfileSnapshot | null, phase: 'saved' | 'first_verified',
  recordedAt = new Date().toISOString(), native = Capacitor.isNativePlatform(),
): Json => {
  const details = { ...record(wine.place_details) };
  if (readCellarInitialAffinity(wine)) return details as Json;
  // Invalidated identities must not retain another wine's historical score.
  delete details.matchrim_affinity_initial;
  delete details.matchrim_affinity_initial_v3;
  const model = currentLocalAffinityModel187(record(wine.sensory_attributes) as WineAttributeInput | null, native);
  const view = cellarAffinityView(wine, snapshot, native);
  if (view.current !== null && view.attributes && snapshot?.profile && snapshot.source !== 'unavailable') {
    const initial = initialSchema.safeParse({ ...(model === 'scan-local-rms-0to5-v3'
      ? { version: 3, model, scale: 'winerim-0-5' }
      : view.attributes.scale === 'winerim-0-5'
      ? { version: 2, model: 'scan-local-l2-0to5-v2', scale: view.attributes.scale }
      : { version: 1, model: 'scan-local-l2-v1' }),
      identity_signature: identitySignature(wine), attribute_signature: attributesSignature(view.attributes),
      score: view.current, recorded_at: recordedAt, phase, profile: snapshot.profile,
      profile_source: snapshot.source, samples: snapshot.samples });
    if (initial.success) {
      if (model === 'scan-local-rms-0to5-v3') {
        // Older clients must retain a readable immutable snapshot as well.
        details.matchrim_affinity_initial = { ...initial.data, version: 2, model: 'scan-local-l2-0to5-v2',
          score: calculateLocalMatchrimAffinity(snapshot.profile, view.attributes, 'scan-local-l2-0to5-v2') };
        details.matchrim_affinity_initial_v3 = initial.data;
      } else details.matchrim_affinity_initial = initial.data;
    }
  }
  return details as Json;
};
