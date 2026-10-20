import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { resolveMatchrimEdgeFunctionName } from '../src/utils/matchrimEdgeRouting';

const file = 'src/components/wine-import/NativeWineSearch97.tsx';
const source = readFileSync(file, 'utf8');
type Node = { type: string; props: Record<string, any> };
type Request = { name: string; body: Record<string, unknown>; signal: AbortSignal; resolve(value: unknown): void; reject(value: unknown): void };
const all = (node: any): Node[] => Array.isArray(node) ? node.flatMap(all)
  : node && typeof node === 'object' && node.props ? [node, ...all(node.props.children)] : [];
const content = (node: any): string => Array.isArray(node) ? node.map(content).join('')
  : node && typeof node === 'object' && node.props ? content(node.props.children) : typeof node === 'string' ? node : '';
const wine = (name = 'Vino de prueba', id = 'catalog-1') => ({ id, name, producer: 'Bodega de prueba', region: 'Region de prueba', vintage: 2021, estilo: 'tinto', grape_varieties: ['Uva'] });

// Execute the actual TSX with explicit hook/commit/timer and transport doubles. No DOM/UIKit claim.
function host(code = source, initialOwner: string | null = 'owner-a', initialLoading = false) {
  const cells: any[] = [], effects: Array<{ slot: number; fn: () => any; deps: unknown[] }> = [];
  const requests: Request[] = [], selected: unknown[] = [], timers = new Map<number, { at: number; fn: () => any }>();
  let cursor = 0, now = 0, timerId = 0, dirty = true, mounted = true, owner = initialOwner, authLoading = initialLoading, tree: Node;
  const exports: Record<string, any> = {};
  const jsx = (type: string, props: Record<string, unknown>) => ({ type, props });
  const hooks = {
    useState(initial: any) {
      const i = cursor++;
      if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
      return [cells[i], (next: any) => { assert(mounted, 'No writes after unmount'); cells[i] = typeof next === 'function' ? next(cells[i]) : next; dirty = true; }];
    },
    useRef(initial: any) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i]; },
    useEffect(fn: () => any, deps: unknown[]) {
      const slot = cursor++, old = cells[slot];
      if (!old || deps.some((v, i) => !Object.is(v, old.deps[i]))) effects.push({ slot, fn, deps });
    },
  };
  const compiled = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX }, reportDiagnostics: true });
  assert(!(compiled.diagnostics ?? []).some(d => d.category === ts.DiagnosticCategory.Error));
  vm.runInNewContext(compiled.outputText, {
    exports, AbortController,
    setTimeout(fn: () => any, delay: number) { const id = ++timerId; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id: number) { timers.delete(id); },
    fetch() { throw Error('REMOTE_NETWORK_FORBIDDEN'); },
    require(name: string) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (name === '@/contexts/AuthContext') return { useAuth: () => ({ user: owner ? { id: owner } : null, loading: authLoading }) };
      if (name === '@/utils/matchrimEdgeRouting') return { resolveMatchrimEdgeFunctionName };
      if (name === '@/utils/invokeEdgeFunction') return { invokeEdgeFunction(name: string, body: Record<string, unknown>, signal: AbortSignal) {
        assert(signal instanceof AbortSignal);
        return new Promise((resolve, reject) => requests.push({ name, body, signal, resolve, reject }));
      } };
      if (name === '@/components/ui/input') return { Input: 'Input' };
      if (name === '@/components/ui/button') return { Button: 'Button' };
      if (name === 'lucide-react') return { Search: 'Search', Loader2: 'Loader2', RefreshCw: 'RefreshCw' };
      throw Error('UNEXPECTED_IMPORT:' + name);
    },
  }, { timeout: 1000 });
  const render = () => { cursor = 0; tree = exports.NativeWineSearch97({ onSelectWine: (value: unknown) => selected.push(value) }); dirty = false; return tree; };
  const flush = () => {
    for (let i = 0; dirty || effects.length; i++) {
      assert(i < 20, 'Bounded render/commit');
      if (dirty) render();
      for (const effect of effects.splice(0)) {
        cells[effect.slot]?.cleanup?.();
        cells[effect.slot] = { deps: effect.deps, cleanup: effect.fn() };
      }
    }
  };
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); flush(); };
  const advance = async (ms: number) => {
    const target = now + ms;
    for (;;) {
      const next = [...timers].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      now = next[1].at; timers.delete(next[0]); next[1].fn(); await settle();
    }
    now = target; await settle();
  };
  const input = () => all(tree).find(n => n.type === 'Input')!;
  const edit = (value: string) => { input().props.onChange({ target: { value } }); flush(); };
  const rows = () => all(tree).filter(n => n.type === 'button');
  const auth = (id: string | null, loading = false) => { owner = id; authLoading = loading; dirty = true; flush(); };
  const unmount = () => { for (const cell of cells) cell?.cleanup?.(); mounted = false; };
  flush();
  return { requests, selected, edit, input, rows, auth, advance, settle, unmount, tree: () => tree, timers };
}

const checks: string[] = [];
const check = async (name: string, run: () => Promise<void> | void) => { await run(); checks.push(name); console.log('PASS', name); };

await check('Actual TSX waits300ms and never searches shorter-than2', async () => {
  const h = host(); h.edit(' a '); await h.advance(1000); assert.equal(h.requests.length, 0);
  h.edit('  Wine  '); await h.advance(299); assert.equal(h.requests.length, 0);
  await h.advance(1); assert.equal(h.requests.length, 1); h.unmount();
});
await check('Fixed actual resolver v75, catalogOnly true, limit10, trimmed query, AbortSignal; no owner/profile', async () => {
  const h = host(); h.edit('  Wine  '); await h.advance(300);
  assert.equal(h.requests[0].name, 'search-wines-v75');
  assert.equal(JSON.stringify(h.requests[0].body), JSON.stringify({ query: 'Wine', limit: 10, catalogOnly: true }));
  assert.equal(h.selected.length, 0); h.unmount();
});
await check('Rapid queries cancel old debounce, only latest request starts', async () => {
  const h = host(); h.edit('Wi'); await h.advance(150); h.edit('Wine'); await h.advance(299);
  assert.equal(h.requests.length, 0); await h.advance(1); assert.equal(h.requests.length, 1); assert.equal(h.requests[0].body.query, 'Wine'); h.unmount();
});
await check('Out-of-order aborted response cannot replace latest actual results', async () => {
  const h = host(); h.edit('First'); await h.advance(300); h.edit('Second'); assert(h.requests[0].signal.aborted);
  await h.advance(300); h.requests[1].resolve({ wines: [wine('Second')] }); await h.settle();
  h.requests[0].resolve({ wines: [wine('First')] }); await h.settle();
  assert(content(h.tree()).includes('Second')); assert(!content(h.tree()).includes('First')); h.unmount();
});
await check('New-query results and retained stale click handlers cannot select old wine', async () => {
  const h = host(); h.edit('First'); await h.advance(300); h.requests[0].resolve({ wines: [wine('First')] }); await h.settle();
  const oldClick = h.rows()[0].props.onClick; h.edit('Second'); assert.equal(h.rows().length, 0); oldClick(); assert.equal(h.selected.length, 0); h.unmount();
});
await check('Whitespace-only edit keeps valid same-trim request alive', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300); h.edit('Wine '); assert(!h.requests[0].signal.aborted);
  h.requests[0].resolve({ wines: [wine()] }); await h.settle(); assert.equal(h.rows().length, 1); assert.equal(h.requests.length, 1); h.unmount();
});
await check('Auth owner change aborts/discards old response and old selection', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300); h.requests[0].resolve({ wines: [wine('Owner A')] }); await h.settle();
  const oldClick = h.rows()[0].props.onClick; h.auth('owner-b'); assert(h.requests[0].signal.aborted); assert.equal(h.rows().length, 0);
  oldClick(); assert.equal(h.selected.length, 0); await h.advance(300); assert.equal(h.requests.length, 2); h.unmount();
});
await check('Auth change before unresolved old response never exposes foreign results', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300); h.auth('owner-b');
  h.requests[0].resolve({ wines: [wine('Foreign')] }); await h.settle(); assert.equal(h.rows().length, 0); assert(!content(h.tree()).includes('Foreign')); h.unmount();
});
await check('Resolved anonymous auth may search; loading auth cannot dispatch', async () => {
  const h = host(source, null, true); h.edit('Wine'); await h.advance(1000); assert.equal(h.requests.length, 0);
  h.auth(null, false); await h.advance(300); assert.equal(h.requests.length, 1); h.unmount();
});
await check('Unmount cancels pending debounce and active transport; late completion makes no writes', async () => {
  const a = host(); a.edit('Wine'); a.unmount(); await a.advance(1000); assert.equal(a.requests.length, 0);
  const b = host(); b.edit('Wine'); await b.advance(300); b.unmount(); assert(b.requests[0].signal.aborted);
  b.requests[0].resolve({ wines: [wine()] }); await b.settle();
});
await check('Empty response is no-results, not invented suggestions or automatic selection', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300); h.requests[0].resolve({ wines: [] }); await h.settle();
  assert(content(h.tree()).includes('No se encontraron vinos.')); assert.equal(h.rows().length, 0); assert.equal(h.selected.length, 0); h.unmount();
});
await check('Transport error stays local, hides raw error, retry is explicit and debounced', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300); h.requests[0].reject(Error('SYNTHETIC_SECRET')); await h.settle();
  assert(all(h.tree()).some(n => n.props.role === 'alert')); assert(!content(h.tree()).includes('SYNTHETIC_SECRET'));
  await h.advance(2000); assert.equal(h.requests.length, 1);
  all(h.tree()).find(n => n.type === 'Button')!.props.onClick(); await h.settle();
  await h.advance(299); assert.equal(h.requests.length, 1); await h.advance(1); assert.equal(h.requests.length, 2); assert(h.requests[0].signal.aborted); h.unmount();
});
await check('Malformed response becomes error instead of fake empty success', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300); h.requests[0].resolve({ wrong: [] }); await h.settle();
  assert(all(h.tree()).some(n => n.props.role === 'alert')); h.unmount();
});
await check('Selection is explicit, typed shape strips authority/affinity, clears results and blocks double old click', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300);
  h.requests[0].resolve({ wines: [{ ...wine(), affinity: 100, detailVerified: true, sensoryAttributes: { power: 5 } }] }); await h.settle();
  assert.equal(h.selected.length, 0); const click = h.rows()[0].props.onClick; click(); click(); await h.settle();
  assert.equal(h.selected.length, 1); assert.equal(h.input().props.value, ''); assert.equal(h.rows().length, 0);
  const selected = h.selected[0] as Record<string, unknown>; assert.equal(typeof selected.estilo, 'string');
  for (const key of ['affinity', 'detailVerified', 'sensoryAttributes', 'originalSheet']) assert(!(key in selected)); h.unmount();
});
await check('Accessible bounded input and inline full-name producer/vintage/region44-target results', async () => {
  const h = host(); assert.equal(h.input().props.maxLength, 240); assert.equal(h.input().props['aria-label'], 'Buscar vino o bodega');
  h.edit('x'.repeat(300)); await h.advance(300); assert.equal((h.requests[0].body.query as string).length, 240);
  const name = 'Nombre de vino muy largo sin truncar '.repeat(8); h.requests[0].resolve({ wines: [wine(name)] }); await h.settle();
  assert(content(h.tree()).includes(name.trim())); assert(content(h.tree()).includes('Bodega de prueba')); assert(content(h.tree()).includes('2021')); assert(content(h.tree()).includes('Region de prueba'));
  const list = all(h.tree()).find(n => n.type === 'ul')!; assert(!list.props.className.includes('absolute'));
  assert(h.rows()[0].props.className.includes('min-h-[44px]')); assert(!h.rows()[0].props.className.includes('truncate')); h.unmount();
});
await check('Invalid identities are not invented; duplicates dedup and response capped10', async () => {
  const h = host(); h.edit('Wine'); await h.advance(300);
  h.requests[0].resolve({ wines: [null, { name: 'Missing ID' }, { id: 'missing-name' }, ...Array.from({ length: 20 }, (_, i) => wine('Wine '+i, String(i))), wine('Duplicate', '0')] }); await h.settle();
  assert.equal(h.rows().length, 10); assert(!content(h.tree()).includes('Missing ID')); h.unmount();
});
await check('Directed mutations are caught by actual runtime contracts', async () => {
  const changed = source.replace('catalogOnly: true', 'catalogOnly: false'); assert.notEqual(changed, source);
  const h = host(changed); h.edit('Wine'); await h.advance(300); assert.throws(() => assert.equal(h.requests[0].body.catalogOnly, true)); h.unmount();
  const fast = source.replace('}, 300);', '}, 0);'); assert.notEqual(fast, source);
  const f = host(fast); f.edit('Wine'); await f.advance(299); assert.throws(() => assert.equal(f.requests.length, 0)); f.unmount();
  const noAbort = source.replaceAll('controller.abort()', 'undefined'); assert.notEqual(noAbort, source);
  const a = host(noAbort); a.edit('Wine'); await a.advance(300); a.unmount(); assert.throws(() => assert.equal(a.requests[0].signal.aborted, true));
});
console.log(JSON.stringify({ passed: checks.length, failed: 0, checks, directedMutantsRejected: 3,
  actualRemoteRequests: 0, actualIA: 0, actualSDK: 0, actualTSXExecuted: true,
  scope: 'Deterministic hook/commit/clock and fake transport tests on actual component; not DOM geometry/native runtime or live server catalogOnly verification.' }));
