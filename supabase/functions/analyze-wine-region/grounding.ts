const GENERIC_WINE_TOKENS = new Set([
  'blanc', 'blanco', 'brut', 'classic', 'clasico', 'crianza', 'cuvee', 'dry', 'gran',
  'grand', 'reserve', 'reserva', 'rose', 'rosado', 'rouge', 'sec', 'seco', 'selection',
  'tinto', 'vin', 'vino', 'wine',
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
  const identityTokens = normalizeGroundingTokens([name, producer, vintage])
    .filter((token) => !GENERIC_WINE_TOKENS.has(token));
  const identityMatches = Array.from(new Set(identityTokens.filter((token) => visibleTokens.has(token))));
  const groundedEvidence = evidence.filter((item) => (
    normalizeGroundingTokens([item]).some((token) => visibleTokens.has(token))
  ));

  return {
    visibleTokenCount: visibleTokens.size,
    identityMatches,
    groundedEvidence,
  };
};
