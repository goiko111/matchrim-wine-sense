import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const input = process.argv[2];
if (!input) throw new Error('Pass the local task05 artifact directory');
const output = 'docs/qa-evidence/matchrim-menu-save-2026-10-12';
mkdirSync(output, { recursive: true });
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const baseline = '829b67511d0f61b4fddb7f67e43835c892e87d17';
for (const name of ['before', 'after-first', 'after', 'after-final', 'after-single-formats', 'verification', 'checkpoint05.md', 'pure-contracts.json', 'pure-final.json', 'pure-complete.json']) {
  cpSync(join(input, name), join(output, name), { recursive: true });
}
const product = ['src/components/wine-import/WineMenuScanner.tsx', 'src/pages/MyWines.tsx', 'src/utils/menuWineSave.ts'];
const protectedPaths = ['src/contexts/AuthContext.tsx', 'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts', 'src/utils/wineComparison.ts', 'src/utils/scanMoney.ts', 'src/utils/labelScanSave.ts'];
const qaPaths = ['scripts/check-matchrim-menu-save-oct12.ts', 'scripts/qa-matchrim-menu-save-oct12.py', 'scripts/package-matchrim-menu-save-oct12.mjs', 'scripts/verify-matchrim-menu-save-oct12.mjs'];
const sources = [];
for (const path of [...product, ...protectedPaths, ...qaPaths]) {
  const current = readFileSync(path);
  const prior = spawnSync('git', ['show', `${baseline}:${path}`]);
  const target = join(output, 'sources', `${path}.txt`);
  mkdirSync(target.substring(0, target.lastIndexOf('/')), { recursive: true });
  // Evidence copies are text, not additional application/lint entry points.
  const oldTarget = join(output, 'sources', path);
  if (existsSync(oldTarget)) renameSync(oldTarget, target);
  writeFileSync(target, current);
  if (prior.status === 0) {
    const old = join(output, 'baseline-sources', `${path}.txt`);
    mkdirSync(old.substring(0, old.lastIndexOf('/')), { recursive: true });
    const oldExecutable = join(output, 'baseline-sources', path);
    if (existsSync(oldExecutable)) renameSync(oldExecutable, old);
    writeFileSync(old, prior.stdout);
  }
  const unchanged = prior.status === 0 && sha(prior.stdout) === sha(current);
  if (protectedPaths.includes(path) && !unchanged) throw new Error(`Protected source changed: ${path}`);
  sources.push({ path, snapshotPath: relative(output, target), baselineSnapshotPath: prior.status === 0 ? `baseline-sources/${path}.txt` : null, beforeSha256: prior.status === 0 ? sha(prior.stdout) : null, afterSha256: sha(current), protected: protectedPaths.includes(path), unchanged });
}
const functions = (source) => {
  const tree = ts.createSourceFile('MyWines.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Map();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) found.set(node.name.text, node.initializer.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree); return found;
};
const oldReader = functions(readFileSync(join(output, 'baseline-sources/src/pages/MyWines.tsx.txt'), 'utf8'));
const reader = functions(readFileSync('src/pages/MyWines.tsx', 'utf8'));
const guards = ['beginWineAction', 'handleToggleFavorite', 'handleToggleProfileTraining', 'handleDeleteWine'].map((name) => {
  if (!reader.has(name) || reader.get(name) !== oldReader.get(name)) throw new Error(`Existing owner/mutation guard changed: ${name}`);
  return { name, sha256: sha(reader.get(name)), unchanged: true };
});
const ownerPrelude = (source) => source.slice(source.indexOf('  const wineLoadController ='), source.indexOf('  const [showAddDialog'));
const oldPrelude = ownerPrelude(readFileSync(join(output, 'baseline-sources/src/pages/MyWines.tsx.txt'), 'utf8'));
const currentPrelude = ownerPrelude(readFileSync('src/pages/MyWines.tsx', 'utf8'));
if (!oldPrelude || oldPrelude !== currentPrelude) throw new Error('Owner lifetime/load-controller prelude changed');
guards.push({ name: 'owner-lifetime-and-load-controllers', sha256: sha(currentPrelude), unchanged: true });
writeFileSync(join(output, 'source-stages.json'), JSON.stringify({ baseline, sources, protectedReaderFunctions: guards, caveat: 'No hosted RLS or session certification. Original before harness had fewer checks; final harness adds overlap/repeat/bottom-action checks and four single-format contexts. Intermediate product hashes are in pure receipts.' }, null, 2) + '\n');

const aggregate = (directory) => {
  const receipt = JSON.parse(readFileSync(join(output, directory, 'results.json')));
  const rows = receipt.results;
  const checks = rows.flatMap((row) => row.steps);
  return { directory, contexts: rows.length, passed: rows.filter((row) => row.passed).length, checks: checks.length, checksPassed: checks.filter((c) => c.passed).length,
    writes: rows.flatMap((row) => row.writes).length, runtimeErrors: rows.flatMap((row) => row.errors).length, console: rows.filter((row) => row.console.length).map((row) => ({ case: row.case, messages: row.console })) };
};
writeFileSync(join(output, 'denominators.json'), JSON.stringify({ scope: 'Local invalid-signature auth/HTTP+WS interception/in-memory readback; not users/OCR/persistence/RLS', realRemoteCalls: 0, paidCalls: 0,
  runs: ['before', 'after-first', 'after', 'after-final', 'after-single-formats'].map(aggregate), primary: ['after-final', 'after-single-formats'],
  pure: JSON.parse(readFileSync(join(output, 'pure-complete.json'))).checks.length }, null, 2) + '\n');
const beforeRows = JSON.parse(readFileSync(join(output, 'before/results.json'))).results;
const finalRows = ['after-final', 'after-single-formats'].flatMap((name) => JSON.parse(readFileSync(join(output, name, 'results.json'))).results);
const summary = (row) => row ? {
  payload: row.writes[0]?.payload ?? null,
  expectedFinancial: row.steps.find((step) => step.name.startsWith('No ambiguous/'))?.detail?.expected ?? null,
  reader: row.steps.find((step) => step.name === 'Pending or legacy amount remains visibly unconfirmed')?.detail ?? null,
  failures: row.failures, passed: row.passed,
} : null;
writeFileSync(join(output, 'expected-actual.json'), JSON.stringify(finalRows.map((row) => ({ case: row.case, before: summary(beforeRows.find((old) => old.case === row.case)), after: summary(row), independentOCR: false, realUser: false, realPersistence: false })), null, 2) + '\n');
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const entries = walk(output).filter((path) => !path.endsWith('/manifest.json')).sort().map((path) => ({ path: relative(output, path), sha256: sha(readFileSync(path)) }));
writeFileSync(join(output, 'manifest.json'), JSON.stringify({ algorithm: 'sha256', entries, captures: entries.filter((entry) => entry.path.endsWith('.png')).length }, null, 2) + '\n');
console.log(JSON.stringify({ output, entries: entries.length, captures: entries.filter((entry) => entry.path.endsWith('.png')).length, sources: sources.length, protectedSources: protectedPaths.length, guards: guards.length }));
