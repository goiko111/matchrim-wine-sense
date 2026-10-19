import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
const file = 'src/components/ScanPrivacyGate.tsx';
const base = execFileSync('git', ['show', '26d48c6b5661c9236f3bdd97fe6b81587361caeb:' + file], { cwd: root, encoding: 'utf8' });
const sha = value => createHash('sha256').update(value).digest('hex');
const refsAndEffect = `  const justAcceptedRef = useRef(false);

  useLayoutEffect(() => {
    if (!isNative || !accepted || !justAcceptedRef.current) return;
    justAcceptedRef.current = false;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [accepted, isNative]);
`;
export function restoreNativeConsentEntry96(s) {
  if (s === base) return s;
  assert(s.includes(refsAndEffect));
  return s.replace("import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';", "import { useState, type ReactNode } from 'react';")
    .replace(refsAndEffect, '').replace('    justAcceptedRef.current = isNative;\n', '');
}

export function runNativeConsentEntry96() {
  const candidate = fs.readFileSync(path.join(root, file), 'utf8');
  assert.equal(sha(candidate), '53a8d4e250e9c8e772566e9d525a2f0ca3e121e899fabf0164a46a80f88f5528', 'Exact approved product hook');
  assert.equal(restoreNativeConsentEntry96(candidate), base);
  const checks = [];
  const check = (id, ok) => { assert(ok, id); checks.push({ id, passed: true }); };
  check('whole-product-inverse-only-import-ref-layout-effect-explicit-handler-mark', true);
  check('all-JSX-web-native-key-checkbox-storage-and-network-byteexact-by-inverse', true);
  check('all-hooks-before-accepted-early-return', candidate.indexOf('useLayoutEffect(() =>') < candidate.indexOf('if (accepted) return'));
  const js = s => ts.transpileModule(s, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  }, reportDiagnostics: true });
  check('product-transpile-no-syntax-errors', !(js(candidate).diagnostics || []).some(d => d.category === ts.DiagnosticCategory.Error));
  
  // Actual component code; hooks/storage/commit scheduling are explicit offline doubles, not a DOM or WK renderer.
  function harness(source, { native, stored = null, getThrows = false, setThrows = false }) {
    const cells = [], calls = [], effects = [];
    let i = 0, tree;
    const hooks = {
      useState(init) { const k = i++; if (!(k in cells)) cells[k] = typeof init === 'function' ? init() : init;
        return [cells[k], value => { cells[k] = value; }]; },
      useRef(init) { const k = i++; if (!(k in cells)) cells[k] = { current: init }; return cells[k]; },
      useLayoutEffect(fn, deps) { const k = i++, previous = cells[k];
        if (!previous || deps.some((value, n) => !Object.is(value, previous[n]))) effects.push(fn);
        cells[k] = deps; },
    };
    const jsx = (type, props) => ({ type: typeof type === 'symbol' ? 'Fragment' : type, props });
    const sandbox = vm.createContext({ exports: {}, console: { warn() {} },
      window: { localStorage: { getItem(key) { calls.push(['get', key]); if (getThrows) throw new Error('OFFLINE_GET'); return stored; },
        setItem(key, value) { calls.push(['set', key, value]); if (setThrows) throw new Error('OFFLINE_SET'); stored = value; } },
      scrollTo(options) { calls.push(['scroll', JSON.parse(JSON.stringify(options)), tree]); } },
      fetch() { throw new Error('NETWORK_DENIED'); },
      require(specifier) {
        if (specifier === 'react') return hooks;
        if (specifier === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: Symbol.for('Fragment') };
        if (specifier === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
        if (specifier === 'lucide-react') return Object.fromEntries(['BrainCircuit', 'Camera', 'ShieldCheck', 'Trash2'].map(k => [k, k]));
        if (specifier === 'react-router-dom') return { Link: 'Link' };
        if (specifier === '@/components/ui/button') return { Button: 'Button' };
        if (specifier === '@/components/ui/checkbox') return { Checkbox: 'Checkbox' };
        throw new Error('IMPORT_DENIED:' + specifier);
      },
    });
    vm.runInContext(js(source).outputText, sandbox, { timeout: 1000 });
    const child = { type: 'ScannerSentinel', props: { knownFixture: true } };
    const h = { calls, render() { i = 0; tree = sandbox.exports.ScanPrivacyGate({ children: child }); return tree; },
      commit() { const pending = effects.splice(0); pending.forEach(fn => fn()); return pending; },
      tree: () => tree, setNative(value) { native = value; } };
    return h;
  }
  function find(node, type) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === type) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) { const found = find(child, type); if (found) return found; }
    return null;
  }
  const snap = node => JSON.parse(JSON.stringify(node));
  function accept(h) {
    const checkbox = find(h.tree(), 'Checkbox'); checkbox.props.onCheckedChange(true);
    h.render(); h.commit();
    find(h.tree(), 'Button').props.onClick();
  }
  for (const native of [false, true]) {
    const old = harness(base, { native }), next = harness(candidate, { native });
    check('initial-output-identical-' + native, JSON.stringify(snap(old.render())) === JSON.stringify(snap(next.render())));
    old.commit(); next.commit();
    check('no-initial-scroll-' + native, !next.calls.some(c => c[0] === 'scroll'));
    find(next.tree(), 'Button').props.onClick(); next.render(); next.commit();
    check('unchecked-direct-handler-cannot-accept-or-scroll-' + native, next.tree().type === 'section' && !next.calls.some(c => c[0] === 'scroll'));
    accept(old); accept(next);
    check('no-precommit-scroll-' + native, !next.calls.some(c => c[0] === 'scroll'));
    check('persist-unchanged-' + native, JSON.stringify(next.calls.filter(c => c[0] === 'set')) === JSON.stringify(old.calls.filter(c => c[0] === 'set')));
    check('children-commit-output-identical-' + native, JSON.stringify(snap(old.render())) === JSON.stringify(snap(next.render())));
    old.commit(); const replay = next.commit();
    const scrolls = next.calls.filter(c => c[0] === 'scroll');
    check('only-explicit-native-commit-scrolls-' + native, scrolls.length === (native ? 1 : 0));
    if (native) {
      check('scroll-is-after-children-commit', scrolls[0][2].type === 'Fragment' && !!find(scrolls[0][2], 'ScannerSentinel'));
      check('same-existing-Scan-scrolltop-options', JSON.stringify(scrolls[0][1]) === JSON.stringify({ top: 0, left: 0, behavior: 'auto' }));
      replay.forEach(fn => fn());
      check('strict-effect-replay-consumed-once', next.calls.filter(c => c[0] === 'scroll').length === 1);
    }
    next.render(); next.commit();
    check('unrelated-rerender-does-not-reset-' + native, next.calls.filter(c => c[0] === 'scroll').length === (native ? 1 : 0));
  }
  for (const native of [true, false]) {
    const h = harness(candidate, { native, stored: 'accepted' }); h.render(); h.commit();
    check('initial-already-accepted-mount-no-reset-' + native, !!find(h.tree(), 'ScannerSentinel') && !h.calls.some(c => c[0] === 'scroll'));
  }
  const storageFail = harness(candidate, { native: true, setThrows: true }); storageFail.render(); storageFail.commit(); accept(storageFail);
  storageFail.render(); storageFail.commit();
  check('storage-write-failure-keeps-original-accept-behaviour-and-native-scroll', !!find(storageFail.tree(), 'ScannerSentinel') && storageFail.calls.filter(c => c[0] === 'scroll').length === 1);
  const getFail = harness(candidate, { native: true, getThrows: true }); getFail.render(); getFail.commit();
  check('storage-read-failure-keeps-notice-and-does-not-scroll', getFail.tree().type === 'section' && !getFail.calls.some(c => c[0] === 'scroll'));
  for (const value of [false, 'indeterminate']) {
    const h = harness(candidate, { native: true }); h.render(); h.commit(); find(h.tree(), 'Checkbox').props.onCheckedChange(value);
    h.render(); find(h.tree(), 'Button').props.onClick(); h.render(); h.commit();
    check('checkbox-not-exact-true-cannot-accept-' + value, h.tree().type === 'section' && !h.calls.some(c => c[0] === 'scroll'));
  }
  const webThenNative = harness(candidate, { native: false }); webThenNative.render(); webThenNative.commit(); accept(webThenNative);
  webThenNative.render(); webThenNative.commit(); webThenNative.setNative(true); webThenNative.render(); webThenNative.commit();
  check('no-retroactive-native-reset-after-web-accept', !webThenNative.calls.some(c => c[0] === 'scroll'));
  for (const [id, mutate] of [
    ['initial-ref-armed', s => s.replace('useRef(false)', 'useRef(true)')],
    ['web-reset', s => s.replace('!isNative || !accepted', '!accepted')],
    ['replay-not-consumed', s => s.replace('justAcceptedRef.current = false;', 'justAcceptedRef.current = true;')],
    ['storage-key-change', s => s.replace('scan_privacy_notice.v2', 'scan_privacy_notice.v3')],
    ['unchecked-bypass', s => s.replace('if (!checked) return;', 'if (false) return;')],
  ]) {
    let rejected = false; try { assert.equal(restoreNativeConsentEntry96(mutate(candidate)), base); } catch { rejected = true; }
    check('product-source-negative-' + id, rejected);
  }
  
  
  return { passed: checks.length, failed: 0, checks, whole26Inverse: true,
    legacyWebAndJSXExact: true, actualComponentWithOfflineHookCommitDoubles: true,
    inheritedFrom: 'E explicit-consent product controls only; no private caller/path dependency',
    scope: 'No React DOM, browser, UIKit, provider or owner-account claim.', SDK: 0, external: 0 };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(runNativeConsentEntry96()));
