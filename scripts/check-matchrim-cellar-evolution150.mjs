import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { restoreCellarEvolution150, restoreCellarEvolutionGuard150 } from './native-cellar-evolution150-scope.mjs';
import { restoreNativeVisual98 } from './native-visual98-scope.mjs';
import { restoreNativeCellar97 } from './native-cellar97-scope.mjs';

const file = 'src/pages/MyWines.tsx';
const current = fs.readFileSync(file, 'utf8');
const previous = execFileSync('git', ['show', 'ec13656:' + file], { encoding: 'utf8' });
assert.equal(restoreCellarEvolution150(file, current), previous);
assert.equal(restoreCellarEvolution150(file, previous), previous);
assert.equal(restoreCellarEvolution150('other/MyWines.tsx', current), current);
const scope = fs.readFileSync('scripts/native-visual98-scope.mjs', 'utf8');
const importLine = "import { restoreCellarEvolution150 } from './native-cellar-evolution150-scope.mjs';\n";
const callLine = '  source = restoreCellarEvolution150(file, source);\n';
assert.equal(scope.split(importLine).length, 2); assert.equal(scope.split(callLine).length, 2);
assert.equal(scope.replace(importLine, '').replace(callLine, ''),
  execFileSync('git', ['show', 'd97cf25:scripts/native-visual98-scope.mjs'], { encoding: 'utf8' }),
  'Every prior98 source oracle, hunk, hash and assertion remains byte-exact');
assert.equal(restoreCellarEvolutionGuard150('scripts/native-visual98-scope.mjs', scope),
  execFileSync('git', ['show', 'd97cf25:scripts/native-visual98-scope.mjs'], { encoding: 'utf8' }));
const scanGuard = fs.readFileSync('scripts/native-scan99-scope.mjs', 'utf8');
const scanImport = "import { restoreCellarEvolutionGuard150 } from './native-cellar-evolution150-scope.mjs';\n";
const scanCall = '  source = restoreCellarEvolutionGuard150(file, source);\n';
assert.equal(scanGuard.split(scanImport).length, 2); assert.equal(scanGuard.split(scanCall).length, 2);
assert.equal(scanGuard.replace(scanImport, '').replace(scanCall, ''),
  execFileSync('git', ['show', 'd97cf25:scripts/native-scan99-scope.mjs'], { encoding: 'utf8' }));

const changes = [
  ['isNative ? isHighCellarAffinity110(w, cellarProfile)', 'true ? isHighCellarAffinity110(w, cellarProfile)'],
  ['cellarDisplayAffinity110(b, cellarProfile)', '99'],
  ['!readCellarPublicReference107(wine)', 'false'],
  ['aria-label="Tu perfil de gustos"', 'aria-label="Unreviewed"'],
  ['h-[144px] w-[88px]', 'h-[14px] w-[8px]'],
  ["import { readCellarPublicReference107 } from '@/utils/cellarPublicReference107';", ''],
];
for (const [from, to] of changes) {
  assert(current.includes(from));
  const changed = current.replace(from, to); assert.notEqual(changed, current);
  assert.notEqual(restoreCellarEvolution150(file, changed), previous);
  assert.throws(() => restoreNativeVisual98(file, changed));
  assert.throws(() => restoreNativeCellar97(file, changed));
}

const extract = source => {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const clauses = [], counts = [];
  const visit = node => {
    if (ts.isCaseClause(node) && node.expression.getText(tree) === "'high_affinity'") clauses.push(node);
    if (ts.isJsxExpression(node) && node.expression?.getText(tree).startsWith('wines.filter(w =>')
      && node.expression.getText(tree).includes('>= 70')) counts.push(node.expression.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(clauses.length, 1); assert.equal(counts.length, 1);
  const code = clauses[0].statements.filter(node => !ts.isBreakStatement(node)).map(node => node.getText(tree)).join('\n');
  const context = { exports: {}, cellarProfile: {}, cellarAffinityView: () => { throw Error('Web called native affinity'); },
    isHighCellarAffinity110: () => { throw Error('Web called native style'); },
    cellarDisplayAffinity110: () => { throw Error('Web called native display'); } };
  vm.runInNewContext(ts.transpileModule(`exports.filter = wines => {
    const isNative = false; let filtered = [...wines]; ${code}; return filtered.map(wine => wine.id);
  }; exports.count = wines => { const isNative = false; return ${counts[0]}; };`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context.exports;
};
const before = extract(previous), after = extract(current);
let webCases = 0;
const values = [null, undefined, NaN, -1, 0, 69, 70, 80, 100];
for (const order of [values, [...values].reverse()]) for (let offset = 0; offset <= order.length; offset++) {
  const wines = order.slice(offset).map((matchrim_affinity, index) => ({ id: 'unit150-' + index, matchrim_affinity }));
  assert.deepEqual(Array.from(after.filter(wines)), Array.from(before.filter(wines)));
  assert.equal(after.count(wines), before.count(wines)); webCases++;
}
console.log(JSON.stringify({ exactSourceInverses: 2, newRejectedMutations: changes.length,
  unchangedWebFilterAndCountCases: webCases, networkCalls: 0, dataWrites: 0,
  scope: 'Legacy oracles remain exact after six explicit native source amendments. Current web filter/count AST is executed directly; current native style and UIKit are not projected into a pass.' }));
