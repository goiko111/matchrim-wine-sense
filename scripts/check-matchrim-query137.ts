import assert from 'node:assert/strict';
import { globalRecoveryQueries104 as queries, rankGlobalProposals104 as rank } from '../src/utils/globalWineProposals104';

const pending = 'Etiqueta por identificar';
let checks = 0;
const test = (name: string, body: () => void) => { body(); checks++; console.log('PASS ' + name); };
test('A literal terminal year can be omitted from a query only with the same supported hint', () => {
  for (const text of ['Cuvee Oriole 2020', 'Cuvee Oriole (2020)', '"Cuvee Oriole 2020"'])
    assert.deepEqual(queries(pending, [text, 'Casa Atlas'], false, 2020), ['Cuvee Oriole', 'Casa Atlas']);
  assert.deepEqual(queries(pending, ['Cuvee Oriole 2020', 'Casa Atlas']), ['Casa Atlas']);
  assert.deepEqual(queries(pending, ['Cuvee Oriole 2020', 'Casa Atlas'], false, 2019), ['Casa Atlas']);
});
test('Awards, foundation, multiple dates and unsupported years are not stripped into names', () => {
  const future = new Date().getUTCFullYear() + 1;
  for (const [text, hint] of [['Casa Atlas depuis 2020', 2020], ['Cuvee Oriole LYON GOLD 2020', 2020],
    ['Cuvee Oriole 2018 2020', 2020], [`Cuvee Oriole ${future}`, future]] as const)
    assert.deepEqual(queries(pending, [text, 'Casa Atlas'], false, hint), ['Casa Atlas']);
});
test('Non-year bottle counts, embedded numbers and complete evidence are preserved', () => {
  for (const text of ['Cuvee 3507 BOTTLES', 'Cuvee 2020 Edition', 'Cuvee-2020'])
    assert.deepEqual(queries(pending, [text, 'Casa Atlas'], false, 2020), ['Casa Atlas']);
  const evidence = Object.freeze(['Cuvee Oriole 2020', 'Casa Atlas']);
  queries(pending, evidence, false, 2020); assert.deepEqual(evidence, ['Cuvee Oriole 2020', 'Casa Atlas']);
});
test('Query normalization never weakens independent catalogue-vintage matching', () => {
  const row = { id: 137, name: 'Cuvee Oriole', winery: 'Casa Atlas', vintage: 2019, slugname: 'cuvee-oriole' };
  assert.deepEqual(rank(['Cuvee Oriole 2020', 'Casa Atlas'], [row], 2020), []);
  assert.equal(rank(['Cuvee Oriole 2020', 'Casa Atlas'], [{ ...row, vintage: 2020 }], 2020).length, 1);
});
test('Exact old-vine and pure organic metadata leave room for later literal identities', () => {
  for (const metadata of ['VIEILLES VIGNES', 'Old Vines', 'ECO-ORGANIC-BIO'])
    assert.deepEqual(queries(pending, ['Cuvee Oriole', metadata, 'Casa Atlas']), ['Cuvee Oriole', 'Casa Atlas']);
  assert.deepEqual(queries(pending, ['Cuvee Oriole Old Vines', 'Casa Atlas']), ['Cuvee Oriole Old Vines', 'Casa Atlas']);
});
test('Stripping a supported harvest year cannot allocate a metadata-only query', () => {
  for (const term of ['Cosecha', 'Vendimia', 'Recolte', 'Vintage', 'Ernte', 'Vendemmia']) {
    assert.deepEqual(queries(pending, ['Cuvee Oriole', `${term} 2020`, 'Casa Atlas'], false, 2020), ['Cuvee Oriole', 'Casa Atlas']);
    assert.deepEqual(queries(term, [], true), [term]);
  }
  assert.deepEqual(queries(pending, ['Cuvee Vintage Oriole 2020', 'Casa Atlas'], false, 2020), ['Cuvee Vintage Oriole', 'Casa Atlas']);
});
test('Explicit manual searches retain their previous text and two-query cap never increases', () => {
  assert.deepEqual(queries('Old Vines', [], true), ['Old Vines']);
  assert.deepEqual(queries('ECO-ORGANIC-BIO', [], true), ['ECO-ORGANIC-BIO']);
  assert.deepEqual(queries(pending, ['Casa Atlas', 'Northern Valley', 'Cuvee Oriole 2020'], false, 2020), ['Casa Atlas', 'Northern Valley']);
});
console.log(JSON.stringify({ checks, paidStarts: 0, networkCalls: 0,
  scope: 'Synthetic automatic-query allocation and unchanged identity/vintage guards. Any200-scene gain or recall effect remains unmeasured.' }));
