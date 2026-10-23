import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { restoreFeedbackScope186 } from './native-learning186-scope.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const once = (source, after, before) => {
  assert.equal(source.split(after).length, 2, 'One exact185 source-reader amendment');
  return source.replace(after, before);
};
const profile = 'src/pages/Profile.tsx';
let prior;

// Current Profile effects/JSX have their own executable consumer tests. This
// whole-file bound only restores the older strength96 caller-freeze oracle.
export function restoreProfile185(file, source) {
  if (file !== profile || hash(source) === 'f6952757103df0817f101e9e744e860773be0c2375735b0a73f99b977da51e03') return source;
  assert.equal(hash(source), '7994891a17da3b80e7c232f6228079f7be8519bcf2ff6bcdd19f5b7da413533f',
    'Only reviewed native Profile history/owner/accessibility changes');
  prior ??= execFileSync('git', ['show', '8a92183:' + profile], { encoding: 'utf8', timeout: 10000 });
  assert.equal(hash(prior), 'f6952757103df0817f101e9e744e860773be0c2375735b0a73f99b977da51e03');
  return prior;
}

export function restoreStrength185(source) {
  const oldHash = 'a336a4c321780f1b0e1ac48ca63b07dff6f1e9a06b4c3e13748a5c4910fba86c';
  if (hash(source) === oldHash) return source;
  source = once(source, "import { restoreProfile185 } from './native-profile185-scope.mjs';\n", '');
  source = once(source, "    const source = restoreProfile185(file, readFileSync(file, 'utf8'));", "    const source = readFileSync(file, 'utf8');");
  assert.equal(hash(source), oldHash, 'Every original strength96 case and assertion preserved');
  return source;
}

export function restoreFeedbackScope185(source) {
  source = restoreFeedbackScope186(source);
  const oldHash = '3bc133a4db6b944b49124423edca11fb4893cfb499f35f0a5eeb7c7752a4757a';
  if (hash(source) === oldHash) return source;
  source = once(source, "import { restoreStrength185 } from './native-profile185-scope.mjs';\n", '');
  source = once(source, '  source = restoreStrength185(source);\n', '');
  assert.equal(hash(source), oldHash, 'Every earlier server96 source projection preserved');
  return source;
}
