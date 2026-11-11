// 133: "Hacer foto" opens the native camera; the cellar shows the own photo or the catalogue photo for every row.
// Offline, mocked native bridge. Run: npx tsx scripts/check-matchrim-camera-photos133.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createNativeCamera133, openCamera133 } from '../src/utils/nativeCamera133';

let groups = 0;
const test = async (name: string, fn: () => Promise<void> | void) => { await fn(); groups += 1; console.log(`  ok ${name}`); };
const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]).toString('base64')}`;
const fakeInput = () => { const input = { disabled: false, clicks: 0, click() { input.clicks += 1; } }; return input; };

await test('A captured photo becomes a JPEG File with the same bytes', async () => {
  const outcome = await createNativeCamera133({ takePhoto: async () => ({ status: 'captured', image: jpeg }) })();
  assert.equal(outcome.status, 'captured');
  if (outcome.status !== 'captured') return;
  assert.equal(outcome.file.type, 'image/jpeg');
  assert.deepEqual([...new Uint8Array(await outcome.file.arrayBuffer())], [0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
});
await test('Cancel, missing plugin method and malformed replies never invent a photo', async () => {
  assert.deepEqual(await createNativeCamera133({ takePhoto: async () => ({ status: 'cancelled' }) })(), { status: 'cancelled' });
  assert.deepEqual(await createNativeCamera133({ takePhoto: async () => { throw new Error('UNIMPLEMENTED'); } })(), { status: 'unavailable' });
  for (const reply of [null, {}, { status: 'captured' }, { status: 'captured', image: 'data:image/png;base64,AAAA' }, { status: 'captured', image: 'https://x/y.jpg' }])
    assert.deepEqual(await createNativeCamera133({ takePhoto: async () => reply })(), { status: 'unavailable' }, JSON.stringify(reply));
});
await test('No camera (simulator, web) falls back to the file input; cancel does nothing', async () => {
  const unavailable = fakeInput();
  await openCamera133(unavailable as unknown as HTMLInputElement, async () => ({ status: 'unavailable' }));
  assert.equal(unavailable.clicks, 1);
  const cancelled = fakeInput();
  await openCamera133(cancelled as unknown as HTMLInputElement, async () => ({ status: 'cancelled' }));
  assert.equal(cancelled.clicks, 0);
  const web = fakeInput();
  await openCamera133(web as unknown as HTMLInputElement, null);
  assert.equal(web.clicks, 1);
  const disabled = { ...fakeInput(), disabled: true };
  let asked = false;
  await openCamera133(disabled as unknown as HTMLInputElement, async () => { asked = true; return { status: 'cancelled' }; });
  assert.equal(asked, false);
});
await test('Every "Hacer foto" goes through openCamera133; no camera input is clicked directly', () => {
  for (const [file, ref] of [['src/components/wine-import/MultiWineLabelScanner.tsx', 'cameraInputRef'], ['src/components/wine-import/WineMenuScanner.tsx', 'cameraInputRef'],
    ['src/components/wine-import/FoodPairingScanner.tsx', 'cameraInputRef'], ['src/components/wine-import/WineLabelOCRImport.tsx', 'cameraInputRef'], ['src/pages/Restaurant.tsx', 'cameraInput']]) {
    const source = fs.readFileSync(file, 'utf8');
    assert.match(source, new RegExp(`openCamera133\\(${ref}\\.current\\)`), file);
    assert.doesNotMatch(source, new RegExp(`${ref}\\.current\\??\\.click\\(\\)`), file);
  }
});
await test('Native side: takePhoto registered, camera only, upright JPEG, nothing uploaded; app declared in Spanish', () => {
  const swift = fs.readFileSync('ios/App/App/MatchrimOCRPlugin106.swift', 'utf8');
  assert.match(swift, /CAPPluginMethod\(name: "takePhoto", returnType: CAPPluginReturnPromise\)/);
  assert.match(swift, /picker\.sourceType = \.camera/);
  assert.match(swift, /"data:image\/jpeg;base64," \+ jpeg\.base64EncodedString\(\)/);
  assert.doesNotMatch(swift.slice(swift.indexOf('extension MatchrimOCRPlugin106')), /URLSession|URLRequest|http/i);
  const plist = fs.readFileSync('ios/App/App/Info.plist', 'utf8');
  assert.match(plist, /<key>CFBundleDevelopmentRegion<\/key>\s*<string>es<\/string>/);
  assert.match(plist, /<key>CFBundleLocalizations<\/key>\s*<array>\s*<string>es<\/string>\s*<\/array>/);
});
await test('Cellar: own photo first, catalogue lookup for every row near the screen, one lookup per identity', () => {
  const item = fs.readFileSync('src/components/NativeCellarItem98.tsx', 'utf8');
  // 141: own photo first, then Winerim's store photo (looked up only near the screen); the Library only with the sheet open.
  assert.match(item, /const photo = wine\.image_url \|\| ownPhoto \|\| storeHit\?\.photo \|\|/);
  assert.match(item, /const near = resolveImage \|\| visible \|\| open;/);
  assert.match(item, /useOwnWinePhoto133\(wine\.id, native && !wine\.image_url && near\)/);
  assert.match(item, /resolveMissing=\{!photo && open && storeSettled\}/);
  assert.match(item, /new IntersectionObserver/);
  const photo = fs.readFileSync('src/components/NativeWinePhoto98.tsx', 'utf8');
  assert.match(photo, /resolvedPhotos133\.has\(identityKey\)/);
  assert.match(photo, /result\.status !== 'unavailable'\) resolvedPhotos133\.set/);
  const scanner = fs.readFileSync('src/components/wine-import/MultiWineLabelScanner.tsx', 'utf8');
  assert.match(scanner, /if \(isNative\) batch\.groups\.forEach[\s\S]{0,300}saveOwnWinePhoto133\(result\.rowId, crop\)/);
  const own = fs.readFileSync('src/utils/ownWinePhoto133.ts', 'utf8');
  assert.match(own, /indexedDB\.open/);
  assert.doesNotMatch(own, /supabase|fetch\(|localStorage/);
});
assert.equal(groups, 6);
console.log(`Matchrim camera and photos 133: ${groups}/6 PASS`);
