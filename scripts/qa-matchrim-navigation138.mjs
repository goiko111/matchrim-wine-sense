import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { checkLeases, verifyArtifact, nativeReceiptPath } from './qa-matchrim-account114.mjs';

export const DEVICE = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
export const METHOD = 'MatchrimNavigation138Tests/testExistingQAReadOnlyNavigation138';
export const LEASE_FILE = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
export const VIEWS = ['01-profile', '02-home', '03-airim', '04-scan-hub', '05-bodega'];
export const MARKERS = ['NAV138_EXISTING_QA_IDENTITY', 'NAV138_PROFILE_AUDITED', 'NAV138_HOME_AUDITED',
  'NAV138_AIRIM_AUDITED', 'NAV138_SCAN_HUB_AUDITED', 'NAV138_BODEGA_AUDITED', 'NAV138_READONLY_SWEEP_COMPLETE'];
export const REQUIRED_SOURCES = ['src/App.tsx', 'src/pages/Index.tsx', 'src/pages/Profile.tsx',
  'src/pages/LiquidIntelligence.tsx', 'src/pages/Scan.tsx', 'src/pages/MyWines.tsx',
  'src/components/MobileBottomNav.tsx', 'src/components/NativeAppHome.tsx', 'src/components/NativeHome98.tsx',
  'src/components/NativeProfileLayout133.tsx', 'src/components/NativeAccountActions.tsx',
  'src/components/AiRimConversation.tsx', 'src/components/NativeAiRimChat99.tsx',
  'src/utils/aiRimConsumer95.ts', 'src/contexts/AuthContext.tsx',
  'src/components/NativeScanHub99.tsx', 'src/components/wine-import/ScanHub.tsx',
  'src/components/NativeCellarToolbar98.tsx', 'src/components/NativeCellarItem98.tsx'];
const bundle = 'wine.matchrim.qa99review';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const sha = value => createHash('sha256').update(value).digest('hex');
const check = (value, code) => { if (!value) throw new Error(code); };
const json = (io, file) => JSON.parse(io.readFileSync(file, 'utf8'));
const write = (io, file, value) => io.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });

export function sanitizedEnvironment(environment) {
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
  check(original?.testTargets?.length === 1 && target?.name === 'Probe97UITests'
    && target.identifier === '000000000000000000000004'
    && target.containerPath === 'container:Probe97.xcodeproj', 'AMBIGUOUS_TARGET');
  check(/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(runId), 'INVALID_RUN_ID');
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Navigation138Once', options: {} }],
    defaultOptions: { testTimeoutsEnabled: true, defaultTestExecutionTimeAllowance: 220,
      maximumTestExecutionTimeAllowance: 220, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
      testRepetitionRelaunchEnabled: false, codeCoverage: false,
      environmentVariableEntries: [{ key: 'MATCHRIM138_RUN_ID', value: runId }] },
    testTargets: [{ target: { name: target.name, identifier: target.identifier, containerPath: target.containerPath },
      parallelizable: false, selectedTests: [METHOD] }] };
}

export function evaluate(log, result, stopped = null) {
  const lines = log.split(/\r?\n/), count = marker => lines.filter(line => line === marker).length;
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:\w+\.)?MatchrimNavigation138Tests testExistingQAReadOnlyNavigation138\]$/;
  const summaries = [...log.matchAll(/Executed (\d+) tests?, with (\d+) failures/g)];
  const positions = MARKERS.map(marker => lines.indexOf(marker));
  const start = lines.findIndex(line => /^Test Case '.*' started\./.test(line));
  const end = lines.findIndex(line => /^Test Case '.*' passed[. ]/.test(line));
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped
    && MARKERS.every(marker => count(marker) === 1)
    && positions.every((position, index) => !index || position > positions[index - 1])
    && start >= 0 && end > start && positions[0] > start && positions.at(-1) < end
    && events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => expected.test(event[1])) && summaries.length > 0
    && summaries.every(summary => summary[1] === '1' && summary[2] === '0')
    && !/NAV138_FAILURE|NAV138_AUDIT_ISSUE|AUTH_SUBMITTED|SAVE_SUBMITTED|TEST (?:FAILED|SKIPPED)|retrying|restarting after|Accessibility Audit.*(?:fail|issue)/i.test(log)
    && lines.filter(line => /^NAV138_/.test(line)).every(line => MARKERS.includes(line));
  return { passed: Boolean(passed), stage: passed ? 'readonly-navigation-proven' : 'unproven-no-retry',
    ...(!passed ? { reason: stopped || 'EXACT_SINGLE_READONLY_METHOD_NOT_PROVEN' } : {}) };
}

export function verifyInstalled({ io = fs, installed, app, prep }) {
  check(typeof installed === 'string' && installed.startsWith(`/Users/GOIKO/Library/Developer/CoreSimulator/Devices/${DEVICE}/data/Containers/Bundle/Application/`)
    && path.basename(installed) === 'App.app' && io.realpathSync(installed) === installed, 'INSTALLED_APP_PATH_HOLD');
  for (const file of ['App', 'Info.plist', 'capacitor.config.json', ...Object.keys(prep.webResources).map(file => 'public/' + file)]) {
    const resident = path.join(installed, file);
    check(io.realpathSync(resident) === resident && io.lstatSync(resident).isFile()
      && !io.lstatSync(resident).isSymbolicLink(), 'INSTALLED_FILE_PATH_HOLD');
    check(sha(io.readFileSync(resident)) === sha(io.readFileSync(path.join(app, file))), 'INSTALLED_CANDIDATE_MISMATCH');
  }
}

export function verifyEvidence({ io = fs, output }) {
  const folder = output + '/attachments', manifest = json(io, folder + '/manifest.json');
  check(Array.isArray(manifest) && manifest.length === 1
    && [METHOD, METHOD + '()'].includes(manifest[0]?.testIdentifier), 'EVIDENCE_METHOD_HOLD');
  const attachments = manifest[0].attachments;
  check(Array.isArray(attachments) && attachments.every(row => row.deviceId === DEVICE
    && row.configurationName === 'Navigation138Once' && row.repetitionNumber === 1), 'EVIDENCE_RUN_HOLD');
  for (const [name, extension] of [...VIEWS.flatMap(view => [[view, 'png'], [view + '-ax', 'txt'],
    [view + '-geometry', 'txt'], [view + '-audit', 'txt']]), ['scope', 'txt']]) {
    const matching = attachments.filter(row => row.suggestedHumanReadableName?.startsWith('nav138-' + name + '_')
      && row.exportedFileName?.endsWith('.' + extension));
    check(matching.length === 1 && !matching[0].isAssociatedWithFailure, 'EVIDENCE_MISSING_OR_REPEATED');
    const fileName = matching[0].exportedFileName;
    check(/^[a-z\d-]+\.(?:png|txt)$/i.test(fileName), 'EVIDENCE_PATH_HOLD');
    const file = folder + '/' + fileName;
    check(io.realpathSync(file) === file && !io.lstatSync(file).isSymbolicLink() && io.lstatSync(file).isFile()
      && io.statSync(file).size > 0, 'EVIDENCE_FILE_HOLD');
  }
}

export async function runNavigation138({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env, now = Date.now,
  timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const env = sanitizedEnvironment(environment), base = path.join(repo, 'qa-artifacts/night105-20261021');
  const deadline = now() + 240000;
  const receipt = { passed: false, stage: 'preflight', startedUTC: new Date().toISOString(), device: DEVICE, bundle,
    account: 'info@winerim.com', authSubmissionsRequested: 0, dataMutationsRequested: 0,
    analysisOrMatchingActionsRequested: 0, voiceOverSpeechClaimed: false,
    scope: 'Existing session; Profile/Home/aiRIM/Scan hub/Bodega first viewports. Four unfiltered Apple audits. Visible AX buttons/switches and bottom navigation >=44x44pt; other links recorded, padded hit areas not inferred. Ordinary Home recommendation GETs through passthroughWinerim and aiRIM before-send profile GETs are permitted; no network-zero claim. No offscreen sweep, Dynamic Type change, physical-device, packet/model-call, or VoiceOver speech claim.',
    privacy: 'Private screenshot, AX, logs, xcresult and receipt only. No credentials or authentication storage read.' };
  let output, prep, app, installed, created = false;
  const pins = new Map(), boundInputs = new Set();
  const budget = () => { check(now() < deadline - 5000, 'WALL_LIMIT'); return deadline - now() - 5000; };
  const guard = () => {
    budget();
    if (created) check(io.realpathSync(output) === output && !io.lstatSync(output).isSymbolicLink(), 'OUTPUT_PATH_HOLD');
    checkLeases(json(io, LEASE_FILE).leases, env, now());
    const disk = io.statfsSync(base);
    check(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  const execute = (cmd, args, options = {}) => {
    guard();
    return exec(cmd, args, { ...options, env, timeout: Math.max(1, Math.min(options.timeout || 10000, budget())) });
  };
  const regular = file => check(io.realpathSync(file) === file && io.lstatSync(file).isFile()
    && !io.lstatSync(file).isSymbolicLink(), 'INPUT_PATH_HOLD');
  const verify = () => {
    for (const [file, digest] of pins) { regular(file); check(sha(io.readFileSync(file)) === digest, 'SOURCE_OR_HARNESS_CHANGED'); }
    for (const file of boundInputs) regular(file);
    verifyArtifact({ io, exec: execute, repo, prep, app });
    if (installed) verifyInstalled({ io, installed, app, prep });
  };
  const privateTree = folder => {
    check(!io.lstatSync(folder).isSymbolicLink(), 'OUTPUT_SYMLINK_HOLD');
    io.chmodSync(folder, 0o700);
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      // Xcode product symlinks remain protected by the private parent. Never follow them.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) privateTree(file);
      else io.chmodSync(file, io.statSync(file).mode & 0o111 ? 0o700 : 0o600);
    }
  };
  const pinTree = folder => {
    check(io.realpathSync(folder) === folder && !io.lstatSync(folder).isSymbolicLink(), 'HARNESS_SYMLINK_HOLD');
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      check(!entry.isSymbolicLink(), 'HARNESS_SYMLINK_HOLD');
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) pinTree(file); else { regular(file); pins.set(file, sha(io.readFileSync(file))); }
    }
  };
  const run = async (name, args) => {
    guard(); verify();
    const log = output + '/' + name + '.log', fd = io.openSync(log, 'wx', 0o600);
    let child, timer, watcher, hardTimer, stopped = null, hardDone;
    const stop = reason => {
      if (stopped) return;
      stopped = reason;
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
      watcher = timers.setInterval(() => { try { guard(); verify(); } catch { stop('LEASE_DISK_OR_SOURCE_HOLD'); } }, 2000);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, interrupt);
      const result = await new Promise(resolve => {
        child.once('error', () => { stop('SPAWN_ERROR'); resolve({ code: null, spawnError: true }); });
        child.once('close', (code, signal) => {
          if (code !== 0 || signal) stop('CHILD_FAILED');
          resolve({ code, signal });
        });
      });
      timers.clearTimeout(timer); timers.clearInterval(watcher);
      if (hardDone) await hardDone;
      return { result, stopped, log: io.readFileSync(log, 'utf8') };
    } finally {
      timers.clearTimeout(timer); timers.clearTimeout(hardTimer); timers.clearInterval(watcher); io.closeSync(fd);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, interrupt);
    }
  };
  try {
    check(environment.MATCHRIM138_RUN_READONLY === 'YES', 'EXPLICIT_FUTURE_RUNTIME_AUTHORIZATION_REQUIRED');
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length), 'EXPECTED_PREP_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && /^nav138-[\w-]+$/.test(path.basename(output)) && !io.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
    check(io.realpathSync(base) === base, 'OUTPUT_PARENT_SYMLINK_HOLD');
    guard();
    const prepFile = path.resolve(repo, argv[0], 'preparation.json'); regular(prepFile); prep = json(io, prepFile);
    check(Number.isFinite(Date.parse(prep.startedUTC)) && now() >= Date.parse(prep.startedUTC)
      && now() - Date.parse(prep.startedUTC) < 24 * 3600000, 'FRESH_PREPARATION_REQUIRED');
    check(prep.publicConfiguration?.fixtures === false && prep.publicConfiguration?.analytics === false
      && prep.publicConfiguration?.masterConfigured === false && prep.publicConfiguration?.envDir === false,
    'REAL_PUBLIC_READONLY_CONFIGURATION_REQUIRED');
    for (const file of REQUIRED_SOURCES) check(Object.hasOwn(prep.sourceFingerprints || {}, file), 'MISSING_SOURCE_BINDING');
    // Validate manifest paths before the account114 verifier reads them; no traversal or private-file discovery.
    for (const [file, digest] of Object.entries(prep.sourceFingerprints || {})) {
      check((/^(?:src|public|ios)\//.test(file)
          || ['index.html', 'package.json', 'package-lock.json', 'tailwind.config.ts', 'postcss.config.js', 'tsconfig.app.json'].includes(file))
        && !file.split(/[\\/]/).some(part => !part || part === '..' || (part.startsWith('.') && part !== '.gitignore'))
        && !/credential|keychain|cookies|private-access|\.pem$|\.p12$|\.mobileprovision$/i.test(file)
        && /^[a-f\d]{64}$/.test(digest), 'SOURCE_MANIFEST_PATH_HOLD');
      const source = path.resolve(repo, file); regular(source); boundInputs.add(source);
    }
    check(prep.webResources && Object.hasOwn(prep.webResources, 'index.html'), 'EMPTY_WEB_MANIFEST');
    for (const [file, digest] of Object.entries(prep.webResources)) {
      check(!path.isAbsolute(file) && !file.split(/[\\/]/).some(part => !part || part === '..' || part.startsWith('.'))
        && /^[a-f\d]{64}$/.test(digest), 'WEB_MANIFEST_PATH_HOLD');
      const resource = path.join(app, 'public', file); regular(resource); boundInputs.add(resource);
    }
    for (const file of ['App', 'Info.plist', 'capacitor.config.json']) {
      const artifact = path.join(app, file); regular(artifact); boundInputs.add(artifact);
    }
    regular(nativeReceiptPath(app));
    check(typeof prep.production === 'string' && path.isAbsolute(prep.production), 'PRODUCTION_PATH_HOLD');
    regular(path.join(prep.production, 'ios/App/App/capacitor.config.json'));
    boundInputs.add(path.join(prep.production, 'ios/App/App/capacitor.config.json'));
    verify();
    installed = execute('/usr/bin/xcrun', ['simctl', 'get_app_container', DEVICE, bundle, 'app'], { encoding: 'utf8' }).trim();
    verify();
    const probe = path.join(repo, 'scripts/MatchrimNavigation138Probe.swift');
    const harness = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    for (const file of [prepFile, nativeReceiptPath(app), probe,
      ...['qa-matchrim-navigation138.mjs', 'check-matchrim-navigation138.mjs', 'qa-matchrim-account114.mjs'].map(name => path.join(repo, 'scripts', name))]) {
      regular(file); pins.set(file, sha(io.readFileSync(file)));
    }
    pinTree(harness + '/Probe97.xcodeproj');
    regular(harness + '/Probe97.xctestplan');
    pins.set(harness + '/Probe97.xctestplan', sha(io.readFileSync(harness + '/Probe97.xctestplan')));
    const runId = randomUUID(), plan = makePlan(json(io, harness + '/Probe97.xctestplan'), runId);
    io.mkdirSync(output, { mode: 0o700 }); created = true;
    check((io.statSync(output).mode & 0o777) === 0o700, 'PRIVATE_OUTPUT_REQUIRED');
    const project = output + '/project'; io.mkdirSync(project, { mode: 0o700 });
    io.cpSync(harness + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    write(io, project + '/Probe97.xctestplan', plan);
    io.writeFileSync(project + '/AutomationModeProbe.swift', io.readFileSync(probe), { mode: 0o600, flag: 'wx' });
    privateTree(project); pinTree(project);
    receipt.build = prep.build; receipt.sourceCommit = prep.commit; receipt.runId = runId; receipt.probeSHA256 = pins.get(probe);
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Navigation138Once', '-destination', 'id=' + DEVICE, '-derivedDataPath', output + '/derived',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution', '-skipPackageUpdates',
      '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa138.navigation.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    receipt.stage = 'compile';
    const compiled = await run('compile', ['build-for-testing', ...common]);
    check(compiled.result.code === 0 && !compiled.result.signal && !compiled.result.spawnError && !compiled.stopped
      && !/NAV138_|Test Case '|AUTH_SUBMITTED|SAVE_SUBMITTED/.test(compiled.log), 'COMPILE_PREFLIGHT_FAILED');
    receipt.stage = 'runtime';
    const executed = await run('runtime', ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + METHOD]);
    Object.assign(receipt, evaluate(executed.log, executed.result, executed.stopped));
    guard(); verify();
    check(io.existsSync(output + '/result.xcresult'), 'RESULT_BUNDLE_UNAVAILABLE');
    execute('/usr/bin/xcrun', ['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult',
      '--output-path', output + '/attachments'], { encoding: 'utf8', timeout: 10000 });
    guard(); verify();
    if (receipt.passed) verifyEvidence({ io, output });
  } catch (error) {
    receipt.passed = false;
    if (receipt.stage === 'readonly-navigation-proven') receipt.stage = 'post-runtime-evidence-hold';
    receipt.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'LOCAL_HOLD_DETAILS_WITHHELD';
  } finally {
    receipt.finishedUTC = new Date().toISOString();
    if (created) {
      try {
        check(io.realpathSync(output) === output, 'OUTPUT_PATH_HOLD');
        privateTree(output);
        write(io, output + '/RESULT.json', receipt);
      } catch { receipt.passed = false; receipt.reason = 'OUTPUT_PRIVACY_HOLD'; }
    }
  }
  return { receipt, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077);
  const { receipt } = await runNavigation138();
  console.log(JSON.stringify({ passed: receipt.passed, stage: receipt.stage, reason: receipt.reason }));
  process.exitCode = receipt.passed ? 0 : 1;
}
