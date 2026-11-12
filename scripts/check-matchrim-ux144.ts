// 144: what the owner's screen recording of 143 showed. A wine list photographed through «Botellas» goes to the list
// reader; one number per wine; the rest of Winerim's data on the sheet; candidates in one tap; the small fixes.
// Offline. Run: npx tsx scripts/check-matchrim-ux144.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { handMenuPhoto144, looksLikeWineList144, takeMenuPhoto144 } from '../src/utils/scanKind144';
import { buildConsumerAffinity } from '../src/utils/consumerAffinity95';
import { calculateLocalMatchrimAffinity } from '../src/utils/wineAffinityExplanation';
import { storeAffinity139 } from '../src/utils/storeListing139';
import * as scanned from '../src/utils/scannedWines139';
import { aboutAnotherWine144, parseWinerimDetail142 } from '../src/utils/winerimDetail142';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const lines = (...text: string[]) => text.map(value => ({ text: value }));

test('A photographed wine list is told from a bottle label by the text the phone read', () => {
  const list = lines('TINTOS', '(RIOJA)', 'LUIS R. - Tempranillo', '16.00€', 'MONTECILLO - Tempranillo', '18.00€', 'ONDARRE 7 PARCELAS - Tempranillo y mazuelo', '22.00€',
    'LUIS CAÑAS - Tempranillo', '24.00€', 'BAIGORRI - Tempranillo', '30.00€', 'AMAREN - Tempranillo', '33.00€');
  assert.equal(looksLikeWineList144(list), true);
  assert.equal(looksLikeWineList144(lines('Carta', 'Viña Ardanza Reserva 38 €', 'Muga Crianza 24 €', 'Marqués de Riscal 29 €', 'Protos Roble 19 €', 'Pago de Carraovejas 55 €', 'Blancos', 'Rías Baixas', 'Rueda', 'Rioja', 'Ribera')), true);
  const label = lines('RAMÓN BILBAO', 'CRIANZA', '2019', 'RIOJA', 'Denominación de Origen Calificada', '14% vol', '75 cl', 'Tempranillo', 'Embotellado en la propiedad', 'Haro, España', 'Contiene sulfitos', 'L-22145');
  assert.equal(looksLikeWineList144(label), false);
  assert.equal(looksLikeWineList144(lines('MAR DE FRADES', 'Albariño', '2024')), false);
  const file = new File(['x'], 'carta.jpg', { type: 'image/jpeg' });
  handMenuPhoto144(file); assert.equal(takeMenuPhoto144(), file); assert.equal(takeMenuPhoto144(), null);
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /looksLikeWineList144\(reading\.lines\)\) \{\s*handMenuPhoto144\(file\);[^}]*navigate\('\/escanear\/carta-vinos'\)/);
  const menu = read('src/components/wine-import/WineMenuScanner.tsx');
  // The photo waits in the tray: nothing is read (or sent) until the person starts the list read, as with any list photo.
  assert.match(menu, /clearTray141\(\); reset141\(\); setReading141\(null\);[\s\S]{0,200}takeMenuPhoto144\(\)[\s\S]{0,120}addToMenuTray141/); assert(menu.includes('data-testid="menu-handed144"'));
});

test('A scanned wine says the same number on Home and in the sheet Home opens; no scoring formula changed', () => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } }, dispatchEvent: () => true };
  (globalThis as Record<string, unknown>).Event = class { constructor(public type: string) {} };
  scanned.recordScannedWine139(null, { name: 'Blanco', winery: 'Bodega', score: 74, catalogue: true });
  scanned.recordScannedWine139(null, { name: 'Estimado', winery: 'Bodega', score: 82 });
  const [estimated, catalogue] = scanned.getScannedWines139(null);
  assert.equal(catalogue.catalogue, true); assert.equal(estimated.catalogue, undefined);
  // The catalogue comparison counts a tannin of 0; the store estimate leaves it out (139). Both formulas are as they were.
  const profile = { potente: 3, acidez: 4, dulce: 1, tanico: 3, afrutado: 4 };
  const white = { scale: 'winerim-0-5' as const, power: 3, acidity: 3, sweetness: 1, tannin: 0, fruity: 3 };
  const byCatalogue = buildConsumerAffinity({ catalogIdentityLinked: true, sensorySource: 'catalog', attributes: white, profile, score: calculateLocalMatchrimAffinity(profile, white) });
  const byStore = storeAffinity139(profile, white);
  assert(byCatalogue.state === 'ready' && byStore.state === 'ready'); assert(byCatalogue.score < byStore.score);
  assert(byCatalogue.dimensions.some(item => item.key === 'tanico')); assert(!byStore.dimensions.some(item => item.key === 'tanico'));
  const sheet = read('src/components/WineSheet142.tsx');
  assert.match(sheet, /catalogueRule\s*\? buildConsumerAffinity\(\{ catalogIdentityLinked: true, sensorySource: 'catalog', attributes, profile, score: calculateLocalMatchrimAffinity\(profile, attributes\) \}\)\s*: storeAffinity139\(profile, attributes\)/);
  assert.match(read('src/components/NativeHome98.tsx'), /setCatalogueRule144\(Boolean\(wine\.catalogue\)\)/);
  assert.match(read('src/components/NativeSearchWine138.tsx'), /catalogueRule=\{catalogueRule && !trail\.length\}/);
  assert.match(read('src/components/wine-import/MultiWineLabelScanner.tsx'), /catalogue: typeof wine\.affinity === 'number' \}\)/);
  store.clear();
});

test('The sheet shows the rest of Winerim’s data, and leaves out a paragraph written for another wine', () => {
  const detail = parseWinerimDetail142({ name: 'Ramón Bilbao', tastingAttributes: { aging: 3 },
    tastingNote: { nose: 'En nariz, fruta.', palate: 'En boca, fresco.', appearance: 'Rojo rubí.', body: 'Cuerpo medio.', structure: 'Acidez refrescante.', finish: 'Final largo.' },
    vineyardDetails: { aging: 'El Ramón Bilbao Edición Limitada envejece 14 meses.', winemakingProcess: 'Fermentación en tinos de madera.', winery: 'Bodegas Ramón Bilbao, fundada en 1924 en Haro.', vineyard: 'Viñedos a 600 metros.', climate: 'Clima continental moderado.' },
    quickSheet: { pairing: 'Ideal con embutidos.', style: 'Crianza de 14 meses en roble americano.', curiosity: 'Fundada en 1924, Ramón Bilbao ha sido reconocida.' } });
  assert.equal(detail.appearance, 'Rojo rubí.'); assert.equal(detail.finish, 'Final largo.'); assert.equal(detail.body, 'Cuerpo medio.'); assert.equal(detail.structure, 'Acidez refrescante.');
  assert.equal(detail.aging, null, 'a paragraph about «Edición Limitada» is not this wine’s');
  assert.equal(detail.winemaking, 'Fermentación en tinos de madera.'); assert.equal(detail.wineryStory, 'Bodegas Ramón Bilbao, fundada en 1924 en Haro.');
  assert.equal(detail.vineyard, 'Viñedos a 600 metros.'); assert.equal(detail.climate, 'Clima continental moderado.');
  assert.equal(detail.pairingLine, 'Ideal con embutidos.'); assert.equal(detail.curiosity, 'Fundada en 1924, Ramón Bilbao ha sido reconocida.'); assert.equal(detail.agingLevel, 3);
  assert.equal(aboutAnotherWine144('Este Ramón Bilbao Crianza, elaborado en Haro', 'Ramón Bilbao'), true);
  assert.equal(aboutAnotherWine144('El Ramón Bilbao es un tinto de Rioja', 'Ramón Bilbao'), false);
  assert.equal(parseWinerimDetail142({ name: 'X', tastingNote: { appearance: '<b>x</b>' } }).appearance, null);
  const sheet = read('src/components/WineSheet142.tsx');
  for (const id of ['winerim-made144', 'winerim-place144', 'winerim-curiosity144', 'winerim-aging144']) assert(sheet.includes(id), id);
  for (const label of ['A la vista', 'En nariz', 'En boca', 'Estructura', 'Final', 'La bodega', 'El viñedo', 'El clima']) assert(sheet.includes(`'${label}'`), label);
});

test('What fits and what may not are two lists, in every wine sheet', () => {
  const sheet = read('src/components/WineSheet142.tsx');
  assert.match(sheet, /export const WhyLines144/); assert(sheet.includes("group('Por qué encaja contigo', fits)")); assert(sheet.includes("group('Lo que podría gustarte menos', rest)"));
  for (const file of ['src/components/wine-import/NativeStoreEstimate139.tsx', 'src/components/NativeCellarItem98.tsx', 'src/components/NativeAffinitySummary.tsx'])
    assert.match(read(file), /<WhyLines144 dimensions=/, file);
});

test('Candidates: one tap on the card; no technical words while choosing', () => {
  const list = read('src/components/wine-import/CandidateRecovery286.tsx');
  assert.match(list, /if \(action !== 'Sí, es este'\) return <li[^>]*data-testid="candidate286">\s*<button type="button"[^>]*onClick=\{\(\) => void choose\(value\)\}/);
  assert(!list.includes('Ficha sin añada'));
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert(scanner.includes("picking144 ? '¿Cuál es tu vino?'")); assert(!scanner.includes("'Bodega sin confirmar'}${"));
  assert.match(read('src/components/wine-import/LabelAnalysisView.tsx'), /const picking = isNativePlatform && !catalogIdentityLinked && pendingAffinity\?\.reason === 'identity' && Boolean\(lookup\)/);
});

test('Small fixes: the vote on Home is remembered, no dead filter, three equal save choices everywhere', () => {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).window = { localStorage: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } },
    dispatchEvent: () => true };
  (globalThis as Record<string, unknown>).Event = class { constructor(public type: string) {} };
  scanned.recordScannedWine139(null, { name: 'Ondarre VII Parcelas', winery: 'Bodegas Olarra', score: 82 });
  scanned.markScannedSaved144(null, { name: 'Ondarre VII Parcelas', winery: 'Bodegas Olarra', vintage: null });
  assert.equal(scanned.getScannedWines139(null)[0].saved, true);
  scanned.recordScannedWine139(null, { name: 'Ondarre VII Parcelas', winery: 'Bodegas Olarra', score: 82 });
  assert.equal(scanned.getScannedWines139(null)[0].saved, true, 'scanning the same wine again does not ask again');
  scanned.recordScannedWine139(null, { name: 'Otro', winery: 'Bodega', score: 50 });
  assert.equal(scanned.getScannedWines139(null)[0].saved, undefined);
  assert.match(read('src/components/NativeHome98.tsx'), /scanned\[0\]\.saved \|\| liked\?\.key === scanKey\(scanned\[0\]\)/);
  const wines = read('src/pages/MyWines.tsx');
  assert.match(wines, /<div className=\{isNative \? 'hidden' : 'flex items-center gap-2'\}>/); assert(wines.includes("isNative ? 'Escanear una botella' : 'Escanear carta'"));
  const save = read('src/components/NativeSaveChoice142.tsx'); assert(!save.includes("index === 0 ? 'bg-red-900"));
  const card = read('src/components/WineCard.tsx'); assert(card.includes('<NativeSaveChoice142 wine=')); assert(!card.includes('NativeWineSave98'));
});
console.log(`check-matchrim-ux144: ${groups}/6 groups passed`);
