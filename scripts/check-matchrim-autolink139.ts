// 139: a clear bottle label links by itself on iOS instead of asking the person to pick from ten wines of the
// winery (real-device finding of 11-nov: «Pago de Cirsus · VIDURE · Cabernet Sauvignon · 2020»). This checks the
// pure decision (src/utils/autoLink139.ts) and how the candidate list and the scanner are wired to it.
// Offline, no network, no simulator. Run: npx tsx scripts/check-matchrim-autolink139.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { autoLink139, isClearLabel139, labelVintage139, SCAN_STEPS139 } from '../src/utils/autoLink139';
import { rankCandidates286 } from '../src/utils/candidateRecognition286';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const row = (id: number, name: string, winery: string, vintage: string | null = null, type = 'tinto') => ({ id, name, winery, slugname: `w-${id}`,
  vintage, subname: null, type, region: 'Navarra', country: 'ES', photo: null }) as never;
const cand = (name: string, winery: string, vintage: string | null = null, extra: object = {}) => ({ name, row: { winery, vintage }, ...extra });
const vidure = ['Pago de Cirsus', 'VIDURE', 'Cabernet Sauvignon', '2020'];
// Ten wines of the winery, as the owner saw them; only one is named on the label.
const cirsus = ['Vidure', 'Chardonnay Fermentado en Barrica', 'Selección de Familia', 'Opus 11', 'Cuvée Especial', 'Vendimia Seleccionada',
  'Moscatel Vendimia Tardía', 'Oak Aged', 'Rosado Gran Cuvée', 'Senda de los Olivos'].map(name => cand(name, 'Pago de Cirsus'));
const link = (text: string[], candidates: ReturnType<typeof cand>[], vintage: number | null = null, source: Parameters<typeof autoLink139>[0]['source'] = 'fresh-read') =>
  autoLink139({ source, text, candidates, vintage });

test('The Vidure label links by itself: name and winery are both in the text and no other wine is', () => {
  assert.equal(link(vidure, cirsus, 2020)?.name, 'Vidure');
  assert.equal(link(['PAGO DE CIRSUS', 'Vidüre'], cirsus)?.name, 'Vidure', 'accents and case do not matter');
  assert.equal(link(vidure, [cand('Vidure', 'Bodegas Pago de Cirsus, S.L.')], 2020)?.name, 'Vidure', 'the legal form is not asked of the label');
  assert.equal(link(vidure, [cand('Vidure', 'Pago de Cirsus', '2020')], 2020)?.name, 'Vidure', 'the sheet of the same harvest');
  // The real ranking (286) feeds it: one entry per wine, with its conflicts.
  const ranked = rankCandidates286(vidure, [row(1, 'Vidure', 'Pago de Cirsus', '2020'), row(2, 'Vidure', 'Pago de Cirsus', '2019'),
    row(3, 'Opus 11', 'Pago de Cirsus'), row(4, 'Senda de los Olivos', 'Pago de Cirsus')], 2020);
  const picked = autoLink139({ source: 'fresh-read', text: vidure, candidates: ranked, vintage: 2020 });
  assert.equal(picked?.row.id, 1);
});
test('Zero or several clear candidates keep the manual list', () => {
  assert.equal(link(['Pago de Cirsus', 'Cabernet Sauvignon', '2020'], cirsus, 2020), null, 'only the winery was read');
  assert.equal(link(['VIDURE', '2020'], cirsus, 2020), null, 'the winery was not read');
  assert.equal(link(['Pago de Cirsus', 'VIDURE', 'OPUS 11'], cirsus), null, 'two wines of the list are in the text');
  assert.equal(link(vidure, [cand('Vidure', 'Pago de Cirsus'), cand('Vidure Cabernet Sauvignon', 'Pago de Cirsus')]), null, 'two names fit the same text');
  assert.equal(link(['Pago de Cirsus', 'VIDUR'], cirsus), null, 'whole words only: a misread is not a clear label');
  assert.equal(link(['Pago de Cirsus', 'VIDURES'], cirsus), null);
  assert.equal(link([], cirsus), null);
});
test('Only the automatic search of a fresh reading links; typed searches and manual corrections never do', () => {
  assert.equal(link(vidure, cirsus, 2020, 'typed-search'), null);
  assert.equal(link(vidure, cirsus, 2020, 'manual-correction'), null);
  const list = read('src/components/wine-import/CandidateRecovery286.tsx'), scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(list, /autoLink \? autoLink139\(\{ source: manualQuery \? 'typed-search' : candidate\.source === 'manual' \? 'manual-correction' : 'fresh-read'/);
  assert.match(list, /autoLink = false/, 'off unless the scanner asks for it');
  assert.match(list, /if \(auto\) \{ await choose\(auto\.picked, auto\.resume\); setLinking\(false\); \}/, 'the tap and the automatic link share choose()');
  assert.equal(list.match(/resolveMasterCandidate259\(/g)?.length, 1, 'no second lookup path');
  assert.match(list, /!autoStarted\.current && !resume\)/, '«Cambiar» reopens the found list without searching again');
  // The list only exists for an unidentified local label; a corrected identity (source manual) never mounts it.
  assert.match(scanner, /fallback=\{localBatch && selectedCandidate\.source !== 'manual' && isPendingLocalIdentity109\(selectedCandidate\)\s*\? <CandidateRecovery286/);
  assert.match(scanner, /autoLink=\{isNative && manualList139\?\.candidate !== selectedCandidate\}/, 'iOS only, and not after «Cambiar»');
  assert.equal(scanner.match(/setAutoLinked139\(|setManualList139\(/g)?.length, 3, 'set only when linking and on «Cambiar»: the scan, reset and re-read paths stay as they were');
  assert.match(scanner, /¿No es este\? Cambiar/);
  assert.match(scanner, /autoLinked139\.linked === selectedCandidate/, 'the way back is offered only for the wine that was linked automatically');
});
test('Short or generic names, and a name that only repeats the winery, never link by themselves', () => {
  assert.equal(link(['Bodegas Uno', 'UNO'], [cand('Uno', 'Bodegas Alfa')]), null);
  assert.equal(link(['Toro Albalá', 'PX', '1990'], [cand('PX', 'Toro Albalá')], 1990), null, 'fewer than four letters');
  assert.equal(link(['Pago de Cirsus', 'Cabernet Sauvignon'], [cand('Cabernet Sauvignon', 'Pago de Cirsus')]), null, 'a grape is not a name');
  assert.equal(link(['Pago de Cirsus', 'Tinto', 'Crianza'], [cand('Tinto Crianza', 'Pago de Cirsus')]), null, 'style words are not a name');
  assert.equal(link(['Pago de Cirsus', 'Navarra'], [cand('Pago de Cirsus', 'Pago de Cirsus')]), null, 'the winery read twice is not a wine');
  assert(isClearLabel139(['Tinto Pesquera', 'CRIANZA'], cand('Pesquera Crianza', 'Tinto Pesquera')), 'a style word may complete a real name');
  assert(!isClearLabel139(['Tinto Pesquera', 'CRIANZA'], cand('Pesquera Reserva', 'Tinto Pesquera')));
  assert.equal(link(['Tinto Pesquera', 'CRIANZA'], ['Crianza', 'Reserva', 'Gran Reserva'].map(style => cand(`Pesquera ${style}`, 'Tinto Pesquera')))?.name, 'Pesquera Crianza');
});
test('A contradiction or another harvest needs the person', () => {
  assert.equal(link(vidure, [cand('Vidure', 'Pago de Cirsus', null, { conflicts: ['qualifier'] })], 2020), null);
  assert.equal(link(vidure, [cand('Vidure', 'Pago de Cirsus', '2019', { vintageConflict: true })], 2020), null);
  assert.equal(link(vidure, [cand('Vidure', 'Pago de Cirsus', '2019')], 2020), null, 'the sheet is of another harvest');
  assert.equal(link(['Pago de Cirsus', 'VIDURE'], [cand('Vidure', 'Pago de Cirsus', '2021')], null), null, 'no year read: the sheet\'s year would be invented');
  assert.equal(link(['Pago de Cirsus', 'VIDURE'], [cand('Vidure', 'Pago de Cirsus')], null)?.name, 'Vidure', 'a sheet without harvest claims none');
});
test('Vintage: taken only when the label supports exactly one', () => {
  const lines = (...text: string[]) => text.map(value => ({ text: value }));
  assert.equal(labelVintage139(lines(...vidure)), 2020);
  assert.equal(labelVintage139(lines('Pago de Cirsus', 'VIDURE')), null);
  assert.equal(labelVintage139(lines('VIDURE 2020', 'Reserva 2018')), null, 'two possible years: none is invented');
  assert.equal(labelVintage139(lines('VIDURE 2020', 'Desde 1998')), 2020, 'a foundation date is not a harvest');
  assert.equal(labelVintage139(lines('VIDURE 2020', 'Embotellado en 2022')), 2020, 'nor a bottling date');
  assert.equal(labelVintage139(lines('VIDURE', 'Medalla de Oro 2021')), null, 'nor a medal');
  assert.equal(labelVintage139(lines('Cosecha 2020', 'Lote 2023')), 2020, 'several years: only the one marked as harvest');
  assert.equal(labelVintage139(lines('Cosecha 2020', 'Vendimia 2019')), null);
  assert.equal(labelVintage139(lines(`VIDURE ${new Date().getUTCFullYear() + 1}`)), null, 'not a year in the future');
  assert.equal(labelVintage139(lines('VIDURE 1850', 'L20201')), null, 'not 19xx/20xx');
  const list = read('src/components/wine-import/CandidateRecovery286.tsx');
  assert.match(list, /if \(lines\.length\) year = labelVintage139\(lines\);/);
  assert.match(list, /const bottle = auto \? auto\.vintage : vintage;/, 'the automatic link carries the year of its own search');
  assert.match(list, /vintage: picked\.row\.vintage == null \? bottle : Number\(picked\.row\.vintage\)/);
});
test('The wait names its steps with «Cancelar» visible, and the jargon is gone on iOS', () => {
  const list = read('src/components/wine-import/CandidateRecovery286.tsx'), scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.deepEqual([...SCAN_STEPS139], ['Leyendo la etiqueta', 'Buscando el vino en Winerim', 'Comparando con tus gustos']);
  assert.match(list, /<ScanWaiting139 steps=\{SCAN_STEPS139\} current=\{step\} \/>\s*<Button[^>]*onClick=\{\(\) => \{\s*pending\.current\?\.abort\(\);[^}]*\}\}><X[^>]*\/> Cancelar<\/Button>/);
  assert.equal(scanner.match(/<ScanWaiting139 steps=\{SCAN_STEPS139\} current=\{waitStep139\} \/>/g)?.length, 2, 'before and after the preview, local and AI mode');
  assert.match(scanner, /<ScanWaiting139 steps=\{SCAN_STEPS139\} current=\{waitStep139\} \/>\s*<Button[^>]*onClick=\{cancelScan\}><X[^>]*\/> Cancelar<\/Button>/);
  assert.match(scanner, /\{loading && \(\s*<Button type="button" variant="outline" className="matchrim-pressable min-h-11 gap-2 bg-white" onClick=\{cancelScan\}>/, 'the header keeps its «Cancelar»');
  assert(!scanner.includes('Leyendo en este iPhone'));
  assert(!/Lectura parcial: compara la etiqueta|Esta ficha no confirma la cosecha de tu botella/.test(list.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')));
  assert.match(list, /decision\?\.mode === 'choose' && <p[^>]*>Elige el que coincide con tu botella\.<\/p>/);
  assert.match(scanner, /isNative \? isMatchrimFixtureQaEnabled && <details data-testid="native-scan-diagnostics">/, 'megapixels and region counts are QA data on iOS');
  assert.match(scanner, /quality\?\.warnings\.length && \(!isNative \|\| noWineRead139\) \?/, '«Calidad con avisos» only when no wine came out');
  // The native gate (scripts/MatchrimOffline220.swift) drives this screen by these labels.
  for (const label of ['Una etiqueta', 'Ver si me gustará', 'Guardar este vino en Por probar', 'Reanalizar', 'Cerrar']) assert(scanner.includes(label), label);
  assert(read('src/components/wine-import/LabelAnalysisView.tsx').includes('aria-label="Corregir identificación"'));
});
console.log(`check-matchrim-autolink139: ${groups}/7 groups passed`);
if (groups !== 7) process.exit(1);
