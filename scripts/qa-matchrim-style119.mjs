import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { checkLeases, verifyArtifact, nativeReceiptPath } from './qa-matchrim-account114.mjs';

export const SAVE = 'STYLE119_SAVE_SUBMITTED_ONCE';
export const COMPLETE = 'STYLE119_REAL_PERSISTED110_NV_ROUNDTRIP_COMPLETE';
export const METHOD = 'MatchrimStyle119Tests/testExistingQAStyleRoundtrip119';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127', bundle = 'wine.matchrim.qa99review';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const leaseFile = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (value, code) => { if (!value) throw new Error(code); };
const json = (io, file) => JSON.parse(io.readFileSync(file, 'utf8'));
const write = (io, file, value) => io.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
const count = (log, marker) => log.split(/\r?\n/).filter(line => line === marker).length;

export function reserveSave(io, base, reservation) {
  // Exclusive creation and both syncs precede any UI runtime. Never unlink this file.
  const fd = io.openSync(path.join(base, 'style119-save-reservation.json'), 'wx', 0o600);
  try { io.writeFileSync(fd, JSON.stringify(reservation) + '\n'); io.fsyncSync(fd); }
  finally { io.closeSync(fd); }
  const dir = io.openSync(base, 'r');
  try { io.fsyncSync(dir); } finally { io.closeSync(dir); }
}

export function makePlan(original, reservationId) {
  check(original?.testTargets?.length === 1 && /^[\w-]+$/.test(original.testTargets[0].target?.name), 'AMBIGUOUS_TARGET');
  const defaultOptions = { defaultTestExecutionTimeAllowance: 230, maximumTestExecutionTimeAllowance: 230,
    testTimeoutsEnabled: true, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
    testRepetitionRelaunchEnabled: false,
    environmentVariableEntries: [{ key: 'MATCHRIM119_RESERVATION_ID', value: reservationId }] };
  if (original.defaultOptions?.targetForVariableExpansion) defaultOptions.targetForVariableExpansion = original.defaultOptions.targetForVariableExpansion;
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Style119Once', options: {} }], defaultOptions,
    testTargets: [{ target: original.testTargets[0].target, parallelizable: false }] };
}

export function evaluate(log, result, stopped = null) {
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:\w+\.)?MatchrimStyle119Tests testExistingQAStyleRoundtrip119\]$/;
  const markers = [SAVE, 'STYLE119_SAVED_SCORE_VERIFIED', 'STYLE119_RELAUNCHED_SCORE_VERIFIED', COMPLETE];
  const positions = markers.map(marker => log.indexOf('\n' + marker + '\n'));
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped
    && markers.every(marker => count(log, marker) === 1)
    && positions.every((position, index) => position >= 0 && (!index || position > positions[index - 1]))
    && count(log, 'STYLE119_FAILURE') === 0 && events.length === 2
    && events[0][2] === 'started' && events[1][2] === 'passed' && events.every(event => expected.test(event[1]))
    && (log.match(/Executed 1 test, with 0 failures(?: \(0 unexpected\))? in /g) || []).length > 0
    && !/Executed 0 tests|TEST SKIPPED|TEST FAILED|with [1-9]\d* failures/i.test(log);
  return { passed: Boolean(passed), saveSubmitted: count(log, SAVE) > 0,
    stage: passed ? 'passed' : 'unproven-no-retry', reason: passed ? undefined : stopped || 'EXACT_SINGLE_ROUNDTRIP_NOT_PROVEN' };
}

export function verifyPhoto(io, repo) {
  const folder = path.join(repo, 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2');
  const manifest = json(io, folder + '/OCR-INPUTS.json');
  const report = json(io, folder + '/REPORT.json');
  const rows = manifest.inputs.filter(row => row.imageId === 'img-001');
  const originals = report.prepared.filter(row => row.imageId === 'img-001');
  check(rows.length === 1 && originals.length === 1, 'AMBIGUOUS_PHOTO');
  const photo = rows[0], original = originals[0];
  check(photo.path === folder + '/prepared/img-001.jpg' && original.path === photo.path
    && photo.sha256 === original.sha256 && photo.sourceSHA256 === original.sourceSHA256
    && photo.sourceSHA256 === '62e55941342521cf45696a42cb76d9059accc5591772d7ffbc5de0b8812c5b31'
    && sha(io.readFileSync(photo.path)) === photo.sha256
    && sha(io.readFileSync(original.originalResidentPath)) === photo.sourceSHA256 && !original.rejected, 'PHOTO_BINDING_HOLD');
  for (const [file, hash] of Object.entries(report.sourceHashes)) check(sha(io.readFileSync(path.join(repo, file))) === hash, 'PHOTO_PREPARATION_SOURCE_CHANGED');
  return photo;
}

export async function runStyle119({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env,
  verifyNative = verifyArtifact, photoVerifier = verifyPhoto,
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const base = path.join(repo, 'qa-artifacts/night105-20261021');
  // Do not inherit test injection, fixture or account environment overrides.
  const env = Object.fromEntries(Object.entries(environment).filter(([key]) => !/^(?:MATCHRIM|XCTest|SIMCTL_CHILD_|DYLD_|XCInject)/i.test(key)
    && !/KEY|AUTH|TOKEN|SECRET|PASSWORD|CREDENTIAL/i.test(key)));
  for (const key of ['MATCHRIM102_HEAVY_LEASE_ID', 'MATCHRIM104_SIMULATOR_LEASE_ID', 'MATCHRIM102_WRITER_LEASE_ID']) env[key] = environment[key];
  env.DEVELOPER_DIR = developer;
  const receipt = { passed: false, startedUTC: new Date().toISOString(), device, bundle, account: 'info@winerim.com',
    saveReserved: false, maximumPossibleBatchSaves: 1, modelStartsRequested: 0,
    scope: 'Real Photos -> Apple Vision/public search -> NV style -> one Por probar save -> relaunch. UI persistence, not human-taste accuracy or packet/model-call counts. No auth, ratings, quiz, stock, deletes or retries.' };
  let output, prep, app, originalSize, created = false;
  const pins = new Map();
  const guard = () => {
    checkLeases(json(io, leaseFile).leases, env);
    const disk = io.statfsSync(base); check(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  const verify = () => {
    verifyNative({ io, exec, repo, prep, app }); photoVerifier(io, repo);
    for (const [file, hash] of pins) check(sha(io.readFileSync(file)) === hash, 'SOURCE_OR_PROBE_CHANGED');
  };
  const persist = () => { if (created) write(io, output + '/RESULT.json', receipt); };
  const xcrun = args => { guard(); verify(); return exec('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 20000 }); };
  const run = async (name, args) => {
    guard(); verify();
    const fd = io.openSync(output + '/' + name + '.log', 'wx', 0o600);
    let child, timer, watcher, hardStop, stopped = null;
    const stop = reason => {
      if (stopped) return; stopped = reason;
      const kill = signal => { try { killGroup(child.pid, signal); } catch { child.kill(signal); } };
      kill('SIGINT'); hardStop = setTimeout(() => kill('SIGKILL'), 5000);
    };
    const interrupt = () => stop('INTERRUPTED');
    try {
      child = start(developer + '/usr/bin/xcodebuild', args, { env, detached: true, stdio: ['ignore', fd, fd] });
      timer = setTimeout(() => stop('WALL_LIMIT'), 240000);
      watcher = setInterval(() => { try {
        guard(); verify();
        if (name === 'runtime' && count(io.readFileSync(output + '/runtime.log', 'utf8'), SAVE) > 0
            && !io.existsSync(output + '/SAVE-SUBMITTED.json')) {
          const marker = io.openSync(output + '/SAVE-SUBMITTED.json', 'wx', 0o600);
          try { io.writeFileSync(marker, JSON.stringify({ reservationId: receipt.reservationId, observed: true }) + '\n'); io.fsyncSync(marker); }
          finally { io.closeSync(marker); }
        }
      } catch { stop('LEASE_SOURCE_OR_DISK_HOLD'); } }, 2000);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, interrupt);
      const result = await new Promise(resolve => {
        child.once('error', () => resolve({ code: null, spawnError: true }));
        child.once('close', (code, signal) => resolve({ code, signal }));
      });
      // Do not cancel an outstanding group kill merely because the leader exited.
      if (stopped) { await new Promise(resolve => setTimeout(resolve, 5100)); }
      return { result, stopped, log: io.readFileSync(output + '/' + name + '.log', 'utf8') };
    } finally {
      clearTimeout(timer); clearTimeout(hardStop); clearInterval(watcher); io.closeSync(fd);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, interrupt);
    }
  };
  try {
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length), 'EXPECTED_PREP_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && /^style119-[\w-]+$/.test(path.basename(output)) && !io.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
    guard(); check(!io.existsSync(base + '/style119-save-reservation.json'), 'SAVE_ALREADY_RESERVED');
    const prepFile = path.resolve(repo, argv[0], 'preparation.json'); prep = json(io, prepFile);
    check(Number.isFinite(Date.parse(prep.startedUTC)) && Date.now() - Date.parse(prep.startedUTC) >= 0
      && Date.now() - Date.parse(prep.startedUTC) < 24 * 3600000, 'FRESH_PREPARATION_REQUIRED');
    for (const file of ['src/utils/nativeSingleLabel109.ts', 'src/utils/cellarReferenceStyle110.ts', 'src/components/CellarReferenceStyle110.tsx'])
      check(Object.hasOwn(prep.sourceFingerprints, file), 'MISSING_REQUIRED_SOURCE_BINDING');
    verify();
    const probe = path.join(repo, 'scripts/MatchrimStyle119Probe.swift');
    const harness = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    const pinTree = folder => { for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name); if (entry.isDirectory()) pinTree(file); else pins.set(file, sha(io.readFileSync(file)));
    } };
    for (const file of [prepFile, nativeReceiptPath(app), probe, 'qa-matchrim-style119.mjs', 'qa-matchrim-account114.mjs', 'check-matchrim-style119.mjs'].map(file => file.endsWith('.mjs') && !path.isAbsolute(file) ? path.join(repo, 'scripts', file) : file)) pins.set(file, sha(io.readFileSync(file)));
    const mediaFolder = path.join(repo, 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2');
    for (const name of ['OCR-INPUTS.json', 'REPORT.json', 'prepared/img-001.jpg']) {
      const file = path.join(mediaFolder, name); pins.set(file, sha(io.readFileSync(file)));
    }
    pinTree(harness);
    io.mkdirSync(output, { mode: 0o700 }); created = true;
    check((io.statSync(output).mode & 0o777) === 0o700, 'PRIVATE_OUTPUT_REQUIRED');
    const project = output + '/project'; io.mkdirSync(project, { mode: 0o700 });
    io.cpSync(harness + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    receipt.reservationId = randomUUID();
    const plan = makePlan(json(io, harness + '/Probe97.xctestplan'), receipt.reservationId);
    write(io, project + '/Probe97.xctestplan', plan);
    io.writeFileSync(project + '/AutomationModeProbe.swift', io.readFileSync(probe), { mode: 0o600, flag: 'wx' });
    pinTree(project);
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Style119Once', '-destination', 'id=' + device, '-derivedDataPath', output + '/derived',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates',
      '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa119.style.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    const compiled = await run('compile', ['build-for-testing', ...common]);
    check(compiled.result.code === 0 && !compiled.result.signal && !compiled.result.spawnError && !compiled.stopped
      && count(compiled.log, SAVE) === 0, 'COMPILE_PREFLIGHT_FAILED');
    guard(); verify();
    reserveSave(io, base, { reservationId: receipt.reservationId, output, account: receipt.account,
      maximumPossibleBatchSaves: 1, state: 'permanently-consumed-before-ui-runtime', reservedUTC: new Date().toISOString() });
    receipt.saveReserved = true; persist();
    originalSize = xcrun(['simctl', 'ui', device, 'content_size']).trim();
    check(/^(extra-small|small|medium|large|extra-large|extra-extra-large|extra-extra-extra-large|accessibility-medium|accessibility-large|accessibility-extra-large|accessibility-extra-extra-large|accessibility-extra-extra-extra-large)$/.test(originalSize), 'UNKNOWN_CONTENT_SIZE');
    if (originalSize !== 'large') xcrun(['simctl', 'ui', device, 'content_size', 'large']);
    // Install retains the existing isolated account data; never erase/uninstall.
    xcrun(['simctl', 'install', device, app]);
    const photo = photoVerifier(io, repo); receipt.input = photo;
    xcrun(['simctl', 'addmedia', device, photo.path]);
    receipt.firstPhotoAssumption = 'Newest imported neutral img-001.jpg, observed first Photos grid item; no library deletion or query injection.';
    const args = ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + METHOD, '-test-iterations', '1', '-test-repetition-relaunch-enabled', 'NO'];
    const executed = await run('runtime', args);
    Object.assign(receipt, evaluate(executed.log, executed.result, executed.stopped));
    if (io.existsSync(output + '/result.xcresult')) xcrun(['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments']);
    guard(); verify();
  } catch (error) { receipt.passed = false; receipt.reason = error.message; }
  finally {
    receipt.saveBudgetConsumed = io.existsSync(base + '/style119-save-reservation.json');
    if (originalSize && originalSize !== 'large') {
      try {
        // Source drift must not prevent cleanup, but ownership still gates UI.
        guard();
        exec('/usr/bin/xcrun', ['simctl', 'ui', device, 'content_size', originalSize], { env, encoding: 'utf8', timeout: 10000 });
        receipt.contentSizeRestored = true;
      } catch { receipt.passed = false; receipt.contentSizeRestored = false; receipt.reason = 'CONTENT_SIZE_RESTORE_HOLD'; }
    }
    receipt.finishedUTC = new Date().toISOString(); persist();
  }
  return { receipt, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077);
  const { receipt, output } = await runStyle119();
  console.log(JSON.stringify({ passed: receipt.passed, reason: receipt.reason, saveReserved: receipt.saveReserved,
    saveBudgetConsumed: receipt.saveBudgetConsumed, saveSubmitted: receipt.saveSubmitted, output }));
  process.exitCode = receipt.passed ? 0 : 1;
}
