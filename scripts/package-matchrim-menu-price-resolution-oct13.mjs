import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';

const out = 'docs/qa-evidence/matchrim-menu-price-resolution-2026-10-13';
const baseline = '3e75f30abc79c6262f96b06515437aec1e728a90';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, data) => writeFileSync(join(out, path), JSON.stringify(data, null, 2) + '\n');
const primary = read(join(out, 'primary-final/results.json'));
assert.equal(primary.results.length, 40);
assert.ok(primary.results.every(row => row.passed));
for (const [path, hash] of Object.entries(primary.sourceHashes)) assert.equal(sha(readFileSync(path)), hash, path);
const validation = read(join(out, 'validation-final/validation.json'));
assert.ok(validation.allPassed);
const contracts = read(join(out, 'validation-final/contracts.json'));
assert.ok(contracts.passed);
const old = read('docs/qa-evidence/matchrim-second-hour-2026-10-13/summary.json');
const names = [...old.protectedEvidence.map(row => row.name), 'matchrim-second-hour-2026-10-13'];
const protectedEvidence = [];
for (const name of names) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json';
  assert.equal(sha(readFileSync(path)), sha(execFileSync('git', ['show', baseline + ':' + path])));
  const manifest = read(path);
  for (const row of manifest.entries) assert.equal(sha(readFileSync(join(dirname(path), row.path))), row.sha256, row.path);
  protectedEvidence.push({ name, entries: manifest.entries.length, unchanged: true });
}
const product = ['src/components/wine-import/WineMenuScanner.tsx', 'src/components/wine-import/MenuPriceEditor.tsx', 'src/utils/menuPriceReview.ts', 'src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/utils/wineMenuScan.ts'];
const tooling = ['scripts/qa-matchrim-menu-price-resolution-oct13.py', 'scripts/check-matchrim-menu-price-resolution-oct13.ts', 'scripts/validate-matchrim-menu-price-oct13.py', 'scripts/package-matchrim-menu-price-resolution-oct13.mjs'];
for (const path of [...product, ...tooling]) {
  const destination = join(out, 'final-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); cpSync(path, destination);
  if (product.includes(path) && !['src/utils/menuPriceReview.ts', 'src/components/wine-import/MenuPriceEditor.tsx'].includes(path)) {
    const before = join(out, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, execFileSync('git', ['show', baseline + ':' + path]));
  }
}
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(row => row.isDirectory() ? walk(join(dir, row.name)) : [join(dir, row.name)]);
const build = walk('dist').map(path => ({ path: relative('dist', path), sha256: sha(readFileSync(path)) }));
assert.ok(!build.some(row => row.path.includes('qa-pages')));
save('build-files.json', { files: build, nativeBuild: false, deployed: false, testFlight: false });
const metrics = primary.results.flatMap(row => row.steps.filter(step => step.name.startsWith('Local price confirmation')).map(step => step.actual));
save('summary.json', { baseline, primary: { contexts: primary.results.length, passed: primary.results.reduce((sum, row) => sum + row.steps.filter(step => step.passed).length, 0), total: primary.results.reduce((sum, row) => sum + row.steps.length, 0) }, contracts: { passed: contracts.checks.filter(row => row.passed).length, total: contracts.checks.length }, localUiConfirmationMs: { n: metrics.length, min: Math.min(...metrics), max: Math.max(...metrics), mean: metrics.reduce((sum, value) => sum + value, 0) / metrics.length }, protectedEvidence, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), product, finalHashes: Object.fromEntries(product.map(path => [path, sha(readFileSync(path))])), allValidationCommandsPassed: true, realRemoteAppCalls: 0, paidCalls: 0, hostedWrites: 0, realUsers: 0, recognitionAccuracyCertification: false, humanPreferenceCertification: false, nativeAccessibilityCertification: false });
const entries = walk(out).filter(path => !path.endsWith('/manifest.json')).map(path => ({ path: relative(out, path), sha256: sha(readFileSync(path)) }));
save('manifest.json', { entries, captures: entries.filter(row => row.path.endsWith('.png')).length });
console.log(JSON.stringify({ primaryContexts: primary.results.length, primaryChecks: primary.results.reduce((sum, row) => sum + row.steps.length, 0), contracts: contracts.checks.length, protectedEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), entries: entries.length, captures: entries.filter(row => row.path.endsWith('.png')).length, compiledFiles: build.length }));
