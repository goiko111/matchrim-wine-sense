import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreNativeLearning186, restoreFeedbackScope186 } from './native-learning186-scope.mjs';
import { restoreFeedbackScope185 } from './native-profile185-scope.mjs';

const file = 'supabase/functions/_shared/matchrim-profile95.ts', source = fs.readFileSync(file, 'utf8');
const previous = execFileSync('git', ['show', 'a0bf1c5:' + file], { encoding: 'utf8' });
assert.equal(restoreNativeLearning186(file, source), previous);
assert.equal(restoreNativeLearning186(file, previous), previous);
let rejected = 0;
for (const [from, to] of [["if (native && evidence.canonical_id", "if (!native && evidence.canonical_id"],
  ['readTraining(value, strengthAware)', 'readTraining(value, true)'],
  ['weight * (row.timestamp', 'weight + (row.timestamp'],
  ['evidence.identity_signature !== JSON.stringify(identity)', 'false'],
  ["const strengthAware = options.evidenceStrength === 'native-v2'", 'const strengthAware = true']]) {
  const changed = source.replace(from, to);
  assert.notEqual(changed, source); assert.throws(() => restoreNativeLearning186(file, changed)); rejected++;
}
const scopeFile = 'scripts/matchrim-feedback-server96-scope.ts', scope = fs.readFileSync(scopeFile, 'utf8');
assert.equal(restoreFeedbackScope186(scope), execFileSync('git', ['show', 'a0bf1c5:' + scopeFile], { encoding: 'utf8' }));
assert.equal(restoreFeedbackScope185(scope), execFileSync('git', ['show', '72f3b05:' + scopeFile], { encoding: 'utf8' }));
for (const changed of [scope + '\n', scope.replace('assert.ok(file in pairs,', 'assert.ok(true,')]) {
  assert.throws(() => restoreFeedbackScope185(changed)); rejected++;
}
console.log(JSON.stringify({ passed: true, exactWholeFileRestorations: 3, rejectedMutations: rejected,
  sourceOnly: true, webRuntimeChanged: false, externalCalls: 0 }));
