// 146: one camera for bottle and wine list, and the six adjustments from the owner's recording of 145. Offline.
// Run: npx tsx scripts/check-matchrim-ux146.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quickMenuLines145 } from '../src/utils/quickMenu145';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const line = (text: string, x: number, y: number, width: number) => ({ text, box: { x, y, width, height: 0.02 } });

test('One way in: the phone reads first and tells a bottle from a wine list', () => {
  const hub = read('src/components/NativeScanHub99.tsx');
  assert.match(hub, /<Entry title="Botella o carta"/); assert.match(hub, /label=\{`\$\{bottles\.title\} · Botellas y cartas · Una foto`\}/);
  assert.match(hub, /const more = options\.filter\(option => option\.id !== 'label'\);/, 'the list reader stays reachable under «Más formas»');
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /useState<'cloud' \| 'local-single'>\(\(\) => Capacitor\.isNativePlatform\(\) && localOCRAvailable106\(\) \? 'local-single' : 'cloud'\)/);
  assert.match(scanner, /looksLikeWineList144\(reading\.lines\)/);
  const home = read('src/components/NativeHome98.tsx');
  assert(home.includes("'Botella o carta'")); assert(!home.includes("'Una botella'"));
});

test('Saved from the bottle’s sheet, the scan closes', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /closeAfterSave146\.current = true; void confirmBatch\(\);/);
  assert.match(scanner, /if \(closeAfterSave146\.current\) \{ closeAfterSave146\.current = false; toast\.success\('Vino guardado en Por probar'\); resetAfterSave146\.current\?\.\(\); return; \}/);
});

test('Quick preview: no footer lines, a range instead of a dash', () => {
  const quick = quickMenuLines145([line('LUIS R. - Tempranillo', 0.1, 0.1, 0.3), line('16.00€', 0.85, 0.1, 0.08), line('RODA - Tempranillo', 0.1, 0.2, 0.3), line('55.00€', 0.85, 0.2, 0.08),
    line('MARCO REAL - Syrah', 0.1, 0.3, 0.3), line('IKILIEUS / @IKILI.DONOSTIA', 0.05, 0.9, 0.3), line('www.restaurante.es', 0.05, 0.94, 0.3), line('Tel 943 123 456', 0.05, 0.96, 0.3)]);
  assert.deepEqual(quick.map(item => item.text), ['LUIS R. - Tempranillo', 'RODA - Tempranillo', 'MARCO REAL - Syrah']);
  const preview = read('src/components/wine-import/MenuQuickPreview145.tsx');
  assert.match(preview, /match\?\.kind !== 'range'/); assert(!preview.includes('>—<'));
});

test('Small things: the heading while loading, plain recent scans, no worrying notice, larger badges', () => {
  assert.match(read('src/components/NativeHome98.tsx'), /\{hasProfile \|\| loading \? 'Para tu paladar' : 'Primero, tus gustos'\}/);
  const hub = read('src/components/NativeScanHub99.tsx'); assert.match(hub, /plain146\(item\.title\)/); assert.match(hub, /plainSubtitle146\(item\.subtitle\)/);
  assert(!read('src/components/wine-import/CandidateRecovery286.tsx').includes("? found.incomplete ? 'Algunas búsquedas"));
  assert.match(read('src/components/wine-import/WineMenuScanner.tsx'), /const badgeHeight = compact \? Math\.max\(17, /); // 147: sized by the printed text
});
console.log(`check-matchrim-ux146: ${groups}/4 groups passed`);
