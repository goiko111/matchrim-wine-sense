import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sanitizedEnvironment, attestPhoto, verifyInstalled, makePlan, DEVICE, LEASE_FILE } from './qa-matchrim-rescan161.mjs';
import { checkLeases, verifyArtifact } from './qa-matchrim-account114.mjs';
import { combinedProbe164 } from './qa-matchrim-manual164.mjs';
import { child122 } from './experiment-matchrim-vision122.mjs';

assert.equal(process.argv.length, 5, 'PREPARATION APP OUTPUT required');
const repo = process.cwd(), [prepArg, appArg, outArg] = process.argv.slice(2);
const out = path.resolve(outArg), app = path.resolve(appArg), env = sanitizedEnvironment(process.env);
assert(path.dirname(out) === path.resolve('qa-artifacts/continuation161-20261022') && /^browse172-[\w-]+$/.test(path.basename(out)) && !fs.existsSync(out));
const prep = JSON.parse(fs.readFileSync(path.resolve(prepArg, 'preparation.json'))), pins = new Map();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = file => { assert.equal(fs.realpathSync(file), file); pins.set(file, sha(fs.readFileSync(file))); };
let installed;
const guard = () => {
  checkLeases(JSON.parse(fs.readFileSync(LEASE_FILE)).leases, env, Date.now());
  const disk = fs.statfsSync(path.dirname(out)); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3);
  verifyArtifact({ io: fs, exec: execFileSync, repo, prep, app });
  if (installed) verifyInstalled({ installed, app, prep });
  for (const [file, hash] of pins) assert.equal(sha(fs.readFileSync(file)), hash, 'PROBE_SOURCE_DRIFT');
};
guard(); assert(prep.passed && prep.sourceDirty === false && prep.publicConfiguration.fixtures === false);
assert(Date.now() - Date.parse(prep.startedUTC) >= 0 && Date.now() - Date.parse(prep.startedUTC) < 24 * 3600000);
const photo = attestPhoto({ repo, env });
installed = execFileSync('/usr/bin/xcrun', ['simctl', 'get_app_container', DEVICE, 'wine.matchrim.qa99review', 'app'], { env, encoding: 'utf8', timeout: 10000 }).trim();
guard(); fs.mkdirSync(out, { mode: 0o700 });
const method = 'MatchrimManual164Tests/testExistingQABrowse172';
const markers = ['BROWSE172_OWNER', 'RESCAN161_PHOTOS_ADDED_ORDER_VERIFIED', 'RESCAN161_ATTESTED_PHOTO_SELECTED',
  'BROWSE172_LOCAL', 'BROWSE172_FIRST20', 'BROWSE172_NEXT40', 'BROWSE172_COMPLETE'];
const result = { passed: false, startedUTC: new Date().toISOString(), build: prep.build, sourceCommit: prep.commit,
  authSubmissionsRequested: 0, dataMutationsRequested: 0, cloudAnalysisControlsRequested: 0, photo,
  conservativeFreeReservation: 10, conservativeAfterReservation: 335, remainingConservativeFree: 65,
  scope: 'Actual native gallery/local Vision and manual Campillo public query, first20 then40/112. No canonical selection, save, rating, authentication or model controls. App public/background reads are not packet-instrumented.' };
fs.writeFileSync(out + '/RESERVATION.json', JSON.stringify({ reservedUTC: result.startedUTC, freePublicGETReservation: 10,
  conservativeBefore: 325, conservativeAfter: 335, remaining: 65, paidCapUnchanged: true, modelControlsRequested: 0 }), { mode: 0o600, flag: 'wx' });
const controller = new AbortController(), stop = () => controller.abort();
process.on('SIGINT', stop); process.on('SIGTERM', stop);
try {
  const harness = path.resolve('qa-artifacts/native99-20261021/native-audit-project'), project = out + '/project';
  fs.mkdirSync(project, { mode: 0o700 }); fs.cpSync(harness + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
  const plan = makePlan(JSON.parse(fs.readFileSync(harness + '/Probe97.xctestplan')), randomUUID());
  plan.testTargets[0].selectedTests = [method];
  const parent = path.resolve('scripts/MatchrimRescan161Probe.swift'), probe = path.resolve('scripts/MatchrimBrowse172Probe.swift');
  for (const file of [parent, probe, path.resolve(prepArg, 'preparation.json'), path.resolve('scripts/qa-matchrim-browse172.mjs')]) pin(file);
  fs.writeFileSync(project + '/AutomationModeProbe.swift', combinedProbe164(fs.readFileSync(parent, 'utf8'), fs.readFileSync(probe, 'utf8')), { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(project + '/Probe97.xctestplan', JSON.stringify(plan), { mode: 0o600, flag: 'wx' });
  pin(project + '/AutomationModeProbe.swift'); pin(project + '/Probe97.xctestplan'); result.bindings = Object.fromEntries(pins);
  const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97', '-only-test-configuration', 'Rescan161Once',
    '-destination', 'id=' + DEVICE, '-derivedDataPath', out + '/derived', '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO',
    '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa172.browse.uitests', 'ONLY_ACTIVE_ARCH=YES'];
  const run = async (name, args) => {
    guard(); const fresh = attestPhoto({ repo, env }); assert.equal(fresh.sha256, photo.sha256); assert.equal(fresh.resident, photo.resident);
    const child = await child122(env.DEVELOPER_DIR + '/usr/bin/xcodebuild', args, { env, cwd: repo, timeout: 240000, guard, signal: controller.signal });
    const log = (child.stdout || '') + (child.stderr || ''); fs.writeFileSync(out + '/' + name + '.log', log, { mode: 0o600, flag: 'wx' });
    assert(child.status === 0 && !child.error && !child.signal, name + '_FAILED'); return log;
  };
  const compile = await run('compile', ['build-for-testing', ...common]); assert(!/Test Case '|BROWSE172_/.test(compile));
  const log = await run('runtime', ['test-without-building', ...common, '-only-testing:Probe97UITests/' + method, '-resultBundlePath', out + '/result.xcresult']);
  const lines = log.split(/\r?\n/), positions = markers.map(marker => lines.indexOf(marker));
  assert(markers.every(marker => lines.filter(line => line === marker).length === 1) && positions.every((p, i) => i === 0 || p > positions[i - 1]));
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  assert(events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => /^-\[(?:\w+\.)?MatchrimManual164Tests testExistingQABrowse172\]$/.test(event[1])));
  assert(/Executed 1 test, with 0 failures/.test(log) && !/RESCAN161_FAILURE|AUTH_SUBMITTED|SAVE_SUBMITTED|retrying|restarting after|TEST (?:FAILED|SKIPPED)/i.test(log));
  assert(lines.filter(line => /^(?:BROWSE172_|RESCAN161_)/.test(line)).every(line => markers.includes(line)));
  guard(); result.passed = true;
} catch (error) { result.error = String(error.stack || error); }
finally {
  process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (fs.existsSync(out + '/result.xcresult')) try {
    execFileSync('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', out + '/result.xcresult', '--output-path', out + '/attachments'], { env, timeout: 15000 });
    const manifest = JSON.parse(fs.readFileSync(out + '/attachments/manifest.json'));
    assert(manifest.length === 1 && [method, method + '()'].includes(manifest[0].testIdentifier));
    assert(manifest[0].attachments.every(a => a.deviceId === DEVICE && a.configurationName === 'Rescan161Once'
      && a.repetitionNumber === 1 && (!result.passed || a.isAssociatedWithFailure === false)));
    if (result.passed) for (const name of ['browse172-owner', 'browse172-local', 'browse172-first20', 'browse172-next40', 'browse172-final']) {
      for (const [suffix, ext] of [['', 'png'], ['-ax', 'txt']]) assert.equal(manifest[0].attachments.filter(a =>
        a.suggestedHumanReadableName?.startsWith('rescan161-' + name + suffix + '_') && a.exportedFileName?.endsWith('.' + ext)).length, 1);
    }
  } catch (error) { result.passed = false; result.attachmentError = String(error); }
  result.finishedUTC = new Date().toISOString(); fs.writeFileSync(out + '/RESULT.json', JSON.stringify(result, null, 2), { mode: 0o600, flag: 'wx' });
}
console.log(JSON.stringify({ passed: result.passed, error: result.error })); process.exitCode = result.passed ? 0 : 1;
