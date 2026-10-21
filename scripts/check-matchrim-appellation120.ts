import assert from 'node:assert/strict';
import { hasObservedAppellationConflict120 as conflict } from '../src/utils/nativeAppellation120';
import { rankGlobalProposals104 } from '../src/utils/globalWineProposals104';

assert(conflict(['APPELLATION RIVIERE HAUTE CONTRÔLÉE'], { name: 'Domaine Test Rivière', region: 'Rivière' }));
assert(!conflict(['APPELLATION RIVIERE HAUTE CONTRÔLÉE'], { name: 'Domaine Test Rivière Haute', region: 'Region Test' }));
assert(!conflict(['appellation rivière-haute protégée'], { name: 'Cuvee Test', region: 'Rivière Haute' }));
assert(conflict(['APPELLATION RIVIERE HAUTE CONTRÔLÉE'], { name: 'Cuvee Test', region: 'Rivière' }));
assert(!conflict(["APPELLATION D'ORIGINE CONTRÔLÉE"], { name: 'Cuvee Test', region: null }));
assert(!conflict(['APPELLATION', 'RIVIERE HAUTE', 'CONTRÔLÉE'], { name: 'Cuvee Test' }));
assert(!conflict(['Produced in Riviere Haute'], { name: 'Cuvee Test' }));
assert(conflict(['Appellation Riviere Haute controlee; Appellation Mont Royal protegee'], { name: 'Riviere Haute' }));
assert(conflict(['Appellation Riviere Haute controlee'], { name: 'Cuvee Test', region: 1 as unknown as string }));
assert(conflict(Array.from({ length: 101 }, () => 'text'), { name: 'Cuvee Test' }));

const row = { id: 1, name: 'Domaine Test Riviere', winery: 'Domaine Test', vintage: null,
  region: 'Riviere', slugname: 'Domaine-Test-Riviere', type: 'blanco' };
const evidence = ['Domaine Test', 'Riviere Haute', 'APPELLATION RIVIERE HAUTE CONTROLEE'];
assert.deepEqual(rankGlobalProposals104(evidence, [row]), []);
assert.equal(rankGlobalProposals104(evidence, [{ ...row, name: 'Domaine Test Riviere Haute' }]).length, 1);
assert.equal(rankGlobalProposals104(['Domaine Test', 'Riviere'], [row]).length, 1);
console.log(JSON.stringify({ groups: 6, networkCalls: 0, models: 0,
  scope: 'Synthetic literal appellation-role constraints and actual proposal ranker, no fixture wine-name aliases' }));
