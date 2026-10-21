import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';

const repo = process.cwd();
const prep = JSON.parse(fs.readFileSync(path.resolve(process.argv[2], 'preparation.json')));
const output = path.resolve(process.argv[3]);
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const sha = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource];
    assert(lease?.owner === '019f9da7-ae96-7c60-a1b4-fafb75b04d6d' && lease.leaseId === process.env[key]
      && lease.reviewAfter * 1000 > Date.now(), resource);
  }
};
const verify = () => {
  for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
  for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(prep.production, 'ios/App/App/public', file))), hash, file);
};
guard(); verify();
const disk = fs.statfsSync(path.dirname(output));
assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
assert(prep.passed && prep.typecheck === 'PASS' && Number.isSafeInteger(prep.build) && prep.build > 100,
  'Uploaded100 is frozen; archive a new candidate');
assert.equal(prep.publicConfiguration.fixtures, false);
assert.equal(prep.publicConfiguration.project, 'cbjynrbvrhcmpaojmqdp');
const cap = JSON.parse(fs.readFileSync(path.join(prep.production, 'ios/App/App/capacitor.config.json')));
assert.equal(cap.appId, 'wine.matchrim.app'); assert(!cap.server?.url);
assert(!fs.existsSync(output)); fs.mkdirSync(output, { mode: 0o700 });
const archive = path.join(output, `Matchrim${prep.build}.xcarchive`);
const args = ['archive', '-quiet', '-workspace', path.join(prep.production, 'ios/App/App.xcworkspace'),
  '-scheme', 'App', '-configuration', 'Release', '-destination', 'generic/platform=iOS',
  '-derivedDataPath', path.join(output, 'derived'), '-archivePath', archive,
  '-resultBundlePath', path.join(output, 'archive.xcresult'), '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1',
  `CURRENT_PROJECT_VERSION=${prep.build}`, 'DEVELOPMENT_TEAM=8X3XTD6XYX', 'CODE_SIGN_STYLE=Automatic'];
const receipt = { startedUTC: new Date().toISOString(), sourceCommit: prep.commit, build: prep.build,
  version: '1.0', bundleId: cap.appId, command: [path.join(developer, 'usr/bin/xcodebuild'), ...args],
  uploaded: false, exported: false, webPublished: false, backendDeployed: false, modelStarts: 0,
  masterConnectionActive: prep.masterConnectionActive, recognitionE2EApproved: false };
const log = fs.openSync(path.join(output, 'archive.log'), 'wx', 0o600);
const child = spawn(receipt.command[0], args, { env: { ...process.env, DEVELOPER_DIR: developer }, stdio: ['ignore', log, log] });
let stopReason = null;
const stop = reason => {
  if (stopReason) return;
  stopReason = reason; child.kill('SIGINT');
  setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref();
};
const timer = setTimeout(() => stop('ARCHIVE_WALL_LIMIT_8MIN'), 480000);
const watch = setInterval(() => { try { guard(); } catch { stop('OWN_LEASE_ENDED'); } }, 2000);
try {
  const result = await new Promise(resolve => {
    child.once('error', error => resolve({ error: String(error) }));
    child.once('close', (code, signal) => resolve({ code, signal }));
  });
  Object.assign(receipt, { result, stopReason });
  assert(result.code === 0 && !stopReason, 'ARCHIVE_FAILED');
  guard(); verify();
  const app = path.join(archive, 'Products/Applications/App.app');
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
  const get = key => execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', path.join(app, 'Info.plist')], { encoding: 'utf8' }).trim();
  assert.equal(get('CFBundleVersion'), String(prep.build)); assert.equal(get('CFBundleIdentifier'), cap.appId);
  for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), hash, file);
  Object.assign(receipt, { passed: true, archive, signatureVerified: true, verifiedResources: Object.keys(prep.webResources).length });
} catch (error) { receipt.passed = false; receipt.error = error.stack || String(error); }
finally {
  clearTimeout(timer); clearInterval(watch); fs.closeSync(log);
  receipt.finishedUTC = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'ARCHIVE-RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ passed: receipt.passed, build: prep.build, archive: receipt.archive, uploaded: false, output, error: receipt.error }));
process.exitCode = receipt.passed ? 0 : 1;
