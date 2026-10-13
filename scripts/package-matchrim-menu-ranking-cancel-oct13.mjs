import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass15 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-ranking-cancel-2026-10-13';
const baseline = '1c8c8805a368c211895b89e69c0f3313befbd771';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => {
  const result = spawnSync('git', ['show', baseline + ':' + path]);
  return result.status === 0 ? result.stdout : null;
};
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
const protectedPaths = [
  'src/components/AccountNotifications.tsx', 'src/components/ui/sonner.tsx', 'src/components/ui/drawer.tsx',
  'src/utils/aiRimContextGuide.ts', 'src/components/AiRimContextGuide.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx',
  'src/utils/menuAffinityPresentation.ts', 'src/utils/menuWineSave.ts', 'src/utils/menuWineActions.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/multiWineScan.ts',
  'src/utils/wineAffinityExplanation.ts', 'src/utils/matchrimLearning.ts', 'src/contexts/AuthContext.tsx',
  'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx',
  'supabase/functions/_shared/matchrim-scan-values.ts', 'src/services/winerimApi.ts', 'src/utils/invokeEdgeFunction.ts',
];
const changedPaths = ['src/components/wine-import/WineMenuScanner.tsx', 'src/utils/menuCatalogAwait.ts'];
const scripts = [
  'scripts/qa-matchrim-menu-ranking-cancel-oct13.py',
  'scripts/check-matchrim-menu-ranking-cancel-oct13.ts',
  'scripts/package-matchrim-menu-ranking-cancel-oct13.mjs',
];
mkdirSync(output, { recursive: true });
for (const name of ['before', 'before-complete', 'after', 'checkpoint15.md', 'tsconfig-scoped.json', 'contracts-initial.json']) {
  cpSync(join(input, name), join(output, name), { recursive: true });
}
const run = (label, command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  writeFileSync(join(output, label + '-stdout.txt'), result.stdout || '');
  writeFileSync(join(output, label + '-stderr.txt'), result.stderr || '');
  if (result.status !== 0) throw Error(label + ' failed: ' + (result.stderr || result.stdout));
  return { command: [command, ...args], exitCode: result.status };
};
const commands = {
  contracts: run('contracts', './node_modules/.bin/tsx', ['scripts/check-matchrim-menu-ranking-cancel-oct13.ts', join(output, 'contracts.json')]),
  typecheck: run('typecheck', './node_modules/.bin/tsc', ['--noEmit', '--project', join(output, 'tsconfig-scoped.json')]),
  lint: run('lint', './node_modules/.bin/eslint', [
    ...changedPaths, 'scripts/check-matchrim-menu-ranking-cancel-oct13.ts', 'scripts/package-matchrim-menu-ranking-cancel-oct13.mjs',
  ]),
};
const stages = [];
for (const path of [...changedPaths, ...scripts, ...protectedPaths]) {
  const current = readFileSync(path), old = prior(path);
  if (protectedPaths.includes(path) && (!old || hash(current) !== hash(old))) throw Error('Protected source drift: ' + path);
  const destination = join(output, 'sources', path + '.txt');
  mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, current);
  if (old) {
    const destination = join(output, 'baseline-sources', path + '.txt');
    mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, old);
  }
  stages.push({ path, before: old ? hash(old) : null, after: hash(current), protected: protectedPaths.includes(path) });
}
const protectedEvidence = [];
for (const name of [
  'matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12',
  'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13',
  'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13', 'matchrim-menu-reading-2026-10-13',
  'matchrim-menu-cancel-2026-10-13',
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  if (!old || hash(bytes) !== hash(old)) throw Error('Protected manifest drift: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) {
    if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift: ' + entry.path);
  }
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const scanner = changedPaths[0], actualHashes = Object.fromEntries(stages.map(stage => [stage.path, stage.after]));
const oldScannerHash = stages.find(stage => stage.path === scanner).before;
const receipts = [];
const uiStages = {};
for (const name of ['before', 'before-complete', 'after']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'input-provenance.json')));
  for (const [path, expected] of Object.entries(receipt.hashes)) {
    const expectedStage = path === scanner && name !== 'after' ? oldScannerHash : hash(readFileSync(path));
    if (expected !== expectedStage) throw Error('UI source/input-stage drift: ' + name + ' ' + path);
  }
  receipts.push({ stage: name, hashes: receipt.hashes, harnessSourceMatchesFinalSnapshot: name !== 'before' });
  const data = JSON.parse(readFileSync(join(output, name, 'results.json')));
  const checks = data.results.flatMap(result => result.checks);
  if (data.results.length !== 2 || checks.length !== 24) throw Error('Unexpected UI coverage: ' + name);
  for (const result of data.results) {
    if (result.checks.length !== 12 || result.errors.length || result.requestFailures.length) throw Error('Unexpected request/runtime failure: ' + name);
    if (JSON.stringify(result.countsByAttempt) !== JSON.stringify({ 1: { ocr: 3, canonical: 2, base: 1 }, 2: { ocr: 3, canonical: 2, base: 1 } })) throw Error('Request plan drift');
    if (name === 'after' && (!result.passed || result.checks.some(check => !check.passed) || result.observations.oldReleaseNeededForUI)) throw Error('After not passing independently of old catalog');
    if (name !== 'after' && (result.failures.length !== 1 || !result.failures[0].startsWith('UI recovers while catalog'))) throw Error('Baseline defect differs');
    if (name === 'after' && result.observations.final.rows.length !== 4) throw Error('Final candidate count differs');
    if (result.case === 'keyboard-portrait' && (result.console.length || result.warnings.length)) throw Error('Unexpected portrait diagnostics');
    if (result.case === 'touch-landscape' && (result.warnings.length !== 2 || result.console.length !== 2 ||
      result.console.some(text => !text.includes('503') || !text.includes('Failed to load resource')) ||
      result.warnings.some(text => !text.startsWith('[Winerim] findWinerimWineForLabel failed:')))) throw Error('503 control diagnostics differ');
  }
  uiStages[name] = { contexts: 2, contextsPassed: data.results.filter(result => result.passed).length, checks: checks.length, checksPassed: checks.filter(check => check.passed).length };
}
const contract = JSON.parse(readFileSync(join(output, 'contracts.json')));
if (contract.checks.length !== 25 || contract.checks.some(check => !check.passed)) throw Error('Pure contract not passing');
for (const [path, expected] of Object.entries(contract.sourceHashes)) if (expected !== actualHashes[path]) throw Error('Contract source drift: ' + path);
const after = JSON.parse(readFileSync(join(output, 'after/results.json')));
const cases = after.results.map(result => {
  const sample = result.observations.cancelSamplesWhileCatalogHeld.at(-1).state;
  return {
    case: result.case, uiRecoveryMs: sample.recoveryAt - sample.cancelAt,
    samplesWhileCatalogHeld: result.observations.cancelSamplesWhileCatalogHeld,
    oldReleaseNeededForUI: result.observations.oldReleaseNeededForUI,
    countsByAttempt: result.countsByAttempt, requestFailures: result.requestFailures,
    releases: result.releases, warnings: result.warnings, expected503ConsoleControl: result.observations.expected503ConsoleControl,
    newRankingPending: result.observations.newRankingPending,
    afterOldLateCompletion: result.observations.afterOldLateCompletion, final: result.observations.final,
  };
});
save('source-stages.json', {
  baseline, productCodeChanged: true, stages, receipts, protectedEvidence,
  scope: 'Only scanner-owned cancellable result wait and current-controller cancellation feedback; catalog helper/query/SDK remains byte-identical.',
  initialHarnessRefinement: 'Initial before has a tautological network observation. Before-complete adds held-request/no-requestfailure predicate and passive UI-recovery timestamp before any product edit. Final harness snapshot applies to before-complete/after, not reconstructed initial script.',
  initialContractRefinement: 'Initial contract24/25 excluded processFile by declaration name but not its descendants; normalizedWines includes the intended change. Final excludes all descendants and full process AST equivalence guard still validates only intended delta. Initial script not snapshotted; initial result source hash retained.',
});
save('verification.json', {
  commands, uiStages, pureChecks: contract.checks.length, pureChecksPassed: 25,
  fullSuites: false, webBuild: false, nativeBuild: false, previousSuitesRerun: false,
  scope: 'Scoped local change checks only. No current full-app, recognition-provider, Apple/iOS or production certification.',
});
save('primary.json', {
  baseline, uiStages, pureChecks: 25, cases, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0,
  scope: 'One existing scene and exact unchanged four-candidate BOTH replay, two browser input/orientation routes, not humans or real recognition.',
  catalogRequestCancellation: false, serverProviderCancellation: false, costSavingsClaim: false,
  localRecoveryLatencyIsProductionSLA: false, physicalSameFileCertification: false,
  profile: 'Local GET null; no learned positive profile/score/canonical identification generated.',
});
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
save('manifest.json', { entries, captures });
console.log(JSON.stringify({
  uiStages, pureChecks: 25, entries: entries.length, captures,
  sources: stages.length, baselineSources: stages.filter(stage => stage.before).length,
  protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((sum, value) => sum + value.entries, 0),
}));
