import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';

globalThis.fetch = async () => { throw new Error('NO_NETWORK_IN_COLLISION_REGRESSION'); };
const fixture = JSON.parse(readFileSync(new URL('../qa-fixtures/consumer95/catalogue-collisions101.observed.json', import.meta.url), 'utf8'));
let checks = 0;
for (const item of fixture.cases) {
  for (const candidate of item.candidates) {
    assert.equal(isSafeCanonicalLabelMatch(item.input, candidate), false, `${item.input.name}: wrong producer must never inherit sensory attributes`);
    checks++;
  }
}
// Synthetic positive controls ensure the rejection isn't a blanket catalogue ban.
const input = { name: 'Luna Reserva', producer: 'Bodegas Viña Clara', vintage: 2022 };
assert.equal(isSafeCanonicalLabelMatch(input, { ...input, producer: 'Vina Clara S.L.', name: 'Luna Reserva 2022' }), true);
assert.equal(isSafeCanonicalLabelMatch(input, { ...input, vintage: 2021 }), false);
assert.equal(isSafeCanonicalLabelMatch(input, { ...input, name: 'Luna Gran Reserva' }), false);
assert.equal(isSafeCanonicalLabelMatch(input, { ...input, producer: 'Viña Oscura' }), false);
checks += 4;
console.log(JSON.stringify({ checks, passed: true, observedCollisionRows: 7, positiveControls: 'synthetic',
  networkCalls: 0, paidCalls: 0, productionMutation: false, fullCatalogueCoverageClaim: false }));
