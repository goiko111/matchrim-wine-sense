import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { restoreComparisonScroll135 } from './native-comparison-scroll135-scope.mjs';
import { restoreNativeLabelGuard97 } from './native-label97-scope.mjs';

let rejected = 0;
for (const file of ['src/components/wine-import/WineComparisonWorkspace.tsx', 'scripts/check-matchrim-comparison-target96.ts']) {
  const source = fs.readFileSync(file, 'utf8');
  const original = execFileSync('git', ['show', 'ba74ee1:' + file], { encoding: 'utf8' });
  assert.equal(restoreComparisonScroll135(file, source), original);
  assert.equal(restoreComparisonScroll135(file, original), original);
  for (const changed of [source + '\n// undeclared\n', source.replace('assert.equal(', 'assert.notEqual('),
    source.replace("onClick={() => setMode('service')}", "onClick={() => undefined}"),
    source.replace("isNative ? { scrollMarginTop:", "true ? { scrollMarginTop:"),
    source.replace('144px', '112px')]) {
    if (changed === source) continue;
    assert.throws(() => restoreComparisonScroll135(file, changed)); rejected++;
  }
}
const guard = 'scripts/check-matchrim-comparison-target96.ts';
const source = fs.readFileSync(guard, 'utf8');
assert.equal(restoreNativeLabelGuard97(guard, source), restoreComparisonScroll135(guard, source));
const css = fs.readFileSync('src/index.css');
assert(css.equals(execFileSync('git', ['show', 'db6a181:src/index.css'])));
console.log(JSON.stringify({ wholeFileInverses: 2, rejectedMutations: rejected, protectedCssUnchanged: true,
  scope: 'Exact native-only scroll prop inverse; all historical CSS assertions remain. Does not prove new geometry or UIKit.' }));
