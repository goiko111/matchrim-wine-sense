import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { checkLeases, verifyArtifact, nativeReceiptPath } from './qa-matchrim-account114.mjs';

export const DEVICE = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
export const INPUT_SHA256 = 'a6e1e36b8c3f5220a6174320af42e788826103d5fb09d7b25bb0bc1bbc194409';
export const METHOD = 'MatchrimReference136Tests/testExistingQAReadOnlyReference136';
export const MARKERS = ['REF136_EXISTING_QA_IDENTITY', 'REF136_LOCAL_MODE_SELECTED',
  'REF136_PHOTOS_ADDED_ORDER_VERIFIED', 'REF136_ATTESTED_PHOTO_SELECTED',
  'REF136_UNCONFIRMED_EXPECTED_PROPOSAL', 'REF136_EXPLICIT_REFERENCE_SELECTED',
  'REF136_INDEPENDENT_FICHE_NUMERIC_STYLE', 'REF136_READONLY_REFERENCE_COMPLETE'];
export const LEASE_FILE = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
export const MEDIA = `/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Media`;
export const PHOTO_SQL = 'PRAGMA query_only=ON; SELECT ZFILENAME AS filename, ZDIRECTORY AS directory, ZADDEDDATE AS added FROM ZASSET WHERE ZTRASHEDSTATE = 0 ORDER BY ZADDEDDATE DESC LIMIT 2;';
const bundle = 'wine.matchrim.qa99review';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const sha = value => createHash('sha256').update(value).digest('hex');
const check = (value, code) => { if (!value) throw new Error(code); };
const json = (io, file) => JSON.parse(io.readFileSync(file, 'utf8'));
const write = (io, file, value) => io.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });

export function sanitizedEnvironment(environment) {
  // Allowlist, not a secret-name denylist: no inherited test injection or auth inputs.
  const env = {};
  for (const key of ['HOME', 'TMPDIR', 'USER', 'LOGNAME', 'LANG', 'LC_ALL',
    'MATCHRIM102_HEAVY_LEASE_ID', 'MATCHRIM104_SIMULATOR_LEASE_ID', 'MATCHRIM102_WRITER_LEASE_ID']) {
    if (typeof environment[key] === 'string') env[key] = environment[key];
  }
  env.PATH = '/usr/bin:/bin:/usr/sbin:/sbin';
  env.DEVELOPER_DIR = developer;
  return env;
}

export function makePlan(original, runId) {
  const target = original?.testTargets?.[0]?.target;
  check(original?.testTargets?.length === 1 && /^[\w-]+$/.test(target?.name)
    && typeof target.identifier === 'string' && /^[A-Fa-f\d]{24}$/.test(target.identifier)
    && target.containerPath === 'container:Probe97.xcodeproj', 'AMBIGUOUS_TARGET');
  check(/^[a-f\d-]{36}$/i.test(runId), 'INVALID_RUN_ID');
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Reference136Once', options: {} }],
    defaultOptions: { testTimeoutsEnabled: true, defaultTestExecutionTimeAllowance: 220,
      maximumTestExecutionTimeAllowance: 220, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
      testRepetitionRelaunchEnabled: false, codeCoverage: false,
      environmentVariableEntries: [{ key: 'MATCHRIM136_RUN_ID', value: runId },
        { key: 'MATCHRIM136_INPUT_SHA256', value: INPUT_SHA256 }] },
    testTargets: [{ target: { name: target.name, identifier: target.identifier, containerPath: target.containerPath },
      parallelizable: false, selectedTests: [METHOD] }] };
}

export function evaluate(log, result, stopped = null) {
  const lines = log.split(/\r?\n/), count = marker => lines.filter(line => line === marker).length;
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:\w+\.)?MatchrimReference136Tests testExistingQAReadOnlyReference136\]$/;
  const summaries = [...log.matchAll(/Executed (\d+) tests?, with (\d+) failures/g)];
  const positions = MARKERS.map(marker => lines.indexOf(marker));
  const bodega = ['REF136_EXISTING_BODEGA_CAPTURED', 'REF136_EXISTING_BODEGA_UNAVAILABLE'];
  const state = bodega.find(marker => count(marker) === 1);
  const started = lines.findIndex(line => /^Test Case '.*' started\./.test(line));
  const finished = lines.findIndex(line => /^Test Case '.*' passed[. ]/.test(line));
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped
    && MARKERS.every(marker => count(marker) === 1)
    && positions.every((position, index) => !index || position > positions[index - 1])
    && positions[0] > started && positions.at(-1) < finished
    && bodega.reduce((sum, marker) => sum + count(marker), 0) === 1
    && lines.indexOf(state) > positions.at(-2) && lines.indexOf(state) < positions.at(-1)
    && events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => expected.test(event[1])) && summaries.length > 0
    && summaries.every(summary => summary[1] === '1' && summary[2] === '0')
    && !/REF136_FAILURE|AUTH_SUBMITTED|SAVE_SUBMITTED|SAVED_SCORE_VERIFIED|PERSISTED110|TEST (?:FAILED|SKIPPED)/i.test(log)
    && lines.filter(line => /^REF136_/.test(line)).every(line => MARKERS.includes(line) || bodega.includes(line));
  return { passed: Boolean(passed), stage: passed ? 'readonly-reference-proven' : 'unproven-no-retry',
    existingBodegaScoresCaptured: passed && state === bodega[0],
    ...(!passed ? { reason: stopped || 'EXACT_SINGLE_READONLY_METHOD_NOT_PROVEN' } : {}) };
}

export function bindLatestAsset(rows, { io = fs, media = MEDIA, expected = INPUT_SHA256 } = {}) {
  check(Array.isArray(rows) && rows.length > 0 && rows.length <= 2, 'PHOTO_ROWS_UNAVAILABLE');
  const row = rows[0];
  check(row && typeof row.filename === 'string' && /^[a-z\d_.-]+$/i.test(row.filename)
    && typeof row.directory === 'string' && /^DCIM\/[a-z\d_-]+$/i.test(row.directory)
    && Number.isFinite(row.added) && row.added > 0
    && (rows.length === 1 || (Number.isFinite(rows[1]?.added) && row.added > rows[1].added)), 'LATEST_PHOTO_AMBIGUOUS');
  const resident = path.join(media, row.directory, row.filename);
  check(io.realpathSync(media) === media && io.realpathSync(resident) === resident
    && io.lstatSync(resident).isFile() && !io.lstatSync(resident).isSymbolicLink(), 'PHOTO_RESIDENT_PATH_HOLD');
  check(sha(io.readFileSync(resident)) === expected, 'LATEST_ADDED_NOT_IMG001');
  return { ...row, resident, sha256: expected };
}

export function attestPhoto({ io = fs, exec = execFileSync, repo, env }) {
  const prepared = path.join(repo, 'qa-artifacts/catalogue100-20261021/native-prepared-ocr-r2/prepared/img-001.jpg');
  check(sha(io.readFileSync(prepared)) === INPUT_SHA256, 'PREPARED_IMG001_CHANGED');
  const asset = bindLatestAsset(queryLatestRows({ io, exec, env }), { io });
  return { ...asset, prepared, attestedUTC: new Date().toISOString() };
}

export function queryLatestRows({ io = fs, exec = execFileSync, env }) {
  const database = MEDIA + '/PhotoData/Photos.sqlite';
  check(io.realpathSync(database) === database && io.lstatSync(database).isFile(), 'PHOTO_DATABASE_PATH_HOLD');
  // Do not use immutable=1: the live WAL must be visible. No import/copy/checkpoint.
  const raw = exec('/usr/bin/sqlite3', ['-readonly', '-json', '-cmd', '.timeout 1000', database, PHOTO_SQL],
    { env, encoding: 'utf8', timeout: 3000, maxBuffer: 65536 });
  return JSON.parse(raw);
}

export function verifyInstalled({ io = fs, installed, app, prep }) {
  check(typeof installed === 'string' && installed.startsWith(`/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Containers/Bundle/Application/`)
    && path.basename(installed) === 'App.app' && io.realpathSync(installed) === installed, 'INSTALLED_APP_PATH_HOLD');
  for (const file of ['App', 'Info.plist', 'capacitor.config.json', ...Object.keys(prep.webResources).map(file => 'public/' + file)]) {
    check(sha(io.readFileSync(path.join(installed, file))) === sha(io.readFileSync(path.join(app, file))), 'INSTALLED_CANDIDATE_MISMATCH');
  }
}

export async function runReference136({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env, now = Date.now,
  photoAttestor = attestPhoto, timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const env = sanitizedEnvironment(environment), base = path.join(repo, 'qa-artifacts/night105-20261021');
  const deadline = now() + 240000;
  const receipt = { passed: false, stage: 'preflight', startedUTC: new Date().toISOString(), device: DEVICE, bundle,
    account: 'info@winerim.com', newSavePersistenceClaimed: false, authSubmissionsRequested: 0,
    dataMutationsRequested: 0, cloudAnalysisControlsRequested: 0,
    scope: 'Existing session; source-bound local Apple Vision UI path, public proposals, explicit reference, independent NV fiche and numeric style. Optional existing Bodega scores only. Not packet/model-call counts or consumer accuracy. No new save or persistence assertion.',
    privacy: 'Logs, screenshots, AX, xcresult and output remain private. No private credentials/session files read.' };
  let output, prep, app, installed, created = false, attested;
  const pins = new Map();
  const budget = () => { check(now() < deadline - 5000, 'WALL_LIMIT'); return deadline - now() - 5000; };
  const execute = (cmd, args, options = {}) => exec(cmd, args,
    { ...options, env, timeout: Math.max(1, Math.min(options.timeout || 10000, budget())) });
  const guard = () => {
    budget();
    // Validate only. This harness never acquires, renews or releases leases.
    checkLeases(json(io, LEASE_FILE).leases, env, now());
    const disk = io.statfsSync(base);
    check(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  const verify = () => {
    verifyArtifact({ io, exec: execute, repo, prep, app });
    if (installed) verifyInstalled({ io, installed, app, prep });
    for (const [file, digest] of pins) check(sha(io.readFileSync(file)) === digest, 'SOURCE_OR_HARNESS_CHANGED');
  };
  const photo = () => {
    guard();
    const fresh = photoAttestor({ io, exec: execute, repo, env });
    if (attested) check(fresh.resident === attested.resident && fresh.added === attested.added, 'PHOTO_LIBRARY_CHANGED');
    return fresh;
  };
  const privateTree = folder => {
    check(!io.lstatSync(folder).isSymbolicLink(), 'OUTPUT_SYMLINK_HOLD');
    io.chmodSync(folder, 0o700);
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      // Xcode creates product symlinks. The private parent protects these names;
      // never follow/chmod their destinations, which may be outside this output.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) privateTree(file);
      else io.chmodSync(file, io.statSync(file).mode & 0o111 ? 0o700 : 0o600);
    }
  };
  const pinTree = folder => {
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      check(!entry.isSymbolicLink(), 'HARNESS_SYMLINK_HOLD');
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) pinTree(file); else pins.set(file, sha(io.readFileSync(file)));
    }
  };
  const run = async (name, args) => {
    guard(); verify();
    if (name === 'runtime') { attested = photo(); write(io, output + '/PHOTO-ATTESTATION.json', attested); }
    const log = output + '/' + name + '.log', fd = io.openSync(log, 'wx', 0o600);
    let child, timer, watcher, hardTimer, stopped = null, hardDone;
    const stop = reason => {
      if (stopped) return;
      stopped = reason;
      // Only this detached child group, never pkill/killall or a simulator-wide cleanup.
      const kill = signal => { if (Number.isSafeInteger(child?.pid) && child.pid > 1) {
        try { killGroup(child.pid, signal); } catch { try { child.kill(signal); } catch { /* Already gone. */ } }
      } };
      kill('SIGINT');
      hardDone = new Promise(resolve => { hardTimer = timers.setTimeout(() => { kill('SIGKILL'); resolve(); }, 3000); });
    };
    const interrupt = () => stop('INTERRUPTED');
    try {
      const remaining = budget();
      child = start(developer + '/usr/bin/xcodebuild', args, { env, detached: true, stdio: ['ignore', fd, fd] });
      timer = timers.setTimeout(() => stop('WALL_LIMIT'), remaining);
      watcher = timers.setInterval(() => { try {
        guard(); verify(); if (name === 'runtime') photo();
      } catch { stop('LEASE_DISK_SOURCE_OR_PHOTO_HOLD'); } }, 2000);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, interrupt);
      const result = await new Promise(resolve => {
        child.once('error', () => resolve({ code: null, spawnError: true }));
        child.once('close', (code, signal) => resolve({ code, signal }));
      });
      timers.clearTimeout(timer); timers.clearInterval(watcher);
      if (hardDone) await hardDone; // Do not cancel descendant cleanup when the leader exits.
      return { result, stopped, log: io.readFileSync(log, 'utf8') };
    } finally {
      timers.clearTimeout(timer); timers.clearTimeout(hardTimer); timers.clearInterval(watcher); io.closeSync(fd);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, interrupt);
    }
  };
  try {
    check(environment.MATCHRIM136_RUN_READONLY === 'YES', 'EXPLICIT_FUTURE_RUNTIME_AUTHORIZATION_REQUIRED');
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length), 'EXPECTED_PREP_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && /^ref136-[\w-]+$/.test(path.basename(output)) && !io.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
    check(io.realpathSync(base) === base, 'OUTPUT_PARENT_SYMLINK_HOLD');
    guard();
    const prepFile = path.resolve(repo, argv[0], 'preparation.json'); prep = json(io, prepFile);
    check(Number.isFinite(Date.parse(prep.startedUTC)) && now() >= Date.parse(prep.startedUTC)
      && now() - Date.parse(prep.startedUTC) < 24 * 3600000, 'FRESH_PREPARATION_REQUIRED');
    check(prep.publicConfiguration?.fixtures === false && prep.publicConfiguration?.analytics === false
      && prep.publicConfiguration?.masterConfigured === false, 'REAL_PUBLIC_READONLY_CONFIGURATION_REQUIRED');
    for (const file of ['src/components/wine-import/MultiWineLabelScanner.tsx', 'src/utils/nativeSingleLabel109.ts',
      'src/utils/nativeOCR106.ts', 'src/utils/globalWineProposals104.ts', 'src/utils/nativeGlobalCatalogue103.ts',
      'src/components/wine-import/GlobalWineRecovery104.tsx', 'src/components/wine-import/NativeGlobalCatalogue103.tsx',
      'src/utils/cellarReferenceStyle110.ts', 'src/components/CellarReferenceStyle110.tsx',
      'ios/App/App/MatchrimOCRPlugin106.swift']) {
      check(Object.hasOwn(prep.sourceFingerprints || {}, file), 'MISSING_SOURCE_BINDING');
    }
    verify(); attested = photo();
    installed = execute('/usr/bin/xcrun', ['simctl', 'get_app_container', DEVICE, bundle, 'app'], { encoding: 'utf8' }).trim();
    verify();
    const probe = path.join(repo, 'scripts/MatchrimReference136Probe.swift');
    const harness = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    for (const file of [prepFile, nativeReceiptPath(app), probe, attested.prepared,
      ...['qa-matchrim-reference136.mjs', 'check-matchrim-reference136.mjs', 'qa-matchrim-account114.mjs'].map(name => path.join(repo, 'scripts', name))]) {
      pins.set(file, sha(io.readFileSync(file)));
    }
    // Copy only the project and a freshly sanitized plan, never an inherited probe/secret plan.
    pinTree(harness + '/Probe97.xcodeproj');
    pins.set(harness + '/Probe97.xctestplan', sha(io.readFileSync(harness + '/Probe97.xctestplan')));
    io.mkdirSync(output, { mode: 0o700 }); created = true;
    check((io.statSync(output).mode & 0o777) === 0o700, 'PRIVATE_OUTPUT_REQUIRED');
    const project = output + '/project'; io.mkdirSync(project, { mode: 0o700 });
    io.cpSync(harness + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    const plan = makePlan(json(io, harness + '/Probe97.xctestplan'), randomUUID());
    write(io, project + '/Probe97.xctestplan', plan);
    io.writeFileSync(project + '/AutomationModeProbe.swift', io.readFileSync(probe), { mode: 0o600, flag: 'wx' });
    privateTree(project); pinTree(project);
    receipt.build = prep.build; receipt.sourceCommit = prep.commit;
    receipt.probeSHA256 = pins.get(probe); receipt.inputSHA256 = INPUT_SHA256;
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Reference136Once', '-destination', 'id=' + DEVICE, '-derivedDataPath', output + '/derived',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates',
      '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa136.reference.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    receipt.stage = 'compile';
    const compiled = await run('compile', ['build-for-testing', ...common]);
    check(compiled.result.code === 0 && !compiled.result.signal && !compiled.result.spawnError && !compiled.stopped
      && !/REF136_|AUTH_SUBMITTED|SAVE_SUBMITTED/.test(compiled.log), 'COMPILE_PREFLIGHT_FAILED');
    receipt.stage = 'runtime';
    const executed = await run('runtime', ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + METHOD]);
    Object.assign(receipt, evaluate(executed.log, executed.result, executed.stopped));
    guard(); verify(); photo();
    check(io.existsSync(output + '/result.xcresult'), 'RESULT_BUNDLE_UNAVAILABLE');
    execute('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult',
      '--output-path', output + '/attachments'], { encoding: 'utf8', timeout: 10000 });
    guard(); verify();
  } catch (error) {
    receipt.passed = false;
    if (receipt.stage === 'readonly-reference-proven') receipt.stage = 'post-runtime-evidence-hold';
    receipt.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'LOCAL_HOLD_DETAILS_WITHHELD';
  } finally {
    receipt.finishedUTC = new Date().toISOString();
    if (created) {
      try { privateTree(output); } catch { receipt.passed = false; receipt.reason = 'OUTPUT_PRIVACY_HOLD'; }
      write(io, output + '/RESULT.json', receipt);
    }
  }
  return { receipt, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077);
  const { receipt } = await runReference136();
  // Detailed evidence and paths stay in the private output, never stdout.
  console.log(JSON.stringify({ passed: receipt.passed, stage: receipt.stage, reason: receipt.reason }));
  process.exitCode = receipt.passed ? 0 : 1;
}
