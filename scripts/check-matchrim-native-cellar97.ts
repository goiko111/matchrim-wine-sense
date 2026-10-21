import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import ts from 'typescript';
import { restoreNativeCellar97 } from './native-cellar97-scope.mjs';
import { nativeVisual98Baseline, restoreNativeVisual98 } from './native-visual98-scope.mjs';

type Element97 = { type: unknown; props: Record<string, unknown> };
const element = (value: unknown): value is Element97 => Boolean(value && typeof value === 'object' && 'props' in value);
const all = (value: unknown): Element97[] => Array.isArray(value) ? value.flatMap(all)
  : element(value) ? [value, ...all(value.props.children)] : [];
const text = (value: unknown): string => Array.isArray(value) ? value.map(text).join('')
  : element(value) ? text(value.props.children) : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
const source = readFileSync('src/components/NativeCellarToolbar97.tsx', 'utf8');
const file = 'src/pages/MyWines.tsx';
const currentPage98 = readFileSync(file, 'utf8');
// These presentation97 assertions exercise the exact restored legacy source, not the current98 UI.
const page97 = restoreNativeVisual98(file, currentPage98);
assert.equal(page97, execFileSync('git', ['show', `${nativeVisual98Baseline}:${file}`], { encoding: 'utf8' }));
const baseline = execFileSync('git', ['show', `8327ee7:${file}`], { encoding: 'utf8' });
const exports97: Record<string, unknown> = {};
const jsx = (type: unknown, props: Record<string, unknown>) => ({ type, props });
let remote = 0;
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
  jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS,
} }).outputText, { exports: exports97, require(name: string) {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
  if (name === 'lucide-react') return { Plus: 'Plus', ScanLine: 'ScanLine', Search: 'Search' };
  if (name.endsWith('/button')) return { Button: 'Button' };
  if (name.endsWith('/dropdown-menu')) return Object.fromEntries([
    'DropdownMenu', 'DropdownMenuContent', 'DropdownMenuItem', 'DropdownMenuTrigger',
  ].map(key => [key, key]));
  throw Error('Unexpected dependency ' + name);
}, fetch() { remote++; throw Error('No remote calls in presentation'); } });
const render = exports97.NativeCellarToolbar97 as (props: Record<string, unknown>) => Element97;
let checks = 0;
const check = (name: string, run: () => void) => { run(); checks++; console.log('PASS', name); };
const keys = ['collection', 'wishlist', 'tasted', 'favorites', 'rejected'];
const labels = ['En bodega', 'Por probar', 'Probados', 'Favoritos', 'No repetir'];
const counts = { collection: 200, wishlist: 12, tasted: 37, favorites: 9, rejected: 2 };
const calls: string[] = [];
const search = jsx('ExistingWineSearchBar', { onSelectWine: () => calls.push('search-select') });
const props = { section: 'collection', counts, search, onSectionChange: (section: string) => calls.push(section),
  onScanLabel: () => calls.push('label'), onScanMenu: () => calls.push('menu'), onAddManually: () => calls.push('manual') };

check('Current98 restores exact legacy97 before its native-only inverse retains every prior web byte, mutation and affinity handler', () => {
  assert.equal(restoreNativeCellar97(file, currentPage98), baseline);
  assert.equal(restoreNativeCellar97(file, page97), baseline);
});
check('Web, mutation, native ownership and filter-reset mutations cannot hide behind the inverse', () => {
  for (const [from, to] of [
    ['Mis Vinos', 'Web changed'], ['const loadWines = async () => {', 'const loadWines = async () => { throw Error();'],
    ['{isNative && <NativeCellarToolbar97', '{true && <NativeCellarToolbar97'],
    ["navigateToWineSection(section); setFilterType('all');", "navigateToWineSection(section); setFilterType('high_affinity');"],
  ]) {
    assert(page97.includes(from)); assert.throws(() => restoreNativeCellar97(file, page97.replace(from, to)));
  }
});
check('All five sections preserve selected state and real section counts, not a new collection model', () => {
  for (const key of keys) {
    const nodes = all(render({ ...props, section: key }));
    const select = nodes.find(node => node.type === 'select')!;
    assert.equal(select.props.value, key);
    assert.equal(select.props['aria-label'], 'Sección de tus vinos');
    assert.deepEqual(nodes.filter(node => node.type === 'option').map(node => node.props.value), keys);
    assert.deepEqual(nodes.filter(node => node.type === 'option').map(text), labels.map((label, index) => `${label} (${counts[keys[index] as keyof typeof counts]})`));
  }
});
check('Only a valid explicit section change dispatches, once, without mutating counts', () => {
  const before = JSON.stringify(counts), node = all(render(props)).find(node => node.type === 'select')!;
  const change = node.props.onChange as (event: { target: { value: string } }) => void;
  calls.length = 0;
  for (const value of keys) change({ target: { value } });
  change({ target: { value: 'unknown' } });
  assert.deepEqual(calls, keys); assert.equal(JSON.stringify(counts), before);
});
check('Add menu retains label, menu and manual actions with no automatic navigation or dispatch', () => {
  calls.length = 0;
  const nodes = all(render(props));
  assert.equal(calls.length, 0);
  const trigger = nodes.find(node => node.type === 'Button')!;
  assert.equal(trigger.props['aria-label'], 'Añadir vino'); assert.equal(trigger.props.title, 'Añadir vino');
  const items = nodes.filter(node => node.type === 'DropdownMenuItem');
  assert.equal(items.length, 3);
  for (const node of items) (node.props.onSelect as () => void)();
  assert.deepEqual(calls, ['label', 'menu', 'manual']);
});
check('The existing catalogue search stays collapsed and retains its original selection owner', () => {
  const tree = render(props), nodes = all(tree), details = nodes.find(node => node.type === 'details')!;
  assert.equal(details.props.open, undefined);
  assert.equal(nodes.filter(node => node === search).length, 1);
  calls.length = 0; (search.props.onSelectWine as () => void)(); assert.deepEqual(calls, ['search-select']);
});
check('Native list precedes the collapsed learning note; legacy explanations are web-only', () => {
  assert(page97.indexOf('<NativeCellarToolbar97') < page97.indexOf('{filteredWines.map'));
  assert(page97.indexOf('data-testid="native-cellar-learning97"') > page97.indexOf('{filteredWines.map'));
  assert(page97.includes('{statusFilter === \'tasted\' && !isNative && ('));
  assert(page97.includes('search={<WineSearchBar onSelectWine={handleSearchWineSelect} />}'));
  assert(page97.includes("{cellarProfile?.note || 'Cargando tu perfil.'}"));
  assert(page97.includes('wine={wine} snapshot={cellarProfile}'));
});
check('Compact controls retain labels, 44px minimums and no new cards or data services', () => {
  assert(String(render(props).props.className).includes('space-y-2'));
  assert(!source.includes('<Card')); assert(!source.includes('supabase')); assert(!source.includes('useEffect'));
  assert(source.includes('min-h-11 w-full min-w-0 max-w-full'));
  for (const node of all(render(props)).filter(node => node.type === 'DropdownMenuItem' || node.type === 'summary')) {
    assert(String(node.props.className).includes('min-h-11'));
  }
  assert.equal(remote, 0);
});
check('Native heading can wrap its row without splitting the name; list spacing changes only on native', () => {
  const nodes = all(render(props));
  const heading = nodes.find(node => node.type === 'h1')!;
  assert.equal(text(heading), 'Bodega');
  assert(String(heading.props.className).includes('[overflow-wrap:normal]'));
  assert(nodes.some(node => node.type === 'div' && String(node.props.className).includes('flex-wrap items-center justify-between')));
  assert(page97.includes("className={isNative ? 'mt-2 space-y-3' : 'mt-6 space-y-6'}"));
});
check('Restored legacy97 manual-name lookup uses catalogue-only on native and exact legacy body on web', () => {
  const ast = ts.createSourceFile(file, page97, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const effects: ts.ArrowFunction[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect'
      && node.arguments[0] && ts.isArrowFunction(node.arguments[0])
      && node.arguments[0].getText(ast).includes('Error validating manual wine name:')) effects.push(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(effects.length, 1);
  const code = effects[0].getText(ast).replace('import.meta.env.VITE_MATCHRIM_EDGE_RELEASE', "'75'");
  for (const isNative of [true, false]) {
    const requests: Array<{ name: string; options: { body: unknown } }> = [];
    let timer: (() => Promise<void>) | null = null;
    const effect = vm.runInNewContext(ts.transpileModule(`globalThis.effect = (${code});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText + '\neffect;', {
      isNative, showAddDialog: true, formData: { name: '  Roda I  ' },
      setManualWineSuggestions() {}, setManualWineLookupStatus() {},
      resolveMatchrimEdgeFunctionName: (name: string, release: string) => `${name}-v${release}`,
      supabase: { functions: { invoke(name: string, options: { body: unknown }) {
        requests.push({ name, options }); return new Promise(() => {});
      } } },
      window: { setTimeout(callback: () => Promise<void>, delay: number) { assert.equal(delay, 450); timer = callback; return 1; }, clearTimeout() {} },
      console,
    }) as () => () => void;
    const cleanup = effect(); assert(timer); void (timer as () => Promise<void>)();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].name, isNative ? 'search-wines-v75' : 'search-wines');
    assert.equal(JSON.stringify(requests[0].options.body), JSON.stringify(isNative
      ? { query: 'Roda I', limit: 6, catalogOnly: true } : { query: 'Roda I', limit: 6 }));
    cleanup();
  }
  assert.throws(() => restoreNativeCellar97(file, page97.replace('limit: 6, catalogOnly: true', 'limit: 6, catalogOnly: false')));
});
console.log(JSON.stringify({ passed: checks, failed: 0, remoteCalls: remote,
  presentationRevision: 'legacy97', restoredFrom: 'reviewed98', sourceBaseline: nativeVisual98Baseline,
  scope: 'Legacy97 toolbar actual TSX in offline host, exact98-to97 full-page source inverse and callback ownership. No current98 presentation claim. Browser/UIKit, authentication, saved data and taste accuracy are separate gates.' }));
