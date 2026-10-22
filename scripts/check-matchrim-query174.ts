import assert from 'node:assert/strict';
import { globalRecoveryQueries104 as queries } from '../src/utils/globalWineProposals104';
import { hasMissingVisibleQualifier102 } from '../src/utils/nativeWineQualifier102';

const pending = 'Etiqueta por identificar';
let groups = 0;
const test = (name: string, body: () => void) => { body(); groups++; console.log('PASS', name); };
test('A complete quoted cuvee outranks untyped fragments without inventing names', () => {
  assert.deepEqual(queries(pending, ['Atlas Estate', 'Northern Valley', "'La Aurora'"]), ['La Aurora', 'Atlas Estate']);
  assert.deepEqual(queries(pending, ['MILL', 'Premier Cru "Les Etoiles"', 'SCE DOMAINE ATLAS']), ['Les Etoiles', 'ATLAS']);
});
test('Explicit producer prefixes allocate literal substrings, not aliases or a winery identity', () => {
  assert.deepEqual(queries(pending, ['UNREAD', 'BODEGAS CASA ATLAS', 'Other Literal']), ['CASA ATLAS', 'UNREAD']);
  assert.deepEqual(queries(pending, ['CH\u00c2TEAU DE LUNE', 'Unknown']), ['LUNE', 'CH\u00c2TEAU DE LUNE']);
  assert.deepEqual(queries('Cuvee Oriole', ['Cuvee Oriole', 'Bodegas Casa Atlas']), ['Cuvee Oriole', 'Casa Atlas']);
});
test('Only an explicit appellation role removes the corresponding standalone place query', () => {
  assert.deepEqual(queries(pending, ['Cuvee Horizon', 'Northern Valley', 'APPELLATION NORTHERN VALLEY CONTROLEE', 'Casa Atlas']), ['Cuvee Horizon', 'Casa Atlas']);
  assert.deepEqual(queries(pending, ['Cuvee Horizon', 'Northern Valley', 'Casa Atlas']), ['Cuvee Horizon', 'Northern Valley']);
  assert.deepEqual(queries('Northern Valley', [], true), ['Northern Valley']);
});
test('A fragment of a fully observed generic word cannot occupy an identity query slot', () => {
  assert.deepEqual(queries(pending, ['CHAMPAGNE', 'Casa Atlas', 'CHAMPA']), ['Casa Atlas']);
  assert.deepEqual(queries(pending, ['Casa Atlas', 'CHAMPA']), ['Casa Atlas', 'CHAMPA']);
  assert.deepEqual(queries('CHAMPA', ['CHAMPAGNE'], true), ['CHAMPA']);
});
test('One additional pure varietal leaves full named references and manual searches intact', () => {
  assert.deepEqual(queries(pending, ['Casa Atlas', 'PRIMITIVO']), ['Casa Atlas']);
  assert.deepEqual(queries(pending, ['Atlas Primitivo', 'Casa Atlas']), ['Atlas Primitivo', 'Casa Atlas']);
  assert.deepEqual(queries('Primitivo', [], true), ['Primitivo']);
});
test('Award metadata needs supported raw geometry; a distant year does not suppress a name', () => {
  const line = (text: string, x: number, y: number) => ({ text, box: { x, y, width: .1, height: .012 } });
  const lines = [line('2020', .4, .2), line('LYON', .51, .2), line('GOLD', .51, .215), line('Cuvee Horizon', .1, .7), line('Casa Atlas', .1, .8)];
  const evidence = lines.map(value => value.text);
  assert.deepEqual(queries(pending, evidence, false, null, lines), ['Cuvee Horizon', 'Casa Atlas']);
  assert.deepEqual(queries(pending, evidence), ['LYON', 'GOLD']);
  assert.deepEqual(queries(pending, evidence, false, null, lines.map(value => value.text === '2020' ? line('2020', .1, .9) : value)), ['LYON', 'GOLD']);
});
test('Unbalanced/marketing quotes, unsupported external context and raw mutation are rejected', () => {
  const evidence = Object.freeze(['Casa Atlas', 'Other Literal', '"a very long landscape description in quotation marks"', 'Premier Cru "Unclosed']);
  const before = JSON.stringify(evidence);
  assert.deepEqual(queries(pending, evidence), ['Casa Atlas', 'Other Literal']);
  assert.equal(JSON.stringify(evidence), before);
});
test('Producer extraction never prioritizes prose or leading punctuation; observed suffix noise cannot erase a name', () => {
  assert.deepEqual(queries(pending, ['Cuvee Horizon', 'WEINGUT - ERBHOP', 'Other Literal']), ['Cuvee Horizon', 'WEINGUT - ERBHOP']);
  assert.deepEqual(queries(pending, ['Cuvee Horizon', 'DOMAINE ELABORE ET MIS EN BOUTEILLE PAR CASA ATLAS']), ['Cuvee Horizon', 'DOMAINE ELABORE ET MIS EN BOUTEILLE PAR CASA ATLAS']);
  assert.deepEqual(queries(pending, ['RAMONET', 'Premier Cru "Morgeot"', 'BOTTLED RAMONETA']), ['Morgeot', 'RAMONET']);
});
test('A missing closing quote cannot erase an explicitly read cru/climat qualifier', () => {
  assert.equal(hasMissingVisibleQualifier102({ name: 'Casa Atlas Month\u00e9lie Premier Cru', evidence: ['Premier Cru "Les Etoiles'] }), true);
  assert.equal(hasMissingVisibleQualifier102({ name: 'Casa Atlas Les Etoiles Premier Cru', evidence: ['Premier Cru "Les Etoiles'] }), false);
  assert.equal(hasMissingVisibleQualifier102({ name: 'Casa Atlas', evidence: ['Grand Cru Cellars'] }), false);
});
console.log(JSON.stringify({ groups, paidStarts: 0, realGET: 0, scope: 'Literal query-role allocation only; not recognition or canonical evidence' }));
