import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createMasterBridge194, masterRequestUrl194 } from '../supabase/functions/_shared/matchrim-master194';
import { masterSearchParams188, parseMasterPage188, parseMasterDetail188, parseMasterMapping188 } from '../src/utils/nativeMasterContract188';

const KEY = 'controlled-server-key194', TOKEN = 'controlled-session194';
const USER = '194abcde-0000-4000-8000-000000000001';
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error('NO_EXTERNAL_CALLS_IN_BRIDGE194'); };
let groups = 0;
const test = async (name: string, work: () => unknown | Promise<unknown>) => { await work(); groups++; console.log('PASS', name); };
const body = { operation: 'search', query: { name: 'AMARONE', limit: 2 } };
const request = (value: unknown = body, options: RequestInit = {}) => new Request('http://controlled.invalid/master', {
  method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(value), ...options,
});
const fixture = (name: string) => JSON.parse(fs.readFileSync(name, 'utf8'));
const harness = (response: typeof fetch = async () => Response.json({ results: [] }), timeoutMs = 200) => {
  let auth = 0, secret = 0, calls = 0;
  const handler = createMasterBridge194({ authenticate: async token => { auth++; return token === TOKEN ? USER : null; },
    readSecret: () => { secret++; return KEY; }, timeoutMs,
    fetcher: async (url, init) => {
      calls++; assert.equal(init?.method, 'GET'); assert.equal(init.redirect, 'error'); assert.equal(init.credentials, 'omit');
      assert.equal(init.body, undefined); assert.deepEqual(init.headers,
        { Accept: 'application/json', 'X-Matchrim-Key': KEY, 'X-Matchrim-User': USER });
      return response(url, init);
    } });
  return { handler, counts: () => ({ auth, secret, calls }) };
};
const clean = async (response: Response) => {
  const text = await response.text(); assert(!text.includes(KEY)); assert(!text.includes(TOKEN));
  assert(!text.includes(USER)); assert(!response.headers.has('x-matchrim-user'));
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert(!response.headers.has('set-cookie'));
  assert(!response.headers.has('x-matchrim-key')); assert(!response.headers.has('access-control-allow-credentials'));
  return JSON.parse(text);
};

try {
  await test('Strict search/detail/ID operations; no arbitrary URL, image, profile or key input', () => {
    for (const query of [{ name: 'Zorrera', winery: 'Chivite', vintage: '2015', vintageMatch: 'only' as const },
      { q: 'Gross', page: 2, limit: 50 }, { name: 'AMARONE', winery: 'BERTANI' }]) {
      assert.equal(masterRequestUrl194({ operation: 'search', query }),
        `https://app.winerim.com/api/v1/matchrim/wines/search?${masterSearchParams188(query)}`);
    }
    assert.equal(masterRequestUrl194({ operation: 'detail', mantalakWineId: 180278 }), 'https://app.winerim.com/api/v1/matchrim/wines/180278');
    assert.equal(masterRequestUrl194({ operation: 'ids', publicIds: [362891, 363580] }),
      'https://app.winerim.com/api/v1/matchrim/wines/ids?publicIds=362891%2C363580');
    for (const value of [null, [], { operation: 'url', url: 'https://evil.example' }, { ...body, key: KEY },
      { operation: 'detail', mantalakWineId: '180278' }, { operation: 'ids', publicIds: [1, 1] },
      { operation: 'ids', publicIds: [] }, { operation: 'ids', publicIds: Array.from({ length: 101 }, (_, i) => i + 1) },
      ...[{ q: 'ab' }, { q: 'AMARONE', page: 201, limit: 50 }, { q: 'AMARONE', limit: 51 },
        { name: 'A\nBERTANI' }, { name: 'AMARONE', vintageMatch: 'only' }, { q: 'AMARONE', profile: {} },
        { name: 'one two three four five six seven' }, { q: 'AMARONE', page: '2' },
        { q: 'AMARONE', vintage: '20999' }, { q: 'AMARONE', page: null },
        { q: 'AMARONE', limit: null }].map(query => ({ operation: 'search', query }))]) {
      assert.equal(masterRequestUrl194(value), null);
    }
  });
  await test('Preflight/method/missing or invalid session never retrieve server key or catalogue', async () => {
    const h = harness();
    assert.equal((await h.handler(new Request('http://test.invalid', { method: 'OPTIONS' }))).status, 204);
    assert.equal((await h.handler(new Request('http://test.invalid'))).status, 405);
    assert.equal((await h.handler(request(body, { headers: { 'Content-Type': 'application/json' } }))).status, 401);
    assert.equal((await h.handler(request(body, { headers: { Authorization: 'Bearer invalid', 'Content-Type': 'application/json' } }))).status, 401);
    assert.deepEqual(h.counts(), { auth: 1, secret: 0, calls: 0 });
  });
  await test('Invalid/oversized/stalled request, absent server key, and pre-cancellation fail closed', async () => {
    const h = harness(undefined, 20);
    assert.equal((await h.handler(request({ ...body, url: 'https://evil.example' }))).status, 400);
    assert.equal((await h.handler(request('x'.repeat(13000)))).status, 400);
    assert.equal((await h.handler(request(body, { headers: { Authorization: `Bearer ${TOKEN}` } }))).status, 415);
    const stalled = new Request('http://test.invalid', { method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: new ReadableStream({ start() { /* Deliberate stalled request. */ } }), duplex: 'half' } as RequestInit);
    assert.equal((await h.handler(stalled)).status, 504);
    const controller = new AbortController(); controller.abort();
    assert.equal((await h.handler(request(body, { signal: controller.signal }))).status, 499);
    assert.equal(h.counts().calls, 0); assert.equal(h.counts().secret, 0);
    const unconfigured = createMasterBridge194({ authenticate: async () => USER, readSecret: () => undefined,
      fetcher: async () => { throw new Error('MUST_NOT_FETCH'); } });
    assert.equal((await unconfigured(request())).status, 503);
  });
  await test('Retained real search/detail/mapping pass one GET without adding identity or affinity fields', async () => {
    const cases = [
      { input: { operation: 'search', query: { q: 'GROSS', limit: 50 } }, value: fixture('qa-fixtures/master194/gross-page1.observed.json'),
        validate: (value: unknown) => parseMasterPage188(value, 1, 50) },
      { input: { operation: 'detail', mantalakWineId: 180278 }, value: fixture('qa-fixtures/master193/2-BODY.json'),
        validate: (value: unknown) => parseMasterDetail188(value, 180278) },
      { input: { operation: 'ids', publicIds: [362891, 363580] }, value: fixture('qa-fixtures/master193/6-BODY.json'),
        validate: (value: unknown) => parseMasterMapping188(value, [362891, 363580]) },
    ];
    for (const row of cases) {
      const h = harness(async url => { assert.equal(String(url), masterRequestUrl194(row.input)); return Response.json(row.value); });
      const response = await h.handler(request(row.input)); assert.equal(response.status, 200);
      const value = await clean(response); assert.deepEqual(value, row.value); assert(row.validate(value));
      assert.equal(value.confirmedIdentity, undefined); assert.equal(value.affinity, undefined);
      assert.deepEqual(h.counts(), { auth: 1, secret: 1, calls: 1 });
    }
  });
  await test('All40retained live bodies traverse bridge and strict decoder offline, with no extra pagination', async () => {
    for (let index = 1; index <= 40; index++) {
      const prefix = `qa-fixtures/master194/responses/${String(index).padStart(2, '0')}`;
      const receipt = fixture(`${prefix}-RECEIPT.json`), payload = fixture(`${prefix}-BODY.json`);
      assert.equal(receipt.httpStatus, 200); const url = new URL(receipt.url);
      const search = url.pathname.endsWith('/search');
      const query = Object.fromEntries([...url.searchParams].map(([key, value]) => [key,
        key === 'page' || key === 'limit' ? Number(value) : value]));
      const canonicalId = Number(url.pathname.split('/').at(-1));
      const input = search ? { operation: 'search', query } : { operation: 'detail', mantalakWineId: canonicalId };
      const h = harness(async upstream => { assert.equal(String(upstream), receipt.url); return Response.json(payload); });
      const response = await h.handler(request(input)); assert.equal(response.status, 200);
      const value = await clean(response);
      assert(search ? parseMasterPage188(value, Number(query.page), Number(query.limit)) : parseMasterDetail188(value, canonicalId));
      assert.deepEqual(h.counts(), { auth: 1, secret: 1, calls: 1 });
    }
  });
  await test('Upstream errors never leak credential/body/headers and never retry', async () => {
    for (const [status, expected] of [[401, 503], [403, 503], [429, 429], [500, 502], [302, 502]]) {
      const h = harness(async () => new Response(KEY, { status, headers: { 'Retry-After': '9999', 'Set-Cookie': KEY, 'X-Matchrim-Key': KEY } }));
      const response = await h.handler(request()); assert.equal(response.status, expected);
      if (status === 429) assert.equal(response.headers.get('retry-after'), '3600');
      await clean(response); assert.equal(h.counts().calls, 1);
    }
    for (const respond of [async () => { throw new Error(KEY); }, async () => Response.json({ key: KEY }),
      async () => Response.json({ user: USER }), async () => Response.json({ token: TOKEN }),
      async () => new Response('{"key":"' + [...KEY].map(char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join('') + '"}',
        { headers: { 'Content-Type': 'application/json' } }),
      async () => new Response('not JSON'), async () => Response.json([]),
      async () => Response.json({ large: 'x'.repeat(262145) })]) {
      const h = harness(respond); const response = await h.handler(request()); assert.equal(response.status, 502);
      await clean(response); assert.equal(h.counts().calls, 1);
    }
  });
  await test('Deadline bounds Auth, fetch and response body; cancellation aborts catalogue signal', async () => {
    const authStall = createMasterBridge194({ authenticate: async () => new Promise<string | null>(() => undefined),
      readSecret: () => { throw new Error('MUST_NOT_READ'); }, fetcher: globalThis.fetch, timeoutMs: 20 });
    assert.equal((await authStall(request())).status, 504);
    for (const respond of [async () => new Promise<Response>(() => undefined),
      async () => new Response(new ReadableStream({ start() { /* Deliberate stalled body. */ } }), { headers: { 'Content-Type': 'application/json' } })]) {
      const h = harness(respond, 20); assert.equal((await h.handler(request())).status, 504); assert.equal(h.counts().calls, 1);
    }
    const controller = new AbortController(); let signal: AbortSignal | null = null;
    const h = harness(async (_url, init) => { signal = init?.signal ?? null; controller.abort(); return new Promise<Response>(() => undefined); });
    const response = await h.handler(request(body, { signal: controller.signal })); assert.equal(response.status, 499);
    assert((signal as AbortSignal | null)?.aborted); assert.equal(h.counts().calls, 1);
  });
  await test('Actual entrypoint verifies getUser with user token; missing/anonymous/rejected users cannot read catalogue', async () => {
    const source = fs.readFileSync('supabase/functions/matchrim-master-catalog/index.ts', 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    let user: { id: string; is_anonymous?: boolean } | null = { id: USER }, authError = false;
    let handler: ReturnType<typeof createMasterBridge194> | undefined, calls = 0, userChecks = 0;
    const env = { SUPABASE_URL: 'https://controlled-auth.invalid', SUPABASE_ANON_KEY: 'controlled-anon194', MATCHRIM_GOIKO_KEY: KEY };
    const createClient = (url: string, anon: string, options: { global: { headers: { Authorization: string }; fetch: typeof fetch }; auth: { persistSession: boolean } }) => {
      assert.equal(url, env.SUPABASE_URL); assert.equal(anon, env.SUPABASE_ANON_KEY);
      assert.equal(options.global.headers.Authorization, `Bearer ${TOKEN}`); assert.equal(options.auth.persistSession, false);
      return { auth: { getUser: async (token: string) => { userChecks++; assert.equal(token, TOKEN); return { data: { user }, error: authError ? {} : null }; } } };
    };
    vm.runInNewContext(js, { exports: {}, Deno: { env: { get: (name: keyof typeof env) => env[name] }, serve: (value: typeof handler) => { handler = value; } },
      require: (specifier: string) => {
        if (specifier === 'https://esm.sh/@supabase/supabase-js@2.7.1') return { createClient };
        if (specifier === '../_shared/matchrim-master194.ts') return { createMasterBridge194 };
        throw new Error('UNAPPROVED_MODULE');
      }, fetch: async (_url: string, init: RequestInit) => {
        calls++; assert.equal(new Headers(init.headers).get('X-Matchrim-User'), USER);
        assert(!new Headers(init.headers).has('Authorization')); return Response.json({ controlled: true });
      } });
    assert(handler); assert.equal((await handler(request())).status, 200); assert.equal(calls, 1);
    for (const identity of [null, { id: USER, is_anonymous: true }, { id: 'invalid-id' }, { id: '' }]) {
      user = identity; assert.equal((await handler(request())).status, 401);
    }
    user = { id: USER }; authError = true; assert.equal((await handler(request())).status, 401);
    assert.equal(calls, 1); assert.equal(userChecks, 6);
  });
  await test('Quota identity is trusted Auth UUID only; forged client IDs and invalid trusted identities fail closed', async () => {
    const seen: string[] = [];
    let verified: string | null = USER;
    let secrets = 0;
    const handler = createMasterBridge194({ authenticate: async () => verified,
      readSecret: () => { secrets++; return KEY; }, fetcher: async (_url, init) => {
        const headers = new Headers(init?.headers);
        assert(!headers.has('Authorization')); seen.push(headers.get('X-Matchrim-User')!);
        return Response.json({ results: [] });
      } });
    const spoofed = () => request(body, { headers: { Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json', 'X-Matchrim-User': 'attacker-controlled-user' } });
    assert.equal((await handler(spoofed())).status, 200);
    verified = USER.toUpperCase(); assert.equal((await handler(spoofed())).status, 200);
    verified = '19400000-0000-4000-8000-000000000002';
    assert.equal((await handler(spoofed())).status, 200);
    assert.deepEqual(seen, [USER, USER, verified]);
    assert.equal((await handler(request({ ...body, userId: USER }))).status, 400);
    for (const invalid of [null, '', 'true', 'controlled-user', `${USER}\r\nX-Evil: yes`, 'x'.repeat(65)]) {
      verified = invalid; assert.equal((await handler(spoofed())).status, 401);
    }
    assert.equal(secrets, 3); assert.equal(seen.length, 3);
  });
  console.log(JSON.stringify({ passed: groups, failed: 0, externalRequests: 0, keychainReads: 0,
    deployment: false, appActivation: false, scope: 'Controlled in-memory server bridge; not hosted integration or image recognition' }));
} finally { globalThis.fetch = originalFetch; }
