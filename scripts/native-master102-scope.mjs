import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { restoreGlobal103 } from './native-global103-scope.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(new URL('./native-master102-scope.json', import.meta.url));
assert.equal(digest(bytes), 'ff456c6fe6ff6540450cf1913bc36cd733ff61df19123a7be8301a6e6242f9b3', 'Exact reviewed native102 source inverse package');
const scope = JSON.parse(bytes);

// Whole-file bounded inverses preserve all old oracles/cases. Current master
// transport and the native-only dispatch are exercised separately, not projected.
export const restoreNativeMaster102 = (file, source) => {
  source = restoreGlobal103(file, source);
  const row = scope.files.find(item => item.file === file);
  if (!row) return source;
  if ([row.beforeHash, ...row.historicalHashes].includes(digest(source))) return source;
  assert.equal(digest(source), row.afterHash, `Only the reviewed native102 source amendments: ${file}`);
  for (const hunk of row.hunks.slice().reverse()) {
    assert.equal(source.split(hunk.after).length, 2, `One unique native102 inverse hunk: ${file}`);
    source = source.replace(hunk.after, hunk.before);
  }
  assert.equal(digest(source), row.beforeHash, `Every pre102 byte restored: ${file}`);
  return source;
};
