import { wineYearRoles105, type YearLine105 } from './wineYearRole105';

const key = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const awardWords = new Set('lyon decanter iwsc iwc bruxelles mundus vini gold silver bronze oro or argent medaille medalla medal concours competition award awards premio trophy'.split(' '));

// Query roles only. Raw text, identity evidence, ranking and confirmation are
// never replaced by these literal substrings or metadata annotations.
export const nativeQueryRoles174 = (evidence: readonly string[], lines?: readonly YearLine105[]) => {
  const preferred: string[] = [], producers: string[] = [], metadata = new Set<string>();
  if (!Array.isArray(evidence) || evidence.length > 100 || evidence.some(value => typeof value !== 'string' || value.length > 1000))
    return { preferred, metadata };
  for (const raw of evidence) {
    const value = raw.trim();
    const quote = value.match(/^(['"])([^\r\n]{4,100})\1$/)
      || value.match(/^(?:premier cru|1er cru|grand cru)\s+(['"])([^\r\n]{4,100})\1$/i);
    if (quote && !quote[2].includes(quote[1]) && key(quote[2]).split(' ').length <= 4) preferred.push(quote[2].trim());
    const producer = value.match(/^(?:sce\s+)?(?:domaine|bodegas?|winery|weingut|ch[a\u00e2]teau|tenuta|famille)\s+(?:(?:de la|de|du|del)\s+)?(.+)$/iu);
    if (producer) {
      const literal = producer[1].trim();
      if (/^[\p{L}\p{N}]/u.test(literal) && key(literal).split(' ').length <= 4)
        producers.push(evidence.find(other => key(other) === key(literal))?.trim() || literal);
    }
    const appellation = key(value).match(/^appellation (.+?) (?:controlee|protegee)$/);
    if (appellation) { metadata.add(key(value)); metadata.add(appellation[1]); }
  }
  // The same production year-role parser supplies spatial award context. An
  // unrelated line/column cannot annotate a label without matching raw evidence.
  if (lines && Array.isArray(lines) && lines.length <= 100 && lines.every(line => evidence.includes(line?.text))) {
    const years = wineYearRoles105(lines);
    if (years.supported) for (const role of years.roles.filter(item => item.role === 'award')) {
      for (const value of role.evidence) {
        const words = key(value).split(' ');
        if (words.length && words.every(word => awardWords.has(word) || /^(?:19|20)\d{2}$/.test(word))) metadata.add(key(value));
      }
    }
  }
  return { preferred: [...preferred, ...producers], metadata };
};
