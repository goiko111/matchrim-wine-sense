import { optionalScanNumber } from './matchrim-scan-values.ts';
import type { MatchrimLearningProfile } from './matchrim-learning.ts';
import { calibrateEdgeMatchrimAffinity, MATCHRIM_AFFINITY_MODEL } from './matchrim-affinity.ts';

const KEYS = ['potencia','acidez','dulzura','taninos','afrutado'] as const;
export type CompleteSensoryAttributes = Record<typeof KEYS[number], number>;

export const normalizeCompleteSensoryAttributes = (value: unknown): CompleteSensoryAttributes | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {} as CompleteSensoryAttributes;
  for (const key of KEYS) {
    const numeric = optionalScanNumber((value as Record<string, unknown>)[key]);
    if (numeric === null || numeric < 0 || numeric > 100) return null;
    const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
    out[key] = Math.max(1, Math.min(5, Math.round(scaled)));
  }
  return out;
};

export const buildUnknownAffinity = (reason = 'sensory_data_missing') => ({
  affinity: null, raw_affinity: null, affinity_confidence: null,
  affinity_model: MATCHRIM_AFFINITY_MODEL, sensory_attributes: null,
  sensory_source: 'unknown', reason,
  message: 'Faltan datos fiables. No se calcula afinidad ni se infieren atributos automaticamente.',
});

export const buildCompleteAffinity = (
  profile: MatchrimLearningProfile,
  attrs: CompleteSensoryAttributes,
  confidence: number,
  samples: number,
) => {
  const distance = Math.abs(profile.potente-attrs.potencia) + Math.abs(profile.acidez-attrs.acidez)
    + Math.abs(profile.dulce-attrs.dulzura) + Math.abs(profile.tanico-attrs.taninos) + Math.abs(profile.afrutado-attrs.afrutado);
  const raw = Math.round(Math.max(0,Math.min(100,(1-distance/20)*100)));
  return { affinity:calibrateEdgeMatchrimAffinity(raw,confidence), raw_affinity:raw,
    affinity_confidence:confidence, affinity_model:MATCHRIM_AFFINITY_MODEL, learning_samples:samples,
    sensory_attributes:attrs, sensory_source:'provided_unverified' };
};
