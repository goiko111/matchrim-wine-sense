import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
const input = process.argv[2];
if (!input) throw new Error('Pass07 artifact directory');
const output = 'docs/qa-evidence/matchrim-affinity-status-2026-10-12';
mkdirSync(output, { recursive: true });
for (const file of ['before', 'after', 'after-visual', 'final-visual', 'checkpoint07.md', 'contracts.json', 'contracts-final.json', 'tsconfig-scoped.json']) cpSync(join(input, file), join(output, file), { recursive: true });
const hash = (data) => createHash('sha256').update(data).digest('hex');
const baseline = '9c3a59ca54793b9b7a86a8e5675da2f578fd4900';
const protectedPaths = ['src/utils/menuWineActions.ts', 'src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/scanConfidence.ts', 'src/utils/wineAffinityExplanation.ts', 'src/utils/scanProfile.ts', 'src/services/matchrimScanProfile.ts', 'src/components/AffinityExplanation.tsx', 'src/contexts/AuthContext.tsx', 'src/pages/MyWines.tsx', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts'];
const currentPaths = ['src/components/wine-import/WineMenuScanner.tsx', 'src/utils/menuAffinityPresentation.ts', 'scripts/check-matchrim-affinity-status-oct12.ts', 'scripts/qa-matchrim-affinity-status-oct12.py', 'scripts/package-matchrim-affinity-status-oct12.mjs'];
const stages = [];
for (const path of [...currentPaths, ...protectedPaths]) {
  const current = readFileSync(path); const prior = spawnSync('git', ['show', `${baseline}:${path}`]);
  if (protectedPaths.includes(path) && (prior.status !== 0 || hash(prior.stdout) !== hash(current))) throw new Error('Protected source changed: ' + path);
  const destination = join(output, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, current);
  if (prior.status === 0) { const old = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(old), { recursive: true }); writeFileSync(old, prior.stdout); }
  stages.push({ path, before: prior.status === 0 ? hash(prior.stdout) : null, after: hash(current), protected: protectedPaths.includes(path) });
}
const protectedEvidence = [];
for (const name of ['matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12']) {
  const path = `docs/qa-evidence/${name}/manifest.json`;
  const bytes = readFileSync(path); const committed = spawnSync('git', ['show', `${baseline}:${path}`]);
  if (hash(bytes) !== hash(committed.stdout)) throw new Error('Protected manifest changed: ' + name);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw new Error('Protected evidence changed: ' + entry.path);
  protectedEvidence.push({ name, manifestSha256: hash(bytes), entries: manifest.entries.length, unchanged: true });
}
const contracts = JSON.parse(readFileSync(join(input, 'contracts-final.json')));
for (const [path, expected] of Object.entries(contracts.sourceHashes)) if (hash(readFileSync(path)) !== expected) throw new Error('Contract source drift: ' + path);
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, stages, protectedEvidence, note: 'after12 shares semantic implementation before last CTA-only text change. final-visual2 matches final source and settled drawer; visual repeats are not additional scenes/users. Intermediate source full snapshots not retained; receipt source hashes identify stages.' }, null, 2) + '\n');
const verification = [];
for (const [name, args] of [['typecheck-scoped', ['tsc', '--project', join(input, 'tsconfig-scoped.json')]], ['lint-scoped', ['eslint', 'src/components/wine-import/WineMenuScanner.tsx', 'src/utils/menuAffinityPresentation.ts', 'scripts/check-matchrim-affinity-status-oct12.ts']]]) {
  const result = spawnSync('npx', args, { encoding: 'utf8' });
  writeFileSync(join(output, name + '.stdout.txt'), result.stdout); writeFileSync(join(output, name + '.stderr.txt'), result.stderr);
  verification.push({ name, command: ['npx', ...args], exitCode: result.status });
  if (result.status !== 0) throw new Error('Only07 verification failed: ' + name);
}
writeFileSync(join(output, 'verification.json'), JSON.stringify({ checks: verification, fullSuite: false, webBuild: false, nativeBuild: false }, null, 2) + '\n');
const runs = ['before', 'after', 'after-visual', 'final-visual'].map((name) => {
  const rows = JSON.parse(readFileSync(join(output, name, 'results.json'))).results; const checks = rows.flatMap((r) => r.checks);
  return { name, contexts: rows.length, contextsPassed: rows.filter((r) => r.passed).length, checks: checks.length, checksPassed: checks.filter((r) => r.passed).length, runtimeErrors: rows.flatMap((r) => r.errors).length,
    console: rows.filter((r) => r.console.length).map((r) => ({ case: r.case, messages: r.console })) };
});
writeFileSync(join(output, 'denominators.json'), JSON.stringify({ scope: 'One existing scene/negative contract with explicit variants; not users/OCR/persistence/new real affinity', runs, contracts: contracts.checks.length, realRemoteAppCalls: 0, paidCalls: 0 }, null, 2) + '\n');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const entries = walk(output).filter((path) => !path.endsWith('/manifest.json')).sort().map((path) => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ entries, captures: entries.filter((e) => e.path.endsWith('.png')).length }, null, 2) + '\n');
console.log(JSON.stringify({ entries: entries.length, captures: entries.filter((e) => e.path.endsWith('.png')).length, sources: stages.length, protectedSources: protectedPaths.length, protectedEvidenceEntries: protectedEvidence.reduce((sum, e) => sum + e.entries, 0), runs, contracts: contracts.checks.length }));
