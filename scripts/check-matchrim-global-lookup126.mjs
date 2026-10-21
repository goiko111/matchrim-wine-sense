import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), ts = require('typescript'), React = require('react');
const source = fs.readFileSync('src/components/wine-import/NativeGlobalCatalogue103.tsx', 'utf8');
const walk = node => Array.isArray(node) ? node.flatMap(walk) : React.isValidElement(node)
  ? [node, ...walk(node.props.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : React.isValidElement(node)
  ? text(node.props.children) : typeof node === 'string' ? node : '';
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function host(lookup) {
  const state = [], refs = [], effects = [], pending = new Map(), confirmations = [], loading = [];
  let cursor = 0, mounted = true, lateWrites = 0;
  const callbacks = owner => ({ onVerified: wine => confirmations.push({ owner, wine }),
    onLoadingChange: value => loading.push({ owner, value }) });
  const props = { candidate: { name: 'Synthetic Cuvee', producer: 'Synthetic Estate', source: 'label' },
    contextKey: 'A', disabled: false, ...callbacks('A') };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX,
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, AbortController, console,
    require(name) {
      if (name === 'react/jsx-runtime') return require(name);
      if (name === 'react') return {
        useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial;
          return [state[i], value => { if (!mounted) lateWrites++; state[i] = value; }]; },
        useRef(initial) { const i = cursor++; return refs[i] ||= { current: initial }; },
        useEffect(work, deps) { const i = cursor++, old = effects[i];
          if (!old || deps.some((value, j) => value !== old.deps[j])) pending.set(i, { work, deps }); },
      };
      if (name === 'lucide-react') return Object.fromEntries(['BookOpen', 'Check', 'Loader2', 'Search', 'X'].map(k => [k, k]));
      if (name === 'react-router-dom') return { Link: 'a' };
      if (name.endsWith('/button')) return { Button: 'button' };
      if (name.endsWith('/input')) return { Input: 'input' };
      if (name.endsWith('/nativeCatalogAdmission97')) return { canAdmitNativeCatalogLookup97: () => true };
      if (name.endsWith('/nativeGlobalCatalogue103')) return { lookupGlobalCatalogue103: lookup };
      if (name.endsWith('/wineAffinityExplanation')) return {};
      throw Error('UNEXPECTED_IMPORT:' + name);
    },
  });
  const render = () => { cursor = 0; return exports.GlobalWineLookup103(props); };
  const flush = () => {
    for (const [i, next] of pending) { effects[i]?.cleanup?.(); effects[i] = { deps: next.deps, cleanup: next.work() }; }
    pending.clear();
  };
  const button = name => { const node = walk(render()).find(n => n.type === 'button' && text(n).trim() === name); assert(node, name); return node.props; };
  render(); flush();
  return { props, render, flush, button, confirmations, loading, callbacks,
    unmount: () => { mounted = false; pending.clear(); effects.forEach(e => e?.cleanup?.()); },
    lateWrites: () => lateWrites };
}
const start = h => h.button('Buscar ficha en Winerim').onClick();
let groups = 0;
const test = async (name, work) => { await work(); groups++; console.log('PASS ' + name); };
await test('Rendering performs no query, and current explicit lookup settles once', async () => {
  const d = deferred(); let calls = 0;
  const h = host(() => { calls++; return d.promise; }); assert.equal(calls, 0);
  start(h); start(h); assert.equal(calls, 1);
  d.resolve({ status: 'exact', wine: { id: 'current' } }); await tick();
  assert.deepEqual(h.confirmations, [{ owner: 'A', wine: { id: 'current' } }]);
  assert.deepEqual(h.loading, [{ owner: 'A', value: true }, { owner: 'A', value: false }]); h.unmount();
});
await test('New context render vetoes old success before passive-effect cleanup', async () => {
  const d = deferred(), h = host(() => d.promise); start(h);
  Object.assign(h.props, { contextKey: 'B', ...h.callbacks('B') }); h.render();
  d.resolve({ status: 'exact', wine: { id: 'old' } }); await tick();
  assert.deepEqual(h.confirmations, [], 'Old result must not invoke the new context callback');
  assert(!h.loading.some(row => row.owner === 'B'), 'Old loading completion belongs to old context');
  h.flush(); h.unmount();
});
await test('Disabled render vetoes success before abort effect runs', async () => {
  const d = deferred(), h = host(() => d.promise); start(h);
  h.props.disabled = true; h.render();
  d.resolve({ status: 'exact', wine: { id: 'old' } }); await tick();
  assert.deepEqual(h.confirmations, []); h.flush(); h.unmount();
});
await test('Old failure cannot write an error into the new context before cleanup', async () => {
  const d = deferred(), h = host(() => d.promise); start(h);
  Object.assign(h.props, { contextKey: 'B', ...h.callbacks('B') }); h.render();
  d.reject(Error('old failure')); await tick();
  assert(!text(h.render()).includes('No se ha podido consultar Winerim.')); h.flush(); h.unmount();
});
await test('Cancellation rejects a transport result even if it ignores AbortSignal', async () => {
  const d = deferred(); let signal;
  const h = host((_candidate, value) => { signal = value; return d.promise; }); start(h);
  h.button('Cancelar').onClick(); assert(signal.aborted);
  d.resolve({ status: 'exact', wine: { id: 'cancelled' } }); await tick();
  assert.deepEqual(h.confirmations, []); assert(text(h.render()).includes('Búsqueda cancelada.')); h.unmount();
});
await test('Old late completion cannot clear the newer request or its loading state', async () => {
  const a = deferred(), b = deferred(); let calls = 0;
  const h = host(() => (++calls === 1 ? a.promise : b.promise)); start(h);
  Object.assign(h.props, { contextKey: 'B', ...h.callbacks('B') }); h.render(); h.flush(); start(h);
  const before = [...h.loading]; a.resolve({ status: 'exact', wine: { id: 'old' } }); await tick();
  assert.deepEqual(h.loading, before); assert.equal(h.button('Buscar ficha en Winerim').disabled, true);
  b.resolve({ status: 'reference', wine: { id: 'new' } }); await tick();
  assert.deepEqual(h.confirmations, [{ owner: 'B', wine: { id: 'new' } }]); h.unmount();
});
await test('Unmount prevents stale state, confirmation and duplicate loading completion', async () => {
  const d = deferred(), h = host(() => d.promise); start(h); h.unmount();
  d.resolve({ status: 'exact', wine: { id: 'old' } }); await tick();
  assert.deepEqual(h.confirmations, []); assert.equal(h.lateWrites(), 0);
  assert.deepEqual(h.loading, [{ owner: 'A', value: true }, { owner: 'A', value: false }]);
});
console.log(JSON.stringify({ groups, realNetworkCalls: 0, modelStarts: 0,
  scope: 'Actual native TSX lookup handlers with explicitly deferred React effects and controlled transport; not browser/native UI approval.' }));
