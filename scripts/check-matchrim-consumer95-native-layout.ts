import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import ts from 'typescript';
import { nativeLabelKeyboard96 } from './check-matchrim-label-keyboard96';
import { restoreNativeScanHub96 } from './check-matchrim-scan-hub96';
import { assertScanHubComparisonBridge96, comparisonTargetScope96, restoreComparisonTarget96 } from './matchrim-comparison-target96-scope';
import { nativeHubSvg96Result, restoreScanHubSvgGuard96 } from './check-matchrim-scan-hub-svg96.mjs';

// Public, offline source checks. Browser/native receipts are separate evidence.
const baseline = '31e060828d1b370b275cdcf6691052368916f39f';
const baseline96 = 'ebee038059778f1f10bdb5dd647bccb8324fb580';
const shop = 'src/components/wine-import/WineShopLinkAdvisor.tsx';
const restaurant = 'src/pages/Restaurant.tsx';
const menu = 'src/components/wine-import/WineMenuScanner.tsx';
const fingerprints = new Map([
  [shop, ['a7b9ddd9db73b93bd20b229ccb388efe46d75319ded8d723150fd1933ed60471', '17529a6c6285fbf0d348981b1b01e42b73d7816539033c92b7d3934ef6b1da0f']],
  [restaurant, ['e427d602485f0029884add6708393ac5ef841c3c99f4901af605cf4fb19d9d86', '0dfa74ac51fa1aa033d909b5e5e429599579e95547bd15a9c36e5dff86f6a918']],
  ['src/index.css', ['eb03f6feb6b397d524cbf3fbf5f57148df5afeb11b3524ef084212814544ff52', '548ff193ba713bce9595b28cb53bb316e3929653540199a4ca86789a4b2097dd']],
  [menu, ['23e05fd6fe37074b5ad48ac396535974a3086f7da7e10219c365916ad89768f6', '7a499bfac75d6e89cb16a6fdfe32276c1502bf27a4e11d934ce99c44b52dfd8d']],
  ['src/utils/wineMenuScan.ts', ['4e619d70f425f107564a786ac0cca15f1f917a68634de2eaae2d303a457d32a9', '9dbd68df74c8c79ce656c968c811b1c144512e684c7c3ddeaa692b48eeaee7d4']],
]);
const reviewed95Fingerprints = new Map([
  [shop, '17529a6c6285fbf0d348981b1b01e42b73d7816539033c92b7d3934ef6b1da0f'],
  [restaurant, '0dfa74ac51fa1aa033d909b5e5e429599579e95547bd15a9c36e5dff86f6a918'],
  ['src/index.css', '8294a1666a03f62ac15d97dc0bdb850300de876a2473b81f86539c8f55da52e3'],
  [menu, 'df1d513633f04e716c162bfd8374a735d2e19dc5f3e10386e716c92a4e5e95b9'],
  ['src/utils/wineMenuScan.ts', 'b07438b3179edc2232b157ca07ccd4a56878962d971eb5e9e0e358154da8dddb'],
]);
const home96 = {
  test: 'scripts/check-matchrim-native-home-accessibility96.ts',
  testHash: '962bdbb1a8f7d3ca3d7afbd7b39464abdb880e00243b989261f39df7bfd2f9ce',
  sources: new Map([
    ['src/components/NativeAppHome.tsx', '04d35a6fcfb4536b060fa701e86a168b81ac7320368ef7e3eae3a689a46cfca1'],
    ['src/components/MobileBottomNav.tsx', '9c6edc7cec29bdec7c3f2ec3696f84b69a6073e7296d669a24906c8caa820271'],
    ['src/index.css', '548ff193ba713bce9595b28cb53bb316e3929653540199a4ca86789a4b2097dd'],
  ]),
};
// Report the finite CSS projection separately from all unchanged historical oracles.
const scanHub96 = {
  test: 'scripts/check-matchrim-scan-hub96.ts',
  testHash: '7149a47039c0382f4985051755e888cd36dc685efcf8a76a164c9db1a3cec4ad',
  revision: 'efc61c547fb04e1ac5adbe4974dbfe29aebd59fa',
  currentCssHash: '7bcbb68daff30c8b475e606d9f67d8f593617ef4456e73a72e57a9b4f3c3c50c',
  projectedCssHash: '548ff193ba713bce9595b28cb53bb316e3929653540199a4ca86789a4b2097dd',
  blockHash: '056d4d2f5b3907c4051637884114826a11f1321a8d944c22cff3a1355e5a2f02',
  childGroups: 5,
  rejectedMutations: 4,
  scope: 'One exact native-accessibility hub-only CSS block inverse before all historical checks; no component, route, callback, text or data projection',
};
const labelUi96 = {
  source: 'src/components/wine-import/MultiWineLabelScanner.tsx',
  revision: '2dc2246207e600d1767637803891383f2aaad60c',
  beforeHash: 'bc496d943d6ed7631c3505e1b63f11a18c0e641a31f2cf6a9ae9763773ae4146',
  currentHash: '9d2123e37af1de7d69a55c3f9dd333b04ef7c5f6940ccc747bc27117737c860f',
  priorNativeClassHash: 'b48b9fb5ac81cfb3eeb329f3e99b9709d5a0c22851bdf049280031784efcd11a',
  test: 'scripts/check-matchrim-recognition96.ts',
  testHash: '00a68793e2d8c5ddb4ab62d3253c0cf63f9c70d7feb0f0d76b0d4ed532385972',
};
const menuReading96 = {
  revision: '9704e23631dfcaa9bbcfc77203f0c32f53d9bab0',
  scan: 'src/utils/wineMenuScan.ts',
  sources: new Map([
    [menu, 'ac27302f41c93d51ac2ad58de798b1928cde97d092773e349b1cc61e8af0e337'],
    ['src/utils/wineMenuScan.ts', '467be55f7138563662d96001a3f17f696c153418316097973c8a8a0d7ae28940'],
    ['src/utils/menuReadingPresentation96.ts', '13340660fcaa658f071361ae3fd7f9a402327b2c54ac1e03b81d1180f1a00f68'],
    ['scripts/check-matchrim-menu-reading96.ts', '429da3c23e7a0687b6eaf529276b5b029434173673cab65792c103e7104009fa'],
  ]),
};
const before = (path: string) => execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const reviewed95 = (path: string) => execFileSync('git', ['show', `${baseline96}:${path}`], { encoding: 'utf8' });
// Only the exact new hub block is projected; all historical source oracles remain intact.
const current = (path: string) => {
  const source = readFileSync(path, 'utf8');
  return path === 'src/index.css' ? restoreNativeScanHub96(source) : source;
};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const parse = (path: string, source: string) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let passed = 0;
const check = (name: string, run: () => void) => { run(); passed++; console.log('PASS', name); };

const webExpression = (input: ts.Node): ts.Node => {
  let node = input;
  while (ts.isParenthesizedExpression(node)) node = node.expression;
  if (ts.isConditionalExpression(node) && ts.isIdentifier(node.condition) && node.condition.text === 'native') {
    return webExpression(node.whenFalse);
  }
  return node;
};
const attributes = (properties: ts.NodeArray<ts.JsxAttributeLike>): unknown[] => properties.flatMap(attr => {
  if (!ts.isJsxAttribute(attr)) return [canonical(attr)];
  const value = attr.initializer && webExpression(ts.isJsxExpression(attr.initializer) && attr.initializer.expression
    ? attr.initializer.expression : attr.initializer);
  if (value && ts.isIdentifier(value) && value.text === 'undefined') return [];
  return [[attr.name.getText(), value ? canonical(value) : true]];
});
function canonical(input: ts.Node | undefined): unknown {
  if (!input) return null;
  const node = webExpression(input);
  if (ts.isJsxText(node)) {
    const value = node.text.replace(/\s+/g, ' ').trim();
    return value ? ['jsxText', value] : null;
  }
  if (ts.isJsxExpression(node)) {
    if (!node.expression) return null;
    const value = webExpression(node.expression);
    return ts.isStringLiteral(value) ? ['jsxText', value.text] : ['jsxExpression', canonical(value)];
  }
  if (ts.isJsxElement(node)) return ['element', node.openingElement.tagName.getText(),
    attributes(node.openingElement.attributes.properties), node.children.map(canonical).filter(value => value !== null)];
  if (ts.isJsxSelfClosingElement(node)) return ['element', node.tagName.getText(), attributes(node.attributes.properties), []];
  if (ts.isJsxFragment(node)) return ['fragment', node.children.map(canonical).filter(value => value !== null)];
  if (ts.isIdentifier(node)) return ['identifier', node.text];
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return [ts.SyntaxKind[node.kind], node.text];
  const children: unknown[] = [];
  ts.forEachChild(node, child => { children.push(canonical(child)); });
  return children.length ? [ts.SyntaxKind[node.kind], ...children] : [ts.SyntaxKind[node.kind], node.getText()];
}
const component = (file: ts.SourceFile, name: string): ts.ArrowFunction => {
  for (const statement of file.statements) if (ts.isVariableStatement(statement)) {
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(file) === name && declaration.initializer && ts.isArrowFunction(declaration.initializer)) {
        return declaration.initializer;
      }
    }
  }
  throw new Error(`Missing actual component: ${name}`);
};
const statements = (fn: ts.ArrowFunction) => { assert.ok(ts.isBlock(fn.body)); return fn.body.statements; };
const render = (fn: ts.ArrowFunction) => {
  const returns = statements(fn).filter(ts.isReturnStatement);
  assert.equal(returns.length, 1); assert.ok(returns[0].expression);
  return returns[0].expression;
};
const preRender = (fn: ts.ArrowFunction) => statements(fn).slice(0, statements(fn).findIndex(ts.isReturnStatement));
const nativeDeclaration = (node: ts.Statement) => ts.isVariableStatement(node)
  && node.declarationList.declarations.length === 1 && node.declarationList.declarations[0].name.getText() === 'native';
const exactPreRender = (fn: ts.ArrowFunction, omitNative = false) => preRender(fn)
  .filter(node => !omitNative || !nativeDeclaration(node)).map(node => node.getText());
const outsideComponent = (file: ts.SourceFile, fn: ts.ArrowFunction) =>
  file.text.slice(0, fn.getStart(file)) + '[component-body]' + file.text.slice(fn.end);
const collect = <T extends ts.Node>(root: ts.Node, guard: (node: ts.Node) => node is T): T[] => {
  const found: T[] = [];
  const visit = (node: ts.Node) => { if (guard(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(root); return found;
};
const nativeClass = (attr: ts.JsxAttribute): string | null => {
  if (attr.name.getText() !== 'className' || !attr.initializer || !ts.isJsxExpression(attr.initializer)) return null;
  const value = attr.initializer.expression;
  return value && ts.isConditionalExpression(value) && ts.isIdentifier(value.condition)
    && value.condition.text === 'native' && ts.isStringLiteral(value.whenTrue) ? value.whenTrue.text : null;
};
const replaceExact96 = (source: string, revised: string, prior: string, count = 1) => {
  assert.equal(source.split(revised).length - 1, count, revised);
  return source.split(revised).join(prior);
};
const removeReadingNode96 = (source: string, node: ts.Node, tree: ts.SourceFile) => {
  const start = source.lastIndexOf('\n', node.getStart(tree)) + 1, next = source.indexOf('\n', node.end);
  assert.ok(next >= 0);
  assert.match(source.slice(start, node.getStart(tree)), /^\s*$/);
  assert.match(source.slice(node.end, next), /^\s*$/);
  return replaceExact96(source, source.slice(start, next + 1), '');
};
const restoreMenuReadingUi96 = (source: string) => {
  source = replaceExact96(source,
    '? isNative ? `Cobertura parcial: ${normalizedWines.length} de unas ${expected} l\u00edneas legibles.`\n                : `Cobertura parcial: ${normalizedWines.length} de aproximadamente ${expected} l\u00edneas legibles.`',
    '? `Cobertura parcial: ${normalizedWines.length} de aproximadamente ${expected} l\u00edneas legibles.`');
  for (const expected of [
    'ac3107eb6fd40e7d2b0f3304f2fcb8a39f16b0c5f0043f3294c735b3b845d729',
    '8e5678af0ba1d38a59ab01f00b42a81b186781ca9d4890a0b05cad9559cc52a2',
    'd49d192388180c2e00e75c541a881745b208fb52e33a3dc7a8473ac3329c5cff',
    '4ee6147e0b4ee223abf134f2f633329841e507f7a7c0a0eaf858f12cf8bb4b8d',
  ]) {
    const tree = parse(menu, source), nodes = collect(tree, ts.isJsxExpression).filter(node => hash(node.getText(tree)) === expected);
    assert.equal(nodes.length, 1, `Exactly one reviewed added JSX block: ${expected}`);
    source = removeReadingNode96(source, nodes[0], tree);
  }
  source = replaceExact96(source, "import { menuReadingSourceLabel96, nativeMenuTakeawayText96 } from '@/utils/menuReadingPresentation96';\n", '');
  const tree = parse(menu, source), helpers = collect(tree, ts.isVariableStatement).filter(node =>
    node.declarationList.declarations.some(value => value.name.getText(tree) === 'renderNativeTakeawayPrice'));
  assert.equal(helpers.length, 1);
  assert.equal(hash(helpers[0].getText(tree)), '474c8ddfaac9ee35485a4899f8270a7c567e91bf52ea13d4864892985c8739cd');
  source = replaceExact96(source, `  ${helpers[0].getText(tree)}\n\n`, '');
  return replaceExact96(source, '{ preserveNumericReferences: isNative, preserveServingFormats: isNative, preserveReadingAlternatives: isNative }',
    '{ preserveNumericReferences: isNative, preserveServingFormats: isNative }', 2);
};
const restoreMenuReadingScan96 = (source: string) => {
  source = replaceExact96(source, '  // Client-only uncertainty, never identity or scoring evidence.\n  lecturas_alternativas?: MenuReadingAlternative96[];\n', '');
  source = replaceExact96(source, `export interface MenuReadingAlternative96 {
  tile: MenuScanTile;
  rawIndex: number;
  nombre: string;
  productor: string | null;
  texto_fuente: string;
}

`, '');
  source = replaceExact96(source, `export interface MenuMergeOptions95 {
  preserveNumericReferences?: boolean;
  preserveServingFormats?: boolean;
  preserveReadingAlternatives?: boolean;
}`, 'export interface MenuMergeOptions95 { preserveNumericReferences?: boolean; preserveServingFormats?: boolean; }');
  const tree = parse(menuReading96.scan, source), helpers = collect(tree, ts.isVariableStatement).filter(node =>
    node.declarationList.declarations.some(value => value.name.getText(tree) === 'retainExcludedReadings96'));
  assert.equal(helpers.length, 1);
  assert.equal(hash(helpers[0].getText(tree)), 'fa12b2e159b4e0b50f4c43c4384ba0658478d2db36e959e0861c1b29286deea9');
  const priorHelper = replaceExact96(helpers[0].getText(tree), `  const knownTiles: MenuScanTile['id'][] = ['full', 'left', 'right', 'right-focus', 'top', 'bottom',
    'top-left', 'top-right', 'bottom-left', 'bottom-right'];
  excluded.filter(({ tile }) => {
    const box = tile.box;
    return knownTiles.includes(tile.id) && box
      && [box.x, box.y, box.width, box.height].every(value => typeof value === 'number' && Number.isFinite(value))
      && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0
      && box.x + box.width <= 100 && box.y + box.height <= 100;
  }).forEach(({ tile, response }) => (response.vinos ?? []).forEach((raw, rawIndex) => {`,
  '  excluded.forEach(({ tile, response }) => (response.vinos ?? []).forEach((raw, rawIndex) => {');
  assert.equal(hash(priorHelper), '0a9e8d14522e08d05e3f590fa9177586e6526cf00ae314e92c7fe1907b2f8696',
    'Only the exact R14 source tile/box admission block amends the original metadata helper');
  source = replaceExact96(source, `${helpers[0].getText(tree)}\n\n`, '');
  for (const [condition, args] of [['!fullResult', 'results'], ['regionalResults.length === 0', '[fullResult, ...focusResults]']]) {
    source = replaceExact96(source, `  if (${condition}) {
    const resolved = mergeMenuTileResults95(${args}, options, memo);
    return options.preserveReadingAlternatives ? retainExcludedReadings96(resolved, [], new Set(), memo) : resolved;
  }`, `  if (${condition}) return mergeMenuTileResults95(${args}, options, memo);`);
  }
  return replaceExact96(source, `  const resolved = mergeMenuTileResults95([...baseResults, ...complementaryServingResults, ...focusResults], options, memo);
  return options.preserveReadingAlternatives ? retainExcludedReadings96(resolved,
    [fullResult, ...regionalResults].filter(result => !baseResults.includes(result)),
    new Set(complementaryServingResults.flatMap(result => result.response.vinos ?? [])), memo) : resolved;`,
  '  return mergeMenuTileResults95([...baseResults, ...complementaryServingResults, ...focusResults], options, memo);');
};
const priorMenuReading96 = (path: string) => path === menu ? restoreMenuReadingUi96(current(path))
  : path === menuReading96.scan ? restoreMenuReadingScan96(current(path)) : current(path);
const resolverWithoutReadings96 = (source: string) => {
  const tree = parse(menuReading96.scan, source), fn = component(tree, 'resolveMenuTileResults');
  let returns = 0, earlyWrappers = 0;
  const result = ts.transform(fn, [context => {
    const visit: ts.Visitor = node => {
      if (ts.isIfStatement(node) && ts.isBlock(node.thenStatement)
        && ['!fullResult', 'regionalResults.length === 0'].includes(node.expression.getText(tree))) {
        const changed = ts.visitEachChild(node, visit, context);
        assert.ok(ts.isBlock(changed.thenStatement)); assert.equal(changed.thenStatement.statements.length, 1);
        const last = changed.thenStatement.statements[0]; assert.ok(ts.isReturnStatement(last));
        assert.equal(changed.elseStatement, undefined); earlyWrappers++;
        return context.factory.updateIfStatement(changed, changed.expression, last, undefined);
      }
      if (ts.isBlock(node) && node.statements.length >= 2) {
        const declaration = node.statements.at(-2), last = node.statements.at(-1);
        if (declaration && ts.isVariableStatement(declaration) && declaration.declarationList.declarations.length === 1
          && declaration.declarationList.declarations[0].name.getText(tree) === 'resolved'
          && last && ts.isReturnStatement(last) && last.expression && ts.isConditionalExpression(last.expression)
          && last.expression.condition.getText(tree) === 'options.preserveReadingAlternatives'
          && last.expression.whenFalse.getText(tree) === 'resolved') {
          const value = declaration.declarationList.declarations[0].initializer;
          assert.ok(value && ts.isCallExpression(value) && value.expression.getText(tree) === 'mergeMenuTileResults95');
          returns++;
          node = context.factory.updateBlock(node, [...node.statements.slice(0, -2), context.factory.createReturnStatement(value)]);
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit) as ts.ArrowFunction;
  }]);
  try {
    assert.equal(returns, 3);
    assert.equal(earlyWrappers, 2);
    return ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, result.transformed[0], tree);
  } finally { result.dispose(); }
};
const oldShop = parse(shop, before(shop)), newShop = parse(shop, current(shop));
const oldRestaurant = parse(restaurant, before(restaurant)), newRestaurant = parse(restaurant, current(restaurant));
const oldSession = component(oldShop, 'WineShopLinkAdvisorSession'), newSession = component(newShop, 'WineShopLinkAdvisorSession');
const oldRest = component(oldRestaurant, 'RestaurantSession'), newRest = component(newRestaurant, 'RestaurantSession');
let home96Result: { passed: number; failed: number; baseline: string; nativeInitialScannerLandscapePaddingAmendments: number } | undefined;
let nativeKeyboardBridge96Result: object | undefined;

check('All five exact pre31e and reviewed current sources are bound, not broad path exemptions', () => {
  assert.equal(fingerprints.size, 5);
  assert.deepEqual([...reviewed95Fingerprints.keys()], [...fingerprints.keys()]);
  for (const [path, [prior, now]] of fingerprints) {
    assert.equal(hash(before(path)), prior, `Exact31e: ${path}`);
    assert.equal(hash(reviewed95(path)), reviewed95Fingerprints.get(path), `Exact reviewed95 bridge: ${path}`);
    assert.equal(hash(priorMenuReading96(path)), now, `Exact reviewed current or complete9704 bridge: ${path}`);
  }
  for (const [path, expected] of menuReading96.sources) assert.equal(hash(current(path)), expected, `Exact reading96 source: ${path}`);
  const historical = (path: string) => execFileSync('git', ['show', `${menuReading96.revision}:${path}`], { encoding: 'utf8' });
  const oldMenu = historical(menu), oldScan = historical(menuReading96.scan);
  const proveMenu = (source: string) => assert.equal(restoreMenuReadingUi96(source), oldMenu, 'Full9704 Menu source, callbacks and all preexisting behavior remain exact');
  const proveScan = (source: string) => assert.equal(restoreMenuReadingScan96(source), oldScan, 'Full9704 resolver module, base choice, prices and defaults remain exact');
  proveMenu(current(menu)); proveScan(current(menuReading96.scan));
  assert.equal(resolverWithoutReadings96(current(menuReading96.scan)), ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified,
    component(parse(menuReading96.scan, oldScan), 'resolveMenuTileResults'), parse(menuReading96.scan, oldScan)), 'Complete resolver AST with optional readings=false equals9704');
  const mutations: [string, string, string, string][] = [
    [menu, 'preserveReadingAlternatives: isNative', 'preserveReadingAlternatives: true', 'web option leak'],
    [menu, 'onClick={(event) => openWineDetail(index, event.currentTarget)}', 'onClick={() => undefined}', 'old callback'],
    [menu, '{ nombre: reading.nombre, productor: null }', '{ nombre: reading.nombre, productor: reading.productor }', 'manual identity authority'],
    [menu, 'reading.rawIndex + 1', 'reading.rawIndex', 'raw provenance'],
    [menu, '{isNative && selectedPinIndex !== null', '{selectedPinIndex !== null', 'native evidence gate'],
    [menu, 'const text = isNative ? nativeMenuTakeawayText96', 'const text = true ? nativeMenuTakeawayText96', 'web helper gate'],
    [menuReading96.scan, 'overlapRatio >= 0.6', 'overlapRatio >= 0.5', 'base selection'],
    [menuReading96.scan, 'Math.abs(a - b) > priceTolerance', 'Math.abs(a - b) > 0.5', 'price comparison'],
    [menuReading96.scan, 'options: MenuMergeOptions95 = {}', 'options: MenuMergeOptions95 = { preserveReadingAlternatives: true }', 'default option'],
    [menuReading96.scan, 'return options.preserveReadingAlternatives ?', 'return !options.preserveReadingAlternatives ?', 'opt-out branch'],
    [menuReading96.scan, 'rawIndex,\n      nombre:', 'rawIndex: 0,\n      nombre:', 'alternate source index'],
    [menuReading96.scan, 'entries.length >= 3', 'entries.length >= 4', 'metadata bound'],
  ];
  for (const [path, from, to, name] of mutations) {
    const original = current(path); assert.ok(original.includes(from), `Applicable reading96 negative: ${name}`);
    const changed = original.replace(from, to); assert.notEqual(changed, original, name);
    assert.throws(() => path === menu ? proveMenu(changed) : proveScan(changed), undefined, `Hash-independent bridge rejects ${name}`);
  }
  assert.equal(mutations.length, 12);
  const r3Mutations: [string, string, string, string][] = [
    [menu, 'de unas ${expected}', 'de otras ${expected}', 'native coverage copy'],
    [menu, 'de aproximadamente ${expected}', 'de otras ${expected}', 'legacy web coverage copy'],
    [menuReading96.scan, 'knownTiles.includes(tile.id) && box', 'true && box', 'known source tile admission'],
    [menuReading96.scan, 'Number.isFinite(value)', 'true', 'finite source box admission'],
  ];
  for (const [path, from, to, name] of r3Mutations) {
    const original = current(path); assert.ok(original.includes(from), `Applicable R3 negative: ${name}`);
    const changed = original.replace(from, to); assert.notEqual(changed, original, name);
    assert.throws(() => path === menu ? proveMenu(changed) : proveScan(changed), undefined, `R3 bridge rejects ${name}`);
  }
  assert.equal(r3Mutations.length, 4);
  assert.equal(hash(current(labelUi96.source)), labelUi96.currentHash, 'Exact separate C native-list UI source');
  assert.equal(hash(current(labelUi96.test)), labelUi96.testHash, 'Exact reviewed scanner source/AST/negative-control child');
  const output = execFileSync(process.execPath, ['--import', 'tsx', labelUi96.test], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, maxBuffer: 1024 * 1024,
  });
  assert.equal(output.split('\n').filter(line => line.startsWith('PASS ')).length, 36);
  const report = JSON.parse(output.trim().split('\n').at(-1)!);
  assert.equal(report.passed, 36); assert.equal(report.failed, 0); assert.equal(report.baseline, baseline96);
  assert.equal(report.remoteCalls, 0); assert.equal(report.paidCalls, 0);
  assert.deepEqual(report.nativeLabelUi96, {
    path: labelUi96.source, revision: labelUi96.revision, beforeHash: labelUi96.beforeHash, currentHash: labelUi96.currentHash,
    priorNativeClassHash: labelUi96.priorNativeClassHash,
    classAmendments: 5, rejectedMutations: 15, exactSourceRestored: true, fullWebAstEqual: true,
  });
  assert.deepEqual(report.nativeKeyboardBridge, {
    path: 'scripts/check-matchrim-label-keyboard96.ts', testHash: '54a47abda40574d0b74551825f50ddb87042306fd95755aa8a2f85d4c56339c3',
    ...nativeLabelKeyboard96, earlyNativeGuard: true, refsUndefinedOnWeb: true, whole05caSourceRestored: true,
    rejectedMutations: 14, childGroups: 5,
  });
  nativeKeyboardBridge96Result = report.nativeKeyboardBridge;
});
check('Shop full owner/pending/generation/request/history/error closures remain byte exact', () => {
  assert.deepEqual(exactPreRender(newSession, true), exactPreRender(oldSession));
});
check('Only shop native flag/import added outside rendering; owner-keyed wrapper unchanged', () => {
  const flags = preRender(newSession).filter(nativeDeclaration);
  assert.equal(flags.length, 1);
  assert.equal(flags[0].getText(), 'const native = Capacitor.isNativePlatform();');
  assert.equal(outsideComponent(newShop, newSession).replace('import { Capacitor } from "@capacitor/core";\n', ''),
    outsideComponent(oldShop, oldSession));
  assert.deepEqual(canonical(component(newShop, 'WineShopLinkAdvisor')), canonical(component(oldShop, 'WineShopLinkAdvisor')));
});
check('Complete shop native=false JSX AST identical, including all optional text, attrs and callbacks', () => {
  assert.deepEqual(canonical(render(newSession)), canonical(render(oldSession)));
});
check('Restaurant full import/read/rank/profile/identity/owner/storage/cancel closures byte exact', () => {
  assert.deepEqual(exactPreRender(newRest), exactPreRender(oldRest));
});
check('Complete Restaurant native=false JSX AST identical, including all dialogs and callbacks', () => {
  assert.deepEqual(canonical(render(newRest)), canonical(render(oldRest)));
});
check('Restaurant module and auth/privacy wrapper outside session remain byte exact', () => {
  assert.equal(outsideComponent(newRestaurant, newRest), outsideComponent(oldRestaurant, oldRest));
  assert.deepEqual(canonical(component(newRestaurant, 'Restaurant')), canonical(component(oldRestaurant, 'Restaurant')));
});
check('PDF native header reserves56px for fixed44px close and retains scroll without font shrinking', () => {
  const prior = 'className="max-h-[90dvh] overflow-y-auto [overflow-wrap:anywhere]"><DialogHeader><DialogTitle>{preview?.name}';
  const revised = "className={native ? 'max-h-[90dvh] overflow-y-auto [overflow-wrap:anywhere] p-[12px] [&>button:last-child]:right-[12px] [&>button:last-child]:top-[12px] [&>button:last-child]:grid [&>button:last-child]:h-[44px] [&>button:last-child]:w-[44px] [&>button:last-child]:place-items-center [&>button:last-child>svg]:h-[20px] [&>button:last-child>svg]:w-[20px]' : 'max-h-[90dvh] overflow-y-auto [overflow-wrap:anywhere]'}><DialogHeader className={native ? 'min-h-[44px] min-w-0 pr-[56px] text-left' : undefined}><DialogTitle>{preview?.name}";
  assert.equal(before(restaurant).split(prior).length, 2);
  assert.equal(current(restaurant), before(restaurant).replace(prior, revised));
});
check('Finding native form uses normal prose, result emergency-wrap, physical padding and44px examples', () => {
  const classes = collect(render(newSession), ts.isJsxAttribute).map(nativeClass).filter(value => value !== null);
  assert.deepEqual(classes, [
    'min-w-0 [overflow-wrap:normal]', 'min-w-0 space-y-[8px] p-[12px]',
    'flex min-w-0 flex-wrap items-start gap-[8px] tracking-normal',
    'min-w-0 space-y-[16px] px-[12px] pb-[12px] pt-0',
    'min-h-[44px] w-full min-w-0 whitespace-normal rounded-lg border border-stone-200 bg-stone-50 px-[12px] py-[8px] text-left text-xs leading-5 text-slate-700 hover:border-red-200 hover:bg-red-50',
    'min-w-0 [overflow-wrap:anywhere]', 'min-w-0 space-y-[8px] p-[12px]',
    'flex min-w-0 flex-wrap items-start gap-[8px] text-lg tracking-normal',
    'min-w-0 space-y-[12px] px-[12px] pb-[12px] pt-0',
    'min-w-0 rounded-lg border border-stone-200 bg-white p-[12px]',
    'min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-[12px] text-sm leading-6 text-amber-950',
  ]);
  const titles = collect(render(newSession), ts.isConditionalExpression).filter(node => ts.isIdentifier(node.condition)
    && node.condition.text === 'native' && ts.isJsxElement(node.whenTrue));
  assert.equal(titles.length, 2);
  for (const title of titles) assert.equal(title.whenTrue.getText().includes('className="min-w-0 basis-full"'), true);
});
check('Home stylesheet delta is one existing native landscape declaration, no nav masking or web change', () => {
  const tree = postcss.parse(before('src/index.css'));
  let changed = 0;
  tree.walkDecls('grid-template-columns', declaration => {
    if (declaration.parent?.type !== 'rule') return;
    const rule = declaration.parent as postcss.Rule;
    if (rule.selector !== 'html.matchrim-native-platform .matchrim-native-home-main [aria-labelledby="home-decision-title"] > div') return;
    assert.equal(declaration.value, 'repeat(2, minmax(14rem, 1fr))');
    assert.equal(declaration.parent.parent?.type, 'atrule');
    const media = declaration.parent.parent as postcss.AtRule;
    assert.equal(media.name, 'media'); assert.equal(media.params, '(orientation: landscape) and (max-height: 600px)');
    declaration.value = 'repeat(auto-fit, minmax(min(14rem, 100%), 1fr))'; changed++;
  });
  assert.equal(changed, 1); assert.equal(tree.toString(), reviewed95('src/index.css'));
  const landscape96 = `@media (orientation: landscape) and (min-width: 700px) and (max-height: 600px) {
  html.matchrim-native-platform.matchrim-accessibility-text .matchrim-native-home-shell .matchrim-native-scan-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

`;
  const initialLandscapePadding96 = `@media (orientation: landscape) and (min-width: 700px) and (max-height: 600px) {
  html.matchrim-native-platform.matchrim-accessibility-text .scan-page-main:has(.scan-upload-empty),
  html.matchrim-native-platform.matchrim-accessibility-text .scan-page-main:has(section[aria-labelledby="wine-menu-upload-title"] > div:not(.matchrim-scan-stage) #wine-menu-upload-title) {
    padding-top: calc(12px + var(--matchrim-safe-top));
  }
}

`;
  const actualCss = current('src/index.css');
  assert.equal(actualCss.split(initialLandscapePadding96).length, 2);
  const currentCss = actualCss.replace(initialLandscapePadding96, '');
  assert.equal(hash(currentCss), '09dd22de7a2db31b3e4e94c9cbc1ab19fd3dd5d79207f751bc8d8b119a86106b',
    'Only the exact initial nativeAX landscape top padding may amend the accepted A_R6 CSS');
  const uploadMarker = '/* Initial scanner copy keeps its full width at accessibility text sizes. */';
  assert.equal(currentCss.split(uploadMarker).length, 2);
  const uploadStart = currentCss.indexOf(uploadMarker);
  const uploadEnd = currentCss.indexOf('\nbody,\n#root,\n.App', uploadStart) + 1;
  assert.ok(uploadStart > 0 && uploadEnd > uploadStart);
  assert.equal(hash(currentCss.slice(uploadStart, uploadEnd)),
    '10007d8f067152acb6f276359357385c81a4dd92bb0adf2a74db3f3a361685a0', 'Exact reviewed nativeAX initial-upload CSS block');
  const homeCss96 = currentCss.slice(0, uploadStart) + currentCss.slice(uploadEnd);
  assert.equal(hash(homeCss96), 'ae7e7f08d659749950130c2e134cbdee0a0bd01d0fbc118a625adf42a3daface', 'Exact accepted Home landscape amendment before scanner CSS');
  assert.equal(homeCss96.split(landscape96).length, 2);
  assert.equal(hash(homeCss96.replace(landscape96, '')),
    'c043534a61bf701897665d029e1c4140cc173329d61843955872b18cbe54f072', 'Removing only the exact landscape96 grid restores the full accepted A_R4 CSS');
  // Keep the original95 transform exact, then separately prove the complete96 Home/nav amendment.
  for (const [path, frozen] of home96.sources) assert.equal(hash(current(path)), frozen, `Exact Home96: ${path}`);
  assert.equal(hash(current(home96.test)), home96.testHash, 'Exact reviewed Home96 child oracle');
  const output = execFileSync(process.execPath, ['--import', 'tsx', home96.test], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, maxBuffer: 1024 * 1024,
  });
  const lines = output.trim().split('\n');
  assert.equal(lines.filter(line => line.startsWith('PASS ')).length, 12);
  home96Result = JSON.parse(lines.at(-1) ?? '') as typeof home96Result;
  assert.ok(home96Result);
  assert.equal(home96Result.passed, 12); assert.equal(home96Result.failed, 0); assert.equal(home96Result.baseline, baseline96);
  assert.equal(home96Result.nativeInitialScannerLandscapePaddingAmendments, 1);
});
check('MenuScanner exact scoped delta is import, two native option gates and three native serving labels', () => {
  let expected = before(menu);
  const changes: [string, string, number][] = [
    ['  resolveMenuTileResults,\n', '  resolveMenuTileResults,\n  literalMenuServingFormat95,\n', 1],
    ['resolveMenuTileResults(successfulTiles, { preserveNumericReferences: isNative })',
      'resolveMenuTileResults(successfulTiles, { preserveNumericReferences: isNative, preserveServingFormats: isNative })', 2],
    ["aria-label={`Abrir ${isNative && isLiteralWineStyle95(wine) ? 'estilo' : 'vino'} ${index + 1}: ${wine.nombre}`}",
      "aria-label={`Abrir ${isNative && isLiteralWineStyle95(wine) ? 'estilo' : 'vino'} ${index + 1}: ${wine.nombre}${isNative && literalMenuServingFormat95(wine) ? ` \u00b7 ${literalMenuServingFormat95(wine)}` : ''}`}", 1],
    ["'Servicio sin confirmar' : wine.servicio].filter(Boolean)",
      "'Servicio sin confirmar' : wine.servicio, isNative ? literalMenuServingFormat95(wine) : null].filter(Boolean)", 1],
    ['{selectedPinWine.nombre}</DrawerTitle>',
      '{selectedPinWine.nombre}{isNative && literalMenuServingFormat95(selectedPinWine) && <span className="block text-sm font-normal leading-6 text-slate-600">{literalMenuServingFormat95(selectedPinWine)}</span>}</DrawerTitle>', 1],
  ];
  for (const [oldText, newText, count] of changes) {
    assert.equal(expected.split(oldText).length - 1, count, oldText);
    expected = expected.split(oldText).join(newText);
  }
  assert.equal(expected, reviewed95(menu), 'Original R6 serving amendment must still exactly produce the reviewed95 source');
  const cropAmendments96: [string, string][] = [
    ['const initialTiles = retained?.failed ?? menuRecoveryTiles95(prepared.width, prepared.height, recoveryLayout, recoveryColumnSplit);',
      "const initialTiles = retained?.failed ?? (recoveryLayout === 'auto'\n          ? buildMenuScanTiles(prepared.width, prepared.height, 'unknown', { preserveRowContext: true })\n          : menuRecoveryTiles95(prepared.width, prepared.height, recoveryLayout, recoveryColumnSplit));"],
    ['planNativeMenuRefinement93(prepared.width, prepared.height, fullResponse)',
      'planNativeMenuRefinement93(prepared.width, prepared.height, fullResponse, { preserveRowContext: true })'],
  ];
  for (const [oldText, newText] of cropAmendments96) {
    assert.equal(expected.split(oldText).length - 1, 1, oldText);
    expected = expected.replace(oldText, newText);
  }
  assert.equal(hash(expected), 'a5a0e3c4dd5b990891c3aac4aa4b9c149d9ff53dace794d79e547363bb0cb06a', 'Exact reviewed B_R2 menu bridge');
  const parallelAmendments96: [string, string][] = [
    ['createMenuScanRun93, planNativeMenuRefinement93, type MenuScanMetrics93',
      'createMenuScanRun93, planNativeMenuInitialRead96, planNativeMenuRefinement93, type MenuScanMetrics93'],
    ["      if (isNative && readMode !== 'full') {\n        const initialTiles = retained?.failed ?? ",
      "      const nativeInitialTiles = nativeRun && readMode === 'full' && !isMatchrimFixtureQaEnabled\n        ? planNativeMenuInitialRead96(prepared.width, prepared.height) : [];\n      if (nativeInitialTiles.length || (isNative && readMode !== 'full')) {\n        const initialTiles = nativeInitialTiles.length ? nativeInitialTiles : retained?.failed ?? "],
    ['tile, response: await invokeScan(tile, await cropImageRegion(base64File, tile.box, 0, 1800, controller.signal)),',
      "tile, response: await invokeScan(tile, tile.id === 'full' ? base64File\n            : await cropImageRegion(base64File, tile.box, 0, 1800, controller.signal)),"],
    ["if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');\n        successfulTiles.push(...initial",
      "if (scanAbortRef.current !== controller || controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');\n        successfulTiles.push(...initial"],
    ['const fullResponse = successfulTiles[0]?.response;',
      "const fullResponse = nativeInitialTiles.length\n        ? successfulTiles.find(({ tile }) => tile.id === 'full')?.response : successfulTiles[0]?.response;"],
    ["const scanTiles = isMatchrimFixtureQaEnabled || (isNative && readMode !== 'full') ? []",
      "const scanTiles = isMatchrimFixtureQaEnabled || nativeInitialTiles.length || (isNative && readMode !== 'full') ? []"],
  ];
  for (const [oldText, newText] of parallelAmendments96) {
    assert.equal(expected.split(oldText).length - 1, 1, oldText);
    expected = expected.replace(oldText, newText);
  }
  assert.equal(hash(expected), '81476126b861468da831106d5d5a21b03f9534df7c20ba331be1d0b84d911161', 'Exact frozen B_R3 source before native-only consumer UI amendments');
  let priorConsumerUi96 = priorMenuReading96(menu);
  const headerCloseAmendments96: [string, string][] = [
    ["<DrawerHeader className={isNative ? 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white px-[8px] py-[12px] text-left' : 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white text-left'}>",
      "<DrawerHeader className={isNative ? 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white p-[12px] text-left' : 'min-w-0 shrink-0 break-words border-b border-stone-200 bg-white text-left'}>"],
    ["<div className={isNative ? 'flex min-w-0 items-start justify-between gap-[4px]' : 'flex items-start justify-between gap-3'}>",
      '<div className="flex items-start justify-between gap-3">'],
    ["<div className={isNative ? 'max-h-[28vh] min-w-0 flex-1 overflow-y-auto' : 'min-w-0'}>",
      "<div className={isNative ? 'max-h-[28vh] min-w-0 overflow-y-auto' : 'min-w-0'}>"],
    ["<X className={isNative ? 'h-[20px] w-[20px]' : 'h-4 w-4'} style={isNative ? { width: 20, height: 20 } : undefined} />",
      "<X className={isNative ? 'h-[20px] w-[20px]' : 'h-4 w-4'} />"],
  ];
  assert.equal(headerCloseAmendments96.length, 4, 'Four new header blocks; comparison MAX reflow is retained below, not counted twice');
  for (const [amendment, prior] of headerCloseAmendments96) {
    assert.equal(priorConsumerUi96.split(amendment).length, 2, amendment);
    priorConsumerUi96 = priorConsumerUi96.replace(amendment, prior);
  }
  assert.equal(hash(priorConsumerUi96), '4000c9c5eb70b3f02d4191d765a7e8bbb8679e51d4c71b001f34c511fb4cfe38',
    'Reversing only the four native header/close blocks must restore the complete frozen B4000 source');
  const unchangedRowBridge96 = '\n\t\t                    onClick={(event) => openWineDetail(index, event.currentTarget)}\n\t\t                  >\n\t                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-stone-950 text-sm font-bold text-white">{index + 1}</span>\n\t\t                    ';
  const consumerUiAmendments96: [string, string][] = [
    ["{isNative ? 'Transcripción automática, sin verificar:' : 'Texto visible:'}", 'Texto visible:'],
    ["<div className={kind === 'comparison' ? 'min-w-0 pt-2 [html.matchrim-accessibility-text_&_label]:flex-wrap [html.matchrim-accessibility-text_&_label]:px-[12px] [html.matchrim-accessibility-text_&_label>span]:basis-full' : 'min-w-0 pt-2'}>{children}</div>",
      '<div className="min-w-0 pt-2">{children}</div>'],
    ["\t\t\t                    className={`matchrim-pressable flex min-h-16 w-full flex-wrap items-center gap-3 ${isNative ? 'px-[12px]' : 'px-3'} py-3 text-left ${highlightedWineIndex === index ? 'bg-amber-50' : 'hover:bg-stone-50'}`}"
      + unchangedRowBridge96 + "<span className={isNative ? 'min-w-[min(6rem,100%)] flex-1 [html.matchrim-accessibility-text_&]:basis-full' : 'min-w-[min(6rem,100%)] flex-1'}>",
      "\t\t                    className={`matchrim-pressable flex min-h-16 w-full flex-wrap items-center gap-3 px-3 py-3 text-left ${highlightedWineIndex === index ? 'bg-amber-50' : 'hover:bg-stone-50'}`}"
      + unchangedRowBridge96 + '<span className="min-w-[min(6rem,100%)] flex-1">'],
    [`                          {isNative && !isLiteralWineStyle95(wine) && !catalogWineFromVerifiedSheet({
                            name: wine.nombre, producer: wine.productor, vintage: wine.anada, region: wine.region, country: wine.pais,
                            inferredFields: wine.campos_inferidos,
                          }, wine.originalSheet) && <span className="block text-xs font-medium text-stone-600">Nombre leído por confirmar</span>}
`, ''],
    [`                            {isNative && !isLiteralWineStyle95(selectedPinWine) && !catalogWineFromVerifiedSheet({
                              name: selectedPinWine.nombre, producer: selectedPinWine.productor, vintage: selectedPinWine.anada,
                              region: selectedPinWine.region, country: selectedPinWine.pais, inferredFields: selectedPinWine.campos_inferidos,
                            }, selectedPinWine.originalSheet) && <p className="text-sm text-stone-600">Nombre leído por confirmar</p>}
`, ''],
  ];
  assert.equal(consumerUiAmendments96.length, 5, 'Three approved categories: caption, native row padding/MAX layout and two adjacent name qualifications');
  for (const [amendment, prior] of consumerUiAmendments96) {
    assert.equal(priorConsumerUi96.split(amendment).length, 2, amendment);
    priorConsumerUi96 = priorConsumerUi96.replace(amendment, prior);
  }
  assert.equal(priorConsumerUi96, expected, 'Removing only the exact native consumer caption/padding/name qualifications must recover the complete frozen B_R3 source');
  const qualifiedNames = collect(parse(menu, current(menu)), ts.isJsxExpression).filter(node =>
    node.getText().startsWith('{isNative && !isLiteralWineStyle95(') && node.getText().includes('Nombre leído por confirmar'));
  assert.equal(qualifiedNames.length, 2);
  const detailQualification = qualifiedNames.find(node => node.getText().includes('selectedPinWine'));
  assert.ok(detailQualification && ts.isJsxElement(detailQualification.parent));
  const headerChildren = detailQualification.parent.children.filter(node => !ts.isJsxText(node));
  assert.equal(headerChildren[0], detailQualification, 'Qualification precedes the potentially long title in its same bounded header');
  assert.ok(ts.isJsxElement(headerChildren[1]));
  assert.equal(headerChildren[1].openingElement.tagName.getText(), 'DrawerTitle');

  const execution = 'src/utils/wineMenuExecution93.ts';
  let expectedExecution = reviewed95(execution);
  const executionCropAmendments96: [string, string][] = [
    ["type MenuScanResponse, type MenuScanTile } from './wineMenuScan';",
      "type MenuScanResponse, type MenuScanTile, type MenuScanTileOptions96 } from './wineMenuScan';"],
    ['export const planNativeMenuRefinement93 = (width: number, height: number, response: MenuScanResponse): MenuScanTile[] => {',
      'export const planNativeMenuRefinement93 = (width: number, height: number, response: MenuScanResponse,\n  options: MenuScanTileOptions96 = {}): MenuScanTile[] => {'],
    ['const tiles = buildMenuScanTiles(width, height, response.layout);',
      'const tiles = buildMenuScanTiles(width, height, response.layout, options);'],
  ];
  for (const [oldText, newText] of executionCropAmendments96) {
    assert.equal(expectedExecution.split(oldText).length - 1, 1, oldText);
    expectedExecution = expectedExecution.replace(oldText, newText);
  }
  assert.equal(hash(expectedExecution), '2fb0ce4d9b9606d46effd2d35def9141ac734f4b33f93283549fdedc5a0c4815', 'Exact reviewed B_R2 execution bridge');
  const initialPlanner96 = `export const planNativeMenuInitialRead96 = (width: number, height: number): MenuScanTile[] => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || Math.min(width, height) < 1200
    || Math.max(width, height) <= 1800) return [];
  // Large documents get independent row/column context before a slow full read can consume the deadline.
  // Smaller images remain full-first; this geometry is not a claim about the document's contents.
  return [getFullMenuScanTile(), ...buildMenuScanTiles(width, height, 'unknown', { preserveRowContext: true }),
    getRightFocusMenuScanTile()];
};`;
  for (const [oldText, newText] of [
    ['import { buildMenuScanTiles, getRightFocusMenuScanTile, mayHaveUnreadMenuColumn,',
      'import { buildMenuScanTiles, getFullMenuScanTile, getRightFocusMenuScanTile, mayHaveUnreadMenuColumn,'],
    ['export class MenuScanLimitError93 extends Error {', `${initialPlanner96}\n\nexport class MenuScanLimitError93 extends Error {`],
  ]) {
    assert.equal(expectedExecution.split(oldText).length - 1, 1, oldText);
    expectedExecution = expectedExecution.replace(oldText, newText);
  }
  assert.equal(hash(current(execution)), 'be6f408618411aaba9cd0e6ce23cffc898380299dd6c9b5021fef6d3301a175a', 'Exact frozen B_R3 executor');
  assert.equal(current(execution), expectedExecution, 'Existing limiter, right-focus guard, defaults, abort race and cleanup remain byte exact');
});
check('Actual menu resolver callsites opt in only with native; all previous arguments remain intact', () => {
  const calls = collect(parse(menu, priorMenuReading96(menu)), ts.isCallExpression).filter(node => node.expression.getText() === 'resolveMenuTileResults');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.arguments.length, 2); assert.equal(call.arguments[0].getText(), 'successfulTiles');
    assert.equal(call.arguments[1].getText(), '{ preserveNumericReferences: isNative, preserveServingFormats: isNative }');
  }
  const actual = collect(parse(menu, current(menu)), ts.isCallExpression).filter(node => node.expression.getText() === 'resolveMenuTileResults');
  assert.equal(actual.length, 2);
  for (const call of actual) {
    assert.equal(call.arguments.length, 2); assert.equal(call.arguments[0].getText(), 'successfulTiles');
    assert.equal(call.arguments[1].getText(), '{ preserveNumericReferences: isNative, preserveServingFormats: isNative, preserveReadingAlternatives: isNative }');
  }
});
check('Closure proof rejects owner, pending, current-response, transport and history mutations', () => {
  for (const [original, mutation] of [
    ['if (pendingRef.current) return;', 'if (false) return;'],
    ['isMatchrimLocalOwner(ownerId)', 'true'],
    ['if (!isCurrent()) return;', 'if (false) return;'],
    ['"analyze-shop-link"', '"other-function"'],
    ['recordOwnedScanHistory({ ownerId, isCurrent }', 'recordOwnedScanHistory({ ownerId: null, isCurrent }'],
  ]) {
    assert.ok(current(shop).includes(original));
    const changed = component(parse(shop, current(shop).replace(original, mutation)), 'WineShopLinkAdvisorSession');
    assert.throws(() => assert.deepEqual(exactPreRender(changed, true), exactPreRender(oldSession)));
  }
  const changed = component(parse(restaurant, current(restaurant).replace('request.current?.abort()', 'void 0')), 'RestaurantSession');
  assert.throws(() => assert.deepEqual(exactPreRender(changed), exactPreRender(oldRest)));
});
check('Full web AST proof rejects text, attributes and callback changes instead of stripping layout indiscriminately', () => {
  for (const [original, mutation] of [
    ['Matchrim no vende vino:', 'Changed web disclosure:'],
    ['rows={4}', 'rows={3}'],
    ['onClick={handleSubmit}', 'onClick={() => undefined}'],
  ]) {
    assert.ok(current(shop).includes(original));
    const changed = component(parse(shop, current(shop).replace(original, mutation)), 'WineShopLinkAdvisorSession');
    assert.throws(() => assert.deepEqual(canonical(render(changed)), canonical(render(oldSession))));
  }
});
check('Separate native AX hub CSS amendment preserves whole EFC stylesheet and runs five additive scope/negative groups', () => {
  const scanHubSource = readFileSync(scanHub96.test, 'utf8');
  assertScanHubComparisonBridge96(restoreScanHubSvgGuard96(scanHubSource));
  assert.equal(hash(readFileSync('scripts/check-matchrim-scan-hub-svg96.mjs', 'utf8')), '011785b7ac48e6c3d8517b25b132b689b230ff899c8e121afc5234801979b59d');
  const oldScanHub = execFileSync('git', ['show', `983146c6d87a49bfa58aa503a166e0dc4e972ec1:${scanHub96.test}`], { encoding: 'utf8' });
  assert.equal(hash(oldScanHub), scanHub96.testHash);
  const fullCss = readFileSync('src/index.css', 'utf8');
  assert.equal(hash(fullCss), comparisonTargetScope96.currentCssHash);
  assert.equal(hash(readFileSync(comparisonTargetScope96.test, 'utf8')), comparisonTargetScope96.testHash);
  const comparisonOutput = execFileSync(process.execPath, ['--import', 'tsx', comparisonTargetScope96.test], { encoding: 'utf8' });
  assert.equal(comparisonOutput.trim(), 'Comparison target96: CSS scope/inverse, 44px target, 20px indicator and six directed negatives PASS. Not UIKit geometry proof.');
  const actualCss = restoreComparisonTarget96(fullCss);
  assert.equal(hash(actualCss), scanHub96.currentCssHash);
  const projected = restoreNativeScanHub96(actualCss);
  assert.equal(hash(projected), scanHub96.projectedCssHash);
  assert.equal(projected, execFileSync('git', ['show', `${scanHub96.revision}:src/index.css`], { encoding: 'utf8' }));
  const output = execFileSync(process.execPath, ['--import', 'tsx', scanHub96.test], {
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60_000, maxBuffer: 1024 * 1024,
  });
  const report = JSON.parse(output.trim().split('\n').at(-1)!);
  assert.equal(output.split('\n').filter(line => line.startsWith('PASS ')).length, 5);
  assert.equal(report.groups, 5); assert.equal(report.passed, true); assert.equal(report.baseline, false);
  for (const [key, value] of Object.entries(nativeHubSvg96Result)) assert.equal(report.nativeHubSvg96[key], value);
  assert.equal(report.SDKOrNativeRuntimeUsed, false); assert.equal(report.sourceComponentUnchanged, true);
  assert.equal(report.webAndNormalNativeExactOptOut, true); assert.equal(report.ui, null);
});

console.log(JSON.stringify({ passed, failed: 0, baseline, sources: Object.fromEntries(fingerprints),
  reviewed95: { revision: baseline96, sources: Object.fromEntries(reviewed95Fingerprints) },
  scope96: { homeSources: Object.fromEntries(home96.sources), child: { path: home96.test, hash: home96.testHash, ...home96Result }, nativeHomeLandscapeAmendments: 1, nativeInitialScannerRules: 12, nativeInitialScannerLandscapePaddingAmendments: 1, nativeMenuCropAmendments: 2, nativeMenuParallelAmendments: 6, nativeMenuConsumerUiAmendments: 9, nativeMenuConsumerUiCategories: 4,
    nativeLabelUi96: { ...labelUi96, passed: 36, failed: 0, classAmendments: 5, rejectedMutations: 15 },
    nativeKeyboardBridge: nativeKeyboardBridge96Result,
    nativeScanHubAccessibility96: scanHub96,
    nativeHubDecorativeSvg96: { test: 'scripts/check-matchrim-scan-hub-svg96.mjs', testHash: '011785b7ac48e6c3d8517b25b132b689b230ff899c8e121afc5234801979b59d', ...nativeHubSvg96Result },
    nativeComparisonTarget96: comparisonTargetScope96,
    nativeMenuReading96: { revision: menuReading96.revision, sources: Object.fromEntries(menuReading96.sources), componentJsxBlocks: 4, componentDeclarationBlocks: 2,
      componentOptInCalls: 2, resolverDeclarationBlocks: 4, resolverReturnWrappers: 3, resolverFalseAstEqual: true, rejectedMutations: 12,
      nativeCoverageCopyAmendments: 1, metadataSourceAdmissionAmendments: 1, r3RejectedMutations: 4,
      metadataSourceHelperHash: 'fa12b2e159b4e0b50f4c43c4384ba0658478d2db36e959e0861c1b29286deea9',
      metadataPriorHelperHash: '0a9e8d14522e08d05e3f590fa9177586e6526cf00ae314e92c7fe1907b2f8696', knownSourceTileIds: 10,
      functionalGroups: 11, functionalExecution: 'Registered separately in test:closure96; not duplicated by this source guard' } },
  scope: 'Offline native=false JSX AST, exact lifetime closures, native layout controls and five frozen source pairs, preserving reviewed95, B_R2, B_R3 and B4000 bridges. Separate96 scope executes the exact12-group Home/nav/initial-padding child quietly; two menu crop amendments, six B_R3 parallel amendments and its exact planner, plus nine exact native consumer UI blocks in four categories are separately bounded. The separate36-group scanner child retains all35 historical groups and their15 negatives: its declared native keyboard/count inverse first restores whole05ca/b48, then the original five native class inverse restores exact2dc/ebee and proves that scoped complete web-false AST. It does not claim the literal current module AST is identical. Its one genuine additional group executes the existing five keyboard/count proxy groups and rejects14 guard/ref/web-copy/handler/crop mutations; nativeKeyboardBridge reports that fact separately. Crop geometry and prior C6 checks remain unchanged. Reading96 separately pins all four new sources, restores complete9704 Menu/resolver source, compares its complete opt-out resolver AST and rejects12 hash-independent mutations. R3 separately binds one native coverage-copy amendment with the exact old web branch and one metadata-only R14 source tile/box admission block, with four additional negatives. Its eleven functional groups run separately in test:closure96. Comparison MAX reflow is retained, not counted twice. Menu behavior is separately executed by the29-group public serving suite. Not browser/native execution, recognition, stock, accounts or human validation.' }));
