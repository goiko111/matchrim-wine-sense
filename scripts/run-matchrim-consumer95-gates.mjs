import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = process.argv[2];
if (!output || !path.isAbsolute(output) || fs.existsSync(output)) throw new Error('Explicit new absolute evidence directory required');
fs.mkdirSync(output, { recursive: true, mode: 0o700 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceCommit = git('rev-parse', 'HEAD');
const manifest = () => {
  const paths = git('ls-files', '--cached', '--others', '--exclude-standard', '--', 'src', 'public', 'ios', 'supabase', 'scripts', 'qa-fixtures',
    'index.html', 'package.json', 'package-lock.json', 'capacitor.config.ts', 'vite.config.ts', 'tailwind.config.ts',
    'postcss.config.js', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'components.json').split('\n').filter(Boolean);
  return Object.fromEntries([...new Set(paths)].sort().map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
};
const before = manifest();
const buildOutput = path.join(output, 'web');
const resources = folder => Object.fromEntries(fs.readdirSync(folder, { recursive: true }).sort()
  .filter(file => fs.lstatSync(path.join(folder, file)).isFile())
  .map(file => [file, sha(fs.readFileSync(path.join(folder, file)))]));
const groups = ['test:closure96', 'test:consumer95', 'test:backend95', 'test:identity94', 'test:release', 'test:cloud', 'test:remediation89',
  'test:scene90', 'test:restaurant91', 'test:openai92', 'test:release93', 'typecheck', 'lint', 'build'];
const results = [];
const env = { ...process.env, VITE_MATCHRIM_EDGE_RELEASE: '75', VITE_SUPABASE_DB_SCHEMA: 'public',
  VITE_MATCHRIM_QA_FIXTURES: 'false', VITE_APP_ANALYTICS_ENABLED: 'false', VITE_MATCHRIM_NATIVE_GUIDE_ENABLED: 'true',
  VITE_MATCHRIM_ONBOARDING_PREVIEW: 'false', VITE_MATCHRIM_SHARE_ORIGIN: 'https://matchrim-wine-sense.lovable.app' };
for (const group of groups) {
  const start = Date.now();
  const args = ['run', group, ...(group === 'build' ? ['--', '--outDir', buildOutput] : [])];
  const run = spawnSync('npm', args, { cwd: root, env, encoding: 'utf8', timeout: 300000, maxBuffer: 32 * 1024 * 1024 });
  const log = (run.stdout ?? '') + (run.stderr ?? '');
  const filename = group.replaceAll(':', '-') + '.log';
  fs.writeFileSync(path.join(output, filename), log, { flag: 'wx', mode: 0o600 });
  results.push({ group, exitCode: run.status, error: run.error?.message ?? null, elapsedMs: Date.now() - start,
    passed: run.status === 0 && !run.error, log: filename, logSha256: sha(log) });
  const after = manifest();
  const unchanged = sourceCommit === git('rev-parse', 'HEAD') && JSON.stringify(before) === JSON.stringify(after);
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ sourceCommit, sourceDirty: Boolean(git('status', '--porcelain=v1')),
    sourceBefore: before, sourceAfter: after, unchanged, results, finished: results.length === groups.length,
    webResources: fs.existsSync(buildOutput) ? resources(buildOutput) : null,
    passed: results.length === groups.length && unchanged && results.every(result => result.passed),
    scope: 'Local automated regressions and compilation. Does not certify hosted recognition, human taste accuracy, native UI, signing or TestFlight availability.' }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(results.at(-1)));
}
if (results.some(result => !result.passed) || sourceCommit !== git('rev-parse', 'HEAD')
  || JSON.stringify(before) !== JSON.stringify(manifest())) process.exitCode = 1;
