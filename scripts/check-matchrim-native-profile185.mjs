import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreProfile185, restoreStrength185, restoreFeedbackScope185 } from './native-profile185-scope.mjs';

const profile = 'src/pages/Profile.tsx', source = readFileSync(profile, 'utf8');
const before = execFileSync('git', ['show', '8a92183:' + profile], { encoding: 'utf8' });
assert.equal(restoreProfile185(profile, source), before);
assert.equal(restoreProfile185(profile, before), before);
let negatives = 0;
for (const [from, to] of [[".eq('user_id', user.id)", ".eq('user_id', 'other')"],
  ['calculateLearnedMatchrimProfile(', 'otherLearner('], ['Mi Perfil', 'Other title'],
  ['isNative && nativeHistoryError', 'nativeHistoryError'], ['key={Capacitor.isNativePlatform()', 'key={false && Capacitor.isNativePlatform()']]) {
  const changed = source.replace(from, to);
  assert.notEqual(changed, source); assert.throws(() => restoreProfile185(profile, changed)); negatives++;
}
for (const [file, restore] of [['scripts/check-matchrim-feedback-strength96.ts', restoreStrength185],
  ['scripts/matchrim-feedback-server96-scope.ts', restoreFeedbackScope185]]) {
  const current = readFileSync(file, 'utf8');
  const old = execFileSync('git', ['show', '72f3b05:' + file], { encoding: 'utf8' });
  assert.equal(restore(current), old);
  assert.equal(restore(old), old);
  assert.throws(() => restore(current + '\n')); negatives++;
  const changed = current.replace('assert.equal', 'assert.notEqual');
  assert.notEqual(changed, current); assert.throws(() => restore(changed)); negatives++;
}
console.log(JSON.stringify({ passed: true, exactOriginals: 3, rejectedMutations: negatives,
  scope: 'Bounded legacy caller/source-reader compatibility only. Current native Profile behavior is tested separately.' }));
