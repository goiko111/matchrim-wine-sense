import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { assertLeases112, boundedFetch112, captureSources112, loadCache112, newState112, sha112, verifySources112 } from './benchmark-matchrim-native112';

const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const loadedRunnerSHA177 = sha112(fs.readFileSync(fileURLToPath(import.meta.url)));
export const safeURL177 = (value: string) => {
  const url = new URL(value);
  assert.equal(url.origin + url.pathname, root);
  assert(!url.username && !url.password && !url.hash && [...url.searchParams].length === 3);
  assert.deepEqual([...url.searchParams.keys()].sort(), ['page', 'store', 'text']);
  assert.equal(url.searchParams.get('store'), '1');
  assert(/^[1-4]$/.test(url.searchParams.get('page') || ''));
  const text = url.searchParams.get('text') || '';
  assert(text.trim().length >= 2 && text.length <= 120
    && Array.from(text).every(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127));
  return url.href;
};
type Snapshot177 = { rows: { pages: { query: string; status: string }[] }[]; failures: { url?: string }[] };
export function plan177(report: Snapshot177, entries: ReturnType<typeof loadCache112>) {
  const queries = new Map<string, string[]>();
  for (const scene of report.rows) for (const page of scene.pages)
    queries.set(page.query, [...(queries.get(page.query) || []), page.status]);
  const planned = new Map<string, { url: string; purpose: 'http-recheck' | 'schema-recheck'; oldStatus: number;
    oldSHA256: string; oldReceipt: string; malformedIDs: number[] }>();
  for (const failure of report.failures) {
    if (!failure.url) continue;
    const url = safeURL177(failure.url), cached = entries.get(url);
    assert(cached, 'ORIGINAL_FAILURE_RECEIPT_REQUIRED');
    if (cached.status < 500 || !queries.get(new URL(url).searchParams.get('text')!)?.includes('unavailable')) continue;
    planned.set(url, { url, purpose: 'http-recheck', oldStatus: cached.status, oldSHA256: cached.sha256,
      oldReceipt: cached.sourceReceipt, malformedIDs: [] });
  }
  for (const [url, cached] of entries) {
    const query = new URL(url).searchParams.get('text') || '';
    if (!queries.get(query)?.includes('incomplete') || cached.status !== 200) continue;
    const body = JSON.parse(cached.bytes.toString('utf8'));
    const ids = Array.isArray(body.results) ? body.results.filter((row: { id?: number; slugname?: unknown }) =>
      Number.isSafeInteger(row?.id) && typeof row.slugname === 'string' && row.slugname.trim() === '').map((row: { id: number }) => row.id) : [];
    if (!ids.length) continue;
    safeURL177(url);
    planned.set(url, { url, purpose: 'schema-recheck', oldStatus: cached.status, oldSHA256: cached.sha256,
      oldReceipt: cached.sourceReceipt, malformedIDs: ids });
  }
  assert(planned.size <= 24, 'REVALIDATION_LIMIT');
  return [...planned.values()];
}

export async function main177(argv = process.argv.slice(2)) {
  assert(argv.length === 2 && ['plan', 'live'].includes(argv[1]), 'OUTPUT plan|live');
  const live = argv[1] === 'live';
  if (live) assert.equal(process.env.MATCHRIM177_PUBLIC_READS, 'AUTHORIZED24', 'EXPLICIT_PUBLIC_READ_AUTHORIZATION_REQUIRED');
  const repo = process.cwd(), output = path.resolve(argv[0]), base = path.join(repo, 'qa-artifacts/continuation176-20261023');
  assert(path.dirname(output) === base && /^public177-(?:plan|live)-r[1-9]\d*$/.test(path.basename(output)) && !fs.existsSync(output));
  const source = 'qa-artifacts/night105-20261021/native112-corpus200-r19/REPORT.json';
  const sourceBytes = fs.readFileSync(source), report = JSON.parse(sourceBytes.toString());
  assert(report.summary.sourceIntegrityVerified && report.rows.length === 200);
  const receipts = JSON.parse(fs.readFileSync(path.dirname(source) + '/CACHE_READS.json', 'utf8')) as { sourceReceipt: string }[];
  const folders = [...new Set(receipts.map(row => path.dirname(row.sourceReceipt.split('#')[0])))];
  const sources = captureSources112(repo), runner = fileURLToPath(import.meta.url), runnerSHA256 = sha112(fs.readFileSync(runner));
  assert.equal(runnerSHA256, loadedRunnerSHA177, 'LOADED_RUNNER_DRIFT');
  const guard = () => {
    assertLeases112(JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases, process.env);
    const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
    assert.equal(sha112(fs.readFileSync(source)), sha112(sourceBytes));
    assert.equal(sha112(fs.readFileSync(runner)), runnerSHA256); verifySources112(repo, sources);
  };
  guard(); const planned = plan177(report, loadCache112(repo, folders));
  fs.mkdirSync(output, { recursive: true, mode: 0o700 });
  const write = (name: string, value: unknown) => fs.writeFileSync(output + '/' + name, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  write('PLAN.json', { source, sourceSHA256: sha112(sourceBytes), sourceFingerprints: sources, runnerSHA256, planned,
    mode: live ? 'live' : 'plan', authorization: live ? 'Explicit fresh24 public GET authorization required and asserted' : 'NOT_AUTHORIZED_NOT_STARTED',
    maximumFreshGET: live ? 24 : 0, priorConservativeReservation: 400, reclaimedOldReservations: 0,
    paidCap: 'unchanged50 requests/EUR15', models: 0, uploads: 0, lovableTurns: 0, productionWrites: 0,
    expectedNamesUsed: false, scope: 'Bounded current-day status/schema readback only, not identity or full paginated recognition approval' });
  if (!live) { console.log(JSON.stringify({ mode: 'plan', requests: planned.length, publicGET: 0, output })); return 0; }
  write('RESERVATION.json', { reservedUTC: new Date().toISOString(), maximumFreshGET: 24, older400ReservationNotReclaimed: true,
    paidLimitNotExpanded: true, maximumModels: 0, maximumUploads: 0, maximumLovableTurns: 0 });
  const state = newState112(), results: unknown[] = [], allowed = new Set(planned.map(row => row.url));
  const persist = () => write('REQUESTS.json', state.requests);
  const fetcher = boundedFetch112({ cache: new Map(), live: true, maximum: 24, state, guard, persist,
    wire: (input, init) => { assert(allowed.has(safeURL177(String(input))), 'UNPLANNED_PUBLIC_READ'); return fetch(input, init); },
    saveBody: (name, bytes) => fs.writeFileSync(output + '/' + name, bytes, { mode: 0o600, flag: 'wx' }) });
  try {
    for (const item of planned) {
      if (state.held) break;
      try {
        const response = await fetcher(item.url, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
          headers: { Accept: 'application/json' } });
        const text = await response.text();
        let envelope: { count?: unknown; page?: unknown; results?: unknown } | null = null;
        try { envelope = JSON.parse(text); } catch { /* Retain non-JSON service failures without inventing an empty catalogue. */ }
        results.push({ ...item, newStatus: response.status, newSHA256: sha112(text),
          sameBody: sha112(text) === item.oldSHA256, envelopeCount: envelope?.count ?? null,
          envelopePage: envelope?.page ?? null, observedRows: Array.isArray(envelope?.results) ? envelope.results.length : null,
          scope: 'HTTP/envelope observation only; not a completed search or an identity' });
      } catch (error) { results.push({ ...item, error: String(error) }); }
    }
  } finally {
    persist(); guard();
    write('REPORT.json', { observedUTC: new Date().toISOString(), actualFreshGET: state.starts, maximumFreshGET: 24,
      held: state.held, failures: state.failures, results, models: 0, uploads: 0, lovableTurns: 0,
      scope: 'Fresh public status/schema observations; old failed evidence retained, no source mutations or recognition approval' });
  }
  console.log(JSON.stringify({ output, actualFreshGET: state.starts, held: state.held }));
  return state.held ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main177().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
