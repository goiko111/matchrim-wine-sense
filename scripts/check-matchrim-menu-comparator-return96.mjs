import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript'), React = require('react');
const file = 'src/components/wine-import/WineMenuScanner.tsx';
const baseline = 'b5a6fabd2f892771d95d8ea7c61acb76fc644a57';
const before = execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' });
const sha = value => createHash('sha256').update(value).digest('hex');
const parse = source => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const nodes = (source, predicate) => {
  const tree = parse(source), found = [];
  const visit = node => { if (predicate(node, tree)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree); return { tree, found };
};
const once = (source, from, to) => { assert.equal(source.split(from).length, 2, from); return source.replace(from, to); };
const initializer = (source, name) => {
  const { tree, found } = nodes(source, n => ts.isVariableDeclaration(n) && n.name.getText() === name && n.initializer);
  assert.equal(found.length, 1, name); return found[0].initializer.getText(tree);
};
const newButton = source => {
  const { tree, found } = nodes(source, (n, t) => ts.isJsxExpression(n)
    && n.getText(t).startsWith('{isNative && scannedWines.length >= 2 && <Button') && n.getText(t).includes('Ir al comparador'));
  assert.equal(found.length, 1); return found[0].getText(tree);
};

export function restoreNativeMenuComparatorReturn96(source) {
  if (source === before) return source;
  const start = source.indexOf('  useLayoutEffect(() => () => comparisonReturnCleanup.current?.(),');
  const end = source.indexOf('\n  useEffect(() => {', start);
  assert(start >= 0 && end > start);
  assert.equal(sha(source.slice(start, end)), '045e9794b91d3bbeeeed593297a73acab98d67a5145f8a163a365f338733e746');
  source = source.slice(0, start) + source.slice(end + 1);
  const button = newButton(source);
  assert.equal(sha(button), 'c27a1efd787ad3a3d4531805a320238bc070a0cb0ea983ad9359b7a36121e686');
  source = once(source, '                        ' + button + '\n', '');
  source = once(source, '  const comparisonPanelRef = useRef<HTMLDetailsElement>(null);\n', '');
  source = once(source, '  const comparisonReturnCleanup = useRef<(() => void) | null>(null);\n', '');
  source = once(source, 'RefreshCw, ArrowUp } from "lucide-react";', 'RefreshCw } from "lucide-react";');
  source = once(source, '<details ref={kind === \'comparison\' ? comparisonPanelRef : undefined} className="min-w-0 border-y', '<details className="min-w-0 border-y');
  assert.equal(source, before, 'Whole b5 source including all requests, lifecycle, handlers and data bytes');
  return source;
}

function webJSX(source) {
  const printer = ts.createPrinter();
  const session = initializer(source, 'WineMenuScannerSession');
  const sessionTree = parse('const session = ' + session);
  const sessionFunction = sessionTree.statements[0].declarationList.declarations[0].initializer;
  const expression = sessionFunction.body.statements.filter(ts.isReturnStatement).at(-1).expression;
  const changed = ts.transform(expression, [context => {
    const boolean = n => n?.kind === ts.SyntaxKind.FalseKeyword ? false : n?.kind === ts.SyntaxKind.TrueKeyword ? true : null;
    const visit = n => {
      if (ts.isIdentifier(n) && n.text === 'isNative') return context.factory.createFalse();
      const x = ts.visitEachChild(n, visit, context);
      if (ts.isParenthesizedExpression(x) && boolean(x.expression) !== null) return x.expression;
      if (ts.isPrefixUnaryExpression(x) && x.operator === ts.SyntaxKind.ExclamationToken && boolean(x.operand) !== null)
        return boolean(x.operand) ? context.factory.createFalse() : context.factory.createTrue();
      if (ts.isConditionalExpression(x) && boolean(x.condition) !== null) return boolean(x.condition) ? x.whenTrue : x.whenFalse;
      if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (boolean(x.left) === false || boolean(x.right) === false) return context.factory.createFalse();
        if (boolean(x.left) === true) return x.right;
      }
      if (ts.isJsxElement(x)) return context.factory.updateJsxElement(x, x.openingElement,
        x.children.filter(child => !(ts.isJsxExpression(child) && boolean(child.expression) === false)), x.closingElement);
      return x;
    };
    return n => ts.visitNode(n, visit);
  }]);
  try {
    const code = ts.transpileModule('const rendered=' + printer.printNode(ts.EmitHint.Expression, changed.transformed[0], sessionTree),
      { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    const ast = ts.createSourceFile('web.js', code, ts.ScriptTarget.Latest, true);
    const shape = n => {
      if (ts.isParenthesizedExpression(n)) return shape(n.expression);
      const children = []; ts.forEachChild(n, child => { children.push(shape(child)); });
      return children.length ? [n.kind, children] : [n.kind, n.text ?? n.getText(ast)];
    };
    return JSON.stringify(shape(ast));
  } finally { changed.dispose(); }
}

function closureHarness(source, native = true) {
  const events = () => ({ listeners: new Map(), addEventListener(k, f) { this.listeners.set(k, f); },
    removeEventListener(k, f) { if (this.listeners.get(k) === f) this.listeners.delete(k); } });
  let next = 0, blurs = 0, focuses = 0, scrolls = 0;
  const frames = new Map(), timers = new Map(), observers = [];
  class Element { focus(options) { assert.deepEqual({ ...options }, { preventScroll: true }); focuses++; }
    scrollIntoView(options) { assert.deepEqual({ ...options }, { behavior: 'instant', block: 'center' }); scrolls++; } }
  const summary = new Element(), panel = { isConnected: true, open: false, querySelector: s => s === 'summary' ? summary : null };
  const ref = { current: panel }, cleanup = { current: null };
  const viewport = events(), window = { ...events(), visualViewport: viewport, setTimeout: (f, ms) => {
    assert.equal(ms, 1000); const id = ++next; timers.set(id, f); return id;
  }, clearTimeout: id => timers.delete(id) };
  const document = { ...events(), documentElement: {}, activeElement: { blur() { blurs++; } } };
  const context = vm.createContext({ isNative: native, HTMLElement: Element, comparisonPanelRef: ref, comparisonReturnCleanup: cleanup,
    window, document, requestAnimationFrame: f => { const id = ++next; frames.set(id, f); return id; }, cancelAnimationFrame: id => frames.delete(id),
    MutationObserver: class { constructor(f) { this.fn = f; observers.push(this); } observe(node, options) {
      assert.equal(node, document.documentElement); assert.equal(JSON.stringify(options), '{"attributes":true,"attributeFilter":["class"]}'); this.observing = true;
    } disconnect() { this.observing = false; } } });
  vm.runInContext(ts.transpileModule('globalThis.action=' + initializer(source, 'returnToComparison'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const frame = () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(f => f()); };
  return { action: context.action, panel, ref, cleanup, summary, viewport, window, document, frames, timers, observers, frame,
    flush() { frame(); frame(); }, stats: () => ({ blurs, focuses, scrolls }) };
}

export function runMenuComparatorReturn96() {
  const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];
  const test = (name, run) => { run(); checks.push(name); };
  test('Exact b5 baseline and whole-file inverse', () => {
    assert.equal(sha(before), 'b9d3e74f3eb55ea783c1b1551ad070148eb8fe20f3454da4367604cd194f3dc9');
    restoreNativeMenuComparatorReturn96(source);
    assert.equal(restoreNativeMenuComparatorReturn96(before), before, 'Already-exact b5 is the only no-op');
  });
  test('Complete native-false main JSX AST unchanged', () => assert.equal(webJSX(source), webJSX(before)));
  test('Original panel helper web SSR exact; native has only one same details', () => {
    for (const isNative of [false, true]) {
      const context = vm.createContext({ React, isNative, comparisonPanelRef: { current: null } });
      vm.runInContext(ts.transpileModule('globalThis.render=' + initializer(source, 'renderOptionalNativePanel'),
        { compilerOptions: { jsx: ts.JsxEmit.React } }).outputText, context);
      const child = React.createElement('section', null, 'same workspace');
      const result = context.render('comparison', 'Comparar 2–5 vinos', child);
      if (!isNative) assert.equal(result, child);
      else { assert.equal(result.type, 'details'); assert.equal(result.props.children[1].props.children, child); }
      assert(renderToStaticMarkup(result).includes('same workspace'));
    }
  });
  test('CTA native only, >=2 wines, outside editing conditional, physical44 and decorative20', () => {
    const button = newButton(source);
    assert(button.includes('min-h-[44px]')); assert(button.includes('width: 20, height: 20'));
    assert(button.includes('aria-hidden="true"')); assert(button.includes('onClick={returnToComparison}'));
    assert.equal(source.indexOf(button) < source.indexOf('{isEditing && ('), true);
    assert.equal(source.split('<WineComparisonWorkspace').length, 2);
  });
  test('Actual closure: one explicit open, blur and double-frame focus/center', () => {
    const h = closureHarness(source); h.action(); assert(h.panel.open); assert.equal(h.stats().blurs, 1);
    h.frame(); assert.equal(h.stats().scrolls, 0); h.frame(); assert.equal(h.stats().scrolls, 1);
    assert.equal(h.stats().focuses, 1); h.cleanup.current();
  });
  test('Actual web closure is inert', () => {
    const h = closureHarness(source, false); h.action(); assert.equal(h.panel.open, false); assert.equal(h.frames.size, 0); assert.equal(h.timers.size, 0);
  });
  test('Missing/detached ref or missing summary is safe', () => {
    for (const kind of ['null', 'detached', 'summary']) {
      const h = closureHarness(source);
      if (kind === 'null') h.ref.current = null;
      if (kind === 'detached') h.panel.isConnected = false;
      if (kind === 'summary') h.panel.querySelector = () => null;
      assert.doesNotThrow(h.action); assert.equal(h.stats().blurs, 0); assert.equal(h.frames.size, 0);
    }
  });
  test('Resize and keyboard root-class observer recenter after restoration', () => {
    const h = closureHarness(source); h.action(); h.flush();
    h.viewport.listeners.get('resize')(); h.flush(); assert.equal(h.stats().scrolls, 2);
    h.observers[0].fn(); h.flush(); assert.equal(h.stats().scrolls, 3); h.cleanup.current();
  });
  test('Bounded cleanup removes every listener/observer/timer/frame', () => {
    const h = closureHarness(source); h.action(); [...h.timers.values()][0]();
    h.flush(); assert.equal(h.stats().scrolls, 0); assert.equal(h.frames.size + h.timers.size, 0);
    for (const target of [h.window, h.viewport, h.document]) assert.equal(target.listeners.size, 0);
    assert.equal(h.observers[0].observing, false); assert.equal(h.cleanup.current, null);
  });
  test('New pointer/keyboard interaction cancels delayed focus', () => {
    for (const type of ['pointerdown', 'keydown']) {
      const h = closureHarness(source); h.action(); h.document.listeners.get(type)(); h.flush(); assert.equal(h.stats().scrolls, 0);
    }
  });
  test('Owner/image/loading/unmount layout cleanup runs actual pending cleanup', () => {
    const { tree, found } = nodes(source, n => ts.isCallExpression(n) && n.expression.getText() === 'useLayoutEffect'
      && n.arguments[0]?.getText().includes('comparisonReturnCleanup.current'));
    assert.equal(found.length, 1); assert.equal(found[0].arguments[1].getText(tree), '[user?.id, preview, loading]');
    const h = closureHarness(source); h.action();
    const context = vm.createContext({ comparisonReturnCleanup: h.cleanup });
    vm.runInContext('globalThis.cleanupFactory=' + found[0].arguments[0].getText(tree), context);
    context.cleanupFactory()(); h.flush(); assert.equal(h.stats().scrolls, 0);
  });
  test('Reset/replacement/closed panel rejects late frame', () => {
    for (const kind of ['detach', 'replacement', 'closed']) {
      const h = closureHarness(source); h.action();
      if (kind === 'detach') h.panel.isConnected = false;
      if (kind === 'replacement') h.ref.current = { ...h.panel };
      if (kind === 'closed') h.panel.open = false;
      h.flush(); assert.equal(h.stats().scrolls, 0); h.cleanup.current();
    }
  });
  test('Repeated explicit action cancels predecessor instead of duplicating controller', () => {
    const h = closureHarness(source); h.action(); h.action(); h.flush();
    assert.equal(h.stats().scrolls, 1); assert.equal(h.timers.size, 1); assert.equal(h.observers.filter(o => o.observing).length, 1);
    h.cleanup.current();
  });
  test('QA wiring preserves every old guard byte and exact closure96 command prefix', () => {
    const guardFile = 'scripts/check-matchrim-menu-results-first96.mjs';
    const guardBefore = execFileSync('git', ['show', `${baseline}:${guardFile}`], { cwd: root, encoding: 'utf8' });
    let guard = fs.readFileSync(path.join(root, guardFile), 'utf8');
    guard = once(guard, "import { restoreNativeMenuComparatorReturn96 } from './check-matchrim-menu-comparator-return96.mjs';\n", '');
    guard = once(guard, '  value = restoreNativeMenuComparatorReturn96(value);\n', '');
    guard = once(guard, "      if (ts.isJsxElement(next)) return context.factory.updateJsxElement(next, next.openingElement,\n        next.children.filter(child => !(ts.isJsxExpression(child) && child.expression && boolean(child.expression) === false)), next.closingElement);\n", '');
    assert.equal(guard, guardBefore, 'Only exact native inverse and inert false-child JSX normalization precede old assertions');
    const packageBefore = execFileSync('git', ['show', `${baseline}:package.json`], { cwd: root, encoding: 'utf8' });
    const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
    const command = JSON.parse(packageBefore).scripts['test:closure96'];
    assert.equal(once(pkg, command + ' && node scripts/check-matchrim-menu-comparator-return96.mjs', command), packageBefore);
    const scopeFile = 'scripts/matchrim-menu-results-first96-scope.mjs';
    const scopeBefore = execFileSync('git', ['show', `${baseline}:${scopeFile}`], { cwd: root, encoding: 'utf8' });
    const scope = fs.readFileSync(path.join(root, scopeFile), 'utf8');
    assert.equal(once(scope, " && node scripts/check-matchrim-menu-comparator-return96.mjs';", "';"), scopeBefore);
  });
  const mutations = [
    ['if (!isNative) return;', 'if (false) return;'], ['min-h-[44px] w-full min-w-0 gap-[8px] self-start', 'min-h-[43px] w-full min-w-0 gap-[8px] self-start'],
    ['panel.open = true;', 'panel.open = false;'], ["block: 'center'", "block: 'start'"],
    ['summary.focus({ preventScroll: true });', 'summary.focus();'], ['!panel.isConnected || !panel.open', '!panel.open'],
    ['[user?.id, preview, loading]', '[preview]'], ['document.addEventListener(\'pointerdown\', cleanup);', ''],
    ['onChange={handleFileSelect}', 'onChange={() => undefined}'], ['setEditingWineIndex(isEditing ? null : index)', 'setEditingWineIndex(null)'],
    ['affinity: isNative ?', 'affinity: true ?'], ['Vinos Detectados', 'Wrong legacy label'],
  ];
  for (const [a, b] of mutations) test('Reject mutation: ' + a, () => {
    assert(source.includes(a), a); assert.throws(() => restoreNativeMenuComparatorReturn96(source.replace(a, b)));
  });
  return { passed: checks.length, failed: 0, checks, mutations: mutations.length, wholeB5Inverse: true, webJSXExact: true,
    actualClosuresExecuted: true, external: 0, SDK: 0, limits: 'No browser, native keyboard or UIKit evidence in this source/closure suite.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runMenuComparatorReturn96()));
