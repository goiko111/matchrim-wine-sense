import type { PublicGlobalRow103 } from './nativeGlobalCatalogue103';
import { hasMissingVisibleQualifier102 } from './nativeWineQualifier102';
import { hasConflictingNativeVintage100 } from './nativeVintageEvidence100';
import { isNonWineIdentity } from './wineCategory';
import { hasObservedAppellationConflict120 } from './nativeAppellation120';
import { hasObservedWineColorConflict124 } from './nativeWineColor124';

// Recognition by candidates (goal 286). The strict proposals of 104 need every
// distinctive word read exactly; a phone OCR rarely gives that. Here the rows a
// search already returned are ordered by how much of each identity the OCR did
// read, tolerating one/two-letter misreads and merged words. The order is an aid
// for the user to pick from, never identity evidence on its own.
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
const words = (value: string) => fold(value).split(/[^a-z0-9]+/).filter(Boolean);
const stop = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'le', 'les', 'du', 'des', 'di', 'da', 'do', 'dos', 'das', 'et', 'y', 'e',
  'i', 'and', 'the', 'of', 'en', 'a', 'd', 'l', 'von', 'van', 'der', 'und', 'al', 'vino', 'vin', 'wine', 'vinho', 'vini']);
const distinct = (value: string) => [...new Set(words(value).filter(word => !stop.has(word) && !/^(19|20)\d{2}$/.test(word)))];
// Words that name a style, colour, grape or a producer's legal form: never a search on their own.
const generic = new Set(('tinto tinta blanco blanca rosado rose rouge blanc red white crianza reserva gran grand reserve brut nature '
  + 'extra seco sec dry semi dulce sweet roble joven barrica cosecha vendimia vintage edicion limitada especial seleccion '
  + 'bodega bodegas winery cellar celler chateau domaine finca quinta weingut tenuta estate vinedos vignobles '
  + 'denominacion origen calificada appellation controlee protegida contiene sulfitos alcohol product embotellado '
  + 'tempranillo garnacha grenache mencia godello albarino verdejo viura macabeo monastrell syrah shiraz merlot cabernet '
  + 'sauvignon chardonnay pinot noir riesling malbec cava champagne rioja ribera duero rueda priorat bierzo').split(' '));
// Label small print: bottling, origin and legal mentions in several languages.
const metadata = new Set(('bouteille mise proprietaire recoltant viticulteur negociant embotellado envasado imbottigliato imbottigliata '
  + 'engarrafado abgefullt gutsabfullung controllata controllee controlada controlado garantita denominazione denominacao '
  + 'origine origem origen qualita qualite quality produit prodotto producto produced product produce importado imported '
  + 'fundada fundado fondada fondadas fondata founded depuis since desde sulfitos sulfites solfiti contains contiene '
  + 'alcohol alcool volume italia italy france espana spain portugal germany deutschland austria suisse '
  + 'organic organico organica ecologico ecologica biologico biologica vegan premium classico metodo methode spumante '
  + 'vinedos vignoble vignobles vineyards weinbau consumir moderacion responsibly').split(' '));

const lev = (a: string, b: string, max: number) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const row = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(previous[j] + 1, row[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, row[j]);
    }
    if (best > max) return max + 1;
    previous = row;
  }
  return previous[b.length];
};
// A wine word is read if the OCR has it, a one/two-letter misread of it, or it inside a merged word.
const seen = (token: string, ocrWords: ReadonlySet<string>, glued: string) => {
  if (ocrWords.has(token)) return 1;
  if (token.length >= 4) {
    const max = token.length >= 8 ? 2 : 1;
    for (const word of ocrWords) if (word.length >= 3 && lev(token, word, max) <= max) return 0.8;
    if (glued.includes(token)) return 0.9;
  }
  return 0;
};
const fullName = (row: PublicGlobalRow103) => row.subname && !(` ${words(row.name).join(' ')} `).includes(` ${words(row.subname).join(' ')} `)
  ? `${row.name} ${row.subname}` : row.name;

export type Candidate286 = Readonly<{
  row: PublicGlobalRow103; name: string; score: number;
  /** Share of the identity (name and winery, rarer words weigh more) that the OCR read. */
  coverage: number; nameCoverage: number;
  /** Visible colour, appellation or qualifier that the row contradicts: demoted, not hidden. */
  conflicts: readonly ('color' | 'appellation' | 'qualifier')[];
  vintageConflict: boolean;
}>;

export const rankCandidates286 = (evidence: readonly string[], rows: readonly PublicGlobalRow103[], vintage: number | null = null): Candidate286[] => {
  if (!evidence.length || evidence.length > 100 || evidence.some(line => typeof line !== 'string' || line.length > 1000)) return [];
  const unique = [...new Map(rows.slice(0, 400).map(row => [row.id, row])).values()]
    .filter(row => !isNonWineIdentity(fullName(row), row.type ?? null) && !hasConflictingNativeVintage100({ name: fullName(row), vintage: row.vintage }));
  const documents = unique.map(row => ({ row, name: distinct(fullName(row)), winery: distinct(row.winery) }));
  const df = new Map<string, number>();
  for (const doc of documents) for (const token of new Set([...doc.name, ...doc.winery])) df.set(token, (df.get(token) ?? 0) + 1);
  const idf = (token: string) => Math.log(1 + documents.length / (df.get(token) ?? 1));
  const ocrWords = new Set(evidence.flatMap(words)), glued = evidence.map(line => words(line).join('')).join('|');
  const scored = documents.map(({ row, name, winery }) => {
    let found = 0, total = 0, nameFound = 0, nameTotal = 0;
    for (const [tokens, weight] of [[name, 1], [winery, 0.7]] as const) for (const token of tokens) {
      const value = idf(token) * weight, match = seen(token, ocrWords, glued);
      total += value; found += value * match;
      if (weight === 1) { nameTotal += value; nameFound += value * match; }
    }
    const coverage = total ? found / total : 0, label = fullName(row);
    const conflicts: Candidate286['conflicts'][number][] = [];
    if (hasObservedWineColorConflict124(evidence, row.type ?? null)) conflicts.push('color');
    if (hasObservedAppellationConflict120(evidence, { name: label, region: row.region ?? null })) conflicts.push('appellation');
    if (hasMissingVisibleQualifier102({ name: label, evidence })) conflicts.push('qualifier');
    const vintageConflict = Boolean(vintage && row.vintage != null && String(vintage) !== String(row.vintage));
    const sameVintage = Boolean(vintage && row.vintage != null && String(vintage) === String(row.vintage));
    return { row, name: label, coverage, nameCoverage: nameTotal ? nameFound / nameTotal : 0, conflicts, vintageConflict,
      // 132: words of the identity the label did not show count against the row, so a longer name
      // that merely shares the read words (Bellmunt i Oliver for Olivé Batllori) no longer leads.
      score: found - 0.25 * (total - found) + 4 * coverage - 1.5 * conflicts.length + (sameVintage ? 0.5 : 0) };
  }).filter(candidate => candidate.coverage > 0);
  // One entry per wine: the bottle's harvest if listed, else the reference
  // without harvest, else the most recent one (choosing it shows the change).
  const groups = new Map<string, Candidate286>();
  const rank = (value: Candidate286) => value.score * 10 + (value.vintageConflict ? 0 : 1) + (value.row.vintage == null ? 0.5 : 0)
    + Number(value.row.vintage ?? 0) / 1e5;
  for (const candidate of scored) {
    const base = candidate.row.vintage == null ? candidate.name : candidate.name.replace(new RegExp(`\\s+\\(?${candidate.row.vintage}\\)?$`), '');
    const key = `${distinct(base).join(' ')}|${distinct(candidate.row.winery).join(' ')}`;
    const previous = groups.get(key);
    if (!previous || rank(candidate) > rank(previous)) groups.set(key, candidate);
  }
  return [...groups.values()].sort((a, b) => b.score - a.score || a.row.id - b.row.id);
};

export type CandidateDecision286 = { mode: 'none' } | { mode: 'choose'; shown: Candidate286[]; more: Candidate286[] }
  | { mode: 'one'; first: Candidate286; more: Candidate286[] };
// "one" still needs the user's tap; it only shows a single, clearly leading wine first.
export const candidateDecision286 = (ranked: readonly Candidate286[]): CandidateDecision286 => {
  if (!ranked.length) return { mode: 'none' };
  const [first, second] = ranked, lead = first.score - (second?.score ?? 0);
  if (first.coverage >= 0.6 && first.nameCoverage >= 0.5 && lead >= 2.5 && !first.conflicts.length && !first.vintageConflict)
    return { mode: 'one', first, more: ranked.slice(1, 20) };
  // 131: when the first three share a producer, only the producer was really read; show six so the
  // right wine is not hidden under "Ver más" (Mestres, André Clouet, Sierra Cantabria in the carta).
  const shownCount = ranked.length > 3 && new Set(ranked.slice(0, 3).map(value => distinct(value.row.winery).join(' '))).size === 1 ? 6 : 3;
  return { mode: 'choose', shown: ranked.slice(0, shownCount), more: ranked.slice(shownCount, 20) };
};

type Line286 = { text: string; box?: { height: number } };
// Extra searches when the literal lines (104) brought no clear candidate: one
// word per query (the public search needs every query word), from the largest
// text first, never small print, and not a word a fruitful search already had.
export const candidateQueries286 = (evidence: readonly string[], covered: readonly string[], max = 3, lines: readonly Line286[] = []) => {
  const done = covered.map(query => ` ${words(query).join(' ')} `);
  const height = new Map<string, number>();
  for (const line of lines) for (const word of words(line.text)) height.set(word, Math.max(height.get(word) ?? 0, line.box?.height ?? 0));
  const pool = [...new Set(evidence.flatMap(words))]
    .filter(word => word.length >= 4 && !/\d/.test(word) && !stop.has(word) && !generic.has(word) && !metadata.has(word)
      && !done.some(query => query.includes(` ${word} `)));
  // Text height in steps of a quarter of the tallest line, then length.
  const top = Math.max(0, ...pool.map(word => height.get(word) ?? 0));
  const tier = (word: string) => top ? Math.round(4 * (height.get(word) ?? 0) / top) : 0;
  return pool.sort((a, b) => tier(b) - tier(a) || b.length - a.length || a.localeCompare(b)).slice(0, max);
};

// The public search matches word fragments, so a long word read with one wrong
// letter can still be found by its start or its end.
export const fragmentQueries286 = (barren: readonly string[], max = 2) => [...new Set(barren
  .filter(word => word.length >= 7).flatMap(word => {
    const size = Math.max(5, Math.ceil(word.length * 0.6));
    return [word.slice(0, size), word.slice(-size)];
  }))].slice(0, max);

// 147: «LA ZORRERA» in large letters with «Vino de parcela de la finca Legardeta · Garnacha» in small print brought
// «Finca Legardeta … Garnacha» first: the ranking counts read words, not their size. A wine whose own name is exactly
// what one of the label's largest lines says (and is not just the winery) is what the label is called: it goes first.
export const promoteHeadline147 = (ranked: readonly Candidate286[], lines: readonly Line286[]): Candidate286[] => {
  const sized = lines.filter(line => (line.box?.height ?? 0) > 0);
  if (sized.length < 2 || ranked.length < 2) return [...ranked];
  const tallest = Math.max(...sized.map(line => line.box!.height));
  const wineries = new Set(ranked.map(value => distinct(value.row.winery).join(' ')));
  const headlines = new Set(sized.filter(line => line.box!.height >= tallest * 0.6).map(line => distinct(line.text).join(' '))
    .filter(text => text.length >= 3 && !wineries.has(text) && !text.split(' ').every(word => generic.has(word))));
  const named = ranked.filter(value => headlines.has(distinct(value.name).join(' ')));
  return named.length === 1 && named[0] !== ranked[0] ? [named[0], ...ranked.filter(value => value !== named[0])] : [...ranked];
};

export type CandidateSearch286 = (query: string) => Promise<{ status: string; rows: readonly PublicGlobalRow103[] }>;
// At most two literal, three word and two fragment queries per user action.
export const searchCandidates286 = async (evidence: readonly string[], literalQueries: readonly string[],
  vintage: number | null, search: CandidateSearch286, lines: readonly Line286[] = []) => {
  const rows: PublicGlobalRow103[] = [], searched: string[] = [], fruitful: string[] = [];
  let unavailable = false, incomplete = false;
  // 145: the queries of one stage go out together (each takes about four seconds at Winerim; one after another a
  // label took up to 48 s). Results are added in the order asked, so the ranking is the same as before.
  const runAll = async (queries: readonly string[]) => {
    const pages = await Promise.all(queries.map(query => search(query)));
    const barren: string[] = [];
    queries.forEach((query, index) => { const page = pages[index];
      searched.push(query); rows.push(...page.rows);
      if (page.rows.length) fruitful.push(query); else barren.push(query);
      unavailable ||= page.status === 'unavailable'; incomplete ||= page.status !== 'complete'; });
    return barren;
  };
  await runAll(literalQueries.slice(0, 2));
  let ranked = promoteHeadline147(rankCandidates286(evidence, rows, vintage), lines);
  if (candidateDecision286(ranked).mode !== 'one') {
    const barren = await runAll(candidateQueries286(evidence, fruitful, 3, lines));
    ranked = promoteHeadline147(rankCandidates286(evidence, rows, vintage), lines);
    if (candidateDecision286(ranked).mode !== 'one') {
      await runAll(fragmentQueries286(barren));
      ranked = promoteHeadline147(rankCandidates286(evidence, rows, vintage), lines);
    }
  }
  return { ranked, decision: candidateDecision286(ranked), searched, unavailable, incomplete };
};
