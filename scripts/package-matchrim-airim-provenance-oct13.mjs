import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw new Error('Pass09 artifact directory');
const output = 'docs/qa-evidence/matchrim-airim-provenance-2026-10-13';
const baseline = 'a533e0d4d689fb245ec91ad0bb2f93796018e4cc';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const old = path => {
  const result = spawnSync('git', ['show', baseline + ':' + path]);
  return result.status === 0 ? result.stdout : null;
};
mkdirSync(output, { recursive: true });
for (const name of ['before', 'after', 'after-final', 'checkpoint09.md', 'tsconfig-scoped.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const product = ['src/utils/aiRimContextGuide.ts'];
const scripts = ['scripts/check-matchrim-airim-provenance-oct13.ts', 'scripts/qa-matchrim-airim-provenance-oct13.py', 'scripts/package-matchrim-airim-provenance-oct13.mjs'];
const protectedPaths = [
  'src/components/AiRimContextGuide.tsx', 'src/components/wine-import/WineMenuScanner.tsx', 'src/components/wine-import/MultiWineLabelScanner.tsx',
  'src/utils/menuAffinityPresentation.ts', 'src/utils/menuWineSave.ts', 'src/utils/menuWineActions.ts',
  'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/utils/menuProfileRecovery.ts',
  'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/multiWineScan.ts',
  'src/utils/wineAffinityExplanation.ts', 'src/utils/matchrimLearning.ts', 'src/contexts/AuthContext.tsx',
  'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/components/AffinityExplanation.tsx',
  'supabase/functions/_shared/matchrim-scan-values.ts',
];
const stages = [];
for (const path of [...product, ...scripts, ...protectedPaths]) {
  const current = readFileSync(path), prior = old(path);
  if (protectedPaths.includes(path) && (!prior || hash(prior) !== hash(current))) throw Error('Protected source drift: ' + path);
  const destination = join(output, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, current);
  if (prior) { const before = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, prior); }
  stages.push({ path, before: prior ? hash(prior) : null, after: hash(current), protected: protectedPaths.includes(path) });
}
const protectedEvidence = [];
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12', 'matchrim-profile-retry-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path);
  if (hash(bytes) !== hash(old(path))) throw Error('Protected manifest changed: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence changed: ' + entry.path);
  protectedEvidence.push({ name, sha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const verification = [];
for (const [name, binary, args] of [
  ['contracts', 'tsx', ['scripts/check-matchrim-airim-provenance-oct13.ts', join(output, 'contracts.json')]],
  ['typecheck-scoped', 'tsc', ['--project', join(output, 'tsconfig-scoped.json')]],
  ['lint-scoped', 'eslint', [...product, ...scripts.filter(path => !path.endsWith('.py'))]],
]) {
  const result = spawnSync('node_modules/.bin/' + binary, args, { encoding: 'utf8' });
  writeFileSync(join(output, name + '.stdout.txt'), result.stdout ?? ''); writeFileSync(join(output, name + '.stderr.txt'), result.stderr ?? '');
  verification.push({ name, command: ['node_modules/.bin/' + binary, ...args], exitCode: result.status });
  if (result.status !== 0) throw Error('Only09 verification failed: ' + name);
}
const contracts = JSON.parse(readFileSync(join(output, 'contracts.json')));
for (const [path, expected] of Object.entries(contracts.sourceHashes)) if (hash(readFileSync(path)) !== expected) throw Error('Contract source drift: ' + path);
const observations = {};
for (const name of ['before', 'after', 'after-final']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'input-provenance.json')));
  const results = JSON.parse(readFileSync(join(output, name, 'results.json'))).results;
  const final = name === 'after-final';
  const expectedHelper = name === 'before' ? hash(old(product[0])) : final ? hash(readFileSync(product[0])) : null;
  if (expectedHelper && receipt.hashes[product[0]] !== expectedHelper) throw Error('UI/helper source-stage mismatch: ' + name);
  if (results.length !== 2 || results.some(r => r.counters.ocr !== 1 || r.counters.canonical !== 1 || r.counters.base !== 1 || r.errors.length || r.console.length)) throw Error('UI counters/errors mismatch: ' + name);
  for (const [path, expected] of Object.entries(receipt.hashes)) if (path !== product[0] && hash(readFileSync(path)) !== expected) throw Error('UI fixture/consumer drift: ' + path);
  if (name !== 'before' && results.some(r => !r.passed || r.checks.some(c => !c.passed))) throw Error('UI09 QA failed: ' + name);
  observations[name] = { helperSha256: receipt.hashes[product[0]], contexts: results.length, passed: results.filter(r => r.passed).length, checks: results.flatMap(r => r.checks).length, checksPassed: results.flatMap(r => r.checks).filter(c => c.passed).length, counters: results.map(r => ({ case: r.case, ...r.counters })) };
}
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, stages, protectedEvidence, observations, intermediateNote: 'First wording patch UI source identified by receipt hash; full intermediate helper snapshot not retained. Final wording uses cosecha; final helper snapshot and receipt agree.' }, null, 2) + '\n');
writeFileSync(join(output, 'verification.json'), JSON.stringify({ checks: verification, fullSuites: false, webBuild: false, nativeBuild: false }, null, 2) + '\n');
writeFileSync(join(output, 'primary.json'), JSON.stringify({ scope: 'Only09: two local menu UI orientations of the existing04/08 scene/contract, not users, new OCR, native QA or catalog linkage. First after run is a wording-stage repeat, not additional primary contexts.', ...observations['after-final'], contracts: contracts.checks.length, realRemoteAppCalls: 0, paidCalls: 0, realWrites: 0, realAccounts: 0 }, null, 2) + '\n');
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures }, null, 2) + '\n');
console.log(JSON.stringify({ primary: observations['after-final'], contracts: contracts.checks.length, entries: entries.length, captures, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidence: protectedEvidence.reduce((count, e) => count + e.entries, 0) }));
