export type WineDecisionMode = 'personal' | 'service';
export type WineDecisionPriority = 'affinity' | 'certainty' | 'value';
export type WineServiceFormat = 'any' | 'glass' | 'bottle';

export interface ComparableWine {
  id: string;
  name: string;
  producer?: string | null;
  region?: string | null;
  affinity?: number | null;
  confidence?: number | null;
  price?: number | null;
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

const supportsFormat = (wine: ComparableWine, format: WineServiceFormat) => {
  if (format === 'any') return true;
  if (!wine.service) return null;
  return wine.service === 'both' || wine.service === format;
};

const getConstraintStatus = (wine: ComparableWine, context: WineComparisonContext) => {
  const price = finiteNumber(wine.price);
  const budgetStatus = context.budget === null
    ? true
    : price === null
      ? null
      : price <= context.budget;
  const formatStatus = supportsFormat(wine, context.serviceFormat);

  if (budgetStatus === false || formatStatus === false) return 'outside' as const;
  if (budgetStatus === null || formatStatus === null) return 'unknown' as const;
  return 'confirmed' as const;
};

const buildAssessment = (wine: ComparableWine, context: WineComparisonContext): WineComparisonAssessment => {
  const affinity = finiteNumber(wine.affinity);
  const confidence = normalizedConfidence(wine.confidence);
  const price = finiteNumber(wine.price);
  const formatSupport = supportsFormat(wine, context.serviceFormat);
  const constraintStatus = getConstraintStatus(wine, context);
  const reasons: string[] = [];
  const cautions: string[] = [];

  if (affinity !== null) reasons.push(`${Math.round(affinity)}% de afinidad registrada`);
  if (confidence !== null && confidence >= 0.72) {
    reasons.push(`Identidad con ${Math.round(confidence * 100)}% de confianza`);
  }
  if (context.budget !== null && price !== null && price <= context.budget) {
    reasons.push(`Dentro del presupuesto: ${price.toFixed(2)} €`);
  }
  if (context.serviceFormat !== 'any' && formatSupport === true) {
    reasons.push(context.serviceFormat === 'glass' ? 'Disponible por copa' : 'Disponible por botella');
  }

  if (affinity === null) cautions.push('Afinidad no calculada');
  if (confidence === null) cautions.push('Confianza de identidad no disponible');
  else if (confidence < 0.72) cautions.push(`Identidad dudosa: ${Math.round(confidence * 100)}% de confianza`);
  if (context.budget !== null && price === null) cautions.push('Precio no leído; presupuesto sin verificar');
  if (context.budget !== null && price !== null && price > context.budget) {
    cautions.push(`Supera el presupuesto en ${(price - context.budget).toFixed(2)} €`);
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
  const confidence = normalizedConfidence(assessment.wine.confidence);
  if (confidence === null) return 2;
  return confidence >= 0.72 ? 0 : 1;
};

const compareByPriority = (
  left: WineComparisonAssessment,
  right: WineComparisonAssessment,
  priority: WineDecisionPriority,
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
    const leftValue = leftAffinity !== null && leftPrice !== null && leftPrice > 0 ? leftAffinity / leftPrice : null;
    const rightValue = rightAffinity !== null && rightPrice !== null && rightPrice > 0 ? rightAffinity / rightPrice : null;
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
  const ordered = wines
    .map((wine) => buildAssessment(wine, context))
    .sort((left, right) => (
      statusOrder[left.constraintStatus] - statusOrder[right.constraintStatus]
      || identityReadiness(left) - identityReadiness(right)
      || compareByPriority(left, right, context.priority)
      || left.wine.name.localeCompare(right.wine.name, 'es')
    ));
  const primary = ordered[0] ?? null;
  const primaryConfidence = normalizedConfidence(primary?.wine.confidence);
  const priorityDataReady = !primary
    ? false
    : context.priority === 'value'
      ? finiteNumber(primary.wine.affinity) !== null && finiteNumber(primary.wine.price) !== null
      : context.priority === 'affinity'
        ? finiteNumber(primary.wine.affinity) !== null
        : primaryConfidence !== null;
  const actionability = primary
    && primary.constraintStatus === 'confirmed'
    && primaryConfidence !== null
    && primaryConfidence >= 0.72
    && priorityDataReady
    ? 'ready'
    : 'provisional';

  return { primary, ordered, actionability };
};
