import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { boundedFetch112, newState112 } from './benchmark-matchrim-native112';

// Recheck only the already observed public store route; never admin/session routes.
const output = path.resolve(process.argv[2]);
assert(path.dirname(output) === path.resolve('qa-artifacts/night105-20261021'));
assert(/^public-master-access170-[\w-]+$/.test(path.basename(output)) && !fs.existsSync(output));
const url = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines?page=1&store=1';
const state = newState112();
const guard = () => {
  const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['writer-matchrim-native99'];
  assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
    && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID && lease.reviewAfter * 1000 > Date.now());
  assert(state.starts <= 1);
};
guard(); fs.mkdirSync(output, { mode: 0o700 });
const persist = () => fs.writeFileSync(output + '/REQUESTS.json', JSON.stringify(state.requests, null, 2), { mode: 0o600 });
const result = { startedUTC: new Date().toISOString(), url, maximum: 1, priorCLI: 340,
  priorConservativeCorpus: 268, conservativeReservation: 1, modelStarts: 0, imageUploads: 0, productionWrites: 0,
  scope: 'Published public catalogue inventory only, not all administrative Mantalak records or per-vintage sensory certification',
  status: null as number | null, publishedReferenceCount: null as number | null, firstPageRows: null as number | null,
  error: null as string | null };
const read = boundedFetch112({ cache: new Map(), live: true, maximum: 1, state, guard, persist,
  wire: (input, init) => { assert.equal(String(input), url); return fetch(input, init); },
  saveBody: (file, bytes) => fs.writeFileSync(output + '/' + file, bytes, { mode: 0o600, flag: 'wx' }) });
try {
  const response = await read(url, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } });
  result.status = response.status;
  assert(response.ok, 'PUBLIC_STORE_NOT_AVAILABLE');
  const data = await response.json();
  assert(Number.isSafeInteger(data.count) && data.count >= 0 && data.page === 1
    && Array.isArray(data.results) && data.results.length <= 20 && data.count >= data.results.length);
  result.publishedReferenceCount = data.count; result.firstPageRows = data.results.length;
} catch (error) { result.error = String(error); }
finally {
  persist();
  const final = { ...result, finishedUTC: new Date().toISOString(), starts: state.starts, held: state.held,
    failures: state.failures, cliAfter: 340 + state.starts, conservativeCorpusAfter: 269, remainingFreeAfterReservation: 131 };
  fs.writeFileSync(output + '/REPORT.json', JSON.stringify(final, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify(final));
}
process.exitCode = result.error || state.held ? 1 : 0;
