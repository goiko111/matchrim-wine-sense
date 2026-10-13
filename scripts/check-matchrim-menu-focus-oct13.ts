import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const output = process.argv[2];
if (!output) throw Error('Pass11 result JSON path');
const path = 'src/components/wine-import/WineMenuScanner.tsx', baseline = '30df48aa21a3771a26c9a03aca63b02e8bb899f0';
const oldSource = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }), source = readFileSync(path, 'utf8');
const inspect = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), variables = new Map<string, ts.Expression>(), effects: string[] = [], openCalls: ts.CallExpression[] = [], focusCalls: string[] = [];
  let drawer: ts.JsxOpeningElement | undefined, content: ts.JsxOpeningElement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
    if (ts.isCallExpression(node)) {
      const name = node.expression.getText(tree);
      if (['useLayoutEffect', 'useEffect'].includes(name)) effects.push(node.getText(tree));
      if (name === 'openWineDetail') openCalls.push(node);
      if (name.endsWith('.focus')) focusCalls.push(node.getText(tree));
    }
    if (ts.isJsxOpeningElement(node)) { if (node.tagName.getText(tree) === 'Drawer') drawer = node; if (node.tagName.getText(tree) === 'DrawerContent') content = node; }
    ts.forEachChild(node, visit);
  }; visit(tree); return { tree, variables, effects, openCalls, focusCalls, drawer, content };
};
const before = inspect(oldSource), current = inspect(source), checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const attr = (element: ts.JsxOpeningElement, name: string) => element.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(current.tree) === name) as ts.JsxAttribute;
const attrExpression = (attribute: ts.JsxAttribute) => (attribute.initializer as ts.JsxExpression).expression!;
const compile = (expression: string) => ts.transpileModule('globalThis.subject = ' + expression + ';', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
const runtime = () => {
  const state = { current: { active: false, open: false, generation: 0, opener: null as unknown } }, selection: Array<[string, number | null]> = [];
  const scope = vm.createContext({ detailFocusRef: state, profileRetryRef: { current: null }, invalidateProfileRetry: () => {}, dismissDetectionNotice: () => {}, setHighlightedWineIndex: (index: number) => selection.push(['highlight', index]), setSelectedPinIndex: (index: number | null) => selection.push(['selected', index]) });
  const invalidator = current.variables.get('invalidateDetailFocus') as ts.CallExpression;
  vm.runInContext(compile(invalidator.arguments[0].getText(current.tree)), scope); const invalidate = scope.subject; scope.invalidateDetailFocus = invalidate;
  vm.runInContext(compile(current.variables.get('openWineDetail')!.getText(current.tree)), scope); const open = scope.subject;
  vm.runInContext(compile(attrExpression(attr(current.drawer!, 'onOpenChange')).getText(current.tree)), scope); const change = scope.subject;
  const effectText = current.effects.find(text => text.includes('detailFocusRef'))!;
  const effectTree = ts.createSourceFile('effect.ts', effectText, ts.ScriptTarget.Latest, true), effectCall = (effectTree.statements[0] as ts.ExpressionStatement).expression as ts.CallExpression;
  vm.runInContext(compile(effectCall.arguments[0].getText(effectTree)), scope); const cleanup = scope.subject();
  const restore = (generation: number) => {
    vm.runInContext(compile('(detailFocusGeneration) => ' + current.variables.get('restoreDetailFocus')!.getText(current.tree)), scope);
    return scope.subject(generation);
  };
  return { state, selection, open, change, invalidate, cleanup, restore };
};
const target = (connected = true) => { const calls: Array<{ preventScroll?: boolean }> = []; return { element: { isConnected: connected, focus: (options: { preventScroll?: boolean }) => calls.push({ ...options }) }, calls }; };
const event = () => { const state = { prevented: 0 }; return { state, value: { preventDefault: () => state.prevented++ } }; };
check('Initial open retains exact real trigger and selection values', () => { const r = runtime(), t = target(); r.open(3, t.element); assert.equal(r.state.current.opener, t.element); assert.equal(r.state.current.open, true); assert.equal(r.state.current.generation, 1); assert.deepEqual(r.selection, [['highlight', 3], ['selected', 3]]); assert.equal(t.calls.length, 0); });
for (const label of ['Escape', 'Close']) check(label + ' closes and restores exact connected trigger without scroll', () => { const r = runtime(), t = target(), e = event(); r.open(3, t.element); const restore = r.restore(1); r.change(false); restore(e.value); assert.equal(e.state.prevented, 1); assert.equal(t.calls.length, 1); assert.equal(t.calls[0].preventScroll, true); assert.equal(r.state.current.opener, null); restore(e.value); assert.equal(t.calls.length, 1); });
check('Content/previous-next opener while already open does not replace trigger or steal focus', () => { const r = runtime(), original = target(), other = target(); r.open(0, original.element); r.open(1, other.element); r.open(0); assert.equal(r.state.current.opener, original.element); assert.equal(r.state.current.generation, 1); assert.equal(original.calls.length + other.calls.length, 0); });
check('Restore while modal still open cannot steal user focus', () => { const r = runtime(), t = target(); r.open(0, t.element); r.restore(1)(event().value); assert.equal(t.calls.length, 0); assert.equal(r.state.current.opener, t.element); });
for (const label of ['clear', 'newbatch', 'unmount/owner']) check(label + ' invalidates old restore callback', () => { const r = runtime(), t = target(); r.open(0, t.element); const restore = r.restore(1); if (label === 'unmount/owner') r.cleanup(); else r.invalidate(); restore(event().value); assert.equal(t.calls.length, 0); assert.equal(r.state.current.opener, null); assert.equal(r.state.current.generation, 2); });
check('Old callback cannot restore a newer closed session', () => { const r = runtime(), first = target(), next = target(); r.open(0, first.element); const oldRestore = r.restore(1); r.change(false); r.open(1, next.element); r.change(false); oldRestore(event().value); assert.equal(first.calls.length + next.calls.length, 0); r.restore(2)(event().value); assert.equal(next.calls.length, 1); });
check('Disconnected trigger is not restored', () => { const r = runtime(), t = target(false); r.open(0, t.element); r.change(false); r.restore(1)(event().value); assert.equal(t.calls.length, 0); assert.equal(r.state.current.opener, null); });
check('Missing trigger never falls back to a foreign activeElement', () => { const r = runtime(); r.open(0); r.change(false); r.restore(1)(event().value); assert.equal(r.state.current.opener, null); });
check('Old owner cleanup cannot touch next keyed instance trigger', () => { const first = runtime(), next = runtime(), t = target(); next.open(0, t.element); first.cleanup(); assert.equal(next.state.current.opener, t.element); assert.equal(next.state.current.active, true); });
check('Inactive old instance cannot retain a new trigger', () => { const r = runtime(), t = target(); r.cleanup(); r.open(0, t.element); assert.equal(r.state.current.opener, null); });
check('Only instance Root adds autoFocus, Content owns close restoration', () => { assert.ok(attr(current.drawer!, 'autoFocus')); assert.equal(attr(current.drawer!, 'autoFocus').initializer, undefined); assert.equal(attrExpression(attr(current.content!, 'onCloseAutoFocus')).getText(current.tree), 'restoreDetailFocus'); assert.equal(current.focusCalls.length, 1); assert.match(current.focusCalls[0], /opener\.focus\(\{ preventScroll: true \}\)/); });
check('Every opening button passes its actual currentTarget; existing selection indices unchanged', () => { assert.equal(current.openCalls.length, before.openCalls.length); for (let index = 0; index < current.openCalls.length; index++) { const call = current.openCalls[index], old = before.openCalls[index]; assert.equal(call.arguments[0].getText(current.tree), old.arguments[0].getText(before.tree)); if (call.arguments[0].getText(current.tree) === 'next') assert.equal(call.arguments.length, 1); else assert.equal(call.arguments[1].getText(current.tree), 'event.currentTarget'); } });
check('Existing lifecycle hooks including notice10/retry08 unchanged', () => assert.deepEqual(current.effects.filter(text => !text.includes('detailFocusRef')), before.effects));
const changed = new Set(['openWineDetail', 'handleFileSelect', 'clearScan']);
check('All existing nested initializers outside focus boundary byte-identical', () => { for (const [name, node] of before.variables) if (!changed.has(name) && name !== 'WineMenuScannerSession') assert.equal(current.variables.get(name)!.getText(current.tree), node.getText(before.tree), name); });
const print = (node: ts.Node, tree: ts.SourceFile) => ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, tree);
const normalize = (node: ts.Expression) => ts.transform(node, [(context) => {
  const visit: ts.Visitor = child => {
    if (ts.isParameter(child) && child.name.getText(current.tree) === 'opener') return undefined;
    if (ts.isVariableStatement(child) && child.declarationList.declarations.some(d => d.name.getText(current.tree) === 'focus' && d.initializer?.getText(current.tree) === 'detailFocusRef.current')) return undefined;
    if (ts.isIfStatement(child) && child.expression.getText(current.tree) === 'focus.active && !focus.open') return undefined;
    if (ts.isExpressionStatement(child) && ts.isCallExpression(child.expression) && child.expression.expression.getText(current.tree) === 'invalidateDetailFocus') return undefined;
    if (ts.isExpressionStatement(child) && ts.isBinaryExpression(child.expression) && child.expression.left.getText(current.tree) === 'detailFocusRef.current.open') return undefined;
    return ts.visitEachChild(child, visit, context);
  }; return root => ts.visitNode(root, visit) as ts.Expression;
}]);
for (const name of changed) check('Removing only focus metadata leaves ' + name + ' behavior unchanged', () => { const result = normalize(current.variables.get(name)!); assert.equal(print(result.transformed[0], current.tree), print(before.variables.get(name)!, before.tree)); result.dispose(); });
check('Existing close selection/retry callback unchanged apart from own open flag', () => { const result = normalize(attrExpression(attr(current.drawer!, 'onOpenChange'))); const oldAttr = before.drawer!.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(before.tree) === 'onOpenChange') as ts.JsxAttribute; assert.equal(print(result.transformed[0], current.tree), print((oldAttr.initializer as ts.JsxExpression).expression!, before.tree)); result.dispose(); });
const protectedPaths = ['src/components/ui/drawer.tsx', 'src/components/AccountNotifications.tsx', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/menuWineActions.ts', 'src/utils/menuProfileRecovery.ts'];
for (const file of protectedPaths) check('Protected source ' + file, () => assert.equal(readFileSync(file, 'utf8'), execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8' })));
const sourceHashes = Object.fromEntries([path, ...protectedPaths, 'scripts/check-matchrim-menu-focus-oct13.ts'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ scope: 'Only11 pure refs/AST guarding captured trigger, owner/batch/unmount and selection/notice/query boundaries. Simulated target objects are not accounts, DOM, PDF/native or screen-reader certification; automatic entry/return verified separately by actual keyboard/tap UI.', baseline, checks, sourceHashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, failures: checks.filter(c => !c.passed) }));
if (checks.some(c => !c.passed)) process.exitCode = 1;
