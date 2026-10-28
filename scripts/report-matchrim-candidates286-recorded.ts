// Ranking over REAL public-search results (286): the 388 responses recorded on 2026-10-21 for the 200-label package
// (qa-artifacts/global103-20261021/ocr200-r1) are replayed offline; no new request. Only that run's literal queries exist,
// so this measures the ranking among real catalogue distractors, not the query plan of 286.
// Run: npx tsx scripts/report-matchrim-candidates286-recorded.ts [--ocr=DIR] [--out=FILE]
import fs from 'node:fs';
import type { PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { candidateDecision286, rankCandidates286 } from '../src/utils/candidateRecognition286';
import { rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
import { wineYearRoles105 } from '../src/utils/wineYearRole105';

const arg = (name: string, fallback: string) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const base = 'qa-artifacts/global103-20261021/ocr200-r1';
const report = JSON.parse(fs.readFileSync(`${base}/REPORT.json`, 'utf8')) as { rows: { imageId: string; queries: { query: string }[];
  expected: { name: string; producer: string } }[] };
const responses = new Map<string, PublicGlobalRow103[]>();
for (const request of JSON.parse(fs.readFileSync(`${base}/REQUESTS.json`, 'utf8')) as { url: string; status: number; body: string }[]) {
  if (request.status !== 200) continue;
  const text = new URL(request.url).searchParams.get('text') ?? '';
  const body = JSON.parse(fs.readFileSync(`${base}/${request.body}`, 'utf8'));
  responses.set(text, [...(responses.get(text) ?? []), ...(body.results ?? [])]);
}
const ocr = arg('ocr', 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/raw');
const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
// The expected identity is the reference wine: every word of its name in the row's name, and the same producer words.
const isTruth = (row: PublicGlobalRow103, expected: { name: string; producer: string }) => {
  const name = new Set(fold(`${row.name} ${row.subname ?? ''}`)), winery = new Set(fold(row.winery));
  const wanted = fold(expected.name).filter(word => !/^(19|20)\d{2}$/.test(word));
  const producer = fold(expected.producer).filter(word => !['bodega', 'bodegas', 'domaine', 'chateau', 'winery'].includes(word));
  return wanted.every(word => name.has(word)) && producer.some(word => winery.has(word) || name.has(word));
};
const counts = { images: 0, truthReturned: 0, strictTop1: 0, strictAny: 0, top1: 0, top3: 0, one: 0, oneRight: 0, rowsReturned: 0 };
const misses: unknown[] = [];
for (const image of report.rows) {
  counts.images++;
  const rows = image.queries.flatMap(query => responses.get(query.query) ?? []);
  counts.rowsReturned += rows.length;
  if (!rows.some(row => isTruth(row, image.expected))) continue;
  counts.truthReturned++;
  const lines = (JSON.parse(fs.readFileSync(`${ocr}/${image.imageId}.json`, 'utf8')).lines as { text: string; index: number }[])
    .sort((a, b) => a.index - b.index).map(line => ({ text: line.text }));
  const evidence = lines.map(line => line.text);
  const years = wineYearRoles105(lines);
  const possible = years.supported ? years.roles.filter(role => role.role === 'vintage' || role.role === 'unclassified') : [];
  const vintage = possible.length === 1 ? possible[0].year : null;
  const strict = rankGlobalProposals104(evidence, rows, vintage);
  if (strict.length) counts.strictAny++;
  if (strict[0] && isTruth(strict[0].row, image.expected)) counts.strictTop1++;
  const ranked = rankCandidates286(evidence, rows, vintage), rank = ranked.findIndex(c => isTruth(c.row, image.expected));
  if (rank === 0) counts.top1++; if (rank >= 0 && rank < 3) counts.top3++;
  const decision = candidateDecision286(ranked);
  if (decision.mode === 'one') { counts.one++; if (isTruth(decision.first.row, image.expected)) counts.oneRight++; }
  if (rank !== 0) misses.push({ imageId: image.imageId, expected: image.expected, rank: rank < 0 ? null : rank + 1,
    top: ranked.slice(0, 3).map(c => `${c.name} | ${c.row.winery} | ${c.row.vintage}`) });
}
const n = counts.truthReturned, pct = (value: number, total: number) => total ? Math.round(1000 * value / total) / 10 : null;
const result = { scope: 'Offline replay of 388 recorded live public-search responses (2026-10-21) for the 200-label package; ranking among real distractors only.',
  ocr, images: counts.images, meanRowsPerImage: Math.round(10 * counts.rowsReturned / counts.images) / 10,
  truthReturnedByRecordedQueries: counts.truthReturned,
  amongThose: { strict104Any: pct(counts.strictAny, n), strict104Top1: pct(counts.strictTop1, n), candidates286Top1: pct(counts.top1, n),
    candidates286Top3: pct(counts.top3, n), oneShown: pct(counts.one, n), onePrecision: pct(counts.oneRight, counts.one) }, misses };
const out = arg('out', '');
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
const { misses: _misses, ...summary } = result;
console.log(JSON.stringify(summary));
