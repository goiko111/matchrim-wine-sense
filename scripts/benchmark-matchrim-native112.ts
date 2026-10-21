import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGlobalCatalogue103, type PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { globalRecoveryQueries104, rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
import { localSingleCandidate109 } from '../src/utils/nativeSingleLabel109';
import { suggestLocalOCRFragments108 } from '../src/utils/localOCRFragments108';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';
import type { LocalOCRResult106 } from '../src/utils/nativeOCR106';

const base = path.resolve('qa-artifacts/night105-20261021'), output = path.resolve(process.argv[2]);
const live = process.argv[3] === 'live', maximum = Number(process.argv[4] || 0);
assert(['live', 'cache'].includes(process.argv[3]));
assert(Number.isSafeInteger(maximum) && maximum >= 0 && maximum <= 600 && (live || maximum === 0));
assert(output.startsWith(base + '/') && !fs.existsSync(output));
const sha = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['heavy-local'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_HEAVY_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  const disk = fs.statfsSync(base); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard();
const cache = new Map<string, Buffer>();
for (const source of [path.resolve('qa-artifacts/global103-20261021/ocr200-r1'), base + '/public-pages111-r1',
  ...(process.argv[5] ? [path.resolve(process.argv[5])] : [])]) {
  assert(source.startsWith(path.resolve('qa-artifacts') + '/'));
  const receipts = JSON.parse(fs.readFileSync(source + '/REQUESTS.json', 'utf8'));
  for (const receipt of receipts) {
    if (receipt.status !== 200) continue;
    assert(/^response-\d{3}\.json$/.test(receipt.body));
    const bytes = fs.readFileSync(path.join(source, receipt.body)); assert.equal(sha(bytes), receipt.sha256);
    cache.set(receipt.url, bytes);
  }
}
const readings = new Map<string, { reading: LocalOCRResult106; inputSHA256: string; receipt: string }>();
for (const folder of fs.readdirSync(base).filter(name => /^vision112-\d{3}-\d{3}-r1$/.test(name)).sort()) {
  const receiptFile = path.join(base, folder, 'RESULT.json'); if (!fs.existsSync(receiptFile)) continue;
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8')); if (!receipt.passed) continue;
  assert.equal(receipt.sourceSHA256['ios/App/App/MatchrimOCRPlugin106.swift'], sha(fs.readFileSync('ios/App/App/MatchrimOCRPlugin106.swift')));
  assert.equal(receipt.expectedNamesGivenToOCR, false);
  const raw = JSON.parse(fs.readFileSync(path.join(base, folder, 'OCR.json'), 'utf8'));
  for (const row of raw.results.filter((item: { file?: string }) => item.file)) {
    assert(/^img-\d{3}\.jpg$/.test(row.file)); assert.equal(row.response.ok, true); assert.equal(row.settlements, 1);
    const id = row.file.replace('.jpg', ''); assert(!readings.has(id));
    const image = path.resolve('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared', row.file);
    assert.equal(sha(fs.readFileSync(image)), receipt.inputs[row.file]);
    readings.set(id, { reading: row.response.data, inputSHA256: receipt.inputs[row.file], receipt: receiptFile });
  }
}
assert(readings.size >= 20 && readings.size <= 200);
fs.mkdirSync(output, { mode: 0o700 });
const requests: Record<string, unknown>[] = [], predictions: Record<string, unknown>[] = [];
let starts = 0, cacheReads = 0, missingCache = 0, held = false;
const wire = globalThis.fetch;
const persist = () => fs.writeFileSync(output + '/REQUESTS.json', JSON.stringify(requests, null, 2) + '\n', { mode: 0o600 });
const client = createGlobalCatalogue103(async (input, init) => {
  guard(); const url = new URL(String(input));
  assert.equal(url.origin, 'https://app.winerim.com');
  assert.equal(url.pathname, '/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines');
  assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.body, undefined);
  const cached = cache.get(url.href);
  if (cached) { cacheReads++; return new Response(cached, { headers: { 'content-type': 'application/json' } }); }
  if (!live) { missingCache++; throw new Error('CACHE_MISS_NO_NETWORK'); }
  if (starts >= maximum) { held = true; throw new Error('PUBLIC_GET_LIMIT'); }
  const number = ++starts, body = `response-${String(number).padStart(3, '0')}.json`, started = performance.now();
  const receipt: Record<string, unknown> = { url: url.href, body, status: 0, state: 'started' };
  requests.push(receipt); persist();
  try {
    const response = await wire(url, init); assert(!response.redirected && response.url === url.href);
    const reader = response.body!.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const next = await reader.read(); if (next.done) break;
      size += next.value.byteLength; assert(size <= 262144); chunks.push(next.value); }
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
    const bytes = Buffer.concat(chunks); fs.writeFileSync(path.join(output, body), bytes, { flag: 'wx', mode: 0o600 });
    Object.assign(receipt, { status: response.status, sha256: sha(bytes), bytes: size, state: 'completed' });
    if (response.ok) cache.set(url.href, bytes);
    return new Response(bytes, { status: response.status, headers: response.headers });
  } catch (error) { receipt.error = String(error); receipt.state = 'failed'; held = true; throw error; }
  finally { receipt.elapsedMs = Math.round(performance.now() - started); persist(); }
});
for (const [imageId, item] of [...readings.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  guard(); if (held) break;
  const candidate = localSingleCandidate109(item.reading, imageId);
  const fragments = suggestLocalOCRFragments108(item.reading.lines);
  const evidence = [...item.reading.lines.map(line => line.text), ...fragments.alternatives.map(line => line.text)].slice(0, 100);
  const queries = globalRecoveryQueries104('', evidence), rows: PublicGlobalRow103[] = [], pages = [];
  for (const query of queries) {
    if (held) break;
    const page = await client.searchProposals(query); rows.push(...page.rows);
    pages.push({ query, status: page.status, rows: page.rows.length });
  }
  predictions.push({ imageId, ...item, candidateVintage: candidate?.vintage ?? null, reconstructed: fragments.alternatives,
    pages, proposals: rankGlobalProposals104(evidence, rows, candidate?.vintage) });
  fs.writeFileSync(output + '/PROGRESS.json', JSON.stringify({ completed: predictions.length, starts, cacheReads, predictions }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ imageId, scenes: predictions.length, queries: queries.length, publicGETStarts: starts }));
}
// Metadata evaluates already frozen proposals; it never supplied OCR, queries or candidate identity.
const expected = JSON.parse(fs.readFileSync('qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json', 'utf8')).rows;
const evaluated = predictions.map(scene => {
  const truth = expected.find((row: { image_id: string }) => row.image_id === scene.imageId); assert(truth);
  const proposals = scene.proposals as ReturnType<typeof rankGlobalProposals104>;
  const hits = proposals.map(proposal => isSafeCanonicalLabelMatch({ name: truth.expected_name, producer: truth.expected_producer },
    { name: proposal.name, producer: proposal.row.winery }));
  return { ...scene, expected: { name: truth.expected_name, producer: truth.expected_producer }, top1Hit: Boolean(hits[0]), top3Hit: hits.some(Boolean) };
});
const summary = { actualNativeVisionImages: readings.size, evaluated: evaluated.length, publicGETStarts: starts, cacheReads, missingCache,
  nonemptyOCR: evaluated.filter(row => (row.reading as LocalOCRResult106).lines.length).length,
  withProposals: evaluated.filter(row => (row.proposals as unknown[]).length).length,
  top1Expected: evaluated.filter(row => row.top1Hit).length, top3Expected: evaluated.filter(row => row.top3Hit).length,
  listsWithoutExpected: evaluated.filter(row => (row.proposals as unknown[]).length && !row.top3Hit).length,
  held, modelStarts: 0, imageUploads: 0, canonicalIdentitiesCreated: 0, productionWrites: 0 };
persist();
fs.writeFileSync(output + '/REPORT.json', JSON.stringify({ summary, observedUTC: new Date().toISOString(),
  expectedLoadedAfterRanking: true, sourceScriptSHA256: sha(fs.readFileSync('scripts/benchmark-matchrim-native112.ts')),
  sourceFingerprints: Object.fromEntries(['src/utils/globalWineProposals104.ts', 'src/utils/nativeGlobalCatalogue103.ts',
    'src/utils/nativeSingleLabel109.ts', 'src/utils/localOCRFragments108.ts'].map(file => [file, sha(fs.readFileSync(file))])),
  scope: 'Actual simulator Vision corpus, current native local-first query/ranking functions, public text GETs and/or bounded caches. Not gallery E2E, paid multi-region vision, automatic identity precision or validated human taste. Filename metadata can contain errors and is not expert ground truth.', rows: evaluated }, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(summary));
