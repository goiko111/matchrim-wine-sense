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
let immutableCount = 0;
for (const row of manifest.productSourceFingerprints as Array<{ path: string; sha256: string }>) {
  assert.equal(hash(execFileSync('git', ['show', `${snapshot}:${row.path}`])), row.sha256, `Snapshot hash: ${row.path}`);
  if (!allowedClientChanges.has(row.path) && row.path !== 'package.json') {
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
assert.equal(lock.packages['node_modules/sonner'].version, '2.0.8');
assert.equal(lock.packages['node_modules/sonner'].integrity, 'sha512-UM/ByIoFra8yzV75n1o0Puu0bw5U/9UNnDacrJNspekBewIfsQ3D6ez1nvlWpt7aTsO6rujQtifBpycwIivqlg==');
assert.match(readFileSync('node_modules/sonner/dist/index.mjs', 'utf8'), /document\.removeEventListener\('visibilitychange', callback\)/);
console.log(JSON.stringify({ snapshot, localRelease, localPricePaths: [...localPricePaths], localOnlyPaths, productFingerprints: manifest.productSourceFingerprints.length, immutableCount, syntheticNumericCases: cases.length, scope: 'Original cloud snapshot plus approved local beta price/style integrity; no vision, humans or hosted data' }));
