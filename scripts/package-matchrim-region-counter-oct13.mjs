import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass local region-counter artifact directory');
const output = 'docs/qa-evidence/matchrim-region-counter-2026-10-13';
const baseline = 'cdcbbc472c88353768d5a1490038a266bcc9a986';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(output, { recursive: true });
for (const name of ['before', 'after', 'checkpoint.md', 'command-receipts.json', 'tsconfig-tooling.json', 'contracts.json', 'contracts-initial.json', 'contracts-intermediate.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const contract = JSON.parse(readFileSync(join(output, 'contracts.json')));
assert.equal(contract.checks.length, 128);
assert.ok(contract.checks.every(check => check.passed));
assert.equal(contract.cases.length, 27);
const paths = ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/scanRegionProgress.ts', 'scripts/check-matchrim-region-counter-oct13.ts', 'scripts/qa-matchrim-region-counter-oct13.py', 'scripts/package-matchrim-region-counter-oct13.mjs'];
const stages = [];
for (const path of paths) {
  const bytes = readFileSync(path), old = prior(path);
  const destination = join(output, 'sources', path + '.txt');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes);
  if (old) { const destination = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, old); }
  stages.push({ path, before: old ? hash(old) : null, after: hash(bytes) });
}
for (const [path, expected] of Object.entries(contract.sourceHashes)) assert.equal(hash(readFileSync(path)), expected, 'Checked source drift: ' + path);
for (const path of contract.protectedPaths) assert.equal(hash(readFileSync(path)), hash(prior(path)), 'Protected source drift: ' + path);
const protectedEvidence = [];
for (const name of [
  'matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12',
  'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13',
  'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13', 'matchrim-menu-reading-2026-10-13',
  'matchrim-menu-cancel-2026-10-13', 'matchrim-menu-ranking-cancel-2026-10-13', 'matchrim-multi-stale-cancel-2026-10-13',
  'matchrim-progress-a11y-2026-10-13',
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  assert.ok(old); assert.equal(hash(bytes), hash(old), 'Protected manifest drift');
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) assert.equal(hash(readFileSync(join(dirname(path), entry.path))), entry.sha256, 'Protected evidence drift');
  protectedEvidence.push({ name, entries: manifest.entries.length, sha256: hash(bytes), unchanged: true });
}
const ui = {}, all = {};
for (const name of ['before', 'after']) {
  const data = JSON.parse(readFileSync(join(output, name, 'results.json'))), checks = data.results.flatMap(result => result.checks);
  assert.equal(data.results.length, 2); assert.equal(checks.length, 26);
  for (const result of data.results) {
    assert.deepEqual(result.counts, { profile: 1, detect: 1, analyze: 4, search: 3 });
    assert.equal(result.errors.length, 0); assert.equal(result.console.length, 0);
    if (name === 'after') assert.ok(result.passed && result.checks.every(check => check.passed));
  }
  ui[name] = { contexts: 2, contextsPassed: data.results.filter(result => result.passed).length, checks: checks.length, checksPassed: checks.filter(check => check.passed).length };
  all[name] = data;
}
const functionInputs = result => result.requests.filter(row => row.path.includes('/functions/v1/')).map(row => JSON.stringify(row)).sort();
for (const result of all.after.results) assert.deepEqual(functionInputs(result), functionInputs(all.before.results.find(row => row.case === result.case)), 'Payload/crop drift');
assert.equal(hash(readFileSync(join(output, 'before/scan-response-payloads.json'))), hash(readFileSync(join(output, 'after/scan-response-payloads.json'))));
const lintPaths = paths.filter(path => !path.endsWith('.py'));
const lint = spawnSync('./node_modules/.bin/eslint', [...lintPaths, '--format', 'json'], { encoding: 'utf8' });
assert.equal(lint.status, 0, lint.stdout + lint.stderr);
const lintResults = JSON.parse(lint.stdout);
assert.ok(lintResults.every(result => !result.errorCount && !result.warningCount));
save('lint.json', lintResults);
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const buildFiles = walk('dist').sort().map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
save('web-build-manifest.json', { scope: 'Actual local npm run build exit0. No native copy, publication or model E2E claim.', files: buildFiles });
save('source-stages.json', { baseline, stages, protectedSources: contract.protectedPaths.map(path => ({ path, sha256: contract.sourceHashes[path], unchanged: true })), protectedEvidence, scope: 'Only derived progress presentation; scanner outside the exact counter normalized AST unchanged.' });
save('primary.json', {
  baseline, ui, pureAndProtectionChecks: 128, stateVectors: 27, protectedSources: contract.protectedPaths.length,
  realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0,
  scope: 'Two real-client browser gallery scans with exact existing local response stubs. Original CC0 food-menu image only preprocessing canary; not wine identity or recall evidence. Polite DOM status semantics, not VoiceOver/native certification.',
  meaning: 'Analyzed includes recognized/uncertain/unrecognized outcomes without request error; not identification success. Deferred, failed, queued, active and discarded never inflate it.',
  detectorScoringQueriesCropsUnchanged: true, previousSuitesRerun: false, nativeBuild: false, deploy: false,
});
save('verification.json', { observedCommands: JSON.parse(readFileSync(join(output, 'command-receipts.json'))), ui, checksPassed: 128, lint: { exitCode: 0, errors: 0, warnings: 0 }, priorEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length });
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
save('manifest.json', { entries, captures });
console.log(JSON.stringify({ ui, checksPassed: 128, stateVectors: 27, entries: entries.length, captures, protectedSources: contract.protectedPaths.length, protectedEvidence: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length }));
