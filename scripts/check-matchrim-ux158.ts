// 158 (owner, 19-nov): save a wine from its own sheet when several bottles were scanned; say «try the back label»
// when the front label has almost no text; a guided tour of the whole app and first steps on Home.
// Offline. Run: npx tsx scripts/check-matchrim-ux158.ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { thinLabel158, usefulWords158 } from '../src/utils/thinLabel158';

let groups = 0;
const test = (name: string, fn: () => void) => { fn(); groups += 1; console.log(`  ok ${name}`); };
const read = (file: string) => fs.readFileSync(file, 'utf8');

test('A label with almost no words is thin; a normal one is not; no reading is not thin', () => {
  assert.equal(thinLabel158(['PSI']), true);
  assert.equal(thinLabel158(['2019', '75 cl', '14% vol']), true);
  assert.equal(thinLabel158(['N', 'IX']), true);
  assert.equal(thinLabel158([]), true);
  assert.equal(thinLabel158(['La Nine', 'Domaine Jean-Baptiste Sénat', 'Minervois 2023']), false);
  assert.equal(thinLabel158(['Chivite', 'La Zorrera']), false);
  assert.equal(thinLabel158(null), false);
  assert.equal(thinLabel158(undefined), false);
  assert.deepEqual(usefulWords158(['Vino de la Tierra', '2021', 'Vidure']), ['tierra', 'vidure']);
  assert(!/\(\?<[!=]/.test(read('src/utils/thinLabel158.ts')), 'no lookbehind (iOS 14-16.3)');
});

test('The candidates sheet says to try the back label only for a thin reading with nothing put forward', () => {
  const sheet = read('src/components/wine-import/CandidateRecovery286.tsx');
  assert.match(sheet, /const thin158 = Boolean\(reading\) && !typed\.trim\(\) && decision != null && decision\.mode !== 'one' && shown\.length === 0 && thinLabel158\(labelLines157\);/);
  assert.match(sheet, /\{!busy && !linking && thin158 && <div [^>]*data-testid="back-label158">/);
  assert(sheet.includes('Prueba con la contraetiqueta'));
  assert.match(sheet, /\{onRescan && <Button [^>]*onClick=\{onRescan\}[^>]*data-testid="back-label-rescan158">/);
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert(scanner.includes('onRescan={regions.length === 1 ? resetScan : undefined}'), 'a new photo is offered only when it loses no other bottle');
});

test('With several bottles a wine is saved from its own sheet and leaves the batch', () => {
  const scanner = read('src/components/wine-import/MultiWineLabelScanner.tsx');
  assert.match(scanner, /const saveMulti158 = isNative && Boolean\(user\) && regions\.length > 1 && phase === 'ready' && !confirmed && !saving && !batchLocked && !saveResults\.some\(Boolean\)/);
  assert.equal((scanner.match(/region\.status === 'recognized' && !savedOne158\[region\.id\]/g) ?? []).length, 2, 'both the button count and the batch itself skip a wine already saved');
  assert.match(scanner, /setSavedOne158\(current => \(\{ \.\.\.current, \.\.\.Object\.fromEntries\(ids\.map\(id => \[id, place\]\)\) \}\)\)/);
  assert.match(scanner, /setSavedOne158\(\{\}\);/, 'a new scan starts clean');
  assert(scanner.includes('data-testid="row-saved158"') && scanner.includes('data-testid="sheet-saved158"') && scanner.includes("data-testid={allSaved158 ? 'all-saved158' : undefined}"));
  // The single-bottle path is unchanged: its own save and close.
  assert.match(scanner, /saveChoice=\{saveSingle137 && user \? <NativeSaveChoice142 key=\{selectedCandidate\.id\}/);
});

test('The guide on the iPhone is six short screens, keeps «Saltar guía» and the first-run rule', () => {
  const guide = read('src/components/MatchrimQuickGuide.tsx');
  const tour = guide.slice(guide.indexOf('const tour158 = ['), guide.indexOf('] as const;'));
  assert.equal((tour.match(/title: '/g) ?? []).length, 6);
  for (const title of ['¿Me va a gustar este vino?', 'Empieza por el test', 'Haz una foto', 'Entiende la nota', 'Guarda y valora', 'En el restaurante']) assert(tour.includes(`title: '${title}'`), title);
  for (const text of [...tour.matchAll(/text: '([^']+)'/g)].map(match => match[1])) assert(text.length <= 190, `short: ${text.slice(0, 30)}`);
  assert(guide.includes('>Saltar guía</Button>'), 'native QA closes the guide by this name');
  assert(guide.includes('setOpen(shouldShowMatchrimOnboarding(existing, ownerId));'));
  assert(guide.includes("complete(native158 ? (hasProfile ? '/escanear/etiqueta' : '/matchrim') : target)"));
  assert(!/regiones|señales/.test(tour), 'no jargon');
});

test('Home keeps first steps until they are done, each with what it is for', () => {
  const card = read('src/components/NativeFirstSteps158.tsx'), home = read('src/components/NativeAppHome.tsx');
  assert(home.includes('guideReady158={onboardingReady && !loadingCode} hasSaved158={hasSavedWines}'));
  assert(read('src/utils/intent159.ts').includes("title: 'Escanea tu primer vino'"), '159: the scan step takes its words from what the person came for');
  for (const title of ['Haz el test de paladar', 'Guarda un vino', 'Valora uno que hayas probado']) assert(card.includes(`title: '${title}'`), title);
  assert(card.includes('if (off || left === 0) return null;'));
  const native = read('src/components/NativeHome98.tsx');
  assert.match(native, /<NativeFirstSteps158 [^>]*hasQuiz=\{hasProfile\}/);
  assert.match(native, /<MatchrimQuickGuide [^>]*ready=\{guideReady158\} hasProfile=\{hasProfile\}/);
  assert(native.indexOf('<MatchrimQuickGuide ') < native.indexOf('<NativeFirstSteps158 '));
  assert.equal((home.match(/<MatchrimQuickGuide /g) ?? []).length, 1, 'the old Home keeps its own single guide');
});

console.log(`check-matchrim-ux158: ${groups}/5 groups`);
