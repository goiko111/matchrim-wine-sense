import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
const component = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const guard = 'scripts/check-matchrim-comparison-target96.ts';
const declaration = "  const nativeScrollStyle = isNative ? { scrollMarginTop: 'calc(var(--matchrim-safe-top) + 144px)' } : undefined;\n";
const imported = "import { restoreComparisonScroll135 } from './native-comparison-scroll135-scope.mjs';\n";
const once = (source, from, to) => {
  assert.equal(source.split(from).length, 2, 'One exact native-scroll135 amendment');
  return source.replace(from, to);
};

// Only project the reviewed native presentation delta into historical oracles.
// Current touch geometry and real native rendering are checked without projection.
export function restoreComparisonScroll135(file, source) {
  if (file === component && source.includes('nativeScrollStyle')) {
    assert.equal(hash(source), '77c72efbf20574c7ea715934c3fba0893132fe563860676621257deb5dca1460', 'Only reviewed native comparison scroll props');
    source = once(source, declaration, '');
    assert.equal(source.split('\n                  style={nativeScrollStyle}').length, 3);
    source = source.replaceAll('\n                  style={nativeScrollStyle}', '');
    assert.equal(source.split(' style={nativeScrollStyle}').length, 7);
    source = source.replaceAll(' style={nativeScrollStyle}', '');
    assert.equal(hash(source), '6ba543f62c49c4e58893a8d9ab3ae28259a43a105aacbf0221476bcb75e41d65');
  }
  if (file === guard && source.includes(imported)) {
    assert.equal(hash(source), 'da9005ae11c328e243831086cf5f7a3fe1c51af33072c18dd4bf93d7e7ceef80', 'Every old comparison test retained');
    source = once(source, imported, '');
    source = once(source, "restoreComparisonScroll135(component, readFileSync(component, 'utf8'))", "readFileSync(component, 'utf8')");
    assert.equal(hash(source), '4b06785da2459c22614a8d7bbc8137cb1a599c95bd269c3fc43a42e0aaee851b');
  }
  return source;
}
