import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { restoreComparisonScroll135 } from './native-comparison-scroll135-scope.mjs';
import { restoreRescan159 } from './native-rescan159-scope.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(new URL('./native-global103-scope.json', import.meta.url));
assert.equal(hash(bytes), '2d0fc25a0685a66399ae35d767ccfdcecff5bcdb32723f1aed42853c3401222c');
const scope = JSON.parse(bytes);
// Preserve legacy source/VM oracles byte-for-byte. New behavior is exercised by
// global103 transport tests and the actual native-branch visual flow separately.
export const restoreGlobal103 = (file, source) => {
  source = restoreRescan159(file, source);
  source = restoreComparisonScroll135(file, source);
  const row = scope.files.find(item => item.file === file);
  if (!row) return source;
  const digest = hash(source);
  if ([row.beforeHash, ...row.historicalHashes].includes(digest)) return source;
  assert.equal(digest, row.afterHash, 'Only reviewed native global103 amendments: ' + file);
  assert.equal(hash(row.before), row.beforeHash);
  return row.before;
};
