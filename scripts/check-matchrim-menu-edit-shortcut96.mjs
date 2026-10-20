import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { restoreMenuListJump96 } from './check-matchrim-menu-list-jump96.mjs';
import { restoreMenuMaxHeader96, restoreMenuMaxHeaderPackage96 } from './check-matchrim-menu-max-header96.mjs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { restoreMenuEditorKeyboardGuard96 } from './check-matchrim-menu-editor-keyboard96.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = 'src/components/wine-import/WineMenuScanner.tsx';
const baseline = 'd998e7bb4cb3b12f801c97dc6936c71d46561e6a';
const prior = name => execFileSync('git', ['show', `${baseline}:${name}`], { cwd: root, encoding: 'utf8' });
const before = prior(file);
const sha = value => createHash('sha256').update(value).digest('hex');
const once = (value, from, to) => {
  assert.equal(value.split(from).length, 2, 'One exact reviewed delta: ' + from);
  return value.replace(from, to);
};
const ref = '  const fullActionsSummaryRef = useRef<HTMLElement>(null);\n';
const handler = `  const goToEditing = () => {
    const summary = fullActionsSummaryRef.current;
    if (!isNative || !summary?.isConnected) return;
    summary.focus({ preventScroll: true });
    summary.scrollIntoView({ behavior: 'instant', block: 'center' });
  };

`;
const action = `                    {isNative && <Button type="button" variant="outline" className="min-h-[44px] min-w-0 gap-[8px] whitespace-normal px-[12px] py-[8px] text-left" onClick={goToEditing}>
                      <Edit3 aria-hidden="true" className="shrink-0" style={{ width: 20, height: 20 }} />Ir a edición
                    </Button>}
`;
const summaryRef = ' ref={isNative ? fullActionsSummaryRef : undefined}';
export const MENU_EDIT_SHORTCUT96_TAIL = ' && node scripts/check-matchrim-menu-edit-shortcut96.mjs';

export function restoreMenuEditShortcut96(value) {
  if (value === before) return value;
  value = restoreMenuMaxHeader96(value);
  value = once(value, ref, '');
  value = once(value, handler, '');
  value = once(value, action, '');
  value = once(value, summaryRef, '');
  assert.equal(value, before, 'Whole d998 source inverse; no other markup, closures, data or guards changed');
  return value;
}

export function restoreMenuEditShortcutPackage96(value) {
  const old = prior('package.json');
  if (value === old) return value;
  value = restoreMenuMaxHeaderPackage96(value);
  const command = JSON.parse(old).scripts['test:closure96'];
  value = once(value, command + MENU_EDIT_SHORTCUT96_TAIL, command);
  assert.equal(value, old, 'Exact old package, dependencies and closure prefix; one appended leaf only');
  return value;
}

const guardChanges = {
  'scripts/check-matchrim-menu-list-action96.mjs': [
    ["import { restoreMenuEditShortcut96 } from './check-matchrim-menu-edit-shortcut96.mjs';\n", ''],
    ['  source = restoreMenuEditShortcut96(source);\n', ''],
    ["const source = restoreMenuEditShortcut96(fs.readFileSync(path.join(root, file), 'utf8')), checks = [];", "const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];"],
  ],
  'scripts/check-matchrim-native-menu-entry-bridge96.mjs': [
    ["import { restoreMenuEditShortcutPackage96 } from './check-matchrim-menu-edit-shortcut96.mjs';\n", ''],
    ['  value = restoreMenuEditShortcutPackage96(value);\n', ''],
  ],
};
function restoreGuard(name, value) {
  if (name === 'scripts/check-matchrim-native-menu-entry-bridge96.mjs') value = restoreMenuEditorKeyboardGuard96(name, value);
  for (const [from, to] of guardChanges[name]) value = once(value, from, to);
  assert.equal(value, prior(name), 'Whole d998 guard inverse; all old assertions and counts retained');
  return value;
}

function nodes(source, predicate) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), found = [];
  const visit = n => { if (predicate(n, tree)) found.push(n); ts.forEachChild(n, visit); }; visit(tree);
  return { tree, found };
}
function one(source, predicate) {
  const result = nodes(source, predicate); assert.equal(result.found.length, 1); return { tree: result.tree, node: result.found[0] };
}
function closure(source, native, target) {
  const { tree, node } = one(source, n => ts.isVariableDeclaration(n) && n.name.getText() === 'goToEditing');
  const context = vm.createContext({ isNative: native, fullActionsSummaryRef: { current: target } });
  vm.runInContext(ts.transpileModule('globalThis.run=' + node.initializer.getText(tree), {}).outputText, context);
  context.run();
}
function webTree(source) {
  const { tree, node } = one(source, n => ts.isVariableDeclaration(n) && n.name.getText() === 'WineMenuScannerSession');
  const jsx = node.initializer.body.statements.filter(ts.isReturnStatement).at(-1).expression;
  const bool = n => n?.kind === ts.SyntaxKind.FalseKeyword ? false : n?.kind === ts.SyntaxKind.TrueKeyword ? true : null;
  const transformed = ts.transform(jsx, [context => {
    const visit = n => {
      if (ts.isIdentifier(n) && n.text === 'isNative') return context.factory.createFalse();
      const x = ts.visitEachChild(n, visit, context);
      if (ts.isConditionalExpression(x) && bool(x.condition) !== null) return bool(x.condition) ? x.whenTrue : x.whenFalse;
      if (ts.isPrefixUnaryExpression(x) && x.operator === ts.SyntaxKind.ExclamationToken && bool(x.operand) !== null)
        return bool(x.operand) ? context.factory.createFalse() : context.factory.createTrue();
      if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && bool(x.left) === false) return context.factory.createFalse();
      if (ts.isJsxAttributes(x)) return context.factory.updateJsxAttributes(x, x.properties.filter(a =>
        !(ts.isJsxAttribute(a) && a.name.getText(tree) === 'ref' && ts.isJsxExpression(a.initializer)
          && ts.isIdentifier(a.initializer.expression) && a.initializer.expression.text === 'undefined')));
      if (ts.isJsxElement(x)) return context.factory.updateJsxElement(x, x.openingElement,
        x.children.filter(c => !(ts.isJsxExpression(c) && bool(c.expression) === false)), x.closingElement);
      return x;
    };
    return n => ts.visitNode(n, visit);
  }]);
  try {
    const printed = ts.createPrinter().printNode(ts.EmitHint.Expression, transformed.transformed[0], tree);
    const js = ts.transpileModule('const output=' + printed, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    const ast = ts.createSourceFile('web.js', js, ts.ScriptTarget.Latest, true);
    const shape = n => {
      if (ts.isParenthesizedExpression(n)) return shape(n.expression);
      const children = []; ts.forEachChild(n, c => { children.push(shape(c)); });
      return children.length ? [n.kind, children] : [n.kind, n.text ?? n.getText(ast)];
    };
    return JSON.stringify(shape(ast));
  } finally { transformed.dispose(); }
}

export function runMenuEditShortcut96() {
  const source = restoreMenuListJump96(fs.readFileSync(path.join(root, file), 'utf8')), checks = [];
  const test = (name, run) => { run(); checks.push(name); };
  test('Exact frozen d998 source', () => assert.equal(sha(before), 'e5057477d82d90ce331a6b9cfd50fb10d95393bf8408236ab8574a44e30013b0'));
  test('Whole source inverse preserves every existing callback, data, score and web byte', () => restoreMenuEditShortcut96(source));
  test('Baseline is the only unmodified inverse', () => assert.equal(restoreMenuEditShortcut96(before), before));
  test('Complete native-false main JSX AST exact; undefined ref has no DOM output', () => assert.equal(webTree(source), webTree(before)));
  test('One native-only header action, no nested activator or duplicate panel', () => {
    const { tree, node } = one(source, (n, t) => ts.isJsxExpression(n) && n.getText(t).includes('Ir a edición') && n.getText(t).startsWith('{isNative && <Button'));
    const html = native => {
      const context = vm.createContext({ React, isNative: native, Button: 'button', Edit3: p => React.createElement('svg', p), goToEditing() {} });
      vm.runInContext(ts.transpileModule('globalThis.action=' + node.expression.getText(tree), { compilerOptions: { jsx: ts.JsxEmit.React } }).outputText, context);
      return renderToStaticMarkup(context.action);
    };
    assert.equal(html(false), '');
    assert.equal((html(true).match(/<button/g) ?? []).length, 1);
    assert(html(true).includes('Ir a edición')); assert(html(true).includes('min-h-[44px]'));
    assert.equal(nodes(source, (n, t) => ts.isJsxElement(n) && n.openingElement.tagName.getText(t) === 'summary' && n.getText(t).includes('Ver fichas completas y acciones')).found.length, 1);
  });
  for (const open of [false, true]) test('Actual closure focuses and centers without changing open=' + open, () => {
    const calls = [], target = { isConnected: true, open,
      focus: options => calls.push(['focus', JSON.parse(JSON.stringify(options))]),
      scrollIntoView: options => calls.push(['scroll', JSON.parse(JSON.stringify(options))]) };
    closure(source, true, target);
    assert.deepEqual(calls, [['focus', { preventScroll: true }], ['scroll', { behavior: 'instant', block: 'center' }]]);
    assert.equal(target.open, open);
  });
  for (const [label, native, target] of [['web', false, { isConnected: true }], ['reset/unmount ref cleared', true, null], ['disconnected owner/preview element', true, { isConnected: false }]])
    test('Actual connected/native guard: ' + label, () => closure(source, native, target));
  test('No async subscriptions, synthetic activation, opening or state update', () => {
    assert(!/\.open\s*=|\.click\(|set[A-Z]|requestAnimationFrame|setTimeout|addEventListener|await /.test(handler));
    assert(source.includes('<summary' + summaryRef));
  });
  test('Exact package registration and old command/dependencies', () => {
    const pkg = restoreMenuMaxHeaderPackage96(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(JSON.parse(pkg).scripts['test:closure96'], JSON.parse(prior('package.json')).scripts['test:closure96'] + MENU_EDIT_SHORTCUT96_TAIL);
    restoreMenuEditShortcutPackage96(pkg);
  });
  for (const name of Object.keys(guardChanges)) {
    const value = fs.readFileSync(path.join(root, name), 'utf8');
    test('Whole historical guard inverse: ' + name, () => restoreGuard(name, value));
    test('Reject changed historical assertions: ' + name, () => assert.throws(() => restoreGuard(name, value + '\n// unreviewed\n')));
  }
  const mutations = [
    ['!isNative || !summary?.isConnected', '!summary?.isConnected'],
    ['summary.focus({ preventScroll: true });', 'summary.click();'],
    ['summary.focus({ preventScroll: true });', 'summary.open = true; summary.focus({ preventScroll: true });'],
    ["behavior: 'instant', block: 'center'", "behavior: 'smooth', block: 'center'"],
    ['Ir a edición', 'Editar ahora'],
    ['min-h-[44px] min-w-0 gap-[8px]', 'min-h-[43px] min-w-0 gap-[8px]'],
    ['onClick={goToEditing}', 'onClick={() => goToEditing()}'],
    ['ref={isNative ? fullActionsSummaryRef : undefined}', 'ref={fullActionsSummaryRef}'],
    ['onClick={(event) => openWineDetail(index, event.currentTarget)}', 'onClick={() => openWineDetail(index)}'],
    ["'flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2'", "'flex items-center gap-2'"],
    ['const getWineDecision = (wine: ScannedWine) => {', 'const getWineDecision = (wine: ScannedWine) => { return { score:99 };'],
    ['Ver fichas completas y acciones', 'Abrir acciones nuevas'],
  ];
  for (const [from, to] of mutations) test('Reject source mutation: ' + from, () => {
    assert(source.includes(from)); assert.throws(() => restoreMenuEditShortcut96(source.replace(from, to)));
  });
  return { passed: checks.length, failed: 0, checks, negativeControls: mutations.length, wholeD998Inverse: true,
    webMainASTExact: true, SDK: 0, network: 0, scope: 'Actual source/closure/render checks; browser and UIKit evidence separate.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runMenuEditShortcut96()));
