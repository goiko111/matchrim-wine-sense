import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass local region-edit-lock artifact directory');
const output = 'docs/qa-evidence/matchrim-region-edit-lock-2026-10-13';
const baseline = 'bc94dad29d05785e57b1b44af7f9e92b719c7e17';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(output, { recursive: true });
for (const name of ['before', 'before-final', 'after', 'after-final', 'checkpoint.md', 'command-receipts.json', 'tsconfig-tooling.json', 'contracts.json', 'contracts-initial.json', 'contracts-intermediate.json', 'contracts-diagnostic.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const contract = JSON.parse(readFileSync(join(output, 'contracts.json')));
assert.equal(contract.checks.length, 129); assert.ok(contract.checks.every(check => check.passed)); assert.equal(contract.actorVectors, 80);
const paths = ['src/components/wine-import/MultiWineLabelScanner.tsx', 'scripts/check-matchrim-region-edit-lock-oct13.ts', 'scripts/qa-matchrim-region-edit-lock-oct13.py', 'scripts/package-matchrim-region-edit-lock-oct13.mjs'];
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
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  assert.ok(old); assert.equal(hash(bytes), hash(old), 'Protected manifest drift');
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) assert.equal(hash(readFileSync(join(dirname(path), entry.path))), entry.sha256, 'Protected evidence drift');
  protectedEvidence.push({ name, entries: manifest.entries.length, sha256: hash(bytes), unchanged: true });
}
const ui = {}, all = {};
for (const [name, expectedContexts, expectedChecks, expectedPassed] of [['before', 4, 60, 36], ['before-final', 4, 60, 44], ['after', 4, 60, 60], ['after-final', 6, 94, 94]]) {
  const data = JSON.parse(readFileSync(join(output, name, 'results.json'))), checks = data.results.flatMap(result => result.checks);
  assert.equal(data.results.length, expectedContexts); assert.equal(checks.length, expectedChecks); assert.equal(checks.filter(check => check.passed).length, expectedPassed);
  for (const result of data.results) {
    assert.deepEqual(result.counts, { profile: 1, detect: 1, analyze: 4, search: 3 });
    assert.equal(result.errors.length, 0); assert.equal(result.console.length, 0);
    if (name.startsWith('after')) assert.ok(result.passed && result.checks.every(check => check.passed));
    if (name === 'before-final') assert.equal(result.observations.lostPendingDecision, true);
  }
  ui[name] = { contexts: expectedContexts, contextsPassed: data.results.filter(result => result.passed).length, checks: checks.length, checksPassed: expectedPassed }; all[name] = data;
}
const functionInputs = result => result.requests.filter(row => row.path.includes('/functions/v1/')).map(row => JSON.stringify(row)).sort();
for (const result of all['after-final'].results) {
  const before = all['before-final'].results.find(row => row.case === result.case || (result.case.startsWith('cancel-') && row.case === result.case.replace('cancel-', 'manual-')));
  assert.ok(before); assert.deepEqual(functionInputs(result), functionInputs(before), 'Payload/crop drift');
}
for (const name of ['before-final', 'after', 'after-final']) assert.equal(hash(readFileSync(join(output, 'before/scan-response-payloads.json'))), hash(readFileSync(join(output, name, 'scan-response-payloads.json'))));
const lint = spawnSync('./node_modules/.bin/eslint', [...paths.filter(path => !path.endsWith('.py')), '--format', 'json'], { encoding: 'utf8' });
assert.equal(lint.status, 0, lint.stdout + lint.stderr); const lintResults = JSON.parse(lint.stdout);
assert.ok(lintResults.every(result => !result.errorCount && !result.warningCount)); save('lint.json', lintResults);
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const buildFiles = walk('dist').sort().map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
save('web-build-manifest.json', { scope: 'Observed local web build exit0, no native copy or release/E2E recognition claim.', files: buildFiles });
save('source-stages.json', { baseline, stages, protectedSources: contract.protectedPaths.map(path => ({ path, sha256: contract.hashes[path], unchanged: true })), protectedEvidence, scope: 'Only loading guard/UI action lock/status. Complete scanner normalized AST unchanged otherwise; added-then-removed JSX blank line ignored.' });
save('primary.json', {
  baseline, ui, codeChecks: 129, syntheticActorVectors: 80, protectedSources: 46,
  realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0,
  scope: 'Six unique affected browser routes on one existing CC0 food-menu canary and exact local response contract; four repeated while adding cancellation cases, not extra users/scenes. Source guard actors are synthetic, not profiles or recommendations.',
  behavior: 'Inspection/navigation/close remain available; region mutations wait until ready or canceled. Post-ready corrections/discards persist; late canceled catalog data does not overwrite manual correction.',
  detectorScoringQueriesCropsUnchanged: true, unrelatedPriorSuitesRerun: false, nativeBuild: false, deploy: false, physicalVoiceOverCertification: false,
});
save('verification.json', { observedCommands: JSON.parse(readFileSync(join(output, 'command-receipts.json'))), ui, codeChecksPassed: 129, lint: { exitCode: 0, errors: 0, warnings: 0 }, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length });
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length; save('manifest.json', { entries, captures });
console.log(JSON.stringify({ ui, codeChecksPassed: 129, entries: entries.length, captures, protectedSources: 46, protectedEvidence: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), buildFiles: buildFiles.length }));
