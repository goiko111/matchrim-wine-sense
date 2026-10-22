import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { boundedFetch112, captureSources112, loadCache112, newState112, sha112, verifySources112 } from './benchmark-matchrim-native112';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';

const repo = process.cwd(), out = path.resolve(process.argv[2]);
assert(path.dirname(out) === path.resolve('qa-artifacts/night105-20261021'));
assert(/^public-browse172-[\w-]+$/.test(path.basename(out)) && !fs.existsSync(out));
const source = 'qa-artifacts/night105-20261021/native112-corpus200-r12/REPORT.json';
const baselineBytes = fs.readFileSync(source), baseline = JSON.parse(baselineBytes.toString());
const receipts = JSON.parse(fs.readFileSync(path.dirname(source) + '/CACHE_READS.json', 'utf8'));
const folders = [...new Set<string>(receipts.map((r: { sourceReceipt: string }) => path.dirname(r.sourceReceipt.split('#')[0])))];
const cache = loadCache112(repo, folders), root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const queries = new Set<string>();
for (const scene of baseline.rows) for (const page of scene.pages) if (page.status === 'partial') {
  const url = root + '?' + new URLSearchParams({ page: '1', text: page.query, store: '1' });
  const entry = cache.get(url); assert(entry);
  const count = JSON.parse(entry.bytes.toString()).count;
  if (count > 80 && count <= 120) queries.add(page.query);
}
assert.equal(queries.size, 4);
type BrowseResult = { query: string; pages: { page: number; status: string; rows: number }[]; ids: number[]; lastStatus: string | undefined; noDuplicateIDs: boolean };
const sources = captureSources112(repo), state = newState112(), results: BrowseResult[] = [], failures: unknown[] = [];
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['writer-matchrim-native99'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  verifySources112(repo, sources); assert.equal(sha112(fs.readFileSync(source)), sha112(baselineBytes));
};
guard(); fs.mkdirSync(out, { mode: 0o700 });
const budget = { priorCLI: 341, priorConservative: 269, reservedMaximum: 26, conservativeAfterReservation: 295,
  remainingFree: 105, freeCorpusCeiling: 400, paidCap: 'unchanged 50 requests / EUR15', modelStarts: 0, imageUploads: 0,
  productionWrites: 0, lovableAgentTurns: 0 };
fs.writeFileSync(out + '/RESERVATION.json', JSON.stringify({ ...budget, reservedUTC: new Date().toISOString(),
  queries: [...queries], expectedNamesGivenToQueries: false, scope: 'Four bounded public browsing sequences plus two store-variant HTTP diagnostics, no identity confirmation' }, null, 2), { mode: 0o600, flag: 'wx' });
const persist = () => {
  fs.writeFileSync(out + '/REQUESTS.json', JSON.stringify(state.requests, null, 2), { mode: 0o600 });
  fs.writeFileSync(out + '/CACHE_READS.json', JSON.stringify(state.cacheReceipts, null, 2), { mode: 0o600 });
};
const fetcher = boundedFetch112({ cache, live: true, maximum: 26, state, guard, persist,
  wire: (input, init) => {
    const url = new URL(String(input));
    const allowedBrowse = queries.has(url.searchParams.get('text') || '') && url.searchParams.get('store') === '1'
      && /^[1-6]$/.test(url.searchParams.get('page') || '') && [...url.searchParams].length === 3;
    const allowedDiagnostic = url.searchParams.get('text') === 'Braida' && url.searchParams.get('page') === '1'
      && (url.searchParams.get('store') === null || url.searchParams.get('store') === '0') && [...url.searchParams].length <= 3;
    assert(allowedBrowse || allowedDiagnostic); return fetch(input, init);
  }, saveBody: (file, bytes) => fs.writeFileSync(out + '/' + file, bytes, { mode: 0o600, flag: 'wx' }) });
const startedUTC = new Date().toISOString();
try {
  for (const query of queries) {
    if (state.held) break;
    const client = createGlobalCatalogue103(fetcher), first = await client.searchProposals(query);
    const pages = [{ page: 1, status: first.status, rows: first.rows.length }], ids = first.rows.map(row => row.id);
    let cursor = 'next' in first ? first.next : null;
    while (cursor && !state.held) {
      const number = cursor.nextPage, next = await client.browseProposals(query, cursor);
      pages.push({ page: number, status: next.status, rows: next.rows.length }); ids.push(...next.rows.map(row => row.id)); cursor = next.next;
    }
    results.push({ query, pages, ids, lastStatus: pages.at(-1)?.status, noDuplicateIDs: new Set(ids).size === ids.length });
  }
  for (const store of [null, '0']) {
    if (state.held) break;
    const params = new URLSearchParams({ page: '1', text: 'Braida' }); if (store !== null) params.set('store', store);
    const response = await fetcher(root + '?' + params, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' });
    failures.push({ query: 'Braida', store, status: response.status, bodySHA256: sha112(Buffer.from(await response.text())) });
  }
} finally {
  persist(); guard();
  const report = { startedUTC, finishedUTC: new Date().toISOString(), source, sourceSHA256: sha112(baselineBytes), sourceFingerprints: sources,
    budget, actualGET: state.starts, cliAfter: 341 + state.starts, cacheReads: state.cacheReads,
    held: state.held, failures: state.failures, results, diagnostics: failures,
    scope: 'Live public retrieval only. Not full200 automatic recognition, selected canonical identity, sensory certification or native UI QA.' };
  fs.writeFileSync(out + '/REPORT.json', JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ ...report, sourceFingerprints: undefined, results: results.map(value => ({ ...value, ids: value.ids.length })) }));
}
process.exitCode = state.held ? 1 : 0;
