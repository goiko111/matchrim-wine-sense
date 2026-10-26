import { z } from 'zod';
import type { WineCandidate } from './multiWineScan';
import { isGlobalWine103, exactGlobalVintage103 } from './nativeGlobalCatalogue103';
import { isVerifiedNativeMaster102 } from './nativeMasterCatalog102';
import { isVerifiedWinerimSheetForIdentity, hasExactWinerimProducer, hasWinerimGeographyConflict } from './winerimOriginalSheet';
import { readCellarPublicReference107 } from './cellarPublicReference107';
import { readCellarSensoryEvidence } from './bodegaAffinity';
import { isSafeCanonicalLabelMatch } from './winerimLabelIdentity';
import { nativeMasterLink259 } from './nativeMasterLink259';
import { readCellarMasterReference260 } from './cellarMasterReference260';

export type PersonalRating159 = 'love' | 'ok' | 'not_for_me';
const rowSchema = z.object({ id: z.string().min(1), user_id: z.string().min(1),
  name: z.string().trim().min(1), producer: z.string().nullable(),
  vintage: z.number().int().min(1900).max(2099).nullable(),
  region: z.string().nullable(), country: z.string().nullable(),
  rating: z.enum(['love', 'ok', 'not_for_me']), place_details: z.unknown(), sensory_attributes: z.unknown() });
export interface SavedVerdictRow159 {
  id: string; user_id: string; name: string; producer: string | null; vintage: number | null;
  region: string | null; country: string | null; rating: PersonalRating159; place_details?: unknown; sensory_attributes?: unknown;
}
export type NativeVerdicts159 = { ownerId: string | null; status: 'ready' | 'unavailable'; rows: SavedVerdictRow159[] };
// A complete owner-bound read is separate from which tastings train the profile.
export const nativeVerdictsSnapshot159 = (ownerId: string | null, rows: unknown, count: unknown): NativeVerdicts159 => {
  const unavailable: NativeVerdicts159 = { ownerId, status: 'unavailable', rows: [] };
  if (!ownerId || !Array.isArray(rows) || !Number.isSafeInteger(count) || count !== rows.length || rows.length > 1000) return unavailable;
  const parsed = z.array(rowSchema).safeParse(rows);
  if (!parsed.success || parsed.data.some(row => row.user_id !== ownerId)
    || new Set(parsed.data.map(row => row.id)).size !== parsed.data.length) return unavailable;
  return { ownerId, status: 'ready', rows: parsed.data as SavedVerdictRow159[] };
};

export const personalVerdictTitle159 = (rating: PersonalRating159) => rating === 'love'
  ? 'Tu valoración: te encanta' : rating === 'not_for_me' ? 'Tu valoración: no es para ti' : 'Tu valoración: correcto';

export const resolveNativeRescanVerdict159 = (
  ownerId: string | null, snapshot: NativeVerdicts159 | null, candidate: WineCandidate | null,
): PersonalRating159 | null => {
  if (!ownerId || snapshot?.ownerId !== ownerId || snapshot.status !== 'ready' || !candidate) return null;
  const global = isGlobalWine103(candidate, candidate.globalRecord) ? candidate.globalRecord : null;
  const master = isVerifiedNativeMaster102(candidate, candidate.masterRecord) ? candidate.masterRecord : null;
  const sheet = isVerifiedWinerimSheetForIdentity(candidate, candidate.originalSheet) ? candidate.originalSheet : null;
  const hosted = nativeMasterLink259(candidate);
  if (!global && !master && !sheet && !hosted) return null;
  if (candidate.vintage == null && !global) return null;
  // Unknown bottle years must not inherit the verdict for a dated catalogue row.
  if (global && !exactGlobalVintage103(candidate, global)
    && !(candidate.vintage === null && global.vintage === null)) return null;
  if (hosted && !hosted.wine.vintages.includes(String(candidate.vintage))) return null;
  const identity = hosted ? { name: hosted.wine.name, producer: hosted.wine.winery,
    vintage: candidate.vintage, region: hosted.wine.region, country: hosted.wine.country } : global ?? master ?? sheet ?? candidate;
  const matches = snapshot.rows.filter(row => {
    if (row.user_id !== ownerId || row.vintage !== candidate.vintage
      || !isSafeCanonicalLabelMatch(row, identity) || !hasExactWinerimProducer(row.producer, identity.producer)) return false;
    if (hasWinerimGeographyConflict(row, identity)) return false;
    const details = row.place_details && typeof row.place_details === 'object' && !Array.isArray(row.place_details)
      ? row.place_details as Record<string, unknown> : null;
    const trace = details?.bodega_sensory_evidence;
    if (trace) {
      if (!readCellarSensoryEvidence(row)) return false;
      const savedId = (trace as Record<string, unknown>).canonical_id;
      const expectedId = hosted ? `mantalak-master:${hosted.wine.mantalakWineId}`
        : global ? `winerim-public-store:${global.id}` : master ? `mantalak:${master.id}` : sheet?.id;
      if (hosted && savedId !== expectedId && savedId !== `mantalak:${hosted.wine.mantalakWineId}`
        && !(hosted.wine.representativePublicId !== null
          && savedId === `winerim-public-store:${hosted.wine.representativePublicId}`)) return false;
      if (!hosted && typeof savedId === 'string' && (/^(mantalak|winerim-public-store):/.test(savedId)
        || sheet && !savedId.includes(':')) && savedId !== expectedId) return false;
    }
    const publicReference = readCellarPublicReference107(row);
    const hostedReference = readCellarMasterReference260(row);
    if (details && Object.prototype.hasOwnProperty.call(details, 'winerim_master_reference260')) {
      if (!hostedReference) return false;
      if (hosted && hostedReference.mantalak_wine_id !== hosted.wine.mantalakWineId) return false;
      if (master && String(hostedReference.mantalak_wine_id) !== master.id) return false;
      if (global && hostedReference.representative_public_id !== global.id) return false;
      // Library IDs have no observed master-ID mapping in this contract.
      if (sheet && !hosted && !master && !global) return false;
    }
    if (hosted && details && Object.prototype.hasOwnProperty.call(details, 'winerim_public_catalogue') && !publicReference) return false;
    if (hosted && publicReference && publicReference.id !== hosted.wine.representativePublicId) return false;
    if (global && publicReference && publicReference.id !== global.id) return false;
    // Null is not evidence of NV. Undated public matches need the same saved public ID.
    if (global && candidate.vintage === null && publicReference?.id !== global.id) return false;
    return true;
  });
  const ratings = new Set(matches.map(row => row.rating));
  return ratings.size === 1 ? matches[0].rating : null;
};
