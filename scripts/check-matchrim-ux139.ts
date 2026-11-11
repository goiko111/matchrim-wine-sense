// 139: what the owner found on a real iPhone with build 138 (search, wine list without verdicts, lost scans,
// tannin on whites, aiRIM that did not look like a place to ask). Offline. Run: npx tsx scripts/check-matchrim-ux139.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { matchListing139, readListingLine139, storeAffinity139 } from '../src/utils/storeListing139';
import { groupStoreRows139 } from '../src/components/NativeStoreSearch139';
import { WINE_FACTS139 } from '../src/utils/wineFacts139';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const row = (id: number, name: string, winery: string, vintage: string | null, type: string, t: number[], photo: string | null = null) => ({ id, name, winery, slugname: 'x', vintage,
  subname: null, type, region: null, country: null, photo, tastingAttributes: { power: t[0], acidity: t[1], sweetness: t[2], tannin: t[3], fruity: t[4] } }) as never;

test('A list line is read as brand, grape hint and vintage', () => {
  assert.deepEqual(readListingLine139({ name: 'MARCO REAL – Syrah 2021' }), { name: 'marco real', vintage: '2021', hints: ['syrah'], query: 'MARCO REAL' });
});
test('Real list lines (Ikili, 2026-11-11) against rows observed in the store', () => {
  const roda = [row(1, 'Roda Reserva', 'Bodegas Roda', '2019', 'tinto', [4, 3, 1, 4, 4]), row(2, 'Roda I Reserva', 'Bodegas Roda', '2018', 'tinto', [5, 3, 1, 4, 4]),
    row(3, 'Sela', 'Bodegas Roda', '2021', 'tinto', [3, 4, 1, 3, 4]), row(4, 'Roda I Blanco', 'Bodegas Roda', '2020', 'blanco', [3, 4, 1, 0, 3])];
  const brand = matchListing139({ name: 'RODA – Tempranillo', type: 'tinto' }, roda);
  assert.equal(brand?.kind, 'range'); assert.deepEqual(brand?.kind === 'range' && brand.options.map(item => item.row.id), [1, 2, 3], 'the white is not offered for a red line');
  const exact = matchListing139({ name: 'LUIS CAÑAS', type: 'tinto' }, [row(5, 'Luis Cañas', 'Luis Cañas', '2021', 'tinto', [3, 3, 1, 3, 4]), row(6, 'Luis Cañas Reserva', 'Luis Cañas', '2017', 'tinto', [4, 3, 1, 4, 3])]);
  assert.equal(exact?.kind === 'exact' && exact.estimate.row.id, 5);
  const split = matchListing139({ name: 'PAGOS DE ANGUIX COSTALARA' }, [row(7, 'Costalara', 'Pagos de Anguix', '2020', 'tinto', [4, 3, 1, 4, 4]), row(8, 'Barrueco', 'Pagos de Anguix', '2019', 'tinto', [5, 3, 1, 4, 4])]);
  assert.equal(split?.kind === 'exact' && split.estimate.row.id, 7);
  assert.equal(matchListing139({ name: 'CARRALCOVA' }, roda), null);
  assert.equal(matchListing139({ name: 'RODA' }, [...roda, row(9, 'Roda', 'Otra Bodega', '2020', 'tinto', [2, 4, 1, 2, 4])])?.kind, 'range', 'another winery with the brand in a wine name does not win');
});
test('The tannin of a white is neither a reason nor a caution, and does not lower the estimate', () => {
  const profile = { potente: 3, acidez: 4, dulce: 1, tanico: 2, afrutado: 4 };
  const white = storeAffinity139(profile, { scale: 'winerim-0-5', power: 3, acidity: 4, sweetness: 1, tannin: 0, fruity: 4 });
  assert.equal(white.state, 'ready'); if (white.state !== 'ready') return;
  assert(white.score >= 90, String(white.score));
  assert.equal(white.caution, null); assert(!white.dimensions.some(item => item.key === 'tanico'));
  assert(white.matches.every(text => !/tanin|áspero|suave en boca/i.test(text)), white.matches.join(' | '));
  const red = storeAffinity139(profile, { scale: 'winerim-0-5', power: 3, acidity: 4, sweetness: 1, tannin: 5, fruity: 4 });
  assert(red.state === 'ready' && red.dimensions.some(item => item.key === 'tanico') && red.score < white.score);
});
test('Search results: one entry per wine, the one with a photo first', () => {
  const grouped = groupStoreRows139([row(1, 'Protos Crianza', 'Protos', '2019', 'tinto', [4, 3, 1, 4, 3]), row(2, 'Protos Crianza', 'Protos', '2021', 'tinto', [4, 3, 1, 4, 3]),
    row(3, 'Protos Crianza', 'Protos', '2018', 'tinto', [4, 3, 1, 4, 3], 'https://app.winerim.com/images/wines/a.png'), row(4, 'Protos Verdejo', 'Protos', '2023', 'blanco', [2, 4, 1, 0, 4])]);
  assert.deepEqual(grouped.map(item => item.id), [3, 4]);
  const home = read('src/components/NativeHome98.tsx');
  assert.match(home, /<NativeStoreSearch139 /); assert(!home.includes('NativeWineSearch97'));
  assert.match(read('src/components/NativeStoreSearch139.tsx'), /input\.current\?\.focus\(\)/);
});
test('Scans are remembered, wines take a personal note, aiRIM invites a question', () => {
  assert.match(read('src/components/wine-import/MultiWineLabelScanner.tsx'), /recordScannedWine139\(user\?\.id \?\? null/);
  assert.match(read('src/components/NativeHome98.tsx'), /data-testid="native-home-scanned139"/);
  assert.match(read('src/components/NativeCellarItem98.tsx'), /<NativeWineNote139 wineId=\{wine\.id\}/);
  assert.match(read('src/components/NativeWineNote139.tsx'), /update\(\{ personal_note: value \|\| null \}\)\.eq\('id', wineId\)/);
  assert.match(read('src/components/NativeAiRimChat99.tsx'), /Pregúntame lo que quieras sobre vino/);
});
test('Estimates stay out of the profile and of saved data; wine facts are general', () => {
  for (const file of ['src/utils/storeListing139.ts', 'src/utils/menuEstimates139.ts', 'src/components/wine-import/NativeStoreEstimate139.tsx'])
    assert(!/integrations\/supabase|\.from\('|localStorage/.test(read(file)), file);
  assert(WINE_FACTS139.length >= 25 && new Set(WINE_FACTS139).size === WINE_FACTS139.length);
  assert(WINE_FACTS139.every(fact => fact.length <= 140 && /[.!]$/.test(fact)));
  assert.match(read('src/index.css'), /html\.matchrim-native-platform \{\n  \/\* 139:[^\n]*\n  --accent: 24 6% 92%;/);
});
console.log(`check-matchrim-ux139: ${groups}/6 groups passed`);
