import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const input = process.argv[2];
if (!input) throw Error('Pass16 artifact directory');
const output = 'docs/qa-evidence/matchrim-multi-stale-cancel-2026-10-13', baseline = '9fa4fca45b08cf2aec11098446806c2c5e7b2aed';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(output, { recursive: true });
for (const name of ['before', 'before-complete', 'before-final', 'after', 'checkpoint16.md', 'tsconfig-scoped.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const changed = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const scripts = ['scripts/check-matchrim-multi-stale-cancel-oct13.ts', 'scripts/qa-matchrim-multi-stale-cancel-oct13.py', 'scripts/package-matchrim-multi-stale-cancel-oct13.mjs'];
const run = (label, command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  writeFileSync(join(output, label + '-stdout.txt'), result.stdout || ''); writeFileSync(join(output, label + '-stderr.txt'), result.stderr || '');
  if (result.status !== 0) throw Error(label + ' failed: ' + (result.stderr || result.stdout));
  return { command: [command, ...args], exitCode: result.status };
};
const commands = {
  contracts: run('contracts', './node_modules/.bin/tsx', [scripts[0], join(output, 'contracts.json')]),
  typecheck: run('typecheck', './node_modules/.bin/tsc', ['--noEmit', '--project', join(output, 'tsconfig-scoped.json')]),
  lint: run('lint', './node_modules/.bin/eslint', [changed, scripts[0], scripts[2]]),
};
const contract = JSON.parse(readFileSync(join(output, 'contracts.json')));
if (contract.checks.length !== 47 || contract.checks.some(check => !check.passed)) throw Error('Contract47 not passing');
const previousSources = JSON.parse(readFileSync('docs/qa-evidence/matchrim-menu-ranking-cancel-2026-10-13/source-stages.json'));
const protectedPaths = [...new Set([
  ...Object.keys(contract.sourceHashes).filter(path => path !== changed && path !== scripts[0]),
  ...previousSources.stages.filter(stage => stage.protected && stage.path !== changed).map(stage => stage.path),
])].sort();
const stages = [];
for (const path of [changed, ...scripts, ...protectedPaths]) {
  const current = readFileSync(path), old = prior(path);
  if (protectedPaths.includes(path) && (!old || hash(current) !== hash(old))) throw Error('Protected source drift: ' + path);
  const destination = join(output, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, current);
  if (old) { const destination = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, old); }
  stages.push({ path, before: old ? hash(old) : null, after: hash(current), protected: protectedPaths.includes(path) });
}
const hashes = Object.fromEntries(stages.map(stage => [stage.path, stage.after]));
for (const [path, expected] of Object.entries(contract.sourceHashes)) if (hashes[path] !== expected) throw Error('Contract source hash differs: ' + path);
const corpusPaths = ['qa-fixtures/food-menu/commons-restaurant-menu-2026-08-25-2000.jpg', 'qa-fixtures/food-menu/ground-truth.json', 'scripts/qa-multi-wine-ui.py', 'scripts/qa-matchrim-label-save.py'];
const corpus = corpusPaths.map(path => {
  const bytes = readFileSync(path), old = prior(path);
  if (!old || hash(old) !== hash(bytes)) throw Error('Corpus/precedent changed: ' + path);
  return { path, sha256: hash(bytes), unchanged: true };
});
const protectedEvidence = [];
for (const name of [
  'matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12',
  'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13',
  'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13', 'matchrim-menu-reading-2026-10-13',
  'matchrim-menu-cancel-2026-10-13', 'matchrim-menu-ranking-cancel-2026-10-13',
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  if (!old || hash(old) !== hash(bytes)) throw Error('Prior manifest drift: ' + path);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Prior evidence drift: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const receipts = [], uiStages = {}, all = {};
const oldScannerHash = stages.find(stage => stage.path === changed).before;
for (const name of ['before', 'before-complete', 'before-final', 'after']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'input-provenance.json')));
  for (const [path, expected] of Object.entries(receipt.hashes)) if (expected !== (path === changed && name !== 'after' ? oldScannerHash : hash(readFileSync(path)))) throw Error('Stage/source/input drift: ' + name + ' ' + path);
  const responseBytes = readFileSync(join(output, name, 'response-payloads.json'));
  if (hash(responseBytes) !== receipt.responsePayloadSha256 || receipt.responsePayloadSha256 !== '883e66d2b5c3009115308bbf5fe0e088a73a6fcc940638048a53a45bdf209bd6') throw Error('Response contract drift');
  receipts.push({ name, hashes: receipt.hashes, responsePayloadSha256: receipt.responsePayloadSha256, finalHarnessSourceCorresponds: ['before-final', 'after'].includes(name) });
  const data = JSON.parse(readFileSync(join(output, name, 'results.json'))), checks = data.results.flatMap(result => result.checks);
  if (data.results.length !== 2 || checks.length !== 24) throw Error('Unexpected UI coverage: ' + name);
  for (const result of data.results) {
    if (result.checks.length !== 12 || result.errors.length || result.requestFailures.length) throw Error('Unexpected request/runtime failures');
    assert.deepEqual(result.countsByAttempt, { 1: { detect: 1, analyze: 4, search: 3, profile: 1 }, 2: { detect: 1, analyze: 4, search: 3, profile: 1 } });
    if (name === 'after' && (!result.passed || result.checks.some(check => !check.passed))) throw Error('After not passing');
    if (name === 'before-final' && (result.failures.length !== 1 || !result.failures[0].startsWith('Old completion cannot mark B cancelled'))) throw Error('Baseline defect differs');
    if (result.case === 'keyboard-portrait' && (result.console.length || result.warnings.length)) throw Error('Unexpected portrait diagnostics');
    if (result.case === 'touch-landscape' && (result.warnings.length !== 3 || result.console.length !== 3 ||
      result.warnings.some(text => !text.startsWith('[Winerim] findWinerimWineForLabel failed:')) ||
      result.console.some(text => !text.includes('503') || !text.includes('Failed to load resource')))) throw Error('503 control diagnostics differ');
  }
  uiStages[name] = { contexts: 2, contextsPassed: data.results.filter(result => result.passed).length, checks: 24, checksPassed: checks.filter(check => check.passed).length };
  all[name] = data;
}
const requestInputs = result => result.requests.filter(row => row.path.includes('/functions/v1/')).map(row => JSON.stringify({ method: row.method, path: row.path, attempt: row.attempt, body: row.body, sha256: row.requestBodySha256 })).sort();
const frozenRequests = all.after.results.map(result => {
  const before = all['before-final'].results.find(item => item.case === result.case);
  assert.deepEqual(requestInputs(result), requestInputs(before));
  return { case: result.case, actualInputHashesAndQueryBodiesFrozen: true, functionRequestsPerRoute: requestInputs(result).length, countsByAttempt: result.countsByAttempt };
});
save('source-stages.json', {
  baseline, productCodeChanged: true, stages, receipts, corpus, protectedEvidence,
  scope: 'Only current-controller guard on startScan AbortError phase publication. Existing immediate cancelScan and canonical background operations unchanged; no15 wrapper reuse.',
  initialHarnessLimits: 'before final ready test incorrectly assumed ARIA now100; before-complete corrected visual target but count freeze had Python int keys vs JSON string keys. Both initial receipts preserved. before-final on untouched product is corrected baseline22/24; final source snapshot matches before-final/after only.',
});
save('verification.json', {
  commands, uiStages, pureChecks: contract.checks.length, pureChecksPassed: contract.checks.filter(check => check.passed).length,
  fullSuites: false, priorGreenSuitesRerun: false, webBuild: false, nativeBuild: false,
  scope: 'Only16 local guard, two UI routes and focused controller/complete AST/protected-source checks. Not vision/provider/native/production certification.',
});
save('primary.json', {
  baseline, uiStages, pureChecks: 47, frozenRequests,
  scope: 'Exact existing MULTI deterministic contract and CC0 food-menu canary; not photo of5bottles, canonical wine ground-truth, precision/recall or user simulation.',
  cases: all.after.results.map(result => ({
    case: result.case, aCancelledWithCatalogHeld: result.observations.aCancelled, samePathSelections: result.observations.selections,
    newPending: result.observations.bPending, afterOldCompletion: result.observations.afterOld, final: result.observations.final,
    countsByAttempt: result.countsByAttempt, releases: result.releases, warnings: result.warnings,
    expected503ConsoleControl: result.observations.expected503ConsoleControl, requestFailures: result.requestFailures,
  })),
  realRemoteAppCalls: 0, realWrites: 0, paidCalls: 0, realAccounts: 0,
  embeddedFixtureFlag: false, realVisionRecognition: false, physicalSameFileCertification: false,
  catalogRequestCancellation: false, providerAbortOrCostSavings: false, realLearnedProfile: false,
  newEvidenceNotImplemented: 'Existing shared Progress visually determinate target but ARIA aria-valuenow null in pending and ready snapshots. Source consumes value without passing it to Radix Root. Separate scoped accessibility candidate, not physical reader failure or part16 patch; initial test expectation corrected, data retained. Immediate ready screenshot can show visual transition still running despite inline target100%.',
});
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
save('manifest.json', { entries, captures });
console.log(JSON.stringify({ uiStages, pureChecks: 47, entries: entries.length, captures, sources: stages.length,
  baselineSources: stages.filter(stage => stage.before).length, protectedSources: protectedPaths.length,
  protectedEvidence: protectedEvidence.reduce((sum, value) => sum + value.entries, 0), corpus: corpus.length, frozenRequests }));
