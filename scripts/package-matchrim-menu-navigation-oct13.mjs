import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass12 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-navigation-2026-10-13', baseline = '7a3171bb753f0b64a1f5b46813e1c1a7f65f50de';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
mkdirSync(output, { recursive: true });
for (const name of ['before', 'before-complete', 'after', 'checkpoint12.md', 'tsconfig-scoped.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const product = ['src/components/wine-import/WineMenuScanner.tsx'];
const scripts = ['scripts/check-matchrim-menu-navigation-oct13.ts', 'scripts/qa-matchrim-menu-navigation-oct13.py', 'scripts/package-matchrim-menu-navigation-oct13.mjs'];
const protectedPaths = [
  'src/components/AccountNotifications.tsx', 'src/components/ui/sonner.tsx', 'src/components/ui/drawer.tsx',
  'src/utils/aiRimContextGuide.ts', 'src/components/AiRimContextGuide.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx',
  'src/utils/menuAffinityPresentation.ts', 'src/utils/menuWineSave.ts', 'src/utils/menuWineActions.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/multiWineScan.ts',
  'src/utils/wineAffinityExplanation.ts', 'src/utils/matchrimLearning.ts', 'src/contexts/AuthContext.tsx',
  'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx',
  'supabase/functions/_shared/matchrim-scan-values.ts', 'src/services/winerimApi.ts',
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
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12', 'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13', 'matchrim-menu-focus-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path);
  if (hash(bytes) !== hash(prior(path))) throw Error('Protected manifest drift: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const verification = [];
for (const [name, binary, args] of [
  ['contracts', 'tsx', ['scripts/check-matchrim-menu-navigation-oct13.ts', join(output, 'contracts.json')]],
  ['typecheck-scoped', 'tsc', ['--project', join(output, 'tsconfig-scoped.json')]],
  ['lint-scoped', 'eslint', [...product, ...scripts.filter(path => !path.endsWith('.py'))]],
]) {
  const result = spawnSync('node_modules/.bin/' + binary, args, { encoding: 'utf8' });
  writeFileSync(join(output, name + '.stdout.txt'), result.stdout ?? ''); writeFileSync(join(output, name + '.stderr.txt'), result.stderr ?? '');
  verification.push({ name, command: ['node_modules/.bin/' + binary, ...args], exitCode: result.status });
  if (result.status !== 0) throw Error('Only12 verification failed: ' + name);
}
const contracts = JSON.parse(readFileSync(join(output, 'contracts.json')));
for (const [path, expected] of Object.entries(contracts.sourceHashes)) if (hash(readFileSync(path)) !== expected) throw Error('Contract source drift: ' + path);
const observations = {};
for (const name of ['before', 'before-complete', 'after']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'input-provenance.json'))), results = JSON.parse(readFileSync(join(output, name, 'results.json'))).results;
  for (const [path, expected] of Object.entries(receipt.hashes)) if (path !== product[0] && hash(readFileSync(path)) !== expected) throw Error('Immutable fixture drift: ' + path);
  if (receipt.hashes[product[0]] !== (name === 'after' ? hash(readFileSync(product[0])) : hash(prior(product[0])))) throw Error('UI source-stage mismatch: ' + name);
  if (results.length !== 8 || results.some(r => r.counters.ocr !== 3 || r.counters.canonical !== 2 || r.counters.base !== 1 || r.errors.length || r.console.length)) throw Error('UI real initial counts/error mismatch: ' + name);
  if (name === 'after' && results.some(r => !r.passed || r.checks.some(c => !c.passed))) throw Error('Multi-fiche UI12 failed');
  observations[name] = { scannerSha256: receipt.hashes[product[0]], contexts: results.length, contextsPassed: results.filter(r => r.passed).length, checks: results.flatMap(r => r.checks).length, checksPassed: results.flatMap(r => r.checks).filter(c => c.passed).length, cases: results.map(r => ({
    case: r.case, originalTrigger: r.observations.originalTrigger, runtimeRows: r.observations.runtimeRows, runtimePins: r.observations.runtimePins,
    initial: r.observations.initial ?? null,
    transitions: r.observations.transitions?.map(t => ({ destination: t.destination, direction: t.direction, title: t.settled.title, active: t.settled.active, inDialog: t.settled.inDialog, sameDialog: t.settled.sameDialog, scroll: t.settled.scroll })) ?? [],
    originalReturn: r.observations.escapeReturn?.exact ?? null, alternateReturn: r.observations.alternateReturn?.exact ?? null, counters: r.counters,
  })) };
}
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, stages, protectedEvidence, observations, note: 'Initial runner wrongly assumed singleton pin4 and cluster index1; runtime has pin1Lugana and cluster opens index3Laurent. Corrected runner baseline completed before product. Entire bothContract unchanged, emitted per local OCR invocation. Full contract invokes3 initial OCR stubs plus2 empty canonical stubs/1 profile GET, not single-wine1/1/1; preserved unmodified pipeline/query and actual counters. No nav increments, remote app/provider/paid/writes0.' }, null, 2) + '\n');
writeFileSync(join(output, 'verification.json'), JSON.stringify({ checks: verification, fullSuites: false, webBuild: false, nativeBuild: false, acceptance: 'local result for review' }, null, 2) + '\n');
writeFileSync(join(output, 'primary.json'), JSON.stringify({ scope: 'Only12: same existing full four-candidate replay/one image; row/real cluster x keyboard/touch x two orientations. Not8 people or4 physical recognized bottles. Reopen actual singleton pin1; no fabricated coordinates/candidates. No vision/provider/native certification. Initial3/2/1 requests from actual pipeline; no increments by navigation.', ...observations.after, contracts: contracts.checks.length, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0 }, null, 2) + '\n');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures }, null, 2) + '\n');
console.log(JSON.stringify({ contexts: observations.after.contexts, checks: observations.after.checks, contracts: contracts.checks.length, entries: entries.length, captures, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((total, item) => total + item.entries, 0) }));
