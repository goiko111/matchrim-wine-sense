import type { MatchrimProfileLike } from './matchrimPassport';
import { getSelectedCandidate, type ScanRegion, type WineCandidate } from './multiWineScan';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from './wineAffinityExplanation';
import { isVerifiedWinerimSheetForIdentity, validateWinerimOriginalSensory } from './winerimOriginalSheet';
import { isVerifiedNativeMaster102 } from './nativeMasterCatalog102';

// Presentation only: OCR confidence and user review never certify a catalog sheet.
export const nativeWineConsumerResult = (candidate: WineCandidate | null, profile: MatchrimProfileLike | null) => {
  const master = candidate && isVerifiedNativeMaster102(candidate, candidate.masterRecord) ? candidate.masterRecord : null;
  if (master && candidate.canonicalId === `mantalak:${master.id}` && candidate.sensorySource === 'catalog') {
    const attrs = master.sensory?.attributes;
    const expected = attrs ? { scale: 'winerim-0-5' as const, potencia: attrs.power,
      acidez: attrs.acidity, dulzura: attrs.sweetness, taninos: attrs.tannin, afrutado: attrs.fruity } : null;
    const actual = normalizeWineAttributesForInsight(candidate.sensoryAttributes);
    const canonical = normalizeWineAttributesForInsight(expected);
    const same = Boolean(actual && canonical && candidate.sensoryAttributes?.scale === 'winerim-0-5'
      && Object.entries(canonical).every(([key, value]) => actual[key as keyof typeof actual] === value));
    const score = same ? calculateLocalMatchrimAffinity(profile, expected) : null;
    const explain = score !== null && candidate.affinity === score;
    return { catalogIdentityLinked: true, identityLabel: master.sensory?.provenance === 'winerim-generated'
      ? 'Identificado en Winerim · perfil sensorial generado' : 'Identificado en el catálogo Winerim',
    affinityLabel: explain ? 'Afinidad orientativa' : 'Afinidad pendiente',
    affinityValue: explain ? `≈${Math.round(score!)}/100` : 'Pendiente', canExplainAffinity: explain };
  }
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
