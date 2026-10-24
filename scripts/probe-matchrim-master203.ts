import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseMasterDetail188, parseMasterPage188, masterVintageEvidence188 } from '../src/utils/nativeMasterContract188';
import { catalogueUrl194 } from './probe-matchrim-master194';
import { usableMasterKey191 } from './probe-matchrim-master191';

const base = 'https://app.winerim.com/api/v1/matchrim/wines';
export const plan203 = [
  ...([['003', 217494], ['013', 217482], ['017', 217480], ['041', 217456], ['118', 217379],
    ['121', 217376], ['198', 217299], ['193', 217304], ['200', 217297]] as const)
    .map(([image, id]) => ({ label: `img-${image}-export-hint-detail`, imageId: `img-${image}`,
      id, url: `${base}/${id}`, kind: 'detail' as const })),
  { label: 'img-193-visible-control', imageId: 'img-193', kind: 'search' as const,
    url: catalogueUrl194({ q: 'Bossanova Montepulciano', page: 1, limit: 50 }) },
  { label: 'img-200-visible-control', imageId: 'img-200', kind: 'search' as const,
    url: catalogueUrl194({ name: 'Seleccion', winery: 'Altotinto', page: 1, limit: 50 }) },
  { label: 'img-017-visible-control', imageId: 'img-017', kind: 'search' as const,
    url: catalogueUrl194({ name: 'Migratoria', winery: 'Frontonio', page: 1, limit: 50 }) },
];
type Entry203 = typeof plan203[number];
export type Receipt203 = { index: number; label: string; url: string; httpStatus: number | null;
  elapsedMs: number; bytes: number; sha256?: string; error?: string };
type Options203 = { key: string; fetcher: typeof fetch; timeoutMs?: number;
  claim: (index: number, entry: Entry203) => void; record: (receipt: Receipt203, payload?: unknown) => void };

// A separate, single-use allowance. The old six/forty-read readers remain frozen.
export const createReader203 = (options: Options203) => {
  assert(usableMasterKey191(options.key), 'KEY_UNAVAILABLE');
  let count = 0, halted = false;
  const receipts: Receipt203[] = [];
  const readNext = async () => {
    assert(!halted && count < plan203.length, 'TRANCHE_STOPPED_OR_EXHAUSTED');
    const entry = plan203[count], index = ++count;
    halted = true; // A failed reservation must not permit another request.
    options.claim(index, entry);
    const receipt: Receipt203 = { index, label: entry.label, url: entry.url, httpStatus: null, elapsedMs: 0, bytes: 0 };
    const controller = new AbortController(), started = performance.now();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined, response: Response | undefined, payload: unknown;
    let failDeadline: () => void = () => undefined;
    const deadline = new Promise<never>((_resolve, reject) => { failDeadline = () => reject(new Error('DEADLINE')); });
    const timer = setTimeout(() => { controller.abort(); failDeadline(); }, options.timeoutMs ?? 12000);
    const bounded = <T,>(work: Promise<T>) => Promise.race([work, deadline]);
    try {
      const pending = options.fetcher(entry.url, { method: 'GET', credentials: 'omit', redirect: 'error',
        referrerPolicy: 'no-referrer', headers: { Accept: 'application/json', 'X-Matchrim-Key': options.key }, signal: controller.signal });
      void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
      response = await bounded(pending); receipt.httpStatus = response.status;
      assert((response.status === 200 || (entry.kind === 'detail' && response.status === 404))
        && !response.redirected && (!response.url || response.url === entry.url) && response.body
        && /^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? ''), 'HTTP_REJECTED');
      reader = response.body.getReader(); const chunks: Uint8Array[] = [];
      while (true) {
        const next = await bounded(reader.read()); if (next.done) break;
        receipt.bytes += next.value.byteLength; assert(receipt.bytes <= 262144, 'BODY_BOUND'); chunks.push(next.value);
      }
      const bytes = Buffer.concat(chunks), body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      assert(!body.includes(options.key), 'SECRET_ECHO'); payload = JSON.parse(body);
      assert(!JSON.stringify(payload).includes(JSON.stringify(options.key).slice(1, -1)), 'ESCAPED_SECRET_ECHO');
      if (response.status === 404) assert.deepEqual(payload, { error: 'not_found' });
      else assert(entry.kind === 'detail' ? parseMasterDetail188(payload, entry.id!) : parseMasterPage188(payload, 1, 50), 'SCHEMA_REJECTED');
      receipt.sha256 = createHash('sha256').update(bytes).digest('hex'); halted = false;
    } catch { payload = undefined; halted = true; receipt.error = 'HTTP_TRANSPORT_OR_SCHEMA_REJECTED'; }
    finally {
      clearTimeout(timer); controller.abort();
      if (reader) void reader.cancel().catch(() => undefined);
      else void response?.body?.cancel().catch(() => undefined);
      receipt.elapsedMs = Math.round(performance.now() - started);
    }
    try { options.record(receipt, payload); } catch { halted = true; throw new Error('RECORD_FAILED_NO_RETRY'); }
    receipts.push(receipt);
    if (halted) throw new Error('TRANCHE_HALTED_NO_RETRY');
    return { entry, payload, receipt };
  };
  return { readNext, receipts, count: () => count };
};

export const summarize203 = (entry: Entry203, payload: unknown, status: number) => {
  const guard = { imageId: entry.imageId, imageIdentityConfirmed: false, affinityAttributes: null, learningEligible: false };
  if (status === 404) {
    assert(entry.kind === 'detail');
    return { ...guard, hintId: entry.id, status: 'absent-or-unverified-not-photo-absence' };
  }
  if (entry.kind === 'search') {
    const page = parseMasterPage188(payload, 1, 50); assert(page);
    return { ...guard, status: 'literal-search-proposals-only', total: page.total, complete: page.total === page.count,
      proposals: page.results.map(row => ({ id: row.mantalakWineId, name: row.name, winery: row.winery, vintages: row.vintages })) };
  }
  const detail = parseMasterDetail188(payload, entry.id!); assert(detail);
  const requested = entry.imageId === 'img-118' ? '1995' : entry.imageId === 'img-200' ? '2021' : null;
  const evidence = masterVintageEvidence188(detail, requested);
  return { ...guard, hintId: entry.id, status: 'canonical-detail-returned-not-photo-confirmation', name: detail.name,
    winery: detail.winery, grapes: detail.grapes, vintages: detail.vintages,
    sensory: { requestedVintage: requested, scope: evidence.scope, vintageStatus: evidence.status,
      rows: detail.tastingAttributes.attributesByVintage.length,
      recordedOriginRows: detail.tastingAttributes.attributesByVintage.filter(row => row.source !== null).length,
      perAxisDefaultProvenanceAvailable: false } };
};

const main = async () => {
  if (process.argv.slice(2).join(' ') !== '--live-twelve-authorized') {
    console.log(JSON.stringify({ mode: 'PLAN_ONLY', requests: 0, keychainReads: 0, maximum: 12, plan: plan203 })); return;
  }
  const root = 'qa-fixtures/master203/responses';
  assert(!fs.existsSync(root), 'SINGLE_USE_TRANCHE_EXISTS_NO_RESET');
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const save = (name: string, value: unknown) => fs.writeFileSync(path.join(root, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  save('AUTHORIZATION.json', { answer: 'Sí, hasta 12 lecturas gratuitas',
    questionId: 'call_fb98e207954b46d081970df0def43e34', maximum: 12, details: 9, controls: 3,
    startedUTC: new Date().toISOString(), previousAllowancesUnchanged: true, paidBudgetEUR: 15,
    modelCalls: 0, imageUploads: 0, writes: 0, lovableCredits: 0,
    plan203, planSHA256: createHash('sha256').update(JSON.stringify(plan203)).digest('hex'),
    sourceCrosswalkSHA256: createHash('sha256').update(fs.readFileSync('qa-artifacts/continuation199-20261024/ASSET_PROVENANCE-r2.json')).digest('hex') });
  let key = '', reader: ReturnType<typeof createReader203> | undefined;
  const results: ReturnType<typeof summarize203>[] = [];
  let state = 'HALTED_NO_RETRY';
  try {
    try { key = execFileSync('/usr/bin/security', ['find-generic-password', '-a', 'goiko', '-s', 'wine.matchrim.goiko-api', '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 4096 }).trim(); }
    catch { throw new Error('KEYCHAIN_UNAVAILABLE'); }
    reader = createReader203({ key, fetcher: fetch,
      claim: (index, entry) => save(`${String(index).padStart(2, '0')}-RESERVED.json`, { index, ...entry, atUTC: new Date().toISOString() }),
      record: (receipt, payload) => {
        const prefix = String(receipt.index).padStart(2, '0'); save(`${prefix}-RECEIPT.json`, receipt);
        if (payload !== undefined) save(`${prefix}-BODY.json`, payload);
      } });
    while (reader.count() < plan203.length) {
      const result = await reader.readNext(); results.push(summarize203(result.entry, result.payload, result.receipt.httpStatus!));
    }
    state = 'COMPLETED_DIAGNOSTIC_NOT_RELEASE_APPROVAL';
  } catch { /* The ledger preserves attempted requests; never retry this allowance. */ }
  finally {
    key = '';
    save('RESULT.json', { state, requests: reader?.count() ?? 0, maximum: 12, results, receipts: reader?.receipts ?? [],
      finishedUTC: new Date().toISOString(), modelCalls: 0, imageUploads: 0, appActivated: false, testflightGate: 'HOLD' });
  }
  console.log(JSON.stringify({ state, requests: reader?.count() ?? 0, output: root, testflightGate: 'HOLD' }));
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(() => { console.error('MASTER203_STOPPED_NO_SECRET_LOGGED'); process.exitCode = 1; });
}
