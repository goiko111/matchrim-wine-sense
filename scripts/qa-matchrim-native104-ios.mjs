import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

const repo = process.cwd(), prep = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const root = path.resolve(process.argv[3]), developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127', bundleId = 'wine.matchrim.qa99review';
const env = { ...process.env, DEVELOPER_DIR: developer };
const sha = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(path.dirname(root)); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
const verify = (app = null) => {
  assert(prep.passed && prep.typecheck === 'PASS' && prep.build > 100);
  for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
  if (app) {
    for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), hash, file);
    assert.equal(execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleVersion', 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8' }).trim(), String(prep.build));
  }
};
const xcrun = args => execFileSync('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 120000 });
const receipt = { startedUTC: new Date().toISOString(), build: prep.build, sourceCommit: prep.commit, sourceDirty: prep.sourceDirty,
  scope: 'Production native assets compiled and unchanged portrait UIKit/navigation/keyboard/a11y harness. No account login, image analysis, phone, host focus or paid models. This is not recognition or human taste accuracy approval.',
  device, bundleId, stages: [], modelStarts: 0, webPublished: false, uploaded: false };
async function run(name, args, limit = 240000) {
  guard(); verify(); const output = path.join(root, name); fs.mkdirSync(output);
  const fd = fs.openSync(path.join(output, 'runtime.log'), 'wx', 0o600);
  const child = spawn(developer + '/usr/bin/xcodebuild', args, { env, stdio: ['ignore', fd, fd] });
  const stage = { name, args, startedUTC: new Date().toISOString() }; receipt.stages.push(stage);
  let stopped = null;
  const stop = reason => { if (stopped) return; stopped = reason; child.kill('SIGINT');
    setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref(); };
  const timer = setTimeout(() => stop('WALL_LIMIT'), limit);
  const watch = setInterval(() => { try { guard(); } catch { stop('RESOURCE_HOLD'); } }, 2000);
  try {
    stage.result = await new Promise(resolve => { child.once('error', error => resolve({ error: String(error) })); child.once('close', (code, signal) => resolve({ code, signal })); });
    stage.stopped = stopped; stage.finishedUTC = new Date().toISOString();
    assert(stage.result.code === 0 && !stopped, name + ' failed');
  } finally { clearTimeout(timer); clearInterval(watch); fs.closeSync(fd); }
}
guard(); verify(); assert(!fs.existsSync(root)); fs.mkdirSync(root, { mode: 0o700 });
let originalSize;
try {
  const devices = JSON.parse(xcrun(['simctl', 'list', 'devices', '--json'])).devices;
  const target = Object.values(devices).flat().find(row => row.udid === device); assert(target?.isAvailable);
  if (target.state === 'Shutdown') { xcrun(['simctl', 'boot', device]); xcrun(['simctl', 'bootstatus', device, '-b']); }
  originalSize = xcrun(['simctl', 'ui', device, 'content_size']).trim();
  assert(/^(extra-small|small|medium|large|extra-large|extra-extra-large|extra-extra-extra-large|accessibility-medium|accessibility-large|accessibility-extra-large|accessibility-extra-extra-large|accessibility-extra-extra-extra-large)$/.test(originalSize));
  const shared = ['-destination', 'id=' + device, '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', `CURRENT_PROJECT_VERSION=${prep.build}`];
  await run('build', ['build', '-quiet', '-workspace', path.join(prep.production, 'ios/App/App.xcworkspace'), '-scheme', 'App', '-configuration', 'Debug', '-sdk', 'iphonesimulator',
    '-derivedDataPath', root + '/build/derived', '-resultBundlePath', root + '/build/result.xcresult', ...shared, 'PRODUCT_BUNDLE_IDENTIFIER=' + bundleId]);
  const app = root + '/build/derived/Build/Products/Debug-iphonesimulator/App.app'; verify(app); receipt.app = app;
  xcrun(['simctl', 'install', device, app]); receipt.installed = true;
  const harness = path.resolve('qa-artifacts/native99-20261021/native-audit-project'), project = root + '/project'; fs.mkdirSync(project);
  for (const name of ['Probe97.xcodeproj', 'Probe97.xctestplan', 'AutomationModeProbe.swift']) fs.cpSync(path.join(harness, name), path.join(project, name), { recursive: true });
  receipt.originalTestSHA256 = sha(fs.readFileSync(project + '/AutomationModeProbe.swift'));
  for (const size of ['large', 'accessibility-extra-extra-extra-large']) {
    guard(); verify(app); xcrun(['simctl', 'ui', device, 'content_size', size]);
    const name = size === 'large' ? 'normal' : 'max';
    await run(name, ['test', '-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-destination-timeout', '10',
      '-derivedDataPath', root + '/' + name + '/derived', '-resultBundlePath', root + '/' + name + '/result.xcresult',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', ...shared, 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa104.navigation.uitests', 'ONLY_ACTIVE_ARCH=YES']);
    receipt.stages.at(-1).attachmentExport = xcrun(['xcresulttool', 'export', 'attachments', '--path', root + '/' + name + '/result.xcresult', '--output-path', root + '/' + name + '/attachments']);
  }
  verify(app); receipt.passed = true;
} catch (error) { receipt.passed = false; receipt.error = error.stack || String(error); }
finally {
  if (originalSize) try { guard(); xcrun(['simctl', 'ui', device, 'content_size', originalSize]); receipt.contentSizeRestored = true; }
  catch (error) { receipt.contentSizeRestored = false; receipt.restoreError = String(error); receipt.passed = false; }
  receipt.finishedUTC = new Date().toISOString();
  fs.writeFileSync(root + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify(receipt)); process.exitCode = receipt.passed ? 0 : 1;
