import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
const out = 'docs/qa-evidence/matchrim-price-currency-precision-2026-10-13', baseline = '5b789a75ed636cb224d5f33dd4f4a1da7f9cc919';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, data) => writeFileSync(join(out, path), JSON.stringify(data, null, 2) + '\n');
const gates = {};
for (const stage of ['primary-final', 'app-price-regression', 'app-style-regression', 'quantum-final', 'quantum-app-price', 'quantum-app-style']) {
  const data = read(join(out, stage, 'results.json')); assert.ok(data.results.every(row => row.passed), stage);
  for (const [path, sha] of Object.entries(data.sourceHashes)) {
    const expected = path === 'src/utils/menuPriceReview.ts' && !stage.startsWith('quantum')
      ? readFileSync(join(out, 'menuPriceReview-before-quantum.ts.txt')) : readFileSync(path);
    assert.equal(hash(expected), sha, stage + ':' + path);
  }
  gates[stage] = { contexts: data.results.length, checks: data.results.reduce((sum, row) => sum + (row.steps ?? row.checks).length, 0), allPassed: true };
}
assert.ok(read(join(out, 'contracts-final.json')).allPassed);
assert.ok(read(join(out, 'validation-final/validation.json')).allPassed);
const prior = read('docs/qa-evidence/matchrim-menu-style-evidence-2026-10-13/summary.json');
const protectedEvidence = [];
for (const name of [...prior.protectedEvidence.map(row => row.name), 'matchrim-menu-style-evidence-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json';
  assert.equal(hash(readFileSync(path)), hash(execFileSync('git', ['show', baseline + ':' + path])));
  const rows = read(path).entries;
  for (const row of rows) assert.equal(hash(readFileSync(join(dirname(path), row.path))), row.sha256);
  protectedEvidence.push({ name, entries: rows.length, unchanged: true });
}
const product = ['src/utils/menuPriceReview.ts', 'src/utils/menuWineSave.ts', 'src/utils/scanWineEvidence.ts', 'src/components/wine-import/MenuPriceEditor.tsx', 'src/components/wine-import/WineMenuScanner.tsx'];
const tools = ['scripts/check-matchrim-price-currency-precision-oct13.ts', 'scripts/qa-matchrim-price-currency-precision-oct13.py', 'scripts/qa-pages/menu-price.html', 'scripts/qa-pages/menu-price.tsx', 'scripts/package-matchrim-currency-precision-oct13.mjs'];
for (const path of [...product, ...tools]) {
  const destination = join(out, 'final-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); cpSync(path, destination);
  if (product.includes(path)) { const before = join(out, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, execFileSync('git', ['show', baseline + ':' + path])); }
}
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(row => row.isDirectory() ? walk(join(dir, row.name)) : [join(dir, row.name)]);
const files = walk('dist').map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
assert.ok(!files.some(row => row.path.includes('qa-pages')));
save('build-files.json', { files, native: false, deployed: false, testFlight: false });
save('summary.json', { baseline, gates, contracts: read(join(out, 'contracts-final.json')).checks.length, legacyPriceContracts: read(join(out, 'validation-final/contracts.json')).checks.length, product, finalHashes: Object.fromEntries(product.map(path => [path, hash(readFileSync(path))])), protectedEvidence, protectedEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), realRemoteAppCalls: 0, hostedWrites: 0, realUsers: 0, newProviderBenchmark: false, deployed: false, nativeBuilt: false });
const entries = walk(out).filter(path => !path.endsWith('/manifest.json')).map(path => ({ path: relative(out, path), sha256: hash(readFileSync(path)) }));
save('manifest.json', { entries, captures: entries.filter(row => row.path.endsWith('.png')).length });
console.log(JSON.stringify({ gates, entries: entries.length, captures: entries.filter(row => row.path.endsWith('.png')).length, protectedEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0) }));
