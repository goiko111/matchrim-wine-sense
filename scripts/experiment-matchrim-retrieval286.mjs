// Offline experiment: rank a closed set of known wines (a restaurant carta, the 200-label package)
// by what the on-device OCR did read, instead of requiring every distinctive word.
// No network, no model, no catalogue read. Run: node scripts/experiment-matchrim-retrieval286.mjs [--out=FILE]
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const fold = value => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
const words = value => fold(value).split(/[^a-z0-9]+/).filter(Boolean);
const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'le', 'les', 'du', 'des', 'di', 'da', 'do', 'dos', 'das', 'et', 'y', 'e', 'i',
  'and', 'the', 'of', 'en', 'a', 'd', 'l', 'von', 'van', 'der', 'und', 'al', 'vino', 'vin', 'wine', 'vinho', 'vini']);
const distinct = value => [...new Set(words(value).filter(word => !STOP.has(word) && !/^(19|20)\d{2}$/.test(word)))];
const lev = (a, b, max) => {
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
// A wine token is seen if the OCR has it, a one/two-letter misread of it, or it inside a merged word.
const seen = (token, ocrWords, glued) => {
  if (ocrWords.has(token)) return 1;
  if (token.length >= 4) {
    const max = token.length >= 8 ? 2 : 1;
    for (const word of ocrWords) if (word.length >= 3 && lev(token, word, max) <= max) return 0.8;
    if (glued.includes(token)) return 0.9;
  }
  return 0;
};
export const rankClosedSet = (catalogue, ocrLines) => {
  const documents = catalogue.map(wine => ({ wine, name: distinct(wine.name + ' ' + (wine.subname ?? '')), winery: distinct(wine.winery) }));
  const df = new Map();
  for (const doc of documents) for (const token of new Set([...doc.name, ...doc.winery])) df.set(token, (df.get(token) ?? 0) + 1);
  const idf = token => Math.log(1 + documents.length / (df.get(token) ?? 1));
  const ocrWords = new Set(ocrLines.flatMap(words)), glued = ocrLines.map(line => words(line).join('')).join('|');
  return documents.map(doc => {
    let found = 0, total = 0, nameFound = 0, nameTotal = 0;
    for (const [tokens, weight] of [[doc.name, 1], [doc.winery, 0.7]]) for (const token of tokens) {
      const match = seen(token, ocrWords, glued), value = idf(token) * weight;
      total += value; found += value * match;
      if (weight === 1) { nameTotal += value; nameFound += value * match; }
    }
    const coverage = total ? found / total : 0;
    return { id: doc.wine.id, score: found + 4 * coverage, coverage, nameCoverage: nameTotal ? nameFound / nameTotal : 0 };
  }).sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));
};

const evaluate = (label, catalogue, queries) => {
  let top1 = 0, top3 = 0, top5 = 0, auto = 0, autoRight = 0, empty = 0;
  const misses = [];
  for (const query of queries) {
    if (!query.lines.length) { empty++; misses.push({ id: query.truth, reason: 'ocr-empty' }); continue; }
    const ranked = rankClosedSet(catalogue, query.lines);
    const rank = ranked.findIndex(row => query.accept.includes(row.id));
    if (rank === 0) top1++; if (rank >= 0 && rank < 3) top3++; if (rank >= 0 && rank < 5) top5++;
    // Automatic confirmation only with a clear lead and most of the identity read.
    const lead = ranked[0].score - (ranked[1]?.score ?? 0);
    if (ranked[0].coverage >= 0.6 && ranked[0].nameCoverage >= 0.5 && lead >= 2.5) { auto++; if (query.accept.includes(ranked[0].id)) autoRight++; }
    if (rank !== 0) misses.push({ id: query.truth, rank: rank < 0 ? null : rank + 1, top: ranked.slice(0, 3).map(row => row.id),
      ocr: query.lines.join(' / ').slice(0, 120) });
  }
  const n = queries.length, pct = value => Math.round(1000 * value / n) / 10;
  return { label, catalogue: catalogue.length, images: n, ocrEmpty: empty, top1: pct(top1), top3: pct(top3), top5: pct(top5),
    autoConfirmed: pct(auto), autoPrecision: auto ? Math.round(1000 * autoRight / auto) / 10 : null, misses };
};

// Dataset A: plazablanca-clone carta (135 unique wines, Winerim packshots as photos).
const pbRows = [];
for (let page = 1; page <= 7; page++) pbRows.push(...JSON.parse(fs.readFileSync(`qa-artifacts/plazablanca285-20261028/raw/wines-p${page}.json`, 'utf8')).results);
const pb = [...new Map(pbRows.map(row => [row.id, row])).values()];
const manifest = JSON.parse(fs.readFileSync('qa-artifacts/plazablanca285-20261028/photos-manifest.json', 'utf8'));
const photoSha = new Map(manifest.rows.map(row => [String(row.id), row.sha256]));
const pbOcr = process.argv.find(arg => arg.startsWith('--pb-ocr='))?.slice(9) ?? 'qa-artifacts/plazablanca285-20261028/ocr';
const pbQueries = pb.map(row => {
  const raw = JSON.parse(fs.readFileSync(`${pbOcr}/${row.id}.json`, 'utf8'));
  // Two Magnum/regular pairs share one photo: either wine is a correct answer for that picture.
  const accept = pb.filter(other => photoSha.get(String(other.id)) === photoSha.get(String(row.id))).map(other => other.id);
  return { truth: row.id, accept, lines: [...raw.lines].sort((a, b) => a.index - b.index).map(line => line.text) };
});
// Dataset B: the 200-label package against its 200 reference identities.
const root = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2';
const comparison = JSON.parse(fs.readFileSync(root + '/COMPARISON.json', 'utf8')).rows;
const pkg = comparison.map(row => ({ id: row.imageId, name: row.name.reference, winery: row.winery.reference }));
const pkgQueries = comparison.map(row => ({ truth: row.imageId, accept: [row.imageId],
  lines: [...JSON.parse(fs.readFileSync(`${root}/raw/${row.imageId}.json`, 'utf8')).lines].sort((a, b) => a.index - b.index).map(line => line.text) }));

const result = { pbOcr, scope: 'Offline closed-set text ranking from retained Apple Vision OCR; no network, model or catalogue read. Not a global-catalogue or real-photo measurement.',
  inputsSHA256: { comparison: createHash('sha256').update(fs.readFileSync(root + '/COMPARISON.json')).digest('hex') },
  plazablanca: evaluate('plazablanca-clone carta', pb, pbQueries), package200: evaluate('200-label package', pkg, pkgQueries) };
const out = process.argv.find(arg => arg.startsWith('--out='))?.slice(6);
if (out) fs.writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
for (const key of ['plazablanca', 'package200']) { const { misses, ...summary } = result[key]; console.log(JSON.stringify(summary)); }
