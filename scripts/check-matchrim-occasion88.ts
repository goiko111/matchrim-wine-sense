import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import vm from 'node:vm';
import { build } from 'esbuild';
import ts from 'typescript';
import { emptySpecialMomentAnswers, isCompleteSpecialMoment, SPECIAL_MOMENT_LABELS, SPECIAL_MOMENT_OPTIONS } from '../src/utils/specialMomentsRequest';

declare global {
  interface Window {
    __occasion88: {
      calls: Array<{ payload: unknown; callback: (text: string) => void; options: { signal: AbortSignal }; resolve: (text: string) => void; reject: (error: Error) => void }>;
      native: boolean;
      setOwner: (id: string | null) => void;
      setLoading: (loading: boolean) => void;
      setMounted: (mounted: boolean) => void;
      navigate: (path: string) => void;
    };
    SYN_UNSAFE?: boolean;
  }
}

// Local synthetic contracts only. --ui mounts the real component, not a live AI/backend.
const checks: string[] = [];
const check = async (name: string, run: () => unknown) => {
  await run();
  checks.push(name);
  console.log('PASS ' + name);
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const turn = () => new Promise(resolve => setTimeout(resolve, 0));
const payload = { functionType: 'special-moments', input1: 'SYN occasion' };
const frame = (text: string) => 'data: ' + JSON.stringify({ choices: [{ delta: { content: text } }] }) + '\n\n';
const end = 'data: [DONE]\n\n';
const response = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
const source = readFileSync('src/components/SpecialMomentsFlow.tsx', 'utf8');
const transportSource = readFileSync('src/lib/aiRimStream.ts', 'utf8');
const transportBuild = await build({
  entryPoints: ['src/lib/aiRimStream.ts'], bundle: true, write: false, format: 'iife', globalName: 'subject',
  define: { 'import.meta.env': JSON.stringify({ VITE_SUPABASE_PUBLISHABLE_KEY: 'synthetic-key', VITE_SUPABASE_URL: 'https://occasion88.invalid' }) },
  plugins: [{ name: 'synthetic-session-only', setup(builder) {
    builder.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({ path: 'session', namespace: 'synthetic' }));
    builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, () => ({ contents: 'export const supabase = globalThis.__supabase;' }));
  } }],
});

const loadTransport = (settings: {
  getSession?: () => Promise<unknown>; fetch?: typeof fetch; manualTimer?: boolean;
} = {}) => {
  const listeners = new Set<(event: string, session: unknown) => void>();
  let fetches = 0, sessions = 0, expired: (() => void) | undefined, timerCleared = false;
  const runtime = vm.createContext({
    AbortController, DOMException, ReadableStream, TextDecoder,
    setTimeout: settings.manualTimer ? (callback: () => void, ms: number) => { assert.equal(ms, 90_000); expired = callback; return 1; } : setTimeout,
    clearTimeout: settings.manualTimer ? () => { timerCleared = true; } : clearTimeout,
    __supabase: { auth: {
      getSession: () => { sessions++; return settings.getSession?.() ?? Promise.resolve({ data: { session: { user: { id: 'A' }, access_token: 'synthetic-token' } }, error: null }); },
      onAuthStateChange: (listener: (event: string, session: unknown) => void) => {
        listeners.add(listener);
        return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
      },
    } },
    fetch: (...args: Parameters<typeof fetch>) => { fetches++; return settings.fetch?.(...args) ?? Promise.resolve(response(frame('SYN answer') + end)); },
  });
  vm.runInContext(transportBuild.outputFiles[0].text, runtime);
  return {
    stream: runtime.subject.streamAiRimResponse as (p: unknown, callback: (text: string) => void, options?: { signal?: AbortSignal; ownerId?: string | null }) => Promise<string>,
    counts: () => ({ fetches, sessions, listeners: listeners.size, timerCleared }),
    expire: () => expired!(),
    changeOwner: (id: string | null, event = 'SIGNED_IN') => listeners.forEach(listener => listener(event, id ? { user: { id } } : null)),
  };
};

await check('Only all five configured answers and a known occasion are complete', () => {
  const valid = { ...emptySpecialMomentAnswers('gift'), ...Object.fromEntries(Object.entries(SPECIAL_MOMENT_OPTIONS).map(([key, values]) => [key, values[0]])) };
  assert.equal(isCompleteSpecialMoment(valid), true);
  assert.equal(isCompleteSpecialMoment(emptySpecialMomentAnswers('gift')), false);
  for (const key of Object.keys(SPECIAL_MOMENT_OPTIONS)) {
    for (const bad of ['', ' ', 'unknown', null, undefined]) assert.equal(isCompleteSpecialMoment({ ...valid, [key]: bad }), false);
  }
  for (const momentType of Object.keys(SPECIAL_MOMENT_LABELS)) {
    for (const [key, options] of Object.entries(SPECIAL_MOMENT_OPTIONS)) {
      for (const value of options) assert.equal(isCompleteSpecialMoment({ ...valid, momentType, [key]: value } as typeof valid), true);
    }
  }
  for (const momentType of [null, 'unknown', 'toString', '__proto__']) assert.equal(isCompleteSpecialMoment({ ...valid, momentType } as typeof valid), false);
});

await check('Fragmented UTF-8/CRLF, comments, no-space fields and terminal tail preserve exact text once', async () => {
  const text = '### Sin numerar\n**Regalo**: opción segura.\nTexto libre <script>literal</script> €';
  const bytes = new TextEncoder().encode(': heartbeat\r\n\r\n' + frame(text).replaceAll('\n', '\r\n').replace('data: ', 'data:') + 'data:[DONE]');
  let index = 0, cancelled = 0;
  const body = new ReadableStream<Uint8Array>({ pull(controller) { if (index < bytes.length) controller.enqueue(bytes.slice(index, ++index)); else controller.close(); }, cancel() { cancelled++; } });
  const runtime = loadTransport({ fetch: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }) });
  const updates: string[] = [];
  assert.equal(await runtime.stream(payload, value => updates.push(value), { ownerId: 'A' }), text);
  assert.deepEqual(updates, [text]);
  assert.equal(runtime.counts().fetches, 1);
  assert.equal(runtime.counts().listeners, 0);
  assert.equal(body.locked, false);
  assert.ok(cancelled <= 1);
});

await check('DONE ends without waiting for EOF and does not parse trailing duplicate data', async () => {
  let cancelled = 0;
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(frame('complete') + end + frame('duplicate'))); }, cancel() { cancelled++; } });
  const runtime = loadTransport({ fetch: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }) });
  assert.equal(await runtime.stream(payload, () => {}), 'complete');
  assert.equal(cancelled, 1);
  assert.equal(body.locked, false);
});

await check('Multiline SSE and explicit stop at EOF are supported with the two-argument API', async () => {
  const body = 'data: {"choices":\ndata: [{"delta":{"content":"complete"},"finish_reason":"stop"}]}\n\n';
  const runtime = loadTransport({ fetch: async () => response(body) });
  assert.equal(await runtime.stream(payload, () => {}), 'complete');
});

for (const [name, body] of Object.entries({
  empty: end,
  whitespace: frame(' \n ') + end,
  truncated: frame('partial'),
  malformed: frame('partial') + 'data: {"choices":\n\n',
  errorBefore: 'data: {"error":{"message":"SYN_PRIVATE"}}\n\n' + end,
  errorAfter: frame('partial') + 'data: {"error":{"message":"SYN_PRIVATE"}}\n\n' + end,
  eventError: frame('partial') + 'event: error\ndata: {"message":"SYN_PRIVATE"}\n\n',
  successFalse: frame('partial') + 'data: {"success":false}\n\n' + end,
  invalidContent: 'data: {"choices":[{"delta":{"content":{}}}]}\n\n' + end,
  limited: frame('partial') + 'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n' + end,
  filtered: frame('partial') + 'data: {"choices":[{"delta":{},"finish_reason":"content_filter"}]}\n\n' + end,
  incompleteTail: frame('partial') + 'data: {"error":',
})) await check('Reject ' + name + ' without retry or private error text', async () => {
  const runtime = loadTransport({ fetch: async () => response(body) });
  await assert.rejects(runtime.stream(payload, () => {}, { ownerId: 'A' }), error => !String(error).includes('SYN_PRIVATE'));
  assert.equal(runtime.counts().fetches, 1);
  assert.equal(runtime.counts().listeners, 0);
});

for (const [name, resp] of [
  ['HTTP error', new Response('SYN_PRIVATE', { status: 503 })],
  ['JSON instead of SSE', new Response('{"success":true,"response":"SYN answer"}', { headers: { 'Content-Type': 'application/json' } })],
  ['missing body', new Response(null, { headers: { 'Content-Type': 'text/event-stream' } })],
] as const) await check('Reject ' + name, async () => {
  const runtime = loadTransport({ fetch: async () => resp });
  await assert.rejects(runtime.stream(payload, () => {}), error => !String(error).includes('SYN_PRIVATE'));
  assert.equal(runtime.counts().fetches, 1);
});

await check('Pre-aborted call does not read a session or fetch', async () => {
  const controller = new AbortController(); controller.abort();
  const runtime = loadTransport();
  await assert.rejects(runtime.stream(payload, () => assert.fail('No callback'), { signal: controller.signal, ownerId: 'A' }), { name: 'AbortError' });
  assert.equal(runtime.counts().sessions, 0); assert.equal(runtime.counts().fetches, 0);
});

await check('Abort during getSession settles promptly and late session cannot start fetch', async () => {
  const pending = deferred<unknown>(), controller = new AbortController();
  const runtime = loadTransport({ getSession: () => pending.promise });
  const request = runtime.stream(payload, () => assert.fail('No callback'), { signal: controller.signal, ownerId: 'A' });
  await turn(); controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  pending.resolve({ data: { session: { user: { id: 'A' }, access_token: 'synthetic' } }, error: null });
  await turn(); assert.equal(runtime.counts().fetches, 0); assert.equal(runtime.counts().listeners, 0);
});

await check('Session lookup error and foreign owner fail closed before fetch', async () => {
  for (const result of [{ data: { session: null }, error: new Error('SYN_PRIVATE') }, { data: { session: { user: { id: 'B' } } }, error: null }]) {
    const runtime = loadTransport({ getSession: async () => result });
    await assert.rejects(runtime.stream(payload, () => {}, { ownerId: 'A' }), error => !String(error).includes('SYN_PRIVATE'));
    assert.equal(runtime.counts().fetches, 0); assert.equal(runtime.counts().listeners, 0);
  }
});

await check('Owner change during getSession blocks later fetch even before React rerenders', async () => {
  const pending = deferred<unknown>(), runtime = loadTransport({ getSession: () => pending.promise });
  const request = runtime.stream(payload, () => assert.fail('No callback'), { ownerId: 'A' });
  await turn(); runtime.changeOwner('B');
  await assert.rejects(request, { name: 'AbortError' });
  pending.resolve({ data: { session: { user: { id: 'A' }, access_token: 'synthetic' } }, error: null });
  await turn(); assert.equal(runtime.counts().fetches, 0);
});

await check('Abort during fetch passes a real signal and cancels an ignored late response', async () => {
  const pending = deferred<Response>(), controller = new AbortController(); let signal!: AbortSignal, cancelled = 0;
  const runtime = loadTransport({ fetch: async (_url, options) => { signal = options?.signal as AbortSignal; return pending.promise; } });
  const request = runtime.stream(payload, () => assert.fail('No callback'), { signal: controller.signal, ownerId: 'A' });
  await turn(); controller.abort(); await assert.rejects(request, { name: 'AbortError' }); assert.equal(signal.aborted, true);
  pending.resolve(new Response(new ReadableStream({ cancel() { cancelled++; } }), { headers: { 'Content-Type': 'text/event-stream' } }));
  await turn(); assert.equal(cancelled, 1); assert.equal(runtime.counts().fetches, 1);
});

await check('Owner/signout cancels a partial reader, releases its lock and publishes nothing later', async () => {
  for (const event of ['SIGNED_IN', 'SIGNED_OUT']) {
    let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode(frame('partial'))); }, cancel() { cancelled++; } });
    const updates: string[] = [], runtime = loadTransport({ fetch: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }) });
    const request = runtime.stream(payload, value => updates.push(value), { ownerId: 'A' });
    await turn(); runtime.changeOwner(event === 'SIGNED_IN' ? 'B' : null, event);
    await assert.rejects(request, { name: 'AbortError' });
    assert.deepEqual(updates, ['partial']); assert.equal(cancelled, 1); assert.equal(body.locked, false); assert.equal(runtime.counts().listeners, 0);
  }
});

await check('Abort on last content before DONE cannot resolve a partial success', async () => {
  const controller = new AbortController(), runtime = loadTransport();
  await assert.rejects(runtime.stream(payload, () => controller.abort(), { signal: controller.signal }), { name: 'AbortError' });
});

await check('Consumer exceptions propagate once and do not become swallowed JSON errors', async () => {
  let callbacks = 0; const runtime = loadTransport();
  await assert.rejects(runtime.stream(payload, () => { callbacks++; throw new Error('SYN consumer failure'); }), /SYN consumer failure/);
  assert.equal(callbacks, 1); assert.equal(runtime.counts().fetches, 1);
});

await check('Reader failure after partial text rejects and releases its lock', async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({ start(value) { controller = value; controller.enqueue(new TextEncoder().encode(frame('partial'))); } });
  const runtime = loadTransport({ fetch: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }) });
  const request = runtime.stream(payload, () => {}, { ownerId: 'A' });
  await turn(); controller.error(new Error('SYN reader failure'));
  await assert.rejects(request, /SYN reader failure/);
  assert.equal(body.locked, false); assert.equal(runtime.counts().listeners, 0); assert.equal(runtime.counts().fetches, 1);
});

await check('90-second bound includes session lookup and clears timer with no automatic retry', async () => {
  const runtime = loadTransport({ getSession: () => new Promise(() => {}), manualTimer: true });
  const request = runtime.stream(payload, () => assert.fail('No callback'), { ownerId: 'A' });
  await turn(); runtime.expire(); await assert.rejects(request, { name: 'TimeoutError' });
  assert.deepEqual(runtime.counts(), { fetches: 0, sessions: 1, listeners: 0, timerCleared: true });
});

await check('90-second stream timeout cancels a pending reader and does not retry', async () => {
  let cancelled = 0;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled++; } });
  const runtime = loadTransport({ fetch: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }), manualTimer: true });
  const request = runtime.stream(payload, () => {}, { ownerId: 'A' });
  await turn(); runtime.expire(); await assert.rejects(request, { name: 'TimeoutError' });
  assert.equal(cancelled, 1); assert.equal(body.locked, false); assert.equal(runtime.counts().fetches, 1); assert.equal(runtime.counts().timerCleared, true);
});

await check('Source: one guarded submission, keyed owner/route lifetime, reset and safe native text', () => {
  const tree = ts.createSourceFile('SpecialMomentsFlow.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const initializers = new Map<string, string>(); let calls = 0;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) initializers.set(node.name.text, node.initializer.getText(tree));
    if (ts.isCallExpression(node) && node.expression.getText(tree) === 'streamAiRimResponse') calls++;
    ts.forEachChild(node, visit);
  }; visit(tree);
  const submit = initializers.get('handleSubmitRecommendation')!;
  assert.equal(calls, 1);
  assert.ok(submit.indexOf('!isCompleteSpecialMoment(data)') < submit.indexOf('streamAiRimResponse('));
  assert.ok(submit.includes('requestController.current ||'));
  assert.ok(submit.includes('signal: controller.signal, ownerId'));
  assert.match(initializers.get('isCurrent')!, /lifetime.current.*requestGeneration.current.*requestController.current.*signal.aborted/);
  assert.match(source, /key=\{JSON.stringify\(\[user\?\.id \?\? null, location.key\]\)\}/);
  assert.match(initializers.get('resetQuestions')!, /invalidateRequest\(\).*emptySpecialMomentAnswers.*questionIndex.current = 0.*setCurrentQuestion\(0\)/s);
  assert.match(source, /aria-label="Recomendación de aiRIM"[\s\S]*?whitespace-pre-wrap[\s\S]*?\{result\}/);
  for (const forbidden of ['dangerouslySetInnerHTML', 'localStorage', 'recordOwnedScanHistory', '.insert(', '.update(', 'supabase.from']) assert.ok(!source.includes(forbidden), forbidden);
  assert.ok(!transportSource.includes('console.'));
});

if (process.argv.includes('--ui')) {
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.MATCHRIM_PLAYWRIGHT_MODULE || 'playwright');
  const postcss = require('postcss'), tailwind = require('tailwindcss');
  const config = (await import('../tailwind.config')).default;
  const css = (await postcss([tailwind(config)]).process(readFileSync('src/index.css', 'utf8'), { from: 'src/index.css' })).css;
  const entry = `
    import React, { useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, useNavigate } from 'react-router-dom';
    import Flow from './src/components/SpecialMomentsFlow';
    import { Auth } from 'synthetic-auth';
    window.__occasion88 = { calls: [], native: true };
    function Harness() {
      const [owner, setOwner] = useState('A'), [loading, setLoading] = useState(false), [mounted, setMounted] = useState(true);
      const navigate = useNavigate();
      Object.assign(window.__occasion88, { setOwner, setLoading, setMounted, navigate });
      return <Auth.Provider value={{ user: owner ? { id: owner } : null, loading }}>{mounted && <Flow onBack={() => setMounted(false)} />}</Auth.Provider>;
    }
    createRoot(document.getElementById('root')).render(<React.StrictMode><MemoryRouter><Harness /></MemoryRouter></React.StrictMode>);
  `;
  const bundle = await build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife',
    plugins: [{ name: 'isolated-ui-only', setup(builder) {
      builder.onResolve({ filter: /^(synthetic-auth|@\/contexts\/AuthContext)$/ }, () => ({ path: 'auth', namespace: 'synthetic' }));
      builder.onResolve({ filter: /^@\/lib\/aiRimStream$/ }, () => ({ path: 'stream', namespace: 'synthetic' }));
      builder.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: 'capacitor', namespace: 'synthetic' }));
      builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, args => ({ contents: args.path === 'auth'
        ? "import React from 'react'; export const Auth = React.createContext(null); export const useAuth = () => React.useContext(Auth);"
        : args.path === 'capacitor' ? 'export const Capacitor = { isNativePlatform: () => window.__occasion88.native };'
        : `export const streamAiRimResponse = (payload, callback, options) => new Promise((resolve, reject) => {
            window.__occasion88.calls.push({ payload, callback, options, resolve, reject });
          });`, loader: 'js', resolveDir: process.cwd() }));
    } }],
  });
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/bundle.js' ? 'text/javascript' : req.url === '/style.css' ? 'text/css' : 'text/html');
    res.end(req.url === '/bundle.js' ? bundle.outputFiles[0].text : req.url === '/style.css' ? css : '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><div id="root"></div><script src="/bundle.js"></script></html>');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + (server.address() as { port: number }).port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.MATCHRIM_QA_CHROME ? { executablePath: process.env.MATCHRIM_QA_CHROME } : {}) });
    for (const [width, height, native] of [[393, 852, true], [852, 393, true], [320, 740, true], [1280, 900, false]] as const) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, serviceWorkers: 'block' });
      const external: string[] = [], errors: string[] = [];
      await context.route('**/*', route => { if (route.request().url().startsWith(url + '/')) return route.continue(); external.push(route.request().url()); return route.abort(); });
      const page = await context.newPage(); page.setDefaultTimeout(4000);
      page.on('pageerror', error => errors.push(error.message));
      const count = () => page.evaluate(() => window.__occasion88.calls.length);
      const visible = (selector: { waitFor: (options: { state: 'visible' }) => Promise<void> }) => selector.waitFor({ state: 'visible' });
      const screenshot = async (stage: string) => {
        if (process.env.MATCHRIM_OCCASION88_SCREENSHOTS) await page.screenshot({ path: process.env.MATCHRIM_OCCASION88_SCREENSHOTS + '/' + width + '-' + stage + '.png', fullPage: true });
      };
      const select = async () => { await page.getByRole('button', { name: 'Vino para regalar', exact: true }).click(); await visible(page.getByText('Pregunta 1 de 5', { exact: true })); };
      const answer = async () => {
        const before = await count();
        const answers = Object.values(SPECIAL_MOMENT_OPTIONS).map(values => values[0]);
        for (let index = 0; index < answers.length; index++) {
          assert.equal(await count(), before, 'No call before five answers');
          await page.getByRole('button', { name: answers[index], exact: true }).click();
        }
        await visible(page.getByRole('button', { name: 'Cancelar consulta', exact: true }));
        assert.equal(await count(), before + 1);
        return before;
      };
      const late = (index: number, kind: string, text = 'SYN_LATE') => page.evaluate(({ index, kind, text }) => {
        const call = window.__occasion88.calls[index];
        if (kind === 'partial') call.callback(text);
        else if (kind === 'error') call.reject(new Error('SYN_PRIVATE'));
        else call.resolve(text);
      }, { index, kind, text });
      const aborted = (index: number) => page.evaluate(index => window.__occasion88.calls[index].options.signal.aborted, index);
      const noSuccess = async () => { assert.equal(await page.getByRole('region', { name: 'Recomendación de aiRIM' }).count(), 0); assert.equal(await page.getByText('Recomendación generada por Winerim', { exact: true }).count(), 0); };
      try {
        await page.goto(url, { waitUntil: 'networkidle' });
        await page.evaluate(native => { window.__occasion88.native = native; window.__occasion88.setOwner('initial-A'); }, native);
        await select();
        await page.getByRole('button', { name: '2 personas', exact: true }).click();
        await page.getByRole('button', { name: 'Volver a ocasiones', exact: true }).click();
        await select(); assert.equal(await count(), 0);
        const first = await answer(); await noSuccess(); await screenshot('pending');
        await late(first, 'partial', 'SYN_PARTIAL'); await noSuccess();
        await page.getByRole('button', { name: 'Volver a preguntas', exact: true }).click();
        assert.equal(await aborted(first), true);
        await visible(page.getByText('Pregunta 1 de 5', { exact: true }));
        await page.getByRole('button', { name: 'Volver a ocasiones', exact: true }).click();
        await select(); const second = await answer();
        await late(first, 'partial'); await late(first, 'error');
        await visible(page.getByRole('button', { name: 'Cancelar consulta', exact: true })); await noSuccess();
        await late(second, 'success', ''); await visible(page.getByRole('alert')); await screenshot('empty-error');
        assert.ok(!(await page.locator('body').innerText()).includes('SYN_PRIVATE'));
        // Re-enter the same mounted handler before React commits; the ref must lock synchronously.
        await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
        await visible(page.getByRole('button', { name: 'Cancelar consulta', exact: true }));
        assert.equal(await count(), second + 2, 'Double retry must start only one request');
        const retry = second + 1;
        await late(retry, 'partial', 'SYN_CURRENT_PARTIAL'); await late(retry, 'error');
        await visible(page.getByRole('alert')); await noSuccess();
        assert.ok(!(await page.locator('body').innerText()).includes('SYN_CURRENT_PARTIAL'));
        await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
        const cancelled = retry + 1;
        await page.getByRole('button', { name: 'Cancelar consulta', exact: true }).click();
        assert.equal(await aborted(cancelled), true);
        await late(cancelled, 'partial'); await late(cancelled, 'success');
        await visible(page.getByText('Consulta cancelada. Puedes reintentar o cambiar de ocasión.', { exact: true })); await noSuccess();
        await page.getByRole('button', { name: 'Reintentar consulta', exact: true }).click();
        const final = cancelled + 1;
        const text = '### Una alternativa sin numerar\n**Regalo**: texto libre.\n<script>window.SYN_UNSAFE=true</script>\n' + 'L'.repeat(500);
        await late(final, 'success', native ? text : 'Introducción\n### 1. Regalo\n**Tipo:** Tinto\n**Recomendación:** SYN vino');
        if (native) {
          const result = page.getByRole('region', { name: 'Recomendación de aiRIM' }); await visible(result);
          assert.equal(await result.locator('p').textContent(), text);
          assert.equal(await result.locator('script').count(), 0);
        } else await visible(page.getByText('Recomendaciones de Winerim', { exact: true }));
        assert.equal(await page.evaluate(() => window.SYN_UNSAFE), undefined);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
        await screenshot('result');
        await page.getByRole('button', { name: 'Nueva consulta', exact: true }).click();
        if (!native) {
          await select(); const fallback = await answer(); await late(fallback, 'success', text);
          await visible(page.getByText(text, { exact: true }));
          assert.equal(await page.locator('script').count(), 1, 'Only the harness script exists; response HTML is literal text');
          await screenshot('fallback');
          await page.getByRole('button', { name: 'Nueva consulta', exact: true }).click();
        }
        await select(); const ownerRequest = await answer();
        await page.evaluate(() => window.__occasion88.setOwner('B'));
        await visible(page.getByRole('button', { name: 'Vino para regalar', exact: true }));
        assert.equal(await aborted(ownerRequest), true); await late(ownerRequest, 'success'); await noSuccess();
        await select(); const routeRequest = await answer();
        await page.evaluate(() => window.__occasion88.navigate('/another-occasion'));
        await visible(page.getByRole('button', { name: 'Vino para regalar', exact: true }));
        assert.equal(await aborted(routeRequest), true); await late(routeRequest, 'error'); await noSuccess();
        await select(); const loadingRequest = await answer();
        await page.evaluate(() => window.__occasion88.setLoading(true));
        await visible(page.getByText('Comprobando la sesión...', { exact: true }));
        assert.equal(await aborted(loadingRequest), true); await late(loadingRequest, 'success'); await noSuccess();
        await page.evaluate(() => window.__occasion88.setLoading(false));
        await select(); const resetRequest = await answer();
        await page.getByRole('button', { name: 'Nueva consulta', exact: true }).click();
        assert.equal(await aborted(resetRequest), true); await late(resetRequest, 'error'); await noSuccess();
        await select(); const unmountRequest = await answer();
        await page.evaluate(() => window.__occasion88.setMounted(false));
        await page.locator('main').waitFor({ state: 'hidden' });
        assert.equal(await aborted(unmountRequest), true); await late(unmountRequest, 'success');
        assert.deepEqual(errors, []); assert.deepEqual(external, []);
        await check('Real React UI ' + width + 'x' + height + (native ? ' native classes' : ' public web') + ': lifecycle, stale/error/retry/cancel, safe content and zero remote requests', () => {});
      } finally { await context.close(); }
    }
  } finally {
    await browser?.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
console.log(JSON.stringify({ passed: checks.length, scope: 'Local synthetic contracts, not live AI/native-device/TestFlight evidence', ui: process.argv.includes('--ui'), remoteCalls: 0, paidCalls: 0 }));
