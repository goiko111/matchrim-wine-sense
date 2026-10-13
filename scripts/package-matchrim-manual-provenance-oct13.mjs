import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass local hour artifact directory');
const output = 'docs/qa-evidence/matchrim-manual-provenance-2026-10-13';
const baseline = '6d9fcad4cf6aa4a936b6c50e056296e0c7b80bf1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(output, { recursive: true });
for (const name of ['manual-before', 'manual-after', 'manual-visual-initial', 'manual-after-visual', 'checkpoint.md', 'manual-receipts.json', 'manual-tooling.json', 'manual-contracts.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const contract = JSON.parse(readFileSync(join(output, 'manual-contracts.json')));
assert.equal(contract.checks.length, 112); assert.ok(contract.checks.every(check => check.passed));
const paths = [...contract.changed, 'scripts/check-matchrim-manual-provenance-oct13.ts', 'scripts/qa-matchrim-manual-provenance-oct13.py', 'scripts/package-matchrim-manual-provenance-oct13.mjs'];
const stages = [];
for (const path of paths) {
  const bytes = readFileSync(path), old = prior(path), destination = join(output, 'sources', path + '.txt');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes);
  if (old) { const destination = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, old); }
  stages.push({ path, before: old ? hash(old) : null, after: hash(bytes) });
}
for (const [path, expected] of Object.entries(contract.hashes)) assert.equal(hash(readFileSync(path)), expected, 'Checked source drift');
for (const path of contract.protectedPaths) assert.equal(hash(readFileSync(path)), hash(prior(path)), 'Protected source drift');
const protectedEvidence = [];
for (const name of [
  'matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12',
  'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13',
  'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13', 'matchrim-menu-reading-2026-10-13',
  'matchrim-menu-cancel-2026-10-13', 'matchrim-menu-ranking-cancel-2026-10-13', 'matchrim-multi-stale-cancel-2026-10-13',
  'matchrim-progress-a11y-2026-10-13', 'matchrim-region-counter-2026-10-13',
  'matchrim-region-edit-lock-2026-10-13',
  'matchrim-region-failure-2026-10-13',
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  assert.ok(old); assert.equal(hash(bytes), hash(old), 'Protected manifest drift');
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) assert.equal(hash(readFileSync(join(dirname(path), entry.path))), entry.sha256, 'Protected evidence drift');
  protectedEvidence.push({ name, entries: manifest.entries.length, sha256: hash(bytes), unchanged: true });
}
const ui = {}, all = {};
for (const [name, expectedContexts, expectedChecks, expectedPassed] of [['manual-before', 6, 66, 30], ['manual-after', 6, 66, 66], ['manual-after-visual', 6, 72, 72]]) {
  const data = JSON.parse(readFileSync(join(output, name, 'results.json'))), checks = data.results.flatMap(result => result.checks);
  assert.equal(data.results.length, expectedContexts); assert.equal(checks.length, expectedChecks); assert.equal(checks.filter(check => check.passed).length, expectedPassed);
  for (const result of data.results) {
    assert.equal(result.counts.profile, 1); assert.equal(result.counts.detect, 1); assert.equal(result.counts.search, 3);
    assert.equal(result.counts.analyze, 4); assert.equal(result.errors.length, 0); assert.equal(result.console.length, 0);
    if (name.startsWith('manual-after')) assert.ok(result.passed && result.checks.every(check => check.passed));
  }
  ui[name] = { contexts: expectedContexts, contextsPassed: data.results.filter(result => result.passed).length, checks: checks.length, checksPassed: expectedPassed }; all[name] = data;
}
const functionInputs = result => result.requests.filter(row => row.path.includes('/functions/v1/')).map(row => JSON.stringify(row)).sort();
for (const result of all['manual-after-visual'].results) {
  const before = all['manual-before'].results.find(row => row.case === result.case);
  assert.ok(before); assert.deepEqual(functionInputs(result), functionInputs(before), 'Payload/crop drift');
}
assert.equal(hash(readFileSync(join(output, 'manual-before/scan-response-payloads.json'))), hash(readFileSync(join(output, 'manual-after-visual/scan-response-payloads.json'))));
const lint = spawnSync('./node_modules/.bin/eslint', [...paths.filter(path => !path.endsWith('.py')), '--format', 'json'], { encoding: 'utf8' });
assert.equal(lint.status, 0, lint.stdout + lint.stderr); const lintResults = JSON.parse(lint.stdout);
assert.ok(lintResults.every(result => !result.errorCount && !result.warningCount)); save('lint.json', lintResults);
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const buildFiles = walk('dist').sort().map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
save('web-build-manifest.json', { scope: 'Observed local web build exit0, no native copy or release/E2E recognition claim.', files: buildFiles });
save('source-stages.json', { baseline, stages, protectedSources: contract.protectedPaths.map(path => ({ path, sha256: contract.hashes[path], unchanged: true })), protectedEvidence, scope: 'Trusted manual identity authority is a separate current-outcome category; UI does not call its operational confidence1 a model probability. Defaults and comparison ordering unchanged.' });
save('primary.json', {
  baseline, ui, codeChecks: 112, protectedSources: contract.protectedPaths.length,
  realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0,
  scope: 'Six manual/confirm/edit browser routes x2 orientations, same existing local vision contract/CC0 canary. Confirmation/create/edit are actual UI gestures, not positive model/user data. No corpus or learned-profile regeneration.',
  behavior: 'Detail/list/aiRIM/comparison label human review; current-outcome counter separates manual and automatic results. Internal confidence1 is still an existing operational human authority, not displayed as model certainty. No affinity/sort/price changes.',
  detectorScoringQueriesCropsUnchanged: true, unrelatedPriorSuitesRerun: false, nativeBuild: false, deploy: false, physicalVoiceOverCertification: false,
});
save('verification.json', { observedCommands: JSON.parse(readFileSync(join(output, 'manual-receipts.json'))), ui, codeChecksPassed: 112, lint: { exitCode: 0, errors: 0, warnings: 0 }, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length });
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length; save('manifest.json', { entries, captures });
console.log(JSON.stringify({ ui, codeChecksPassed: 112, entries: entries.length, captures, protectedSources: contract.protectedPaths.length, protectedEvidence: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length }));
