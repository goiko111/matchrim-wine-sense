import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { cva } from 'class-variance-authority';
import { cn } from '../src/lib/utils';
import postcss from 'postcss';

type Node95 = { type: string; props: Record<string, unknown> };
const load = (native: boolean, baseline = false) => {
  const path = 'src/components/ui/toast.tsx';
  const source = baseline ? execFileSync('git', ['show', `c25b282:${path}`], { encoding: 'utf8' }) : readFileSync(path, 'utf8');
  const component = (name: string) => Object.assign(() => {}, { displayName: name });
  const primitives = new Proxy({}, { get: (_, name) => component(String(name)) });
  const jsx = (type: string | { displayName: string }, props: Record<string, unknown>): Node95 => ({
    type: typeof type === 'string' ? type : type.displayName, props,
  });
  const sandbox = { exports: {}, require: (id: string) => {
    if (id === 'react') return { forwardRef: (render: (props: unknown, ref: unknown) => Node95) => (props: unknown) => render(props, null) };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@radix-ui/react-toast') return primitives;
    if (id === 'class-variance-authority') return { cva };
    if (id === '@/lib/utils') return { cn };
    if (id === 'lucide-react') return { X: component('X') };
    if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
    throw new Error('Unexpected dependency ' + id);
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, sandbox);
  return sandbox.exports as Record<string, (props: Record<string, unknown>) => Node95>;
};
const shape = (value: unknown): unknown => {
  if (Array.isArray(value)) return Array.from(value).map(shape);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([, child]) => child !== undefined).map(([key, child]) => [key, shape(child)]));
  return typeof value === 'function' ? '[handler]' : value;
};
let groups = 0;
const check = (name: string, run: () => void) => { run(); groups++; console.log('PASS', name); };
check('Legacy web toast elements and caller overrides remain identical to the source baseline', () => {
  const old = load(false, true), current = load(false);
  for (const name of ['ToastViewport', 'Toast', 'ToastAction', 'ToastClose', 'ToastTitle', 'ToastDescription']) {
    for (const props of [{}, { className: 'caller-control', 'aria-label': 'Caller label', variant: 'destructive', children: 'Control' }]) {
      assert.deepEqual(shape(current[name](props)), shape(old[name](props)), name);
    }
  }
});
check('Native close is visible, labelled and physically stable at 44px independently of root text size', () => {
  const node = load(true).ToastClose({});
  assert.equal(node.props['aria-label'], 'Cerrar aviso');
  assert.equal(node.props.title, 'Cerrar aviso');
  assert.match(String(node.props.className), /h-\[44px\].*w-\[44px\]/);
  assert.ok(!String(node.props.className).includes('opacity-0'));
  assert.match(String((node.props.children as Node95).props.className), /20px/);
});
check('Native toast viewport respects safe areas and text has reserved close-button space', () => {
  const subject = load(true);
  assert.match(String(subject.ToastViewport({}).props.className), /var\(--matchrim-safe-top\)/);
  assert.match(String(subject.ToastViewport({}).props.className), /100dvh/);
  assert.match(String(subject.Toast({}).props.className), /pr-\[60px\]/);
  assert.match(String(subject.Toast({}).props.className), /min-w-0/);
});
check('Native callers can still supply their own accessible label and close handler', () => {
  const handler = () => {};
  const node = load(true).ToastClose({ 'aria-label': 'Cerrar error de registro', onClick: handler });
  assert.equal(node.props['aria-label'], 'Cerrar error de registro');
  assert.equal(node.props.onClick, handler);
});
const notice = (kind: 'sonner' | 'toaster', native: boolean, active: boolean, baseline = false): Node95 => {
  const path = `src/components/ui/${kind}.tsx`;
  const source = baseline ? execFileSync('git', ['show', `c25b282:${path}`], { encoding: 'utf8' }) : readFileSync(path, 'utf8');
  const nodes = new Proxy({}, { get: (_, name) => String(name) });
  const toasts = active ? [{ id: 'local-control', title: 'Aviso de control', description: 'No es una cuenta real', open: true }] : [];
  const sandbox = { exports: {}, require: (id: string) => {
    if (id === 'react/jsx-runtime') return { jsx: (type: string, props: Record<string, unknown>) => ({ type, props }), jsxs: (type: string, props: Record<string, unknown>) => ({ type, props }) };
    if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
    if (id === '@/hooks/use-toast') return { useToast: () => ({ toasts }) };
    if (id === 'sonner') return { Toaster: 'Sonner', toast: {}, useSonner: () => ({ toasts }) };
    if (id === 'next-themes') return { useTheme: () => ({ theme: 'system' }) };
    if (id === '@/components/ui/toast') return nodes;
    throw new Error('Unexpected notice dependency ' + id);
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText, sandbox);
  return (sandbox.exports as { Toaster: (props: Record<string, unknown>) => Node95 }).Toaster({});
};
check('Native empty notice containers are excluded, and a real open notice stays mounted and accessible', () => {
  for (const kind of ['sonner', 'toaster'] as const) for (const active of [false, true]) {
    const node = notice(kind, true, active);
    assert.equal(node.type, 'div');
    assert.equal(node.props['aria-hidden'], active ? undefined : true);
    assert.ok(node.props.children, 'Keep subscription/listener mounted so the first notice is not lost');
  }
});
check('Legacy web notice markup stays equal with and without an active message', () => {
  for (const kind of ['sonner', 'toaster'] as const) for (const active of [false, true]) {
    assert.deepEqual(shape(notice(kind, false, active)), shape(notice(kind, false, active, true)));
  }
});
check('Native Sonner close stays inside its scrolling notice and height budget is independent of root font size', () => {
  const css = postcss.parse(readFileSync(new URL('../src/index.css', import.meta.url), 'utf8'));
  const declarations = (selector: string) => {
    const values = new Map<string, string>();
    css.walkRules(selector, rule => { rule.walkDecls(declaration => { values.set(declaration.prop, declaration.value); }); });
    return values;
  };
  const prefix = 'html.matchrim-native-platform [data-sonner-toaster].matchrim-notices ';
  const close = declarations(prefix + '[data-close-button]');
  assert.equal(close.get('position'), 'static'); assert.equal(close.get('transform'), 'none');
  assert.equal(close.get('height'), '44px'); assert.equal(close.get('width'), '44px');
  assert.equal(close.get('order'), '3'); assert.equal(close.get('margin'), '0');
  const notice = declarations(prefix + '[data-sonner-toast]');
  assert.equal(notice.get('padding'), '12px');
  assert.match(notice.get('max-height') ?? '', /100dvh.*48px/);
  assert.doesNotMatch(notice.get('max-height') ?? '', /rem/);
});
console.log(JSON.stringify({ groups, passed: true, scope: 'Actual toast JSX and web parity. Pixel layout and native announcements require separate UI QA.', networkCalls: 0 }));
