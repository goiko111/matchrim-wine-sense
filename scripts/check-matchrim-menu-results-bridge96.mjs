import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { restoreMenuResultsSource96, restoreMenuResultsGuard96, restoreMenuResultsPackage96 } from './matchrim-menu-results-first96-scope.mjs';
import { restoreNativeScanPrivacy96 } from './check-matchrim-scan-privacy96.mjs';

const old = file => execFileSync('git', ['show', `8af2104:${file}`], { encoding: 'utf8' });
const once = (value, from, to) => { assert.equal(value.split(from).length, 2); return value.replace(from, to); };
const originalBridge = value => {
  value = once(value, "import { restoreMenuResultsSource96, restoreMenuResultsGuard96 } from './matchrim-menu-results-first96-scope.mjs';\n", '');
  value = once(value, "  source = kind === 'component' ? restoreMenuResultsSource96(file, source) : restoreMenuResultsGuard96(file, source);\n", '');
  value = once(value,
    "restoreNativeHeadingGuard96(row.file, restoreMenuResultsGuard96(row.file, restoreMenuResultsSource96(row.file, readFileSync(resolve(root, row.file), 'utf8'))))",
    "restoreNativeHeadingGuard96(row.file, readFileSync(resolve(root, row.file), 'utf8'))");
  assert.equal(value, old('scripts/check-matchrim-manual-lookup-bridge96.mjs'));
};
let rejected = 0;
for (const file of ['src/components/wine-import/WineMenuScanner.tsx', 'src/components/WinerimSheetLookup.tsx']) {
  const source = readFileSync(file, 'utf8');
  assert.equal(restoreMenuResultsSource96(file, source), old(file));
  const changes = file.includes('WineMenuScanner') ? [
    ['<details className="group min-w-0"', '<details open className="group min-w-0"'],
    ['aria-label="Ver carta"', 'aria-hidden="true" aria-label="Ver carta"'],
    ['onClick={clearScan}', 'onClick={() => undefined}'],
    ['openWineDetail(first.index, event.currentTarget)', 'openWineDetail(0, event.currentTarget)'],
  ] : [
    ['!disabled && canLookupWinerimOriginal(identity)', 'true'],
    ['!abort.signal.aborted', 'true'],
    ["reasons.push('añade la bodega')", "reasons.push('añade el nombre')"],
  ];
  for (const [from, to] of changes) { assert.ok(source.includes(from)); assert.throws(() => restoreMenuResultsSource96(file, source.replace(from, to))); rejected++; }
}
console.log('PASS Both whole product files restore exact8af, not a hash allowance');
const integration = 'scripts/check-matchrim-menu-integration-oct13.ts', integrationSource = readFileSync(integration, 'utf8');
assert.equal(restoreMenuResultsGuard96(integration, integrationSource), old(integration));
for (const [from, to] of [['assert.equal(report.passed, 15)', 'assert.equal(report.passed, 14)'], ['assert.equal(', 'assert.notEqual(']]) {
  assert.ok(integrationSource.includes(from)); assert.throws(() => restoreMenuResultsGuard96(integration, integrationSource.replace(from, to))); rejected++;
}
console.log('PASS Static integration proof projects only source hash; actual initializers/SUT remain current');
const bridge = readFileSync('scripts/check-matchrim-manual-lookup-bridge96.mjs', 'utf8'); originalBridge(bridge);
for (const [from, to] of [['assert.equal(report.passed, 24)', 'assert.equal(report.passed, 23)'], ['assert.throws(', 'assert.doesNotThrow(']]) {
  assert.ok(bridge.includes(from)); assert.throws(() => originalBridge(bridge.replace(from, to))); rejected++;
}
console.log('PASS All original nested source guards,24 groups and mutation negatives preserved byte-for-byte');
for (const file of ['scripts/check-matchrim-consumer95-native-layout.ts', 'scripts/check-matchrim-comparison-target96.ts', 'scripts/matchrim-comparison-target96-scope.ts']) {
  const source=readFileSync(file,'utf8');assert.equal(restoreMenuResultsGuard96(file,source),old(file));
  assert.throws(()=>restoreMenuResultsGuard96(file,source.replace('assert.equal(', 'assert.notEqual(')));rejected++;
}
console.log('PASS Entire native-layout/comparison guard sources restored before all historical assertions');
for (const file of ['scripts/check-matchrim-scan-heading96.mjs', 'scripts/check-matchrim-cloud-snapshot.ts']) {
  const source = readFileSync(file, 'utf8'); assert.equal(restoreMenuResultsGuard96(file, source), old(file));
  const changed = source.replace('assert.equal(', 'assert.notEqual('); assert.notEqual(changed, source); assert.throws(() => restoreMenuResultsGuard96(file, changed)); rejected++;
}
assert.equal(restoreNativeScanPrivacy96(readFileSync('src/components/ScanPrivacyGate.tsx', 'utf8')), old('src/components/ScanPrivacyGate.tsx'));
console.log('PASS Named-heading/cloud protection retain all old assertions and protect complete privacy inverse');
const pkg = readFileSync('package.json', 'utf8'); assert.equal(restoreMenuResultsPackage96(pkg), old('package.json'));
assert.throws(() => restoreMenuResultsPackage96(pkg.replace('&& node --import tsx scripts/check-matchrim-recognition96.ts', ''))); rejected++;
console.log('PASS Exact four additive commands; every old command/dependency retained');
console.log(JSON.stringify({passed:6,failed:0,rejectedMutations:rejected,productFiles:3,guardFiles:7,originalNativeLayoutByteUnchanged:false,nativeLayoutWholeInverse:true,actualRuntimeUnprojected:true,externalCalls:0,SDK:false}));
