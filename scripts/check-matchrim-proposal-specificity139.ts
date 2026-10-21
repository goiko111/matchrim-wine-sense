import assert from 'node:assert/strict';
import { rankGlobalProposals104 as rank } from '../src/utils/globalWineProposals104';
import type { PublicGlobalRow103 } from '../src/utils/nativeGlobalCatalogue103';

const row = (id: number, name: string, grapes: string[] = []): PublicGlobalRow103 => ({
  id, name, winery: 'Casa Atlas', slugname: `synthetic-${id}`, vintage: null, grapes,
});
let groups = 0;
const test = (name: string, run: () => void) => { run(); groups++; console.log('PASS ' + name); };
test('At equal existing scores, a fully read blend precedes a generic varietal without deleting it', () => {
  const generic = row(1, 'Malbec Reserva', ['Malbec']);
  const full = row(90, 'Casa Atlas Reserva Malbec-Cabernet Sauvignon', ['Malbec', 'Cabernet Sauvignon']);
  const text = ['CASA ATLAS', 'RESERVA', 'MALBEC-', 'CABERNET SAUVIGNON'];
  for (const rows of [[generic, full], [full, generic]]) {
    const result = rank(text, rows);
    assert.deepEqual(result.map(item => item.row.id), [90, 1]);
    assert.equal(result[0].score, result[1].score);
    assert.equal(result.length, 2, 'The generic or incomplete catalogue entry is not a hard negative');
  }
});
test('Catalogue grape metadata alone cannot create extra observed-name specificity', () => {
  const one = row(1, 'Reserva Malbec', ['Malbec']);
  const other = row(90, 'Malbec Reserva', ['Malbec', 'Cabernet Sauvignon']);
  assert.deepEqual(rank(['Casa Atlas', 'Reserva', 'Malbec', 'Cabernet Sauvignon'], [other, one]).map(item => item.row.id), [1, 90]);
});
test('The existing distinctive cuvee priority remains ahead of generic varietal count', () => {
  const cuvee = row(90, 'Oriole Malbec', ['Malbec']);
  const blend = row(1, 'Malbec Cabernet Sauvignon', ['Malbec', 'Cabernet Sauvignon']);
  assert.deepEqual(rank(['Casa Atlas', 'Oriole', 'Malbec', 'Cabernet Sauvignon'], [blend, cuvee]).map(item => item.row.id), [90, 1]);
});
test('Unobserved name grapes, conflicting vintages and explicit colors remain excluded', () => {
  assert.equal(rank(['Casa Atlas', 'Oriole Malbec'], [row(1, 'Oriole Cabernet Sauvignon')]).length, 0);
  assert.equal(rank(['Casa Atlas', 'Oriole Malbec', '2020'], [{ ...row(1, 'Oriole Malbec'), vintage: 2019 }], 2020).length, 0);
  assert.equal(rank(['Casa Atlas', 'Oriole Malbec', 'Vino tinto'], [{ ...row(1, 'Oriole Malbec'), type: 'blanco' }]).length, 0);
});
test('Suggestion ranking does not change evidence, row data, scores or create a canonical identity', () => {
  const evidence = Object.freeze(['Casa Atlas', 'Oriole Malbec']);
  const candidate = Object.freeze(row(1, 'Oriole Malbec'));
  const result = rank(evidence, Object.freeze([candidate]));
  assert.equal(result[0].row, candidate);
  assert.equal(result[0].score, 90);
  assert.equal(Object.hasOwn(result[0], 'canonicalId'), false);
  assert.deepEqual(evidence, ['Casa Atlas', 'Oriole Malbec']);
});
console.log(JSON.stringify({ groups, networkCalls: 0, modelStarts: 0,
  scope: 'Synthetic suggestion-order regression only; not canonical identity, probability,200-scene improvement or taste validation.' }));
