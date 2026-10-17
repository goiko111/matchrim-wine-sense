import {
  buildAffinityInsights,
  type AffinityAttributeInsight,
  type AffinityDataSource,
  type WineAttributeInput,
} from './wineAffinityExplanation';
import type { MatchrimProfileLike } from './matchrimPassport';

export interface ConsumerAffinityInput {
  score?: number | null;
  catalogIdentityLinked?: boolean;
  sensorySource?: AffinityDataSource;
  attributes?: WineAttributeInput | null;
  profile?: MatchrimProfileLike | null;
}

export type ConsumerAffinityResult = {
  state: 'pending';
  reason: 'identity' | 'profile' | 'sensory' | 'score';
  title: string;
  description: string;
} | {
  state: 'ready';
  score: number;
  title: string;
  matches: string[];
  caution: string | null;
  dimensions: AffinityAttributeInsight[];
};

const aligned: Record<AffinityAttributeInsight['key'], string> = {
  potente: 'Su intensidad es parecida a la que prefieres.',
  acidez: 'Su acidez está cerca de la que te gusta.',
  dulce: 'Su dulzor encaja con tus preferencias.',
  tanico: 'Sus taninos están cerca de tu gusto.',
  afrutado: 'La presencia de fruta es parecida a la que buscas.',
};
const higher: Record<AffinityAttributeInsight['key'], string> = {
  potente: 'Es más intenso de lo que sueles preferir.',
  acidez: 'Tiene más acidez de la que sueles buscar.',
  dulce: 'Es más dulce de lo que sueles elegir.',
  tanico: 'Sus taninos pueden resultar más astringentes de lo que prefieres.',
  afrutado: 'La fruta tiene más protagonismo del que sueles buscar.',
};
const lower: Record<AffinityAttributeInsight['key'], string> = {
  potente: 'Es menos intenso de lo que sueles preferir.',
  acidez: 'Tiene menos acidez de la que sueles buscar.',
  dulce: 'Es más seco de lo que sueles elegir.',
  tanico: 'Tiene menos taninos de los que sueles preferir.',
  afrutado: 'La fruta tiene menos protagonismo del que sueles buscar.',
};

export const buildConsumerAffinity = (input: ConsumerAffinityInput): ConsumerAffinityResult => {
  const pending = (reason: 'identity' | 'profile' | 'sensory' | 'score', description: string): ConsumerAffinityResult => ({
    state: 'pending', reason, title: 'Todavía no puedo calcular tu afinidad', description,
  });
  if (!input.catalogIdentityLinked) {
    return pending('identity', 'Falta una ficha verificada de este vino para compararlo con tus gustos.');
  }
  if (input.sensorySource !== 'catalog') {
    return pending('sensory', 'Faltan datos sensoriales verificados de este vino. La etiqueta por sí sola no permite calcular tu afinidad.');
  }
  if (!input.profile) return pending('profile', 'Completa tu test de paladar para saber cuánto encaja este vino contigo.');
  const insights = buildAffinityInsights(input.profile, input.attributes);
  if (!insights) return pending('sensory', 'Faltan datos suficientes del vino o de tus gustos. No significa que no te vaya a gustar.');
  if (typeof input.score !== 'number' || !Number.isFinite(input.score) || input.score < 0 || input.score > 100) {
    return pending('score', 'La ficha está disponible, pero aún no hay una afinidad calculada para tu perfil.');
  }
  const score = Math.round(input.score);
  const mostDifferent = [...insights.insights].sort((a, b) => b.delta - a.delta)[0];
  return {
    state: 'ready', score,
    title: score >= 80 ? 'Encaja mucho contigo' : score >= 65 ? 'Puede encajar contigo'
      : score >= 45 ? 'Es una opción para explorar' : 'Se aleja de tus gustos actuales',
    matches: insights.positives.slice(0, 2).map(insight => aligned[insight.key]),
    caution: mostDifferent && mostDifferent.tone !== 'positive'
      ? (mostDifferent.direction === 'higher' ? higher : lower)[mostDifferent.key] : null,
    dimensions: insights.insights,
  };
};
