// 165: the server learnt typos, word order and signs on 21-nov-2026 and takes the grape and type of each text.
// Run: npx tsx scripts/check-matchrim-ux165.ts. The batch answers are production's of 22-nov-2026 (store-snapshot165.json).
import assert from 'node:assert/strict';
import fs from 'node:fs';
const snap = JSON.parse(fs.readFileSync(new URL('./fixtures/store-snapshot165.json', import.meta.url), 'utf8')) as { get: Record<string, unknown>; batch: Record<string, unknown[]> };
const asked = { batch: 0, get: 0, sent: [] as unknown[], reject: false };
globalThis.fetch = (async (input: unknown, options?: { method?: string; body?: string }) => {
  const url = new URL(String(input));
  if (options?.method === 'POST') { asked.batch += 1; const texts = JSON.parse(options.body ?? '{}').texts as unknown[]; asked.sent.push(...texts);
    if (asked.reject && texts.some(text => typeof text === 'object')) return new Response(JSON.stringify({ detail: 'bad text' }), { status: 400 });
    const plain = (text: unknown) => String(text && typeof text === 'object' ? (text as { text: string }).text : text);
    return new Response(JSON.stringify({ results: texts.map(text => ({ text: plain(text), wines: snap.batch[plain(text).toLowerCase()] ?? [] })) }), { status: 200 }); }
  asked.get += 1;
  return new Response(JSON.stringify(snap.get[(url.searchParams.get('text') ?? '').toLowerCase()] ?? { count: 0, results: [] }), { status: 200 });
}) as typeof fetch;
const { estimateListing139, matchListing139, looseMatch162, lineHint165, batchRows160 } = await import('../src/utils/storeListing139');
const { likelyByPrice140 } = await import('../src/utils/storeListing139');
let n = 0; const test = async (label: string, fn: () => void | Promise<void>) => { await fn(); n += 1; console.log(`  ok ${label}`); };
const lines: [string, string, number][] = [['ONDARE MILENIUM', 'espumoso', 25], ['LALIER R-20', 'espumoso', 50], ['LALIER ROSE', 'espumoso', 65], ['LALIER BLANC DE BLANCS', 'espumoso', 70], ['JULIAN – Garnacha', 'rosado', 35], ['IRACHE 18.91', 'rosado', 18],
  ['KATXIÑA', 'blanco', 21], ['AITAREN', 'blanco', 50], ['ORCHIDEA CUVÉE', 'blanco', 24], ['MARTIN CODAX', 'blanco', 26], ['MARA MARTÍN', 'blanco', 21], ['PONTELLÓN', 'blanco', 22], ['LA MAR – Caíño', 'blanco', 45], ['OSTATU', 'blanco', 20], ['MUGA', 'blanco', 26],
  ['ENATE 234', 'blanco', 24], ['MIRANDA', 'blanco', 20], ['NAVA REAL – Verdejo', 'blanco', 18], ['NOSSO', 'blanco', 31], ['OSSIAN', 'blanco', 45], ['LA JEFA', 'blanco', 45], ['FINCA DE LA MOTA', 'blanco', 16]];
type Match = Awaited<ReturnType<typeof estimateListing139>>;
const named = (m: Match) => m?.kind === 'exact' ? `${m.estimate.row.name} (${m.estimate.row.winery})` : m?.kind === 'range' ? `range:${m.options.map(o => o.row.name).join('|')}` : null;
let out: Match[] = [];
await test('the client list is one call: 20 of 22 lines, nothing asked one by one', async () => {
  out = await Promise.all(lines.map(([name, type]) => estimateListing139({ name, type })));
  assert.deepEqual(lines.filter((_, i) => !out[i]).map(l => l[0]), ['JULIAN – Garnacha', 'NAVA REAL – Verdejo']);
  assert.equal(asked.batch, 1); assert.equal(asked.get, 0); assert.equal(asked.sent.length, 22);
  const by = Object.fromEntries(lines.map(([name], i) => [name, named(out[i])]));
  assert.match(by['ONDARE MILENIUM']!, /Millenium.*Ondarre/); assert.match(by['LALIER R-20']!, /R\.020.*Lallier/); assert.match(by['IRACHE 18.91']!, /Irache 1891 Rosado/);
  assert.match(by['FINCA DE LA MOTA']!, /Finca la Mota/); assert.match(by['ENATE 234']!, /Enate Chardonnay 234/);
});
await test('the grape and the type of the line travel with its text', () => {
  assert.deepEqual(lineHint165({ name: 'LA MAR – Caíño', type: 'blanco' }), { grape: 'Caíño', type: 'blanco' });
  assert.deepEqual(lineHint165({ name: 'MUGA 2021', type: 'Vino blanco' }), { type: 'blanco' });
  assert.deepEqual(lineHint165({ name: 'PINTIA', grapes: ['Tinta de Toro'] }), { grape: 'Tinta de Toro' });
  assert.equal(lineHint165({ name: 'PINTIA', type: 'generoso' }), null);
  assert.deepEqual(asked.sent.find(text => typeof text === 'object' && (text as { text: string }).text === 'LA MAR'), { text: 'LA MAR', grape: 'Caíño', type: 'blanco' });
});
await test('the colour the list prints decides between a winery\'s wines', () => {
  const by = Object.fromEntries(lines.map(([name], i) => [name, out[i]]));
  for (const name of ['OSTATU', 'MUGA']) { const match = by[name]!; assert.equal(match.kind, 'range');
    if (match.kind === 'range') assert(match.options.every(option => /blanc/i.test(option.row.type ?? '')), name); }
  const ostatu = by['OSTATU']!; if (ostatu.kind === 'range') assert.equal(likelyByPrice140(ostatu.options, 20)?.row.name, 'Ostatu Blanco');
  const muga = by['MUGA']!; if (muga.kind === 'range') assert.equal(likelyByPrice140(muga.options, 26)?.row.name, 'Muga Blanco');
  let id = 0; const row = (name: string, winery: string, type: string) => ({ id: ++id, name, winery, slugname: '_', vintage: '2022', subname: null, type, region: null, country: null, photo: null, grapes: [],
    tastingAttributes: { power: 3, acidity: 4, sweetness: 1, tannin: type === 'tinto' ? 3 : 0, fruity: 3 }, bottlePrice: 30 });
  // a wine called exactly like the line keeps winning when the winery has nothing of the wanted colour
  assert.equal(named(matchListing139({ name: 'PINTIA', type: 'blanco' }, [row('Pintia', 'Pintia', 'tinto')])), 'Pintia (Pintia)');
  assert.equal(looseMatch162({ name: 'JULIAN – Garnacha', type: 'rosado' }, [row('Phinca San Julián', 'Bhilar', 'tinto'), row('Recoveco San Julián', 'Gil Berzal', 'tinto')]), null);
});
await test('a short name shared by a few wines is a range the price narrows', () => {
  const mar = out[lines.findIndex(line => line[0].startsWith('LA MAR'))]!;
  assert.equal(mar.kind, 'range');
  if (mar.kind === 'range') { assert(mar.options.some(option => option.row.name === 'Terras Gauda La Mar')); assert(mar.options.length <= 4);
    assert.equal(likelyByPrice140(mar.options, 45)?.row.name, 'Terras Gauda La Mar'); }
});
await test('a lot the server rejects for its text objects is sent again as plain texts', async () => {
  asked.reject = true; const before = asked.batch;
  const rows = await batchRows160('katxiña', { type: 'tinto' });
  asked.reject = false;
  assert.equal(asked.batch - before, 2); assert.match(rows?.[0]?.name ?? '', /Katxiña/);
});
await test('the phone forgets the answers of the old server', () => {
  const source = fs.readFileSync(new URL('../src/utils/storeListing139.ts', import.meta.url), 'utf8');
  assert.match(source, /matchrim\.store_batch\.v2/); assert.match(source, /matchrim\.store_search\.v2/);
  assert.doesNotMatch(source.slice(source.indexOf('export const estimateListing139')), /rescueQueries162\(line\)/);
});
console.log(`check-matchrim-ux165: ${n}/6 groups`);
