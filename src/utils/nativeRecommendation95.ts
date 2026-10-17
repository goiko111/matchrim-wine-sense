import type { WinerimWineWithMatch } from '../services/winerimApi';
import type { MatchrimProfileLike } from './matchrimPassport';
import { buildConsumerAffinity, type ConsumerAffinityResult } from './consumerAffinity95';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';

const profileKeys = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'] as const;
const sensoryKeys = ['power', 'acidity', 'sweetness', 'tannin', 'fruity'] as const;
const exactValue = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 5;
const literal = (value: unknown) => typeof value === 'string' && value.trim().length > 0
  && value.length <= 300 && !/[<>]/.test(value) && [...value].every(char => char.charCodeAt(0) >= 32);

export const buildNativeRecommendation95 = (
  wine: WinerimWineWithMatch,
  profile?: MatchrimProfileLike | null,
): { result: ConsumerAffinityResult; sourceAvailable: boolean } => {
  const id = typeof wine.id === 'number'
    ? Number.isSafeInteger(wine.id) && wine.id > 0
    : typeof wine.id === 'string' && /^[1-9]\d{0,17}$/.test(wine.id);
  const sourceAvailable = wine.originalSheetSource === 'winerim-api'
    && Boolean(id) && literal(wine.name) && literal(wine.winery);
  const pending = (reason: 'identity' | 'sensory' | 'profile' | 'score', description: string) => ({
    result: { state: 'pending', reason, title: 'Todavía no puedo calcular tu afinidad', description } as ConsumerAffinityResult,
    sourceAvailable,
  });
  // A catalogue row supports its attributes, not an independently bound detail
  // sheet. Never manufacture a detailVerified claim for a recommendation.
  if (!sourceAvailable) return pending('identity', 'Falta una referencia de catálogo con nombre y bodega para comparar este vino contigo.');
  const attributes = wine.tastingAttributes;
  if (attributes?.scale !== 'winerim-0-5' || !sensoryKeys.every(key => exactValue(attributes[key]))) {
    return pending('sensory', 'Faltan los cinco datos sensoriales de este vino. Su nombre o su región no bastan para calcular tu afinidad.');
  }
  if (!profile || !profileKeys.every(key => exactValue(profile[key]))) {
    return pending('profile', 'Completa tu test de paladar para saber cuánto encaja este vino contigo.');
  }
  const currentScore = calculateLocalMatchrimAffinity(profile, attributes);
  if (wine.affinityModel !== 'scan-local-l2-0to5-v2' || currentScore === null
    || wine.matchPercentage !== currentScore) {
    return pending('score', 'Esta recomendación aún no está actualizada para tus gustos. Vuelve a cargar tus recomendaciones antes de comparar.');
  }
  return { sourceAvailable, result: buildConsumerAffinity({ score: currentScore,
    catalogIdentityLinked: true, sensorySource: 'catalog', attributes, profile }) };
};
