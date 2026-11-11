import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { validateOptions106, acknowledged106 } from './distribute-matchrim106.mjs';
import { assertOwnLeases, runnerOwner } from './matchrim-runner-owner.mjs';

// Same export/upload path as 133, bound to candidate139 (133 plus the 134/135 afternoon fixes and the 139 E2E/learner findings),
// its signed archive, four focal native proofs (master259 and vintage283, normal and MAX) and an
// explicit human request for a private beta.
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const sha = value => createHash('sha256').update(value).digest('hex');
const sizes = { normal: 'large', max: 'accessibility-extra-extra-extra-large' };
export function validatePair139(prep, archive, auth) {
  assert(prep.passed && prep.typecheck === 'PASS' && prep.build === 139 && prep.version === '1.0'
    && prep.sourceDirty === false && prep.commit === auth.sourceCommit);
  assert(prep.publicConfiguration?.fixtures === false && prep.publicConfiguration.project === 'cbjynrbvrhcmpaojmqdp');
  assert(archive.passed && archive.signatureVerified && archive.build === 139 && archive.version === '1.0'
    && archive.bundleId === 'wine.matchrim.app' && archive.sourceCommit === prep.commit);
}
export function validateAuthorization139(auth) {
  assert(auth.build === 139 && /^[0-9a-f]{40}$/.test(auth.sourceCommit) && auth.privateBetaOnly === true
    && auth.humanExplicitUpload === true && auth.knownLimitationsAccepted === true
    && typeof auth.exactHumanReply === 'string' && auth.exactHumanReply.trim().length >= 8
    && Array.isArray(auth.knownLimitations) && auth.knownLimitations.length > 0,
  'EXPLICIT_LIMITED_BETA_AUTHORIZATION_REQUIRED');
}
export function validateVisual139(prep, proofs) {
  for (const [scenario, key] of [['master259', 'master259'], ['vintage283', 'vintage283']]) for (const name of ['normal', 'max']) {
    const proof = proofs[scenario]?.[name];
    assert(proof?.passed && proof.build === 139 && proof.sourceCommit === prep.commit && proof.liveAccountsUsed === false
      && proof.syntheticAccount === true && proof.catalogueDataInjected === true && proof.ownAppTerminated === true
      && proof.contentSizeRestored === true && proof[key]?.networkCallsAllowed === 0 && proof[key].realAccountUsed === false,
    `VISUAL_PROOF_${scenario}_${name}`);
    assert.equal(proof.stages.length, 1);
    const stage = proof.stages[0];
    assert(stage.name === name && stage.size === sizes[name] && stage.result?.code === 0 && stage.result.signal === null && stage.stopped === null);
  }
}

export async function main139(mode = process.argv[2]) {
  assert(['export', 'upload'].includes(mode));
  const repo = process.cwd(), base = path.join(repo, 'qa-artifacts/testflight139-20261111');
  const releaseFile = path.join(base, 'RELEASE.json'), authorizationFile = path.join(base, 'HUMAN-AUTHORIZATION.json');
  const releaseBytes = fs.readFileSync(releaseFile), authBytes = fs.readFileSync(authorizationFile);
  const release = JSON.parse(releaseBytes), authorization = JSON.parse(authBytes);
  const inside = file => { const resolved = path.resolve(repo, file);
    assert(resolved.startsWith(path.join(repo, 'qa-artifacts/native218-20261025') + path.sep), 'RELEASE_INPUT_OUTSIDE_EVIDENCE'); return resolved; };
  const inputs = { prep: inside(release.prep), archive: inside(release.archive),
    ...Object.fromEntries(['master259', 'vintage283'].flatMap(scenario => ['normal', 'max'].map(name => [`${scenario}.${name}`, inside(release.visual[scenario][name])]))) };
  const bytes = Object.fromEntries(Object.entries(inputs).map(([key, file]) => [key, fs.readFileSync(file)]));
  const prep = JSON.parse(bytes.prep), archive = JSON.parse(bytes.archive);
  const proofs = { master259: {}, vintage283: {} };
  for (const key of Object.keys(inputs).filter(item => item.includes('.'))) { const [scenario, name] = key.split('.'); proofs[scenario][name] = JSON.parse(bytes[key]); }
  validateAuthorization139(authorization); validatePair139(prep, archive, authorization); validateVisual139(prep, proofs);
  const output = path.join(base, mode + '139-r1'); assert(!fs.existsSync(output), 'NO_DUPLICATE_EXPORT_OR_UPLOAD');
  const owner = runnerOwner();
  const guard = () => {
    const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
    assertOwnLeases(leases, [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]);
    const disk = fs.statfsSync(repo); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
    for (const [file, original] of [[releaseFile, releaseBytes], [authorizationFile, authBytes], ...Object.entries(inputs).map(([key, file]) => [file, bytes[key]])])
      assert.equal(sha(fs.readFileSync(file)), sha(original));
  };
  const verify = () => {
    for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
    const app = path.join(archive.archive, 'Products/Applications/App.app');
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
    for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(path.join(app, 'public', file))), hash, file);
  };
  guard(); verify();
  const cap = JSON.parse(fs.readFileSync(path.join(prep.production, 'ios/App/App/capacitor.config.json')));
  assert.equal(cap.appId, 'wine.matchrim.app'); assert(!cap.server?.url, 'NO_REMOTE_PREVIEW');
  let exported;
  if (mode === 'upload') {
    exported = JSON.parse(fs.readFileSync(path.join(base, 'export139-r1/RESULT.json')));
    assert(exported.passed && exported.signatureVerified && exported.build === 139 && exported.debugEntitlement === false
      && exported.sourceCommit === prep.commit && exported.mode === 'export');
    assert.equal(sha(fs.readFileSync(exported.ipa)), exported.ipaSHA256, 'EXPORTED_IPA_DRIFT');
  }
  fs.mkdirSync(output, { mode: 0o700 });
  const originalOptions = path.join(repo, 'qa-artifacts/native102-20261021', mode === 'export'
    ? 'distribution100-export-r1/ExportOptions.plist' : 'distribution100-upload-r1/ExportOptions-upload.plist');
  const options = JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', originalOptions], { encoding: 'utf8' }));
  validateOptions106(options, mode);
  const optionsFile = path.join(output, 'ExportOptions.plist'); fs.copyFileSync(originalOptions, optionsFile); fs.chmodSync(optionsFile, 0o600);
  const args = ['-exportArchive', '-archivePath', archive.archive, '-exportPath', path.join(output, mode),
    '-exportOptionsPlist', optionsFile, '-allowProvisioningUpdates'];
  const receipt = { startedUTC: new Date().toISOString(), runnerOwner: owner, mode, sourceCommit: prep.commit, build: 139, version: '1.0',
    bundleId: 'wine.matchrim.app', archive: archive.archive, releaseSHA256: sha(releaseBytes), authorizationSHA256: sha(authBytes),
    inputSHA256: Object.fromEntries(Object.entries(bytes).map(([key, value]) => [key, sha(value)])),
    privateBetaOnly: true, recognitionE2EApproved: false, sensoryCalibrationApproved: false,
    winerimTasteValuesUsed: true, nativeLearningModel: 'native-v4', nativeCamera: true, ownPhotosOnDeviceOnly: true,
    candidateRecognition: 'candidates286-autolink139-clear-label', ocrEnlargedBelow1200px: 2, automaticIdentityLinks: 'clear-label-only',
    hostedMasterReferenceActive: true, pilotFeedbackMailto: true, labelCropSecondRead: true, iosMinimum: 15, automaticMasterLookups: false, models: 0, uploadsOfUserPhotos: 0,
    webPublished: false, backendDeployed: false, testFlightInstallableConfirmed: false,
    command: [path.join(developer, 'usr/bin/xcodebuild'), ...args] };
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
    receipt.appleUploadAcknowledged = mode === 'upload' && acknowledged106(receipt.result, fs.readFileSync(logPath, 'utf8'));
    receipt.uploadStateUncertain = mode === 'upload' && !receipt.appleUploadAcknowledged;
    assert(receipt.result.code === 0 && !stopped, 'EXPORT_OR_UPLOAD_FAILED'); guard(); verify();
    if (mode === 'export') {
      const ipa = path.join(output, 'export/App.ipa'); assert(fs.existsSync(ipa));
      const verified = path.join(output, 'verified'); fs.mkdirSync(verified, { mode: 0o700 });
      execFileSync('/usr/bin/ditto', ['-x', '-k', ipa, verified]);
      const app = path.join(verified, 'Payload/App.app');
      execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'pipe' });
      const get = key => execFileSync('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8' }).trim();
      assert.equal(get('CFBundleIdentifier'), 'wine.matchrim.app'); assert.equal(get('CFBundleVersion'), '139'); assert.equal(get('CFBundleShortVersionString'), '1.0');
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
  main139().then(code => { process.exitCode = code; }, error => { console.error(error); process.exitCode = 1; });
