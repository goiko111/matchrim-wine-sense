import assert from 'node:assert/strict';
import { failedURLs165 } from './probe-matchrim-public165';
const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const url = (q: string) => root + '?' + new URLSearchParams({ page: '1', text: q, store: '1' });
const row = (u: string) => ({ reason: 'CACHED_PUBLIC_HTTP_OR_CONTENT_TYPE_FAILURE', url: u });
assert.deepEqual(failedURLs165({ failures: [row(url('One')), row(url('One')), row(url('Two')), { reason: 'different', url: url('Ignored') }] }, 6), [url('One'), url('Two')]);
assert.equal(failedURLs165({ failures: Array.from({ length: 21 }, (_, i) => row(url(String(i)))) }, 6).length, 6);
for (const count of [0, 7, NaN, Infinity, 1.2]) assert.throws(() => failedURLs165({ failures: [] }, count));
for (const value of ['https://example.com/', url('One') + '&other=1', url('One').replace('page=1', 'page=2'),
  url('One') + '#x', url('One').replace('https://', 'https://user@'), url('').replace('text=', 'text=')]) assert.throws(() => failedURLs165({ failures: [row(value)] }, 6));
console.log(JSON.stringify({ passed: true, guards: 13, networkRequests: 0, modelStarts: 0 }));
