// 160: Winerim's batch search, used when it answers and ignored when it does not (19-nov-2026: announced, 404 in
// production). Offline: fetch and storage are replaced here. Run: npx tsx scripts/check-matchrim-batch160.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
const calls: Array<{ url: string; texts?: string[] }> = [];
let mode: 'ok' | '404' | 'odd' = 'ok';
const wine = (id: number, name: string, winery: string) => ({ id, name, winery, slugname: `${name}_2020`, vintage: '2020', type: 'tinto', region: 'Rioja', country: 'España', grapes: ['Tempranillo'], photo: null,
  tastingAttributes: { power: 4, acidity: 3, sweetness: 1, tannin: 4, fruity: 3 } });
const known: Record<string, unknown[]> = { imperial: [wine(1, 'Imperial Reserva', 'CVNE')], contino: [wine(2, 'Contino Reserva', 'Viñedos del Contino')], pingus: [wine(3, 'Pingus', 'Dominio de Pingus')], alion: [wine(4, 'Alion', 'Bodegas Alion')] };
(globalThis as Record<string, unknown>).fetch = async (url: string, init?: { body?: string }) => {
  if (String(url).includes('search-batch')) {
    const texts = JSON.parse(init?.body ?? '{}').texts as string[]; calls.push({ url: 'batch', texts });
    if (mode === '404') return { ok: false, status: 404, json: async () => ({}) };
    if (mode === 'odd') return { ok: true, status: 200, json: async () => ({ hello: 'world' }) };
    return { ok: true, status: 200, json: async () => ({ results: texts.map(text => ({ text, wines: known[text.toLowerCase().split(' ')[0]] ?? [] })) }) };
  }
  const text = new URL(String(url)).searchParams.get('text') ?? ''; calls.push({ url: 'single:' + text });
  return { ok: true, status: 200, json: async () => ({ count: 1, results: (known[text.toLowerCase().split(' ')[0]] ?? []).map(row => ({ ...(row as object), prices: [{ variant: 'botella', price: '30' }] })) }) };
};
const { parseBatch160, batchRows160, estimateListing139 } = await import('../src/utils/storeListing139');

let groups = 0;
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); groups += 1; console.log(`  ok ${name}`); };

await test('The answer is read bare, under results, or one object per text; anything else is refused', () => {
  const row = wine(7, 'Vidure', 'Bodega X');
  assert.equal(parseBatch160([[row], []], 2)?.[0][0].name, 'Vidure');
  assert.equal(parseBatch160({ results: [{ text: 'a', wines: [row] }, { text: 'b', wines: [] }] }, 2)?.[1].length, 0);
  assert.equal(parseBatch160({ data: [{ results: [row, row] }] }, 1)?.[0].length, 1, 'a wine once');
  assert.equal(parseBatch160({ results: [[row]] }, 2), null, 'one list per text sent');
  assert.equal(parseBatch160({ hello: 'world' }, 1), null);
  assert.equal(parseBatch160([[{ id: 'x', name: 'n' }]], 1)?.[0].length, 0, 'a row without id or winery is dropped');
  assert.equal(parseBatch160([[1, 2, 3, 4, 5, 6, 7].map(id => wine(id, 'W' + id, 'B'))], 1)?.[0].length, 5);
});

await test('Lines asked together travel in one call and keep their order', async () => {
  const [a, b, c] = await Promise.all([batchRows160('Imperial reserva'), batchRows160('Contino'), batchRows160('Nada de nada')]);
  assert.deepEqual(calls, [{ url: 'batch', texts: ['Imperial reserva', 'Contino', 'Nada de nada'] }]);
  assert.equal(a?.[0].name, 'Imperial Reserva'); assert.equal(b?.[0].name, 'Contino Reserva'); assert.deepEqual(c, []);
  await batchRows160('contino'); assert.equal(calls.length, 1, 'asked once');
});

await test('Thirty lines make two calls of 25 and 5', async () => {
  calls.length = 0;
  await Promise.all(Array.from({ length: 30 }, (_, i) => batchRows160(`vino numero ${String.fromCharCode(97 + (i % 26))}${i}`)));
  assert.deepEqual(calls.map(call => call.texts?.length), [25, 5]);
});

await test('A list line uses the batch; a wine it does not find is not asked again one by one', async () => {
  calls.length = 0;
  const hit = await estimateListing139({ name: 'Imperial Reserva', producer: 'CVNE' });
  assert.equal(hit?.kind, 'exact'); assert.equal(calls.filter(call => call.url.startsWith('single')).length, 0);
  assert.equal(await estimateListing139({ name: 'Zzyzx Gran Reserva' }), null);
  assert.equal(calls.filter(call => call.url.startsWith('single')).length, 0);
});

await test('An unpublished or unrecognised batch falls back to the search of today and is not asked again', async () => {
  for (const state of ['404', 'odd'] as const) {
    store.delete('matchrim.store_batch_off.v1'); mode = state; calls.length = 0;
    // The pause is kept in the module; a fresh copy stands for a fresh launch.
    const fresh = await import(`../src/utils/storeListing139?${state}`);
    const first = await fresh.estimateListing139(state === '404' ? { name: 'Pingus', producer: 'Dominio de Pingus' } : { name: 'Alion', producer: 'Bodegas Alion' });
    assert.equal(first?.kind, 'exact', state);
    assert.deepEqual(calls.map(call => call.url.split(':')[0]), ['batch', 'single'], state);
    assert(JSON.parse(store.get('matchrim.store_batch_off.v1') ?? '{}').until?.value > Date.now() + 20 * 60_000, 'remembered for the next launch');
    await fresh.batchRows160('otra cosa distinta'); assert.equal(calls.filter(call => call.url === 'batch').length, 1, 'not asked again');
  }
});

await test('No key, no person data, same privacy as the search of today', () => {
  const source = fs.readFileSync('src/utils/storeListing139.ts', 'utf8');
  const batch = source.slice(source.indexOf('const BATCH160'), source.indexOf('const median'));
  assert(batch.includes("credentials: 'omit'") && batch.includes("referrerPolicy: 'no-referrer'") && batch.includes("redirect: 'error'"));
  assert(!/X-Matchrim-Key|Authorization|supabase|user/i.test(batch));
  assert(batch.includes('JSON.stringify({ texts: sent.map(item => item.text) })'), 'only the texts are sent');
});

console.log(`check-matchrim-batch160: ${groups}/6 groups`);
