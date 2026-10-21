import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreGlobal103 } from './native-global103-scope.mjs';
const scope = JSON.parse(readFileSync('scripts/native-global103-scope.json'));
let negatives = 0;
for (const row of scope.files) {
  const current = readFileSync(row.file, 'utf8');
  assert.equal(restoreGlobal103(row.file, current), execFileSync('git', ['show', `${scope.baseline}:${row.file}`], { encoding: 'utf8' }));
  for (const source of [current, row.before]) {
    assert.throws(() => restoreGlobal103(row.file, source + '\n// undeclared global edit\n')); negatives++;
  }
}
const file = 'src/components/wine-import/MultiWineLabelScanner.tsx', source = readFileSync(file, 'utf8');
for (const [from, to] of [
  ['isNative && !isMatchrimFixtureQaEnabled && canAdmitNativeCatalogLookup97(candidate)', 'canAdmitNativeCatalogLookup97(candidate)'],
  ["global.status === 'ambiguous'", "global.status !== 'ambiguous'"],
  ['if (signal.aborted)', 'if (false)'],
  ['currentManualLookupKey.current !== manualLookupKey', 'false'],
]) {
  const mutant = source.replace(from, to); assert.notEqual(mutant, source);
  assert.throws(() => restoreGlobal103(file, mutant)); negatives++;
}
console.log(JSON.stringify({ passed: scope.files.length, rejectedMutations: negatives, oldAssertionsRemoved: 0, webPublish: false }));
