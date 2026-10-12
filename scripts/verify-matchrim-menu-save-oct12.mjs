import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const output = process.argv[2];
if (!output) throw new Error('Pass a local output directory');
mkdirSync(output, { recursive: true });
const results = [];
for (const command of ['typecheck', 'lint', 'build']) {
  const start = Date.now();
  const result = spawnSync('npm', ['run', command], { encoding: 'utf8' });
  writeFileSync(join(output, `${command}.log`), result.stdout + result.stderr);
  results.push({ command: `npm run ${command}`, exitCode: result.status, durationMs: Date.now() - start });
  console.log(command, result.status === 0 ? 'PASS' : 'FAIL');
  if (result.status !== 0) break;
}
writeFileSync(join(output, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
if (results.length !== 3 || results.some((row) => row.exitCode !== 0)) process.exitCode = 1;
