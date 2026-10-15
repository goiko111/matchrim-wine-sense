import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { applySceneReview90, validateSceneAnnotation90 } from './matchrim-scene-evidence90';
import { parsePublicLibraryPage, publicLibraryUuid } from '../supabase/functions/_shared/matchrim-public-library89';

const { values } = parseArgs({ options: { annotation: { type: 'string' }, review: { type: 'string' },
  plan: { type: 'string' }, output: { type: 'string' }, live: { type: 'boolean' } } });
assert.ok(values.annotation && values.review && values.plan && values.output);
assert.equal(values.live, true, 'Explicit opt-in for at most seven free public GETs');
assert.ok(!existsSync(values.output), 'Preserve previous evidence');
const sha = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const annotation = readFileSync(values.annotation), review = readFileSync(values.review), planBytes = readFileSync(values.plan);
const scene = applySceneReview90(validateSceneAnnotation90(JSON.parse(String(annotation))), JSON.parse(String(review)), sha(annotation));
const plan = JSON.parse(String(planBytes)) as Array<{ slot: string; line: number }>;
assert.ok(Array.isArray(plan) && plan.length > 0 && plan.length <= 6);
const queries = plan.map((row) => {
  assert.equal(typeof row.slot, 'string'); assert.ok(Number.isSafeInteger(row.line) && row.line >= 0);
  const slot = scene.slots.find((slot) => slot.id === row.slot);
  const query = slot?.literal_lines[row.line];
  assert.ok(query && query.length >= 2 && query.length <= 120 && !query.includes('...') && !query.includes('?'), 'Only an unchanged reviewed literal line, never a completed fragment');
  return { slot: slot.id, query };
});
const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45000);
const requests: Array<Record<string, unknown>> = [], responses: Array<Record<string, unknown>> = [];
const get = async (path: string) => {
  assert.ok(requests.length < 7, 'Fixed public-read ceiling, no pagination/fallback/retry');
  const url = new URL(path, 'https://app.winerim.com/api/v1/');
  assert.equal(url.origin, 'https://app.winerim.com');
  const ledger = { path: url.pathname + url.search, method: 'GET', status: null as number | null, bytes: 0, elapsed_ms: 0 };
  requests.push(ledger);
  const start = performance.now();
  const response = await fetch(url, { method: 'GET', credentials: 'omit', redirect: 'error',
    headers: { Accept: 'application/json' }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) });
  ledger.status = response.status;
  assert.ok(response.ok && response.headers.get('content-type')?.includes('application/json') && response.body);
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      ledger.bytes += value.byteLength;
      assert.ok(ledger.bytes <= 262144, 'Response byte ceiling');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  ledger.elapsed_ms = Math.round(performance.now() - start);
  const raw = Buffer.concat(chunks), payload = JSON.parse(String(raw));
  responses.push({ path: ledger.path, sha256: sha(raw), payload });
  return payload;
};
const results: Array<Record<string, unknown>> = [];
let error: string | null = null;
try {
  const uuid = publicLibraryUuid(await get('whoami/slugname?s=the-library'));
  assert.ok(uuid, 'Observed public resolver must bind the Library');
  for (const { slot, query } of queries) {
    const page = parsePublicLibraryPage(await get(`restaurant/${uuid}/wines?${new URLSearchParams({ page: '1', text: query })}`), 20);
    results.push({ slot, query, status: page.status, sourceCount: page.sourceCount,
      wines: page.wines, valid_sensory_rows: page.wines.filter((wine) => wine.tasting_attributes).length,
      photo_identity_verified: false, affinity: null,
      boundary: 'Public search records only. No independently verified photo producer/vintage, detail binding or sensory approval for this image.' });
  }
} catch (caught) { error = caught instanceof Error ? caught.message : String(caught); }
finally {
  clearTimeout(timer); controller.abort();
  writeFileSync(values.output, JSON.stringify({ observedAt: new Date().toISOString(), source_sha256: scene.fixture.sha256,
    annotation_sha256: sha(annotation), review_sha256: sha(review), plan_sha256: sha(planBytes), requests, responses, results,
    error, paid_calls: 0, mutations: 0, credentials_sent: false, images_sent: false,
    scope: 'Six pixel-literal catalog coverage probes, not new recognition or global catalog/identity accuracy' }, null, 2), { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ reads: requests.length, results: results.map(({slot, query, status, sourceCount, valid_sensory_rows}) =>
  ({slot, query, status, sourceCount, valid_sensory_rows})), error }));
if (error) process.exitCode = 1;
