import assert from 'node:assert/strict';
import { canLookupWinerimOriginal, createWinerimOriginalSheet, hasExactWinerimProducer,
  lookupWinerimOriginalSheet, validateWinerimOriginalSheetUrl, validateWinerimOriginalSensory,
  type WinerimOriginalIdentity } from '../src/utils/winerimOriginalSheet';

// All payloads are synthetic. Never resolve local catalog UUIDs by URL construction.
const uuid = 'b653e084-e8e1-448c-bc03-507a1cea3810';
const identity: WinerimOriginalIdentity = { name: 'Luna Reserva', producer: 'Bodegas Ejemplo', vintage: 2021, region: 'Rioja', country: 'Spain' };
const sensory = { power: 2.4, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 };
const wine = { id: 123, name: 'Luna Reserva', subname: null, winery: 'Bodegas Ejemplo', vintage: '2021',
  slugname: 'Luna-Reserva_2021', region: 'Rioja', country: 'ES', grapes: [['Tempranillo']], tastingAttributes: sensory };
const page = (results: unknown[] = [wine], count = results.length) => ({ results, count, page: 1, limit: 20 });
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
let checks = 0;
const check = async (name: string, fn: () => unknown | Promise<unknown>) => { await fn(); checks++; console.log('PASS', name); };
const mock = (values: unknown[] = [{ restaurant: uuid }, page(), { ...wine, grapes: [{ name: 'Tempranillo' }] }]) => {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    assert.ok(values.length, 'Unexpected extra request');
    const value = values.shift();
    if (value instanceof Error) throw value;
    return value instanceof Response ? value : json(value);
  };
  return { calls, fetcher };
};
const resolve = async (list = page(), detail: unknown = wine, input = identity) => {
  const network = mock([{ restaurant: uuid }, list, detail]);
  return { result: await lookupWinerimOriginalSheet(input, undefined, network.fetcher), calls: network.calls };
};

await check('Verified route uses only independently searched ID/slug and detail sensory, with genuine zero', async () => {
  const { result, calls } = await resolve(page(), { ...wine, tastingAttributes: { ...sensory, power: 1.7 }, grapes: [{ name: 'Tempranillo' }] });
  assert.equal(result.status, 'verified');
  if (result.status !== 'verified') return;
  assert.equal(result.sheet.url, 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021');
  assert.equal(result.sheet.detailVerified, true);
  assert.equal(result.sheet.sensoryAttributes?.power, 1.7);
  assert.equal(result.sheet.sensoryAttributes?.tannin, 0);
  assert.deepEqual(result.sheet.grapes, ['Tempranillo']);
  assert.equal(calls.length, 3);
  assert.equal(calls[0].url, 'https://app.winerim.com/api/v1/whoami/slugname?s=the-library');
  assert.equal(new URL(calls[1].url).searchParams.get('text'), identity.name);
  assert.equal(calls[2].url, `https://app.winerim.com/api/v1/restaurant/${uuid}/wines/123/Luna-Reserva_2021`);
  for (const { init } of calls) {
    assert.equal(init.method, 'GET'); assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    assert.equal(init.referrerPolicy, 'no-referrer'); assert.equal(init.body, undefined);
    assert.deepEqual(init.headers, { Accept: 'application/json' });
  }
});
for (const input of [{ ...identity, name: '' }, { ...identity, producer: null }, { ...identity, vintage: '2021/22' },
  { ...identity, name: 'x'.repeat(121) }, { ...identity, name: 'Luna\nReserva' }, { ...identity, name: 'Whisky Reserva' }]) {
  await check('Incomplete or non-wine identity sends zero requests: ' + JSON.stringify(input.name).slice(0, 40), async () => {
    const network = mock([]);
    assert.equal(canLookupWinerimOriginal(input), false);
    assert.equal((await lookupWinerimOriginalSheet(input, undefined, network.fetcher)).status, 'identity-required');
    assert.equal(network.calls.length, 0);
  });
}
await check('Legal wrapper is allowed but single-letter brands and producer order never collide', () => {
  assert.equal(hasExactWinerimProducer('Muga', 'Bodegas Muga S.A.'), true);
  assert.equal(hasExactWinerimProducer('Ejemplo A', 'Ejemplo'), false);
  assert.equal(hasExactWinerimProducer('Sol Luna', 'Luna Sol'), false);
  assert.equal(hasExactWinerimProducer('Ejemplo S', 'Ejemplo'), false);
});
for (const field of ['name', 'nombre', 'producer', 'productor', 'winery', 'bodega', 'vintage', 'anada', 'añada', 'year']) {
  await check('Inferred identity cannot certify an original sheet: ' + field, async () => {
    const network = mock([]);
    assert.equal((await lookupWinerimOriginalSheet({ ...identity, inferredFields: [field] }, undefined, network.fetcher)).status, 'identity-required');
    assert.equal(network.calls.length, 0);
  });
}
await check('Inferred geography cannot override exact explicit identity', async () => {
  assert.equal((await resolve(page(), wine, { ...identity, region: 'Bordeaux', country: 'France', inferredFields: ['region', 'country'] })).result.status, 'verified');
});
await check('Malformed runtime vintage/inference fields cannot masquerade as absent', () => {
  for (const updates of [{ vintage: false }, { vintage: {} }, { inferredFields: 'producer' }, { inferredFields: [null] }]) {
    assert.equal(canLookupWinerimOriginal({ ...identity, ...updates } as unknown as WinerimOriginalIdentity), false);
  }
});
await check('Accent normalization and a separately confirmed trailing vintage retain exact identity', async () => {
  assert.equal((await resolve(page(), wine, { ...identity, name: 'Lúna Reserva 2021', producer: 'Ejemplo S.L.' })).result.status, 'verified');
});
for (const change of [{ name: 'Luna' }, { name: 'Luna Reserva Especial' }, { winery: 'Ejemplo A' }, { winery: 'Otro Ejemplo' },
  { vintage: '2020' }, { vintage: null }, { region: 'Bordeaux' }, { country: 'FR' }, { subname: 'Gran Reserva' }]) {
  await check('Conflicting or missing identity abstains: ' + JSON.stringify(change), async () => {
    const { result, calls } = await resolve(page([{ ...wine, ...change }]));
    assert.equal(result.status, 'not-found'); assert.equal(calls.length, 2);
  });
}
await check('Absent scanned vintage cannot borrow year-specific detail', async () => {
  assert.equal((await resolve(page(), wine, { ...identity, vintage: null })).result.status, 'not-found');
});
await check('Exact non-vintage record can resolve without manufacturing a year', async () => {
  const nv = { ...wine, vintage: null, slugname: 'Luna-Reserva' };
  const { result } = await resolve(page([nv]), nv, { ...identity, vintage: null });
  assert.equal(result.status, 'verified');
  if (result.status === 'verified') assert.equal(result.sheet.vintage, null);
});
await check('Duplicate IDs with identical payloads may coalesce', async () => {
  assert.equal((await resolve(page([wine, wine]))).result.status, 'verified');
});
for (const rows of [[wine, { ...wine, id: 124 }], [wine, { ...wine, name: 'Different wine' }],
  [wine, { ...wine, slugname: 'Other-Slug' }], [wine, { ...wine, tastingAttributes: { ...sensory, tannin: 3 } }]]) {
  await check('Duplicate identity IDs or contradictory payloads never pick first', async () => {
    const { result, calls } = await resolve(page(rows));
    assert.equal(result.status, 'ambiguous'); assert.equal(calls.length, 2);
  });
}
for (const list of [page([wine], 21), page([wine], 0), { ...page(), page: 2 }, { ...page(), count: '1' },
  page(Array(21).fill(wine)), { results: null, count: 0, page: 1 }]) {
  await check('Incomplete/malformed search page never certifies uniqueness', async () => {
    const { result, calls } = await resolve(list);
    assert.equal(result.status, 'incomplete'); assert.equal(calls.length, 2);
  });
}
await check('Empty complete page is not a global nonexistence claim', async () => {
  const { result, calls } = await resolve(page([]));
  assert.equal(result.status, 'not-found'); assert.equal(calls.length, 2);
});
for (const change of [{ id: 124 }, { slugname: 'Other-Wine' }, { winery: 'Ejemplo A' }, { vintage: '2020' },
  { name: 'Luna Reserva Especial' }, { country: 'FR' }, { region: 'Bordeaux' }, { vintage: { year: 2021 } }]) {
  await check('Detail mismatch rejects the selected route: ' + JSON.stringify(change), async () => {
    assert.equal((await resolve(page(), { ...wine, ...change })).result.status, 'ambiguous');
  });
}
for (const change of [{ slugname: '../secret' }, { slugname: 'slug?x=1' }, { slugname: 'x%2Fy' },
  { id: 'winerim-7' }, { id: 'https://evil.test' }, { id: ' 123' }, { id: 0 }, { id: -1 }, { id: 1.2 }, { id: Number.MAX_SAFE_INTEGER + 1 }]) {
  await check('Unsafe source ID/slug cannot become a request: ' + JSON.stringify(change), async () => {
    const { result, calls } = await resolve(page([{ ...wine, ...change }]));
    assert.equal(result.status, 'incomplete'); assert.equal(calls.length, 2);
  });
}
await check('Upstream public URL fields cannot override the bound first-party route', async () => {
  const payload = { ...wine, publicUrl: 'https://evil.test', public_url: 'https://web.winerim.com/the-library/wines/999/x' };
  const { result } = await resolve(page([payload]), payload);
  assert.equal(result.status, 'verified');
  if (result.status === 'verified') assert.equal(result.sheet.url, 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021');
});
for (const attrs of [undefined, null, {}, { ...sensory, tannin: null }, { ...sensory, power: '4' },
  { ...sensory, power: -1 }, { ...sensory, power: 6 }, { ...sensory, power: true }]) {
  await check('Missing/invalid detail sensory never borrows summary values: ' + JSON.stringify(attrs), async () => {
    const { result } = await resolve(page(), { ...wine, tastingAttributes: attrs });
    assert.equal(result.status, 'verified');
    if (result.status === 'verified') assert.equal(result.sheet.sensoryAttributes, null);
  });
}
await check('NaN and Infinity cannot certify sensory attributes', () => {
  assert.equal(validateWinerimOriginalSensory({ ...sensory, power: NaN }), null);
  assert.equal(validateWinerimOriginalSensory({ ...sensory, power: Infinity }), null);
});
for (const url of ['https://evil.winerim.com/the-library/wines/123/x', 'https://winerim.wine/the-library/wines/123/x',
  'https://web.winerim.com:8443/the-library/wines/123/x', 'https://web.winerim.com/the-library/wines/124/x',
  'https://web.winerim.com/the-library/wines/%31%32%33/x', 'https://web.winerim.com/the-library/wines/123/x?',
  'https://web.winerim.com/the-library/wines/123/x#', 'https://web.winerim.com/the-library/wines//123/x',
  'https://web.winerim.com/the-library/wines/123/x/../x', 'https://web.winerim.com/the-library/wines/123/x%2Fy',
  'https://user@web.winerim.com/the-library/wines/123/x', 'https://web.winerim.com/the-library/wines/123/x\n']) {
  await check('Noncanonical restored URL remains inert: ' + JSON.stringify(url), () => assert.equal(validateWinerimOriginalSheetUrl('123', url), null));
}
await check('Metadata without proven detail has no sensory or constructed public link', () => {
  const sheet = createWinerimOriginalSheet({ ...wine, originalSheetSource: 'winerim-api' });
  assert.equal(sheet?.url, null); assert.equal(sheet?.detailVerified, undefined); assert.equal(sheet?.sensoryAttributes, undefined);
});
for (const value of [{ restaurant: 'https://evil.test' }, { restaurant: uuid + '/..' }, {}, null]) {
  await check('Malformed Library resolver cannot redirect later requests', async () => {
    const network = mock([value]);
    assert.equal((await lookupWinerimOriginalSheet(identity, undefined, network.fetcher)).status, 'unavailable');
    assert.equal(network.calls.length, 1);
  });
}
for (const value of [new Error('Network'), json({}, 503), new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } }),
  new Response('{broken', { headers: { 'Content-Type': 'application/json' } }),
  new Response(' '.repeat(262145), { headers: { 'Content-Type': 'application/json' } })]) {
  await check('Network, HTML fallback, malformed/oversized JSON are unavailable, not no-match', async () => {
    const network = mock([value]);
    assert.equal((await lookupWinerimOriginalSheet(identity, undefined, network.fetcher)).status, 'unavailable');
    assert.equal(network.calls.length, 1);
  });
}
await check('Precancelled lookup sends zero requests', async () => {
  const network = mock([]), abort = new AbortController(); abort.abort();
  await assert.rejects(lookupWinerimOriginalSheet(identity, abort.signal, network.fetcher), { name: 'AbortError' });
  assert.equal(network.calls.length, 0);
});
await check('Cancellation propagates to in-flight fetch without retries', async () => {
  const abort = new AbortController(); let calls = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      queueMicrotask(() => abort.abort());
    });
  };
  await assert.rejects(lookupWinerimOriginalSheet(identity, abort.signal, fetcher), { name: 'AbortError' });
  assert.equal(calls, 1);
});
await check('Twelve-second deadline aborts instead of reporting no match', async () => {
  const realTimeout = globalThis.setTimeout;
  let scheduled = 0;
  globalThis.setTimeout = ((callback, delay, ...args) => {
    scheduled = Number(delay);
    return realTimeout(callback, 1, ...args);
  }) as typeof setTimeout;
  try {
    const fetcher: typeof fetch = async (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
    assert.equal((await lookupWinerimOriginalSheet(identity, undefined, fetcher)).status, 'unavailable');
    assert.equal(scheduled, 12000);
  } finally { globalThis.setTimeout = realTimeout; }
});
console.log(JSON.stringify({ checks, passed: checks, remoteCalls: 0, scope: 'Library identity/detail/transport adversarial contracts, not global catalog coverage' }));
