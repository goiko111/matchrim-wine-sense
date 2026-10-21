import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const output = path.resolve(process.argv[2]);
const queries = process.argv.slice(3);
assert(queries.length > 0 && queries.length <= 20, 'One to twenty explicit catalogue queries, not an image-recognition benchmark');
assert(queries.every(q => q.trim().length >= 2 && q.length <= 120));
assert(!fs.existsSync(output)); fs.mkdirSync(output, { mode: 0o700 });
const report = { startedUTC: new Date().toISOString(), calls: [], queries: [],
  scope: 'Public Matchrim global store API. Name availability and independently read detail, not OCR recognition, Mantalak identity mapping, vintage verification or deployment.',
  modelStarts: 0, lovableAgentTurns: 0, imageUploads: 0, productionWrites: 0, appRuntimeIntegration: false };
const read = async suffix => {
  const url = 'https://app.winerim.com/api/v1/' + suffix;
  const started = performance.now();
  const response = await fetch(url, { method: 'GET', credentials: 'omit', redirect: 'error',
    referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  assert(response.ok && response.body && response.headers.get('content-type')?.includes('application/json'), 'Public catalogue unavailable');
  const chunks = []; let bytes = 0;
  for await (const part of response.body) {
    bytes += part.byteLength;
    if (bytes > 262144) throw new Error('Catalogue body bound exceeded');
    chunks.push(part);
  }
  const body = Buffer.concat(chunks), payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  const receipt = { url, status: response.status, elapsedMs: Math.round(performance.now() - started), bytes,
    sha256: createHash('sha256').update(body).digest('hex') };
  const index = String(report.calls.length + 1).padStart(2, '0');
  fs.writeFileSync(path.join(output, index + '-body.json'), body, { flag: 'wx', mode: 0o600 });
  report.calls.push(receipt); return payload;
};
const project = row => ({ namespace: 'winerim-public-store', id: row.id, name: row.name, producer: row.winery,
  vintage: row.vintage, slug: row.slugname, region: row.region, country: row.country,
  photo: row.photo, sensory: row.tastingAttributes, sensoryProvenance: 'not-specified-by-public-api',
  mantalakId: null });
try {
  const resolver = await read('whoami/slugname?s=matchrim');
  assert.equal(resolver.restaurant, '00000000-0000-0000-0000-000000000001', 'Observed global scope changed');
  const root = `restaurant/${resolver.restaurant}/wines`;
  const catalogue = await read(root + '?page=1&store=1');
  assert(Number.isSafeInteger(catalogue.count) && catalogue.count >= 0);
  report.publicCatalogueCount = catalogue.count;
  for (const query of queries) {
    const search = await read(root + '?' + new URLSearchParams({ page: '1', text: query.trim(), store: '1' }));
    assert(search.page === 1 && Array.isArray(search.results) && search.results.length <= 20);
    const row = { query, count: search.count, completeFirstPage: search.count === search.results.length,
      candidates: search.results.map(project), details: [] };
    report.queries.push(row);
    if (!row.completeFirstPage || search.results.length > 2) continue;
    for (const candidate of search.results) {
      assert(Number.isSafeInteger(candidate.id) && candidate.id > 0 && /^[a-z0-9][a-z0-9_-]{0,239}$/i.test(candidate.slugname));
      const detail = await read(`${root}/${candidate.id}/${candidate.slugname}`);
      assert.equal(detail.id, candidate.id); assert.equal(detail.slugname, candidate.slugname);
      row.details.push(project(detail));
    }
  }
  report.passed = true;
} catch (error) { report.passed = false; report.error = error.stack || String(error); }
finally {
  report.finishedUTC = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'REPORT.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ passed: report.passed, queries: report.queries.length, publicCatalogueCount: report.publicCatalogueCount,
  requests: report.calls.length, modelStarts: 0, output, error: report.error }));
process.exitCode = report.passed ? 0 : 1;
