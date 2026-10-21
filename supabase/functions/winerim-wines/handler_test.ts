import { assertEquals } from 'jsr:@std/assert@1';
import { createHandler } from './handler.ts';

const UUID = '11111111-2222-3333-4444-555555555555';
const profile = { potente: 3, acidez: 4, afrutado: 5, dulce: 1, tanico: 2 };

const setup = () => {
  const calls: string[] = [];
  const fake = ((url: string) => {
    calls.push(url);
    return Promise.resolve(new Response('{"wines":[]}', { status: 200 }));
  }) as unknown as typeof fetch;
  return { calls, handle: createHandler('https://api.test/', fake) };
};

const post = (body: unknown) =>
  new Request('https://fn.test/', { method: 'POST', body: JSON.stringify(body) });

Deno.test('POST match maps profile to user* params', async () => {
  const { calls, handle } = setup();
  const res = await handle(post({ endpoint: 'match', restaurantUuid: UUID, profile, matchrimCode: ' AB1 ' }));
  assertEquals(res.status, 200);
  assertEquals(
    calls[0],
    `https://api.test/api/v1/restaurant/${UUID}/wines/match?userPower=3&userAcidity=4&userFruity=5&userSweetness=1&userTannin=2&matchrimCode=AB1`,
  );
});

Deno.test('POST wines paginates and caps limit at 250', async () => {
  const { calls, handle } = setup();
  await handle(post({ endpoint: 'wines', restaurantUuid: UUID, page: 2, limit: 9999 }));
  assertEquals(calls[0], `https://api.test/api/v1/restaurant/${UUID}/wines?page=2&limit=250`);
  await handle(post({ endpoint: 'wines', restaurantUuid: UUID }));
  assertEquals(calls[1], `https://api.test/api/v1/restaurant/${UUID}/wines?page=1&limit=100`);
});

Deno.test('POST validates uuid and profile integers', async () => {
  const { calls, handle } = setup();
  assertEquals((await handle(post({ endpoint: 'match', restaurantUuid: 'x', profile }))).status, 400);
  assertEquals((await handle(post({ restaurantUuid: UUID }))).status, 400);
  assertEquals((await handle(post({ restaurantUuid: UUID, profile: { ...profile, dulce: 'a' } }))).status, 400);
  assertEquals(calls.length, 0);
});

Deno.test('POST match accepts the real app body with decimal axes, unrounded', async () => {
  const { calls, handle } = setup();
  const res = await handle(post({
    endpoint: 'match',
    restaurantUuid: '4065fdbc-fb41-47d4-878a-6c98f5828c46',
    matchrimCode: 'Monastrell Tierra',
    profile: { potente: 4.7, acidez: 3.7, dulce: 3.1, tanico: 4.7, afrutado: 3 },
  }));
  assertEquals(res.status, 200);
  assertEquals(
    calls[0],
    'https://api.test/api/v1/restaurant/4065fdbc-fb41-47d4-878a-6c98f5828c46/wines/match?userPower=4.7&userAcidity=3.7&userFruity=3&userSweetness=3.1&userTannin=4.7&matchrimCode=Monastrell+Tierra',
  );
});

Deno.test('axes outside 0-5 or non-numeric are rejected (POST and GET)', async () => {
  const { calls, handle } = setup();
  for (const bad of [5.1, -1, 'abc', '', null, 'Infinity']) {
    const res = await handle(post({ restaurantUuid: UUID, profile: { ...profile, potente: bad } }));
    assertEquals(res.status, 400);
  }
  const q = `restaurantUuid=${UUID}&userPower=6&userAcidity=4&userFruity=5&userSweetness=1&userTannin=2`;
  assertEquals((await handle(new Request(`https://fn.test/?${q}`))).status, 400);
  assertEquals(calls.length, 0);
});

Deno.test('legacy GET query string still works', async () => {
  const { calls, handle } = setup();
  const q = `restaurantUuid=${UUID}&userPower=3&userAcidity=4&userFruity=5&userSweetness=1&userTannin=2`;
  const res = await handle(new Request(`https://fn.test/?${q}`));
  assertEquals(res.status, 200);
  assertEquals(
    calls[0],
    `https://api.test/api/v1/restaurant/${UUID}/wines/match?userPower=3&userAcidity=4&userFruity=5&userSweetness=1&userTannin=2`,
  );
  const dec = await handle(new Request(`https://fn.test/?${q.replace('userPower=3', 'userPower=4.7')}`));
  assertEquals(dec.status, 200);
});

Deno.test('invalid JSON body -> 400', async () => {
  const { handle } = setup();
  const res = await handle(new Request('https://fn.test/', { method: 'POST', body: 'nope' }));
  assertEquals(res.status, 400);
});
