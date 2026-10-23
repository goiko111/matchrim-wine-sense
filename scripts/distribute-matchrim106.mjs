import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

const owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const sha = value => createHash('sha256').update(value).digest('hex');
export function validatePair106(prep, archive) {
  assert(prep.passed && prep.typecheck === 'PASS' && prep.build === 106 && prep.version === '1.0' && prep.sourceDirty === false);
  assert(prep.publicConfiguration?.fixtures === false && prep.publicConfiguration.project === 'cbjynrbvrhcmpaojmqdp');
  assert(archive.passed && archive.signatureVerified && archive.build === 106 && archive.version === '1.0'
    && archive.bundleId === 'wine.matchrim.app' && archive.sourceCommit === prep.commit);
}
export function validateOptions106(options, mode) {
  assert.equal(options.method, 'app-store-connect'); assert.equal(options.teamID, '8X3XTD6XYX');
  assert.equal(options.signingStyle, 'automatic'); assert.equal(options.destination, mode);
  assert.equal(options.manageAppVersionAndBuildNumber, false); assert.equal(options.uploadSymbols, true);
  assert.deepEqual(Object.keys(options).sort(), ['destination', 'manageAppVersionAndBuildNumber', 'method', 'signingStyle', 'teamID', 'uploadSymbols'].sort());
}
export const acknowledged106 = (result, log) => result.code === 0 && result.signal === null
  && /Upload succeeded/.test(log) && /Uploaded package is processing/.test(log) && /EXPORT SUCCEEDED/.test(log);

export async function main106(mode = process.argv[2]) {
  assert(['export', 'upload'].includes(mode));
  assert.equal(process.env.MATCHRIM106_PRIVATE_BETA, 'AUTHORIZED_BY_USER', 'CURRENT_HUMAN_UPLOAD_AUTHORIZATION_REQUIRED');
  const repo = process.cwd(), base = path.join(repo, 'qa-artifacts/testflight106-20261023');
  const prepFile = path.join(repo, 'qa-artifacts/night105-20261021/candidate106-r1/preparation.json');
  const archiveFile = path.join(base, 'archive106-r1/ARCHIVE-RESULT.json');
  const prepBytes = fs.readFileSync(prepFile), archiveBytes = fs.readFileSync(archiveFile);
  const prep = JSON.parse(prepBytes), archive = JSON.parse(archiveBytes); validatePair106(prep, archive);
  const output = path.join(base, mode + '106-r1'); assert(!fs.existsSync(output), 'NO_DUPLICATE_EXPORT_OR_UPLOAD');
  const guard = () => {
    const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json', 'utf8')).leases;
    for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']])
      assert(leases[resource]?.owner === owner && leases[resource].leaseId === process.env[key] && leases[resource].reviewAfter * 1000 > Date.now(), resource);
    const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
    assert.equal(sha(fs.readFileSync(prepFile)), sha(prepBytes)); assert.equal(sha(fs.readFileSync(archiveFile)), sha(archiveBytes));
  };
  const verify = () => {
    for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
    const app = path.join(archive.archive, 'Products/Applications/App.app');
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
    for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), hash, file);
  };
  guard(); verify();
  let exported;
  if (mode === 'upload') {
    exported = JSON.parse(fs.readFileSync(path.join(base, 'export106-r1/RESULT.json')));
    assert(exported.passed && exported.signatureVerified && exported.build === 106 && exported.debugEntitlement === false
      && exported.sourceCommit === prep.commit && exported.mode === 'export');
    assert.equal(sha(fs.readFileSync(exported.ipa)), exported.ipaSHA256, 'EXPORTED_IPA_DRIFT');
  }
  fs.mkdirSync(output, { mode: 0o700 });
  const existing = path.join(repo, 'qa-artifacts/native102-20261021', mode === 'export'
    ? 'distribution100-export-r1/ExportOptions.plist' : 'distribution100-upload-r1/ExportOptions-upload.plist');
  const options = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', existing], { encoding: 'utf8' }));
  validateOptions106(options, mode);
  const optionsFile = path.join(output, 'ExportOptions.plist'); fs.copyFileSync(existing, optionsFile); fs.chmodSync(optionsFile, 0o600);
  const args = ['-exportArchive', '-archivePath', archive.archive, '-exportPath', path.join(output, mode),
    '-exportOptionsPlist', optionsFile, '-allowProvisioningUpdates'];
  const receipt = { startedUTC: new Date().toISOString(), mode, sourceCommit: prep.commit, build: 106, version: '1.0', bundleId: 'wine.matchrim.app',
    archive: archive.archive, prepSHA256: sha(prepBytes), archiveReceiptSHA256: sha(archiveBytes),
    humanRequest: 'sube la 106 a testflight', privateBetaOnly: true, knownCataloguePending: 19,
    recognitionE2EApproved: false, masterConfigured: false, models: 0, uploadsOfUserPhotos: 0,
    webPublished: false, backendDeployed: false, testFlightInstallableConfirmed: false,
    command: [path.join(developer, 'usr/bin/xcodebuild'), ...args], owner,
    heavyLease: process.env.MATCHRIM102_HEAVY_LEASE_ID, writerLease: process.env.MATCHRIM102_WRITER_LEASE_ID };
  const logPath = path.join(output, 'runtime.log'), fd = fs.openSync(logPath, 'wx', 0o600);
  let stopped = null;
  const child = spawn(receipt.command[0], args, { env: { ...process.env, DEVELOPER_DIR: developer }, stdio: ['ignore', fd, fd] });
  const stop = reason => { if (stopped) return; stopped = reason; child.kill('SIGINT');
    setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref(); };
  const timer = setTimeout(() => stop('WALL_LIMIT_10MIN'), 600000);
  const watch = setInterval(() => { try { guard(); } catch { stop('RESOURCE_HOLD'); } }, 2000);
  try {
    receipt.result = await new Promise(resolve => { child.once('error', error => resolve({ error: String(error) })); child.once('close', (code, signal) => resolve({ code, signal })); });
    receipt.stopped = stopped;
    const log = fs.readFileSync(logPath, 'utf8');
    receipt.appleUploadAcknowledged = mode === 'upload' && acknowledged106(receipt.result, log);
    receipt.uploadStateUncertain = mode === 'upload' && !receipt.appleUploadAcknowledged;
    assert(receipt.result.code === 0 && !stopped, 'EXPORT_OR_UPLOAD_FAILED'); guard(); verify();
    if (mode === 'export') {
      const ipa = path.join(output, 'export/App.ipa'); assert(fs.existsSync(ipa));
      const verified = path.join(output, 'verified'); fs.mkdirSync(verified, { mode: 0o700 });
      execFileSync('/usr/bin/ditto', ['-x', '-k', ipa, verified]);
      const app = path.join(verified, 'Payload/App.app');
      execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
      const get = key => execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8' }).trim();
      assert.equal(get('CFBundleIdentifier'), 'wine.matchrim.app'); assert.equal(get('CFBundleVersion'), '106'); assert.equal(get('CFBundleShortVersionString'), '1.0');
      const entitlements = execFileSync('/usr/bin/codesign', ['-d', '--entitlements', ':-', app], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
      const values = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', '-'], { input: entitlements, encoding: 'utf8' }));
      assert.equal(values['get-task-allow'], false); assert.equal(values['application-identifier'], '8X3XTD6XYX.wine.matchrim.app');
      assert.equal(values['com.apple.developer.team-identifier'], '8X3XTD6XYX');
      for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), hash, file);
      Object.assign(receipt, { ipa, ipaSHA256: sha(fs.readFileSync(ipa)), ipaBytes: fs.statSync(ipa).size,
        signatureVerified: true, debugEntitlement: false, verifiedResources: Object.keys(prep.webResources).length });
    } else {
      assert(receipt.appleUploadAcknowledged, 'APPLE_ACK_REQUIRED_NO_AUTOMATIC_RESUBMISSION');
      receipt.exportedIPASHA256 = exported.ipaSHA256;
    }
    receipt.passed = true;
  } catch (error) { receipt.passed = false; receipt.error = String(error.stack || error); }
  finally {
    clearTimeout(timer); clearInterval(watch); fs.closeSync(fd); receipt.finishedUTC = new Date().toISOString();
    fs.writeFileSync(path.join(output, 'RESULT.json'), JSON.stringify(receipt, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  }
  console.log(JSON.stringify({ output, mode, passed: receipt.passed, appleUploadAcknowledged: receipt.appleUploadAcknowledged,
    testFlightInstallableConfirmed: false, error: receipt.error }));
  return receipt.passed ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main106().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
