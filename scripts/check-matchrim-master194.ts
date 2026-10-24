import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validatePlan194, catalogueUrl194, createReader194, runCases194, type Plan194 } from './probe-matchrim-master194';
import { parseMasterPage188 } from '../src/utils/nativeMasterContract188';

const plan: Plan194[] = JSON.parse(fs.readFileSync('qa-fixtures/master194/query-plan.json', 'utf8'));
const source = JSON.parse(fs.readFileSync('qa-fixtures/master194/source-ocr.observed.json', 'utf8'));
const observed = JSON.parse(fs.readFileSync('qa-fixtures/master193/2-BODY.json', 'utf8'));
const key = 'controlled-key194'; let groups = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); groups++; console.log('PASS', name); };
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_EXTERNAL_CALLS_IN_MASTER194_TEST'); };
const reader = (respond: typeof fetch, timeoutMs?: number) => {
  let claims = 0, calls = 0; const saved: unknown[] = [];
  const client = createReader194({ key, timeoutMs,
    claim: index => { assert.equal(index, ++claims); },
    fetcher: async (url, init) => {
      assert.equal(claims, ++calls); assert.equal(init?.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
      assert.deepEqual(init.headers, { Accept: 'application/json', 'X-Matchrim-Key': key }); assert.equal(init.body, undefined);
      return respond(url, init);
    }, record: (receipt, payload) => { saved.push({ receipt, payload }); assert(!JSON.stringify(saved).includes(key)); },
  });
  return { client, calls: () => calls, claims: () => claims, saved };
};
const row = (canonical: number) => ({ ...observed, id: canonical + 10000, representativePublicId: canonical + 10000,
  mantalakWineId: canonical, webUrl: `https://web.winerim.com/matchrim/store/${canonical + 10000}/Wine` });
try {
  await test('Observed Grossot tab separator does not discard50canonical rows; other control characters still fail', () => {
    const payload = JSON.parse(fs.readFileSync('qa-fixtures/master194/gross-page1.observed.json', 'utf8'));
    assert(payload.results.some((row: { name: string }) => row.name.includes('\t')));
    const parsed = parseMasterPage188(payload, 1, 50); assert(parsed);
    assert.equal(parsed.total, 57); assert.equal(parsed.count, 50);
    assert.equal(parsed.results.find(row => row.mantalakWineId === 181944)?.name, 'Jean-Pierre Grossot Chablis Premier Cru');
    assert.notEqual(parsed.total, parsed.count, 'Seven unloaded rows remain explicit');
    for (const control of ['\n', '\r', '\u202e', '\u0000']) {
      const poison = structuredClone(payload); poison.results[0].name += control + 'Extra';
      assert.equal(parseMasterPage188(poison, 1, 50), null);
    }
  });
  await test('All17plans are traceable to actual OCR, not expected names; injected tokens/extra cases are rejected', () => {
    assert(validatePlan194(plan, source.cases));
    const poison = structuredClone(plan); poison[0].primary.name = 'INVENTED WINE';
    assert.throws(() => validatePlan194(poison, source.cases)); assert.throws(() => validatePlan194(plan.slice(1), source.cases));
    assert.throws(() => validatePlan194([...plan, plan[0]], source.cases));
  });
  await test('Exactly40reserved reads allowed, no41st request; disallowed host rejected before claiming', async () => {
    const h = reader(async () => Response.json({ valid: true }));
    await assert.rejects(h.client.read('host-injection', 'https://evil.example/api/v1/matchrim/wines/1')); assert.equal(h.calls(), 0);
    for (let i = 0; i < 40; i++) await h.client.read('bounded', catalogueUrl194({ q: 'AMARONE' }));
    await assert.rejects(h.client.read('over-limit', catalogueUrl194({ q: 'AMARONE' })));
    assert.equal(h.calls(), 40); assert.equal(h.claims(), 40);
  });
  await test('Access/rate/redirect/body/timeouts halt permanently with sanitized receipts, no retry or key echo', async () => {
    for (const respond of [async () => new Response('Denied', { status: 401 }), async () => new Response('Limit', { status: 429 }),
      async () => new Response('', { status: 302 }), async () => Response.json({ secret: key }),
      async () => { throw new Error(key); }, async () => new Promise<Response>(() => undefined),
      async () => new Response(new ReadableStream({ start() { /* Explicit stalled-body negative. */ } }), { headers: { 'content-type': 'application/json' } }),
      async () => Response.json({ text: 'x'.repeat(262145) })]) {
      const h = reader(respond, 20); await assert.rejects(h.client.read('rejected', catalogueUrl194({ q: 'AMARONE' })));
      await assert.rejects(h.client.read('retry-rejected', catalogueUrl194({ q: 'AMARONE' }))); assert.equal(h.calls(), 1);
    }
  });
  await test('17primary/detail workflows plus2source details and4paging controls fit40without confirming an identity', async () => {
    const h = reader(async input => {
      const url = new URL(String(input));
      if (!url.pathname.endsWith('/search')) {
        const id = Number(url.pathname.split('/').at(-1));
        return Response.json({ ...observed, mantalakWineId: id });
      }
      const limit = Number(url.searchParams.get('limit')), page = Number(url.searchParams.get('page'));
      if (limit === 50) return Response.json({ results: [row(180278)], count: 1, total: 1, page, limit, pageCount: 1 });
      const ids = Array.from({ length: limit }, (_, index) => 50000 + (page - 1) * limit + index);
      return Response.json({ results: ids.map(row), count: limit, total: 149, page, limit, pageCount: Math.ceil(149 / limit) });
    });
    const report = await runCases194(plan, h.client); assert.equal(report.requests, 40); assert(report.pagination.passed);
    assert.equal(report.scenes.length, 17); assert(report.scenes.every(scene => scene.confirmedIdentity === null));
    assert.equal(report.identitiesConfirmed, 0); assert.equal(report.affinityGranted, false);
    assert.equal(report.repairedDetails.length, 2); assert.equal(report.appActivated, false);
  });
  await test('Zero results use only literal fallback, and unclosed ambiguity stays unconfirmed', async () => {
    const h = reader(async input => {
      const url = new URL(String(input));
      if (!url.pathname.endsWith('/search')) return Response.json({ ...observed, mantalakWineId: Number(url.pathname.split('/').at(-1)) });
      const limit = Number(url.searchParams.get('limit')), page = Number(url.searchParams.get('page'));
      if (limit === 50) return Response.json({ results: [], count: 0, total: 0, page, limit, pageCount: 0 });
      return Response.json({ results: Array.from({ length: limit }, (_, i) => row((page - 1) * limit + i + 1)), count: limit,
        total: 149, page, limit, pageCount: Math.ceil(149 / limit) });
    });
    const report = await runCases194(plan, h.client); assert.equal(report.requests, 40);
    assert(report.scenes.every(scene => scene.status === 'no-literal-candidate')); assert.equal(report.identitiesConfirmed, 0);
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalRequests: 0, keychainReads: 0,
    scope: 'Controlled transports only. No live source/image recognition or affinity accuracy claim.' }));
} finally { globalThis.fetch = previousFetch; }
