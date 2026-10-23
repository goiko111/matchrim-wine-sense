import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const repo = process.cwd(), root = path.resolve(process.argv[2]);
assert(root.startsWith(path.join(repo, 'qa-artifacts/continuation185-20261023') + path.sep));
assert(!fs.existsSync(root));
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']])
    assert(leases[resource]?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && leases[resource].leaseId === process.env[key]
      && leases[resource].reviewAfter * 1000 > Date.now(), resource);
  const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
guard(); fs.mkdirSync(root, { recursive: true, mode: 0o700 });
const checks = [
  ['release', 'npm', ['run', 'test:release']],
  ['consumer', 'npm', ['run', 'test:consumer95']],
  ['closure', 'npm', ['run', 'test:closure96']],
  ['restaurant', 'npm', ['run', 'test:restaurant91']],
  ['personas', process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-consumer95-personas.ts',
    '--output=/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim95-eight-hours-20261017/personas/etapa950/qa185-' + path.basename(root)]],
  ['food-profile', process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-food-profile95.ts']],
  ['local-scan', process.execPath, ['scripts/check-matchrim-local-scan109.mjs']],
  ['cellar-photo', process.execPath, ['--import', 'tsx', 'scripts/check-matchrim-cellar-photo98.ts']],
];
const selected = process.argv.find(arg => arg.startsWith('--only='))?.slice(7).split(',');
if (selected) assert(selected.length && new Set(selected).size === selected.length && selected.every(name => checks.some(row => row[0] === name)));
const planned = selected ? checks.filter(row => selected.includes(row[0])) : checks;
const report = { startedUTC: new Date().toISOString(), passed: false, results: [],
  planned: planned.map(row => row[0]),
  scope: 'Current offline regression suites. Node fetch/net/tls guarded against external connections; synthetic transports/users are not live backend, UIKit or taste-accuracy evidence.' };
for (const [name, command, args] of planned) {
  guard(); const folder = path.join(root, name); fs.mkdirSync(folder);
  const stdout = fs.openSync(path.join(folder, 'stdout.log'), 'wx', 0o600);
  const stderr = fs.openSync(path.join(folder, 'stderr.log'), 'wx', 0o600);
  const child = spawn(command, args, { cwd: repo, env: { ...process.env, CI: '1',
    NODE_OPTIONS: `--import=${path.join(repo, 'scripts/no-external-network185.mjs')}` }, stdio: ['ignore', stdout, stderr] });
  let stopped = null;
  const stop = reason => { if (stopped) return; stopped = reason; child.kill('SIGTERM'); };
  const timer = setTimeout(() => stop('WALL_LIMIT'), 240000);
  const watcher = setInterval(() => { try { guard(); } catch { stop('RESOURCE_HOLD'); } }, 1000);
  const result = await new Promise(resolve => {
    child.once('error', error => resolve({ code: null, error: String(error) }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  clearTimeout(timer); clearInterval(watcher); fs.closeSync(stdout); fs.closeSync(stderr);
  const row = { name, ...result, stopped, passed: result.code === 0 && !stopped };
  report.results.push(row); console.log(JSON.stringify(row));
  fs.writeFileSync(path.join(root, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  if (stopped) break;
}
report.passed = report.results.length === planned.length && report.results.every(row => row.passed);
report.finishedUTC = new Date().toISOString();
fs.writeFileSync(path.join(root, 'RESULT.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ root, passed: report.passed }));
process.exitCode = report.passed ? 0 : 1;
