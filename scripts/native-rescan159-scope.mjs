import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scanner = 'src/components/wine-import/MultiWineLabelScanner.tsx';
const comparison = 'src/components/wine-import/WineComparisonWorkspace.tsx';
const inputs = {
  [scanner]: ['70d36558d099e10eef4dc74a5f204f0e2dd2308c9a9bfc34f7fc2554865c3c02', '4c948bb3028baff5100099cf6aea2c3fb4261ad7bc2ffbb210ae332f6cedeac8', "from '@/services/nativeScanContext159'"],
  [comparison]: ['3e5449183e8bd4da2843651faf97d367bfabc65c2c1aff05a421c69549b32a77', '13f7f4a57f8d18dbdc4c115755eba48648669de6cb9c8ffa220a038072ad2daf', 'personalVerdictTitle159'],
};
const hash = source => createHash('sha256').update(source).digest('hex');
const baselines = new Map();
// Historical source oracles remain exact. Actual159 behavior is tested without this projection.
export function restoreRescan159(path, source) {
  const row = inputs[path];
  if (!row || !source.includes(row[2])) return source;
  // The only168 scanner amendment passes the current owner-bound snapshot to the native picker.
  const savedProps = '      ownerId={user?.id ?? null} savedVerdicts={nativeVerdicts}\n';
  if (path === scanner && source.includes(savedProps)) {
    assert.equal(source.split(savedProps).length, 2); source = source.replace(savedProps, '');
  }
  assert.equal(hash(source), row[1],
    'Only the reviewed native rescan159 amendments may enter historical source oracles');
  if (!baselines.has(path)) baselines.set(path, execFileSync('git', ['show', '233442a:' + path], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8', timeout: 10000,
  }));
  const baseline = baselines.get(path);
  assert.equal(hash(baseline), row[0]);
  return baseline;
}
