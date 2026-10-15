import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { manualWineIdentityNotice } from '../src/utils/manualWineIdentityNotice';
import { confirmWineCandidateIdentity, correctWineCandidateIdentity, normalizeWineCandidates } from '../src/utils/multiWineScan';
import { ImagePreparationError } from '../src/utils/imageAnalysis';

const snapshot = '0c1a29728fb2f6b7f033b7d5e68bc8ea8e5335b1';
const localRelease = '89d478d6a391c4594fa09d815bb6546fb874231b';
const localPricePaths = new Set(['src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts']);
const localOnlyPaths = ['src/components/wine-import/MenuPriceEditor.tsx', 'src/utils/menuPriceReview.ts', 'src/utils/menuWineSimilarity.ts'];
const manifestPath = 'docs/MATCHRIM_CLOUD_SOURCE_MANIFEST_2026-10-13.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
assert.equal(readFileSync(manifestPath, 'utf8'), execFileSync('git', ['show', `${snapshot}:${manifestPath}`], { encoding: 'utf8' }));
assert.equal(manifest.localProductSourceCommit, '3e75f30abc79c6262f96b06515437aec1e728a90');
const hash = (data: Buffer) => createHash('sha256').update(data).digest('hex');
// Only these client lifetimes may change in this block; detector, scoring, catalog,
// corpus and hosted functions stay fingerprint protected. The original snapshot
// is checked for all paths even when a client lifetime is subsequently amended.
const allowedClientChanges = new Set(['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/imageAnalysis.ts', 'src/components/wine-import/WineMenuScanner.tsx', 'src/pages/Scan.tsx', 'src/components/wine-import/WineComparisonWorkspace.tsx']);
// Build 83 adds native keyboard/layout, quiz navigation and original-sheet provenance.
// Retain the historical snapshot proof and fingerprint every unaffected product file.
const build83Changes = new Set(['package-lock.json', 'capacitor.config.ts', 'src/App.tsx', 'src/main.tsx', 'src/index.css',
  'src/components/ui/button.tsx', 'src/components/AiRimConversation.tsx', 'src/components/QuizIntro.tsx',
  'src/components/QuizQuestion.tsx', 'src/pages/Matchrim.tsx', 'src/pages/MyWines.tsx', 'src/pages/UseMatchrim.tsx',
  'src/services/winerimApi.ts', 'src/utils/multiWineScan.ts', 'src/utils/scanProfile.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts']);
build83Changes.add('src/utils/matchrimLocalProfile.ts');
build83Changes.add('src/utils/matchrimLearning.ts');
build83Changes.add('src/utils/edgeFunctionResilience.ts');
build83Changes.add('src/components/wine-import/WineLabelOCRImport.tsx');
build83Changes.add('src/utils/wineAffinityExplanation.ts');
// Build84's explicitly requested native cellar/restaurant semantics. Historical
// source fingerprints and every unaffected module remain verified below.
const build84Changes = new Set(['src/components/MatchrimFunction.tsx', 'src/components/wine-import/FoodPairingScanner.tsx',
  'src/components/wine-import/WineSearchBar.tsx', 'src/pages/LiquidIntelligence.tsx', 'src/pages/Index.tsx',
  'src/pages/Profile.tsx', 'src/services/matchrimScanProfile.ts', 'src/utils/winerimLabelIdentity.ts',
  'src/utils/labelScanSave.ts', 'src/utils/matchrimEdgeRouting.ts', 'src/components/NativeAppHome.tsx']);
const build85LearningPath = 'supabase/functions/_shared/matchrim-learning.ts';
const build85Changes = new Set(['src/components/QuizResults.tsx']);
// QA88 repairs the video request lifetime and exposes the existing affinity
// evidence. Dedicated contract checks cover these explicitly reviewed clients.
const remediation88Changes = new Set(['src/components/AffinityExplanation.tsx',
  'src/components/CellarWineAffinity.tsx', 'src/components/SpecialMomentsFlow.tsx',
  'src/components/WineRecommendationCard.tsx', 'src/lib/aiRimStream.ts']);
// QA89 explicitly revises bounded continuation, typed vision/food errors and
// original-Library identity binding. Corpus, quiz, scorer and learner stay frozen.
const remediation89Changes = new Set(['src/utils/scanAnalysisPolicy.ts', 'src/utils/invokeEdgeFunction.ts',
  'src/utils/regionAnalysisError.ts', 'src/utils/winerimOriginalSheet.ts',
  'src/components/WinerimOriginalSheet.tsx', 'src/components/WinerimSheetLookup.tsx',
  'supabase/functions/detect-wine-regions/index.ts', 'supabase/functions/analyze-wine-region/index.ts',
  'supabase/functions/scan-food-pairing/index.ts', 'supabase/functions/scan-food-pairing/contract.ts',
  'supabase/functions/scan-wine-menu/index.ts',
  'supabase/functions/_shared/matchrim-ai-provider.ts']);
// QA90 changes only this parser's disclosure count, not schema, scores or data.
const qa90FoodDisclosure = 'src/utils/foodScanResponse.ts';
const qa90NativeNavigation = 'src/components/MobileBottomNav.tsx';
execFileSync(process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-native-type90.ts']);
const priorFoodResponse = execFileSync('git', ['show', `8f52291:${qa90FoodDisclosure}`], { encoding: 'utf8' });
const oldFoodSummary = 'summary: `${parsed.data.dishes.length} platos devueltos. La cobertura de la carta no está verificada.`,';
const newFoodSummary = 'summary: `${parsed.data.dishes.length} lecturas devueltas. La cobertura y disponibilidad no están verificadas.`,';
assert.equal(priorFoodResponse.split(oldFoodSummary).length, 2, 'Exactly one reviewed summary delta');
assert.equal(readFileSync(qa90FoodDisclosure, 'utf8'), priorFoodResponse.replace(oldFoodSummary, newFoodSummary),
  'QA90 retains the full food parser outside its explicit reading/availability disclosure');
const priorLearning = execFileSync('git', ['show', `598dda8:${build85LearningPath}`], { encoding: 'utf8' });
assert.equal(readFileSync(build85LearningPath, 'utf8'), priorLearning.replace(
  'if (numeric === null) return null;', 'if (numeric === null || numeric < 0) return null;'),
  'Only the negative-sensory guard changes the shared learner; formulas and weights remain identical');
let immutableCount = 0;
for (const row of manifest.productSourceFingerprints as Array<{ path: string; sha256: string }>) {
  assert.equal(hash(execFileSync('git', ['show', `${snapshot}:${row.path}`])), row.sha256, `Snapshot hash: ${row.path}`);
  if (!allowedClientChanges.has(row.path) && !build83Changes.has(row.path) && !build84Changes.has(row.path)
    && !build85Changes.has(row.path) && !remediation88Changes.has(row.path) && !remediation89Changes.has(row.path)
    && row.path !== build85LearningPath && row.path !== qa90FoodDisclosure && row.path !== qa90NativeNavigation && row.path !== 'package.json') {
    const expected = localPricePaths.has(row.path)
      ? hash(execFileSync('git', ['show', `${localRelease}:${row.path}`])) : row.sha256;
    assert.equal(hash(readFileSync(row.path)), expected, `Protected source: ${row.path}`);
    immutableCount += 1;
  }
}
for (const path of localOnlyPaths) {
  assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', `${localRelease}:${path}`], { encoding: 'utf8' }), `Published-beta price/style source retained: ${path}`);
}
const comparisonPath = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const stripLayoutClasses = (source: string) => source.replace(/className="[^"]*"/g, 'className="[layout]"');
assert.equal(stripLayoutClasses(readFileSync(comparisonPath, 'utf8')), stripLayoutClasses(execFileSync('git', ['show', `${snapshot}:${comparisonPath}`], { encoding: 'utf8' })), 'Comparator logic remains byte-identical outside static layout classes');
const cases = [undefined, null, NaN, Infinity, -1, 101, 0, 1, 82, 100];
for (const value of cases) {
  const valid = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
  assert.equal(manualWineIdentityNotice(value).includes('Afinidad pendiente'), !valid);
  assert.match(manualWineIdentityNotice(value), /Identidad revisada por ti/);
}
const payload = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-failure-2026-10-13/failure-before/scan-response-payloads.json', 'utf8'));
const candidate = normalizeWineCandidates(payload.analyze['region-2'], 'synthetic-contract')[0];
for (const affinity of [null, 0, 82]) {
  assert.equal(confirmWineCandidateIdentity({ ...candidate, affinity }).affinity, affinity);
  assert.equal(correctWineCandidateIdentity({ ...candidate, affinity }, { name: 'Synthetic correction' }).affinity, null);
}
for (const code of ['read', 'decode', 'prepare'] as const) {
  const error = new ImagePreparationError(code);
  assert.equal(error.code, code);
  assert.doesNotMatch(error.message, /backend|token|http|provider/i);
}
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
assert.equal(lock.packages['node_modules/@capacitor/keyboard'].version, '7.0.6');
const previousLock = JSON.parse(execFileSync('git', ['show', 'bda5241:package-lock.json'], { encoding: 'utf8' }));
const withoutKeyboard = structuredClone(lock);
delete withoutKeyboard.packages['node_modules/@capacitor/keyboard'];
delete withoutKeyboard.packages[''].dependencies['@capacitor/keyboard'];
assert.deepEqual(withoutKeyboard, previousLock, 'Only the official pinned keyboard plugin changes dependencies');
assert.equal(readFileSync('src/data/quizData.ts', 'utf8'), execFileSync('git', ['show', 'bda5241:src/data/quizData.ts'], { encoding: 'utf8' }), 'Quiz scoring and images unchanged from build 82');
assert.equal(lock.packages['node_modules/sonner'].version, '2.0.8');
assert.equal(lock.packages['node_modules/sonner'].integrity, 'sha512-UM/ByIoFra8yzV75n1o0Puu0bw5U/9UNnDacrJNspekBewIfsQ3D6ez1nvlWpt7aTsO6rujQtifBpycwIivqlg==');
assert.match(readFileSync('node_modules/sonner/dist/index.mjs', 'utf8'), /document\.removeEventListener\('visibilitychange', callback\)/);
console.log(JSON.stringify({ snapshot, localRelease, localPricePaths: [...localPricePaths], localOnlyPaths, build83Changes: [...build83Changes], remediation88Changes: [...remediation88Changes], remediation89Changes: [...remediation89Changes], productFingerprints: manifest.productSourceFingerprints.length, immutableCount, syntheticNumericCases: cases.length, scope: 'Original cloud snapshot plus explicit remediations and unchanged quiz calibration; no measured vision accuracy, humans or hosted data' }));
