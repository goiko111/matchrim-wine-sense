import assert from 'node:assert/strict';
import { pinCache179 } from './pin-matchrim-cache179';
import { loadCache112 } from './benchmark-matchrim-native112';

const sourceReceipt = '/synthetic/new/REQUESTS.json#response-001.json';
const a = { bytes: Buffer.from('{}'), status: 200, headers: {}, responseURL: 'https://example.invalid/a', redirected: false,
  metadata: 'preserved' as const, sourceReceipt, sha256: 'new-hash' };
const b = { ...a, status: 500, sourceReceipt: '/synthetic/old/REQUESTS.json#response-001.json', sha256: 'old-hash' };
const receipt = { url: a.responseURL, sourceReceipt, sha256: a.sha256, metadata: a.metadata };
const loader: typeof loadCache112 = (_repo, folders) => new Map([[a.responseURL, folders[0] === '/synthetic/new' ? a : b]]);
assert.equal(pinCache179('/repo', [receipt], loader).get(a.responseURL), a);
assert.equal(pinCache179('/repo', [receipt, receipt], loader).size, 1);
assert.throws(() => pinCache179('/repo', [{ ...receipt, sha256: 'wrong' }], loader));
assert.throws(() => pinCache179('/repo', [{ ...receipt, metadata: 'legacy-assumedJSON' }], loader));
assert.throws(() => pinCache179('/repo', [{ ...receipt, sourceReceipt: 'relative/REQUESTS.json#response-001.json' }], loader));
assert.throws(() => pinCache179('/repo', [receipt, { ...receipt, sourceReceipt: b.sourceReceipt, sha256: b.sha256 }], loader));
console.log('PASS 6 exact response replay assertions; old manifests cannot shadow current receipts');
