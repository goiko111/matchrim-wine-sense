import assert from 'node:assert/strict';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';
import { rankGlobalProposals104 } from '../src/utils/globalWineProposals104';

const row = (id = 1) => ({ id, name: 'Synthetic Cuvee', winery: 'Synthetic Producer',
  vintage: null, slugname: 'Synthetic-Cuvee', subname: null, type: 'tinto', region: null, country: null });
const response = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200, headers: { 'content-type': 'application/json' },
});
const client = (rows: unknown[]) => createGlobalCatalogue103(async () => response({ count: rows.length, page: 1, results: rows }));
let groups = 0;
const test = async (name: string, work: () => Promise<void>) => { await work(); groups++; console.log('PASS ' + name); };

await test('Only response-name horizontal tabs become token-separating spaces', async () => {
  const original = { ...row(), name: 'Synthetic\t\tCuvee' };
  const result = await client([original]).searchProposals('Synthetic');
  assert.equal(result.status, 'complete'); assert.equal(result.rows[0].name, 'Synthetic Cuvee');
  assert.equal(original.name, 'Synthetic\t\tCuvee');
  const normal = await client([row()]).searchProposals('Synthetic');
  assert.deepEqual(result.rows, normal.rows);
});
await test('Observed nonempty year-only slugs remain opaque bounded routes, not vintage evidence', async () => {
  for (const slug of ['_1900', '_2020', '_2099']) {
    const result = await client([{ ...row(), slugname: slug }]).searchProposals('Synthetic');
    assert.equal(result.status, 'complete', slug); assert.equal(result.rows[0].slugname, slug);
    assert.equal(result.rows[0].vintage, null, 'Never infer a vintage from the slug');
  }
});
await test('Year-only slug on page two must not discard a complete bounded search', async () => {
  const pages: number[] = [];
  const service = createGlobalCatalogue103(async input => {
    const page = Number(new URL(String(input)).searchParams.get('page')); pages.push(page);
    const results = page === 1 ? Array.from({ length: 20 }, (_, i) => row(i + 1)) : [{ ...row(21), slugname: '_2020' }];
    return response({ count: 21, page, results });
  });
  const result = await service.searchProposals('Synthetic');
  assert.equal(result.status, 'complete'); assert.equal(result.rows.length, 21); assert.deepEqual(pages, [1, 2]);
  assert.equal((await service.search('Synthetic')).status, 'incomplete', 'No expansion of automatic identity scope');
});
await test('Controls, empty identity and unsafe/empty routes still invalidate a page', async () => {
  for (const invalid of [{ name: '' }, { name: '\t\t' }, { name: 'Synthetic\nCuvee' }, { name: 'Synthetic\u0000Cuvee' },
    { name: 'Synthetic\u202eCuvee' }, { name: 'Synthetic\u2066Cuvee' }, { name: 'a'.repeat(241) },
    { winery: 'Synthetic\tProducer' }, { slugname: '' }, { slugname: '_2020/other' }, { slugname: '../_2020' },
    { slugname: '_2020?x=1' }, { slugname: '_1899' }, { slugname: '_2100' }, { slugname: '_20201' }, { slugname: '_name' }]) {
    const result = await client([{ ...row(), ...invalid }]).searchProposals('Synthetic');
    assert.equal(result.status, 'incomplete', JSON.stringify(invalid)); assert.equal(result.rows.length, 0);
  }
});
await test('Tab normalization is response-only, never a way to admit unsafe queries', async () => {
  let calls = 0;
  const service = createGlobalCatalogue103(async () => { calls++; return response({ count: 0, page: 1, results: [] }); });
  assert.equal((await service.searchProposals('Synthetic\tCuvee')).status, 'identity-required');
  assert.equal(calls, 0);
});
await test('Parsing a response does not bypass grape identity or vintage conflicts', async () => {
  const result = await client([{ ...row(), name: 'Synthetic\tChardonnay', vintage: '2020', slugname: '_2020' }]).searchProposals('Synthetic');
  assert.equal(result.status, 'complete');
  assert.deepEqual(rankGlobalProposals104(['Synthetic', 'MALBEC', 'Synthetic Producer'], result.rows), []);
  assert.deepEqual(rankGlobalProposals104(['Synthetic', 'Chardonnay', 'Synthetic Producer'], result.rows, 2021), []);
});
await test('New response formats do not bypass HTTP failure and broad-search completeness gates', async () => {
  for (const status of [500, 403]) {
    const service = createGlobalCatalogue103(async () => new Response('{}', { status, headers: { 'content-type': 'application/json' } }));
    assert.equal((await service.searchProposals('Synthetic')).status, 'unavailable');
  }
  const service = createGlobalCatalogue103(async () => response({ count: 61, page: 1, results: Array.from({ length: 20 }, (_, i) => row(i + 1)) }));
  assert.equal((await service.searchProposals('Synthetic')).status, 'partial');
});
console.log(JSON.stringify({ groups, networkCalls: 0, modelStarts: 0, scope: 'Controlled response-format regressions; no real identity or catalogue accuracy claim.' }));
