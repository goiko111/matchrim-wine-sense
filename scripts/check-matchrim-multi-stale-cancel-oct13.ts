import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const output = process.argv[2];
if (!output) throw Error('Pass16 result JSON path');
const path = 'src/components/wine-import/MultiWineLabelScanner.tsx', baseline = '9fa4fca45b08cf2aec11098446806c2c5e7b2aed';
const oldSource = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }), source = readFileSync(path, 'utf8');
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const inspect = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const variables = new Map<string, ts.Expression>(), effects: string[] = [];
  let abortClause: ts.IfStatement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
    if (ts.isCallExpression(node) && ['useEffect', 'useLayoutEffect'].includes(node.expression.getText(tree))) effects.push(node.getText(tree));
    if (ts.isIfStatement(node) && node.expression.getText(tree).includes("error.name === 'AbortError'") && node.thenStatement.getText(tree).includes("setPhase('cancelled')")) abortClause = node;
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.ok(abortClause); return { tree, variables, effects, abortClause };
};
const before = inspect(oldSource), current = inspect(source);
const createSubject = (ref: { current: unknown }, phases: string[]) => {
  const scope = vm.createContext({ DOMException, abortRef: ref, setPhase: (value: string) => phases.push(value) });
  vm.runInContext(ts.transpileModule('globalThis.subject=(error,controller)=>{' + current.abortClause.getText(current.tree) + '};', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, scope);
  return scope.subject as (error: unknown, controller: AbortController) => void;
};
const a = new AbortController(), b = new AbortController(); a.abort();
for (const [name, owner, error, expected] of [
  ['Current A cancellation still publishes cancelled', a, new DOMException('Cancelled', 'AbortError'), ['cancelled']],
  ['Late cancelled A cannot publish into current B', b, new DOMException('Cancelled', 'AbortError'), []],
  ['Null current controller cannot publish obsolete phase', null, new DOMException('Cancelled', 'AbortError'), []],
  ['Distinct controller identity cannot be treated as current', new AbortController(), new DOMException('Cancelled', 'AbortError'), []],
  ['Plain error object is not reclassified as DOM AbortError', a, { name: 'AbortError' }, []],
  ['Non-abort DOMException does not enter cancellation publisher', a, new DOMException('Other', 'NotFoundError'), []],
] as const) check(name, () => {
  const phases: string[] = []; createSubject({ current: owner }, phases)(error, a); assert.deepEqual(phases, expected);
});
check('Repeated A late completions ignored while current B may cancel normally', () => {
  const phases: string[] = [], ref = { current: b }, run = createSubject(ref, phases), error = new DOMException('Cancelled', 'AbortError');
  run(error, a); run(error, a); run(error, a); assert.deepEqual(phases, []); b.abort(); run(error, b); assert.deepEqual(phases, ['cancelled']);
});
check('Removing only current-controller guard restores entire old module AST', () => {
  let removed = 0;
  const result = ts.transform(current.tree, [context => {
    const visit: ts.Visitor = node => {
      if (ts.isIfStatement(node) && node.expression.getText(current.tree) === 'abortRef.current === controller' && node.thenStatement.getText(current.tree) === "setPhase('cancelled');") {
        removed++; return node.thenStatement;
      }
      return ts.visitEachChild(node, visit, context);
    };
    return tree => ts.visitNode(tree, visit) as ts.SourceFile;
  }]);
  try {
    assert.equal(removed, 1);
    const printer = ts.createPrinter({ removeComments: true });
    assert.equal(printer.printFile(result.transformed[0]), printer.printFile(before.tree));
  } finally { result.dispose(); }
});
check('All existing effect/cleanup and owner-key lifetimes byte-identical', () => assert.deepEqual(current.effects, before.effects));
for (const name of ['enrichCandidate', 'analyzeRegion', 'cancelScan', 'resetScan', 'retryScan', 'reanalyzeSelected', 'handleFileSelect', 'confirmBatch']) {
  if (before.variables.has(name)) check('Existing consumer ' + name + ' byte-identical', () => assert.equal(current.variables.get(name)!.getText(current.tree), before.variables.get(name)!.getText(before.tree)));
}
check('All imports unchanged, no await wrapper or new helper', () => assert.deepEqual(
  current.tree.statements.filter(ts.isImportDeclaration).map(node => node.getText(current.tree)),
  before.tree.statements.filter(ts.isImportDeclaration).map(node => node.getText(before.tree)),
));
const protectedPaths = [
  'src/services/winerimApi.ts', 'src/utils/invokeEdgeFunction.ts', 'src/utils/scanAnalysisPolicy.ts',
  'src/utils/multiWineScan.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/imageAnalysis.ts',
  'src/utils/imageCropGeometry.ts', 'src/utils/scanConfidence.ts', 'src/utils/edgeFunctionResilience.ts',
  'src/utils/matchrimQaMode.ts', 'src/utils/matchrimEdgeRouting.ts', 'src/utils/wineAffinityExplanation.ts',
  'src/services/matchrimScanProfile.ts', 'src/utils/scanProfile.ts', 'src/utils/scanHistory.ts',
  'src/utils/labelScanSave.ts', 'src/components/ui/progress.tsx', 'src/components/ui/drawer.tsx',
  'src/components/wine-import/WineMenuScanner.tsx', 'src/utils/menuCatalogAwait.ts',
  'src/utils/menuProfileRecovery.ts', 'src/utils/menuWineActions.ts', 'src/utils/menuWineSave.ts',
  'src/utils/aiRimContextGuide.ts', 'package.json', 'package-lock.json',
  'scripts/qa-multi-wine-ui.py', 'scripts/qa-matchrim-label-save.py', 'qa-fixtures/food-menu/ground-truth.json',
];
for (const file of protectedPaths) check('Protected source ' + file, () => assert.equal(readFileSync(file, 'utf8'), execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8' })));
const sourceHashes = Object.fromEntries([path, ...protectedPaths, 'scripts/check-matchrim-multi-stale-cancel-oct13.ts'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({
  scope: 'Only16 current-controller phase publisher, private synthetic actors and complete module AST/protected consumers/cleanup. No vision/profile/canonical positives/provider/native/unmount expansion.',
  baseline, checks, sourceHashes,
}, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(item => item.passed).length, total: checks.length, failures: checks.filter(item => !item.passed) }));
if (checks.some(item => !item.passed)) process.exitCode = 1;
