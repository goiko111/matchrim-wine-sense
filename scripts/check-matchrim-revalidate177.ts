import assert from 'node:assert/strict';
import { plan177, safeURL177 } from './revalidate-matchrim-public177';
import { sha112, loadCache112 } from './benchmark-matchrim-native112';

const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const url = (text: string, page = 1) => root + '?' + new URLSearchParams({ page: String(page), text, store: '1' });
const entry = (status: number, body: unknown) => {
  const bytes = Buffer.from(JSON.stringify(body));
  return { bytes, status, headers: { 'content-type': 'application/json' }, responseURL: url('Casa Atlas'),
    redirected: false, metadata: 'preserved' as const, sourceReceipt: 'synthetic/REQUESTS.json#response-001.json', sha256: sha112(bytes) };
};
let groups = 0;
const test = (name: string, work: () => void) => { work(); groups++; console.log('PASS', name); };
test('Only the observed public search route and exact bounded query shape are admitted', () => {
  assert.equal(safeURL177(url('Casa Atlas')), url('Casa Atlas'));
  for (const value of [url('Casa Atlas') + '&token=secret', url('Casa Atlas', 5), url('Casa Atlas').replace('https:', 'http:'),
    url('Casa Atlas').replace('app.winerim.com', 'other.invalid'), url('Casa Atlas') + '#fragment', url('Casa Atlas').replace('store=1', 'store=0')])
    assert.throws(() => safeURL177(value));
});
test('Repeated failures make one fresh check; successful or unrelated history does not allocate reads', () => {
  const a = url('Casa Atlas'), b = url('Different Casa');
  const cache: ReturnType<typeof loadCache112> = new Map([[a, entry(500, { status: 500 })], [b, entry(200, { count: 0, page: 1, results: [] })]]);
  const source = { rows: [{ pages: [{ query: 'Casa Atlas', status: 'unavailable' }, { query: 'Different Casa', status: 'complete' }] }], failures: [{ url: a }, { url: a }, { url: b }] };
  const planned = plan177(source, cache);
  assert.equal(planned.length, 1); assert.equal(planned[0].url, a); assert.equal(planned[0].purpose, 'http-recheck');
});
test('Malformed record checks retain the original observed page/ID, never guess a slug/detail route', () => {
  const a = url('Casa Atlas', 2);
  const cache: ReturnType<typeof loadCache112> = new Map([[a, entry(200, { count: 23, page: 2, results: [{ id: 23, slugname: '' }] })]]);
  const planned = plan177({ rows: [{ pages: [{ query: 'Casa Atlas', status: 'incomplete' }] }], failures: [] }, cache);
  assert.equal(planned.length, 1); assert.equal(planned[0].url, a); assert.deepEqual(planned[0].malformedIDs, [23]);
});
test('Missing receipts, unsafe routes and an oversized batch fail closed before any request', () => {
  assert.throws(() => plan177({ rows: [], failures: [{ url: url('Casa Atlas') }] }, new Map()));
  assert.throws(() => plan177({ rows: [], failures: [{ url: 'https://other.invalid' }] }, new Map()));
  const cache: ReturnType<typeof loadCache112> = new Map();
  const pages = Array.from({ length: 25 }, (_, i) => ({ query: 'Casa ' + i, status: 'unavailable' }));
  for (const page of pages) cache.set(url(page.query), entry(500, {}));
  assert.throws(() => plan177({ rows: [{ pages }], failures: pages.map(page => ({ url: url(page.query) })) }, cache));
});
console.log(JSON.stringify({ groups, publicGET: 0, models: 0, scope: 'Synthetic revalidation planning only; no fresh server status or recognition claim' }));
