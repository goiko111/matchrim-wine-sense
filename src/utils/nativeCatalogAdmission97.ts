import { canonicalProducerKey } from './winerimLabelIdentity';
import { canLookupWinerimOriginal, type WinerimOriginalIdentity } from './winerimOriginalSheet';

export type NativeCatalogAdmissionCandidate97 = WinerimOriginalIdentity & {
  confidence: number;
  evidence: readonly string[];
};

const tokens = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().match(/[a-z0-9]+/g) ?? [];
const connectors = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'of', 'the', 'and', 'y']);
const producerWrappers = new Set(['bodega', 'bodegas', 'winery', 'wines', 'sa', 'sl', 'ltd', 'limited']);
const distinctiveTokens = (value: string, producer = false) => tokens(value)
  .filter(token => !connectors.has(token) && (!producer || !producerWrappers.has(token)));

// Admission to a strict native GET only, never identity verification or affinity.
// Evidence must be the backend-grounded fragments, not text synthesized from fields.
export const canAdmitNativeCatalogLookup97 = (candidate: NativeCatalogAdmissionCandidate97): boolean => {
  if (!candidate || !Number.isFinite(candidate.confidence) || candidate.confidence < 0.72
    || !Array.isArray(candidate.evidence) || candidate.evidence.some(fragment => typeof fragment !== 'string')
    || !canLookupWinerimOriginal(candidate)) return false;

  const fragments = candidate.evidence.map(tokens).filter(fragment => fragment.length > 0);
  // Punctuation/spacing variants of the same letters are not independent fragments.
  if (new Set(fragments.map(fragment => fragment.join(''))).size < 2) return false;
  const visible = new Set(fragments.flat());
  const name = distinctiveTokens(candidate.name);
  const producer = distinctiveTokens(canonicalProducerKey(candidate.producer), true);
  if (!name.some(token => token.length >= 2) || !producer.length
    || ![...name, ...producer].every(token => visible.has(token))) return false;
  return candidate.vintage == null || visible.has(String(candidate.vintage).trim());
};
