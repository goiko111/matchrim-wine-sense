import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreNativeSensory184 } from './native-sensory184-scope.mjs';
import { restoreNativeVisual98 } from './native-visual98-scope.mjs';

const file = 'src/pages/MyWines.tsx';
const current = fs.readFileSync(file, 'utf8');
const prior = execFileSync('git', ['show', '87498f9:' + file], { encoding: 'utf8' });
let checks = 0;
const check = (name, work) => { work(); checks++; console.log('PASS', name); };
check('All four native-only caller changes have an exact whole-file inverse', () => {
  assert.equal(restoreNativeSensory184(file, current), prior);
  assert.equal(restoreNativeSensory184(file, prior), prior);
  assert.equal(restoreNativeSensory184('other/MyWines.tsx', current), current);
});
check('Existing visual98 and cellar150 historical source checks retain exact old bytes', () => {
  assert.equal(restoreNativeVisual98(file, current), restoreNativeVisual98(file, prior));
});
for (const [name, from, to] of [
  ['native-only guard', '!Capacitor.isNativePlatform() || readCellarSensoryEvidence(wine, true)', 'readCellarSensoryEvidence(wine, true)'],
  ['native training guard', 'isNative && !readCellarSensoryEvidence(wine, true)', 'true && !readCellarSensoryEvidence(wine, true)'],
  ['web affinity branch', 'cellarAffinityView(enriched, snapshot, isNative)', 'cellarAffinityView(enriched, snapshot, true)'],
  ['web readback branch', 'readCellarSensoryEvidence(persisted, isNative)', 'readCellarSensoryEvidence(persisted, true)'],
  ['owner write check', ".eq('user_id', action.ownerId)", ".eq('user_id', 'foreign-owner')"],
  ['web title', 'Mis Vinos', 'Changed web title'],
]) check('Unreviewed mutation rejected: ' + name, () => {
  assert(current.includes(from)); const changed = current.replace(from, to);
  assert.notEqual(restoreNativeSensory184(file, changed), prior);
  assert.throws(() => restoreNativeVisual98(file, changed));
});
check('Original184 source restoration cannot conceal extra lines or newline changes', () => {
  for (const changed of [current + '\n// undeclared185\n', '\n' + current, current.replaceAll('\n', '\r\n')])
    assert.throws(() => restoreNativeVisual98(file, changed));
});
console.log(JSON.stringify({ checks, externalGET: 0, models: 0,
  scope: 'Exact historical source-reader adaptation and mutation tests only; no product or release approval.' }));
