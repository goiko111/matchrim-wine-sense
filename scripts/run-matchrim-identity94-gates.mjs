import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const output = process.argv[2];
if (!output?.startsWith('/')) throw new Error('Absolute evidence directory required');
fs.mkdirSync(output, { recursive: true });
const groups = ['test:identity94', 'test:release', 'test:cloud', 'test:remediation89', 'test:scene90',
  'test:restaurant91', 'test:openai92', 'test:release93', 'typecheck', 'lint', 'build'];
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const before = git('rev-parse', 'HEAD');
const manifest = () => Object.fromEntries(git('ls-files', '--', 'src', 'ios', 'package.json', 'package-lock.json').split('\n')
  .filter(Boolean).map(file => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')]));
const inputs = manifest();
const results = [];
for (const group of groups) {
  const start = Date.now();
  const run = spawnSync('npm', ['run', group], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, VITE_APP_ANALYTICS_ENABLED: 'false' } });
  const log = path.join(output, group.replaceAll(':', '-') + '.log');
  fs.writeFileSync(log, (run.stdout ?? '') + (run.stderr ?? ''));
  results.push({ group, exitCode: run.status, elapsedMs: Date.now() - start, log });
  console.log(JSON.stringify(results.at(-1)));
}
const unchanged = before === git('rev-parse', 'HEAD') && JSON.stringify(inputs) === JSON.stringify(manifest());
const report = { sourceCommit: before, inputs, unchanged, results, passed: results.every(row => row.exitCode === 0) && unchanged,
  scope: 'Local automated source regressions and compilation. No fresh recognition/human/native distribution acceptance.' };
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
