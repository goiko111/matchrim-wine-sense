import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { globalRecoveryQueries104 } from '../src/utils/globalWineProposals104';

let groups = 0;
const check = (name: string, work: () => void) => { work(); groups++; console.log('PASS', name); };

check('An existing complete style alone is not a bottle identity query', () => {
  for (const style of ['Trebbiano', 'Carm\u00e9n\u00e8re', 'Gr\u00fcner Veltliner', 'Nero d\u2019Avola', 'Sweet Moscatel', 'Pinotage']) {
    assert.deepEqual(globalRecoveryQueries104(style, [style]), [], style);
    assert.deepEqual(globalRecoveryQueries104(style, [style, 'Casa Horizonte']), ['Casa Horizonte'], style);
  }
});
check('Manual varietal searches remain available', () => {
  for (const style of ['Trebbiano', 'Carm\u00e9n\u00e8re', 'Pinotage'])
    assert.deepEqual(globalRecoveryQueries104(style, [style], true), [style]);
});
check('Full observed names containing varietals stay literal', () => {
  for (const name of ['Horizonte Trebbiano', 'North Vineyards', 'Nero di Stelle', 'Moscatel de Luna'])
    assert.deepEqual(globalRecoveryQueries104(name, [name]), [name]);
});
check('Viticulture roles alone do not consume automatic query slots', () => {
  for (const role of ['VINEYARDS', 'Vignobles', 'Viticultores']) {
    assert.deepEqual(globalRecoveryQueries104(role, [role]), []);
    assert.deepEqual(globalRecoveryQueries104(role, [role, 'Casa Horizonte']), ['Casa Horizonte']);
    assert.deepEqual(globalRecoveryQueries104(role, [role], true), [role]);
  }
});
check('Unknown names, qualifiers and current two-query bound are retained', () => {
  const evidence = ['Casa Horizonte', 'North Vineyards', 'Tercera Casa'];
  assert.deepEqual(globalRecoveryQueries104(evidence[0], evidence), evidence.slice(0, 2));
  assert.deepEqual(globalRecoveryQueries104('Atlas Reserva Especial', ['Atlas Reserva Especial']), ['Atlas Reserva Especial']);
  assert.deepEqual(globalRecoveryQueries104('Zweithaus', ['Zweithaus']), ['Zweithaus']);
});
check('Raw evidence remains unchanged and cannot be replaced by an invented name', () => {
  const evidence = Object.freeze(['Trebbiano', 'Casa Horizonte']);
  const before = JSON.stringify(evidence);
  assert.deepEqual(globalRecoveryQueries104('Invented Bottle', evidence), ['Casa Horizonte']);
  assert.equal(JSON.stringify(evidence), before);
});
check('Existing menu/web classification source is byte-identical apart from the new inert export', () => {
  const added = '\n// Vocabulary reuse only: this does not classify or confirm any bottle identity.\n'
    + 'export const isLiteralWineStyleName95 = (name: string): boolean => typeof name === \'string\'\n'
    + '  && name.trim().length > 0 && name.length <= 120 && completeStyle(normalize(name));\n';
  const file = 'src/utils/menuLiteralStyle95.ts';
  const source = fs.readFileSync(file, 'utf8');
  assert.equal(source.split(added).length, 2);
  assert.equal(source.replace(added, ''), execFileSync('git', ['show', 'de2ad99:' + file], { encoding: 'utf8' }));
});
console.log(JSON.stringify({ passed: true, groups, modelStarts: 0, networkCalls: 0,
  scope: 'Native query allocation only; no identification, affinity or expected dataset labels' }));
