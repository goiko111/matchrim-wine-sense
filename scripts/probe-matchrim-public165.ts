import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { boundedFetch112, newState112, sha112 } from './benchmark-matchrim-native112';

export function failedURLs165(report: { failures: { reason: string; url?: string }[] }, maximum: number) {
  assert(Number.isSafeInteger(maximum) && maximum >= 1 && maximum <= 6);
  return [...new Set(report.failures.filter(row => row.reason === 'CACHED_PUBLIC_HTTP_OR_CONTENT_TYPE_FAILURE').map(row => row.url))]
    .filter((url): url is string => typeof url === 'string').map(value => {
      const url = new URL(value);
      assert.equal(url.origin + url.pathname, 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines');
      assert.equal(url.searchParams.get('page'), '1'); assert.equal(url.searchParams.get('store'), '1');
      assert(url.searchParams.get('text') && [...url.searchParams].length === 3 && !url.hash && !url.username && !url.password);
      return url.href;
    }).slice(0, maximum);
}
export async function runPublic165(outputArg: string) {
  const repo = process.cwd(), output = path.resolve(outputArg), base = path.resolve('qa-artifacts/night105-20261021');
  assert(path.dirname(output) === base && /^public-refresh165-[\w-]+$/.test(path.basename(output)) && !fs.existsSync(output));
  const source = fs.readFileSync('qa-artifacts/night105-20261021/native112-corpus200-r10/REPORT.json');
  const urls = failedURLs165(JSON.parse(source.toString()), 6), state = newState112();
  const guard = () => {
    const lease = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases['writer-matchrim-native99'];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env.MATCHRIM102_WRITER_LEASE_ID
      && lease.reviewAfter * 1000 > Date.now(), 'WRITER_LEASE_REQUIRED');
    assert(state.starts <= 6, 'SIX_GET_BOUND');
  };
  guard(); fs.mkdirSync(output, { mode: 0o700 });
  const persist = () => fs.writeFileSync(output + '/REQUESTS.json', JSON.stringify(state.requests, null, 2), { mode: 0o600 });
  const receipt = { startedUTC: new Date().toISOString(), sourceReportSHA256: sha112(source), requestedURLs: urls,
    priorCLI: 331, priorConservativeCorpus: 253, maximum: 6, remainingFreeBefore: 147,
    modelStarts: 0, imageUploads: 0, productionWrites: 0, deployments: 0, results: [] as unknown[],
    scope: 'Fresh public GET diagnosis of six distinct previously cached HTTP failures; preserves old failures. Not canonical identity or full-catalogue proof.' };
  const read = boundedFetch112({ cache: new Map(), live: true, maximum: 6, state, wire: fetch, guard, persist,
    saveBody: (file, bytes) => fs.writeFileSync(output + '/' + file, bytes, { mode: 0o600, flag: 'wx' }) });
  for (const url of urls) {
    if (state.held) break;
    const response = await read(url, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } });
    let payload: unknown; try { payload = await response.json(); } catch { payload = null; }
    receipt.results.push({ url, status: response.status, payload });
  }
  persist(); const final = { ...receipt, finishedUTC: new Date().toISOString(), starts: state.starts, held: state.held,
    failures: state.failures, remainingFreeAfter: 147 - state.starts, cliAfter: 331 + state.starts, conservativeCorpusAfter: 253 + state.starts };
  fs.writeFileSync(output + '/REPORT.json', JSON.stringify(final, null, 2), { mode: 0o600, flag: 'wx' });
  console.log(JSON.stringify({ starts: final.starts, held: final.held, statuses: state.requests.map(row => row.status), remainingFreeAfter: final.remainingFreeAfter, modelStarts: 0 }));
  return final;
}
if (import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await runPublic165(process.argv[2]);
