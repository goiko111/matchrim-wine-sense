import { buildConsumerAffinity } from './consumerAffinity95';
import type { MatchrimProfileLike } from './matchrimPassport';
import type { MenuScanWine } from './wineMenuScan';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from './wineAffinityExplanation';
import { isVerifiedWinerimSheetForIdentity, validateWinerimOriginalSensory } from './winerimOriginalSheet';
import { isLiteralWineStyle95 } from './menuLiteralStyle95';

export const nativeLiteralMenuEvidence95 = (wine: MenuScanWine): MenuScanWine => ({
  ...wine, confidence: null, canonicalId: null, originalSheet: null, atributos: null,
  compatibilidad: null, affinity_calibrated: false, sensorySource: 'inference',
  dudas: [...new Set([...(wine.dudas ?? []), 'La carta indica un estilo, no una botella identificada.'])],
});

export const nativeMenuWineAffinity = (wine: MenuScanWine, profile: MatchrimProfileLike | null) => {
  if (isLiteralWineStyle95(wine)) return {
    state: 'pending' as const, reason: 'identity' as const,
    title: 'Es un estilo, no una botella identificada',
    description: `He le\u00eddo \u00ab${wine.nombre}\u00bb, pero falta la referencia del vino. Sin ella no puedo decirte cu\u00e1nto encaja contigo.`,
  };
  const sheet = wine.originalSheet;
  const linked = Boolean(sheet && wine.canonicalId === sheet.id && isVerifiedWinerimSheetForIdentity({
    name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
    inferredFields: wine.campos_inferidos,
  }, sheet));
  const original = validateWinerimOriginalSensory(sheet?.sensoryAttributes);
  const stored = normalizeWineAttributesForInsight(wine.atributos);
  const verified = original ? normalizeWineAttributesForInsight({ ...original, scale: 'winerim-0-5' }) : null;
  const sameAttributes = Boolean(wine.atributos?.scale === 'winerim-0-5' && stored && verified
    && (Object.keys(verified) as Array<keyof typeof verified>).every(key => stored[key] === verified[key]));
  const calculated = sameAttributes ? calculateLocalMatchrimAffinity(profile, wine.atributos) : null;
  return buildConsumerAffinity({
    profile, catalogIdentityLinked: linked,
    sensorySource: wine.sensorySource,
    attributes: sameAttributes ? wine.atributos : null,
    score: calculated !== null && calculated === wine.compatibilidad ? wine.compatibilidad : null,
  });
};
