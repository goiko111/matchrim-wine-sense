import { assertEquals } from 'jsr:@std/assert@1';
import { createHandler } from './handler.ts';

// A JWT whose payload is {"sub":"user-123"}; the signature is irrelevant (the gateway checks it).
const jwt = `x.${btoa(JSON.stringify({ sub: 'user-123' }))}.y`;

const setup = (status = 200, body = '{"results":[{"id":1}],"count":1,"limit":10}', key = 'secret') => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const fake = ((url: string, init: RequestInit) => {
    calls.push({ url, headers: init.headers as Record<string, string> });
    return Promise.resolve(new Response(body, { status, headers: { 'content-type': 'application/json' } }));
  }) as unknown as typeof fetch;
  return { calls, handle: createHandler('https://api.test/', key, fake) };
};

const post = (body: unknown, auth = `Bearer ${jwt}`) =>
  new Request('https://fn.test/', { method: 'POST', body: JSON.stringify(body), headers: { Authorization: auth } });

Deno.test('forwards the query with the secret and the user id', async () => {
  const { calls, handle } = setup();
  const res = await handle(post({ query: ' prado enea ', vintage: 2015, limit: 6 }));
  assertEquals(res.status, 200);
  assertEquals(calls[0].url, 'https://api.test/api/v1/matchrim/wines/search?q=prado+enea&includeUnlisted=1&vintage=2015&limit=6');
  assertEquals(calls[0].headers['X-Matchrim-Key'], 'secret');
  assertEquals(calls[0].headers['X-Matchrim-User'], 'user-123');
  assertEquals((await res.json()).count, 1);
});

Deno.test('a short query is empty and never reaches the backend', async () => {
  const { calls, handle } = setup();
  const res = await handle(post({ query: 'a' }));
  assertEquals(await res.json(), { results: [], count: 0 });
  assertEquals(calls.length, 0);
});

Deno.test('ignores a bad vintage and caps the limit at 20', async () => {
  const { calls, handle } = setup();
  await handle(post({ query: 'muga', vintage: 'abc', limit: 500 }));
  assertEquals(calls[0].url, 'https://api.test/api/v1/matchrim/wines/search?q=muga&includeUnlisted=1&limit=20');
});

Deno.test('a 400 from the backend is just no matches; other errors pass through', async () => {
  assertEquals(await (await setup(400, '{"error":"invalid_query"}').handle(post({ query: 'de la' }))).json(), { results: [], count: 0 });
  assertEquals((await setup(429, '{"error":"rate_limited"}').handle(post({ query: 'muga' }))).status, 429);
});

Deno.test('is not configured without the secret and only accepts POST', async () => {
  assertEquals((await setup(200, '{}', '').handle(post({ query: 'muga' }))).status, 503);
  assertEquals((await setup().handle(new Request('https://fn.test/'))).status, 405);
});

Deno.test('asks for unlisted catalogue wines and passes an unlisted result through untouched', async () => {
  const unlisted = '{"results":[{"id":null,"representativePublicId":null,"mantalakWineId":217480,"name":"La Migratoria","webUrl":null}],"count":1}';
  const { calls, handle } = setup(200, unlisted);
  const res = await handle(post({ query: 'migratoria' }));
  assertEquals(new URL(calls[0].url).searchParams.get('includeUnlisted'), '1');
  assertEquals((await res.json()).results[0].mantalakWineId, 217480);
});

Deno.test('word order is the backend\'s business: the query goes through as typed', async () => {
  const { calls, handle } = setup();
  await handle(post({ query: 'enea prado' }));
  assertEquals(new URL(calls[0].url).searchParams.get('q'), 'enea prado');
});

Deno.test('a token without a user (the project anon key) never reaches the backend', async () => {
  const { calls, handle } = setup();
  const anonKey = `x.${btoa(JSON.stringify({ role: 'anon' }))}.y`;
  for (const auth of [`Bearer ${anonKey}`, '', 'Bearer not-a-jwt']) {
    const res = await handle(post({ query: 'muga' }, auth));
    assertEquals(res.status, 401);
  }
  assertEquals(calls.length, 0);
});
