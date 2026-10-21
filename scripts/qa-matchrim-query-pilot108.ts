import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGlobalCatalogue103, type PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { globalRecoveryQueries104, rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';

const output = path.resolve(process.argv[2]);
assert(output.startsWith(path.resolve('qa-artifacts') + '/') && !fs.existsSync(output));
fs.mkdirSync(output, { mode: 0o700 });
const source = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/raw';
const ids = ['img-024', 'img-012', 'img-075'];
const receipts: unknown[] = [], predictions: { id: string; queries: string[]; pages: unknown[]; proposals: ReturnType<typeof rankGlobalProposals104> }[] = [];
const sha = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
let requests = 0;
const client = createGlobalCatalogue103(async (url, options) => {
  assert(++requests <= 6, 'Six free public catalogue GETs maximum');
  assert.equal(options?.method, 'GET'); assert.equal(options?.credentials, 'omit');
  const response = await fetch(url, options);
  const reader = response.body!.getReader(); let size = 0; const chunks: Uint8Array[] = [];
  try { while (true) { const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength; assert(size <= 262144); chunks.push(value); } }
  finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  const bytes = Buffer.concat(chunks), file = `response-${requests}.json`;
  fs.writeFileSync(path.join(output, file), bytes, { mode: 0o600 });
  receipts.push({ url: String(url), status: response.status, file, sha256: sha(bytes) });
  return new Response(bytes, { status: response.status, headers: { 'content-type': response.headers.get('content-type') || '' } });
});
try {
  for (const id of ids) {
    const ocr = JSON.parse(fs.readFileSync(`${source}/${id}.json`, 'utf8'));
    assert(ocr.hashMatches); assert.deepEqual(ocr.customWords, []);
    const evidence = ocr.lines.map((line: { text: string }) => line.text);
    const queries = globalRecoveryQueries104('', evidence), rows: PublicGlobalRow103[] = [], pages = [];
    for (const query of queries) {
      const page = await client.search(query, undefined, true); rows.push(...page.rows);
      pages.push({ query, status: page.status, rows: page.rows.length });
    }
    predictions.push({ id, queries, pages, proposals: rankGlobalProposals104(evidence, rows, null) });
  }
  // Filename-derived metadata is evaluation-only and read after all requests/ranking.
  const truth = JSON.parse(fs.readFileSync('qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json', 'utf8')).rows;
  const rows = predictions.map(scene => { const expected = truth.find((row: { image_id: string }) => row.image_id === scene.id); assert(expected);
    return { ...scene, expected: { name: expected.expected_name, producer: expected.expected_producer },
      top3ExpectedReference: scene.proposals.some(proposal => isSafeCanonicalLabelMatch({ name: expected.expected_name, producer: expected.expected_producer },
        { name: proposal.name, producer: proposal.row.winery, vintage: proposal.row.vintage })) }; });
  fs.writeFileSync(output + '/REPORT.json', JSON.stringify({ transportCompleted: true, rows, requests,
    top3ExpectedReferences: rows.filter(row => row.top3ExpectedReference).length,
    expectedLoadedAfterRanking: true, scope: 'Selected three-case free public retrieval pilot using frozen Mac OCR. No new image OCR, model calls, automatic identity, native flow or representative200 accuracy claim.',
    sourceSHA256: sha(fs.readFileSync('src/utils/globalWineProposals104.ts')), modelStarts: 0, imagesSent: 0 }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ requests, rows: rows.map(row => ({ id: row.id, queries: row.queries, top3: row.top3ExpectedReference })) }));
} finally { fs.writeFileSync(output + '/REQUESTS.json', JSON.stringify(receipts, null, 2) + '\n', { mode: 0o600 }); }
