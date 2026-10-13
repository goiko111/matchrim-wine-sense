import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const input = process.argv[2];
if (!input) throw Error('Pass local progress artifact directory');
const output = 'docs/qa-evidence/matchrim-progress-a11y-2026-10-13', baseline = 'eac41777fb3817446b4d2c5ce33c7deea6384335';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = path => { const result = spawnSync('git', ['show', baseline + ':' + path]); return result.status === 0 ? result.stdout : null; };
const save = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(output, { recursive: true });
for (const name of ['before', 'after', 'checkpoint.md', 'command-receipts.json', 'tsconfig-tooling.json', 'contracts.json']) cpSync(join(input, name), join(output, name), { recursive: true });
const contract = JSON.parse(readFileSync(join(output, 'contracts.json')));
if (contract.checks.length !== 49 || contract.checks.some(check => !check.passed)) throw Error('AST/source49 not passing');
const changedPaths = [
  'src/components/ui/progress.tsx', 'src/components/WineStylesCSVImporter.tsx', 'src/components/csv/ImportProgress.tsx',
  'src/components/wine-import/MultiWineLabelScanner.tsx', 'src/components/wine-import/FoodPairingScanner.tsx',
  'src/components/wine-import/WineLabelOCRImport.tsx', 'src/pages/Profile.tsx', 'src/pages/MyWines.tsx',
];
const scripts = ['scripts/check-matchrim-progress-a11y-oct13.ts', 'scripts/fixtures-matchrim-progress-a11y-oct13.tsx', 'scripts/qa-matchrim-progress-a11y-oct13.py', 'scripts/package-matchrim-progress-a11y-oct13.mjs'];
const protectedPaths = Object.keys(contract.sourceHashes).filter(path => !changedPaths.includes(path) && !scripts.includes(path)).sort();
const stages = [];
for (const path of [...changedPaths, ...scripts, ...protectedPaths]) {
  const bytes = readFileSync(path), old = prior(path);
  if (protectedPaths.includes(path) && (!old || hash(bytes) !== hash(old))) throw Error('Protected source drift: ' + path);
  const destination = join(output, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes);
  if (old) { const destination = join(output, 'baseline-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, old); }
  stages.push({ path, before: old ? hash(old) : null, after: hash(bytes), protected: protectedPaths.includes(path) });
}
for (const [path, expected] of Object.entries(contract.sourceHashes)) if (hash(readFileSync(path)) !== expected) throw Error('Checked source changed after verification: ' + path);
const currentLint = spawnSync('./node_modules/.bin/eslint', [...changedPaths, ...scripts.filter(path => !path.endsWith('.py')), '--format', 'json'], { encoding: 'utf8' });
if (currentLint.status !== 0) throw Error('Current lint errors: ' + currentLint.stdout + currentLint.stderr);
const lint = JSON.parse(currentLint.stdout);
const baselineLint = [];
for (const path of ['src/components/WineStylesCSVImporter.tsx', 'src/pages/MyWines.tsx']) {
  const result = spawnSync('./node_modules/.bin/eslint', ['--stdin', '--stdin-filename', path, '--format', 'json'], { input: prior(path), encoding: 'utf8' });
  if (result.status !== 0) throw Error('Baseline lint errors'); baselineLint.push(...JSON.parse(result.stdout));
}
const messages = rows => rows.flatMap(row => row.messages.map(message => ({
  path: relative(process.cwd(), row.filePath), line: message.line, column: message.column,
  ruleId: message.ruleId, severity: message.severity, message: message.message,
}))).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
assert.deepEqual(messages(lint), messages(baselineLint));
save('lint-baseline-parity.json', { current: messages(lint), baseline: messages(baselineLint), unchanged: true, errors: 0, warnings: messages(lint).length });
const protectedEvidence = [];
for (const name of [
  'matchrim-menu-save-2026-10-12', 'matchrim-menu-actions-2026-10-12', 'matchrim-affinity-status-2026-10-12',
  'matchrim-profile-retry-2026-10-13', 'matchrim-airim-provenance-2026-10-13', 'matchrim-menu-notice-2026-10-13',
  'matchrim-menu-focus-2026-10-13', 'matchrim-menu-navigation-2026-10-13', 'matchrim-menu-reading-2026-10-13',
  'matchrim-menu-cancel-2026-10-13', 'matchrim-menu-ranking-cancel-2026-10-13', 'matchrim-multi-stale-cancel-2026-10-13',
]) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path), old = prior(path);
  if (!old || hash(bytes) !== hash(old)) throw Error('Protected manifest drift: ' + path);
  const manifest = JSON.parse(bytes);
  for (const entry of manifest.entries) if (hash(readFileSync(join(dirname(path), entry.path))) !== entry.sha256) throw Error('Protected evidence drift');
  protectedEvidence.push({ name, entries: manifest.entries.length, sha256: hash(bytes), unchanged: true });
}
const ui = {}, all = {}, receipts = [];
for (const name of ['before', 'after']) {
  const receipt = JSON.parse(readFileSync(join(output, name, 'primitive-cases.json')));
  for (const [path, expected] of Object.entries(receipt.hashes)) {
    const bytes = name === 'before' && changedPaths.includes(path) ? prior(path) : readFileSync(path);
    if (hash(bytes) !== expected) throw Error('Primitive source-stage drift: ' + name + ' ' + path);
  }
  if (hash(readFileSync(join(output, name, 'primitives.html'))) !== receipt.htmlSha256) throw Error('Primitive HTML drift');
  receipts.push({ name, hashes: receipt.hashes, htmlSha256: receipt.htmlSha256, installedRadixVersion: receipt.installedRadixVersion });
  const data = JSON.parse(readFileSync(join(output, name, 'results.json'))), checks = data.results.flatMap(result => result.checks);
  if (data.results.length !== 4 || checks.length !== 116) throw Error('UI coverage differs');
  if (name === 'after' && data.results.some(result => !result.passed || result.checks.some(check => !check.passed))) throw Error('After not fully passing');
  if (data.results.some(result => result.errors.length || result.console.length)) throw Error('Unexpected runtime diagnostics');
  for (const result of data.results.filter(result => result.case.startsWith('scan-'))) assert.deepEqual(result.counts, { profile: 1, detect: 1, analyze: 4, search: 3 });
  ui[name] = { contexts: 4, contextsPassed: data.results.filter(result => result.passed).length, checks: 116, checksPassed: checks.filter(check => check.passed).length };
  all[name] = data;
}
const pixels = ['portrait', 'landscape'].map(orientation => {
  const before = hash(readFileSync(join(output, 'before/primitive-' + orientation + '.png')));
  const after = hash(readFileSync(join(output, 'after/primitive-' + orientation + '.png')));
  assert.equal(before, after); return { orientation, before, after, identicalPngBytes: true };
});
const functionInputs = result => result.requests.filter(row => row.path.includes('/functions/v1/')).map(row => JSON.stringify(row)).sort();
for (const result of all.after.results.filter(result => result.case.startsWith('scan-'))) {
  assert.deepEqual(functionInputs(result), functionInputs(all.before.results.find(row => row.case === result.case)));
}
const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
const buildFiles = walk('dist').sort().map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
save('web-build-manifest.json', { scope: 'Actual local build from observed npm run build exit0, no native copy/deploy. Compilation alone is not product E2E.', files: buildFiles });
save('source-stages.json', { baseline, stages, receipts, protectedEvidence, scope: 'Only Root forwarding plus8 names/4 meter roles. Complete module AST restored by removing13 attributes; existing scores/pipeline/cancellation/styles unchanged.' });
save('verification.json', {
  observedCommands: JSON.parse(readFileSync(join(output, 'command-receipts.json'))), ui, pureChecks: 49, pureChecksPassed: 49,
  toolingTypecheck: { command: ['./node_modules/.bin/tsc', '--noEmit', '--project', join(input, 'tsconfig-tooling.json')], observedExitCode: 0 },
  lint: { exitCode: currentLint.status, errors: 0, warnings: messages(lint).length, baselineParity: true },
  previousSuitesRerun: false, fullRecognitionE2E: false, nativeBuild: false, deploy: false,
});
save('primary.json', {
  baseline, ui, pixels, pureChecks: 49, changes: contract.changes,
  realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0,
  scope: '16 isolated actual component vectors x2 viewports plus2 client-scans on exact existing local responses and one CC0 food-menu canary. Numerical primitive42 not learned profile or real wine affinity. Browser AX not VoiceOver/hardware certification.',
  realVisionRecognition: false, physicalChooserCertification: false,
  staticConsumersFullAccountE2E: false, classNamesAndVisualTransformsChanged: false,
  references: ['https://www.radix-ui.com/primitives/docs/components/progress', 'https://www.w3.org/WAI/ARIA/apg/patterns/meter/'],
});
const entries = walk(output).filter(path => !path.endsWith('/manifest.json')).sort().map(path => ({ path: relative(output, path), sha256: hash(readFileSync(path)) }));
const captures = entries.filter(entry => entry.path.endsWith('.png')).length;
save('manifest.json', { entries, captures });
console.log(JSON.stringify({ ui, pureChecks: 49, entries: entries.length, captures, sources: stages.length,
  baselineSources: stages.filter(stage => stage.before).length, protectedSources: protectedPaths.length,
  protectedEvidence: protectedEvidence.reduce((sum, value) => sum + value.entries, 0), buildFiles: buildFiles.length, warningsUnchanged: messages(lint).length }));
