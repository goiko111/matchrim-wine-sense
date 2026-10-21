import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';

export const OWNER = '019f9da7-ae96-7c60-a1b4-fafb75b04d6d';
export const ACCOUNT = 'info@winerim.com';
export const AUTH_METHOD = 'MatchrimAccount114Tests/testExistingQAAccountReadOnly114';
export const SUBMISSION = 'ACCOUNT114_AUTH_SUBMITTED_ONCE';
export const COMPLETION = 'ACCOUNT114_REAL_NATIVE_READONLY_FLOW_COMPLETE_NO_WINE_MUTATIONS';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const device = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127', bundle = 'wine.matchrim.qa99review';
const leaseFile = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
const privateFile = '/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim97-physical-20261020/account/PRIVATE-ACCESS.json';
const sha = value => createHash('sha256').update(value).digest('hex');
class Hold extends Error { constructor(code) { super(code); this.code = code; } }
const check = (condition, code) => { if (!condition) throw new Hold(code); };
const readJSON = (io, file, code) => {
  try { return JSON.parse(io.readFileSync(file, 'utf8')); } catch { throw new Hold(code); }
};
const writeJSON = (io, file, value, flag = 'w') => io.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag });

export function checkLeases(leases, env, now = Date.now()) {
  for (const [resource, key] of [['heavy-local', 'MATCHRIM102_HEAVY_LEASE_ID'], ['ios-simulator', 'MATCHRIM104_SIMULATOR_LEASE_ID'], ['writer-matchrim-native99', 'MATCHRIM102_WRITER_LEASE_ID']]) {
    const lease = leases?.[resource];
    check(typeof env[key] === 'string' && env[key].length > 0 && lease?.owner === OWNER
      && lease.leaseId === env[key] && Number.isFinite(lease.reviewAfter) && lease.reviewAfter * 1000 > now,
    'RESOURCE_HOLD_' + resource);
  }
}

export function checkLocalConfig(config) {
  check(config && typeof config === 'object' && !Array.isArray(config), 'INVALID_CAPACITOR_CONFIG');
  check(!config.server || (typeof config.server === 'object' && !Array.isArray(config.server)
    && !Object.hasOwn(config.server, 'url')), 'REMOTE_SERVER_URL');
  check(typeof config.webDir === 'string' && config.webDir.length > 0
    && config.webDir === config.webDir.trim() && !path.isAbsolute(config.webDir)
    && /^[a-z\d_./-]+$/i.test(config.webDir) && !config.webDir.split('/').includes('..'), 'REMOTE_WEB_DIR');
  check(!config.server?.iosScheme || !/^https?$/i.test(config.server.iosScheme), 'REMOTE_WEB_SCHEME');
}

export function nativeReceiptPath(app) {
  const suffix = path.join('build', 'derived', 'Build', 'Products', 'Debug-iphonesimulator', 'App.app');
  check(app.endsWith(path.sep + suffix), 'UNEXPECTED_NATIVE_APP_PATH');
  return path.join(app.slice(0, -(suffix.length + 1)), 'RESULT.json');
}

export function verifyArtifact({ io = fs, exec = execFileSync, repo, prep, app }) {
  check(prep?.passed === true && prep.typecheck === 'PASS' && Number.isSafeInteger(prep.build) && prep.build >= 103
    && typeof prep.commit === 'string' && prep.commit.length > 0 && typeof prep.production === 'string', 'PREPARATION_HOLD');
  check(prep.sourceFingerprints && Object.keys(prep.sourceFingerprints).length > 0
    && prep.webResources && Object.hasOwn(prep.webResources, 'index.html'), 'EMPTY_PREPARATION_MANIFEST');
  for (const [file, hash] of Object.entries(prep.sourceFingerprints)) {
    check(sha(io.readFileSync(path.resolve(repo, file))) === hash, 'SOURCE_CHANGED');
  }
  for (const [file, hash] of Object.entries(prep.webResources)) {
    check(!path.isAbsolute(file) && !file.split(/[\\/]/).includes('..'), 'INVALID_RESOURCE_PATH');
    check(sha(io.readFileSync(path.join(app, 'public', file))) === hash, 'WEB_RESOURCE_CHANGED');
  }
  const built = readJSON(io, nativeReceiptPath(app), 'NATIVE_RECEIPT_UNAVAILABLE');
  check(built?.passed === true && built.app === app && built.sourceCommit === prep.commit && built.build === prep.build,
    'NATIVE_RECEIPT_MISMATCH');
  for (const [key, file] of [['executableSHA256', 'App'], ['capacitorConfigSHA256', 'capacitor.config.json'], ['infoPlistSHA256', 'Info.plist']]) {
    check(typeof built.nativeArtifact?.[key] === 'string' && /^[a-f\d]{64}$/.test(built.nativeArtifact[key])
      && sha(io.readFileSync(path.join(app, file))) === built.nativeArtifact[key], 'NATIVE_ARTIFACT_MISMATCH_' + key);
  }
  const configBytes = io.readFileSync(path.join(app, 'capacitor.config.json'));
  check(sha(configBytes) === sha(io.readFileSync(path.join(prep.production, 'ios/App/App/capacitor.config.json'))), 'CAPACITOR_PREPARATION_MISMATCH');
  checkLocalConfig(readJSON(io, path.join(app, 'capacitor.config.json'), 'INVALID_CAPACITOR_CONFIG'));
  // Metadata/canonical links can be remote; executable entry points must be local.
  const html = io.readFileSync(path.join(app, 'public/index.html'), 'utf8');
  check(!/<(?:script|base|iframe)\b[^>]*\b(?:src|href)\s*=\s*["']?\s*(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(html), 'REMOTE_WEB_ENTRY');
  for (const [key, expected] of [['CFBundleVersion', String(prep.build)], ['CFBundleIdentifier', bundle], ['CFBundleExecutable', 'App']]) {
    const actual = exec('/usr/bin/plutil', ['-extract', key, 'raw', '-o', '-', app + '/Info.plist'], { encoding: 'utf8', timeout: 10000 });
    check(actual.trim() === expected, 'NATIVE_PLIST_MISMATCH_' + key);
  }
}

export function checkHistory(io, base) {
  check(!io.existsSync(path.join(base, 'account114-auth-reservation.json')), 'AUTH_BUDGET_ALREADY_RESERVED');
  for (const name of io.readdirSync(base).filter(name => name.startsWith('account114-'))) {
    const prior = path.join(base, name);
    if (!io.statSync(prior).isDirectory()) continue;
    check(!io.existsSync(prior + '/AUTH-SUBMITTED.json'), 'PRIOR_AUTH_SUBMISSION');
    if (io.existsSync(prior + '/runtime.log')) {
      check(!io.readFileSync(prior + '/runtime.log', 'utf8').includes(SUBMISSION), 'PRIOR_AUTH_SUBMISSION');
    }
    if (io.existsSync(prior + '/RESULT.json')) {
      const result = readJSON(io, prior + '/RESULT.json', 'UNREADABLE_PRIOR_RESULT');
      check(!result.authReserved && !result.authSubmitted && !result.authAttemptMayHaveStarted, 'PRIOR_AUTH_ATTEMPT');
    }
  }
}

export function reserveAuth(io, base, reservation) {
  checkHistory(io, base);
  const file = path.join(base, 'account114-auth-reservation.json');
  // Never remove this reservation, including on spawn failure or lost stdout.
  let fd;
  try { fd = io.openSync(file, 'wx', 0o600); }
  catch (error) { if (error.code === 'EEXIST') throw new Hold('AUTH_BUDGET_ALREADY_RESERVED'); throw error; }
  try { io.writeFileSync(fd, JSON.stringify(reservation) + '\n'); io.fsyncSync(fd); }
  finally { io.closeSync(fd); }
  const dir = io.openSync(base, 'r');
  try { io.fsyncSync(dir); } finally { io.closeSync(dir); }
}

export function makePrivatePlan(original, access, reservationId) {
  check(original?.testTargets?.length === 1 && original.testTargets[0].target
    && /^[A-Za-z0-9_-]+$/.test(original.testTargets[0].target.name), 'AMBIGUOUS_TEST_TARGET');
  check(access?.email === ACCOUNT && typeof access.password === 'string' && access.password.length > 12
    && !/[\u0000-\u001f\u007f]/.test(access.password), 'PRIVATE_ENVIRONMENT_INVALID');
  // Do not inherit target filters, configuration overrides, retries or extra targets.
  const defaultOptions = { defaultTestExecutionTimeAllowance: 200, maximumTestExecutionTimeAllowance: 200,
    testTimeoutsEnabled: true, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
    testRepetitionRelaunchEnabled: false, environmentVariableEntries: [
      { key: 'MATCHRIM114_EMAIL', value: access.email }, { key: 'MATCHRIM114_PASSWORD', value: access.password },
      { key: 'MATCHRIM114_RESERVATION_ID', value: reservationId },
    ] };
  if (original.defaultOptions?.targetForVariableExpansion) defaultOptions.targetForVariableExpansion = original.defaultOptions.targetForVariableExpansion;
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Account114Once', options: {} }], defaultOptions,
    testTargets: [{ target: original.testTargets[0].target, parallelizable: false }] };
}

const markerCount = (log, marker) => log.split(/\r?\n/).filter(line => line === marker).length;
export function evaluateAuthResult(log, result, stopped = null) {
  const submissions = markerCount(log, SUBMISSION), completions = markerCount(log, COMPLETION);
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:[\w]+\.)?MatchrimAccount114Tests testExistingQAAccountReadOnly114\]$/;
  const starts = events.filter(event => event[2] === 'started');
  const passes = events.filter(event => event[2] === 'passed');
  const failure = ['PRE_SUBMIT_UI', 'PRIVATE_ENVIRONMENT', 'AUTH_REJECTED', 'AUTH_OUTCOME_UNKNOWN', 'POST_LOGIN_ASSERTION']
    .filter(stage => markerCount(log, 'ACCOUNT114_FAILURE_' + stage) > 0);
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped && submissions === 1 && completions === 1
    && starts.length === 1 && passes.length === 1 && expected.test(starts[0][1]) && expected.test(passes[0][1])
    && events.length === 2 && failure.length === 0
    && /Executed 1 test, with 0 failures(?: \(0 unexpected\))? in /.test(log);
  if (passed) return { passed: true, stage: 'passed', authSubmitted: true };
  let stage = 'unknown-after-submit';
  if (!stopped && failure.length === 1 && completions === 0 && submissions <= 1) {
    if (submissions === 0 && failure[0] === 'PRE_SUBMIT_UI') stage = 'pre-submit-ui-failure';
    if (submissions === 0 && failure[0] === 'PRIVATE_ENVIRONMENT') stage = 'private-environment-preflight-failed';
    if (submissions === 1 && failure[0] === 'AUTH_REJECTED') stage = 'authentication-rejected';
    if (submissions === 1 && failure[0] === 'POST_LOGIN_ASSERTION') stage = 'post-login-assertion-failed';
  }
  return { passed: false, stage, authSubmitted: submissions > 0, reason: stopped || 'EXACT_SINGLE_AUTH_TEST_NOT_PROVEN' };
}

export async function runAccount114({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env,
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const base = path.resolve(repo, 'qa-artifacts/night105-20261021');
  const env = { ...Object.fromEntries(Object.entries(environment).filter(([key]) =>
    !/KEY|AUTH|PASSWORD|SECRET|TOKEN|CREDENTIAL|MATCHRIM114/i.test(key))), DEVELOPER_DIR: developer };
  const receipt = { startedUTC: new Date().toISOString(), passed: false, stage: 'pre-submit-hold', device, bundle,
    account: ACCOUNT, authSubmissionLimit: 1, authReserved: false, authBudgetConsumed: false, authSubmitted: false, authAttemptMayHaveStarted: false,
    scope: 'Existing authorized QA account; one conservative UI attempt, then read-only profile/collection/details. No signup, reset, logout, wine/rating/quiz/stock writes or model starts.',
    reservationPolicy: 'Compile-only and private input validation precede reservation. Once reserved, any setup, spawn or execution failure consumes the budget; never auto-rerun.',
    artifactPrivacy: 'Private credential plan, logs, derived data and xcresult must not be shared.', modelStartsRequested: 0,
    webPublished: false, backendDeployed: false };
  let output, prep, app, originalSize, access, reserved = false, outputCreated = false;
  let pins = new Map();
  const guard = () => {
    checkLeases(readJSON(io, leaseFile, 'LEASE_FILE_UNAVAILABLE').leases, env);
    const disk = io.statfsSync(base);
    check(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  const verify = () => {
    verifyArtifact({ io, exec, repo, prep, app });
    for (const [file, hash] of pins) check(sha(io.readFileSync(file)) === hash, 'SOURCE_OR_HARNESS_CHANGED');
  };
  const xcrun = args => { guard(); verify(); return exec('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 120000 }); };
  const persist = () => { if (outputCreated) writeJSON(io, output + '/RESULT.json', receipt); };
  const captureSubmission = log => {
    if (markerCount(log, SUBMISSION) > 0 && !io.existsSync(output + '/AUTH-SUBMITTED.json')) {
      writeJSON(io, output + '/AUTH-SUBMITTED.json', { account: ACCOUNT, maximumAuthSubmissions: 1,
        scope: 'Conservative UI marker, not a server request count', recordedUTC: new Date().toISOString() }, 'wx');
    }
  };
  const run = async (name, args, reserve = false) => {
    guard(); verify();
    const logFile = output + '/' + name + '.log', fd = io.openSync(logFile, 'wx', 0o600);
    let child, timer, watch, hardStop, stopped = null;
    const stop = reason => {
      if (stopped) return;
      stopped = reason;
      const kill = signal => { try { killGroup(child.pid, signal); } catch { child.kill(signal); } };
      kill('SIGINT'); hardStop = setTimeout(() => kill('SIGKILL'), 10000); hardStop.unref();
    };
    const interrupted = () => stop('INTERRUPTED');
    try {
      if (reserve) {
        reserveAuth(io, base, { reservationId: receipt.reservationId, account: ACCOUNT, output,
          reservedUTC: new Date().toISOString(), state: 'consumed-before-auth-capable-test', maximumAuthSubmissions: 1 });
        reserved = true; receipt.authReserved = true; receipt.authAttemptMayHaveStarted = true;
        receipt.stage = 'unknown-after-submit'; persist();
      }
      child = start(developer + '/usr/bin/xcodebuild', args, { env, detached: true, stdio: ['ignore', fd, fd] });
      timer = setTimeout(() => stop('WALL_LIMIT'), 240000);
      watch = setInterval(() => {
        try {
          guard(); verify();
          if (reserve) captureSubmission(io.readFileSync(logFile, 'utf8'));
        } catch (error) { stop(error instanceof Hold ? error.code : 'SOURCE_OR_RESOURCE_HOLD'); }
      }, 2000);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, interrupted);
      const result = await new Promise(resolve => {
        child.once('error', () => resolve({ code: null, spawnError: true }));
        child.once('close', (code, signal) => resolve({ code, signal }));
      });
      return { result, stopped, log: io.readFileSync(logFile, 'utf8') };
    } finally {
      clearTimeout(timer); clearTimeout(hardStop); clearInterval(watch); io.closeSync(fd);
      for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(signal, interrupted);
    }
  };
  try {
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length > 0), 'EXPECTED_PREPARATION_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && path.basename(output).startsWith('account114-')
      && path.basename(output) !== 'account114-auth-reservation.json' && !io.existsSync(output), 'FRESH_PRIVATE_OUTPUT_REQUIRED');
    io.mkdirSync(output, { mode: 0o700 }); outputCreated = true;
    check((io.statSync(output).mode & 0o777) === 0o700, 'PRIVATE_OUTPUT_MODE');
    guard(); checkHistory(io, base);
    const prepFile = path.resolve(repo, argv[0], 'preparation.json');
    prep = readJSON(io, prepFile, 'PREPARATION_UNAVAILABLE');
    receipt.build = prep.build; receipt.commit = prep.commit; verify();
    const probeFile = path.join(repo, 'scripts/MatchrimAccount114Probe.swift');
    pins = new Map([prepFile, nativeReceiptPath(app), path.join(repo, 'scripts/qa-matchrim-account114.mjs'), probeFile]
      .map(file => [file, sha(io.readFileSync(file))]));
    const project = output + '/project', old = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    io.mkdirSync(project, { mode: 0o700 });
    io.cpSync(old + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    const original = readJSON(io, old + '/Probe97.xctestplan', 'HARNESS_PLAN_UNAVAILABLE');
    receipt.stage = 'private-environment-preflight-failed';
    check((io.lstatSync(privateFile).mode & 0o777) === 0o600 && io.lstatSync(privateFile).isFile(), 'PRIVATE_ACCESS_MODE');
    access = readJSON(io, privateFile, 'PRIVATE_ACCESS_UNAVAILABLE'); receipt.reservationId = randomUUID();
    const plan = makePrivatePlan(original, access, receipt.reservationId);
    const planFile = project + '/Probe97.xctestplan'; writeJSON(io, planFile, plan, 'wx');
    check((io.statSync(planFile).mode & 0o777) === 0o600, 'PRIVATE_PLAN_MODE');
    const probe = io.readFileSync(probeFile); receipt.probeSHA256 = sha(probe);
    io.writeFileSync(project + '/AutomationModeProbe.swift', probe, { mode: 0o600, flag: 'wx' });
    const pinProject = folder => {
      for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) pinProject(file); else pins.set(file, sha(io.readFileSync(file)));
      }
    };
    pinProject(project);
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Account114Once', '-destination', 'id=' + device,
      '-derivedDataPath', output + '/derived', '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO',
      '-disableAutomaticPackageResolution', '-skipPackageUpdates', '-jobs', '1',
      'CODE_SIGNING_ALLOWED=NO', 'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa114.readonly.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    receipt.stage = 'compile-preflight-failed';
    const compiled = await run('compile', ['build-for-testing', ...common]);
    receipt.compile = { result: compiled.result, stopped: compiled.stopped };
    check(compiled.result.code === 0 && !compiled.stopped, 'COMPILE_PREFLIGHT_FAILED');
    check(!compiled.log.includes(SUBMISSION), 'UNEXPECTED_AUTH_DURING_COMPILE');
    receipt.stage = 'pre-submit-hold'; guard(); verify(); checkHistory(io, base);
    originalSize = xcrun(['simctl', 'ui', device, 'content_size']).trim();
    check(/^(extra-small|small|medium|large|extra-large|extra-extra-large|extra-extra-extra-large|accessibility-medium|accessibility-large|accessibility-extra-large|accessibility-extra-extra-large|accessibility-extra-extra-extra-large)$/.test(originalSize), 'UNKNOWN_CONTENT_SIZE');
    xcrun(['simctl', 'ui', device, 'content_size', 'large']);
    xcrun(['simctl', 'install', device, app]);
    const args = ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + AUTH_METHOD,
    ];
    receipt.command = args;
    const executed = await run('runtime', args, true);
    receipt.result = executed.result; receipt.stopped = executed.stopped;
    captureSubmission(executed.log); Object.assign(receipt, evaluateAuthResult(executed.log, executed.result, executed.stopped));
    if (io.existsSync(output + '/result.xcresult')) {
      xcrun(['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments']);
    }
    const review = [output + '/compile.log', output + '/runtime.log'];
    const collectText = folder => {
      if (!io.existsSync(folder)) return;
      for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) collectText(file); else if (/\.(txt|json|log)$/i.test(entry.name)) review.push(file);
      }
    };
    collectText(output + '/attachments');
    receipt.secretExposureInText = review.some(file => io.readFileSync(file, 'utf8').includes(access.password));
    check(!receipt.secretExposureInText, 'PRIVATE_TEXT_EXPOSURE_HOLD');
    guard(); verify();
  } catch (error) {
    receipt.passed = false; receipt.reason = error instanceof Hold ? error.code : 'LOCAL_EXECUTION_ERROR_PRIVATE_DETAILS_WITHHELD';
    if (receipt.stage === 'passed') receipt.stage = 'post-login-evidence-hold';
    else if (reserved && !['pre-submit-ui-failure', 'private-environment-preflight-failed', 'authentication-rejected', 'post-login-assertion-failed'].includes(receipt.stage)) receipt.stage = 'unknown-after-submit';
  } finally {
    receipt.authBudgetConsumed = io.existsSync(path.join(base, 'account114-auth-reservation.json'));
    if (originalSize) {
      try { xcrun(['simctl', 'ui', device, 'content_size', originalSize]); receipt.contentSizeRestored = true; }
      catch { receipt.contentSizeRestored = false; receipt.passed = false; receipt.reason ||= 'CONTENT_SIZE_RESTORE_HOLD';
        if (receipt.stage === 'passed') receipt.stage = 'post-login-cleanup-hold'; }
    }
    receipt.finishedUTC = new Date().toISOString(); persist();
  }
  return { receipt, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077);
  const { receipt, output } = await runAccount114();
  console.log(JSON.stringify({ passed: receipt.passed, stage: receipt.stage, authReserved: receipt.authReserved,
    authBudgetConsumed: receipt.authBudgetConsumed, authSubmitted: receipt.authSubmitted, output, reason: receipt.reason,
    credentialsPrinted: false, privateArtifactsNotForSharing: true }));
  process.exitCode = receipt.passed ? 0 : 1;
}
