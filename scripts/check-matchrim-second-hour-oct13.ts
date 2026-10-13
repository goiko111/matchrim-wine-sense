import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { manualWineIdentityNotice } from '../src/utils/manualWineIdentityNotice';
import { confirmWineCandidateIdentity, correctWineCandidateIdentity, normalizeWineCandidates } from '../src/utils/multiWineScan';
import { ImagePreparationError } from '../src/utils/imageAnalysis';

const output = process.argv[2];
if (!output) throw Error('Pass local second-hour checks output');
// This historical gate compares against a Mac-only Git object. The cloud
// snapshot deliberately does not contain it; absence is a blocked prerequisite,
// never an application failure and never a green historical rerun.
try { execFileSync('git', ['cat-file', '-e', '3ad38f28badb59c03a1217c0ed1deb1a1581421a^{commit}'], { stdio: 'ignore' }); }
catch {
  writeFileSync(output, JSON.stringify({ status: 'blocked-prerequisite', requiredCommit: '3ad38f28badb59c03a1217c0ed1deb1a1581421a', scope: 'Historical second-hour gate not executed; use npm run test:cloud for the transferred snapshot' }, null, 2) + '\n');
  console.error('Historical second-hour gate blocked: required local commit is not in this snapshot.');
  process.exit(2);
}

const checks: Array<{ name: string; passed: boolean; error?: string }> = [];
const check = (name: string, run: () => unknown) => {
  try { run(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: String(error) }); }
};
for (const affinity of [undefined, null, NaN, Infinity, -1, 101]) check('No valid affinity remains pending: ' + String(affinity), () => {
  assert.match(manualWineIdentityNotice(affinity), /Afinidad pendiente/);
  assert.match(manualWineIdentityNotice(affinity), /Identidad revisada por ti/);
  assert.doesNotMatch(manualWineIdentityNotice(affinity), /introducida|100%/);
});
for (const affinity of [0, 1, 82, 100]) check('Existing finite affinity is preserved, not pending: ' + affinity, () => {
  assert.match(manualWineIdentityNotice(affinity), /conserva los datos previos/);
  assert.match(manualWineIdentityNotice(affinity), /no recalcula/);
  assert.doesNotMatch(manualWineIdentityNotice(affinity), /Afinidad pendiente|introducida/);
});
const fixture = JSON.parse(readFileSync('docs/qa-evidence/matchrim-region-failure-2026-10-13/failure-before/scan-response-payloads.json', 'utf8'));
const original = normalizeWineCandidates(fixture.analyze['region-2'], 'qa-region')[0];
for (const affinity of [null, 0, 82]) check('Confirmation retains synthetic prior affinity and describes it truthfully: ' + affinity, () => {
  const confirmed = confirmWineCandidateIdentity({ ...original, affinity });
  assert.equal(confirmed.affinity, affinity);
  assert.equal(confirmed.source, 'manual');
  assert.equal(manualWineIdentityNotice(confirmed.affinity).includes('Afinidad pendiente'), affinity === null);
});
check('Correction clears prior score and notice becomes pending', () => {
  const corrected = correctWineCandidateIdentity({ ...original, affinity: 82 }, { name: 'Synthetic correction' });
  assert.equal(corrected.affinity, null);
  assert.match(manualWineIdentityNotice(corrected.affinity), /Afinidad pendiente/);
});
const baseline = '3ad38f28badb59c03a1217c0ed1deb1a1581421a';
for (const code of ['read', 'decode', 'prepare'] as const) check('Typed local image error: ' + code, () => {
  const error = new ImagePreparationError(code);
  assert.ok(error instanceof Error); assert.equal(error.code, code); assert.equal(error.name, 'ImagePreparationError');
  assert.doesNotMatch(error.message, /backend|token|http|provider/i);
});
check('Dependency lock changes only Sonner, with exact publication integrity', () => {
  const before = JSON.parse(execFileSync('git', ['show', baseline + ':package-lock.json'], { encoding: 'utf8' }));
  const after = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  assert.equal(after.packages[''].dependencies.sonner, '2.0.8');
  assert.equal(after.packages['node_modules/sonner'].version, '2.0.8');
  assert.equal(after.packages['node_modules/sonner'].integrity, 'sha512-UM/ByIoFra8yzV75n1o0Puu0bw5U/9UNnDacrJNspekBewIfsQ3D6ez1nvlWpt7aTsO6rujQtifBpycwIivqlg==');
  delete before.packages['node_modules/sonner']; delete after.packages['node_modules/sonner'];
  delete before.packages[''].dependencies.sonner; delete after.packages[''].dependencies.sonner;
  assert.deepEqual(after, before);
});
check('Installed document listener cleanup uses matching target', () => {
  const source = readFileSync('node_modules/sonner/dist/index.mjs', 'utf8');
  assert.match(source, /document\.removeEventListener\('visibilitychange', callback\)/);
  assert.doesNotMatch(source, /window\.removeEventListener\('visibilitychange', callback\)/);
});
const prior = JSON.parse(readFileSync('docs/qa-evidence/matchrim-manual-provenance-2026-10-13/source-stages.json', 'utf8'));
const protectedPaths = [...new Set([...Object.keys(prior.finalHashes ?? {}), ...(prior.protectedSources ?? []).map((row: { path: string }) => row.path), 'src/utils/multiWineScan.ts', 'src/utils/scanRegionProgress.ts', 'src/utils/regionAnalysisError.ts', 'src/utils/aiRimContextGuide.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx', 'src/components/wine-import/WineComparisonWorkspace.tsx'])].filter(path => typeof path === 'string' && path.startsWith('src/') && !['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/imageAnalysis.ts', 'src/components/ui/sonner.tsx'].includes(path)) as string[];
for (const path of protectedPaths) check('Protected source remains unchanged: ' + path, () => assert.equal(readFileSync(path, 'utf8'), execFileSync('git', ['show', baseline + ':' + path], { encoding: 'utf8' })));
writeFileSync(output, JSON.stringify({ scope: 'Local caption and immutable scoring/provenance contracts; synthetic numeric cases, not human preference or model evidence', baseline, checks, protectedPaths }, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.filter(row => row.passed).length, total: checks.length, failures: checks.filter(row => !row.passed) }));
if (checks.some(row => !row.passed)) process.exitCode = 1;
