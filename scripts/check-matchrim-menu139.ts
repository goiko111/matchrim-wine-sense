// 139: the wine-list scanner answers «¿me gustará?» for every line it can (iOS): store estimates and winery ranges
// next to verified sheets, ordered by score, several photos in one list, a clean results screen.
// 140: shorter and more certain: a range settled by the list price («likely»), a printed grape that no wine of the
// winery has («mismatch»), ranges by midpoint below every certain answer, options closed and at most five.
// Offline, no network. Run: npx tsx scripts/check-matchrim-menu139.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { listedGrape140, menuCoverageWarning139, menuLikelyText140, menuLineKey139, menuRowName140, menuVerdict139, menuVerdictCertain140,
  menuVerdictRank139, menuVerdictScore140, menuVerdictText139, mergeMenuPages139, optionHasGrape140, shownMenuOptions140,
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
// 140: an option as the store read returns it: usual restaurant price, grapes (strings or nested lists) and photo.
const priced = (id: number, name: string, t: number[], typicalPrice: number | null, grapes: unknown[] = [], photo: string | null = null) => {
  const item = estimate(id, name, t) as { row: Record<string, unknown>; typicalPrice?: number | null };
  return { ...item, typicalPrice, row: { ...item.row, winery: 'Marco Real', grapes, photo } } as never;
};

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
  assert.equal(menuVerdictText139(range), `entre ${range.low} y ${range.high} · según cuál de sus vinos sea`);
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
test('Order: certain answers by score, then ranges by midpoint, then loading, then not found', () => {
  const likely: MenuVerdict139 = { kind: 'likely', score: 72, title: 't', estimate: near, options: [] };
  const rows: Array<{ id: string; verdict: MenuVerdict139 }> = [
    { id: 'none', verdict: { kind: 'none' } }, { id: 'estimate70', verdict: { kind: 'estimate', score: 70, title: 't', estimate: near, chosen: false } },
    { id: 'loading', verdict: { kind: 'loading' } }, { id: 'range64-79', verdict: { kind: 'range', low: 64, high: 79, options: [] } },
    { id: 'range70-76', verdict: { kind: 'range', low: 70, high: 76, options: [] } }, { id: 'mismatch', verdict: { kind: 'mismatch', grape: 'Syrah', options: [] } },
    { id: 'verified90', verdict: { kind: 'verified', score: 90, title: 't' } }, { id: 'pending', verdict: { kind: 'pending' } },
    { id: 'likely72', verdict: likely }, { id: 'verified70', verdict: { kind: 'verified', score: 70, title: 't' } }, { id: 'estimate40', verdict: { kind: 'estimate', score: 40, title: 't', estimate: far, chosen: true } }];
  // The owner's case: «entre 64 y 79» no longer sits above a certain ≈76, nor above any certain answer at all.
  assert.deepEqual(sortMenuVerdicts139(rows).map(row => row.id),
    ['verified90', 'likely72', 'estimate70', 'verified70', 'estimate40', 'range70-76', 'range64-79', 'loading', 'none', 'mismatch', 'pending']);
  assert(menuVerdictRank139({ kind: 'range', low: 64, high: 79, options: [] }) < menuVerdictRank139({ kind: 'verified', score: 1, title: 't' }));
  assert.equal(menuVerdictScore140({ kind: 'range', low: 64, high: 79, options: [] }), 71.5); assert.equal(menuVerdictScore140(likely), 72);
  assert.equal(menuVerdictScore140({ kind: 'mismatch', grape: 'Syrah', options: [] }), null); assert.equal(menuVerdictScore140({ kind: 'none' }), null);
  assert(menuVerdictCertain140(likely) && !menuVerdictCertain140({ kind: 'range', low: 1, high: 99, options: [] }) && !menuVerdictCertain140({ kind: 'mismatch', grape: 'Syrah', options: [] }));
  assert.equal(rows[0].id, 'none', 'the input is not reordered');
});
test('140 likely: the bottle price of the list settles a range; without a clear price it stays a range', () => {
  const crianza = priced(11, 'Montecillo Crianza', [4, 3, 1, 3, 4], 19, [], 'https://app.winerim.com/p.jpg'), reserva = priced(12, 'Montecillo Reserva', [5, 3, 1, 4, 4], 34),
    gran = priced(13, 'Montecillo Gran Reserva', [2, 5, 1, 1, 2], 58);
  const match = { kind: 'range' as const, options: [gran, reserva, crianza] };
  const likely = menuVerdict139(null, match, profile, null, true, { name: 'MONTECILLO', bottlePrice: 18 });
  assert(likely.kind === 'likely' && likely.estimate === crianza && likely.score === score(crianza));
  assert.deepEqual(likely.options.map(option => storeOptionName139(option.estimate)), ['Montecillo Reserva', 'Montecillo Gran Reserva'], 'the others, nearest price first');
  assert.equal(menuLikelyText140(likely), 'Probablemente Montecillo Crianza (por el precio)');
  assert.match(menuVerdictText139(likely), /^≈\d+\/100 · .+ · Probablemente Montecillo Crianza \(por el precio\)$/);
  assert.deepEqual(menuRowName140('MONTECILLO', likely), { name: 'Montecillo Crianza', listed: 'MONTECILLO' });
  assert.deepEqual(menuRowName140('MONTECILLO CRIANZA', likely), { name: 'Montecillo Crianza', listed: null }, 'same words: the list text is not repeated');
  assert.deepEqual(menuRowName140('MONTECILLO', { kind: 'range', low: 1, high: 2, options: [] }), { name: 'MONTECILLO', listed: null });
  // No price, a glass price (the scanner passes null) or a price between two wines: still a range, nearest price first.
  for (const bottlePrice of [null, undefined, 26]) {
    const range = menuVerdict139(null, match, profile, null, true, { name: 'MONTECILLO', bottlePrice });
    assert.equal(range.kind, 'range', String(bottlePrice));
  }
  const between = menuVerdict139(null, match, profile, null, true, { name: 'MONTECILLO', bottlePrice: 26 });
  assert(between.kind === 'range' && storeOptionName139(between.options[2].estimate) === 'Montecillo Gran Reserva' && between.low < between.high);
  // A hand pick wins over the price; the old call without a line behaves as before.
  const picked = menuVerdict139(null, match, profile, 13, true, { name: 'MONTECILLO', bottlePrice: 18 });
  assert(picked.kind === 'estimate' && picked.chosen && picked.estimate === gran);
  assert.equal(menuVerdict139(null, match, profile).kind, 'range');
});
test('140 grape: a printed grape discards other grapes; none left is a mismatch, not a list of unrelated wines', () => {
  const malbec = priced(21, 'Oyuc Malbec', [4, 3, 1, 3, 4], 20, [['Malbec']]), graciano = priced(22, 'Finca La Pared Graciano', [5, 3, 1, 4, 4], 24, ['Graciano']),
    crianza = priced(23, 'Colección Privada Crianza', [2, 5, 1, 1, 2], 18, [['Cabernet Sauvignon'], ['Graciano'], ['Merlot'], ['Tempranillo']]);
  const family = { kind: 'range' as const, options: [malbec, graciano, crianza] };
  const mismatch = menuVerdict139(null, family, profile, null, true, { name: 'MARCO REAL – Syrah', bottlePrice: 18 });
  assert(mismatch.kind === 'mismatch' && mismatch.grape === 'Syrah' && mismatch.options.length === 3, 'not even the price makes a Crianza a Syrah');
  assert.equal(menuVerdictText139(mismatch), 'No encontramos el Syrah de esta bodega en Winerim');
  assert.equal(menuVerdictRank139(mismatch), menuVerdictRank139({ kind: 'none' }), 'it is ordered as not found');
  const other = menuVerdict139(null, family, profile, 22, true, { name: 'MARCO REAL – Syrah', bottlePrice: 18 });
  assert(other.kind === 'estimate' && other.chosen && other.estimate === graciano, '«Ver otros vinos de la bodega» can still pick one');
  // Synonyms and accents: Shiraz is Syrah, Tinta de Toro / Tinto Fino are Tempranillo, Garnatxa is Garnacha.
  const shiraz = priced(24, 'Homenaje', [4, 3, 1, 3, 4], 15, ['Shiraz/Syrah', 'Moscatel']);
  const one = menuVerdict139(null, { kind: 'range', options: [malbec, shiraz, crianza] }, profile, null, true, { name: 'MARCO REAL – SYRAH' });
  assert(one.kind === 'estimate' && !one.chosen && one.estimate === shiraz, 'one wine of that grape left: it is the answer');
  assert.equal(optionHasGrape140(priced(25, 'X', [4, 3, 1, 3, 4], null, ['TINTA DE TORO']), 'X – Tempranillo'), true);
  assert.equal(optionHasGrape140(priced(26, 'X', [4, 3, 1, 3, 4], null, [['Tinto Fino']]), 'X - tempranillo'), true);
  assert.equal(optionHasGrape140(priced(27, 'X', [4, 3, 1, 3, 4], null, ['Garnatxa negra']), 'X – Garnacha'), true);
  assert.equal(optionHasGrape140(priced(28, 'X Mencía', [4, 3, 1, 3, 4], null), 'X – MENCIA'), true, 'the grape in the name counts');
  assert.equal(optionHasGrape140(priced(29, 'X', [4, 3, 1, 3, 4], null, ['Cabernet Franc']), 'X – Cabernet Sauvignon'), false);
  assert.equal(optionHasGrape140(priced(30, 'X', [4, 3, 1, 3, 4], null), 'X – Syrah'), null, 'no grape data: the store does not say');
  assert.equal(optionHasGrape140(malbec, 'MARCO REAL'), null); assert.equal(listedGrape140('MARCO REAL'), null); assert.equal(listedGrape140('BODEGA X – Shiraz 2021'), 'Shiraz');
  // A wine without grape data is kept (it may be the one); wines of the same grape all stay candidates.
  const unknown = priced(31, 'Marco Real Reserva', [5, 3, 1, 4, 4], 30);
  const kept = menuVerdict139(null, { kind: 'range', options: [malbec, unknown, shiraz] }, profile, null, true, { name: 'MARCO REAL – Syrah' });
  assert(kept.kind === 'range' && kept.options.length === 2 && !kept.options.some(option => option.estimate === malbec));
  assert.equal(menuVerdict139(null, family, profile, null, true, { name: 'MARCO REAL' }).kind, 'range', 'no grape printed: nothing is discarded');
});
test('140 compact ranges: at most five options, the likeliest price first', () => {
  const many = [40, 12, 90, 25, 60, 33, 18].map((price, index) => priced(40 + index, `Vino ${price}`, [4, 3, 1, 3, 4 - (index % 3)], price));
  const range = menuVerdict139(null, { kind: 'range', options: [...many, priced(50, 'Sin precio', [4, 3, 1, 3, 4], null)] }, profile, null, true, { name: 'BODEGA', bottlePrice: 29 });
  assert(range.kind === 'range' && range.options.length === 8, 'the range itself counts every wine');
  const shown = shownMenuOptions140(range.options);
  assert.deepEqual(shown.map(option => storeOptionName139(option.estimate)), ['Vino 33', 'Vino 25', 'Vino 40', 'Vino 18', 'Vino 60']);
  assert.equal(storeOptionName139(range.options[7].estimate), 'Sin precio', 'a wine without a usual price goes last');
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
  assert.match(menu, /picked139\.get\(key\), estimatesOn139,\s*\{ name: wine\.nombre, bottlePrice: menuBottlePrice140\(wine\) \}\);/);
  assert.match(menu, /if \(evidence\.service === 'glass' \|\| evidence\.service === 'both' \|\| typeof evidence\.prices\?\.glass === 'number'\) return null;/, 'a glass price never picks the wine');
  assert.match(menu, /const verdicts139 = useMemo\(\(\) => isNative \? scannedWines\.map\(verdict139\) : \[\]/);
  assert.match(menu, /if \(isNative && scanSortMode === 'compatibility'\) return sortMenuVerdicts139\(/);
  // The estimate lives in its own state: it is not written into the row that is saved, nor into the profile.
  const save = menu.slice(menu.indexOf('const saveScannedWine = async'), menu.indexOf('const saveWineToWishlist'));
  assert(save.length > 500 && !/139/.test(save.replace(/menuPages139/g, '')), 'saving a wine does not read any estimate');
  assert.match(save, /use_for_profile_training: false/);
  // 140: «Guardar en Por probar» in the wine's own sheet: same function and key; only Winerim's name and winery are passed.
  assert(!/verdict|\.estimate\b|storeAffinity|typicalPrice|winerim\?\.(?!nombre|productor)/.test(save), 'no store data reaches the saved row');
  assert.match(save, /name: winerim\?\.nombre \|\| wine\.nombre,\s*producer: winerim\?\.productor \|\| wine\.productor \|\| null,/);
  assert.match(save, /sensory_attributes: evidence\.sensory_attributes,/);
  const sheetSave = menu.slice(menu.indexOf('data-testid="native-menu-save140"') - 900, menu.indexOf('data-testid="native-menu-save140"') + 900);
  assert.match(sheetSave, /if \(!verdict \|\| !menuVerdictCertain140\(verdict\) \|\| isLiteralWineStyle95\(selectedPinWine\)\) return null;/);
  assert.match(sheetSave, /const saveKey = `wishlist-\$\{selectedPinWine\.nombre\}-\$\{selectedPinIndex\}`/);
  assert.match(sheetSave, /const winerim = verdict\.kind === 'verified' \? null : \{ nombre: storeOptionName139\(verdict\.estimate\), productor: verdict\.estimate\.row\.winery \};/);
  assert.match(sheetSave, /saveScannedWine\(selectedPinWine, selectedPinIndex, 'wishlist', false, winerim\)/);
  assert.match(sheetSave, /\{saved \? 'Guardado en Por probar' : 'Guardar en Por probar'\}/);
  assert(!/setScannedWines\([^)]*estimate/.test(menu) && !/supabase|localStorage|user_wines/.test(helper));
  assert(!read('src/utils/storeListing139.ts').includes('supabase'));
  // Labels.
  assert.match(menu, /Estimación con los datos de la tienda de Winerim\./);
  assert.match(menu, /data-testid="native-menu-decision-estimate139">Es una estimación con los datos de la tienda de Winerim\./);
  assert.match(menu, /<NativeAffinitySummary result=\{storeAffinity139\(profile139, verdict\.estimate\.attributes\)\} \/>/);
  assert.match(menu, /<NativeWinePhoto98 src=\{row\.photo\}/);
  for (const text of ['El que más encaja contigo de esta carta', "'Vinos de la carta'", 'Con ficha de Winerim', 'Añadir otra página', 'Más opciones', "'Elegir el vino'", '¿Es otro? Elegir', 'Ver otros vinos de la bodega', 'En la carta: {shown.listed}',
    'Comprueba nombre y precio con la carta.', "'Leyendo la carta', 'Buscando los vinos en Winerim', 'Comparando con tus gustos'"]) assert(menu.includes(text), text);
  // 140: the top pick prefers a certain answer; rows show Winerim's name and a 40×56 bottle; options are closed until asked.
  assert.match(menu, /\.sort\(\(a, b\) => Number\(menuVerdictCertain140\(b\.verdict!\)\) - Number\(menuVerdictCertain140\(a\.verdict!\)\) \|\| b\.score - a\.score\)/);
  assert.match(menu, /\{shownName140\(menuDecision\.best\.wine, menuDecision\.best\.verdict\)\.name\}/);
  assert.match(menu, /data-testid="native-menu-decision-likely140">Probablemente es este vino, por el precio de la carta\./);
  assert.match(menu, /\{photo && <NativeWinePhoto98 src=\{photo\} name=\{shown\.name\} className="h-\[56px\] w-\[40px\]/);
  assert.match(menu, /\{choosing && <div className="min-w-0 px-\[12px\] pb-3">\{renderChoices140\(wine, choices\)\}<\/div>\}/);
  assert.match(menu, /const \[openChoices140, setOpenChoices140\] = useState<Set<string>>\(new Set\(\)\);/);
  assert.match(menu, /\{shownMenuOptions140\(options\)\.map\(option => /);
  assert(!/<details[^>]*\bopen\b[^>]*>\s*<summary[^>]*>(\{label\}|Elegir)/.test(menu) && !menu.includes('renderRangePicker139'), 'no list of options is open by default');
  assert.match(menu, /data-testid="native-menu-mismatch140">/); assert.match(menu, /data-testid="native-menu-likely140">\{menuLikelyText140\(verdict\)\}/);
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
console.log(`check-matchrim-menu139: ${groups}/10 groups passed`);
