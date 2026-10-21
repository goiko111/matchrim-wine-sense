import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreNativeMaster102 } from './native-master102-scope.mjs';

const scope = JSON.parse(readFileSync('scripts/native-master102-scope.json', 'utf8'));
let negatives = 0;
for (const row of scope.files) {
  const actual = readFileSync(row.file, 'utf8');
  const before = execFileSync('git', ['show', `${scope.baseline}:${row.file}`], { encoding: 'utf8' });
  assert.equal(restoreNativeMaster102(row.file, actual), before);
  assert.equal(restoreNativeMaster102(row.file, before), before);
  for (const source of [actual, before]) {
    assert.throws(() => restoreNativeMaster102(row.file, source + '\n// undeclared102\n')); negatives++;
  }
}
const file = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const source = readFileSync(file, 'utf8');
for (const [from, to] of [
  ['isNative && !isMatchrimFixtureQaEnabled && hasMissingVisibleQualifier102(candidate)', '!isMatchrimFixtureQaEnabled && hasMissingVisibleQualifier102(candidate)'],
  ['isNative && !isMatchrimFixtureQaEnabled && nativeMasterUrl', 'nativeMasterUrl'],
  ["master.status === 'verified'", "master.status !== 'verified'"],
  ['if (signal.aborted)', 'if (false)'],
  ['isNative ? nativeMasterAudit102(candidate) : null', 'nativeMasterAudit102(candidate)'],
  ['{isNative && selectedCandidate && nativeMasterAudit102(selectedCandidate)', '{selectedCandidate && nativeMasterAudit102(selectedCandidate)'],
]) {
  const changed = source.replace(from, to); assert.notEqual(source, changed, from);
  assert.throws(() => restoreNativeMaster102(file, changed)); negatives++;
}
console.log(JSON.stringify({ passed: scope.files.length + 1, failed: 0, exactWholeFileInverses: scope.files.length,
  rejectedMutations: negatives, originalAssertionsRemoved: 0, originalCaseCountsChanged: 0,
  scope: 'Exact source restoration and native-only guard negatives. Current102 transport is tested separately; no UI pixels or live master claim.' }));
