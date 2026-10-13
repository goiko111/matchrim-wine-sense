import assert from 'node:assert/strict';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
const input = process.argv[2], out = 'docs/qa-evidence/matchrim-hour-resilience-2026-10-13', baseline = 'f05cab30cb376c6c6ecdda47e55a2b2d0811cf24';
if (!input) throw Error('Pass hour artifacts');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (name, value) => writeFileSync(join(out, name), JSON.stringify(value, null, 2) + '\n');
mkdirSync(out, { recursive: true }); cpSync(join(input, 'soak'), join(out, 'soak'), { recursive: true }); cpSync(join(input, 'checkpoint.md'), join(out, 'checkpoint.md'));
const data = JSON.parse(readFileSync(join(out, 'soak/results.json')));
assert.equal(data.failure, null); assert.ok(data.elapsedSeconds >= 900); assert.equal(data.cycles.length, 358); assert.ok(data.allExternalRequestsIntercepted && !data.runtimeErrors.length);
for (const [path, expected] of Object.entries(data.sourceHashes)) {
  const bytes = execFileSync('git', ['show', baseline + ':' + path]); assert.equal(hash(bytes), expected); assert.equal(hash(readFileSync(path)), expected);
  const destination = join(out, 'soak-sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); writeFileSync(destination, bytes);
}
for (const path of ['scripts/qa-matchrim-hour-soak-oct13.py', 'scripts/check-multi-wine-scan.ts', 'scripts/package-matchrim-hour-soak-oct13.mjs']) {
  const destination = join(out, 'sources', path + '.txt'); mkdirSync(dirname(destination), { recursive: true }); cpSync(path, destination);
}
writeFileSync(join(out, 'baseline-core-check.txt'), execFileSync('git', ['show', baseline + ':scripts/check-multi-wine-scan.ts']));
const old = JSON.parse(readFileSync('docs/qa-evidence/matchrim-manual-provenance-2026-10-13/source-stages.json'));
const names = [...old.protectedEvidence.map(row => row.name), 'matchrim-manual-provenance-2026-10-13'];
const protectedEvidence = [];
for (const name of names) {
  const path = 'docs/qa-evidence/' + name + '/manifest.json', bytes = readFileSync(path); assert.equal(hash(bytes), hash(execFileSync('git', ['show', baseline + ':' + path])));
  const manifest = JSON.parse(bytes); for (const entry of manifest.entries) assert.equal(hash(readFileSync(join(dirname(path), entry.path))), entry.sha256);
  protectedEvidence.push({ name, entries: manifest.entries.length, unchanged: true });
}
const values = key => data.cycles.map(row => row.metricsAfterReset[key]);
const kinds = Object.fromEntries(['limit-retry', 'cancel-manual-late', 'confirm'].map(kind => [kind, data.cycles.filter(row => row.kind === kind).length]));
const requests = data.cycles.reduce((sum, row) => { for (const [key, value] of Object.entries(row.requests)) sum[key] = (sum[key] || 0) + value; return sum; }, {});
save('summary.json', { baseline, elapsedSeconds: data.elapsedSeconds, cycles: 358, kinds, requests, orientations: { portrait: 179, landscape: 179 }, heapMiB: { min: Math.min(...values('JSHeapUsedSize')) / 1048576, max: Math.max(...values('JSHeapUsedSize')) / 1048576, last: values('JSHeapUsedSize').at(-1) / 1048576 }, nodes: { first: values('Nodes')[0], last: values('Nodes').at(-1) }, documents: [...new Set(values('Documents'))], protectedEvidence, realRemoteAppCalls: 0, realWrites: 0, realAccounts: 0, paidCalls: 0, memoryLeakCertification: false, residual: 'Node/listener counts grow; no forced-GC or heap-retainer/native memory analysis. Functional lifecycle passes are not leak/model/user certification.' });
save('verification.json', { soak: { observedExitCode: 0, seconds: 900, completedCycles: 358 }, coreRegression: { initialExitCode: 1, reason: 'Two stale pre-existing aiRIM copy assertions; default-output parity against baseline proved unchanged', finalExitCode: 0, strengthenedAssertions: true }, coreLint: { observedExitCode: 0, errors: 0, warnings: 0 }, allAppSourceUnchangedDuringSoak: true, previousEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), unrelatedOldSuitesRerun: false, nativeBuild: false, deploy: false });
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
const entries = walk(out).filter(path => !path.endsWith('/manifest.json')).map(path => ({ path: relative(out, path), sha256: hash(readFileSync(path)) })); save('manifest.json', { entries, captures: entries.filter(row => row.path.endsWith('.png')).length });
console.log(JSON.stringify({ cycles: 358, kinds, requests, entries: entries.length, protectedEvidenceEntries: protectedEvidence.reduce((sum, row) => sum + row.entries, 0), heapMiB: [Math.min(...values('JSHeapUsedSize')) / 1048576, Math.max(...values('JSHeapUsedSize')) / 1048576], nodes: [values('Nodes')[0], values('Nodes').at(-1)] }));
