import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const hash = value => createHash('sha256').update(value).digest('hex');
const files = new Map([
  ['src/services/winerimApi.ts', ['c19157cd96bec558d18ec63ad92b6ee8c1054cae0df07f871c6d377af45b7cc9',
    '6fdefedfae1983d6b5299470aacec1b0a02e38b795f5ebf91fd1d93fe9f122ee']],
  ['src/utils/wineAffinityExplanation.ts', ['f660f235b14a6cc440e8a289025ace40982334741146a1e250f496ee73ae3c67',
    'd7ef4f014b94ee7c5bf949dd88e858a91240bd2ea7bd3772d7df8325e4c799c4']],
]);

// Only the historical v2 ordering oracle uses this projection. Actual native v3
// and its real platform dependency execute in check-matchrim-affinity187.mjs.
export function restoreAffinity187(file, source) {
  const pins = files.get(file);
  if (!pins || hash(source) === pins[0]) return source;
  assert.equal(hash(source), pins[1], 'Only the exact reviewed187 model changes');
  const previous = execFileSync('git', ['show', '878f648:' + file], { encoding: 'utf8' });
  assert.equal(hash(previous), pins[0], 'Every historical v2 source byte retained');
  return previous;
}
