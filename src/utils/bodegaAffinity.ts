import { z } from 'zod';
import type { Json } from '@/integrations/supabase/types';
import type { ScanProfileSnapshot } from './scanProfile';
import type { MatchrimProfileLike } from './matchrimPassport';
import type { TrainableWine } from './matchrimLearning';
import type { WineAttributeInput } from './wineAffinityExplanation';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from './wineAffinityExplanation';

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
  const values = normalizeWineAttributesForInsight(attributes);
  return values ? JSON.stringify([values.potente, values.acidez, values.dulce, values.tanico, values.afrutado]) : null;
};
const evidenceSchema = z.object({
  version: z.literal(1), source: z.literal('catalog'), canonical_id: z.string().trim().min(1),
  identity_signature: z.string(), attribute_signature: z.string(),
});
const profileSchema = z.object({ potente: z.number().min(0).max(5), acidez: z.number().min(0).max(5),
  dulce: z.number().min(0).max(5), tanico: z.number().min(0).max(5), afrutado: z.number().min(0).max(5) });
const initialSchema = z.object({
  version: z.literal(1), model: z.literal('scan-local-l2-v1'),
  identity_signature: z.string(), attribute_signature: z.string(),
  score: z.number().int().min(0).max(100), recorded_at: z.string().datetime(),
  phase: z.enum(['saved', 'first_verified']), profile: profileSchema,
  profile_source: z.enum(['quiz', 'learned']), samples: z.number().int().nonnegative().nullable(),
});
const persistedIdentitySchema = z.object({ name: z.string(), producer: z.string().nullable(),
  vintage: z.number().int().nullable(), region: z.string().nullable(), country: z.string().nullable() });

export const makeCellarCatalogEvidence = (
  wine: CellarAffinityWine, canonicalId: string | number, attributes: WineAttributeInput,
): Json | null => {
  const signature = attributesSignature(attributes);
  const id = String(canonicalId).trim();
  if (!wine.name.trim() || !id || /^(unknown|manual|external|generated)(?:$|[-_:])/i.test(id) || !signature) return null;
  return { version: 1, source: 'catalog', canonical_id: id,
    identity_signature: identitySignature(wine), attribute_signature: signature };
};

export const readCellarSensoryEvidence = (wine: CellarAffinityWine) => {
  const attributes = record(wine.sensory_attributes) as WineAttributeInput | null;
  if (!attributes || !normalizeWineAttributesForInsight(attributes)) return null;
  const details = record(wine.place_details);
  const trace = evidenceSchema.safeParse(details?.bodega_sensory_evidence);
  if (trace.success && trace.data.identity_signature === identitySignature(wine)
    && trace.data.attribute_signature === attributesSignature(attributes)) return attributes;
  // Legacy menu metadata does not bind identity or attributes; require reverification.
  return null;
};

export const isVerifiedCellarTrainingWine = (value: unknown): boolean => {
  const wine = record(value);
  return Boolean(wine && typeof wine.name === 'string' && wine.use_for_profile_training === true
    && ['love', 'ok', 'not_for_me'].includes(String(wine.rating))
    && readCellarSensoryEvidence(wine as unknown as CellarAffinityWine));
};

export const cellarTrainingRows = (rows: TrainableWine[], strict: boolean): TrainableWine[] => {
  if (!strict) return rows;
  return rows.filter(isVerifiedCellarTrainingWine).map(wine => {
    const details = record(record(wine)?.place_details);
    const attributes = normalizeWineAttributesForInsight(readCellarSensoryEvidence(wine as unknown as CellarAffinityWine))!;
    const raw = details?.matchrim_rating_at;
    const timestamp = typeof raw === 'string' && Number.isFinite(Date.parse(raw)) ? raw : null;
    // Metadata edits are not a new tasting; unknown historic rating dates stay unknown.
    return { ...wine, sensory_attributes: { potencia: attributes.potente, acidez: attributes.acidez,
      dulzura: attributes.dulce, taninos: attributes.tanico, afrutado: attributes.afrutado },
      created_at: timestamp, updated_at: timestamp };
  });
};

export const readCellarInitialAffinity = (wine: CellarAffinityWine) => {
  const parsed = initialSchema.safeParse(record(wine.place_details)?.matchrim_affinity_initial);
  const attributes = readCellarSensoryEvidence(wine);
  if (!parsed.success || !attributes || parsed.data.identity_signature !== identitySignature(wine)
    || parsed.data.attribute_signature !== attributesSignature(attributes)
    || calculateLocalMatchrimAffinity(parsed.data.profile as MatchrimProfileLike, attributes) !== parsed.data.score) return null;
  return parsed.data;
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
  return JSON.stringify(readCellarInitialAffinity(actual)) === JSON.stringify(readCellarInitialAffinity(expected));
};

export const cellarAffinityView = (wine: CellarAffinityWine, snapshot: ScanProfileSnapshot | null) => {
  const attributes = readCellarSensoryEvidence(wine);
  const current = attributes ? calculateLocalMatchrimAffinity(snapshot?.profile, attributes) : null;
  const initial = readCellarInitialAffinity(wine);
  return { current, initial, attributes, delta: current !== null && initial ? current - initial.score : null,
    reason: !snapshot ? 'Cargando tu perfil de gustos.'
      : !snapshot.profile ? snapshot.note
        : !attributes ? 'Falta una ficha sensorial verificable de esta referencia; no basta con su nombre o una estimaci\u00f3n de IA.'
          : snapshot.note };
};

export const withCellarInitialAffinity = (
  wine: CellarAffinityWine, snapshot: ScanProfileSnapshot | null, phase: 'saved' | 'first_verified',
  recordedAt = new Date().toISOString(),
): Json => {
  const details = { ...record(wine.place_details) };
  if (readCellarInitialAffinity(wine)) return details as Json;
  // Invalidated identities must not retain another wine's historical score.
  delete details.matchrim_affinity_initial;
  const view = cellarAffinityView(wine, snapshot);
  if (view.current !== null && view.attributes && snapshot?.profile && snapshot.source !== 'unavailable') {
    const initial = initialSchema.safeParse({ version: 1, model: 'scan-local-l2-v1',
      identity_signature: identitySignature(wine), attribute_signature: attributesSignature(view.attributes),
      score: view.current, recorded_at: recordedAt, phase, profile: snapshot.profile,
      profile_source: snapshot.source, samples: snapshot.samples });
    if (initial.success) details.matchrim_affinity_initial = initial.data;
  }
  return details as Json;
};
