import assert from 'node:assert/strict';
import { nativeStackedQueries175 as stacks } from '../src/utils/nativeStackedQueries175';
import { globalRecoveryQueries104 as queries } from '../src/utils/globalWineProposals104';
const line = (text: string, y: number, x = .3, confidence = 1) => ({ text, confidence, box: { x, y, width: .3, height: .04 } });
const run = (lines: ReturnType<typeof line>[]) => stacks(lines, lines.map(row => row.text), () => true);
let groups = 0;
const test = (name: string, body: () => void) => { body(); groups++; console.log('PASS', name); };
test('Two or three centered raw words form a query with literal provenance and one fallback', () => {
  const raw = [line('CASA', .4), line('HORIZONTE', .444)]; const before = JSON.stringify(raw);
  assert.deepEqual(run(raw), [{ text: 'CASA HORIZONTE', fallback: 'HORIZONTE', sourceIndices: [0, 1], canonicalIdentityEvidence: false }]);
  assert.equal(JSON.stringify(raw), before);
  assert.equal(run([...raw, line('NORTE', .488)])[0].text, 'CASA HORIZONTE NORTE');
  assert.deepEqual(run([...raw, line('NORTE', .488), line('SUR', .532)]), []);
});
test('Columns, distant fields, low confidence, invalid geometry and vertical neck text never join', () => {
  assert.deepEqual(run([line('CASA', .4), line('HORIZONTE', .444, .65)]), []);
  assert.deepEqual(run([line('CASA', .4), line('HORIZONTE', .7)]), []);
  assert.deepEqual(run([line('CASA', .4, .3, .5), line('HORIZONTE', .444)]), []);
  assert.deepEqual(run([line('CASA', .4), { ...line('HORIZONTE', .444), box: { x: .3, y: .444, width: .02, height: .2 } }]), []);
  assert.deepEqual(run([line('CASA', .4), { ...line('HORIZONTE', .444), box: { x: .3, y: .444, width: NaN, height: .04 } }]), []);
});
test('Dates, punctuation, metadata veto and competing/intervening readings cannot fabricate a phrase', () => {
  assert.deepEqual(run([line('CASA', .4), line('2020', .444)]), []);
  assert.deepEqual(run([line('CASA', .4), line('HORIZONTE!', .444)]), []);
  const raw = [line('CASA', .4), line('HORIZONTE', .444)];
  assert.deepEqual(stacks(raw, raw.map(x => x.text), value => value !== 'CASA'), []);
  assert.deepEqual(run([...raw, line('OTRA', .446)]), []);
  assert.deepEqual(run([...raw, { ...line('?', .425, .3, .2), box: { x: .3, y: .425, width: .3, height: .02 } }]), []);
  assert.deepEqual(run([...raw, { ...line('?', .425, .3, .2), box: { x: NaN, y: .425, width: .3, height: .02 } }]), []);
});
test('Missing confidence/context and an already complete observed phrase preserve ordinary queries', () => {
  const raw = [line('CASA', .4), line('HORIZONTE', .444)];
  assert.deepEqual(stacks(raw.map(({ text, box }) => ({ text, box })), raw.map(x => x.text), () => true), []);
  assert.deepEqual(stacks(raw, ['Other'], () => true), []);
  assert.deepEqual(stacks(raw, [...raw.map(x => x.text), 'CASA HORIZONTE'], () => true), []);
  assert.deepEqual(stacks(undefined, [], () => true), []);
});
test('Production uses only two slots and preserves one constituent fallback and stronger prior roles', () => {
  const raw = [line('CASA', .4), line('HORIZONTE', .444)], evidence = raw.map(x => x.text);
  assert.deepEqual(queries('Etiqueta por identificar', evidence, false, null, raw), ['CASA HORIZONTE', 'HORIZONTE']);
  assert.deepEqual(queries('Cuvee Norte', ['Cuvee Norte', ...evidence], false, null, raw), ['Cuvee Norte', 'CASA']);
  assert.deepEqual(queries('Etiqueta por identificar', ['\"Cuvee Norte\"', ...evidence], false, null, raw), ['Cuvee Norte', 'CASA']);
  assert.deepEqual(queries('CASA', evidence, true, null, raw), ['CASA']);
  assert.deepEqual(queries('Etiqueta por identificar', ['Different Producer', ...evidence], false, null, raw), ['Different Producer', 'CASA'],
    'A different producer/query failure cannot be silently removed by a later phrase');
});
console.log(JSON.stringify({ groups, paidStarts: 0, realGET: 0, scope: 'Synthetic query-only geometry; no identity or measured recognition gain' }));
