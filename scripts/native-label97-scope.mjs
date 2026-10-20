import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { restoreNativeAuth97Guard } from './native-auth97-scope.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const bytes = readFileSync(new URL('./native-label97-scope.json', import.meta.url));
assert.equal(digest(bytes), 'b0d4c28b7833488a870cd47f38d8a5c32a1788a831c02b0fdb44557e7eb604f3', 'Exact reviewed97 source and guard inverses');
const scope = JSON.parse(bytes);
function restore(file, source, kind) {
  if (kind === 'guard') source = restoreNativeAuth97Guard(file, source);
  const row = scope.files.find(item => item.file === file && item.kind === kind);
  if (!row || digest(source) === row.beforeHash) return source;
  const marker = kind === 'guard' ? source.includes('native-label97-scope') || source.includes('native-cellar97-scope')
    : source.includes('LabelAnalysisView') || source.includes('canAdmitNativeCatalogLookup97');
  // Historical layers may supply their already-restored sources; their old guards remain authoritative.
  if (!marker) return source;
  assert.equal(digest(source), row.afterHash, `Whole reviewed97 input: ${file}`);
  for (const hunk of row.hunks.slice().reverse()) {
    assert.equal(source.split(hunk.after).length, 2, `Unique exact97 inverse hunk: ${file}`);
    source = source.replace(hunk.after, hunk.before);
  }
  assert.equal(digest(source), row.beforeHash, `Whole immutable pre97 source restored: ${file}`);
  return source;
}
export const restoreNativeLabel97 = (file, source) => restore(file, source, 'component');
export const restoreNativeLabelGuard97 = (file, source) => restore(file, source, 'guard');

export function runNativeLabel97Checks() {
  const root = fileURLToPath(new URL('../', import.meta.url));
  let negatives = 0;
  for (const row of scope.files) {
    const source = row.kind === 'guard' ? restoreNativeAuth97Guard(row.file, readFileSync(resolve(root, row.file), 'utf8'))
      : readFileSync(resolve(root, row.file), 'utf8');
    assert.equal(digest(source), row.afterHash, `Current97 scope input: ${row.file}`);
    assert.equal(restore(row.file, source, row.kind), execFileSync('git', ['show', `${scope.baseline}:${row.file}`], { cwd: root, encoding: 'utf8' }));
    assert.throws(() => restore(row.file, source + '\n// undeclared change\n', row.kind)); negatives++;
    if (row.kind === 'guard' && source.includes('assert.equal(')) {
      assert.throws(() => restoreNativeLabelGuard97(row.file, source.replace('assert.equal(', 'assert.notEqual('))); negatives++;
    }
  }
  const features = [];
  for (const feature of scope.features) {
    assert.equal(digest(readFileSync(resolve(root, feature.file))), feature.sha256, 'Exact separately reviewed97 feature check');
    const output = execFileSync(process.execPath, ['--import', 'tsx', feature.file], { cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 1048576 });
    const report = JSON.parse(output.trim().split('\n').at(-1));
    assert.equal(report.passed, feature.groups); assert.equal(report.failed, 0);
    assert.equal(output.split('\n').filter(line => line.startsWith('PASS ')).length, feature.groups);
    features.push({ ...feature, actualGroups: report.passed });
  }
  return { baseline: scope.baseline, wholeComponentInverse: true, wholeGuardInverses: scope.files.filter(row => row.kind === 'guard').length,
    rejectedMutations: negatives, features, oldAssertionsRemoved: 0, oldCountsChanged: 0, networkCalls: 0, SDK: 0 };
}
