import type { MatchrimProfileLike } from './matchrimPassport';
import { getSelectedCandidate, type ScanRegion, type WineCandidate } from './multiWineScan';
import { calculateLocalMatchrimAffinity, normalizeWineAttributesForInsight } from './wineAffinityExplanation';
import { isVerifiedWinerimSheetForIdentity, validateWinerimOriginalSensory } from './winerimOriginalSheet';
import { isVerifiedNativeMaster102 } from './nativeMasterCatalog102';
import { exactGlobalVintage103, globalSensory103, isGlobalWine103 } from './nativeGlobalCatalogue103';
import { isPendingLocalIdentity109 } from './nativeSingleLabel109';
import { masterAffinityGap259, nativeMasterLink259 } from './nativeMasterLink259';

export type NativeAffinityGap210 = {
  reason: 'identity' | 'catalogue-link' | 'vintage' | 'profile' | 'sensory' | 'score';
  title: string;
  summary: string;
  description: string;
  nextStep: string;
};

// Presentation only: OCR confidence and user review never certify a catalog sheet.
const nativeWineConsumerBase = (candidate: WineCandidate | null, profile: MatchrimProfileLike | null) => {
  if (nativeMasterLink259(candidate)) return { catalogIdentityLinked: true,
    identityLabel: 'Referencia del catálogo Winerim', affinityLabel: 'Sin datos suficientes',
    affinityValue: 'Sin calcular', canExplainAffinity: false, sensoryEvidenceReady: false };
  const global = candidate && isGlobalWine103(candidate, candidate.globalRecord) ? candidate.globalRecord : null;
  if (global && candidate) {
    const exact = exactGlobalVintage103(candidate, global);
    const expected = normalizeWineAttributesForInsight(globalSensory103(global));
    const actual = normalizeWineAttributesForInsight(candidate.sensoryAttributes);
    const same = expected && actual && candidate.sensoryAttributes?.scale === 'winerim-0-5'
      && Object.entries(expected).every(([key, value]) => actual[key as keyof typeof actual] === value);
    const score = same && exact ? calculateLocalMatchrimAffinity(profile, globalSensory103(global)) : null;
    const explain = score !== null && candidate.affinity === score && candidate.sensorySource === 'catalog'
      && candidate.canonicalId === `winerim-public-store:${global.id}`;
    return { catalogIdentityLinked: exact, identityLabel: exact ? 'Ficha pública de Winerim'
      : 'Referencia Winerim encontrada · añada sin verificar',
    affinityLabel: explain ? 'Afinidad orientativa' : exact ? 'Afinidad pendiente' : 'Añada sin verificar',
    affinityValue: explain ? `≈${Math.round(score!)}/100` : exact ? 'Pendiente' : 'Ver ficha', canExplainAffinity: explain,
    sensoryEvidenceReady: Boolean(same && exact && candidate.sensorySource === 'catalog') };
  }
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
    affinityValue: explain ? `≈${Math.round(score!)}/100` : 'Pendiente', canExplainAffinity: explain,
    sensoryEvidenceReady: same };
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
    sensoryEvidenceReady: Boolean(linked && candidate?.sensorySource === 'catalog' && sameAttributes),
  };
};

export const nativeWineConsumerResult = (candidate: WineCandidate | null, profile: MatchrimProfileLike | null) => {
  const result = nativeWineConsumerBase(candidate, profile);
  const global = candidate && isGlobalWine103(candidate, candidate.globalRecord) ? candidate.globalRecord : null;
  let pending: NativeAffinityGap210 | null = null;
  if (!result.canExplainAffinity) {
    const master = nativeMasterLink259(candidate);
    if (master) {
      pending = masterAffinityGap259(master);
    } else if (!candidate || isPendingLocalIdentity109(candidate) || !candidate.producer?.trim()) {
      pending = { reason: 'identity', title: 'Primero, identifiquemos el vino', summary: 'Nombre y bodega sin confirmar',
        description: 'Leer la uva o la fecha no basta para saber qué vino tienes. Todavía no hemos confirmado su nombre y bodega.',
        nextStep: 'Compara las propuestas con tu etiqueta o corrige los datos que puedas leer.' };
    } else if (global && !exactGlobalVintage103(candidate, global)) {
      pending = { reason: 'vintage', title: 'Vino encontrado; falta verificar la añada', summary: 'Datos de la cosecha sin verificar',
        description: candidate.vintage ? `La ficha encontrada no confirma los datos de tu botella de ${candidate.vintage}.`
          : 'Tenemos una referencia de Winerim, pero no hemos confirmado la cosecha de tu botella.',
        nextStep: 'Comprueba la añada. Una comparación de estilo general no confirma los datos de esa cosecha.' };
    } else if (!result.catalogIdentityLinked) {
      pending = { reason: 'catalogue-link', title: 'Falta enlazar la ficha de este vino', summary: 'Ficha de sabor aún sin enlazar',
        description: 'Tenemos un nombre propuesto, pero aún no una ficha verificada con la que calcular tu afinidad. Esto no significa que el vino no esté en Winerim.',
        nextStep: 'Busca la referencia y comprueba que el nombre, la bodega y la añada coinciden.' };
    } else if (!profile || (['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const)
      .some(key => typeof profile[key] !== 'number' || !Number.isFinite(profile[key]) || profile[key] < 0)) {
      pending = { reason: 'profile', title: 'Nos falta conocer tus gustos', summary: 'Test de paladar incompleto',
        description: 'La ficha del vino está enlazada, pero tu perfil todavía no contiene todas las preferencias necesarias.',
        nextStep: 'Completa tu test de paladar para compararlo con este vino.' };
    } else if (!result.sensoryEvidenceReady) {
      pending = { reason: 'sensory', title: 'Vino encontrado; faltan datos de sabor fiables', summary: 'Datos sensoriales insuficientes',
        description: 'El vino está enlazado con Winerim. Lo que falta es una ficha sensorial suficiente y respaldada para compararlo con tus gustos.',
        nextStep: 'Necesitamos datos de cuerpo, acidez, dulzor, tanino y fruta con su fuente. No los deducimos solo de la foto.' };
    } else {
      pending = { reason: 'score', title: 'Tu afinidad necesita actualizarse', summary: 'Cálculo no válido para el perfil actual',
        description: 'Hay una ficha y un perfil, pero el cálculo guardado no coincide con los datos actuales o no está suficientemente respaldado.',
        nextStep: 'Revisa la ficha y tus preferencias antes de usar una puntuación anterior.' };
    }
  }
  return { ...result, pending };
};

export const nextNativeWineReview = (regions: ScanRegion[]) => {
  const active = regions.filter(region => region.status !== 'discarded');
  return active.find(region => region.error || region.status !== 'recognized' || !getSelectedCandidate(region)?.name.trim())
    ?? active[0] ?? null;
};
