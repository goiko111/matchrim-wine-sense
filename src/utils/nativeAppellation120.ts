const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (value: string) => fold(value).match(/[a-z0-9]+/g) || [];
const roles = new Set(['d', 'de', 'du', 'des', 'l', 'la', 'le', 'les', 'et', 'origine', 'appellation']);

// Same-line legal role only: separate OCR lines/columns are not joined here.
// A producer's address cannot certify a wine's appellation.
export const hasObservedAppellationConflict120 = (
  evidence: readonly string[], reference: { name: string; region?: string | null },
) => {
  if (!Array.isArray(evidence) || evidence.length > 100 || evidence.some(line => typeof line !== 'string' || line.length > 1000)
    || typeof reference?.name !== 'string' || (reference.region != null && typeof reference.region !== 'string')) return true;
  const admitted = new Set(words([reference.name, reference.region || ''].join(' ')));
  for (const line of evidence) {
    const matches = fold(line).matchAll(/\bappellation\s+([^\r\n]{1,160}?)\s+(?:controlee|protegee)\b/g);
    for (const match of matches) {
      const place = words(match[1]).filter(word => word.length > 1 && !roles.has(word));
      if (place.some(word => !admitted.has(word))) return true;
    }
  }
  return false;
};
