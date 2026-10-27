import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';

const repo = process.cwd(), out = path.resolve(process.argv[2]);
const mode = process.argv[3] || 'all'; assert(['all', 'correction', 'close', 'rescan', 'discard-visual', 'quiz', 'result-actions', 'gallery-cancel', 'master-catalogue'].includes(mode));
if (mode === 'result-actions') assert(process.argv[6], 'RESULT_ACTIONS_REQUIRES_OWN_PREVIOUS_COMPLETED_QUIZ');
const sizeMode = process.argv[7] || 'both'; assert(['both', 'normal', 'max'].includes(sizeMode));
if (mode === 'discard-visual') assert.equal(sizeMode, 'max', 'DISCARD_VISUAL_REQUIRES_ACTUAL_MAX_TEXT');
assert(path.dirname(out) === path.join(repo, 'qa-artifacts/native218-20261025') && /^native220-r\d+$/.test(path.basename(out)) && !fs.existsSync(out));
const prep = JSON.parse(fs.readFileSync((process.argv[4] || 'qa-artifacts/native218-20261025/candidate110-r1') + '/preparation.json'));
const compiled = JSON.parse(fs.readFileSync((process.argv[5] || 'qa-artifacts/native218-20261025/compile110-r1') + '/RESULT.json'));
const appSource = compiled.app.path, device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
const previous = process.argv[6] ? JSON.parse(fs.readFileSync(path.resolve(process.argv[6], 'RESULT.json'))) : null;
if (mode === 'result-actions') assert(previous?.passed && previous.scope.includes('Actual anonymous 20-question quiz'),
  'RESULT_ACTIONS_REQUIRES_PREVIOUS_PASSED_ACTUAL_QUIZ');
if (previous) assert(previous.sourceCommit === prep.commit && previous.build === prep.build && (previous.freshContainerInstalled === true || previous.reusedOwnQAContainer)
  && previous.liveAccountsUsed === false && previous.catalogueDataInjected === false && previous.ownAppTerminated === true,
  'ONLY_EXACT_OWN_PREVIOUS_ANONYMOUS_CONTAINER_MAY_BE_REUSED');
const bundleId = previous?.bundleId || `wine.matchrim.qa${prep.build}offline220v` + path.basename(out).match(/r(\d+)$/)[1], owner = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
const env = { ...process.env, DEVELOPER_DIR: '/Applications/Xcode-26.0.1.app/Contents/Developer' };
const sha = value => createHash('sha256').update(value).digest('hex');
const guard = () => {
  const leases = JSON.parse(fs.readFileSync('/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json')).leases;
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'],
    ['mac-desktop', 'MATCHRIM220_DESKTOP_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases[resource]; assert(lease?.owner === owner && lease.leaseId === env[key] && lease.reviewAfter * 1000 > Date.now(), resource);
  }
  const disk = fs.statfsSync(repo); assert(Number(disk.bavail) * Number(disk.bsize) >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
};
const run = args => { guard(); return execFileSync('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 120000 }); };
const verifySource = () => {
  assert(prep.passed && compiled.passed && [110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126].includes(prep.build) && compiled.sourceCommit === prep.commit);
  for (const [file, hash] of Object.entries(prep.sourceFingerprints)) assert.equal(sha(fs.readFileSync(path.join(repo, file))), hash, file);
  for (const [file, hash] of Object.entries(prep.webResources)) assert.equal(sha(fs.readFileSync(appSource + '/public/' + file)), hash, file);
  assert.equal(sha(fs.readFileSync(appSource + '/App')), compiled.app.executableSHA256);
};
guard(); verifySource(); fs.mkdirSync(out, { mode: 0o700 });
const receipt = { startedUTC: new Date().toISOString(), passed: false, sourceCommit: prep.commit, build: prep.build, bundleId, device,
  leases: { heavy: env.MATCHRIM102_HEAVY_LEASE_ID, simulator: env.MATCHRIM104_SIMULATOR_LEASE_ID, desktop: env.MATCHRIM220_DESKTOP_LEASE_ID, writer: env.MATCHRIM102_WRITER_LEASE_ID },
  scope: `Compiled${prep.build} native app, ${previous ? 'exact own previously isolated anonymous' : 'fresh'} QA container, external network denied by CSP plus early JS guards. ${mode === 'master-catalogue'
    ? 'Synthetic unsigned offline user, actual native OCR input plus manual identity correction, retained real catalogue payloads intercepted locally, explicit lookup/confirmation and vintage invalidation. No real account or live backend call.' : mode === 'gallery-cancel'
    ? 'Actual native gallery picker opening/cancellation/retry only; no photo selection, File injection, OCR, camera capture, Photos permission acceptance or account.' : mode === 'result-actions'
    ? 'Actual retained anonymous quiz result actions: scan/restaurant destinations, unaccepted privacy, local QR disclosure, restart/reset and relaunch; no share/copy activation, account or OCR.' : mode === 'quiz'
    ? 'Actual anonymous 20-question quiz, local profile/Home and restart retention only; no account, OCR or gallery test in this mode.'
    : 'Actual local AppleVision photo input via explicit QA-only injection, NOT native gallery. Anonymous navigation/correction/in-batch retention/auth-boundary only.'} Not remote save/Bodega persistence, prior linked-fiche invalidation, 200-label recognition or TestFlight approval.`, stages: [],
  liveAccountsUsed: false, catalogueDataInjected: mode === 'master-catalogue', syntheticAccount: mode === 'master-catalogue',
  modelCallsPermitted: 0, webPublished: false, uploaded: false };
let originalSize;
try {
  const status = Object.values(JSON.parse(run(['simctl', 'list', 'devices', '--json'])).devices).flat().find(value => value.udid === device);
  assert(status?.isAvailable);
  if (status.state === 'Shutdown') { run(['simctl', 'boot', device]); run(['simctl', 'bootstatus', device, '-b']); receipt.bootedOwnedTarget = true; }
  const prior = spawnSync('/usr/bin/xcrun', ['simctl', 'get_app_container', device, bundleId, 'data'], { env, encoding: 'utf8' });
  assert(!prior.error && (previous ? prior.status === 0 : prior.status !== 0), 'EXACT_EXPECTED_CONTAINER_STATE_REQUIRED_NO_RESET');
  const app = previous ? run(['simctl', 'get_app_container', device, bundleId, 'app']).trim() : out + '/App.app';
  if (!previous) {
  fs.cpSync(appSource, app, { recursive: true });
  execFileSync('/usr/bin/plutil', ['-replace', 'CFBundleIdentifier', '-string', bundleId, app + '/Info.plist']);
  const html = fs.readFileSync(app + '/public/index.html', 'utf8'); assert.equal((html.match(/<head>/g) || []).length, 1);
  const csp = "default-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'self'";
  const guardSource = fs.readFileSync('scripts/matchrim-offline220.js');
  fs.writeFileSync(app + '/public/qa220-guard.js', guardSource, { flag: 'wx' });
  fs.writeFileSync(app + '/public/index.html', html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="' + csp + '"><script src="/qa220-guard.js"></script>'));
  if (mode === 'master-catalogue') {
    const extra = fs.readFileSync('scripts/matchrim-master259-offline.js');
    fs.writeFileSync(app + '/public/qa259-guard.js', extra, { flag: 'wx' });
    const guarded = fs.readFileSync(app + '/public/index.html', 'utf8');
    fs.writeFileSync(app + '/public/index.html', guarded.replace('<script src="/qa220-guard.js"></script>',
      '<script src="/qa220-guard.js"></script><script src="/qa259-guard.js"></script>'));
    const ledger = 'qa-artifacts/master253-20261026/hosted-six-r1/';
    fs.copyFileSync(ledger + '02-BODY.json', app + '/public/qa259-search.json');
    fs.copyFileSync(ledger + '03-BODY.json', app + '/public/qa259-detail.json');
    receipt.master259 = { guardSHA256: sha(extra), syntheticUser: '00000000-0000-4000-8000-000000000259',
      searchSHA256: sha(fs.readFileSync(ledger + '02-BODY.json')), detailSHA256: sha(fs.readFileSync(ledger + '03-BODY.json')),
      networkCallsAllowed: 0, realAccountUsed: false };
  }
  const photo = 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/img-061.jpg';
  fs.copyFileSync(photo, app + '/public/qa220-label.jpg');
  receipt.qaOnlyChanges = { bundleId, csp, indexSHA256: sha(fs.readFileSync(app + '/public/index.html')), guardSHA256: sha(guardSource), photo: { file: photo, sha256: sha(fs.readFileSync(photo)) } };
  assert.equal(sha(fs.readFileSync(app + '/App')), compiled.app.executableSHA256);
  for (const [file, hash] of Object.entries(prep.webResources)) if (file !== 'index.html') assert.equal(sha(fs.readFileSync(app + '/public/' + file)), hash, file);
  run(['simctl', 'install', device, app]); receipt.freshContainerInstalled = true;
  } else {
    assert.equal(sha(fs.readFileSync(app + '/App')), compiled.app.executableSHA256);
    assert.equal(sha(fs.readFileSync(app + '/public/index.html')), previous.qaOnlyChanges.indexSHA256);
    assert.equal(sha(fs.readFileSync(app + '/public/qa220-guard.js')), sha(fs.readFileSync('scripts/matchrim-offline220.js')));
    assert.equal(sha(fs.readFileSync(app + '/public/qa220-label.jpg')), previous.qaOnlyChanges.photo.sha256);
    for (const [file, hash] of Object.entries(prep.webResources)) if (file !== 'index.html') assert.equal(sha(fs.readFileSync(app + '/public/' + file)), hash, file);
    receipt.qaOnlyChanges = previous.qaOnlyChanges; receipt.reusedOwnQAContainer = path.resolve(process.argv[6]);
    receipt.freshContainerInstalled = false;
  }
  originalSize = run(['simctl', 'ui', device, 'content_size']).trim();
  const project = out + '/project'; fs.mkdirSync(project);
  const template = 'qa-artifacts/native99-20261021/native-audit-project';
  fs.cpSync(template + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
  const plan = JSON.parse(fs.readFileSync(template + '/Probe97.xctestplan'));
  const masterMax = mode === 'master-catalogue' && sizeMode === 'max';
  const testSeconds = mode === 'quiz' || masterMax ? 360 : 240;
  plan.defaultOptions.defaultTestExecutionTimeAllowance = testSeconds; plan.defaultOptions.maximumTestExecutionTimeAllowance = testSeconds;
  fs.writeFileSync(project + '/Probe97.xctestplan', JSON.stringify(plan, null, 2) + '\n');
  const probe = fs.readFileSync('scripts/MatchrimOffline220.swift', 'utf8').replaceAll('wine.matchrim.qa110offline220v1', bundleId);
  const targetIds = [...probe.matchAll(/XCUIApplication\(bundleIdentifier: "([^"]+)"\)/g)].map(match => match[1]);
  assert(targetIds.length > 0 && targetIds.every(value => value === bundleId), 'ALL_TESTS_MUST_USE_THE_NEW_OWNED_CONTAINER');
  fs.writeFileSync(project + '/AutomationModeProbe.swift', probe); receipt.probeSHA256 = sha(probe);
  for (const size of sizeMode === 'normal' ? ['large'] : sizeMode === 'max' ? ['accessibility-extra-extra-extra-large'] : ['large', 'accessibility-extra-extra-extra-large']) {
    guard(); verifySource(); run(['simctl', 'ui', device, 'content_size', size]);
    const stage = { size, name: size === 'large' ? 'normal' : 'max', startedUTC: new Date().toISOString() }; receipt.stages.push(stage);
    const root = out + '/' + stage.name; fs.mkdirSync(root);
    const args = ['test', '-quiet', '-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-destination', 'id=' + device,
      '-derivedDataPath', out + '/derived', '-resultBundlePath', root + '/result.xcresult', '-collect-test-diagnostics', 'never',
      '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1',
      'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.offline220.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    if (mode === 'correction') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testNativeOfflineCorrectionAndAuthBoundary');
    if (mode === 'close') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testNativeCloseAndHubReturn');
    if (mode === 'rescan') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testLocalReanalysisRequiresReview');
    if (mode === 'discard-visual') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testMaxDiscardVisualCoverage');
    if (mode === 'quiz') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testAnonymousQuizAndHome');
    if (mode === 'result-actions') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testRetainedQuizResultActions');
    else args.push('-skip-testing:Probe97UITests/MatchrimOffline220Tests/testRetainedQuizResultActions');
    if (mode === 'gallery-cancel') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testNativeGalleryPickerCancellation');
    else args.push('-skip-testing:Probe97UITests/MatchrimOffline220Tests/testNativeGalleryPickerCancellation');
    if (mode === 'master-catalogue') args.push('-only-testing:Probe97UITests/MatchrimOffline220Tests/testNativeMasterCatalogue259');
    else args.push('-skip-testing:Probe97UITests/MatchrimOffline220Tests/testNativeMasterCatalogue259');
    const fd = fs.openSync(root + '/runtime.log', 'wx', 0o600);
    const child = spawn(env.DEVELOPER_DIR + '/usr/bin/xcodebuild', args, { env, stdio: ['ignore', fd, fd] });
    let stopped = null;
    const stop = reason => { if (stopped) return; stopped = reason; child.kill('SIGINT'); setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, 10000).unref(); };
    const timer = setTimeout(() => stop('WALL_LIMIT'), mode === 'quiz' || masterMax ? 480000 : 360000);
    const watch = setInterval(() => { try { guard(); } catch (error) { stop(String(error)); } }, 3000);
    try { stage.result = await new Promise(resolve => { child.once('error', error => resolve({ error: String(error) })); child.once('close', (code, signal) => resolve({ code, signal })); }); }
    finally { clearTimeout(timer); clearInterval(watch); fs.closeSync(fd); }
    stage.stopped = stopped; stage.finishedUTC = new Date().toISOString();
    if (fs.existsSync(root + '/result.xcresult')) stage.attachments = run(['xcresulttool', 'export', 'attachments', '--path', root + '/result.xcresult', '--output-path', root + '/attachments']);
    assert(stage.result.code === 0 && !stopped, 'NATIVE220_FAILED:' + stage.name);
  }
  receipt.passed = true;
} catch (error) { receipt.error = String(error.stack || error); }
finally {
  try { run(['simctl', 'terminate', device, bundleId]); receipt.ownAppTerminated = true; } catch { receipt.ownAppTerminated = false; }
  if (originalSize) try { run(['simctl', 'ui', device, 'content_size', originalSize]); receipt.contentSizeRestored = true; } catch { receipt.contentSizeRestored = false; receipt.passed = false; }
  receipt.finishedUTC = new Date().toISOString(); fs.writeFileSync(out + '/RESULT.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
}
console.log(JSON.stringify({ out, passed: receipt.passed, build: prep.build, source: prep.commit, stages: receipt.stages.map(stage => ({ name: stage.name, result: stage.result, stopped: stage.stopped })), error: receipt.error })); process.exitCode = receipt.passed ? 0 : 1;
