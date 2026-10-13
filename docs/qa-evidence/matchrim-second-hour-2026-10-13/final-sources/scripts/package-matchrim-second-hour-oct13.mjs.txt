import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';

const input = process.argv[2], out = 'docs/qa-evidence/matchrim-second-hour-2026-10-13';
if (!input) throw Error('Pass second-hour artifact root');
const baseline = '3ad38f28badb59c03a1217c0ed1deb1a1581421a';
const hash = data => createHash('sha256').update(data).digest('hex');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(join(out, path), JSON.stringify(value, null, 2) + '\n');
mkdirSync(out, { recursive: true });
cpSync(join(input, 'checkpoint.md'), join(out, 'checkpoint.md'));
const gates = {};
for (const stage of ['notice-before', 'notice-after', 'notice-final', 'notifications-final']) {
  cpSync(join(input, stage), join(out, stage), { recursive: true });
  const data = read(join(input, stage, 'results.json'));
  gates[stage] = stage === 'notifications-final'
    ? { cases: data.results.length, allPassed: data.results.every(row => row.passed), notices: data.results.reduce((sum, row) => sum + row.notifications, 0) }
    : { passed: data.results.reduce((sum, row) => sum + row.checks.filter(check => check.passed).length, 0), total: data.results.reduce((sum, row) => sum + row.checks.length, 0), failingCases: data.results.filter(row => row.failures.length).length };
}
for (const stage of ['decode-before', 'decode-after']) {
  const data = read(join(input, stage, 'results.json'));
  // Owner photos and their derived screenshots stay outside the repository.
  save(stage + '.json', { scope: data.scope, privateEvidenceRoot: join(input, stage), cases: data.results.map(row => ({ case: row.case, checks: row.checks, failures: row.failures, counts: row.counts, runtimeErrors: row.runtimeErrors, realRemoteAppCalls: row.realRemoteAppCalls, realWrites: row.realWrites })) });
  gates[stage] = { passed: data.results.reduce((sum, row) => sum + row.checks.filter(check => check.passed).length, 0), total: data.results.reduce((sum, row) => sum + row.checks.length, 0), failingCases: data.results.filter(row => row.failures.length).length };
}
const memory = {};
for (const stage of ['memory-baseline', 'memory-before', 'listeners-before', 'memory-after', 'console-diagnostic', 'memory-final']) {
  mkdirSync(join(out, stage), { recursive: true });
  const paths = readdirSync(join(input, stage)).filter(path => !path.endsWith('.heapsnapshot'));
  for (const path of paths) cpSync(join(input, stage, path), join(out, stage, path));
  const data = read(join(input, stage, 'results.json'));
  assert.equal(data.failure, null); assert.ok(data.allExternalRequestsIntercepted); assert.equal(data.runtimeErrors.length, 0);
  const metrics = data.cycles.map(row => row.metricsAfterReset.JSHeapUsedSize / 1048576);
  const last = data.cycles.at(-1);
  memory[stage] = { cycles: data.cycles.length, elapsedSeconds: data.elapsedSeconds, heapMiB: { min: Math.min(...metrics), max: Math.max(...metrics), last: metrics.at(-1) }, lastMetricsBeforeGc: last.metricsAfterReset, lastLiveDom: last.liveDomAfterReset ?? null, finalPostGc: read(join(input, stage, 'final-post-gc.json')).metrics.filter(row => ['Nodes', 'Documents', 'JSEventListeners', 'JSHeapUsedSize'].includes(row.name)), nativeMemoryCertification: false };
}
const contracts = read(join(input, 'contracts-final.json'));
assert.ok(contracts.checks.every(row => row.passed));
cpSync(join(input, 'contracts-final.json'), join(out, 'contracts.json'));
assert.equal(gates['notice-final'].failingCases, 0); assert.equal(gates['decode-after'].failingCases, 0); assert.ok(gates['notifications-final'].allPassed);
const old = read('docs/qa-evidence/matchrim-hour-resilience-2026-10-13/summary.json');
const protectedNames = [...old.protectedEvidence.map(row => row.name), 'matchrim-hour-resilience-2026-10-13'];
const protectedEvidence = [];
for (const name of protectedNames) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json';
  assert.equal(hash(readFileSync(path)), hash(execFileSync('git', ['show', baseline + ':' + path])));
  const entries = read(path).entries;
  for (const row of entries) assert.equal(hash(readFileSync(join(dirname(path), row.path))), row.sha256);
  protectedEvidence.push({ name, entries: entries.length, unchanged: true });
}
const changed = ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/imageAnalysis.ts', 'src/utils/manualWineIdentityNotice.ts', 'src/components/ui/sonner.tsx', 'package.json', 'package-lock.json'];
const tooling = ['scripts/qa-matchrim-memory-oct13.py', 'scripts/qa-matchrim-image-recovery-oct13.py', 'scripts/qa-matchrim-identity-notice-oct13.py', 'scripts/qa-matchrim-notifications-oct13.py', 'scripts/check-matchrim-second-hour-oct13.ts', 'scripts/inspect-matchrim-heap-oct13.mjs', 'scripts/package-matchrim-second-hour-oct13.mjs', 'scripts/qa-pages/notifications.html', 'scripts/qa-pages/notifications.tsx'];
for (const path of [...changed, ...tooling]) {
  const dest = join(out, 'final-sources', path + '.txt'); mkdirSync(dirname(dest), { recursive: true }); cpSync(path, dest);
  if (changed.includes(path) && path !== 'src/utils/manualWineIdentityNotice.ts') {
    const before = join(out, 'baseline-sources', path + '.txt'); mkdirSync(dirname(before), { recursive: true }); writeFileSync(before, execFileSync('git', ['show', baseline + ':' + path]));
  }
}
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(row => row.isDirectory() ? walk(join(dir, row.name)) : [join(dir, row.name)]);
const compiled = walk('dist').map(path => ({ path: relative('dist', path), sha256: hash(readFileSync(path)) }));
assert.ok(!compiled.some(row => row.path.includes('qa-pages')));
save('build-files.json', { files: compiled, nativeBuild: false, deploy: false, testFlight: false });
save('summary.json', { baseline, gates, memory, contracts: { passed: contracts.checks.filter(row => row.passed).length, total: contracts.checks.length, protectedSources: contracts.protectedPaths.length }, changed, finalHashes: Object.fromEntries(changed.map(path => [path, hash(readFileSync(path))])), protectedEvidence, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0, nativeMemoryCertification: false, recognitionPrecisionCertification: false });
const entries = walk(out).filter(path => !path.endsWith('/manifest.json')).map(path => ({ path: relative(out, path), sha256: hash(readFileSync(path)) }));
save('manifest.json', { entries, captures: entries.filter(row => row.path.endsWith('.png')).length });
console.log(JSON.stringify({ gates, memoryCycles: Object.fromEntries(Object.entries(memory).map(([stage, row]) => [stage, row.cycles])), contracts: contracts.checks.length, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), entries: entries.length, compiledFiles: compiled.length }));
