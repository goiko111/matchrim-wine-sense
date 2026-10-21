import assert from 'node:assert/strict';
import { hasObservedWineColorConflict124 as conflict } from '../src/utils/nativeWineColor124';
import { rankGlobalProposals104 as rank } from '../src/utils/globalWineProposals104';

let groups = 0;
const test = (name: string, work: () => void) => { work(); groups++; console.log('PASS ' + name); };
test('Explicit color phrases reject contradictory categorical types', () => {
  assert.equal(conflict(['PINOT NOIR ROSÉ'], 'blanco'), true);
  assert.equal(conflict(['VINO TINTO SECO'], 'blanco'), true);
  assert.equal(conflict(['Vin blanc'], 'tinto'), true);
  assert.equal(conflict(['RED WINE'], 'blanco'), true);
  assert.equal(conflict(['Rosato'], 'red'), true);
});
test('Color synonyms and known compatible types do not conflict', () => {
  for (const [visible, stored] of [['Rosé', 'rosado'], ['Vino rosado', 'rosato'],
    ['Vin rouge', 'tinto'], ['White wine', 'blanco'], ['Pinot Noir Rosé trocken', 'rosado']]) {
    assert.equal(conflict([visible], stored), false);
  }
});
test('Brand names, grape-only text and noncolor classifications do not assert a color', () => {
  for (const text of ['Domaine Rose', 'Red Valley', 'PINOT NOIR', 'Blanc de Noirs', 'Garnacha Blanca']) {
    assert.equal(conflict([text], 'tinto'), false, text);
  }
  for (const type of [null, undefined, 'espumoso', 'generoso', 'unknown']) assert.equal(conflict(['Rosé'], type), false);
});
test('Ambiguous/mixed color evidence remains unresolved rather than choosing a category', () => {
  assert.equal(conflict(['Red or white'], 'rosado'), false);
  assert.equal(conflict(['Vino tinto', 'Vino blanco'], 'rosado'), false);
});
test('Evidence bounds and original text are preserved', () => {
  const input = Object.freeze(['PINOT NOIR ROSÉ', 'Synthetic Estate']);
  const before = [...input]; conflict(input, 'blanco'); assert.deepEqual(input, before);
  assert.equal(conflict(Array(101).fill('Rosé'), 'rosado'), true);
  assert.equal(conflict(['x'.repeat(1001)], 'rosado'), true);
});
test('Production ranking rejects explicit rose/white conflict but not unknown type metadata', () => {
  const row = { id: 1, name: 'Synthetic Estate Dry', winery: 'Synthetic Estate', vintage: null,
    slugname: 'synthetic', type: 'blanco' };
  const evidence = ['Synthetic Estate', 'DRY', 'PINOT NOIR ROSÉ'];
  assert.deepEqual(rank(evidence, [row]), []);
  assert.equal(rank(evidence, [{ ...row, type: 'rosado' }]).length, 1);
  assert.equal(rank(evidence, [{ ...row, type: undefined }]).length, 1);
});
test('Partial grape lists are never treated as exhaustive hard-negative identity evidence', () => {
  const row = { id: 1, name: 'Synthetic Estate Dry', winery: 'Synthetic Estate', vintage: null,
    slugname: 'synthetic', type: 'tinto', grapes: ['Merlot'] };
  assert.equal(rank(['Synthetic Estate', 'DRY', 'CABERNET SAUVIGNON'], [row]).length, 1,
    'A blend can omit a known component from its catalogue metadata');
});
console.log(JSON.stringify({ groups, modelStarts: 0, networkCalls: 0,
  scope: 'Explicit color contradictions on synthetic identities; no color inference from grapes or image appearance.' }));
