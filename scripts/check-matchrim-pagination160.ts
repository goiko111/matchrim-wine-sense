import assert from 'node:assert/strict';
import { applyGlobalCatalogue103, createGlobalCatalogue103, type PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
import { rankGlobalProposals104 } from '../src/utils/globalWineProposals104';
import type { WineCandidate } from '../src/utils/multiWineScan';

globalThis.fetch = async () => { throw Error('REAL_NETWORK_FORBIDDEN'); };
const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const row = (index: number): PublicGlobalRow103 => ({ id: index + 1, name: `Unrelated Reference ${index}`,
  winery: 'Separate Winery', slugname: `reference-${index}`, vintage: null });
const page = (count: number, number: number) => ({ count, page: number,
  results: Array.from({ length: Math.min(20, Math.max(0, count - (number - 1) * 20)) }, (_, i) => row((number - 1) * 20 + i)) });
type Page = ReturnType<typeof page>;
function rig(count: number, mutate: (value: Page) => Page = value => value) {
  const calls: URL[] = [];
  const client = createGlobalCatalogue103(async (input, init) => {
    const url = new URL(String(input)); calls.push(url);
    assert.equal(url.origin + url.pathname, root); assert.equal(url.searchParams.get('store'), '1');
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.referrerPolicy, 'no-referrer');
    assert.equal(init?.body, undefined); assert(calls.length <= 4);
    return Response.json(mutate(page(count, Number(url.searchParams.get('page')))));
  });
  return { client, calls };
}
let groups = 0;
const test = async (name: string, work: () => void | Promise<void>) => {
  await work(); groups++; console.log('PASS', name);
};
const input = { name: 'Pagination Cuvee', producer: 'Independent Estate', vintage: 2020,
  evidence: ['Pagination Cuvee', 'Independent Estate', '2020'] };
const target: PublicGlobalRow103 = { ...row(999), name: input.name, winery: input.producer };
const candidate: WineCandidate = { ...input, id: 'pagination-test', source: 'label', confidence: .8,
  region: null, country: null, grapes: [], alcohol: null, inferredFields: [], uncertaintyReasons: [] };

await test('Counts 0 through 80 retain complete bounded pagination, including the new fourth page', async () => {
  for (const count of [0, 20, 21, 60, 61, 80]) {
    const h = rig(count), result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'complete'); assert.equal(result.rows.length, count);
    assert.deepEqual(h.calls.map(url => Number(url.searchParams.get('page'))),
      Array.from({ length: Math.max(1, Math.ceil(count / 20)) }, (_, i) => i + 1));
    assert(result.rows.every(value => Object.isFrozen(value)));
  }
});
await test('Counts above 80 remain partial after one page, never mislabeled complete', async () => {
  for (const count of [81, 1000]) {
    const h = rig(count), result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'partial'); assert.equal(result.rows.length, 20); assert.equal(h.calls.length, 1);
  }
});
await test('Normal search and automatic lookup remain strict first-page operations', async () => {
  const h = rig(61), result = await h.client.search(input.name);
  assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows, []); assert.equal(h.calls.length, 1);
  const lookup = rig(61);
  assert.equal((await lookup.client.lookup(input)).status, 'incomplete');
  assert.deepEqual(lookup.calls.map(url => url.searchParams.get('text')), [input.name, input.producer]);
  assert(lookup.calls.every(url => url.searchParams.get('page') === '1'));
});
await test('Count/page drift, short pages and invalid slugs reject the entire retrieval', async () => {
  const mutations: ((value: Page) => Page)[] = [
    value => ({ ...value, count: 79 }),
    value => ({ ...value, page: value.page + 1 }),
    value => ({ ...value, results: value.results.slice(1) }),
    value => ({ ...value, results: value.results.map((wine, i) => i === 0 ? { ...wine, slugname: '' } : wine) }),
  ];
  for (const failingPage of [2, 4]) for (const mutate of mutations) {
    const h = rig(80, value => value.page === failingPage ? mutate(value) : value);
    const result = await h.client.searchProposals(input.name);
    assert.equal(result.status, 'incomplete'); assert.deepEqual(result.rows, []); assert.equal(h.calls.length, failingPage);
  }
  const h = rig(61, value => value.page === 1 ? { ...value, results: value.results.slice(1) } : value);
  assert.equal((await h.client.searchProposals(input.name)).status, 'incomplete'); assert.equal(h.calls.length, 1);
});
await test('A duplicate ID crossing into the fourth page remains ambiguous with no selectable rows', async () => {
  const h = rig(80, value => value.page === 4
    ? { ...value, results: value.results.map((wine, i) => i === 0 ? { ...wine, id: 1 } : wine) } : value);
  const result = await h.client.searchProposals(input.name);
  assert.equal(result.status, 'ambiguous'); assert.deepEqual(result.rows, []); assert.equal(h.calls.length, 4);
});
await test('Cancellation on page four rejects even when the transport ignores AbortSignal', async () => {
  const controller = new AbortController(); let calls = 0;
  const client = createGlobalCatalogue103(async () => {
    if (++calls === 4) { controller.abort(); return new Promise<Response>(() => undefined); }
    return Response.json(page(80, calls));
  });
  await assert.rejects(client.searchProposals(input.name, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 4);
});
await test('All four pages share one unchanged 12000ms deadline, with no partial success on expiry', async () => {
  const original = globalThis.setTimeout; const delays: number[] = []; let expire: () => void = () => undefined, calls = 0;
  globalThis.setTimeout = ((callback: () => void, delay: number) => {
    delays.push(delay); expire = callback; return original(() => undefined, 0);
  }) as typeof setTimeout;
  try {
    const client = createGlobalCatalogue103(async () => {
      if (++calls === 4) { expire(); return new Promise<Response>(() => undefined); }
      return Response.json(page(80, calls));
    });
    const result = await client.searchProposals(input.name);
    assert.equal(result.status, 'unavailable'); assert.deepEqual(result.rows, []);
    assert.equal(calls, 4); assert.deepEqual(delays, [12000]);
  } finally { globalThis.setTimeout = original; }
});
await test('Fourth-page HTTP failures and oversized bodies never return earlier selectable rows', async () => {
  for (const response of [Response.json({}, { status: 500 }),
    new Response('x'.repeat(262145), { headers: { 'content-type': 'application/json' } })]) {
    let calls = 0;
    const client = createGlobalCatalogue103(async () => ++calls === 4 ? response : Response.json(page(80, calls)));
    const result = await client.searchProposals(input.name);
    assert.equal(result.status, 'unavailable'); assert.deepEqual(result.rows, []); assert.equal(calls, 4);
  }
});
await test('Both 80-row query batches reach ranking position 160, but position 161 is excluded', () => {
  for (const index of [120, 159, 160]) {
    const rows = Array.from({ length: index + 1 }, (_, i) => i === index ? target : row(i));
    const proposals = rankGlobalProposals104(input.evidence, rows, input.vintage);
    assert.deepEqual(proposals.map(value => value.row.id), index < 160 ? [target.id] : []);
  }
  for (const [evidence, wine] of [
    [input.evidence, { ...target, vintage: '2019' }],
    [[...input.evidence, 'Grand Cru'], target],
    [input.evidence, { ...target, name: 'Other Identity' }],
  ] as const) {
    assert.deepEqual(rankGlobalProposals104(evidence, [...Array.from({ length: 159 }, (_, i) => row(i)), wine], 2020), []);
  }
});
await test('A fourth-page proposal still requires observed selection and independent detail verification', async () => {
  const selected = { ...target, id: 80 }, sensory = { power: 4, acidity: 3, sweetness: 0, tannin: 2, fruity: 4 };
  for (const detail of [selected, { ...selected, name: 'Other Identity' }, { ...selected, vintage: '2019' },
    { ...selected, winery: 'Other Estate' }, { ...selected, slugname: 'other-slug' }]) {
    let calls = 0;
    const client = createGlobalCatalogue103(async url => {
      calls++;
      if (calls > 4) { assert.equal(String(url), `${root}/${selected.id}/${selected.slugname}`);
        return Response.json({ ...detail, tastingAttributes: sensory }); }
      const value = page(80, calls);
      if (calls === 4) value.results[19] = selected;
      return Response.json(value);
    });
    const results = await client.searchProposals(input.name), observed = results.rows[79];
    assert.equal((await client.confirmSelection(input, { ...observed })).status, 'identity-required');
    assert.equal((await client.confirmSelection({ ...input, producer: null }, observed)).status, 'identity-required');
    assert.equal((await client.confirmSelection({ ...input, evidence: [...input.evidence, 'Grand Cru'] }, observed)).status, 'identity-required');
    assert.equal(calls, 4);
    const confirmed = await client.confirmSelection(input, observed);
    assert.equal(calls, 5);
    if (detail === selected) {
      assert.equal(confirmed.status, 'reference'); assert('wine' in confirmed);
      const applied = applyGlobalCatalogue103(candidate, null, confirmed.wine, true);
      assert.equal(applied.canonicalId, null); assert.equal(applied.sensoryAttributes, null); assert.equal(applied.affinity, null);
      assert.equal(confirmed.wine.namespace, 'winerim-public-store');
    } else assert.equal(confirmed.status, 'ambiguous');
  }
});
console.log(JSON.stringify({ groups, passed: true, realNetworkCalls: 0, diskWrites: 0, full200Runs: 0 }));
