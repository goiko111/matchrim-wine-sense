// 147: the profile in the wine sheet's visual language, 90 facts, tasted and at home at once, and what the owner's
// recording of 146 showed (a label's large name first, badges after each name, a cleaner quick preview). Offline.
// Run: npx tsx scripts/check-matchrim-ux147.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { promoteHeadline147, type Candidate286 } from '../src/utils/candidateRecognition286';
import { quickMenuLines145 } from '../src/utils/quickMenu145';
import { WINE_FACTS139 } from '../src/utils/wineFacts139';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');
const line = (text: string, x: number, y: number, width: number, height = 0.02) => ({ text, box: { x, y, width, height } });
const candidate = (id: number, name: string, winery: string, score: number) => ({ name, score, row: { id, name, winery } }) as unknown as Candidate286;

test('The label’s large name comes first, whatever the small print adds up to', () => {
  const ranked = [candidate(1, 'Finca Legardeta Finca de Villatuerta Garnacha', 'Chivite', 9), candidate(2, 'Chivite Las Fincas Villatuerta', 'Chivite', 7), candidate(3, 'La Zorrera', 'Chivite', 6)];
  const label = [line('Chivite', 0.3, 0.2, 0.4, 0.06), line('LA ZORRERA', 0.25, 0.4, 0.5, 0.05), line('VINO DE PARCELA DE LA FINCA LEGARDETA', 0.2, 0.5, 0.6, 0.015), line('GARNACHA 2015', 0.35, 0.6, 0.3, 0.02)];
  assert.deepEqual(promoteHeadline147(ranked, label).map(value => value.name), ['La Zorrera', 'Finca Legardeta Finca de Villatuerta Garnacha', 'Chivite Las Fincas Villatuerta']);
  // No large line that is a wine's whole name: the order stays.
  assert.deepEqual(promoteHeadline147(ranked, [line('Chivite', 0.3, 0.2, 0.4, 0.06), line('NAVARRA', 0.3, 0.4, 0.4, 0.05)]).map(value => value.row.id), [1, 2, 3]);
  assert.deepEqual(promoteHeadline147(ranked, []).map(value => value.row.id), [1, 2, 3]);
  assert.equal((read('src/utils/candidateRecognition286.ts').match(/promoteHeadline147\(rankCandidates286\(evidence, rows, vintage\), lines\)/g) || []).length, 3);
});

test('Quick preview: no section titles, no zone cut by the edge, no name cut by the next column; the nearest price', () => {
  const quick = quickMenuLines145([line('CAVAS, CHAMPAGNES Y ESPUMOSOS', 0.05, 0.05, 0.5), line('(EUSKA', 0.6, 0.08, 0.1), line('LALIER R-20', 0.05, 0.1, 0.2), line('50.00€', 0.4, 0.1, 0.06),
    line('MONTECIL', 0.9, 0.1, 0.1), line('ONDARRE MILENIUM - Chardonay', 0.05, 0.2, 0.3), line('25.00€', 0.4, 0.2, 0.06), line('70.00€', 0.8, 0.2, 0.06)]);
  assert.deepEqual(quick.map(item => [item.text, item.price]), [['LALIER R-20', 50], ['ONDARRE MILENIUM - Chardonay', 25]]);
  assert.match(read('src/components/wine-import/MenuQuickPreview145.tsx'), /tarda alrededor de medio minuto/);
});

test('Badges on the photo sit after each name, sized by the printed text', () => {
  const menu = read('src/components/wine-import/WineMenuScanner.tsx');
  assert.match(menu, /const compact = device !== null;/); assert.match(menu, /Math\.round\(textPx \* 1\.5\)/);
  assert.match(menu, /found\.nameEnd \+ 1\.5 \+ width/);
});

test('Profile: the wine sheet’s scales with the «Tú» mark; recommended wines are compact cards', () => {
  const profile = read('src/components/NativeProfileBody138.tsx');
  assert.match(profile, /const ends147: Record<string, \[string, string\]> = \{ potente: \['Ligero', 'Con cuerpo'\]/);
  assert.match(profile, /role="meter" aria-label=\{`\$\{row\.label\}: perfil actual`\}/); assert(!profile.includes('bg-red-950'));
  const card = read('src/components/WineCard.tsx');
  assert.match(card, /<details open=\{compact \? undefined : true\}/); assert.match(read('src/pages/Profile.tsx'), /compact=\{isNative\}/);
});

test('Ninety facts; a rated bottle at home keeps its place', () => {
  assert(WINE_FACTS139.length >= 90 && new Set(WINE_FACTS139).size === WINE_FACTS139.length);
  assert(WINE_FACTS139.every(fact => fact.length <= 140 && /[.!]$/.test(fact)));
  assert.match(read('src/components/NativeSaveChoice142.tsx'), /place === 'wishlist' \? null/);
});
console.log(`check-matchrim-ux147: ${groups}/5 groups passed`);
