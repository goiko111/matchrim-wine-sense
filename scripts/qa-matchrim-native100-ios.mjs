import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

const repo = process.cwd();
const root = path.resolve(process.argv[2]);
const size = process.argv[3] || 'large';
assert(['large', 'accessibility-extra-extra-extra-large'].includes(size));
const base = path.resolve('qa-artifacts/native102-20261021');
const prep = JSON.parse(fs.readFileSync(base + '/final-r2/preparation.json'));
const sim = JSON.parse(fs.readFileSync(base + '/simulator100-r1/BUILD-RESULT.json'));
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
const env = { ...process.env, DEVELOPER_DIR: developer };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM100_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM100_SIMULATOR_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
      && lease.leaseId === process.env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
};
const verify = () => {
  assert(prep.passed && sim.passed && prep.build === 100 && sim.sourceCommit === prep.commit);
  for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
  for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(sim.app, 'public', file))), hash, file);
  const version = execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleVersion', 'raw', '-o', '-', sim.app + '/Info.plist'], { encoding: 'utf8' }).trim();
  assert.equal(version, '100');
};
const xcrun = args => execFileSync('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 30000 });
guard(); verify();
const disk = fs.statfsSync(path.dirname(root));
assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
assert(!fs.existsSync(root)); fs.mkdirSync(root, { mode: 0o700 });
const originalSize = xcrun(['simctl', 'ui', device, 'content_size']).trim();
assert(/^(extra-small|small|medium|large|extra-large|extra-extra-large|extra-extra-extra-large|accessibility-medium|accessibility-large|accessibility-extra-large|accessibility-extra-extra-large|accessibility-extra-extra-extra-large)$/.test(originalSize));
const project = path.join(root, 'project'); fs.mkdirSync(project);
const previous = path.resolve('qa-artifacts/native99-20261021/native-audit-project');
for (const file of ['Probe97.xcodeproj', 'Probe97.xctestplan', 'AutomationModeProbe.swift']) fs.cpSync(path.join(previous, file), path.join(project, file), { recursive: true });
const receipt = { startedUTC: new Date().toISOString(), productCommit: prep.commit, build: 100,
  size, originalSize, device, app: sim.app, bundleId: sim.bundleId, installed: false,
  scope: 'Existing portrait navigation/keyboard/accessibility XCTest assertions run unchanged against hashed production100 assets in a dedicated simulator. No host mouse/keyboard, no phone, account login, image analysis or AI send. Does not validate recognition or human taste accuracy.',
  originalTestSHA256: sha(fs.readFileSync(project + '/AutomationModeProbe.swift')), modelRequestsTriggered: 0,
  originalHarnessNamesRetained: true, webPublished: false, uploaded: false };
let child, timer, watch, fd, stopped = null;
try {
  guard();
  xcrun(['simctl', 'install', device, sim.app]); receipt.installed = true;
  xcrun(['simctl', 'ui', device, 'content_size', size]);
  const args = ['test', '-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97',
    '-destination', 'id=' + device, '-destination-timeout', '10', '-derivedDataPath', root + '/derived',
    '-resultBundlePath', root + '/result.xcresult', '-collect-test-diagnostics', 'never',
    '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1',
    'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa100.navigation.uitests',
    'CURRENT_PROJECT_VERSION=100', 'ONLY_ACTIVE_ARCH=YES'];
  receipt.command = [developer + '/usr/bin/xcodebuild', ...args];
  fd = fs.openSync(root + '/runtime.log', 'wx', 0o600);
  child = spawn(receipt.command[0], args, { env, stdio: ['ignore', fd, fd] });
  const stop = reason => {
    if (stopped) return;
    stopped = reason; child.kill('SIGINT');
    setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref();
  };
  timer = setTimeout(() => stop('WALL_LIMIT240S'), 240000);
  watch = setInterval(() => { try { guard(); } catch { stop('OWN_LEASE_ENDED'); } }, 2000);
  receipt.result = await new Promise(resolve => {
    child.once('error', error => resolve({ error: String(error) }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  verify();
  receipt.passed = receipt.result.code === 0 && !stopped;
  if (fs.existsSync(root + '/result.xcresult')) {
    receipt.attachmentExport = xcrun(['xcresulttool', 'export', 'attachments', '--path', root + '/result.xcresult', '--output-path', root + '/attachments']);
  }
} catch (error) { receipt.passed = false; receipt.error = error.stack || String(error); }
finally {
  clearTimeout(timer); clearInterval(watch); if (fd !== undefined) fs.closeSync(fd);
  try { guard(); xcrun(['simctl', 'ui', device, 'content_size', originalSize]); receipt.contentSizeRestored = true; }
  catch (error) { receipt.contentSizeRestored = false; receipt.restoreError = String(error); receipt.passed = false; }
  receipt.stopped = stopped; receipt.finishedUTC = new Date().toISOString();
  fs.writeFileSync(root + '/PROCESS-RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
