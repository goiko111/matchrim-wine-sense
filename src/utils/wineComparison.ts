import { formatScanPrice, normalizeScanCurrency, singlePriceCurrency } from './scanMoney';

export type WineDecisionMode = 'personal' | 'service';
export type WineDecisionPriority = 'affinity' | 'certainty' | 'value';
export type WineServiceFormat = 'any' | 'glass' | 'bottle';

export interface ComparableWine {
  id: string;
  name: string;
  producer?: string | null;
  region?: string | null;
  affinity?: number | null;
  personalRating?: 'love' | 'ok' | 'not_for_me' | null;
  confidence?: number | null;
  identityConfirmed?: boolean;
  identityReviewedByUser?: boolean;
  price?: number | null;
  currency?: string | null;
  prices?: { glass?: number | null; bottle?: number | null } | null;
  service?: 'glass' | 'bottle' | 'both' | null;
  attributes?: {
    body?: number | null;
    acidity?: number | null;
    sweetness?: number | null;
    tannin?: number | null;
    fruit?: number | null;
    wood?: number | null;
    intensity?: number | null;
  } | null;
}

export interface WineComparisonContext {
  mode: WineDecisionMode;
  priority: WineDecisionPriority;
  budget: number | null;
  budgetCurrency?: string | null;
  serviceFormat: WineServiceFormat;
}

export interface WineComparisonAssessment {
  wine: ComparableWine;
  constraintStatus: 'confirmed' | 'unknown' | 'outside';
  reasons: string[];
  cautions: string[];
}

export interface WineComparisonDecision {
  primary: WineComparisonAssessment | null;
  ordered: WineComparisonAssessment[];
  actionability: 'ready' | 'provisional';
}

const finiteNumber = (value: number | null | undefined) => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

const normalizedConfidence = (value: number | null | undefined) => {
  const numeric = finiteNumber(value);
  if (numeric === null) return null;
  return Math.max(0, Math.min(1, numeric > 1 ? numeric / 100 : numeric));
};

export const wineComparisonPriceFormat = (wines: ComparableWine[], format: WineServiceFormat): 'glass' | 'bottle' | null => {
  if (format !== 'any') return format;
  const shared = wines[0]?.service;
  return (shared === 'glass' || shared === 'bottle') && wines.every((wine) => wine.service === shared)
    ? shared : null;
};

export const wineComparisonPrice = (wine: ComparableWine, format: WineServiceFormat) => format === 'any'
  ? finiteNumber(wine.price)
  : finiteNumber(wine.prices?.[format]) ?? (wine.service === format ? finiteNumber(wine.price) : null);

const supportsFormat = (wine: ComparableWine, format: WineServiceFormat) => {
  if (format === 'any') return true;
  if (!wine.service) return null;
  return wine.service === 'both' || wine.service === format;
};

const getConstraintStatus = (wine: ComparableWine, context: WineComparisonContext, priceFormat: 'glass' | 'bottle' | null) => {
  const price = finiteNumber(wine.price);
  const budgetStatus = context.budget === null
    ? true
    : price === null || !priceFormat || !normalizeScanCurrency(context.budgetCurrency)
      || normalizeScanCurrency(wine.currency) !== normalizeScanCurrency(context.budgetCurrency)
      ? null
      : price <= context.budget;
  const formatStatus = supportsFormat(wine, context.serviceFormat);

  if (budgetStatus === false || formatStatus === false) return 'outside' as const;
  if (budgetStatus === null || formatStatus === null) return 'unknown' as const;
  return 'confirmed' as const;
};

const buildAssessment = (wine: ComparableWine, context: WineComparisonContext, priceFormat: 'glass' | 'bottle' | null): WineComparisonAssessment => {
  // A budget/value comparison needs one serving unit, never a glass-to-bottle ratio.
  if (priceFormat) wine = { ...wine, price: wineComparisonPrice(wine, priceFormat) };
  const affinity = finiteNumber(wine.affinity);
  const confidence = normalizedConfidence(wine.confidence);
  const price = finiteNumber(wine.price);
  const formatSupport = supportsFormat(wine, context.serviceFormat);
  const constraintStatus = getConstraintStatus(wine, context, priceFormat);
  const comparableCurrency = Boolean(normalizeScanCurrency(context.budgetCurrency)
    && normalizeScanCurrency(wine.currency) === normalizeScanCurrency(context.budgetCurrency));
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (wine.personalRating === 'love') reasons.push('Tu valoración: te encanta');
  if (wine.personalRating === 'ok') reasons.push('Tu valoración: correcto');
  if (wine.personalRating === 'not_for_me') cautions.push('Tu valoración: no es para ti');

  if (affinity !== null) reasons.push(`${Math.round(affinity)}% de afinidad registrada`);
  if (wine.identityReviewedByUser) reasons.push('Identidad revisada por ti');
  else if (confidence !== null && confidence >= 0.72) {
    reasons.push(`Identidad con ${Math.round(confidence * 100)}% de confianza`);
  }
  if (context.budget !== null && priceFormat && price !== null && comparableCurrency && price <= context.budget) {
    reasons.push(`Dentro del presupuesto: ${formatScanPrice(price, wine.currency)}`);
  }
  if (context.serviceFormat !== 'any' && formatSupport === true) {
    reasons.push(context.serviceFormat === 'glass' ? 'Disponible por copa' : 'Disponible por botella');
  }

  if (affinity === null) cautions.push('Afinidad no calculada');
  if (!wine.identityReviewedByUser) {
    if (confidence === null) cautions.push('Confianza de identidad no disponible');
    else if (confidence < 0.72) cautions.push(`Identidad dudosa: ${Math.round(confidence * 100)}% de confianza`);
  }
  if (wine.identityConfirmed === false) cautions.push('Identidad provisional: confirma la etiqueta antes de elegir');
  if (!priceFormat && (context.budget !== null || context.priority === 'value')) cautions.push('Formato del precio sin confirmar; copa y botella no son equivalentes');
  if (context.budget !== null && price === null) cautions.push('Precio no leído; presupuesto sin verificar');
  if (context.budget !== null && price !== null && !comparableCurrency) cautions.push('Moneda distinta o desconocida; presupuesto sin verificar');
  if (context.budget !== null && priceFormat && price !== null && comparableCurrency && price > context.budget) {
    cautions.push(`Supera el presupuesto en ${formatScanPrice(price - context.budget, wine.currency)}`);
  }
  if (context.serviceFormat !== 'any' && formatSupport === null) cautions.push('Formato de servicio no confirmado');
  if (context.serviceFormat !== 'any' && formatSupport === false) {
    cautions.push(context.serviceFormat === 'glass' ? 'No figura disponible por copa' : 'No figura disponible por botella');
  }

  return { wine, constraintStatus, reasons, cautions };
};

const compareNullableDescending = (left: number | null, right: number | null) => {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
};

const identityReadiness = (assessment: WineComparisonAssessment) => {
  if (assessment.wine.identityConfirmed === false) return 1;
  const confidence = normalizedConfidence(assessment.wine.confidence);
  if (confidence === null) return 2;
  return confidence >= 0.72 ? 0 : 1;
};

const compareByPriority = (
  left: WineComparisonAssessment,
  right: WineComparisonAssessment,
  priority: WineDecisionPriority,
  valueCurrency: string | null,
) => {
  const leftAffinity = finiteNumber(left.wine.affinity);
  const rightAffinity = finiteNumber(right.wine.affinity);
  const leftConfidence = normalizedConfidence(left.wine.confidence);
  const rightConfidence = normalizedConfidence(right.wine.confidence);

  if (priority === 'certainty') {
    return compareNullableDescending(leftConfidence, rightConfidence)
      || compareNullableDescending(leftAffinity, rightAffinity);
  }

  if (priority === 'value') {
    const leftPrice = finiteNumber(left.wine.price);
    const rightPrice = finiteNumber(right.wine.price);
    const leftValue = valueCurrency && normalizeScanCurrency(left.wine.currency) === valueCurrency
      && leftAffinity !== null && leftPrice !== null && leftPrice > 0 ? leftAffinity / leftPrice : null;
    const rightValue = valueCurrency && normalizeScanCurrency(right.wine.currency) === valueCurrency
      && rightAffinity !== null && rightPrice !== null && rightPrice > 0 ? rightAffinity / rightPrice : null;
    return compareNullableDescending(leftValue, rightValue)
      || compareNullableDescending(leftAffinity, rightAffinity)
      || compareNullableDescending(leftConfidence, rightConfidence);
  }

  return compareNullableDescending(leftAffinity, rightAffinity)
    || compareNullableDescending(leftConfidence, rightConfidence);
};

export const buildWineComparisonDecision = (
  wines: ComparableWine[],
  context: WineComparisonContext,
): WineComparisonDecision => {
  const statusOrder: Record<WineComparisonAssessment['constraintStatus'], number> = {
    confirmed: 0,
    unknown: 1,
    outside: 2,
  };
  const priceFormat = wineComparisonPriceFormat(wines, context.serviceFormat);
  const assessed = wines.map((wine) => buildAssessment(wine, context, priceFormat));
  const valueCurrency = priceFormat ? singlePriceCurrency(assessed.map(({ wine }) => wine)) : null;
  const ordered = assessed
    .sort((left, right) => (
      (context.mode === 'personal' ? Number(left.wine.personalRating === 'not_for_me') - Number(right.wine.personalRating === 'not_for_me') : 0)
      || statusOrder[left.constraintStatus] - statusOrder[right.constraintStatus]
      || identityReadiness(left) - identityReadiness(right)
      || compareByPriority(left, right, context.priority, valueCurrency)
      || left.wine.name.localeCompare(right.wine.name, 'es')
    ));
  const primary = ordered.find(item => context.mode !== 'personal' || item.wine.personalRating !== 'not_for_me') ?? null;
  const primaryConfidence = normalizedConfidence(primary?.wine.confidence);
  const priorityDataReady = !primary
    ? false
    : context.priority === 'value'
      ? finiteNumber(primary.wine.affinity) !== null && finiteNumber(primary.wine.price) !== null
        && valueCurrency !== null && normalizeScanCurrency(primary.wine.currency) === valueCurrency
      : context.priority === 'affinity'
        ? finiteNumber(primary.wine.affinity) !== null
        : primaryConfidence !== null;
  const actionability = primary
    && primary.constraintStatus === 'confirmed'
    && primaryConfidence !== null
    && primaryConfidence >= 0.72
    && primary.wine.identityConfirmed !== false
    && priorityDataReady
    ? 'ready'
    : 'provisional';

  return { primary, ordered, actionability };
};
