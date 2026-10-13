import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { awaitMenuCatalog } from '../src/utils/menuCatalogAwait';

const output = process.argv[2];
if (!output) throw Error('Pass15 result JSON path');
const path = 'src/components/wine-import/WineMenuScanner.tsx', baseline = '1c8c8805a368c211895b89e69c0f3313befbd771';
const oldSource = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }), source = readFileSync(path, 'utf8');
const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = async (name: string, run: () => unknown) => { try { await run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const deferred = <Value>() => { let resolve!: (value: Value) => void, reject!: (error: unknown) => void; const promise = new Promise<Value>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const instrument = () => {
  const controller = new AbortController(), signal = controller.signal;
  let added = 0, removed = 0;
  const add = signal.addEventListener.bind(signal), remove = signal.removeEventListener.bind(signal);
  signal.addEventListener = (...args: Parameters<typeof signal.addEventListener>) => { added++; add(...args); };
  signal.removeEventListener = (...args: Parameters<typeof signal.removeEventListener>) => { removed++; remove(...args); };
  return { controller, signal, listeners: () => ({ added, removed }) };
};
await check('Success preserves exact result without changing background operation', async () => { const state = instrument(), value = { mathematicalValue: 7 }; let calls = 0; const result = await awaitMenuCatalog(() => { calls++; return Promise.resolve(value); }, state.signal); assert.equal(result, value); assert.equal(calls, 1); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Null lookup result remains null', async () => { const state = instrument(); assert.equal(await awaitMenuCatalog(() => Promise.resolve(null), state.signal), null); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Underlying rejection remains exact error when not cancelled', async () => { const state = instrument(), error = new Error('lookup-control'); await assert.rejects(awaitMenuCatalog(() => Promise.reject(error), state.signal), actual => actual === error); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Synchronous factory throw rejects and removes listener', async () => { const state = instrument(), error = new Error('factory-control'); await assert.rejects(awaitMenuCatalog(() => { throw error; }, state.signal), actual => actual === error); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Pre-aborted signal starts no lookup or listener', async () => { const state = instrument(); state.controller.abort(); let calls = 0; await assert.rejects(awaitMenuCatalog(() => { calls++; return Promise.resolve(null); }, state.signal), { name: 'AbortError' }); assert.equal(calls, 0); assert.deepEqual(state.listeners(), { added: 0, removed: 0 }); });
await check('Pending local wait rejects on abort without resolving underlying lookup', async () => { const state = instrument(), request = deferred<null>(); let completed = false; request.promise.then(() => { completed = true; }); const waiting = awaitMenuCatalog(() => request.promise, state.signal); state.controller.abort(); await assert.rejects(waiting, { name: 'AbortError' }); assert.equal(completed, false); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); request.resolve(null); await request.promise; assert.equal(completed, true); });
await check('Late result cannot turn cancelled wrapper into success', async () => { const state = instrument(), request = deferred<number>(); const waiting = awaitMenuCatalog(() => request.promise, state.signal); let published = 0; const handled = waiting.then(() => { published++; }, () => {}); state.controller.abort(); await handled; request.resolve(42); await Promise.resolve(); await Promise.resolve(); assert.equal(published, 0); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Late rejection is consumed after local cancellation, not unhandled', async () => { const state = instrument(), request = deferred<number>(), unhandled: unknown[] = []; const observer = (error: unknown) => unhandled.push(error); process.on('unhandledRejection', observer); try { const waiting = awaitMenuCatalog(() => request.promise, state.signal); state.controller.abort(); await assert.rejects(waiting, { name: 'AbortError' }); request.reject(new Error('late-control')); await new Promise(resolve => setTimeout(resolve, 0)); assert.deepEqual(unhandled, []); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); } finally { process.removeListener('unhandledRejection', observer); } });
await check('Synchronous abort during factory is not overwritten by later result', async () => { const state = instrument(); await assert.rejects(awaitMenuCatalog(() => { state.controller.abort(); return Promise.resolve(3); }, state.signal), { name: 'AbortError' }); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Abort after successful completion cannot change result or repeat cleanup', async () => { const state = instrument(); const result = await awaitMenuCatalog(() => Promise.resolve(9), state.signal); state.controller.abort(); assert.equal(result, 9); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); });
await check('Repeated abort has single rejection and cleanup', async () => { const state = instrument(), request = deferred<null>(), waiting = awaitMenuCatalog(() => request.promise, state.signal); state.controller.abort(); state.controller.abort(); await assert.rejects(waiting, { name: 'AbortError' }); assert.deepEqual(state.listeners(), { added: 1, removed: 1 }); request.resolve(null); });
const inspect = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), variables = new Map<string, ts.Expression>(), effects: string[] = [], lookups: string[] = [];
  let abortClause: ts.IfStatement | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
    if (ts.isCallExpression(node)) {
      if (['useEffect', 'useLayoutEffect'].includes(node.expression.getText(tree))) effects.push(node.getText(tree));
      if (node.expression.getText(tree) === 'findWinerimWineForLabel') lookups.push(node.getText(tree));
    }
    if (ts.isIfStatement(node) && node.expression.getText(tree).includes("error.name === 'AbortError'") && node.thenStatement.getText(tree).includes('setScanFeedback')) abortClause = node;
    ts.forEachChild(node, visit);
  }; visit(tree); return { tree, variables, effects, lookups, abortClause };
};
const before = inspect(oldSource), current = inspect(source);
for (const isCurrent of [true, false]) await check('Abort feedback only from current controller=' + isCurrent, () => {
  const controller = {}, messages: string[] = [], scope = vm.createContext({ DOMException, scanAbortRef: { current: isCurrent ? controller : {} }, setScanFeedback: (value: string) => messages.push(value) });
  vm.runInContext(ts.transpileModule('globalThis.subject=(error,controller)=>{' + current.abortClause!.getText(current.tree) + '};', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, scope);
  scope.subject(new DOMException('Cancelled', 'AbortError'), controller); assert.equal(messages.length, isCurrent ? 1 : 0);
});
await check('Canonical lookup expression and argument shape remain identical', () => assert.deepEqual(current.lookups, before.lookups));
await check('All existing effects and cancellation/focus lifetimes unchanged', () => assert.deepEqual(current.effects, before.effects));
await check('Every existing nested initializer outside processFile byte-identical', () => {
  for (const [name, node] of before.variables) {
    let insideProcessFile = false;
    for (let owner: ts.Node | undefined = node; owner; owner = owner.parent) {
      if (ts.isVariableDeclaration(owner) && ts.isIdentifier(owner.name) && owner.name.text === 'processFile') insideProcessFile = true;
    }
    if (!insideProcessFile && name !== 'WineMenuScannerSession') assert.equal(current.variables.get(name)!.getText(current.tree), node.getText(before.tree), name);
  }
});
const print = (node: ts.Node, tree: ts.SourceFile) => ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, tree);
await check('Removing only local wait wrapper and abort-publish guard leaves complete old process AST', () => {
  const result = ts.transform(current.variables.get('processFile')!, [(context) => {
    const visit: ts.Visitor = child => {
      if (ts.isCallExpression(child) && child.expression.getText(current.tree) === 'awaitMenuCatalog') { const factory = child.arguments[0]; assert.ok(ts.isArrowFunction(factory)); return factory.body as ts.Expression; }
      if (ts.isIfStatement(child) && child.expression.getText(current.tree) === 'scanAbortRef.current === controller' && ts.isBlock(child.thenStatement) && child.thenStatement.getText(current.tree).includes('setScanFeedback')) return child.thenStatement.statements[0];
      return ts.visitEachChild(child, visit, context);
    }; return root => ts.visitNode(root, visit) as ts.Expression;
  }]);
  assert.equal(print(result.transformed[0], current.tree), print(before.variables.get('processFile')!, before.tree)); result.dispose();
});
const protectedPaths = ['src/services/winerimApi.ts', 'src/utils/invokeEdgeFunction.ts', 'src/components/ui/drawer.tsx', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineAffinityExplanation.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts', 'src/utils/menuWineActions.ts'];
for (const file of protectedPaths) await check('Protected source ' + file, () => assert.equal(readFileSync(file, 'utf8'), execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8' })));
const sourceHashes = Object.fromEntries([path, 'src/utils/menuCatalogAwait.ts', ...protectedPaths, 'scripts/check-matchrim-menu-ranking-cancel-oct13.ts'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ scope: 'Only15 pure local await ownership/cleanup/result/error controls and scanner AST/current-controller feedback. Background operation deliberately remains running; no SDK/provider/query/RLS change, server abort or cost claim; no users/real canonical/profile.', baseline, checks, sourceHashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, failures: checks.filter(c => !c.passed) }));
if (checks.some(c => !c.passed)) process.exitCode = 1;
