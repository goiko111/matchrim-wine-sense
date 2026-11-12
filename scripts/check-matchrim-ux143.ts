// 143: second delivery of the redesign: thumbs on Home's last scan, the new verdict on the scanned-bottle sheet,
// saved wines as cards with pill filters and the new header. Offline. Run: npx tsx scripts/check-matchrim-ux143.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('Home: «¿Te gustó?» on the last scan saves it as tasted with the rating, for a signed-in person only', () => {
  const home = read('src/components/NativeHome98.tsx');
  assert.match(home, /\{ownerId && <div[^>]*data-testid="native-home-liked143"/);
  assert.match(home, /saveStoreWine142\(ownerId, \{ name: scanned\[0\]\.name, producer: scanned\[0\]\.winery, vintage: scanned\[0\]\.vintage \}, 'tasted', rating\)/);
  const save = read('src/components/NativeSaveChoice142.tsx');
  assert.match(save, /export const saveStoreWine142 = async/);
  assert.match(save, /matchrim_affinity: null, sensory_attributes: null, use_for_profile_training: false/);
});
test('Scanned bottle: the estimate is the big number, the answer and one sentence per trait', () => {
  const estimate = read('src/components/wine-import/NativeStoreEstimate139.tsx');
  assert.match(estimate, /<WhyLines144 dimensions=\{result\.dimensions\}/); assert(!estimate.includes('NativeAffinitySummary'));
  assert.match(estimate, /Estimación con los datos de la tienda de Winerim/);
});
test('Saved wines: cards, pill filters and the new header keep their handles', () => {
  const item = read('src/components/NativeCellarItem98.tsx');
  for (const id of ['native-cellar-item98', 'native-cellar-sheet141', 'native-cellar-verdict141', 'native-cellar-rate141', 'native-cellar-more141', 'native-cellar-why143', 'native-cellar-affinity143']) assert(item.includes(id), id);
  assert.match(read('src/components/NativeCellarToolbar98.tsx'), /aria-pressed/);
});
test('Wine-list photo: positions can come from the phone’s own reading; the old OCR method is untouched', () => {
  const swift = read('ios/App/App/MatchrimOCRPlugin106.swift');
  assert.match(swift, /CAPPluginMethod\(name: "recognizeLines"/); assert.match(swift, /CAPPluginMethod\(name: "recognize"/);
  assert.match(read('src/utils/nativeOcrLines143.ts'), /recognizeLines/);
  assert.match(read('src/components/wine-import/WineMenuScanner.tsx'), /matchMenuPositions143|devicePlaces143/);
});
console.log(`check-matchrim-ux143: ${groups}/4 groups passed`);
