import type { MatchrimProfileLike } from '@/utils/matchrimPassport';
import {
  buildDetailedAffinityExplanation,
  type AffinityDataSource,
  type WineAttributeInput,
} from '@/utils/wineAffinityExplanation';

export type AiRimGuidanceTone = 'neutral' | 'caution' | 'positive';

export interface AiRimContextInput {
  context: 'label' | 'menu' | 'comparison';
  name?: string | null;
  identityConfidence?: number | null;
  affinity?: number | null;
  attributes?: WineAttributeInput | null;
  sensorySource?: AffinityDataSource;
  uncertaintyReasons?: string[] | null;
  hasAlternatives?: boolean;
}

export interface AiRimContextGuidance {
  title: string;
  summary: string;
  evidence: string[];
  nextStep: string;
  tone: AiRimGuidanceTone;
}

const confidencePercent = (value: number) => Math.round(Math.max(0, Math.min(1, value)) * 100);

export const buildAiRimContextGuidance = (
  input: AiRimContextInput,
  profile: MatchrimProfileLike | null | undefined,
): AiRimContextGuidance => {
  const identityConfidence = Math.max(0, Math.min(1, input.identityConfidence ?? 0));
  const uncertainty = input.uncertaintyReasons?.filter(Boolean) ?? [];

  if (!input.name || identityConfidence < 0.35) {
    return {
      title: 'Primero, una identidad verificable',
      summary: 'No hay texto suficiente para defender un vino concreto. No voy a convertir este recorte en una recomendacion inventada.',
      evidence: ['Identidad sin confirmar', 'Afinidad no calculable sin una referencia o ficha sensorial'],
      nextStep: 'Reanaliza la region o escribe solo la identidad que puedas confirmar.',
      tone: 'caution',
    };
  }

  if (identityConfidence < 0.72 || uncertainty.length > 0) {
    return {
      title: 'Confirma antes de elegir',
      summary: `${input.name} es un candidato, no una identidad cerrada. ${uncertainty[0] ?? 'La evidencia visual todavia es parcial.'}`,
      evidence: [
        `Senal de identidad ${confidencePercent(identityConfidence)}%`,
        input.affinity == null
          ? 'Afinidad pendiente'
          : `La afinidad de ${Math.round(input.affinity)}% describe este candidato provisional`,
      ],
      nextStep: input.hasAlternatives
        ? 'Compara el texto visible con los candidatos o confirma manualmente el correcto.'
        : 'Confirma la identidad o vuelve a analizar el recorte.',
      tone: 'caution',
    };
  }

  const explanation = buildDetailedAffinityExplanation(profile, input.attributes, {
    score: input.affinity,
    identificationConfidence: identityConfidence,
    sensorySource: input.sensorySource ?? 'inference',
  });

  if (!explanation || input.affinity == null) {
    return {
      title: 'Identidad lista; afinidad pendiente',
      summary: `${input.name} esta confirmado, pero faltan datos sensoriales o un perfil Matchrim suficiente para justificar una puntuacion.`,
      evidence: [`Senal de identidad ${confidencePercent(identityConfidence)}%`, 'Sin desglose sensorial defendible'],
      nextStep: input.hasAlternatives
        ? 'Puedes comparar identidad, precio y servicio sin inventar afinidad.'
        : 'Completa la ficha sensorial o el perfil antes de pedir una recomendacion personal.',
      tone: 'neutral',
    };
  }

  const match = explanation.primaryMatches[0]?.split(':')[0] ?? null;
  const friction = explanation.frictions[0] ?? null;
  const contextLead = input.context === 'comparison'
    ? 'En esta comparacion'
    : input.context === 'menu'
      ? 'En esta carta'
      : 'Para este vino';
  const summary = match
    ? `${contextLead}, la coincidencia mas clara esta en ${match}. ${friction ? `La principal friccion es: ${friction}` : 'No aparece una friccion fuerte con los datos disponibles.'}`
    : `${contextLead}, el resultado depende del equilibrio general y no de una sola dimension.`;

  return {
    title: explanation.adventure === 'exploratorio' ? 'Buena opcion para explorar' : 'Por que puede encajar',
    summary,
    evidence: [
      `Afinidad orientativa ${explanation.scoreRange?.min ?? Math.round(input.affinity)}-${explanation.scoreRange?.max ?? Math.round(input.affinity)}%`,
      `Respaldo ${explanation.confidenceLabel}; falta ${explanation.missingData[0] ?? 'ningun dato critico declarado'}`,
    ],
    nextStep: input.hasAlternatives
      ? 'Comparala con una opcion mas segura antes de cerrar la decision.'
      : 'Revisa el desglose y marca que dimension acerto o fallo.',
    tone: 'positive',
  };
};
