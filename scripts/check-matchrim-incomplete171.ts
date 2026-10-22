import assert from 'node:assert/strict';
import { createGlobalCatalogue103, isGlobalWine103, type PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';

globalThis.fetch = async () => { throw Error('REAL_NETWORK_FORBIDDEN'); };
const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const input = { name: 'Synthetic Cuvee', producer: 'Independent Estate', vintage: 2020,
  evidence: ['Synthetic Cuvee', 'Independent Estate', '2020'] };
const row = (id: number): PublicGlobalRow103 => ({ id, name: input.name, winery: input.producer,
  slugname: `synthetic-${id}`, vintage: '2020' });
const page = (count: number, number = 1) => ({ count, page: number,
  results: Array.from({ length: Math.min(20, Math.max(0, count - (number - 1) * 20)) }, (_, i) => row((number - 1) * 20 + i + 1)) });
function host(responses: unknown[]) {
  const calls: string[] = [];
  const client = createGlobalCatalogue103(async (url, init) => {
    calls.push(String(url));
    assert(calls.length <= responses.length, 'Unexpected request');
    assert(String(url).startsWith(root));
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.referrerPolicy, 'no-referrer');
    assert.equal(init?.body, undefined); assert.deepEqual(init?.headers, { Accept: 'application/json' });
    return Response.json(responses[calls.length - 1]);
  });
  return { client, calls };
}
let groups = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => {
  await work(); groups++; console.log('PASS', name);
};
const damaged = { count: 2, page: 1, results: [row(1), { ...row(362891), slugname: '' }] };

await test('One empty slug retains only the independently validated, frozen incomplete proposal', async () => {
  const h = host([damaged]), result = await h.client.searchProposals(input.name);
  assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows.map(value => value.id), [1]);
  assert(Object.isFrozen(result.rows[0])); assert.equal(h.calls.length, 1);
  assert.equal(isGlobalWine103(input, result.rows[0]), false);
});
await test('Strict search, legacy partial search and both lookup modes still discard malformed pages', async () => {
  for (const partial of [false, true]) {
    const h = host([damaged]), result = await h.client.search(input.name, undefined, partial);
    assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows, []); assert.equal(h.calls.length, 1);
  }
  const flags = host([damaged]);
  assert.deepEqual((await flags.client.search(input.name, undefined, false, true)).rows, []);
  assert.equal(flags.calls.length, 1);
  for (const selectedId of [undefined, 1]) {
    const h = host([damaged, damaged]);
    assert.equal((await h.client.lookup(input, undefined, selectedId)).status, 'incomplete');
    assert.equal(h.calls.length, 2); assert(h.calls.every(url => new URL(url).searchParams.get('page') === '1'));
  }
});
await test('All row identity schemas remain strict inside proposal recovery', async () => {
  const invalid = [
    { slugname: '' }, { slugname: '../guessed' }, { id: -1 }, { name: '' }, { winery: '' },
    { vintage: '20200' }, { name: 'Bad\u202eName' }, { winery: 'Bad\nEstate' },
  ];
  for (const patch of invalid) {
    const h = host([{ count: 2, page: 1, results: [row(1), { ...row(2), ...patch }] }]);
    const result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows.map(value => value.id), [1]);
  }
});
await test('A later bad row retains valid rows from that page and the validated prefix, then stops', async () => {
  for (const failingPage of [2, 4]) {
    const responses = Array.from({ length: failingPage }, (_, i) => page(80, i + 1));
    responses[failingPage - 1].results[3] = { ...row(363580), slugname: '' };
    const h = host(responses), result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'incomplete'); assert.equal(result.rows.length, failingPage * 20 - 1);
    assert(!result.rows.some(value => value.id === 363580));
    assert(result.rows.every(value => Object.isFrozen(value))); assert.equal(h.calls.length, failingPage);
    assert.deepEqual(result.rows.map(value => value.id),
      Array.from({ length: failingPage * 20 }, (_, i) => i + 1).filter(id => id !== (failingPage - 1) * 20 + 4));
  }
});
await test('Untrusted later envelopes, count/page drift and wrong lengths add no rows', async () => {
  const second = page(40, 2);
  for (const bad of [null, { ...second, count: 41 }, { ...second, page: 1 }, { ...second, page: 3 },
    { ...second, results: second.results.slice(1) }, { ...second, results: [...second.results, row(41)] },
    { ...second, results: 'not-an-array' }, { ...second, count: -1 }]) {
    const h = host([page(40), bad]), result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows.map(value => value.id), page(40).results.map(value => value.id));
    assert.equal(h.calls.length, 2);
    assert.equal((await h.client.confirmSelection(input, second.results[0])).status, 'identity-required');
    assert.equal(h.calls.length, 2);
  }
});
await test('Malformed first envelopes admit nothing; a bounded short first page keeps only valid incomplete rows', async () => {
  for (const bad of [{ ...damaged, count: 1 }, { ...damaged, page: 2 }, { ...damaged, count: '2' },
    { ...damaged, results: Array.from({ length: 21 }, (_, i) => row(i + 1)) }]) {
    const h = host([bad]), result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows, []);
  }
  const h = host([{ count: 21, page: 1, results: [row(1)] }]), result = await h.client.searchProposals(input.name);
  assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows.map(value => value.id), [1]);
  assert.equal(h.calls.length, 1);
});
await test('Duplicate IDs remain ambiguous, including collisions hidden in invalid rows', async () => {
  for (const responses of [
    [{ count: 2, page: 1, results: [row(1), row(1)] }],
    [{ count: 3, page: 1, results: [row(1), row(1), { ...row(2), slugname: '' }] }],
    [{ count: 2, page: 1, results: [row(1), { ...row(1), slugname: '' }] }],
    [page(21), { count: 21, page: 2, results: [row(1)] }],
    [page(21), { count: 21, page: 2, results: [{ ...row(1), slugname: '' }] }],
  ]) {
    const h = host(responses), result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'ambiguous'); assert.deepEqual(result.rows, []);
  }
});
await test('Explicit valid selection from incomplete proposals still requires independent unchanged detail', async () => {
  const selected = row(1);
  for (const detail of [selected, { ...selected, id: 2 }, { ...selected, slugname: 'other' },
    { ...selected, name: 'Other Cuvee' }, { ...selected, winery: 'Other Estate' }, { ...selected, vintage: '2019' },
    { ...selected, vintage: null }, { ...selected, slugname: '' }]) {
    const h = host([damaged, detail]), result = await h.client.searchProposals(input.name), observed = result.rows[0];
    assert.equal((await h.client.confirmSelection(input, { ...observed })).status, 'identity-required');
    assert.equal((await h.client.confirmSelection({ ...input, producer: null }, observed)).status, 'identity-required');
    assert.equal((await h.client.confirmSelection({ ...input, vintage: 2019 }, observed)).status, 'identity-required');
    assert.equal((await h.client.confirmSelection({ ...input, evidence: [...input.evidence, 'Grand Cru'] }, observed)).status, 'identity-required');
    assert.equal(h.calls.length, 1);
    const confirmed = await h.client.confirmSelection(input, observed);
    assert.equal(h.calls.length, 2); assert.equal(h.calls[1], `${root}/1/synthetic-1`);
    if (detail === selected) {
      assert.equal(confirmed.status, 'exact'); assert('wine' in confirmed);
      assert(isGlobalWine103(input, confirmed.wine)); assert(Object.isFrozen(confirmed.wine));
    } else assert.equal(confirmed.status, detail.slugname === '' ? 'unavailable' : 'ambiguous');
  }
});
await test('Invalid, repaired or cloned rows cannot confirm or trigger detail requests', async () => {
  const h = host([damaged]), result = await h.client.searchProposals(input.name);
  for (const invalid of [damaged.results[1], { ...damaged.results[1], slugname: 'guessed' },
    { ...result.rows[0] }, { ...result.rows[0], slugname: '' }]) {
    assert.equal((await h.client.confirmSelection(input, invalid)).status, 'identity-required');
  }
  assert.equal(h.calls.length, 1);
});
await test('Clean searches retain complete/partial status and the four-page, eighty-row bound', async () => {
  for (const count of [0, 20, 21, 60, 61, 80, 81, 1000]) {
    const pages = count > 80 ? 1 : Math.max(1, Math.ceil(count / 20));
    const h = host(Array.from({ length: pages }, (_, i) => page(count, i + 1)));
    const result = await h.client.searchProposals(input.name);
    assert.equal(result.status, count > 80 ? 'partial' : 'complete');
    assert.equal(result.rows.length, count > 80 ? 20 : count); assert.equal(h.calls.length, pages);
    assert.deepEqual(h.calls.map(url => new URL(url).searchParams.get('page')), Array.from({ length: pages }, (_, i) => String(i + 1)));
  }
  const h = host([page(21)]), strict = await h.client.search(input.name);
  assert.equal(strict.status, 'incomplete'); assert.deepEqual(strict.rows, []); assert.equal(h.calls.length, 1);
});
await test('Later transport, JSON and body failures still discard the prefix as unavailable', async () => {
  for (const failure of [Response.json({}, { status: 500 }),
    new Response('{', { headers: { 'content-type': 'application/json' } }),
    new Response('x'.repeat(262145), { headers: { 'content-type': 'application/json' } })]) {
    let calls = 0;
    const client = createGlobalCatalogue103(async () => ++calls === 1 ? Response.json(page(21)) : failure);
    const result = await client.searchProposals(input.name);
    assert.equal(result.status, 'unavailable'); assert.deepEqual(result.rows, []); assert.equal(calls, 2);
  }
});
await test('Cancellation still rejects without admitting a prefix when fetch ignores AbortSignal', async () => {
  const controller = new AbortController(); let calls = 0;
  const client = createGlobalCatalogue103(async () => {
    if (++calls === 2) { controller.abort(); return new Promise<Response>(() => undefined); }
    return Response.json(page(21));
  });
  await assert.rejects(client.searchProposals(input.name, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 2);
});
await test('One unchanged twelve-second deadline still fails closed on later-page timeout', async () => {
  const original = globalThis.setTimeout, delays: number[] = [];
  let expire: () => void = () => undefined, calls = 0;
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    delays.push(delay); expire = callback; return original(() => undefined, 0);
  }) as typeof setTimeout;
  try {
    const client = createGlobalCatalogue103(async () => {
      if (++calls === 2) { expire(); return new Promise<Response>(() => undefined); }
      return Response.json(page(21));
    });
    const result = await client.searchProposals(input.name);
    assert.equal(result.status, 'unavailable'); assert.deepEqual(result.rows, []);
    assert.equal(calls, 2); assert.deepEqual(delays, [12000]);
  } finally { globalThis.setTimeout = original; }
});
console.log(JSON.stringify({ groups, passed: true, realNetworkCalls: 0, fixture: 'Synthetic proposal-only schema resilience' }));
