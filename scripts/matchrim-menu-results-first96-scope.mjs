import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restoreNativeMenuResultsFirst96 } from './check-matchrim-menu-results-first96.mjs';
import { restoreNativeScanPrivacyCss96 } from './check-matchrim-scan-privacy96.mjs';
import { restoreMenuEntryGuard96, restoreMenuEntryPackage96 } from './check-matchrim-native-menu-entry-bridge96.mjs';
import { restoreNativeLabel97, restoreNativeLabelGuard97 } from './native-label97-scope.mjs';
import { restoreNativeHome98 } from './native-home98-scope.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const original = file => execFileSync('git', ['show', `8af21043075ee42f00b04c30979a1abddf8c3e27:${file}`], { cwd: root, encoding: 'utf8' });
const once = (value, from, to) => { assert.equal(value.split(from).length, 2, 'One exact presentation amendment'); return value.replace(from, to); };
const commandTail = ' && node scripts/check-matchrim-menu-results-first96.mjs && node --import tsx scripts/check-matchrim-lookup-reasons96.ts && node scripts/check-matchrim-menu-results-bridge96.mjs && node scripts/check-matchrim-scan-privacy96.mjs && node scripts/check-matchrim-menu-comparator-return96.mjs';
export function restoreMenuResultsPackage96(value) {
  value = restoreMenuEntryPackage96(value);
  const before = original('package.json'), command = JSON.parse(before).scripts['test:closure96'];
  value = once(value, command + commandTail, command);
  assert.equal(value, before, 'Only four additive commands; no old command, dependency or package field removed');
  return value;
}
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
  value = restoreNativeHome98(file, value);
  value = restoreNativeLabel97(file, value);
  if (file === 'src/index.css' && value.includes('.scan-page-main:has(.matchrim-native-scan-privacy)')) return restoreNativeScanPrivacyCss96(value);
  if (file === 'src/components/wine-import/WineMenuScanner.tsx' && value.includes('  const nativeResultPreview =')) return restoreNativeMenuResultsFirst96(value);
  if (file === 'src/components/WinerimSheetLookup.tsx' && value.includes('\nconst pendingIdentityMessage = ')) return restoreLookupReasons96(value);
  return value;
}
export function restoreMenuResultsGuard96(file, value) {
  value = restoreNativeLabelGuard97(file, value);
  value = restoreMenuEntryGuard96(file, value);
  if (file === 'scripts/check-matchrim-consumer95-native-layout.ts' && value.includes("const fullCss = restoreManualLookup96('src/index.css'")) {
    value = once(value, "const fullCss = restoreManualLookup96('src/index.css', readFileSync('src/index.css', 'utf8'));", "const fullCss = readFileSync('src/index.css', 'utf8');");
    value = once(value, "hash(restoreManualLookupGuard96(comparisonTargetScope96.test, readFileSync(comparisonTargetScope96.test, 'utf8')))", "hash(readFileSync(comparisonTargetScope96.test, 'utf8'))");
    assert.equal(value, original(file), 'All15 original layout groups and every nested comparison/Home/menu proof exact');
    return value;
  }
  if (['scripts/check-matchrim-comparison-target96.ts', 'scripts/matchrim-comparison-target96-scope.ts'].includes(file) && value.includes("import { restoreNativeScanPrivacyCss96 }")) {
    value = once(value, "import { restoreNativeScanPrivacyCss96 } from './check-matchrim-scan-privacy96.mjs';\n", '');
    value = file.includes('/check-')
      ? once(value, "const current = restoreNativeScanPrivacyCss96(readFileSync(path, 'utf8'));", "const current = readFileSync(path, 'utf8');")
      : once(value, '  css = restoreNativeScanPrivacyCss96(css);\n', '');
    assert.equal(value, original(file), 'Only privacy CSS inverse precedes all unchanged comparison scope/44-target/negative checks');
    return value;
  }
  if (file === 'scripts/check-matchrim-manual-lookup-bridge96.mjs' && value.includes("import { restoreMenuResultsSource96, restoreMenuResultsGuard96 }")) {
    value = once(value, "import { restoreMenuResultsSource96, restoreMenuResultsGuard96 } from './matchrim-menu-results-first96-scope.mjs';\n", '');
    value = once(value, "  source = kind === 'component' ? restoreMenuResultsSource96(file, source) : restoreMenuResultsGuard96(file, source);\n", '');
    value = once(value, "restoreNativeHeadingGuard96(row.file, restoreMenuResultsGuard96(row.file, restoreMenuResultsSource96(row.file, readFileSync(resolve(root, row.file), 'utf8'))))", "restoreNativeHeadingGuard96(row.file, readFileSync(resolve(root, row.file), 'utf8'))");
    assert.equal(value, original(file), 'All original bridge assertions, source pairs, old commands and24 closure checks exact');
    return value;
  }
  if (file === 'scripts/check-matchrim-scan-heading96.mjs' && value.includes("import { restoreMenuResultsGuard96, restoreMenuResultsPackage96 }")) {
    value = once(value, "import { restoreMenuResultsGuard96, restoreMenuResultsPackage96 } from './matchrim-menu-results-first96-scope.mjs';\n", '');
    value = once(value, '  source = restoreMenuResultsGuard96(file, source);\n', '');
    value = once(value, "JSON.parse(restoreMenuResultsPackage96(read('package.json')))", "JSON.parse(read('package.json'))");
    assert.equal(value, original(file), 'Every original named-heading assertion and negative exact');
    return value;
  }
  if (file === 'scripts/check-matchrim-cloud-snapshot.ts' && value.includes("import { restoreNativeScanPrivacy96 }")) {
    value = once(value, "import { restoreNativeScanPrivacy96 } from './check-matchrim-scan-privacy96.mjs';\n", '');
    value = once(value, "row.path === 'src/components/ScanPrivacyGate.tsx'\n      ? Buffer.from(restoreNativeScanPrivacy96(readFileSync(row.path, 'utf8'))) : row.path === 'src/components/wine-import/ScanHub.tsx'", "row.path === 'src/components/wine-import/ScanHub.tsx'");
    assert.equal(value, original(file), 'No protected path exemption or old assertion removed; exact privacy source inverse only');
    return value;
  }
  if (file !== 'scripts/check-matchrim-menu-integration-oct13.ts') return value;
  if (value.includes("import { restoreMenuResultsSource96 } from './matchrim-menu-results-first96-scope.mjs';")) {
    value = once(value, "import { restoreMenuResultsSource96 } from './matchrim-menu-results-first96-scope.mjs';\n", '');
    value = once(value, 'assert.equal(hash(restoreMenuResultsSource96(path, currentSource)),', 'assert.equal(hash(currentSource),');
    assert.equal(value, original(file), 'Only static source preservation is projected; actual runtime initializers remain current');
  }
  return value;
}
