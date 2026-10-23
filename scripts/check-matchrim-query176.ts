import assert from 'node:assert/strict';
import { globalRecoveryQueries104 as queries } from '../src/utils/globalWineProposals104';
import { wineYearRoles105, type YearLine105 } from '../src/utils/wineYearRole105';

const line = (text: string, x: number, y: number): YearLine105 => ({ text, box: { x, y, width: .15, height: .015 } });
const pending = 'Etiqueta por identificar';
let groups = 0;
const test = (name: string, body: () => void) => { body(); groups++; console.log('PASS', name); };
test('A spatially proven award cannot erase a separately read terminal vintage/name query', () => {
  const lines = [line('2024', .4, .2), line('LYON', .56, .2), line('GOLD', .56, .22),
    line('Cuvee Horizon 2020', .1, .7), line('Casa Atlas', .1, .8)];
  const evidence = lines.map(value => value.text), roles = wineYearRoles105(lines);
  assert.equal(roles.roles.find(value => value.year === 2024)?.role, 'award');
  assert.deepEqual(queries(pending, evidence, false, 2020, lines), ['Cuvee Horizon', 'Casa Atlas']);
});
test('Without geometry the award/vintage combination remains ambiguous rather than guessed', () => {
  const evidence = ['2024', 'LYON', 'GOLD', 'Cuvee Horizon 2020', 'Casa Atlas'];
  assert.deepEqual(queries(pending, evidence, false, 2020), ['LYON', 'GOLD']);
});
test('Unbound external geometry cannot supply an otherwise missing award classification', () => {
  const evidence = ['2024', 'LYON', 'Cuvee Horizon 2020', 'Casa Atlas'];
  const lines = [line('2024', .4, .2), line('LYON', .56, .2), line('GOLD', .56, .22), line('Cuvee Horizon 2020', .1, .7)];
  assert.deepEqual(queries(pending, evidence, false, 2020, lines), ['LYON', 'Casa Atlas']);
});
test('Conflicting current-region dates, overflowing occurrence counts and manual input keep their gates', () => {
  const lines = [line('Cuvee Horizon 2020', .1, .7), line('Cuvee Second 2021', .1, .8), line('Casa Atlas', .1, .9)];
  assert.deepEqual(queries(pending, lines.map(x => x.text), false, 2020, lines), ['Casa Atlas']);
  const overflow = [line('2020 '.repeat(9), .1, .2), line('Cuvee Horizon 2020', .1, .7), line('Casa Atlas', .1, .8)];
  assert.deepEqual(queries(pending, overflow.map(x => x.text), false, 2020, overflow), ['Casa Atlas']);
  assert.deepEqual(queries('Cuvee Horizon 2020', [], true), ['Cuvee Horizon']);
});
test('Partial geometry cannot hide a contradictory dated observation from the same raw evidence', () => {
  const lines = [line('2024', .4, .2), line('LYON', .56, .2), line('GOLD', .56, .22), line('Cuvee Horizon 2020', .1, .7), line('Casa Atlas', .1, .8)];
  const evidence = [...lines.map(value => value.text), 'Cuvee Second 2021'];
  assert(!queries(pending, evidence, false, 2020, lines).includes('Cuvee Horizon'));
});
test('Raw evidence, name, producer, vintage hint and geometry remain immutable', () => {
  const lines = Object.freeze([line('Cuvee Horizon 2020', .1, .7), line('Casa Atlas', .1, .8)]);
  const evidence = Object.freeze(lines.map(x => x.text)), before = JSON.stringify({ lines, evidence });
  assert.deepEqual(queries(pending, evidence, false, 2020, lines), ['Cuvee Horizon', 'Casa Atlas']);
  assert.equal(JSON.stringify({ lines, evidence }), before);
});
test('A complete distinctive literal phrase does not also query its isolated constituent', () => {
  assert.deepEqual(queries(pending, ['CASA HORIZONTE', 'HORIZONTE', 'Unrelated Third']), ['CASA HORIZONTE']);
  assert.deepEqual(queries(pending, ['HORIZONTE', 'CASA HORIZONTE', 'Unrelated Third']), ['CASA HORIZONTE']);
  assert.deepEqual(queries(pending, ['HORIZONTE', 'HORIZONTE RESERVA']), ['HORIZONTE', 'HORIZONTE RESERVA'],
    'An aging term alone cannot erase a producer lookup');
  assert.deepEqual(queries('HORIZONTE', ['CASA HORIZONTE'], true), ['HORIZONTE']);
  assert.deepEqual(queries(pending, ['TEAU ATLAS', 'CHATEAU ATLAS']), ['ATLAS', 'TEAU ATLAS'],
    'An explicit producer query cannot be replaced by a longer untyped fragment');
});
console.log(JSON.stringify({ groups, realGET: 0, modelStarts: 0, scope: 'Synthetic source-bound query year roles, not recognition accuracy or identity confirmation' }));
