import assert from 'node:assert/strict';
import { groupDuplicateWines, wineIdentityKey } from '../src/utils/userWineIdentity';

const row = (id: string, over: Record<string, unknown> = {}) => ({
  id, name: 'Muga Crianza', producer: 'Bodegas Muga', vintage: null as number | null, status: 'collection',
  created_at: `2026-07-13T10:00:0${id}Z`, quantity: 1 as number | null, matchrim_affinity: 79 as number | null,
  place_details: null as unknown, ...over,
});

assert.equal(wineIdentityKey(row('1')), wineIdentityKey(row('2', { name: ' MUGA  crianza ', producer: 'bodegas muga' })));
assert.equal(wineIdentityKey(row('1', { name: 'Albariño' })), wineIdentityKey(row('2', { name: 'albarino' })));
assert.notEqual(wineIdentityKey(row('1', { vintage: 2019 })), wineIdentityKey(row('2', { vintage: 2020 })));
assert.equal(wineIdentityKey(row('1', { place_details: { winerim_wine_id: 55 }, name: 'A' })), wineIdentityKey(row('2', { place_details: { winerim_wine_id: '55' }, name: 'B' })));

const rows = Array.from({ length: 13 }, (_, i) => row(String(i % 10), { id: `id${i}`, matchrim_affinity: i === 0 ? 0 : 79 }));
const grouped = groupDuplicateWines(rows);
assert.equal(grouped.length, 1);
assert.equal(grouped[0].quantity, 13);
assert.equal(grouped[0].duplicate_ids.length, 13);
assert.equal(grouped[0].matchrim_affinity, 79, 'prefers a row with affinity > 0');
assert.equal(rows.length, 13, 'input is untouched');

const mixed = groupDuplicateWines([row('1'), row('2', { status: 'wishlist' }), row('3', { name: 'Otro' }), row('4', { name: '' })]);
assert.equal(mixed.length, 4, 'other list, other wine and unnamed rows stay apart');
console.log('User wine identity checks passed');
