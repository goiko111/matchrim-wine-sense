import type { MatchrimProfileLike } from '@/utils/matchrimPassport';

type AttributeKey = 'potente' | 'acidez' | 'dulce' | 'tanico' | 'afrutado';

export type AffinityDataSource = 'label' | 'catalog' | 'inference' | 'preference';

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
  wood: number | null;
  madera: number | null;
  intensity: number | null;
  intensidad: number | null;
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

export const calculateLocalMatchrimAffinity = (
  profile: MatchrimProfileLike | null | undefined,
  rawWineAttributes?: WineAttributeInput | null,
) => {
  if (!profile) return null;
  const wineAttributes = normalizeWineAttributesForInsight(rawWineAttributes);
  if (!wineAttributes) return null;
  const profileValues = {
    potente: clampAttribute(profile.potente),
    acidez: clampAttribute(profile.acidez),
    dulce: clampAttribute(profile.dulce),
    tanico: clampAttribute(profile.tanico),
    afrutado: clampAttribute(profile.afrutado),
  };
  if (Object.values(profileValues).some((value) => value === null)) return null;
  const normalizedProfile = profileValues as Record<AttributeKey, number>;
  const distance = Math.sqrt(
    Math.pow(normalizedProfile.potente - wineAttributes.potente, 2)
    + Math.pow(normalizedProfile.acidez - wineAttributes.acidez, 2)
    + Math.pow(normalizedProfile.dulce - wineAttributes.dulce, 2)
    + Math.pow(normalizedProfile.tanico - wineAttributes.tanico, 2)
    + Math.pow(normalizedProfile.afrutado - wineAttributes.afrutado, 2)
  );
  const rawScore = Math.max(0, Math.min(100, (1 - distance / Math.sqrt(5 * Math.pow(4, 2))) * 100));
  return Math.round(50 + (rawScore - 50) * 0.85);
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

type DetailedAttributeKey = AttributeKey | 'madera' | 'intensidad';

export interface DetailedAffinityDimension {
  key: DetailedAttributeKey;
  label: string;
  profileValue: number | null;
  wineValue: number;
  delta: number | null;
  direction: 'higher' | 'lower' | 'aligned' | 'unknown';
  tone: 'positive' | 'negative' | 'neutral';
  text: string;
  weight: number;
  alignment: number | null;
  contribution: number;
  source: AffinityDataSource;
}

export interface DetailedAffinityExplanation {
  score: number | null;
  confidence: number;
  confidenceLabel: 'alta' | 'media' | 'baja';
  identificationConfidence: number;
  scoreRange: { min: number; max: number } | null;
  dimensions: DetailedAffinityDimension[];
  primaryMatches: string[];
  frictions: string[];
  whyItMayFit: string;
  whatMayNotFit: string;
  adventure: 'familiar' | 'equilibrado' | 'exploratorio';
  missingData: string[];
  sources: AffinityDataSource[];
}

const DIMENSION_WEIGHTS: Record<DetailedAttributeKey, number> = {
  potente: 0.18,
  acidez: 0.18,
  dulce: 0.12,
  tanico: 0.17,
  afrutado: 0.15,
  madera: 0.1,
  intensidad: 0.1,
};

const confidenceLabel = (confidence: number): DetailedAffinityExplanation['confidenceLabel'] => {
  if (confidence >= 0.78) return 'alta';
  if (confidence >= 0.52) return 'media';
  return 'baja';
};

export const readStoredMatchrimProfile = (): MatchrimProfileLike | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('matchrim_quiz_result');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<AttributeKey, unknown>>;
    const profile = {
      potente: clampAttribute(parsed.potente),
      acidez: clampAttribute(parsed.acidez),
      dulce: clampAttribute(parsed.dulce),
      tanico: clampAttribute(parsed.tanico),
      afrutado: clampAttribute(parsed.afrutado),
    };
    return Object.values(profile).some((value) => value === null)
      ? null
      : profile as MatchrimProfileLike;
  } catch (error) {
    console.warn('[affinity] Could not read stored Matchrim profile:', error);
    return null;
  }
};

export const buildDetailedAffinityExplanation = (
  profile: MatchrimProfileLike | null | undefined,
  rawWineAttributes: WineAttributeInput | null | undefined,
  options: {
    score?: number | null;
    identificationConfidence?: number | null;
    sensorySource?: AffinityDataSource;
    extraMissingData?: string[];
  } = {},
): DetailedAffinityExplanation | null => {
  const base = buildAffinityInsights(profile, rawWineAttributes);
  if (!base) return null;

  const sensorySource = options.sensorySource ?? 'inference';
  const sourceReliability: Record<AffinityDataSource, number> = {
    label: 0.72,
    catalog: 0.94,
    inference: 0.58,
    preference: 0.9,
  };
  const identification = Math.max(0, Math.min(1, options.identificationConfidence ?? 0.65));
  const confidence = Math.round(Math.min(identification, sourceReliability[sensorySource]) * 100) / 100;
  const coreDimensions = base.insights.map((insight) => {
    const alignment = Math.round(Math.max(0, 1 - insight.delta / 4) * 100);
    const weight = DIMENSION_WEIGHTS[insight.key];
    return {
      ...insight,
      weight,
      alignment,
      contribution: Math.round(alignment * weight),
      source: sensorySource,
    } satisfies DetailedAffinityDimension;
  });
  const rawProfile = profile as MatchrimProfileLike & Partial<Record<'madera' | 'intensidad', unknown>>;
  const extraDefinitions: Array<{
    key: 'madera' | 'intensidad';
    label: string;
    wineValue: unknown;
    profileValue: unknown;
  }> = [
    { key: 'madera', label: 'madera/crianza', wineValue: rawWineAttributes?.wood ?? rawWineAttributes?.madera, profileValue: rawProfile.madera },
    { key: 'intensidad', label: 'intensidad/aromas', wineValue: rawWineAttributes?.intensity ?? rawWineAttributes?.intensidad, profileValue: rawProfile.intensidad },
  ];
  const extraDimensions = extraDefinitions.flatMap<DetailedAffinityDimension>((definition) => {
    const wineValue = clampAttribute(definition.wineValue);
    if (wineValue === null) return [];
    const profileValue = clampAttribute(definition.profileValue);
    if (profileValue === null) {
      return [{
        key: definition.key,
        label: definition.label,
        profileValue: null,
        wineValue,
        delta: null,
        direction: 'unknown' as const,
        tone: 'neutral' as const,
        text: `El vino figura con ${definition.label} ${wineValue.toFixed(1)}/5, pero aun no conocemos tu preferencia en esta dimension.`,
        weight: DIMENSION_WEIGHTS[definition.key],
        alignment: null,
        contribution: 0,
        source: sensorySource,
      } satisfies DetailedAffinityDimension];
    }
    const delta = Math.abs(profileValue - wineValue);
    const direction = delta <= 0.35 ? 'aligned' : wineValue > profileValue ? 'higher' : 'lower';
    const tone = delta <= 0.65 ? 'positive' : delta <= 1.2 ? 'neutral' : 'negative';
    const alignment = Math.round(Math.max(0, 1 - delta / 4) * 100);
    return [{
      key: definition.key,
      label: definition.label,
      profileValue,
      wineValue,
      delta,
      direction,
      tone,
      text: buildInsightText(definition.label, direction, tone),
      weight: DIMENSION_WEIGHTS[definition.key],
      alignment,
      contribution: Math.round(alignment * DIMENSION_WEIGHTS[definition.key]),
      source: sensorySource,
    } satisfies DetailedAffinityDimension];
  });
  const dimensions = [...coreDimensions, ...extraDimensions];

  const primaryMatches = dimensions
    .filter((dimension) => dimension.tone === 'positive' && dimension.alignment !== null)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map((dimension) => `${dimension.label}: ${dimension.alignment}% de alineacion`);
  const frictions = dimensions
    .filter((dimension) => dimension.tone !== 'positive' && dimension.delta !== null)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, 3)
    .map((dimension) => dimension.text);
  const score = typeof options.score === 'number'
    ? Math.max(0, Math.min(100, Math.round(options.score)))
    : null;
  const measuredDeltas = dimensions.flatMap((dimension) => dimension.delta === null ? [] : [dimension.delta]);
  const averageDelta = measuredDeltas.reduce((sum, delta) => sum + delta, 0) / measuredDeltas.length;
  const adventure: DetailedAffinityExplanation['adventure'] = averageDelta <= 0.65
    ? 'familiar'
    : averageDelta <= 1.25
      ? 'equilibrado'
      : 'exploratorio';
  const missingData = Array.from(new Set([
    ...(extraDimensions.some((dimension) => dimension.key === 'madera') ? [] : ['madera/crianza fiable']),
    ...(extraDimensions.some((dimension) => dimension.key === 'intensidad') ? [] : ['intensidad aromatica medida']),
    ...(extraDimensions.some((dimension) => dimension.key === 'madera' && dimension.profileValue === null) ? ['tu preferencia de madera/crianza'] : []),
    ...(extraDimensions.some((dimension) => dimension.key === 'intensidad' && dimension.profileValue === null) ? ['tu preferencia de intensidad aromatica'] : []),
    ...(sensorySource === 'catalog' ? [] : ['estilo canonico verificado']),
    ...(identification < 0.72 ? ['identidad del vino confirmada'] : []),
    ...(options.extraMissingData ?? []),
  ]));

  const uncertaintyBand = Math.max(5, Math.round(((1 - confidence) * 18 + missingData.length * 1.5) / 5) * 5);
  const scoreRange = score === null ? null : {
    min: Math.max(0, Math.floor((score - uncertaintyBand) / 5) * 5),
    max: Math.min(100, Math.ceil((score + uncertaintyBand) / 5) * 5),
  };

  return {
    score,
    confidence,
    confidenceLabel: confidenceLabel(confidence),
    identificationConfidence: identification,
    scoreRange,
    dimensions,
    primaryMatches,
    frictions,
    whyItMayFit: primaryMatches.length
      ? `Tus mejores coincidencias estan en ${primaryMatches.slice(0, 2).map((item) => item.split(':')[0]).join(' y ')}.`
      : 'No hay una coincidencia dominante; el resultado depende del equilibrio general.',
    whatMayNotFit: frictions[0] ?? 'No aparece una friccion fuerte en las dimensiones disponibles.',
    adventure,
    missingData,
    sources: Array.from(new Set<AffinityDataSource>(['preference', sensorySource])),
  };
};
