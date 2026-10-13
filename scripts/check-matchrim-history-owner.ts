import assert from 'node:assert/strict';
import { isMatchrimLocalOwner, reconcileMatchrimLocalOwner } from '../src/utils/matchrimLocalOwner';
import { getScanHistory, recordOwnedScanHistory, type ScanHistoryItem } from '../src/utils/scanHistory';

const values = new Map<string, string>();
let emitted = 0;
const storage = {
  get length() { return values.size; },
  key: (i: number) => [...values.keys()][i] ?? null,
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: storage, dispatchEvent: () => { emitted++; } } });
const ownerKey = 'matchrim.local_profile_owner.v1';
const historyKey = 'matchrim.scan_history.v1';
const item: ScanHistoryItem = { id: 'fixture-history', type: 'shop-link', title: 'Synthetic history', createdAt: 1, route: '/escanear/encontrar-vino' };
let checks = 0;
const check = (name: string, actual: unknown, expected: unknown) => { assert.deepEqual(actual, expected, name); checks++; };

storage.setItem(historyKey, JSON.stringify([item]));
check('unattributed history hidden from authenticated reader', getScanHistory('A'), []);
check('unattributed history hidden from anonymous reader', getScanHistory(null), []);
check('read does not remove legacy data', values.has(historyKey), true);
check('missing owner cannot write', recordOwnedScanHistory({ ownerId: 'A', isCurrent: () => true }, item), null);
reconcileMatchrimLocalOwner('A');
check('existing missing-owner login cleanup retained', values.has(historyKey), false);
check('A current marker', isMatchrimLocalOwner('A'), true);
check('anonymous is not A', isMatchrimLocalOwner(null), false);
let current = true;
const context = { ownerId: 'A', isCurrent: () => current };
const saved = recordOwnedScanHistory(context, item);
check('current writer', saved?.id, item.id);
check('current reader', getScanHistory('A').length, 1);
check('foreign reader', getScanHistory('B'), []);
check('foreign read does not delete', getScanHistory('A').length, 1);
current = false;
const beforeStale = emitted;
check('unmounted writer blocked', recordOwnedScanHistory(context, { ...item, id: 'late' }), null);
check('no obsolete event', emitted, beforeStale);
storage.setItem('matchrim.scan_privacy_notice.v2', 'accepted');
storage.setItem('unrelated.fixture', 'preserved');
reconcileMatchrimLocalOwner('B');
check('existing account switch clears history', getScanHistory('B'), []);
check('captured A cannot write into B', recordOwnedScanHistory({ ownerId: 'A', isCurrent: () => true }, item), null);
check('privacy policy unchanged', storage.getItem('matchrim.scan_privacy_notice.v2'), 'accepted');
check('unrelated data untouched', storage.getItem('unrelated.fixture'), 'preserved');
reconcileMatchrimLocalOwner('A');
check('A-B-A obsolete lifetime blocked', recordOwnedScanHistory(context, item), null);
recordOwnedScanHistory({ ownerId: 'A', isCurrent: () => true }, item);
reconcileMatchrimLocalOwner('A');
check('same-owner reconciliation preserves current history', getScanHistory('A').length, 1);
reconcileMatchrimLocalOwner(null, true);
check('signout retains existing clear policy', getScanHistory(null), []);
recordOwnedScanHistory({ ownerId: null, isCurrent: () => true }, item);
check('anonymous current history supported', getScanHistory(null).length, 1);
reconcileMatchrimLocalOwner('A');
check('anonymous history not adopted on login', getScanHistory('A'), []);
for (let i = 0; i < 10; i++) recordOwnedScanHistory({ ownerId: 'A', isCurrent: () => true }, { ...item, id: `synthetic-${i}` });
check('existing eight-item retention unchanged', getScanHistory('A').length, 8);
check('latest first', getScanHistory('A')[0].id, 'synthetic-9');
storage.setItem(historyKey, '{invalid');
check('malformed cache is empty', getScanHistory('A'), []);
Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw new Error('unavailable synthetic storage'); } });
check('unavailable cache fails closed for reader', getScanHistory('A'), []);
check('unavailable cache fails closed for writer', recordOwnedScanHistory({ ownerId: 'A', isCurrent: () => true }, item), null);
console.log(JSON.stringify({ scope: 'local synthetic history ownership/retention contract, not auth or RLS', passed: checks }));
