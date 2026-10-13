import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass11 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-focus-2026-10-13', baseline = '30df48aa21a3771a26c9a03aca63b02e8bb899f0';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
mkdirSync(output, { recursive: true });
for (const name of ['before', 'after', 'checkpoint11.md', 'tsconfig-scoped.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const product = ['src/components/wine-import/WineMenuScanner.tsx'];
const scripts = ['scripts/check-matchrim-menu-focus-oct13.ts', 'scripts/qa-matchrim-menu-focus-oct13.py', 'scripts/package-matchrim-menu-focus-oct13.mjs'];
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
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12', 'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path);
  if (hash(bytes) !== hash(prior(path))) throw Error('Protected manifest drift: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const verification = [];
for (const [name, binary, args] of [
  ['contracts', 'tsx', ['scripts/check-matchrim-menu-focus-oct13.ts', join(output, 'contracts.json')]],
  ['typecheck-scoped', 'tsc', ['--project', join(output, 'tsconfig-scoped.json')]],
  ['lint-scoped', 'eslint', [...product, ...scripts.filter(path => !path.endsWith('.py'))]],
]) {
  const result = spawnSync('node_modules/.bin/' + binary, args, { encoding: 'utf8' });
  writeFileSync(join(output, name + '.stdout.txt'), result.stdout ?? ''); writeFileSync(join(output, name + '.stderr.txt'), result.stderr ?? '');
  verification.push({ name, command: ['node_modules/.bin/' + binary, ...args], exitCode: result.status });
  if (result.status !== 0) throw Error('Only11 verification failed: ' + name);
}
const contracts = JSON.parse(readFileSync(join(output, 'contracts.json')));
for (const [path, expected] of Object.entries(contracts.sourceHashes)) if (hash(readFileSync(path)) !== expected) throw Error('Contract source drift: ' + path);
const observations = {};
for (const name of ['before', 'after']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'input-provenance.json'))), results = JSON.parse(readFileSync(join(output, name, 'results.json'))).results;
  for (const [path, expected] of Object.entries(receipt.hashes)) if (path !== product[0] && hash(readFileSync(path)) !== expected) throw Error('Fixture/global source drift: ' + path);
  const expected = name === 'before' ? hash(prior(product[0])) : hash(readFileSync(product[0]));
  if (receipt.hashes[product[0]] !== expected) throw Error('UI source-stage mismatch: ' + name);
  if (results.length !== 12 || results.some(r => r.counters.ocr !== 1 || r.counters.canonical !== 1 || r.counters.base !== 1 || r.errors.length || r.console.length)) throw Error('Focus UI count/errors mismatch: ' + name);
  if (name === 'after' && results.some(r => !r.passed || r.checks.some(c => !c.passed) || !r.observations.settled.inDialog || !r.observations.escapeReturned || !r.observations.closeReturned)) throw Error('Focus UI11 failed');
  observations[name] = { scannerSha256: receipt.hashes[product[0]], contexts: results.length, contextsPassed: results.filter(r => r.passed).length, checks: results.flatMap(r => r.checks).length, checksPassed: results.flatMap(r => r.checks).filter(c => c.passed).length,
    cases: results.map(r => ({ case: r.case, method: r.observations.trigger.method, immediate: r.observations.immediate.active, settled: r.observations.settled.active, inDialog: r.observations.settled.inDialog, firstTab: r.observations.firstTab.active, firstShiftTab: r.observations.firstShiftTab.active, escapeReturned: r.observations.escapeReturned, closeReturned: r.observations.closeReturned, scroll: { opened: r.observations.settled.scroll, escaped: r.observations.afterEscape.scroll, reopened: r.observations.reopenSettled.scroll, closed: r.observations.afterClose.scroll }, counters: r.counters })) };
}
const installedPaths = ['node_modules/vaul/dist/index.d.ts', 'node_modules/vaul/dist/index.mjs', 'node_modules/@radix-ui/react-dialog/dist/index.mjs', 'node_modules/@radix-ui/react-focus-scope/dist/index.mjs'];
const installed = installedPaths.map(path => { const bytes = readFileSync(path), destination = join(output, 'installed-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes); return { path, sha256: hash(bytes) }; });
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, stages, installed, protectedEvidence, observations, note: 'Before15 checks/case; after16 adds initiating-event scroll captured passively. Actual Tab/tap only; no locator.focus or injected focus. Scope lifecycle/owner checks pure refs/AST; no hardware/canonical truth. No old green suites/builds rerun. Local implementation ready; acceptance pending coordinator review.' }, null, 2) + '\n');
writeFileSync(join(output, 'verification.json'), JSON.stringify({ checks: verification, fullSuites: false, webBuild: false, nativeBuild: false, coordinatorAcceptance: 'pending' }, null, 2) + '\n');
writeFileSync(join(output, 'primary.json'), JSON.stringify({ scope: 'Only11: same one-scene local replay, row/pin x Enter/Space/tap x two orientations. Not twelve people/scenes or iOS/VoiceOver; no positive profile/catalog/provider call. Guard tests pure refs, not real owner switch/batch UI. Local result awaits coordinator acceptance.', ...observations.after, contracts: contracts.checks.length, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0 }, null, 2) + '\n');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures }, null, 2) + '\n');
console.log(JSON.stringify({ contexts: observations.after.contexts, checks: observations.after.checks, contracts: contracts.checks.length, entries: entries.length, captures, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((total, item) => total + item.entries, 0) }));
