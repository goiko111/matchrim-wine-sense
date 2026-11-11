// 140: second real-iPhone round (build 139): the Winerim sheet opened Safari, the search lost its results on the
// way back, bottles were small, a wine list was mostly ranges and slow. Offline. Run: npx tsx scripts/check-matchrim-ux140.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { likelyByPrice140, matchListing139 } from '../src/utils/storeListing139';
import { groupStoreRows139 } from '../src/components/NativeStoreSearch139';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const row = (id: number, name: string, winery: string, price: number | null, t = [4, 3, 1, 4, 3], photo: string | null = null) => ({ id, name, winery, slugname: 'x', vintage: null,
  subname: null, type: 'tinto', region: null, country: null, photo, bottlePrice: price, tastingAttributes: { power: t[0], acidity: t[1], sweetness: t[2], tannin: t[3], fruity: t[4] } }) as never;

test('The list price picks the wine of a winery only when one is clearly the closest', () => {
  // Prices observed in the store on 2026-11-11 (one row per restaurant; the median is used).
  const montecillo = matchListing139({ name: 'MONTECILLO', type: 'tinto' }, [row(1, 'Montecillo Crianza', 'Montecillo', 19), row(2, 'Montecillo Crianza', 'Montecillo', 20), row(3, 'Montecillo Crianza', 'Montecillo', 22),
    row(4, 'Montecillo Edición Limitada', 'Montecillo', 25), row(5, 'Montecillo Gran Reserva', 'Montecillo', 40)]);
  assert.equal(montecillo?.kind, 'range'); if (montecillo?.kind !== 'range') return;
  assert.equal(montecillo.options.find(item => item.row.name === 'Montecillo Crianza')?.typicalPrice, 20, 'median of 19, 20, 22');
  assert.equal(likelyByPrice140(montecillo.options, 18)?.row.name, 'Montecillo Crianza');
  assert.equal(likelyByPrice140(montecillo.options, 22.5), null, 'between Crianza and Edición Limitada: no pick');
  assert.equal(likelyByPrice140(montecillo.options, 120), null, 'far from every option');
  assert.equal(likelyByPrice140(montecillo.options, null), null);
});
test('A medium dry red («3, 3, 1, 3, 3») is real data; other bottle sizes and junk rows stay out of the search', () => {
  assert.equal(matchListing139({ name: 'Baigorri Crianza' }, [row(1, 'Baigorri Crianza', 'Baigorri', 24, [3, 3, 1, 3, 3])])?.kind, 'exact');
  const grouped = groupStoreRows139([row(1, 'Límite Sur', 'Ramón Bilbao', 20), row(2, 'Ramón Bilbao Crianza', 'Ramón Bilbao', 18), row(3, 'Ramón Bilbao Crianza Magnum', 'Ramón Bilbao', 40),
    row(4, 'Ramón Bilbao Crianza', 'Ramón Bilbao', 19, [4, 3, 1, 4, 3], 'https://app.winerim.com/images/wines/a.png')], 'ramon bilbao');
  assert.deepEqual(grouped.map(item => item.id), [4, 1], 'name match first, the row with a photo, no magnum');
  assert.match(read('src/utils/storeListing139.ts'), /euros\?\|€/);
});
test('Nothing on iOS leaves the app for the Winerim web', () => {
  assert.match(read('src/components/WinerimOriginalSheet.tsx'), /externalLink = !Capacitor\.isNativePlatform\(\)/);
  const cellar = read('src/components/NativeCellarItem98.tsx');
  assert(!/target="_blank"/.test(cellar)); assert.match(cellar, /<NativeWinerimFacts140 identity=/);
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /photo=\{facts140 && <NativeWinerimFacts140 identity=\{facts140\} part="photo" \/>\}/);
});
test('Back from a wine returns to the search; the store is asked politely', () => {
  const home = read('src/components/NativeHome98.tsx');
  assert.match(home, /if \(fromSearch\) \{ setFromSearch\(false\); setSearchOpen\(true\); \}/);
  assert.match(home, /query=\{searchQuery\} onQuery=\{setSearchQuery\}/);
  const store = read('src/utils/storeListing139.ts');
  assert.match(store, /if \(running >= 6\)/); assert(!/searchProposals/.test(store), 'one page per line, not four in sequence');
});
console.log(`check-matchrim-ux140: ${groups}/4 groups passed`);
