import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const path = 'src/components/MatchrimPassport.tsx';
const current = readFileSync(path, 'utf8');
const old = execFileSync('git', ['show', `c25b282:${path}`], { encoding: 'utf8' });
type Element = { type: string; props: Record<string, unknown> & { children?: Child } };
type Child = Element | string | number | boolean | undefined | null | Child[];
const flatten = (node: Child): Element[] => Array.isArray(node) ? node.flatMap(flatten)
  : node && typeof node === 'object' ? [node, ...flatten(node.props.children)] : [];
const text = (node: Child): string => Array.isArray(node) ? node.map(text).join('')
  : node && typeof node === 'object' ? text(node.props.children) : typeof node === 'string' || typeof node === 'number' ? String(node) : '';
const shape = (node: unknown): unknown => {
  if (Array.isArray(node)) return Array.from(node).filter(value => value !== false && value !== null && value !== undefined).map(shape);
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node)
    .filter(([, value]) => value !== undefined).map(([key, value]) => [key, shape(value)]));
  return typeof node === 'function' ? '[handler]' : node;
};
const actor = (source: string, native: boolean, behavior: 'ok' | 'cancel' | 'error' = 'ok') => {
  const events: unknown[] = [], navigated: string[] = [], toast: unknown[] = [];
  const components = new Proxy({}, { get: (_, name) => String(name) });
  const jsx = (type: string, props: Element['props']) => ({ type, props });
  const navigator = {
    clipboard: { writeText: async (value: string) => { events.push({ copy: value }); if (behavior === 'error') throw new Error('Clipboard denied'); } },
    share: async (value: unknown) => {
      events.push({ share: value });
      if (behavior === 'cancel') throw new DOMException('Cancelled', 'AbortError');
      if (behavior === 'error') throw new Error('Share denied');
    },
  };
  const sandbox = { exports: {}, navigator, Error, DOMException,
    window: { open: (...values: unknown[]) => events.push({ open: values }) },
    require: (id: string) => {
      if (id === 'react') return { useMemo: (build: () => unknown) => build() };
      if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
      if (id === 'react-router-dom') return { useNavigate: () => (url: string) => navigated.push(url) };
      if (id === '@capacitor/core') return { Capacitor: { isNativePlatform: () => native } };
      if (id === 'sonner') return { toast: { success: (value: string) => toast.push({ success: value }), error: (value: string) => toast.push({ error: value }) } };
      if (id === '@/utils/matchrimLocalQr') return { buildLocalMatchrimQr: () => 'data:image/svg+xml;base64,LOCAL-QR-CONTROL' };
      if (id === '@/utils/matchrimPassport') return {
        generateMatchrimCode: () => 'Código de control',
        buildMatchrimShareUrl: () => 'https://matchrim.invalid/profile-control',
        buildWinerimCartaUrl: () => 'https://winerim.invalid/profile-control',
      };
      if (id.startsWith('@/components/ui/') || id === 'lucide-react') return components;
      throw new Error('Unexpected dependency ' + id);
    },
  };
  vm.runInNewContext(ts.transpileModule(source + '\nexports.subject = MatchrimPassport;', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, sandbox);
  const subject = (sandbox.exports as { subject: (props: Record<string, unknown>) => Element }).subject;
  const render = (props: Record<string, unknown> = {}) => subject({ profile: { potente: 0, acidez: 2.4, dulce: 5, tanico: 0, afrutado: 3 }, ...props });
  return { render, events, navigated, toast };
};
let groups = 0;
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); groups++; console.log('PASS', name); };
await check('Actual legacy web JSX stays equal for every compact/action combination and long codes', () => {
  for (const compact of [false, true]) for (const showUseAction of [false, true]) for (const showRestaurantAction of [false, true]) {
    for (const codeOverride of [undefined, 'Una denominación de control muy larga sin identidad de vino']) {
      const props = { compact, showUseAction, showRestaurantAction, codeOverride };
      assert.deepEqual(shape(actor(current, false).render(props)), shape(actor(old, false).render(props)));
    }
  }
});
await check('Native passport drops nested decorative frame, retains complete code and exact test values', () => {
  const tree = actor(current, true).render({ codeOverride: 'UnNombreDeCódigoMuyLargoSinEspaciosParaComprobarElAjuste' });
  assert.match(String(tree.props.className), /border-0/);
  assert.ok(!text(tree).includes('Winerim ready'));
  assert.ok(text(tree).includes('UnNombreDeCódigoMuyLargoSinEspaciosParaComprobarElAjuste'));
  assert.ok(text(tree).includes('0/5')); assert.ok(text(tree).includes('2.4/5'));
  assert.equal(flatten(tree).filter(node => node.type === 'summary' && text(node) === 'Rasgos del test').length, 1);
  const qr = flatten(tree).find(node => node.type === 'img');
  assert.ok(qr && String(qr.props.src).startsWith('data:'));
  assert.ok(text(tree).includes('cinco valores de tu test'));
});
await check('Native copy, sharing and destination actions still call their original handlers once', async () => {
  const subject = actor(current, true), nodes = flatten(subject.render());
  const click = async (predicate: (node: Element) => boolean) => {
    const node = nodes.find(predicate); assert.ok(node);
    await (node.props.onClick as () => unknown)();
  };
  await click(node => node.props['aria-label'] === 'Copiar código Matchrim');
  await click(node => node.type === 'Button' && text(node) === 'Compartir');
  await click(node => node.type === 'Button' && text(node) === 'Usar en restaurante');
  assert.equal(subject.events.length, 2); assert.deepEqual(subject.navigated, ['/usar-matchrim']);
  assert.equal(subject.toast.length, 1);
});
await check('Cancelling native share is quiet, while copy/share errors settle with a useful retry message', async () => {
  const cancelled = actor(current, true, 'cancel');
  const share = flatten(cancelled.render()).find(node => node.type === 'Button' && text(node) === 'Compartir')!;
  await (share.props.onClick as () => Promise<void>)(); assert.deepEqual(cancelled.toast, []);
  const failed = actor(current, true, 'error'), nodes = flatten(failed.render());
  for (const node of nodes.filter(node => node.props['aria-label'] === 'Copiar código Matchrim' || node.type === 'Button' && text(node) === 'Compartir')) {
    await (node.props.onClick as () => Promise<void>)();
  }
  assert.equal(failed.toast.length, 2); assert.match(JSON.stringify(failed.toast), /volver a intentarlo/);
});
console.log(JSON.stringify({ groups, passed: true, outboundCalls: 0, scope: 'Actual passport JSX/handlers, controlled runtime. Does not prove layout, QR decoding or native share sheet.' }));
