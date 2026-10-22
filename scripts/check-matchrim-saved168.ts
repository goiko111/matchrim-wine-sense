import assert from 'node:assert/strict';
import { nativeSavedCatalogue168 } from '../src/utils/nativeSavedCatalogue168';
import { nativeCataloguePage163 } from '../src/utils/nativeCataloguePage163';
import { nativeVerdictsSnapshot159 } from '../src/utils/nativeRescanVerdict159';
import type { PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';
const rows: PublicGlobalRow103[] = Array.from({ length: 23 }, (_, i) => ({ id: i + 1, name: 'Synthetic Cuvee', winery: 'Synthetic Estate',
  vintage: '2022', slugname: 'Synthetic-Cuvee_2022', region: 'Synthetic Valley', country: 'ES' }));
const bottle = { name: rows[22].name, producer: rows[22].winery, vintage: 2022, region: rows[22].region ?? null, country: rows[22].country ?? null };
const saved = { ...bottle, id: 'saved-a', user_id: 'owner-a', rating: 'love', sensory_attributes: null,
  place_details: { winerim_public_catalogue: { version: 1, namespace: 'winerim-public-store', id: 23,
    slug: rows[22].slugname, catalogue_vintage: '2022', bottle_identity: bottle } } };
const snapshot = nativeVerdictsSnapshot159('owner-a', [saved], 1);
const known = nativeSavedCatalogue168('owner-a', snapshot, rows);
assert.deepEqual([...known], [23]);
const page = nativeCataloguePage163(rows, '2022', 0, known);
assert.deepEqual(page.rows.map(row => row.id), [23, 1, 2]);
const all = Array.from({ length: 8 }, (_, i) => nativeCataloguePage163(rows, 'all', i, known).rows).flat();
assert.equal(new Set(all.map(row => row.id)).size, 23); assert.equal(all.length, 23);
assert.equal(all[0], rows[22]); assert.equal(rows[0].id, 1);
for (const owner of [null, '', 'owner-b']) assert.equal(nativeSavedCatalogue168(owner, snapshot, rows).size, 0);
assert.equal(nativeSavedCatalogue168('owner-a', { ...snapshot, status: 'unavailable' }, rows).size, 0);
for (const mutation of [
  row => { row.id = 999; }, row => { row.slugname = 'Different'; }, row => { row.vintage = '2021'; }, row => { row.vintage = null; },
  row => { row.name = 'Another Cuvee'; }, row => { row.name = 'Synthetic Cuvee Reserve'; }, row => { row.winery = 'Another Estate'; },
  row => { row.region = 'Different Valley'; }, row => { row.country = 'FR'; }, row => { row.subname = 'Reserva'; },
]) {
  const changed = { ...rows[22] }; mutation(changed);
  assert.equal(nativeSavedCatalogue168('owner-a', snapshot, [changed]).size, 0);
}
const forged = structuredClone(saved); forged.place_details.winerim_public_catalogue.bottle_identity.name = 'Forged';
assert.equal(nativeSavedCatalogue168('owner-a', nativeVerdictsSnapshot159('owner-a', [forged], 1), rows).size, 0);
assert.equal(nativeSavedCatalogue168('owner-a', { ...snapshot, rows: [{ ...snapshot.rows[0], user_id: 'other' }] }, rows).size, 0);
const prefix = { ...bottle, name: 'Synthetic Estate Synthetic Cuvee' };
const prefixed = { ...saved, ...prefix, place_details: { winerim_public_catalogue: { ...saved.place_details.winerim_public_catalogue, bottle_identity: prefix } } };
assert.deepEqual([...nativeSavedCatalogue168('owner-a', nativeVerdictsSnapshot159('owner-a', [prefixed], 1), rows)], [23]);
assert.deepEqual(nativeCataloguePage163(rows, 'all', 0).rows, rows.slice(0, 3));
console.log(JSON.stringify({ passed: true, groups: 20, network: 0, modelStarts: 0, scope: 'Owner/ID/vintage/identity-bound presentation only; no canonical mapping or verdict mutation' }));
