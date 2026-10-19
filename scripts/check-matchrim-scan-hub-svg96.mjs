import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { restoreManualLookupGuard96 } from './check-matchrim-manual-lookup-bridge96.mjs';
import { restoreNativeScanHeading96, restoreNativeHeadingTree96 } from './check-matchrim-scan-heading96.mjs';

const baselineRevision = 'e3fd4c73913469a3f084be7f1296b17fe7c3ac70';
const deny = () => { throw new Error('No transport or scanner execution in SVG source/render fixture'); };
const hash = (source) => createHash('sha256').update(source).digest('hex');
const ownHash = () => hash(restoreManualLookupGuard96('scripts/check-matchrim-scan-hub-svg96.mjs', fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')));
export const nativeHubSvg96Result = { groups: 7, rejectedMutations: 5, sourceGuardNegatives: 3, edits: 9, nativeSVGs: 12, webCases: 2 };

export function restoreNativeHubSvg96(file, source) {
  source = restoreNativeScanHeading96(file, source);
  const undo = (from, to, count) => {
    assert.equal(source.split(from).length - 1, count, 'Exact native SVG inverse: ' + from);
    source = source.split(from).join(to);
  };
  if (file === 'src/pages/Scan.tsx') {
    undo(' aria-hidden="true" focusable="false"', '', 2);
    undo('              isNative={isNative}\n', '', 1);
    assert.equal(hash(source), '60f5f4a4d73de85ceb6ba1ef065fb2a2c855f206672ef6ef6ad5caeb676565b0');
  } else if (file === 'src/components/wine-import/ScanHub.tsx') {
    undo('  isNative?: boolean;\n', '', 1);
    undo('  isNative = false,\n', '', 1);
    undo(" {...(isNative ? { 'aria-hidden': true, focusable: false } : {})}", '', 4);
    assert.equal(hash(source), 'c6c134dc89edf005a7b425bff03211f5176a02d6d8c2a44c0f26d400b975cea7');
  }
  return source;
}

function restoreGuard(source, file, replacements) {
  source = restoreManualLookupGuard96(file, source);
  for (const [from, to] of replacements) {
    assert.equal(source.split(from).length, 2, 'One exact SVG guard amendment: ' + from);
    source = source.replace(from, to);
  }
  const previous = execFileSync('git', ['show', `${baselineRevision}:${file}`], { encoding: 'utf8' });
  assert.equal(source, previous, 'Whole e3fd guard and all historical oracles remain exact');
  return source;
}

export function restoreScanHubSvgGuard96(source) {
  return restoreGuard(source, 'scripts/check-matchrim-scan-hub96.ts', [
    ["import { restoreNativeHubSvg96, runNativeHubSvg96Checks } from './check-matchrim-scan-hub-svg96.mjs';\n", ''],
    ['  const nativeHubSvg96 = runNativeHubSvg96Checks();\n', ''],
    ['assert.equal(restoreNativeHubSvg96(p, source[p]),', 'assert.equal(source[p],'],
    ['checks, nativeHubSvg96, ui,', 'checks, ui,'],
  ]);
}

export function restoreNativeHubLayout96(source) {
  const test = 'scripts/check-matchrim-scan-hub-svg96.mjs';
  return restoreGuard(source, 'scripts/check-matchrim-consumer95-native-layout.ts', [
    ["import { nativeHubSvg96Result, restoreScanHubSvgGuard96 } from './check-matchrim-scan-hub-svg96.mjs';\n", ''],
    ['assertScanHubComparisonBridge96(restoreScanHubSvgGuard96(scanHubSource));', 'assertScanHubComparisonBridge96(scanHubSource);'],
    [`  assert.equal(hash(readFileSync('${test}', 'utf8')), '${ownHash()}');\n`, ''],
    ['  for (const [key, value] of Object.entries(nativeHubSvg96Result)) assert.equal(report.nativeHubSvg96[key], value);\n', ''],
    [`    nativeHubDecorativeSvg96: { test: '${test}', testHash: '${ownHash()}', ...nativeHubSvg96Result },\n`, ''],
  ]);
}

export function runNativeHubSvg96Checks() {
const root = fileURLToPath(new URL('../', import.meta.url));
const repo = root;
const require = createRequire(path.join(repo, 'package.json'));
const ts = require('typescript');
const React = require('react');
const icons = require('lucide-react');
const { renderToStaticMarkup } = require('react-dom/server');
const scanFile = 'src/pages/Scan.tsx';
const hubFile = 'src/components/wine-import/ScanHub.tsx';
const read = (p) => fs.readFileSync(p, 'utf8');
const sha = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const refs = (p) => ({ path: p, sha256: sha(p) });
const baseline = Object.fromEntries([scanFile, hubFile].map((f) => [f, execFileSync('git', ['show', `${baselineRevision}:${f}`], { cwd: root, encoding: 'utf8' })]));
const candidate = Object.fromEntries([scanFile, hubFile].map((f) => [f, read(path.join(root, f))]));
assert.equal(hash(baseline[scanFile]), '60f5f4a4d73de85ceb6ba1ef065fb2a2c855f206672ef6ef6ad5caeb676565b0');
assert.equal(hash(baseline[hubFile]), 'c6c134dc89edf005a7b425bff03211f5176a02d6d8c2a44c0f26d400b975cea7');
const nativeSupport = ['src/components/MobileBottomNav.tsx', 'src/components/AiRimMark.tsx'];
const support = Object.fromEntries(nativeSupport.map((f) => [f, read(path.join(repo, f))]));
const mainRefs = [scanFile, hubFile, ...nativeSupport, 'src/index.css'].map((f) => refs(path.join(repo, f)));
assert.equal(sha(path.join(root, nativeSupport[0])), '9c6edc7cec29bdec7c3f2ec3696f84b69a6073e7296d669a24906c8caa820271');
assert.equal(sha(path.join(root, nativeSupport[1])), 'fff9a8a11f0232cfdba4850e5518f974ec7e3fa603063d0629bc5c673d4ef412');
const controls = [];
function check(name, action) { action(); controls.push(name); }

check('exact nine-edit whole-file inverse to sealed e3fd baseline', () => {
  for (const file of [scanFile, hubFile]) assert.equal(restoreNativeHubSvg96(file, candidate[file]), baseline[file]);
  const hubGuard = read(path.join(root, 'scripts/check-matchrim-scan-hub96.ts'));
  const layoutGuard = read(path.join(root, 'scripts/check-matchrim-consumer95-native-layout.ts'));
  restoreScanHubSvgGuard96(hubGuard);
  restoreNativeHubLayout96(layoutGuard);
  for (const [source, from, to, project] of [
    [hubGuard, 'assert.equal((440 - 342) / 2, 49)', 'assert.equal((440 - 342) / 2, 48)', restoreScanHubSvgGuard96],
    [layoutGuard, 'assert.equal(fingerprints.size, 5)', 'assert.equal(fingerprints.size, 4)', restoreNativeHubLayout96],
    [layoutGuard, ownHash(), '0'.repeat(64), restoreNativeHubLayout96],
  ]) {
    assert.ok(source.includes(from));
    assert.throws(() => project(source.replace(from, to)));
  }
});

function mount(files, native, owner = null) {
  const routes = [], events = [], updates = [], modules = new Map();
  const shim = { ...React,
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, (next) => updates.push(next)],
    useRef: (current) => ({ current }), useEffect() {}, useLayoutEffect() {},
    useCallback: (fn) => fn, lazy: () => () => React.createElement('div', { 'data-fixed-lazy-scanner': 'wine-menu' }),
  };
  const router = { useNavigate: () => (route) => routes.push(route), useLocation: () => ({ pathname: '/escanear', search: '' }),
    useParams: () => ({}), useSearchParams: () => [new URLSearchParams()],
    Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children),
    Navigate: () => { throw new Error('Unexpected redirect'); } };
  const mocked = {
    react: shim, 'react-router-dom': router, 'lucide-react': icons,
    '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
    '@/contexts/AuthContext': { useAuth: () => ({ user: owner ? { id: owner } : null }) },
    '@/i18n': { useI18n: () => ({ t: (key) => key === 'nav.home' ? 'Inicio' : key }) },
    '@/utils/navigation': { buildAuthRedirectPath: (route) => '/auth?next=' + route },
    '@/lib/analytics': { trackAppEvent: (...args) => events.push(args) },
    '@/utils/scanHistory': { getScanHistory: () => [], SCAN_HISTORY_UPDATED_EVENT: 'history' },
    '@/integrations/supabase/client': { supabase: new Proxy({}, { get: deny }) },
    '@/utils/labelScanSave': { confirmedLabelInsertId: deny, labelInsertErrorResult: deny },
    sonner: { toast: new Proxy({}, { get: deny }) },
    '@/components/AppNav': { default: () => React.createElement('nav', { 'data-offline-fixed-child': 'AppNav' }) },
    '@/components/ScanPrivacyGate': { ScanPrivacyGate: () => { throw new Error('Selected-mode branch must not render'); } },
  };
  const actualPaths = {
    '@/components/wine-import/ScanHub': hubFile,
    '@/components/MobileBottomNav': nativeSupport[0], '@/components/AiRimMark': nativeSupport[1],
  };
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = files[file] ?? support[file];
    assert.equal(typeof source, 'string', file);
    const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true, compilerOptions: {
      jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    } });
    assert.equal(result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0);
    const exports = {};
    const context = vm.createContext({ React: shim, exports, URLSearchParams,
      require: (name) => {
        if (Object.hasOwn(mocked, name)) return mocked[name];
        if (Object.hasOwn(actualPaths, name)) return load(actualPaths[name]);
        if (name.startsWith('@/components/wine-import/')) return { default: () => React.createElement('div', { 'data-fixed-scanner-boundary': name }),
          MultiWineLabelScanner: () => React.createElement('div', { 'data-fixed-scanner-boundary': name }) };
        throw new Error('Unapproved dependency: ' + name);
      } });
    vm.runInContext(result.outputText, context, { filename: file, timeout: 3000 });
    modules.set(file, exports);
    return exports;
  }
  function resolve(element) {
    if (element === null || element === undefined || typeof element === 'boolean') return [];
    if (Array.isArray(element)) return element.flatMap(resolve);
    if (typeof element === 'string' || typeof element === 'number') return [String(element)];
    assert.ok(React.isValidElement(element));
    const { type, props } = element;
    if (type === React.Fragment || type === React.Suspense) return resolve(props.children);
    if (typeof type === 'function') return resolve(type(props));
    if (typeof type === 'object' && typeof type.render === 'function') return resolve(type.render(props, null));
    assert.equal(typeof type, 'string', 'No unresolved React boundary');
    const { children, ...attrs } = props;
    return [{ tag: type, attrs, children: resolve(children) }];
  }
  return {
    scan: () => resolve(React.createElement(load(scanFile).default)),
    hub: (props) => resolve(React.createElement(load(hubFile).ScanHub, { variant: 'hub', onExtractComplete: deny, ...props })),
    routes, events, updates, modules,
  };
}
const walk = (tree) => tree.flatMap((n) => typeof n === 'string' ? [] : [n, ...walk(n.children)]);
const buttons = (tree) => walk(tree).filter((n) => n.tag === 'button');
const svgs = (tree) => walk(tree).filter((n) => n.tag === 'svg');
function name(node) {
  if (node.attrs['aria-label']) return node.attrs['aria-label'];
  const text = (n) => typeof n === 'string' ? n : String(n.attrs['aria-hidden']) === 'true' ? '' : n.children.map(text).join(' ');
  return node.children.map(text).join(' ').replace(/\s+/g, ' ').trim();
}
function html(tree) {
  const element = (n) => typeof n === 'string' ? n : React.createElement(n.tag,
    Object.fromEntries(Object.entries(n.attrs).filter(([k, v]) => k !== 'ref' && typeof v !== 'function')),
    ...n.children.map(element));
  return renderToStaticMarkup(React.createElement(React.Fragment, null, ...tree.map(element)));
}
const nativeNames = ['Comida y vinos del restaurante', 'Carta de vinos Sube la carta y te digo qué pediría primero.',
  'Etiqueta de vino Identifica una etiqueta o varias botellas sin mezclarlas.',
  'Menú de comida Convierte platos del menú en ideas de vino.', 'Plato Haz una foto y encuentra el vino que le va.',
  'Encontrar vino Dime presupuesto, ocasión o tienda y te digo qué buscaría.'];
function hiddenActions(tree, count) {
  const actions = buttons(tree);
  assert.equal(actions.length, count / 2);
  const decorative = actions.flatMap((n) => svgs([n]));
  assert.equal(decorative.length, count);
  for (const svg of decorative) {
    assert.equal(String(svg.attrs['aria-hidden']), 'true');
    assert.equal(String(svg.attrs.focusable), 'false');
  }
}
let nativeBefore, nativeAfter;
check('actual Scan + Hub + Lucide: exactly12 native action SVGs hidden/nonfocusable, six exact names', () => {
  nativeBefore = mount(baseline, true).scan();
  nativeAfter = mount(candidate, true).scan();
  hiddenActions(nativeAfter, 12);
  assert.deepEqual(buttons(nativeAfter).map(name), nativeNames);
  assert.deepEqual(buttons(nativeBefore).map(name), nativeNames);
});
const webCases = [];
check('actual full Scan web host DOM byte-exact, anonymous and owner', () => {
  for (const owner of [null, 'owner-a']) {
    const before = html(mount(baseline, false, owner).scan());
    const after = html(mount(candidate, false, owner).scan());
    assert.equal(after, before);
    webCases.push({ owner: owner ?? 'anonymous', htmlSha256: hash(after) });
  }
});
check('actual Hub default omitted and explicitfalse are exact opt-outs; only explicittrue hides10', () => {
  const before = html(mount(baseline, false).hub({}));
  for (const nativeHost of [false, true]) {
    for (const props of [{}, { isNative: false }]) {
      const tree = mount(candidate, nativeHost).hub(props);
      assert.equal(html(tree), before);
      assert.ok(svgs(tree).every((svg) => !Object.hasOwn(svg.attrs, 'aria-hidden') && !Object.hasOwn(svg.attrs, 'focusable')));
    }
    hiddenActions(mount(candidate, nativeHost).hub({ isNative: true }), 10);
  }
});
check('native full host DOM differs only in12 decorative SVG attribute pairs, all classes/targets retained', () => {
  const copy = mount(candidate, true).scan();
  for (const action of buttons(copy)) for (const svg of svgs([action])) {
    delete svg.attrs['aria-hidden']; delete svg.attrs.focusable;
  }
  restoreNativeHeadingTree96(copy);
  assert.equal(html(copy), html(nativeBefore));
  assert.deepEqual(buttons(nativeAfter).map((n) => n.attrs.className), buttons(nativeBefore).map((n) => n.attrs.className));
});
check('six actual native handlers retain exact destinations and five Hub state/event callbacks', () => {
  const expected = ['/restaurante', '/escanear/carta-vinos', '/escanear/etiqueta', '/escanear/menu-comida', '/escanear/plato', '/escanear/encontrar-vino'];
  for (const files of [baseline, candidate]) {
    const m = mount(files, true);
    for (const action of buttons(m.scan())) action.attrs.onClick();
    assert.deepEqual(m.routes, expected);
    assert.equal(m.events.length, 5);
    assert.equal(m.updates.length, 5);
  }
});
check('actual selected/legacy branches stay exact for all five modes with native flag opt-in', () => {
  for (const variant of ['selected', 'legacy']) for (const initialMode of ['label', 'wine-menu', 'food-menu', 'dish', 'shop-link']) {
    const props = { variant, initialMode };
    assert.equal(html(mount(candidate, true).hub({ ...props, isNative: true })), html(mount(baseline, true).hub(props)));
  }
});
const mutations = [];
function reject(label, files, assertion) { assert.throws(() => assertion(files), undefined, label); mutations.push(label); }
reject('native aria-hidden missing', { ...candidate, [hubFile]: candidate[hubFile].replace("'aria-hidden': true, ", '') },
  (files) => hiddenActions(mount(files, true).scan(), 12));
reject('native focusable missing', { ...candidate, [hubFile]: candidate[hubFile].replace(', focusable: false', '') },
  (files) => hiddenActions(mount(files, true).scan(), 12));
reject('attributes leaked into web', { ...candidate, [hubFile]: candidate[hubFile].replace('...(isNative ?', '...(true ?') },
  (files) => assert.equal(html(mount(files, false).scan()), html(mount(baseline, false).scan())));
reject('accessible restaurant name changed', { ...candidate, [scanFile]: candidate[scanFile].replace('aria-label="Comida y vinos del restaurante"', 'aria-label="Comida"') },
  (files) => assert.deepEqual(buttons(mount(files, true).scan()).map(name), nativeNames));
reject('target class changed', { ...candidate, [hubFile]: candidate[hubFile].replace('min-h-[7.5rem]', 'min-h-[1rem]') },
  (files) => assert.deepEqual(buttons(mount(files, true).scan()).map((n) => n.attrs.className), buttons(nativeBefore).map((n) => n.attrs.className)));
for (const ref of mainRefs) assert.equal(sha(ref.path), ref.sha256);
assert.equal(controls.length, 7);
assert.equal(mutations.length, 5);

return { ...nativeHubSvg96Result, checks: controls, mutationNegatives: mutations, webDOMCases: webCases,
  nativeAccessibleNames: buttons(nativeAfter).map(name), sourceRefs: mainRefs,
  audit: 'ORIGINAL_NO_ELEMENT_FAIL_HOLD_RETAINED', runtimeUsed: false,
  scope: 'Actual Scan/Hub/Nav and React/Lucide in isolated VM; controlled owner/router/history and inert selected scanners. DOM/name/class/source proof, not physical44, UIKit, VoiceOver or audit cause. Syntax transpilation only.' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runNativeHubSvg96Checks()));
