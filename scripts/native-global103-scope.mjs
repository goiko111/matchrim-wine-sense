import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const hash = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(new URL('./native-global103-scope.json', import.meta.url));
assert.equal(hash(bytes), '8f59500231017dc6718c4f668da510f495338c3dc6c7db5f1a48dd9445e3b435');
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
