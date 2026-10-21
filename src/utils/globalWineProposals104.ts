import type { PublicGlobalRow103 } from './nativeGlobalCatalogue103';
import { hasMissingVisibleQualifier102 } from './nativeWineQualifier102';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';
import { isNonWineIdentity } from './wineCategory';

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const tokens = (value: string) => fold(value).match(/[a-z0-9]+/g) || [];
const generic = new Set(('de del la el le les du des the and y et di do da dos das los las aoc doc docg vino wine vin '
  + 'reserva reserve gran grand premier cru blanc blanco blanca rouge red white tinto rosado rose brut extra sec seco '
  + 'pinot noir grigio gris cabernet sauvignon merlot chardonnay malbec alvarinho tempranillo garnacha riesling '
  + 'syrah shiraz touraine bordeaux rioja chianti champagne sparkling cremant spumante blancas blancos blancs '
  + 'lagrein albarino godello mencia viognier gewurztraminer grenache monastrell mourvedre franc '
  + 'bodega bodegas winery chateau domaine finca quinta weingut tenuta estate').split(' '));
const grapes = new Set('pinot cabernet sauvignon merlot chardonnay malbec alvarinho tempranillo garnacha riesling syrah shiraz lagrein albarino godello mencia viognier gewurztraminer grenache monastrell mourvedre'.split(' '));
const fullName = (row: PublicGlobalRow103) => row.subname && !(` ${tokens(row.name).join(' ')} `).includes(` ${tokens(row.subname).join(' ')} `)
  ? `${row.name} ${row.subname}` : row.name;
export type WineProposal104 = { row: PublicGlobalRow103; name: string; score: number; missingProducer: boolean; vintageConflict: boolean };

// Ranking is an aid to explicit user selection, never canonical evidence or a
// probability. No expected labels, Mantalak mapping or learned fixture dictionary.
export const rankGlobalProposals104 = (evidence: readonly string[], rows: readonly PublicGlobalRow103[], vintage?: number | null): WineProposal104[] => {
  if (!evidence.length || evidence.length > 100 || evidence.some(line => typeof line !== 'string' || line.length > 1000)) return [];
  const visible = new Set(evidence.flatMap(tokens));
  const groups = new Map<string, WineProposal104>();
  for (const row of rows.slice(0, 60)) {
    const name = fullName(row);
    if (isNonWineIdentity(name, row.type) || hasConflictingNativeVintage100({ name, vintage: row.vintage })
      || hasMissingVisibleQualifier102({ name, evidence })) continue;
    const words = [...new Set(tokens(name).filter(word => word.length > 1 && word !== String(row.vintage)))];
    const qualifiers = evidence.map(fold).flatMap(line => line.match(/\b\d{1,2}\s+(?:meses|months)\b|\b(?:gran reserva|reserva especial|vieilles vignes|old vines|seleccion del sumiller)\b/g) || []);
    if (qualifiers.some(qualifier => !fold(name).includes(qualifier))) continue;
    const producerWords = [...new Set(tokens(row.winery).filter(word => word.length > 1 && !generic.has(word)))];
    const grapeWords = (row.grapes || []).flat(2).flatMap(grape => typeof grape === 'string' ? tokens(grape)
      : grape && typeof grape === 'object' && 'name' in grape && typeof grape.name === 'string' ? tokens(grape.name) : []);
    const regionWords = tokens(row.region || '');
    const distinctive = words.filter(word => !generic.has(word) && !grapeWords.includes(word) && !regionWords.includes(word));
    const coverage = words.length ? words.filter(word => visible.has(word)).length / words.length : 0;
    const producerCoverage = producerWords.length ? producerWords.filter(word => visible.has(word)).length / producerWords.length : 0;
    if (distinctive.some(word => !visible.has(word))) continue;
    if (coverage < .8 || (!distinctive.some(word => visible.has(word)) && producerCoverage < .8)) continue;
    if (producerCoverage < .8 && distinctive.filter(word => visible.has(word)).every(word => word.length < 6)) continue;
    if ([...visible].some(word => grapes.has(word)) && words.some(word => grapes.has(word) && !visible.has(word))) continue;
    const vintageConflict = Boolean(vintage && row.vintage != null && String(vintage) !== String(row.vintage));
    if (vintageConflict) continue;
    const score = coverage * 70 + producerCoverage * 20 + (vintage && String(vintage) === String(row.vintage) ? 10 : 0) - (vintageConflict ? 20 : 0);
    const candidate = { row, name, score, missingProducer: producerCoverage < 1, vintageConflict };
    const baseName = row.vintage == null ? name : name.replace(new RegExp(`\\s+\\(?${row.vintage}\\)?$`), '').trim();
    const group = `${tokens(baseName).join(' ')}|${tokens(row.winery).join(' ')}`;
    const previous = groups.get(group);
    if (!previous || score > previous.score || (score === previous.score && row.vintage == null && previous.row.vintage != null)) groups.set(group, candidate);
  }
  return [...groups.values()].sort((a, b) => b.score - a.score || a.row.id - b.row.id).slice(0, 3);
};

export const globalRecoveryQueries104 = (name: string, evidence: readonly string[], manuallyEntered = false) => {
  const visible = new Set(evidence.flatMap(tokens));
  const queryName = name.trim().replace(/\s+\(?(?:19|20)\d{2}\)?$/, '').trim();
  const meaningful = (value: string) => value.length >= 4 && value.length <= 120 && !/https?:|www\.|@|\d{4}|%/i.test(value)
    && tokens(value).some(word => word.length >= 3 && !generic.has(word));
  if (manuallyEntered) return meaningful(queryName) ? [queryName] : [];
  const groundedName = meaningful(queryName) && tokens(queryName).every(word => generic.has(word) || visible.has(word));
  const queries = new Map<string, string>();
  for (const query of [...(groundedName ? [queryName] : []), ...evidence.map(line => line.trim()).filter(meaningful)]) {
    const normalized = tokens(query).join(' '); if (!queries.has(normalized)) queries.set(normalized, query);
  }
  return [...queries.values()].slice(0, 2);
};
