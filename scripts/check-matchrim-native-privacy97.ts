import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { nativePrivacySections97, NATIVE_SCAN_PRIVACY_KEY97, NATIVE_SCAN_PROVIDER_NOTICE97 } from '../src/utils/nativePrivacy97';
import { restoreNativePrivacy97 } from './native-privacy97-scope.mjs';
import { restoreNativePolicy97 } from './native-policy97-scope.mjs';

type Element = { type: unknown; props: Record<string, any> };
const file = 'src/components/ScanPrivacyGate.tsx';
const source = readFileSync(file, 'utf8');
const baseline = execFileSync('git', ['show', `8327ee7:${file}`], { encoding: 'utf8' });
const checks: string[] = [];
const check = (name: string, run: () => void) => { run(); checks.push(name); };
const nodes = (node: any): Element[] => Array.isArray(node) ? node.flatMap(nodes)
  : node && typeof node === 'object' && node.props ? [node, ...nodes(node.props.children)] : [];
const text = (node: any): string => Array.isArray(node) ? node.map(text).join('')
  : node && typeof node === 'object' && node.props ? text(node.props.children) : typeof node === 'string' ? node : '';
function host(code: string, native: boolean, initial: Record<string, string> = {}, storageError = false) {
  const cells: any[] = [], storage = new Map(Object.entries(initial)), writes: string[][] = [], reads: string[] = [], effects: (() => void)[] = [];
  let cursor = 0;
  const exports: Record<string, any> = {};
  const jsx = (type: unknown, props: any) => ({ type, props });
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports, console: { warn() {} }, window: { scrollTo() {}, localStorage: {
      getItem(key: string) { reads.push(key); if (storageError) throw Error('Denied'); return storage.get(key) ?? null; },
      setItem(key: string, value: string) { writes.push([key, value]); if (storageError) throw Error('Denied'); storage.set(key, value); },
    } }, require(name: string) {
      if (name === 'react') return {
        useState(value: any) { const i = cursor++; if (!(i in cells)) cells[i] = typeof value === 'function' ? value() : value; return [cells[i], (next: any) => { cells[i] = next; }]; },
        useRef(value: any) { const i = cursor++; cells[i] ??= { current: value }; return cells[i]; },
        useLayoutEffect(fn: () => void) { cursor++; effects.push(fn); },
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (name === '@/utils/nativePrivacy97') return { NATIVE_SCAN_PRIVACY_KEY97, NATIVE_SCAN_PROVIDER_NOTICE97 };
      if (name === 'lucide-react') return Object.fromEntries(['BrainCircuit', 'Camera', 'ShieldCheck', 'Trash2'].map(key => [key, key]));
      if (name === 'react-router-dom') return { Link: 'Link' };
      if (name.endsWith('/button')) return { Button: 'Button' };
      if (name.endsWith('/checkbox')) return { Checkbox: 'Checkbox' };
      throw Error('Unexpected dependency ' + name);
    }, fetch() { throw Error('No network allowed'); },
  });
  let tree: Element;
  const render = () => { cursor = 0; tree = exports.ScanPrivacyGate({ children: jsx('Scanner', { children: 'Scanner child' }) }); return tree; };
  render();
  return { render, reads, writes, storage, action: () => nodes(tree).find(node => node.type === 'Button')!,
    checkbox: () => nodes(tree).find(node => node.type === 'Checkbox')!, tree: () => tree };
}

check('Strict source inverse preserves every unrelated byte', () => assert.equal(restoreNativePrivacy97(source), baseline));
check('Existing web v2 states and rendered trees remain exact', () => {
  for (const initial of [{}, { 'matchrim.scan_privacy_notice.v2': 'accepted' }]) {
    const old = host(baseline, false, initial), current = host(source, false, initial);
    assert.deepEqual(JSON.parse(JSON.stringify(current.tree())), JSON.parse(JSON.stringify(old.tree())));
    assert.deepEqual(current.reads, old.reads);
  }
});
check('Native v2 acknowledgement cannot silently accept the changed provider notice', () => {
  const h = host(source, true, { 'matchrim.scan_privacy_notice.v2': 'accepted' });
  assert.equal(h.tree().type, 'section'); assert.equal(h.action().props.disabled, true);
  assert.equal(h.reads[0], NATIVE_SCAN_PRIVACY_KEY97); assert(text(h.tree()).includes('OpenAI'));
});
check('Native new acknowledgement persists only after explicit checkbox true', () => {
  const h = host(source, true);
  h.action().props.onClick(); assert.equal(h.writes.length, 0);
  h.checkbox().props.onCheckedChange('indeterminate'); h.render(); h.action().props.onClick(); assert.equal(h.writes.length, 0);
  h.checkbox().props.onCheckedChange(true); h.render(); h.action().props.onClick(); h.render();
  assert.deepEqual(h.writes, [[NATIVE_SCAN_PRIVACY_KEY97, 'accepted']]); assert.equal(text(h.tree()), 'Scanner child');
  assert.equal(h.storage.has('matchrim.scan_privacy_notice.v2'), false);
});
check('Older native provider-only acknowledgement does not silently accept the local-mode notice', () => {
  const h = host(source, true, { 'matchrim.scan_privacy_notice.openai.v3': 'accepted' });
  assert.equal(h.tree().type, 'section'); assert.equal(h.action().props.disabled, true);
  assert(text(h.tree()).includes('Apple Vision')); assert(text(h.tree()).includes('la foto no se envía'));
});
check('Previously accepted native v3 and denied storage fail safely', () => {
  assert.equal(text(host(source, true, { [NATIVE_SCAN_PRIVACY_KEY97]: 'accepted' }).tree()), 'Scanner child');
  assert.equal(host(source, true, {}, true).tree().type, 'section');
});
check('Native policy changes only provider explanation without modifying source/web sections', () => {
  const sections = [{ title: 'Datos', items: ['Keep'] }, { title: 'Servicios y encargados', items: ['Supabase', 'Old provider', 'TLS'] }];
  const copy = JSON.stringify(sections), result = nativePrivacySections97(sections);
  assert.equal(JSON.stringify(sections), copy); assert.equal(result[0], sections[0]);
  assert.equal(result[1].items[0], 'Supabase'); assert.equal(result[1].items[2], 'TLS');
  assert(result[1].items[1].includes('OpenAI')); assert(!result[1].items[1].includes('Gemini'));
});
check('Full policy web render tree is exact; native render names the active provider', () => {
  const policyFile = 'src/pages/PrivacyPolicy.tsx';
  const render = (code: string, native: boolean) => {
    const exports: Record<string, any> = {};
    const jsx = (type: unknown, props: any) => ({ type, props });
    vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
      exports, require(name: string) {
        if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
        if (name === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
        if (name === '@/utils/nativePrivacy97') return { nativePrivacySections97 };
        if (name === 'react-router-dom') return { Link: 'Link' };
        if (name === 'lucide-react') return { ArrowLeft: 'ArrowLeft', Mail: 'Mail', ShieldCheck: 'ShieldCheck' };
        if (name === '@/components/Header') return { default: 'Header' };
        if (name.endsWith('/button')) return { Button: 'Button' };
        throw Error('Unexpected policy dependency ' + name);
      },
    });
    return exports.default();
  };
  const current = readFileSync(policyFile, 'utf8');
  const prior = execFileSync('git', ['show', `8327ee7:${policyFile}`], { encoding: 'utf8' });
  assert.deepEqual(JSON.parse(JSON.stringify(render(current, false))), JSON.parse(JSON.stringify(render(prior, false))));
  const nativeText = text(render(current, true));
  assert(nativeText.includes('OpenAI')); assert(!nativeText.includes('Gemini'));
  assert(nativeText.includes('21 de octubre de 2026'));
});
check('Native legal safe areas preserve the whole legacy policy and reject unrelated edits', () => {
  const policyFile = 'src/pages/PrivacyPolicy.tsx';
  const current = readFileSync(policyFile, 'utf8');
  const prior = execFileSync('git', ['show', `8327ee7:${policyFile}`], { encoding: 'utf8' });
  assert.equal(restoreNativePolicy97(policyFile, current), prior);
  assert.throws(() => restoreNativePolicy97(policyFile, current.replace('8rem+var(--matchrim-safe-bottom)', '7rem+var(--matchrim-safe-bottom)')));
  assert.throws(() => restoreNativePolicy97(policyFile, current.replace('Winerim es el responsable', 'Another company is responsible')));
});
check('Consent, storage key and visible provider mutations are rejected by inverse', () => {
  for (const [from, to] of [['if (!checked) return;', 'if (false) return;'], ['NATIVE_SCAN_PROVIDER_NOTICE97 :', "'Other' :"], ['h-[44px] w-[44px]', 'h-[43px] w-[43px]'], ["ACKNOWLEDGEMENT_KEY, 'accepted'", "ACKNOWLEDGEMENT_KEY, 'wrong'"]]) {
    assert(source.includes(from)); assert.throws(() => restoreNativePrivacy97(source.replace(from, to)));
  }
});
console.log(JSON.stringify({ passed: checks.length, failed: 0, checks, networkCalls: 0,
  scope: 'Actual component in offline hook host and native-only policy contract; not UIKit or legal compliance certification.' }));
