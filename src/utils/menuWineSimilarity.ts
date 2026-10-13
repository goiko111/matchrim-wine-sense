import type { MenuScanWine } from './wineMenuScan';
import { isMenuIdentityConfirmed } from './wineMenuScan';

const dimensions = ['potencia', 'acidez', 'dulzura', 'taninos', 'afrutado'] as const;

export const hasVerifiedMenuSensorySheet = (wine: MenuScanWine): boolean => wine.sensorySource === 'catalog'
  && typeof wine.canonicalId === 'string' && wine.canonicalId.trim().length > 0
  && typeof wine.confidence === 'number' && Number.isFinite(wine.confidence) && wine.confidence <= 1
  && isMenuIdentityConfirmed(wine)
  && dimensions.every((key) => {
    const value = wine.atributos?.[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
  });

export const menuWineSensorySimilarity = (source: MenuScanWine, candidate: MenuScanWine): {
  score: number;
  differences: Array<{ dimension: typeof dimensions[number]; source: number; candidate: number; delta: number }>;
} | null => {
  if (!hasVerifiedMenuSensorySheet(source) || !hasVerifiedMenuSensorySheet(candidate)) return null;
  if (source.canonicalId === candidate.canonicalId
    && (!source.anada || !candidate.anada || source.anada === candidate.anada)) return null;
  const differences = dimensions.map((dimension) => ({ dimension, source: source.atributos![dimension],
    candidate: candidate.atributos![dimension], delta: Math.abs(source.atributos![dimension] - candidate.atributos![dimension]) }));
  const distance = Math.sqrt(differences.reduce((sum, { delta }) => sum + delta * delta, 0));
  const score = Math.round(Math.max(0, Math.min(100, 100 * (1 - distance / Math.sqrt(5 * 16)))));
  return { score, differences };
};

export const menuWineSimilarityBand = (score: number): string => score >= 80 ? 'Estilo muy pr\u00f3ximo'
  : score >= 60 ? 'Estilo pr\u00f3ximo' : 'Coincidencia parcial de estilo';

export const menuWineSimilarityUnavailable = (source: MenuScanWine, candidates: MenuScanWine[]): string => {
  if (!hasVerifiedMenuSensorySheet(source)) return 'Parecidos pendientes: falta la ficha sensorial verificada de este vino.';
  if (!candidates.some(hasVerifiedMenuSensorySheet)) return 'Parecidos pendientes: faltan otras fichas sensoriales verificadas en esta carta.';
  if (candidates.some((candidate) => (menuWineSensorySimilarity(source, candidate)?.score ?? 0) >= 50)) return 'Hay fichas de estilo parecido disponibles.';
  return 'No hay otra ficha de esta carta con un estilo suficientemente parecido.';
};
