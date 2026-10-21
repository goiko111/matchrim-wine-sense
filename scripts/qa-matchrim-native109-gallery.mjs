import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

const repo = process.cwd(), prep = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const app = path.resolve(process.argv[3]), output = path.resolve(process.argv[4]);
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127', bundle = 'wine.matchrim.qa99review';
const env = { ...process.env, DEVELOPER_DIR: developer };
const sha = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const { leases } = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json'));
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource]; assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d'
      && lease.leaseId === env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(path.dirname(output)); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
const verify = () => {
  assert(prep.passed && prep.typecheck === 'PASS' && prep.build >= 103);
  assert(Object.hasOwn(prep.sourceFingerprints, 'src/utils/nativeSingleLabel109.ts'), 'Local mode is required before any photo is selected');
  for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
  for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), hash, file);
  assert.equal(execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleVersion', 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8' }).trim(), String(prep.build));
  assert.equal(execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleIdentifier', 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8' }).trim(), bundle);
};
const xcrun = args => { guard(); return execFileSync('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 120000 }); };
guard(); verify(); assert(!fs.existsSync(output)); fs.mkdirSync(output, { mode: 0o700 });
const receipt = { startedUTC: new Date().toISOString(), build: prep.build, commit: prep.commit, device, bundle,
  scope: 'Intended genuine anonymous simulator gallery -> Apple Vision -> public catalogue -> explicit selection. No mock bridge or detector. Test must assert local mode before file selection. No signup/rating/save or physical iPhone. No network interception: zero-provider conclusion additionally depends on local-mode source contracts, not packet capture.',
  webPublished: false, backendDeployed: false, testFlightUploaded: false, modelStartsRequested: 0 };
let originalSize, recorder, recordingDone, videoFD;
try {
  const devices = JSON.parse(xcrun(['simctl', 'list', 'devices', '--json'])).devices;
  const selected = Object.values(devices).flat().find(row => row.udid === device); assert(selected?.isAvailable);
  if (selected.state === 'Shutdown') { xcrun(['simctl', 'boot', device]); xcrun(['simctl', 'bootstatus', device, '-b']); }
  originalSize = xcrun(['simctl', 'ui', device, 'content_size']).trim();
  xcrun(['simctl', 'ui', device, 'content_size', 'large']);
  xcrun(['simctl', 'install', device, app]);
  const photo = path.resolve('qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/img-061.jpg');
  receipt.input = { file: photo, sha256: sha(fs.readFileSync(photo)) };
  const media = path.join(output, 'MATCHRIM_QA109_BIOGRAFO.jpg'); fs.copyFileSync(photo, media);
  assert.equal(sha(fs.readFileSync(media)), receipt.input.sha256);
  xcrun(['simctl', 'addmedia', device, media]); receipt.mediaImported = true;
  const project = path.join(output, 'project'); fs.mkdirSync(project);
  const base = path.resolve('qa-artifacts/native99-20261021/native-audit-project');
  fs.cpSync(base + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
  const plan = JSON.parse(fs.readFileSync(base + '/Probe97.xctestplan'));
  plan.defaultOptions.defaultTestExecutionTimeAllowance = 200; plan.defaultOptions.maximumTestExecutionTimeAllowance = 200;
  fs.writeFileSync(project + '/Probe97.xctestplan', JSON.stringify(plan, null, 2) + '\n');
  const probe = fs.readFileSync('scripts/MatchrimLocalGallery109Probe.swift');
  receipt.probeSHA256 = sha(probe); fs.writeFileSync(project + '/AutomationModeProbe.swift', probe);
  videoFD = fs.openSync(output + '/video.log', 'wx', 0o600);
  recorder = spawn('/usr/bin/xcrun', ['simctl', 'io', device, 'recordVideo', '--codec=h264', output + '/gallery109.mp4'], { env, stdio: ['ignore', videoFD, videoFD] });
  recordingDone = new Promise(resolve => { recorder.once('error', error => resolve({ error: String(error) })); recorder.once('close', (code, signal) => resolve({ code, signal })); });
  const log = fs.openSync(output + '/runtime.log', 'wx', 0o600);
  const args = ['test', '-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-destination', 'id=' + device,
    '-derivedDataPath', output + '/derived', '-resultBundlePath', output + '/result.xcresult', '-collect-test-diagnostics', 'never',
    '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1',
    'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa109.gallery.uitests', 'ONLY_ACTIVE_ARCH=YES'];
  receipt.command = args;
  const child = spawn(developer + '/usr/bin/xcodebuild', args, { env, stdio: ['ignore', log, log] });
  let stopped = null;
  const stop = reason => { if (stopped) return; stopped = reason; child.kill('SIGINT');
    setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref(); };
  const timer = setTimeout(() => stop('WALL_LIMIT'), 240000);
  const watch = setInterval(() => { try { guard(); verify(); } catch { stop('RESOURCE_OR_SOURCE_HOLD'); } }, 3000);
  try { receipt.result = await new Promise(resolve => { child.once('error', error => resolve({ error: String(error) })); child.once('close', (code, signal) => resolve({ code, signal })); }); }
  finally { clearTimeout(timer); clearInterval(watch); fs.closeSync(log); }
  receipt.stopped = stopped;
  if (fs.existsSync(output + '/result.xcresult')) receipt.attachments = xcrun(['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments']);
  assert(receipt.result.code === 0 && !stopped, 'Native gallery test failed; preserve debug tree and do not call recognition validated');
  verify(); receipt.passed = true;
} catch (error) { receipt.passed = false; receipt.error = String(error.stack || error); }
finally {
  if (recorder) { recorder.kill('SIGINT');
    const force = setTimeout(() => { if (recorder.exitCode === null && recorder.signalCode === null) recorder.kill('SIGKILL'); }, 10000);
    receipt.videoResult = await recordingDone; clearTimeout(force); }
  if (videoFD !== undefined) fs.closeSync(videoFD);
  receipt.videoReady = receipt.videoResult?.code === 0 && fs.existsSync(output + '/gallery109.mp4')
    && fs.statSync(output + '/gallery109.mp4').size > 1024;
  if (!receipt.videoReady) { receipt.passed = false; receipt.videoError = 'A complete nonempty simulator recording is required'; }
  if (originalSize) try { xcrun(['simctl', 'ui', device, 'content_size', originalSize]); receipt.contentSizeRestored = true; }
  catch (error) { receipt.contentSizeRestored = false; receipt.restoreError = String(error); receipt.passed = false; }
  receipt.finishedUTC = new Date().toISOString();
  fs.writeFileSync(output + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600 });
}
console.log(JSON.stringify({ passed: receipt.passed, output, error: receipt.error })); process.exitCode = receipt.passed ? 0 : 1;
