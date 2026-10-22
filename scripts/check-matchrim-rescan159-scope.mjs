import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreRescan159 } from './native-rescan159-scope.mjs';

const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const current = fs.readFileSync(file, 'utf8');
const before = execFileSync('git', ['show', '233442a:' + file], { encoding: 'utf8' });
assert.equal(restoreRescan159(file, current), before);
assert.equal(restoreRescan159(file, before), before);
let negatives = 0;
for (const [from, to] of [
  ['if (controller.signal.aborted) return;', 'if (false) return;'],
  ['user?.id ?? null, nativeVerdicts, selectedCandidate', 'null, nativeVerdicts, selectedCandidate'],
  ['personalRating={selectedPersonalVerdict}', 'personalRating="love"'],
  ["isNative ? await loadNativeScanContext159", "true ? await loadNativeScanContext159"],
  ['if (isNative) setNativeVerdicts', 'if (true) setNativeVerdicts'],
]) {
  const changed = current.replace(from, to); assert.notEqual(changed, current);
  assert.throws(() => restoreRescan159(file, changed)); negatives++;
}
assert.throws(() => restoreRescan159(file, current + '\n// unknown edit\n')); negatives++;
const comparison = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const workspace = fs.readFileSync(comparison, 'utf8');
assert.equal(restoreRescan159(comparison, workspace), execFileSync('git', ['show', '233442a:' + comparison], { encoding: 'utf8' }));
for (const [from, to] of [['isNative && wine.personalRating', 'true && wine.personalRating'],
  ["mode === 'personal'", "mode === 'service'"], ['No te recomiendo ninguno para ti.', 'Te recomiendo estos vinos.']]) {
  const changed = workspace.replace(from, to); assert.notEqual(changed, workspace);
  assert.throws(() => restoreRescan159(comparison, changed)); negatives++;
}
for (const path of ['src/services/matchrimScanProfile.ts', 'src/utils/scanProfile.ts',
  'src/utils/consumerAffinity95.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/bodegaAffinity.ts',
  'src/components/AffinityExplanation.tsx', 'src/components/wine-import/LabelAnalysisView.tsx',
  'src/index.css', 'supabase/functions/search-wines/index.ts']) {
  assert.equal(fs.readFileSync(path, 'utf8'), execFileSync('git', ['show', '233442a:' + path], { encoding: 'utf8' }), path);
}
const guard = fs.readFileSync('scripts/native-global103-scope.mjs', 'utf8');
assert.equal(guard.replace("import { restoreRescan159 } from './native-rescan159-scope.mjs';\n", '')
  .replace('  source = restoreRescan159(file, source);\n', ''),
execFileSync('git', ['show', '233442a:scripts/native-global103-scope.mjs'], { encoding: 'utf8' }));
assert.equal(fs.readFileSync('scripts/native-comparison-wrap142-scope.mjs', 'utf8')
  .replace("import { restoreRescan159 } from './native-rescan159-scope.mjs';\n", '')
  .replace('  source = restoreRescan159(file, source);\n', ''),
execFileSync('git', ['show', '233442a:scripts/native-comparison-wrap142-scope.mjs'], { encoding: 'utf8' }));
console.log(JSON.stringify({ exactPre159Scanner: true, unchangedMathProfileTrainingAndWebSources: 9,
  rejectedUnknownSourceMutations: negatives, oldAssertionsRemoved: 0, userWrites: 0, remoteCalls: 0 }));
