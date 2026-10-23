import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { safeURL177 } from './revalidate-matchrim-public177';
import { assertLeases112, boundedFetch112, captureSources112, loadCache112, newState112, sha112, verifySources112 } from './benchmark-matchrim-native112';

const loadedSHA178 = sha112(fs.readFileSync(fileURLToPath(import.meta.url)));
type Parent178 = { actualFreshGET: number; maximumFreshGET: number; held: boolean; results: {
  url: string; purpose: string; oldStatus: number; newStatus?: number; newSHA256?: string;
}[] };
export function plan178(parent: Parent178, entries: ReturnType<typeof loadCache112>) {
  assert(parent.maximumFreshGET === 24 && Number.isSafeInteger(parent.actualFreshGET)
    && parent.actualFreshGET >= 22 && parent.actualFreshGET <= 24 && !parent.held, 'PARENT_LIMIT_OR_HOLD');
  let remaining = 24 - parent.actualFreshGET;
  const candidates: { url: string; count: number; pages: number; parentSHA256: string }[] = [];
  for (const item of parent.results) {
    const url = new URL(safeURL177(item.url));
    if (item.purpose !== 'http-recheck' || item.oldStatus !== 500 || item.newStatus !== 200 || url.searchParams.get('page') !== '1') continue;
    const receipt = entries.get(url.href); assert(receipt && receipt.sha256 === item.newSHA256 && receipt.status === 200, 'PARENT_BODY_REQUIRED');
    const body = JSON.parse(receipt.bytes.toString('utf8'));
    if (body.page !== 1 || !Number.isSafeInteger(body.count) || body.count <= 20 || body.count > 60
      || !Array.isArray(body.results) || body.results.length !== 20) continue;
    candidates.push({ url: url.href, count: body.count, pages: Math.ceil(body.count / 20) - 1, parentSHA256: receipt.sha256 });
  }
  const seen = new Set<string>(), planned: { url: string; parentURL: string; parentSHA256: string; count: number; page: number; expectedRows: number }[] = [];
  // Allocate only whole small searches, using observed counts, never expected identities.
  for (const item of candidates.sort((a, b) => a.pages - b.pages || a.url.localeCompare(b.url))) {
    if (seen.has(item.url) || item.pages > remaining) continue;
    seen.add(item.url); remaining -= item.pages;
    for (let page = 2; page <= item.pages + 1; page++) {
      const url = new URL(item.url); url.searchParams.set('page', String(page));
      planned.push({ url: safeURL177(url.href), parentURL: item.url, parentSHA256: item.parentSHA256,
        count: item.count, page, expectedRows: Math.min(20, item.count - (page - 1) * 20) });
    }
  }
  assert(parent.actualFreshGET + planned.length <= 24);
  return planned;
}

export async function main178() {
  assert.equal(process.env.MATCHRIM177_PUBLIC_READS, 'AUTHORIZED24', 'EXPLICIT_PUBLIC_READ_AUTHORIZATION_REQUIRED');
  const repo = process.cwd(), parentDir = 'qa-artifacts/continuation176-20261023/public177-live-r1';
  const output = 'qa-artifacts/continuation176-20261023/public178-live-r1'; assert(!fs.existsSync(output));
  const files = ['REPORT.json', 'REQUESTS.json'].map(name => parentDir + '/' + name);
  const hashes = files.map(file => sha112(fs.readFileSync(file)));
  const parent = JSON.parse(fs.readFileSync(files[0], 'utf8')) as Parent178;
  const requests = JSON.parse(fs.readFileSync(files[1], 'utf8'));
  assert.equal(parent.actualFreshGET, requests.length);
  assert(requests.every((row: { state: string }) => row.state === 'completed'));
  const cache = loadCache112(repo, [path.resolve(parentDir)]), planned = plan178(parent, cache);
  const sources = captureSources112(repo), runner = fileURLToPath(import.meta.url);
  const guard = () => {
    assertLeases112(JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases, process.env);
    const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
    assert.equal(sha112(fs.readFileSync(runner)), loadedSHA178); verifySources112(repo, sources);
    files.forEach((file, index) => assert.equal(sha112(fs.readFileSync(file)), hashes[index]));
  };
  guard(); fs.mkdirSync(output, { mode: 0o700 });
  const write = (name: string, value: unknown) => fs.writeFileSync(output + '/' + name, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  write('PLAN.json', { parentDir, parentReportSHA256: hashes[0], parentRequestsSHA256: hashes[1], planned,
    sharedMaximumFreshGET: 24, parentActual: parent.actualFreshGET, maximumAdditionalGET: planned.length,
    runnerSHA256: loadedSHA178, sourceFingerprints: sources, expectedNamesUsed: false, newReservation: false });
  const state = newState112(), allowed = new Set(planned.map(row => row.url)), results = [];
  const persist = () => write('REQUESTS.json', state.requests);
  const fetcher = boundedFetch112({ cache: new Map(), live: true, maximum: planned.length, state, guard, persist,
    wire: (input, init) => { assert(allowed.has(safeURL177(String(input))), 'UNPLANNED_PAGE'); return fetch(input, init); },
    saveBody: (name, bytes) => fs.writeFileSync(output + '/' + name, bytes, { mode: 0o600, flag: 'wx' }) });
  try {
    for (const item of planned) {
      if (state.held) break;
      const response = await fetcher(item.url, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', headers: { Accept: 'application/json' } });
      const body = await response.json();
      const envelopeMatches = response.status === 200 && body.count === item.count && body.page === item.page
        && Array.isArray(body.results) && body.results.length === item.expectedRows;
      results.push({ ...item, status: response.status, envelopeMatches });
      if (!envelopeMatches) break;
    }
  } finally {
    persist(); guard(); write('REPORT.json', { observedUTC: new Date().toISOString(), results, actualAdditionalGET: state.starts,
      actualTrancheGET: parent.actualFreshGET + state.starts, maximumTrancheGET: 24, held: state.held,
      failures: state.failures, models: 0, uploads: 0, lovableTurns: 0, productionWrites: 0,
      scope: 'Only observed page envelopes completed; production replay still required, no identity approval' });
  }
  console.log(JSON.stringify({ output, additionalGET: state.starts, trancheGET: parent.actualFreshGET + state.starts }));
  return state.held ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main178().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
