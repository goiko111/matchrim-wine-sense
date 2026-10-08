import type { WineCandidate } from './multiWineScan';

export type HostedScanAffinity = {
  affinity?: number | null;
  raw_affinity?: number | null;
  affinity_confidence?: number | null;
  learning_samples?: number;
  sensory_attributes?: WineCandidate['sensoryAttributes'];
  message?: string;
};

export const applyHostedScanAffinity = (candidate: WineCandidate, result: HostedScanAffinity): WineCandidate => {
  if (result.affinity === null) return {
    ...candidate, affinity: null, affinityConfidence: null,
    affinityReason: 'Faltan datos fiables del perfil o del vino. Afinidad no calculada.',
  };
  if (typeof result.affinity !== 'number' || !Number.isFinite(result.affinity)
    || result.affinity < 0 || result.affinity > 100) return candidate;
  const profileConfidence = typeof result.affinity_confidence === 'number'
    && Number.isFinite(result.affinity_confidence) && result.affinity_confidence >= 0
    && result.affinity_confidence <= 100 ? result.affinity_confidence / 100 : null;
  const samples = Number.isInteger(result.learning_samples) && result.learning_samples! >= 0
    ? result.learning_samples : null;
  const raw = typeof result.raw_affinity === 'number' && Number.isFinite(result.raw_affinity)
    && result.raw_affinity >= 0 && result.raw_affinity <= 100 ? result.raw_affinity : null;
  const source = candidate.source === 'catalog' ? 'ficha de catalogo' : 'atributos inferidos, no verificados';
  return {
    ...candidate, affinity: result.affinity,
    sensoryAttributes: result.sensory_attributes ?? candidate.sensoryAttributes ?? null,
    affinityConfidence: profileConfidence === null ? null
      : Math.min(candidate.confidence, candidate.source === 'catalog' ? 0.9 : 0.58, profileConfidence),
    affinityReason: [
      `Afinidad orientativa, no probabilidad de que te guste. Datos: ${source}.`,
      raw === null ? null : `Coincidencia sensorial sin calibrar: ${Math.round(raw)}%.`,
      samples === null ? 'Historial de aprendizaje no disponible.' : `${samples} valoraciones utiles para aprender tu perfil.`,
      profileConfidence === null ? 'Respaldo del perfil no disponible.' : `Respaldo del perfil: ${Math.round(profileConfidence * 100)}%.`,
    ].filter(Boolean).join(' '),
  };
};
