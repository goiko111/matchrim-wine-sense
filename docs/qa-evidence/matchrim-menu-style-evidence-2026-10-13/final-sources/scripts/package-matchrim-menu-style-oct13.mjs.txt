import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
const out = 'docs/qa-evidence/matchrim-menu-style-evidence-2026-10-13', baseline = 'ca73c57efa52c205fc173fb69e5f0ac11ae90f7c';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, data) => writeFileSync(join(out, path), JSON.stringify(data, null, 2) + '\n');
const primary = read(join(out, 'primary-final/results.json'));
assert.equal(primary.results.length, 20); assert.ok(primary.results.every(row => row.passed));
for (const [path, sha] of Object.entries(primary.sourceHashes)) assert.equal(hash(readFileSync(path)), sha);
assert.ok(read(join(out, 'validation-delivery/validation.json')).allPassed);
const contracts = read(join(out, 'contracts-final.json')); assert.ok(contracts.allPassed);
const previous = read('docs/qa-evidence/matchrim-menu-price-resolution-2026-10-13/summary.json');
const protectedEvidence = [];
for (const name of [...previous.protectedEvidence.map(row => row.name), 'matchrim-menu-price-resolution-2026-10-13']) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json';
  assert.equal(hash(readFileSync(path)), hash(execFileSync('git', ['show', baseline + ':' + path])));
  const rows = read(path).entries;
  for (const row of rows) assert.equal(hash(readFileSync(join(dirname(path), row.path))), row.sha256);
  protectedEvidence.push({ name, entries: rows.length, unchanged: true });
}
const product = ['src/components/wine-import/WineMenuScanner.tsx', 'src/components/wine-import/MenuPriceEditor.tsx', 'src/utils/menuWineSimilarity.ts'];
for (const path of [...product, 'scripts/qa-matchrim-menu-style-evidence-oct13.py', 'scripts/check-matchrim-menu-style-evidence-oct13.ts', 'scripts/package-matchrim-menu-style-oct13.mjs']) {
  const destination = join(out, 'final-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); cpSync(path, destination);
  if (product.includes(path) && path !== 'src/utils/menuWineSimilarity.ts') {
    const before = join(out, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, execFileSync('git', ['show', baseline + ':' + path]));
  }
}
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(row => row.isDirectory() ? walk(join(dir, row.name)) : [join(dir, row.name)]);
const files = walk('dist').map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
assert.ok(!files.some(row => row.path.includes('qa-pages')));
save('build-files.json', { files, native: false, deploy: false, testFlight: false });
save('summary.json', { baseline, primary: { contexts: primary.results.length, checks: primary.results.reduce((sum, row) => sum + row.checks.length, 0), allPassed: true }, contracts: { checks: contracts.checks.length, allPassed: true }, protectedEvidence, protectedEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), product, finalHashes: Object.fromEntries(product.map(path => [path, hash(readFileSync(path))])), realRemoteAppCalls: 0, realUsers: 0, hostedWrites: 0, recognitionCertification: false, humanPreferenceCertification: false, nativeAccessibilityCertification: false });
const entries = walk(out).filter(path => !path.endsWith('/manifest.json')).map(path => ({ path: relative(out, path), sha256: hash(readFileSync(path)) }));
save('manifest.json', { entries, captures: entries.filter(row => row.path.endsWith('.png')).length });
console.log(JSON.stringify({ contexts: primary.results.length, checks: primary.results.reduce((sum, row) => sum + row.checks.length, 0), contracts: contracts.checks.length, protectedEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), entries: entries.length, captures: entries.filter(row => row.path.endsWith('.png')).length }));
