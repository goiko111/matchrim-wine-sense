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

// 137: say what the wine is like in everyday words instead of "está cerca de tu gusto"; a first-time drinker
// should understand the reason without knowing what a tannin is.
type Level = 'low' | 'mid' | 'high';
const level = (value: number): Level => value <= 2.3 ? 'low' : value >= 3.6 ? 'high' : 'mid';
const aligned: Record<AffinityAttributeInsight['key'], Record<Level, string>> = {
  potente: { low: 'Es ligero y fácil de beber, como te gusta.', mid: 'Tiene una intensidad media, como sueles preferir.', high: 'Tiene cuerpo e intensidad, como te gusta.' },
  acidez: { low: 'Es suave, con poca acidez, como prefieres.', mid: 'Tiene un punto de frescura, como te gusta.', high: 'Es fresco, con la acidez viva que te gusta.' },
  dulce: { low: 'Es seco, como sueles preferir.', mid: 'Tiene un punto de dulzor, como te gusta.', high: 'Tiene el dulzor que te gusta.' },
  tanico: { low: 'Es suave en boca, sin aspereza, como prefieres.', mid: 'Tiene algo de agarre en boca, como te gusta.', high: 'Tiene taninos marcados (esa sequedad en boca), como te gusta.' },
  afrutado: { low: 'Es sobrio, con poca fruta, como prefieres.', mid: 'Tiene la fruta justa, como te gusta.', high: 'Es muy afrutado, como te gusta.' },
};
const higher: Record<AffinityAttributeInsight['key'], string> = {
  potente: 'Es más intenso de lo que sueles preferir.',
  acidez: 'Tiene más acidez de la que sueles buscar.',
  dulce: 'Es más dulce de lo que sueles elegir.',
  tanico: 'Puede resultarte más áspero en boca (más taninos) de lo que prefieres.',
  afrutado: 'La fruta tiene más protagonismo del que sueles buscar.',
};
const lower: Record<AffinityAttributeInsight['key'], string> = {
  potente: 'Es menos intenso de lo que sueles preferir.',
  acidez: 'Tiene menos acidez de la que sueles buscar.',
  dulce: 'Es más seco de lo que sueles elegir.',
  tanico: 'Es más suave en boca (menos taninos) de lo que sueles preferir.',
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
    // A very low tannin is true of every white or sparkling wine: say it last, after what sets this wine apart.
    matches: [...insights.positives].sort((a, b) => Number(a.key === 'tanico' && a.wineValue <= 2.3) - Number(b.key === 'tanico' && b.wineValue <= 2.3))
      .slice(0, 2).map(insight => aligned[insight.key][level(insight.wineValue)]),
    caution: mostDifferent && mostDifferent.tone !== 'positive'
      ? (mostDifferent.direction === 'higher' ? higher : lower)[mostDifferent.key] : null,
    dimensions: insights.insights,
  };
};
