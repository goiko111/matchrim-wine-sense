import type { Json } from '@/integrations/supabase/types';
import { confirmsWineMutation } from './matchrimWineMutation';
import { confirmsCellarSaveEvidence } from './bodegaAffinity';
import { confirmsCellarPublicReference107 } from './cellarPublicReference107';
import { confirmsCellarReferenceStyle110 } from './cellarReferenceStyle110';

export interface LabelSaveWine {
  nombre: string;
  productor?: string | null;
  anada?: number | null;
  region?: string | null;
  pais?: string | null;
  uvas?: string[] | null;
  alcohol?: number | null;
  notas_cata?: string | null;
  affinity_reason?: string | null;
  imagen_url?: string | null;
  matchrim_affinity?: number | null;
  sensory_attributes?: Json | null;
  affinity_details?: Json | null;
  is_favorite?: boolean;
}

export type LabelSaveResult =
  | { status: 'saved'; rowId: string; ownerId: string }
  | { status: 'rejected' | 'ambiguous' | 'auth-required' | 'obsolete' };

export type LabelSaveCallback = (
  wine: LabelSaveWine,
  context: { isCurrent: () => boolean },
) => Promise<LabelSaveResult>;

export const confirmedLabelInsertId = (data: unknown, wine: LabelSaveWine, ownerId: string): string | null => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const id = (data as Record<string, unknown>).id;
  if (typeof id !== 'string' || !id.trim()) return null;
  return confirmsWineMutation(data, id, {
    user_id: ownerId,
    name: wine.nombre,
    producer: wine.productor || null,
    vintage: wine.anada || null,
    status: 'wishlist',
    is_favorite: Boolean(wine.is_favorite),
    use_for_profile_training: false,
  }) && confirmsCellarReferenceStyle110(data, { name: wine.nombre, producer: wine.productor || null,
    vintage: wine.anada ?? null, region: wine.region || null, country: wine.pais || null,
    place_details: wine.affinity_details }) && confirmsCellarPublicReference107(data, { name: wine.nombre, producer: wine.productor || null,
    vintage: wine.anada ?? null, region: wine.region || null, country: wine.pais || null,
    place_details: wine.affinity_details }) && confirmsCellarSaveEvidence(data, { name: wine.nombre, producer: wine.productor || null,
    vintage: wine.anada ?? null, region: wine.region || null, country: wine.pais || null,
    sensory_attributes: wine.sensory_attributes, place_details: wine.affinity_details }) ? id : null;
};

// Only explicit input/constraint rejection permits a user-initiated retry.
// Missing representation, transport, permission and cardinality errors may hide a committed insert.
export const labelInsertErrorResult = (error: { code?: string } | null): LabelSaveResult => ({
  status: error && ['23502', '23503', '23514', '22P02'].includes(error.code ?? '') ? 'rejected' : 'ambiguous',
});

export interface LabelSaveBatch {
  ownerId: string | null;
  wines: LabelSaveWine[];
  results: Array<LabelSaveResult | undefined>;
}

/** The ledger belongs only to this frozen batch, not a global wine-name deduplicator. */
export const saveLabelBatch = async (
  batch: LabelSaveBatch,
  save: LabelSaveCallback,
  isCurrent: () => boolean,
  onResult: () => void,
): Promise<'confirmed' | 'incomplete' | 'obsolete'> => {
  for (let index = 0; index < batch.wines.length; index += 1) {
    if (!isCurrent()) return 'obsolete';
    const previous = batch.results[index];
    if (previous?.status === 'saved') continue;
    if (previous && previous.status !== 'rejected') return 'incomplete';
    let result: LabelSaveResult;
    try {
      result = await save(batch.wines[index], { isCurrent });
    } catch {
      result = { status: 'ambiguous' };
    }
    if (!isCurrent()) return 'obsolete';
    if (result?.status === 'obsolete') {
      batch.results[index] = result;
      onResult();
      return 'obsolete';
    }
    if (!result || (result.status === 'saved' && (!result.rowId?.trim() || result.ownerId !== batch.ownerId))) {
      result = { status: 'ambiguous' };
    }
    batch.results[index] = result;
    onResult();
    if (result.status !== 'saved') return 'incomplete';
  }
  return batch.wines.length ? 'confirmed' : 'incomplete';
};
