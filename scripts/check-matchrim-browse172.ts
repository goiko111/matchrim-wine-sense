import assert from 'node:assert/strict';
import { createGlobalCatalogue103, type CatalogueCursor172 } from '../src/utils/nativeGlobalCatalogue103';

globalThis.fetch = async () => { throw Error('REAL_NETWORK_FORBIDDEN'); };
const row = (id: number) => ({ id, name: `Cuvee ${id}`, winery: 'Independent Estate', vintage: null, slugname: `cuvee-${id}` });
const payload = (page: number, count = 96) => ({ count, page,
  results: Array.from({ length: Math.min(20, Math.max(0, count - (page - 1) * 20)) }, (_, i) => row((page - 1) * 20 + i + 1)) });
const rig = (change = (value: ReturnType<typeof payload>) => value) => {
  const calls: string[] = [];
  const client = createGlobalCatalogue103(async (input, init) => {
    const url = new URL(String(input)); calls.push(url.href);
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    assert.equal(init?.referrerPolicy, 'no-referrer'); assert.equal(init?.body, undefined);
    assert.equal(url.searchParams.get('text'), 'Cuvee'); assert.equal(url.searchParams.get('store'), '1');
    return Response.json(change(payload(Number(url.searchParams.get('page')))));
  });
  return { client, calls };
};
let groups = 0;
const test = async (name: string, body: () => Promise<void>) => { await body(); groups++; console.log('PASS', name); };

await test('A broad automatic search still reads only 20 rows; explicit clicks reach all 96', async () => {
  const h = rig(), initial = await h.client.searchProposals('Cuvee');
  assert.equal(initial.status, 'partial'); assert.equal(h.calls.length, 1);
  assert('next' in initial && initial.next); let cursor = initial.next;
  const all = [...initial.rows];
  while (cursor) {
    const before = h.calls.length, value = await h.client.browseProposals('Cuvee', cursor);
    assert.equal(h.calls.length, before + 1); all.push(...value.rows);
    assert.equal(value.count, 96); cursor = value.next;
    assert.equal(value.status, cursor ? 'partial' : 'complete');
  }
  assert.equal(all.length, 96); assert.equal(new Set(all.map(value => value.id)).size, 96);
  assert(all.every(value => Object.isFrozen(value))); assert.equal(h.calls.length, 5);
});
await test('Forged, reused, foreign-client and wrong-query continuations do not fetch', async () => {
  const h = rig(), first = await h.client.browseProposals('Cuvee'); assert(first.next);
  for (const [client, query, cursor] of [
    [h.client, 'Cuvee', { ...first.next }], [rig().client, 'Cuvee', first.next], [h.client, 'Other', first.next],
  ] as const) assert.equal((await client.browseProposals(query, cursor)).status, 'identity-required');
  assert.equal(h.calls.length, 1);
  const next = await h.client.browseProposals('Cuvee', first.next); assert.equal(next.status, 'partial');
  assert.equal((await h.client.browseProposals('Cuvee', first.next)).status, 'identity-required');
  assert.equal(h.calls.length, 2);
});
await test('Count, page and short-envelope drift cannot add selectable rows', async () => {
  for (const mutate of [
    (value: ReturnType<typeof payload>) => ({ ...value, count: 97 }),
    (value: ReturnType<typeof payload>) => ({ ...value, page: 3 }),
    (value: ReturnType<typeof payload>) => ({ ...value, results: value.results.slice(1) }),
  ]) {
    const h = rig(value => value.page === 2 ? mutate(value) : value), first = await h.client.browseProposals('Cuvee');
    const second = await h.client.browseProposals('Cuvee', first.next);
    assert.equal(second.status, 'incomplete'); assert.deepEqual(second.rows, []); assert.equal(second.next, null);
  }
});
await test('Malformed rows retain only 19 valid proposals and cannot advance past schema damage', async () => {
  const h = rig(value => value.page === 2 ? { ...value, results: value.results.map((wine, i) => i ? wine : { ...wine, slugname: '' }) } : value);
  const first = await h.client.browseProposals('Cuvee'), second = await h.client.browseProposals('Cuvee', first.next);
  assert.equal(second.status, 'incomplete'); assert.equal(second.rows.length, 19); assert.equal(second.next, null);
  assert(!second.rows.some(value => value.id === 21));
});
await test('Duplicate IDs, including an invalid row hiding an earlier ID, reject the new page', async () => {
  for (const malformed of [false, true]) {
    const h = rig(value => value.page === 2 ? { ...value, results: value.results.map((wine, i) => i ? wine
      : { ...wine, id: 1, slugname: malformed ? '' : wine.slugname }) } : value);
    const first = await h.client.browseProposals('Cuvee'), second = await h.client.browseProposals('Cuvee', first.next);
    assert.equal(second.status, 'ambiguous'); assert.deepEqual(second.rows, []); assert.equal(second.next, null);
  }
});
await test('Manual browsing stops at 400 even with more results; automatic cap remains 80', async () => {
  const h = rig(value => payload(value.page, 5000)); let cursor: CatalogueCursor172 | null = null;
  for (let page = 1; page <= 20; page++) {
    const value = await h.client.browseProposals('Cuvee', cursor); cursor = value.next;
    assert.equal(value.status, 'partial'); assert.equal(value.rows.length, 20);
    assert.equal(value.limited, page === 20); if (page < 20) assert(cursor);
  }
  assert.equal(cursor, null); assert.equal(h.calls.length, 20);
});
await test('Cancelled requests reject even with a non-cooperative transport', async () => {
  const abort = new AbortController(); let calls = 0;
  const client = createGlobalCatalogue103(async () => { calls++; abort.abort(); return new Promise(() => undefined); });
  await assert.rejects(client.browseProposals('Cuvee', null, abort.signal), { name: 'AbortError' }); assert.equal(calls, 1);
  await assert.rejects(client.browseProposals('Cuvee', null, abort.signal), { name: 'AbortError' }); assert.equal(calls, 1);
});
await test('HTTP, body and deadline guards remain fail-closed', async () => {
  for (const response of [Response.json({}, { status: 500 }),
    new Response('x'.repeat(262145), { headers: { 'content-type': 'application/json' } })]) {
    const client = createGlobalCatalogue103(async () => response);
    const result = await client.browseProposals('Cuvee'); assert.equal(result.status, 'unavailable'); assert.deepEqual(result.rows, []);
  }
  const original = globalThis.setTimeout; let calls = 0;
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    assert.equal(delay, 12000); calls++; queueMicrotask(callback); return original(() => undefined, 0);
  }) as typeof setTimeout;
  try { assert.equal((await createGlobalCatalogue103(async () => new Promise(() => undefined)).browseProposals('Cuvee')).status, 'unavailable'); }
  finally { globalThis.setTimeout = original; } assert.equal(calls, 1);
});
await test('Later-page objects still require independent detail; clones never select', async () => {
  let calls = 0;
  const client = createGlobalCatalogue103(async input => {
    calls++; const url = new URL(String(input));
    return Response.json(url.search ? payload(Number(url.searchParams.get('page'))) : row(21));
  });
  const first = await client.browseProposals('Cuvee'), second = await client.browseProposals('Cuvee', first.next), selected = second.rows[0];
  const input = { name: selected.name, producer: selected.winery, vintage: null };
  assert.equal((await client.confirmSelection(input, { ...selected })).status, 'identity-required'); assert.equal(calls, 2);
  assert.equal((await client.confirmSelection(input, selected)).status, 'reference'); assert.equal(calls, 3);
});
console.log(JSON.stringify({ groups, passed: true, realGET: 0, models: 0, scope: 'Explicit public browsing, not automatic recognition coverage' }));
