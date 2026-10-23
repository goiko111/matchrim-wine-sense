import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { plan178 } from './complete-matchrim-public178';
import { loadCache112, sha112 } from './benchmark-matchrim-native112';

const root = 'https://app.winerim.com/api/v1/restaurant/00000000-0000-0000-0000-000000000001/wines';
const url = (name: string) => root + '?' + new URLSearchParams({ page: '1', text: name, store: '1' });
const cache: ReturnType<typeof loadCache112> = new Map();
const item = (name: string, count: number, page = 1, length = 20) => {
  const bytes = Buffer.from(JSON.stringify({ count, page, results: Array.from({ length }, (_, id) => ({ id })) }));
  cache.set(url(name), { bytes, status: 200, headers: {}, responseURL: url(name), redirected: false,
    metadata: 'preserved', sourceReceipt: 'synthetic', sha256: sha112(bytes) });
  return { url: url(name), purpose: 'http-recheck', oldStatus: 500, newStatus: 200, newSHA256: sha112(bytes) };
};
const parent = (results: ReturnType<typeof item>[], actualFreshGET = 22) => ({ results, actualFreshGET, maximumFreshGET: 24, held: false });
const small = item('Atlas', 30), large = item('Casa', 60), huge = item('Other', 81);
assert.equal(plan178(parent([small]), cache)[0].expectedRows, 10);
assert.deepEqual(plan178(parent([large]), cache).map(page => page.page), [2, 3]);
assert.equal(plan178(parent([small, large, huge, small]), cache).length, 1);
assert.equal(plan178(parent([small], 24), cache).length, 0);
assert.equal(plan178(parent([huge, item('Wrong', 30, 2), item('Short', 30, 1, 5)]), cache).length, 0);
assert.equal(plan178(parent([{ ...small, purpose: 'schema-recheck' }]), cache).length, 0);
assert.throws(() => plan178({ ...parent([small]), held: true }, cache));
assert.throws(() => plan178(parent([small], 25), cache));
assert.throws(() => plan178(parent([{ ...small, newSHA256: 'wrong' }]), cache));
const retained = path.resolve('qa-artifacts/continuation176-20261023/public177-live-r1');
if (fs.existsSync(retained + '/REPORT.json')) {
  const actual = JSON.parse(fs.readFileSync(retained + '/REPORT.json', 'utf8'));
  const planned = plan178(actual, loadCache112(process.cwd(), [retained]));
  assert(actual.actualFreshGET + planned.length <= 24);
  console.log('PASS actual fresh receipt planning integration; no additional network');
}
console.log('PASS 9 bounded followup assertions; zero network, expected identities or additional reservation');
