// Recognition by candidates (286), measured offline with the app's own code on retained Apple Vision OCR.
// Search is EMULATED over each closed catalogue (query text must appear inside the wine name), so this is a
// proxy for the public Winerim search, not a measurement against the full catalogue. No network, no model.
// Run: npx tsx scripts/check-matchrim-candidates286.ts [--pb-ocr=DIR] [--pkg-ocr=DIR] [--out=FILE]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { candidateDecision286, candidateQueries286, rankCandidates286, searchCandidates286 } from '../src/utils/candidateRecognition286';
import { globalRecoveryQueries104, rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
import { suggestLocalOCRFragments108 } from '../src/utils/localOCRFragments108';
import { wineYearRoles105 } from '../src/utils/wineYearRole105';

const arg = (name: string, fallback: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
type RawLine = { text: string; confidence: number; index: number; box: { bottomLeft: { x: number; y: number; width: number; height: number } } };
type Query = { truth: number; accept: number[]; lines: { text: string; confidence: number; box: { x: number; y: number; width: number; height: number } }[] };
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const readLines = (file: string): Query['lines'] => (JSON.parse(fs.readFileSync(file, 'utf8')).lines as RawLine[])
  .sort((a, b) => a.index - b.index).map(line => {
    const { x, y, width, height } = line.box.bottomLeft, left = clamp(x), top = clamp(1 - y - height);
    return { text: line.text, confidence: line.confidence,
      box: { x: left, y: top, width: Math.max(1e-6, Math.min(width, 1 - left)), height: Math.max(1e-6, Math.min(height, 1 - top)) } };
  });

// Dataset A: plazablanca-clone carta, Winerim packshots as photos (two Magnum/regular pairs share one photo).
const pbRows: PublicGlobalRow103[] = [];
for (let page = 1; page <= 7; page++) pbRows.push(...JSON.parse(fs.readFileSync(`qa-artifacts/plazablanca285-20261028/raw/wines-p${page}.json`, 'utf8')).results);
const carta = [...new Map(pbRows.map(row => [row.id, row])).values()];
const photoSha = new Map((JSON.parse(fs.readFileSync('qa-artifacts/plazablanca285-20261028/photos-manifest.json', 'utf8')).rows as { id: number; sha256: string }[])
  .map(row => [String(row.id), row.sha256]));
const pbOcr = arg('pb-ocr', 'qa-artifacts/plazablanca285-20261028/ocr-vocab-x2');
const cartaQueries: Query[] = carta.map(row => ({ truth: row.id, lines: readLines(`${pbOcr}/${row.id}.json`),
  accept: carta.filter(other => photoSha.get(String(other.id)) === photoSha.get(String(row.id))).map(other => other.id) }));
// Dataset B: the 200-label package; reference identities only (no harvest, type or region).
const pkgRoot = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2';
const pkgOcr = arg('pkg-ocr', `${pkgRoot}/raw`);
const comparison = JSON.parse(fs.readFileSync(`${pkgRoot}/COMPARISON.json`, 'utf8')).rows as { imageId: string; name: { reference: string }; winery: { reference: string } }[];
const pkg: PublicGlobalRow103[] = comparison.map((row, index) => ({ id: index + 1, name: row.name.reference, winery: row.winery.reference,
  slugname: `pkg-${index + 1}`, vintage: null, subname: null, type: null, region: null, country: null, photo: null }));
const pkgQueries: Query[] = comparison.map((row, index) => ({ truth: index + 1, accept: [index + 1], lines: readLines(`${pkgOcr}/${row.imageId}.json`) }));

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(' ');
// Emulated public search. 388 recorded live responses (qa-artifacts/global103-20261021/ocr200-r1, 2,553 rows) all
// satisfy: every query word is a substring of the wine name, subname or winery. Over 80 hits gives a partial first page.
const emulate = (catalogue: PublicGlobalRow103[]) => async (query: string) => {
  const keys = fold(query).split(' ').filter(Boolean);
  const hits = !keys.length ? [] : catalogue.filter(row => {
    const haystack = fold(`${row.name} ${row.subname ?? ''} ${row.winery}`);
    return keys.every(key => haystack.includes(key));
  });
  return hits.length > 80 ? { status: 'partial', rows: hits.slice(0, 20) } : { status: 'complete', rows: hits };
};
const appInput = (query: Query) => {
  const fragments = suggestLocalOCRFragments108(query.lines);
  const evidence = [...query.lines.map(line => line.text), ...fragments.alternatives.map(line => line.text)].slice(0, 100);
  const years = wineYearRoles105(query.lines);
  const possible = years.supported ? years.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified') : [];
  return { evidence, vintage: possible.length === 1 ? possible[0].year : null };
};
const pct = (value: number, n: number) => Math.round(1000 * value / n) / 10;

const evaluate = async (label: string, catalogue: PublicGlobalRow103[], queries: Query[]) => {
  const search = emulate(catalogue);
  const counts = { rankTop1: 0, rankTop3: 0, rankOne: 0, rankOneRight: 0, inRows: 0, top1: 0, top3: 0, inList: 0, one: 0, oneRight: 0,
    strictTop1: 0, strictShown: 0, empty: 0, searches: 0 };
  const misses: unknown[] = [];
  for (const query of queries) {
    const { evidence, vintage } = appInput(query);
    if (!evidence.length) { counts.empty++; misses.push({ id: query.truth, reason: 'ocr-empty' }); continue; }
    // (1) Ranking alone over the whole closed catalogue (parity with experiment 286).
    const whole = rankCandidates286(evidence, catalogue, vintage), wholeRank = whole.findIndex(c => query.accept.includes(c.row.id));
    if (wholeRank === 0) counts.rankTop1++; if (wholeRank >= 0 && wholeRank < 3) counts.rankTop3++;
    const wholeDecision = candidateDecision286(whole);
    if (wholeDecision.mode === 'one') { counts.rankOne++; if (query.accept.includes(wholeDecision.first.row.id)) counts.rankOneRight++; }
    // (2) The app pipeline: 104 literal queries, then word queries, emulated search, tolerant ranking.
    const literal = globalRecoveryQueries104('Etiqueta por identificar', evidence, false, vintage, query.lines);
    const found = await searchCandidates286(evidence, literal, vintage, search, query.lines);
    counts.searches += found.searched.length;
    const rank = found.ranked.findIndex(c => query.accept.includes(c.row.id));
    const rows = new Set<number>();
    for (const q of found.searched) for (const row of (await search(q)).rows) rows.add(row.id);
    if (query.accept.some(id => rows.has(id))) counts.inRows++;
    if (rank === 0) counts.top1++; if (rank >= 0 && rank < 3) counts.top3++; if (rank >= 0 && rank < 20) counts.inList++;
    if (found.decision.mode === 'one') { counts.one++; if (query.accept.includes(found.decision.first.row.id)) counts.oneRight++; }
    // (3) What the app shows today: strict 104 proposals over the literal queries only.
    const strictRows: PublicGlobalRow103[] = [];
    for (const q of literal) strictRows.push(...(await search(q)).rows);
    const strict = rankGlobalProposals104(evidence, strictRows, vintage);
    if (strict.length) counts.strictShown++; if (strict[0] && query.accept.includes(strict[0].row.id)) counts.strictTop1++;
    if (rank !== 0) misses.push({ id: query.truth, rank: rank < 0 ? null : rank + 1, inRows: query.accept.some(id => rows.has(id)),
      searched: found.searched, top: found.ranked.slice(0, 3).map(c => `${c.row.id} ${c.name}`), ocr: evidence.join(' / ').slice(0, 140) });
  }
  const n = queries.length;
  return { label, catalogue: catalogue.length, images: n, ocrEmpty: counts.empty,
    rankingOnly: { top1: pct(counts.rankTop1, n), top3: pct(counts.rankTop3, n), oneShown: pct(counts.rankOne, n),
      onePrecision: counts.rankOne ? pct(counts.rankOneRight, counts.rankOne) : null },
    pipeline: { searchesPerImage: Math.round(10 * counts.searches / n) / 10, truthInSearchRows: pct(counts.inRows, n),
      top1: pct(counts.top1, n), top3: pct(counts.top3, n), inListOf20: pct(counts.inList, n),
      oneShown: pct(counts.one, n), onePrecision: counts.one ? pct(counts.oneRight, counts.one) : null,
      needsManualSearch: pct(n - counts.inList, n) },
    todayStrict104: { anyProposal: pct(counts.strictShown, n), top1: pct(counts.strictTop1, n) }, misses };
};

// Unit guards on the module itself.
const row = (id: number, name: string, winery: string, vintage: string | null = null, type: string | null = null): PublicGlobalRow103 =>
  ({ id, name, winery, slugname: `w${id}`, vintage, subname: null, type, region: null, country: null, photo: null });
{
  const rows = [row(1, 'Pesquera Crianza', 'Tinto Pesquera'), row(2, 'Pesquera Reserva', 'Tinto Pesquera'), row(3, 'Viña Pedrosa Crianza', 'Pérez Pascuas')];
  const ranked = rankCandidates286(['PESOUERA', 'CRIANZA', 'Ribera del Duero'], rows);
  assert.equal(ranked[0].row.id, 1, 'a one-letter misread still ranks the right sibling first');
  assert.ok(rankCandidates286(['Pedrosa'], rows).every(c => c.row.id !== 2), 'rows sharing no read word are not candidates');
  const vintages = rankCandidates286(['Pesquera Crianza 2019'], [row(4, 'Pesquera Crianza', 'Tinto Pesquera', '2018'),
    row(5, 'Pesquera Crianza', 'Tinto Pesquera', '2019'), row(6, 'Pesquera Crianza', 'Tinto Pesquera', null)], 2019);
  assert.deepEqual(vintages.map(c => c.row.id), [5], 'one entry per wine, the bottle harvest preferred');
  assert.deepEqual(candidateQueries286(['Bodegas PESQUERA', 'Reserva 2019', 'Alejandro Fernández', 'Mis en bouteille'], ['Bodegas PESQUERA']),
    ['alejandro', 'fernandez'], 'small print and words a fruitful search had are not searched again');
  assert.deepEqual(candidateQueries286(['PESQUERA', 'Alejandro Fernández'], [], 1,
    [{ text: 'PESQUERA', box: { height: 0.08 } }, { text: 'Alejandro Fernández', box: { height: 0.02 } }]), ['pesquera'], 'largest text first');
  assert.equal(candidateDecision286([]).mode, 'none');
  const close = candidateDecision286(rankCandidates286(['Pesquera'], rows));
  assert.equal(close.mode, 'choose', 'siblings without a clear lead are asked, never chosen');
}

const result = { scope: 'Offline: retained Apple Vision OCR, app code, search EMULATED over each closed catalogue (query inside wine name). '
  + 'Not the full Winerim catalogue, not real phone photos.', pbOcr, pkgOcr,
  carta: await evaluate('plazablanca-clone carta', carta, cartaQueries), package200: await evaluate('200-label package', pkg, pkgQueries) };
const out = arg('out', '');
if (out) { fs.mkdirSync(out.replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n'); }
for (const key of ['carta', 'package200'] as const) { const { misses, ...summary } = result[key]; console.log(JSON.stringify(summary)); }
console.log('Matchrim candidates286: unit guards PASS; metrics above are measurements, gated in the report');
