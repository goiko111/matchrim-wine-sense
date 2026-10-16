import assert from 'node:assert/strict';
import { File as NodeFile } from 'node:buffer';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import type * as Frontend91 from '../src/utils/restaurantDocuments91';
import type * as Backend91 from '../supabase/functions/_shared/matchrim-restaurant-import91';

// Deno npm: dependencies stay out of package.json. Supply an offline-installed prefix:
// MATCHRIM_RESTAURANT91_TEST_DEPS=/tmp/prefix node --import tsx scripts/check-matchrim-restaurant-documents91.ts
const requireDependency = createRequire(resolve(process.env.MATCHRIM_RESTAURANT91_TEST_DEPS ?? '.', 'package.json'));
let parse5: unknown;
let ipaddr: unknown;
let httpParser: unknown;
try {
  parse5 = requireDependency('parse5');
  ipaddr = requireDependency('ipaddr.js');
  httpParser = requireDependency('http-parser-js');
  assert.equal(requireDependency('ipaddr.js/package.json').version, '2.2.0');
} catch {
  throw new Error('Offline checks require parse5@7.3.0, ipaddr.js@2.2.0 and http-parser-js@0.5.10. Install them in a temporary prefix (not this repo), then set MATCHRIM_RESTAURANT91_TEST_DEPS to that prefix.');
}

function evaluate91(path: string, dependencies: Record<string, unknown>, globals: Record<string, unknown> = {}) {
  const source = readFileSync(path, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports: Record<string, unknown> = {};
  const require = (id: string) => {
    assert.ok(id in dependencies, `Unexpected dependency: ${id}`);
    return dependencies[id];
  };
  new Function('require', 'exports', ...Object.keys(globals), compiled)(require, exports, ...Object.values(globals));
  return exports;
}

const frontPath = 'src/utils/restaurantDocuments91.ts';
const sharedPath = 'supabase/functions/_shared/matchrim-restaurant-import91.ts';
const handlerPath = 'supabase/functions/restaurant-import91/index.ts';
const sharedSource = readFileSync(sharedPath, 'utf8');
assert.ok(sharedSource.includes("from 'npm:parse5@7.3.0'"));
assert.ok(sharedSource.includes("from 'npm:ipaddr.js@2.2.0'"));
assert.ok(readFileSync(frontPath, 'utf8').includes("import('pdfjs-dist/build/pdf.worker.mjs?url')"));
assert.ok(!readFileSync(frontPath, 'utf8').includes('convertPdfFirstPageToImageFile'));
const backend = evaluate91(sharedPath, { 'npm:parse5@7.3.0': parse5, 'npm:ipaddr.js@2.2.0': ipaddr }) as typeof Backend91;

const encoder = new TextEncoder();
const jpeg = new Uint8Array([255, 216, 255, 224, 0, 0, 255, 217]);
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
const makeFile = (bytes: BlobPart, name: string, type = '') => new NodeFile([bytes], name, { type }) as File;
const pdfFile = (pages: number, id = 'A') => makeFile(`%PDF-1.7 pages=${pages} fixture=${id}`, `${id}.pdf`, 'application/pdf');
const canvases: Array<{ width: number; height: number }> = [];
let peakCanvases = 0;
let rendered: number[] = [];
let destroyed = 0;
let cleaned = 0;
let cancelled = 0;
let prepared = 0;
let duringRender: (() => void) | undefined;
let holdRender = false;
const fakePdfJs = {
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: ({ data }: { data: ArrayBuffer }) => {
    assert.equal(fakePdfJs.GlobalWorkerOptions.workerSrc, '/assets/pdf-worker.mjs');
    const input = new TextDecoder().decode(data);
    const numPages = Number(/pages=(\d+)/.exec(input)?.[1] ?? 0);
    const pdf = {
      numPages,
      getPage: async (pageNumber: number) => ({
        getViewport: ({ scale }: { scale: number }) => ({ width: 1000 * scale, height: 1400 * scale }),
        render: () => {
          rendered.push(pageNumber);
          let finish!: () => void;
          let reject!: (error: unknown) => void;
          const promise = new Promise<void>((resolve, fail) => { finish = resolve; reject = fail; });
          queueMicrotask(() => { duringRender?.(); if (!holdRender) finish(); });
          return { promise, cancel: () => { cancelled++; reject(new DOMException('Cancelled', 'AbortError')); } };
        },
        cleanup: () => { cleaned++; },
      }),
    };
    const task = { promise: Promise.resolve(pdf), destroy: async () => { destroyed++; }, onPassword: () => {} };
    return task;
  },
};
const frontend = evaluate91(frontPath, {
  './imageAnalysis': { prepareImageForAnalysis: async (_file: File, max: number, signal?: AbortSignal) => {
    prepared++;
    assert.equal(max, 2400);
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return { dataUrl: `data:image/jpeg;base64,${Buffer.from(jpeg).toString('base64')}` };
  } },
  'pdfjs-dist': fakePdfJs,
  'pdfjs-dist/build/pdf.worker.mjs?url': { __esModule: true, default: '/assets/pdf-worker.mjs' },
}, {
  File: NodeFile,
  document: { createElement: (tag: string) => {
    assert.equal(tag, 'canvas');
    let width = 0;
    let height = 0;
    const canvas = {
      get width() { return width; },
      set width(value: number) { width = value; },
      get height() { return height; },
      set height(value: number) {
        height = value;
        peakCanvases = Math.max(peakCanvases, canvases.filter((item) => item.width > 0 && item.height > 0).length);
      },
      getContext: () => ({}),
      toBlob: (callback: (blob: Blob) => void) => callback(new Blob([jpeg], { type: 'image/jpeg' })),
    };
    canvases.push(canvas);
    return canvas;
  } },
}) as typeof Frontend91;

let checks = 0;
async function check(name: string, run: () => void | Promise<void>) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
const code = (expected: string) => (error: unknown) => {
  assert.equal((error as { code?: string }).code, expected);
  return true;
};

await check('file inspection hashes content, not name; PNG and HEIC detected', async () => {
  const first = await frontend.inspectRestaurantFile(makeFile(jpeg, 'one.jpg'));
  const renamed = await frontend.inspectRestaurantFile(makeFile(jpeg, 'two.jpg'));
  assert.equal(first.digest.length, 64);
  assert.equal(first.digest, renamed.digest);
  assert.equal(first.pageCount, 1);
  assert.equal(first.type, 'image');
  assert.equal((await frontend.inspectRestaurantFile(makeFile(png, 'image.png'))).type, 'image');
  const heic = makeFile(new Uint8Array([0, 0, 0, 24, ...encoder.encode('ftypheic')]), 'image.heic');
  assert.equal((await frontend.inspectRestaurantFile(heic)).type, 'image');
  await frontend.renderRestaurantPage(heic, 1);
  assert.equal(prepared, 1, 'HEIC routes through the existing image preparation path');
});
await check('empty, oversized, spoofed and SVG files are explicit failures', async () => {
  await assert.rejects(frontend.inspectRestaurantFile(makeFile('', 'empty.pdf')), code('empty_file'));
  const huge = { name: 'huge.pdf', size: 25 * 1024 * 1024 + 1 } as File;
  await assert.rejects(frontend.inspectRestaurantFile(huge), code('file_size_limit'));
  await assert.rejects(frontend.inspectRestaurantFile(makeFile('<html>not pdf</html>', 'menu.pdf', 'application/pdf')), code('unsupported_file'));
  await assert.rejects(frontend.inspectRestaurantFile(makeFile('<svg/>', 'menu.svg', 'image/svg+xml')), code('unsupported_file'));
});
await check('50 pages accepted; 51 pages rejected before rendering; resources destroyed', async () => {
  const before = rendered.length;
  assert.equal((await frontend.inspectRestaurantFile(pdfFile(50))).pageCount, 50);
  await assert.rejects(frontend.inspectRestaurantFile(pdfFile(51)), code('pdf_page_limit'));
  await assert.rejects(frontend.inspectRestaurantFile(pdfFile(0)), code('invalid_pdf'));
  assert.equal(rendered.length, before);
  assert.ok(destroyed >= 3);
});
await check('atomic queue enforces 20 files, 100 pages, duplicate content and existing queue', async () => {
  const files = Array.from({ length: 20 }, (_, index) => pdfFile(1, `file-${index}`));
  assert.equal((await frontend.inspectRestaurantFiles91(files)).length, 20);
  await assert.rejects(frontend.inspectRestaurantFiles91([...files, pdfFile(1, 'extra')]), code('file_count_limit'));
  const a = pdfFile(50, '50-a');
  const b = pdfFile(50, '50-b');
  assert.equal((await frontend.inspectRestaurantFiles91([a, b])).length, 2);
  await assert.rejects(frontend.inspectRestaurantFiles91([a, b, pdfFile(1, 'extra')]), code('batch_page_limit'));
  await assert.rejects(frontend.inspectRestaurantFiles91([makeFile(jpeg, 'a.jpg'), makeFile(jpeg, 'renamed.jpg')]), code('duplicate_file'));
  const existing = await frontend.inspectRestaurantFiles91([a]);
  await assert.rejects(frontend.inspectRestaurantFiles91([a], undefined, existing), code('duplicate_file'));
  await assert.rejects(frontend.inspectRestaurantFiles91([b, pdfFile(1, 'overflow')], undefined, existing), code('batch_page_limit'));
  assert.equal(existing.length, 1);
});
await check('lazy iterator renders every page including 50, with no eager canvases', async () => {
  rendered = [];
  const iterator = frontend.iterateRestaurantPages91([pdfFile(50, 'lazy')]);
  assert.deepEqual(rendered, []);
  const first = await iterator.next();
  assert.equal(first.value?.pageNumber, 1);
  assert.deepEqual(rendered, [1]);
  while (!(await iterator.next()).done) { /* Consume one File at a time. */ }
  assert.deepEqual(rendered, Array.from({ length: 50 }, (_, index) => index + 1));
  assert.equal(peakCanvases, 1);
  assert.ok(canvases.every((canvas) => canvas.width === 0 && canvas.height === 0));
});
await check('concurrent renders serialize and page numbers are one-based', async () => {
  const file = pdfFile(3, 'concurrent');
  await Promise.all([1, 2, 3].map((page) => frontend.renderRestaurantPage(file, page)));
  assert.equal(peakCanvases, 1);
  for (const page of [0, -1, 1.5, 4]) await assert.rejects(frontend.renderRestaurantPage(file, page), code('invalid_page'));
  assert.equal(cleaned, canvases.length);
});
await check('cancellation interrupts rendering and prevents later lazy pages', async () => {
  const controller = new AbortController();
  const iterator = frontend.iterateRestaurantPages91([pdfFile(50, 'cancel')], controller.signal);
  const before = rendered.length;
  holdRender = true;
  duringRender = () => controller.abort();
  await assert.rejects(iterator.next(), { name: 'AbortError' });
  holdRender = false;
  duringRender = undefined;
  await frontend.renderRestaurantPage(pdfFile(1, 'after-cancel'), 1);
  assert.equal(rendered.length, before + 2);
  assert.ok(cancelled > 0);
  assert.ok(canvases.every((canvas) => canvas.width === 0));
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(frontend.inspectRestaurantFile(pdfFile(1), aborted.signal), { name: 'AbortError' });
});

await check('URL validation rejects credentials, all IP forms, private names, ports and schemes', () => {
  for (const input of ['http://menus.example.com', 'https://user:secret@menus.example.com', 'https://127.0.0.1', 'https://2130706433', 'https://0x7f000001', 'https://[::1]', 'https://8.8.8.8', 'https://menus.example.com:8443', 'https://localhost', 'https://x.local', 'https://x.internal', 'https://x.home.arpa', 'https://menus.example.com.', 'https://menus.example.com\\@evil.com', 'https://menus.example.com/\nmenu', 'file:///etc/passwd']) {
    assert.throws(() => backend.restaurantPublicUrl91(input), undefined, input);
  }
  assert.equal(backend.restaurantPublicUrl91('https://menus.example.com/menu#section').href, 'https://menus.example.com/menu');
});
await check('DNS addresses reject private, reserved, transition and mapped IPv6', () => {
  for (const address of ['127.0.0.1', '0.0.0.0', '10.0.0.1', '169.254.169.254', '172.16.0.2', '192.168.1.1', '100.64.0.1', '192.0.0.9', '192.0.2.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '255.255.255.255', '::', '::1', 'fc00::1', 'fe80::1', 'ff02::1', '::ffff:8.8.8.8', '64:ff9b::808:808', '2001:db8::1', '2001::1', '2002:0808:0808::1', '3fff::1', '2606:4700:4700::1111%eth0', 'garbage']) {
    assert.equal(backend.restaurantPublicAddress91(address), false, address);
  }
  for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.equal(backend.restaurantPublicAddress91(address), true, address);
});

const safeUrl = 'https://menus.example.com/menu';
let fetchCalls = 0;
let resolveCalls: string[] = [];
let nextResponse: () => Response = () => new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } });
const deps: Backend91.RestaurantImportDependencies91 = {
  resolve: async (hostname) => { resolveCalls.push(hostname); return ['8.8.8.8']; },
  fetch: async (url, init, addresses) => {
    fetchCalls++;
    assert.equal(init.redirect, 'manual');
    assert.equal(init.credentials, 'omit');
    assert.ok(init.signal);
    assert.ok(!new Headers(init.headers).has('authorization'));
    assert.ok(!new Headers(init.headers).has('cookie'));
    assert.ok(url.startsWith('https:'));
    assert.deepEqual(addresses, ['8.8.8.8']);
    assert.ok(Object.isFrozen(addresses));
    return nextResponse();
  },
};
await check('private or mixed DNS, resolver failure, and missing records fail before fetch', async () => {
  const before = fetchCalls;
  for (const addresses of [[], ['10.1.1.1'], ['8.8.8.8', '::1']]) {
    await assert.rejects(backend.importRestaurantResource91(safeUrl, { ...deps, resolve: async () => addresses }), code('unsafe_dns'));
  }
  await assert.rejects(backend.importRestaurantResource91(safeUrl, { ...deps, resolve: async () => { throw new Error('DNS unavailable'); } }), code('dns_unavailable'));
  assert.equal(fetchCalls, before);
});
await check('direct images/PDFs return verified bytes, bounded base64 and source provenance', async () => {
  for (const [bytes, mime] of [[jpeg, 'image/jpeg'], [png, 'image/png'], [encoder.encode('%PDF-1.7 fixture'), 'application/pdf']] as const) {
    nextResponse = () => new Response(bytes, { headers: { 'content-type': mime } });
    const result = await backend.importRestaurantResource91(safeUrl, deps);
    assert.equal(result.kind, 'file');
    if (result.kind !== 'file') assert.fail('Expected file');
    assert.equal(result.mime, mime);
    assert.equal(result.sourceUrl, safeUrl);
    assert.deepEqual(Buffer.from(result.base64, 'base64'), Buffer.from(bytes));
  }
});
await check('HTML5 parser decodes entities, omits hidden/executable content, preserves structure and lists only same-domain menu links', async () => {
  const html = `<html><head><title>Not visible</title><style>secret</style></head><body>
    <h1>Carta &amp; vinos</h1><p>Arroz <strong>marinero</strong> 24 &euro;</p><script>BAD SCRIPT</script>
    <div hidden>HIDDEN</div><section aria-hidden="true">ARIA SECRET</section><div style="display: none !important">CSS SECRET</div>
    <template>TEMPLATE SECRET</template><noscript>NOSCRIPT SECRET</noscript><iframe src="https://bad.example.org">IFRAME SECRET</iframe>
    <a href="/carta.pdf">PDF &amp; carta</a><a href="/carta.pdf#duplicate">Duplicado</a><a href="/dinner">Menu noche</a>
    <a href="https://other.example.org/menu.pdf">External</a><a href="/about">About</a><a href="javascript:alert(1)">Menu script</a>
    <a hidden href="/hidden.pdf">Hidden PDF</a><base href="https://other.example.org/"><p>Fin`;
  nextResponse = () => new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  const before = fetchCalls;
  const result = await backend.importRestaurantResource91(safeUrl, deps);
  assert.equal(fetchCalls, before + 1, 'Discovered links must never be crawled');
  assert.equal(result.kind, 'text');
  if (result.kind !== 'text') assert.fail('Expected text');
  assert.ok(result.text.includes('Carta & vinos'));
  assert.ok(result.text.includes('Arroz marinero 24 \u20ac'));
  assert.ok(!/SECRET|HIDDEN|BAD SCRIPT|Not visible/.test(result.text));
  assert.deepEqual(result.links.map((link) => link.url), ['https://menus.example.com/carta.pdf', 'https://menus.example.com/dinner']);
});
await check('HTML/text/link/depth limits reject explicitly instead of slicing', () => {
  assert.equal(backend.extractRestaurantHtml91(`<p>${'a'.repeat(40_000)}</p>`, safeUrl).text.length, 40_000);
  assert.throws(() => backend.extractRestaurantHtml91(`<p>${'a'.repeat(40_001)}</p>`, safeUrl), code('text_size_limit'));
  assert.throws(() => backend.extractRestaurantHtml91(Array.from({ length: 21 }, (_, index) => `<a href="/${index}.pdf">Menu ${index}</a>`).join(''), safeUrl), code('link_count_limit'));
  assert.throws(() => backend.extractRestaurantHtml91('<div>'.repeat(260) + 'menu' + '</div>'.repeat(260), safeUrl), code('html_complexity_limit'));
  assert.throws(() => backend.extractRestaurantHtml91('<script>document.write("menu")</script>', safeUrl), code('empty_html'));
});
await check('all redirect targets are revalidated and re-resolved; hop count is bounded', async () => {
  let hop = 0;
  resolveCalls = [];
  nextResponse = () => hop++ === 0
    ? new Response(null, { status: 302, headers: { location: 'https://cdn.example.com/menu.pdf' } })
    : new Response('%PDF-1.7 fixture', { headers: { 'content-type': 'application/pdf' } });
  const result = await backend.importRestaurantResource91(safeUrl, deps);
  assert.equal(result.sourceUrl, 'https://cdn.example.com/menu.pdf');
  assert.deepEqual(resolveCalls, ['menus.example.com', 'cdn.example.com']);
  for (const target of ['https://127.0.0.1/secret', 'http://menus.example.com/menu', 'https://user:pass@menus.example.com']) {
    nextResponse = () => new Response(null, { status: 302, headers: { location: target } });
    await assert.rejects(backend.importRestaurantResource91(safeUrl, deps), code('unsafe_redirect'));
  }
  let calls = 0;
  nextResponse = () => { calls++; return new Response(null, { status: 302, headers: { location: '/next' } }); };
  await assert.rejects(backend.importRestaurantResource91(safeUrl, deps), code('redirect_limit'));
  assert.equal(calls, 4);
  await assert.rejects(backend.importRestaurantResource91(safeUrl, {
    ...deps, resolve: async (host) => host === 'menus.example.com' ? ['8.8.8.8'] : ['10.0.0.1'],
    fetch: async () => new Response(null, { status: 302, headers: { location: 'https://private.example.com/menu' } }),
  }), code('unsafe_dns'));
});
await check('blocked resources, unsupported types, spoofed payloads and oversized headers fail honestly', async () => {
  for (const [response, expected] of [
    [new Response('Forbidden', { status: 403 }), 'upstream_blocked'],
    [new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }), 'unsupported_content_type'],
    [new Response('<html>login</html>', { headers: { 'content-type': 'application/pdf' } }), 'content_type_mismatch'],
    [new Response(jpeg, { headers: { 'content-type': 'image/jpeg', 'content-length': String(25 * 1024 * 1024 + 1) } }), 'body_size_limit'],
    [new Response('<p>menu</p>', { headers: { 'content-type': 'text/html', 'content-length': String(1024 * 1024 + 1) } }), 'body_size_limit'],
  ] as const) {
    nextResponse = () => response;
    await assert.rejects(backend.importRestaurantResource91(safeUrl, deps), code(expected));
  }
});
await check('stream byte limit cancels the reader even without Content-Length', async () => {
  let streamCancelled = false;
  const response = new Response(new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(6)); controller.enqueue(new Uint8Array(6)); },
    cancel() { streamCancelled = true; },
  }));
  await assert.rejects(backend.readRestaurantBody91(response, 10, new AbortController().signal), code('body_size_limit'));
  assert.equal(streamCancelled, true);
});
await check('cancellation stops hanging DNS/fetch/body reads without accessing another resource', async () => {
  for (const stage of ['dns', 'fetch', 'body']) {
    const controller = new AbortController();
    const hang = () => { queueMicrotask(() => controller.abort()); return new Promise<never>(() => {}); };
    const dependencies = {
      resolve: stage === 'dns' ? hang : async () => ['8.8.8.8'],
      fetch: stage === 'fetch' ? hang : async () => new Response(new ReadableStream({
        start() { queueMicrotask(() => controller.abort()); },
      }), { headers: { 'content-type': 'image/jpeg' } }),
    };
    await assert.rejects(backend.importRestaurantResource91(safeUrl, dependencies, controller.signal), { name: 'AbortError' });
  }
});
await check('deadline bounds hanging operations, and auto-following adapters fail closed', async () => {
  const timeoutBackend = evaluate91(sharedPath, { 'npm:parse5@7.3.0': parse5, 'npm:ipaddr.js@2.2.0': ipaddr }, {
    setTimeout: (callback: () => void) => setTimeout(callback, 2),
  }) as typeof Backend91;
  await assert.rejects(timeoutBackend.importRestaurantResource91(safeUrl, { ...deps, resolve: async () => new Promise(() => {}) }), code('import_timeout'));
  const followed = new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } });
  Object.defineProperty(followed, 'redirected', { value: true });
  await assert.rejects(backend.importRestaurantResource91(safeUrl, { ...deps, fetch: async () => followed }), code('unsafe_redirect'));
});

await check('frontend URL adapter forwards cancellation, decodes files/text and rejects malformed responses', async () => {
  const controller = new AbortController();
  let calls = 0;
  const filePayload = { kind: 'file', mime: 'image/jpeg', name: 'menu.jpg', base64: Buffer.from(jpeg).toString('base64'), sourceUrl: safeUrl };
  const result = await frontend.importRestaurantUrl91(safeUrl, async (body, signal) => {
    calls++;
    assert.deepEqual(body, { url: safeUrl });
    assert.equal(signal, controller.signal);
    return filePayload;
  }, controller.signal);
  assert.equal(result.kind, 'file');
  if (result.kind !== 'file') assert.fail('Expected file');
  assert.deepEqual(new Uint8Array(await result.file.arrayBuffer()), jpeg);
  const textPayload = { kind: 'text', text: 'Carta: arroz', sourceUrl: safeUrl, links: [{ url: 'https://menus.example.com/menu.pdf', label: 'PDF' }] };
  assert.deepEqual(await frontend.importRestaurantUrl91(safeUrl, async () => textPayload), textPayload);
  for (const payload of [null, {}, { ...filePayload, base64: '?' }, { ...filePayload, mime: 'image/svg+xml' }, { ...filePayload, name: '../escape.jpg' }, { ...textPayload, text: 'x'.repeat(40_001) }, { ...textPayload, links: [{ url: 'https://elsewhere.example.org/menu.pdf', label: 'menu' }] }]) {
    await assert.rejects(frontend.importRestaurantUrl91(safeUrl, async () => payload));
  }
  await assert.rejects(frontend.importRestaurantUrl91(safeUrl, async () => ({ error: 'Web blocked', code: 'upstream_blocked' })), code('upstream_blocked'));
  await assert.rejects(frontend.importRestaurantUrl91('https://127.0.0.1', async () => { calls++; return filePayload; }));
  assert.equal(calls, 1);
  await assert.rejects(frontend.importRestaurantUrl91(safeUrl, async () => {
    queueMicrotask(() => controller.abort());
    return new Promise(() => {});
  }, controller.signal), { name: 'AbortError' });
});

let handler!: (request: Request) => Promise<Response>;
let authCalls = 0;
let authenticated = true;
let handlerFetchCalls = 0;
let handlerDnsCalls = 0;
let dnsAvailable = true;
let pinnedAvailable = true;
class NotFound extends Error {}
evaluate91(handlerPath, {
  'https://deno.land/std@0.168.0/http/server.ts': { serve: (fn: typeof handler) => { handler = fn; } },
  'https://esm.sh/@supabase/supabase-js@2.7.1': { createClient: () => ({ auth: { getUser: async (token: string) => {
    authCalls++; assert.equal(token, 'fixture-session-jwt');
    return authenticated ? { data: { user: { id: 'fixture-user' } }, error: null } : { data: { user: null }, error: new Error('invalid JWT') };
  } } }) },
  '../_shared/matchrim-restaurant-import91.ts': backend,
  '../_shared/matchrim-restaurant-url-transport91.ts': {
    restaurantPinnedTransportAvailable91: () => pinnedAvailable,
    fetchPinnedRestaurantUrl91: async (_url: string, _init: RequestInit, addresses: string[]) => {
      assert.deepEqual(addresses, ['8.8.8.8']); handlerFetchCalls++;
      return new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } });
    },
  },
}, {
  Deno: {
    env: { get: (key: string) => { assert.notEqual(key, 'MATCHRIM_RESTAURANT_PUBLIC_EGRESS_VERIFIED'); return 'fixture-only'; } }, errors: { NotFound },
    resolveDns: async (_hostname: string, type: string) => {
      handlerDnsCalls++;
      if (!dnsAvailable) throw new Error('Not supported by this runtime');
      if (type === 'AAAA') throw new NotFound();
      return ['8.8.8.8'];
    },
  },
  fetch: async () => assert.fail('Target URLs must never use native fetch'),
});
function request(body: unknown, authorization = 'Bearer fixture-session-jwt') {
  return new Request('https://edge.example.com/restaurant-import91', { method: 'POST', headers: { 'content-type': 'application/json', authorization }, body: JSON.stringify(body) });
}
await check('actual handler requires validated user JWT before external DNS/fetch', async () => {
  assert.equal((await handler(new Request('https://edge.example.com', { method: 'OPTIONS' }))).status, 200);
  assert.equal((await handler(new Request('https://edge.example.com'))).status, 405);
  assert.equal((await handler(request({ url: safeUrl }, ''))).status, 401);
  assert.equal(authCalls, 0);
  authenticated = false;
  assert.equal((await handler(request({ url: safeUrl }))).status, 401);
  assert.equal(handlerFetchCalls, 0);
  authenticated = true;
  const response = await handler(request({ url: safeUrl }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).kind, 'file');
  assert.equal(handlerFetchCalls, 1);
});
await check('actual handler fails closed when pinned TCP/TLS APIs are unavailable, without any env override', async () => {
  const beforeFetch = handlerFetchCalls;
  const beforeDns = handlerDnsCalls;
  pinnedAvailable = false;
    const response = await handler(request({ url: safeUrl }));
    assert.equal(response.status, 503);
    const result = await response.json();
    assert.equal(result.code, 'pinned_transport_unavailable');
    assert.equal(result.retryable, false);
  assert.equal(handlerFetchCalls, beforeFetch);
  assert.equal(handlerDnsCalls, beforeDns);
  pinnedAvailable = true;
});
await check('actual handler rejects malformed/big bodies, invalid URLs and unsupported DNS without remote access', async () => {
  const before = handlerFetchCalls;
  for (const body of [null, [], {}, { url: 42 }, { url: safeUrl, crawl: true }, { url: 'https://10.0.0.1' }]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(new Request('https://edge.example.com', { method: 'POST', headers: { authorization: 'Bearer fixture-session-jwt', 'content-type': 'application/json' }, body: '{' }))).status, 400);
  assert.equal((await handler(request({ url: 'a'.repeat(9000) }))).status, 413);
  dnsAvailable = false;
  const response = await handler(request({ url: safeUrl }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'dns_unavailable');
  assert.equal(handlerFetchCalls, before);
});

const transportPath = 'supabase/functions/_shared/matchrim-restaurant-url-transport91.ts';
const transportDependencies = {
  'node:buffer': { Buffer }, 'npm:http-parser-js@0.5.10': httpParser, 'npm:ipaddr.js@2.2.0': ipaddr,
  './matchrim-restaurant-import91.ts': backend,
};
const transport = evaluate91(transportPath, transportDependencies) as typeof import('../supabase/functions/_shared/matchrim-restaurant-url-transport91');
const wireResponse = (body = '<p>menu</p>') => `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${body.length}\r\n\r\n${body}`;
function pinnedFixture(wire: string, options: { badPeer?: boolean; badTlsPeer?: boolean; tlsFailure?: boolean; hangRead?: boolean; fragment?: number } = {}) {
  const calls: string[] = [];
  let cursor = 0;
  let written = '';
  let verified = false;
  let closed = 0;
  const bytes = encoder.encode(wire);
  const peer = { transport: 'tcp', hostname: options.badPeer ? '127.0.0.1' : '8.8.8.8', port: 443 };
  const connection = {
    remoteAddr: peer,
    close: () => { closed++; },
    read: async (buffer: Uint8Array) => {
      if (options.hangRead) return new Promise<never>(() => {});
      if (cursor === bytes.length) return null;
      const count = Math.min(bytes.length - cursor, buffer.length, options.fragment ?? 37);
      buffer.set(bytes.subarray(cursor, cursor + count)); cursor += count; return count;
    },
    write: async (buffer: Uint8Array) => { assert.ok(verified); written += new TextDecoder().decode(buffer); return buffer.length; },
  };
  const tls = { ...connection, remoteAddr: { hostname: options.badTlsPeer ? '127.0.0.1' : '8.8.8.8', port: 443 },
    handshake: async () => { calls.push('handshake'); if (options.tlsFailure) throw new Error('certificate hostname mismatch'); verified = true; },
  };
  return {
    runtime: {
      connect: async (opts: { hostname: string; port: number; transport: string }) => {
        assert.deepEqual(opts, { hostname: '8.8.8.8', port: 443, transport: 'tcp' }); calls.push('connect-ip'); return connection;
      },
      startTls: async (conn: unknown, opts: unknown) => {
        assert.equal(conn, connection); assert.deepEqual(opts, { hostname: 'menus.example.com', alpnProtocols: ['http/1.1'] }); calls.push('tls-hostname'); return tls;
      },
    }, calls, written: () => written, closed: () => closed,
  };
}
const pinnedInit: RequestInit = { method: 'GET', redirect: 'manual', headers: { Authorization: 'must-not-forward', Cookie: 'must-not-forward' } };
await check('pinned transport connects only validated IP, verifies original-host TLS before HTTP, and closes', async () => {
  const fixture = pinnedFixture(wireResponse());
  const response = await transport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, ['8.8.8.8'], fixture.runtime);
  assert.equal(response.status, 200); assert.equal(await response.text(), '<p>menu</p>');
  assert.deepEqual(fixture.calls, ['connect-ip', 'tls-hostname', 'handshake']);
  assert.ok(fixture.written().startsWith('GET /menu HTTP/1.1\r\nHost: menus.example.com\r\n'));
  assert.ok(fixture.written().includes('Accept-Encoding: identity'));
  assert.ok(!/Authorization|Cookie|must-not-forward/.test(fixture.written()));
  assert.ok(fixture.closed() > 0);
});
await check('pinned transport rejects private/mixed IP, peer mismatch, unavailable APIs and TLS failure before HTTP', async () => {
  for (const addresses of [[], ['127.0.0.1'], ['8.8.8.8', '::1']]) {
    const fixture = pinnedFixture(wireResponse());
    await assert.rejects(transport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, addresses, fixture.runtime), code('unsafe_transport_request'));
    assert.deepEqual(fixture.calls, []);
  }
  await assert.rejects(transport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, ['8.8.8.8'], {} as never), code('pinned_transport_unavailable'));
  for (const options of [{ badPeer: true }, { badTlsPeer: true }, { tlsFailure: true }]) {
    const fixture = pinnedFixture(wireResponse(), options);
    await assert.rejects(transport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, ['8.8.8.8'], fixture.runtime));
    assert.equal(fixture.written(), ''); assert.ok(fixture.closed() > 0);
  }
});
await check('proven HTTP parser handles chunked/EOF responses, interim headers and manual redirects', async () => {
  for (const [wire, text, status] of [
    ['HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nTransfer-Encoding: chunked\r\n\r\n4\r\nmenu\r\n0\r\n\r\n', 'menu', 200],
    ['HTTP/1.0 200 OK\r\nContent-Type: text/html\r\n\r\nmenu', 'menu', 200],
    ['HTTP/1.1 103 Early Hints\r\nLink: </style.css>\r\n\r\n' + wireResponse('menu'), 'menu', 200],
    ['HTTP/1.1 302 Found\r\nLocation: https://other.example.com/menu\r\nContent-Length: 99\r\n\r\n', '', 302],
  ] as const) {
    const fixture = pinnedFixture(wire);
    const response = await transport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, ['8.8.8.8'], fixture.runtime);
    assert.equal(response.status, status); assert.equal(await response.text(), text);
    assert.equal(fixture.calls.filter((call) => call === 'connect-ip').length, 1);
  }
});
await check('pinned parser rejects compression, ambiguous/truncated framing, oversized headers/body and cancels reads', async () => {
  for (const wire of [
    'HTTP/1.1 200 OK\r\nContent-Encoding: gzip\r\nContent-Length: 1\r\n\r\nx',
    'HTTP/1.1 200 OK\r\nContent-Length: 4\r\nContent-Length: 4\r\n\r\nmenu',
    'HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nContent-Length: 4\r\n\r\nmenu',
    'HTTP/1.1 200 OK\r\nContent-Length: 20\r\n\r\nshort',
    `HTTP/1.1 200 OK\r\nX-Huge: ${'x'.repeat(33_000)}\r\n\r\n`,
    'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 1048577\r\n\r\n',
  ]) {
    const fixture = pinnedFixture(wire, { fragment: 16_384 });
    await assert.rejects(transport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, ['8.8.8.8'], fixture.runtime));
    assert.ok(fixture.closed() > 0);
  }
  const controller = new AbortController();
  const fixture = pinnedFixture(wireResponse(), { hangRead: true });
  const result = transport.fetchPinnedRestaurantUrl91(safeUrl, { ...pinnedInit, signal: controller.signal }, ['8.8.8.8'], fixture.runtime);
  setTimeout(() => controller.abort(), 2);
  await assert.rejects(result, { name: 'AbortError' }); assert.ok(fixture.closed() > 0);
  const timeoutTransport = evaluate91(transportPath, transportDependencies, { setTimeout: (fn: () => void) => setTimeout(fn, 2) }) as typeof transport;
  const timeoutFixture = pinnedFixture('', { hangRead: true });
  await assert.rejects(timeoutTransport.fetchPinnedRestaurantUrl91(safeUrl, pinnedInit, ['8.8.8.8'], timeoutFixture.runtime), code('import_timeout'));
});

function actualPdfFixture91(pageCount: number): File {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Count ${pageCount} /Kids [${Array.from({ length: pageCount }, (_, index) => `${3 + 2 * index} 0 R`).join(' ')}] >>`,
  ];
  for (let index = 0; index < pageCount; index++) {
    const stream = `q ${(index % 5) / 5} 0.3 0.6 rg 10 10 120 180 re f Q\n`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 160 200] /Resources << >> /Contents ${4 + index * 2} 0 R >>`);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  }
  let content = '%PDF-1.7\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(content.length);
    content += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = content.length;
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) content += `${String(offset).padStart(10, '0')} 00000 n \n`;
  content += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return makeFile(content, `actual-${pageCount}.pdf`, 'application/pdf');
}

await check('real installed PDF.js parses/renders all 50 pages in Node DOM and rejects 51, with no HTTP', async () => {
  const requireRepo = createRequire(import.meta.url);
  const native = requireRepo('@napi-rs/canvas');
  Object.assign(globalThis, { DOMMatrix: native.DOMMatrix, ImageData: native.ImageData, Path2D: native.Path2D });
  // Legacy supplies Node 20 platform polyfills; its core/worker version matches the browser build.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = pathToFileURL(requireRepo.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
  const nativeCanvases: Array<{ width: number; height: number }> = [];
  const realFrontend = evaluate91(frontPath, {
    './imageAnalysis': { prepareImageForAnalysis: () => assert.fail('PDF rendering must use PDF.js') },
    'pdfjs-dist': pdfjs,
    'pdfjs-dist/build/pdf.worker.mjs?url': { __esModule: true, default: workerUrl },
  }, {
    File: NodeFile,
    document: { createElement: (tag: string) => {
      assert.equal(tag, 'canvas');
      const nativeCanvas = native.createCanvas(1, 1);
      let width = 1;
      let height = 1;
      // Native canvas resets zero to 350x150. Model DOM zero dimensions while freeing to 1x1.
      const canvas = {
        get width() { return width; },
        set width(value: number) { width = value; nativeCanvas.width = Math.max(1, value); },
        get height() { return height; },
        set height(value: number) { height = value; nativeCanvas.height = Math.max(1, value); },
        getContext: (...args: unknown[]) => nativeCanvas.getContext(...args),
        toBlob: (callback: (value: Blob) => void) => callback(new Blob([nativeCanvas.toBuffer('image/jpeg')], { type: 'image/jpeg' })),
      };
      nativeCanvases.push(canvas);
      return canvas;
    } },
  }) as typeof Frontend91;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => assert.fail('Real PDF fixture test must never use HTTP');
  try {
    const fifty = actualPdfFixture91(50);
    assert.equal((await realFrontend.inspectRestaurantFile(fifty)).pageCount, 50);
    assert.equal(nativeCanvases.length, 0, 'Inspection must not allocate render canvases');
    await assert.rejects(realFrontend.inspectRestaurantFile(actualPdfFixture91(51)), code('pdf_page_limit'));
    await assert.rejects(realFrontend.renderRestaurantPage(fifty, 51), code('invalid_page'));
    let count = 0;
    let last: File | undefined;
    for await (const page of realFrontend.iterateRestaurantPages91([fifty])) {
      assert.equal(page.pageNumber, ++count);
      assert.equal(page.file.type, 'image/jpeg');
      assert.ok(nativeCanvases.every((canvas) => canvas.width === 0 && canvas.height === 0), 'Each canvas is released before yielding the next File');
      last = page.file;
    }
    assert.equal(count, 50);
    assert.equal(nativeCanvases.length, 50);
    const image = await native.loadImage(Buffer.from(await last!.arrayBuffer()));
    const sample = native.createCanvas(image.width, image.height);
    sample.getContext('2d').drawImage(image, 0, 0);
    const pixel = sample.getContext('2d').getImageData(50, 50, 1, 1).data;
    assert.ok(pixel[0] > 180 && pixel[0] < 230 && pixel[1] > 50 && pixel[1] < 105 && pixel[2] > 125 && pixel[2] < 180, `Page 50 must contain its actual colored rectangle, not a blank/first page: ${Array.from(pixel)}`);
    sample.width = 0; sample.height = 0;
  } finally { globalThis.fetch = previousFetch; }
});

assert.equal(frontend.RESTAURANT_DOCUMENT_LIMITS91.fileBytes, backend.RESTAURANT_IMPORT_LIMITS91.fileBytes);
assert.equal(frontend.RESTAURANT_DOCUMENT_LIMITS91.textCharacters, backend.RESTAURANT_IMPORT_LIMITS91.textCharacters);
assert.equal(frontend.RESTAURANT_DOCUMENT_LIMITS91.links, backend.RESTAURANT_IMPORT_LIMITS91.links);
console.log(JSON.stringify({ passed: true, checks, scope: 'Real PDF.js/native canvas 50/51-page boundaries; real pinned HTML/IP/HTTP parsers; literal-IP TCP/original-host TLS adapter with stubbed sockets; actual Edge handler with stubbed auth and pinned transport. Zero live HTTP/model calls. Not browser/HEIC or deployed Edge validation.' }));
