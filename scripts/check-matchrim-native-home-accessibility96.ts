import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import postcss from 'postcss';
import ts from 'typescript';
import { restoreNativeScanHub96 } from './check-matchrim-scan-hub96';

const baseline = 'ebee038059778f1f10bdb5dd647bccb8324fb580';
const file = 'src/components/NativeAppHome.tsx';
const before = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' });
const current = readFileSync(file, 'utf8');
const parse = (source: string) => ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = (source: string) => {
  const tree = parse(source);
  for (const statement of tree.statements) if (ts.isVariableStatement(statement)) {
    const declaration = statement.declarationList.declarations.find(node => node.name.getText(tree) === 'NativeAppHome');
    if (declaration?.initializer && ts.isArrowFunction(declaration.initializer)) {
      assert.ok(ts.isBlock(declaration.initializer.body));
      return { tree, fn: declaration.initializer, body: declaration.initializer.body };
    }
  }
  throw new Error('Missing actual Home component');
};
const old = component(before), next = component(current);
const declarations = next.body.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]);
const intro = declarations.find(node => node.name.getText() === 'homeIntroduction')?.initializer;
assert.ok(intro && ts.isJsxFragment(intro));
let projectionIntro: ts.Expression | undefined = intro;

const boolean = (node: ts.Node): boolean | undefined => {
  if (ts.isParenthesizedExpression(node)) return boolean(node.expression);
  if (ts.isIdentifier(node) && node.text === 'isNative') return false;
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) {
    const value = boolean(node.operand); return value === undefined ? undefined : !value;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    const value = boolean(node.left); return value === false ? false : value === true ? boolean(node.right) : undefined;
  }
  return undefined;
};
type Fragment = { fragment: unknown[] };
const children = (nodes: readonly ts.Node[]): unknown[] => nodes.flatMap(node => {
  const value = project(node);
  if (value === null) return [];
  if (value && typeof value === 'object' && 'fragment' in value) return (value as Fragment).fragment;
  return [value];
});
function project(node: ts.Node | undefined): unknown {
  if (!node) return null;
  if (ts.isParenthesizedExpression(node)) return project(node.expression);
  if (ts.isIdentifier(node) && node.text === 'homeIntroduction') return project(projectionIntro);
  if (ts.isConditionalExpression(node)) {
    const value = boolean(node.condition);
    if (value !== undefined) return project(value ? node.whenTrue : node.whenFalse);
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
    const value = boolean(node.left);
    if (value !== undefined) return value ? project(node.right) : null;
  }
  if (ts.isJsxExpression(node)) return project(node.expression);
  if (ts.isJsxText(node)) return node.text.trim() ? ['text', node.text.replace(/\s+/g, ' ').trim()] : null;
  if (ts.isJsxFragment(node)) return { fragment: children(node.children) };
  if (ts.isJsxElement(node)) return ['element', node.openingElement.tagName.getText(),
    children(node.openingElement.attributes.properties), children(node.children)];
  if (ts.isJsxSelfClosingElement(node)) return ['element', node.tagName.getText(), children(node.attributes.properties), []];
  if (ts.isJsxAttribute(node)) return ['attribute', node.name.getText(), node.initializer ? project(node.initializer) : true];
  if (ts.isIdentifier(node)) return ['identifier', node.text];
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return [ts.SyntaxKind[node.kind], node.text];
  const nested: unknown[] = [];
  ts.forEachChild(node, child => { nested.push(project(child)); });
  return nested.length ? [ts.SyntaxKind[node.kind], ...nested] : [ts.SyntaxKind[node.kind], node.getText()];
}
const render = (body: ts.Block) => {
  const returns = body.statements.filter(ts.isReturnStatement);
  assert.equal(returns.length, 1); return returns[0].expression;
};
let passed = 0;
const check = (name: string, run: () => void) => { run(); passed++; console.log('PASS', name); };

check('Every existing state, owner, selection, history listener and navigation lifetime is byte exact', () => {
  const statements = (body: ts.Block) => body.statements.filter(node => !ts.isReturnStatement(node)
    && !(ts.isVariableStatement(node) && node.declarationList.declarations.some(d => d.name.getText() === 'homeIntroduction'))).map(node => node.getText());
  assert.deepEqual(statements(next.body), statements(old.body));
});
check('Complete native=false JSX projection retains DOM, classes, text, attributes and callback bodies', () => {
  assert.deepEqual(project(render(next.body)), project(render(old.body)));
});
check('All imports, props and code outside the Home body remain byte exact', () => {
  const outside = (source: string) => { const value = component(source); return source.slice(0, value.fn.getStart()) + '[Home]' + source.slice(value.fn.end); };
  assert.equal(outside(current), outside(before));
});
check('Native actions precede the full unchanged introduction and guide without truncating text', () => {
  const section = current.slice(current.indexOf('<section className="mt-6"'), current.indexOf('{isNative && recentScans.length'));
  assert.ok(section.indexOf('matchrim-native-scan-grid') < section.indexOf('matchrim-native-home-intro'));
  assert.ok(section.indexOf('matchrim-native-home-intro') < section.indexOf('<MatchrimQuickGuide'));
  assert.ok(intro.getText().includes('¿Qué quieres elegir?'));
  assert.ok(intro.getText().includes('Haz una foto. Matchrim identifica, compara y explica qué encaja contigo.'));
  assert.equal((current.match(/<MatchrimQuickGuide /g) ?? []).length, 1);
});
const cssBefore = execFileSync('git', ['show', `${baseline}:src/index.css`], { encoding: 'utf8' });
// The separately pinned hub-only amendment is removed before the original12 checks.
const css = restoreNativeScanHub96(readFileSync('src/index.css', 'utf8'));
const start = css.indexOf('/* Home scrolls inside a stable viewport');
const end = css.indexOf('\nbody,\n#root,\n.App', start) + 1;
assert.ok(start > 0 && end > start);
const amendment = css.slice(start, end);
const rules = postcss.parse(amendment);
const initialLandscapePadding96 = `@media (orientation: landscape) and (min-width: 700px) and (max-height: 600px) {
  html.matchrim-native-platform.matchrim-accessibility-text .scan-page-main:has(.scan-upload-empty),
  html.matchrim-native-platform.matchrim-accessibility-text .scan-page-main:has(section[aria-labelledby="wine-menu-upload-title"] > div:not(.matchrim-scan-stage) #wine-menu-upload-title) {
    padding-top: calc(12px + var(--matchrim-safe-top));
  }
}

`;
check('CSS changes are only native Home rules plus removal of its obsolete rem-based header minimum', () => {
  const oldHeader = '  html.matchrim-native-platform .matchrim-native-home-main > div:first-child {\n    min-height: 2.5rem;\n  }\n\n';
  assert.equal(cssBefore.split(oldHeader).length, 2);
  assert.equal(css.slice(0, start) + css.slice(end), cssBefore.replace(oldHeader, ''));
  const uploadStart = amendment.indexOf('/* Initial scanner copy keeps its full width at accessibility text sizes. */');
  assert.ok(uploadStart > 0);
  const homeRules = postcss.parse(amendment.slice(0, uploadStart));
  const completeUploadCss = amendment.slice(uploadStart);
  assert.equal(completeUploadCss.split(initialLandscapePadding96).length, 2);
  const uploadCss = completeUploadCss.replace(initialLandscapePadding96, '');
  assert.equal(createHash('sha256').update(css.replace(initialLandscapePadding96, '')).digest('hex'),
    '09dd22de7a2db31b3e4e94c9cbc1ab19fd3dd5d79207f751bc8d8b119a86106b', 'Removing only the landscape initial padding restores the full accepted A_R6 stylesheet');
  assert.equal(createHash('sha256').update(uploadCss).digest('hex'),
    '10007d8f067152acb6f276359357385c81a4dd92bb0adf2a74db3f3a361685a0', 'Exact reviewed initial scanner amendment');
  homeRules.walkRules(rule => {
    assert.ok(rule.selector.startsWith('html.matchrim-native-platform'));
    assert.ok(rule.selector.includes('.matchrim-native-home-'));
  });
  const prefix = 'html.matchrim-native-platform.matchrim-accessibility-text ';
  const label = prefix + '.scan-upload-empty';
  const menu = prefix + 'section[aria-labelledby="wine-menu-upload-title"] > div:not(.matchrim-scan-stage)';
  const labelMain = prefix + '.scan-page-main:has(.scan-upload-empty)';
  const menuMain = prefix + '.scan-page-main:has(#wine-menu-upload-title)';
  const paddingRules = postcss.parse(initialLandscapePadding96).nodes;
  assert.equal(paddingRules.length, 1);
  const paddingMedia = paddingRules[0] as postcss.AtRule;
  assert.equal(paddingMedia.type, 'atrule'); assert.equal(paddingMedia.name, 'media');
  assert.equal(paddingMedia.params, '(orientation: landscape) and (min-width: 700px) and (max-height: 600px)');
  assert.equal(paddingMedia.nodes.length, 1);
  const paddingRule = paddingMedia.nodes[0] as postcss.Rule;
  assert.equal(paddingRule.type, 'rule');
  assert.deepEqual(paddingRule.selectors, [labelMain,
    prefix + '.scan-page-main:has(section[aria-labelledby="wine-menu-upload-title"] > div:not(.matchrim-scan-stage) #wine-menu-upload-title)']);
  assert.deepEqual(paddingRule.nodes.map(node => node.toString()), ['padding-top: calc(12px + var(--matchrim-safe-top))']);
  const expectedUpload: [string[], Record<string, string>][] = [
    [[labelMain, prefix + '.scan-page-main:has(section[aria-labelledby="wine-menu-upload-title"] > div:not(.matchrim-scan-stage) #wine-menu-upload-title)'],
      { 'padding-left': 'calc(12px + var(--matchrim-safe-left))', 'padding-right': 'calc(12px + var(--matchrim-safe-right))' }],
    [[labelMain + ' .scan-page-heading', menuMain + ' .scan-page-heading'], { 'margin-bottom': '16px' }],
    [[labelMain + ' .scan-page-heading > div', menuMain + ' .scan-page-heading > div'], { gap: '12px' }],
    [[labelMain + ' .scan-page-back svg', menuMain + ' .scan-page-back svg'], { width: '20px', height: '20px' }],
    [[label, menu], { display: 'block', width: '100%', 'max-width': '100%', 'min-width': '0', padding: '12px' }],
    [[label + ' > div:first-child', menu + ' > .text-left > div:first-child'],
      { display: 'flex', 'flex-direction': 'column', 'align-items': 'flex-start', gap: '12px' }],
    [[label + ' > div:first-child > span', menu + ' > .text-left > div:first-child > span'], { width: '44px', height: '44px', 'flex-shrink': '0' }],
    [[label + ' > div:first-child > div', menu + ' > .text-left', menu + ' > .text-left > div:first-child > div'],
      { width: '100%', 'max-width': '100%', 'min-width': '0' }],
    [[label + ' h2', prefix + '#wine-menu-upload-title'], { 'margin-top': '0', 'overflow-wrap': 'normal', 'word-break': 'normal' }],
    [[label + ' .scan-upload-actions', menu + ' > .text-left > .grid'],
      { display: 'grid', 'grid-template-columns': 'minmax(0, 1fr)', gap: '12px', 'margin-top': '16px' }],
    [[label + ' .scan-upload-actions > button', menu + ' > .text-left > .grid > button'],
      { width: '100%', 'max-width': '100%', 'min-width': '0', 'min-height': '44px', height: 'auto', gap: '8px', padding: '12px', 'white-space': 'normal' }],
    [[label + ' svg', menu + ' > .text-left svg'], { width: '20px', height: '20px', 'flex-shrink': '0' }],
  ];
  const uploadRules = postcss.parse(uploadCss).nodes.filter(node => node.type !== 'comment');
  assert.equal(uploadRules.length, 12);
  assert.deepEqual(uploadRules.map(node => {
    assert.equal(node.type, 'rule');
    const rule = node as postcss.Rule;
    return [rule.selectors, rule.nodes.map(declaration => {
      assert.equal(declaration.type, 'decl');
      const value = declaration as postcss.Declaration;
      return [value.prop, value.value];
    })];
  }), expectedUpload.map(([selectors, declarations]) => [selectors, Object.entries(declarations)]));
});
const declarationsFor = (selector: string) => {
  const values = new Map<string, string>();
  rules.walkRules(rule => { if (rule.selector === selector) rule.walkDecls(node => { values.set(node.prop, node.value); }); });
  assert.ok(values.size > 0, selector); return values;
};
check('A fixed viewport shell reserves the actual bottom bar and only inner main scrolls', () => {
  const shell = declarationsFor('html.matchrim-native-platform .matchrim-native-home-shell');
  assert.equal(shell.get('position'), 'fixed'); assert.equal(shell.get('inset'), '0');
  assert.equal(shell.get('height'), '100dvh'); assert.equal(shell.get('min-height'), '0'); assert.equal(shell.get('overflow'), 'hidden');
  assert.equal(shell.get('padding-bottom'), 'var(--matchrim-bottom-nav-height, 88px)');
  const main = declarationsFor('html.matchrim-native-platform .matchrim-native-home-shell > .matchrim-native-home-main');
  assert.equal(main.get('min-height'), '0'); assert.equal(main.get('flex'), '1'); assert.equal(main.get('overflow-y'), 'auto');
  assert.equal(main.get('overscroll-behavior-y'), 'contain');
});
check('No font cap, root text adjustment, transform, zoom or body-wide scroll lock is introduced', () => {
  rules.walkDecls(node => assert.doesNotMatch(node.prop, /font-size|text-size-adjust|transform|zoom/));
  rules.walkRules(rule => assert.doesNotMatch(rule.selector, /(?:^|,)\s*(?:body|#root)(?:\s|$)/));
  assert.doesNotMatch(current, /scrollIntoView|scrollTo\(|visualViewport|addEventListener\(['"]scroll/);
});
check('Wordmark never splits and profile retains physical44px target with noninflated decoration', () => {
  const wordmark = declarationsFor('html.matchrim-native-platform .matchrim-native-home-header > button:first-child span');
  assert.equal(wordmark.get('white-space'), 'nowrap'); assert.equal(wordmark.get('overflow-wrap'), 'normal');
  const target = declarationsFor('html.matchrim-native-platform .matchrim-native-home-header > button:last-child');
  assert.equal(target.get('height'), '44px'); assert.equal(target.get('width'), '44px'); assert.equal(target.get('flex-shrink'), '0');
});
check('Accessible native action rows grow with text instead of clipping or hiding their descriptions', () => {
  const row = declarationsFor('html.matchrim-native-platform.matchrim-accessibility-text .matchrim-native-home-shell .matchrim-native-scan-grid > button');
  assert.equal(row.get('display'), 'grid'); assert.equal(row.get('grid-template-columns'), '36px minmax(0, 1fr)');
  assert.equal(row.get('min-height'), '44px'); assert.equal(row.has('height'), false);
  rules.walkDecls(node => assert.notEqual(node.prop, 'max-height'));
  const grids: postcss.Rule[] = [];
  rules.walkRules(rule => {
    if (rule.selector === 'html.matchrim-native-platform.matchrim-accessibility-text .matchrim-native-home-shell .matchrim-native-scan-grid') grids.push(rule);
  });
  assert.equal(grids.length, 2);
  assert.equal(grids[0].parent?.type, 'root');
  assert.equal(grids[0].nodes.find(node => node.type === 'decl' && node.prop === 'grid-template-columns')?.toString(), 'grid-template-columns: minmax(0, 1fr)');
  assert.equal(grids[1].parent?.type, 'atrule');
  const media = grids[1].parent as postcss.AtRule;
  assert.equal(media.name, 'media');
  assert.equal(media.params, '(orientation: landscape) and (min-width: 700px) and (max-height: 600px)');
  assert.deepEqual(grids[1].nodes.map(node => node.toString()), ['grid-template-columns: repeat(2, minmax(0, 1fr))']);
});
check('Only the aria-hidden absolute card decoration is hidden on native Home, not its functional icons or text', () => {
  const selector = 'html.matchrim-native-platform .matchrim-native-home-shell .matchrim-native-scan-grid > button > svg.absolute[aria-hidden="true"]';
  assert.deepEqual([...declarationsFor(selector)], [['display', 'none']]);
  const cards: ts.JsxElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button'
      && node.children.some(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText() === 'ScanLine')) cards.push(node);
    ts.forEachChild(node, visit);
  };
  visit(next.body);
  assert.equal(cards.length, 1);
  const decoration = cards[0].children.find(child => ts.isJsxSelfClosingElement(child) && child.tagName.getText() === 'ScanLine');
  assert.ok(decoration?.getText().includes('className="absolute '));
  assert.ok(decoration?.getText().includes('aria-hidden="true"'));
  assert.ok(cards[0].getText().includes('Impresa, pizarra o PDF'));
  assert.ok(cards[0].getText().includes('<FileText '));
});
check('Native nav observes padding-aware border-box while every web byte and existing lifecycle remain unchanged', () => {
  const path = 'src/components/MobileBottomNav.tsx';
  const original = execFileSync('git', ['show', `${baseline}:${path}`], { encoding: 'utf8' });
  const actual = readFileSync(path, 'utf8');
  const nativeObserve = "if (isNative) {\n      observer.observe(nav, { box: 'border-box' });\n    } else {\n      observer.observe(nav);\n    }";
  assert.equal(actual.split(nativeObserve).length, 2);
  assert.equal(actual.replace(nativeObserve, 'observer.observe(nav);'), original);
  const tree = ts.createSourceFile(path, actual, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const effects: ts.ArrowFunction[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText() === 'useLayoutEffect' && ts.isArrowFunction(node.arguments[0])) {
      effects.push(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(effects.length, 1);
  const compiled = ts.transpileModule(`(${effects[0].getText()})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  for (const isNative of [false, true]) {
    let height = 81.796875, disconnected = false;
    let resize: (() => void) | undefined, options: ResizeObserverOptions | undefined;
    const values = new Map<string, string>(), classes = new Set<string>();
    const nav = { getBoundingClientRect: () => ({ height }) };
    class Observer {
      constructor(callback: () => void) { resize = callback; }
      observe(target: unknown, opts?: ResizeObserverOptions) { assert.equal(target, nav); options = opts; }
      disconnect() { disconnected = true; }
    }
    const effect = new Script(compiled).runInNewContext({ isNative, navRef: { current: nav }, ResizeObserver: Observer,
      document: { body: { classList: { add: (key: string) => classes.add(key), remove: (key: string) => classes.delete(key) },
        style: { setProperty: (key: string, value: string) => values.set(key, value), removeProperty: (key: string) => values.delete(key) } } },
    }) as () => () => void;
    const cleanup = effect();
    assert.equal(options?.box, isNative ? 'border-box' : undefined);
    assert.equal(values.get('--matchrim-bottom-nav-height'), '81.796875px');
    for (const padding of [34, 21, 0, 34]) {
      height = 81.796875 + padding;
      if (options?.box === 'border-box') resize?.();
      assert.equal(values.get('--matchrim-bottom-nav-height'), `${isNative ? height : 81.796875}px`);
    }
    cleanup();
    assert.equal(disconnected, true); assert.equal(values.size, 0); assert.equal(classes.size, 0);
  }
});
check('Whole web projection detects changed text and navigation callback rather than ignoring them', () => {
  const expected = project(render(old.body));
  for (const [from, to] of [['Tu vino, con contexto', 'Changed copy'], ["navigate('/escanear/etiqueta')", "navigate('/wrong-route')"]]) {
    const mutated = component(current.replace(from, to));
    projectionIntro = mutated.body.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
      .find(node => node.name.getText() === 'homeIntroduction')?.initializer;
    assert.throws(() => assert.deepEqual(project(render(mutated.body)), expected));
    projectionIntro = intro;
  }
});
console.log(JSON.stringify({ passed, failed: 0, baseline,
  nativeInitialScannerLandscapePaddingAmendments: 1,
  scope: 'Actual Home JSX/CSS contracts, exact12-rule nativeAX initial-upload amendment plus one exact initial-only landscape padding rule and native=false parity. No WK AX hitpoint, VoiceOver, browser or simulator acceptance claim.' }));
