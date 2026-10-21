import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';

// Evaluation only. Expected names cannot enter retrieval or the app runtime.
const root = path.resolve(process.argv[2]), output = path.resolve(process.argv[3]);
assert(root.startsWith(path.resolve('qa-artifacts') + '/') && output.startsWith(path.resolve('qa-artifacts') + '/'));
assert(!fs.existsSync(output));
const progress = JSON.parse(fs.readFileSync(path.join(root, 'PROGRESS.json'), 'utf8'));
const requests = JSON.parse(fs.readFileSync(path.join(root, 'REQUESTS.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync('qa-artifacts/lovable-connection101-20261021/EXACT200-CATALOGUE-COVERAGE.json', 'utf8')).rows;
const catalogue = new Map();
for (const receipt of requests) {
  const url = new URL(receipt.url), query = url.searchParams.get('text'); if (!query || receipt.status !== 200) continue;
  const bytes = fs.readFileSync(path.join(root, receipt.body));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
  const payload = JSON.parse(bytes.toString());
  if (Array.isArray(payload.results)) catalogue.set(query, payload);
}
const rows = progress.rows.map((row: { imageId: string; queries: { query: string }[]; result: { status: string } }) => {
  const truth = expected.find((value: { image_id: string }) => value.image_id === row.imageId); assert(truth);
  const found = new Map();
  for (const query of row.queries) for (const wine of catalogue.get(query.query)?.results || []) {
    const sub = wine.subname && !wine.name.toLowerCase().includes(wine.subname.toLowerCase()) ? ` ${wine.subname}` : '';
    const item = { name: wine.name + sub, producer: wine.winery };
    if (isSafeCanonicalLabelMatch({ name: truth.expected_name, producer: truth.expected_producer }, item)) found.set(wine.id, {
      namespace: 'winerim-public-store', id: wine.id, ...item, vintage: wine.vintage,
    });
  }
  return { imageId: row.imageId, expectedName: truth.expected_name, expectedProducer: truth.expected_producer,
    expectedMantalakId: truth.mantalak_id, publicReferencesInOCRSearch: [...found.values()], decision: row.result.status };
});
const summary = { scenesEvaluated: rows.length, scenesWithExpectedReferenceInOCRSearch: rows.filter((row: { publicReferencesInOCRSearch: unknown[] }) => row.publicReferencesInOCRSearch.length).length,
  distinctPublicReferences: new Set(rows.flatMap((row: { publicReferencesInOCRSearch: { id: number }[] }) => row.publicReferencesInOCRSearch.map(wine => wine.id))).size,
  newRequests: 0, paidStarts: 0 };
fs.writeFileSync(output, JSON.stringify({ scope: 'Coverage within already-fetched OCR-query pages only, evaluated after retrieval. Not full-catalogue absence, canonical image recognition, vintage or sensory verification. Mantalak IDs are NOT mapped to public IDs.',
  observedUTC: new Date().toISOString(), summary, rows }, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(summary));
