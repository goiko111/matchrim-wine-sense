import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass10 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-notice-2026-10-13';
const baseline = '0156df365f3e547d303d5cc25bb9fc841d30a98d';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
mkdirSync(output, { recursive: true });
for (const name of ['before', 'after', 'after-pin', 'after-final', 'checkpoint10.md', 'tsconfig-scoped.json', 'verification-first.json']) cpSync(join(input, name), join(output, name), { recursive: true });
cpSync(join(input, 'contracts.json'), join(output, 'contracts-first.json'));
cpSync(join(input, 'contracts-final.json'), join(output, 'contracts-intermediate.json'));
const product = ['src/components/wine-import/WineMenuScanner.tsx'];
const scripts = ['scripts/check-matchrim-menu-notice-oct13.ts', 'scripts/qa-matchrim-menu-notice-oct13.py', 'scripts/package-matchrim-menu-notice-oct13.mjs'];
const protectedPaths = [
  'src/components/AccountNotifications.tsx', 'src/components/ui/sonner.tsx', 'src/components/ui/drawer.tsx',
  'src/utils/aiRimContextGuide.ts', 'src/components/AiRimContextGuide.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx',
  'src/utils/menuAffinityPresentation.ts', 'src/utils/menuWineSave.ts', 'src/utils/menuWineActions.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/multiWineScan.ts',
  'src/utils/wineAffinityExplanation.ts', 'src/utils/matchrimLearning.ts', 'src/contexts/AuthContext.tsx',
  'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx',
  'supabase/functions/_shared/matchrim-scan-values.ts',
];
const stages = [];
for (const path of [...product, ...scripts, ...protectedPaths]) {
  const current = readFileSync(path), old = prior(path);
  if (protectedPaths.includes(path) && (!old || hash(current) !== hash(old))) throw Error('Protected source drift: ' + path);
  const destination = join(output, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, current);
  if (old) { const before = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, old); }
  stages.push({ path, before: old ? hash(old) : null, after: hash(current), protected: protectedPaths.includes(path) });
}
const protectedEvidence = [];
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12', 'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path);
  if (hash(bytes) !== hash(prior(path))) throw Error('Protected manifest drift: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const verification = [];
for (const [name, binary, args] of [
  ['contracts', 'tsx', ['scripts/check-matchrim-menu-notice-oct13.ts', join(output, 'contracts.json')]],
  ['typecheck-scoped', 'tsc', ['--project', join(output, 'tsconfig-scoped.json')]],
  ['lint-scoped', 'eslint', [...product, ...scripts.filter(path => !path.endsWith('.py'))]],
]) {
  const result = spawnSync('node_modules/.bin/' + binary, args, { encoding: 'utf8' });
  writeFileSync(join(output, name + '.stdout.txt'), result.stdout ?? ''); writeFileSync(join(output, name + '.stderr.txt'), result.stderr ?? '');
  verification.push({ name, command: ['node_modules/.bin/' + binary, ...args], exitCode: result.status });
  if (result.status !== 0) throw Error('Only10 verification failed: ' + name);
}
const contracts = JSON.parse(readFileSync(join(output, 'contracts.json')));
for (const [path, expected] of Object.entries(contracts.sourceHashes)) if (hash(readFileSync(path)) !== expected) throw Error('Contract source drift: ' + path);
const observations = {};
for (const name of ['before', 'after', 'after-pin', 'after-final']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'input-provenance.json')));
  const results = JSON.parse(readFileSync(join(output, name, 'results.json'))).results;
  for (const [path, expected] of Object.entries(receipt.hashes)) if (path !== product[0] && hash(readFileSync(path)) !== expected) throw Error('UI fixture/global source drift: ' + path);
  if (name === 'before' && receipt.hashes[product[0]] !== hash(prior(product[0]))) throw Error('Before source mismatch');
  if (name === 'after-final' && receipt.hashes[product[0]] !== hash(readFileSync(product[0]))) throw Error('Final source mismatch');
  if (results.length !== (name === 'after-final' ? 4 : 2) || results.some(r => r.counters.ocr !== 1 || r.counters.canonical !== 1 || r.counters.base !== 1 || r.errors.length || r.console.length)) throw Error('UI contexts/counters mismatch: ' + name);
  if (name !== 'before' && results.some(r => !r.passed || r.checks.some(c => !c.passed) || r.observations.row.headerOverlap !== 0 || r.observations.row.toastAge >= 3500)) throw Error('UI10 visibility failed: ' + name);
  observations[name] = { scannerSha256: receipt.hashes[product[0]], contexts: results.length, contextsPassed: results.filter(r => r.passed).length, checks: results.flatMap(r => r.checks).length, checksPassed: results.flatMap(r => r.checks).filter(c => c.passed).length,
    geometry: results.map(r => ({ case: r.case, headerOverlap: r.observations.row.headerOverlap, titleOverlap: r.observations.row.titleOverlap, titleHit: r.observations.row.titleHit.reaches, closeHit: r.observations.row.closeHit.reaches, toastAgeMs: r.observations.row.toastAge, initialFocus: r.observations.row.focus, tabFocus: r.observations.tabFocus, dismissAudit: r.observations.dismissAfterRow, counters: r.counters })) };
}
const installed = 'node_modules/sonner/dist/index.d.ts';
const installedBytes = readFileSync(installed); mkdirSync(join(output, 'installed-types'), { recursive: true }); writeFileSync(join(output, 'installed-types/sonner-index.d.ts.txt'), installedBytes);
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, stages, protectedEvidence, observations, installedTypes: { path: installed, sha256: hash(installedBytes), version: JSON.parse(readFileSync('node_modules/sonner/package.json')).version }, note: 'Intermediate product identified by source receipts, full intermediate snapshot not retained. Final hook captures same ref object to remove lint warning. Before second path fell back to row; final pins use exact existing Vino1 selector. Four-context Chrome close was delayed, eventually exited0 with receipts; no rerun needed.' }, null, 2) + '\n');
writeFileSync(join(output, 'verification.json'), JSON.stringify({ checks: verification, fullSuites: false, webBuild: false, nativeBuild: false }, null, 2) + '\n');
writeFileSync(join(output, 'primary.json'), JSON.stringify({ scope: 'Only10: row/pin x two mobile orientations, same local replay, not four people/new scenes. Foreign warning is explicit synthetic queue control. Lifecycle/PDF/owner controls are pure refs/AST, not real PDF or account-switch UI. Initial focus is recorded, Tab checked after explicit close focus, not automatic screen-reader focus certification.', ...observations['after-final'], contracts: contracts.checks.length, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0 }, null, 2) + '\n');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures }, null, 2) + '\n');
console.log(JSON.stringify({ contexts: observations['after-final'].contexts, checks: observations['after-final'].checks, contracts: contracts.checks.length, entries: entries.length, captures, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((total, item) => total + item.entries, 0) }));
