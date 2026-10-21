import assert from 'node:assert/strict';
import { createGlobalCatalogue103, applyGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import type { WineCandidate } from '../src/utils/multiWineScan';

let groups = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); groups++; console.log('PASS', name); };
const row = (id: number) => ({ id, name: `Synthetic Reference ${id}`, winery: 'Synthetic Estate', vintage: null,
  slugname: `synthetic-${id}`, tastingAttributes: { power: 3, acidity: 3, sweetness: 1, tannin: 3, fruity: 3 } });
const page = (number: number, count = 23) => ({ count, page: number,
  results: Array.from({ length: Math.min(20, Math.max(0, count - (number - 1) * 20)) }, (_, i) => row((number - 1) * 20 + i + 1)) });
const host = (responses: unknown[]) => {
  const calls: { url: URL; init: RequestInit }[] = [];
  const client = createGlobalCatalogue103(async (input, init) => {
    calls.push({ url: new URL(String(input)), init });
    const body = responses[calls.length - 1]; assert.notEqual(body, undefined, 'Unexpected extra request');
    return Response.json(body);
  });
  return { client, calls };
};
globalThis.fetch = async () => { throw new Error('No live network in this contract'); };

await test('Explicit proposals retrieve a complete second page with bounded anonymous GETs', async () => {
  const h = host([page(1), page(2)]), result = await h.client.searchProposals('Synthetic');
  assert.equal(result.status, 'complete'); assert.equal(result.rows.length, 23); assert.equal(result.rows[22].id, 23);
  assert.deepEqual(h.calls.map(call => call.url.searchParams.get('page')), ['1', '2']);
  for (const { url, init } of h.calls) {
    assert.equal(url.searchParams.get('text'), 'Synthetic'); assert.equal(url.searchParams.get('store'), '1');
    assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    assert.equal(init.body, undefined); assert.deepEqual(init.headers, { Accept: 'application/json' });
  }
});
await test('At most three pages and sixty references, broad queries stay explicitly partial', async () => {
  const bounded = host([page(1, 60), page(2, 60), page(3, 60)]);
  const result = await bounded.client.searchProposals('Synthetic'); assert.equal(result.status, 'complete');
  assert.equal(result.rows.length, 60); assert.equal(bounded.calls.length, 3);
  for (const count of [61, 200000]) {
    const h = host([page(1, count)]), broad = await h.client.searchProposals('Synthetic');
    assert.equal(broad.status, 'partial'); assert.equal(broad.rows.length, 20); assert.equal(h.calls.length, 1);
  }
});
await test('Ordinary strict search and legacy partial selection never opt into pagination', async () => {
  for (const partial of [false, true]) {
    const h = host([page(1)]), result = await h.client.search('Synthetic', undefined, partial);
    assert.equal(result.status, partial ? 'partial' : 'incomplete'); assert.equal(h.calls.length, 1);
    assert.equal(result.rows.length, partial ? 20 : 0);
  }
  const h = host([{ ...page(1, 2), results: [row(1)] }]);
  assert.equal((await h.client.searchProposals('Synthetic')).status, 'incomplete'); assert.equal(h.calls.length, 1);
});
await test('Changed count, page, truncated/oversized rows or schema invalidate the whole result', async () => {
  for (const changed of [{ ...page(2), count: 24 }, { ...page(2), page: 1 },
    { ...page(2), results: [row(21)] }, { ...page(2), results: [...page(2).results, row(24)] },
    { ...page(2), results: [{ ...row(21), id: -1 }, row(22), row(23)] }]) {
    const h = host([page(1), changed]), result = await h.client.searchProposals('Synthetic');
    assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows, []); assert.equal(h.calls.length, 2);
  }
});
await test('Duplicate public IDs across pages fail closed instead of hiding identity collisions', async () => {
  const h = host([page(1), { ...page(2), results: [row(1), row(22), row(23)] }]);
  const result = await h.client.searchProposals('Synthetic'); assert.equal(result.status, 'ambiguous'); assert.deepEqual(result.rows, []);
});
await test('A second-page selection still requires independent detail and retains NV boundaries', async () => {
  const h = host([page(1), page(2), row(23)]), proposals = await h.client.searchProposals('Synthetic');
  const selected = proposals.rows[22]; assert(selected);
  const candidate: WineCandidate = { id: 'synthetic', name: selected.name, producer: selected.winery,
    vintage: 2020, region: null, country: null, source: 'manual', confidence: 0,
    grapes: [], alcohol: null, evidence: ['Explicit user selection'], inferredFields: [], uncertaintyReasons: [] };
  const result = await h.client.confirmSelection(candidate, selected); assert('wine' in result);
  assert.equal(result.status, 'reference'); assert.equal(h.calls.length, 3);
  assert(h.calls[2].url.pathname.endsWith('/23/synthetic-23'));
  const applied = applyGlobalCatalogue103(candidate, { potente: 3, acidez: 3, dulce: 1, tanico: 3, afrutado: 3 }, result.wine, true);
  assert.equal(applied.canonicalId, null); assert.equal(applied.sensoryAttributes, null); assert.equal(applied.affinity, null);
  const forged = await h.client.confirmSelection(candidate, { ...selected }); assert.equal(forged.status, 'identity-required');
  assert.equal(h.calls.length, 3);
});
await test('Cancellation of a second page rejects even when its transport ignores AbortSignal', async () => {
  let starts = 0;
  const controller = new AbortController();
  const client = createGlobalCatalogue103(async () => ++starts === 1 ? Response.json(page(1)) : new Promise(() => undefined));
  const pending = client.searchProposals('Synthetic', controller.signal);
  for (let i = 0; i < 50 && starts !== 2; i++) await new Promise(resolve => setImmediate(resolve));
  assert.equal(starts, 2); controller.abort(); await assert.rejects(pending, { name: 'AbortError' });
});
await test('Failure on a later page never returns an incomplete successful-looking shortlist', async () => {
  let starts = 0;
  const client = createGlobalCatalogue103(async () => ++starts === 1 ? Response.json(page(1)) : new Response('error', { status: 502 }));
  const result = await client.searchProposals('Synthetic'); assert.equal(result.status, 'unavailable'); assert.deepEqual(result.rows, []);
  assert.equal(starts, 2);
});
console.log(JSON.stringify({ groups, remoteCalls: 0, models: 0, fixture: 'Synthetic pagination contract, not recognition or catalogue completeness' }));
