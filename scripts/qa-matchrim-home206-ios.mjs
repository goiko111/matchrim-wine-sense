import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';

const out = path.resolve(process.argv[2]), base = path.dirname(out);
assert(path.basename(base) === 'presentation206-20261024' && !fs.existsSync(out));
const native = JSON.parse(fs.readFileSync(base + '/uikit108-r1/RESULT.json'));
const prep = JSON.parse(fs.readFileSync(base + '/candidate108-r2/preparation.json'));
assert(native.passed && prep.passed && prep.build === 108);
const env = { ...process.env, DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' };
const device = native.device, owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const bundleId = 'wine.matchrim.qa108presentation206v1';
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID']]) {
    const lease = leases[resource]; assert(lease?.owner === owner && lease.leaseId === env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(base); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  for (const [file, digest] of Object.entries(prep.sourceFingerprints)) assert.equal(hash(file), digest, file);
  for (const [file, digest] of Object.entries(prep.webResources)) assert.equal(hash(native.app + '/public/' + file), digest, file);
};
const xcrun = args => execFileSync('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 60000 });
guard(); fs.mkdirSync(out, { mode: 0o700 });
const prior = spawnSync('/usr/bin/xcrun', ['simctl', 'get_app_container', device, bundleId, 'data'], { env, encoding: 'utf8' });
assert(prior.status !== 0 && prior.error === undefined, 'Fresh app container required; do not clear or reuse existing profile data');
const app = out + '/App.app'; fs.cpSync(native.app, app, { recursive: true });
execFileSync('/usr/bin/plutil', ['-replace', 'CFBundleIdentifier', '-string', bundleId, app + '/Info.plist']);
xcrun(['simctl', 'install', device, app]);
const project = out + '/project'; fs.mkdirSync(project);
for (const name of ['Probe97.xcodeproj', 'Probe97.xctestplan']) fs.cpSync(base + '/uikit108-r1/project/' + name, project + '/' + name, { recursive: true });
fs.copyFileSync('scripts/MatchrimPresentation206.swift', project + '/AutomationModeProbe.swift');
const receipt = { startedUTC: new Date().toISOString(), passed: false, build: 108, productCommit: prep.commit, stages: [],
  bundleId, freshContainer: true, infoPlistSHA256: hash(app + '/Info.plist'),
  harnessSHA256: hash('scripts/MatchrimPresentation206.swift'), scope: 'Actual compiled108 in a new native QA container with no retained profile/session: home, meal entry and back; normal/MAX UIKit audit. No login, consent acceptance, photo upload or analysis. No network interception claim; no master/identity/tasting validation. Restaurant may create an empty local draft.' };
const originalSize = xcrun(['simctl', 'ui', device, 'content_size']).trim();
try {
  for (const size of ['large', 'accessibility-extra-extra-extra-large']) {
    guard(); xcrun(['simctl', 'ui', device, 'content_size', size]);
    const stage = { size, name: size === 'large' ? 'normal' : 'max' }; receipt.stages.push(stage);
    const root = out + '/' + stage.name; fs.mkdirSync(root);
    const args = ['test', '-quiet', '-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-destination', 'id=' + device,
      '-derivedDataPath', out + '/derived', '-resultBundlePath', root + '/result.xcresult', '-collect-test-diagnostics', 'never',
      '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1',
      'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.presentation206.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    const fd = fs.openSync(root + '/runtime.log', 'wx', 0o600);
    const child = spawn(env.DEVELOPER_DIR + '/usr/bin/xcodebuild', args, { env, stdio: ['ignore', fd, fd] });
    let stopped = null;
    const stop = reason => { if (stopped) return; stopped = reason; child.kill('SIGINT'); setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref(); };
    const timer = setTimeout(() => stop('WALL_LIMIT'), 180000);
    const watch = setInterval(() => { try { guard(); } catch { stop('RESOURCE_HOLD'); } }, 2000);
    try { stage.result = await new Promise(resolve => { child.once('error', error => resolve({ error: String(error) })); child.once('close', (code, signal) => resolve({ code, signal })); }); }
    finally { clearInterval(watch); clearTimeout(timer); fs.closeSync(fd); }
    stage.stopped = stopped; assert(stage.result.code === 0 && !stopped, 'UIKIT_HOME_FAILED:' + stage.name);
    stage.attachments = xcrun(['xcresulttool', 'export', 'attachments', '--path', root + '/result.xcresult', '--output-path', root + '/attachments']);
  }
  guard(); receipt.passed = true;
} catch (error) { receipt.error = String(error.stack || error); }
finally { try { xcrun(['simctl', 'terminate', device, bundleId]); receipt.ownAppTerminated = true; } catch { receipt.ownAppTerminated = false; }
  try { xcrun(['simctl', 'ui', device, 'content_size', originalSize]); receipt.restored = true; } catch { receipt.restored = false; receipt.passed = false; }
  receipt.finishedUTC = new Date().toISOString(); fs.writeFileSync(out + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
