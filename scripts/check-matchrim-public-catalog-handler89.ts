import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import * as contract from '../supabase/functions/_shared/matchrim-public-library89';
import { isSafeCanonicalLabelMatch } from '../src/utils/winerimLabelIdentity';

// Execute the actual serve callback, replacing only the server registration
// and outbound fetch. The default suite is offline; --live uses three public GETs.
const source = readFileSync(resolve('supabase/functions/search-wines-qa89/index.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const load = (fetcher: typeof fetch, fastTimeout = false) => {
  let handler: (request: Request) => Promise<Response>;
  const imports = (id: string) => id.includes('/http/server') ? { serve: (value: typeof handler) => { handler = value; } }
    : id.includes('matchrim-public-library89') ? contract : assert.fail('Unexpected dependency: ' + id);
  const timeout = (callback: () => void, delay: number) => {
    assert.equal(delay, 10000);
    return setTimeout(callback, fastTimeout ? 5 : delay);
  };
  new Function('require', 'exports', 'fetch', 'setTimeout', compiled)(imports, {}, fetcher, timeout);
  return handler!;
};
const uuid = 'b653e084-e8e1-448c-bc03-507a1cea3810';
const attrs = { power: 2.4, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 };
const wine = { id: 123, name: 'Luna', subname: 'Reserva', winery: 'Bodegas Ejemplo', vintage: '2021',
  slugname: 'Luna-Reserva_2021', region: 'Rioja', country: 'ES', type: 'Tinto', grapes: [['Tempranillo']], tastingAttributes: attrs };
const page = (results: unknown[] = [wine], count = results.length) => ({ results, count, page: 1, limit: 20 });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const request = (value: unknown, headers: Record<string, string> = {}) => new Request('http://localhost/search-wines-qa89', {
  method: 'POST', body: JSON.stringify(value), headers: { 'Content-Type': 'application/json', ...headers },
});
const stub = (responses: unknown[] = [{ restaurant: uuid }, page(), wine]) => {
  const calls: { url: string; options: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, options) => {
    assert.ok(responses.length, 'Unexpected extra read');
    calls.push({ url: String(url), options });
    const value = responses.shift();
    if (value instanceof Error) throw value;
    return value instanceof Response ? value : json(value);
  };
  return { handler: load(fetcher), calls };
};
let checks = 0;
const check = async (name: string, run: () => unknown | Promise<unknown>) => { await run(); checks++; console.log('PASS', name); };
const invoke = async (values: unknown[], input: unknown = { query: 'Luna Reserva', limit: 20 }) => {
  const context = stub(values), response = await context.handler(request(input));
  return { ...context, response, body: await response.json() };
};

if (process.argv.includes('--live')) {
  let reads = 0;
  const evidence: { path: string; status: number }[] = [];
  const handler = load(async (url, options) => {
    const target = new URL(String(url));
    assert.equal(target.origin, 'https://app.winerim.com'); assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit'); assert.equal(options.body, undefined); assert.ok(++reads <= 3);
    const response = await fetch(url, options);
    evidence.push({ path: target.pathname + target.search, status: response.status });
    return response;
  });
  const response = await handler(request({ query: 'Manzanilla La Gitana', limit: 20 }));
  const body = await response.json();
  assert.equal(response.status, 200); assert.equal(body.meta.status, 'complete');
  assert.equal(body.wines.length, 1); assert.equal(body.wines[0].id, '278688');
  assert.equal(body.wines[0].originalSheetSource, 'winerim-api');
  assert.equal(body.wines[0].originalSheetUrl, 'https://web.winerim.com/the-library/wines/278688/Manzanilla-La-Gitana');
  assert.equal(body.wines[0].tasting_attributes.tannin, 0);
  const report = JSON.stringify({ observedAt: new Date().toISOString(), reads: evidence, httpStatus: response.status, result: body,
    mutations: 0, credentialsSent: 0, filesSent: 0, scope: 'Actual new HTTP handler, anonymous local POST plus real public Winerim GETs; not deployed gateway or catalog coverage certification' }, null, 2);
  await new Promise<void>(resolve => { process.stdout.write(report + '\n', () => resolve()); });
  process.exit(0);
}

await check('Anonymous HTTP POST returns independently read first-party identity, qualifiers and valid zero', async () => {
  const { response, body, calls } = await invoke([{ restaurant: uuid }, page(), { ...wine, grapes: [{ name: 'Tempranillo' }] }]);
  assert.equal(response.status, 200); assert.equal(calls.length, 3);
  assert.equal(body.meta.source, 'winerim-public-library'); assert.equal(body.meta.scope, 'public-library-only');
  assert.equal(body.meta.originalDetail, 'verified'); assert.equal(body.wines[0].id, '123');
  assert.equal(body.wines[0].name, 'Luna Reserva'); assert.equal(body.wines[0].producer, wine.winery);
  assert.deepEqual(body.wines[0].grape_varieties, ['Tempranillo']);
  assert.deepEqual(body.wines[0].tasting_attributes, attrs); assert.deepEqual(body.wines[0].tastingAttributes, attrs);
  assert.equal(body.wines[0].originalSheetUrl, 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021');
  assert.equal(body.wines[0].originalSheetApiUrl, `https://app.winerim.com/api/v1/restaurant/${uuid}/wines/123/Luna-Reserva_2021`);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, 'https://app.winerim.com'); assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer');
    assert.deepEqual(options.headers, { Accept: 'application/json' }); assert.equal(options.body, undefined);
    assert.ok(options.signal);
  }
});
await check('Incoming JWT, apikey and private headers never propagate upstream', async () => {
  const { handler, calls } = stub();
  const response = await handler(request({ query: 'Luna Reserva' }, { Authorization: 'Bearer fixture-not-real', apikey: 'fixture-only', Cookie: 'private=fixture' }));
  assert.equal(response.status, 200);
  assert.ok(calls.every(call => JSON.stringify(call.options.headers) === JSON.stringify({ Accept: 'application/json' })));
});
await check('OPTIONS and unsupported methods perform zero outbound reads', async () => {
  const { handler, calls } = stub([]);
  assert.equal((await handler(new Request('http://localhost', { method: 'OPTIONS' }))).status, 200);
  const response = await handler(new Request('http://localhost', { method: 'GET' }));
  assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'POST, OPTIONS'); assert.equal(calls.length, 0);
});
for (const input of [null, [], {}, { query: 42 }, { query: {} }, { query: 'x'.repeat(121) }, { query: 'Luna\nReserva' },
  { query: 'Luna', limit: 0 }, { query: 'Luna', limit: 21 }, { query: 'Luna', limit: 1.2 }, { query: 'Luna', limit: '20' }]) {
  await check('Malformed input is 400 before any upstream read: ' + JSON.stringify(input).slice(0, 60), async () => {
    const { handler, calls } = stub([]);
    assert.equal((await handler(request(input))).status, 400); assert.equal(calls.length, 0);
  });
}
await check('Malformed JSON and bounded request bodies are rejected without reads', async () => {
  const { handler, calls } = stub([]);
  assert.equal((await handler(new Request('http://localhost', { method: 'POST', body: '{' }))).status, 400);
  assert.equal((await handler(new Request('http://localhost', { method: 'POST', body: ' '.repeat(4097) }))).status, 413);
  assert.equal((await handler(new Request('http://localhost', { method: 'POST', body: '{}', headers: { 'Content-Length': '4097' } }))).status, 413);
  assert.equal(calls.length, 0);
});
for (const query of ['', ' ', 'x']) {
  await check('Short query returns neutral empty result without reads', async () => {
    const { body, response, calls } = await invoke([], { query });
    assert.equal(response.status, 200); assert.deepEqual(body.wines, []); assert.equal(body.meta.status, 'empty-query'); assert.equal(calls.length, 0);
  });
}
await check('Query punctuation stays a single encoded text parameter, never an upstream path', async () => {
  const query = 'Luna &text=Other /?limit=100 #"';
  const { calls } = await invoke([{ restaurant: uuid }, page([])], { query });
  const url = new URL(calls[1].url);
  assert.deepEqual([...url.searchParams.keys()], ['page', 'text']); assert.equal(url.searchParams.get('text'), query);
});
await check('Complete empty page is Library-scoped, not proof of global nonexistence', async () => {
  const { response, body, calls } = await invoke([{ restaurant: uuid }, page([])]);
  assert.equal(response.status, 200); assert.deepEqual(body.wines, []); assert.equal(body.meta.sourceCount, 0); assert.equal(calls.length, 2);
});
await check('Distinct complete candidates remain available for existing strict client resolution, with no guessed original links', async () => {
  const other = { ...wine, id: 124, subname: 'Crianza', slugname: 'Luna-Crianza_2021' };
  const { body, calls } = await invoke([{ restaurant: uuid }, page([wine, other])]);
  assert.equal(calls.length, 2); assert.equal(body.wines.length, 2); assert.equal(body.meta.originalDetail, 'not-requested');
  assert.ok(body.wines.every((row: contract.PublicLibrarySearchWine) => !row.originalSheetSource && !row.originalSheetUrl && !row.originalSheetApiUrl));
  const input = { name: 'Luna Reserva', producer: wine.winery, vintage: '2021' };
  assert.equal(isSafeCanonicalLabelMatch(input, body.wines[0]), true);
  assert.equal(isSafeCanonicalLabelMatch(input, body.wines[1]), false);
  assert.equal(isSafeCanonicalLabelMatch({ ...input, producer: 'Different winery' }, body.wines[0]), false);
  assert.equal(isSafeCanonicalLabelMatch({ ...input, vintage: '2020' }, body.wines[0]), false);
});
for (const value of [page([wine], 21), page([wine], 0), page(Array(21).fill(wine)), page([wine, { ...wine, id: 124, subname: 'Crianza' }])]) {
  await check('Truncated or limit-limited result cannot hide competing candidates', async () => {
    const { response, body, calls } = await invoke([{ restaurant: uuid }, value], { query: 'Luna', limit: 1 });
    assert.equal(response.status, 200); assert.deepEqual(body.wines, []); assert.equal(body.meta.status, 'incomplete'); assert.equal(calls.length, 2);
  });
}
for (const value of [{ ...page(), page: 2 }, { ...page(), count: '1' }, { results: {}, page: 1, count: 0 },
  page([{ ...wine, id: null }]), page([{ ...wine, winery: null }]), page([{ ...wine, vintage: {} }]),
  page([{ ...wine, subname: {} }]), page([{ ...wine, name: 'Luna\nReserva' }])]) {
  await check('Malformed page/row abstains entirely rather than dropping a possible competitor', async () => {
    const { response, body } = await invoke([{ restaurant: uuid }, value]);
    assert.equal(response.status, 502); assert.deepEqual(body.wines, []); assert.equal(body.meta.status, 'malformed');
  });
}
for (const other of [{ ...wine, id: 124 }, { ...wine, name: 'Different' }, { ...wine, tastingAttributes: { ...attrs, tannin: 4 } },
  { ...wine, slugname: 'Different-Slug' }]) {
  await check('Repeated identity/different IDs or conflicting same-ID facts are ambiguous', async () => {
    const { body, calls } = await invoke([{ restaurant: uuid }, page([wine, other])]);
    assert.deepEqual(body.wines, []); assert.equal(body.meta.status, 'ambiguous'); assert.equal(calls.length, 2);
  });
}
await check('Identical duplicated source rows may coalesce without a fabricated ID', async () => {
  const { body } = await invoke([{ restaurant: uuid }, page([wine, wine]), wine]);
  assert.equal(body.wines.length, 1); assert.equal(body.wines[0].id, '123');
});
for (const change of [{ id: 999 }, { slugname: 'Different' }, { winery: 'Different producer' }, { subname: 'Gran Reserva' },
  { vintage: '2020' }, { region: 'Bordeaux' }, { country: 'FR' }]) {
  await check('Original detail mismatch returns no usable candidate: ' + JSON.stringify(change), async () => {
    const { body } = await invoke([{ restaurant: uuid }, page(), { ...wine, ...change }]);
    assert.deepEqual(body.wines, []); assert.equal(body.meta.status, 'ambiguous'); assert.equal(body.meta.originalDetail, 'mismatch');
  });
}
for (const change of [{ id: 'https://evil.test' }, { id: ' 123' }, { id: 'winerim-4' }, { id: 1.2 }, { id: -1 },
  { id: Number.MAX_SAFE_INTEGER + 1 }, { slugname: '../secret' }, { slugname: 'slug?x=1' }, { slugname: 'slug%2Fsecret' }]) {
  await check('Unsafe source identifiers cannot become a detail URL: ' + JSON.stringify(change), async () => {
    const { body, calls } = await invoke([{ restaurant: uuid }, page([{ ...wine, ...change }])]);
    assert.deepEqual(body.wines, []); assert.equal(calls.length, 2);
  });
}
await check('Untrusted upstream URLs and source markers never override the verified route', async () => {
  const raw = { ...wine, publicUrl: 'https://evil.test', originalSheetSource: 'winerim-api', originalSheetUrl: 'https://evil.test',
    originalSheetApiUrl: 'https://web.winerim.com/the-library/wines/999/fake' };
  const { body } = await invoke([{ restaurant: uuid }, page([raw]), raw]);
  assert.equal(body.wines[0].originalSheetUrl, 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021');
});
for (const value of [undefined, null, {}, { ...attrs, tannin: null }, { ...attrs, power: -1 }, { ...attrs, power: 6 },
  { ...attrs, power: '4' }, { ...attrs, power: true }]) {
  await check('Invalid/missing detail sensory never borrows valid summary values', async () => {
    const { body } = await invoke([{ restaurant: uuid }, page(), { ...wine, tastingAttributes: value }]);
    assert.equal(body.wines.length, 1); assert.equal(body.wines[0].originalSheetSource, 'winerim-api');
    assert.equal(body.wines[0].tasting_attributes, undefined); assert.equal(body.wines[0].tastingAttributes, undefined);
  });
}
await check('NaN/Infinity sensory and absent vintage never turn into invented numeric data', () => {
  assert.equal(contract.parsePublicLibrarySensory({ ...attrs, power: NaN }), null);
  assert.equal(contract.parsePublicLibrarySensory({ ...attrs, power: Infinity }), null);
  const row = contract.parsePublicLibraryWine({ ...wine, vintage: null });
  assert.equal(row?.vintage, null); assert.equal(row?.tastingAttributes?.tannin, 0);
});
await check('Unavailable detail preserves actual search facts but attaches no original provenance', async () => {
  const { response, body, calls } = await invoke([{ restaurant: uuid }, page(), new Error('Unavailable')]);
  assert.equal(response.status, 200); assert.equal(body.wines[0].name, 'Luna Reserva');
  assert.deepEqual(body.wines[0].tasting_attributes, attrs); assert.equal(body.wines[0].originalSheetSource, undefined);
  assert.equal(body.wines[0].originalSheetUrl, undefined); assert.equal(body.meta.originalDetail, 'unavailable'); assert.equal(calls.length, 3);
});
for (const value of [{ restaurant: 'https://evil.test' }, { restaurant: uuid + '/..' }, {}, null]) {
  await check('Resolver cannot redirect to an input-controlled host/path', async () => {
    const { response, body, calls } = await invoke([value]);
    assert.equal(response.status, 502); assert.deepEqual(body.wines, []); assert.equal(calls.length, 1);
  });
}
for (const value of [new Error('Network failure with private upstream text'), json({}, 401), json({}, 503),
  new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } }),
  new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
  new Response(' '.repeat(16385), { headers: { 'Content-Type': 'application/json' } })]) {
  await check('Upstream transport/type/JSON/byte errors are neutral 502, not auth401 or fabricated data', async () => {
    const { response, body, calls } = await invoke([value]);
    assert.equal(response.status, 502); assert.deepEqual(body.wines, []); assert.equal(body.meta.status, 'unavailable');
    assert.ok(!JSON.stringify(body).includes('private upstream')); assert.equal(calls.length, 1);
  });
}
await check('Search response byte bound stops reads before detail', async () => {
  const { response, calls } = await invoke([{ restaurant: uuid }, new Response(' '.repeat(262145), { headers: { 'Content-Type': 'application/json' } })]);
  assert.equal(response.status, 502); assert.equal(calls.length, 2);
});
await check('Aggregate response budget prevents original provenance even when individual reads fit', async () => {
  const padded = (value: unknown) => {
    const body = JSON.stringify(value);
    return new Response(body + ' '.repeat(262144 - body.length), { headers: { 'Content-Type': 'application/json' } });
  };
  const { response, body, calls } = await invoke([{ restaurant: uuid }, padded(page()), padded(wine)]);
  assert.equal(response.status, 200); assert.equal(calls.length, 3);
  assert.equal(body.meta.originalDetail, 'unavailable'); assert.equal(body.wines[0].originalSheetSource, undefined);
  assert.equal(body.wines[0].originalSheetUrl, undefined);
});
await check('Ten-second deadline cancels a pending GET without retry', async () => {
  let calls = 0;
  const handler = load(async (_url, options) => {
    calls++;
    return new Promise<Response>((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  }, true);
  const response = await handler(request({ query: 'Luna Reserva' }));
  assert.equal(response.status, 504); assert.deepEqual((await response.json()).wines, []); assert.equal(calls, 1);
});
await check('Response-body stall is cancelled by the same operation deadline', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const handler = load(async () => new Response(stream, { headers: { 'Content-Type': 'application/json' } }), true);
  assert.equal((await handler(request({ query: 'Luna Reserva' }))).status, 504); assert.equal(cancelled, true);
});
await check('Client cancellation aborts the in-flight upstream GET', async () => {
  const controller = new AbortController(); let calls = 0;
  const handler = load(async (_url, options) => {
    calls++;
    queueMicrotask(() => controller.abort());
    return new Promise<Response>((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }));
  });
  const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({ query: 'Luna Reserva' }), signal: controller.signal });
  assert.equal((await handler(req)).status, 504); assert.equal(calls, 1);
});
await check('No database, Deno environment, provider, model or service-role dependencies exist', () => {
  assert.ok(!/createClient|Deno\.env|service_role|SERVICE_ROLE|LOVABLE|chat\/completions|\.from\(/.test(source));
  assert.ok(!/Authorization:|apikey:|Bearer /.test(source));
});
console.log(JSON.stringify({ checks, passed: checks, remoteReads: 0, mutations: 0,
  scope: 'Actual new HTTP handler with stubbed outbound public fetch; strict source/identity/transport contracts, not deployed gateway or catalog coverage QA' }));
