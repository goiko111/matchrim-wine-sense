import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
const component = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const previous = '77c72efbf20574c7ea715934c3fba0893132fe563860676621257deb5dca1460';
const current = '3e5449183e8bd4da2843651faf97d367bfabc65c2c1aff05a421c69549b32a77';
const wrapped = "className={isNative ? 'mt-2 h-auto min-h-11 whitespace-normal [&>span]:line-clamp-none [&>span]:whitespace-normal' : 'mt-2 min-h-11'}";

// Remove only the two reviewed native trigger class amendments, before scroll135.
export function restoreComparisonWrap142(file, source) {
  if (file === component && source.includes('nativeScrollStyle')) {
    if (hash(source) === previous) return source;
    assert.equal(hash(source), current, 'Only reviewed native comparison wrap142 classes');
    assert.equal(source.split(wrapped).length, 3, 'Exactly two native wrap142 triggers');
    source = source.replaceAll(wrapped, 'className="mt-2 min-h-11"');
    assert.equal(hash(source), previous, 'Exact pre-wrap142 comparator');
  }
  return source;
}
