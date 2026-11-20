// 162 (owner, 20-nov-2026: «Pantallas reales… Esto hay que hacerlo»). Run: npx tsx scripts/check-matchrim-ux162.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } };
const { profileStyles162 } = await import('../src/utils/profileStyles162');
const { parsePlaces162, placeLabel162, placeMapUrl162, searchPlaces162 } = await import('../src/utils/places162');
const { listSavedMenus162, saveMenu162, removeSavedMenu162 } = await import('../src/utils/savedMenus162');
const read = (file: string) => fs.readFileSync(file, 'utf8');
let groups = 0; const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); groups += 1; console.log(`  ok ${name}`); };

await test('The tour is pieces of the app, moved with the finger, with no arrows on the iPhone', () => {
  const guide = read('src/components/MatchrimQuickGuide.tsx'), scenes = read('src/components/NativeTour162.tsx');
  assert(guide.includes('onTouchStart') && guide.includes('onTouchEnd') && guide.includes('Desliza para pasar de pantalla'));
  assert(guide.includes("{step > 0 && !native158 && <Button variant=\"outline\" size=\"icon\""), 'the back arrow is web only');
  assert(guide.includes('Saltar guía') && guide.includes('data-testid="tour-next158"') && guide.includes('data-testid="tour-dots158"'));
  for (let step = 0; step < 6; step += 1) assert(scenes.includes(`data-testid="tour-scene162-${step}"`), `scene ${step}`);
  assert((scenes.match(/aria-pressed=|aria-expanded=/g) ?? []).length >= 6, 'every scene answers to a tap');
  assert(!/supabase|fetch\(|localStorage|navigate\(/.test(scenes), 'the scenes save and send nothing');
  const pause = read('src/components/QuizBreak159.tsx');
  assert(pause.includes('quizPhoto157') && !pause.includes('tour159'));
});
await test('The profile says where to start, from the five answers', () => {
  const strong = profileStyles162({ potente: 5, acidez: 2, dulce: 1, tanico: 4, afrutado: 2 } as never).map(style => style.id);
  assert.deepEqual(strong, ['tinto-cuerpo', 'blanco-suave', 'espumoso']);
  const light = profileStyles162({ potente: 2, acidez: 5, dulce: 4, tanico: 1, afrutado: 5 } as never).map(style => style.id);
  assert.deepEqual(light, ['tinto-ligero', 'blanco-fresco', 'dulce']);
  assert.deepEqual(profileStyles162(null), []);
  const page = read('src/components/NativeQuizResults240.tsx');
  assert(page.includes('data-testid="profile-styles162"') && page.includes('Son ejemplos') && page.includes('data-testid="taste-scale162"'));
});
await test('The access screen has the new look and says what the account is for', () => {
  const auth = read('src/pages/Auth.tsx');
  assert(auth.includes('data-testid="auth-head162"') && auth.includes('Tus vinos y tus valoraciones no se pierden'));
  assert(auth.includes('rounded-full bg-red-900') && auth.includes('data-testid="auth-why160"'));
});
await test('Places come from the phone, are cleaned, and the screen works without them', async () => {
  assert.deepEqual(parsePlaces162([{ name: ' Narru ', address: 'Zubieta 56, Donostia', lat: 43.31, lng: -1.99 }, { name: '' }, null, { name: 'X', lat: 999 }]),
    [{ name: 'Narru', address: 'Zubieta 56, Donostia', lat: 43.31, lng: -1.99 }, { name: 'X', address: '', lat: null, lng: null }]);
  assert.deepEqual(await searchPlaces162('na'), []);
  assert.deepEqual(await searchPlaces162('Narru'), [], 'outside the iPhone there is no search and nothing breaks');
  const place = { name: 'Narru', address: 'Zubieta 56, Donostia', lat: 43.31, lng: -1.99 };
  assert.equal(placeLabel162(place), 'Narru · Zubieta 56, Donostia');
  assert(placeMapUrl162(place).startsWith('https://maps.apple.com/?q=Narru&ll=43.31000,-1.99000'));
  const util = read('src/utils/places162.ts');
  assert(!/googleapis|search-places|supabase/.test(util), 'no paid place search');
  const swift = read('ios/App/App/MatchrimPlacesPlugin162.swift');
  assert(swift.includes('MKLocalSearch') && !/CLLocationManager|requestWhenInUseAuthorization/.test(swift), 'no location permission');
  assert(read('ios/App/App/AppDelegate.swift').includes('registerPluginInstance(MatchrimPlacesPlugin162())'));
  assert.equal((read('ios/App/App.xcodeproj/project.pbxproj').match(/MatchrimPlacesPlugin162\.swift/g) ?? []).length, 6);
  const panel = read('src/components/NativeWherePanel162.tsx');
  for (const label of ['¿Dónde lo tomaste?', 'En un restaurante o bar', 'En casa', 'Precio en carta', 'Guardar']) assert(panel.includes(label), label);
  assert(read('src/components/wine-import/PurchaseInfoSelector.tsx').includes('Capacitor.isNativePlatform() ? <NativeWherePanel162'));
});
await test('A wine list is kept on the phone with its restaurant, replaced when saved again, and removed', () => {
  const place = { name: 'Narru', address: 'Zubieta 56', lat: 43.3, lng: -2 };
  assert.equal(saveMenu162('u1', place, []), null);
  const first = saveMenu162('u1', place, [{ nombre: 'Aitaren', posicion: { x: 1 }, pagina141: 0 }], 1000);
  assert.deepEqual(first?.wines, [{ nombre: 'Aitaren' }], 'what belonged to the photo is not kept');
  saveMenu162('u1', place, [{ nombre: 'Aitaren' }, { nombre: 'Ostatu' }], 2000);
  saveMenu162('u1', { name: 'Otro', address: '', lat: null, lng: null }, [{ nombre: 'X' }], 3000);
  assert.deepEqual(listSavedMenus162('u1').map(menu => `${menu.place.name}:${menu.wines.length}`), ['Otro:1', 'Narru:2']);
  assert.deepEqual(listSavedMenus162('u2'), [], 'another person on the same phone does not see them');
  removeSavedMenu162('u1', listSavedMenus162('u1')[0].id);
  assert.deepEqual(listSavedMenus162('u1').map(menu => menu.place.name), ['Narru']);
  assert(!/supabase|fetch\(/.test(read('src/utils/savedMenus162.ts')), 'nothing is sent to a server');
});
await test('Pairings carry photographs and the sheet keeps the photo in sight', () => {
  const cards = read('src/components/PairingCards162.tsx');
  for (const name of ['carne', 'ave', 'pescado', 'pasta', 'arroz', 'queso']) assert(fs.statSync(`src/assets/pairing162/${name}.jpg`).size < 130_000, name);
  assert(read('src/components/WineSheet142.tsx').includes('<PairingCards162 names={data.pairings} />'));
  assert(cards.includes('\\\\baves?\\\\b') || cards.includes('\\baves?\\b'), '«Queso suave» is not poultry');
  assert(read('src/components/wine-import/MultiWineLabelScanner.tsx').includes('data-testid="sheet-photo162"'));
  assert((read('docs/MATCHRIM_157_FOTOS.md').match(/images\.unsplash\.com\/photo-/g) ?? []).length >= 14, 'credits');
});
await test('The list says which wines were read without a number, and the quick list reorders itself', () => {
  const scanner = read('src/components/wine-import/WineMenuScanner.tsx');
  assert(scanner.includes('data-testid="native-menu-blank162"') && scanner.includes('Leídos de la carta, sin nota todavía'));
  assert(read('src/components/wine-import/MenuQuickPreview145.tsx').includes('order162.map(index =>'));
});
await test('The sheet shows when to drink the wine and what its classification means', async () => {
  const { parseWinerimDetail142 } = await import('../src/utils/winerimDetail142');
  const detail = parseWinerimDetail142({ name: 'Quintaluna', drinkingWindow: { drinkingWindow: { start: '2025', end: '2028' }, primeWindow: { start: '2026', end: '2027' } },
    floor: { name: 'Vino de la Tierra (VT)', description: '-El Vino de la Tierra es una categoría intermedia.' } });
  assert.equal(detail.drink, 'Mejor en 2026–2027 (bebible 2025–2028)');
  assert.deepEqual(detail.classification, { name: 'Vino de la Tierra (VT)', text: 'El Vino de la Tierra es una categoría intermedia.' });
  const empty = parseWinerimDetail142({ name: 'X', drinkingWindow: { drinkingWindow: { start: 'pronto', end: '2028' } } });
  assert.equal(empty.drink, null); assert.equal(empty.classification, null);
});
console.log(`check-matchrim-ux162: ${groups}/8 groups`);
