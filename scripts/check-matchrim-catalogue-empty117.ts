import assert from 'node:assert/strict';
import { createGlobalCatalogue103 } from '../src/utils/nativeGlobalCatalogue103';

const row = (id = 1) => ({ id, name: 'Synthetic Cuvee', winery: 'Synthetic Producer',
  vintage: null, slugname: 'Synthetic-Cuvee', subname: null, type: 'tinto', region: null, country: null });
let groups = 0;
const check = async (name: string, run: () => Promise<void>) => { await run(); groups++; console.log('PASS ' + name); };
const client = (rows: unknown[]) => createGlobalCatalogue103(async () => new Response(JSON.stringify({ count: rows.length, page: 1, results: rows }),
  { status: 200, headers: { 'content-type': 'application/json' } }));

await check('Empty optional display metadata normalizes to null, never an inferred value', async () => {
  for (const field of ['subname', 'region', 'country', 'type'] as const) {
    for (const value of ['', '   ']) {
      const result = await client([{ ...row(), [field]: value }]).searchProposals('Synthetic');
      assert.equal(result.status, 'complete', field + ':' + JSON.stringify(value));
      assert.equal(result.rows.length, 1); assert.equal(result.rows[0][field], null);
    }
  }
});
await check('A blank optional subname on page two must not discard twenty valid page-one references', async () => {
  const calls: string[] = [];
  const service = createGlobalCatalogue103(async input => {
    const url = new URL(String(input)); calls.push(url.href);
    const page = Number(url.searchParams.get('page'));
    const rows = page === 1 ? Array.from({ length: 20 }, (_, i) => row(i + 1)) : [{ ...row(21), subname: '   ' }];
    return new Response(JSON.stringify({ count: 21, page, results: rows }), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  const result = await service.searchProposals('Synthetic'); assert.equal(result.status, 'complete');
  assert.equal(result.rows.length, 21); assert.equal(result.rows[20].subname, null); assert.equal(calls.length, 2);
  const automatic = await service.search('Synthetic'); assert.equal(automatic.status, 'incomplete');
});
await check('Empty identity, invalid years and unsafe optional strings still fail closed', async () => {
  for (const invalid of [{ name: '' }, { name: ' ' }, { winery: '   ' }, { slugname: '' }, { vintage: '' },
    { subname: '\n' }, { subname: ' '.repeat(241) }, { subname: '\u202e' }, { region: 0 }, { country: {} }]) {
    const result = await client([{ ...row(), ...invalid }]).searchProposals('Synthetic');
    assert.equal(result.status, 'incomplete', JSON.stringify(invalid)); assert.equal(result.rows.length, 0);
  }
});
await check('Real qualifiers remain literal and are never removed as blank metadata', async () => {
  const result = await client([{ ...row(), subname: '  Gran Reserva  ' }]).searchProposals('Synthetic');
  assert.equal(result.status, 'complete'); assert.equal(result.rows[0].subname, 'Gran Reserva');
});
console.log(JSON.stringify({ groups, networkCalls: 0, modelStarts: 0,
  scope: 'Production catalogue parser with controlled synthetic HTTP pages, not real identities or sensory evidence' }));
