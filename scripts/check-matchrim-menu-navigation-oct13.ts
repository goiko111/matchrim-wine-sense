import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { assertMenu950ProtectedSource, createMenu950StructuralScope } from './matchrim-menu-etapa950-scope';

const output = process.argv[2];
if (!output) throw Error('Pass12 result JSON path');
const path = 'src/components/wine-import/WineMenuScanner.tsx', baseline = '7a3171bb753f0b64a1f5b46813e1c1a7f65f50de';
const oldSource = execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' }), source = readFileSync(path, 'utf8');
const inspect = (text: string) => {
  const tree = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), variables = new Map<string, ts.Expression>(), effects: string[] = [], buttons = new Map<string, ts.JsxOpeningElement>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) variables.set(node.name.text, node.initializer);
    if (ts.isCallExpression(node) && ['useEffect', 'useLayoutEffect'].includes(node.expression.getText(tree))) effects.push(node.getText(tree));
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'Button') {
      const ref = node.openingElement.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(tree) === 'ref') as ts.JsxAttribute | undefined;
      const refName = ref?.initializer && ts.isJsxExpression(ref.initializer) ? ref.initializer.expression?.getText(tree) : null;
      const label = refName === 'detailPreviousRef' ? 'Anterior' : refName === 'detailNextRef' ? 'Siguiente'
        : node.children.filter(ts.isJsxText).map(child => child.text.trim()).join('');
      if (['Anterior', 'Siguiente'].includes(label)) { assert.ok(!buttons.has(label), 'Exactly one navigation button: ' + label); buttons.set(label, node.openingElement); }
    }
    ts.forEachChild(node, visit);
  }; visit(tree); return { tree, variables, effects, buttons };
};
const before = inspect(oldSource), current = inspect(source), checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => void) => { try { run(); checks.push({ name, passed: true }); } catch (error) { checks.push({ name, passed: false, error: String(error) }); } };
const structural950 = createMenu950StructuralScope('nav', oldSource, source);
check('Historical and reviewed etapa950 menu fingerprints are exact', structural950.assertSource);
const attribute = (button: ts.JsxOpeningElement, name: string, tree: ts.SourceFile) => button.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(tree) === name) as ts.JsxAttribute;
const expression = (attr: ts.JsxAttribute) => (attr.initializer as ts.JsxExpression).expression!;
const handler = (label: string) => expression(attribute(current.buttons.get(label)!, 'onClick', current.tree)).getText(current.tree);
const execute = (label: string, index: number, length: number, ownsFocus: boolean, hasOtherRef = true) => {
  const focused: Array<{ preventScroll?: boolean }> = [], selected: number[] = [];
  const button = { id: 'actual-owned-nav' }, other = { focus: (options: { preventScroll?: boolean }) => focused.push({ ...options }) };
  const previous = { current: label === 'Siguiente' ? (hasOtherRef ? other : null) : button }, next = { current: label === 'Anterior' ? (hasOtherRef ? other : null) : button };
  const scope = vm.createContext({ selectedPinIndex: index, scannedWines: Array(length).fill(null), document: { activeElement: ownsFocus ? button : { id: 'user-focus-elsewhere' } }, detailPreviousRef: previous, detailNextRef: next, openWineDetail: (value: number) => selected.push(value) });
  vm.runInContext(ts.transpileModule('globalThis.subject = ' + handler(label) + ';', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, scope);
  scope.subject({ currentTarget: button });
  return { focused, selected };
};
for (const length of [2, 4]) for (const label of ['Anterior', 'Siguiente']) for (const index of label === 'Anterior' ? Array.from({ length: length - 1 }, (_, i) => i + 1) : Array.from({ length: length - 1 }, (_, i) => i)) {
  for (const ownsFocus of [true, false]) check(label + ' index' + index + '/length' + length + '/owns' + ownsFocus, () => {
    const result = execute(label, index, length, ownsFocus), destination = label === 'Anterior' ? Math.max(0, index - 1) : Math.min(length - 1, index + 1);
    const boundary = label === 'Anterior' ? destination === 0 : destination === length - 1;
    assert.deepEqual(result.selected, [destination]); assert.equal(result.focused.length, boundary && ownsFocus ? 1 : 0);
    if (result.focused.length) assert.equal(result.focused[0].preventScroll, true);
  });
}
for (const [label, index] of [['Anterior', 1], ['Siguiente', 2]] as const) check('Missing opposite ref safe, index selection unchanged: ' + label, () => { const result = execute(label, index, 4, true, false); assert.equal(result.focused.length, 0); assert.deepEqual(result.selected, [label === 'Anterior' ? 0 : 3]); });
const print = (node: ts.Node, tree: ts.SourceFile) => ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, tree);
for (const label of ['Anterior', 'Siguiente']) check(label + ' callback after stripping only focus guard equals old index algorithm', () => {
  const node = expression(attribute(current.buttons.get(label)!, 'onClick', current.tree));
  const result = ts.transform(node, [(context) => {
    const visit: ts.Visitor = child => {
      if (ts.isParameter(child) && child.name.getText(current.tree) === 'event') return undefined;
      if (ts.isIfStatement(child) && child.expression.getText(current.tree).includes('document.activeElement === event.currentTarget')) return undefined;
      return ts.visitEachChild(child, visit, context);
    }; return root => ts.visitNode(root, visit) as ts.Expression;
  }]);
  assert.equal(print(result.transformed[0], current.tree), print(expression(attribute(before.buttons.get(label)!, 'onClick', before.tree)), before.tree)); result.dispose();
});
check('Every existing nested initializer retained or explicitly fingerprinted at etapa950', () => {
  for (const [name, node] of before.variables) if (name !== 'WineMenuScannerSession') {
    structural950.initializer(name, current.variables.get(name)?.getText(current.tree), node.getText(before.tree));
  }
});
check('All existing effects unchanged outside reviewed native metrics, no async/global focus effect', () => {
  const [metrics, ...retained] = current.effects;
  let resets = 0, partialResets = 0, failedCountResets = 0;
  const canonical = (effect: string, stripRetryReset: boolean) => {
    const tree = ts.createSourceFile('effect950.ts', effect, ts.ScriptTarget.Latest, true);
    const result = ts.transform(tree, [context => root => {
      const visit: ts.Visitor = node => {
        if (stripRetryReset && ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)
          && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
          && node.expression.left.getText(tree) === 'lastScanInputRef.current'
          && node.expression.right.kind === ts.SyntaxKind.NullKeyword) { resets++; return undefined; }
        if (stripRetryReset && ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)
          && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
          && node.expression.left.getText(tree) === 'partialMenuReadingRef.current'
          && node.expression.right.kind === ts.SyntaxKind.NullKeyword) { partialResets++; return undefined; }
        if (stripRetryReset && ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
          && node.expression.expression.getText(tree) === 'setFailedRegionCount'
          && node.expression.arguments.length === 1 && node.expression.arguments[0].getText(tree) === '0') {
          failedCountResets++; return undefined;
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(root, visit) as ts.SourceFile;
    }]);
    const text = ts.createPrinter({ removeComments: true }).printFile(result.transformed[0]); result.dispose(); return text;
  };
  assert.deepEqual(retained.map(effect => canonical(effect, true)), before.effects.map(effect => canonical(effect, false)));
  assert.equal(resets, 2, 'Only the two reviewed retry-input owner/unmount resets are removed for comparison');
  assert.equal(partialResets, 2, 'R5 adds exactly the owner/unmount partial-cache null resets');
  assert.equal(failedCountResets, 1, 'R5 clears the failed-region count exactly once on owner change');
  assert.equal(createHash('sha256').update(metrics).digest('hex'), '0bdec6db5aa3debaaf668a67374494690450585be41c5e662bc0bfa60316a027');
  assert.doesNotMatch(metrics, /\.focus\s*\(|activeElement|async\s/);
});
check('R5 actual owner/unmount effect empties retained region cache and count without adding a transport', () => {
  const effects = current.effects.filter(effect => effect.includes('partialMenuReadingRef.current') && effect.includes('setFailedRegionCount'));
  assert.equal(effects.length, 1);
  const cache = () => ({ file: 'explicitly-synthetic.jpg', ownerId: 'synthetic-old-owner', successful: [1, 2, 3], failed: [4] });
  const partial = { current: cache() as ReturnType<typeof cache> | null }, input = { current: 'synthetic-input' as string | null };
  let aborted = 0, failed = 1, cleanup: (() => void) | undefined;
  const scope = vm.createContext({ user: { id: 'synthetic-new-owner' }, Set,
    scanAbortRef: { current: { abort: () => { aborted++; } } }, partialMenuReadingRef: partial, lastScanInputRef: input,
    setFailedRegionCount: (value: number) => { failed = value; },
    ...Object.fromEntries(['setScannedWines', 'setPreview', 'setSelectedPinIndex', 'setSavedWineKeys', 'setUnconfirmedWineIndexes',
      'setIdentityHoldIndexes', 'setScanProfile', 'setHasProfile', 'setLoading'].map(name => [name, () => undefined])),
    useEffect: (effect: () => () => void, dependencies: unknown[]) => {
      assert.deepEqual(Array.from(dependencies), ['synthetic-new-owner']); cleanup = effect();
    },
  });
  vm.runInContext(ts.transpileModule(effects[0], { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, scope);
  assert.equal(partial.current, null); assert.equal(input.current, null); assert.equal(failed, 0); assert.equal(aborted, 1);
  partial.current = cache(); input.current = 'another-synthetic-input';
  assert.ok(cleanup); cleanup();
  assert.equal(partial.current, null); assert.equal(input.current, null); assert.equal(aborted, 2);
});
for (const label of ['Anterior', 'Siguiente']) check(label + ' disabled boundary and all other existing button props unchanged', () => {
  const old = before.buttons.get(label)!, now = current.buttons.get(label)!;
  for (const prop of old.attributes.properties) {
    if (!ts.isJsxAttribute(prop) || prop.name.getText(before.tree) === 'onClick') continue;
    const actual = attribute(now, prop.name.getText(before.tree), current.tree).getText(current.tree);
    if (prop.name.getText(before.tree) === 'className') {
      assert.equal(prop.getText(before.tree), 'className="matchrim-pressable min-h-11 bg-white"');
      const classes = expression(attribute(now, 'className', current.tree));
      assert.ok(ts.isConditionalExpression(classes)); assert.equal(classes.condition.getText(current.tree), 'isNative');
      assert.ok(ts.isStringLiteral(classes.whenTrue) && ts.isStringLiteral(classes.whenFalse));
      assert.equal(classes.whenTrue.text, 'matchrim-pressable h-[44px] w-[44px] min-w-0 bg-white p-0');
      assert.equal(classes.whenFalse.text, 'matchrim-pressable h-auto min-h-11 min-w-0 flex-wrap gap-1 whitespace-normal bg-white px-2');
    } else assert.equal(actual, prop.getText(before.tree));
  }
  assert.equal(expression(attribute(now, 'ref', current.tree)).getText(current.tree), label === 'Anterior' ? 'detailPreviousRef' : 'detailNextRef');
});
const fixture = 'docs/qa-evidence/matchrim-menu-list-2026-10-12/before-complete/input-provenance.json';
check('Complete existing immutable corpus hash, four candidates/layout/coverage unchanged', () => { const bytes = readFileSync(fixture); assert.equal(createHash('sha256').update(bytes).digest('hex'), '1c6d8bd4e5d9aa392f476a66ba7a86e8c6a055f752110f3bef008450c6de6e9e'); const data = JSON.parse(bytes.toString()).bothContract; assert.equal(data.vinos.length, 4); assert.equal(data.layout, 'rows'); assert.equal(data.coverage.extracted_wines, 4); });
const protectedPaths = ['src/components/ui/drawer.tsx', 'src/components/AccountNotifications.tsx', 'src/services/winerimApi.ts', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/menuWineActions.ts', 'src/utils/menuProfileRecovery.ts'];
for (const file of protectedPaths) check('Protected source ' + file, () => assertMenu950ProtectedSource('nav', file,
  readFileSync(file, 'utf8'), execFileSync('git', ['show', baseline + ':' + file], { encoding: 'utf8' })));
check('Etapa950 structural guards reject new source, opener and missing initializer mutations', () => {
  assert.throws(() => createMenu950StructuralScope('nav', oldSource, source + '\n').assertSource());
  const name = 'openWineDetail';
  assert.throws(() => structural950.initializer(name, current.variables.get(name)!.getText(current.tree) + '\n', before.variables.get(name)!.getText(before.tree)));
  assert.throws(() => structural950.initializer('menuDecision', undefined, before.variables.get('menuDecision')!.getText(before.tree)));
});
const sourceHashes = Object.fromEntries([path, ...protectedPaths, fixture, 'scripts/check-matchrim-menu-navigation-oct13.ts'].map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]));
writeFileSync(output, JSON.stringify({ scope: 'Only12 navigation boundary callbacks/indices/owned focus guards and byte/AST preservation. Fake button/ref objects are pure controls, not DOM/native/users. UI keyboard/touch multi-fiche is separate local replay; no dataset regeneration.', baseline, checks, sourceHashes }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(c => c.passed).length, total: checks.length, failures: checks.filter(c => !c.passed) }));
if (checks.some(c => !c.passed)) process.exitCode = 1;
