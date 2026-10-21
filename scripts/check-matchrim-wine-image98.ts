import assert from 'node:assert/strict';
import { safeWineImageUrl98 } from '../src/utils/wineImage98';
import { catalogWineFromVerifiedSheet, createWinerimOriginalSheet, lookupWinerimOriginalSheet,
  type WinerimOriginalIdentity } from '../src/utils/winerimOriginalSheet';

const uuid = 'b653e084-e8e1-448c-bc03-507a1cea3810';
const root = `https://app.winerim.com/api/v1/restaurant/${uuid}/wines`;
const photo = 'https://images.example.test/wines/detail.png';
const searchPhoto = 'https://images.example.test/wines/search.jpg';
const inputPhoto = '/assets/input.webp';
const sensory = Object.freeze({ power: 0, acidity: 2.5, sweetness: 0, tannin: 0, fruity: 5 });
const identity = Object.freeze({ name: 'Luna Reserva', producer: 'Bodegas Ejemplo', vintage: 2021,
  region: 'Rioja', country: 'Spain', confidence: .78, photo: inputPhoto });
const wine = Object.freeze({ id: 123, name: identity.name, winery: identity.producer, vintage: '2021',
  slugname: 'Luna-Reserva_2021', region: 'Rioja', country: 'ES', grapes: [['Tempranillo']], tastingAttributes: sensory });
const page = (results: unknown[]) => ({ results, count: results.length, page: 1, limit: 20 });
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const withoutPhoto = <T extends { photo?: string }>(value: T) => {
  const { photo: _photo, ...rest } = value;
  return rest;
};
type Request = { url: string; init?: RequestInit };
function transport(values: unknown[], onRequest?: (request: Request, index: number) => void) {
  const calls: Request[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const request = { url: String(url), init };
    calls.push(request);
    assert.equal(init?.method, 'GET'); assert.equal(init?.credentials, 'omit');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.referrerPolicy, 'no-referrer');
    assert.equal(init?.body, undefined); assert.deepEqual(init?.headers, { Accept: 'application/json' });
    assert.ok(init?.signal instanceof AbortSignal);
    assert.ok(values.length, 'Unexpected request/retry');
    onRequest?.(request, calls.length);
    const value = values.shift();
    return value instanceof Response ? value : json(value);
  };
  return { calls, fetcher };
}
async function resolve(detail: unknown = { ...wine, photo }, rows: unknown[] = [{ ...wine, photo: searchPhoto }],
  input: WinerimOriginalIdentity = identity) {
  const network = transport([{ restaurant: uuid }, page(rows), detail]);
  const result = await lookupWinerimOriginalSheet(input, undefined, network.fetcher);
  return { result, calls: network.calls };
}
let checks = 0;
const check = async (name: string, work: () => unknown | Promise<unknown>) => {
  await work(); checks++; console.log('PASS', name);
};
const originalFetch = globalThis.fetch;
let forbiddenNetwork = 0;
globalThis.fetch = async () => { forbiddenNetwork++; throw new Error('Network forbidden'); };
try {
  await check('HTTPS images and ordinary root-relative assets roundtrip without fetch or rewriting', () => {
    for (const value of [photo, 'https://cdn.example.test/bottle.jpeg?width=320&format=webp',
      'https://cdn.example.test/bottle.JPG', 'https://cdn.example.test/images/123?format=png',
      'https://cdn.example.test/bottle%20label.png', 'https://cdn.example.test/bottle.avif#image',
      '/assets/bottle.png', '/images/bottle.webp?v=98']) assert.equal(safeWineImageUrl98(value), value);
  });
  const badUrls: unknown[] = [undefined, null, true, 123, {}, [], '', ' ',
    'javascript:alert(1)', 'data:image/png;base64,AA==', 'data:image/svg+xml,<svg/>', 'blob:https://example.test/id',
    'file:///bottle.png', 'http://example.test/bottle.png', '//example.test/bottle.png', '///example.test/bottle.png',
    'bottle.png', './assets/bottle.png', '../bottle.png', '?photo=bottle.png', '#bottle.png',
    'https:example.test/bottle.png', 'https:/example.test/bottle.png', 'https:///example.test/bottle.png',
    'https://', 'https://?bottle.png', 'https://[broken/bottle.png', 'https://example.test:bad/bottle.png',
    'https://user:secret@example.test/bottle.png', 'https://user@example.test/bottle.png',
    'https://@example.test/bottle.png', 'https://example.test@evil.test/bottle.png',
    'https://example.test\\@evil.test/bottle.png', '/\\example.test/bottle.png',
    ' https://example.test/bottle.png', `${photo} `, `${photo}\n`, `${photo}\t`,
    'https://example.test/bot tle.png', 'https://example.test/\u0000bottle.png',
    'https://example.test/bottle.png\u007f', 'https://example.test/\u0085bottle.png',
    'https://example.test/\u202ebottle.png', 'https://example.test/bottle%00.png',
    'https://example.test/bottle%0a.png', 'https://example.test/%5cbottle.png',
    'https://example.test/bottle.png?x=%0a', 'https://example.test/bottle.png?x=%7f',
    'https://example.test/bottle%.png', 'https://example.test/bottle%xx.png', 'https://example.test/%ff.png',
    'https://example.test/bottle.svg', 'https://example.test/bottle.SVG?format=png',
    'https://example.test/bottle.svgz', 'https://example.test/bottle.s%76g#image',
    'https://example.test/bottle.svg.gz', 'https://example.test/bottle.svg%20',
    '/assets/bottle.svg', '/assets/bottle.SVG?x=1', '/assets/bottle.svg/preview.png',
    '/', '/assets/', '/assets/../bottle.png', '/assets/./bottle.png', '/assets/%2e%2e/bottle.png'];
  await check('Unsafe schemes, SVG, credentials, controls, whitespace and malformed forms fail closed', () => {
    assert.equal(safeWineImageUrl98(new URL(photo)), null);
    for (const value of badUrls) assert.equal(safeWineImageUrl98(value), null, JSON.stringify(value));
  });
  await check('Actual resolver copies only exact official detail photo into sheet and catalog', async () => {
    const before = JSON.stringify(identity);
    const { result, calls } = await resolve();
    assert.ok(result.status === 'verified');
    assert.equal(result.sheet.photo, photo);
    assert.equal(result.sheet.id, '123'); assert.equal(result.sheet.vintage, '2021');
    assert.equal(result.sheet.detailVerified, true);
    assert.equal(result.sheet.url, 'https://web.winerim.com/the-library/wines/123/Luna-Reserva_2021');
    const catalog = catalogWineFromVerifiedSheet(identity, result.sheet);
    assert.ok(catalog); assert.equal(catalog.photo, photo);
    assert.equal(catalog.verifiedOriginalSheet, result.sheet);
    assert.equal(catalog.originalSheetSource, 'winerim-api');
    assert.deepEqual(calls.map(call => call.url), [
      'https://app.winerim.com/api/v1/whoami/slugname?s=the-library',
      `${root}?page=1&text=Luna+Reserva`, `${root}/123/Luna-Reserva_2021`,
    ]);
    assert.equal(identity.confidence, .78); assert.equal(JSON.stringify(identity), before);
    assert.equal('confidence' in result.sheet, false); assert.equal('confidence' in catalog, false);
  });
  await check('Missing or invalid detail photo never borrows search/input/alias image fields', async () => {
    for (const value of [undefined, null, '', {}, searchPhoto.replace('https:', 'http:'), ...badUrls]) {
      const { result } = await resolve({ ...wine, photo: value, image: searchPhoto, image_url: searchPhoto });
      assert.ok(result.status === 'verified');
      assert.equal(Object.hasOwn(result.sheet, 'photo'), false);
      const catalog = catalogWineFromVerifiedSheet(identity, result.sheet);
      assert.ok(catalog); assert.equal(Object.hasOwn(catalog, 'photo'), false);
      assert.deepEqual(catalog.tastingAttributes, sensory);
    }
  });
  await check('Detail asset paths survive, and catalog revalidates the optional URL', async () => {
    const { result } = await resolve({ ...wine, photo: '/assets/bottle.webp' });
    assert.ok(result.status === 'verified');
    assert.equal(result.sheet.photo, '/assets/bottle.webp');
    assert.equal(catalogWineFromVerifiedSheet(identity, result.sheet)?.photo, '/assets/bottle.webp');
    for (const value of ['', 'data:image/png;base64,AA==', 'https://example.test/bottle.svg']) {
      assert.equal(Object.hasOwn(catalogWineFromVerifiedSheet(identity, { ...result.sheet, photo: value })!, 'photo'), false);
    }
  });
  await check('Photos do not participate in duplicate/identity authority or mutate fixtures', async () => {
    const rows = [{ ...wine, photo: searchPhoto }, { ...wine, photo: inputPhoto }];
    const before = JSON.stringify(rows);
    const { result, calls } = await resolve({ ...wine, photo }, rows);
    assert.ok(result.status === 'verified'); assert.equal(result.sheet.photo, photo);
    assert.equal(calls.length, 3); assert.equal(JSON.stringify(rows), before);
  });
  await check('Conflicting search identity/vintage cannot donate a photo or trigger detail', async () => {
    for (const change of [{ name: 'Luna Reserva Especial' }, { winery: 'Otra Bodega' }, { vintage: '2020' }, { vintage: null }]) {
      const { result, calls } = await resolve({ ...wine, photo }, [{ ...wine, ...change, photo }]);
      assert.deepEqual(result, { status: 'not-found' }); assert.equal(calls.length, 2);
    }
    const { result } = await resolve({ ...wine, photo }, [
      { ...wine, id: 124, name: 'Otro Vino', photo: searchPhoto }, wine,
    ]);
    assert.ok(result.status === 'verified'); assert.equal(result.sheet.photo, photo);
  });
  await check('Conflicting official detail identity/vintage still rejects the entire result', async () => {
    for (const change of [{ id: 124 }, { slugname: 'Other_2021' }, { name: 'Luna Reserva Especial' },
      { winery: 'Otra Bodega' }, { vintage: '2020' }, { vintage: null }, { region: 'Bordeaux' }, { country: 'FR' }]) {
      const { result, calls } = await resolve({ ...wine, ...change, photo });
      assert.deepEqual(result, { status: 'ambiguous' }); assert.equal(calls.length, 3);
    }
  });
  await check('Catalog matching and unverified metadata cannot acquire photo authority', async () => {
    const { result } = await resolve(); assert.ok(result.status === 'verified');
    for (const change of [{ name: 'Otro Vino' }, { producer: 'Otra Bodega' }, { vintage: 2020 }, { vintage: null }]) {
      assert.equal(catalogWineFromVerifiedSheet({ ...identity, ...change }, result.sheet), null);
    }
    assert.equal(catalogWineFromVerifiedSheet(identity, { ...result.sheet, detailVerified: false }), null);
    const metadata = { id: wine.id, name: wine.name, winery: wine.winery, vintage: wine.vintage,
      originalSheetSource: 'winerim-api' as const, originalSheetUrl: result.sheet.url!, photo };
    const unverified = createWinerimOriginalSheet(metadata);
    assert.ok(unverified); assert.equal(Object.hasOwn(unverified, 'photo'), false);
    assert.equal(catalogWineFromVerifiedSheet(identity, unverified), null);
  });
  await check('Photo presence leaves every sensory value (including zero), identity and status unchanged', async () => {
    const plain = await resolve(wine, [wine]);
    const pictured = await resolve();
    assert.ok(plain.result.status === 'verified' && pictured.result.status === 'verified');
    assert.deepEqual(withoutPhoto(pictured.result.sheet), plain.result.sheet);
    const plainCatalog = catalogWineFromVerifiedSheet(identity, plain.result.sheet);
    const picturedCatalog = catalogWineFromVerifiedSheet(identity, pictured.result.sheet);
    assert.ok(plainCatalog && picturedCatalog);
    assert.deepEqual({ ...withoutPhoto(picturedCatalog), verifiedOriginalSheet: withoutPhoto(picturedCatalog.verifiedOriginalSheet) }, plainCatalog);
    assert.deepEqual(picturedCatalog.tastingAttributes, sensory);
    assert.equal(picturedCatalog.tastingAttributes?.power, 0);
    assert.equal(picturedCatalog.tastingAttributes?.sweetness, 0);
    assert.equal(picturedCatalog.tastingAttributes?.tannin, 0);
  });
  await check('A valid photo never grants missing/invalid detail sensory or borrows search sensory', async () => {
    for (const attrs of [undefined, null, {}, { ...sensory, power: '0' }, { ...sensory, tannin: null }, { ...sensory, acidity: 6 }]) {
      const { result } = await resolve({ ...wine, photo, tastingAttributes: attrs });
      assert.ok(result.status === 'verified'); assert.equal(result.sheet.photo, photo);
      assert.equal(result.sheet.sensoryAttributes, null);
      assert.equal(catalogWineFromVerifiedSheet(identity, result.sheet)?.tastingAttributes, null);
    }
  });
  await check('Precancelled lookup sends no requests and returns no photo', async () => {
    const network = transport([]), controller = new AbortController(); controller.abort();
    await assert.rejects(lookupWinerimOriginalSheet(identity, controller.signal, network.fetcher), { name: 'AbortError' });
    assert.equal(network.calls.length, 0);
  });
  await check('Cancellation at detail fetch rejects even when fixture transport ignores abort', async () => {
    const controller = new AbortController();
    const network = transport([{ restaurant: uuid }, page([wine]), { ...wine, photo }], (_request, index) => {
      if (index === 3) controller.abort();
    });
    await assert.rejects(lookupWinerimOriginalSheet(identity, controller.signal, network.fetcher), { name: 'AbortError' });
    assert.equal(network.calls.length, 3); assert.equal(network.calls[2].init?.signal?.aborted, true);
  });
  await check('Cancellation during detail streaming cancels the body without retries or partial photo', async () => {
    const controller = new AbortController(); let cancelled = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(stream) {
        stream.enqueue(new TextEncoder().encode('{"photo":"https://images.example.test/partial.png"'));
        queueMicrotask(() => controller.abort());
      },
      cancel() { cancelled++; },
    }, { highWaterMark: 0 });
    const network = transport([{ restaurant: uuid }, page([wine]), new Response(body, { headers: { 'Content-Type': 'application/json' } })]);
    await assert.rejects(lookupWinerimOriginalSheet(identity, controller.signal, network.fetcher), { name: 'AbortError' });
    assert.equal(network.calls.length, 3); assert.equal(cancelled, 1);
  });
  await check('Existing twelve-second deadline remains bounded and unavailable, not no-match', async () => {
    const realTimeout = globalThis.setTimeout;
    let scheduled = 0, calls = 0;
    globalThis.setTimeout = ((callback, delay, ...args) => {
      scheduled = Number(delay); return realTimeout(callback, 1, ...args);
    }) as typeof setTimeout;
    try {
      const fetcher: typeof fetch = async () => { calls++; return new Promise<Response>(() => {}); };
      assert.deepEqual(await lookupWinerimOriginalSheet(identity, undefined, fetcher), { status: 'unavailable' });
      assert.equal(scheduled, 12000); assert.equal(calls, 1);
    } finally { globalThis.setTimeout = realTimeout; }
  });
  assert.deepEqual(clone(wine.tastingAttributes), sensory);
  assert.equal(forbiddenNetwork, 0);
  console.log(JSON.stringify({ checks, passed: checks, remoteCalls: forbiddenNetwork,
    scope: 'Pure image URL validation and actual strict resolver/catalog fixtures; no UI, captured scan image or live catalog coverage.' }));
} finally { globalThis.fetch = originalFetch; }
