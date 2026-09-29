export interface WineIdentityLike {
  name: unknown;
  producer?: unknown;
  winery?: unknown;
  vintage?: unknown;
}

export interface UnseenRecommendationSelection<T> {
  recommendations: T[];
  exhausted: boolean;
}

const normalizeIdentityPart = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizedProducer = (wine: WineIdentityLike) => (
  normalizeIdentityPart(wine.producer ?? wine.winery)
);

export const buildCanonicalWineIdentity = (wine: WineIdentityLike) => [
  normalizeIdentityPart(wine.name).replace(/\s+/g, ''),
  normalizedProducer(wine).replace(/\s+/g, ''),
  normalizeIdentityPart(wine.vintage).replace(/\s+/g, ''),
].join('|');

export const isSameWineIdentity = (left: WineIdentityLike, right: WineIdentityLike) => {
  const leftName = normalizeIdentityPart(left.name);
  const rightName = normalizeIdentityPart(right.name);
  if (!leftName || leftName !== rightName) return false;

  const leftProducer = normalizedProducer(left);
  const rightProducer = normalizedProducer(right);
  if (leftProducer && rightProducer && leftProducer !== rightProducer) return false;

  const leftVintage = normalizeIdentityPart(left.vintage);
  const rightVintage = normalizeIdentityPart(right.vintage);
  if (leftVintage && rightVintage && leftVintage !== rightVintage) return false;

  return true;
};

export const selectUnseenWineRecommendations = <T extends WineIdentityLike>(
  candidates: T[],
  savedWines: WineIdentityLike[],
  limit = 3,
): UnseenRecommendationSelection<T> => {
  const unseen = candidates.reduce<T[]>((selection, candidate) => {
    const isSaved = savedWines.some((savedWine) => isSameWineIdentity(candidate, savedWine));
    const isDuplicate = selection.some((selected) => isSameWineIdentity(candidate, selected));
    if (!isSaved && !isDuplicate) selection.push(candidate);
    return selection;
  }, []);

  return {
    recommendations: unseen.slice(0, Math.max(0, limit)),
    exhausted: candidates.length > 0 && unseen.length === 0,
  };
};
