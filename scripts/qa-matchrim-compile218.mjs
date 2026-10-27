// Compile only: no simulator boot/install/launch, account, signing or network QA.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

const repo = process.cwd(), prep = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const out = path.resolve(process.argv[3]), developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
assert(path.dirname(out) === path.join(repo, 'qa-artifacts/native218-20261025') && /^compile(?:110|111|112|113|114|115|116|117|118|119|120|121|122|123|124|125|126)-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const sha = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(repo); assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
const verify = app => {
  assert(prep.passed && [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126].includes(prep.build) && !prep.sourceDirty && prep.typecheck === 'PASS');
  for (const [file, expected] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), expected, file);
  if (app) {
    for (const [file, expected] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), expected, file);
    assert.equal(execFileSync('/usr/bin/plutil', ['-extract', 'CFBundleVersion', 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8' }).trim(), String(prep.build));
  }
};
guard(); verify(); fs.mkdirSync(out, { mode: 0o700 });
const args = ['build', '-quiet', '-workspace', path.join(prep.production, 'ios/App/App.xcworkspace'), '-scheme', 'App',
  '-configuration', 'Debug', '-sdk', 'iphonesimulator', '-destination', 'generic/platform=iOS Simulator',
  '-derivedDataPath', out + '/derived', '-resultBundlePath', out + '/result.xcresult',
  '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1', 'ARCHS=arm64', 'ONLY_ACTIVE_ARCH=YES',
  'CODE_SIGNING_ALLOWED=NO', `CURRENT_PROJECT_VERSION=${prep.build}`];
const receipt = { startedUTC: new Date().toISOString(), passed: false, sourceCommit: prep.commit, sourceDirty: prep.sourceDirty,
  build: prep.build, args, leases: { heavy: process.env.MATCHRIM102_HEAVY_LEASE_ID, writer: process.env.MATCHRIM102_WRITER_LEASE_ID },
  scope: 'Unsigned arm64 iOS Simulator compile only; no boot/install/launch, UIKit, recognition, catalogue validation, signing, export or TestFlight.',
  app: null, stopped: null, result: null, finishedUTC: null };
const fd = fs.openSync(out + '/runtime.log', 'wx', 0o600);
let child, timer, watch;
try {
  child = spawn(developer + '/usr/bin/xcodebuild', args, { env: { ...process.env, DEVELOPER_DIR: developer }, stdio: ['ignore', fd, fd] });
  const stop = reason => { if (receipt.stopped) return; receipt.stopped = reason; child.kill('SIGINT');
    setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref(); };
  timer = setTimeout(() => stop('WALL_LIMIT'), 300000);
  watch = setInterval(() => { try { guard(); } catch (error) { stop(String(error)); } }, 3000);
  receipt.result = await new Promise(resolve => { child.once('error', error => resolve({ error: String(error) })); child.once('close', (code, signal) => resolve({ code, signal })); });
  assert(receipt.result.code === 0 && !receipt.stopped, 'COMPILE_FAILED');
  const app = out + '/derived/Build/Products/Debug-iphonesimulator/App.app'; verify(app);
  receipt.app = { path: app, executableSHA256: sha(fs.readFileSync(app + '/App')), infoSHA256: sha(fs.readFileSync(app + '/Info.plist')), resources: Object.keys(prep.webResources).length };
  receipt.passed = true;
} catch (error) { receipt.error = String(error); }
finally { clearTimeout(timer); clearInterval(watch); fs.closeSync(fd); receipt.finishedUTC = new Date().toISOString();
  fs.writeFileSync(out + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); }
console.log(JSON.stringify(receipt, null, 2)); process.exitCode = receipt.passed ? 0 : 1;
