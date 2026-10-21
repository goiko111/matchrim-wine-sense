import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createGlobalCatalogue103, applyGlobalCatalogue103, independentGlobalProducer103 } from '../src/utils/nativeGlobalCatalogue103';
import { canAdmitNativeCatalogLookup97 } from '../src/utils/nativeCatalogAdmission97';
import { hasMissingVisibleQualifier102 } from '../src/utils/nativeWineQualifier102';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import type { WineCandidate } from '../src/utils/multiWineScan';

const output = path.resolve(process.argv[2] || '');
assert(output.startsWith(path.resolve('qa-artifacts') + '/') && !fs.existsSync(output));
fs.mkdirSync(output, { mode: 0o700, recursive: true });
const corpus = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2';
const manifest = JSON.parse(fs.readFileSync(path.join(corpus, 'REPORT.json'), 'utf8'));
assert.equal(manifest.expectedNamesGivenToOCR, false); assert.equal(manifest.prepared.length, 200);
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const cache = new Map<string, string>();
const replayRoot = process.argv[3] ? path.resolve(process.argv[3]) : null;
let replayedReads = 0;
if (replayRoot) {
  assert(replayRoot.startsWith(path.resolve('qa-artifacts') + '/'));
  const prior = JSON.parse(fs.readFileSync(path.join(replayRoot, 'REQUESTS.json'), 'utf8'));
  for (const receipt of prior) {
    assert(/^response-\d{3}\.json$/.test(receipt.body));
    const body = fs.readFileSync(path.join(replayRoot, receipt.body)); assert.equal(sha(body), receipt.sha256);
    if (receipt.status === 200) cache.set(receipt.url, path.join(replayRoot, receipt.body));
  }
}
const requests: { url: string; status: number; elapsedMs: number; bytes: number; sha256: string; body: string }[] = [];
const wire = globalThis.fetch;
const fetcher: typeof fetch = async (url, init) => {
  const target = String(url);
  assert(target.startsWith('https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines'));
  assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.body, undefined);
  const cached = cache.get(target);
  if (cached) { replayedReads++; return new Response(fs.readFileSync(path.isAbsolute(cached) ? cached : path.join(output, cached)), { headers: { 'content-type': 'application/json' } }); }
  assert(!replayRoot, 'NO_NEW_NETWORK_DURING_REPLAY');
  assert(requests.length < 600, 'Bounded free public catalogue reads only');
  const start = performance.now();
  const response = await wire(url, init);
  const reader = response.body?.getReader(); assert(reader);
  const parts: Uint8Array[] = []; let bytes = 0;
  try { while (true) { const item = await reader.read(); if (item.done) break;
    bytes += item.value.byteLength; assert(bytes <= 262144); parts.push(item.value); }
  } finally { await reader.cancel().catch(() => undefined); }
  const body = Buffer.concat(parts), name = `response-${String(requests.length + 1).padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(output, name), body, { flag: 'wx', mode: 0o600 });
  requests.push({ url: target, status: response.status, elapsedMs: Math.round(performance.now() - start), bytes, sha256: sha(body), body: name });
  if (response.ok) cache.set(target, name);
  fs.writeFileSync(path.join(output, 'REQUESTS.json'), JSON.stringify(requests, null, 2), { mode: 0o600 });
  await new Promise(resolve => setTimeout(resolve, 100));
  return new Response(body, { status: response.status, headers: response.headers });
};
const client = createGlobalCatalogue103(fetcher);
const generic = /^(?:grand cru|premier cru|reserva|gran reserva|rioja|bordeaux|appellation.*|.*produit.*|.*bottled.*|.*embotellado.*|.*contiene.*|.*sulfites.*|.*alcohol.*|.*%.*|.*\d{4}.*)$/i;
const rows: Record<string, unknown>[] = [];
const start = performance.now();
// No GT name/producer/ID is loaded until all retrieval decisions are frozen.
for (const image of manifest.prepared) {
  const bytes = fs.readFileSync(path.join(corpus, 'raw', `${image.imageId}.json`));
  const ocr = JSON.parse(bytes.toString());
  assert.equal(ocr.hashMatches, true); assert.equal(ocr.preparedSHA256, image.sha256); assert.deepEqual(ocr.customWords, []);
  const evidence: string[] = ocr.lines.map((line: { text: string }) => line.text);
  const queries: string[] = [...new Set<string>(ocr.lines.filter((line: { text: string }) => {
    const q = line.text.trim(); return q.length >= 4 && q.length <= 100 && /[a-zA-ZÀ-ÿ]{3}/.test(q) && !generic.test(q);
  }).sort((a: { box: { bottomLeft: { height: number } } }, b: { box: { bottomLeft: { height: number } } }) =>
    b.box.bottomLeft.height - a.box.bottomLeft.height).map((line: { text: string }) => line.text.trim()))].slice(0, 2);
  const years = [...new Set(evidence.flatMap(line => line.trim().match(/^(?:(?:vintage|cosecha|añada|anada|año|year)\s*[:.-]?\s*)?((?:19|20)\d{2})$/i)?.[1] || []))];
  const candidates = new Map<number, WineCandidate>();
  const outcomes: { query: string; status: string }[] = [];
  for (const query of queries) {
    const page = await client.search(query);
    outcomes.push({ query, status: page.status });
    if (page.status !== 'complete') continue;
    for (const row of page.rows) {
      const sub = row.subname && !row.name.toLowerCase().includes(row.subname.toLowerCase()) ? ` ${row.subname}` : '';
      const candidate: WineCandidate = { id: image.imageId, name: row.name + sub, producer: row.winery,
        vintage: years.length === 1 ? Number(years[0]) : null, region: null, country: null,
        confidence: 1, evidence, inferredFields: [], grapes: [], alcohol: null, source: 'label', uncertaintyReasons: [] };
      if (years.length <= 1 && canAdmitNativeCatalogLookup97(candidate) && independentGlobalProducer103(candidate)
        && !hasMissingVisibleQualifier102(candidate)) candidates.set(row.id, candidate);
    }
    if (candidates.size) break;
  }
  let result: Record<string, unknown> = { status: candidates.size > 1 ? 'ambiguous' : 'not-found' };
  if (candidates.size === 1) {
    const candidate = [...candidates.values()][0];
    const lookup = await client.lookup(candidate);
    result = { ...lookup, candidate, affinity: 'wine' in lookup ? applyGlobalCatalogue103(candidate,
      { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 }, lookup.wine).affinity : null };
  }
  rows.push({ imageId: image.imageId, ocrReceiptSHA256: sha(bytes), nonemptyOCR: evidence.length > 0,
    queries: outcomes, visibleYears: years, literalEligibleCandidates: candidates.size, result });
  fs.writeFileSync(path.join(output, 'PROGRESS.json'), JSON.stringify({ scenes: rows.length, requests: requests.length, rows }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ imageId: image.imageId, queries: queries.length, status: result.status, requests: requests.length }));
}
// Expected references only evaluate frozen predictions; they never create queries.
const expected = JSON.parse(fs.readFileSync('qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json', 'utf8')).rows;
const evaluated = rows.map(row => {
  const truth = expected.find((item: { image_id: string }) => item.image_id === row.imageId); assert(truth);
  const result = row.result as { wine?: { name: string; producer: string }; status: string };
  return { ...row, expected: { name: truth.expected_name, producer: truth.expected_producer },
    compatibleExpectedReference: result.wine ? isSafeCanonicalLabelMatch({ name: truth.expected_name, producer: truth.expected_producer }, result.wine) : null };
});
const predictions = evaluated.filter(row => row.compatibleExpectedReference !== null);
const correct = predictions.filter(row => row.compatibleExpectedReference === true).length;
const summary = { scenes: rows.length, nonemptyOCR: rows.filter(row => row.nonemptyOCR).length,
  retrievedReferences: predictions.length, compatibleExpectedReferences: correct,
  incompatibleExpectedReferences: predictions.length - correct,
  exactVintageBindings: rows.filter(row => (row.result as { status: string }).status === 'exact').length,
  nonVintageReferences: rows.filter(row => (row.result as { status: string }).status === 'reference').length,
  referencePrecision: predictions.length ? correct / predictions.length : null, referenceRecall: correct / 200,
  requests: requests.length, replayedReads, paidStarts: 0, imageUploads: 0, productionWrites: 0, elapsedMs: Math.round(performance.now() - start) };
fs.writeFileSync(path.join(output, 'REPORT.json'), JSON.stringify({ observedUTC: new Date().toISOString(),
  scope: 'Existing Apple Vision OCR plus public catalogue GETs. Not a rerun of the paid image detector. Confidence=1 isolates literal eligibility, not calibrated recognition confidence. A year absent in OCR does not prove NV.',
  sourceFingerprints: Object.fromEntries(['scripts/benchmark-matchrim-global103.ts', 'src/utils/nativeGlobalCatalogue103.ts',
    'src/utils/nativeCatalogAdmission97.ts', 'src/utils/nativeWineQualifier102.ts'].map(file => [file, sha(fs.readFileSync(file))])),
  replayRoot, expectedUsedBeforeRetrieval: false, summary, requests, rows: evaluated }, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(summary));
