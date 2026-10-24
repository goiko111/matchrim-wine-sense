import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { masterSearchParams188, parseMasterPage188, parseMasterDetail188,
  type MasterQuery188 } from '../src/utils/nativeMasterContract188';
import { usableMasterKey191 } from './probe-matchrim-master191';

type SourceCase194 = { imageId: string; inputSHA256: string; observedText: string[]; queries: { clientStatus: string }[] };
export type Plan194 = { imageId: string; primary: MasterQuery188; fallback: MasterQuery188 };
const rootUrl = 'https://app.winerim.com/api/v1/matchrim';
const tokens = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
export const validatePlan194 = (plan: Plan194[], cases: SourceCase194[]) => {
  const broad = cases.filter(row => row.queries.every(query => query.clientStatus !== 'incomplete'));
  assert.equal(plan.length, 17); assert.equal(new Set(plan.map(row => row.imageId)).size, 17);
  assert.deepEqual(plan.map(row => row.imageId).sort(), broad.map(row => row.imageId).sort());
  for (const entry of plan) {
    const source = broad.find(row => row.imageId === entry.imageId)!;
    const observed = new Set(tokens(source.observedText.join(' ')));
    for (const query of [entry.primary, entry.fallback]) {
      assert(masterSearchParams188({ ...query, limit: 50, page: 1 }), 'INVALID_LITERAL_QUERY');
      assert(Object.keys(query).every(field => ['name', 'winery', 'q', 'vintage'].includes(field)), 'UNDECLARED_QUERY_FIELD');
      for (const value of Object.values(query)) assert(tokens(String(value)).every(word => observed.has(word)), 'QUERY_TOKEN_NOT_IN_SOURCE_OCR');
    }
  }
  return true;
};
export const catalogueUrl194 = (query: MasterQuery188) => {
  const params = masterSearchParams188(query); assert(params, 'INVALID_QUERY');
  return `${rootUrl}/wines/search?${params}`;
};

type Receipt194 = { index: number; label: string; url: string; httpStatus: number | null; elapsedMs: number;
  bytes: number; sha256?: string; error?: string };
type Options194 = { key: string; fetcher: typeof fetch;
  claim: (index: number, label: string, url: string) => void;
  record: (receipt: Receipt194, payload?: unknown) => void; timeoutMs?: number };
export const createReader194 = (options: Options194) => {
  assert(usableMasterKey191(options.key), 'KEY_UNAVAILABLE');
  let count = 0, halted = false;
  const receipts: Receipt194[] = [];
  const read = async (label: string, address: string): Promise<unknown> => {
    const url = new URL(address);
    assert(!halted && count < 40, 'TRANCHE_STOPPED_OR_EXHAUSTED');
    assert(url.origin === 'https://app.winerim.com' && !url.username && !url.password && !url.hash
      && (url.pathname === '/api/v1/matchrim/wines/search' || /^\/api\/v1\/matchrim\/wines\/[1-9]\d*$/.test(url.pathname)), 'UPSTREAM_NOT_ALLOWED');
    const index = ++count;
    options.claim(index, label, address);
    const started = performance.now(), controller = new AbortController();
    let stop: () => void = () => undefined;
    const deadline = new Promise<never>((_resolve, reject) => { stop = () => reject(new Error('DEADLINE')); });
    const timer = setTimeout(() => { controller.abort(); stop(); }, options.timeoutMs ?? 12000);
    const bounded = <T,>(work: Promise<T>) => Promise.race([work, deadline]);
    const receipt: Receipt194 = { index, label, url: address, httpStatus: null, elapsedMs: 0, bytes: 0 };
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined, payload: unknown;
    try {
      const pending = options.fetcher(address, { method: 'GET', credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json', 'X-Matchrim-Key': options.key }, signal: controller.signal });
      void pending.then(response => { if (controller.signal.aborted) void response.body?.cancel().catch(() => undefined); }, () => undefined);
      const response = await bounded(pending); receipt.httpStatus = response.status;
      if (!response.ok || response.redirected || (response.url && response.url !== address) || !response.body
        || !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') ?? '')) {
        void response.body?.cancel().catch(() => undefined); throw new Error('REJECTED');
      }
      reader = response.body.getReader(); const chunks: Uint8Array[] = [];
      while (true) {
        const part = await bounded(reader.read()); if (part.done) break;
        receipt.bytes += part.value.byteLength; assert(receipt.bytes <= 262144, 'BODY_BOUND'); chunks.push(part.value);
      }
      const bytes = Buffer.concat(chunks), body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      assert(!body.includes(options.key), 'SECRET_ECHO'); payload = JSON.parse(body);
      assert(!JSON.stringify(payload).includes(JSON.stringify(options.key).slice(1, -1)), 'ESCAPED_SECRET_ECHO');
      receipt.sha256 = createHash('sha256').update(bytes).digest('hex');
    } catch { halted = true; payload = undefined; receipt.error = 'HTTP_TRANSPORT_OR_BODY_REJECTED'; }
    finally {
      clearTimeout(timer); controller.abort(); void reader?.cancel().catch(() => undefined);
      receipt.elapsedMs = Math.round(performance.now() - started);
    }
    options.record(receipt, payload); receipts.push(receipt);
    if (halted) throw new Error('TRANCHE_HALTED_NO_RETRY');
    return payload;
  };
  return { read, receipts, count: () => count };
};

export const runCases194 = async (plan: Plan194[], reader: ReturnType<typeof createReader194>) => {
  const scenes = [];
  for (const entry of plan) {
    const first = parseMasterPage188(await reader.read(`${entry.imageId}-primary`, catalogueUrl194({ ...entry.primary, limit: 50, page: 1 })), 1, 50);
    if (!first) { scenes.push({ imageId: entry.imageId, status: 'schema-rejected', confirmedIdentity: null }); continue; }
    const summary = { imageId: entry.imageId, query: entry.primary, total: first.total, rows: first.count,
      complete: first.total === first.count, confirmedIdentity: null, affinity: null,
      proposals: first.results.map(row => ({ id: row.mantalakWineId, publicId: row.id, name: row.name, winery: row.winery, vintages: row.vintages })) };
    if (first.results.length) {
      const candidate = first.results[0];
      const detail = parseMasterDetail188(await reader.read(`${entry.imageId}-proposal-detail`, `${rootUrl}/wines/${candidate.mantalakWineId}`), candidate.mantalakWineId);
      const consistent = Boolean(detail && detail.name === candidate.name && detail.winery === candidate.winery);
      scenes.push({ ...summary, status: !consistent ? 'detail-mismatch' : first.total === 1 ? 'unique-proposal-unconfirmed' : 'ambiguous-proposals',
        detail: detail ? { id: detail.mantalakWineId, name: detail.name, winery: detail.winery, vintages: detail.vintages,
          sensoryRows: detail.tastingAttributes.attributesByVintage.length,
          sourceKnownRows: detail.tastingAttributes.attributesByVintage.filter(row => row.source !== null).length } : null });
    } else {
      const fallback = parseMasterPage188(await reader.read(`${entry.imageId}-literal-fallback`, catalogueUrl194({ ...entry.fallback, limit: 50, page: 1 })), 1, 50);
      scenes.push({ ...summary, status: !fallback ? 'fallback-schema-rejected' : fallback.total === 0 ? 'no-literal-candidate' : 'fallback-proposals-unconfirmed',
        fallbackQuery: entry.fallback, fallbackTotal: fallback?.total ?? null, fallbackComplete: fallback ? fallback.total === fallback.count : false,
        fallbackProposals: fallback?.results.map(row => ({ id: row.mantalakWineId, publicId: row.id, name: row.name, winery: row.winery, vintages: row.vintages })) ?? [] });
    }
  }
  const repairedDetails = [];
  for (const [publicId, canonicalId] of [[362891, 215213], [363580, 215439]]) {
    const detail = parseMasterDetail188(await reader.read(`source-${publicId}-canonical-detail`, `${rootUrl}/wines/${canonicalId}`), canonicalId);
    repairedDetails.push({ publicId, canonicalId, status: detail ? 'detail-verified' : 'schema-rejected',
      name: detail?.name ?? null, winery: detail?.winery ?? null, imageIdentityConfirmed: false });
  }
  const pages: ReturnType<typeof parseMasterPage188>[] = [];
  for (const [page, limit] of [[1, 2], [2, 2], [1, 2], [1, 4]]) {
    pages.push(parseMasterPage188(await reader.read(`paging-${pages.length + 1}`, catalogueUrl194({ name: 'AMARONE', page, limit })), page, limit));
  }
  const ids = pages.map(page => page?.results.map(row => row.mantalakWineId));
  const paginationPassed = pages.every(Boolean) && pages.every(page => page!.total === pages[0]!.total)
    && JSON.stringify(ids[0]) === JSON.stringify(ids[2]) && JSON.stringify([...(ids[0] ?? []), ...(ids[1] ?? [])]) === JSON.stringify(ids[3])
    && new Set(ids[3]).size === 4;
  return { scenes, repairedDetails, pagination: { passed: paginationPassed, ids, totals: pages.map(page => page?.total ?? null),
    scope: 'First four canonical rows/repeated page/changed limit only; no full-catalogue snapshot claim' },
    requests: reader.count(), maxRequests: 40, identitiesConfirmed: 0, affinityGranted: false, appActivated: false,
    modelCalls: 0, imageUploads: 0, productionWrites: 0 };
};

const main = async () => {
  const originalPackage = 'qa-artifacts/continuation180-20261023/DEVELOPMENT_CASES.json';
  const packageFile = fs.existsSync(originalPackage) ? originalPackage : 'qa-fixtures/master194/source-ocr.observed.json';
  const source = fs.readFileSync(packageFile);
  const planFile = 'qa-fixtures/master194/query-plan.json', planBytes = fs.readFileSync(planFile);
  const plan: Plan194[] = JSON.parse(planBytes.toString('utf8'));
  validatePlan194(plan, JSON.parse(source.toString('utf8')).cases);
  if (process.argv.slice(2).join(' ') !== '--live-40') {
    console.log(JSON.stringify({ mode: 'PLAN_ONLY', requests: 0, keychainReads: 0, scenes: plan.length, maximumRequests: 40 })); return;
  }
  assert(!fs.existsSync('qa-fixtures/master194/responses/RESULT.json'), 'FROZEN_TRANCHE_EXHAUSTED_NO_NEW_AUTHORIZATION');
  const root = 'qa-artifacts/continuation194-20261024/live-forty-r1';
  assert(!fs.existsSync(root), 'EXISTING_TRANCHE_NO_RESET');
  let key = '';
  try { key = execFileSync('/usr/bin/security', ['find-generic-password', '-a', 'goiko', '-s', 'wine.matchrim.goiko-api', '-w'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000, maxBuffer: 4096 }).trim(); }
  catch { throw new Error('KEYCHAIN_UNAVAILABLE'); }
  assert(usableMasterKey191(key), 'KEY_HEADER_UNUSABLE'); fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  const save = (name: string, body: unknown) => fs.writeFileSync(path.join(root, name), JSON.stringify(body, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  save('AUTHORIZATION.json', { authorized: 'Sí, hasta 40 lecturas gratuitas', maximum: 40, startedUTC: new Date().toISOString(),
    sourcePackageSHA256: createHash('sha256').update(source).digest('hex'), planSHA256: createHash('sha256').update(planBytes).digest('hex'),
    priorSixRequestTrancheUnchanged: true, paidBudgetUnchanged: true, keychainService: 'wine.matchrim.goiko-api' });
  const reader = createReader194({ key, fetcher: fetch,
    claim: (index, label, url) => save(`${String(index).padStart(2, '0')}-RESERVED.json`, { index, label, url, atUTC: new Date().toISOString() }),
    record: (receipt, payload) => { const index = String(receipt.index).padStart(2, '0'); save(`${index}-RECEIPT.json`, receipt);
      if (payload !== undefined) save(`${index}-BODY.json`, payload); },
  });
  let report: unknown;
  try { report = await runCases194(plan, reader); }
  catch { report = { status: 'HALTED_NO_RETRY', requests: reader.count(), maxRequests: 40, receipts: reader.receipts, appActivated: false }; }
  finally { key = ''; save('RESULT.json', { report, finishedUTC: new Date().toISOString() }); }
  console.log(JSON.stringify({ output: root, requests: reader.count(), maxRequests: 40, modelCalls: 0, productionWrites: 0, appActivated: false }));
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main().catch(() => { console.error('MASTER194_STOPPED_NO_SECRET_LOGGED'); process.exitCode = 1; });
}
