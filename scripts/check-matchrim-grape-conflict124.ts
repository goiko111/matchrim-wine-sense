import assert from 'node:assert/strict';
import { hasObservedGrapeConflict124 as conflict } from '../src/utils/nativeGrapeConflict124';
import { rankGlobalProposals104 as rank } from '../src/utils/globalWineProposals104';

let groups = 0;
const test = (name: string, work: () => void) => { work(); groups++; console.log('PASS ' + name); };
test('Explicit whole grape names conflict with disjoint complete catalogue grapes', () => {
  assert.equal(conflict(['AURORA', 'PINOT NOIR ROSÉ'], [['Riesling']]), true);
  assert.equal(conflict(['GODELLO'], ['Chardonnay']), true);
  assert.equal(conflict(['Cabernet Franc'], [{ name: 'Cabernet Sauvignon' }]), true);
  assert.equal(conflict(['Cabernet'], ['Cabernet Sauvignon']), false);
});
test('Known synonyms remain compatible without inventing wine/producer aliases', () => {
  for (const [visible, stored] of [['Shiraz', 'Syrah'], ['Alvarinho', 'Albariño'],
    ['Pinot Grigio', 'Pinot Gris'], ['Garnacha', 'Grenache'], ['Monastrell', 'Mourvèdre']]) {
    assert.equal(conflict([visible], [stored]), false, visible);
  }
});
test('A read component of a known blend is compatible; no missing-grape completion is inferred', () => {
  assert.equal(conflict(['MERLOT'], [['Cabernet Sauvignon', 'Merlot']]), false);
  assert.equal(conflict(['MERLOT', 'MALBEC'], ['Malbec']), false);
  assert.equal(conflict(['MERLOT'], ['Chardonnay', 'Riesling']), true);
});
test('Unknown, absent, malformed or partially-described catalogue grapes do not certify a conflict', () => {
  for (const value of [null, undefined, [], ['Tinta Roriz', 'Cabernet Franc'], ['Chardonnay 60%'],
    [{ unknown: 'Riesling' }], [null], [42], ['Garnacha Tinta'], Array(101).fill('Riesling')]) {
    assert.equal(conflict(['Tempranillo'], value), false);
  }
});
test('OCR fragments/substrings do not complete varieties or cross separate lines', () => {
  assert.equal(conflict(['CABERNET SALVIGNON'], ['Merlot']), false);
  assert.equal(conflict(['PINOT', 'NOIR'], ['Riesling']), false);
  assert.equal(conflict(['Chardonnays'], ['Riesling']), false);
  assert.equal(conflict(['Domaine Rose'], ['Riesling']), false);
});
test('Evidence is bounded and remains unchanged', () => {
  const input = Object.freeze(['PINOT NOIR ROSÉ', 'Synthetic Estate']);
  const before = [...input]; conflict(input, ['Riesling']); assert.deepEqual(input, before);
  assert.equal(conflict(Array(101).fill('Merlot'), ['Merlot']), true);
  assert.equal(conflict(['x'.repeat(1001)], ['Merlot']), true);
});
test('Production proposal ranking removes a known grape conflict but retains unknown metadata and matching blends', () => {
  const row = { id: 1, name: 'Synthetic Estate Dry', winery: 'Synthetic Estate', vintage: null,
    slugname: 'synthetic', grapes: [['Riesling']] };
  const evidence = ['Synthetic Estate', 'DRY', 'PINOT NOIR ROSÉ'];
  assert.deepEqual(rank(evidence, [row]), []);
  assert.equal(rank(evidence, [{ ...row, grapes: ['Pinot Noir'] }]).length, 1);
  assert.equal(rank(evidence, [{ ...row, grapes: undefined }]).length, 1);
  assert.deepEqual(rank(['Synthetic Estate', 'Aurora', 'PINOT NOIR'], [{ ...row,
    name: 'Aurora Pinot Noir', grapes: ['Cabernet Sauvignon'] }]), [],
  'An exactly read name cannot erase contradictory catalogue variety metadata');
});
console.log(JSON.stringify({ groups, modelStarts: 0, networkCalls: 0,
  scope: 'Literal grape contradictions on synthetic identities; not a complete grape ontology or recognition accuracy claim.' }));
