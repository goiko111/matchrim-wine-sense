import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const output = resolve(process.argv[2] || '');
if (!process.argv[2] || existsSync(output)) throw Error('Explicit new evidence directory required');
mkdirSync(output, { recursive: true, mode: 0o700 });
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const diff = spawnSync('git', ['diff', 'HEAD'], { encoding: 'utf8' }).stdout;
const sourceManifest = () => {
  const paths = ['src', 'ios', 'supabase', 'scripts', 'package.json', 'package-lock.json'];
  const tracked = spawnSync('git', ['ls-files', '-z', ...paths], { encoding: 'utf8' }).stdout.split('\0');
  const untracked = spawnSync('git', ['ls-files', '--others', '--exclude-standard', '-z', ...paths], { encoding: 'utf8' }).stdout.split('\0');
  return Object.fromEntries([...new Set([...tracked, ...untracked].filter(Boolean))].sort().map((path) =>
    [path, createHash('sha256').update(readFileSync(path)).digest('hex')]));
};
const sourceBefore = sourceManifest();
const rows = [];
for (const [name, command, args] of [
  ['release', 'npm', ['run', 'test:release']],
  ['cloud-contracts', 'npm', ['run', 'test:cloud']],
  ['remediation89', 'npm', ['run', 'test:remediation89']],
  ['scene90', 'npm', ['run', 'test:scene90']],
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['lint', 'npm', ['run', 'lint']],
]) {
  const start = Date.now();
  const result = spawnSync(command, args, { encoding: 'utf8', timeout: 300000,
    env: { ...process.env, VITE_APP_ANALYTICS_ENABLED: 'false', VITE_MATCHRIM_QA_FIXTURES: 'false' } });
  const log = (result.stdout || '') + (result.stderr || '');
  writeFileSync(join(output, name + '.log'), log, { mode: 0o600 });
  rows.push({ name, status: result.status, error: result.error?.message || null, elapsed_ms: Date.now() - start,
    passed: result.status === 0 && !result.error, log_sha256: createHash('sha256').update(log).digest('hex') });
  writeFileSync(join(output, 'results.json'), JSON.stringify({ head, diff_sha256: createHash('sha256').update(diff).digest('hex'),
    sourceBefore, sourceUnchanged: JSON.stringify(sourceBefore) === JSON.stringify(sourceManifest()),
    scope: 'Local automated regressions, not live recognition, physical or human approval', results: rows }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(rows.at(-1)));
}
if (rows.some((row) => !row.passed) || JSON.stringify(sourceBefore) !== JSON.stringify(sourceManifest())) process.exitCode = 1;
