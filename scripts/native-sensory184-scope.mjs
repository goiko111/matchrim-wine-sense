import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
const beforeHash = 'da1238b2f6ec9a558239cf2fbd4dc7280de296d636a8d7bc388a520c3f58c73b';
const afterHash = '0d7eedd07cfe702a76dd1fa47effbc1f8887601367e4f98db60128c7f72d86e9';

// Historical source oracles only. Actual native quarantine behavior is tested
// directly in184; this inverse cannot admit another byte or weaken old checks.
export const restoreNativeSensory184 = (file, source) => {
  if (file !== 'src/pages/MyWines.tsx' || hash(source) !== afterHash) return source;
  for (const [current, previous] of [
    ['  const sensory = catalog && (!Capacitor.isNativePlatform() || readCellarSensoryEvidence(wine, true))',
      '  const sensory = catalog && (!Capacitor.isNativePlatform() || readCellarSensoryEvidence(wine))'],
    ['(isNative && !readCellarSensoryEvidence(wine, true)) || (readMenuPrice(wine.place_details, null)',
      '(isNative && !readCellarSensoryEvidence(wine)) || (readMenuPrice(wine.place_details, null)'],
    ['const affinity = cellarAffinityView(enriched, snapshot, isNative).current;',
      'const affinity = cellarAffinityView(enriched, snapshot).current;'],
    ['|| !readCellarSensoryEvidence(persisted, isNative)', '|| !readCellarSensoryEvidence(persisted)'],
  ]) {
    assert.equal(source.split(current).length, 2, 'Unique native184 source-reader inverse');
    source = source.replace(current, previous);
  }
  assert.equal(hash(source), beforeHash, 'Every pre184 MyWines byte restored for historical oracles');
  return source;
};
