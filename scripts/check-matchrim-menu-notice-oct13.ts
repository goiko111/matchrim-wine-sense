import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const output = process.argv[2];
if (!output) throw Error('Pass10 result JSON path');
const path = 'src/components/wine-import/WineMenuScanner.tsx';
const baseline = '0156df365f3e547d303d5cc25bb9fc841d30a98d';
const oldSource = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' });
const source = readFileSync(path, 'utf8');
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const inspect = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const variables = new Map<string, ts.Expression>(), effects: string[] = [], selections: string[] = [], toastCalls: ts.CallExpression[] = [];
  let publish: ts.IfStatement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(tree);
      if (['useEffect', 'useLayoutEffect'].includes(name)) effects.push(node.getText(tree));
      if (name === 'setSelectedPinIndex' && node.arguments[0]?.kind !== ts.SyntaxKind.NullKeyword) selections.push(node.arguments[0].getText(tree));
      if (name.startsWith('toast.')) toastCalls.push(node);
    }
    if (ts.isIfStatement(node) && node.expression.getText(tree).startsWith('detectionNoticeRef.current.active')) publish = node;
    ts.forEachChild(node, visit);
  };
  visit(tree); return { tree, variables, effects, selections, toastCalls, publish };
};
const before = inspect(oldSource), current = inspect(source);
const print = (node: ts.Node, tree: ts.SourceFile) => ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, tree);
const callback = current.variables.get('dismissDetectionNotice') as ts.CallExpression;
const compile = (expression: string) => ts.transpileModule('globalThis.subject = ' + expression + ';', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const createRuntime = () => {
  const dismissed: Array<string | number> = [], successes: string[] = [], selection: Array<[string, number]> = [];
  const state = { current: { active: true, generation: 1, id: null as string | number | null } };
  const controller = { signal: { aborted: false } };
  const scope = vm.createContext({ detectionNoticeRef: state, scanAbortRef: { current: controller }, toast: { dismiss: (id: string | number) => dismissed.push(id), success: (message: string) => { successes.push(message); return 'new-owned-' + successes.length; } }, setHighlightedWineIndex: (index: number) => selection.push(['highlight', index]), setSelectedPinIndex: (index: number) => selection.push(['selected', index]) });
  vm.runInContext(compile(callback.arguments[0].getText(current.tree)), scope); scope.dismissDetectionNotice = scope.subject;
  vm.runInContext(compile('(noticeGeneration, controller, normalizedWines) => {' + current.publish!.getText(current.tree) + '}'), scope); const publish = scope.subject;
  vm.runInContext(compile(current.variables.get('openWineDetail')!.getText(current.tree)), scope); const open = scope.subject;
  const effect = current.effects.find(text => text.startsWith('useLayoutEffect') && text.includes('detectionNoticeRef'))!;
  const effectTree = ts.createSourceFile('effect.ts', effect, ts.ScriptTarget.Latest, true);
  const effectCall = (effectTree.statements[0] as ts.ExpressionStatement).expression as ts.CallExpression;
  vm.runInContext(compile(effectCall.arguments[0].getText(effectTree)), scope);
  const cleanup = scope.subject();
  return { state, scope, controller, dismissed, successes, selection, publish, open, cleanup };
};
for (const id of ['menu-detection-1', 17]) check('Exact own ID dismissed and nulled: ' + id, () => { const r = createRuntime(); r.state.current.id = id; r.scope.dismissDetectionNotice(); assert.deepEqual(r.dismissed, [id]); assert.equal(r.state.current.id, null); assert.equal(r.state.current.generation, 2); r.scope.dismissDetectionNotice(); assert.deepEqual(r.dismissed, [id]); });
check('Absent ID never calls global dismiss, but invalidates pending publication', () => { const r = createRuntime(); r.scope.dismissDetectionNotice(); assert.deepEqual(r.dismissed, []); r.publish(1, r.controller, [1]); assert.equal(r.successes.length, 0); });
check('Current mounted selection publishes exactly the owned success', () => { const r = createRuntime(); r.publish(1, r.controller, [1]); assert.equal(r.state.current.id, 'new-owned-1'); assert.equal(r.successes.length, 1); assert.match(r.successes[0], /1 vinos detectados en la carta/); });
for (const operation of ['open', 'clear/newbatch', 'unmount/owner']) check('Old async/PDF notice cannot appear after ' + operation, () => {
  const r = createRuntime(); r.state.current.id = 'old-owned';
  if (operation === 'open') r.open(4); else if (operation === 'unmount/owner') r.cleanup(); else r.scope.dismissDetectionNotice();
  r.publish(1, r.controller, [1]); assert.deepEqual(r.dismissed, ['old-owned']); assert.equal(r.successes.length, 0);
});
check('Only new generation may publish after new batch, then stale completion cannot replace it', () => { const r = createRuntime(); r.scope.dismissDetectionNotice(); r.publish(2, r.controller, [1]); const id = r.state.current.id; r.publish(1, r.controller, [1]); assert.equal(r.state.current.id, id); assert.equal(r.successes.length, 1); });
check('Aborted scan cannot publish owned notice', () => { const r = createRuntime(); r.controller.signal.aborted = true; r.publish(1, r.controller, [1]); assert.equal(r.successes.length, 0); });
check('Replaced controller cannot publish owned notice', () => { const r = createRuntime(); r.scope.scanAbortRef.current = { signal: { aborted: false } }; r.publish(1, r.controller, [1]); assert.equal(r.successes.length, 0); });
check('Unmount cleanup makes inactive and dismisses only captured own notice', () => { const r = createRuntime(); r.state.current.id = 'owner-A-notice'; r.cleanup(); assert.equal(r.state.current.active, false); assert.equal(r.state.current.id, null); assert.deepEqual(r.dismissed, ['owner-A-notice']); });
check('Old owner instance cleanup cannot dismiss new owner instance notice', () => { const old = createRuntime(), next = createRuntime(); old.state.current.id = 'owner-A'; next.state.current.id = 'owner-B'; old.cleanup(); assert.equal(next.state.current.id, 'owner-B'); assert.deepEqual(next.dismissed, []); });
check('Opening detail retains exact highlight and selected index order', () => { const r = createRuntime(); r.open(9); assert.deepEqual(r.selection, [['highlight', 9], ['selected', 9]]); assert.equal(r.state.current.generation, 2); });
check('All non-null selection setters go through the one dismissal-aware opener', () => assert.deepEqual(current.selections, ['index']));
check('Lifecycle cleanup is owner keyed without changing existing hooks', () => { const remaining = current.effects.filter(text => !text.includes('detectionNoticeRef')); assert.deepEqual(remaining, before.effects); assert.match(current.effects.find(text => text.includes('detectionNoticeRef'))!, /\[user\?\.id, dismissDetectionNotice\]/); });
const ownChanges = new Set(['openWineDetail', 'handleFileSelect', 'convertPdfToImage', 'processFile', 'clearScan']);
for (const name of ['saveScannedWine', 'updateScannedWine', 'resetSaveBatch', 'retryScanProfile', 'invalidateProfileRetry', 'getWineDecision', 'normalizeScannedWine', 'getSimilarWines', 'menuDecision']) check('Protected initializer ' + name + ' remains byte-identical', () => { assert.ok(before.variables.has(name), name); assert.equal(current.variables.get(name)!.getText(current.tree), before.variables.get(name)!.getText(before.tree)); });
check('All other nested initializers unchanged, no added writer/scoring/query', () => { for (const [name, value] of before.variables) if (!ownChanges.has(name) && name !== 'WineMenuScannerSession') assert.equal(current.variables.get(name)!.getText(current.tree), value.getText(before.tree), name); });
const stripOwnNotice = (node: ts.Expression) => ts.transform(node, [(context) => {
  const visit: ts.Visitor = (child) => {
    if (ts.isParameter(child) && child.name.getText(current.tree) === 'noticeGeneration') return undefined;
    if (ts.isVariableStatement(child) && child.declarationList.declarations.some(d => d.name.getText(current.tree) === 'noticeGeneration')) return undefined;
    if (ts.isExpressionStatement(child) && ts.isCallExpression(child.expression) && child.expression.expression.getText(current.tree) === 'dismissDetectionNotice') return undefined;
    if (ts.isIfStatement(child) && child.expression.getText(current.tree).startsWith('detectionNoticeRef.current.active')) {
      assert.ok(ts.isBlock(child.thenStatement)); const statement = child.thenStatement.statements[0] as ts.ExpressionStatement;
      const assignment = statement.expression as ts.BinaryExpression; assert.equal(assignment.left.getText(current.tree), 'detectionNoticeRef.current.id');
      return ts.factory.createExpressionStatement(assignment.right);
    }
    if (ts.isCallExpression(child) && ['processFile', 'convertPdfToImage'].includes(child.expression.getText(current.tree))) return ts.factory.updateCallExpression(child, child.expression, child.typeArguments, child.arguments.filter(arg => arg.getText(current.tree) !== 'noticeGeneration'));
    return ts.visitEachChild(child, visit, context);
  }; return root => ts.visitNode(root, visit) as ts.Expression;
}]);
for (const name of ownChanges) check('Removing only notice metadata leaves ' + name + ' algorithm unchanged', () => { const result = stripOwnNotice(current.variables.get(name)!); assert.equal(print(result.transformed[0], current.tree), print(before.variables.get(name)!, before.tree)); result.dispose(); });
check('Other toast calls are byte-identical; only one exact-ID dismiss added', () => {
  const dismisses = current.toastCalls.filter(call => call.expression.getText(current.tree) === 'toast.dismiss'); assert.equal(dismisses.length, 1); assert.equal(dismisses[0].arguments.length, 1); assert.equal(dismisses[0].arguments[0].getText(current.tree), 'id');
  assert.deepEqual(current.toastCalls.filter(call => call.expression.getText(current.tree) !== 'toast.dismiss').map(call => call.getText(current.tree)), before.toastCalls.map(call => call.getText(before.tree)));
});
check('Count is a polite atomic live status, without changing result text', () => assert.match(source, /<span role="status" aria-live="polite" aria-atomic="true" className="text-xs text-slate-500">\{visibleScannedWines.length\}/));
const protectedPaths = ['src/components/AccountNotifications.tsx', 'src/components/ui/sonner.tsx', 'src/components/ui/drawer.tsx', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineAffinityExplanation.ts'];
for (const file of protectedPaths) check('Protected source ' + file, () => assert.equal(readFileSync(file, 'utf8'), execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8' })));
const sourceHashes = Object.fromEntries([path, ...protectedPaths, 'scripts/check-matchrim-menu-notice-oct13.ts'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ scope: 'Only10 owned notice callback/refs/AST controls, no real owner switch, PDF render, persistence or provider QA. Owner instance control does not certify the global account-change queue; that component remains unchanged.', baseline, checks, sourceHashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, failures: checks.filter(c => !c.passed) }));
if (checks.some(c => !c.passed)) process.exitCode = 1;
