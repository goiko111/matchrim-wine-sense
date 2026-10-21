import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const digest = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(new URL('./native-master102-scope.json', import.meta.url));
assert.equal(digest(bytes), '84d4d069e71b2269a34a4a02b80184228a767e6f851009875bf768e6c4b97822', 'Exact reviewed native102 source inverse package');
const scope = JSON.parse(bytes);

// Whole-file bounded inverses preserve all old oracles/cases. Current master
// transport and the native-only dispatch are exercised separately, not projected.
export const restoreNativeMaster102 = (file, source) => {
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
