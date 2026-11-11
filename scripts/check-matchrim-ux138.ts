// 138: the owner-approved proposals of the 137 usability report (short registration, search opens the affinity
// sheet, «Mis vinos» tab, direct verdicts, short scanner notice, pairings with the personal verdict, store
// estimate, rebuilt profile). Offline, no network. Run: npx tsx scripts/check-matchrim-ux138.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';
import { pickStoreRow138, usableStoreSensory138 } from '../src/utils/storeEstimate138';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const row = (id: number, name: string, winery: string, vintage: string | null, type: string, t: number[] | null) => ({ id, name, winery, slugname: 'x', vintage,
  subname: null, type, region: null, country: null, photo: null, tastingAttributes: t ? { power: t[0], acidity: t[1], sweetness: t[2], tannin: t[3], fruity: t[4] } : undefined }) as never;

test('Verdict titles answer «¿me gustará?»', () => {
  const profile = { potente: 3, acidez: 3, dulce: 1, tanico: 3, afrutado: 3 };
  const title = (score: number) => { const result = buildConsumerAffinity({ score, catalogIdentityLinked: true, sensorySource: 'catalog', profile,
    attributes: { scale: 'winerim-0-5', power: 3, acidity: 3, sweetness: 1, tannin: 3, fruity: 3 } as never }); return result.state === 'ready' ? result.title : null; };
  assert.deepEqual([90, 70, 50, 30].map(title), ['Muy de tu estilo', 'Probablemente te guste', 'Puede que sí, puede que no', 'No es tu estilo']);
});
test('Store vectors: real ones are usable, filler-like ones are not', () => {
  // Values observed in the public store on 2026-11-11.
  assert(usableStoreSensory138(row(1, 'Viña Ardanza Reserva', 'La Rioja Alta', '2016', 'tinto', [4, 3, 1, 3, 4])));
  assert(usableStoreSensory138(row(2, 'Lagar de Cervera', 'La Rioja Alta', null, 'blanco', [2, 4, 1, 0, 3])), 'a white may have tannin 0');
  assert.equal(usableStoreSensory138(row(3, 'x', 'y', null, 'tinto', [4, 3, 1, 0, 3])), null, 'a red with tannin 0 is «not applicable»');
  assert.equal(usableStoreSensory138(row(4, 'x', 'y', null, 'blanco', [3, 3, 3, 3, 3])), null);
  assert.equal(usableStoreSensory138(row(5, 'x', 'y', null, 'tinto', [3, 3, 1, 3, 3])), null, 'four defaults');
  assert.equal(usableStoreSensory138(row(6, 'x', 'y', null, 'tinto', [0, 3, 1, 3, 4])), null);
  assert.equal(usableStoreSensory138(row(7, 'x', 'y', null, 'tinto', null)), null);
  assert.equal(usableStoreSensory138(row(8, 'x', 'y', null, 'tinto', [4, 3, 1, 3, 9])), null);
});
test('Store row choice: same name and winery, the asked vintage first, never a different wine', () => {
  const rows = [row(1, 'Viña Ardanza Reserva', 'La Rioja Alta', '2015', 'tinto', [4, 3, 1, 4, 4]), row(2, 'Viña Ardanza Reserva', 'La Rioja Alta', '2016', 'tinto', [4, 3, 1, 3, 4]),
    row(3, 'Viña Ardanza Reserva Selección Especial', 'La Rioja Alta', '2010', 'tinto', [5, 3, 1, 4, 4]), row(4, 'Viña Arana Reserva', 'La Rioja Alta', '2016', 'tinto', [3, 3, 1, 2, 4])];
  assert.equal(pickStoreRow138({ name: 'Viña Ardanza Reserva', producer: 'La Rioja Alta', vintage: 2016 }, rows)?.row.id, 2);
  assert.equal(pickStoreRow138({ name: 'Viña Ardanza Reserva 2015', producer: null }, rows)?.row.id, 1, 'year printed inside the name');
  assert.equal(pickStoreRow138({ name: 'vina ardanza reserva', producer: 'La Rioja Alta', vintage: 2001 }, rows)?.row.id, 2, 'unknown vintage: the most recent');
  assert.equal(pickStoreRow138({ name: 'Viña Ardanza', producer: 'La Rioja Alta' }, rows), null, 'a shorter name is another wine');
  assert.equal(pickStoreRow138({ name: 'Viña Ardanza Reserva', producer: 'Otra Bodega' }, rows), null);
  const twoWineries = [...rows, row(9, 'Viña Ardanza Reserva', 'Otra Bodega', '2016', 'tinto', [2, 4, 1, 2, 4])];
  assert.equal(pickStoreRow138({ name: 'Viña Ardanza Reserva' }, twoWineries), null, 'no producer and two wineries');
});
test('The store estimate never enters the scanner or the verified-sheet path', () => {
  assert.match(read('src/utils/nativeGlobalCatalogue103.ts'), /const sensory = null;/);
  for (const file of ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/multiWineConsumer95.ts', 'src/utils/winerimOriginalSheet.ts', 'src/services/winerimApi.ts'])
    assert(!read(file).includes('storeEstimate138'), file);
  assert.match(read('src/components/NativeSearchWine138.tsx'), /Estimación con los datos de la tienda de Winerim/);
  assert.match(read('src/pages/Restaurant.tsx'), /\(estimación\)/);
});
test('Search result opens the affinity sheet; the add form is only the fallback', () => {
  const home = read('src/components/NativeHome98.tsx');
  assert.match(home, /onSelectWine=\{wine => \{ setSearchOpen\(false\); setSearched\(wine\); \}\}/);
  assert.match(home, /<NativeSearchWine138 wine=\{searched\}/);
  const sheet = read('src/components/NativeSearchWine138.tsx');
  assert.match(sheet, /findWinerimWineForLabel\(/); assert.match(sheet, /findStoreEstimate138\(wine/);
  assert.match(sheet, /Aún no tenemos la ficha de este vino/);
});
test('iOS registration is one screen; the web keeps its steps', () => {
  const page = read('src/pages/Registration.tsx'), quick = read('src/components/registration/QuickRegistration138.tsx');
  assert.match(page, /if \(isNative\) return <QuickRegistration138 /);
  assert(!/data\.(phone|lastName|birthDate|location)/.test(quick));
  assert.match(quick, /data\.password\.length >= 6 && accepted/);
  assert.match(quick, /onUpdate\(\{ termsAccepted: checked === true, privacyAccepted: checked === true \}\)/);
  assert.equal((quick.match(/<LegalLink136 /g) || []).length, 2);
});
test('Tab, scanner notice, pairings and profile', () => {
  assert.match(read('src/components/MobileBottomNav.tsx'), /label: isNative \? 'Mis vinos' : 'Bodega'/);
  const gate = read('src/components/ScanPrivacyGate.tsx');
  assert.match(gate, /data-testid="scan-privacy-short138">\s*Si usas el análisis con IA, la foto se envía a Matchrim y a OpenAI/);
  assert.match(gate, /<\/details> : detail\}/); assert.match(gate, /NATIVE_SCAN_PROVIDER_NOTICE97/);
  const restaurant = read('src/pages/Restaurant.tsx');
  assert.match(restaurant, /data-testid="restaurant-personal138"/); assert.match(restaurant, /orderedPairs138\.map/);
  const profile = read('src/pages/Profile.tsx'), body = read('src/components/NativeProfileBody138.tsx');
  assert.match(profile, /baseProfile \? isNative \? \(\s*<NativeProfileBody138/);
  assert(!/StyleRangePreview|bg-purple|bg-amber|Pot\.<|Escala 1-5/.test(body));
  assert.match(body, /role="meter"/);
});
console.log(`check-matchrim-ux138: ${groups}/7 groups passed`);
