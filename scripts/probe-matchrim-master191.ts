import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { masterSearchParams188, parseMasterPage188, parseMasterDetail188,
  masterVintageEvidence188, parseMasterMapping188 } from '../src/utils/nativeMasterContract188';

const base = 'https://app.winerim.com/api/v1/matchrim';
const search = (name: string, winery: string, vintage: string, vintageMatch: 'only' | 'prefer') => {
  const params = masterSearchParams188({ name, winery, vintage, vintageMatch, limit: 10 });
  assert(params); return `${base}/wines/search?${params}`;
};
export const masterPlan191 = Object.freeze([
  { name: 'zorrera-exact-2015', url: search('zorrera', 'chivite', '2015', 'only'), kind: 'search', id: 180278 },
  { name: 'zorrera-detail', url: `${base}/wines/180278`, kind: 'detail', id: 180278 },
  { name: 'vidure-exact-2020', url: search('vidure', 'pago de cirsus', '2020', 'only'), kind: 'empty', id: 201987 },
  { name: 'vidure-known-reference', url: search('vidure', 'pago de cirsus', '2020', 'prefer'), kind: 'search', id: 201987 },
  { name: 'vidure-detail', url: `${base}/wines/201987`, kind: 'detail', id: 201987 },
  { name: 'public-id-mapping', url: `${base}/wines/ids?publicIds=362891%2C363580`, kind: 'mapping', id: null },
] as const).map(operation => Object.freeze(operation));
Object.freeze(masterPlan191);

const outcome = (operation: typeof masterPlan191[number], value: unknown) => {
  if (operation.kind === 'mapping') {
    const parsed = parseMasterMapping188(value, [362891, 363580]);
    assert(parsed && parsed.notFound.length === 0);
    assert.deepEqual(parsed.results.map(row => [row.publicId, row.mantalakWineId]), [[362891, 215213], [363580, 215439]]);
    return { status: 'PASS', mappings: parsed.results, affinityGranted: false };
  }
  if (operation.kind === 'detail') {
    const parsed = parseMasterDetail188(value, operation.id); assert(parsed);
    const evidence = masterVintageEvidence188(parsed, operation.id === 180278 ? '2015' : '2020');
    assert.equal(evidence.status, operation.id === 180278 ? 'known' : 'other-vintages-only');
    assert.equal(evidence.scope, operation.id === 180278 ? 'exact' : 'generic');
    assert.equal(evidence.affinityAttributes, null); assert.equal(evidence.learningEligible, false);
    return { status: 'PASS', canonicalId: parsed.mantalakWineId, name: parsed.name, winery: parsed.winery,
      vintages: parsed.vintages, requestedVintageStatus: evidence.status, sensoryScope: evidence.scope,
      affinityGranted: false, learningGranted: false };
  }
  const parsed = parseMasterPage188(value, 1, 10); assert(parsed);
  assert.equal(parsed.total, operation.kind === 'empty' ? 0 : 1);
  if (operation.kind === 'search') {
    assert.equal(parsed.results[0].mantalakWineId, operation.id);
    assert.equal(parsed.results[0].name, operation.id === 180278 ? 'La Zorrera' : 'Vidure');
    assert.equal(parsed.results[0].winery, operation.id === 180278 ? 'Chivite' : 'Pago de Cirsus');
    if (operation.id === 180278) assert(parsed.results[0].vintages.includes('2015'));
    else assert(!parsed.results[0].vintages.includes('2020'));
  }
  return { status: 'PASS', total: parsed.total, canonicalIds: parsed.results.map(row => row.mantalakWineId), affinityGranted: false };
};

export type ProbeReceipt191 = { index: number; name: string; url: string; elapsedMs: number;
  httpStatus: number | null; bytes: number; sha256?: string; error?: string; validation?: ReturnType<typeof outcome> };
type ProbeOptions191 = { key: string; fetcher: typeof fetch;
  claim: (operation: typeof masterPlan191[number], index: number) => void;
  receipt: (receipt: ProbeReceipt191, payload?: unknown) => void; timeoutMs?: number; alreadyConsumed?: 0 | 1 };

export const usableMasterKey191 = (key: string) => {
  if (!key.trim() || key.length > 2048 || Array.from(key).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) return false;
  try { return new Headers({ 'X-Matchrim-Key': key }).get('X-Matchrim-Key') === key; }
  catch { return false; }
};

export const runMasterProbe191 = async (options: ProbeOptions191) => {
  assert(usableMasterKey191(options.key), 'KEY_UNAVAILABLE');
  const consumed = options.alreadyConsumed ?? 0;
  assert(consumed === 0 || consumed === 1, 'UNSUPPORTED_PARTIAL_RUN');
  const receipts: ProbeReceipt191[] = [];
  for (const [offset, operation] of masterPlan191.slice(consumed).entries()) {
    const index = consumed + offset + 1;
    options.claim(operation, index); // Reserve before transport; interrupted calls remain consumed.
    const started = performance.now(), controller = new AbortController();
    let stop: () => void = () => undefined;
    const timeout = new Promise<never>((_resolve, reject) => { stop = () => reject(new Error('TIMEOUT')); });
    const timer = setTimeout(() => { controller.abort(); stop(); }, options.timeoutMs ?? 12000);
    const bounded = <T,>(pending: Promise<T>) => Promise.race([pending, timeout]);
    const receipt: ProbeReceipt191 = { index, name: operation.name, url: operation.url, elapsedMs: 0, httpStatus: null, bytes: 0 };
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined, payload: unknown;
    let halt = false;
    try {
      const pending = options.fetcher(operation.url, { method: 'GET', credentials: 'omit',
        redirect: 'error', referrerPolicy: 'no-referrer', signal: controller.signal,
        headers: { Accept: 'application/json', 'X-Matchrim-Key': options.key } });
      void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
      const response = await bounded(pending);
      receipt.httpStatus = response.status;
      if (!response.ok || response.redirected || (response.url && response.url !== operation.url)
        || !response.body || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
        void response.body?.cancel().catch(() => undefined); halt = true; throw new Error('HTTP_OR_TRANSPORT_REJECTED');
      }
      reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const part = await bounded(reader.read()); if (part.done) break;
        receipt.bytes += part.value.byteLength;
        if (receipt.bytes > 262144) { halt = true; throw new Error('BODY_BOUND'); }
        chunks.push(part.value);
      }
      const bytes = Buffer.concat(chunks), body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (body.includes(options.key)) { halt = true; throw new Error('SECRET_ECHO_REJECTED'); }
      payload = JSON.parse(body);
      if (JSON.stringify(payload).includes(JSON.stringify(options.key).slice(1, -1))) {
        halt = true; throw new Error('ESCAPED_SECRET_ECHO_REJECTED');
      }
      receipt.sha256 = createHash('sha256').update(bytes).digest('hex');
      try { receipt.validation = outcome(operation, payload); }
      catch { receipt.error = 'CONTRACT_OR_BASELINE_MISMATCH'; }
    } catch {
      // Never log an exception object, response headers or raw error text: they
      // can contain the key. Only successful, non-echoed JSON becomes a receipt.
      receipt.error = 'TRANSPORT_OR_BODY_REJECTED'; halt = true; payload = undefined;
    } finally {
      clearTimeout(timer); controller.abort(); void reader?.cancel().catch(() => undefined);
      receipt.elapsedMs = Math.round(performance.now() - started);
    }
    options.receipt(receipt, payload); receipts.push(receipt);
    if (halt) break; // No automatic retries, even for 429 or expired credentials.
  }
  return { passed: receipts.length === 6 - consumed && receipts.every(row => row.validation?.status === 'PASS' && !row.error),
    requests: receipts.length, previousRequests: consumed, cumulativeRequests: consumed + receipts.length,
    receipts, modelCalls: 0, imageUploads: 0, productionWrites: 0,
    appActivated: false, independent200LabelRecognition: false, historicalPublicReadBudgetReset: false };
};

export const verifyRemainingFive193 = (authorization: unknown, reserved: unknown, previous: unknown) => {
  const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object'
    ? value as Record<string, unknown> : {};
  const auth = record(authorization), reservation = record(reserved), report = record(previous);
  const receipt = Array.isArray(report.receipts) && report.receipts.length === 1 ? record(report.receipts[0]) : {};
  return auth.maxRequests === 6 && auth.keyService === 'wine.matchrim.goiko-api'
    && reservation.index === 1 && reservation.name === masterPlan191[0].name && reservation.url === masterPlan191[0].url
    && report.passed === false && report.requests === 1 && receipt.index === 1 && receipt.httpStatus === 401
    && receipt.url === masterPlan191[0].url && report.modelCalls === 0 && report.productionWrites === 0 && report.imageUploads === 0;
};

const main = async () => {
  const mode = process.argv.slice(2).join(' ');
  if (!['--live-6', '--resume-unstarted-6', '--remaining-five'].includes(mode)) {
    console.log(JSON.stringify({ mode: 'PLAN_ONLY', keychainRead: false, requests: 0, operations: masterPlan191 }, null, 2)); return;
  }
  const parent = path.resolve('qa-artifacts/continuation191-20261024/live-six-r1');
  const remaining = mode === '--remaining-five';
  const root = remaining ? path.join(parent, 'remaining-five-r1') : parent;
  const resume = mode === '--resume-unstarted-6';
  if (remaining) {
    const files = ['AUTHORIZATION.json', 'RECOVERY-REVIEW.json', '1-RESERVED.json', '1-RECEIPT.json', 'RESULT.json'];
    assert(!fs.existsSync(root) && fs.existsSync(parent)
      && JSON.stringify(fs.readdirSync(parent).sort()) === JSON.stringify(files.sort()),
    'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET');
    const read = (name: string) => JSON.parse(fs.readFileSync(path.join(parent, name), 'utf8'));
    assert(verifyRemainingFive193(read('AUTHORIZATION.json'), read('1-RESERVED.json'), read('RESULT.json')),
      'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET');
    assert.deepEqual(read('1-RECEIPT.json'), read('RESULT.json').receipts[0], 'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET');
  } else if (resume) {
    assert(fs.existsSync(root) && fs.readdirSync(root).length === 1 && fs.readdirSync(root)[0] === 'AUTHORIZATION.json',
      'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET');
    const authorization = JSON.parse(fs.readFileSync(path.join(root, 'AUTHORIZATION.json'), 'utf8'));
    assert(authorization.maxRequests === 6 && authorization.keyService === 'wine.matchrim.goiko-api',
      'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET');
  } else assert(!fs.existsSync(root), 'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET');
  let key = '';
  try {
    key = execFileSync('/usr/bin/security', ['find-generic-password', '-a', 'goiko', '-s', 'wine.matchrim.goiko-api', '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 4096 }).trim();
  } catch { throw new Error('KEYCHAIN_ENTRY_NOT_AVAILABLE_NO_REQUEST_SENT'); }
  assert(usableMasterKey191(key), 'KEY_FORMAT_UNUSABLE_NO_REQUEST_SENT');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const save = (name: string, value: unknown) => fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  if (remaining) save('REMAINING-AUTHORIZATION.json', { authorized: 'Guardada. Comprueba el acceso y continúa con las cinco lecturas pendientes.',
    reviewedUTC: new Date().toISOString(), parentResultSHA256: createHash('sha256').update(fs.readFileSync(path.join(parent, 'RESULT.json'))).digest('hex'),
    previousRequests: 1, remainingRequests: 5, cumulativeMaximum: 6, previous401Preserved: true, operations: [2, 3, 4, 5, 6] });
  else if (resume) save('RECOVERY-REVIEW.json', { reviewedUTC: new Date().toISOString(),
    priorFiles: ['AUTHORIZATION.json'], priorRequestsReserved: 0, maxRequestsUnchanged: 6 });
  else save('AUTHORIZATION.json', { authorized: 'Human answer: Sí, hasta 6 lecturas gratuitas', maxRequests: 6,
    keyService: 'wine.matchrim.goiko-api', startedUTC: new Date().toISOString(), models: 0, images: 0, paidCalls: 0 });
  const report = await runMasterProbe191({ key, fetcher: fetch, alreadyConsumed: remaining ? 1 : 0,
    claim: (operation, index) => save(`${index}-RESERVED.json`, { index, name: operation.name, url: operation.url, atUTC: new Date().toISOString() }),
    receipt: (receipt, payload) => { save(`${receipt.index}-RECEIPT.json`, receipt); if (payload !== undefined) save(`${receipt.index}-BODY.json`, payload); },
  });
  key = ''; save('RESULT.json', { ...report, finishedUTC: new Date().toISOString() });
  console.log(JSON.stringify({ passed: report.passed, requests: report.requests, cumulativeRequests: report.cumulativeRequests,
    output: root, modelCalls: 0, imageUploads: 0, appActivated: false }));
  if (!report.passed) process.exitCode = 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(error => {
    const safeCodes = ['KEYCHAIN_ENTRY_NOT_AVAILABLE_NO_REQUEST_SENT', 'KEY_FORMAT_UNUSABLE_NO_REQUEST_SENT',
      'EXISTING_RESERVATION_REQUIRES_REVIEW_NO_RESET'];
    console.error(safeCodes.includes(error?.message) ? error.message : 'MASTER191_STOPPED_NO_SECRET_LOGGED');
    process.exitCode = 1;
  });
}
