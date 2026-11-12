// 148: aiRIM and restaurant mode in the wine sheet's visual language; Home's wines kept on the phone; the scan
// closes with its sheet; a wine list is recognised in «Varias botellas» too. Offline.
// Run: npx tsx scripts/check-matchrim-ux148.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('aiRIM: round bubbles with the mark, example cards; every handle and label kept', () => {
  const chat = read('src/components/NativeAiRimChat99.tsx');
  for (const keep of ['data-testid="native-airim-chat99"', 'data-testid="native-airim-messages99"', 'data-testid="airim-title139"', 'data-testid="airim-examples137"', 'data-testid="airim-consumer-context"',
    'aria-label="Enviar pregunta"', 'aria-label="Volver desde aiRIM"', 'aria-label="Consultas guiadas"', 'aria-label="Comida y vinos del restaurante"', 'Pregúntame lo que quieras sobre vino']) assert(chat.includes(keep), keep);
  assert.match(chat, /rounded-2xl rounded-br-md bg-red-900 text-white/); assert.match(chat, /grid grid-cols-2 gap-2/);
  assert(!/supabase|fetch\(|localStorage/.test(chat), 'presentation only');
});

test('Restaurant mode: pill steps and cards on iOS; the web keeps its layout', () => {
  const page = read('src/pages/Restaurant.tsx');
  assert.match(page, /className=\{native \? 'grid h-auto grid-cols-3 gap-1 rounded-full bg-stone-200\/70 p-1' : 'grid h-auto grid-cols-3 rounded-none border-b border-slate-200 bg-transparent p-0'\}/);
  assert.match(page, /className=\{native \? 'rounded-2xl border border-stone-200 bg-white p-4' : 'py-4'\}/);
  assert.match(page, /className=\{native \? 'rounded-2xl border border-stone-200 bg-white p-4' : 'py-5'\}/);
  for (const keep of ['data-testid="restaurant-next137"', 'data-testid="restaurant-filters137"', 'data-testid="restaurant-personal138"', "'1 · Platos'"]) assert(page.includes(keep), keep);
});

test('Home shows at once what it last showed this person', () => {
  const home = read('src/components/NativeAppHome.tsx');
  assert.match(home, /diskGet145<\{ wines: WinerimWineWithMatch\[\]; profile: typeof activeProfile \}>\(HOME_DISK148, homeKey148\)/);
  assert.match(home, /const homeKey148 = ownerId \?\? 'anonymous';/, 'kept per account');
  assert.match(home, /loading=\{waiting148 && !fromDisk148\}/); assert.match(home, /recommendations=\{shownWines148\} profile=\{shownProfile148\}/);
});

test('One bottle: the scan ends with its sheet; no flash of the old page while saving', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /const endsOnClose148 = isNative && regions\.length === 1 && phase === 'ready' && short140 && !saving && !confirmed && !closeAfterSave146\.current;/);
  assert.match(scanner, /onOpenChange=\{\(open\) => \{ if \(open\) return; setSelectedRegionId\(null\); if \(endsOnClose148\) resetScan\(\); \}\}/);
  assert.match(scanner, /setClosing148\(true\); void confirmBatch\(\)\.finally\(\(\) => setClosing148\(false\)\);/);
});

test('A wine list is recognised in «Varias botellas» as well, before anything is sent', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  const at = scanner.indexOf('const peek = await readLocalWineText106(prepared.dataUrl, controller.signal);'), detect = scanner.indexOf("setPhase('detecting');");
  assert(at > 0 && at < detect, 'the phone reads the photo before the detection request');
  assert.match(scanner.slice(at, detect), /looksLikeWineList144\(peek\.lines\)\) \{ handMenuPhoto144\(file\);/);
});
console.log(`check-matchrim-ux148: ${groups}/5 groups passed`);
