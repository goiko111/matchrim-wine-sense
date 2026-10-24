import assert from 'node:assert/strict';
import fs from 'node:fs';
import { masterPlan191, runMasterProbe191, type ProbeReceipt191 } from './probe-matchrim-master191';

const contract = fs.readFileSync('qa-fixtures/master188/CONTRATO-API-827-20261024.md', 'utf8');
const examples = [...contract.matchAll(/```json\s*([\s\S]*?)```/g)].map(match => JSON.parse(match[1]));
const zorrera = examples.find(row => row.mantalakWineId === 180278), vidure = examples.find(row => row.mantalakWineId === 201987);
const mapping = examples.find(row => row.notFound);
const makeSearch = (wine: typeof zorrera) => ({ results: [{ ...wine, id: wine.representativePublicId }],
  total: 1, count: 1, page: 1, limit: 10, pageCount: 1 });
const payloads = [makeSearch(zorrera), zorrera, { results: [], total: 0, count: 0, page: 1, limit: 10, pageCount: 0 },
  makeSearch(vidure), vidure, { results: mapping.results.slice(0, 2), notFound: [] }];
const key = 'synthetic-offline-key191';
let groups = 0;
const check = async (name: string, work: () => Promise<void>) => { await work(); groups++; console.log('PASS', name); };
const run = async (respond: typeof fetch, timeoutMs?: number) => {
  let claims = 0, calls = 0; const saved: { receipt: ProbeReceipt191; payload?: unknown }[] = [];
  const report = await runMasterProbe191({ key, timeoutMs, claim: (_operation, index) => { assert.equal(index, ++claims); },
    fetcher: async (url, init) => {
      assert.equal(claims, ++calls); assert.equal(String(url), masterPlan191[calls - 1].url);
      assert.equal(init?.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
      assert.deepEqual(init.headers, { Accept: 'application/json', 'X-Matchrim-Key': key }); assert.equal(init.body, undefined);
      return respond(url, init);
    }, receipt: (receipt, payload) => { saved.push({ receipt, payload }); },
  });
  assert.equal(claims, calls); assert(calls <= 6); assert(!JSON.stringify({ report, saved }).includes(key));
  return { report, saved, calls };
};
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_LIVE_MASTER191_TEST'); };
try {
  await check('Six fixed, reserved-before-send operations validate the supplied contract without granting affinity', async () => {
    assert(Object.isFrozen(masterPlan191)); assert(masterPlan191.every(Object.isFrozen));
    let index = 0; const result = await run(async () => Response.json(payloads[index++]));
    assert(result.report.passed); assert.equal(result.calls, 6); assert.equal(result.report.appActivated, false);
    assert(result.saved.every(row => row.receipt.validation?.affinityGranted === false));
  });
  await check('401, 403, 429, redirects and bad content stop after one claimed request without retry', async () => {
    for (const status of [401, 403, 429, 302]) {
      const result = await run(async () => new Response('rejected', { status })); assert.equal(result.calls, 1); assert(!result.report.passed);
    }
    const result = await run(async () => new Response('<html>login</html>')); assert.equal(result.calls, 1);
  });
  await check('No transport exception or successful JSON echo can leak the credential into receipts', async () => {
    for (const respond of [async () => { throw new Error(key); }, async () => Response.json({ secret: key }),
      async () => new Response(JSON.stringify({ secret: key }).replace('synthetic', '\\u0073ynthetic'), { headers: { 'content-type': 'application/json' } })]) {
      const result = await run(respond); assert.equal(result.calls, 1); assert.equal(result.saved[0].payload, undefined);
    }
  });
  await check('Body overflow, invalid JSON and signal-ignoring stalled fetch/body remain bounded', async () => {
    for (const respond of [async () => Response.json({ value: 'x'.repeat(262145) }),
      async () => new Response('{', { headers: { 'content-type': 'application/json' } }),
      async () => new Promise<Response>(() => undefined),
      async () => new Response(new ReadableStream({ start() { /* Explicit stalled-body negative. */ } }), { headers: { 'content-type': 'application/json' } })]) {
      const result = await run(respond, 20); assert.equal(result.calls, 1); assert(!result.report.passed); assert.equal(result.saved[0].payload, undefined);
    }
  });
  await check('A changed baseline is retained as a failure, not relabeled or retried; hard maximum stays six', async () => {
    let index = 0; const result = await run(async () => {
      const payload = structuredClone(payloads[index++]); if (index === 1) payload.results[0].mantalakWineId = 1;
      return Response.json(payload);
    });
    assert(!result.report.passed); assert.equal(result.calls, 6);
    assert.equal(result.saved[0].receipt.error, 'CONTRACT_OR_BASELINE_MISMATCH'); assert(result.saved[0].payload);
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalRequests: 0, keychainReads: 0,
    scope: 'Controlled transports and developer-supplied examples, not live API or image recognition' }));
} finally { globalThis.fetch = previousFetch; }
