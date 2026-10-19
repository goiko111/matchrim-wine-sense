import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import { restoreNativeMenuComparatorReturn96 } from './check-matchrim-menu-comparator-return96.mjs';
import { restoreMenuEntrySource96 } from './check-matchrim-native-menu-entry-bridge96.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(path.join(root, 'package.json'));
const ts = require('typescript'), React = require('react');
const file = 'src/components/wine-import/WineMenuScanner.tsx';
const baseline = '8af21043075ee42f00b04c30979a1abddf8c3e27';
const before = execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' });
const parse = value => ts.createSourceFile(file, value, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const printer = ts.createPrinter({ removeComments: true });
const nodes = (value, predicate) => {
  const tree = parse(value), found = [];
  const visit = node => { if (predicate(node, tree)) found.push(node); ts.forEachChild(node, visit); }; visit(tree);
  return { tree, found };
};
const initializers = value => {
  const { tree, found } = nodes(value, n => ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer);
  return { tree, values: new Map(found.map(n => [n.name.text, n.initializer])) };
};
const old = initializers(before);
const print = (node, tree) => printer.printNode(ts.EmitHint.Unspecified, node, tree);
const once = (value, from, to) => { assert.equal(value.split(from).length, 2, from); return value.replace(from, to); };
const oldClear = nodes(before, (n, tree) => ts.isJsxElement(n) && n.openingElement.tagName.getText(tree) === 'Button'
  && n.openingElement.attributes.properties.some(a => ts.isJsxAttribute(a) && a.name.getText(tree) === 'onClick' && a.initializer?.getText(tree) === '{clearScan}')).found;
assert.equal(oldClear.length, 1);

export function restoreNativeMenuResultsFirst96(value) {
  value = restoreNativeMenuComparatorReturn96(value);
  const start = value.indexOf('  const nativeResultPreview ='), end = value.indexOf('\n  return (', start);
  assert.ok(start >= 0 && end > start);
  const block = value.slice(start, end);
  assert.equal(createHash('sha256').update(block).digest('hex'), '2a5eae970bd14faf5aab69f7abc7243a33a721e66cb2de77c49f1803edaf6e35', 'Only the reviewed native presentation block');
  value = once(value, block + '\n', '');
  value = once(value, 'nativeResultPreview ? "matchrim-scan-stage min-w-0 rounded-lg p-[12px] text-left text-white" : ', '');
  value = once(value, '(preview || convertingPdf) && !loading ? renderMenuPreview(', '(preview || convertingPdf) && !loading ? (');
  const matches = nodes(value, (n, tree) => ts.isJsxExpression(n) && n.expression?.getText(tree).startsWith('!nativeResultPreview && <Button'));
  assert.equal(matches.found.length, 1);
  const wrapper = matches.found[0], right = wrapper.expression.right;
  assert.equal(print(right, matches.tree), print(oldClear[0], old.tree), 'Original clear button/handler, not a broad JSX removal');
  value = once(value, wrapper.getText(matches.tree), oldClear[0].getText(old.tree));
  assert.equal(value, before, 'Every original callback, pipeline, input, result, canonical/save and web byte restored');
  return value;
}

function web(value) {
  const { tree, values } = initializers(value);
  const session = values.get('WineMenuScannerSession');
  const expression = session.body.statements.filter(ts.isReturnStatement).at(-1).expression;
  const transformed = ts.transform(expression, [context => {
    const boolean = n => n.kind === ts.SyntaxKind.TrueKeyword ? true : n.kind === ts.SyntaxKind.FalseKeyword ? false : null;
    const visit = node => {
      if (ts.isIdentifier(node) && ['isNative', 'nativeResultPreview'].includes(node.text)) return context.factory.createFalse();
      // The actual helper is separately executed as identity for every native=false state.
      if (ts.isCallExpression(node) && node.expression.getText(tree) === 'renderMenuPreview') {
        assert.equal(node.arguments.length, 1); return ts.visitNode(node.arguments[0], visit);
      }
      const next = ts.visitEachChild(node, visit, context);
      if (ts.isParenthesizedExpression(next) && boolean(next.expression) !== null) return next.expression;
      if (ts.isPrefixUnaryExpression(next) && next.operator === ts.SyntaxKind.ExclamationToken && boolean(next.operand) !== null) return boolean(next.operand) ? context.factory.createFalse() : context.factory.createTrue();
      if (ts.isConditionalExpression(next) && boolean(next.condition) !== null) return boolean(next.condition) ? next.whenTrue : next.whenFalse;
      if (ts.isBinaryExpression(next)) {
        const a = boolean(next.left), b = boolean(next.right);
        if (next.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) { if (a === false || b === false) return context.factory.createFalse(); if (a === true) return next.right; if (b === true) return next.left; }
        if (next.operatorToken.kind === ts.SyntaxKind.BarBarToken) { if (a === true || b === true) return context.factory.createTrue(); if (a === false) return next.right; if (b === false) return next.left; }
      }
      if (ts.isJsxElement(next)) return context.factory.updateJsxElement(next, next.openingElement,
        next.children.filter(child => !(ts.isJsxExpression(child) && child.expression && boolean(child.expression) === false)), next.closingElement);
      return next;
    };
    return node => ts.visitNode(node, visit);
  }]);
  try {
    // Compare emitted React calls, including actual JSX whitespace semantics, not printer indentation.
    const js = ts.transpileModule('const rendered = ' + print(transformed.transformed[0], tree),
      { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    const ast = ts.createSourceFile('web.js', js, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const shape = node => {
      if (ts.isParenthesizedExpression(node)) return shape(node.expression);
      const children = []; ts.forEachChild(node, child => { children.push(shape(child)); });
      return children.length ? [node.kind, children] : [node.kind, node.text ?? node.getText(ast)];
    };
    return JSON.stringify(shape(ast));
  } finally { transformed.dispose(); }
}

export function runMenuResultsFirst96() {
  const source = restoreMenuEntrySource96(file, readFileSync(path.join(root, file), 'utf8')), current = initializers(source);
  const evaluate = (name, values = {}) => {
    const expression = current.values.get(name); assert.ok(expression, name);
    const context = vm.createContext({ React, Button: 'button', Upload: 'svg', X: 'svg', ChevronRight: 'svg', ...values });
    const code = ts.transpileModule('globalThis.result = ' + expression.getText(current.tree), { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInContext(code, context, { timeout: 1000 }); return context.result;
  };
  const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node) ? [node, ...walk(node.props.children)] : [];
  const image = React.createElement('div', { 'data-original-image': true });
  const groups = [];
  const check = (name, run) => { run(); groups.push(name); };
  check('Exact whole8af inverse and every original handler/lifetime/normalizer source unchanged', () => { restoreNativeMenuResultsFirst96(source); });
  check('Complete web-false JSX AST exact, not only a string or omitted native section', () => { assert.equal(web(source), web(before)); });
  check('Only native ready results collapse; every web/empty/loading/PDF-conversion state is an identity', () => {
    for (const isNative of [false, true]) for (const preview of [null, 'data:synthetic']) for (const count of [0, 2]) for (const loading of [false, true]) for (const convertingPdf of [false, true]) {
      const active = evaluate('nativeResultPreview', { isNative, preview, scannedWines: Array(count), loading, convertingPdf });
      assert.equal(active, isNative && Boolean(preview) && count > 0 && !loading && !convertingPdf);
      const render = evaluate('renderMenuPreview', { nativeResultPreview: active, clearScan() {}, fileInputRef: { current: null } });
      if (!active) assert.equal(render(image), image);
      else assert.equal(walk(render(image)).filter(n => n.type === 'details').length, 1);
    }
  });
  check('Disclosure defaults closed without state/effects; exact original image subtree stays mounted', () => {
    const render = evaluate('renderMenuPreview', { nativeResultPreview: true, clearScan() {}, fileInputRef: { current: null } });
    const tree = render(image), all = walk(tree), details = all.find(n => n.type === 'details');
    assert.equal(details.props.open, undefined); assert.equal(details.key, null);
    assert.ok(walk(details).includes(image));
    assert.equal(all.filter(n => n.type === 'summary').length, 1);
    const summary = all.find(n => n.type === 'summary');
    assert.ok(summary.props.className.includes('min-h-[44px]'));
    assert.equal(summary.props['aria-label'], 'Ver carta');
    assert.equal(summary.props['aria-hidden'], undefined);
    assert.equal(walk(summary).find(n => n.type === 'span').props['aria-hidden'], 'true');
    assert.equal(walk(details).filter(n => n.type === 'button').length, 0, 'Upload/reset are outside the hidden image');
    assert.ok(!current.values.get('renderMenuPreview').getText(current.tree).includes('onToggle'));
  });
  check('Actual SSR retains named summary/disclosure and image; web renders only the original child', () => {
    const render = active => evaluate('renderMenuPreview', { nativeResultPreview: active, clearScan() {}, fileInputRef: { current: null } })(image);
    const native = renderToStaticMarkup(render(true));
    assert.match(native, /<summary aria-label="Ver carta"/);
    assert.match(native, /<span aria-hidden="true">Ver carta<\/span>/);
    assert.doesNotMatch(native, /<details[^>]*\bopen=/);
    assert.equal(renderToStaticMarkup(render(false)), renderToStaticMarkup(image));
  });
  check('Upload action clears the same input value and invokes its chooser once; missing ref is safe', () => {
    let clicks = 0; const input = { value: 'old-image', click() { clicks++; } };
    const render = evaluate('renderMenuPreview', { nativeResultPreview: true, clearScan() {}, fileInputRef: { current: input } });
    const upload = walk(render(image)).find(n => n.props['aria-label'] === 'Subir otra carta');
    upload.props.onClick(); assert.equal(input.value, ''); assert.equal(clicks, 1);
    const missing = evaluate('renderMenuPreview', { nativeResultPreview: true, clearScan() {}, fileInputRef: { current: null } });
    assert.doesNotThrow(() => walk(missing(image)).find(n => n.props['aria-label'] === 'Subir otra carta').props.onClick());
  });
  check('Reset keeps the original callback; physical44 actions and decorative20 icons without font caps', () => {
    let cleared = 0; const clearScan = () => { cleared++; };
    const render = evaluate('renderMenuPreview', { nativeResultPreview: true, clearScan, fileInputRef: { current: null } });
    const all = walk(render(image)), reset = all.find(n => n.props['aria-label'] === 'Quitar carta');
    assert.equal(reset.props.onClick, clearScan); reset.props.onClick(); assert.equal(cleared, 1);
    for (const button of all.filter(n => n.type === 'button')) for (const value of ['h-[44px]', 'w-[44px]']) assert.ok(button.props.className.includes(value));
    for (const icon of all.filter(n => n.type === 'svg')) { assert.equal(icon.props['aria-hidden'], 'true'); assert.equal(icon.props.style.width, 20); assert.equal(icon.props.style.height, 20); }
  });
  const negatives = [];
  check('Directed native/default-open/web/target/old-handler mutations reject', () => {
    for (const [from, to] of [
      ['isNative && Boolean(preview)', 'true && Boolean(preview)'], ['<details className="group min-w-0"', '<details open className="group min-w-0"'],
      ['h-[44px] w-[44px]', 'h-[43px] w-[43px]'], ['onClick={clearScan}>', 'onClick={() => undefined}>'],
      ['aria-label="Ver carta"', 'aria-label=""'], ['<span aria-hidden="true">Ver carta', '<span>Ver carta'],
      ['setImageZoom((zoom) => Math.min(3, zoom + 0.5))', 'setImageZoom(() => 3)'],
      ['onChange={handleFileSelect}', 'onChange={() => undefined}'],
    ]) {
      assert.ok(source.includes(from)); const changed = source.replace(from, to); assert.throws(() => restoreNativeMenuResultsFirst96(changed)); negatives.push(from);
    }
    const changedWeb = source.replace('Vinos Detectados', 'Wrong web');
    assert.notEqual(web(changedWeb), web(before)); assert.throws(() => restoreNativeMenuResultsFirst96(changedWeb)); negatives.push('web copy');
  });
  return { passed: groups.length, failed: 0, groups, rejectedMutations: negatives.length, whole8afInverse: true, completeWebJSXEqual: true,
    unchangedPipelineAndCanonicalHandlers: true, externalCalls: 0, SDK: 0, limits: 'Actual presentation initializer and full source/JSX contracts; browser geometry, disclosure lifecycle/zoom/pins and native gestures require separate evidence.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runMenuResultsFirst96()));
