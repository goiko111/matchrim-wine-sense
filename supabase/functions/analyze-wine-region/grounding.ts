const GENERIC_WINE_TOKENS = new Set([
  'blanc', 'blanco', 'brut', 'classic', 'clasico', 'crianza', 'cuvee', 'dry', 'gran',
  'grand', 'original', 'product', 'reserve', 'reserva', 'rose', 'rosado', 'rouge', 'sec',
  'seco', 'selection', 'sparkling', 'spumante', 'tinto', 'vin', 'vino', 'wine',
]);

export const normalizeGroundingTokens = (values: unknown[]) => values
  .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
  .join(' ')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .match(/[a-z0-9]{2,}/g) ?? [];

export interface CandidateGrounding {
  visibleTokenCount: number;
  identityMatches: string[];
  nameMatches: string[];
  fullyGroundedName: boolean;
  ungroundedNameTokens: string[];
  producerMatches: string[];
  fullyGroundedProducer: boolean;
  groundedVintage: boolean;
  groundedEvidence: string[];
}

export const evaluateCandidateGrounding = ({
  name,
  producer,
  vintage,
  visibleText,
  evidence,
}: {
  name: string;
  producer: unknown;
  vintage: unknown;
  visibleText: string[];
  evidence: string[];
}): CandidateGrounding => {
  const visibleTokens = new Set(normalizeGroundingTokens(visibleText));
  const nameTokens = normalizeGroundingTokens([name])
    .filter((token) => !GENERIC_WINE_TOKENS.has(token));
  const producerTokens = normalizeGroundingTokens([producer])
    .filter((token) => !GENERIC_WINE_TOKENS.has(token)
      && !['bodega', 'bodegas', 'winery', 'wines', 'sa', 'co'].includes(token));
  const vintageTokens = normalizeGroundingTokens([vintage])
    .filter((token) => !GENERIC_WINE_TOKENS.has(token));
  const identityTokens = [...nameTokens, ...producerTokens, ...vintageTokens];
  const nameMatches = Array.from(new Set(nameTokens.filter((token) => visibleTokens.has(token))));
  const producerMatches = Array.from(new Set(producerTokens.filter((token) => visibleTokens.has(token))));
  const identityMatches = Array.from(new Set(identityTokens.filter((token) => visibleTokens.has(token))));
  const groundedEvidence = evidence.filter((item) => (
    normalizeGroundingTokens([item]).some((token) => visibleTokens.has(token))
  ));

  return {
    visibleTokenCount: visibleTokens.size,
    identityMatches,
    nameMatches,
    fullyGroundedName: new Set(nameTokens).size >= 2
      && nameTokens.every((token) => visibleTokens.has(token)),
    ungroundedNameTokens: nameTokens.filter((token) => !visibleTokens.has(token)),
    producerMatches,
    fullyGroundedProducer: producerTokens.length > 0
      && producerTokens.every((token) => visibleTokens.has(token)),
    groundedVintage: vintageTokens.length > 0
      && vintageTokens.every((token) => visibleTokens.has(token)),
    groundedEvidence,
  };
};
