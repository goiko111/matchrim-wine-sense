import type { MatchrimProfileLike } from '@/utils/matchrimPassport';

type AttributeKey = 'potente' | 'acidez' | 'dulce' | 'tanico' | 'afrutado';

export type WineAttributeInput = Partial<{
  power: number | null;
  acidity: number | null;
  sweetness: number | null;
  tannin: number | null;
  fruity: number | null;
  potencia: number | null;
  acidez: number | null;
  dulzura: number | null;
  dulce: number | null;
  taninos: number | null;
  tanico: number | null;
  afrutado: number | null;
}>;

export interface AffinityAttributeInsight {
  key: AttributeKey;
  label: string;
  profileValue: number;
  wineValue: number;
  delta: number;
  direction: 'higher' | 'lower' | 'aligned';
  tone: 'positive' | 'negative' | 'neutral';
  text: string;
}

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  potente: 'potencia',
  acidez: 'acidez',
  dulce: 'dulzor',
  tanico: 'tanino',
  afrutado: 'fruta',
};

const clampAttribute = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  const scaled = numeric > 10 ? numeric / 20 : numeric > 5 ? numeric / 2 : numeric;
  return Math.max(1, Math.min(5, scaled));
};

export const normalizeWineAttributesForInsight = (attrs?: WineAttributeInput | null) => {
  if (!attrs) return null;

  const normalized = {
    potente: clampAttribute(attrs.power ?? attrs.potencia),
    acidez: clampAttribute(attrs.acidity ?? attrs.acidez),
    dulce: clampAttribute(attrs.sweetness ?? attrs.dulzura ?? attrs.dulce),
    tanico: clampAttribute(attrs.tannin ?? attrs.taninos ?? attrs.tanico),
    afrutado: clampAttribute(attrs.fruity ?? attrs.afrutado),
  };

  return Object.values(normalized).some((value) => value === null)
    ? null
    : normalized as Record<AttributeKey, number>;
};

const buildInsightText = (
  label: string,
  direction: AffinityAttributeInsight['direction'],
  tone: AffinityAttributeInsight['tone'],
) => {
  if (tone === 'positive') return `${label} muy alineada con tu zona de gusto.`;

  if (tone === 'neutral') {
    return direction === 'higher'
      ? `${label} algo mas alta de lo ideal, pero todavia asumible.`
      : `${label} algo mas baja de lo ideal, pero todavia asumible.`;
  }

  return direction === 'higher'
    ? `${label} bastante mas alta que tu zona comoda.`
    : `${label} bastante mas baja que tu zona comoda.`;
};

export const buildAffinityInsights = (
  profile: MatchrimProfileLike | null | undefined,
  rawWineAttributes?: WineAttributeInput | null,
) => {
  if (!profile) return null;

  const wineAttributes = normalizeWineAttributesForInsight(rawWineAttributes);
  if (!wineAttributes) return null;

  const keys: AttributeKey[] = ['potente', 'acidez', 'dulce', 'tanico', 'afrutado'];
  const insights = keys.map((key) => {
    const profileValue = clampAttribute(profile[key]) ?? 3;
    const wineValue = wineAttributes[key];
    const delta = Math.abs(profileValue - wineValue);
    const direction = delta <= 0.35
      ? 'aligned'
      : wineValue > profileValue
        ? 'higher'
        : 'lower';
    const tone = delta <= 0.65 ? 'positive' : delta <= 1.2 ? 'neutral' : 'negative';
    const label = ATTRIBUTE_LABELS[key];

    return {
      key,
      label,
      profileValue,
      wineValue,
      delta,
      direction,
      tone,
      text: buildInsightText(label, direction, tone),
    } satisfies AffinityAttributeInsight;
  });

  const positives = insights
    .filter((item) => item.tone === 'positive')
    .sort((a, b) => a.delta - b.delta);
  const negatives = insights
    .filter((item) => item.tone !== 'positive')
    .sort((a, b) => b.delta - a.delta);

  return {
    insights,
    positives,
    negatives,
    positiveText: positives.length
      ? positives.slice(0, 2).map((item) => item.label).join(' y ')
      : null,
    negativeText: negatives.length
      ? negatives.slice(0, 2).map((item) => item.text).join(' ')
      : null,
  };
};
