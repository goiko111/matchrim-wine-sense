const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const words = (value: string) => fold(value).match(/[a-z0-9]+/g) ?? [];

// Only standalone classification lines, optionally with a quoted climat, are
// evidence here. "Grand Cru Cellars" as a producer is not a classification.
export const hasMissingVisibleQualifier102 = (input: { name: string; evidence?: readonly string[] }): boolean => {
  const name = fold(input.name);
  return (input.evidence ?? []).some(fragment => {
    const literal = fold(fragment).trim();
    // These observed designations are not interchangeable with generic
    // Valpolicella. Only standalone label lines, never prose or winery names.
    const designation = literal.match(/^(amarone(?: della valpolicella)?|recioto(?: della valpolicella)?|(?:valpolicella )?ripasso)(?:\s+(?:docg?|classico|superiore|riserva))*$/);
    if (designation) {
      const required = words(literal).filter(word => word !== 'della' && !/^docg?$/.test(word));
      const visibleName = new Set(words(name));
      if (required.some(word => !visibleName.has(word))) return true;
    }
    const match = literal.match(/^(premier cru|1er cru|grand cru)(?:\s+["'“«](.+?)["'”»])?$/)
      || literal.match(/^(premier cru|1er cru|grand cru)\s+["'“«]([^"'“”«»]+)$/);
    if (!match) return false;
    const classification = match[1] === 'grand cru' ? /\bgrand cru\b/ : /\b(?:premier|1er) cru\b/;
    if (!classification.test(name)) return true;
    const visibleName = new Set(words(name));
    return Boolean(match[2] && words(match[2]).some(word => !visibleName.has(word)));
  });
};
