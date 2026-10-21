const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (value: string) => fold(value).match(/[a-z0-9]+/g) ?? [];

// Only standalone classification lines, optionally with a quoted climat, are
// evidence here. "Grand Cru Cellars" as a producer is not a classification.
export const hasMissingVisibleQualifier102 = (input: { name: string; evidence?: readonly string[] }): boolean => {
  const name = fold(input.name);
  return (input.evidence ?? []).some(fragment => {
    const match = fold(fragment).trim().match(/^(premier cru|1er cru|grand cru)(?:\s+["'“«](.+?)["'”»])?$/);
    if (!match) return false;
    const classification = match[1] === 'grand cru' ? /\bgrand cru\b/ : /\b(?:premier|1er) cru\b/;
    if (!classification.test(name)) return true;
    const visibleName = new Set(words(name));
    return Boolean(match[2] && words(match[2]).some(word => !visibleName.has(word)));
  });
};
