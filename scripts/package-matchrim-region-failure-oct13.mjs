import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass local hour artifact directory');
const output = 'docs/qa-evidence/matchrim-region-failure-2026-10-13';
const baseline = '485a2dc7fa0ea457cd026ba796796c4e58309d5a';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(output, { recursive: true });
for (const name of ['failure-before', 'failure-after-first', 'failure-after', 'checkpoint.md', 'failure-receipts.json', 'failure-tooling.json', 'failure-contracts.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const contract = JSON.parse(readFileSync(join(output, 'failure-contracts.json')));
assert.equal(contract.checks.length, 98); assert.ok(contract.checks.every(check => check.passed));
const paths = ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/regionAnalysisError.ts', 'scripts/check-matchrim-region-failure-oct13.ts', 'scripts/qa-matchrim-region-failure-oct13.py', 'scripts/package-matchrim-region-failure-oct13.mjs'];
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
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  assert.ok(old); assert.equal(hash(bytes), hash(old), 'Protected manifest drift');
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) assert.equal(hash(readFileSync(join(dirname(path), entry.path))), entry.sha256, 'Protected evidence drift');
  protectedEvidence.push({ name, entries: manifest.entries.length, sha256: hash(bytes), unchanged: true });
}
const ui = {}, all = {};
for (const [name, expectedContexts, expectedChecks, expectedPassed] of [['failure-before', 8, 104, 76], ['failure-after-first', 8, 104, 104], ['failure-after', 8, 112, 112]]) {
  const data = JSON.parse(readFileSync(join(output, name, 'results.json'))), checks = data.results.flatMap(result => result.checks);
  assert.equal(data.results.length, expectedContexts); assert.equal(checks.length, expectedChecks); assert.equal(checks.filter(check => check.passed).length, expectedPassed);
  for (const result of data.results) {
    assert.equal(result.counts.profile, 1); assert.equal(result.counts.detect, 1); assert.equal(result.counts.search, 3);
    assert.equal(result.counts.analyze, result.case.startsWith('initial-429') || result.case.startsWith('reanalysis-transport') ? 7 : 5);
    assert.equal(result.errors.length, 0);
    if (name.startsWith('failure-after')) assert.ok(result.passed && result.checks.every(check => check.passed));
  }
  ui[name] = { contexts: expectedContexts, contextsPassed: data.results.filter(result => result.passed).length, checks: checks.length, checksPassed: expectedPassed }; all[name] = data;
}
const functionInputs = result => result.requests.filter(row => row.path.includes('/functions/v1/')).map(row => JSON.stringify(row)).sort();
for (const result of all['failure-after'].results) {
  const before = all['failure-before'].results.find(row => row.case === result.case);
  assert.ok(before); assert.deepEqual(functionInputs(result), functionInputs(before), 'Payload/crop drift');
}
assert.equal(hash(readFileSync(join(output, 'failure-before/scan-response-payloads.json'))), hash(readFileSync(join(output, 'failure-after/scan-response-payloads.json'))));
const lint = spawnSync('./node_modules/.bin/eslint', [...paths.filter(path => !path.endsWith('.py')), '--format', 'json'], { encoding: 'utf8' });
assert.equal(lint.status, 0, lint.stdout + lint.stderr); const lintResults = JSON.parse(lint.stdout);
assert.ok(lintResults.every(result => !result.errorCount && !result.warningCount)); save('lint.json', lintResults);
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const buildFiles = walk('dist').sort().map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
save('web-build-manifest.json', { scope: 'Observed local web build exit0, no native copy or release/E2E recognition claim.', files: buildFiles });
save('source-stages.json', { baseline, stages, protectedSources: contract.protectedPaths.map(path => ({ path, sha256: contract.hashes[path], unchanged: true })), protectedEvidence, scope: 'Only safe region error presentation and explicit-correction clearing. Pipeline function bodies checked unchanged except error assignment; retry/crop/model/cancel/save untouched.' });
save('primary.json', {
  baseline, ui, codeChecks: 98, protectedSources: 46,
  realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0,
  scope: 'Eight affected browser error/recovery routes on one existing CC0 food-menu canary and exact local vision responses. HTTP400/429 and transport failures are deliberate protocol faults, not live provider results. No corpus/model/profile regeneration.',
  behavior: 'Failure is not unreadability. Previous candidates retained and marked not updated. Safe message does not expose raw provider detail. Explicit edit clears stale failure; region-only retry follows unchanged budgets.',
  detectorScoringQueriesCropsUnchanged: true, unrelatedPriorSuitesRerun: false, nativeBuild: false, deploy: false, physicalVoiceOverCertification: false,
});
save('verification.json', { observedCommands: JSON.parse(readFileSync(join(output, 'failure-receipts.json'))), ui, codeChecksPassed: 98, lint: { exitCode: 0, errors: 0, warnings: 0 }, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length });
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length; save('manifest.json', { entries, captures });
console.log(JSON.stringify({ ui, codeChecksPassed: 98, entries: entries.length, captures, protectedSources: 46, protectedEvidence: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length }));
