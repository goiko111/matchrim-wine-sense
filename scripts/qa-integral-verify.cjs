const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const workspace = path.resolve(__dirname, '..');
const root = path.resolve(workspace, '..');
const nativeApp = '/private/tmp/matchrim72-integral-local-ios/Build/Products/Release-iphonesimulator/App.app';
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const sha = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.isDirectory()
  ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const assets = walk(path.join(workspace, 'dist-delivery'));
let fakeHost = false;
for (const file of assets) {
  const relative = path.relative(path.join(workspace, 'dist-delivery'), file);
  const data = fs.readFileSync(file);
  assert(data.equals(fs.readFileSync(path.join(workspace, 'dist', relative))), `Web snapshot mismatch: ${relative}`);
  assert(data.equals(fs.readFileSync(path.join(nativeApp, 'public', relative))), `Native asset mismatch: ${relative}`);
  if (/\.(js|html|json)$/.test(file)) {
    const content = data.toString('utf8');
    fakeHost ||= content.includes('https://matchrim-integral.invalid');
    assert(!/https:\/\/[a-z0-9-]+\.supabase\.co/i.test(content), `Real Supabase host in ${relative}`);
  }
}
assert(fakeHost, 'Missing explicit fake backend');
const version = execFileSync('/usr/libexec/PlistBuddy', ['-c','Print :CFBundleVersion',path.join(nativeApp,'Info.plist')], {encoding:'utf8'}).trim();
assert.equal(version, '72');
const ipa = path.resolve(root, '../matchrim72/Matchrim-1.0-72-production-final.ipa');
const ipaSha = sha(fs.readFileSync(ipa));
assert.equal(ipaSha, '2d98a360f44ebfb16f7f569bb39baf7ae71f928c869c4e7f39bdaa69919c2caf');
const originalStatus = execFileSync('git', ['status','--short','--untracked-files=no'], {
  cwd:'/Users/GOIKO/2matchrim-release-integration-20260902', encoding:'utf8',
}).trim();
assert.equal(originalStatus, '');
execFileSync('git', ['apply','--check',path.join(root,'local-remediation.patch')], {cwd:'/private/tmp/matchrim72-production-candidate'});
const ui = read('ui/local-final/results.json');
const workflows = read('workflows/results.json');
const extended = read('extended-final/results.json');
const scanner = read('scanner-regressions/ui-qa-results.json');
assert.equal(ui.failed, 0);
for (const cases of [workflows,extended]) assert(cases.every(row => row.status === 'PASS'));
assert(scanner.every(row => String(row.actual).startsWith('PASS')));
const engine = read('simulation/local-fixed-report.json');
assert.equal(engine.failedRegressions, 0);
const sourceManifest = read('local-source-manifest.json');
assert(Object.values(sourceManifest.checks).every(check => check.found));
assert.equal(read('prototype-preview-check.json').guideVisible, true);
const report = {
  generatedAt: new Date().toISOString(), localPackagingStatus:'PASS', productReleaseGate:'NOT_APPROVED',
  baselineIpaUnchanged:true, baselineIpaSha256:ipaSha, originalTrackedWorktreeUnchanged:true,
  nativeLocalVersion:version, nativeLocalTarget:'unsigned simulator prototype; NOT TestFlight',
  comparedWebNativeAssets:assets.length, fakeBackendOnly:true, patchApplyCheck:'PASS',
  changedFiles:sourceManifest.changes.length,
  syntheticProfiles:engine.profiles, syntheticEvents:engine.events, engineAssertions:engine.invariantAssertions,
  localBrowserChecks:ui.total + workflows.length + extended.length + scanner.length,
  featureCoverage:read('coverage.json').counts,
  limits:'Incremental snapshots documented in REPORT.md. Fixtures and synthetic profiles do not certify real identity, RLS or human taste.',
};
fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
