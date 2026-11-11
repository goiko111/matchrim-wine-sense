// 139: the wine-list scanner answers «¿me gustará?» for every line it can (iOS): store estimates and winery ranges
// next to verified sheets, ordered by score, several photos in one list, a clean results screen.
// Offline, no network. Run: npx tsx scripts/check-matchrim-menu139.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { menuCoverageWarning139, menuLineKey139, menuVerdict139, menuVerdictRank139, menuVerdictText139, mergeMenuPages139,
  sortMenuVerdicts139, storeOptionName139, type MenuVerdict139 } from '../src/utils/menuEstimates139';
import { storeScore139 } from '../src/utils/storeListing139';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const profile = { potente: 4, acidez: 3, dulce: 1, tanico: 3, afrutado: 4 };
const estimate = (id: number, name: string, t: number[], subname: string | null = null) => ({ row: { id, name, subname, winery: 'Bodegas Roda', slugname: 'x', vintage: '2019',
  type: 'tinto', region: 'Rioja', country: null, photo: null }, attributes: { scale: 'winerim-0-5', power: t[0], acidity: t[1], sweetness: t[2], tannin: t[3], fruity: t[4] } }) as never;
const near = estimate(1, 'Roda', [4, 3, 1, 3, 4], 'Reserva'), far = estimate(2, 'Sela', [2, 5, 1, 1, 2]), mid = estimate(3, 'Roda I', [5, 3, 1, 4, 4]);
const score = (item: { attributes: never }) => storeScore139(profile, item.attributes) as number;

test('A store match is an estimate and says so; a verified sheet wins and is not relabelled', () => {
  const exact = menuVerdict139(null, { kind: 'exact', estimate: near }, profile);
  assert.equal(exact.kind, 'estimate'); assert(exact.kind === 'estimate' && exact.score === score(near) && !exact.chosen);
  assert.match(menuVerdictText139(exact), /^≈\d+\/100 · .+ \(estimación\)$/);
  const verified = menuVerdict139({ score: 81, title: 'Muy de tu estilo' }, { kind: 'exact', estimate: far }, profile);
  assert.deepEqual(verified, { kind: 'verified', score: 81, title: 'Muy de tu estilo' });
  assert.equal(menuVerdictText139(verified), '≈81/100 · Muy de tu estilo'); assert(!menuVerdictText139(verified).includes('estimación'));
});
test('A winery-only line is a range with its options; picking one fixes the row', () => {
  const match = { kind: 'range' as const, options: [far, near, mid] };
  const range = menuVerdict139(null, match, profile);
  assert(range.kind === 'range');
  const scores = [near, far, mid].map(score);
  assert.equal(range.low, Math.min(...scores)); assert.equal(range.high, Math.max(...scores)); assert(range.low < range.high);
  assert.deepEqual(range.options.map(option => option.score), [...scores].sort((a, b) => b - a), 'options from best to worst');
  assert.equal(menuVerdictText139(range), `entre ${range.low} y ${range.high} (según el vino de esta bodega)`);
  const picked = menuVerdict139(null, match, profile, 2);
  assert(picked.kind === 'estimate' && picked.chosen && picked.score === score(far) && /\(estimación\)$/.test(menuVerdictText139(picked)));
  assert.equal(menuVerdict139(null, match, profile, 999).kind, 'range', 'an unknown pick is ignored');
  const flat = menuVerdict139(null, { kind: 'range', options: [near, estimate(4, 'Roda Bis', [4, 3, 1, 3, 4])] }, profile);
  assert(flat.kind === 'range' && flat.low === flat.high && /estimación/.test(menuVerdictText139(flat)), 'equal scores still say estimate');
  assert.equal(storeOptionName139(near), 'Roda Reserva'); assert.equal(storeOptionName139(mid), 'Roda I');
});
test('Searching, not found and no profile are three different states', () => {
  assert.deepEqual(menuVerdict139(null, undefined, profile), { kind: 'loading' });
  assert.deepEqual(menuVerdict139(null, null, profile), { kind: 'none' });
  assert.deepEqual(menuVerdict139(null, { kind: 'exact', estimate: near }, null), { kind: 'pending' });
  assert.deepEqual(menuVerdict139(null, { kind: 'exact', estimate: near }, profile, null, false), { kind: 'pending' }, 'web and QA fixtures: no estimates');
  assert.equal(menuVerdictText139({ kind: 'none' }), 'No lo hemos encontrado en Winerim');
});
test('Order: score descending, verified and estimated together, a range by its upper bound, unmatched last', () => {
  const rows: Array<{ id: string; verdict: MenuVerdict139 }> = [
    { id: 'none', verdict: { kind: 'none' } }, { id: 'estimate70', verdict: { kind: 'estimate', score: 70, title: 't', estimate: near, chosen: false } },
    { id: 'loading', verdict: { kind: 'loading' } }, { id: 'range60-75', verdict: { kind: 'range', low: 60, high: 75, options: [] } },
    { id: 'verified90', verdict: { kind: 'verified', score: 90, title: 't' } }, { id: 'pending', verdict: { kind: 'pending' } },
    { id: 'verified70', verdict: { kind: 'verified', score: 70, title: 't' } }];
  assert.deepEqual(sortMenuVerdicts139(rows).map(row => row.id), ['verified90', 'range60-75', 'estimate70', 'verified70', 'loading', 'none', 'pending']);
  assert.equal(menuVerdictRank139({ kind: 'range', low: 10, high: 64, options: [] }), 64);
  assert.equal(rows[0].id, 'none', 'the input is not reordered');
});
test('A second photo appends; the same name and price is not repeated', () => {
  const first = [{ nombre: 'RODA – Tempranillo', precio: 55 }, { nombre: 'Luis Cañas', precio: 28 }];
  const merged = mergeMenuPages139(first, [{ nombre: 'roda - tempranillo', precio: 55 }, { nombre: 'Luis Cañas', precio: 32 }, { nombre: 'Marco Real – Syrah', precio: 24 }]);
  assert.deepEqual(merged.map(wine => `${wine.nombre}|${wine.precio}`), ['RODA – Tempranillo|55', 'Luis Cañas|28', 'Luis Cañas|32', 'Marco Real – Syrah|24']);
  assert.equal(merged[0], first[0], 'earlier rows keep their place');
  assert.notEqual(menuLineKey139({ nombre: 'Roda', productor: null, anada: null, tipo: 'tinto' }), menuLineKey139({ nombre: 'Roda', productor: 'Bodegas Roda', anada: null, tipo: 'tinto' }));
});
test('Coverage: no warning when the lines were read', () => {
  assert.equal(menuCoverageWarning139(19, 20), null); assert.equal(menuCoverageWarning139(19, null), null); assert.equal(menuCoverageWarning139(0, 0), null);
  assert.match(menuCoverageWarning139(5, 20) ?? '', /hemos leído 5 de unas 20 líneas/);
});
test('Scanner wiring: iOS only, estimates never saved or learned, clean results screen', () => {
  const menu = read('src/components/wine-import/WineMenuScanner.tsx'), helper = read('src/utils/menuEstimates139.ts');
  assert.match(menu, /const estimatesOn139 = isNative && !isMatchrimFixtureQaEnabled;/);
  assert.match(menu, /if \(!estimatesOn139 \|\| loading \|\| !profile139\) return;/);
  assert.match(menu, /estimateListing139\(\{ name: wine\.nombre, producer: wine\.productor, vintage: wine\.anada, type: wine\.tipo, grapes: wine\.uvas \}/);
  assert.match(menu, /const verdicts139 = useMemo\(\(\) => isNative \? scannedWines\.map\(verdict139\) : \[\]/);
  assert.match(menu, /if \(isNative && scanSortMode === 'compatibility'\) return sortMenuVerdicts139\(/);
  // The estimate lives in its own state: it is not written into the row that is saved, nor into the profile.
  const save = menu.slice(menu.indexOf('const saveScannedWine = async'), menu.indexOf('const saveWineToWishlist'));
  assert(save.length > 500 && !/139/.test(save.replace(/menuPages139/g, '')), 'saving a wine does not read any estimate');
  assert.match(save, /use_for_profile_training: false/);
  assert(!/setScannedWines\([^)]*estimate/.test(menu) && !/supabase|localStorage|user_wines/.test(helper));
  assert(!read('src/utils/storeListing139.ts').includes('supabase'));
  // Labels.
  assert.match(menu, /Estimación con los datos de la tienda de Winerim\./);
  assert.match(menu, /data-testid="native-menu-decision-estimate139">Es una estimación con los datos de la tienda de Winerim\./);
  assert.match(menu, /<NativeAffinitySummary result=\{storeAffinity139\(profile139, verdict\.estimate\.attributes\)\} \/>/);
  assert.match(menu, /<NativeWinePhoto98 src=\{row\.photo\}/);
  for (const text of ['El que más encaja contigo de esta carta', "'Vinos de la carta'", 'Con ficha de Winerim', 'Añadir otra página', 'Más opciones', 'Elegir el vino exacto',
    'Comprueba nombre y precio con la carta.', "'Leyendo la carta', 'Buscando los vinos en Winerim', 'Comparando con tus gustos'"]) assert(menu.includes(text), text);
  // Several pages append; the single-photo flow still replaces.
  assert.match(menu, /onChange=\{event => void handleFileSelect\(event, true\)\}/);
  assert.match(menu, /const append = addPage && isNative && scannedWines\.length > 0 && file\.type\.startsWith\('image\/'\);/);
  assert.match(menu, /if \(append\) setScannedWines\(current => mergeMenuPages139<ScannedWine>\(/);
  assert.match(menu, /if \(append\) setMenuPages139\(pages => pages \+ 1\);\s*else \{ resetSaveBatch\(\); resetEstimates139\(\); \}/);
  assert.match(menu, /else setScannedWines\(normalizedWines\);/);
  // Jargon is gone from the iOS screen: removed, or kept only in a web branch.
  assert(!menu.includes('Nombre leído por confirmar') && !/>Abrir \{/.test(menu) && !menu.includes('Ir a edición') && !menu.includes('Ver vinos ('));
  assert.match(menu, /\$\{isNative \? '' : ' · formato pendiente'\}/); assert.equal((menu.match(/formato pendiente/g) || []).length, 3);
  assert.match(menu, /\{wine\.productor \|\| \(isNative \? '' : 'Identidad parcial'\)\}/);
  assert.match(menu, /\{isNative \? 'Guardar o corregir un vino' : 'Ver fichas completas y acciones'\}/);
  assert.match(menu, /const nativeWarning = isNative \? menuCoverageWarning139\(normalizedWines\.length, expected\) : null;/);
  assert.match(menu, /\) : \(loading \|\| convertingPdf\) && isNative \? \(\s*<div className="space-y-4">\s*<ScanWaiting139 /);
  const more = menu.slice(menu.indexOf('data-testid="native-menu-more139"'));
  assert(/^[^]{0,400}Más opciones<\/summary>[^]{0,300}menuSheets139\}[^]{0,80}\{menuTools139\}[^]{0,80}\{menuReRead139\}/.test(more), 'tools live behind one closed «Más opciones»');
  assert.match(menu, /\{!isNative && menuTools139\}/); assert.match(menu, /isNative \? null : menuSheets139/);
  const list = menu.indexOf('data-testid="native-menu-row139"'), add = menu.indexOf('data-testid="native-menu-add-page139"'), decision = menu.indexOf('data-testid="native-menu-decision"');
  assert(decision > 0 && decision < list && list < add && add < menu.indexOf('data-testid="native-menu-more139"'), 'answer, list, add a page, then options');
});
console.log(`check-matchrim-menu139: ${groups}/7 groups passed`);
