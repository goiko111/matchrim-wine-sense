import type { PublicGlobalRow103 } from './nativeGlobalCatalogue103';
import { hasMissingVisibleQualifier102 } from './nativeWineQualifier102';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';
import { isNonWineIdentity } from './wineCategory';
import { hasObservedAppellationConflict120 } from './nativeAppellation120';
import { hasObservedWineColorConflict124 } from './nativeWineColor124';
import { wineYearRoles105 } from './wineYearRole105';

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tokens = (value: string): string[] => fold(value).match(/[a-z0-9]+/g) || [];
const generic = new Set(('de del la el le les du des the and y et di do da dos das los las aoc doc docg vino wine vin '
  + 'reserva reserve gran grand premier cru blanc blanco blanca rouge red white tinto rosado rose brut extra sec seco '
  + 'pinot noir grigio gris cabernet sauvignon merlot chardonnay malbec alvarinho tempranillo garnacha riesling '
  + 'syrah shiraz touraine bordeaux rioja chianti champagne sparkling cremant spumante blancas blancos blancs '
  + 'lagrein albarino godello mencia viognier gewurztraminer grenache monastrell mourvedre franc '
  + 'bodega bodegas winery chateau domaine finca quinta weingut tenuta estate').split(' '));
const grapes = new Set('pinot cabernet sauvignon merlot chardonnay malbec alvarinho tempranillo garnacha riesling syrah shiraz lagrein albarino godello mencia viognier gewurztraminer grenache monastrell mourvedre'.split(' '));
const connectors = new Set('de del la el le les du des the and y et di do da dos das los las'.split(' '));
const queryMetadata = new Set(('celler cellar cava pet nat ancestral premium tradicional ecologico ecologica '
  + 'eco organic biologico biologica biodinamico biodinamica denominacion denominazione appellation '
  + 'origen origine controlee controllata controlada protegida protegee indicacion geografica '
  + 'malvar verdejo viura macabeo glera chenin verdicchio zibibbo cinsault '
  + 'dry trocken halbtrocken feinherb').split(' '));
const automaticQueryMetadata = new Set('bio cosecha vendimia recolte vintage ernte vendemmia'.split(' '));
const fullName = (row: PublicGlobalRow103) => row.subname && !(` ${tokens(row.name).join(' ')} `).includes(` ${tokens(row.subname).join(' ')} `)
  ? `${row.name} ${row.subname}` : row.name;
export type WineProposal104 = { row: PublicGlobalRow103; name: string; score: number; missingProducer: boolean; vintageConflict: boolean; readingCorrections: string[] };

// Ranking is an aid to explicit user selection, never canonical evidence or a
// probability. No expected labels, Mantalak mapping or learned fixture dictionary.
export const rankGlobalProposals104 = (evidence: readonly string[], rows: readonly PublicGlobalRow103[], vintage?: number | null): WineProposal104[] => {
  if (!evidence.length || evidence.length > 100 || evidence.some(line => typeof line !== 'string' || line.length > 1000)) return [];
  const visible = new Set(evidence.flatMap(tokens));
  const groups = new Map<string, WineProposal104>();
  // Recovery has at most two queries of up to60 references each.
  for (const row of rows.slice(0, 120)) {
    const name = fullName(row);
    if (isNonWineIdentity(name, row.type) || hasConflictingNativeVintage100({ name, vintage: row.vintage })
      || hasMissingVisibleQualifier102({ name, evidence }) || hasObservedAppellationConflict120(evidence, { name, region: row.region })
      || hasObservedWineColorConflict124(evidence, row.type)) continue;
    const words = [...new Set(tokens(name).filter(word => word.length > 1 && word !== String(row.vintage) && !connectors.has(word)))];
    const qualifiers = evidence.map(fold).flatMap(line => line.match(/\b\d{1,2}\s+(?:meses|months)\b|\b(?:gran reserva|reserva especial|vieilles vignes|old vines|seleccion del sumiller)\b/g) || []);
    if (qualifiers.some(qualifier => !fold(name).includes(qualifier))) continue;
    const producerWords = [...new Set(tokens(row.winery).filter(word => word.length > 1 && !generic.has(word)))];
    const producerCoverage = producerWords.length ? producerWords.filter(word => visible.has(word)).length / producerWords.length : 0;
    const matched = new Set(visible), readingCorrections: string[] = [];
    // Explicit classification text is evidence for the corresponding acronym,
    // not permission to remove cru/aging/color qualifiers from identity.
    if (['denominazione', 'origine', 'controllata'].every(word => visible.has(word))) {
      matched.add(visible.has('garantita') ? 'docg' : 'doc');
    }
    const missingGrapes = words.filter(word => grapes.has(word) && !visible.has(word));
    if (producerCoverage === 1 && missingGrapes.length === 1 && missingGrapes[0].length >= 8
      && [...visible].filter(word => grapes.has(word)).every(word => words.includes(word))
      && words.some(word => grapes.has(word) && visible.has(word))) {
      const target = missingGrapes[0];
      const possible = [...visible].filter(word => !grapes.has(word) && word.length === target.length
        && [...word].filter((letter, i) => letter !== target[i]).length === 1);
      if (possible.length === 1) { matched.add(target); readingCorrections.push(`${possible[0]} -> ${target}`); }
    }
    const grapeWords: string[] = (row.grapes || []).flat(2).flatMap(grape => typeof grape === 'string' ? tokens(grape)
      : grape && typeof grape === 'object' && 'name' in grape && typeof grape.name === 'string' ? tokens(grape.name) : []);
    const regionWords = tokens(row.region || '');
    const distinctive = words.filter(word => !generic.has(word) && !grapeWords.includes(word) && !regionWords.includes(word));
    const coverage = words.length ? words.filter(word => matched.has(word)).length / words.length : 0;
    if (distinctive.some(word => !visible.has(word))) continue;
    if (coverage < .8 || (!distinctive.some(word => visible.has(word)) && producerCoverage < .8)) continue;
    if (producerCoverage < .8 && distinctive.filter(word => visible.has(word)).every(word => word.length < 6)) continue;
    if ([...visible].some(word => grapes.has(word)) && words.some(word => grapes.has(word) && !matched.has(word))) continue;
    const vintageConflict = Boolean(vintage && row.vintage != null && String(vintage) !== String(row.vintage));
    if (vintageConflict) continue;
    const score = coverage * 70 + producerCoverage * 20 + (vintage && String(vintage) === String(row.vintage) ? 10 : 0) - readingCorrections.length * 4;
    const candidate = { row, name, score, missingProducer: producerCoverage < 1, vintageConflict, readingCorrections };
    const baseName = row.vintage == null ? name : name.replace(new RegExp(`\\s+\\(?${row.vintage}\\)?$`), '').trim();
    const group = `${tokens(baseName).join(' ')}|${tokens(row.winery).join(' ')}`;
    const previous = groups.get(group);
    if (!previous || score > previous.score || (score === previous.score && row.vintage == null && previous.row.vintage != null)) groups.set(group, candidate);
  }
  const specificity = (proposal: WineProposal104) => {
    const brandAndPlace = new Set([...tokens(proposal.row.winery), ...tokens(proposal.row.region || '')]);
    return new Set(tokens(proposal.name).filter(word => visible.has(word)
      && !generic.has(word) && !brandAndPlace.has(word) && !/^\d+$/.test(word))).size;
  };
  // A fully read cuvee should beat generic producer/region rows at equal evidence score.
  return [...groups.values()].sort((a, b) => b.score - a.score || specificity(b) - specificity(a)
    || a.row.id - b.row.id).slice(0, 3);
};

export const globalRecoveryQueries104 = (name: string, evidence: readonly string[], manuallyEntered = false, vintageHint: number | null = null) => {
  const visible = new Set(evidence.flatMap(tokens));
  const queryName = name.trim().replace(/\s+\(?(?:19|20)\d{2}\)?$/, '').trim();
  const metadataOnly = (value: string) => /^(?:contains? (?:sulph?ites|sulfites)|contiene sulfitos|contient des sulfites|product of\b|produit de\b|producto de\b|imported by\b|importado por\b)/i.test(value)
    || /^\d+(?:[.,]\d+)?\s*(?:ml|cl|litros?|vol|bottles|botellas|eur|euros)\b/i.test(value);
  const meaningful = (value: string) => value.length >= 4 && value.length <= 120 && !/https?:|www\.|@|\d{4}|%/i.test(value)
    && !metadataOnly(value)
    && tokens(value).some(word => word.length >= 3 && !generic.has(word) && !queryMetadata.has(word));
  if (manuallyEntered) return meaningful(queryName) ? [queryName] : [];
  const automaticMeaningful = (value: string) => meaningful(value)
    && !['vieilles vignes', 'old vines'].includes(tokens(value).join(' '))
    && !tokens(value).every(word => generic.has(word) || queryMetadata.has(word) || automaticQueryMetadata.has(word));
  const dates = wineYearRoles105(evidence.map(text => ({ text })));
  const possible = dates.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified');
  const supportedHint = typeof vintageHint === 'number' && Number.isSafeInteger(vintageHint)
    && vintageHint >= 1900 && vintageHint <= new Date().getUTCFullYear()
    && dates.supported && possible.length === 1 && possible[0].year === vintageHint;
  const literalWithoutYear = (value: string) => supportedHint
    ? value.replace(new RegExp(`\\s+\\(?${vintageHint}\\)?$`), '').trim() : value;
  const unquote = (value: string) => {
    const match = value.match(/^(['"])([^\r\n]{3,100})\1$/);
    if (!match || match[2].includes(match[1])) return value;
    const inner = match[2].trim(), words = tokens(inner);
    if (inner.length < 4 || words.length < 1 || words.length > 4) return value;
    return inner;
  };
  const automaticName = unquote(queryName);
  const groundedName = automaticMeaningful(automaticName) && tokens(automaticName).every(word => generic.has(word) || visible.has(word));
  const queries = new Map<string, string>();
  const literalQueries = evidence.map(line => line.trim().replace(/^(?:embotellado por|bottled by|mis en bouteille (?:par|au))\s+/i, '')
    .replace(/^(?:[-,;:]\s*)+|(?:[,;:]\s*)+$/g, '').trim()).map(unquote).map(literalWithoutYear).filter(automaticMeaningful);
  for (const query of [...(groundedName ? [automaticName] : []), ...literalQueries]) {
    const normalized = tokens(query).join(' '); if (!queries.has(normalized)) queries.set(normalized, query);
  }
  const literal = [...queries.entries()];
  // Prefer a fully observed word over a second partial reading of that word.
  // This changes query allocation only, never the evidence used to identify it.
  const bounded = literal.filter(([key]) => !literal.some(([other]) => other !== key && key.length >= 4
    && other.length <= key.length * 2 && !key.includes(' ') && !other.includes(' ') && other.includes(key)))
    .map(([, query]) => query);
  return bounded.slice(0, 2);
};
