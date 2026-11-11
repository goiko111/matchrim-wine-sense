// 141: third real-iPhone round (build 140). The vintage became the bottle number, the Winerim sheet was a text
// summary instead of Winerim's own page, saving a searched wine opened a form, and a price in the store's
// «subname» slipped through the search filter. Offline. Run: npx tsx scripts/check-matchrim-ux141.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { winerimStoreUrl141 } from '../src/components/WinerimWebSheet141';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('Winerim’s own page opens framed inside the app, and only a well-formed store address', () => {
  assert.equal(winerimStoreUrl141(82495, 'Lagar-de-Cervera'), 'https://web.winerim.com/matchrim/store/82495/Lagar-de-Cervera');
  for (const [id, slug] of [[0, 'a'], [1.5, 'a'], ['1', 'a'], [1, ''], [1, '../x'], [1, 'a b'], [1, 'a?x=1'], [1, '_2020']] as const) assert.equal(winerimStoreUrl141(id, slug), null, `${id}/${slug}`);
  const sheet = read('src/components/WinerimWebSheet141.tsx');
  assert.match(sheet, /sandbox="allow-scripts allow-same-origin allow-forms"/, 'the frame cannot open windows or navigate the app');
  assert(!/allow-popups|allow-top-navigation/.test(sheet));
  // 142: the framed page is no longer offered (it let people wander into the whole Winerim store); the data is shown natively.
  assert(!read('src/components/NativeWinerimFacts140.tsx').includes('WinerimWebSheet141'));
});
test('A searched wine is saved in one tap, as «Por probar», without flavour data or profile training', () => {
  const save = read('src/components/NativeQuickSave141.tsx');
  assert.match(save, /status: 'wishlist'/); assert.match(save, /matchrim_affinity: null, sensory_attributes: null, use_for_profile_training: false/);
  assert.match(save, /\^https:\\\/\\\/app\\\.winerim\\\.com\\\//, 'only a Winerim image is stored as the photo');
  const sheet = read('src/components/NativeSearchWine138.tsx');
  assert.match(sheet, /<NativeSaveChoice142 /); assert(!sheet.includes('NativeWineSave98'));
});
test('The search filter reads the store’s subname; a saved wine’s sheet is the short one', () => {
  assert.match(read('src/utils/storeListing139.ts'), /test\(`\$\{row\.name\} \$\{row\.subname \?\? ''\}`\)/);
  const cellar = read('src/components/NativeCellarItem98.tsx');
  for (const id of ['native-cellar-sheet141', 'native-cellar-verdict141', 'native-cellar-rate141', 'native-cellar-more141']) assert(cellar.includes(id), id);
  // 143: the estimate's reasons are built from the row's own store match instead of a second NativeStoreEstimate139 lookup.
  assert.match(cellar, /compatLines142\(ready\.dimensions\)/); assert(!cellar.includes('NativeStoreEstimate139 identity'));
  assert.match(read('src/pages/MyWines.tsx'), /Me he bebido una botella<\/Button>\}\n\s+<div className="space-y-1">\{ratingControls141\(wine\)\}<\/div>/, 'drinking a bottle stays in view');
});
console.log(`check-matchrim-ux141: ${groups}/3 groups passed`);
