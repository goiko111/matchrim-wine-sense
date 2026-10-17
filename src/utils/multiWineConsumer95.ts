import type { MatchrimProfileLike } from './matchrimPassport';
import { getSelectedCandidate, type ScanRegion, type WineCandidate } from './multiWineScan';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from './wineAffinityExplanation';
import { isVerifiedWinerimSheetForIdentity, validateWinerimOriginalSensory } from './winerimOriginalSheet';

// Presentation only: OCR confidence and user review never certify a catalog sheet.
export const nativeWineConsumerResult = (candidate: WineCandidate | null, profile: MatchrimProfileLike | null) => {
  const sheet = candidate?.originalSheet;
  const linked = Boolean(candidate && isVerifiedWinerimSheetForIdentity(candidate, sheet));
  const original = validateWinerimOriginalSensory(sheet?.sensoryAttributes);
  const attributes = normalizeWineAttributesForInsight(candidate?.sensoryAttributes);
  const originalAttributes = original ? normalizeWineAttributesForInsight({ ...original, scale: 'winerim-0-5' }) : null;
  const sameAttributes = Boolean(attributes && originalAttributes
    && (Object.keys(originalAttributes) as Array<keyof typeof originalAttributes>)
      .every(key => attributes[key] === originalAttributes[key]));
  const calculated = sameAttributes ? calculateLocalMatchrimAffinity(profile, candidate?.sensoryAttributes) : null;
  const canExplainAffinity = Boolean(linked && candidate?.canonicalId === sheet?.id
    && candidate?.sensorySource === 'catalog' && sameAttributes
    && typeof candidate?.affinity === 'number' && Number.isFinite(candidate.affinity)
    && candidate.affinity >= 0 && candidate.affinity <= 100
    && calculated !== null && candidate.affinity === calculated);
  return {
    catalogIdentityLinked: linked,
    identityLabel: linked ? 'Ficha original vinculada'
      : candidate?.source === 'manual' ? 'Identidad indicada por ti'
        : candidate ? 'Referencia propuesta' : 'Identificación pendiente',
    affinityLabel: canExplainAffinity ? 'Afinidad orientativa' : 'Afinidad pendiente',
    affinityValue: canExplainAffinity ? `≈${Math.round(candidate!.affinity!)}/100` : 'Pendiente',
    canExplainAffinity,
  };
};

export const nextNativeWineReview = (regions: ScanRegion[]) => {
  const active = regions.filter(region => region.status !== 'discarded');
  return active.find(region => region.error || region.status !== 'recognized' || !getSelectedCandidate(region)?.name.trim())
    ?? active[0] ?? null;
};
