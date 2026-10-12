const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = __dirname;
for (const name of ['qa-home', 'tmp', 'qa-device-set']) fs.mkdirSync(path.join(root, name), { recursive: true });
if (fs.existsSync(path.join(root, 'result.json'))) throw Error('One bounded discovery only');
const env = {
  PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
  HOME: path.join(root, 'qa-home'), CFFIXED_USER_HOME: path.join(root, 'qa-home'),
  TMPDIR: path.join(root, 'tmp') + '/', LANG: 'en_US.UTF-8',
  DEVELOPER_DIR: '/Applications/Xcode.app/Contents/Developer',
  USER: 'local-qa', LOGNAME: 'local-qa', CI: '1', DO_NOT_TRACK: '1',
};
const args = ['-f', path.join(root, 'offline.sb'), '/usr/bin/xcrun', 'simctl', '--set', path.join(root, 'qa-device-set'), 'list', 'runtimes', '--json'];
const started = new Date().toISOString();
const result = spawnSync('/usr/bin/sandbox-exec', args, { env, cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 2e6 });
const redact = value => value.replaceAll(root, '<NATIVE_QA>').replaceAll('/Users/GOIKO', '<HOME>').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '<REDACTED_EMAIL>');
fs.writeFileSync(path.join(root, 'discovery.log'), redact(result.stdout + result.stderr).trimEnd() + '\n');
function list(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? list(path.join(dir, entry.name)) : [path.relative(root, path.join(dir, entry.name))]);
}
let runtimes = null;
try { runtimes = JSON.parse(result.stdout).runtimes?.map(r => ({ name: r.name, version: r.version, build: r.buildversion, identifier: r.identifier, available: r.isAvailable, availabilityError: r.availabilityError || null })); } catch {}
const report = {
  started, finished: new Date().toISOString(), exitCode: result.status, signal: result.signal, error: result.error?.code || null,
  command: ['/usr/bin/sandbox-exec', ...args].map(redact), runtimes,
  qaStateFilesAfter: ['qa-home', 'qa-device-set', 'tmp'].flatMap(name => list(path.join(root, name))),
  privateHomeClientReadWriteDenied: true, publicRuntimeWritesDenied: true, internetDenied: true,
  initializationScope: 'Client explicitly targets QA state. Out-of-process CoreSimulator service initialization cannot be certified by client sandbox alone; do not relax limits if logs reveal real HOME use.',
  buildAttempted: false, installLaunchOrBootAttempted: false, destinationEligibilityProven: false,
};
fs.writeFileSync(path.join(root, 'result.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
console.log(redact(result.stderr).slice(-5000));
process.exitCode = result.status === 0 ? 0 : 1;
