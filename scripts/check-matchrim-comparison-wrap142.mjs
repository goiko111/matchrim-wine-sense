import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { restoreComparisonWrap142 } from './native-comparison-wrap142-scope.mjs';
import { restoreComparisonScroll135 } from './native-comparison-scroll135-scope.mjs';

const component = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const source = fs.readFileSync(component, 'utf8');
const previous = execFileSync('git', ['show', 'b24b731:' + component], { encoding: 'utf8' });
assert.equal(createHash('sha256').update(previous).digest('hex'), '77c72efbf20574c7ea715934c3fba0893132fe563860676621257deb5dca1460');
assert.equal(restoreComparisonWrap142(component, source), previous);
assert.equal(restoreComparisonWrap142(component, previous), previous);
assert.equal(restoreComparisonWrap142('unrelated.tsx', source), source);
const historical = execFileSync('git', ['show', 'ba74ee1:' + component], { encoding: 'utf8' });
assert.equal(restoreComparisonScroll135(component, source), historical);
assert.equal(restoreComparisonWrap142(component, historical), historical);

const mutations = [
  ["className={isNative ? 'mt-2 h-auto", "className={true ? 'mt-2 h-auto"],
  ["className={isNative ? 'mt-2 h-auto", "className={!isNative ? 'mt-2 h-auto"],
  ['setBudget(event.target.value)', "setBudget('0')"],
  ["onClick={() => setMode('service')}", 'onClick={() => undefined}'],
  ['[&>span]:line-clamp-none', '[&>span]:line-clamp-1'],
  ['144px', '112px'],
  ["wines.slice(0, 3)", "wines.slice(0, 5)"],
];
for (const [from, to] of mutations) {
  const changed = source.replace(from, to);
  assert.notEqual(changed, source, 'Negative must actually mutate the source');
  assert.throws(() => restoreComparisonWrap142(component, changed));
  assert.throws(() => restoreComparisonScroll135(component, changed));
}
for (const extra of ['\n// undeclared amendment\n', '\n']) {
  assert.throws(() => restoreComparisonWrap142(component, source + extra));
  assert.throws(() => restoreComparisonScroll135(component, source + extra));
}
assert.throws(() => restoreComparisonWrap142(component, previous.replace('setBudget(event.target.value)', "setBudget('0')")));
console.log(JSON.stringify({ exactWrapInverse: true, historicalScrollInverse: true, rejectedMutations: mutations.length + 3,
  scope: 'Whole-file native-only class inverse and directed negatives. No browser, build, UIKit or visual proof.' }));
