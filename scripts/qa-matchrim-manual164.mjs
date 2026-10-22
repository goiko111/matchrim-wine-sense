import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { sanitizedEnvironment, attestPhoto, verifyRetainedContext, verifyInstalled, makePlan, DEVICE, INPUT_SHA256, LEASE_FILE } from './qa-matchrim-rescan161.mjs';
import { checkLeases, verifyArtifact } from './qa-matchrim-account114.mjs';
import { child122 } from './experiment-matchrim-vision122.mjs';

export const METHOD164 = 'MatchrimManual164Tests/testExistingQAManualRecovery164';
export const MARKERS164 = ['MANUAL164_OWNER', 'MANUAL164_REAL_LOCAL_READING', 'MANUAL164_EXPLICIT_VINTAGE', 'MANUAL164_SAVED_LOVE_AND_AFFINITY', 'MANUAL164_COMPLETE'];
const photoMarkers = ['RESCAN161_PHOTOS_ADDED_ORDER_VERIFIED', 'RESCAN161_ATTESTED_PHOTO_SELECTED'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export function combinedProbe164(base, probe) {
  assert.equal(base.split('final class MatchrimRescan161Tests: XCTestCase').length, 2);
  assert(base.includes('@MainActor private func photo(') && base.includes('private func validDimension('));
  assert(probe.includes('final class MatchrimManual164Tests: MatchrimRescan161Tests'));
  return base.replace('final class MatchrimRescan161Tests: XCTestCase', 'class MatchrimRescan161Tests: XCTestCase')
    .replaceAll('@MainActor private func ', '@MainActor fileprivate func ')
    .replaceAll('    private func ', '    fileprivate func ') + '\n' + probe;
}
export function evaluate164(log, status, stopped = null) {
  const lines = log.split(/\r?\n/), count = marker => lines.filter(line => line === marker).length;
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const summaries = [...log.matchAll(/Executed (\d+) tests?, with (\d+) failures/g)];
  const positions = MARKERS164.map(marker => lines.indexOf(marker));
  const first = lines.findIndex(line => /^Test Case '.*' started(?:\.| \(Iteration 1 of 1\)\.)$/.test(line));
  const last = lines.findIndex(line => /^Test Case '.*' passed[. ]/.test(line));
  return status === 0 && !stopped && MARKERS164.every(marker => count(marker) === 1)
    && photoMarkers.every(marker => count(marker) === 1)
    && lines.indexOf(photoMarkers[0]) > positions[0] && lines.indexOf(photoMarkers[1]) > lines.indexOf(photoMarkers[0])
    && lines.indexOf(photoMarkers[1]) < positions[1]
    && first >= 0 && last > first && positions.every((p, i) => i === 0 || p > positions[i - 1]) && positions[0] > first && positions.at(-1) < last
    && events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => /^-\[(?:\w+\.)?MatchrimManual164Tests testExistingQAManualRecovery164\]$/.test(event[1]))
    && summaries.length > 0 && summaries.every(row => row[1] === '1' && row[2] === '0')
    && !/RESCAN161_FAILURE|AUTH_SUBMITTED|SAVE_SUBMITTED|retrying|restarting after|TEST (?:FAILED|SKIPPED)/i.test(log)
    && lines.filter(line => /^(?:MANUAL164_|RESCAN161_)/.test(line)).every(line => [...MARKERS164, ...photoMarkers].includes(line));
}
export function parseManual164(record, runId) {
  assert.equal(record.runId, runId); assert.equal(record.inputSHA256, INPUT_SHA256);
  assert.equal(record.name, 'Flor de Muga Blanco'); assert.equal(record.producer, 'Muga'); assert.equal(record.vintage, 2022);
  assert.equal(record.personalRating, 'love'); assert.equal(record.personalVerdictTitle, 'Tu valoración: te encanta');
  assert(Number.isInteger(record.current) && record.current >= 0 && record.current <= 100);
  assert.equal(record.selection, 'manual-query-and-explicit-vintage');
  for (const key of ['photoCertifiedVintage', 'automaticIdentityProven', 'newSavePersistenceValidated']) assert.equal(record[key], false);
  assert.equal(record.selectedPublicId, null); assert.equal(record.dimensions.length, 5);
  assert.equal(record.accessibilityIssues, 0);
  const axes = new Set();
  for (const label of record.dimensions) {
    const m = label.match(/^(potencia|acidez|dulzor|tanino|fruta): tu perfil ([0-9]+[.][0-9])\/5; este vino ([0-9]+[.][0-9])\/5$/);
    assert(m && !axes.has(m[1]) && m.slice(2).every(x => Number(x) >= 0 && Number(x) <= 5)); axes.add(m[1]);
  }
  return record;
}
export async function runManual164(argv = process.argv.slice(2)) {
  assert.equal(argv.length, 3, 'PREPARATION APP OUTPUT required');
  assert.equal(process.env.MATCHRIM164_RUN_READONLY, 'YES');
  const repo = process.cwd(), [prepDir, appArg, outArg] = argv;
  const output = path.resolve(outArg), app = path.resolve(appArg), base = path.resolve('qa-artifacts/continuation161-20261022');
  assert(path.dirname(output) === base && /^manual164-[\w-]+$/.test(path.basename(output)) && !fs.existsSync(output));
  const env = sanitizedEnvironment(process.env), prep = JSON.parse(fs.readFileSync(path.resolve(prepDir, 'preparation.json')));
  const pins = new Map(), bind = file => { assert.equal(fs.realpathSync(file), file); pins.set(file, sha(fs.readFileSync(file))); };
  let installed, photoBinding;
  const guard = () => {
    checkLeases(JSON.parse(fs.readFileSync(LEASE_FILE)).leases, env, Date.now());
    const disk = fs.statfsSync(base); assert(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
    for (const [file, hash] of pins) assert.equal(sha(fs.readFileSync(file)), hash, 'SOURCE_DRIFT');
    verifyArtifact({ io: fs, exec: execFileSync, repo, prep, app });
    if (installed) verifyInstalled({ installed, app, prep });
    if (photoBinding) {
      const fresh = attestPhoto({ repo, env });
      assert.equal(fresh.resident, photoBinding.resident); assert.equal(fresh.sha256, photoBinding.sha256); assert.equal(fresh.added, photoBinding.added);
    }
  };
  guard(); assert(prep.publicConfiguration.fixtures === false && prep.publicConfiguration.masterConfigured === false);
  assert(prep.sourceDirty === false && Date.now() - Date.parse(prep.startedUTC) >= 0
    && Date.now() - Date.parse(prep.startedUTC) < 24 * 3600000, 'FRESH_CLEAN_PREPARATION_REQUIRED');
  assert(Object.hasOwn(prep.sourceFingerprints, 'src/utils/nativeCataloguePage163.ts'));
  const baseline = verifyRetainedContext({ repo });
  const photo = attestPhoto({ repo, env }); photoBinding = photo;
  installed = execFileSync('/usr/bin/xcrun', ['simctl', 'get_app_container', DEVICE, 'wine.matchrim.qa99review', 'app'], { env, encoding: 'utf8', timeout: 10000 }).trim();
  guard(); fs.mkdirSync(output, { mode: 0o700 });
  const result = { passed: false, startedUTC: new Date().toISOString(), sourceCommit: prep.commit, build: prep.build, account: 'info@winerim.com',
    authSubmissionsRequested: 0, dataMutationsRequested: 0, cloudAnalysisControlsRequested: 0, harnessNetworkRequests: 0,
    automaticIdentityProven: false, photoCertifiedVintage: false, newSavePersistenceValidated: false,
    scope: 'Actual gallery local reading then explicitly MANUAL catalogue query and vintage selection. Not automatic recognition, canonical-ID equivalence, persistence or human taste-accuracy approval. App public/background reads may occur.',
    baseline, photo };
  const controller = new AbortController(), stop = () => controller.abort();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  const pinTree = folder => {
    assert.equal(fs.realpathSync(folder), folder); assert(!fs.lstatSync(folder).isSymbolicLink());
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), 'PROJECT_SYMLINK_HOLD');
      const file = path.join(folder, entry.name); if (entry.isDirectory()) pinTree(file); else bind(file);
    }
  };
  try {
    const harness = path.resolve('qa-artifacts/native99-20261021/native-audit-project'), project = output + '/project';
    pinTree(harness + '/Probe97.xcodeproj'); bind(harness + '/Probe97.xctestplan');
    fs.mkdirSync(project, { mode: 0o700 });
    fs.cpSync(harness + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    const runId = randomUUID(), plan = makePlan(JSON.parse(fs.readFileSync(harness + '/Probe97.xctestplan')), runId);
    plan.testTargets[0].selectedTests = [METHOD164];
    const parent = path.resolve('scripts/MatchrimRescan161Probe.swift'), probe = path.resolve('scripts/MatchrimManual164Probe.swift');
    for (const file of [parent, probe, path.resolve(prepDir, 'preparation.json'), ...[
      'qa-matchrim-manual164.mjs', 'qa-matchrim-rescan161.mjs', 'qa-matchrim-account114.mjs', 'experiment-matchrim-vision122.mjs',
    ].map(name => path.resolve('scripts', name))]) bind(file);
    fs.writeFileSync(project + '/AutomationModeProbe.swift', combinedProbe164(fs.readFileSync(parent, 'utf8'), fs.readFileSync(probe, 'utf8')), { mode: 0o600, flag: 'wx' });
    fs.writeFileSync(project + '/Probe97.xctestplan', JSON.stringify(plan), { mode: 0o600, flag: 'wx' });
    bind(project + '/AutomationModeProbe.swift'); bind(project + '/Probe97.xctestplan'); pinTree(project + '/Probe97.xcodeproj');
    result.runId = runId; result.bindings = Object.fromEntries(pins);
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97', '-only-test-configuration', 'Rescan161Once',
      '-destination', 'id=' + DEVICE, '-derivedDataPath', output + '/derived', '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO',
      '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa164.manual.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    const run = async (label, args) => {
      guard(); const fresh = attestPhoto({ repo, env }); assert.equal(fresh.resident, photo.resident); assert.equal(fresh.sha256, photo.sha256);
      const response = await child122(env.DEVELOPER_DIR + '/usr/bin/xcodebuild', args, { env, cwd: repo, timeout: 240000, guard, signal: controller.signal });
      fs.writeFileSync(output + '/' + label + '.log', (response.stdout || '') + (response.stderr || ''), { mode: 0o600, flag: 'wx' });
      assert(!response.error && !response.signal && response.status === 0, label + '_FAILED'); return response.stdout + response.stderr;
    };
    const compile = await run('compile', ['build-for-testing', ...common]); assert(!/Test Case '|MANUAL164_/.test(compile));
    const runtime = await run('runtime', ['test-without-building', ...common, '-only-testing:Probe97UITests/' + METHOD164, '-resultBundlePath', output + '/result.xcresult']);
    assert(evaluate164(runtime, 0), 'EXACT_MANUAL_METHOD_NOT_PROVEN');
    execFileSync('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments'], { env, timeout: 15000 });
    const manifest = JSON.parse(fs.readFileSync(output + '/attachments/manifest.json'));
    assert.equal(manifest.length, 1); assert([METHOD164, METHOD164 + '()'].includes(manifest[0].testIdentifier));
    assert(manifest[0].attachments.every(a => a.deviceId === DEVICE && a.configurationName === 'Rescan161Once'
      && a.repetitionNumber === 1 && a.isAssociatedWithFailure === false));
    const views = ['manual164-owner', '03-photo-library-before', '04-before-added-sort', '05-added-sort-verified',
      '06-attested-first-image-before', '07-first-image-after', 'manual164-after-real-local-reading', 'manual164-explicit-query',
      'manual164-all-public-results', 'manual164-explicit-vintage', 'manual164-saved-verdict', 'manual164-final'];
    const required = [...views.flatMap(name => [[name, 'png'], [name + '-ax', 'txt']]),
      ['first-image-ax', 'txt'], ['manual164-readback', 'txt'], ['manual164-accessibility', 'txt']];
    for (const step of [0, 1]) if (manifest[0].attachments.some(a => a.suggestedHumanReadableName?.startsWith('rescan161-07-completion-' + step + '-'))) {
      for (const phase of ['before', 'after']) required.push(['07-completion-' + step + '-' + phase, 'png'], ['07-completion-' + step + '-' + phase + '-ax', 'txt']);
    }
    const consumed = new Set();
    for (const [name, extension] of required) {
      const matching = manifest[0].attachments.filter(a => a.suggestedHumanReadableName?.startsWith('rescan161-' + name + '_') && a.exportedFileName?.endsWith('.' + extension));
      assert.equal(matching.length, 1, 'EVIDENCE_MISSING_OR_REPEATED'); assert(!consumed.has(matching[0])); consumed.add(matching[0]);
    }
    const paths = new Set();
    for (const a of manifest[0].attachments) {
      assert(/^[A-Fa-f0-9-]+(?:\.(?:png|txt|json|mp4))?$/.test(a.exportedFileName) && !paths.has(a.exportedFileName)); paths.add(a.exportedFileName);
      const file = output + '/attachments/' + a.exportedFileName; assert.equal(fs.realpathSync(file), file); assert(fs.statSync(file).size > 0);
    }
    const records = manifest[0].attachments.filter(a => a.suggestedHumanReadableName?.startsWith('manual164-record_'));
    assert.equal(records.length, 1); assert(/^[A-Fa-f0-9-]+\.json$/.test(records[0].exportedFileName));
    result.record = parseManual164(JSON.parse(fs.readFileSync(output + '/attachments/' + records[0].exportedFileName)), runId);
    guard(); result.passed = true;
  } catch (error) {
    result.error = String(error.stack || error);
    if (fs.existsSync(output + '/result.xcresult') && !fs.existsSync(output + '/attachments')) {
      try { execFileSync('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments'], { env, timeout: 15000 }); } catch { /* Keep the original failure. */ }
    }
  } finally {
    process.off('SIGINT', stop); process.off('SIGTERM', stop);
    result.finishedUTC = new Date().toISOString(); fs.writeFileSync(output + '/RESULT.json', JSON.stringify(result, null, 2), { mode: 0o600, flag: 'wx' });
  }
  return result;
}
if (import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077); const r = await runManual164(); console.log(JSON.stringify({ passed: r.passed, error: r.error })); process.exitCode = r.passed ? 0 : 1;
}
