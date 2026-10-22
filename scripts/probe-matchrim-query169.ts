import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { boundedFetch112, captureSources112, loadCache112, newState112, sha112, verifySources112 } from './benchmark-matchrim-native112';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';

const repo = process.cwd(), output = path.resolve(process.argv[2]);
assert(path.dirname(output) === path.resolve('qa-artifacts/night105-20261021'));
assert(/^public-query169-[\w-]+$/.test(path.basename(output)) && !fs.existsSync(output));
const planFile = 'qa-artifacts/continuation169-20261022/preflight-r1.json';
const planBytes = fs.readFileSync(planFile), plan = JSON.parse(planBytes.toString('utf8'));
assert.equal(sha112(fs.readFileSync(plan.source)), plan.sourceSHA256);
assert(plan.expectedNamesGivenToQueries === false && plan.networkCalls === 0);
assert(Array.isArray(plan.newFirstPageQueries) && plan.newFirstPageQueries.length <= 2);
const queries = new Set<string>(plan.newFirstPageQueries);
assert.equal(queries.size, plan.newFirstPageQueries.length);
const sources = captureSources112(repo), state = newState112();
const receipts = JSON.parse(fs.readFileSync('qa-artifacts/night105-20261021/native112-corpus200-r11/CACHE_READS.json', 'utf8'));
const folders = [...new Set<string>(receipts.map((r: { sourceReceipt: string }) => path.dirname(r.sourceReceipt.split('#')[0])))];
const cache = loadCache112(repo, folders);
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['writer-matchrim-native99'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  assert(state.starts <= 8 && sha112(fs.readFileSync(planFile)) === sha112(planBytes));
  verifySources112(repo, sources);
};
guard(); fs.mkdirSync(output, { mode: 0o700 });
const persist = () => fs.writeFileSync(output + '/REQUESTS.json', JSON.stringify(state.requests, null, 2), { mode: 0o600 });
const result = { startedUTC: new Date().toISOString(), planSHA256: sha112(planBytes), sourceFingerprints: sources,
  requestedQueries: [...queries], maximum: 8, priorCLI: 338, priorConservativeCorpus: 260,
  conservativeReservation: 8, freeCorpusCeiling: 400, modelStarts: 0, imageUploads: 0, productionWrites: 0,
  scope: 'Two newly allocated literal OCR queries only; bounded public GETs, no 500 retries or identification approval',
  results: [] as { query: string; status: string; rows: number }[], error: null as string | null };
const fetcher = boundedFetch112({ cache, live: true, maximum: 8, state, guard, persist,
  wire: (input, init) => {
    const url = new URL(String(input));
    assert(queries.has(url.searchParams.get('text') ?? '') && url.searchParams.get('store') === '1'
      && /^[1-4]$/.test(url.searchParams.get('page') ?? '') && [...url.searchParams].length === 3);
    return fetch(input, init);
  }, saveBody: (file, bytes) => fs.writeFileSync(output + '/' + file, bytes, { flag: 'wx', mode: 0o600 }) });
try {
  const client = createGlobalCatalogue103(fetcher);
  for (const query of queries) {
    if (state.held) break;
    const value = await client.searchProposals(query);
    result.results.push({ query, status: value.status, rows: value.rows.length });
  }
  guard();
} catch (error) { result.error = String(error); }
finally {
  persist();
  const final = { ...result, finishedUTC: new Date().toISOString(), starts: state.starts, held: state.held,
    failures: state.failures, cliAfter: 338 + state.starts, conservativeCorpusAfter: 268, remainingFreeAfterReservation: 132 };
  fs.writeFileSync(output + '/REPORT.json', JSON.stringify(final, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ ...final, sourceFingerprints: undefined }));
}
process.exitCode = result.error || state.held ? 1 : 0;
