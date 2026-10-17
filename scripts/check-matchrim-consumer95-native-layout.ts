import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import ts from 'typescript';

// Public, offline source checks. Browser/native receipts are separate evidence.
const baseline = '31e060828d1b370b275cdcf6691052368916f39f';
const shop = 'src/components/wine-import/WineShopLinkAdvisor.tsx';
const restaurant = 'src/pages/Restaurant.tsx';
const menu = 'src/components/wine-import/WineMenuScanner.tsx';
const fingerprints = new Map([
  [shop, ['a7b9ddd9db73b93bd20b229ccb388efe46d75319ded8d723150fd1933ed60471', '17529a6c6285fbf0d348981b1b01e42b73d7816539033c92b7d3934ef6b1da0f']],
  [restaurant, ['e427d602485f0029884add6708393ac5ef841c3c99f4901af605cf4fb19d9d86', '0dfa74ac51fa1aa033d909b5e5e429599579e95547bd15a9c36e5dff86f6a918']],
  ['src/index.css', ['eb03f6feb6b397d524cbf3fbf5f57148df5afeb11b3524ef084212814544ff52', '8294a1666a03f62ac15d97dc0bdb850300de876a2473b81f86539c8f55da52e3']],
  [menu, ['23e05fd6fe37074b5ad48ac396535974a3086f7da7e10219c365916ad89768f6', 'df1d513633f04e716c162bfd8374a735d2e19dc5f3e10386e716c92a4e5e95b9']],
  ['src/utils/wineMenuScan.ts', ['4e619d70f425f107564a786ac0cca15f1f917a68634de2eaae2d303a457d32a9', 'b07438b3179edc2232b157ca07ccd4a56878962d971eb5e9e0e358154da8dddb']],
]);
const before = (path: string) => execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const current = (path: string) => readFileSync(path, 'utf8');
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
const oldShop = parse(shop, before(shop)), newShop = parse(shop, current(shop));
const oldRestaurant = parse(restaurant, before(restaurant)), newRestaurant = parse(restaurant, current(restaurant));
const oldSession = component(oldShop, 'WineShopLinkAdvisorSession'), newSession = component(newShop, 'WineShopLinkAdvisorSession');
const oldRest = component(oldRestaurant, 'RestaurantSession'), newRest = component(newRestaurant, 'RestaurantSession');

check('All five exact pre31e and reviewed current sources are bound, not broad path exemptions', () => {
  assert.equal(fingerprints.size, 5);
  for (const [path, [prior, now]] of fingerprints) {
    assert.equal(hash(before(path)), prior, `Exact31e: ${path}`);
    assert.equal(hash(current(path)), now, `Exact reviewed current: ${path}`);
  }
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
  assert.equal(changed, 1); assert.equal(tree.toString(), current('src/index.css'));
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
  assert.equal(current(menu), expected, 'No owner/request/pending/cancel/save/detail logic change outside the explicit native serving amendment');
});
check('Actual menu resolver callsites opt in only with native; all previous arguments remain intact', () => {
  const calls = collect(parse(menu, current(menu)), ts.isCallExpression).filter(node => node.expression.getText() === 'resolveMenuTileResults');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.arguments.length, 2); assert.equal(call.arguments[0].getText(), 'successfulTiles');
    assert.equal(call.arguments[1].getText(), '{ preserveNumericReferences: isNative, preserveServingFormats: isNative }');
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

console.log(JSON.stringify({ passed, failed: 0, baseline, sources: Object.fromEntries(fingerprints),
  scope: 'Offline full native=false JSX AST, exact lifetime closures, native layout controls and five frozen source pairs. Menu behavior is separately executed by the29-group public serving suite. Not browser/native execution, recognition, stock, accounts or human validation.' }));
