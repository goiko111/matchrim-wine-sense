import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { checkLeases, verifyArtifact, nativeReceiptPath } from './qa-matchrim-account114.mjs';

export const METHOD = 'MatchrimProfile115Tests/testExistingQAProfileMaximumType115';
export const IDENTITY = 'PROFILE115_EXISTING_QA_IDENTITY_VISIBLE';
export const COMPLETION = 'PROFILE115_REAL_NATIVE_MAXIMUM_TYPE_PROFILE_COMPLETE';
export const DEVICE = 'B18822EF-BFBD-4A6A-89B2-33539BDE4127';
export const MAXIMUM_TYPE = 'accessibility-extra-extra-extra-large';
const bundle = 'wine.matchrim.qa99review';
const developer = '/Applications/Xcode-26.0.1.app/Contents/Developer';
const leaseFile = '/Users/GOIKO/Library/Application Support/Winerim Automation/parallel_20261017/leases.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const check = (value, code) => { if (!value) throw new Error(code); };
const readJSON = (io, file) => JSON.parse(io.readFileSync(file, 'utf8'));
const writeJSON = (io, file, value) => io.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });

export function makePlan(original) {
  check(original?.testTargets?.length === 1 && /^[\w-]+$/.test(original.testTargets[0]?.target?.name), 'AMBIGUOUS_TEST_TARGET');
  return { version: 1, configurations: [{ id: randomUUID(), name: 'Profile115Once', options: {} }],
    defaultOptions: { testTimeoutsEnabled: true, defaultTestExecutionTimeAllowance: 120,
      maximumTestExecutionTimeAllowance: 120, testRepetitionMode: 'fixedIterations', maximumTestRepetitions: 1,
      testRepetitionRelaunchEnabled: false, codeCoverage: false },
    testTargets: [{ target: original.testTargets[0].target, parallelizable: false,
      selectedTests: [METHOD] }] };
}

export function evaluateProfileResult(log, result, stopped = null) {
  const count = marker => log.split(/\r?\n/).filter(line => line === marker).length;
  const events = [...log.matchAll(/^Test Case '([^'\r\n]+)' (started|passed|failed|skipped)(?:[.\t ][^\r\n]*)?\r?$/gm)];
  const expected = /^-\[(?:\w+\.)?MatchrimProfile115Tests testExistingQAProfileMaximumType115\]$/;
  const summaries = [...log.matchAll(/Executed (\d+) tests?, with (\d+) failures/g)];
  const passed = result?.code === 0 && !result.signal && !result.spawnError && !stopped
    && count(IDENTITY) === 1 && count(COMPLETION) === 1 && !/PROFILE115_FAILURE|ACCOUNT114_AUTH_SUBMITTED/.test(log)
    && events.length === 2 && events[0][2] === 'started' && events[1][2] === 'passed'
    && events.every(event => expected.test(event[1])) && summaries.length > 0
    && summaries.every(summary => summary[1] === '1' && summary[2] === '0');
  return { passed: Boolean(passed), stage: passed ? 'passed' : 'profile-not-proven',
    ...(!passed ? { reason: stopped || 'EXACT_SINGLE_PROFILE_TEST_NOT_PROVEN' } : {}) };
}

export async function runProfile115({ argv = process.argv.slice(2), repo = process.cwd(), io = fs,
  exec = execFileSync, start = spawn, environment = process.env,
  killGroup = (pid, signal) => process.kill(-pid, signal) } = {}) {
  const base = path.resolve(repo, 'qa-artifacts/night105-20261021');
  // Do not forward the parent's authentication inputs into the test process.
  const env = Object.fromEntries(Object.entries(environment).filter(([key]) => !/KEY|AUTH|PASSWORD|SECRET|TOKEN|MATCHRIM114|CREDENTIAL/i.test(key)));
  env.DEVELOPER_DIR = developer;
  const receipt = { passed: false, stage: 'preflight', device: DEVICE, bundle,
    accountScope: 'Existing QA account info@winerim.com, already authenticated; authentication provenance is recorded separately. Read-only Profile only.',
    authSubmissions: 0, modelStartsRequested: 0, maximumType: MAXIMUM_TYPE, startedUTC: new Date().toISOString() };
  let output, prep, app, originalSize, created = false;
  const pins = new Map();
  const guard = () => {
    checkLeases(readJSON(io, leaseFile).leases, env);
    const disk = io.statfsSync(base);
    check(disk.bavail * disk.bsize >= 5 * 1024 ** 3, 'LOW_DISK_HOLD');
  };
  const verify = () => {
    verifyArtifact({ io, exec, repo, prep, app });
    for (const [file, digest] of pins) check(hash(io.readFileSync(file)) === digest, 'SOURCE_OR_HARNESS_CHANGED');
  };
  const xcrun = args => {
    guard(); verify();
    return exec('/usr/bin/xcrun', args, { env, encoding: 'utf8', timeout: 120000 });
  };
  const privateTree = folder => {
    io.chmodSync(folder, 0o700);
    for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      check(!entry.isSymbolicLink(), 'ARTIFACT_SYMLINK_HOLD');
      if (entry.isDirectory()) privateTree(file); else io.chmodSync(file, io.statSync(file).mode & 0o111 ? 0o700 : 0o600);
    }
  };
  const run = async (name, args) => {
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
      child = start(developer + '/usr/bin/xcodebuild', args, { env, detached: true, stdio: ['ignore', fd, fd] });
      timer = setTimeout(() => stop('WALL_LIMIT'), 240000);
      watch = setInterval(() => { try { guard(); verify(); } catch { stop('SOURCE_OR_RESOURCE_HOLD'); } }, 2000);
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
    check(argv.length === 3 && argv.every(value => typeof value === 'string' && value.length), 'EXPECTED_PREP_APP_OUTPUT');
    app = path.resolve(repo, argv[1]); output = path.resolve(repo, argv[2]);
    check(path.dirname(output) === base && /^profile115-[\w-]+$/.test(path.basename(output)) && !io.existsSync(output), 'FRESH_OUTPUT_REQUIRED');
    guard();
    const prepFile = path.resolve(repo, argv[0], 'preparation.json');
    prep = readJSON(io, prepFile); verify();
    const probeFile = path.join(repo, 'scripts/MatchrimProfile115Probe.swift');
    for (const file of [prepFile, nativeReceiptPath(app), probeFile,
      path.join(repo, 'scripts/qa-matchrim-profile115.mjs'), path.join(repo, 'scripts/qa-matchrim-account114.mjs')]) {
      pins.set(file, hash(io.readFileSync(file)));
    }
    io.mkdirSync(output, { mode: 0o700 }); created = true;
    check((io.statSync(output).mode & 0o777) === 0o700, 'PRIVATE_OUTPUT_MODE');
    const project = output + '/project', old = path.join(repo, 'qa-artifacts/native99-20261021/native-audit-project');
    io.mkdirSync(project, { mode: 0o700 });
    io.cpSync(old + '/Probe97.xcodeproj', project + '/Probe97.xcodeproj', { recursive: true });
    const plan = makePlan(readJSON(io, old + '/Probe97.xctestplan'));
    writeJSON(io, project + '/Probe97.xctestplan', plan);
    io.writeFileSync(project + '/AutomationModeProbe.swift', io.readFileSync(probeFile), { mode: 0o600, flag: 'wx' });
    privateTree(project);
    const pinTree = folder => {
      for (const entry of io.readdirSync(folder, { withFileTypes: true })) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory()) pinTree(file); else pins.set(file, hash(io.readFileSync(file)));
      }
    };
    pinTree(project);
    const common = ['-project', project + '/Probe97.xcodeproj', '-scheme', 'Probe97', '-testPlan', 'Probe97',
      '-only-test-configuration', 'Profile115Once', '-destination', 'id=' + DEVICE, '-derivedDataPath', output + '/derived',
      '-collect-test-diagnostics', 'never', '-parallel-testing-enabled', 'NO', '-disableAutomaticPackageResolution',
      '-skipPackageUpdates', '-jobs', '1', 'CODE_SIGNING_ALLOWED=NO',
      'PRODUCT_BUNDLE_IDENTIFIER=wine.matchrim.qa115.profile.uitests', 'ONLY_ACTIVE_ARCH=YES'];
    receipt.stage = 'compile';
    const compiled = await run('compile', ['build-for-testing', ...common]);
    check(compiled.result.code === 0 && !compiled.result.signal && !compiled.result.spawnError && !compiled.stopped, 'COMPILE_PREFLIGHT_FAILED');
    check(!compiled.log.includes(COMPLETION), 'UNEXPECTED_RUNTIME_DURING_COMPILE');
    const observedSize = xcrun(['simctl', 'ui', DEVICE, 'content_size']).trim();
    check(/^(extra-small|small|medium|large|extra-large|extra-extra-large|extra-extra-extra-large|accessibility-medium|accessibility-large|accessibility-extra-large|accessibility-extra-extra-large|accessibility-extra-extra-extra-large)$/.test(observedSize), 'UNKNOWN_CONTENT_SIZE');
    originalSize = observedSize;
    xcrun(['simctl', 'ui', DEVICE, 'content_size', MAXIMUM_TYPE]);
    check(xcrun(['simctl', 'ui', DEVICE, 'content_size']).trim() === MAXIMUM_TYPE, 'MAXIMUM_TYPE_NOT_APPLIED');
    xcrun(['simctl', 'install', DEVICE, app]);
    receipt.stage = 'runtime';
    const executed = await run('runtime', ['test-without-building', ...common, '-resultBundlePath', output + '/result.xcresult',
      '-only-testing:' + plan.testTargets[0].target.name + '/' + METHOD]);
    Object.assign(receipt, evaluateProfileResult(executed.log, executed.result, executed.stopped));
    if (io.existsSync(output + '/result.xcresult')) {
      xcrun(['xcresulttool', 'export', 'attachments', '--path', output + '/result.xcresult', '--output-path', output + '/attachments']);
    }
    guard(); verify();
  } catch (error) {
    receipt.passed = false;
    receipt.reason = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'LOCAL_EXECUTION_HOLD_DETAILS_WITHHELD';
  } finally {
    if (originalSize && /^(?:[a-z]+-)*[a-z]+$/.test(originalSize)) {
      try {
        // Source drift must not prevent cleanup; ownership and disk still gate simulator operations.
        guard();
        exec('/usr/bin/xcrun', ['simctl', 'ui', DEVICE, 'content_size', originalSize], { env, encoding: 'utf8', timeout: 30000 });
        guard();
        const restored = exec('/usr/bin/xcrun', ['simctl', 'ui', DEVICE, 'content_size'], { env, encoding: 'utf8', timeout: 30000 }).trim();
        check(restored === originalSize, 'CONTENT_SIZE_RESTORE_HOLD'); receipt.contentSizeRestored = true;
      } catch { receipt.contentSizeRestored = false; receipt.passed = false; receipt.reason = 'CONTENT_SIZE_RESTORE_HOLD'; }
    }
    receipt.finishedUTC = new Date().toISOString();
    if (created) { privateTree(output); writeJSON(io, output + '/RESULT.json', receipt); }
  }
  return { receipt, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.umask(0o077);
  const { receipt, output } = await runProfile115();
  console.log(JSON.stringify({ passed: receipt.passed, stage: receipt.stage, reason: receipt.reason, output,
    accountScope: receipt.accountScope, contentSizeRestored: receipt.contentSizeRestored }));
  process.exitCode = receipt.passed ? 0 : 1;
}
