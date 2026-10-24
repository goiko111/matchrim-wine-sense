import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createReader203, plan203, summarize203, type Receipt203 } from './probe-matchrim-master203';

const key = 'synthetic-test-key-203';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('EXTERNAL_NETWORK_FORBIDDEN_IN_TEST'); };
let groups = 0;
try {
  const crosswalk = JSON.parse(fs.readFileSync('qa-artifacts/continuation199-20261024/ASSET_PROVENANCE-r2.json', 'utf8'));
  assert.equal(plan203.length, 12); assert.equal(plan203.filter(row => row.kind === 'detail').length, 9);
  for (const entry of plan203.slice(0, 9)) {
    assert(entry.kind === 'detail');
    const row = crosswalk.rows.find((item: { imageId: string }) => item.imageId === entry.imageId);
    assert.equal(row.exportIdHint, entry.id); assert.equal(row.retainedCanonicalIdMatches.length, 0);
  }
  groups++;
  let calls = 0, claims = 0; const receipts: Receipt203[] = [];
  const reader = createReader203({ key, claim: index => { assert.equal(index, ++claims); }, record: row => receipts.push(row),
    fetcher: async (address, init) => {
      calls++; assert.equal(claims, calls); assert.equal(String(address), plan203[calls - 1].url);
      assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
      assert.deepEqual(Object.keys(init!.headers!).sort(), ['Accept', 'X-Matchrim-Key']);
      return calls <= 9 ? json({ error: 'not_found' }, 404)
        : json({ results: [], total: 0, count: 0, page: 1, limit: 50, pageCount: 0 });
    } });
  for (let i = 0; i < 12; i++) {
    const result = await reader.readNext(); const summary = summarize203(result.entry, result.payload, result.receipt.httpStatus!);
    assert.equal(summary.imageIdentityConfirmed, false); assert.equal(summary.affinityAttributes, null);
  }
  await assert.rejects(reader.readNext()); assert.equal(calls, 12); assert.equal(receipts.length, 12); groups++;
  for (const status of [400, 401, 403, 429, 500, 502, 302]) {
    let sent = 0;
    const guarded = createReader203({ key, claim: () => undefined, record: () => undefined,
      fetcher: async () => { sent++; return json({ error: 'not_found' }, status); } });
    await assert.rejects(guarded.readNext()); await assert.rejects(guarded.readNext()); assert.equal(sent, 1);
  }
  groups++;
  const validDetail = JSON.parse(fs.readFileSync('qa-fixtures/master194/responses/10-BODY.json', 'utf8'));
  assert(plan203[0].kind === 'detail');
  validDetail.mantalakWineId = plan203[0].id;
  const good = createReader203({ key, claim: () => undefined, record: () => undefined, fetcher: async () => json(validDetail) });
  const detailResult = await good.readNext();
  assert.equal(summarize203(detailResult.entry, detailResult.payload, 200).imageIdentityConfirmed, false); groups++;
  for (const response of [() => json({ error: 'not_found', extra: true }, 404), () => json({ malformed: true }),
    () => json({ error: key }, 404), () => new Response('{"error":"synthetic-test-key-20\\u0033"}', { headers: { 'Content-Type': 'application/json' } }),
    () => new Response('a'.repeat(262145), { headers: { 'Content-Type': 'application/json' } }),
    () => new Response('{}', { headers: { 'Content-Type': 'text/html' } })]) {
    const saved: unknown[] = []; let sent = 0;
    const guarded = createReader203({ key, claim: () => undefined, record: (row, payload) => saved.push({ row, payload }),
      fetcher: async () => { sent++; return response(); } });
    await assert.rejects(guarded.readNext()); await assert.rejects(guarded.readNext());
    assert.equal(sent, 1); assert(!JSON.stringify(saved).includes(key)); assert(!JSON.stringify(saved).includes('malformed'));
  }
  groups++;
  let sent = 0;
  const unreserved = createReader203({ key, claim: () => { throw new Error('RESERVATION_FAILED'); }, record: () => undefined,
    fetcher: async () => { sent++; return json({}); } });
  await assert.rejects(unreserved.readNext()); await assert.rejects(unreserved.readNext()); assert.equal(sent, 0); groups++;
  const stalled = createReader203({ key, timeoutMs: 10, claim: () => undefined, record: () => undefined,
    fetcher: async () => new Response(new ReadableStream({ start: () => undefined }), { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(stalled.readNext()); await assert.rejects(stalled.readNext()); groups++;
  console.log(JSON.stringify({ groupsPassed: groups, networkCalls: 0, keychainReads: 0, liveAllowanceConsumed: 0 }));
} finally { globalThis.fetch = originalFetch; }
