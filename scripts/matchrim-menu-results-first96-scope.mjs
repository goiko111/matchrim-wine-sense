import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreNativeMenuResultsFirst96 } from './check-matchrim-menu-results-first96.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const original = file => execFileSync('git', ['show', `8af21043075ee42f00b04c30979a1abddf8c3e27:${file}`], { cwd: root, encoding: 'utf8' });
const once = (value, from, to) => { assert.equal(value.split(from).length, 2, 'One exact presentation amendment'); return value.replace(from, to); };
export function restoreLookupReasons96(value) {
  const marker = '\nconst pendingIdentityMessage = ', start = value.indexOf(marker), end = value.indexOf('\nconst OriginalSheetLookup = ', start);
  assert.ok(start >= 0 && end > start);
  assert.equal(createHash('sha256').update(value.slice(start, end)).digest('hex'), '1424cb7aec13ac80dd2f52ab33ebada33515f9da11f890c5468d5430ae060f7b');
  value = value.slice(0, start - 1) + value.slice(end);
  value = once(value, "{status === 'identity-required' ? pendingIdentityMessage(identity, disabled) : lookupMessages[status]}", '{lookupMessages[status]}');
  assert.equal(value, original('src/components/WinerimSheetLookup.tsx'), 'Whole8af lookup including every ready/canonical/vintage/cancel/stale closure and web wrapper');
  return value;
}
export function restoreMenuResultsSource96(file, value) {
  if (file === 'src/components/wine-import/WineMenuScanner.tsx' && value.includes('  const nativeResultPreview =')) return restoreNativeMenuResultsFirst96(value);
  if (file === 'src/components/WinerimSheetLookup.tsx' && value.includes('\nconst pendingIdentityMessage = ')) return restoreLookupReasons96(value);
  return value;
}
export function restoreMenuResultsGuard96(file, value) {
  if (file !== 'scripts/check-matchrim-menu-integration-oct13.ts') return value;
  if (value.includes("import { restoreMenuResultsSource96 } from './matchrim-menu-results-first96-scope.mjs';")) {
    value = once(value, "import { restoreMenuResultsSource96 } from './matchrim-menu-results-first96-scope.mjs';\n", '');
    value = once(value, 'assert.equal(hash(restoreMenuResultsSource96(path, currentSource)),', 'assert.equal(hash(currentSource),');
    assert.equal(value, original(file), 'Only static source preservation is projected; actual runtime initializers remain current');
  }
  return value;
}
