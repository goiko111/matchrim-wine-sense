import assert from 'node:assert/strict';
import { globalRecoveryQueries104 as queries } from '../src/utils/globalWineProposals104';

const pending = 'Etiqueta por identificar';
assert.deepEqual(queries(pending, ['Synthetic Estate', 'TROCKEN', 'Aurora', 'RHEINGAU']), ['Synthetic Estate', 'Aurora']);
assert.deepEqual(queries(pending, ['DRY', 'HALBTROCKEN', 'FEINHERB']), []);
assert.deepEqual(queries(pending, ['Synthetic Estate', 'Northern Valley', "'La Aurora'", '2020']), ['La Aurora', 'Synthetic Estate'],
  'A short balanced literal cuvee now takes priority over untyped region text');
assert.deepEqual(queries(pending, ['"La Aurora"', 'Synthetic Estate']), ['La Aurora', 'Synthetic Estate']);
assert.deepEqual(queries(pending, ['Synthetic Estate', 'Cuvee Second', '"a very long landscape description in quotation marks"']),
  ['Synthetic Estate', 'Cuvee Second'], 'Long quoted marketing copy must not consume the second slot');
assert.deepEqual(queries(pending, ["L'Or de la Maison", 'Ancestral de Casa Oriole']), ["L'Or de la Maison", 'Ancestral de Casa Oriole']);
assert.deepEqual(queries("'La Aurora'", ['Unrelated'], true), ["'La Aurora'"], 'Manual text is not silently rewritten');
assert.deepEqual(queries(pending, ['Synthetic Estate', 'Northern Valley', "'www.invalid.test'", "'2020'", "'DRY WINE'"]),
  ['Synthetic Estate', 'Northern Valley'], 'Quoted URLs, dates and metadata cannot allocate a query');
const evidence = Object.freeze(['Synthetic Estate', 'Northern Valley', "'La Aurora'"]);
const before = [...evidence]; queries(pending, evidence); assert.deepEqual(evidence, before);
assert.deepEqual(queries(pending, ['Synthetic Estate', 'Aurora', '"Drink Responsibly"']), ['Synthetic Estate', 'Aurora']);
assert.deepEqual(queries('"Sol"', ['"Sol"']), ['"Sol"'], 'Retain an existing short quoted name rather than dropping it after unquoting');
console.log(JSON.stringify({ checks: 11, networkCalls: 0, models: 0,
  scope: 'Synthetic literal query allocation, not identity inference or measured recognition improvement.' }));
