import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import ts from 'typescript';

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
  testHash: 'c9f6e66c4cd36de7eb8d4e9fb5e2282036501282767f736de176f2d8b801fd33',
  sources: new Map([
    ['src/components/NativeAppHome.tsx', '04d35a6fcfb4536b060fa701e86a168b81ac7320368ef7e3eae3a689a46cfca1'],
    ['src/components/MobileBottomNav.tsx', '9c6edc7cec29bdec7c3f2ec3696f84b69a6073e7296d669a24906c8caa820271'],
    ['src/index.css', '548ff193ba713bce9595b28cb53bb316e3929653540199a4ca86789a4b2097dd'],
  ]),
};
const before = (path: string) => execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
const reviewed95 = (path: string) => execFileSync('git', ['show', `${baseline96}:${path}`], { encoding: 'utf8' });
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
let home96Result: { passed: number; failed: number; baseline: string; nativeInitialScannerLandscapePaddingAmendments: number } | undefined;

check('All five exact pre31e and reviewed current sources are bound, not broad path exemptions', () => {
  assert.equal(fingerprints.size, 5);
  assert.deepEqual([...reviewed95Fingerprints.keys()], [...fingerprints.keys()]);
  for (const [path, [prior, now]] of fingerprints) {
    assert.equal(hash(before(path)), prior, `Exact31e: ${path}`);
    assert.equal(hash(reviewed95(path)), reviewed95Fingerprints.get(path), `Exact reviewed95 bridge: ${path}`);
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
  let priorConsumerUi96 = current(menu);
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
  reviewed95: { revision: baseline96, sources: Object.fromEntries(reviewed95Fingerprints) },
  scope96: { homeSources: Object.fromEntries(home96.sources), child: { path: home96.test, hash: home96.testHash, ...home96Result }, nativeHomeLandscapeAmendments: 1, nativeInitialScannerRules: 12, nativeInitialScannerLandscapePaddingAmendments: 1, nativeMenuCropAmendments: 2, nativeMenuParallelAmendments: 6, nativeMenuConsumerUiAmendments: 9, nativeMenuConsumerUiCategories: 4 },
  scope: 'Offline full native=false JSX AST, exact lifetime closures, native layout controls and five frozen source pairs, preserving reviewed95, B_R2, B_R3 and B4000 bridges. Separate96 scope executes the exact12-group Home/nav/initial-padding child quietly; two menu crop amendments, six B_R3 parallel amendments and its exact planner, plus nine exact native consumer UI blocks in four categories are separately bounded. Comparison MAX reflow is retained, not counted twice. Menu behavior is separately executed by the29-group public serving suite. Not browser/native execution, recognition, stock, accounts or human validation.' }));
