import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreNativeHeadingGuard96 } from './check-matchrim-scan-heading96.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const digest = value => createHash('sha256').update(value).digest('hex');
const data = readFileSync(resolve(root, 'scripts/matchrim-manual-lookup96-scope.json'));
assert.equal(digest(data), 'eb4eb08d3630f7474835ffc836929924fa4a1d289ab23fbdaf25e9c5a4dd33df', 'Exact reviewed C and QA inverse data');
const scope = JSON.parse(data);
const inverse = (file, source, kind) => {
  if (kind === 'guard') source = restoreNativeHeadingGuard96(file, source);
  const row = scope.files.find(row => row.file === file && row.kind === kind);
  if (!row) return source;
  if (digest(source) === row.beforeHash) return source;
  for (const hunk of row.hunks.slice().reverse()) {
    assert.equal(source.split(hunk.after).length, 2, `One exact reviewed C amendment: ${file}`);
    source = source.replace(hunk.after, hunk.before);
  }
  assert.equal(digest(source), row.beforeHash, `Whole ${scope.baseline} source, not a broad exemption: ${file}`);
  return source;
};
export const restoreManualLookup96 = (file, source) => inverse(file, source, 'component');
export const restoreManualLookupGuard96 = (file, source) => inverse(file, source, 'guard');

const actual = new Map();
for (const row of scope.files) {
  const source = restoreNativeHeadingGuard96(row.file, readFileSync(resolve(root, row.file), 'utf8'));
  actual.set(row.file, source);
  assert.equal(digest(source), row.afterHash, `Exact actual reviewed source: ${row.file}`);
  assert.equal(inverse(row.file, source, row.kind), execFileSync('git', ['show', `${scope.baseline}:${row.file}`], { cwd: root, encoding: 'utf8' }));
}
const label = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const lookup = 'src/components/WinerimSheetLookup.tsx';
const mutations = [
  [label, 'currentManualLookupKey.current !== manualLookupKey', 'false', 'stale context bypass'],
  [label, 'catalogWineFromVerifiedSheet(selectedCandidate, sheet)', 'null', 'canonical validation changed'],
  [label, "region.status !== 'discarded'", 'true', 'discarded target admitted'],
  [label, 'editCandidate({ name: event.target.value })', 'editCandidate({ name: "changed" })', 'old edit callback'],
  [label, "(!isNative || selectedCandidate.source !== 'manual')", 'true', 'native/web entry gate'],
  [lookup, '!disabled && canLookupWinerimOriginal(identity)', 'canLookupWinerimOriginal(identity)', 'disabled gate'],
  [lookup, '!abort.signal.aborted', 'true', 'late cancellation bypass'],
  [lookup, 'if (!Capacitor.isNativePlatform()) return null;', 'if (false) return null;', 'web native-only wrapper'],
  [lookup, "buttonLabel || (outcome ? 'Reintentar ficha original Winerim' : 'Ficha original Winerim')", "buttonLabel || 'Different default'", 'default visible copy'],
];
for (const [file, from, to, name] of mutations) {
  const source = actual.get(file);
  assert.ok(source.includes(from), `Applicable negative: ${name}`);
  const changed = source.replace(from, to);
  assert.notEqual(changed, source);
  assert.throws(() => restoreManualLookup96(file, changed), undefined, name);
}
for (const row of scope.files.filter(row => row.kind === 'guard')) {
  const source = actual.get(row.file), changed = source.replace('assert.equal(', 'assert.notEqual(');
  assert.notEqual(changed, source, `Applicable old assertion negative: ${row.file}`);
  assert.throws(() => restoreManualLookupGuard96(row.file, changed), undefined, row.file);
}
const feature = scope.feature;
assert.equal(digest(readFileSync(resolve(root, feature.file))), feature.sha256);
const output = execFileSync(process.execPath, ['--import', 'tsx', feature.file], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, maxBuffer: 1024 * 1024,
});
const report = JSON.parse(output.trim().split('\n').at(-1));
assert.equal(report.passed, 24); assert.equal(report.failed, 0); assert.equal(report.externalCalls, 0);
assert.equal(output.split('\n').filter(line => line.startsWith('PASS ')).length, 24);
const commands = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).scripts['test:closure96'];
assert.ok(commands.startsWith(scope.originalClosure96 + ' && '), 'Every old closure96 command retained in original order');
assert.ok(commands.includes('node --import tsx ' + feature.file));
assert.ok(commands.includes('node scripts/check-matchrim-manual-lookup-bridge96.mjs'));
export const manualLookup96Result = {
  baseline: scope.baseline, reviewedCommit: scope.reviewedCommit,
  componentFiles: scope.files.filter(row => row.kind === 'component').map(({ file, beforeHash, afterHash, hunks }) => ({ file, beforeHash, afterHash, amendments: hunks.length })),
  exactWholeTwoFileInverse: true, exactQAInverseFiles: scope.files.filter(row => row.kind === 'guard').length,
  feature, childGroups: 24, rejectedMutations: mutations.length + scope.files.filter(row => row.kind === 'guard').length,
  actualSourceAndDefaultWebChecks: true, externalCalls: 0, SDKOrNativeRuntimeUsed: false,
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const name of ['Exact two reviewed C files inverse to a625', 'Exact QA bridges retain every old source assertion and fingerprint',
    'New native/default-web actual closures24 and original commands retained', 'Directed component and old-assertion mutation negatives rejected']) console.log('PASS', name);
  console.log(JSON.stringify({ passed: 4, failed: 0, ...manualLookup96Result }));
}
