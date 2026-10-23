import assert from 'node:assert/strict';
import { bundle180 } from './package-matchrim-pending180';
import { sha112, type loadCache112 } from './benchmark-matchrim-native112';

const query = 'Atlas';
const url = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines?page=1&text=Atlas&store=1';
const row = { imageId: 'img-001', inputSHA256: 'a'.repeat(64), eligible: false, queries: [query],
  reading: { lines: [{ text: 'ATLAS' }] }, pages: [{ query, status: 'partial', rows: 20 }] };
const entry = (body: unknown) => {
  const bytes = Buffer.from(JSON.stringify(body));
  return { bytes, status: 200, headers: { 'content-type': 'application/json' }, responseURL: url, redirected: false,
    metadata: 'preserved' as const, sourceReceipt: '/synthetic/REQUESTS.json#response-001.json', sha256: sha112(bytes) };
};
const cache: ReturnType<typeof loadCache112> = new Map([[url, entry({ count: 96, page: 1, results: [] })]]);
assert.equal(bundle180([row], cache).broadOnlyCases, 1);
const result = bundle180([{ ...row, expected: 'MUST_NOT_BE_USED', proposals: ['MUST_NOT_BE_USED'] } as typeof row], cache);
assert(!JSON.stringify(result).includes('MUST_NOT_BE_USED'));
assert.equal(result.cases[0].confirmedIdentity, null); assert.equal(result.cases[0].affinity, null);
assert.throws(() => bundle180([row], new Map()));
assert.throws(() => bundle180([row, row], cache));
const broken: ReturnType<typeof loadCache112> = new Map([[url, entry({ count: 60, page: 1,
  results: [{ id: 7, name: 'Atlas', winery: 'Casa', vintage: null, slugname: '' }] })]]);
const defect = bundle180([{ ...row, pages: [{ query, status: 'incomplete', rows: 0 }] }], broken);
assert.equal(defect.sourceRepairsRequired[0].namespace, 'winerim-public-store');
assert.equal(defect.sourceRepairsRequired[0].guessedReplacement, null);
assert.throws(() => bundle180([row], new Map([[url.replace('app.winerim.com', 'other.invalid'), cache.get(url)!]])));
const wrongPage: ReturnType<typeof loadCache112> = new Map([[url, entry({ count: 60, page: 2, results: [] })]]);
assert.throws(() => bundle180([row], wrongPage));
console.log('PASS 8 pending-case evidence assertions; no network or expected-identity leakage');
