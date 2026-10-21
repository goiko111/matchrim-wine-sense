import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import { buildNativeRecommendation95 } from '../src/utils/nativeRecommendation95';
import { calculateLocalMatchrimAffinity, buildAffinityInsights } from '../src/utils/wineAffinityExplanation';
import { createNativeWineDraft98 } from '../src/utils/nativeWineDraft98';
import type { WinerimWineWithMatch } from '../src/services/winerimApi';

// Redesign98 changes the native surface, not the evidence contract. Exercise the
// actual NativeAppHome -> NativeHome98 -> WineCard composition below; leaf UI is
// inert (no image resolution, search, sheet lookup or persistence). Keep the 95
// identity/score/owner checks and complete c25b282 nonnative comparisons intact.
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
const fragment = Symbol('React.Fragment');
const element = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Element => ({ type, props: props || {}, children });
const flatten = (tree: unknown): Element[] => Array.isArray(tree) ? tree.flatMap(flatten)
  : tree && typeof tree === 'object' && 'children' in tree ? [tree as Element, ...flatten((tree as Element).children)] : [];
const renderedChildren = (x: unknown): unknown[] => Array.isArray(x) ? x.flatMap(renderedChildren)
  : x === null || x === undefined || typeof x === 'boolean' ? []
    : x && typeof x === 'object' && 'type' in x && (x as Element).type === fragment
      ? renderedChildren((x as Element).children) : [clean(x)];
const clean = (x: unknown): unknown => Array.isArray(x) ? x.filter(v => v !== false && v !== null && v !== undefined).map(clean)
  : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).filter(([, v]) => typeof v !== 'function')
    .map(([k, v]) => [k, k === 'children' ? renderedChildren(v) : clean(v)])) : x;
// React fragments and nested child arrays do not create DOM nodes. Real element
// boundaries, text and attributes must still fail the complete render comparison.
const span = element('span', { 'aria-label': 'same' }, 'same');
assert.deepEqual(clean(element('div', null, element(fragment, null, span))), clean(element('div', null, span)));
for (const changed of [element('b', { 'aria-label': 'same' }, 'same'),
  element('span', { 'aria-label': 'changed' }, 'same'), element('span', { 'aria-label': 'same' }, 'changed')]) {
  assert.notDeepEqual(clean(element('div', null, element(fragment, null, changed))), clean(element('div', null, span)));
}
const root = new URL('../', import.meta.url);
const files = ['src/components/WineCard.tsx', 'src/components/NativeAppHome.tsx'];
const nativeHomeFile = 'src/components/NativeHome98.tsx';
function mount(file: string, source: string, native: boolean) {
  type Hooks = { slots: unknown[]; cursor: number; key?: unknown };
  type Component = (props: Record<string, unknown>) => unknown;
  const rootHooks: Hooks = { slots: [], cursor: 0 };
  let hooks = rootHooks, owner: string | null = 'owner-a', effects: (() => void)[] = [];
  // Expanded components own their hooks; NativeHome98 remounts on owner-key changes.
  const childHooks = new Map<Component, Hooks>();
  const expand = (component: Component, props: Record<string, unknown>) => {
    let child = childHooks.get(component);
    if (!child || child.key !== props.key) {
      child = { slots: [], cursor: 0, key: props.key }; childHooks.set(component, child);
    }
    const parent = hooks; hooks = child; child.cursor = 0;
    try { return component(props); } finally { hooks = parent; }
  };
  const icons = ['ArrowRight','Search','ArrowUpRight','BrainCircuit','Camera','ChevronRight','Compass','FileText','History','Layers3','LoaderCircle','ScanLine','Sparkles','UserRound','Wine','X','TrendingUp','ExternalLink'];
  const deps: Record<string, unknown> = Object.fromEntries(icons.map(k => [k, k]));
  const dialog = Object.fromEntries(['Root','Portal','Overlay','Content','Title','Close','Description'].map(k => [k, 'Dialog'+k]));
  const sandbox = vm.createContext({ ...deps, React: { createElement: element, Fragment: fragment }, exports: {},
    useState: (initial: unknown) => { const { slots } = hooks, i = hooks.cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (v: unknown) => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useLayoutEffect: (effect: () => void, next: unknown[]) => { const { slots } = hooks, i = hooks.cursor++;
      const old = slots[i] as unknown[] | undefined;
      if (!old || old.length !== next.length || old.some((v, n) => !Object.is(v, next[n]))) { slots[i] = next; effects.push(effect); } },
    Capacitor: { isNativePlatform: () => native }, useNavigate: () => () => {}, useAuth: () => ({ user: owner ? { id: owner } : null }),
    getScanHistory: () => [], SCAN_HISTORY_UPDATED_EVENT: 'history', heroWine: 'hero.jpg',
    buildAuthRedirectPath: (v: string) => v, buildNativeRecommendation95, buildAffinityInsights, createNativeWineDraft98,
    getWinerimPriceDisplay: () => null, formatWineType: (v: string) => v, formatCountryName: (v: string) => v,
    buildWinerimWineUrl: () => 'https://web.winerim.com/the-library/wines/278688/Manzanilla-La-Gitana',
    NativeAffinitySummary: 'NativeAffinitySummary', WineCard: 'WineCard', AppNav: 'AppNav', Button: 'Button', Card: 'Card', CardContent: 'CardContent',
    NativeWinePhoto98: 'NativeWinePhoto98', NativeWineSearch97: 'NativeWineSearch97',
    NativeWineSave98: 'NativeWineSave98', WinerimSheetLookup: 'WinerimSheetLookup',
    AiRimMark: 'AiRimMark', MatchrimQuickGuide: 'MatchrimQuickGuide', MobileBottomNav: 'MobileBottomNav',
    DialogPrimitive: dialog, Dialog: dialog,
    window: { addEventListener() {}, removeEventListener() {}, open() { throw new Error('Unexpected external open'); } },
  });
  const compile = (path: string, text: string, name: string) => {
    const ast = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const stripped = ast.statements.filter(n => !ts.isImportDeclaration(n) && !ts.isExportAssignment(n)).map(n => n.getText(ast)).join('\n')
      .replace(/import\.meta\.env\.[A-Z_]+/g, 'false');
    const compiled = ts.transpileModule(stripped + `\nglobalThis.${name} = ${name};`, { compilerOptions: {
      jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    vm.runInContext(`(() => {\n${compiled}\n})();`, sandbox, { filename: path });
  };
  const name = file.includes('NativeAppHome') ? 'NativeAppHome' : 'WineCard';
  if (native && name === 'NativeAppHome') {
    compile(nativeHomeFile, readFileSync(new URL(nativeHomeFile, root), 'utf8'), 'NativeHome98');
    compile(files[0], readFileSync(new URL(files[0], root), 'utf8'), 'WineCard');
    sandbox.React.createElement = (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]) =>
      type === sandbox.NativeHome98 || type === sandbox.WineCard
        ? expand(type as Component, props || {}) : element(type, props, ...children);
  }
  compile(file, source, name);
  const render = (props: Record<string, unknown>) => { hooks = rootHooks; hooks.cursor = 0; effects = []; return sandbox[name](props); };
  return { render, flush: () => { const pending = effects; effects = []; pending.forEach(e => e()); },
    owner: (v: string | null) => { owner = v; } };
}
for (const file of files) check(`web full render equals c25b282: ${file}`, () => {
  const before = execFileSync('git', ['show', `c25b282:${file}`], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  const current = readFileSync(new URL(file, root), 'utf8');
  for (const p of [null, profile, opposite]) {
    const props = { wine: { ...wine, affinityModel: 'confidence-v1', rawMatchPercentage: 99, affinityConfidence: 80 }, index: 1, profile: p,
      hasQuizResults: true, matchrimCode: 'test', recommendations: [wine], activeProfile: p };
    assert.equal(JSON.stringify(clean(mount(file, current, false).render(props))), JSON.stringify(clean(mount(file, before, false).render(props))));
  }
});
const boundWine: WinerimWineWithMatch = { ...wine, photo: 'https://example.invalid/raw-bottle.jpg',
  vintage: '2022', region: 'Sanlúcar de Barrameda', country: 'España' };
const onlyNode = (tree: unknown, type: string) => {
  const nodes = flatten(tree).filter(n => n.type === type);
  assert.equal(nodes.length, 1, `exactly one ${type}`); return nodes[0];
};
function assertNativeCard(tree: unknown, rawWine: WinerimWineWithMatch, active: typeof profile | null = profile) {
  const cards = flatten(tree).filter(n => n.props['data-testid'] === 'native-recommendation-card');
  assert.equal(cards.length, 1, 'actual native WineCard is expanded');
  const card = cards[0], nodes = flatten(card), photo = onlyNode(card, 'NativeWinePhoto98');
  const summary = onlyNode(card, 'NativeAffinitySummary'), save = onlyNode(card, 'NativeWineSave98');
  assert.equal(photo.props.src, rawWine.photo); assert.equal(photo.props.name, rawWine.name);
  assert.deepEqual(clean(photo.props.identity), { name: rawWine.name, producer: rawWine.winery, vintage: rawWine.vintage });
  assert.equal(photo.props.resolveMissing, true); assert.equal(save.props.wine, rawWine);
  const evidence = buildNativeRecommendation95(rawWine, active);
  assert.deepEqual(clean(summary.props.result), clean(evidence.result));
  assert(nodes.indexOf(photo) < nodes.indexOf(summary)); assert(nodes.indexOf(summary) < nodes.indexOf(save));
  const lookups = nodes.filter(n => n.type === 'WinerimSheetLookup');
  assert.equal(lookups.length, evidence.sourceAvailable ? 1 : 0);
  if (evidence.sourceAvailable) {
    assert(nodes.indexOf(summary) < nodes.indexOf(lookups[0]), 'one shared answer precedes the unverified source lookup');
    assert(nodes.indexOf(lookups[0]) < nodes.indexOf(save));
    assert.deepEqual(clean(lookups[0].props.identity), { name: rawWine.name, producer: rawWine.winery,
      vintage: rawWine.vintage, region: rawWine.region, country: rawWine.country });
  }
  assert(!nodes.some(n => n.type === 'Button' || n.type === 'ExternalLink' || n.type === 'WinerimOriginalSheet'));
  assert(!JSON.stringify(card).includes('detailVerified'));
  assert(!JSON.stringify(card).includes('Score sensorial')); assert(!JSON.stringify(card).includes('confianza'));
  return summary.props.result as ReturnType<typeof buildNativeRecommendation95>['result'];
}
check('actual native WineCard binds raw photo/save and one shared answer before source lookup', () => {
  const before = JSON.stringify(boundWine);
  const tree = mount(files[0], readFileSync(new URL(files[0], root), 'utf8'), true).render({ wine: boundWine, index: 0, profile });
  const result = assertNativeCard(tree, boundWine);
  assert.equal(result.state, 'ready');
  if (result.state === 'ready') {
    assert.equal(result.score, 93); assert.equal(result.dimensions.find(d => d.key === 'tanico')?.wineValue, 0);
  }
  assert.equal(JSON.stringify(boundWine), before);
});
for (const [key, value] of Object.entries({ originalSheetSource: undefined, id: 'style-range', name: '', winery: '' })) {
  check(`actual native WineCard with unsupported ${key} has no source lookup`, () => {
    const rawWine = { ...boundWine, [key]: value };
    const tree = mount(files[0], readFileSync(new URL(files[0], root), 'utf8'), true).render({ wine: rawWine, index: 0, profile });
    const result = assertNativeCard(tree, rawWine);
    assert.equal(result.state, 'pending'); if (result.state === 'pending') assert.equal(result.reason, 'identity');
  });
}
check('actual native WineCard does not synthesize a missing photo', () => {
  const tree = mount(files[0], readFileSync(new URL(files[0], root), 'utf8'), true).render({ wine, index: 0, profile });
  assertNativeCard(tree, wine); assert.equal(onlyNode(tree, 'NativeWinePhoto98').props.src, undefined);
});
for (const [reason, rawWine, active] of [
  ['score', boundWine, opposite], ['profile', boundWine, null],
  ['sensory', { ...boundWine, tastingAttributes: null }, profile],
] as const) check(`actual native WineCard keeps ${reason} pending without losing bound source identity`, () => {
  const tree = mount(files[0], readFileSync(new URL(files[0], root), 'utf8'), true).render({ wine: rawWine, index: 0, profile: active });
  const result = assertNativeCard(tree, rawWine, active);
  assert.equal(result.state, 'pending'); if (result.state === 'pending') assert.equal(result.reason, reason);
});
function homeDetailDialog(tree: unknown) {
  const dialogs = flatten(tree).filter(n => n.type === 'DialogRoot' && flatten(n).some(child =>
    child.type === 'DialogContent' && child.props['aria-describedby'] === 'home-wine98-description'));
  assert.equal(dialogs.length, 1, 'recommendation dialog is distinct from the NativeHome98 search dialog');
  return dialogs[0];
}
function chooseHomeWine(tree: unknown, score: number | null = 93) {
  assert.equal(flatten(tree).filter(n => n.props['data-testid'] === 'native-home98').length, 1, 'actual NativeHome98 rendered');
  const choices = flatten(tree).filter(n => String(n.props['aria-label']).startsWith('Ver por qué'));
  assert.equal(choices.length, 1); const choose = choices[0];
  assert.equal(onlyNode(choose, 'NativeWinePhoto98').props.src, boundWine.photo);
  assert.equal(onlyNode(choose, 'NativeWinePhoto98').props.name, boundWine.name);
  assert.match(String(choose.props['aria-label']), score === null ? /Afinidad pendiente/ : new RegExp(`${score} de 100`));
  assert(!String(choose.props['aria-label']).includes('%'));
  (choose.props.onClick as () => void)();
}
check('actual NativeHome98 selection opens internal detail and owner/profile changes clear it', () => {
  const m = mount(files[1], readFileSync(new URL(files[1], root), 'utf8'), true);
  const props = { hasQuizResults: true, matchrimCode: 'test', recommendations: [boundWine], activeProfile: profile };
  m.render(props); m.flush(); let tree = m.render(props);
  assert.equal(flatten(tree).filter(n => n.type === 'DialogRoot').length, 2);
  assert.equal(homeDetailDialog(tree).props.open, false);
  assert.equal(flatten(tree).filter(n => n.type === 'NativeAffinitySummary').length, 0);
  chooseHomeWine(tree); tree = m.render(props);
  assert.equal(homeDetailDialog(tree).props.open, true); assertNativeCard(homeDetailDialog(tree), boundWine);
  assert.equal(flatten(tree).filter(n => n.type === 'NativeAffinitySummary').length, 1);
  assert.equal(flatten(tree).filter(n => n.type === 'DialogRoot' && n.props.open === true).length, 1);
  m.owner('owner-b'); tree = m.render(props);
  assert.equal(homeDetailDialog(tree).props.open, false, 'owner guard acts before layout effects');
  assert.equal(flatten(homeDetailDialog(tree)).filter(n => n.type === 'NativeAffinitySummary').length, 0); m.flush();
  m.owner('owner-a'); m.render(props); m.flush(); tree = m.render(props);
  assert.equal(homeDetailDialog(tree).props.open, false, 'returning owner cannot resurrect selection');
  chooseHomeWine(tree); tree = m.render(props); assert.equal(homeDetailDialog(tree).props.open, true);
  const changed = { ...props, activeProfile: opposite };
  m.render(changed); m.flush(); tree = m.render(changed);
  assert.equal(homeDetailDialog(tree).props.open, false);
  chooseHomeWine(tree, null); tree = m.render(changed);
  assert.equal(homeDetailDialog(tree).props.open, true); assertNativeCard(homeDetailDialog(tree), boundWine, opposite);
  (homeDetailDialog(tree).props.onOpenChange as (open: boolean) => void)(false);
  tree = m.render(changed); assert.equal(homeDetailDialog(tree).props.open, false);
  chooseHomeWine(tree, null); tree = m.render(changed); assert.equal(homeDetailDialog(tree).props.open, true);
  m.owner(null); tree = m.render(changed);
  assert.equal(homeDetailDialog(tree).props.open, false, 'logout hides the selected owner wine before effects');
  assert.equal(flatten(homeDetailDialog(tree)).filter(n => n.type === 'NativeAffinitySummary').length, 0); m.flush();
});
check('actual NativeHome98 replacement recommendations cannot retain an old bound selection', () => {
  const m = mount(files[1], readFileSync(new URL(files[1], root), 'utf8'), true);
  const props = { hasQuizResults: true, matchrimCode: 'test', recommendations: [boundWine], activeProfile: profile };
  m.render(props); m.flush(); chooseHomeWine(m.render(props));
  assert.equal(homeDetailDialog(m.render(props)).props.open, true);
  const replacement = { ...props, recommendations: [{ ...boundWine }] };
  let tree = m.render(replacement);
  assert.equal(homeDetailDialog(tree).props.open, false, 'matching IDs do not replace the selected raw object'); m.flush();
  tree = m.render(props); assert.equal(homeDetailDialog(tree).props.open, false); m.flush();
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
  scope: { execution: 'offline utility, AST and VM checks; no browser or device validation', webBaseline: 'c25b282',
    nativeComponents: ['NativeAppHome', 'NativeHome98', 'WineCard'],
    mockedNativeLeaves: ['NativeAffinitySummary', 'NativeWinePhoto98', 'NativeWineSearch97', 'WinerimSheetLookup', 'NativeWineSave98'],
    excluded: 'Image resolution, catalogue search, sheet verification and persistence are not executed.' },
  sourceHashes: Object.fromEntries([...files, nativeHomeFile, 'src/pages/Index.tsx', 'src/pages/UseMatchrim.tsx',
    'src/utils/nativeRecommendation95.ts', 'src/utils/nativeWineDraft98.ts'].map(f => [f,
    createHash('sha256').update(readFileSync(new URL(f, root))).digest('hex')])),
}, null, 2) + '\n', { flag: 'wx' }); }
console.log(`${checks.length}/${checks.length} PASS`);
