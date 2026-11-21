// 163 (owner's video of the 162). Run: npx tsx scripts/check-matchrim-ux163.ts
// The real answers of Winerim's public store for his client's 22 lines were recorded on 21-nov-2026 (store-snapshot163.json
// next to this script's fixtures); here the batch is published, as in production, which is where the 162 failed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const snap = JSON.parse(fs.readFileSync(new URL('./fixtures/store-snapshot163.json', import.meta.url), 'utf8')) as { get: Record<string, unknown>; batch: Record<string, unknown[]> };
const asked = { batch: 0, get: 0 };
globalThis.fetch = (async (input: unknown, options?: { method?: string; body?: string }) => {
  const url = new URL(String(input));
  if (options?.method === 'POST') { asked.batch += 1; const texts = JSON.parse(options.body ?? '{}').texts as string[];
    return new Response(JSON.stringify({ results: texts.map(text => ({ text, wines: snap.batch[text.toLowerCase()] ?? [] })) }), { status: 200 }); }
  asked.get += 1;
  return new Response(JSON.stringify(snap.get[(url.searchParams.get('text') ?? '').toLowerCase()] ?? { count: 0, results: [] }), { status: 200 });
}) as typeof fetch;
const { estimateListing139, searchStoreTolerant163, matchListing139, looseMatch162 } = await import('../src/utils/storeListing139');
const { googleMapUrl163 } = await import('../src/utils/places162');
let n = 0; const test = async (label: string, fn: () => void | Promise<void>) => { await fn(); n += 1; console.log(`  ok ${label}`); };
const lines: [string, string][] = [['ONDARE MILENIUM', 'espumoso'], ['LALIER R-20', 'espumoso'], ['LALIER ROSE', 'espumoso'], ['LALIER BLANC DE BLANCS', 'espumoso'], ['JULIAN', 'rosado'], ['IRACHE 18.91', 'rosado'],
  ['KATXIÑA', 'blanco'], ['AITAREN', 'blanco'], ['ORCHIDEA CUVÉE', 'blanco'], ['MARTIN CODAX', 'blanco'], ['MARA MARTÍN', 'blanco'], ['PONTELLÓN', 'blanco'], ['LA MAR', 'blanco'], ['OSTATU', 'blanco'], ['MUGA', 'blanco'],
  ['ENATE 234', 'blanco'], ['MIRANDA', 'blanco'], ['NAVA REAL', 'blanco'], ['NOSSO', 'blanco'], ['OSSIAN', 'blanco'], ['LA JEFA', 'blanco'], ['FINCA DE LA MOTA', 'blanco']];
const named = (m: Awaited<ReturnType<typeof estimateListing139>>) => m?.kind === 'exact' ? `${m.estimate.row.name} (${m.estimate.row.winery})` : m?.kind === 'range' ? `range:${m.options.map(o => o.row.name).join('|')}` : null;
await test('with the batch published, the client list finds 20 of its 22 wines', async () => {
  const out = await Promise.all(lines.map(([name, type]) => estimateListing139({ name, type })));
  const by = Object.fromEntries(lines.map(([name], i) => [name, named(out[i])]));
  assert.deepEqual(lines.filter((_, i) => !out[i]).map(l => l[0]), ['JULIAN', 'NAVA REAL']);
  assert.match(by['ONDARE MILENIUM']!, /Millenium.*Ondarre/); assert.match(by['LALIER R-20']!, /R\.020.*Lallier/); assert.match(by['LALIER ROSE']!, /Rosé.*Lallier/);
  assert.match(by['LALIER BLANC DE BLANCS']!, /Lallier Blanc de Blancs/); assert.match(by['IRACHE 18.91']!, /Irache 1891 Rosado/); assert.match(by['LA MAR']!, /Terras Gauda La Mar/);
  assert.match(by['FINCA DE LA MOTA']!, /Finca la Mota/); assert.match(by['ENATE 234']!, /Enate 234/);
  assert.ok(asked.batch <= 6, `the second attempt travels in the batch (${asked.batch} calls)`);
});
await test('a brand of another colour and a short name alone invent nothing', () => {
  let id = 0; const row = (name: string, winery: string, type: string) => ({ id: ++id, name, winery, slugname: '_', vintage: '2022', subname: null, type, region: null, country: null, photo: null, grapes: [],
    tastingAttributes: { power: 3, acidity: 4, sweetness: 1, tannin: 0, fruity: 3 }, bottlePrice: 30 });
  assert.equal(matchListing139({ name: 'JULIAN', type: 'rosado' }, [row('Piesporter', 'Julian Haart', 'blanco')]), null);
  assert.notEqual(matchListing139({ name: 'JULIAN', type: 'blanco' }, [row('Piesporter', 'Julian Haart', 'blanco')]), null);
  const mar = [row('Terras Gauda La Mar', 'Terras Gauda', 'blanco'), row('La Maragata', 'Pittacum', 'blanco'), row('Villa Marcello Prosecco', 'Villa Marcello', 'espumoso')];
  assert.equal(named(looseMatch162({ name: 'LA MAR', type: 'blanco' }, mar)), 'Terras Gauda La Mar (Terras Gauda)');
  assert.equal(looseMatch162({ name: 'LA MAR' }, mar), null);
  assert.equal(looseMatch162({ name: 'LA MAR', type: 'blanco' }, [...mar, row('Viña La Mar', 'Otra', 'blanco')]), null);
});
await test('the hand search forgives slips', async () => {
  assert.match((await searchStoreTolerant163('ondare milenium'))[0]?.name ?? '', /Millenium/);
  assert.ok((await searchStoreTolerant163('lalier blanc')).some(row => /Lallier Blanc de Blancs/.test(row.name)));
  assert.equal((await searchStoreTolerant163('nava real')).length, 0);
});
await test('each meat has its own photograph and no card repeats one', () => {
  const cards = fs.readFileSync(new URL('../src/components/PairingCards162.tsx', import.meta.url), 'utf8');
  for (const [rule, photo] of [['cordero', 'cordero'], ['caza', 'caza'], ['cerdo', 'cerdo'], ['embutido', 'jamon'], ['curad', 'curado']]) assert.match(cards, new RegExp(`\\[/[^\\]]*${rule}[^\\]]*/, ${photo}\\]`));
  assert.ok(cards.indexOf('/cordero|') < cards.indexOf('/carne|'), 'the specific meats are tried before the general one');
  assert.match(cards, /mergePairings163\(names\)\.map/);
  for (const file of ['cordero', 'caza', 'cerdo', 'jamon', 'curado']) assert.ok(fs.statSync(new URL(`../src/assets/pairing163/${file}.jpg`, import.meta.url)).size > 20000);
});
await test('wiring: saved lists, maps, where, sheet', () => {
  const read = (file: string) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
  assert.match(googleMapUrl163({ name: 'Ikili', address: 'Donostia', lat: 1, lng: 2 }), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Ikili/);
  const menu = read('components/wine-import/WineMenuScanner.tsx');
  assert.match(menu, /openSaved163[\s\S]{0,400}loadMatchrimScanProfile/); assert.match(menu, /menu-line-search163/); assert.match(menu, /get\('carta'\)/);
  assert.match(read('pages/MyWines.tsx'), /CellarWhere163[\s\S]{0,300}handleWhere163/); assert.match(read('components/NativeCellarToolbar98.tsx'), /cellar-menus163/);
  const sheet = read('components/WineSheet142.tsx'); assert.match(sheet, /<details open>/); assert.match(sheet, /<details open data-testid="winerim-place144">/);
  const label = read('components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(label, /handleOnly=\{isNative && picking144\}/); assert.match(label, /RowPhoto163/); assert.match(label, /row-search163/); assert.match(label, /scan-hero163/);
});
console.log(`check-matchrim-ux163: ${n}/${n} groups`);
