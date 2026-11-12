import {
  buildAffinityInsights,
  calculateLocalMatchrimAffinity,
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
  /** 139: traits that do not apply to this wine (the tannin of a white) are neither a reason nor a caution. */
  notApplicable?: ReadonlyArray<AffinityAttributeInsight['key']>;
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
  // 145 (owner's decision, 2026-11-12): one number per wine. A tannin of 0 means «not applicable» (whites, rosés,
  // sparkling) and does not count anywhere. The store estimate already left it out (139); the catalogue comparison
  // counted it as a gap, so the same white said 74 scanned and 82 searched. What is shown follows the one rule;
  // what is saved with a wine does not change.
  const raw = (input.attributes ?? {}) as Record<string, unknown>;
  if (!input.notApplicable && raw.scale === 'winerim-0-5' && (raw.tannin ?? raw.taninos ?? raw.tanico) === 0 && typeof input.profile.tanico === 'number') {
    const compared = { ...raw, tannin: Math.max(0, Math.min(5, input.profile.tanico)), taninos: undefined, tanico: undefined } as WineAttributeInput;
    const rescored = calculateLocalMatchrimAffinity(input.profile, compared);
    if (rescored !== null) return buildConsumerAffinity({ ...input, attributes: compared, score: rescored, notApplicable: ['tanico'] });
  }
  const score = Math.round(input.score);
  const applies = (insight: AffinityAttributeInsight) => !input.notApplicable?.includes(insight.key);
  const mostDifferent = insights.insights.filter(applies).sort((a, b) => b.delta - a.delta)[0];
  return {
    state: 'ready', score,
    // 138: the title answers "¿me gustará?" directly; "una opción para explorar" did not.
    title: score >= 80 ? 'Muy de tu estilo' : score >= 65 ? 'Probablemente te guste'
      : score >= 45 ? 'Puede que sí, puede que no' : 'No es tu estilo',
    // A very low tannin is true of every white or sparkling wine: say it last, after what sets this wine apart.
    matches: insights.positives.filter(applies).sort((a, b) => Number(a.key === 'tanico' && a.wineValue <= 2.3) - Number(b.key === 'tanico' && b.wineValue <= 2.3))
      .slice(0, 2).map(insight => aligned[insight.key][level(insight.wineValue)]),
    caution: mostDifferent && mostDifferent.tone !== 'positive'
      ? (mostDifferent.direction === 'higher' ? higher : lower)[mostDifferent.key] : null,
    dimensions: insights.insights.filter(applies),
  };
};

/** 145: the number shown for a catalogue score, under the one rule of every wine sheet (see buildConsumerAffinity). */
export const shownScore145 = (profile: MatchrimProfileLike | null | undefined, attributes: WineAttributeInput | null | undefined, score: number | null | undefined): number | null => {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null;
  const result = buildConsumerAffinity({ catalogIdentityLinked: true, sensorySource: 'catalog', attributes, profile, score });
  return result.state === 'ready' ? result.score : Math.round(score);
};
