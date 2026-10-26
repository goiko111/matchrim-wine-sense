import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { execFileSync } from 'node:child_process';
import { resolveMasterCandidate259, nativeMasterLink259, masterAffinityGap259 } from '../src/utils/nativeMasterLink259.ts';
import { buildAuthRedirectPath } from '../src/utils/navigation.ts';

const source = fs.readFileSync('src/components/wine-import/NativeMasterLookup259.tsx', 'utf8');
const root = 'qa-artifacts/master253-20261026/hosted-six-r1';
const payload = file => JSON.parse(fs.readFileSync(`${root}/${file}`, 'utf8'));
const input = { id: 'ui259', name: 'La Migratoria', producer: 'Bodegas Frontonio', vintage: 2023,
  region: null, country: null, grapes: [], alcohol: null, confidence: .9, source: 'label',
  evidence: ['La Migratoria', 'Bodegas Frontonio', '2023'], uncertaintyReasons: [], inferredFields: [] };
const flat = node => node && typeof node === 'object' ? [node, ...[node.props?.children].flat(Infinity).flatMap(flat)] : [];
const text = node => typeof node === 'string' ? node : node && typeof node === 'object'
  ? [node.props?.children].flat(Infinity).map(text).join(' ') : '';
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
const harness = (invoke, patch = {}) => {
  const cells = [], effects = [], confirmed = [];
  let index = 0, tree, props = { candidate: input, contextKey: 'one', ownerId: 'SYNTHETIC-OWNER259', disabled: false,
    invoke, onConfirmed: value => confirmed.push(value), fallback: 'PUBLIC_FALLBACK259', ...patch };
  const hooks = {
    useState(initial) { const k = index++; if (!(k in cells)) cells[k] = initial;
      return [cells[k], value => { cells[k] = typeof value === 'function' ? value(cells[k]) : value; }]; },
    useRef(initial) { const k = index++; return cells[k] ??= { current: initial }; },
    useEffect(fn, deps) { const k = index++, previous = cells[k];
      if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) {
        effects.push(() => { previous?.cleanup?.(); cells[k] = { deps, cleanup: fn() }; });
      }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const mod = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: mod.exports, module: mod, AbortController,
    require: name => name === 'react' ? hooks : name === 'react/jsx-runtime' ? { jsx, jsxs: jsx, Fragment: 'Fragment' }
      : name === 'lucide-react' ? Object.fromEntries(['BookOpen', 'Check', 'Loader2', 'X'].map(value => [value, value]))
        : name === '@/components/ui/button' ? { Button: 'Button' }
          : name === 'react-router-dom' ? { Link: 'Link' }
            : name === '@/utils/navigation' ? { buildAuthRedirectPath }
          : name === '@/utils/nativeMasterLink259' ? { resolveMasterCandidate259, nativeMasterLink259, masterAffinityGap259 }
            : (() => { throw Error('UNEXPECTED_IMPORT:' + name); })(),
  }, { timeout: 1000 });
  const h = {
    confirmed,
    render(next = {}) { props = { ...props, ...next }; index = 0; tree = mod.exports.NativeMasterLookup259(props); return tree; },
    commit() { effects.splice(0).forEach(fn => fn()); },
    button(label) { return flat(tree).find(node => node.type === 'Button' && text(node).trim() === label); },
    nodes() { return flat(tree); }, tree() { return tree; },
    unmount() { cells.forEach(value => value?.cleanup?.()); },
    reference: candidate => mod.exports.NativeMasterReference259({ candidate }),
  };
  h.render(); h.commit(); h.render();
  return h;
};
const transport = () => {
  const calls = [];
  return { calls, invoke: async operation => { calls.push(operation); return payload(operation.operation === 'search' ? '02-BODY.json' : '03-BODY.json'); } };
};
let passed = 0;
const check = async (name, work) => { await work(); passed++; console.log('PASS', name); };
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('MASTER259_UI_NO_EXTERNAL_NETWORK'); };
try {
  await check('Mount/rerender/secondary disclosure never starts a lookup or confirms a wine', async () => {
    const t = transport(), h = harness(t.invoke);
    h.render(); h.commit(); h.render();
    assert.equal(t.calls.length, 0); assert.equal(h.confirmed.length, 0);
    assert.equal(h.nodes().find(node => node.type === 'details').props.open, undefined);
    assert(h.button('Buscar este vino en Winerim'));
  });
  await check('Explicit search shows a proposal but no automatic confirmation; only explicit choice changes candidate', async () => {
    const t = transport(), h = harness(t.invoke);
    h.button('Buscar este vino en Winerim').props.onClick(); h.render(); await tick(); h.render();
    assert.equal(t.calls.length, 2); assert.equal(h.confirmed.length, 0);
    const choose = h.button('Esta es mi referencia'); assert(choose); choose.props.onClick();
    assert.equal(h.confirmed.length, 1); assert(nativeMasterLink259(h.confirmed[0]));
    const view = h.reference(h.confirmed[0]);
    assert(text(view).includes('Winerim tiene esta referencia'));
    assert(text(view).includes('2023')); assert(!text(view).includes('%'));
    assert.equal(flat(view).filter(node => node.type === 'a').length, 0);
  });
  await check('Anonymous or missing-producer fallback makes zero authenticated catalogue requests', () => {
    for (const patch of [{ ownerId: null }, { candidate: { ...input, producer: null } }]) {
      const t = transport(), h = harness(t.invoke, patch);
      assert(text(h.tree()).includes('PUBLIC_FALLBACK259')); assert.equal(t.calls.length, 0);
      assert(!h.button('Buscar este vino en Winerim'));
      if (patch.ownerId === null) {
        const link = h.nodes().find(node => node.type === 'Link'); assert(link);
        assert.equal(link.props.to, buildAuthRedirectPath('/escanear/etiqueta'));
        assert(text(h.tree()).includes('requiere una sesión'));
      }
    }
  });
  await check('Double click while pending starts one lookup; Cancel settles without retry or candidate changes', async () => {
    let calls = 0;
    const h = harness(async () => { calls++; return new Promise(() => {}); });
    const search = h.button('Buscar este vino en Winerim'); search.props.onClick(); search.props.onClick(); h.render();
    assert.equal(calls, 1); h.button('Cancelar búsqueda').props.onClick(); await tick(); h.render();
    assert(text(h.tree()).includes('Búsqueda cancelada')); assert.equal(h.confirmed.length, 0); assert.equal(calls, 1);
  });
  await check('Account/context/disabled changes invalidate pending result and abort owned work', async () => {
    for (const patch of [{ ownerId: 'OTHER-SYNTHETIC259' }, { contextKey: 'other-region' }, { disabled: true }]) {
      let complete, signal;
      const h = harness(async (_operation, current) => { signal = current; return new Promise(resolve => { complete = resolve; }); });
      h.button('Buscar este vino en Winerim').props.onClick(); h.render(patch); h.commit();
      complete(payload('02-BODY.json')); await tick(); h.render();
      assert(signal.aborted); assert.equal(h.confirmed.length, 0); assert(!h.button('Esta es mi referencia'));
    }
  });
  await check('Even before effects run, stale proposal cannot be applied to another user or region', async () => {
    for (const patch of [{ ownerId: 'OTHER' }, { contextKey: 'other' }, { disabled: true }]) {
      const h = harness(transport().invoke);
      h.button('Buscar este vino en Winerim').props.onClick(); await tick(); h.render();
      const stale = h.button('Esta es mi referencia'); assert(stale);
      h.render(patch); stale.props.onClick(); assert.equal(h.confirmed.length, 0);
    }
  });
  await check('Unmount cancels owned request; transport error exposes no private detail or automatic retry', async () => {
    let signal;
    const pending = harness(async (_operation, value) => { signal = value; return new Promise(() => {}); });
    pending.button('Buscar este vino en Winerim').props.onClick(); pending.unmount(); await tick(); assert(signal.aborted);
    let calls = 0;
    const h = harness(async () => { calls++; throw Error('PRIVATE_BACKEND_DETAIL259'); });
    h.button('Buscar este vino en Winerim').props.onClick(); await tick(); h.render();
    assert.equal(calls, 1); assert(text(h.tree()).includes('No se ha podido consultar'));
    assert(!text(h.tree()).includes('PRIVATE_BACKEND_DETAIL259')); assert.equal(h.confirmed.length, 0);
  });
  await check('New master lookup exists only inside the native guarded primary view; scanner web JSX stays unchanged', () => {
    const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
    const current = fs.readFileSync(file, 'utf8');
    const previous = execFileSync('git', ['show', `c4f9e37:${file}`], { encoding: 'utf8' });
    const slice = value => value.slice(value.indexOf('                {isNative && selectedCandidate && <LabelAnalysisView'),
      value.indexOf('                {isNative && selectedCandidate && nativeConsumer?.canExplainAffinity'));
    const nativeBlock = slice(current), oldNativeBlock = slice(previous);
    assert(nativeBlock.includes('<NativeMasterLookup259'));
    const stripImports = value => value.split('\n').filter(line => !line.includes('NativeMasterLookup259')
      && !line.includes("from '@/utils/nativeMasterLink259'") && !line.includes("from '@/utils/cellarMasterReference260'"))
      .join('\n').replace('          const masterReference = isNative ? makeCellarMasterReference260(candidate) : null;\n', '')
      .replace('const details = evidence || publicReference || masterReference ?', 'const details = evidence || publicReference ?')
      .replace('              ...(masterReference ? { winerim_master_reference260: masterReference } : {}),\n', '');
    assert(stripImports(current.replace(nativeBlock, oldNativeBlock)).trimEnd() === previous.trimEnd(),
      'Only native guarded primary-view code and its two imports may change');
    assert(nativeBlock.includes("status: 'recognized'"));
    assert(nativeBlock.includes('onConfirmed={confirmed =>'));
  });
  console.log(JSON.stringify({ passed, failed: 0, externalCalls: 0, actualUiCodeControlledHooks: true,
    realBrowserOrWKLayout: false, liveUsers: 0, automaticConfirmations: 0, webJsxChanged: false }));
} finally { globalThis.fetch = previousFetch; }
