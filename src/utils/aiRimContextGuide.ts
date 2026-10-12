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
  const identityConfidence = typeof input.identityConfidence === 'number' && Number.isFinite(input.identityConfidence)
    ? Math.max(0, Math.min(1, input.identityConfidence)) : 0;
  const hasAffinity = typeof input.affinity === 'number' && Number.isFinite(input.affinity)
    && input.affinity >= 0 && input.affinity <= 100;
  const uncertainty = input.uncertaintyReasons?.filter(Boolean) ?? [];

  if (!input.name?.trim() || identityConfidence < 0.35) {
    return {
      title: 'Primero, una lectura suficiente',
      summary: 'Esta guia no tiene evidencia suficiente para proponer una referencia fiable de este recorte. No la convierte en una recomendacion.',
      evidence: ['Lectura sin respaldo suficiente', 'Sin datos de verificacion de botella o cosecha en esta guia'],
      nextStep: 'Revisa el recorte y transcribe solo el texto legible; escribir un nombre no verifica la botella.',
      tone: 'caution',
    };
  }

  if (identityConfidence < 0.72 || uncertainty.length > 0) {
    return {
      title: 'Revisa el candidato antes de elegir',
      summary: `${input.name} es la referencia propuesta por la lectura, no una verificacion de botella o cosecha. ${uncertainty[0] ?? 'La evidencia visual todavia es parcial.'}`,
      evidence: [
        `Senal estimada de lectura ${confidencePercent(identityConfidence)}%; no acredita la botella`,
        !hasAffinity
          ? 'Afinidad pendiente'
          : `La afinidad de ${Math.round(input.affinity)}% describe este candidato provisional`,
      ],
      nextStep: input.hasAlternatives
        ? 'Contrasta nombre, productor y cosecha en la imagen con los candidatos.'
        : 'Revisa nombre, productor y cosecha o vuelve a analizar el recorte.',
      tone: 'caution',
    };
  }

  const explanation = buildDetailedAffinityExplanation(profile, input.attributes, {
    score: input.affinity,
    identificationConfidence: identityConfidence,
    sensorySource: input.sensorySource ?? 'inference',
  });

  if (!explanation || !hasAffinity) {
    return {
      title: 'Candidato de lectura; afinidad pendiente',
      summary: `La lectura propone ${input.name}. Esta guia no verifica la botella ni la cosecha. Faltan datos sensoriales o un perfil Matchrim suficiente para justificar una puntuacion.`,
      evidence: [`Senal estimada de lectura ${confidencePercent(identityConfidence)}%`, 'La senal no equivale a verificacion canonica o humana', 'Sin desglose sensorial defendible'],
      nextStep: input.hasAlternatives
        ? 'Puedes comparar identidad, precio y servicio sin inventar afinidad.'
        : 'Contrasta nombre, productor y cosecha; la afinidad requiere una ficha y un perfil suficientes.',
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
    title: explanation.adventure === 'exploratorio' ? 'Candidato para explorar' : 'Por que este candidato puede encajar',
    summary: `${summary} La guia describe este candidato; no verifica la botella ni la cosecha.`,
    evidence: [
      `Afinidad orientativa ${explanation.scoreRange?.min ?? Math.round(input.affinity)}-${explanation.scoreRange?.max ?? Math.round(input.affinity)}%`,
      `Respaldo ${explanation.confidenceLabel}; falta ${explanation.missingData[0] ?? 'ningun dato critico declarado'}`,
      'La confianza o la fuente sensorial no acreditan por si solas la identidad fisica',
    ],
    nextStep: input.hasAlternatives
      ? 'Contrasta el candidato con el texto y la cosecha; despues compara el desglose con otra opcion.'
      : 'Contrasta nombre, productor y cosecha antes de usar el desglose de este candidato.',
    tone: 'positive',
  };
};
