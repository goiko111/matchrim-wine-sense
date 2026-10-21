/* eslint-disable @typescript-eslint/no-explicit-any -- Offline JSX/hook fixture; remote modules fail closed. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import tailwindConfig from '../tailwind.config';
import { restoreNativeScan99, restoreNativeScan99Guard } from './native-scan99-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const revision = 'd7d81e18e5219b1aedcca641f71ae4d46980faf8';
const pagePath = 'src/pages/Scan.tsx';
const hubPath = 'src/components/NativeScanHub99.tsx';
const read = (path: string) => readFileSync(new URL(path, `file://${root}`), 'utf8');
const baselineCache = new Map<string, string>(), compiledCache = new Map<string, string>();
const prior = (path: string) => {
  if (!baselineCache.has(path)) baselineCache.set(path, execFileSync('git', ['show', `${revision}:${path}`], { cwd: root, encoding: 'utf8' }));
  return baselineCache.get(path)!;
};
const page = read(pagePath), hub = read(hubPath);
const parse = (path: string, source: string) => ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const walk = (node: ts.Node, visit: (node: ts.Node) => void) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
const nodes = (tree: any): any[] => Array.isArray(tree) ? tree.flatMap(nodes)
  : tree && typeof tree === 'object' && 'type' in tree ? [tree, ...nodes(tree.props.children)] : [];
const text = (tree: any): string => Array.isArray(tree) ? tree.map(text).join('')
  : tree == null || typeof tree === 'boolean' ? '' : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const shape = (tree: any): any => typeof tree === 'function' ? '[callback]'
  : Array.isArray(tree) ? Array.from(tree, shape) : tree && typeof tree === 'object'
    ? Object.fromEntries(Object.entries(tree).filter(([, v]) => v !== undefined).map(([k, v]) => [k, shape(v)])) : tree;
const byTestId = (tree: any, id: string) => {
  const found = nodes(tree).find(node => node.props['data-testid'] === id);
  assert.ok(found, id); return found;
};

function fixture({ native = true, mode, query = '', owner = 'qa-owner', historical = false, consent = false }:
  { native?: boolean; mode?: string; query?: string; owner?: string | null; historical?: boolean; consent?: boolean } = {}) {
  const state: any[] = [], effects: any[] = [], listeners = new Map<string, Set<() => void>>();
  const storage = new Map<string, string>([['matchrim.local_profile_owner.v1', owner || 'anonymous']]);
  const navigation: any[] = [], events: any[] = [], remote: string[] = [];
  const navigate = (...args: any[]) => navigation.push(args);
  const location = { pathname: mode ? `/escanear/${mode}` : '/escanear', search: query ? `?${query}` : '' };
  let cursor = 0, dirty = false, tree: any, render: () => any;
  const blocked = (name: string): never => { remote.push(name); throw new Error(`Unexpected remote boundary: ${name}`); };
  const localStorage = { getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) };
  const window = { localStorage, scrollTo() {},
    addEventListener(name: string, callback: () => void) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(callback); },
    removeEventListener(name: string, callback: () => void) { listeners.get(name)?.delete(callback); },
    dispatchEvent(event: { type: string }) { listeners.get(event.type)?.forEach(callback => callback()); } };
  const jsx = (type: any, props: any) => typeof type === 'function' ? type(props) : ({ type, props });
  const effect = (run: () => void, deps?: any[]) => {
    const index = cursor++, previous = state[index];
    if (!previous || !deps || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) {
      effects.push(() => { previous?.cleanup?.(); state[index] = { deps, cleanup: run() }; });
    }
  };
  const react = { useEffect: effect, useLayoutEffect: effect,
    useRef(value: any) { const index = cursor++; return state[index] ??= { current: value }; },
    useState(initial: any) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], (next: any) => { const value = typeof next === 'function' ? next(state[index]) : next;
        if (!Object.is(value, state[index])) { state[index] = value; dirty = true; } }];
    } };
  const icons = new Proxy({}, { get: (_, name) => `lucide:${String(name)}` });
  const modules: Record<string, any> = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'lucide-react': icons,
    '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
    'react-router-dom': { useNavigate: () => navigate, useLocation: () => location,
      useParams: () => ({ mode }), useSearchParams: () => [new URLSearchParams(query)], Navigate: 'Navigate', Link: 'Link' },
    '@/contexts/AuthContext': { useAuth: () => ({ user: owner ? { id: owner } : null }) },
    '@/components/AppNav': { default: 'AppNav' }, '@/components/MobileBottomNav': { default: 'MobileBottomNav' },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/checkbox': { Checkbox: 'Checkbox' },
    '@/integrations/supabase/client': { supabase: new Proxy({}, { get: () => blocked('supabase') }) },
    '@/lib/analytics': { trackAppEvent: (...args: any[]) => events.push(args) },
    '@/utils/navigation': { buildAuthRedirectPath: () => blocked('auth-save') },
    '@/utils/labelScanSave': new Proxy({}, { get: () => () => blocked('label-save') }),
    sonner: { toast: new Proxy({}, { get: () => () => blocked('toast') }) },
  };
  const load = (path: string, source = read(path)) => {
    const exports = {};
    if (!compiledCache.has(source)) {
      const compiled = ts.transpileModule(source, { fileName: path, reportDiagnostics: true,
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
      assert.equal(compiled.diagnostics?.length, 0, path); compiledCache.set(source, compiled.outputText);
    }
    vm.runInNewContext(compiledCache.get(source)!, { exports, require(id: string) {
      if (!Object.hasOwn(modules, id)) return blocked(`import ${id}`); return modules[id];
    }, window, localStorage, URLSearchParams, console, Event, fetch: () => blocked('fetch'),
    XMLHttpRequest: () => blocked('XHR'), WebSocket: () => blocked('WebSocket') }, { filename: path });
    return exports as any;
  };
  modules['./matchrimLocalOwner'] = load('src/utils/matchrimLocalOwner.ts');
  modules['@/utils/scanHistory'] = load('src/utils/scanHistory.ts');
  modules['@/utils/nativePrivacy97'] = load('src/utils/nativePrivacy97.ts');
  if (consent) storage.set(modules['@/utils/nativePrivacy97'].NATIVE_SCAN_PRIVACY_KEY97, 'accepted');
  modules['@/components/ScanPrivacyGate'] = load('src/components/ScanPrivacyGate.tsx');
  const optionsAst = parse('ScanHub.tsx', read('src/components/wine-import/ScanHub.tsx'));
  let initializer = '';
  walk(optionsAst, node => { if (ts.isVariableDeclaration(node) && node.name.getText(optionsAst) === 'scanOptions') initializer = node.initializer!.getText(optionsAst); });
  assert.ok(initializer);
  const options = load('scan-options.ts', `import {ScanLine,Wine,BookOpen,ChefHat,ShoppingBag} from 'lucide-react'; export const scanOptions=${initializer};`).scanOptions;
  modules['@/components/wine-import/ScanHub'] = { ScanHub: 'ScanHub', scanOptions: options };
  modules['@/components/NativeScanHub99'] = load(hubPath);
  const Scan = load(pagePath, historical ? prior(pagePath) : page).default;
  const flush = () => {
    for (let pass = 0; pass < 10; pass++) {
      cursor = 0; dirty = false; tree = render();
      effects.splice(0).forEach(run => run());
      if (!dirty) return tree;
    }
    throw Error('Fixture did not settle');
  };
  render = () => Scan();
  return { page: flush, get tree() { return tree; }, options, navigation, events, remote, storage, listeners, location,
    privacyKey: modules['@/utils/nativePrivacy97'].NATIVE_SCAN_PRIVACY_KEY97,
    nativeHub(props: Record<string, any> = {}) {
      render = () => modules['@/components/NativeScanHub99'].NativeScanHub99({ ownerId: owner, options,
        onSelectMode: (...args: any[]) => navigation.push(args), onOpenRestaurant: () => navigation.push(['/restaurante']),
        onOpenRecent: (...args: any[]) => navigation.push(args), ...props });
      return flush();
    },
    emit(name: string) { window.dispatchEvent({ type: name }); return flush(); },
    dispose() { state.forEach(slot => slot?.cleanup?.()); },
  };
}

const checks: string[] = [];
const check = (name: string, run: () => void) => { run(); checks.push(name); console.log('PASS', name); };

check('Only a native early return and one import were added; all original Scan bytes remain intact', () => {
  assert.equal(restoreNativeScan99(pagePath, page), prior(pagePath));
});

check('Scanner pipelines/consent/routes/CSS and frozen hub oracles remain exact after the literal reader inverse', () => {
  for (const path of ['src/components/wine-import/ScanHub.tsx', 'src/components/ScanPrivacyGate.tsx',
    'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/components/wine-import/WineMenuScanner.tsx',
    'src/components/wine-import/FoodPairingScanner.tsx', 'src/components/wine-import/WineShopLinkAdvisor.tsx',
    'src/pages/Restaurant.tsx', 'src/components/MobileBottomNav.tsx', 'src/index.css',
    'scripts/check-matchrim-scan-hub96.ts', 'scripts/check-matchrim-scan-hub-svg96.mjs']) assert.equal(restoreNativeScan99Guard(path, read(path)), prior(path), path);
});

check('Actual native primary callbacks reach bottle, wine-menu and existing restaurant destinations once', () => {
  const f = fixture(), tree = f.page();
  const primary = byTestId(tree, 'native-scan-primary99');
  const buttons = nodes(primary).filter(node => node.type === 'button');
  assert.deepEqual(buttons.map(button => text(nodes(button).find(node => node.type === 'span' && node.props.className.includes('min-w-0'))?.props.children[0])), ['Botellas', 'Carta de vinos', 'Comida y vino']);
  assert.match(buttons[0].props['aria-label'], /^Etiqueta de vino.*Botellas/);
  assert.match(buttons[2].props['aria-label'], /^Comida y vinos del restaurante/);
  buttons.forEach(button => button.props.onClick());
  assert.deepEqual(f.navigation, [['/escanear/etiqueta'], ['/escanear/carta-vinos'], ['/restaurante']]);
  assert.deepEqual(shape(f.events), [['scan_hub_opened', { userId: 'qa-owner' }],
    ['scan_option_selected', { userId: 'qa-owner', metadata: { option: 'label' } }],
    ['scan_option_selected', { userId: 'qa-owner', metadata: { option: 'wine-menu' } }]]);
  assert.equal(nodes(tree).filter(node => node.type === 'MobileBottomNav').length, 1);
  assert.equal(nodes(tree).filter(node => node.type === 'ScanHub').length, 0);
  assert.deepEqual(f.remote, []); f.dispose();
});

check('More is a closed semantic disclosure with every original secondary workflow and callback', () => {
  const f = fixture(), disclosure = byTestId(f.page(), 'native-scan-more99');
  assert.equal(disclosure.type, 'details'); assert.equal(disclosure.props.open, undefined);
  const summary = nodes(disclosure).filter(node => node.type === 'summary');
  assert.equal(summary.length, 1); assert.equal(text(summary[0]), 'Más');
  const buttons = nodes(disclosure).filter(node => node.type === 'button');
  assert.deepEqual(buttons.map(text), ['Menú de comida', 'Plato', 'Encontrar vino']);
  buttons.forEach(button => button.props.onClick());
  assert.deepEqual(f.navigation, [['/escanear/menu-comida'], ['/escanear/plato'], ['/escanear/encontrar-vino']]);
  assert.deepEqual(f.remote, []); f.dispose();
});

const aliases: Record<string, string> = { label: 'label', etiqueta: 'label', 'wine-menu': 'wine-menu', carta: 'wine-menu',
  'carta-vinos': 'wine-menu', 'food-menu': 'food-menu', menu: 'food-menu', 'menu-comida': 'food-menu', dish: 'dish', plato: 'dish',
  'shop-link': 'shop-link', 'encontrar-vino': 'shop-link', 'enlace-tienda': 'shop-link', enlace: 'shop-link', tienda: 'shop-link',
  compra: 'shop-link', encontrar: 'shop-link', 'buscar-vino': 'shop-link', 'comprar-vino': 'shop-link' };

check('Complete web JSX and effects remain render-equal across users, query intents, all aliases and invalid modes', () => {
  for (const owner of [null, 'qa-owner']) for (const mode of [undefined, ...Object.keys(aliases), 'invalid']) {
    for (const query of ['', 'mode=wine-menu&dish=Arroz&wine=Reserva', 'dish=Arroz&wine=Reserva']) {
      const next = fixture({ native: false, owner, mode, query }), old = fixture({ native: false, owner, mode, query, historical: true });
      assert.deepEqual(shape(next.page()), shape(old.page()), `${owner}/${mode}/${query}`);
      assert.deepEqual(shape(next.navigation), shape(old.navigation));
      assert.deepEqual(next.remote, []); next.dispose(); old.dispose();
    }
  }
});

check('Native selected JSX, labels, all aliases and dish/wine intent props remain exact behind real consent', () => {
  for (const [mode, expected] of Object.entries(aliases)) for (const consent of [false, true]) {
    const query = 'dish=Arroz%20con%20setas&wine=Reserva%202021';
    const next = fixture({ mode, query, consent }), old = fixture({ mode, query, consent, historical: true });
    const tree = next.page();
    assert.deepEqual(shape(tree), shape(old.page()), `${mode}/${consent}`);
    assert.equal(nodes(tree).filter(node => node.props['data-testid'] === 'native-scan-hub99').length, 0);
    assert.ok(text(tree).includes(next.options.find((option: any) => option.id === expected).title));
    const scanner = nodes(tree).find(node => node.type === 'ScanHub');
    if (consent) {
      assert.ok(scanner); assert.equal(scanner.props.mode, expected); assert.equal(scanner.props.variant, 'selected');
      assert.equal(scanner.props.pairingDishName, 'Arroz con setas'); assert.equal(scanner.props.similarWineName, 'Reserva 2021');
      assert.equal(typeof scanner.props.onExtractComplete, 'function');
    } else {
      assert.equal(scanner, undefined); assert.match(text(tree), /Antes de analizar una imagen/);
      const button = nodes(tree).find(node => node.type === 'Button');
      assert.equal(button.props.disabled, true); button.props.onClick();
      assert.equal(next.storage.get(next.privacyKey), undefined);
    }
    assert.deepEqual(next.remote, []); next.dispose(); old.dispose();
  }
});

check('Existing mode query redirects and invalid path redirects are unchanged on both platforms', () => {
  for (const native of [false, true]) for (const mode of [undefined, 'invalid']) {
    for (const requested of ['label', 'wine-menu', 'food-menu', 'dish', 'shop-link', 'invalid']) {
      const next = fixture({ native, mode, query: `mode=${requested}` }), old = fixture({ native, mode, query: `mode=${requested}`, historical: true });
      const tree = next.page(); old.page(); assert.deepEqual(shape(next.navigation), shape(old.navigation));
      if (mode) assert.deepEqual(shape(tree), shape(old.tree));
      next.dispose(); old.dispose();
    }
  }
});

check('Real native consent still requires checking the notice and an explicit continue before showing a scanner', () => {
  const f = fixture({ mode: 'etiqueta' });
  let tree = f.page();
  nodes(tree).find(node => node.type === 'Button').props.onClick();
  assert.equal(f.storage.get(f.privacyKey), undefined);
  nodes(tree).find(node => node.type === 'Checkbox').props.onCheckedChange(true);
  tree = f.page();
  const continueButton = nodes(tree).find(node => node.type === 'Button');
  assert.equal(continueButton.props.disabled, false); continueButton.props.onClick();
  tree = f.page(); assert.equal(f.storage.get(f.privacyKey), 'accepted');
  assert.equal(nodes(tree).find(node => node.type === 'ScanHub').props.mode, 'label');
  assert.deepEqual(f.remote, []); f.dispose();
});

check('Recent routes/query strings/external actions remain reachable and refresh without leaking another owner', () => {
  const f = fixture();
  const items = Array.from({ length: 6 }, (_, i) => ({ id: `recent-${i}`, title: `Vino ${i}`, subtitle: 'Bodega de prueba', type: 'wine-menu',
    route: `/escanear/carta-vinos?dish=Arroz&scan=${i}`, externalUrl: 'https://example.test/ficha', actionLabel: 'Ver ficha', createdAt: i }));
  f.storage.set('matchrim.scan_history.v1', JSON.stringify(items));
  let tree = f.nativeHub();
  const recent = nodes(tree).find(node => node.props['aria-labelledby'] === 'native-scan-recent99-title');
  assert.ok(recent); const buttons = nodes(recent).filter(node => node.type === 'button');
  assert.equal(buttons.length, 5); buttons[0].props.onClick();
  assert.deepEqual(f.navigation, [[items[0].route]]);
  const links = nodes(recent).filter(node => node.type === 'a'); assert.equal(links.length, 5);
  assert.equal(links[0].props.href, items[0].externalUrl); assert.equal(links[0].props.rel, 'noopener noreferrer');
  assert.equal(links[0].props.target, '_blank');
  f.storage.set('matchrim.scan_history.v1', JSON.stringify([{ ...items[0], title: 'Actualizado' }]));
  assert.match(text(f.emit('matchrim:scan-history-updated')), /Actualizado/);
  f.storage.set('matchrim.local_profile_owner.v1', 'other-owner');
  tree = f.emit('storage'); assert.doesNotMatch(text(tree), /Actualizado|Últimos escaneos/);
  f.dispose(); assert.equal([...f.listeners.values()].reduce((count, set) => count + set.size, 0), 0);
  assert.deepEqual(f.remote, []);
});

check('Hub is inert: no capture/upload, scanner mounting, remote import, media asset or automatic navigation', () => {
  for (const owner of [null, 'qa-owner']) {
    const f = fixture({ owner }), tree = f.page();
    assert.deepEqual(f.navigation, []); assert.deepEqual(f.remote, []);
    assert.equal(nodes(tree).filter(node => ['img', 'video', 'iframe', 'input', 'ScanHub'].includes(node.type)).length, 0);
    f.dispose();
  }
  assert.doesNotMatch(hub, /fetch\(|supabase|invokeEdgeFunction|capture|https?:\/\/|lovable-uploads|WebkitTextSizeAdjust|truncate|line-clamp/);
});

const css = (await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: hub + page, extension: 'tsx' }] })])
  .process('@tailwind utilities;', { from: undefined })).css;
check('Offline CSS contracts: 44px targets, single-column rows, MAX stacked text, safe areas and nav clearance', () => {
  const f = fixture(), tree = f.page();
  for (const control of nodes(tree).filter(node => ['button', 'summary'].includes(node.type))) {
    assert.match(control.props.className, /min-h-\[44px\]/); assert.match(control.props.className, /focus-visible:outline/);
  }
  const primary = byTestId(tree, 'native-scan-primary99'); assert.doesNotMatch(primary.props.className, /grid-cols/);
  assert.match(css, /grid-template-columns: 44px minmax\(0,1fr\) 20px/);
  const rules: { selector: string; properties: Record<string, string> }[] = [];
  postcss.parse(css).walkRules(rule => {
    const properties: Record<string, string> = {}; rule.walkDecls(d => { properties[d.prop] = d.value; });
    rules.push({ selector: rule.selector, properties });
  });
  for (const [property, value] of [['grid-column', 'span 3 / span 3'], ['grid-column-start', '1'], ['grid-row-start', '2']]) {
    assert.ok(rules.some(rule => rule.selector.startsWith('html.matchrim-accessibility-text ') && rule.properties[property] === value), property);
  }
  const main = nodes(tree).find(node => node.type === 'main');
  for (const edge of ['top', 'left', 'right']) assert.ok(main.props.className.includes(`var(--matchrim-safe-${edge})`));
  assert.match(tree.props.className, /var\(--matchrim-bottom-nav-height,88px\)/);
  for (const icon of nodes(tree).filter(node => typeof node.type === 'string' && node.type.startsWith('lucide:'))) {
    assert.equal(String(icon.props['aria-hidden']), 'true'); assert.equal(String(icon.props.focusable), 'false');
  }
  f.dispose();
});

console.log(JSON.stringify({ passed: checks.length, checks, baseline: revision,
  scope: 'Actual Scan, NativeScanHub99, ScanPrivacyGate and owner-bound scan history with deterministic JSX/hooks; analytics captured and all other remote boundaries denied. CSS contracts only, no browser/device layout claims.' }));
