import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = 'src/components/wine-import/WineMenuScanner.tsx';
const baseline = '26d48c6b5661c9236f3bdd97fe6b81587361caeb';
const before = execFileSync('git', ['show', `${baseline}:${file}`], { cwd: root, encoding: 'utf8' });
const sha = value => createHash('sha256').update(value).digest('hex');
const parse = source => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const find = (source, predicate) => {
  const tree = parse(source), found = [];
  const visit = n => { if (predicate(n, tree)) found.push(n); ts.forEachChild(n, visit); }; visit(tree);
  assert.equal(found.length, 1, 'Exactly one bounded list expression'); return { tree, node: found[0] };
};
const list = source => find(source, (n, t) => ts.isJsxExpression(n)
  && n.getText(t).startsWith('{visibleScannedWines.map(({ wine, index }) =>') && n.getText(t).includes('-list-row'));
const replaceOnce = (source, from, to) => {
  assert.equal(source.split(from).length, 2, from); return source.replace(from, to);
};
const oldHeader = 'className="flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2"';
const newHeader = "className={isNative ? 'flex min-w-0 flex-col items-start gap-3 border-b border-stone-100 px-[12px] py-2' : 'flex items-center justify-between gap-3 border-b border-stone-100 px-3 py-2'}";
const role = ' role={isNative ? \'list\' : undefined}';

export function restoreNativeMenuListAction96(source) {
  if (source === before) return source;
  const current = list(source), old = list(before);
  const body = current.node.expression.arguments[0].body;
  assert(ts.isConditionalExpression(body)); assert.equal(body.condition.getText(current.tree), 'isNative');
  assert.equal(sha(body.whenTrue.getText(current.tree)), 'fd10b2dbd50024813c0c7e3831fdd903916e371a809cde9c44397ab3ff1b4ef5', 'Exact native presentation, no authority/handler allowances');
  assert.equal(body.whenFalse.getText(current.tree), old.node.expression.arguments[0].body.getText(old.tree), 'Complete legacy button bytes');
  source = source.slice(0, current.node.getStart(current.tree)) + old.node.getText(old.tree) + source.slice(current.node.end);
  source = replaceOnce(source, newHeader, oldHeader);
  source = replaceOnce(source, '<div className="divide-y divide-stone-100"' + role + '>', '<div className="divide-y divide-stone-100">');
  assert.equal(source, before, 'Whole26 inverse: all helpers/hooks/requests/state/closures and web bytes unchanged');
  return source;
}

function renderRow(source, native, style = false, score = null, calls = []) {
  const { tree, node } = list(source), arrow = node.expression.arguments[0];
  const context = vm.createContext({ React, isNative: native, highlightedWineIndex: null,
    isLiteralWineStyle95: () => style, literalMenuServingFormat95: () => '750 ml',
    catalogWineFromVerifiedSheet: () => false, listPriceText: () => 'Botella 130 EUR',
    renderNativeTakeawayPrice: () => React.createElement('span', null, 'Para llevar 104 EUR'),
    requestedServiceFormat: 'any', getWineDecision: () => ({ score }), openWineDetail: (...args) => calls.push(args),
    getConfidenceBand: () => 'control', ChevronRight: props => React.createElement('svg', props) });
  const js = ts.transpileModule('globalThis.row=' + arrow.getText(tree), { compilerOptions: { jsx: ts.JsxEmit.React } }).outputText;
  vm.runInContext(js, context);
  return context.row({ index: 0, wine: { nombre: 'Referencia literal', productor: 'Productor literal', region: 'Región literal',
    anada: 2021, servicio: 'botella', campos_inferidos: [], lecturas_alternativas: ['otra lectura'] } });
}

function webShape(source) {
  const { tree, node } = find(source, n => ts.isVariableDeclaration(n) && n.name.getText() === 'WineMenuScannerSession');
  const expression = node.initializer.body.statements.filter(ts.isReturnStatement).at(-1).expression;
  const result = ts.transform(expression, [context => {
    const bool = n => n?.kind === ts.SyntaxKind.FalseKeyword ? false : n?.kind === ts.SyntaxKind.TrueKeyword ? true : null;
    const visit = n => {
      if (ts.isIdentifier(n) && n.text === 'isNative') return context.factory.createFalse();
      const x = ts.visitEachChild(n, visit, context);
      if (ts.isParenthesizedExpression(x) && bool(x.expression) !== null) return x.expression;
      if (ts.isPrefixUnaryExpression(x) && x.operator === ts.SyntaxKind.ExclamationToken && bool(x.operand) !== null)
        return bool(x.operand) ? context.factory.createFalse() : context.factory.createTrue();
      if (ts.isConditionalExpression(x) && bool(x.condition) !== null) return bool(x.condition) ? x.whenTrue : x.whenFalse;
      if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        if (bool(x.left) === false || bool(x.right) === false) return context.factory.createFalse();
        if (bool(x.left) === true) return x.right;
      }
      if (ts.isJsxAttributes(x)) return context.factory.updateJsxAttributes(x, x.properties.filter(attribute =>
        !(ts.isJsxAttribute(attribute) && attribute.name.getText(tree) === 'role' && ts.isJsxExpression(attribute.initializer)
          && ts.isIdentifier(attribute.initializer.expression) && attribute.initializer.expression.text === 'undefined')));
      if (ts.isJsxElement(x)) return context.factory.updateJsxElement(x, x.openingElement,
        x.children.filter(child => !(ts.isJsxExpression(child) && bool(child.expression) === false)), x.closingElement);
      return x;
    };
    return n => ts.visitNode(n, visit);
  }]);
  try {
    const printed = ts.createPrinter().printNode(ts.EmitHint.Expression, result.transformed[0], tree);
    const js = ts.transpileModule('const output=' + printed, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText;
    const parsed = ts.createSourceFile('web.js', js, ts.ScriptTarget.Latest, true);
    const shape = n => {
      if (ts.isParenthesizedExpression(n)) return shape(n.expression);
      const children = []; ts.forEachChild(n, c => { children.push(shape(c)); });
      return children.length ? [n.kind, children] : [n.kind, n.text ?? n.getText(parsed)];
    };
    return JSON.stringify(shape(parsed));
  } finally { result.dispose(); }
}

export function runMenuListAction96() {
  const source = fs.readFileSync(path.join(root, file), 'utf8'), checks = [];
  const test = (name, fn) => { fn(); checks.push(name); };
  test('Exact26 historical source bound', () => assert.equal(sha(before), '98a1d05392c40d4ad5527a7854102c487ba38617adce0dc2bee6eecc63dba10f'));
  test('Whole26 inverse; no changed closures, profile, data, callbacks or requests', () => restoreNativeMenuListAction96(source));
  test('Exact26 only no-op inverse', () => assert.equal(restoreNativeMenuListAction96(before), before));
  test('Legacy row full SSR unchanged', () => assert.equal(renderToStaticMarkup(renderRow(source, false)), renderToStaticMarkup(renderRow(before, false))));
  test('Complete main native-false JSX AST exact, omitting only a DOM-absent undefined role', () => assert.equal(webShape(source), webShape(before)));
  test('Native semantic static listitem contains only one explicit button', () => {
    const row = renderRow(source, true); assert.equal(row.type, 'div'); assert.equal(row.props.role, 'listitem');
    assert.equal(row.props.children.filter(x => x?.type === 'button').length, 1);
    assert.equal(row.props.onClick, undefined); assert.equal(row.props.onKeyDown, undefined);
  });
  test('Native exact accessible name and currentTarget opener match old callback', () => {
    const row = renderRow(source, true), button = row.props.children[0], old = renderRow(before, true);
    assert.equal(button.props['aria-label'], old.props['aria-label']);
    assert.equal(String(button.props.onClick), String(old.props.onClick));
    assert.equal(button.props.className.includes('min-h-[44px]'), true);
  });
  test('Actual action closure passes unchanged row index and actual button for focus return', () => {
    const calls = [], row = renderRow(source, true, false, null, calls), opener = { connected: true };
    row.props.children[0].props.onClick({ currentTarget: opener });
    assert.equal(calls.length, 1); assert.equal(calls[0][0], 0); assert.equal(calls[0][1], opener);
  });
  test('List information does not create extra interactive roles or hide critical text', () => {
    const html = renderToStaticMarkup(renderRow(source, true));
    assert.equal((html.match(/<button/g) ?? []).length, 1);
    assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, 2, 'Only decorative number and ChevronRight');
    assert(!html.includes('line-clamp')); assert(!html.includes('text-overflow')); assert(!html.includes('font-size'));
  });
  test('Literal styles retain exact accessible identity and ordinary visible caption', () => {
    const row = renderRow(source, true, true), html = renderToStaticMarkup(row);
    assert.equal(row.props.children[0].props['aria-label'], renderRow(before, true, true).props['aria-label']);
    assert(html.includes('Abrir estilo')); assert(html.includes('botella sin identificar'));
  });
  test('Name, year, producer, geography, serving, prices, alternatives and uncertainty stay visible outside action', () => {
    const row = renderRow(source, true), html = renderToStaticMarkup(row);
    for (const text of ['Referencia literal', '2021', 'Productor literal', 'Región literal', 'botella', '750 ml', 'Botella 130 EUR', 'Para llevar 104 EUR', 'Lecturas distintas', 'Nombre leído por confirmar', 'Referencia por confirmar']) assert(html.includes(text), text);
    assert(!renderToStaticMarkup(row.props.children[0]).includes('Para llevar'));
    assert(html.includes('Afinidad pendiente')); assert(!html.includes('≈'));
  });
  test('Existing zero and decimal presentation preserved, no new score calculation', () => {
    for (const score of [0, 2.1]) assert(renderToStaticMarkup(renderRow(source, true, false, score)).includes(`≈${score}/100`));
  });
  test('Header native full-width stack keeps exact web class', () => { assert(source.includes(newHeader)); assert(!newHeader.includes('font-size')); });
  const mutations = [
    ['min-h-[44px] w-full min-w-0 flex-wrap', 'min-h-[43px] w-full min-w-0 flex-wrap'],
    ['{visibleScannedWines.map(({ wine, index }) => isNative ?', '{visibleScannedWines.map(({ wine, index }) => true ?'],
    ['<div key={`${wine.nombre}-${index}-list-row`} role="listitem"', '<div onClick={() => undefined} key={`${wine.nombre}-${index}-list-row`} role="listitem"'],
    ['<span>Abrir {isLiteralWineStyle95(wine)', '<span>Detalle {isLiteralWineStyle95(wine)'],
    ['style={{ width: 20, height: 20 }} />\n                          </button>', 'style={{ width: 10, height: 10 }} />\n                          </button>'],
    ['name: wine.nombre, producer: wine.productor', 'name: wine.nombre, producer: null'],
    ['onClick={(event) => openWineDetail(index, event.currentTarget)}', 'onClick={() => openWineDetail(index)}'],
    ['>Nombre leído por confirmar</span>', '>Identidad confirmada</span>'],
    ['onChange={handleFileSelect}', 'onChange={() => undefined}'],
    ['[user?.id, preview, loading]', '[preview]'],
    ['Ir al comparador', 'Ir a otro comparador'],
    ['const getWineDecision = (wine: ScannedWine) => {', 'const getWineDecision = (wine: ScannedWine) => { return {score:99};'],
  ];
  for (const [from, to] of mutations) test('Reject mutation: ' + from, () => {
    assert(source.includes(from), from); assert.throws(() => restoreNativeMenuListAction96(source.replace(from, to)));
  });
  return { passed: checks.length, failed: 0, checks, negativeControls: mutations.length, whole26Inverse: true,
    legacyButtonBytesExact: true, defaultSSRExact: true, SDK: 0, external: 0, scope: 'Source/render controls only; browser and UIKit outcomes are separate.' };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runMenuListAction96()));
