// 145: speed (the owner's recording of 144: 8-55 s for everything) and what else it showed. Offline.
// Run: npx tsx scripts/check-matchrim-ux145.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { labelLines145, shortNames145 } from '../src/utils/scanKind144';
import { quickMenuLines145 } from '../src/utils/quickMenu145';
import { diskGet145, diskSet145 } from '../src/utils/storeDiskCache145';
import { searchCandidates286 } from '../src/utils/candidateRecognition286';

let groups = 0;
const test = async (name: string, fn: () => void | Promise<void>) => { await fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
const line = (text: string, x: number, y: number, width: number, height = 0.02) => ({ text, box: { x, y, width, height } });

await test('The queries of one stage go to Winerim together, and the result is the same', async () => {
  let running = 0, most = 0; const asked: string[] = [];
  const search = async (query: string) => { asked.push(query); running += 1; most = Math.max(most, running); await new Promise(resolve => setTimeout(resolve, 20)); running -= 1; return { status: 'complete', rows: [] }; };
  const found = await searchCandidates286(['PINGUS RIBERA', 'CARRAOVEJAS RESERVA', 'MALLEOLUS'], ['pingus ribera', 'carraovejas reserva'], null, search);
  assert(most >= 2, `queries ran one at a time (${most})`); assert.deepEqual(found.searched.slice(0, 2), ['pingus ribera', 'carraovejas reserva']);
  assert.equal(found.decision.mode, 'none');
  assert.match(read('src/utils/nativeGlobalCatalogue103.ts'), /const pages = await Promise\.allSettled\(numbers\.map\(number => read\(/);
});

await test('What Winerim already answered is kept on the phone for a week, newest first', () => {
  diskSet145('t', 'a', [1], 2, 1000); diskSet145('t', 'b', [2], 2, 2000); diskSet145('t', 'c', [3], 2, 3000);
  assert.equal(diskGet145('t', 'a', 3000), null, 'only the latest entries stay'); assert.deepEqual(diskGet145('t', 'c', 3000), [3]);
  assert.equal(diskGet145('t', 'c', 3000 + 8 * 24 * 60 * 60 * 1000), null, 'a week at most');
  assert.match(read('src/utils/storeListing139.ts'), /diskGet145<StoreRow140\[\]>\(STORE_SEARCH_DISK145, id\)/);
  const detail = read('src/utils/winerimDetail142.ts'); assert.match(detail, /diskGet145<unknown>\(DETAIL_DISK145, key\)/);
  assert(!/diskSet145\([^)]*prices/.test(detail), 'prices and stock are not kept');
});

await test('The label, not the wine list behind the bottle', () => {
  const photo = [line('Psi 2023', 0.31, 0.32, 0.11), line('Ribera del Duero. Denominación de Origen', 0.31, 0.66, 0.34),
    line('NATE 234 – Chardonnay, Gewurztraminer', 0.68, 0.70, 0.32), line('LA JEFA – Malvasía', 0.68, 0.77, 0.17), line('FINCA DE LA MOTA', 0.68, 0.79, 0.16), line('OSSIAN – Verdejo', 0.68, 0.76, 0.15)];
  assert.deepEqual(labelLines145(photo).map(item => item.text), ['Psi 2023', 'Ribera del Duero. Denominación de Origen']);
  const closeUp = [line('RAMÓN BILBAO', 0.2, 0.3, 0.6), line('CRIANZA', 0.35, 0.4, 0.3), line('2019', 0.45, 0.5, 0.1), line('RIOJA', 0.4, 0.6, 0.2)];
  assert.equal(labelLines145(closeUp).length, 4);
  assert.deepEqual(shortNames145(['Ψ Psi 2023', 'Ribera del Duero. Denominación de Origen']), ['Psi']);
  assert.deepEqual(shortNames145(['14% vol', 'DOC', 'RAMÓN BILBAO']), []);
  const list = read('src/components/wine-import/CandidateRecovery286.tsx');
  assert.match(list, /const lines = labelLines145\(reading\?\.lines \?\? \[\]\);/); assert.match(list, /shortNames145\(lines\.map\(line => line\.text\)\)/);
});

await test('The wines the phone already reads are shown while the server reads the list', () => {
  const page = [line('TINTOS', 0.1, 0.10, 0.2), line('(RIOJA)', 0.1, 0.14, 0.1), line('LUIS R. – Tempranillo', 0.1, 0.16, 0.3), line('16.00€', 0.85, 0.16, 0.08),
    line('MONTECILLO – Tempranillo', 0.1, 0.18, 0.35), line('18.00€', 0.85, 0.18, 0.08), line('MARCO REAL – Syrah 25,00 €', 0.1, 0.30, 0.6), line('22.00€', 0.85, 0.40, 0.08)];
  const quick = quickMenuLines145(page);
  assert.deepEqual(quick.map(item => [item.text, item.price]), [['LUIS R. – Tempranillo', 16], ['MONTECILLO – Tempranillo', 18], ['MARCO REAL – Syrah', 25]]);
  const preview = read('src/components/wine-import/MenuQuickPreview145.tsx');
  assert.match(preview, /readPageLines143\(image\)/); assert(!/supabase|invokeEdgeFunction|localStorage/.test(preview), 'on the phone; nothing saved');
  assert.match(read('src/components/wine-import/WineMenuScanner.tsx'), /<MenuQuickPreview145 file=\{lastScanInputRef\.current\?\.file\} profile=\{profile139\} \/>/);
});

await test('One number per line on a tight list; no range pills on the photo', () => {
  const menu = read('src/components/wine-import/WineMenuScanner.tsx');
  assert.match(menu, /const compact = device !== null;/); // 147: whenever the phone placed the lines
  assert.match(menu, /const badge = verdicts139\[index\]\?\.kind === 'range' \? null : menuBadge141\(verdicts139\[index\]\);/);
});

await test('A wine the person already has moves instead of being saved twice; the scan sheet has the three choices', () => {
  const save = read('src/components/NativeSaveChoice142.tsx');
  assert.match(save, /if \(had\) \{[\s\S]{0,900}supabase\.from\('user_wines'\)\.update\(change\)/);
  // 146: at home and tasted at once: a bottle at home that is rated keeps its place.
  assert.match(save, /place === 'tasted' \? had\.status === 'collection' \? \(rating \? \{ rating \} : null\)/);
  assert.match(read('src/components/wine-import/MultiWineLabelScanner.tsx'), /saveChoice=\{saveSingle137 && user \? <NativeSaveChoice142/);
  assert(read('src/components/wine-import/LabelAnalysisView.tsx').includes('data-testid="scan-save-choice145"'));
});
console.log(`check-matchrim-ux145: ${groups}/6 groups passed`);
