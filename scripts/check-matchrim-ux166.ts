// 166: an hour as someone who knows nothing about wine. Run: npx tsx scripts/check-matchrim-ux166.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
let calls = 0;
globalThis.fetch = (async () => { calls += 1; return new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }); }) as typeof fetch;
const { quickMenuLines145 } = await import('../src/utils/quickMenu145');
const { evolutionFor166, evolutionAdvice164, EVOLUTION_KEY164 } = await import('../src/utils/evolution164');
const { searchStore139 } = await import('../src/utils/storeListing139');
let n = 0; const test = async (label: string, fn: () => void | Promise<void>) => { await fn(); n += 1; console.log(`  ok ${label}`); };
const line = (text: string, x: number, y: number, width: number) => ({ text, confidence: 0.9, box: { x, y, width, height: 0.02 } });
await test('the preview knows the section each line sits under, on a one-column page only', () => {
  const page = [line('BLANCOS', 0.1, 0.1, 0.2), line('OSTATU 20,00 €', 0.1, 0.14, 0.6), line('MUGA 22,00 €', 0.1, 0.18, 0.6), line('TINTOS', 0.1, 0.3, 0.2), line('MUGA CRIANZA 28,00 €', 0.1, 0.34, 0.6),
    line('VINOS POR COPAS', 0.1, 0.5, 0.3), line('VERMUT ROJO 4,00 €', 0.1, 0.54, 0.5), line('CAVAS, CHAMPAGNES Y ESPUMOSOS', 0.1, 0.6, 0.5), line('LALIER R-20 50,00 €', 0.1, 0.64, 0.5)];
  assert.deepEqual(quickMenuLines145(page as never).map(item => [item.text, item.section ?? null]),
    [['OSTATU', 'blanco'], ['MUGA', 'blanco'], ['MUGA CRIANZA', 'tinto'], ['VERMUT ROJO', null], ['LALIER R-20', 'espumoso']]);
  const two = [line('BLANCOS', 0.05, 0.1, 0.2), line('TINTOS', 0.55, 0.1, 0.2), line('OSTATU 20,00 €', 0.05, 0.14, 0.4), line('MUGA CRIANZA 28,00 €', 0.55, 0.14, 0.4), line('NOSSO 31,00 €', 0.05, 0.18, 0.4)];
  assert.ok(quickMenuLines145(two as never).every(item => !item.section));
});
await test('«dale tiempo» is found by name and winery, whatever the year, only when the notes agree', () => {
  const noted = (name: string, producer: string | null, evolution: string, rating: string | null = 'love') => ({ name, producer, rating, place_details: { [EVOLUTION_KEY164]: evolution } });
  const rows = [noted('Viña Ardanza Reserva 2016', 'La Rioja Alta', 'better'), noted('Imperial Reserva', 'CVNE', 'worse'), noted('Muga', 'Muga', 'better'), noted('Muga', 'Bodegas Muga', 'worse'), noted('Protos', 'Protos', 'better', null)];
  assert.equal(evolutionFor166(rows, { name: 'Viña Ardanza Reserva', producer: 'Bodegas La Rioja Alta' }), 'better');
  assert.equal(evolutionFor166(rows, { name: 'VIÑA ARDANZA RESERVA 2019', producer: null }), 'better');
  assert.equal(evolutionFor166(rows, { name: 'Imperial Reserva', producer: 'CVNE' }), 'worse');
  assert.equal(evolutionFor166(rows, { name: 'Imperial Gran Reserva', producer: 'CVNE' }), null);
  assert.equal(evolutionFor166(rows, { name: 'Viña Ardanza Reserva', producer: 'Otra Bodega' }), null);
  assert.equal(evolutionFor166(rows, { name: 'Muga', producer: 'Muga' }), null);
  assert.equal(evolutionFor166(rows, { name: 'Protos', producer: 'Protos' }), null);
  assert.match(evolutionAdvice164('better') ?? '', /dale tiempo/);
});
await test('the hand search asks the store once', async () => {
  calls = 0; await searchStore139('ondare milenium'); assert.equal(calls, 1);
  const source = fs.readFileSync(new URL('../src/components/NativeStoreSearch139.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('searchStore139(trimmed') && !source.includes('Tolerant'));
});
await test('without the test: said once, before the photo and after, with the way to do it', () => {
  const menu = fs.readFileSync(new URL('../src/components/wine-import/WineMenuScanner.tsx', import.meta.url), 'utf8');
  assert.ok(menu.includes('menu-quiz-first166') && menu.includes('menu-no-quiz166'));
  assert.ok(!menu.includes('Haz el test de paladar para saber si te gustará'));
  assert.equal(menu.split('Hacer el test · 2 min').length - 1, 2);
});
console.log(`check-matchrim-ux166: ${n}/${n} groups passed`);
