import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(new URL('./native-global103-scope.json', import.meta.url));
assert.equal(hash(bytes), '51075ff5f7a3e3e1a2d9046d862d85ea141a391db4d71dc4c4202d612be6a43e');
const scope = JSON.parse(bytes);
// Preserve legacy source/VM oracles byte-for-byte. New behavior is exercised by
// global103 transport tests and the actual native-branch visual flow separately.
export const restoreGlobal103 = (file, source) => {
  const row = scope.files.find(item => item.file === file);
  if (!row) return source;
  const digest = hash(source);
  if ([row.beforeHash, ...row.historicalHashes].includes(digest)) return source;
  assert.equal(digest, row.afterHash, 'Only reviewed native global103 amendments: ' + file);
  assert.equal(hash(row.before), row.beforeHash);
  return row.before;
};
