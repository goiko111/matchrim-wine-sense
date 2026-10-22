import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { loadCache112, sha112 } from './benchmark-matchrim-native112';

const base = 'qa-artifacts/night105-20261021';
const beforeFile = `${base}/native112-corpus200-r14/REPORT.json`, afterFile = `${base}/native112-corpus200-r16/REPORT.json`;
const beforeBytes = fs.readFileSync(beforeFile), afterBytes = fs.readFileSync(afterFile);
const before = JSON.parse(beforeBytes.toString()), after = JSON.parse(afterBytes.toString());
assert(before.summary.sourceIntegrityVerified && after.summary.sourceIntegrityVerified);
assert.equal(before.rows.length, 200); assert.equal(after.rows.length, 200);
const receipts = JSON.parse(fs.readFileSync(path.dirname(afterFile) + '/CACHE_READS.json', 'utf8')) as { sourceReceipt: string }[];
const folders = [...new Set(receipts.map(row => path.dirname(row.sourceReceipt.split('#')[0]))), path.resolve(path.dirname(afterFile))];
const cache = loadCache112(process.cwd(), folders);
const transitions = after.rows.map((row: typeof after.rows[0], i: number) => {
  const old = before.rows[i]; assert.equal(row.imageId, old.imageId);
  return { imageId: row.imageId, previouslyComplete: old.eligible, complete: row.eligible,
    previousQueries: old.queries, queries: row.queries,
    proposals: row.proposals.map((p: typeof row.proposals[0]) => ({ id: p.row.id, name: p.name,
      producer: p.row.winery, vintage: p.row.vintage, missingProducer: p.missingProducer })),
    top1Proxy: row.top1Hit ?? null, top3Proxy: row.top3Hit ?? null,
    canonicalIdentityConfirmed: false, affinityValidated: false,
    pages: row.pages };
});
const remaining = transitions.filter((row: typeof transitions[0]) => !row.complete).map((row: typeof transitions[0]) => {
  const states = new Set(row.pages.map((page: typeof row.pages[0]) => page.status));
  const category = states.has('unavailable') ? 'http-unavailable' : states.has('incomplete')
    ? states.has('partial') ? 'schema-and-partial' : 'schema' : 'partial';
  return { ...row, category };
});
const errors = [...cache.entries()].filter(([, value]) => value.status >= 500).map(([url, value]) => ({
  method: 'GET', url, status: value.status, headers: value.headers, bytes: value.bytes.length,
  sha256: value.sha256, sourceReceipt: value.sourceReceipt,
  metadata: value.metadata, observedInCurrentBenchmark: after.failures.some((failure: { url: string }) => failure.url === url),
  requiredServerAction: 'Inspect application exception logs for this exact text/store/page; return a valid bounded JSON envelope or a typed service error. Do not turn errors into an empty catalogue.',
}));
const counts = Object.fromEntries(['partial', 'http-unavailable', 'schema', 'schema-and-partial'].map(key => [key,
  remaining.filter((row: typeof remaining[0]) => row.category === key).length]));
assert.deepEqual(counts, { partial: 19, 'http-unavailable': 19, schema: 1, 'schema-and-partial': 1 });
assert.equal(transitions.filter((row: typeof transitions[0]) => row.previouslyComplete && !row.complete).length, 0);
const output = 'qa-artifacts/continuation174-20261022/ANALYSIS.json';
assert(!fs.existsSync(output));
fs.writeFileSync(output, JSON.stringify({
  generatedUTC: new Date().toISOString(), beforeFile, afterFile, beforeSHA256: sha112(beforeBytes), afterSHA256: sha112(afterBytes),
  before: before.summary, after: after.summary, counts,
  newlyCompletedRetrieval: transitions.filter((row: typeof transitions[0]) => !row.previouslyComplete && row.complete),
  newIncompletePreviouslyComplete: [], remaining, serverReproductions: errors,
  malformedRecords: [{ id: 362891, problem: 'empty slug', scene: 'img-193' }, { id: 363580, problem: 'empty slug', scene: 'img-200' }],
  realNewGET: 17, instrumentedCLI: 377, earlierPublicImage: 1, conservativeFreeReserved: 380, freeCeiling: 400,
  freeReservedRemaining: 20, paidCap: 'unchanged 50 requests / EUR15', modelStarts: 0, imageUploads: 0,
  webPublished: false, backendDeployed: false, testFlightUploaded: false,
  scope: 'Retrieval completion and expected-name proxies from retained simulator Vision. Not 160 identified wines, expert precision, automatic confirmation, fresh gallery E2E or human taste accuracy. Original49 failures remain in immutable r14.',
}, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
console.log(JSON.stringify({ output, counts, newlyCompletedRetrieval: 9, catalogueErrorReceipts: errors.length, newGET: 0, models: 0 }));
