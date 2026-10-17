import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { buildNativeRecommendation95 } from '../src/utils/nativeRecommendation95';
import { calculateLocalMatchrimAffinity, buildAffinityInsights } from '../src/utils/wineAffinityExplanation';
import type { WinerimWineWithMatch } from '../src/services/winerimApi';

const profile = { potente: 2, acidez: 4, dulce: 1, tanico: 0, afrutado: 1 };
const opposite = { potente: 5, acidez: 0, dulce: 5, tanico: 5, afrutado: 5 };
const wine: WinerimWineWithMatch = { id: 278688, name: 'Manzanilla La Gitana', winery: 'Bodegas Hidalgo La Gitana',
  originalSheetSource: 'winerim-api', affinityModel: 'scan-local-l2-0to5-v2', matchPercentage: 93,
  tastingAttributes: { scale: 'winerim-0-5', power: 2, acidity: 4, sweetness: 1, tannin: 0, fruity: 1 } };
const checks: string[] = [];
const check = (name: string, action: () => void) => { action(); checks.push(name); console.log('PASS', name); };
globalThis.fetch = async () => { throw new Error('Network forbidden'); };
check('exact current score and original zero', () => {
  const r = buildNativeRecommendation95(wine, profile).result;
  assert.equal(r.state, 'ready'); if (r.state === 'ready') {
    assert.equal(r.score, 93); assert.equal(r.dimensions.find(d => d.key === 'tanico')?.wineValue, 0);
  }
  assert(!JSON.stringify(r).includes('detailVerified'));
});
for (const [key, value] of Object.entries({ originalSheetSource: undefined, id: 'style-range', name: '', winery: '',
  affinityModel: 'confidence-v1', matchPercentage: 92, tastingAttributes: null })) {
  check(`reject unsupported ${key}`, () => assert.equal(buildNativeRecommendation95({ ...wine, [key]: value }, profile).result.state, 'pending'));
}
for (const value of [null, undefined, NaN, Infinity, -1, 5.1, '0']) {
  check(`reject nonexact sensory ${String(value)}`, () => assert.equal(buildNativeRecommendation95({ ...wine,
    tastingAttributes: { ...wine.tastingAttributes!, tannin: value as number } }, profile).result.state, 'pending'));
}
check('missing scale is not assumed', () => assert.equal(buildNativeRecommendation95({ ...wine,
  tastingAttributes: { ...wine.tastingAttributes!, scale: undefined } }, profile).result.state, 'pending'));
check('missing profile and out of range stay pending', () => {
  assert.equal(buildNativeRecommendation95(wine).result.state, 'pending');
  assert.equal(buildNativeRecommendation95(wine, { ...profile, tanico: -1 }).result.state, 'pending');
});
check('changed profile excludes old score', () => assert.equal(buildNativeRecommendation95(wine, opposite).result.state, 'pending'));
check('opposite current score is explained without invented details', () => {
  const score = calculateLocalMatchrimAffinity(opposite, wine.tastingAttributes)!;
  const r = buildNativeRecommendation95({ ...wine, matchPercentage: score }, opposite).result;
  assert.equal(r.state, 'ready'); if (r.state === 'ready') { assert.equal(r.score, 24); assert(r.caution); }
});
check('decimals remain exact', () => {
  const attributes = { ...wine.tastingAttributes!, power: 2.4, tannin: 0.25 };
  const score = calculateLocalMatchrimAffinity(profile, attributes)!;
  const r = buildNativeRecommendation95({ ...wine, tastingAttributes: attributes, matchPercentage: score }, profile).result;
  assert.equal(r.state, 'ready'); if (r.state === 'ready') assert.equal(r.dimensions.find(d => d.key === 'potente')?.wineValue, 2.4);
});
check('no source metadata is synthesized or mutated', () => {
  const before = JSON.stringify(wine); buildNativeRecommendation95(wine, profile); assert.equal(JSON.stringify(wine), before);
  assert.equal(buildNativeRecommendation95({ ...wine, originalSheetSource: undefined }, profile).sourceAvailable, false);
});

type Element = { type: unknown; props: Record<string, unknown>; children: unknown[] };
const element = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Element => ({ type, props: props || {}, children });
const flatten = (tree: unknown): Element[] => Array.isArray(tree) ? tree.flatMap(flatten)
  : tree && typeof tree === 'object' && 'children' in tree ? [tree as Element, ...flatten((tree as Element).children)] : [];
const clean = (x: unknown): unknown => Array.isArray(x) ? x.filter(v => v !== false && v !== null && v !== undefined).map(clean)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v !== 'function').map(([k, v]) => [k, clean(v)])) : x;
const root = new URL('../', import.meta.url);
function mount(file: string, source: string, native: boolean) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const stripped = ast.statements.filter(n => !ts.isImportDeclaration(n) && !ts.isExportAssignment(n)).map(n => n.getText(ast)).join('\n')
    .replace(/import\.meta\.env\.[A-Z_]+/g, 'false');
  const slots: unknown[] = []; let cursor = 0, owner: string | null = 'owner-a', effects: (() => void)[] = [];
  const icons = ['ArrowUpRight','BrainCircuit','Camera','ChevronRight','Compass','FileText','History','Layers3','LoaderCircle','ScanLine','Sparkles','UserRound','Wine','X','TrendingUp','ExternalLink'];
  const deps: Record<string, unknown> = Object.fromEntries(icons.map(k => [k, k]));
  const sandbox = vm.createContext({ ...deps, React: { createElement: element }, exports: {},
    useState: (initial: unknown) => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (v: unknown) => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useLayoutEffect: (effect: () => void, next: unknown[]) => { const i = cursor++; const old = slots[i] as unknown[] | undefined;
      if (!old || old.some((v, n) => v !== next[n])) { slots[i] = next; effects.push(effect); } },
    Capacitor: { isNativePlatform: () => native }, useNavigate: () => () => {}, useAuth: () => ({ user: owner ? { id: owner } : null }),
    getScanHistory: () => [], SCAN_HISTORY_UPDATED_EVENT: 'history', heroWine: 'hero.jpg',
    buildAuthRedirectPath: (v: string) => v, buildNativeRecommendation95, buildAffinityInsights,
    getWinerimPriceDisplay: () => null, formatWineType: (v: string) => v, formatCountryName: (v: string) => v,
    buildWinerimWineUrl: () => 'https://web.winerim.com/the-library/wines/278688/Manzanilla-La-Gitana',
    NativeAffinitySummary: 'NativeAffinitySummary', WineCard: 'WineCard', AppNav: 'AppNav', Button: 'Button', Card: 'Card', CardContent: 'CardContent',
    AiRimMark: 'AiRimMark', MatchrimQuickGuide: 'MatchrimQuickGuide', MobileBottomNav: 'MobileBottomNav',
    DialogPrimitive: Object.fromEntries(['Root','Portal','Overlay','Content','Title','Close','Description'].map(k => [k, 'Dialog'+k])),
    window: { addEventListener() {}, removeEventListener() {}, open() { throw new Error('Unexpected external open'); } },
  });
  const name = file.includes('NativeAppHome') ? 'NativeAppHome' : 'WineCard';
  vm.runInContext(ts.transpileModule(stripped + `\nglobalThis.component95 = ${name};`, { compilerOptions: {
    jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  const render = (props: Record<string, unknown>) => { cursor = 0; effects = []; return sandbox.component95(props); };
  return { render, flush: () => effects.forEach(e => e()), owner: (v: string | null) => { owner = v; } };
}
const files = ['src/components/WineCard.tsx', 'src/components/NativeAppHome.tsx'];
for (const file of files) check(`web full render equals c25b282: ${file}`, () => {
  const before = execFileSync('git', ['show', `c25b282:${file}`], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  const current = readFileSync(new URL(file, root), 'utf8');
  for (const p of [null, profile, opposite]) {
    const props = { wine: { ...wine, affinityModel: 'confidence-v1', rawMatchPercentage: 99, affinityConfidence: 80 }, index: 1, profile: p,
      hasQuizResults: true, matchrimCode: 'test', recommendations: [wine], activeProfile: p };
    assert.equal(JSON.stringify(clean(mount(file, current, false).render(props))), JSON.stringify(clean(mount(file, before, false).render(props))));
  }
});
check('actual native WineCard returns one shared answer before source action', () => {
  const source = readFileSync(new URL(files[0], root), 'utf8');
  const tree = mount(files[0], source, true).render({ wine, index: 0, profile });
  const nodes = flatten(tree), summary = nodes.findIndex(n => n.type === 'NativeAffinitySummary'), button = nodes.findIndex(n => n.type === 'Button');
  assert.equal(nodes.filter(n => n.type === 'NativeAffinitySummary').length, 1); assert(summary < button);
  assert.equal((nodes[summary].props.result as { state: string }).state, 'ready');
  assert(!JSON.stringify(tree).includes('Score sensorial')); assert(!JSON.stringify(tree).includes('confianza'));
});
check('actual native Home selection is internal and owner/profile changes clear it', () => {
  const m = mount(files[1], readFileSync(new URL(files[1], root), 'utf8'), true);
  const props = { hasQuizResults: true, matchrimCode: 'test', recommendations: [wine], activeProfile: profile };
  m.render(props); m.flush(); let tree = m.render(props);
  const choose = flatten(tree).find(n => String(n.props['aria-label']).startsWith('Ver por qué'))!;
  assert.match(String(choose.props['aria-label']), /93 de 100/); assert(!String(choose.props['aria-label']).includes('%'));
  (choose.props.onClick as () => void)(); tree = m.render(props);
  assert.equal(flatten(tree).find(n => n.type === 'DialogRoot')?.props.open, true);
  m.owner('owner-b'); tree = m.render(props);
  assert.equal(flatten(tree).find(n => n.type === 'DialogRoot')?.props.open, false); m.flush();
  m.owner('owner-a'); m.render(props); m.flush(); tree = m.render(props);
  (flatten(tree).find(n => String(n.props['aria-label']).startsWith('Ver por qué'))!.props.onClick as () => void)();
  m.render({ ...props, activeProfile: opposite }); m.flush();
  tree = m.render({ ...props, activeProfile: opposite });
  assert.equal(flatten(tree).find(n => n.type === 'DialogRoot')?.props.open, false);
});
const indexSource = readFileSync(new URL('src/pages/Index.tsx', root), 'utf8');
const indexAst = ts.createSourceFile('Index.tsx', indexSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const expressions: Record<string, string> = {};
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(indexAst) === 'NativeAppHome') {
    for (const attribute of node.attributes.properties) if (ts.isJsxAttribute(attribute) && attribute.initializer
      && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      expressions[attribute.name.getText(indexAst)] = attribute.initializer.expression.getText(indexAst);
    }
  }
  ts.forEachChild(node, visit);
}
visit(indexAst);
for (const [name, owner, saved, loading, expected] of [
  ['ready owner', 'a', 'a', false, true], ['owner changed before effects', 'b', 'a', false, false],
  ['owner load pending', 'a', null, true, false], ['anonymous settled', null, 'anonymous', false, true],
] as const) check(`actual Index expressions: ${name}`, () => {
  const context = { Capacitor: { isNativePlatform: () => true }, user: owner ? { id: owner } : null,
    authLoading: false, loadingHomeProfile: loading, savedWineOwnerId: saved, activeProfile: profile, recommendations: [wine] };
  assert.equal(Boolean(vm.runInNewContext(expressions.activeProfile, context)), expected);
  assert.equal(vm.runInNewContext(expressions.recommendations, context).length > 0, expected);
});
check('Index web recommendation expression remains exact legacy value', () => {
  const list = [wine], context = { Capacitor: { isNativePlatform: () => false }, recommendations: list };
  assert.equal(vm.runInNewContext(expressions.recommendations, context), list);
});
function wineCardProfileExpression(file: string) {
  const ast = ts.createSourceFile(file, readFileSync(new URL(file, root), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const calls: ts.JsxSelfClosingElement[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'WineCard') calls.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.equal(calls.length, 1, `${file}: exactly one actual WineCard callsite`);
  const attribute = calls[0].attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(ast) === 'profile');
  assert(attribute && ts.isJsxAttribute(attribute) && attribute.initializer && ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression, `${file}: actual profile expression required`);
  return attribute.initializer.expression.getText(ast);
}
const useProfileExpression = wineCardProfileExpression('src/pages/UseMatchrim.tsx');
const projectUseProfile = (native: boolean, active: typeof profile | null) => vm.runInNewContext(useProfileExpression,
  { Capacitor: { isNativePlatform: () => native }, profile: active });
const renderUseCard = (active: typeof profile | null, currentWine = wine, native = true) => {
  const props = { wine: currentWine, index: 0, profile: projectUseProfile(native, active) };
  return mount(files[0], readFileSync(new URL(files[0], root), 'utf8'), native).render(props);
};
check('UseMatchrim actual AST passes only native current profile', () => {
  assert.equal(useProfileExpression, 'Capacitor.isNativePlatform() ? profile : undefined');
  assert.equal(projectUseProfile(true, profile), profile);
});
check('UseMatchrim actual prop and native card ready for current profile', () => {
  const summary = flatten(renderUseCard(profile)).find(n => n.type === 'NativeAffinitySummary')!;
  assert.equal((summary.props.result as { state: string }).state, 'ready');
  assert.equal((summary.props.result as { score: number }).score, 93);
});
check('UseMatchrim learned decimal profile is passed exactly without projection', () => {
  const learned = { ...profile, potente: 2.4, acidez: 4.2 };
  assert.equal(projectUseProfile(true, learned), learned);
  const score = calculateLocalMatchrimAffinity(learned, wine.tastingAttributes)!;
  const summary = flatten(renderUseCard(learned, { ...wine, matchPercentage: score })).find(n => n.type === 'NativeAffinitySummary')!;
  const result = summary.props.result as { state: string; score: number; dimensions: { key: string; profileValue: number }[] };
  assert.equal(result.state, 'ready'); assert.equal(result.score, score);
  assert.equal(result.dimensions.find(d => d.key === 'potente')?.profileValue, 2.4);
});
check('UseMatchrim current profile with stale wine score remains pending', () => {
  const summary = flatten(renderUseCard(opposite)).find(n => n.type === 'NativeAffinitySummary')!;
  assert.equal((summary.props.result as { state: string; reason: string }).state, 'pending');
  assert.equal((summary.props.result as { reason: string }).reason, 'score');
});
check('UseMatchrim missing profile remains honestly pending', () => {
  assert.equal(projectUseProfile(true, null), null);
  const summary = flatten(renderUseCard(null)).find(n => n.type === 'NativeAffinitySummary')!;
  assert.equal((summary.props.result as { state: string; reason: string }).state, 'pending');
  assert.equal((summary.props.result as { reason: string }).reason, 'profile');
});
check('UseMatchrim web profile prop is undefined and legacy card output unchanged', () => {
  for (const p of [null, profile, opposite]) {
    assert.equal(projectUseProfile(false, p), undefined);
    const before = execFileSync('git', ['show', `c25b282:${files[0]}`], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
    assert.equal(JSON.stringify(clean(renderUseCard(p, wine, false))), JSON.stringify(clean(mount(files[0], before, false)
      .render({ wine, index: 0 }))));
  }
});
check('Profile actual WineCard already uses exact activeDisplayProfile', () => {
  assert.equal(wineCardProfileExpression('src/pages/Profile.tsx'), 'activeDisplayProfile');
});
function actualRecommendationRow(source: string) {
  const ast = ts.createSourceFile('UseMatchrim.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rows: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === 'WineCard') {
      assert(ts.isJsxElement(node.parent)); rows.push(node.parent.getText(ast));
    }
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(rows.length, 1); return rows[0];
}
const useCurrentSource = readFileSync(new URL('src/pages/UseMatchrim.tsx', root), 'utf8');
const useBeforeSource = execFileSync('git', ['show', 'c25b282:src/pages/UseMatchrim.tsx'], { cwd: root, encoding: 'utf8' });
function renderActualRecommendationRow(source: string, native: boolean, saved = false, saving = false) {
  let reasonCalls = 0, saveCalls = 0;
  const cardSource = readFileSync(new URL(files[0], root), 'utf8');
  const actualCard = (props: Record<string, unknown>) => mount(files[0], cardSource, native).render(props);
  const sandbox = vm.createContext({ React: { createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) =>
    type === actualCard ? actualCard(props || {}) : element(type, props, ...children) },
    WineCard: actualCard, Capacitor: { isNativePlatform: () => native }, profile, wine, index: 0,
    Button: 'Button', Sparkles: 'Sparkles', CheckCircle: 'CheckCircle', Loader2: 'Loader2', BookmarkPlus: 'BookmarkPlus',
    isSaved: saved, savingWineId: saving ? wine.id : null,
    getWinerimFitReason: () => { reasonCalls++; return 'LEGACY_RAW_REASON 93% score sensorial'; },
    saveWinerimWineToMyWines: (value: WinerimWineWithMatch) => { assert.equal(value, wine); saveCalls++; },
  });
  vm.runInContext(ts.transpileModule('globalThis.tree95 = (' + actualRecommendationRow(source) + ');', {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, sandbox);
  return { tree: sandbox.tree95, reasonCalls, saves: () => saveCalls };
}
check('UseMatchrim actual native row has one affinity summary and no post-card raw reason', () => {
  const result = renderActualRecommendationRow(useCurrentSource, true);
  assert.equal(flatten(result.tree).filter(n => n.type === 'NativeAffinitySummary').length, 1);
  assert.equal(result.reasonCalls, 0); assert(!JSON.stringify(result.tree).includes('LEGACY_RAW_REASON'));
});
check('UseMatchrim actual web recommendation row preserves c25b282 markup', () => {
  for (const [saved, saving] of [[false, false], [true, false], [false, true]]) {
    const current = renderActualRecommendationRow(useCurrentSource, false, saved, saving);
    const before = renderActualRecommendationRow(useBeforeSource, false, saved, saving);
    assert.equal(current.reasonCalls, 1); assert.equal(before.reasonCalls, 1);
    assert.equal(JSON.stringify(clean(current.tree)), JSON.stringify(clean(before.tree)));
  }
});
check('UseMatchrim native save action and saved/saving states remain intact', () => {
  const row = renderActualRecommendationRow(useCurrentSource, true);
  const button = flatten(row.tree).find(n => n.type === 'Button' && n.children.includes('Guardar en Quiero Probar'))!;
  assert(button); assert.equal(button.props.disabled, false); (button.props.onClick as () => void)(); assert.equal(row.saves(), 1);
  for (const [saved, saving] of [[true, false], [false, true]]) {
    const state = renderActualRecommendationRow(useCurrentSource, true, saved, saving);
    const action = flatten(state.tree).find(n => n.type === 'Button' && n.children.some(c => typeof c === 'string' && c.includes('Quiero Probar')))!;
    assert.equal(action.props.disabled, true);
  }
});
const output = process.argv.find(v => v.startsWith('--output='))?.slice(9);
if (output) { mkdirSync(output, { recursive: true }); writeFileSync(output + '/unit-report.json', JSON.stringify({
  checksPassed: checks.length, checksTotal: checks.length, checks, realNetworkCalls: 0,
  sourceHashes: Object.fromEntries([...files, 'src/pages/Index.tsx', 'src/pages/UseMatchrim.tsx', 'src/utils/nativeRecommendation95.ts'].map(f => [f,
    createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex')])),
}, null, 2) + '\n', { flag: 'wx' }); }
console.log(`${checks.length}/${checks.length} PASS`);
